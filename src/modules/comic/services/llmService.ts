import type { ModelConfig } from '@comic/types'
import { transportFetch, getTransportChannel, type TransportChannel } from './httpTransport'

/** 测试连接使用的默认输入（设置为可观测的一句话，便于确认模型真的在产出内容） */
export const DEFAULT_TEST_PROMPT = '你好，请用一句话介绍你自己。'

export interface LlmCallOptions {
  /** 模型配置 */
  modelConfig: ModelConfig
  /** 系统提示词 */
  systemPrompt?: string
  /** 用户消息 */
  userMessage: string
  /** 流式回调（只回传正文增量；思维链不进入正文） */
  onChunk?: (text: string) => void
}

export interface LlmCallResult {
  success: boolean
  /**
   * 正文内容。
   * 推理模型被截断时（正文为空、思维链非空）会回落到思维链，避免调用方拿到空串。
   */
  content?: string
  /** 思维链内容（reasoning / thinking 模型的思考过程，若服务端返回） */
  reasoning?: string
  /** finish_reason，便于排查截断（`length` = 达到 token 上限） */
  finishReason?: string
  error?: string
  /** 耗时（毫秒） */
  duration?: number
}

export interface TestConnectionResult {
  success: boolean
  error?: string
  /** 耗时（毫秒） */
  duration?: number
  /** 模型实际回复（成功时回显，用于确认模型真的在产出内容） */
  content?: string
  /** 思维链（推理模型返回时；正文为空时会作为 fallback 展示） */
  reasoning?: string
  /** finish_reason，`length` 表示被 token 上限截断 */
  finishReason?: string
  /** 实际命中的请求地址（Base URL 容错后可能与填写值不同） */
  url?: string
  /** 实际使用的传输通道：主进程转发 / 渲染进程直连 */
  channel?: TransportChannel
  /** 实际是否绕过了系统代理直连（仅主进程转发支持；用于解释「代理线路不通」类失败） */
  bypassProxy?: boolean
}

/**
 * 把 message.content / delta.content 归一化成纯文本。
 * 兼容三种形态：字符串、内容块数组（部分网关把 Anthropic/Gemini 转成 OpenAI 时仍返回数组）、空值。
 */
function readMessageText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    return value
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string') {
          return (part as { text: string }).text
        }
        return ''
      })
      .join('')
  }
  return ''
}

/** 安全解析 JSON，失败返回 null */
function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** 从 OpenAI 风格错误体里抽出可读信息 */
function pickErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const err = (payload as { error?: unknown }).error
  if (!err) return null
  if (typeof err === 'string') return err
  if (typeof err === 'object') {
    const e = err as { message?: unknown; type?: unknown; code?: unknown }
    if (typeof e.message === 'string') return e.message
    if (typeof e.type === 'string') return e.type
    if (typeof e.code === 'string') return e.code
  }
  return null
}

/** 响应体是否为 HTML（反向代理 / 防火墙拦截页，而非 API 返回的 JSON 错误） */
function looksLikeHtml(text: string): boolean {
  const head = text.trim().slice(0, 120).toLowerCase()
  return head.startsWith('<!doctype') || head.startsWith('<html') || head.includes('<head>')
}

/**
 * 把失败的 HTTP 响应翻译成可自诊断的提示。
 * 避免笼统报「格式异常」，把排查方向带偏到「鉴权/端点」上。
 */
async function describeHttpError(response: Response): Promise<string> {
  const status = response.status
  const text = await response.text()
  const jsonError = pickErrorMessage(safeJsonParse(text))

  // 路径错误常被反向代理/防火墙拦成 HTML 页面，直接截取前 200 字毫无意义
  if (!jsonError && looksLikeHtml(text)) {
    return `HTTP ${status}：端点返回了 HTML 页面而不是 API 响应（多为反向代理/防火墙拦截，或 Base URL 路径不对）`
  }

  const detail = jsonError || text.slice(0, 200)
  if (status === 401) return `鉴权失败 (HTTP 401)：请检查 API Key。${detail}`
  if (status === 403) return `拒绝访问 (HTTP 403)：请检查 API Key 权限，或 Base URL 路径是否正确。${detail}`
  if (status === 404) return `端点或模型不存在 (HTTP 404)：请检查 Base URL 与模型名。${detail}`
  if (status === 429) return `请求过于频繁或额度不足 (HTTP 429)：${detail}`
  if (status >= 500) return `服务端异常 (HTTP ${status})：${detail}`
  return `HTTP ${status}：${detail}`
}

/**
 * 把网络层异常翻译成可读提示。
 *
 * 浏览器直连时，若网关未实现 OPTIONS 预检，CORS 检查失败会抛出
 * `TypeError: Failed to fetch` —— 这个字面信息完全无法自诊断，因此这里补上
 * **实际通道**与最常见的成因。主进程转发失败多为 `net::ERR_*`，两者必须区分开，
 * 否则「浏览器直连被 CORS 拦」会被误判成「主进程转发有问题」。
 *
 * `retried` 为已自动重试次数；`pathNote` 说明重试时走了哪条路（如「绕过系统代理直连」），
 * 避免用户以为一直在同一条路上打转。
 */
function normalizeNetworkError(error: unknown, retried = 0, pathNote = ''): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/failed to fetch|networkerror|load failed|err_failed|net::err_/i.test(message)) {
    const channel =
      getTransportChannel() === 'electron-main'
        ? '通道：主进程转发（不受 CORS 约束），请检查网络/代理能否到达该地址'
        : '通道：渲染进程直连（未检测到主进程转发通道）。网关若未实现 CORS 预检会被浏览器直接拦截'
    const retryNote = retried > 0 ? `已自动重试 ${retried} 次${pathNote}仍失败。` : ''
    return `网络请求失败：无法建立连接。${retryNote}${channel}。原始错误：${message}`
  }
  if (/abort/i.test(message)) return '请求已中止'
  return message || '网络请求失败，请检查地址是否正确'
}

/**
 * 连接层**瞬时**故障：请求根本没拿到响应就被断开。
 * 这类失败在重试时不会产生 token 计费，也不会造成重复生成，可以安全重发；
 * 常见的触发场景是网关/代理空闲回收、连接抖动、本机切换网络。
 *
 * 刻意**不含** `Failed to fetch`（浏览器 CORS 拦截，重试无意义）
 * 与鉴权/路径类错误 —— 那些重试只会让用户多等几秒还看到同样的错。
 */
const TRANSIENT_NETWORK_PATTERN =
  /ERR_CONNECTION_CLOSED|ERR_CONNECTION_RESET|ERR_CONNECTION_ABORTED|ERR_EMPTY_RESPONSE|ERR_NETWORK_CHANGED|ERR_SOCKET_NOT_CONNECTED|ERR_CONNECTION_TIMED_OUT|ERR_PROXY_CONNECTION_FAILED|ECONNRESET|ECONNABORTED|EPIPE|ETIMEDOUT|socket hang up/i

/** 读 body 阶段的最大重试次数（连接阶段的重试由 `buildTransportAttempts` 决定）。 */
const MAX_NETWORK_RETRIES = 1
/** 重试前等待毫秒数（按次数线性递增）。 */
const NETWORK_RETRY_DELAY_MS = 600

function isTransientNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return TRANSIENT_NETWORK_PATTERN.test(message)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 一次请求的传输方式序列（值 = 是否绕过系统代理直连）。
 *
 * **第二次刻意换一条路**：早期实现是「同一条路再试一次」，但对「本机代理线路不通」
 * 这类失败毫无帮助 —— 实测两次都在约 10 秒后以 `ERR_CONNECTION_CLOSED` 收场，
 * 而同一时刻直连只要 0.4 秒就通。所以默认第二次改为绕过系统代理直连。
 * 用户显式勾了「绕过系统代理」时没有第二条路可换，两次都直连。
 */
function buildTransportAttempts(bypassProxy: boolean): boolean[] {
  return bypassProxy ? [true, true] : [false, true]
}

/** 失败提示里说明重试走的是哪条路（浏览器环境下 bypassProxy 不生效，不能谎报） */
function describeRetryPath(attempts: boolean[], triedBypass: boolean): string {
  if (!triedBypass || getTransportChannel() !== 'electron-main') return ''
  return attempts[0] ? '（直连）' : '（含绕过系统代理直连）'
}

/**
 * 生成 /chat/completions 的候选地址。
 * 用户填写 Base URL 的习惯不统一，这里做确定性归一：
 * - 已经粘了完整端点（…/chat/completions）→ 原样使用，**不重复拼接**；
 * - 否则补 `/chat/completions`；
 * - 若末尾不像版本段（v1 / v2 …），再额外准备一份补 `/v1` 的候选，救「忘了写 /v1」这种最常见填错。
 */
function buildChatCompletionsCandidates(baseUrl: string): string[] {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')
  if (!trimmed) return []
  if (/\/chat\/completions$/i.test(trimmed)) return [trimmed]

  const candidates = [`${trimmed}/chat/completions`]
  const lastSegment = trimmed.slice(trimmed.lastIndexOf('/') + 1)
  if (!/^v\d+$/i.test(lastSegment)) {
    candidates.push(`${trimmed}/v1/chat/completions`)
  }
  return candidates
}

/**
 * 只有「路径疑似不对」的状态码才换候选重试。
 * 403/404 都不会产生 token 计费，重试是安全的；401（鉴权）则不重试，避免掩盖真实错误。
 */
const RETRYABLE_STATUS = new Set([403, 404])

/** 失败时也带上实际请求地址，便于在结果面板里直接显示/复制 */
type ChatRequestOutcome =
  | { response: Response; url: string; bypassProxy: boolean }
  | { error: string; url?: string }

/**
 * 读取响应体，遇到**瞬时断连**自动重发一次。
 *
 * 为什么需要它：长提示词 / 长输出的一次请求往往要跑几十秒到几分钟，
 * 中间的网关或代理会因空闲回收连接，表现为响应头已到、读 body 时抛
 * `net::ERR_CONNECTION_CLOSED`。此时**一个字节的有效内容都还没拿到**，
 * 重发不会产生重复内容、也不会重复计费，比直接失败体验好得多。
 *
 * 重发沿用**上次成功时的传输方式**（`bypassProxy`）：如果刚才是靠直连才通的，
 * 重发又走回系统代理，等于白试。
 *
 * 仅用于**非流式**读取：流式已经吐出分片后再重发，会让 onChunk 收到重复内容。
 */
async function readBodyTextWithRetry(
  response: Response,
  modelConfig: Pick<ModelConfig, 'baseUrl' | 'apiKey' | 'model'>,
  messages: Array<{ role: string; content: string }>,
  bypassProxy: boolean,
): Promise<string> {
  let current = response
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await current.text()
    } catch (error) {
      if (attempt >= MAX_NETWORK_RETRIES || !isTransientNetworkError(error)) throw error
      console.warn('[llmService] 读取响应中断，自动重发', { attempt: attempt + 1, bypassProxy, error })
      await delay(NETWORK_RETRY_DELAY_MS * (attempt + 1))
      const outcome = await requestChatCompletions(
        modelConfig.baseUrl,
        modelConfig.apiKey,
        { model: modelConfig.model, messages, stream: false },
        { bypassProxy },
      )
      if ('error' in outcome) throw new TypeError(outcome.error)
      current = outcome.response
    }
  }
}

/** 按候选地址依次请求 /chat/completions，命中通路即返回响应 */
async function requestChatCompletions(
  baseUrl: string,
  apiKey: string,
  body: Record<string, unknown>,
  options: { bypassProxy?: boolean } = {},
): Promise<ChatRequestOutcome> {
  const candidates = buildChatCompletionsCandidates(baseUrl)
  if (!candidates.length) return { error: '请先填写 Base URL' }

  const attempts = buildTransportAttempts(Boolean(options.bypassProxy))
  let lastError = ''
  let triedBypass = false

  for (let i = 0; i < candidates.length; i += 1) {
    const url = candidates[i]
    let response: Response | null = null
    let networkError: unknown = null
    let usedBypass = false
    let retried = 0

    // 瞬时断连（ERR_CONNECTION_CLOSED 等）时重发：请求未拿到响应，重发不计费。
    // 第二次按 buildTransportAttempts 换一条路（默认改直连），比同路重试更可能救回来。
    for (let step = 0; step < attempts.length; step += 1) {
      const bypassProxy = attempts[step]
      if (bypassProxy) triedBypass = true
      try {
        // 经传输层发出：Electron 下由主进程代发，规避渲染进程 CORS 预检被拒的问题
        response = await transportFetch(
          url,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
          },
          { bypassProxy },
        )
        usedBypass = bypassProxy
        networkError = null
        break
      } catch (error) {
        networkError = error
        // 控制台留痕：DevTools 里可直接看到实际通道、第几次尝试、走没走代理与原始错误
        console.warn('[llmService] 请求失败', {
          url,
          channel: getTransportChannel(),
          bypassProxy,
          step,
          error,
        })
        if (step < attempts.length - 1 && isTransientNetworkError(error)) {
          retried += 1
          await delay(NETWORK_RETRY_DELAY_MS * retried)
          continue
        }
        break
      }
    }

    if (!response) {
      // 瞬时断连时再给下一个候选地址一次机会（可能是当前路径被代理拦截）
      if (i < candidates.length - 1 && isTransientNetworkError(networkError)) continue
      return {
        error: normalizeNetworkError(networkError, retried, describeRetryPath(attempts, triedBypass)),
        url,
      }
    }

    if (response.ok) return { response, url, bypassProxy: usedBypass }

    lastError = await describeHttpError(response)
    if (RETRYABLE_STATUS.has(response.status) && i < candidates.length - 1) continue
    return { error: lastError, url }
  }

  return { error: lastError || '请求失败' }
}

/**
 * LLM 大模型服务
 * 使用 OpenAI 兼容的 /chat/completions 接口
 *
 * 推理（thinking）模型说明：一次回复分两段——思维链进 `reasoning_content`，正文进 `content`，
 * 且 `max_tokens` 同时约束两段。因此判定连通性不能只看 `content` 是否非空。
 */
export const llmService = {
  /**
   * 测试 LLM 连接是否通畅
   * 发送一条消息验证 API Key、Base URL、Model 是否正确
   *
   * 注意：这里**故意不传 max_tokens** —— 推理模型的思维链会占用同一份额度，
   * 传一个小值（如 5）会导致正文为空串、被误判成「返回格式异常」。
   *
   * `modelConfig.bypassProxy` 为真时全程绕过系统代理直连；为假时先按系统代理试，
   * 失败再自动换直连重试一次（本机代理对某些域名线路不通时的兜底）。
   *
   * @param options.prompt 自定义测试输入，留空则用 DEFAULT_TEST_PROMPT
   */
  async testConnection(
    modelConfig: Pick<ModelConfig, 'baseUrl' | 'apiKey' | 'model' | 'bypassProxy'>,
    options?: { prompt?: string },
  ): Promise<TestConnectionResult> {
    const startTime = Date.now()
    const channel = getTransportChannel()
    const prompt = options?.prompt?.trim() || DEFAULT_TEST_PROMPT

    /** 失败分支统一补齐诊断元信息（通道 / 耗时 / 实际地址），避免各处重复 */
    const fail = (error: string, extra?: Partial<TestConnectionResult>): TestConnectionResult => ({
      success: false,
      error,
      duration: Date.now() - startTime,
      channel,
      ...extra,
    })

    try {
      const outcome = await requestChatCompletions(
        modelConfig.baseUrl,
        modelConfig.apiKey,
        { model: modelConfig.model, messages: [{ role: 'user', content: prompt }], stream: false },
        { bypassProxy: Boolean(modelConfig.bypassProxy) },
      )

      if ('error' in outcome) return fail(outcome.error, outcome.url ? { url: outcome.url } : undefined)

      const url = outcome.url
      const rawText = await readBodyTextWithRetry(
        outcome.response,
        modelConfig,
        [{ role: 'user', content: prompt }],
        outcome.bypassProxy,
      )
      const result = safeJsonParse(rawText) as {
        choices?: Array<{ message?: { content?: unknown; reasoning_content?: unknown }; finish_reason?: unknown }>
        error?: unknown
      } | null

      if (!result) {
        return fail(
          `响应不是合法 JSON，可能命中了非 OpenAI 兼容端点（检查 Base URL 是否已带 /v1）。原始响应：${rawText.slice(0, 200)}`,
          { url },
        )
      }

      const choice = result.choices?.[0]
      const content = readMessageText(choice?.message?.content)
      const reasoning = readMessageText(choice?.message?.reasoning_content)
      const finishReason = typeof choice?.finish_reason === 'string' ? choice.finish_reason : undefined

      // 拿到 choices 即说明链路已通；正文为空但思维链有内容也算连通（推理模型）
      if (choice && (content.trim() || reasoning.trim())) {
        return {
          success: true,
          duration: Date.now() - startTime,
          channel,
          url,
          // 实际走的传输方式（可能是系统代理失败后自动换的直连），回显出来便于解释现象
          bypassProxy: outcome.bypassProxy,
          content: content.trim() ? content : undefined,
          reasoning: reasoning.trim() ? reasoning : undefined,
          finishReason,
        }
      }

      if (choice) {
        if (finishReason === 'length') {
          return fail(
            '已连通，但模型在达到 token 上限前未产出正文（推理模型的思维链会占用同一额度），请调大 max_tokens 或改用非推理模型',
            { url, finishReason },
          )
        }
        return fail(`已连通，但返回内容为空（finish_reason: ${finishReason ?? '未知'}）`, { url, finishReason })
      }

      const bizError = pickErrorMessage(result)
      if (bizError) return fail(`服务端返回错误：${bizError}`, { url, finishReason })

      return fail('返回结构不符合 OpenAI 规范（缺少 choices 字段），请确认 Base URL 指向 OpenAI 兼容端点', { url })
    } catch (error) {
      return fail(normalizeNetworkError(error))
    }
  },

  async call(options: LlmCallOptions): Promise<LlmCallResult> {
    const { modelConfig, systemPrompt, userMessage, onChunk } = options
    const startTime = Date.now()

    const messages: { role: string; content: string }[] = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: userMessage })

    try {
      const outcome = await requestChatCompletions(
        modelConfig.baseUrl,
        modelConfig.apiKey,
        { model: modelConfig.model, messages, stream: !!onChunk },
        { bypassProxy: Boolean(modelConfig.bypassProxy) },
      )

      if ('error' in outcome) {
        return {
          success: false,
          error: outcome.error,
          duration: Date.now() - startTime,
        }
      }

      const response = outcome.response

      if (onChunk && response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullContent = ''
        let fullReasoning = ''
        let finishReason: string | undefined
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data:')) continue
            const data = trimmed.slice(5).trim()
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const choice = parsed.choices?.[0]
              if (typeof choice?.finish_reason === 'string') finishReason = choice.finish_reason

              const delta = readMessageText(choice?.delta?.content)
              if (delta) {
                fullContent += delta
                onChunk(delta)
              }
              // 思维链单独收集，不进入正文回调（避免思考过程被当成结果）
              fullReasoning += readMessageText(choice?.delta?.reasoning_content)
            } catch {
              // 忽略解析失败的行
            }
          }
        }

        return {
          success: true,
          // 正文为空（多因达到 token 上限）时回落到思维链，避免调用方拿到空串
          content: fullContent || fullReasoning,
          reasoning: fullReasoning || undefined,
          finishReason,
          duration: Date.now() - startTime,
        }
      } else {
        const rawText = await readBodyTextWithRetry(response, modelConfig, messages, outcome.bypassProxy)
        const result = safeJsonParse(rawText) as {
          choices?: Array<{ message?: { content?: unknown; reasoning_content?: unknown }; finish_reason?: unknown }>
          error?: unknown
        } | null

        if (!result) {
          return {
            success: false,
            error: `响应不是合法 JSON：${rawText.slice(0, 200)}`,
            duration: Date.now() - startTime,
          }
        }

        const choice = result.choices?.[0]

        if (!choice) {
          const bizError = pickErrorMessage(result)
          return {
            success: false,
            error: bizError ? `服务端返回错误：${bizError}` : '返回结构不符合 OpenAI 规范（缺少 choices 字段）',
            duration: Date.now() - startTime,
          }
        }

        const content = readMessageText(choice.message?.content)
        const reasoning = readMessageText(choice.message?.reasoning_content)

        return {
          success: true,
          content: content || reasoning,
          reasoning: reasoning || undefined,
          finishReason: typeof choice.finish_reason === 'string' ? choice.finish_reason : undefined,
          duration: Date.now() - startTime,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: normalizeNetworkError(error),
        duration: Date.now() - startTime,
      }
    }
  },
}

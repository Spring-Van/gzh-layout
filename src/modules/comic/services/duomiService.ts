/**
 * Duomi（多米API）生图服务
 * 基于文档：POST /v1/images/generations?async=true + GET /v1/tasks/{id}
 * 文档地址：https://duomiapi.com/doc/55
 */

import { transportFetch } from './httpTransport'

/** 生图任务结果 */
export interface DuomiTaskResult {
  taskId: string
  state?: 'pending' | 'running' | 'succeeded' | 'error'
  imageUrl?: string
  fileName?: string
  progress?: number
  error?: string
}

/** 生图请求参数 */
export interface DuomiGenerateOptions {
  /** 模型名称，如 gpt-image-2 */
  model: string
  /** 提示词 */
  prompt: string
  /** 图片尺寸，如 1024x1024, 16:9, auto 等 */
  size?: string
  /** 参考图列表 */
  image?: string[]
  /** 思考深度：low/medium/high */
  quality?: 'low' | 'medium' | 'high'
  /** 自定义 base URL */
  baseUrl?: string
}

/** 多米网关默认地址：系统设置未填 baseUrl 时兜底 */
const DEFAULT_BASE_URL = 'https://duomiapi.com'

/**
 * 拼接完整接口地址。
 *
 * 修复前这里写的是相对路径 '/duomi-api'，而该代理在 vite.config.ts 里从未配置过，
 * 请求于是打到渲染进程自身（dev server）被 404，打包后更是没有 proxy 可用。
 * 改为优先使用系统设置里的 baseUrl（与 grsaiService / agnesImageService 一致）。
 */
function buildUrl(baseUrl: string | undefined, path: string): string {
  return `${(baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')}${path}`
}

/** 网关统一响应包装：密钥不对等业务错误同样以 HTTP 200 返回，原因藏在 code/msg 里 */
interface DuomiEnvelope {
  code?: number
  msg?: string
}

/** code 非 0/200 即业务失败：只检查 response.ok 会把这类失败吞成「未获取到 taskId」 */
function throwIfGatewayError(result: DuomiEnvelope): void {
  const code = result.code
  if (typeof code === 'number' && code !== 0 && code !== 200) {
    throw new Error(result.msg || `请求失败（code ${code}）`)
  }
}

/**
 * 读取失败响应体里网关给的真实原因。
 *
 * 多米对 HTTP 4xx 同样把可读原因放在 body 的 msg 里（例：{"code":400,"msg":"..."}），
 * 先抛状态码会把「哪个参数不合法」这条关键信息丢掉 —— 这正是之前只看到
 * 「HTTP error! status: 400」却无从下手的原因。
 */
async function describeFailure(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as DuomiEnvelope
    if (body.msg) return body.msg
  } catch {
    /* 响应体不是 JSON，退回状态码 */
  }
  return `HTTP error! status: ${response.status}`
}

export const duomiService = {
  /**
   * 创建异步生图任务
   * POST /v1/images/generations?async=true
   */
  async createTask(
    apiKey: string,
    options: DuomiGenerateOptions
  ): Promise<DuomiTaskResult> {
    const {
      model,
      prompt,
      size,
      image,
      quality,
      baseUrl
    } = options

    const body: Record<string, unknown> = {
      model,
      prompt
    }
    if (size) body.size = size
    if (image && image.length > 0) body.image = image
    if (quality) body.quality = quality

    const url = buildUrl(baseUrl, '/v1/images/generations?async=true')

    const response = await transportFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      throw new Error(await describeFailure(response))
    }

    const result = (await response.json()) as DuomiEnvelope & { id?: string }
    throwIfGatewayError(result)

    return {
      taskId: result.id || ''
    }
  },

  /**
   * 查询异步任务结果
   * GET /v1/tasks/{id}
   */
  async queryTask(
    apiKey: string,
    taskId: string,
    baseUrl?: string
  ): Promise<DuomiTaskResult> {
    const url = buildUrl(baseUrl, `/v1/tasks/${encodeURIComponent(taskId)}`)

    const response = await transportFetch(url, {
      method: 'GET',
      headers: {
        'Authorization': apiKey
      }
    })

    if (!response.ok) {
      throw new Error(await describeFailure(response))
    }

    const result = (await response.json()) as DuomiEnvelope & {
      state?: DuomiTaskResult['state']
      progress?: number
      data?: { images?: Array<{ url?: string; file_name?: string }> }
    }
    throwIfGatewayError(result)

    const images = result.data?.images || []
    const firstImage = images[0]

    return {
      taskId,
      state: result.state,
      imageUrl: firstImage?.url,
      fileName: firstImage?.file_name,
      progress: result.progress,
      error: result.state === 'error' ? '生成失败' : undefined
    }
  },

  /**
   * 轮询等待任务完成
   * @param maxAttempts 最大轮询次数，默认 100
   * @param interval 轮询间隔（毫秒），默认 5000
   */
  async waitForCompletion(
    apiKey: string,
    taskId: string,
    baseUrl?: string,
    onProgress?: (progress: number, status: string) => void,
    maxAttempts = 120,
    interval = 5000
  ): Promise<DuomiTaskResult> {
    let attempts = 0

    while (attempts < maxAttempts) {
      // 轮询同样要走系统设置里的地址，否则查询任务会落在错误的域名上
      const result = await this.queryTask(apiKey, taskId, baseUrl)

      if (onProgress && result.progress !== undefined) {
        onProgress(result.progress, result.state || 'unknown')
      }

      if (result.state === 'succeeded') {
        return result
      }

      if (result.state === 'error') {
        throw new Error(`任务失败: ${result.error || '未知错误'}`)
      }

      await new Promise(resolve => setTimeout(resolve, interval))
      attempts++
    }

    throw new Error('任务超时')
  }
}

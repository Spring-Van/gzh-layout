import type { ModelConfig } from '@comic/types'

export interface LlmCallOptions {
  /** 模型配置 */
  modelConfig: ModelConfig
  /** 系统提示词 */
  systemPrompt?: string
  /** 用户消息 */
  userMessage: string
  /** 流式回调 */
  onChunk?: (text: string) => void
}

export interface LlmCallResult {
  success: boolean
  content?: string
  error?: string
  /** 耗时（毫秒） */
  duration?: number
}

export interface TestConnectionResult {
  success: boolean
  error?: string
  /** 耗时（毫秒） */
  duration?: number
}

/**
 * LLM 大模型服务
 * 使用 OpenAI 兼容的 /chat/completions 接口
 */
export const llmService = {
  /**
   * 测试 LLM 连接是否通畅
   * 发送一条极简消息验证 API Key、Base URL、Model 是否正确
   */
  async testConnection(modelConfig: Pick<ModelConfig, 'baseUrl' | 'apiKey' | 'model'>): Promise<TestConnectionResult> {
    const startTime = Date.now()
    const baseUrl = modelConfig.baseUrl.replace(/\/+$/, '')
    const url = `${baseUrl}/chat/completions`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${modelConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: modelConfig.model,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5,
          stream: false,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
          duration: Date.now() - startTime,
        }
      }

      const result = await response.json()
      if (result.choices?.[0]?.message?.content) {
        return { success: true, duration: Date.now() - startTime }
      }
      return {
        success: false,
        error: '返回数据格式异常，无有效内容',
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络请求失败，请检查地址是否正确',
        duration: Date.now() - startTime,
      }
    }
  },

  async call(options: LlmCallOptions): Promise<LlmCallResult> {
    const { modelConfig, systemPrompt, userMessage, onChunk } = options
    const startTime = Date.now()

    const baseUrl = modelConfig.baseUrl.replace(/\/+$/, '')
    const url = `${baseUrl}/chat/completions`

    const messages: { role: string; content: string }[] = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: userMessage })

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${modelConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: modelConfig.model,
          messages,
          stream: !!onChunk,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `API 请求失败 (${response.status}): ${errorText}`,
          duration: Date.now() - startTime,
        }
      }

      if (onChunk && response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullContent = ''
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
              const delta = parsed.choices?.[0]?.delta?.content
              if (delta) {
                fullContent += delta
                onChunk(delta)
              }
            } catch {
              // 忽略解析失败的行
            }
          }
        }

        return {
          success: true,
          content: fullContent,
          duration: Date.now() - startTime,
        }
      } else {
        const result = await response.json()
        const content = result.choices?.[0]?.message?.content || ''
        return {
          success: true,
          content,
          duration: Date.now() - startTime,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络请求失败',
        duration: Date.now() - startTime,
      }
    }
  },
}

/**
 * Grsai 统一生图服务
 * 基于新文档统一接口：POST /v1/api/generate + GET /v1/api/result
 * 支持所有 grsai 模型（nano-banana 系列、gpt-image-2 系列等）
 */

/** 生图任务结果 */
export interface GrsaiTaskResult {
  taskId: string
  status?: 'running' | 'succeeded' | 'failed' | 'violation'
  results?: Array<{ url: string }>
  progress?: number
  error?: string
}

/** 统一生图请求参数 */
export interface GrsaiGenerateOptions {
  /** 模型名称，如 nano-banana-2、gpt-image-2 等 */
  model: string
  /** 提示词 */
  prompt: string
  /** 参考图列表，支持 base64 与 url 链接 */
  images?: string[]
  /** 图片比例，如 "1:1"、"16:9"、"1024x1024" 等 */
  aspectRatio?: string
  /** 分辨率，1K/2K/4K（仅 nano-banana 系列支持） */
  imageSize?: string
  /** 图片质量，如 low/medium/high（仅 gpt-image-2 系列支持） */
  quality?: string
  /** 回复类型：json / stream / async */
  replyType?: 'json' | 'stream' | 'async'
  /** 自定义 base URL */
  baseUrl?: string
}

export const grsaiService = {
  defaultBaseUrl: 'https://grsai.dakka.com.cn',

  /**
   * 统一生图接口，支持所有 grsai 模型
   * 新接口：POST /v1/api/generate
   */
  async generate(
    apiKey: string,
    options: GrsaiGenerateOptions
  ): Promise<GrsaiTaskResult> {
    const {
      model,
      prompt,
      images = [],
      aspectRatio,
      imageSize,
      quality,
      replyType = 'async',
      baseUrl
    } = options

    const body: Record<string, unknown> = {
      model,
      prompt,
      images,
      replyType
    }
    if (aspectRatio) body.aspectRatio = aspectRatio
    if (imageSize) body.imageSize = imageSize
    if (quality) body.quality = quality

    const url = `${baseUrl || this.defaultBaseUrl}/v1/api/generate`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    // 新接口直接返回扁平结构：{ id, status, results, progress, error }
    return {
      taskId: result.id || '',
      status: result.status,
      results: result.results,
      progress: result.progress,
      error: result.error
    }
  },

  /**
   * 异步生成结果查询
   * 新接口：GET /v1/api/result?id=xxx
   */
  async queryResult(
    apiKey: string,
    taskId: string,
    baseUrl: string
  ): Promise<GrsaiTaskResult> {
    const url = `${baseUrl || this.defaultBaseUrl}/v1/api/result?id=${encodeURIComponent(taskId)}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    return {
      taskId,
      status: result.status,
      results: result.results,
      progress: result.progress,
      error: result.error
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
    baseUrl: string,
    onProgress?: (progress: number, status: string) => void,
    maxAttempts = 120,
    interval = 5000
  ): Promise<GrsaiTaskResult> {
    let attempts = 0

    while (attempts < maxAttempts) {
      const result = await this.queryResult(apiKey, taskId, baseUrl)

      if (onProgress && result.progress !== undefined) {
        onProgress(result.progress, result.status || 'unknown')
      }

      if (result.status === 'succeeded') {
        return result
      }

      if (result.status === 'failed' || result.status === 'violation') {
        throw new Error(`任务失败: ${result.error || (result.status === 'violation' ? '内容违规' : '未知错误')}`)
      }

      await new Promise(resolve => setTimeout(resolve, interval))
      attempts++
    }

    throw new Error('任务超时')
  }
}

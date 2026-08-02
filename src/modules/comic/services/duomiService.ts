/**
 * Duomi API 生图服务
 * 基于文档：POST /v1/images/generations?async=true + GET /v1/tasks/{id}
 */

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

export const duomiService = {
  /** 代理路径，通过 vite proxy 转发到 duomiapi.com，避免 CORS */
  proxyBase: '/duomi-api',

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
      quality
    } = options

    const body: Record<string, unknown> = {
      model,
      prompt
    }
    if (size) body.size = size
    if (image && image.length > 0) body.image = image
    if (quality) body.quality = quality

    const url = `${this.proxyBase}/v1/images/generations?async=true`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

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
    _baseUrl?: string
  ): Promise<DuomiTaskResult> {
    const url = `${this.proxyBase}/v1/tasks/${encodeURIComponent(taskId)}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': apiKey
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

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
    _baseUrl?: string,
    onProgress?: (progress: number, status: string) => void,
    maxAttempts = 120,
    interval = 5000
  ): Promise<DuomiTaskResult> {
    let attempts = 0

    while (attempts < maxAttempts) {
      const result = await this.queryTask(apiKey, taskId)

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

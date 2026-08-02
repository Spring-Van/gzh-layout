/** 西瓜 API 生图参数 */
export interface XiguapiParams {
  resolution?: '1K' | '2K' | '4K'
  aspectRatio?: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '3:2' | '2:3' | '21:9' | '5:4' | '4:5'
}

export interface XiguapiTaskResult {
  taskId: string
  status?: 'queued' | 'submitting' | 'failed' | 'success'
  imageUrl?: string
  error?: string
}

export interface XiguapiGenerateOptions {
  prompt: string
  model?: string
  imageUrls?: string[]
  params?: XiguapiParams
}

export const xiguapiService = {
  baseUrl: 'https://tasks.xiguapi.tech/',

  async createTask(
    apiKey: string,
    options: XiguapiGenerateOptions
  ): Promise<XiguapiTaskResult> {
    const { prompt, model = 'nanobananapro', imageUrls = [], params = {} } = options
    const { resolution = '1K', aspectRatio = '3:4' } = params

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        model,
        resolution,
        aspect_ratio: aspectRatio,
        image_urls: imageUrls.slice(0, 5)
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return {
      taskId: result.taskId || result.id || '',
      status: result.status
    }
  },

  async queryTask(apiKey: string, taskId: string): Promise<XiguapiTaskResult> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ taskId })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return {
      taskId,
      status: result.status,
      imageUrl: result.result?.images?.[0] || result.imageUrl,
      error: result.message || result.error
    }
  },

  async waitForCompletion(
    apiKey: string,
    taskId: string,
    onProgress?: (status: string) => void,
    maxAttempts = 120,
    interval = 5000
  ): Promise<XiguapiTaskResult> {
    let attempts = 0

    while (attempts < maxAttempts) {
      const result = await this.queryTask(apiKey, taskId)

      if (onProgress) {
        onProgress(result.status || 'unknown')
      }

      if (result.status === 'success') {
        return result
      }

      if (result.status === 'failed') {
        throw new Error(`任务失败: ${result.error || '未知错误'}`)
      }

      await new Promise(resolve => setTimeout(resolve, interval))
      attempts++
    }

    throw new Error('任务超时未完成')
  }
}
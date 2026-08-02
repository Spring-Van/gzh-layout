import type { ModelConfig, OpenAIImageParams } from '@comic/types'
import { xiguapiService } from './xiguapiService'
import { grsaiService } from './grsaiService'
import { duomiService } from './duomiService'
import { openaiImageService } from './openaiImageService'

export interface GenerateResult {
  success: boolean
  imageUrl?: string
  imageUrls?: string[]
  error?: string
  taskId?: string
}

/** 从 grsai 任务结果中提取 GenerateResult */
const extractGrsaiResult = (result: Awaited<ReturnType<typeof grsaiService.waitForCompletion>>): GenerateResult => {
  if (result.results && result.results.length > 0) {
    return {
      success: true,
      imageUrl: result.results[0].url,
      imageUrls: result.results.map(r => r.url),
      taskId: result.taskId
    }
  }
  return { success: false, error: result.error || '生成失败', taskId: result.taskId }
}

export const imageGenerationService = {
  /**
   * 基于模型配置生图（页面生成模式）
   * 根据模型的 apiSource 字段决定调用 grsai 还是 xiguapi 服务
   */
  async generateWithModel(
    modelConfig: ModelConfig,
    prompt: string,
    imageUrls: string[],
    aspectRatio: string,
    resolution: string,
    quality: string,
    onProgress?: (progress: number, status: string) => void,
    onTaskCreated?: (taskId: string) => void
  ): Promise<GenerateResult> {
    if (!modelConfig.apiKey) return { success: false, error: '请先在系统设置中配置模型的 API Key' }

    const apiSource = modelConfig.apiSource || 'grsai'

    try {
      if (apiSource === 'xiguapi') {
        return await this.generateWithXiguapiModel(modelConfig, prompt, imageUrls, aspectRatio, resolution, onProgress, onTaskCreated)
      } else if (apiSource === 'duomi') {
        return await this.generateWithDuomiModel(modelConfig, prompt, imageUrls, aspectRatio, quality, onProgress, onTaskCreated)
      } else if (apiSource === 'openai') {
        return await this.generateWithOpenAIModel(modelConfig, prompt, imageUrls, aspectRatio, resolution, quality, onProgress)
      }
      return await this.generateWithGrsaiModel(modelConfig, prompt, imageUrls, aspectRatio, resolution, quality, onProgress, onTaskCreated)
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '未知错误' }
    }
  },

  /**
   * 查询任务状态并等待完成（页面恢复时使用）
   * @param taskId 任务ID
   * @param maxAttempts 最大轮询次数，默认 30
   * @param interval 轮询间隔（毫秒），默认 3000
   */
  async waitForTaskCompletion(
    modelConfig: ModelConfig,
    taskId: string,
    onProgress?: (progress: number, status: string) => void,
    maxAttempts = 120,
    interval = 5000
  ): Promise<GenerateResult> {
    if (!modelConfig.apiKey) return { success: false, error: '请先在系统设置中配置模型的 API Key' }

    const apiSource = modelConfig.apiSource || 'grsai'

    try {
      if (apiSource === 'openai') {
        // OpenAI 是同步接口，不支持任务恢复
        return { success: false, error: 'OpenAI 类型为同步接口，不支持任务恢复，请重新生成', taskId }
      } else if (apiSource === 'xiguapi') {
        const result = await xiguapiService.waitForCompletion(
          modelConfig.apiKey,
          taskId,
          (status) => onProgress?.(status === 'completed' ? 100 : 50, status),
          maxAttempts,
          interval
        )
        return result.imageUrl
          ? { success: true, imageUrl: result.imageUrl, taskId }
          : { success: false, error: result.error || '查询失败', taskId }
      } else if (apiSource === 'duomi') {
        const result = await duomiService.waitForCompletion(
          modelConfig.apiKey,
          taskId,
          modelConfig.baseUrl,
          onProgress,
          maxAttempts,
          interval
        )
        return result.imageUrl
          ? { success: true, imageUrl: result.imageUrl, taskId }
          : { success: false, error: result.error || '查询失败', taskId }
      } else {
        const result = await grsaiService.waitForCompletion(
          modelConfig.apiKey,
          taskId,
          modelConfig.baseUrl,
          onProgress,
          maxAttempts,
          interval
        )
        return extractGrsaiResult(result)
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '查询失败', taskId }
    }
  },

  /** 使用 xiguapi 服务生图（基于 ModelConfig） */
  async generateWithXiguapiModel(
    modelConfig: ModelConfig,
    prompt: string,
    imageUrls: string[],
    aspectRatio: string,
    resolution: string,
    onProgress?: (progress: number, status: string) => void,
    onTaskCreated?: (taskId: string) => void
  ): Promise<GenerateResult> {
    const res = (resolution || '1K') as '1K' | '2K' | '4K'
    const ar = (aspectRatio || '3:4') as '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '3:2' | '2:3' | '21:9' | '5:4' | '4:5'

    const createResult = await xiguapiService.createTask(modelConfig.apiKey, {
      prompt,
      model: modelConfig.model || 'nanobananapro',
      imageUrls,
      params: { resolution: res, aspectRatio: ar }
    })

    if (!createResult.taskId) return { success: false, error: '创建任务失败，未获取到 taskId' }

    // 通知调用者 taskId 已创建
    onTaskCreated?.(createResult.taskId)

    onProgress?.(0, 'submitting')

    const result = await xiguapiService.waitForCompletion(
      modelConfig.apiKey, createResult.taskId,
      (status) => onProgress?.(status === 'completed' ? 100 : 50, status)
    )

    return result.imageUrl
      ? { success: true, imageUrl: result.imageUrl, taskId: createResult.taskId }
      : { success: false, error: result.error || '生成失败', taskId: createResult.taskId }
  },

  /**
   * 使用 grsai 统一接口生图（基于 ModelConfig）
   * 新接口不再区分 nano-banana / gpt-image-2，统一走 /v1/api/generate
   */
  async generateWithGrsaiModel(
    modelConfig: ModelConfig,
    prompt: string,
    imageUrls: string[],
    aspectRatio: string,
    resolution: string,
    quality: string,
    onProgress?: (progress: number, status: string) => void,
    onTaskCreated?: (taskId: string) => void
  ): Promise<GenerateResult> {
    const model = modelConfig.model || 'nano-banana-2'

    const createResult = await grsaiService.generate(modelConfig.apiKey, {
      model,
      prompt,
      images: imageUrls,
      aspectRatio: aspectRatio || undefined,
      imageSize: resolution || undefined,
      quality: quality || undefined,
      baseUrl: modelConfig.baseUrl
    })

    if (!createResult.taskId) return { success: false, error: '创建任务失败，未获取到 taskId' }

    // 通知调用者 taskId 已创建
    onTaskCreated?.(createResult.taskId)

    onProgress?.(0, 'submitting')

    const result = await grsaiService.waitForCompletion(
      modelConfig.apiKey, createResult.taskId, modelConfig.baseUrl,
      (progress, status) => onProgress?.(progress, status)
    )

    return extractGrsaiResult(result)
  },

  /**
   * 使用 duomi API 生图（基于 ModelConfig）
   * POST /v1/images/generations?async=true
   */
  async generateWithDuomiModel(
    modelConfig: ModelConfig,
    prompt: string,
    imageUrls: string[],
    aspectRatio: string,
    quality: string,
    onProgress?: (progress: number, status: string) => void,
    onTaskCreated?: (taskId: string) => void
  ): Promise<GenerateResult> {
    const model = modelConfig.model || 'gpt-image-2'

    const createResult = await duomiService.createTask(modelConfig.apiKey, {
      model,
      prompt,
      size: aspectRatio || undefined,
      image: imageUrls.length > 0 ? imageUrls : undefined,
      quality: (quality as 'low' | 'medium' | 'high') || undefined,
      baseUrl: modelConfig.baseUrl
    })

    if (!createResult.taskId) return { success: false, error: '创建任务失败，未获取到 taskId' }

    // 通知调用者 taskId 已创建
    onTaskCreated?.(createResult.taskId)

    onProgress?.(0, 'submitting')

    const result = await duomiService.waitForCompletion(
      modelConfig.apiKey, createResult.taskId, modelConfig.baseUrl,
      onProgress
    )

    return result.imageUrl
      ? { success: true, imageUrl: result.imageUrl, taskId: createResult.taskId }
      : { success: false, error: result.error || '生成失败', taskId: createResult.taskId }
  },

  /**
   * 使用 OpenAI Images API 生图（基于 ModelConfig）
   * 同步接口，直接返回图片，无需轮询
   */
  async generateWithOpenAIModel(
    modelConfig: ModelConfig,
    prompt: string,
    imageUrls: string[],
    aspectRatio: string,
    _resolution: string,
    quality: string,
    onProgress?: (progress: number, status: string) => void
  ): Promise<GenerateResult> {
    const model = modelConfig.model || 'gpt-image-2'

    // 解析 OpenAI 专属额外参数
    let extraParams: OpenAIImageParams | undefined
    if (modelConfig.openaiExtraParams) {
      try {
        extraParams = JSON.parse(modelConfig.openaiExtraParams)
      } catch {
        // 解析失败，使用默认值
      }
    }

    // 将 aspectRatio 映射为 OpenAI 的 size 参数
    const size = mapAspectRatioToSize(aspectRatio)

    onProgress?.(10, 'generating')

    const result = await openaiImageService.generate(modelConfig.apiKey, {
      model,
      prompt,
      images: imageUrls.length > 0 ? imageUrls : undefined,
      size,
      quality: (quality as 'auto' | 'low' | 'medium' | 'high') || 'auto',
      extraParams,
      baseUrl: modelConfig.baseUrl,
    })

    if (result.success && result.images.length > 0) {
      onProgress?.(100, 'completed')
      return {
        success: true,
        imageUrl: result.images[0],
        imageUrls: result.images,
      }
    }

    return { success: false, error: result.error || '生成失败' }
  }
}

/**
 * 将图片比例映射为 OpenAI Images API 的 size 参数
 * @param aspectRatio - 比例字符串，如 "1:1", "16:9", "3:4", "1728x2304"
 * @returns OpenAI size 参数
 */
function mapAspectRatioToSize(aspectRatio: string): string {
  // 如果已经是 WxH 格式（如 1728x2304），直接使用
  if (/^\d{2,4}x\d{2,4}$/.test(aspectRatio)) {
    return aspectRatio;
  }
  const ratioMap: Record<string, string> = {
    '1:1': '1024x1024',
    '16:9': '1536x1024',
    '9:16': '1024x1536',
    '4:3': '1536x1024',
    '3:4': '1024x1536',
    '3:2': '1536x1024',
    '2:3': '1024x1536',
    'auto': 'auto',
  }
  return ratioMap[aspectRatio] || 'auto'
}

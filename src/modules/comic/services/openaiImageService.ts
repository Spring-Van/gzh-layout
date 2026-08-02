/**
 * OpenAI Images API 生图服务
 * 支持两种模式：
 * 1. 标准模式：multipart/form-data 上传参考图到 /v1/images/edits
 * 2. 兼容模式：JSON body 传 URL 到 /v1/images/generations（适用于中转站）
 *
 * 改造为通过 Electron IPC 调用主进程代理，替代原 fetch('/api/openai-proxy')
 * 同步接口，直接返回图片数据，无需轮询
 */

import type { OpenAIImageParams } from '@comic/types';
import { comicProxy } from '@/api/comic';

/** 生图任务结果 */
export interface OpenAITaskResult {
  success: boolean
  /** 生成的图片 data URL 列表 */
  images: string[]
  /** 模型改写后的提示词列表 */
  revisedPrompts: string[]
  /** 实际生效的参数 */
  actualParams?: {
    size?: string
    quality?: string
    output_format?: string
  }
  error?: string
}

/** 生图请求参数 */
export interface OpenAIGenerateOptions {
  /** 模型名称，如 gpt-image-2 */
  model: string
  /** 提示词 */
  prompt: string
  /** 参考图列表（URL 或 data URL） */
  images?: string[]
  /** 图片尺寸，如 auto, 1024x1024, 1536x1024, 1024x1536 */
  size?: string
  /** 图片质量：auto/low/medium/high */
  quality?: string
  /** OpenAI 专属额外参数 */
  extraParams?: OpenAIImageParams
  /** 自定义 base URL */
  baseUrl?: string
}

/** OpenAI Images API 响应中的单个图片项 */
interface ImageResponseItem {
  b64_json?: string
  url?: string
  revised_prompt?: string
  size?: string
  quality?: string
  output_format?: string
}

/** OpenAI Images API 响应结构 */
interface ImageApiResponse {
  data: ImageResponseItem[]
  size?: string
  quality?: string
  output_format?: string
}

/**
 * 将 URL 或 data URL 转换为 PNG Blob
 * @param url - 图片 URL 或 data URL
 * @returns PNG 格式的 Blob
 */
async function urlToPngBlob(url: string): Promise<Blob> {
  // 如果是 data URL，直接 fetch 转 blob
  if (url.startsWith('data:')) {
    const response = await fetch(url)
    const blob = await response.blob()
    // 如果已经是 PNG，直接返回
    if (blob.type === 'image/png') return blob
    // 否则通过 canvas 转成 PNG
    return imageBlobToPngBlob(blob)
  }

  // HTTP URL，fetch 获取
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`获取参考图失败: ${response.status} ${response.statusText}`)
  }
  const blob = await response.blob()
  if (blob.type === 'image/png') return blob
  return imageBlobToPngBlob(blob)
}

/**
 * 将任意图片 Blob 转换为 PNG Blob（通过 Canvas）
 * @param blob - 原始图片 Blob
 * @returns PNG 格式的 Blob
 */
async function imageBlobToPngBlob(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器不支持 Canvas')
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result)
        else reject(new Error('图片转换 PNG 失败'))
      },
      'image/png'
    )
  })
}

/**
 * 将 Blob 转换为 base64 字符串（不含 data URL 前缀）
 * @param blob - Blob 对象
 * @returns base64 编码字符串
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      // 去掉 data:image/png;base64, 前缀
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * 将 base64 字符串转为 data URL
 * @param b64 - base64 编码的图片数据
 * @param mime - MIME 类型，默认 image/png
 * @returns data URL
 */
function base64ToDataUrl(b64: string, mime = 'image/png'): string {
  return `data:${mime};base64,${b64}`
}

/**
 * 判断是否为 HTTP(S) URL
 */
function isHttpUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}

/**
 * 将图片 URL 获取为 data URL（用于处理 API 返回的 HTTP 图片链接）
 * @param url - 图片 HTTP URL
 * @returns data URL
 */
async function fetchImageAsDataUrl(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`获取图片失败: ${response.status}`)
  }
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * 构建请求头（仅 Authorization，targetUrl 已包含完整路径）
 * @param apiKey - API Key
 * @returns 请求头对象
 */
function createHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
  }
}

/**
 * 拼接目标完整 URL
 * @param baseUrl - 基础 URL
 * @param path - API 路径（如 /v1/images/generations）
 * @returns 完整 URL
 */
function buildTargetUrl(baseUrl: string | undefined, path: string): string {
  const base = (baseUrl || '').replace(/\/+$/, '')
  return `${base}${path}`
}

/**
 * 解析 OpenAI Images API 响应
 * 处理 b64_json 和 url 两种返回格式
 * @param payload - API 响应数据
 * @returns 解析后的结果
 */
async function parseApiResponse(payload: ImageApiResponse): Promise<OpenAITaskResult> {
  const data = payload.data
  if (!Array.isArray(data) || data.length === 0) {
    return {
      success: false,
      images: [],
      revisedPrompts: [],
      error: '接口未返回图片数据',
    }
  }

  const images: string[] = []
  const revisedPrompts: string[] = []

  for (const item of data) {
    // 优先使用 b64_json
    if (item.b64_json) {
      images.push(base64ToDataUrl(item.b64_json))
      revisedPrompts.push(item.revised_prompt || '')
      continue
    }
    // 其次使用 url
    if (item.url && isHttpUrl(item.url)) {
      try {
        const dataUrl = await fetchImageAsDataUrl(item.url)
        images.push(dataUrl)
        revisedPrompts.push(item.revised_prompt || '')
      } catch {
        // URL 获取失败，跳过
        console.warn('获取返回图片 URL 失败:', item.url)
      }
      continue
    }
    // data URL
    if (item.url?.startsWith('data:')) {
      images.push(item.url)
      revisedPrompts.push(item.revised_prompt || '')
    }
  }

  if (images.length === 0) {
    return {
      success: false,
      images: [],
      revisedPrompts: [],
      error: '接口未返回可识别的图片数据',
    }
  }

  return {
    success: true,
    images,
    revisedPrompts,
    actualParams: {
      size: data[0]?.size,
      quality: data[0]?.quality,
      output_format: data[0]?.output_format,
    },
  }
}

export const openaiImageService = {
  /**
   * 使用标准 OpenAI Images API 生图（同步）
   * 无参考图时调用 /v1/images/generations
   * 有参考图时调用 /v1/images/edits（multipart 上传）
   *
   * @param apiKey - API Key
   * @param options - 生图参数
   * @returns 生图结果（包含图片 data URL 列表）
   */
  async generate(
    apiKey: string,
    options: OpenAIGenerateOptions
  ): Promise<OpenAITaskResult> {
    const {
      model,
      prompt,
      images = [],
      size,
      quality,
      extraParams,
      baseUrl,
    } = options

    const outputFormat = extraParams?.outputFormat || 'png'
    const n = extraParams?.n || 1
    const moderation = extraParams?.moderation || 'auto'
    const outputCompression = extraParams?.outputCompression
    const compatibleMode = extraParams?.compatibleMode || false

    try {
      if (images.length === 0) {
        // 无参考图：使用 /v1/images/generations
        return await this.generateTextOnly({
          apiKey,
          model,
          prompt,
          size,
          quality,
          outputFormat,
          n,
          moderation,
          outputCompression,
          baseUrl,
        })
      }

      if (compatibleMode) {
        // 兼容模式：JSON body 传 URL（适用于中转站）
        return await this.generateWithCompatibleMode({
          apiKey,
          model,
          prompt,
          images,
          size,
          quality,
          outputFormat,
          n,
          moderation,
          outputCompression,
          baseUrl,
        })
      }

      // 标准模式：multipart 上传参考图到 /v1/images/edits
      return await this.generateWithEdit({
        apiKey,
        model,
        prompt,
        images,
        size,
        quality,
        outputFormat,
        n,
        moderation,
        outputCompression,
        baseUrl,
      })
    } catch (error) {
      return {
        success: false,
        images: [],
        revisedPrompts: [],
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  },

  /**
   * 纯文字生图：POST /v1/images/generations
   * 通过 IPC 代理转发 JSON 请求
   * @private
   */
  async generateTextOnly(params: {
    apiKey: string
    model: string
    prompt: string
    size?: string
    quality?: string
    outputFormat: string
    n: number
    moderation: string
    outputCompression?: number
    baseUrl?: string
  }): Promise<OpenAITaskResult> {
    const {
      apiKey, model, prompt, size, quality,
      outputFormat, n, moderation, outputCompression, baseUrl,
    } = params

    const targetUrl = buildTargetUrl(baseUrl, '/v1/images/generations')

    const body: Record<string, unknown> = {
      model,
      prompt,
      n,
      output_format: outputFormat,
      moderation,
    }
    if (size) body.size = size
    if (quality) body.quality = quality
    if (outputFormat !== 'png' && outputCompression != null) {
      body.output_compression = outputCompression
    }

    const response = await comicProxy.proxy({
      method: 'POST',
      targetUrl,
      headers: createHeaders(apiKey),
      body: JSON.stringify(body),
    })

    if (response.status < 200 || response.status >= 300) {
      const errorText = typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data || '')
      throw new Error(
        `OpenAI API 错误 (${response.status}): ${this.extractErrorMessage(errorText)}`
      )
    }

    const payload: ImageApiResponse = response.data as ImageApiResponse
    return parseApiResponse(payload)
  },

  /**
   * 参考图编辑：POST /v1/images/edits（multipart/form-data）
   * 标准 OpenAI 模式，将参考图转为 PNG 后通过 IPC 代理上传
   * @private
   */
  async generateWithEdit(params: {
    apiKey: string
    model: string
    prompt: string
    images: string[]
    size?: string
    quality?: string
    outputFormat: string
    n: number
    moderation: string
    outputCompression?: number
    baseUrl?: string
  }): Promise<OpenAITaskResult> {
    const {
      apiKey, model, prompt, images, size, quality,
      outputFormat, n, moderation, outputCompression, baseUrl,
    } = params

    const targetUrl = buildTargetUrl(baseUrl, '/v1/images/edits')

    // 构建文本字段
    const fields: Record<string, string> = {
      model,
      prompt,
      output_format: outputFormat,
      n: String(n),
      moderation,
    }
    if (size) fields.size = size
    if (quality) fields.quality = quality
    if (outputFormat !== 'png' && outputCompression != null) {
      fields.output_compression = String(outputCompression)
    }

    // 将参考图 URL 转为 PNG Blob 再转 base64
    const files: Array<{ field: string; filename: string; base64: string; mimetype: string }> = []
    for (let i = 0; i < images.length; i++) {
      try {
        const blob = await urlToPngBlob(images[i])
        const base64 = await blobToBase64(blob)
        files.push({
          field: 'image[]',
          filename: `reference_${i}.png`,
          base64,
          mimetype: 'image/png',
        })
      } catch (err) {
        console.warn(`参考图 ${i + 1} 转换失败，跳过:`, err)
      }
    }

    const response = await comicProxy.proxy({
      method: 'POST',
      targetUrl,
      headers: createHeaders(apiKey),
      formData: { fields, files },
    })

    if (response.status < 200 || response.status >= 300) {
      const errorText = typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data || '')
      throw new Error(
        `OpenAI API 错误 (${response.status}): ${this.extractErrorMessage(errorText)}`
      )
    }

    const payload: ImageApiResponse = response.data as ImageApiResponse
    return parseApiResponse(payload)
  },

  /**
   * 兼容模式：POST /v1/images/generations（JSON body 传 URL）
   * 适用于支持 image 字段的中转站（如 New API、duomiapi 等）
   * @private
   */
  async generateWithCompatibleMode(params: {
    apiKey: string
    model: string
    prompt: string
    images: string[]
    size?: string
    quality?: string
    outputFormat: string
    n: number
    moderation: string
    outputCompression?: number
    baseUrl?: string
  }): Promise<OpenAITaskResult> {
    const {
      apiKey, model, prompt, images, size, quality,
      outputFormat, n, moderation, outputCompression, baseUrl,
    } = params

    const targetUrl = buildTargetUrl(baseUrl, '/v1/images/generations')

    const body: Record<string, unknown> = {
      model,
      prompt,
      image: images, // 兼容中转站的 image 字段
      n,
      output_format: outputFormat,
      moderation,
    }
    if (size) body.size = size
    if (quality) body.quality = quality
    if (outputFormat !== 'png' && outputCompression != null) {
      body.output_compression = outputCompression
    }

    const response = await comicProxy.proxy({
      method: 'POST',
      targetUrl,
      headers: createHeaders(apiKey),
      body: JSON.stringify(body),
    })

    if (response.status < 200 || response.status >= 300) {
      const errorText = typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data || '')
      throw new Error(
        `OpenAI API 错误 (${response.status}): ${this.extractErrorMessage(errorText)}`
      )
    }

    const payload: ImageApiResponse = response.data as ImageApiResponse
    return parseApiResponse(payload)
  },

  /**
   * 从错误响应文本中提取错误信息
   * @param errorText - 错误响应文本（JSON 或纯文本）
   * @returns 错误信息字符串
   */
  extractErrorMessage(errorText: string): string {
    try {
      const errorJson = JSON.parse(errorText)
      return errorJson?.error?.message || errorText || '未知错误'
    } catch {
      return errorText || '未知错误'
    }
  },
}

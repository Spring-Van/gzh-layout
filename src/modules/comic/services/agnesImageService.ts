/** Agnes Image API 适配器。
 *
 * Agnes 与 OpenAI Images API 共用 generations 路径，但参数略有差异：
 * size 使用 1K/2K/3K/4K，ratio 单独传递；参考图和 response_format
 * 必须放在 extra_body 中。
 */
import { comicProxy } from '@/api/comic'

export interface AgnesGenerateOptions {
  model: string
  prompt: string
  size: string
  ratio?: string
  images?: string[]
  baseUrl?: string
  responseFormat?: 'url' | 'b64_json'
}

interface AgnesImageItem {
  url?: string | null
  b64_json?: string | null
  revised_prompt?: string | null
}

interface AgnesResponse {
  data?: AgnesImageItem[]
  error?: { message?: string } | string
}

const DEFAULT_BASE_URL = 'https://apihub.agnes-ai.com'

function buildTargetUrl(baseUrl?: string): string {
  const base = (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')
  if (/\/v1\/images\/generations$/i.test(base)) return base
  if (/\/v1$/i.test(base)) return `${base}/images/generations`
  return `${base}/v1/images/generations`
}

function b64ToDataUrl(value: string): string {
  return value.startsWith('data:') ? value : `data:image/png;base64,${value}`
}

function errorMessage(payload: AgnesResponse, status: number): string {
  if (typeof payload.error === 'string') return payload.error
  if (payload.error?.message) return payload.error.message
  return `Agnes API 错误 (${status})`
}

export const agnesImageService = {
  async generate(apiKey: string, options: AgnesGenerateOptions): Promise<{ success: boolean; images: string[]; error?: string }> {
    const body: Record<string, unknown> = {
      model: options.model || 'agnes-image-2.5-flash',
      prompt: options.prompt,
      // Agnes 要求 size 必填；兼容历史精确尺寸写法。
      size: options.size || '1K',
      extra_body: {
        response_format: options.responseFormat || 'url',
        ...(options.images?.length ? { image: options.images } : {}),
      },
    }
    if (options.ratio) body.ratio = options.ratio

    const response = await comicProxy.proxy({
      method: 'POST',
      targetUrl: buildTargetUrl(options.baseUrl),
      headers: { Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    })
    const payload = (response.data || {}) as AgnesResponse
    if (response.status < 200 || response.status >= 300) {
      return { success: false, images: [], error: errorMessage(payload, response.status) }
    }

    const images = (Array.isArray(payload.data) ? payload.data : []).flatMap(item => {
      if (item.b64_json) return [b64ToDataUrl(item.b64_json)]
      if (item.url) return [item.url]
      return []
    })
    return images.length
      ? { success: true, images }
      : { success: false, images: [], error: 'Agnes 接口未返回可识别的图片数据' }
  },
}

export { buildTargetUrl as buildAgnesTargetUrl }

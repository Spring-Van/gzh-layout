import { beforeEach, describe, expect, it, vi } from 'vitest'

const { proxy } = vi.hoisted(() => ({ proxy: vi.fn() }))

vi.mock('@/api/comic', () => ({ comicProxy: { proxy } }))

import { agnesImageService } from '../../src/modules/comic/services/agnesImageService'

describe('agnesImageService', () => {
  beforeEach(() => proxy.mockReset())

  it('按 Agnes 文档组装文生图请求', async () => {
    proxy.mockResolvedValue({
      status: 200,
      data: { data: [{ url: 'https://cdn.example.com/generated.png' }] },
    })

    const result = await agnesImageService.generate('test-key', {
      model: 'agnes-image-2.5-flash',
      prompt: '一只猫',
      size: '2K',
      ratio: '3:4',
      baseUrl: 'https://apihub.agnes-ai.com',
    })

    expect(result).toEqual({ success: true, images: ['https://cdn.example.com/generated.png'] })
    const request = proxy.mock.calls[0][0]
    expect(request.targetUrl).toBe('https://apihub.agnes-ai.com/v1/images/generations')
    expect(JSON.parse(request.body)).toEqual({
      model: 'agnes-image-2.5-flash',
      prompt: '一只猫',
      size: '2K',
      ratio: '3:4',
      extra_body: { response_format: 'url' },
    })
  })

  it('将参考图放入 extra_body.image，并兼容 Base64 返回', async () => {
    proxy.mockResolvedValue({ status: 200, data: { data: [{ b64_json: 'abc123' }] } })

    const result = await agnesImageService.generate('test-key', {
      model: 'agnes-image-2.5-flash',
      prompt: '编辑',
      size: '1K',
      images: ['data:image/png;base64,input'],
      baseUrl: 'https://apihub.agnes-ai.com/v1',
      responseFormat: 'b64_json',
    })

    expect(result.images[0]).toBe('data:image/png;base64,abc123')
    const body = JSON.parse(proxy.mock.calls[0][0].body)
    expect(body.extra_body).toEqual({
      image: ['data:image/png;base64,input'],
      response_format: 'b64_json',
    })
    expect(proxy.mock.calls[0][0].targetUrl).toBe('https://apihub.agnes-ai.com/v1/images/generations')
  })
})

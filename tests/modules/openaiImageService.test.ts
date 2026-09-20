import { beforeEach, describe, expect, it, vi } from 'vitest';

const { proxy } = vi.hoisted(() => ({ proxy: vi.fn() }));

vi.mock('@/api/comic', () => ({
  comicProxy: { proxy },
}));

import { openaiImageService } from '../../src/modules/comic/services/openaiImageService';

describe('openaiImageService — 参考图顺序完整性', () => {
  beforeEach(() => {
    proxy.mockReset();
    vi.unstubAllGlobals();
  });

  it('兼容模式按调用方数组原序发送全部参考图', async () => {
    proxy.mockResolvedValue({
      status: 200,
      data: { data: [{ b64_json: 'generated-image' }] },
    });

    const result = await openaiImageService.generate('test-key', {
      model: 'gpt-image-2',
      prompt: '测试画面',
      images: ['image-3', 'image-1', 'image-2'],
      baseUrl: 'https://example.com',
      extraParams: { compatibleMode: true },
    });

    expect(result.success).toBe(true);
    expect(proxy).toHaveBeenCalledTimes(1);
    const request = proxy.mock.calls[0][0];
    expect(JSON.parse(request.body).image).toEqual(['image-3', 'image-1', 'image-2']);
  });

  it('标准模式任一参考图转换失败时整体中止，避免跳图造成图号偏移', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    }));

    const result = await openaiImageService.generate('test-key', {
      model: 'gpt-image-2',
      prompt: '测试画面',
      images: ['https://example.com/missing.png', 'https://example.com/second.png'],
      baseUrl: 'https://example.com',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('参考图 1 转换失败，已停止生成');
    expect(proxy).not.toHaveBeenCalled();
  });
});

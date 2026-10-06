import { describe, expect, it } from 'vitest';
import { toFastDisplayImageUrl } from '../../src/shared/image/imageUrl';

/**
 * 内联图片显示加速：dataURL → 缓存的 blob URL。
 *
 * 这一层直接决定「切多张成图 / 一屏缩略图」的手感：3~11MB 的 dataURL 每次渲染都要重新解析、
 * 解码落在主线程上，换成短 blob URL 后浏览器可缓存解码结果。测试锁住三件事：
 * 非内联地址不受影响、同一张图只转一次、脏数据不抛错。
 */

/** 1x1 PNG，体积足够小，仅用于验证转换链路。 */
const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==';

/** 第二张不同的图（另一段 base64），用于验证缓存按内容区分。 */
const OTHER_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAAH/GBcSiwAAAABJRU5ErkJggg==';

describe('toFastDisplayImageUrl', () => {
  it('空值返回空串（模板里可直接当 src 用）', () => {
    expect(toFastDisplayImageUrl()).toBe('');
    expect(toFastDisplayImageUrl('')).toBe('');
  });

  it('非内联地址原样返回，本地路径仍走 app-image 协议', () => {
    expect(toFastDisplayImageUrl('https://example.com/a.png')).toBe('https://example.com/a.png');
    expect(toFastDisplayImageUrl('app-image://history/a.png')).toBe('app-image://history/a.png');
    expect(toFastDisplayImageUrl('blob:https://example.com/id')).toBe('blob:https://example.com/id');
    expect(toFastDisplayImageUrl('C:\\images\\a.png')).toBe('app-image://local/C%3A%2Fimages%2Fa.png');
  });

  it('内联 dataURL 换成 blob URL', () => {
    expect(toFastDisplayImageUrl(PNG_DATA_URL).startsWith('blob:')).toBe(true);
  });

  it('同一张图只转一次：重复调用返回同一条 URL（缓存命中）', () => {
    expect(toFastDisplayImageUrl(PNG_DATA_URL)).toBe(toFastDisplayImageUrl(PNG_DATA_URL));
  });

  it('不同图各自独立，不会互相串用缓存', () => {
    expect(toFastDisplayImageUrl(PNG_DATA_URL)).not.toBe(toFastDisplayImageUrl(OTHER_PNG_DATA_URL));
  });

  it('非 base64 的 dataURL（URL 编码）同样可转', () => {
    const svg = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E';
    expect(toFastDisplayImageUrl(svg).startsWith('blob:')).toBe(true);
  });

  it('格式异常的 dataURL 回落原值，不抛错', () => {
    expect(toFastDisplayImageUrl('data:image/png;base64')).toBe('data:image/png;base64');
    expect(toFastDisplayImageUrl('data:image/png;base64,%%%%')).toBe('data:image/png;base64,%%%%');
  });
});

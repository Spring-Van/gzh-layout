const DISPLAY_IMAGE_PROTOCOL_RE = /^(?:data:|blob:|https?:|app-image:)/i;

/**
 * 将本地图片路径转换为渲染进程可展示的 file URL。
 * 已经是 data/blob/file/http(s) URL 的值保持不变。
 */
export function toDisplayImageUrl(source: string): string {
  if (!source || DISPLAY_IMAGE_PROTOCOL_RE.test(source)) {
    return source;
  }

  const normalized = source.replace(/^file:\/\/+/, "").replace(/\\/g, "/");
  return `app-image://local/${encodeURIComponent(normalized)}`;
}

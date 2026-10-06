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

/**
 * dataURL → Blob URL 的显示缓存（键是原始 dataURL）。
 *
 * 长篇分镜成图 / 资产图以 3~11MB 的内联 base64 存在项目数据里，直接把它塞给
 * `<img src>` 有两个代价：
 *   1. 每次渲染浏览器都要重新解析整条超长 URL，大 dataURL 的解码落在主线程上；
 *   2. dataURL 的解码结果基本不进图像缓存，来回切换候选图时每次都是冷启动。
 * 换成短 blob URL 后解码可交给浏览器的图像解码线程，且按 URL 命中解码缓存，
 * 于是「切多张图」从每次都重解码变成几乎零成本。
 *
 * 转换本身很便宜：实测 3MB ≈ 8ms、11MB ≈ 30ms（V8 的 atob 有快路径），
 * 所以可以放心地在渲染路径里同步做，转一次之后全部命中缓存。
 */
const MAX_BLOB_CACHE = 32;
const blobUrlCache = new Map<string, string>();

/** 把内联 dataURL 换成 blob URL（非 dataURL 原样交给 toDisplayImageUrl）。 */
export function toFastDisplayImageUrl(source?: string): string {
  if (!source) return "";
  const cached = blobUrlCache.get(source);
  if (cached) {
    // LRU：命中的挪到队尾，活跃显示的图不会被淘汰
    blobUrlCache.delete(source);
    blobUrlCache.set(source, cached);
    return cached;
  }
  if (!source.startsWith("data:")) return toDisplayImageUrl(source);

  const url = dataUrlToBlobUrl(source);
  if (!url) return source;
  blobUrlCache.set(source, url);

  while (blobUrlCache.size > MAX_BLOB_CACHE) {
    const oldest = blobUrlCache.keys().next().value;
    if (oldest === undefined) break;
    const stale = blobUrlCache.get(oldest);
    blobUrlCache.delete(oldest);
    // 已加载进 <img> 的图不会因为 revoke 而消失；未加载的会在下次渲染时按需重建
    if (stale) URL.revokeObjectURL(stale);
  }
  return url;
}

/** 把一条 dataURL 解成二进制并包成 Blob URL；格式异常时返回空串由调用方回落。 */
function dataUrlToBlobUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return "";
  const header = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  const mime = header.slice(5, header.indexOf(";") >= 0 ? header.indexOf(";") : header.length) || "image/png";
  try {
    const bytes = /;base64/i.test(header) ? base64ToBytes(payload) : new TextEncoder().encode(decodeURIComponent(payload));
    // 用底层的 buffer 而不是视图本身：TS 的 Uint8Array<ArrayBufferLike> 不直接满足 BlobPart，
    // 而这里的 bytes 恰好占满整块 buffer，传 buffer 是零拷贝且语义等价
    return URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: mime }));
  } catch {
    return "";
  }
}

/** base64 → 字节数组；用显式循环而不是 Array.from 映射，避免大图产生中间数组。 */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * 把项目内的图片引用解析成「能直接发给第三方模型」的形式。
 *
 * 图片外置后，参考图字段里存的是 `app-image://comic/...` —— 那是应用私有协议，
 * 第三方生图服务取不到图。所以把参考图塞进请求体之前必须先读回来还原成 dataURL。
 * data / http(s) 本来就是可直接外发的形式，原样返回。
 *
 * 读取失败时抛错而不是跳过：静默少发一张参考图会直接改变出图结果，比报错更难排查。
 */
export async function resolveModelInputImage(source: string): Promise<string> {
  if (!source || !source.startsWith("app-image://")) return source;
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`参考图读取失败（HTTP ${response.status}）`);
  }
  return blobToDataUrl(await response.blob());
}

/** 批量解析参考图，保持原有顺序。 */
export async function resolveModelInputImages(sources: string[]): Promise<string[]> {
  if (!sources.length) return [];
  return Promise.all(sources.map((source) => resolveModelInputImage(source)));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("参考图读取失败"));
    reader.readAsDataURL(blob);
  });
}

/**
 * LLM 请求传输层
 *
 * 在 Electron 中把请求交给主进程发出（electronAPI.comic.llm），主进程没有 Origin、
 * 不做 CORS 检查，因此不受网关是否实现 OPTIONS 预检影响；同时 net.fetch 走
 * Chromium 网络栈，**默认继承系统代理**（可用 `bypassProxy` 选项强制直连）。
 *
 * 主进程推来的分片在这里被还原成一个**真实的 Response 对象**，所以调用方
 * （llmService）可以继续用 `response.ok / status / text() / body.getReader()`
 * 这套原生语义，无需感知传输方式。
 *
 * 非 Electron 环境（单测、纯浏览器调试）自动回退到原生 fetch。
 */

interface LlmBridgeEvent {
  requestId: string;
  type: 'chunk' | 'end' | 'error';
  chunk?: unknown;
  message?: string;
}

interface LlmBridgeMeta {
  status?: number;
  statusText?: string;
  headers?: Array<[string, string]>;
  error?: string;
}

interface LlmBridge {
  fetchStart: (request: {
    requestId: string;
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
    /** 绕过系统代理直连（主进程用独立会话实现） */
    bypassProxy?: boolean;
  }) => Promise<LlmBridgeMeta>;
  fetchAbort: (requestId: string) => void;
  onFetchEvent: (callback: (event: LlmBridgeEvent) => void) => () => void;
}

/**
 * 读取主进程注入的桥接对象；不存在时返回 undefined（不抛错，便于在非 Electron 下回退）。
 *
 * ⚠️ 路径必须是 `electronAPI.comic.llm` —— preload 里桥接挂在 comic 命名空间下，
 * 不是顶层的 `electronAPI.llm`。写错层级会让探测**静默失败**（回退到渲染进程 fetch），
 * 表现为「明明改成了主进程转发，还是被 CORS 拦」。同时兼容顶层写法，降低再次写错的风险。
 */
function getLlmBridge(): LlmBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  const api = (window as unknown as {
    electronAPI?: { llm?: unknown; comic?: { llm?: unknown } };
  }).electronAPI;
  for (const candidate of [api?.comic?.llm, api?.llm]) {
    const bridge = candidate as LlmBridge | undefined;
    if (bridge && typeof bridge.fetchStart === 'function') return bridge;
  }
  return undefined;
}

/** 请求实际走的通道：主进程转发（Electron）或渲染进程直连（浏览器） */
export type TransportChannel = 'electron-main' | 'browser';

/** 供调用方把网络失败归因到具体通道，避免「浏览器直连」被误判成主进程问题 */
export function getTransportChannel(): TransportChannel {
  return getLlmBridge() ? 'electron-main' : 'browser';
}

let requestSeq = 0;

function nextRequestId(): string {
  requestSeq += 1;
  return `llm-${Date.now()}-${requestSeq}`;
}

/** 把 HeadersInit 归一化成普通对象，便于通过 IPC 传递 */
function toHeaderRecord(headers?: HeadersInit): Record<string, string> {
  const record: Record<string, string> = {};
  if (!headers) return record;
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    headers.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }
  if (Array.isArray(headers)) {
    for (const [key, value] of headers) record[key] = value;
    return record;
  }
  for (const [key, value] of Object.entries(headers as Record<string, string>)) {
    record[key] = value;
  }
  return record;
}

/**
 * IPC 结构化克隆可能把二进制还原成 Uint8Array / ArrayBuffer / 普通数组，
 * 统一转成 Uint8Array 交给 Response body。
 */
function toUint8Array(value: unknown): Uint8Array {
  if (!value) return new Uint8Array(0);
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (Array.isArray(value)) return new Uint8Array(value as number[]);
  if (typeof value === 'string') return new TextEncoder().encode(value);
  return new Uint8Array(0);
}

/** Response 构造器不接受 204/205/304 携带 body */
function isNullBodyStatus(status: number): boolean {
  return status === 204 || status === 205 || status === 304;
}

async function bridgedFetch(
  url: string,
  init: RequestInit,
  bridge: LlmBridge,
  bypassProxy: boolean,
): Promise<Response> {
  const requestId = nextRequestId();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let unsubscribe: (() => void) | null = null;

  const cleanup = () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    start(streamController) {
      controller = streamController;
    },
    cancel() {
      // 调用方提前放弃读取（例如组件卸载）时通知主进程释放连接
      cleanup();
      bridge.fetchAbort(requestId);
    },
  });

  unsubscribe = bridge.onFetchEvent((event) => {
    // 先取局部引用，避免 TS 对闭包内可变变量的收窄失效
    const streamController = controller;
    if (!event || event.requestId !== requestId || !streamController) return;
    if (event.type === 'chunk') {
      const chunk = toUint8Array(event.chunk);
      if (chunk.length) streamController.enqueue(chunk);
      return;
    }
    cleanup();
    try {
      if (event.type === 'end') streamController.close();
      else streamController.error(new Error(event.message || '主进程读取响应失败'));
    } catch {
      // 流可能已被 cancel() 关闭
    }
  });

  let meta: LlmBridgeMeta;
  try {
    meta = await bridge.fetchStart({
      requestId,
      url,
      method: (init.method as string) || 'GET',
      headers: toHeaderRecord(init.headers),
      body: typeof init.body === 'string' ? init.body : undefined,
      bypassProxy,
    });
  } catch (error) {
    cleanup();
    throw new TypeError(error instanceof Error ? error.message : '主进程请求失败');
  }

  // 与原生 fetch 一致：网络层失败以异常抛出，而不是返回一个伪造的响应
  if (meta?.error || !meta?.status || meta.status < 200 || meta.status > 599) {
    cleanup();
    throw new TypeError(meta?.error || `无效的响应状态码（${meta?.status ?? '未知'}）`);
  }

  if (isNullBodyStatus(meta.status)) {
    cleanup();
    bridge.fetchAbort(requestId);
    return new Response(null, {
      status: meta.status,
      statusText: meta.statusText || '',
      headers: meta.headers || [],
    });
  }

  return new Response(stream, {
    status: meta.status,
    statusText: meta.statusText || '',
    headers: meta.headers || [],
  });
}

export interface TransportOptions {
  /**
   * 绕过系统代理，强制直连（仅 Electron 主进程转发支持）。
   *
   * 系统代理是「明明配对了却连不上」的常见来源：`net.fetch` 默认继承系统代理，
   * 本机代理（Clash / v2ray 等）若对该域名线路不通，连接会被对端关闭，
   * 表现为 `net::ERR_CONNECTION_CLOSED`，而直连往往完全正常。
   * 非 Electron 环境无从控制代理，该选项被忽略。
   */
  bypassProxy?: boolean;
}

/**
 * 发起 LLM 请求。Electron 下经主进程转发，其他环境回退原生 fetch。
 * 返回值语义与 `fetch()` 完全一致。
 */
export function transportFetch(
  url: string,
  init: RequestInit = {},
  options: TransportOptions = {},
): Promise<Response> {
  const bridge = getLlmBridge();
  if (bridge) return bridgedFetch(url, init, bridge, Boolean(options.bypassProxy));
  return globalThis.fetch(url, init);
}

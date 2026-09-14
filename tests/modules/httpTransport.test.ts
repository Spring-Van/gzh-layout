import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTransportChannel, transportFetch } from '../../src/modules/comic/services/httpTransport';

type BridgeEvent =
  | { requestId: string; type: 'chunk'; chunk: unknown }
  | { requestId: string; type: 'end' }
  | { requestId: string; type: 'error'; message: string };

interface FakeBridge {
  fetchStart: ReturnType<typeof vi.fn>;
  fetchAbort: ReturnType<typeof vi.fn>;
  onFetchEvent: (callback: (event: BridgeEvent) => void) => () => void;
  emit: (event: BridgeEvent) => void;
  started: Array<Record<string, unknown>>;
}

/**
 * 造一个假的主进程桥接：fetchStart 只返回元信息，body 分片由测试用例手动 emit，
 * 以便精确控制「元信息先到、分片后到」的时序。
 */
function installBridge(meta: Record<string, unknown>): FakeBridge {
  const listeners = new Set<(event: BridgeEvent) => void>();
  const started: Array<Record<string, unknown>> = [];

  const bridge = {
    started,
    emit(event: BridgeEvent) {
      listeners.forEach((listener) => listener(event));
    },
    fetchStart: vi.fn(async (request: Record<string, unknown>) => {
      started.push(request);
      return meta;
    }),
    fetchAbort: vi.fn(),
    onFetchEvent(callback: (event: BridgeEvent) => void) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };

  // ⚠️ 路径必须与 preload 实际暴露的层级一致：electronAPI.comic.llm
  // （曾经这里误写成 electronAPI.llm，测试跟着一起错，导致桥接探测静默失败却全绿）
  vi.stubGlobal('window', { electronAPI: { comic: { llm: bridge } } });
  return bridge as unknown as FakeBridge;
}

const requestIdOf = (bridge: FakeBridge) => String(bridge.started[0].requestId);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('transportFetch · 主进程桥接', () => {
  it('元信息与分片被还原成真实 Response', async () => {
    const bridge = installBridge({
      status: 200,
      statusText: 'OK',
      headers: [['content-type', 'application/json']],
    });

    const pending = transportFetch('https://token.sensenova.cn/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer k' },
      body: '{"model":"m"}',
    });

    const response = await pending;
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json');

    const requestId = requestIdOf(bridge);
    bridge.emit({ requestId, type: 'chunk', chunk: new TextEncoder().encode('{"cho') });
    bridge.emit({ requestId, type: 'chunk', chunk: new TextEncoder().encode('ices":[]}') });
    bridge.emit({ requestId, type: 'end' });

    expect(await response.text()).toBe('{"choices":[]}');
  });

  it('把方法、请求头与请求体透传给主进程', async () => {
    const bridge = installBridge({ status: 200, headers: [] });

    await transportFetch('https://x.test/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer secret' },
      body: '{"a":1}',
    });

    expect(bridge.started[0]).toMatchObject({
      url: 'https://x.test/v1/chat/completions',
      method: 'POST',
      headers: { Authorization: 'Bearer secret' },
      body: '{"a":1}',
    });
  });

  it('分片可经 body.getReader() 逐块读取（流式语义不变）', async () => {
    const bridge = installBridge({ status: 200, headers: [] });
    const response = await transportFetch('https://x.test/v1/chat/completions', { method: 'POST' });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    const requestId = requestIdOf(bridge);
    bridge.emit({ requestId, type: 'chunk', chunk: new TextEncoder().encode('Hel') });

    const first = await reader.read();
    expect(decoder.decode(first.value)).toBe('Hel');

    bridge.emit({ requestId, type: 'chunk', chunk: new TextEncoder().encode('lo') });
    bridge.emit({ requestId, type: 'end' });

    let rest = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      rest += decoder.decode(value);
    }
    expect(rest).toBe('lo');
  });

  it('二进制分片以普通数组形式到达时也能还原（IPC 结构化克隆）', async () => {
    const bridge = installBridge({ status: 200, headers: [] });
    const response = await transportFetch('https://x.test/v1/chat/completions', { method: 'POST' });

    const bytes = Array.from(new TextEncoder().encode('ok'));
    bridge.emit({ requestId: requestIdOf(bridge), type: 'chunk', chunk: bytes });
    bridge.emit({ requestId: requestIdOf(bridge), type: 'end' });

    expect(await response.text()).toBe('ok');
  });

  it('主进程报告网络层失败时抛出 TypeError（与原生 fetch 语义一致）', async () => {
    installBridge({ error: 'getaddrinfo ENOTFOUND token.sensenova.cn' });

    await expect(transportFetch('https://x.test/v1/chat/completions', { method: 'POST' })).rejects.toThrow(
      /ENOTFOUND/,
    );
  });

  it('204 等无 body 状态码不构造带流的 Response', async () => {
    installBridge({ status: 204, statusText: 'No Content', headers: [] });

    const response = await transportFetch('https://x.test/v1/chat/completions', { method: 'POST' });

    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });

  it('调用方取消读取时通知主进程释放连接', async () => {
    const bridge = installBridge({ status: 200, headers: [] });
    const response = await transportFetch('https://x.test/v1/chat/completions', { method: 'POST' });

    await response.body!.cancel();

    expect(bridge.fetchAbort).toHaveBeenCalledWith(requestIdOf(bridge));
  });

  it('bypassProxy 选项透传给主进程（用于绕过系统代理直连）', async () => {
    const bridge = installBridge({ status: 200, headers: [] });

    await transportFetch(
      'https://x.test/v1/chat/completions',
      { method: 'POST' },
      { bypassProxy: true },
    );

    expect(bridge.started[0].bypassProxy).toBe(true);
  });

  it('未指定 bypassProxy 时如实传 false（默认跟随系统代理）', async () => {
    const bridge = installBridge({ status: 200, headers: [] });

    await transportFetch('https://x.test/v1/chat/completions', { method: 'POST' });

    expect(bridge.started[0].bypassProxy).toBe(false);
  });
});

describe('transportFetch · 回退', () => {
  it('非 Electron 环境回退到原生 fetch', async () => {
    // 不注入 window.electronAPI，模拟单测 / 纯浏览器调试
    const spy = vi.fn(async () => new Response('fallback', { status: 200 }));
    vi.stubGlobal('fetch', spy);

    const response = await transportFetch('https://x.test/v1/chat/completions', { method: 'POST' });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(await response.text()).toBe('fallback');
  });

  it('兼容顶层 electronAPI.llm 写法（降低层级写错的风险）', async () => {
    const bridge = installBridge({ status: 200, headers: [] });
    // 覆盖上一行 stub，改挂到顶层
    vi.stubGlobal('window', { electronAPI: { llm: bridge } });

    expect(getTransportChannel()).toBe('electron-main');
  });

  it('主进程报错时抛出带原始信息与通道归因的提示', async () => {
    installBridge({ error: 'net::ERR_FAILED' });

    await expect(transportFetch('https://x.test/v1/chat/completions', { method: 'POST' })).rejects.toThrow(
      /net::ERR_FAILED/,
    );
  });
});

describe('transportFetch · 通道判定', () => {
  it('探测到桥接时判定为主进程转发', () => {
    installBridge({ status: 200, headers: [] });
    expect(getTransportChannel()).toBe('electron-main');
  });

  it('未注入桥接时判定为浏览器直连', () => {
    expect(getTransportChannel()).toBe('browser');
  });
});

describe('preload 契约', () => {
  it('preload 暴露的桥接层级与 httpTransport 读取的层级一致', () => {
    const preload = readFileSync(resolve(process.cwd(), 'electron/preload.ts'), 'utf8');

    // exposeInMainWorld 的第一个参数是全局名
    expect(preload).toMatch(/exposeInMainWorld\(\s*'electronAPI'/);

    // comic 命名空间必须存在，且 llm 桥接挂在其内部
    const comicStart = preload.indexOf('comic: {');
    expect(comicStart).toBeGreaterThan(-1);
    expect(preload.slice(comicStart)).toMatch(/llm:\s*\{[\s\S]*?fetchStart:/);
  });
});

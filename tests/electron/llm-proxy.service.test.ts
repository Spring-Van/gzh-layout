import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { netFetch, directFetch, setProxy, fromPartition } = vi.hoisted(() => ({
  netFetch: vi.fn(),
  directFetch: vi.fn(),
  setProxy: vi.fn(),
  fromPartition: vi.fn(),
}));

vi.mock('electron', () => ({
  net: { fetch: netFetch },
  session: { fromPartition },
}));

const { LlmProxyService } = await import('../../electron/services/llm-proxy.service');

type Emitted = { requestId: string; type: string; chunk?: Uint8Array; message?: string };

function collect() {
  const events: Emitted[] = [];
  return { events, emit: (event: Emitted) => events.push(event) };
}

function streamResponse(chunks: string[], status = 200, headers: Record<string, string> = {}) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    { status, headers },
  );
}

/** 让 pump 的后台循环跑完 */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  setProxy.mockResolvedValue(undefined);
  fromPartition.mockReturnValue({ setProxy, fetch: directFetch });
});

afterEach(() => {
  netFetch.mockReset();
  directFetch.mockReset();
  setProxy.mockReset();
  fromPartition.mockReset();
});

describe('LlmProxyService.start', () => {
  it('先返回响应元信息，再异步推送 body 分片', async () => {
    netFetch.mockResolvedValue(
      streamResponse(['{"cho', 'ices":[]}'], 200, { 'content-type': 'application/json' }),
    );

    const service = new LlmProxyService();
    const { events, emit } = collect();

    const meta = await service.start({ requestId: 'r1', url: 'https://x.test/v1/chat/completions' }, emit);

    expect(meta.status).toBe(200);
    expect(meta.headers).toContainEqual(['content-type', 'application/json']);
    expect(meta.error).toBeUndefined();

    await flush();

    const text = events
      .filter((event) => event.type === 'chunk')
      .map((event) => new TextDecoder().decode(event.chunk))
      .join('');
    expect(text).toBe('{"choices":[]}');
    expect(events.at(-1)?.type).toBe('end');
    expect(events.every((event) => event.requestId === 'r1')).toBe(true);
  });

  it('透传方法、请求头与请求体', async () => {
    netFetch.mockResolvedValue(streamResponse(['{}']));

    const service = new LlmProxyService();
    await service.start(
      {
        requestId: 'r2',
        url: 'https://x.test/v1/chat/completions',
        method: 'POST',
        headers: { Authorization: 'Bearer k', 'Content-Type': 'application/json' },
        body: '{"model":"m"}',
      },
      () => undefined,
    );

    expect(netFetch).toHaveBeenCalledWith(
      'https://x.test/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        body: '{"model":"m"}',
        headers: { Authorization: 'Bearer k', 'Content-Type': 'application/json' },
      }),
    );
  });

  it('网络层失败返回 error 而不抛异常', async () => {
    netFetch.mockRejectedValue(new Error('getaddrinfo ENOTFOUND token.sensenova.cn'));

    const service = new LlmProxyService();
    const { events, emit } = collect();

    const meta = await service.start({ requestId: 'r3', url: 'https://x.test/v1/chat/completions' }, emit);

    expect(meta.error).toContain('ENOTFOUND');
    expect(meta.status).toBeUndefined();
    await flush();
    expect(events).toHaveLength(0);
  });

  it('缺少地址时不发请求', async () => {
    const service = new LlmProxyService();
    const meta = await service.start({ requestId: 'r4', url: '' }, () => undefined);

    expect(meta.error).toContain('缺少请求地址');
    expect(netFetch).not.toHaveBeenCalled();
  });

  it('响应头到达但读取 body 出错时推送 error 事件', async () => {
    netFetch.mockResolvedValue(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.error(new Error('connection reset'));
          },
        }),
        { status: 200 },
      ),
    );

    const service = new LlmProxyService();
    const { events, emit } = collect();

    const meta = await service.start({ requestId: 'r5', url: 'https://x.test/v1/chat/completions' }, emit);
    expect(meta.status).toBe(200);

    await flush();
    const errorEvent = events.find((event) => event.type === 'error');
    expect(errorEvent?.message).toContain('connection reset');
  });

  it('abort 会取消底层读取，且对未知 requestId 静默', async () => {
    let cancelled = false;
    netFetch.mockResolvedValue(
      new Response(
        new ReadableStream<Uint8Array>({
          cancel() {
            cancelled = true;
          },
        }),
        { status: 200 },
      ),
    );

    const service = new LlmProxyService();
    const { emit } = collect();

    await service.start({ requestId: 'r6', url: 'https://x.test/v1/chat/completions' }, emit);
    await flush();

    service.abort('r6');
    await flush();

    expect(cancelled).toBe(true);
    expect(() => service.abort('not-exist')).not.toThrow();
  });
});

/**
 * 本机开着 Clash / v2ray 等系统代理时，`net.fetch` 会默认走代理；某些 API 域名
 * 经代理连不通（约 10 秒后 ERR_CONNECTION_CLOSED），而直连完全正常。
 * 这几例守住「绕过系统代理」这条专用会话路径。
 *
 * 注意：直连会话在模块内是**懒创建的 Promise 单例**，所以「创建失败」这一例
 * 必须放在任何一例成功创建之前。
 */
describe('LlmProxyService · 绕过系统代理', () => {
  it('直连会话创建失败时返回 error，不抛异常，也不把失败固化', async () => {
    setProxy.mockRejectedValueOnce(new Error('proxy config failed'));

    const service = new LlmProxyService();
    const meta = await service.start(
      { requestId: 'b1', url: 'https://x.test/v1/chat/completions', bypassProxy: true },
      () => undefined,
    );

    expect(meta.error).toContain('proxy config failed');
    expect(netFetch).not.toHaveBeenCalled();
    expect(directFetch).not.toHaveBeenCalled();
  });

  it('bypassProxy 时用独立直连会话发出，完全不碰系统代理', async () => {
    directFetch.mockResolvedValue(streamResponse(['{"ok":1}'], 200, { 'content-type': 'application/json' }));

    const service = new LlmProxyService();
    const { events, emit } = collect();

    const meta = await service.start(
      {
        requestId: 'b2',
        url: 'https://api.mmkg.cloud/v1/chat/completions',
        method: 'POST',
        headers: { Authorization: 'Bearer k' },
        body: '{"model":"m"}',
        bypassProxy: true,
      },
      emit,
    );

    expect(meta.status).toBe(200);
    expect(meta.error).toBeUndefined();
    expect(netFetch).not.toHaveBeenCalled();
    expect(fromPartition).toHaveBeenCalledWith('llm-direct', { cache: false });
    expect(setProxy).toHaveBeenCalledWith({ mode: 'direct' });
    expect(directFetch).toHaveBeenCalledWith(
      'https://api.mmkg.cloud/v1/chat/completions',
      expect.objectContaining({ method: 'POST', body: '{"model":"m"}' }),
    );

    await flush();
    expect(events.at(-1)?.type).toBe('end');
  });

  it('不传 bypassProxy 时仍然走 net.fetch（默认跟随系统代理）', async () => {
    netFetch.mockResolvedValue(streamResponse(['{}']));

    const service = new LlmProxyService();
    await service.start({ requestId: 'b3', url: 'https://x.test/v1/chat/completions' }, () => undefined);

    expect(netFetch).toHaveBeenCalledTimes(1);
    expect(directFetch).not.toHaveBeenCalled();
  });
});

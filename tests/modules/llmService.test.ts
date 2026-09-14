import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TEST_PROMPT, llmService } from '../../src/modules/comic/services/llmService';

type CallOptions = Parameters<typeof llmService.call>[0];

const makeConfig = (over: Partial<Record<'baseUrl' | 'apiKey' | 'model', string>> = {}) =>
  ({ baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm', ...over }) as unknown as CallOptions['modelConfig'];

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
    body: null,
  } as unknown as Response;
}

function textResponse(text: string, status: number): Response {
  return {
    ok: false,
    status,
    text: async () => text,
    body: null,
  } as unknown as Response;
}

/** 用 SSE 分片模拟流式响应 */
function sseResponse(lines: string[]): Response {
  const encoder = new TextEncoder();
  return {
    ok: true,
    status: 200,
    body: new ReadableStream({
      start(controller) {
        for (const line of lines) controller.enqueue(encoder.encode(line));
        controller.close();
      },
    }),
    text: async () => '',
  } as unknown as Response;
}

let lastBody: Record<string, unknown> | undefined;

function stubFetch(response: Response) {
  lastBody = undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      lastBody = init?.body ? JSON.parse(String(init.body)) : undefined;
      return response;
    }),
  );
}

/** 按顺序返回多个响应，用于验证「先失败再换候选」的重试路径 */
function stubFetchSequence(responses: Response[]) {
  let index = 0;
  const spy = vi.fn(async (_url: string, _init?: RequestInit) => {
    const response = responses[Math.min(index, responses.length - 1)];
    index += 1;
    return response;
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('llmService.testConnection', () => {
  it('推理模型：正文为空但思维链有内容时判定为连通', async () => {
    // 复现 agnes-2.5-flash 类推理模型：max_tokens 被思维链吃光，content 是空串
    stubFetch(
      jsonResponse({
        choices: [
          {
            finish_reason: 'length',
            message: { role: 'assistant', content: '', reasoning_content: 'The user said "hi' },
          },
        ],
        usage: { completion_tokens_details: { reasoning_tokens: 5, text_tokens: 0 } },
      }),
    );

    const result = await llmService.testConnection({ baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm' });

    expect(result.success).toBe(true);
  });

  it('测试请求不传 max_tokens，避免思维链挤掉正文', async () => {
    stubFetch(jsonResponse({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] }));

    await llmService.testConnection({ baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm' });

    expect(lastBody).toBeDefined();
    expect(lastBody).not.toHaveProperty('max_tokens');
  });

  it('标准正文回复判定为连通', async () => {
    stubFetch(jsonResponse({ choices: [{ message: { content: '\n\nOk' }, finish_reason: 'stop' }] }));

    const result = await llmService.testConnection({ baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm' });

    expect(result.success).toBe(true);
  });

  it('兼容正文为内容块数组的网关', async () => {
    stubFetch(
      jsonResponse({ choices: [{ message: { content: [{ type: 'text', text: 'ok' }] }, finish_reason: 'stop' }] }),
    );

    const result = await llmService.testConnection({ baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm' });

    expect(result.success).toBe(true);
  });

  it('有 choices 但两段皆空且被截断时，报出 token 上限而非「格式异常」', async () => {
    stubFetch(jsonResponse({ choices: [{ message: { content: '' }, finish_reason: 'length' }] }));

    const result = await llmService.testConnection({ baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('token 上限');
  });

  it('缺少 choices 时提示不符合 OpenAI 规范', async () => {
    stubFetch(jsonResponse({ output_text: 'hi' }));

    const result = await llmService.testConnection({ baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('OpenAI 规范');
  });

  it('HTTP 401 翻译成鉴权失败', async () => {
    stubFetch(textResponse(JSON.stringify({ error: { message: 'invalid api key' } }), 401));

    const result = await llmService.testConnection({ baseUrl: 'https://x.test/v1', apiKey: 'bad', model: 'm' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('鉴权失败');
    expect(result.error).toContain('invalid api key');
  });

  it('Base URL 末尾斜杠会被归一化，不会拼出双斜杠', async () => {
    const spy = vi.fn(async () => jsonResponse({ choices: [{ message: { content: 'ok' } }] }));
    vi.stubGlobal('fetch', spy);

    await llmService.testConnection({ baseUrl: 'https://x.test/v1///', apiKey: 'k', model: 'm' });

    expect(spy).toHaveBeenCalledWith('https://x.test/v1/chat/completions', expect.anything());
  });
});

describe('llmService.call', () => {
  it('非流式：正文为空时回落到思维链', async () => {
    stubFetch(
      jsonResponse({
        choices: [{ finish_reason: 'length', message: { content: '', reasoning_content: 'thinking...' } }],
      }),
    );

    const result = await llmService.call({ modelConfig: makeConfig(), userMessage: 'hi' });

    expect(result.success).toBe(true);
    expect(result.content).toBe('thinking...');
    expect(result.reasoning).toBe('thinking...');
    expect(result.finishReason).toBe('length');
  });

  it('非流式：正文优先于思维链', async () => {
    stubFetch(
      jsonResponse({ choices: [{ message: { content: 'answer', reasoning_content: 'thinking' } }] }),
    );

    const result = await llmService.call({ modelConfig: makeConfig(), userMessage: 'hi' });

    expect(result.content).toBe('answer');
    expect(result.reasoning).toBe('thinking');
  });

  it('流式：思维链增量不进入 onChunk，正文为空时最终回落到思维链', async () => {
    stubFetch(
      sseResponse([
        'data: {"choices":[{"index":0,"delta":{"reasoning_content":"think"}}]}\n\n',
        'data: {"choices":[{"index":0,"delta":{"reasoning_content":"ing"}}]}\n\n',
        'data: {"choices":[{"index":0,"delta":{},"finish_reason":"length"}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    );

    const chunks: string[] = [];
    const result = await llmService.call({
      modelConfig: makeConfig(),
      userMessage: 'hi',
      onChunk: (text) => chunks.push(text),
    });

    expect(chunks).toEqual([]);
    expect(result.content).toBe('thinking');
    expect(result.finishReason).toBe('length');
  });

  it('流式：正文增量按序回调', async () => {
    stubFetch(
      sseResponse([
        'data: {"choices":[{"index":0,"delta":{"reasoning_content":"hmm"}}]}\n\n',
        'data: {"choices":[{"index":0,"delta":{"content":"Hel"}}]}\n\n',
        'data: {"choices":[{"index":0,"delta":{"content":"lo"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    );

    const chunks: string[] = [];
    const result = await llmService.call({
      modelConfig: makeConfig(),
      userMessage: 'hi',
      onChunk: (text) => chunks.push(text),
    });

    expect(chunks).toEqual(['Hel', 'lo']);
    expect(result.content).toBe('Hello');
  });

  it('非流式：缺少 choices 时返回失败而非静默空串', async () => {
    stubFetch(jsonResponse({ error: { message: 'model not found' } }));

    const result = await llmService.call({ modelConfig: makeConfig(), userMessage: 'hi' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('model not found');
  });
});

describe('llmService · Base URL 归一化与重试', () => {
  const okResponse = () => jsonResponse({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] });

  it('已填完整端点时不重复拼接 /chat/completions', async () => {
    const spy = stubFetchSequence([okResponse()]);

    const result = await llmService.testConnection({
      baseUrl: 'https://x.test/v1/chat/completions',
      apiKey: 'k',
      model: 'm',
    });

    expect(result.success).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe('https://x.test/v1/chat/completions');
  });

  it('漏写 /v1 时自动补一次并成功', async () => {
    const spy = stubFetchSequence([textResponse('not found', 404), okResponse()]);

    const result = await llmService.testConnection({ baseUrl: 'https://x.test', apiKey: 'k', model: 'm' });

    expect(result.success).toBe(true);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0][0]).toBe('https://x.test/chat/completions');
    expect(spy.mock.calls[1][0]).toBe('https://x.test/v1/chat/completions');
  });

  it('鉴权失败 (401) 不触发重试，避免掩盖真实错误', async () => {
    const spy = stubFetchSequence([textResponse(JSON.stringify({ error: { message: 'bad key' } }), 401)]);

    const result = await llmService.testConnection({ baseUrl: 'https://x.test', apiKey: 'k', model: 'm' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('鉴权失败');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('被反向代理/防火墙拦成 HTML 时给出可读提示，不截取 HTML 片段', async () => {
    stubFetch(textResponse('<!DOCTYPE html><html><head><title>Blocked</title></head></html>', 403));

    const result = await llmService.testConnection({ baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('HTML');
    expect(result.error).not.toContain('<!DOCTYPE');
  });

  it('两个候选都失败时返回最后一个错误', async () => {
    const spy = stubFetchSequence([textResponse('nope', 404), textResponse('nope', 404)]);

    const result = await llmService.testConnection({ baseUrl: 'https://x.test', apiKey: 'k', model: 'm' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('404');
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe('llmService.testConnection · 测试内容与诊断回显', () => {
  const okResponse = () =>
    jsonResponse({ choices: [{ message: { content: '你好，我是测试模型。' }, finish_reason: 'stop' }] });

  it('自定义测试内容作为 user message 发出', async () => {
    stubFetch(okResponse());

    await llmService.testConnection(
      { baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm' },
      { prompt: '只回复"收到"' },
    );

    expect(lastBody?.messages).toEqual([{ role: 'user', content: '只回复"收到"' }]);
  });

  it('未传测试内容时使用默认内容', async () => {
    stubFetch(okResponse());

    await llmService.testConnection({ baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm' });

    expect(lastBody?.messages).toEqual([{ role: 'user', content: DEFAULT_TEST_PROMPT }]);
  });

  it('测试内容为空白时回退到默认内容', async () => {
    stubFetch(okResponse());

    await llmService.testConnection(
      { baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm' },
      { prompt: '   ' },
    );

    expect(lastBody?.messages).toEqual([{ role: 'user', content: DEFAULT_TEST_PROMPT }]);
  });

  it('成功时回显模型回复、finish_reason、实际地址与通道', async () => {
    stubFetch(okResponse());

    const result = await llmService.testConnection({ baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm' });

    expect(result.success).toBe(true);
    expect(result.content).toBe('你好，我是测试模型。');
    expect(result.finishReason).toBe('stop');
    expect(result.url).toBe('https://x.test/v1/chat/completions');
    // 单测环境没有主进程桥接，应如实归因为渲染进程直连
    expect(result.channel).toBe('browser');
  });

  it('失败时同样带上实际地址与通道，便于整段复制上报', async () => {
    stubFetch(textResponse(JSON.stringify({ error: { message: 'bad key' } }), 401));

    const result = await llmService.testConnection({ baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm' });

    expect(result.success).toBe(false);
    expect(result.channel).toBe('browser');
    expect(result.url).toBe('https://x.test/v1/chat/completions');
  });

  it('网络失败时也带上已尝试的地址', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    const result = await llmService.testConnection({ baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm' });

    expect(result.success).toBe(false);
    expect(result.url).toBe('https://x.test/v1/chat/completions');
  });

  it('正文为空时把思维链单独回显，不混进 content', async () => {
    stubFetch(
      jsonResponse({
        choices: [{ finish_reason: 'length', message: { content: '', reasoning_content: 'think' } }],
      }),
    );

    const result = await llmService.testConnection({ baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm' });

    expect(result.success).toBe(true);
    expect(result.content).toBeUndefined();
    expect(result.reasoning).toBe('think');
    expect(result.finishReason).toBe('length');
  });
});

describe('llmService · 瞬时断连自动重试', () => {
  const okResponse = () =>
    jsonResponse({ choices: [{ message: { content: '连通' }, finish_reason: 'stop' }] });

  it('连接被关闭 (net::ERR_CONNECTION_CLOSED) 时同一地址重发一次并成功', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        if (calls === 1) throw new TypeError('net::ERR_CONNECTION_CLOSED');
        return okResponse();
      }),
    );

    const result = await llmService.testConnection({ baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm' });

    expect(result.success).toBe(true);
    expect(calls).toBe(2);
  });

  it('连接被重置 (net::ERR_CONNECTION_RESET) 同理重发', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        if (calls === 1) throw new TypeError('net::ERR_CONNECTION_RESET');
        return okResponse();
      }),
    );

    const result = await llmService.testConnection({ baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm' });

    expect(result.success).toBe(true);
    expect(calls).toBe(2);
  });

  it('重试后仍失败时在提示里写明已重试过，并保留原始错误', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        throw new TypeError('net::ERR_CONNECTION_CLOSED');
      }),
    );

    const result = await llmService.testConnection({ baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm' });

    expect(result.success).toBe(false);
    expect(calls).toBe(2);
    expect(result.error).toContain('已自动重试 1 次');
    expect(result.error).toContain('ERR_CONNECTION_CLOSED');
  });

  it('浏览器 CORS 类 Failed to fetch 不重试（重试没有意义）', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        throw new TypeError('Failed to fetch');
      }),
    );

    const result = await llmService.testConnection({ baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm' });

    expect(result.success).toBe(false);
    expect(calls).toBe(1);
    expect(result.error).not.toContain('已自动重试');
  });

  it('响应头已到、读 body 时才被断连，也会重发一次（长请求被代理回收的典型场景）', async () => {
    let calls = 0;
    const broken = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      body: null,
      text: async () => {
        throw new TypeError('net::ERR_CONNECTION_CLOSED');
      },
    } as unknown as Response;

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        return calls === 1 ? broken : okResponse();
      }),
    );

    const result = await llmService.testConnection({ baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm' });

    expect(result.success).toBe(true);
    expect(result.content).toBe('连通');
    expect(calls).toBe(2);
  });
});

describe('llmService · 系统代理失败自动改用直连', () => {
  type BridgeEvent = { requestId: string; type: 'chunk' | 'end' | 'error'; chunk?: unknown; message?: string };

  /**
   * 装一个假的主进程桥接。`failWhen` 返回非空字符串表示该次请求以该网络错误失败。
   * 记录每次请求的 `bypassProxy`，用于断言「第二次换了另一条路」。
   */
  function installBridge(failWhen: (request: Record<string, unknown>) => string | null) {
    const listeners = new Set<(event: BridgeEvent) => void>();
    const started: Array<Record<string, unknown>> = [];
    const payload = JSON.stringify({ choices: [{ message: { content: '直连成功' }, finish_reason: 'stop' }] });

    const bridge = {
      started,
      fetchStart: vi.fn(async (request: Record<string, unknown>) => {
        started.push(request);
        const failure = failWhen(request);
        if (failure) return { error: failure };
        const emit = (event: BridgeEvent) => listeners.forEach((listener) => listener(event));
        const requestId = String(request.requestId);
        // 分片在元信息之前同步推出：桥接层已在 fetchStart 之前注册好监听，流会先缓冲
        emit({ requestId, type: 'chunk', chunk: new TextEncoder().encode(payload) });
        emit({ requestId, type: 'end' });
        return { status: 200, statusText: 'OK', headers: [['content-type', 'application/json']] };
      }),
      fetchAbort: vi.fn(),
      onFetchEvent(callback: (event: BridgeEvent) => void) {
        listeners.add(callback);
        return () => listeners.delete(callback);
      },
    };

    vi.stubGlobal('window', { electronAPI: { comic: { llm: bridge } } });
    return bridge;
  }

  const base = { baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm' };

  it('走系统代理失败后，第二次改为绕过代理直连并成功', async () => {
    // 复现实测现象：经 Clash 访问该域名固定 ERR_CONNECTION_CLOSED，直连立刻通
    const bridge = installBridge((request) =>
      request.bypassProxy ? null : 'net::ERR_CONNECTION_CLOSED',
    );

    const result = await llmService.testConnection(base);

    expect(result.success).toBe(true);
    expect(result.content).toBe('直连成功');
    expect(bridge.started).toHaveLength(2);
    expect(bridge.started[0].bypassProxy).toBe(false);
    expect(bridge.started[1].bypassProxy).toBe(true);
    // 实际走了直连，回显出来便于解释现象
    expect(result.bypassProxy).toBe(true);
  });

  it('模型勾了「绕过系统代理」时首次就直连，不再试代理', async () => {
    const bridge = installBridge(() => null);

    const result = await llmService.testConnection({ ...base, bypassProxy: true });

    expect(result.success).toBe(true);
    expect(bridge.started).toHaveLength(1);
    expect(bridge.started[0].bypassProxy).toBe(true);
  });

  it('两条路都失败时，提示里写明「含绕过系统代理直连」', async () => {
    const bridge = installBridge(() => 'net::ERR_CONNECTION_CLOSED');

    const result = await llmService.testConnection(base);

    expect(result.success).toBe(false);
    expect(bridge.started).toHaveLength(2);
    expect(result.error).toContain('已自动重试 1 次（含绕过系统代理直连）');
    expect(result.error).toContain('ERR_CONNECTION_CLOSED');
  });

  it('勾了直连仍失败时，提示写明走的是直连', async () => {
    installBridge(() => 'net::ERR_CONNECTION_CLOSED');

    const result = await llmService.testConnection({ ...base, bypassProxy: true });

    expect(result.success).toBe(false);
    expect(result.error).toContain('已自动重试 1 次（直连）');
  });

  it('浏览器环境（无桥接）无从绕过代理，提示里不谎报直连', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        throw new TypeError('net::ERR_CONNECTION_CLOSED');
      }),
    );

    const result = await llmService.testConnection(base);

    expect(result.success).toBe(false);
    // 依旧尝试两次，但第二次只是「同一条路重试」——浏览器里 bypassProxy 无从生效
    expect(calls).toBe(2);
    expect(result.error).toContain('已自动重试 1 次');
    expect(result.error).not.toContain('绕过系统代理');
  });
});

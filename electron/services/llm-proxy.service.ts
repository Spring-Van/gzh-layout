/**
 * LLM 请求主进程转发服务
 *
 * 为什么需要它：渲染进程发起的跨域请求受 Chromium CORS 约束，带 Authorization 头的
 * 请求必然先发 OPTIONS 预检。部分网关（如 token.sensenova.cn）未实现 OPTIONS，
 * 预检直接返回 404 → 浏览器判定预检失败 → fetch 抛 TypeError: Failed to fetch，
 * 表现为「配置看起来没错但连不上」。
 *
 * 主进程请求没有 Origin、不做 CORS 检查，可彻底规避该问题；且 net.fetch 走
 * Chromium 网络栈，会自动应用系统代理（wpad / PAC），比渲染进程直连更稳。
 *
 * 流式设计：start() 在响应头到达后立刻返回（status / headers），随后由 pump()
 * 在后台持续推送 body 分片。渲染进程因此可以像用原生 fetch 一样先拿 status、
 * 再逐块读 body。
 */

import { net, session, type Session } from 'electron';

export interface LlmProxyRequest {
  requestId: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  /**
   * 绕过系统代理，强制直连。
   *
   * `net.fetch` 用 defaultSession，会**继承系统代理**。实测本机开着 Clash
   * （`resolveProxy` 返回 `PROXY 127.0.0.1:7897`），该代理对某些 API 域名线路不通，
   * 约 10 秒后关闭连接 → `net::ERR_CONNECTION_CLOSED`；而同一时刻直连完全正常。
   */
  bypassProxy?: boolean;
}

/**
 * 「绕过系统代理」专用会话（进程内懒创建、复用）。
 *
 * 两个必须注意的点：
 * 1. `FromPartitionOptions` 只有 `cache`，**没有 `proxy` 字段** → 只能靠 `setProxy`；
 * 2. `setProxy` 是异步的，**必须 await 后**再发请求，否则首批请求会与设置竞态
 *    （会走成系统代理，等于没绕开）。因此缓存的是 Promise 而不是 Session。
 */
let directSessionPromise: Promise<Session> | null = null;

function getDirectSession(): Promise<Session> {
  if (!directSessionPromise) {
    const direct = session.fromPartition('llm-direct', { cache: false });
    directSessionPromise = direct
      .setProxy({ mode: 'direct' })
      .then(() => direct)
      .catch((error: unknown) => {
        // 失败就清缓存，避免一次偶发失败被永久固化
        directSessionPromise = null;
        throw error;
      });
  }
  return directSessionPromise;
}

export type LlmStreamEvent =
  | { requestId: string; type: 'chunk'; chunk: Uint8Array }
  | { requestId: string; type: 'end' }
  | { requestId: string; type: 'error'; message: string };

export interface LlmStreamMeta {
  status?: number;
  statusText?: string;
  headers?: Array<[string, string]>;
  error?: string;
}

interface ActiveRequest {
  /** 中止读取并释放底层连接 */
  abort: () => void;
}

export class LlmProxyService {
  private active = new Map<string, ActiveRequest>();

  /**
   * 发起请求，响应头到达后返回元信息，body 分片通过 emit 异步推送。
   * 网络层失败（DNS / 超时 / 连接被拒）以 { error } 返回，语义与 fetch 抛异常对齐。
   */
  async start(
    request: LlmProxyRequest,
    emit: (event: LlmStreamEvent) => void,
  ): Promise<LlmStreamMeta> {
    const { requestId, url } = request;

    if (!url) {
      return { error: '缺少请求地址' };
    }

    let response: Response;
    try {
      const init: RequestInit = {
        method: request.method || 'POST',
        headers: request.headers || {},
        body: request.body,
      };
      // bypassProxy 时改用独立直连会话发出（见 getDirectSession 的说明）
      response = request.bypassProxy
        ? await (await getDirectSession()).fetch(url, init)
        : await net.fetch(url, init);
    } catch (error) {
      this.active.delete(requestId);
      return { error: error instanceof Error ? error.message : '网络请求失败' };
    }

    // 后台持续推送 body，不阻塞本次调用返回 —— 保证分片事件晚于元信息到达渲染进程
    void this.pump(requestId, response, emit);

    return {
      status: response.status,
      statusText: response.statusText,
      headers: Array.from(response.headers.entries()),
    };
  }

  /** 中止指定请求：取消读取即可让底层连接释放 */
  abort(requestId: string): void {
    const current = this.active.get(requestId);
    if (!current) return;
    this.active.delete(requestId);
    try {
      current.abort();
    } catch {
      // 忽略：连接可能已经结束
    }
  }

  private async pump(
    requestId: string,
    response: Response,
    emit: (event: LlmStreamEvent) => void,
  ): Promise<void> {
    if (!response.body) {
      this.active.delete(requestId);
      emit({ requestId, type: 'end' });
      return;
    }

    const reader = response.body.getReader();
    this.active.set(requestId, {
      abort: () => {
        void reader.cancel().catch(() => undefined);
      },
    });

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.length) {
          emit({ requestId, type: 'chunk', chunk: value });
        }
      }
      emit({ requestId, type: 'end' });
    } catch (error) {
      emit({
        requestId,
        type: 'error',
        message: error instanceof Error ? error.message : '读取响应体失败',
      });
    } finally {
      this.active.delete(requestId);
    }
  }
}

export const llmProxyService = new LlmProxyService();

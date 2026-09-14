# LLM 调用层 & 请求传输层（详细约定）

> 从 `MEMORY.md` 拆出，避免主文件超配额。主文件保留结论索引，细节看这里。

## LLM 调用层（协议 / 推理模型）

- **唯一入口**：`src/modules/comic/services/llmService.ts`（`testConnection` + `call`）。全项目 **9 处调用点**（ProjectEditor、AiRewriteModal、assetExtractionService、chapterDocService、assetPromptService×2、panelPromptService、storyboardService×2）都走 `llmService.call()`，**改服务层必须保持 `call()` 签名不变**，否则 9 处全崩。
- **推理模型（thinking）必须当一等公民处理**：正文在 `message.content` / `delta.content`，思维链在 `message.reasoning_content` / `delta.reasoning_content`，**且 `max_tokens` 同时约束两段**。踩过的坑：测试连接写死 `max_tokens: 5`，推理模型 5 个 token 全花在思维链上 → `content` 为空串、`finish_reason: "length"` → 被 `if (choices?.[0]?.message?.content)` 误判成「返回数据格式异常」，把排查带向"鉴权/端点"的错方向。**判定连通性不能依赖 `content` 非空**，应对 `content` 与 `reasoning_content` 取或，并识别 `finish_reason`。
- **`ModelConfig.apiFormat` 是死字段，且项目已决定不做多协议**：`llmService` 无条件走 `/chat/completions`。曾经 UI 上有 Gemini / Claude 两个选项但选了毫无效果（误导），**2026-09-14 已从设置页移除**，只读展示「OpenAI 兼容 · /chat/completions」；`fillForm` 把旧值统一归一为 `'openai'`。字段本身保留在类型里仅为兼容旧数据，**不要给它加回可选项**。规划过的 `LlmProtocol` + adapter 层方案（openai-responses / anthropic / gemini）**已被用户明确否决**，不要再主动提议。
- **协议格局别搞错**：通用层只有 **OpenAI Chat Completions** 一种事实标准（DeepSeek/Qwen/Kimi/GLM/MiniMax/火山/硅基流动/OpenRouter/OneAPI/NewAPI/vLLM/Ollama 全兼容它）；**Responses**（`/v1/responses`，`input` 入参 / `output_text` 出参）是 OpenAI 自家的第二协议，尚未通用；其余为厂商私有原生协议（Anthropic `/v1/messages` + `x-api-key` + `anthropic-version`；Gemini `:generateContent?key=` + `contents[].parts[]`）。
- **测试连接的错误信息要能自诊断**：不要笼统报「格式异常」，要区分 鉴权失败 / 模型不存在 / 协议不匹配 / 被 max_tokens 截断，并回显 `finish_reason` 与 usage。
- **实现状态（2026-09-14）**：上面第 2、4、5 条**已落地在 `llmService.ts`** —— `testConnection` 已**移除 `max_tokens`**、判定放宽为「有 `choices` 且 `content`/`reasoning_content` 任一非空」、HTTP 错误已细分（401/403/404/429/5xx）、`call()` 已吸收 `reasoning_content`（流式收集但不进 `onChunk`）并在正文为空时回落思维链，`LlmCallResult` 新增可选 `reasoning`/`finishReason`。回归测试在 `tests/modules/llmService.test.ts`（13 例）。
- **Base URL 归一化规则（2026-09-14 落地）**：`buildChatCompletionsCandidates()` 的确定性规则 —— ① 已带 `/chat/completions` → 原样用，**不重复拼接**；② 否则补 `/chat/completions`；③ 末尾不像版本段（`v1`/`v2`）时**再备一份补 `/v1` 的候选**。`requestChatCompletions()` 按候选依次试，**只在 403/404 上重试**（实测：路径错/漏 /v1 被反代拦 = 403 或 404，鉴权错 = 401；403/404 不计费且不会掩盖鉴权错误）。改这两个函数时别破坏这条规则，`tests/modules/llmService.test.ts` 有 5 例守着。
- **`describeHttpError` 的 HTML 识别**：反向代理/防火墙拦截会返回 HTML 页面而非 JSON，必须用 `looksLikeHtml()` 单独识别并给人话提示，**不要把 HTML 片段截进错误信息**（试过，用户完全看不懂）。

### 瞬时断连自动重试（2026-09-14 落地）

**背景**：偶发报「网络请求失败：无法建立连接。通道：主进程转发…原始错误：`net::ERR_CONNECTION_CLOSED`」。长提示词 / 长输出的一次请求要跑几十秒到几分钟，中间的网关或代理会因空闲回收连接。**这不是配置错，重发就好。**

**两个层次的覆盖，缺一不可**：

| 层次 | 函数 | 覆盖场景 |
|---|---|---|
| 连接阶段 | `requestChatCompletions`（候选地址循环内的 `attempt` 循环） | `transportFetch` 就抛错（响应头都没拿到） |
| 读 body 阶段 | `readBodyTextWithRetry(response, modelConfig, messages)` | **响应头已到**、`response.text()` 才抛错（长请求被代理回收的典型场景） |

- 判定用 `TRANSIENT_NETWORK_PATTERN`（`ERR_CONNECTION_CLOSED` / `_RESET` / `_ABORTED` / `ERR_EMPTY_RESPONSE` / `ERR_NETWORK_CHANGED` / `ERR_SOCKET_NOT_CONNECTED` / `ERR_CONNECTION_TIMED_OUT` / `ERR_PROXY_CONNECTION_FAILED` / `ECONNRESET` / `ECONNABORTED` / `EPIPE` / `ETIMEDOUT` / `socket hang up`）。
- **刻意不含 `Failed to fetch`**（浏览器 CORS 拦截，重试无意义）与鉴权/路径类错误 —— 否则用户只多等几秒还看到同样的错。
- 参数：`MAX_NETWORK_RETRIES = 1`、`NETWORK_RETRY_DELAY_MS = 600`（线性递增）。**别调大重试次数**：候选地址有 1~2 个，乘起来会让错误配置的等待时间爆炸。
- **流式（`onChunk`）不重试**：已经吐出分片后再重发，`onChunk` 会收到重复内容。目前资产提示词两条链路都是非流式，所以安全。
- 失败提示会写明 `已自动重试 N 次仍失败。`（`normalizeNetworkError(error, retried)`）—— 否则用户以为一次都没试过。
- 回归测试：`tests/modules/llmService.test.ts` 的 `describe('llmService · 瞬时断连自动重试')`（5 例：CLOSED 重发成功、RESET 重发成功、重试后仍失败写明次数、`Failed to fetch` 不重试、读 body 断连重发）。重试用真实 `setTimeout`，该组会慢约 1.2s，属预期。

## LLM 请求传输层（CORS 规避）

**背景**：渲染进程在 `http://localhost:5173`（dev）或 `file://`（prod），带 `Authorization` 的跨域请求**必然先发 OPTIONS 预检**。部分网关（如 `token.sensenova.cn`）**未实现 OPTIONS，所有路径一律 404**，浏览器判定预检失败 → `fetch` 抛 `TypeError: Failed to fetch`，表现为「配置看着没错但连不上」。以前没暴露只是因为用过的网关恰好支持 CORS。

**铁律：所有对第三方 LLM/API 的请求都走 `transportFetch`，不要直接用 `fetch`。**

- 唯一入口：`src/modules/comic/services/httpTransport.ts` 的 `transportFetch(url, init)`，返回**真实 `Response`**，用法与原生 `fetch` 完全一致（`ok/status/text()/body.getReader()`）。
- 链路：渲染进程 `transportFetch` → preload `electronAPI.comic.llm` → IPC `comic:llmFetchStart` → 主进程 `LlmProxyService.start()` 用 **`net.fetch`**（Chromium 网络栈，**无 Origin、不做 CORS、自动走系统代理**）→ body 分片经 `comic:llmFetchEvent` 回推 → 在渲染侧用 `ReadableStream` + `new Response(stream, {status, headers})` 还原。
- **非 Electron 环境（vitest / 浏览器调试）自动回退 `globalThis.fetch`**，找不到桥接时不抛错 —— 所以单测可以直接 `vi.stubGlobal('fetch', ...)`。
- 主进程侧：响应头到达即返回元信息，body 由 `pump()` 后台推事件（`chunk`/`end`/`error`）；`abort()` 用 `reader.cancel()`；发 IPC 前判 `sender.isDestroyed()`。
- **踩过的坑**：
  1. **桥接层级曾经写错 → 全程静默回退，白做一遍转发**：`httpTransport` 里探测的是 `window.electronAPI.llm`，而 preload 实际暴露在 **`electronAPI.comic.llm`**。桥接探测失败**不抛错、直接回退原生 fetch**，表现成「已经改成主进程转发了，还是被 CORS 拦」——且浏览器与桌面窗口报**同一条**错误，极具误导性。**教训：探测不到桥接时必须把「实际通道」带进错误信息**（已实现 `getTransportChannel()`）。当前实现同时兼容 `comic.llm` 与顶层 `llm`。
  2. **测试 stub 必须与 preload 契约一致**：单测原来 stub 的是错误的 `electronAPI.llm`，所以 14 例全绿却没发现路径错误。现已按真实层级 stub，并新增「preload 契约」回归测试（直接读 `electron/preload.ts` 断言嵌套）。
  3. IPC 结构化克隆可能把 `Uint8Array` 还原成 `ArrayBuffer` 或**普通数组**，`toUint8Array()` 必须兼容三种形态。
  4. `new Response(stream, ...)` 对 **204/205/304** 会抛错（不能带 body），必须单独走 `new Response(null, ...)`。
  5. 元信息与分片存在**先分片后元信息**的可能（同进程时为必然），回推监听必须在 `fetchStart` 之前注册好。
  6. 主进程网络失败要返回 `{error}` 并在渲染侧**抛 `TypeError`**，与原生 fetch 语义对齐，否则调用方的 `catch` 分支失效。
- 相关回归测试：`tests/modules/httpTransport.test.ts`（13 例）、`tests/electron/llm-proxy.service.test.ts`（6 例）。测试主进程服务用 `vi.hoisted` + `vi.mock('electron', () => ({ net: { fetch } }))`。
- **仍未接入的服务**：`grsaiService` / `duomiService` / `openaiImageService` / `xiguapiService` / `useCoverGenerator` 仍是渲染进程直连（其网关恰好支持 CORS）。**再遇到同类报错，把这些文件里的 `fetch` 换成 `transportFetch` 即可**，一处一行。

## 系统代理导致的 `net::ERR_CONNECTION_CLOSED`（2026-09-14 定位，机制已验证）

**现象**：`testConnection` 报「网络请求失败：无法建立连接。已自动重试 1 次仍失败。通道：主进程转发…原始错误：`net::ERR_CONNECTION_CLOSED`」，同一主机下**多个模型（不同 model 名）报的是同一条**。

**根因**：`net.fetch` 走 `session.defaultSession`，**默认继承系统代理**。本机 Clash Verge 开着系统代理（注册表 `HKCU:\...\Internet Settings`：`ProxyEnable=1`、`ProxyServer=127.0.0.1:7897`、进程 `clash-verge` / `verge-mihomo`），实测 `session.defaultSession.resolveProxy(url)` 返回 **`PROXY 127.0.0.1:7897`**。而该代理对 `api.mmkg.cloud` 这条线路走不通（约 10s 后关连接），同一代理访问 `token.sensenova.cn` 却正常（162ms）。**与模型、协议、应用代码都无关。**

**最关键的排查结论**：**curl 是直连的**（无 `http_proxy`/`https_proxy` 环境变量），所以「curl 能通」**不能**证明应用能通 —— 两者根本不是同一条路。判断「到底走没走代理」永远用 `resolveProxy()`，别用 curl 推断。

| 路径 | `api.mmkg.cloud` 实测 |
|---|---|
| curl 直连 | ✅ 401 / 0.4s（8/8 稳定）|
| curl `-x 127.0.0.1:7897`（经 Clash）| ⚠️ 前 5 次 ✅，后 3 次**瞬间失败**（0.001s，http=000）→ 代理侧间歇性拒绝 |
| Playwright Chromium（直连 / 显式代理 / 关 QUIC / 关 HTTP2 / 关 ECH，共 7 种）| ✅ 全部 401（证明不是 Chromium 版本或协议栈问题）|
| **Electron 30 经系统代理** | ❌ **`net::ERR_CONNECTION_CLOSED`，每次约 10.0s，3/3 + 复测 2/2** |
| **Electron 30 强制直连** | ✅ 401 / 385ms、203ms |

**已验证可用的兜底机制**（绕过系统代理直连）：

```ts
const direct = session.fromPartition('llm-direct', { cache: false })
await direct.setProxy({ mode: 'direct' })
const res = await direct.fetch(url, init)   // Session.fetch，与 net.fetch 同签名
```

- `FromPartitionOptions` **只有 `cache`，没有 `proxy` 字段** → 必须 `setProxy`，且**要 `await`**（返回 `Promise<void>`），否则首个请求会竞态。
- 文档提醒：切换代理后需要 `ses.closeAllConnections()` 防止复用「上一个代理的连接」。对全新会话（从未走过别的代理）无需调用。
- 不同会话各自独立的 socket 池，所以「默认会话仍是代理、专用会话直连」可同时成立。

**已落地的双重兜底**（用户选「两个都做」，2026-09-14 完成）：

1. **自动改道**：`llmService.requestChatCompletions` 里 `buildTransportAttempts(bypassProxy)` 给出尝试阶梯 —— 用户没勾直连时是 `[false, true]`（先走系统代理，失败后**换另一条路**直连重试一次）；勾了就 `[true, true]`（全程直连，省掉代理超时的 ~10s 等待）。失败提示用 `describeRetryPath()` 标明走的是哪条路：`（含绕过系统代理直连）` / `（直连）`；浏览器环境无桥接，**不谎报**直连。
2. **手动开关**：`ModelConfig.bypassProxy?: boolean` → `ModelEditorForm` LLM 分类下 Base URL 之后的复选框「绕过系统代理（直连）」，随配置持久化（`SettingsView.saveModel` 只在 llm 分类写入）。

链路：`ModelEditorForm` → `llmService.testConnection/call({bypassProxy})` → `transportFetch(url, init, {bypassProxy})` → preload `electronAPI.comic.llm.fetchStart` → IPC `comic:llmFetchStart` → `LlmProxyService.start()` → `request.bypassProxy ? (await getDirectSession()).fetch(...) : net.fetch(...)`。

- `getDirectSession()` 是 **Promise 单例 + 失败重置**：`session.fromPartition('llm-direct', { cache: false })` 之后必须先 `await setProxy({ mode: 'direct' })` 再返回会话；一旦创建/设代理失败就把缓存的 Promise 置空，下次重试而不是永久卡死。
- 主进程服务测试要 mock `electron` 的 `session`（`fromPartition` 返回带 `setProxy` 的对象）；渲染侧测试断言 `bridge.started[i].bypassProxy` 序列。

**⚠️ 代理线路是间歇性的（2026-09-14 复测新增）**：当天傍晚重跑同一探针，**默认会话（走系统代理）竟然也 401 成功**（1474ms），不再是 `ERR_CONNECTION_CLOSED`。说明 Clash 到 `api.mmkg.cloud` 的可用性会随时间变（节点/规则/上游波动）。**结论**：这类报错不要试图「修代码」，代码路径已验证正确；自动改道兜底正是为这种间歇性准备的 —— 代理挂了就自动走直连。

## 设置页 LLM 测试连接（`ModelEditorForm.vue`）

- **测试连接是独立区块，不是 footer 按钮**：`测试内容` textarea（默认 `DEFAULT_TEST_PROMPT`）+「测试连接」按钮 + 结果面板，只在 `category === 'llm'` 时渲染。**别再把错误塞回按钮文字里**（按钮 `truncate` 会截断长错误，且无法复制 —— 试过，已废弃）。
- **测试内容不持久化**：不进 `ModelConfig`，只作用于本次请求。切换模型时清结果、**保留用户填的测试内容**。
- **`testConnection(modelConfig, options?)`**：`options.prompt` 可选，向后兼容。返回 `TestConnectionResult` 含 `content / reasoning / finishReason / url / channel`；失败分支也带 `url`。**结果面板要能一键复制整段自诊断文本**（状态+模型+地址+通道+格式+finish_reason+测试内容+错误或回复）。

# 专题：本机调试环境（省时间）

- **Bash 工具可用**：`ls`/`grep`/`find`/`rm`/`curl`/`tail` 正常，日常文件操作直接用 Bash 更快。偶发丢失 coreutils（`tail`/`wc` 报 not found）→ 前缀 `export PATH="/c/Users/admin/.workbuddy/binaries/PortableGit/versions/1.2.0/usr/bin:$PATH" &&` 即恢复；不要把这类报错当命令失败。
- **`ELECTRON_RUN_AS_NODE=1` 在 shell 里是设着的** → 直接跑 `electron.exe` 会退化成 Node，脚本静默跑不起来。
- **要用真 Electron 验证（系统代理 / CORS / 真实网络栈）只能走 PowerShell**：`Remove-Item env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue` → `& $exe "D:\<探针目录>" --no-sandbox`（目录里放 `package.json`(main) + 主进程 cjs：`app.whenReady()` → `net.fetch` → 写结果 → `app.exit(0)`）。**Bash 的 `env -u` 无效（退出码 0 却什么都不做）；`Start-Process -RedirectStandardOutput` 也跑不起来。**
- **`net.fetch` 默认继承系统代理**：本机常开 Clash Verge（`127.0.0.1:7897`）。「curl 通但应用不通」先用 `session.defaultSession.resolveProxy(url)` 确认通道。代理线路会间歇挂掉，故 LLM 请求内置「代理失败自动改直连」+ 每模型 `bypassProxy`（详见 topics/llm-layer.md）。
- **PowerShell 工具不返回 stdout**，重定向写出的是 UTF-16（Read 会判为二进制）：用 `| Out-File -Encoding utf8` 再 Read；汇总交给 node（`toString('utf8')` 失败再试 `utf16le`，去 ANSI 色码）。
- 浏览器内验证用 Playwright（pnpm 严格布局，`require('playwright')` 找不到，要写 `node_modules/.pnpm/playwright@x/node_modules/playwright` 绝对路径）。

## 工具用法坑（会静默出错）

**同一条消息里对同一个文件发多个 Edit 会互相覆盖**：每个都报 success，但只有最后一个落盘。改同一文件的多个位置必须**一次一个 Edit**（或合并成一个大 Edit）。发现"明明说成功了但文件没变"就是这个原因 —— 用 `grep` 复核，别信成功回显。

## 工程校验三件套

`npx vue-tsc --noEmit -p tsconfig.json` → `npx vitest run` → `NODE_OPTIONS=--max-old-space-size=6144 npx vite build --outDir "D:/gzh-build-check" --emptyOutDir`

- 构建产物必须写 **Windows 绝对路径**（Git Bash 的 `$TEMP` 会被解析到 D:\tmp）。
- **必须带 `--max-old-space-size=6144`**：不带时 `vite build` 会被 SIGTERM 静默杀掉、**一行日志都没有** → 判断成败看 **exit code**，别只看日志。

# 专题：本机调试环境（省时间）

- **Bash 工具可用**：`ls`/`grep`/`find`/`rm`/`curl`/`tail` 正常，日常文件操作直接用 Bash 更快。偶发丢失 coreutils（`tail`/`wc` 报 not found）→ 前缀 `export PATH="/c/Users/admin/.workbuddy/binaries/PortableGit/versions/1.2.0/usr/bin:$PATH" &&` 即恢复；不要把这类报错当命令失败。
- **`ELECTRON_RUN_AS_NODE=1` 在 shell 里是设着的** → 直接跑 `electron.exe` 会退化成 Node，脚本静默跑不起来。
- **要用真 Electron 验证（系统代理 / CORS / 真实网络栈）只能走 PowerShell**：`Remove-Item env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue` → `& $exe "D:\<探针目录>" --no-sandbox`（目录里放 `package.json`(main) + 主进程 cjs：`app.whenReady()` → `net.fetch` → 写结果 → `app.exit(0)`）。**Bash 的 `env -u` 无效（退出码 0 却什么都不做）；`Start-Process -RedirectStandardOutput` 也跑不起来。**
- **`net.fetch` 默认继承系统代理**：本机常开 Clash Verge（`127.0.0.1:7897`）。「curl 通但应用不通」先用 `session.defaultSession.resolveProxy(url)` 确认通道。代理线路会间歇挂掉，故 LLM 请求内置「代理失败自动改直连」+ 每模型 `bypassProxy`（详见 topics/llm-layer.md）。
- **PowerShell 工具不返回 stdout**，重定向写出的是 UTF-16（Read 会判为二进制）：用 `| Out-File -Encoding utf8` 再 Read；汇总交给 node（`toString('utf8')` 失败再试 `utf16le`，去 ANSI 色码）。
- 浏览器内验证用 Playwright（pnpm 严格布局，`require('playwright')` 找不到，要写 `node_modules/.pnpm/playwright@x/node_modules/playwright` 绝对路径）。

## 用 Playwright 把应用真跑起来（UI 级复现，2026-09-23 验证）

`tests/e2e/app.spec.ts` 那套可以直接改造成复现脚本（`_electron.launch`）。踩过的坑，按顺序：

1. **shell 里 `ELECTRON_RUN_AS_NODE=1` 必须先去掉**（`Remove-Item env:ELECTRON_RUN_AS_NODE`），否则 Electron 退化成 Node，报 `bad option: --remote-debugging-port=0`。
2. **必须加 `--no-sandbox --disable-gpu`**，否则渲染进程崩（`Target crashed`）。
3. **默认加载 `dist/index.html`（不是源码！）**。主进程只在 `VITE_DEV_SERVER_URL` 存在时加载 dev server（`electron/main.ts:72`）。
   → 先确认 `dist` 是不是陈旧的：`(Get-Item dist\index.html).LastWriteTime`。**本机 dist 长期停留在 09/20，不含当天的任何改动**；只跑 `electron .` 等于在测三天前的代码。
4. **要测当前源码就得走 dev server**，但 `vite` 会被 `vite-plugin-electron` 带起来一个 Electron，它会和 Playwright 那个抢数据目录 → 后者 `app.whenReady()` 迟迟不返回、**窗口事件超时**。
   杀 Electron 会让 vite 一起退出。**可行的组合**：`vite --port 5199` 起服务（先杀掉已有 Electron）→ Playwright 那侧传 `env: { ...process.env, VITE_DEV_SERVER_URL: 'http://localhost:5199' }`。
5. **`vite build` 在本机极慢（>28 分钟仍未完成）**，别指望它来做快速验证；中途 `Stop-Process` 是安全的（rollup 在内存里渲染，未写盘，dist 不会被写坏）。
6. 读真实数据做复现：把 `%APPDATA%\gzh-layout\` 下的 **`comic-gen.json` + `gzh-layout.json` + `Local State` + `Preferences`
   一起拷**到临时 user-data 目录（`--user-data-dir=<mkdtemp>`），别指向真实目录（应用会自动保存）。
   **漏拷 `Local State` 会让窗口永远起不来**：`safeStorage.decryptString` 解不开凭据 →
   `dbService.init()` 抛未捕获 promise 异常 → `whenReady` 链中断 → `createWindow()` 根本不执行，
   Playwright 只会看到 `waitForEvent('window')` 超时。**这个报错只在子进程 stdout 里**，脚本要把
   `application.process().stdout/stderr` 收下来才看得到。
   章节选择：既设 `localStorage['comic-long-last-selection:' + projectId] = {chapterId}`，
   也要兜底点侧栏 `[data-tree-node-id="<chapterId>"]`（只设 localStorage 会偶发不生效）。
7. **别用 `window.location.hash = '#/comic/long-project/<id>'` 直接跳**：会与路由初始化竞争、被重定向回首页（`#/`）。
   走真实入口：首页点项目卡片。
8. 采集诊断：`page.on('pageerror')` + `page.on('console', type==='error')`，再 dump `document.body.innerText` 与 `main section` 子节点的 `display/offsetHeight`。

**结论（重要）**：右栏底部标签是「参考图设置」= **09/20 旧构建**；是「参考图上传」且有「提示词 1」= 当前源码。
用户报 UI 问题时先问这一条，能立刻区分「代码真的坏了」还是「在测旧构建」。

## 验证当前源码的最省事路径：构建到临时目录 + 静态服务（2026-09-23 打通）

**`vite build` 写 `dist` 会卡死**（两次各 >15 分钟无进展，日志停在 `2174 modules transformed`）——**运行中的应用占着 `dist`**。
写别的目录 1 分钟就完成。所以**不要为了验证去动 `dist`**：

```
1) 构建到临时目录（1 分钟）：
   & "node_modules\.bin\vite.cmd" build --minify false --outDir "D:\xiang\gzh-layout\.workbuddy\dist-probe" --emptyOutDir
   （后台跑更稳：前台会被 stderr 的 browserslist 警告当致命错误中断）
2) 起静态服务托管它：python -m http.server 5199 --bind 127.0.0.1（cwd = dist-probe）
3) Playwright 启动 Electron 时传 env：{ ...process.env, VITE_DEV_SERVER_URL: 'http://127.0.0.1:5199' }
   → 主进程 `VITE_DEV_SERVER_URL` 存在就走 `loadURL`（electron/main.ts:72），加载的**是构建产物**，
     既不用起 dev server（不会被 vite-plugin-electron 的 Electron 抢数据目录），也不碰 dist。
4) 收尾：杀掉 python（否则占着目录删不掉）→ 删 dist-probe。
```

**要更新真正的 `dist`**（用户平时直接开构建后的应用）必须**先让用户关掉应用**，否则同样会卡住 —— 直接说明并请对方关掉后重跑，别让它挂着。

## 工具用法坑（会静默出错）

**同一条消息里对同一个文件发多个 Edit 会互相覆盖**：每个都报 success，但只有最后一个落盘。改同一文件的多个位置必须**一次一个 Edit**（或合并成一个大 Edit）。发现"明明说成功了但文件没变"就是这个原因 —— 用 `grep` 复核，别信成功回显。

**前台跑 `vite build` 会被 stderr 中断**：`vite` 往 stderr 写一行 browserslist 警告，PowerShell 把它当致命错误 → exit 1，日志只到 `2174 modules transformed`，`dist` 不更新（看起来像"构建卡死"，其实是被中断）。两个可行写法：① 用 `run_in_background` 跑（已验证稳定）；② 别用 `*>`/`2>&1` 把 stderr 混进管道。**用日志尾部判断成败会误判，只看 exit code**。

**Playwright 用例必须 `test.setTimeout(240_000)`**：默认 30s，本机启动 Electron + 真实数据（397KB）每步都要等，跑不到一半就超时；而超时会**在写诊断文件之前**中断 → 什么输出都拿不到，看起来像"没有报错但也没结果"。另外把断言写成「收集 notes 数组 → finally 里写文件」，并在 try/catch 里捕获异常文本，失败时也有完整现场。

**资产/分镜列表按钮的可访问名带额外文本**（空状态点的 `title`，如「缺参考图」、计数「3」）：`getByRole('button', { name: '萧炎1' })` 这种**锚定正则匹配不到**，用部分匹配 `/萧炎/`。

## 工程校验三件套

`npx vue-tsc --noEmit -p tsconfig.json` → `npx vitest run` → `NODE_OPTIONS=--max-old-space-size=6144 npx vite build --outDir "D:/gzh-build-check" --emptyOutDir`

- 构建产物必须写 **Windows 绝对路径**（Git Bash 的 `$TEMP` 会被解析到 D:\tmp）。
- **必须带 `--max-old-space-size=6144`**：不带时 `vite build` 会被 SIGTERM 静默杀掉、**一行日志都没有** → 判断成败看 **exit code**，别只看日志。

## 先读真实落库数据，再决定查哪一层（省一轮来回）

用户报「导入没绑定成功」这类主观描述时，**第一步直接读磁盘上的真实数据**，别先猜 UI：

```
C:\Users\admin\AppData\Roaming\gzh-layout\comic-gen.json     # 真实数据（另有 .bak / assets-clear-backup）
  └ projects[] → 找有 longProjectData 的那条（本项目是 projects[2]，name "22"）
      ├ longProjectData.storyboardRuns[].panels[].assetBindings   # 绑定是否真的落了库
      ├ longProjectData.assets[].variants[].referenceImageIds / generatedImageIds
      └ longProjectData.chapterAssets[]                          # 本章引用（决定 {{本章资产}} 与编号表）
```

判定顺序：**数据层正确 → 问题在解析/UI；数据层错误 → 问题在写入链路**。
读法用 `node -e`（PowerShell 工具不返 stdout，所以脚本里 `fs.writeFileSync('.t.txt', ...)` 再 Read，收尾记得删）。

**拿真实样本做对照实验**：把某个 run 的 `rawResponse` + 当时的 `assets` / `chapterAssets` dump 成 JSON 夹具，
临时写一个 vitest 跑「预览路径（裸解析）」vs「导入路径（解析 + `syncPanelsAutoBindings`）」逐镜 diff ——
比读代码猜快得多。临时文件（`tests/tmp-*.test.ts` / `.probe*.txt` / `.diag-report.txt`）用完即删。

**修复类改动的验收同样用真实数据（别只看单测绿）**：把真实 `storyboardRuns[].panels` + `panelArtworks[].imagePrompt` + `assets`
喂进服务层，用 `buildPanelBindingFixes` 统计「待核对项数量」做前后对比。本次「画面描述写入后回填绑定」的验收即
**13 → 0**（13 镜 / 18 条描述）—— 这类可度量数字才是「用户抱怨的那个漏绑真的没了」的唯一证据。

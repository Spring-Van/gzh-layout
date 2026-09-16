# 项目长期约定 — gzh-layout（漫画/公众号排版工具）

> 专题细节已拆出：**LLM 调用层 / 请求传输层 / 测试连接** → `topics/llm-layer.md`

## 浮层 z-index 谱系（新增弹窗务必对照）

弹窗统一 `fixed inset-0` + `Teleport to="body"`，**值大者盖住值小者**。

| 值 | 用途 |
|---|---|
| z-40 | 菜单 / 下拉 |
| **z-50** | 常规弹窗（宿主是普通页面时用这档） |
| z-100 / z-101 | 全屏抽屉的遮罩 / 面板 |
| z-120 | 导入弹窗之上的覆盖确认 |
| **z-130 / z-131** | **抽屉内**打开的子弹窗（宿主是 z-101，必须用这档） |
| z-200 | 大图预览（终端视图，最高业务层） |
| z-300 / z-9999 | PageSync / Toast |

**规则**：弹窗 z 值必须 > 宿主容器。通用组件（如 `ManualResultImportDialog`）**不能硬提层级**，要加 `zIndexClass` prop 由调用方决定，否则会破坏它在低层级场景的表现。

**坑**：
1. scoped 样式 `.menu-item { color: inherit }` 编译成 `.menu-item[data-v-x]`（特异性 0,2,0），会**压过** `text-red-400`（0,1,0）—— 需要颜色时用同层级的自定义类，别叠 Tailwind 语义色。
   - **同理适用于一切属性**，不只颜色：组件 scoped 里定义了 `.primary-button { border-radius: .5rem }`，模板上再写 `rounded-r-none`（同为 0,1,0 的 Tailwind 工具类）**不会生效**。做分体按钮（split button）这类需要局部改圆角/边框/内边距的，必须在 scoped 里加同层级类（如 `.split-main { padding: 0 .75rem; border-top-right-radius: 0 }`），并保证定义在基类**之后**（特异性相同时靠样式表顺序决胜）。
2. 全屏抽屉（`z-[101]`）里开 z-50 子弹窗 → 被盖住看不见。资产链路 6 个浮层已提到 130/131 修复。

## UI 沟通约定（避免返工）

**「在某个弹窗内」= 同一弹窗、同一视图内增删内容**，不是「同一弹窗切换阶段/视图」。
- 反例（已被否）：把弹窗改成 `stage: 'config' | 'progress'` 两阶段，点「开始生成」后整屏换成独立进度视图。
- 正例：配置项与输入框**始终可见**，进度只是输入框下方的一个信息区（`v-if="started"` 控制显隐）。

## UI 迭代细则（弹窗内改版）

- **换配置不作废输入**：切模板/模型/范围时**保留用户已编辑的文本**，只增删条目；「重置」才按当前配置重新拼装默认值。**保留与重算必须是两个独立函数**，不能共用。
- **条目多时不用横向标签条**：用 `<select>` 下拉框 + 上/下图标按钮 + `N / M` 计数，选项前缀用 `◐/✓/✕/○` 标状态。
- **输入框自适应高度**：未开始时 `flex-1` 撑满剩余空间（"到底"），开始生成后切 `h-[160px] shrink-0`，把空间让给进度区；容器用 `overflow-hidden` + `min-h-0`。
- **进度回传不抢焦点**：父组件推进度改 `activeIndex` 前，先看用户是否手动选过条目（`userPickedIndex`），手动选过就不自动跟随。
- **多模式功能的状态必须按模式分开存**：同一弹窗有多个互斥模式（如「一次性发送 / 逐条发送」）时，`started`、进度、条目、输入文本等运行态**不能做成单一全局 ref**，否则 A 模式跑完切到 B 会残留进度与按钮。做法：`runStates = { a: createState(), b: createState() }` + `state = computed(() => runStates[currentMode])`，所有读写走 `state.value`。
- **AI 生成结果一律「人工确认后才写回」**：生成/重试成功**不自动落库**（会自动覆盖用户已有的内容，用户明确否决过），结果只留在弹窗内 + 顶部「未填充」提醒；写回靠显式的「填充到资产」按钮（主按钮）。**有结果未填充时关闭弹窗必须二次确认**（取消 / 直接关闭 / 填充并关闭）。
- **「发送内容」与「生成结果」必须分成两个字段存、两个视图看**：`item.text`（要发给大模型的内容，可改后重新生成）/ `item.result`（模型返回，可改后填充）；`item.originalText` / `item.resultOriginal` 分别供「重置本条」/「重置结果」。**别用同一个字段先装提示词、再被结果覆盖** —— 那样用户永远回不到「我发出去的是什么」。
- **重跑范围要让用户选**：逐条模式下失败后底部同时给「仅重跑失败（N）」与「重新生成」（整批）两个按钮，不要二选一替用户决定；一次性发送受单次请求限制只能整批重发（UI 文案写明）。

## 资产提取确认（ExtractionApplyMode）

确认「本章资产」是**批次级**选择，两种语义边界必须分清（`assetExtractionConfirm.ts`）：

| | merge（默认） | override |
|---|---|---|
| 资产级 content/description/attributes | **已有值优先**，只补空缺 | 候选优先（候选为空回退旧值） |
| 视觉状态 | 只补空缺，保留全部旧状态 | **整表重建**，本次未出现的一律删除 |
| aliases | 始终求并集（身份标识不做取舍） | 同 |

- **例外**：override 遇到「候选没有任何视觉状态」（模型未按格式返回）时**保留旧状态**，否则一次退化返回就清空资产的视觉身份。
- **悬空绑定**：override 删状态会让分镜上 `model/manual/chapter-range` 来源绑定的 `visualVersionId` 失效（`syncPanelsAutoBindings` 只重算 auto-text）→ 必须跑 `repairDanglingBindings` 回落 `defaultVariant`，**全项目范围跑**（悬空即坏数据）。
- 审核页必须把归属建议显出来（左列「并入 XX / 新建资产」），否则用户选合并/覆盖是盲选。

## 长篇故事 · 分镜格式（v4，详见 docs/长篇故事剧本与分镜格式定稿.md）

- 符号规则：分镜格用 `【第X格】`；字段名用 `「XXX」`，冒号后写内容；页头 `## 分镜 N · 双格`。
- **入库去包装、出库带包装**：`cell.dialogue/narration` 存裸文本，喂画面描述提示词时不带标记。
- 解析器兼容 v4 / v3（`①【镜头】画面` + `说话人：【台词】`）/ v2（`‖`）/ 旧 `- 字段：`。

## 模板类型 × 解析机制（8 类模板全景）

**只有 3 类需要结构化解析，其余 5 类整段消费、零解析**：
- 零解析（返回即正文）：`analysis` / `script`（`chapterDocService.runChapterDoc` 直接 `content.trim()` 入库）、`panel-prompt`（`inferPanelPrompt` 整段作画面描述）、`story`（未见独立链路）、`style`（不调模型，作风格片段拼进别人提示词）。
- 需解析：`asset-prompt` / `extract` / `storyboard`。

**三者范式完全不同，不要用同一套方案改**：

| | asset-prompt | extract | storyboard |
|---|---|---|---|
| 范式 | 段落切分 + **名字查表** | **标题栈** | **行级分派状态机** |
| 归属依据 | 与预设状态清单比对 | 标题位置 | 当前页 / 当前格上下文 |
| 层级容忍 | — | ❌ 严格 1/2/3 个 `#` | ✅ `#{1,6}` 任意层级 |
| 容错方式 | 猜（模糊匹配 / 顺序兜底） | 认标题 + 字段/标题双形式 | 认形态 + v4/v3/v2 + 无页头自动开页 |
| 失败后果 | 整批对不上（可静默错配） | 0 个资产 | 0 页 |
| 历史包袱 | 无（新做） | legacy JSON | 三版协议兼容 |

**关键区分：闭集映射 vs 开集生成**
- `asset-prompt` 是**闭集**（发出去 8 个状态，必须 8 段一一对上）→ 本质是**查找问题**，模型名字一漂移就整批废 → **只有它会报「协议与解析不匹配」**。
- `extract` / `storyboard` 是**开集**（模型自己决定几条）→ **位置即归属**，不比对名字，模型写错名也能收。extract 的 `matchExistingAsset` 只产出 `suggestedAssetId` + `decision:'merge'` **建议**，不影响数据接收。

**三处共同缺口**：都不剥代码块围栏 ```、都不去前言/结语（asset-prompt 已有 `normalizeModelOutput`，另两处没有）→ 这是「归一化层」要统一补的。

**三处都不用真正的 Markdown 解析器**（不建 AST），而是正则逐行近似 Markdown：好处是模型写半吊子 Markdown 也能收，坏处是换成 `**加粗**` 当标题就认不出。

## 资产提示词回填（协议 · 解析器）

- **返回格式写进模板内容，运行时不追加任何协议段（2026-09-15 最终态）**：各类型结构说明集中在 `OUTPUT_FORMAT_SPECS`，由私有 `withFormatSpec()` 内联进 `RECOMMENDED_TEMPLATES` 每条的 content 末尾【返回格式】段；`renderPromptTemplate` 只做变量替换（签名已去掉 `customProtocol`）。设置页**删掉了整个「输出协议」编辑框**，只保留「提示词内容」+ 需要解析的环节在**底部一行提示**（「本环节结果按 Markdown 解析，请保留上面的输出结构」，`story` 为 JSON）。**已删除**：`applyOutputProtocol` / `defaultOutputProtocol` / `defaultContentRequirement` / `OUTPUT_CONTENT_DEFAULTS` / `OUTPUT_FORMAT_DEFAULTS`（改名 `OUTPUT_FORMAT_SPECS`）/ `PromptTemplate.outputProtocol` 字段 / 更早的 `PromptOutputParser` + `ASSET_PROMPT_PARSER_SPECS`。存量模板里存过的 `outputProtocol` 值被忽略，**不做数据迁移**。
  - ⚠️ **代价**：格式约定一旦可被用户改，解析就可能被改坏 —— 这是用户明确选择的取舍（「默认提示词内容里直接含输出格式」）。所以底部那行提示是必须保留的。
  - ⚠️ **存量模板缺口**：老模板 content 里没有【返回格式】段，批量一次性发送时模型可能不按 `【资产名｜状态名】` 返回；解析器的模糊匹配与顺序兜底仍会尽力，但建议让用户点「填入推荐模板」补齐。
- **哪些环节真的需要解析**（决定哪些模板必须带格式约定）：`storyboard`（分镜生成 + 页面 AI 优化，`parseStoryboardResponse` / `parsePanelBlock`）、`extract`（`parseAssetExtractionResponse`）、`asset-prompt` 批量·一次性（`parseAssetPromptResponse`）、`story`（旧版漫画项目编辑器，JSON）。**不需要解析**：`analysis` / `script`（整段 Markdown 入库）、`panel-prompt`（逐镜单次调用返回纯文本，**所谓「批量生成分镜绘画提示词」是循环单次，不需要解析**）、`style`（不调模型）。
- **统一返回格式 = Markdown，批量与逐条同一个格式**：asset-prompt 用 `ASSET_PROMPT_FORMAT`（`【资产名｜状态名】` + 提示词正文）。逐条发送 / 单条重写走 `extractSinglePromptText()`：单目标跑同一管线，命中取正文，未命中则剥掉行首包装与客套后退化为整段正文（单条不存在错配风险，宁可原样收下）。
- **单管线多层容错**（`assetPromptParser.ts`）：归一化预处理 → 多形态头识别 → 模糊名字匹配 → JSON / 序号容错 → 顺序兜底 → 诊断（`stage: ok | bracket | json | indexed | order | none`）。目标：**换模型 / 换格式都不能让整批请求白跑**。
- **两遍法**：候选头**必须先 resolve 成功才算头**，否则正文行 `- 视觉描述：A - B` 会被误判为头并切碎段落。
- **顺序兜底的安全阀**：只有「段落数严格等于目标数」才 1:1 回填；条数不等**不猜**（宁可报错 + 弹窗可看原始返回）。
- 模糊 / 顺序命中要在 UI **标出来让用户核对**（「近似匹配 / 顺序对应」），不能静默错配。
- 解析全失败抛 `AssetPromptParseError`，**错误自带 diagnostics**（stage / expected / parsed / missing / raw）→ 弹窗可查看并复制模型原始返回。

## 主题色写法（全项目通用）

`darkMode: 'class'` + CSS 变量（`:root` 浅色 / `html.dark` 暗色）。语义色（红/绿）用 **`-700 dark:-300`** 保证两主题可读（老代码的 `text-emerald-400` / `text-red-400` 只适合暗色）。**状态色只加在标题元素上，不要加在面板容器上** —— 否则会盖掉容器内 `text-text-muted` 元信息行（同为 `color` 工具类，靠样式表顺序决胜）。Tailwind 的 `bg-xxx/50` 透明度语法对 `var(--...)` 定义的语义色**不生效**。不用 `max-h` + 内层滚动去做「显示完全」，直接让表单主体 `overflow-y-auto` 完整铺开。

## 本机调试环境（省时间）

- **`ELECTRON_RUN_AS_NODE=1` 在 shell 里是设着的** → 直接跑 `electron.exe` 会退化成 Node，脚本静默跑不起来。要用 PowerShell `Remove-Item env:ELECTRON_RUN_AS_NODE` 清掉（**Bash 的 `env -u` 无效**，见下条）。
- **Electron 可以跑起来做真实验证（2026-09-14 更正旧结论）**：唯一可行写法是 **PowerShell**：先 `Remove-Item env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue`，再 `& $exe "D:\<探针目录>" --no-sandbox`（目录里放 `package.json`(main) + 主进程 cjs：`app.whenReady()` → `net.fetch` → `fs.writeFileSync` 结果 → `app.exit(0)`）。**Bash 里 `env -u ELECTRON_RUN_AS_NODE ... electron.exe` 会退出码 0 却什么都不做；`Start-Process -RedirectStandardOutput` 也跑不起来。** 这是验证「系统代理 / CORS / 真实网络栈」类问题的唯一可靠手段。
- **`net.fetch` 默认继承系统代理**：本机常开 Clash Verge（`127.0.0.1:7897`），凡是「curl 通但应用不通」的报错，先用 `session.defaultSession.resolveProxy(url)` 确认通道再排查。**该代理线路可能间歇性挂掉**，故 LLM 请求已内置「代理失败自动改直连」兜底 + 每模型 `bypassProxy` 开关。详见 `topics/llm-layer.md`。
- **Bash 工具可用（2026-09-14 更正）**：`ls` / `grep` / `find` / `rm` / `curl` / `tail` 均正常，日常文件操作直接用 Bash 更快。only 例外是「启动 Electron 做网络探针」必须用 PowerShell（见上条）。
- **PowerShell 工具不返回 stdout**，且重定向写出的是 UTF-16（Read 会判定为二进制）。用 `| Out-File -Encoding utf8` 再用 Read 读；汇总脚本交给 node 处理编码（`toString('utf8')` 失败再试 `utf16le`，并去 ANSI 色码）。
- 浏览器内验证用 Playwright（pnpm 严格布局，`require('playwright')` 找不到，要写 `node_modules/.pnpm/playwright@x/node_modules/playwright` 绝对路径）。

## 工程校验三件套

`npx vue-tsc --noEmit -p tsconfig.json` → `npx vitest run` → `npx vite build --outDir "D:/<临时目录>" --emptyOutDir`（构建产物必须写 **Windows 绝对路径**，Git Bash 的 `$TEMP` 会被解析到 D:\tmp）。

- **构建要带 `NODE_OPTIONS=--max-old-space-size=6144`**（2026-09-16 实测：不带时 `vite build` 会被 SIGTERM 杀掉且**不输出任何日志**；带上后 7.57s 正常出产物）。报错时先看 exit code，别只看是否有日志。
- **Bash 工具偶尔丢失 coreutils**：`tail` / `wc` / `dirname` 报 `command not found`（PATH 里只有 `Git/cmd`，没有 `/usr/bin`）。前缀 `export PATH="/c/Users/admin/.workbuddy/binaries/PortableGit/versions/1.2.0/usr/bin:$PATH" &&` 即可修复；不要把这类报错当成命令本身失败。

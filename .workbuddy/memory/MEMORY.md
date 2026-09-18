# 项目长期约定 — gzh-layout（漫画/公众号排版工具）

> 专题细节已拆出，用到时按需读：
> - `topics/llm-layer.md` — LLM 调用层 / 请求传输层 / 测试连接
> - `topics/asset-pipeline.md` — 资产提取归属匹配 / 确认落库（唯一行为：本次结果为准）/ 分镜 ↔ 视觉状态绑定与引用 / 资产提示词协议与解析器 / 8 类模板解析机制

## 滚动与溢出

**`custom-scrollbar` 只改滚动条外观（`::-webkit-scrollbar`），不设置 `overflow`**。想能滚必须自己写 `overflow-y-auto`。判定「能不能滚」看三件事是否齐全：父链一路 `min-h-0`（`flex` 子项默认 `min-height:auto` 会顶破高度）+ `flex-1` + `overflow-y-auto`。缺 `overflow-y-auto` 的症状是长内容被直接裁掉、滚不动。

## 禁止「假保存」提示

**只有用户主动触发写入时才可点亮「已保存 ✓」**。由 `watch` 监听外部值变化（AI 生成 / 提取确认回填 / 切 tab）后置位 savedAt，会让整列卡片集体闪一下提示 —— 用户没保存过任何东西，是纯噪音且误导。同类：多个条目共用一个卡片实例时，切条目要么让 `watch` 把空值也同步下去，要么直接给组件加 `:key="item.id"` 强制重建。

## 浮层 z-index 谱系（新增弹窗务必对照）

弹窗统一 `fixed inset-0` + `Teleport to="body"`，**值大者盖住值小者**。

| 值 | 用途 |
|---|---|
| z-40 | 菜单 / 下拉 |
| **z-50** | 常规弹窗（宿主是普通页面时用这档） |
| z-100 / z-101 | 全屏抽屉的遮罩 / 面板 |
| z-120 | 导入弹窗之上的覆盖确认 |
| **z-130 / z-131** | **抽屉内**打开的子弹窗（宿主 z-101，必须用这档） |
| z-200 | 大图预览（终端视图，最高业务层） |
| z-300 / z-9999 | PageSync / Toast |

通用组件（如 `ManualResultImportDialog`）**不能硬提层级**，要加 `zIndexClass` prop 由调用方决定。

**Teleport 到 body 的浮层必须自己写 `position: fixed`**（写在 scoped 类里，或挂 Tailwind `fixed`）。漏掉的症状极具迷惑性：元素退化成 **静态** 排在 `<body>` 末尾 —— `left/top` 内联样式全失效 → 视口内**看不到它**（「点了没反应」），同时它把文档撑高 → **页面出现滚动条 + 抖动**。而且类型检查和测试都抓不到（纯 CSS）。凡 `fixed inset-0` 的遮罩都记得配一个同级的定位面板。

**写 z-index 的坑**：Tailwind 只有 0/10/20/30/40/50/auto，`z-130` 这种**裸值是无效类**（本项目没扩展 `zIndex`）—— 不报错、不生成任何 CSS，弹窗会静默掉到 z-auto 被抽屉盖住。抽屉内子弹窗一律写 **`z-[130]` / `z-[131]`**（任意值语法）。

**坑（一条通则）**：组件 scoped 样式编译后特异性为 0,2,0，会**压过**同为 0,1,0 的 Tailwind 工具类 —— 不只颜色，一切属性都如此。要在模板上局部改圆角/边框/内边距（如分体按钮 `rounded-r-none`），必须在 scoped 里写同层级类（`.split-main { padding: 0 .75rem; border-top-right-radius: 0 }`），并保证定义在基类**之后**（特异性相同时靠样式表顺序决胜）。

## UI 沟通约定（避免返工）

**「在某个弹窗内」= 同一弹窗、同一视图内增删内容**，不是「同一弹窗切换阶段/视图」。
- 反例（已被否）：弹窗改成 `stage: 'config' | 'progress'`，点「开始生成」后整屏换成独立进度视图。
- 正例：配置项与输入框**始终可见**，进度只是输入框下方的一个信息区（`v-if="started"`）。

## UI 迭代细则（弹窗内改版）

- **换配置不作废输入**：切模板/模型/范围时**保留用户已编辑文本**，只增删条目；「重置」才按当前配置重算。**保留与重算必须是两个独立函数**。
- **条目多时不用横向标签条**：`<select>` + 上/下图标按钮 + `N / M` 计数，选项前缀 `◐/✓/✕/○` 标状态。
- **输入框自适应高度**：未开始时 `flex-1` 撑满剩余空间，开始后切 `h-[160px] shrink-0` 让空间给进度区；容器 `overflow-hidden` + `min-h-0`。
- **进度回传不抢焦点**：父组件推 `activeIndex` 前先看 `userPickedIndex`，用户手动选过就不自动跟随。
- **多模式功能的状态必须按模式分开存**：`runStates = { a: createState(), b: createState() }` + `state = computed(() => runStates[currentMode])`，否则 A 模式跑完切 B 会残留进度与按钮。
- **AI 生成结果一律「人工确认后才写回」**：结果只留在弹窗内 + 顶部「未填充」提醒，写回靠显式「填充到资产」；**有结果未填充时关闭弹窗必须二次确认**。
- **「发送内容」与「生成结果」分两个字段存**：`item.text` / `item.result`（+ 各自的 `original*` 供重置）。别用同一字段先装提示词再被结果覆盖。
- **重跑范围让用户选**：逐条模式下失败后同时给「仅重跑失败（N）」与「重新生成」（整批），不替用户决定。

## 长篇故事 · 分镜格式（v4，详见 docs/长篇故事剧本与分镜格式定稿.md）

- 分镜格用 `【第X格】`；字段名用 `「XXX」`，冒号后写内容；页头 `## 分镜 N · 双格`。
- **入库去包装、出库带包装**：`cell.dialogue/narration` 存裸文本，喂画面描述提示词时不带标记。
- 解析器兼容 v4 / v3（`①【镜头】画面` + `说话人：【台词】`）/ v2（`‖`）/ 旧 `- 字段：`。

## 主题色写法（全项目通用）

`darkMode: 'class'` + CSS 变量（`:root` 浅色 / `html.dark` 暗色）。语义色（红/绿）用 **`-700 dark:-300`** 保证两主题可读。**状态色只加在标题元素上，不要加在面板容器上** —— 否则会盖掉容器内 `text-text-muted` 元信息行（同为 `color` 工具类）。Tailwind 的 `bg-xxx/50` 对 `var(--...)` 定义的语义色**不生效**。不用 `max-h` + 内层滚动做「显示完全」，直接让表单主体 `overflow-y-auto` 铺开。

## 资产类型配色（人物 / 场景 / 道具）

**颜色值只出现在 `src/theme/tokens.css`** 的 `--asset-character` / `--asset-scene` / `--asset-prop`（`:root` 与 `html.dark` 各一份）。改配色只改这一个文件。

- `utils/assetTypeTheme.ts` 只做「类型 → 标签/图标/令牌名」映射，外加 `assetHighlightStyle()`（行内高亮）与 `assetTagClass()`；**不写颜色值**。
- 底面用 `color-mix(in srgb, var(--asset-x) N%, transparent)` 派生（需 Chromium ≥111，Electron 30 够）。**别用 Tailwind 的 `bg-x/50`**，对 `var()` 不生效。
- Tag 类 `.asset-tag--{type}` 与高亮类 `.asset-highlight` 定义在 `src/style.css` `@layer components`；组件模板里**不要再写 `rounded/border/px/py/text-[10px]`** —— 那些是 `@layer utilities`，会盖掉 components 层的同名属性。
- 新增消费方（任何要按类型着色的地方）一律走这两个函数，别再复制 `violet/sky/emerald` 类名。

## 输入框内资产名高亮（叠层方案）

`composables/useAssetHighlight.ts` + `components/AssetHoverCard.vue` 是唯一实现，分镜内容框与提示词框共用。

- **叠层结构**：高亮层绝对定位（`absolute inset-4` + `whitespace-pre-wrap break-all`，正常配色文字）在下，`textarea` 用 `text-transparent` + `caret-cyan-400` 压在上面。**两层的字体/字号/行高/内边距/断行必须逐像素一致**，否则文字错位；`custom-scrollbar` 必须做滚动同步。
- **命中只能坐标反查**：textarea 挡住高亮层，拿不到 span 的 hover → 先按整块矩形粗筛，再对命中的 span 逐字 `Range` 取矩形精判。`mousemove` 要 rAF 节流。
- 悬停卡延迟关闭（160ms）是必需的，否则鼠标一移向卡片就消失。
- 高亮判定口径 = **名字命中资产库即高亮**（`buildAssetNameIndex` + `detectAssetSpans`），不按 `assetBindings` 过滤 —— 绑定本身就是扫名字产生的，按绑定过滤反而要等保存回流才有高亮。

## 章节阶段（node.stage）只升不降

`LONG_CHAPTER_STAGE_ORDER`（`types/index.ts`）：empty → source-ready → analysis-ready → script-ready → **assets-ready → storyboard-ready** → prompts-ready → completed（资产在分镜**之前**，新管线要求资产先就绪）。

统一口径在 `utils/chapterStage.ts`：`chapterStageIndex()` / `chapterStageAtLeast()` / `stageAfterSourceEdit()`。**任何写 `node.stage` 的地方都要先过这里算目标值，不要直接赋值** —— 按"当前输入有什么"直接赋值会把已走远的阶段**降级**（真实 bug：原文正文自动保存把 `storyboard-ready` 打回 `source-ready`，且没有路径能补回）。其余写入点（useChapterDocRun ×3 / useStoryboardRun / PanelGenAssetTab）本来就带 `indexOf(current) < indexOf(next)` 守卫。

## 原生控件配色：color-scheme

`tokens.css` 的 `:root` 与 `html.dark` 各带一条 `color-scheme`（`light` / `dark`）—— 它决定原生控件（`<select>` 展开列表、滚动条、日期选择器、自动填充底色）按哪套**系统**配色绘制，跟 CSS 变量无关。新增原生控件前先确认这两条还在；删掉后暗色主题下的下拉列表会变白底。

## 参考图清单 = 全项目唯一图号来源

`services/panelRefManifest.ts` 的 `buildPanelRefManifest()` 决定「一张图是第几号」。**任何需要图号/参考图顺序的地方只能读它**，不要再自己遍历 `assetBindings`：

- 编号顺序固定：**「插入最前」的共用属性图（按 sortOrder → 上传顺序）→ 人物 → 场景 → 道具**（组内按页级绑定/状态展开顺序，每状态取 1 张，走 `resolvePanelRefImage` 单选口径）。
- **「插入最后」的块完全不参与**取图与编号（`getSharedRefImages` / `computeBlockImageNumbers` 也只算 front）—— 图号是从前往后编的，后置属性的文字却在描述之后，带图必然错位。数据保留，切回 front 即恢复。
- **不做截断**：清单返回全部图，生图侧不 `slice`。原来的 `MAX_REF_IMAGES = 14` 已从长篇链路移除。
- 纯函数无缓存 → **改图/换状态/调顺序立刻反映到下一次拼装**，不需要刷新按钮，也不要加落库同步。
- 消费方四处已统一：分镜页取图 `panelRefImages`、右栏分组 `currentRefGroups`、画面描述变量、`assetUsageService` 的图片角标。
- 不变式：`images[i]` 就是「图 i+1」。清单文本 `buildRefManifestText()` 输出「图N = 谁（用途）」——**序号由代码算，语义由模型写**，绝不指望模型自己数图。

## 画面描述：两个模板类型 + 三层拼接

- **`panel-prompt`（逐镜）与 `panel-prompt-chapter`（整章一次）是两个模板类型，不要合并**。变量集不同：全章用 `{{全章分镜}}` / `{{全章资产设定}}` / `{{全章参考图清单}}`，且**不含** `{{镜头}}` / `{{前文分镜}}` / `{{本章分镜概要}}`（全章分镜原文已含全部上下文）；输出协议也不同（全章要 `【分镜N】` 分段，靠 `parseChapterPanelPrompts` 对位，容错 `第N镜`/Markdown 标题/顺序兜底/漏段报告）。
- 共用属性变量由代码拼、**不进 `imagePrompt` 字段**：`composeFinalPrompt()` = **前置共用属性 + 画面描述 + 后置共用属性**，只在生图时拼。所以改画风/换图**不必重跑 LLM**，描述字段也保持纯净（可单独复制到外部 AI）。
- 共用属性块的拼法是 `buildBlockText()`：`属性名` → `图N、图M：属性名。` → 用户描述正文，**三段互不覆盖**。绝不要恢复「按图号回写 description」那类函数（历史 bug：上传/删图会把手填正文冲成话术）。
- `{{风格上下文}}` 已移除（存量模板里的占位符渲染时按未注册清理，设置页会红字告警）。
- **循环依赖陷阱**：`panelRefManifest` 依赖 `panelPromptService`，所以 `buildPanelPromptPrompt` 收的是 `refManifestText: string`（调用方用 `buildRefManifestText(buildPanelRefManifest(...))` 生成），**不要改成收 manifest 对象**，否则形成运行时循环。

## 本机调试环境（省时间）

- **Bash 工具可用**：`ls`/`grep`/`find`/`rm`/`curl`/`tail` 正常，日常文件操作直接用 Bash 更快。偶发丢失 coreutils（`tail`/`wc` 报 not found）→ 前缀 `export PATH="/c/Users/admin/.workbuddy/binaries/PortableGit/versions/1.2.0/usr/bin:$PATH" &&` 即恢复；不要把这类报错当命令失败。
- **`ELECTRON_RUN_AS_NODE=1` 在 shell 里是设着的** → 直接跑 `electron.exe` 会退化成 Node，脚本静默跑不起来。
- **要用真 Electron 验证（系统代理 / CORS / 真实网络栈）只能走 PowerShell**：`Remove-Item env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue` → `& $exe "D:\<探针目录>" --no-sandbox`（目录里放 `package.json`(main) + 主进程 cjs：`app.whenReady()` → `net.fetch` → 写结果 → `app.exit(0)`）。**Bash 的 `env -u` 无效（退出码 0 却什么都不做）；`Start-Process -RedirectStandardOutput` 也跑不起来。**
- **`net.fetch` 默认继承系统代理**：本机常开 Clash Verge（`127.0.0.1:7897`）。「curl 通但应用不通」先用 `session.defaultSession.resolveProxy(url)` 确认通道。代理线路会间歇挂掉，故 LLM 请求内置「代理失败自动改直连」+ 每模型 `bypassProxy`（详见 topics/llm-layer.md）。
- **PowerShell 工具不返回 stdout**，重定向写出的是 UTF-16（Read 会判为二进制）：用 `| Out-File -Encoding utf8` 再 Read；汇总交给 node（`toString('utf8')` 失败再试 `utf16le`，去 ANSI 色码）。
- 浏览器内验证用 Playwright（pnpm 严格布局，`require('playwright')` 找不到，要写 `node_modules/.pnpm/playwright@x/node_modules/playwright` 绝对路径）。

## 工程校验三件套

`npx vue-tsc --noEmit -p tsconfig.json` → `npx vitest run` → `NODE_OPTIONS=--max-old-space-size=6144 npx vite build --outDir "D:/gzh-build-check" --emptyOutDir`

- 构建产物必须写 **Windows 绝对路径**（Git Bash 的 `$TEMP` 会被解析到 D:\tmp）。
- **必须带 `--max-old-space-size=6144`**：不带时 `vite build` 会被 SIGTERM 静默杀掉、**一行日志都没有** → 判断成败看 **exit code**，别只看日志。

## 工具用法坑（会静默出错）

**同一条消息里对同一个文件发多个 Edit 会互相覆盖**：每个都报 success，但只有最后一个落盘。
改同一文件的多个位置必须**一次一个 Edit**（或合并成一个大 Edit）。发现"明明说成功了但文件没变"就是这个原因 —— 用 `grep` 复核，别信成功回显。

## 提示词模板：用户自建优先，代码不藏"内置文案"

**原则**：能被用户改的东西（提示词拼法）必须以"用户模板"形式存在；推荐模板只作**新建时的底稿**（设置页「填入推荐模板」/ 弹窗「新建模板（填入推荐内容）」），不做"模板缺失时用内置兜底"。用户明确否定过内置默认模板。

**画面描述环节（panel-prompt / panel-prompt-chapter）的变量边界**：
只给「分镜内容 + 资产视觉设定 + 资产参考图号清单」，**共用属性正文一律不给模型** —— 它由 `composeFinalPrompt` 在生图时拼到描述前后（唯一入口）。理由：给模型会被抄进描述 → 生图再拼一遍 → 重复；且描述被画风污染后换画风必须重跑。

**图号只有一个来源**：`panelRefManifest.ts`。喂模型用 `buildRefManifestText(m, { assetsOnly: true })` —— 只列资产条目但**沿用生图真实图号**（前置共用属性图先占号），并附一行占位说明；生图取图仍用完整 `manifest.images`（不截断）。改图 / 换状态 / 调顺序都是纯函数实时算，不存在"刷新按钮"。

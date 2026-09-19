# 项目长期约定 — gzh-layout（漫画/公众号排版工具）

> 专题细节按需读：
> - `topics/llm-layer.md` — LLM 调用层 / 请求传输层 / 测试连接
> - `topics/asset-pipeline.md` — 资产提取归属匹配 / 确认落库 / 分镜↔视觉状态绑定 / 资产提示词协议与解析器 / 8 类模板解析机制
> - `topics/local-debug.md` — 本机调试环境（Bash/PowerShell/Electron/代理/Playwright）/ 工程校验三件套 / 工具用法坑

## 布局与滚动

- `custom-scrollbar` 只改外观不设 `overflow`；能滚三件套：父链一路 `min-h-0` + `flex-1` + `overflow-y-auto`。
- 弹窗统一 `fixed inset-0` + Teleport 到 body；**Teleport 浮层必须自己写 `position: fixed`**（漏掉 → 元素静态排在 body 末尾，看不见还撑出滚动条）。
- z-index 谱系：z-40 菜单｜**z-50** 常规弹窗｜z-100/101 全屏抽屉遮罩/面板｜z-120 覆盖确认｜**z-130/131 抽屉内子弹窗**｜z-200 大图预览｜z-300/9999 PageSync/Toast。Tailwind 裸值 `z-130` 无效，必须写 `z-[130]`。通用组件用 `zIndexClass` prop，不硬提层级。
- 组件 scoped 样式（0,2,0）压过 Tailwind 工具类（0,1,0）—— 要局部覆盖必须在 scoped 里写同层级类，且定义在基类之后。

## UI 约定

- **禁止假保存提示**：只有用户主动写入才点亮「已保存✓」；watch 外部值变化置位 savedAt 是纯噪音。多条目共用卡片实例加 `:key="item.id"`。
- 「在弹窗内」= 同一弹窗同一视图增删内容，不是切阶段/换视图；配置项始终可见，进度只是下方信息区。
- 换配置不作废输入（保留与重算是两个函数）；条目多用 select+上下按钮+N/M 计数；多模式状态按模式分开存（`runStates[mode]`）。
- AI 结果一律人工确认后才写回；有结果未填充时关闭弹窗二次确认。`item.text` / `item.result` 分字段存。
- 主题色：`darkMode: 'class'` + CSS 变量；语义色 `-700 dark:-300`；状态色只加标题元素不加容器；`bg-x/50` 对 `var(--...)` 不生效。

## 资产配色与高亮

- 颜色值只在 `src/theme/tokens.css`（`--asset-character/scene/prop`）；`utils/assetTypeTheme.ts` 只做映射，消费方走 `assetHighlightStyle()` / `assetTagClass()`，底面用 `color-mix(...var(--asset-x)...)`。Tag/高亮类定义在 `src/style.css` `@layer components`，组件模板别再写同名 utilities。
- 输入框资产名高亮：`useAssetHighlight.ts` + `AssetHoverCard.vue` 唯一实现（叠层方案：高亮层在下 + `text-transparent` textarea 在上，两层排版逐像素一致 + 滚动同步；hover 坐标反查 rAF 节流；悬停卡延迟关闭 160ms）。判定口径 = 名字命中资产库即高亮。

## 章节阶段（node.stage）只升不降

`LONG_CHAPTER_STAGE_ORDER`：empty → source-ready → analysis-ready → script-ready → **assets-ready → storyboard-ready** → prompts-ready → completed。统一口径在 `utils/chapterStage.ts`，**任何写 stage 的地方先过这里算目标值**，不要直接赋值（历史 bug：自动保存把 storyboard-ready 打回 source-ready）。

## 参考图清单 = 全项目唯一图号来源

`services/panelRefManifest.ts` 的 `buildPanelRefManifest()`。编号顺序：前置共用属性图（sortOrder→上传序）→ 人物 → 场景 → 道具；「插入最后」的块不参与取图与编号；不截断（MAX_REF_IMAGES 已移除）；纯函数实时算，无刷新按钮。不变式：`images[i]` 就是「图 i+1」；清单文本「序号由代码算，语义由模型写」。消费方四处统一：panelRefImages / currentRefGroups / 画面描述变量 / assetUsageService 角标。

**视觉状态有效参考图口径（2026-09-19 定稿）**：`effectiveVariantRefImages(variant)` = 采纳图（`referenceImageIds`）非空用它，为空**回落生成图**（`generatedImageIds`）——用户口径「资产生成的图就是参考图」，不要求先采纳；采纳图优先于生成图。`resolvePanelRefImage` 走该列表，全项目取图/缩略图/角标/图号自动同源。

**成图口径 = 显示哪张就用哪张（2026-09-19 定稿）**：无「候选图/点击采纳」环节；`selectedImageId` = 当前显示图 = 导出图；生成成功即选中新图；多张悬停主图左右切换（立即落库）。删除成图/资产生成图一律 ConfirmDialog 确认；删资产图时 `updateAssetVariant` 按 patch 差集清扫 storyboardRuns 页级+格级绑定 `selectedImageIds`（无残留）。删空成图回落 `genStatus:'none'`。`AssetHoverCard` 已删，输入框高亮只剩着色（命名校对探针）+ 提示词框点击名字看大图。

## 画面描述：两个模板类型 + 三层拼接

- `panel-prompt`（逐镜）与 `panel-prompt-chapter`（整章一次）**不要合并**。逐镜变量：`{{参考图清单}}/{{当前分镜}}/{{镜头}}/{{前文分镜}}/{{本章分镜概要}}/{{目标生图模型}}`；全章变量：`{{全章分镜}}/{{全章参考图清单}}/{{目标生图模型}}`（不含逐镜三件套）。**「绑定资产 / 全章资产设定」变量已下线**（2026-09-19，`buildPanelAssetsContext` 已删）：资产外观由参考图清单图号承载，共用属性输出协议句也已删（AI 不感知共用属性）；旧用户模板里这两个变量渲染为空。全章输出靠 `parseChapterPanelPrompts` 按 `【分镜N】` 对位（容错 `第N镜`/MD 标题/顺序兜底/漏段报告）。
- 共用属性**不进模板变量、不进 imagePrompt**：`composeFinalPrompt()` = 前置共用属性 + 描述 + 后置共用属性，只在生图时拼（改画风不必重跑 LLM）。`buildBlockText()` 三段式：属性名 → 图N、图M：属性名 → 用户正文，互不覆盖。
- `buildPanelPromptPrompt` 收 `refManifestText: string`（调用方 `buildRefManifestText(buildPanelRefManifest(...), { assetsOnly: true })` 生成），不收 manifest 对象（循环依赖陷阱）。喂模型的清单 assetsOnly 但沿用生图真实图号。
- 逐镜批量：滑动窗口前 K=2 镜（`DEFAULT_PREV_PANEL_WINDOW`）带已推导描述，随进度动态刷新；复制到外部 AI 时拼接全章 + `COPY_FORMAT_NOTE`（只进复制文本，不进模板）。
- **画面描述输出口径 = 三段结构（2026-09-19 定稿，方案 B）**：每镜输出 = ①「资产参考图：」小节（**逐行照抄 assetsOnly 清单**，行版式即输出版式：`图N = 资产名（状态）角色/场景/道具参考，仅用于…。`；人物写身份用途不写格号，场景/道具写「仅用于第X格的…」格号范围）→ ②「请根据以上参考图生成一页N格漫画。」（N=分镜格数）→ ③ 逐格「第X格：」小节（景别镜头一行 → 画面内容 1~3 行 → 本格用图声明「使用图M…；」→ 构图衔接可选）。`buildRefManifestText` 的 assetsOnly 分支专用 `ASSET_TYPE_REF_NOUN`/`ASSET_TYPE_USAGE_CORE` 常量，完整清单（人工核对）版式不变。
- **分镜中栏（PanelAssetTabs）= 三 tab 缩略图 + 左侧参考图抽屉**（2026-09-19）：底部按 **人物/场景/道具 三个 tab** 分组卡片（tab 样式与抽屉一致，带计数；切分镜自动定位第一个非空分类），每卡只显示当前选中缩略图（图N 角标 = manifestIndexOf 查 `buildPanelRefManifest`，编号含前置共用属性图）；点击缩略图开**左侧抽屉**（样式对齐 ImageConfigDrawer，z-[100]/[101]，人物/场景/道具 tab）；抽屉内切状态（chip）/切图（网格）全部**本地预选、点「保存」一次性写库**（逐次点击写盘=卡顿根因）；无「添加/更换图片」按钮、不跳工作台，无图只显示灰字「无参考图」。`update-variant-images` / `go-asset-workbench` 事件链已删。
- **批量弹窗不再有「仅补缺失」范围选择**（2026-09-19）：画面描述与资产提示词批量一律全部重推/重生成；发送方式统一叫「一次性发送 / 逐条发送」。资产一次性发送支持「复制提示词 → 外部 AI → 导入解析」（`buildTargetList` 已导出，导入与内置批量同解析器；结果走 batch-once 回执进结果视图，人工「填充到资产」）。逐条模式的「仅重跑失败（N）」保留——那是事后重跑，不是初始范围。
- **外部 AI 代跑导入入口统一在「复制提示词」弹窗内**（2026-09-19）：PromptPreviewDialog footer = 复制提示词 + 导入外部 AI 结果（emit `import`，PromptRunBar 转发）；原文/剧本/资产提取/分镜走 PromptRunBar 的确认弹窗，绘图（整章画面描述）走 PanelPromptGenerateModal（仅一次性发送显示导入）。页面上原独立「手动写入/手动导入」按钮全部删除；导入弹窗一律 z-[140]（压过 PromptPreviewDialog z-[130]）。

- **批量写 panelArtworks 一律用 `upsertArtworksBatch`**（2026-09-19）：`upsertArtwork` 每条 = 一次「DB 全量读 → 两次全量深拷贝 → 全量写回」串行队列任务，循环 await 34 镜就卡死界面（整章导入/整章推导已踩坑）；批量场景合并为一次 read-modify-write。导入弹窗统一有 `busy` 态（ManualResultImportDialog）。

## 全链路统一 Markdown（2026-09-19 定稿，v5）

- **口径：输出语法统一为 Markdown（`#` 标题 + `- 字段：内容`），解析专用**——各解析器保持专用（树状/页格/平铺结构差异大，不抽重型统一算法），但输出语法一致。不要求「统一解析算法」，禁止过度抽象。
- **分镜 v5**：格 `### 第X格` 标题 + `- 字段名：内容` 列表行；页头 `## 分镜 N · X格` 不变。`serializePanelBlock` / `formatCellsForPrompt` 均输出 markdown。解析主路径在 `parseStoryboardResponse` 分支 0（MD_CELL_TITLE_RE）+ 分支 2（FIELD_RE **格内/页级双语义**：格内 `镜头`=运镜、台词拆说话人、出场资产进格；页级保持旧语义）。v4/v3/v2 符号全部保留兼容；旧数据打开即升级为 v5 文本。
- **资产绘画提示词**：逐条 `## 资产名｜状态名` 标题 + 正文（`ASSET_PROMPT_FORMAT`）；assetPromptParser 形态②前缀类本就含 `#`，核心未动，只改协议文案。
- **画面描述整章**：分段标记 `## 分镜 N`（输入清单标记、COPY_FORMAT_NOTE、导入 placeholder 同步）；`parseChapterPanelPrompts` 主形态即 md 标题。**关键修复：`第N格` 不再被当分镜标记**（旧正则 `(?:镜|格)?` 会把每镜自己的 `第1格：` 格小节误当标记截断正文）——标记只认 `分镜N` / `第N镜`。
- 提示词模板（OUTPUT_FORMAT_SPECS + 推荐模板）与 docs/长篇故事剧本与分镜格式定稿.md（标题 v5、2.2 规范、4.4 协议）已同步；旧用户模板需自行「填入推荐模板」。

## 提示词模板：用户自建优先

**能被用户改的拼法必须以用户模板存在**；推荐模板只作新建底稿（「填入推荐模板」），**不做"模板缺失时内置兜底"**（用户明确否定过）。

## 长篇故事 · 分镜格式（v5 Markdown，详见 docs/长篇故事剧本与分镜格式定稿.md）

页头 `## 分镜 N · 双格`；格 `### 第X格`；字段 `- 字段名：内容`。**入库去包装、出库带包装**。解析器兼容 v5/v4/v3/v2/旧格式；带模板选择的弹窗默认选中第一个模板（记忆模板有效则优先）。

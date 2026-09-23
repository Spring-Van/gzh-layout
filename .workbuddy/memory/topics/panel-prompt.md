# 专题：画面描述管线（模板类型 / 三层拼接 / 图号清单 / 中栏与弹窗）

> 从 MEMORY.md 拆出（2026-09-19 定稿为主，含 09-22/09-23 补充）。

## 两个模板类型 + 三层拼接

- `panel-prompt`（逐镜）与 `panel-prompt-chapter`（整章一次）**不要合并**。
  逐镜变量：`{{参考图清单}}/{{当前分镜}}/{{镜头}}/{{前文分镜}}/{{本章分镜概要}}/{{目标生图模型}}`；
  全章变量：`{{全章分镜}}/{{全章参考图清单}}/{{目标生图模型}}`（不含逐镜三件套）。
  **「绑定资产 / 全章资产设定」变量已下线**（2026-09-19，`buildPanelAssetsContext` 已删）：资产外观由参考图清单图号承载，
  共用属性输出协议句也已删（AI 不感知共用属性）；旧用户模板里这两个变量渲染为空。
  全章输出靠 `parseChapterPanelPrompts` 按 `【分镜N】` 对位（容错 `第N镜`/MD 标题/顺序兜底/漏段报告）。
- 共用属性**不进模板变量、不进 imagePrompt**：`composeFinalPrompt()` = 前置共用属性 + 描述 + 后置共用属性，
  只在生图时拼（改画风不必重跑 LLM）。`buildBlockText()` 三段式：属性名 → `图N、图M = 属性名。` → 用户正文，互不覆盖。
  资产生图走自己的 `composeAssetPrompt`，读 `assetGenConfig.sharedBlocks`（与分镜不互通）。
- **画面描述环节不给图号、不给共用属性**：`buildPanelPromptPrompt` 的入参是
  `{ templateContent, panel, chapterOutline, prevEntries, targetImageModel }`，**没有** `refManifestText`；
  `VARIABLE_REGISTRY` 里 `{{参考图清单}}`/`{{全章参考图清单}}` 也已不存在。
  图号与共用属性一律由 `composeFinalPrompt` 在**生图时**拼，所以换状态/调顺序/改画风都不必重跑推导。
- 逐镜批量：滑动窗口前 K=2 镜（`DEFAULT_PREV_PANEL_WINDOW`）带已推导描述，随进度动态刷新；
  复制到外部 AI 时拼接全章 + `COPY_FORMAT_NOTE`（只进复制文本，不进模板）。
- **画面描述输出口径 = 纯画面内容**（`panel-prompt` / `panel-prompt-chapter` 的推荐模板都明确要求
  「只写这一镜的纯画面内容，不要输出资产参考图清单、图号、共用属性、全局画风或系统说明」）。
  逐镜「第X格：景别镜头 → 画面内容 1~3 行」的分格写法保留，但**不再要求模型写「资产参考图：」小节、不写「使用图M」声明**
  —— 那是已废弃的旧方案。

## 「图N = …」清单的真实产出点

**`panelPromptService.buildFinalPromptSections()`（第 241-257 行）**，不是 `buildRefManifestText`
（**该函数在源码里不存在**，只在 `docs/` 的规划稿里出现过；`ASSET_TYPE_REF_NOUN`/`ASSET_TYPE_USAGE_CORE` 同样不存在）。
硬编码全在 244-252 的三元表达式里：

```ts
const type = entry.assetType === 'character' ? '人物' : entry.assetType === 'scene' ? '场景' : '道具'
const scope = entry.cellIndexes?.length ? `第${entry.cellIndexes.map((i) => i + 1).join('、')}格` : '整镜'
// 用途句：仅用于{scope}的「人物身份、脸部、发型、服装与外貌特征」/「环境与空间布局」/「道具外观与材质」
return `图${entry.index} = ${entry.label}${state}${type}参考，${usage}。`
```

人物**也有**格号（`scope` 对所有类型一视同仁），差别只在用途话术。标题 `【动态参考图】` 在 256 行。

- **预览与实发同源**：`PanelPromptPanel` 的最终提示词弹窗与 `generatePanelImage` 都调
  `buildFinalPromptSections`/`composeFinalPrompt`，逐字一致 —— 改这段文案时两处同改（其实只有一处）。

## 中栏分镜资产区

- **`PanelAssetTabs` = 三 tab 缩略图 + 左侧参考图抽屉**（2026-09-19）：底部按 **人物/场景/道具 三个 tab** 分组卡片
  （tab 样式与抽屉一致，带计数；切分镜自动定位第一个非空分类），每卡只显示当前选中缩略图
  （图N 角标 = manifestIndexOf 查 `buildPanelRefManifest`，编号含前置共用属性图）；
  点击缩略图开**左侧抽屉**（样式对齐 ImageConfigDrawer，z-[100]/[101]，人物/场景/道具 tab）；
  抽屉内切状态（chip）/切图（网格）全部**本地预选、点「保存」一次性写库**（逐次点击写盘=卡顿根因）；
  无「添加/更换图片」按钮、不跳工作台，无图只显示灰字「无参考图」。
  `update-variant-images` / `go-asset-workbench` 事件链已删。

## 批量弹窗与外部 AI 导入入口

- **批量弹窗不再有「仅补缺失」范围选择**（2026-09-19）：画面描述与资产提示词批量一律全部重推/重生成；
  发送方式统一叫「一次性发送 / 逐条发送」。资产一次性发送支持「复制提示词 → 外部 AI → 导入解析」
  （`buildTargetList` 已导出，导入与内置批量同解析器；结果走 batch-once 回执进结果视图，人工「填充到资产」）。
  逐条模式的「仅重跑失败（N）」保留 —— 那是事后重跑，不是初始范围。
- **外部 AI 代跑导入入口统一在「复制提示词」弹窗内**（2026-09-19）：PromptPreviewDialog footer =
  复制提示词 + 导入外部 AI 结果（emit `import`，PromptRunBar 转发）；原文/剧本/资产提取/分镜走 PromptRunBar 的确认弹窗，
  绘图（整章画面描述）走 PanelPromptGenerateModal（仅一次性发送显示导入）。页面上原独立「手动写入/手动导入」按钮全部删除；
  导入弹窗一律 z-[140]（压过 PromptPreviewDialog z-[130]）。
- **批量写 panelArtworks 一律用 `upsertArtworksBatch`**（2026-09-19）：`upsertArtwork` 每条 = 一次
  「DB 全量读 → 两次全量深拷贝 → 全量写回」串行队列任务，循环 await 34 镜就卡死界面（整章导入/整章推导已踩坑）；
  批量场景合并为一次 read-modify-write。导入弹窗统一有 `busy` 态（ManualResultImportDialog）。

## 画面描述工件的迁移与归属（2026-09-22 定稿）

`panelPromptService.migratePanelArtworks(artworks, oldPanels, newPanels, chapterId)` →
`{ artworks, droppedPromptCount }`（**重跑分镜与重新导入两条路径共用**）。能继承需**同时**满足：

1. **同序号**且正文**逐字相同** —— 描述写的还是这一页的画面；
2. 描述自身**不是 `stale`** —— 过期是历史欠账，不会因为「这一版正文没变」自己还清。

**不要按页数判断**（曾打算这么写）：分页结构重划时同序号正文必然不同，条件 1 已覆盖；
判页数反而救不了「页数相同但内容全变」。也**不要用内容相似度对位**：描述是正文的扩写而非复述，
实测「正确对」基线仅 0.29、「错配对」能到 0.47，阈值无法区分。

不可继承时的处理：**描述直接丢弃**（正文已变/已过期，留着只会被误用误绑）；**成图跟随**
（用户劳动成果，避免重导入后凭空丢图）——有图才新建「只带成图的记录」。
`droppedPromptCount` 由 `runStoryboard` / `importStoryboard` 带回，页面弹 `notifyDroppedPrompts()`
提示「N 页描述需重新推导」。另有保护：`oldPanels` 为空（首次生成）时整个函数直接返回，不碰任何工件。
丢弃描述时**连 `genPrompts` 一起清掉**（候选条也是照旧画面写的）。

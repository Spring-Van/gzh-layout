# 专题：项目数据清理 · 引用完整性（漫画长篇项目）

> 从 MEMORY.md 拆出（2026-09-23）。

## 项目数据清理：删除要级联、版本要压缩（2026-09-22 定稿）

统一在 `services/projectDataCleanup.ts`。**分镜与提取都是「每次重跑/重导入追加一条」的写法，历史版本没有任何界面消费 —— 实测占数据文件 92% 体积。**

- `cleanupChapterData(data, chapterIds)`：删章节**连带清理**该章分析/剧本/分镜版本/画面工件/提取记录/章节资产引用，并按孤儿口径清掉**仅剩它引用**的 chapter 级资产与状态（被别章引用的、`scope:'project'` 不动）。**只摘节点不清数据是错的**；函数内含「章节仍在 nodes 里就什么都不做」的保护。
- `sweepProjectData(data)`：每章分镜留**最新 + 最新 completed**；不在保留版本的 `panelArtworks` 全删；提取记录同理；清悬空 `chapterAssets.sourceExtractionRunId`、`referenceImageOrder`、候选条 `text: null`、节点树里已不存在章节的残留。
- `hasSweepWork(data)` 与 `sweepProjectData` 共用 `planSweep`，载入时预检，无残留不写库。
- **接线点**：`runStoryboard`/`importStoryboard` 的 mutate 末尾、资产页两处 append run、`LongProject.vue` onMounted。**新增任何「版本追加」写法时必须同时接上压缩**。

## 引用完整性：资产变了，引用它的地方都要跟上

- **`chapterAssets` 悬空指针**：`assetExtractionConfirm.repairDanglingChapterAssets(...)` —— 覆盖式确认只重建**当前章节**引用，被删状态若被别章引用会留悬空 `variantId`。口径同 `repairDanglingBindings`：状态悬空回落到**该引用方章节**的默认状态，资产整条没了就丢弃引用。接线：`PanelGenAssetTab.confirmExtraction` / `clearOrphans` / `sweepProjectData`。
- **别名以「本次提取结果」为准，不做并集**：并集让旧别名永久累积，撞名后 `buildAssetNameIndex` 会把资产判为 `ambiguous` 并**整个退出自动绑定识别**（静默失效，很难查）。
- **`assetPromptRuns` 已删除** —— 曾只声明不读写的死字段，`sweepProjectData` 会清旧库残留键。

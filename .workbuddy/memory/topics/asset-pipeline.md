# 专题：资产提取 · 归属匹配 · 确认落库（漫画长篇项目）

## 一、提取结果 → 资产的三段链路

`提取`(run，可多次，push 不覆盖) → `审核页`(改 Markdown / 只读归属) → `确认本章资产`(真正落库 + 回填分镜绑定)。

**重新提取 ≠ 覆盖旧结果**：`LongProjectAssetTab.runExtraction()` 每次 push 一条新 run，旧 run 原样留着；信息 tab 固定展示 `chapterRuns[0]`（updatedAt 倒序）。真正生效只在点「确认」那一刻。

## 二、归属匹配算法（`assetExtractionService.ts`，解析时自动跑，只产"建议"不落库）

**资产级** `matchExistingAsset`：候选 `name` + `aliases` 归一化（trim + 小写 + 去所有空白）后与已有资产的 name/aliases **任一相等**，且 `type` 相同 → `suggestedAssetId`；否则视为新建。别名参与比对（"小张"能命中「张三」），**类型必须一致**（person 提取成 scene 不会命中）。

**状态级** `matchVariantForState`：只对命中资产做，四档递进，**任一命中即返回**：

| 档 | 规则 | 例 |
|---|---|---|
| ① | `name.trim()` 完全相等 | 「中学时期」=「中学时期」 |
| ② | 归一化相等（大小写/空白无关） | 「中学 时期」=「中学时期」 |
| ③ | `compactName` 相等（去掉 `·・•-—~_/|,，、;；:：.。()（）[]【】`） | 「中学·时期」=「中学时期」 |
| ④ | 双向包含，**两侧长度都 ≥2** | 「少年期」↔「少年」 |

命中 → `state.suggestedVariantId` + `matchSource:'model'`；未命中 → 留空 = 新状态。

**⚠️ ④ 档是模糊匹配，容易把"本人以为的新状态"判成同名**：已有「校服」，新提「校服冬装」→ 双向包含 → 命中现有状态 → **不新建**，只往旧状态补空缺字段。想让它成为独立状态，要在审核页把名字改到互不包含（如「冬装校服造型」）。

**审核页可编辑**：中列 Markdown 改名后 `patchContent` 重跑一遍上面的匹配（`matchVariantForState`），归属建议随之更新。左列**不再显示任何「沿用 / 新建」状态标记**（2026-09-17 二次决策：确认只有唯一行为，标记无处可用，只会制造噪音）；右列 header 仍显示「N 归属」，归属状态 tag 虚线边 + 紫点（仅供核对归属）。

## 三、确认落库（`assetExtractionConfirm.ts`，**唯一行为：本次结果为准**）

**只有一种落库行为**（`ExtractionApplyMode` 与 merge 模式已于 2026-09-17 **彻底删除**，不是隐藏入口而是删代码）：

**共同前置**：本章 `chapterAssets` 引用**全部清空重建**；`scope='chapter'` 且仅被本章引用、本次候选又没 suggest 的资产**整条丢弃**。

| 项 | 行为 |
|---|---|
| 资产级 content/description | 候选优先（候选为空回退旧值，避免把资产清空） |
| 资产级 attributes | `{...旧, ...候选}`（候选优先） |
| aliases | 始终求并集（身份标识不做取舍） |
| 命中已有状态 | 复用原 variant id（优先 suggestedVariantId，再同名[归一化]）→ 保住已生成的参考图 / 生成图 / 分镜绑定；只补空缺字段 + 追加 chapterId |
| 新状态 | 新建 variant（新 uuid，firstAppearance 与 chapterRange 起点 = 本章） |
| 本次未出现的旧状态 | **一律删除**（严格全删，不做跨章感知） |

### 三之一 · 重建必须按资产归组 + 双重去重（2026-09-17 修 bug）

**症状**：确认本章资产后「视觉状态没被覆盖，反而新增了一条，导致重复」。

**根因（两处，都在整表重建的写法里）**：
1. **同目标重复** —— 两个候选状态经模糊匹配（第 ④ 档双向包含，典型「少年」与「少年期」）都指向同一条已有状态，重建时 `states.map()` 把它们各推一条 → 产出 **两条 id 相同的视觉状态**。表现上就是「原来那条被改名复制了一份」，工作台状态 tab 出现两个一样的条目（且 Vue 同 key 重复）。
2. **逐条覆盖互相冲掉 / 同名候选各造一条资产** —— 同一资产被多个候选命中时逐条 `overrideAssetWithCandidate`，后一条用**自己的** states 整表重建 → 前一条的状态全丢；而两个都判定为"新建"的同名候选会各自 `createAssetFromCandidate` → **两条同名资产**（状态看起来成倍重复）。
   ⚠️ 注意章节引用那一层**本来就有 `chapterEntryKeys` 去重**，正是它掩盖了变体层的重复，让人以为逻辑是对的。

**修法**（`buildExtractionConfirmResult` 重写为三段）：
1. **先定目标资产**：① 解析期 `suggestedAssetId`；② 本次提取里**同 `type + 归一化名`** 的候选复用同一条资产（新增的也登记进 `assetIdByKey`）；③ 都不命中才新建。
2. **按资产归组，一次性重建**：同组所有候选的 states 合并后交给 `applyCandidatesToAsset()`，**去重键 = 命中已有状态用其 id、否则用归一化状态名**，先出现者胜（保序，不会把已有状态改成后一条的名字）。
3. **章节引用**保留 `asset.id:variant.id` 去重，`evidence`/`appearance` 按各自来源候选取（维护 `stateOwners: [{state, candidate}]`，不被同组其他候选串味）。

- 状态名匹配统一改用**归一化比较**（`nameKey` = trim + 小写 + 去空白），比原先的 `trim()` 全等更宽容 —— 「 少年 期 」也能复用「少年期」。
- 回归测试 5 例（`tests/modules/assetExtractionConfirm.test.ts` → `buildExtractionConfirmResult · 状态去重`）：同目标两状态只留一条 / 同名新状态只建一条 / 同名候选合并成一条资产 / 同资产多候选合并不互冲 / 名字只差空格同样视为同一条。

**通用教训**：任何「用本次结果整表重建集合」的逻辑，都必须先**聚合到同一个宿主**（这里=资产）再重建，并在重建时按**最终身份**（id 优先，其次归一化名）去重。逐条重建 = 后写覆盖 + 重复条目。

**为什么只剩一种（2026-09-17 决策）**：用户工作流是「整章重新提取，本次结果即权威版本」。原先 merge/override 两个模式**唯一实际差异就是"本次未出现的旧状态删不删"**（成果保护两边都做），却要用户在每次确认时做一次二选一 —— 是纯负担。现在固定为删除，确认前用明细弹窗（`ConfirmExtractionDialog`）把跨章影响摆出来。

- 删除实现：`overrideAssetWithCandidate`（无 mode 参数）；`mergeCandidateIntoAsset` 已删，`ExtractionApplyMode` 类型已删，`localStorage['comic-long-extract-apply-mode']` 已删，主按钮不再带「（覆盖）」后缀。
- 确认入口：`LongProjectAssetTab` 单个按钮「确认本章资产」→ 打开 `ConfirmExtractionDialog`（z-130）列明细 → 点「确认覆盖」才真正执行。
- **UI 术语退出**：审核页与确认菜单里的「并入 / 归属 / 沿用 / 新建」标记全部退场，只保留「本章资产」这类中性说法。
- **保留口径 `selectDroppedVariants(asset, candidate)`**（`assetExtractionConfirm.ts`）：建议 id 命中、或状态同名 → 算保留，其余算将被删除。审核页底部「本次未出现的旧状态会被删除」提示 + 跨章明细弹窗都调它 —— 同一口径原先散在三处，现在只留一处（测试里有「提示会删几个，就真有几个旧状态没被保留」的回归断言兜底）。
- **删除是严格全删**：不检查其他章节是否还在引用该状态。其他章节的 `chapterAssets` 引用会悬空（`LongProjectChapterAssets` 把它降级成"默认状态"空卡），分镜绑定由 `repairDanglingBindings` 全项目兜底回落。**跨章影响必须在确认弹窗逐条列出**（哪个资产·哪个状态·被哪几章引用·几张图，见 `ConfirmExtractionDialog`）。
- **例外安全阀**：候选一个状态都没有（模型未按格式返回）时**保留旧状态**，否则一次退化返回就清空资产的视觉身份。

## 三之二、孤儿数据清理（2026-09-17 新增）

`findOrphanEntries(assets, chapterAssets)` + `pruneOrphanEntries()`（`assetExtractionConfirm.ts`），入口在工作台左列表顶部（`orphanCount > 0` 才出现，emit `clear-orphans` → `PanelGenAssetTab.clearOrphans()`）：

- **孤儿状态** = 所在资产仍被引用、但该状态没有任何章节引用；**孤儿资产** = `scope='chapter'` 且没有任何章节引用的整条资产。
- **两条豁免**（防误删）：① 资产存在 `variantId` 为空的引用（旧数据语义 = 引用该资产全部状态）→ 该资产全部状态豁免；② `scope='project'` 的资产不动。
- 判定只看章节引用，**不看分镜绑定** → 删除后必须全项目跑 `repairDanglingBindings`（`clearOrphans` 里已做）。
- 执行前 `window.confirm` 列出条数与"其中 N 个已有参考图/生成图"；mutate 内**用队列里的最新数据重算**一次扫描，避免用弹窗打开前的快照误删。

- **例外安全阀**：候选一个状态都没有（模型未按格式返回）时**保留旧状态**，否则一次退化返回就清空资产的视觉身份（见上表下方）；实现里即 `variants.length ? variants : asset.variants`。
- **章节引用**：每个有名字的状态一条 `LongProjectChapterAsset{chapterId, assetId, variantId, appearance}`，去重键 `assetId:variantId`；`variantId` 优先 suggestedVariantId，其次同名兜底；无状态资产保留一条无 variant 引用。**每次确认会先删掉本章全部旧引用**，所以旧状态即使本体还在也不再挂在本章。
- **悬空绑定**：删状态 → 分镜上 `model/manual/chapter-range` 来源绑定的 `visualVersionId` 失效（`syncPanelsAutoBindings` 只重算 auto-text）→ 必须 `repairDanglingBindings` 回落 `defaultVariant`，**全项目范围跑**（悬空即坏数据）。`PanelGenAssetTab.confirmExtraction` 现在**无条件**跑（原先有 `mode === 'override'` 判断）。
- **提示**：候选缺 `suggestedAssetId` 时确认会 toast 报错（防御性分支，当前审核页没有改归属的入口，解析器也不会产出这种组合）。
- **遗留观察（未改）**：`appearance` 按**候选**粒度标（`candidate.suggestedAssetId ? 'reused' : 'introduced'`），所以「复用已有资产但新增了状态」也记 reused，语义略不准。

## 四、确认后分镜绑定回填

`backfillPanelAutoBindings` → `promptAssetService.syncPanelsAutoBindings`（分镜编辑/合并/拆分也跑同一引擎）：

- 扫描每页 `content + dialogue + narration + imagePrompt`，出现资产名（≥2 字、含别名、长名优先）且未绑定 → 新增 `matchSource:'auto-text'`（视觉状态优先延续上一镜，否则章节范围默认）。
- `auto-text` 绑定但名字从文本消失 → 移除；`model/manual/chapter-range/unmatched` 来源**永不动**。
- 所以：**分镜画面写"她"而不是角色名的不会被绑上** —— 设计意图（防误绑），不是 bug。

## 五、资产提示词回填（协议 · 解析器）

- **返回格式写进模板内容，运行时不追加协议段（2026-09-15 最终态）**：结构说明集中在 `OUTPUT_FORMAT_SPECS`，由 `withFormatSpec()` 内联进 `RECOMMENDED_TEMPLATES` 每条 content 末尾【返回格式】段；`renderPromptTemplate` 只做变量替换。设置页**没有「输出协议」编辑框**，只在需要解析的环节底部显示一行提示（`story` 为 JSON）。`outputProtocol` 字段已删，存量值忽略、不做迁移。
  - ⚠️ 代价：格式约定可被用户改坏 → 底部那行提示必须保留。
  - ⚠️ 存量模板 content 无【返回格式】段 → 建议点「填入推荐模板」补齐。
- **谁真需要解析**：`storyboard`（`parseStoryboardResponse`/`parsePanelBlock`）、`extract`（`parseAssetExtractionResponse`）、`asset-prompt` 批量一次性（`parseAssetPromptResponse`）、`story`（旧 JSON）。**不需要**：`analysis`/`script`（整段入库）、`panel-prompt`（**所谓批量是逐镜循环单次**，纯文本落库）、`style`（不调模型）。
- **统一返回 Markdown，批量与逐条同格式**：asset-prompt 用 `ASSET_PROMPT_FORMAT`（`【资产名｜状态名】` + 正文）。逐条/单条重写走 `extractSinglePromptText()`：单目标跑同一管线，命中取正文，未命中剥包装退化整段。
- **单管线多层容错**（`assetPromptParser.ts`）：归一化 → 多形态头识别 → 模糊名字匹配 → JSON/序号容错 → 顺序兜底 → 诊断 `stage: ok|bracket|json|indexed|order|none`。**两遍法**：候选头必须先 resolve 成功才算头，否则正文行会被误判为头。**顺序兜底安全阀**：只有段落数严格等于目标数才 1:1 回填，条数不等不猜。模糊/顺序命中要在 UI 标出让人核对。全失败抛 `AssetPromptParseError`，自带 diagnostics（可查看/复制原始返回）。

## 六、模板类型 × 解析机制（8 类全景）

**只有 3 类需要结构化解析**：`asset-prompt` / `extract` / `storyboard`；其余整段消费零解析。

| | asset-prompt | extract | storyboard |
|---|---|---|---|
| 范式 | 段落切分 + **名字查表** | **标题栈** | **行级分派状态机** |
| 归属依据 | 与预设状态清单比对 | 标题位置 | 当前页/格上下文 |
| 层级容忍 | — | ❌ 严格 1/2/3 个 `#` | ✅ `#{1,6}` 任意 |
| 失败后果 | 整批对不上 | 0 个资产 | 0 页 |

- **闭集 vs 开集**：asset-prompt 是闭集（发 8 个状态必须 8 段对上）→ 本质是**查找问题**，模型名字漂移就整批废，**只有它会报「协议与解析不匹配」**；extract/storyboard 是开集 → **位置即归属**，不比对名字。
- **共同缺口**：三处都不剥 ``` 围栏、都不去前言结语（asset-prompt 有 `normalizeModelOutput`，另两处没有）→ 归一化层待统一。三处都是**正则逐行近似 Markdown、不建 AST**：好处是半吊子 Markdown 也能收，坏处是 `**加粗**` 当标题认不出。

## 七、分镜 ↔ 资产视觉状态绑定（2026-09-17 定稿，当日迭代）

### 7.1 数据模型

`LongProjectStoryboardAssetBinding`（分镜上每个资产一条）：

| 字段 | 语义 |
|---|---|
| `visualVersionId` | 本镜用的视觉状态 id。**全自动推导，无手动切换入口**（见 7.2） |
| `selectedImageIds` | 本镜使用的参考图，**单选、至多一个元素**。为空 = 从未手动选过 → 取该状态**第一张**（见 7.3） |
| `referenceImageIds` | 绑定时的快照，仅作兜底。**与 `selectedImageIds` 分开**，别把"快照"和"本镜选择"混进一个字段 |
| ~~`stateSource`~~ | **已删除**（2026-09-17）：手动切状态的功能整体移除后它永远是空的 |

### 7.2 视觉状态完全自动（手动切换已移除）

状态由 `syncPanelsAutoBindings` / `syncCurrentPanelBindings` 推导，三档回退：
1. **延续上一镜**（`lastVariantByAsset`，按 order 边扫边累积，不是全局一次算）；
2. **章节范围默认**（`defaultVariant`：`chapterRange.startChapterId` 不晚于当前章的状态里取最晚的那个）；
3. 筛不出 → `variants[0]`。

- 提示词框保存（500ms 防抖 → `syncCurrentPanelBindings`）与分镜内容框保存（失焦 → `savePanelEdit` → `autoSyncBindings`）都会重扫，绑定跟着文本走。
- `matchSource` 五态：`model`（字段写了 `资产名（状态名）`）/ `chapter-range`（字段只有名字）/ `auto-text`（文本扫名字，**只有它会被自动增删**）/ `manual` / `unmatched`。
- **已删除**：`setBindingState`、`PanelAssetTabs` 的「切换状态」按钮与状态菜单、作用域 chips、`stateSource` 标记。原先"直接写受影响分镜、不做运行时轨道"的设计随之不再需要。

### 7.3 参考图取用口径（**单选**，五处必须一致）

**`resolvePanelRefImage(variant, binding)`（`panelPromptService.ts`）是全项目唯一实现**：

```
手选过 [X] 且 X 仍在 variant.referenceImageIds 里 → X
否则（未选过 / X 已被删）                          → referenceImageIds[0]
该状态没有参考图                                    → undefined（不带参考图）
```

- ✅ **「未选」不物化写库**：空数组即代表"取第一张"，资产内图换序/删图后本镜自动跟随，不会留过期快照。
- 历史数据里存了多张（旧的勾选子集语义）→ 只认 `[0]`。
- 五处消费点（排查时容易漏掉 2、5）：
  1. `LongProjectStoryboardTab.currentRefGroups`（右栏「参考图设置」）
  2. `LongProjectStoryboardTab.panelRefImages`（**整镜生成**走的路径，原先 flatMap 全部图）
  3. `PanelAssetTabs.selectedImage`
  4. `assetUsageService.buildAssetUsageIndex`（工作台「N 镜」角标）
  5. `AssetVariantCard` 图片角标（消费 4 的结果）
- 锁死语义的回归测试：`tests/modules/panelRefImage.test.ts`。

### 7.4 引用展示（`services/assetUsageService.ts`）

`buildAssetUsageIndex({ assets, chapterAssets, storyboardRuns, chapterNameOf })` → `{ variants: Map<variantId, { chapterNames, panelCount, imagePanelCount }>, assets }`。

- 章节引用来自 `chapterAssets`（`variantId` 为空 = 引用该资产全部状态 → 归给该资产全部状态）；
- 分镜引用来自 `storyboardRuns[].panels[].assetBindings`，按 `panelId` 去重；`visualVersionId` 缺失回落该资产第一个状态；
- 图片级统计走 7.3 口径：**一个分镜一个状态只贡献一张图**（单选），故 `Σ imagePanelCount = panelCount`；
- 展示：`AssetVariantCard` 状态头 chip「被 N 章 · M 镜引用」（M=0 且有章节引用时转琥珀 + 文案「暂无分镜绑定」）；每张参考图左下角「N 镜」角标 + 边框转青色；
- 数据通路：`LongProjectAssetTab`（有 project 全量数据）→ `PanelGenAssetTab`（补 `storyboardRuns` / `chapterNames` 两个 prop）→ `LongProjectAssetWorkbench`（`usage` prop）→ `AssetVariantCard`（取 `usage.variants.get(variant.id)`）。

### 7.5 分镜侧交互（`panel-gen/`）

- `PanelAssetTabs`（中栏底部）：三 tab 展示绑定；**唯一手动干预 = 点缩略图选本镜用哪张图**（单选，已选那张带青色边框 + ✓，右上角放大镜看大图不改变选择）。状态 > 1 时不再有切换入口；「无参考图」按钮跳资产生图工作台；「更换图片」写回资产库（对所有引用分镜生效），与"本镜选哪张"是两件事。
- `PanelPromptPanel` / `PanelContentEditor`：文本内资产名按类型着色高亮 + 悬停出资产卡（**纯展示**：资产名 + 类型 tag + 当前状态名 + 参考图网格，青色框标出本镜实际用的那张，点图看大图）。
  - 实现见 `composables/useAssetHighlight.ts` + `components/AssetHoverCard.vue`；**叠层方案**（高亮层在下、textarea `text-transparent` 在上）与坐标反查命中详见 `MEMORY.md`「输入框内资产名高亮」。
  - 高亮判定 = **名字命中资产库**（不按 `assetBindings` 过滤）。
  - 分镜内容框**不接** `onPick`（点资产名弹大图会打断定位光标的编辑操作）；提示词框保留。


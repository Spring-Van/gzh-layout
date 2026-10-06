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

## 三之三、信息 tab 的手动增删（2026-09-28 新增）

资产 tab 下分三个子视图：**信息**（识别与建档）/ **生图工作台**（生产）/ **图片**（浏览）。手动增删只在**信息** tab，工作台是纯生产视图（已还原，不留入口）。

**新建**：审核页左列底部「＋ 新建资产」→ `AssetCreateModal`（z-130，类型三选一 + 名称 + 描述）→ `PanelGenAssetTab.createAssetManually()`：建 `scope:'chapter'` 资产 + 一条名为「默认」的视觉状态（anchor「全章默认」）+ 本章引用 → 阶段只升不降推到 `assets-ready`。

**⚠️ 建资产写章节引用必须用 `origin: 'extraction'`（或不写 origin），绝不能写 `'manual'`。** `buildExtractionConfirmResult` 重建本章引用时只保留 `origin === 'manual'` 的条目，而 `scope:'chapter'` 的资产本体会被过滤掉 —— 引用写成 manual，下次「确认本章资产」就留下指向已删资产的**悬空引用**，且 manual 引用不参与悬空清理，成为清不掉的死数据。

**删除**：审核页左列**每一行**候选项 hover 出垃圾桶图标（scoped CSS，非 Tailwind `group`）。含义随候选是否命中已有资产而分：

| 情况 | 判定 | 动作 |
|---|---|---|
| 命中已有资产 | `candidate.suggestedAssetId` 能在 `assets` 找到 | emit `delete-asset` → `PanelGenAssetTab.deleteAsset()`：改 `data.assets` 后**基于删完的列表**跑 `repairDanglingChapterAssets` + 全项目 `repairDanglingBindings`。确认文案从 `assetUsage` 列「N 状态 / M 图 / K 章节 / J 绑定」 |
| 纯新识别（未入库） | 找不到对应资产 | emit `remove-candidate` → `removeExtractionCandidate()`：只改 `run.candidates`（`updateRun`），**不动库**。已 `confirmed` 的 run 拒绝并提示重新确认 |

**「确认本章资产」可重复执行**：`canConfirmReview` 放行 `completed` 或 `confirmed`，`confirmExtraction()` 本身幂等（同名状态复用 id、重算绑定），按钮文案随之切「确认」↔「重新确认」。确认成功后 `LongProjectAssetTab.runConfirm()` 自动把视图切到 `workbench`。

**「本次识别」与「本章已有」不做两套清单**（用户明确否掉）：信息 tab 只展示本次识别，未确认时顶部给琥珀色提示条 +「去生图工作台」按钮（`pendingConfirm` = `latestRun.status === 'completed'`）。「识别遗漏的资产」应在提取阶段解决，不靠第二套清单兜底。

## 四、确认后分镜绑定回填

`backfillPanelAutoBindings` → `promptAssetService.syncPanelsAutoBindings`（分镜编辑/合并/拆分也跑同一引擎）：

- 扫描每页 `content + dialogue + narration + imagePrompt`，出现资产名（≥2 字、含别名、长名优先）且未绑定 → 新增 `matchSource:'auto-text'`（视觉状态优先延续上一镜，否则章节范围默认）。
- `auto-text` / `manual` 绑定但名字从文本消失 → 移除（**文本是绑定的事实来源**）；`model/chapter-range/unmatched` 不参与增删。注意 `manual` **不是**「删不掉的豁免」—— 它只表示用户指定过状态（不改状态 + 触发其后各镜延续重算）。
- 所以：**分镜画面写"她"而不是角色名的不会被绑上** —— 设计意图（防误绑），不是 bug。这也是「描述即事实」口径的代价：描述里语义提及但画面上不出现的资产（如「向下方广场人群高喊」）同样会被绑上、进参考图清单。
- **画面描述写完必须回填绑定（2026-09-22 修根因）**：`LongProjectStoryboardTab.syncBindingsAfterPromptWrite(promptOverrides)` 是唯一入口（描述并入扫描文本 → 重算整章 → 一次性写回；只取 assetBindings/cells，`imagePrompt` 不落 panel）。四条路径全接：整章推导 `runChapterPrompts` / 单镜推导 `runSinglePrompt` / 导入外部描述 / 人工编辑 `savePromptEdit`。**新增任何写描述的路径都必须接上**，否则描述里提到的资产不进绑定也不进参考图清单（表现：中栏里该资产消失、取图凭空少图）。分镜生成与重新导入另需在 `migratePanelArtworks` **之后**再同步一次（`useStoryboardRun.syncBindingsWithArtworkPrompts`），否则迁移过来的旧描述会漏。实测某章 13 镜 18 条描述：待核对项 13 → 0。

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

状态由 `syncPanelsAutoBindings` 推导（描述写入后由 `syncBindingsAfterPromptWrite` 触发），三档回退：
1. **延续上一镜**（`lastVariantByAsset`，按 order 边扫边累积，不是全局一次算）；
2. **章节范围默认**（`defaultVariant`：`chapterRange.startChapterId` 不晚于当前章的状态里取最晚的那个）；
3. 筛不出 → `variants[0]`。

- 提示词框保存（500ms 防抖）与分镜内容框保存（失焦 → `savePanelEdit` → `autoSyncBindings`）都会重扫，绑定跟着文本走；**推导 / 导入画面描述**写库后同样重扫（`syncBindingsAfterPromptWrite`，2026-09-22 补上）。
- 审计与一键补绑见 `MEMORY.md`「绑定审计与一键补绑 = 待核对区唯一呈现位」段。
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
  - **已废弃（2026-09-22）**：输入框高亮整套移除（`useAssetHighlight.ts` 已删），此处仅存历史记录。
  - 高亮判定 = **名字命中资产库**（不按 `assetBindings` 过滤）。
  - 分镜内容框**不接** `onPick`（点资产名弹大图会打断定位光标的编辑操作）；提示词框保留。

### 7.6 编辑器往返必须无损（2026-09-21 定稿，**别再踩**）

**铁律：文本里写了什么，`serialize → parse` 往返后还得是什么。**

右栏「分镜内容」输入框走 `parsePanelBlock`（`storyboardService.ts`），它**不带资产上下文**——内部就是
`parseStoryboardResponse('## 分镜 1\n' + text, [], '', {})`，空 assets / 空 chapterId / 空 chapterOrders。
所以编辑器解析出的绑定**必然是 `unmatched`**（`assetId` 空）。此时**必须保留文本原样的状态名**：

```ts
visualVersionName: variant?.name ?? (asset ? undefined : visualVersionName)
```

- 资产**未命中** → 保留原文状态名（唯一依据：让 `serializeBindings` 能原样写回 `资产名（状态名）`）。
- 资产**命中** → 口径不变，只存实际匹配到的状态名（保证「显示状态」与「发送图片」是同一个状态）。

**踩坑后果（2026-09-21 实修）**：丢了状态名 → `serializeBindings` 只写回资产名 →
① 输入框里 `出场资产：测验魔石碑（萧炎测验·三段显示）` 被**悄悄改写成** `出场资产：测验魔石碑`（用户报「输入了之后变成了另外的样子」）；
② `savePanelEdit` 重解析只剩名字 → 状态落到 `defaultVariant()`，而它**同章多状态且无唯一默认时返回 `undefined`**
（判据只有章节级 `chapterRange`/`firstAppearanceChapterId`，同章内切换无法区分）→ `visualVersionId` 为空 →
`resolvePanelBindings` 直接 `continue` → 取图清单 / 中栏里该资产**消失**（表现为「导入没绑定成功」）。
留了名字后，`resolvePanelBindings` 里 `find(item => item.name === visualVersionName)` 的兜底也能救回来。

- 回归测试：`tests/modules/panelEditRoundTrip.test.ts`（7 例，锁死往返无损 + 不悄悄改写文本 + 重解析还原同一 id）。
- **编号不参与持久化**：编辑器保存后 `A1` 前缀会被 `splitVariantCode` 剥掉，这是**预期行为**（落库的始终是资产 id + 状态 id），别当 bug 修。
- 排查同类问题的顺手工具：真实数据在 `%APPDATA%/gzh-layout/comic-gen.json`（project → `longProjectData`），
  可直接读 `storyboardRuns[].panels[].assetBindings` 判定「数据层」是否有责，再决定查 UI 还是查解析。


### 7.7 视觉状态的来源标记 `origin` 与「非提取产出」豁免（2026-10-05 定稿）

`LongProjectAssetVariant` 新增 `origin?: 'extraction' | 'manual'`，语义与 `LongProjectChapterAsset.origin` **完全同款**：
**缺省（旧数据 + 提取产出）一律按 `extraction`**，所以旧库行为不变。

- `manual` = 不由「资产提取」产出：用户手工新建，或程序按机械规则补建。目前的唯一生产者是
  `sceneRefSheetNeeds.buildRefSheetVariantDraft`（场景 3×3 九宫格「机位图」空间锚定资料）。
- **为什么必须存在**：`assetExtractionConfirm.applyCandidatesToAsset` 的口径是「视觉状态按候选状态**整表重建**，
  本次未出现的旧状态一律删除」，而 `extract` 模板**永远不会输出「机位图」** → 用户下一次确认提取结果时，
  刚生成的九宫格状态连同已出的图会被**静默删除**（无提示、不可恢复）。

三处消费口径（**新增同类状态时必须三处一起过**）：

| 位置 | 口径 |
|---|---|
| `applyCandidatesToAsset` | 重建后**追加保留** manual 状态；同名/同 id 被候选命中的已走正常重建分支，不会重复两条 |
| `selectDroppedVariants` | manual 状态**不算「本次未出现」**（审核页提示 + 影响面统计共用此函数） |
| `storyboardService.defaultVariant` | 只从**非 manual** 状态里挑默认；仅当资产只剩 manual 状态时才退化为全体（此时才可能返回 undefined） |

⚠️ 另有一条**尚未修**的资产级风险：用户**手工新建**的章节资产（`PanelGenAssetTab.vue` 的 createAsset 流程）
在 `buildExtractionConfirmResult` 里会被 `nextAssets` 过滤器整条丢弃（判定只看 `scope`/本章引用/跨章引用/`suggestedAssetId`），
且变体级的 manual 豁免对它无效 —— 属资产级覆盖语义，改动前需先与用户确认。

### 7.8 场景机位图需求判定 `sceneRefSheetNeeds`（2026-10-05 新增模块）

场景要出**两种**样式：① **空间全景版式（establishing shot）**＝默认状态，每个场景都要；
② **3×3 九宫格机位图版式**＝状态名含「机位图」时，满足任一触发条件才出。

**触发条件只能由程序判**（模板层拿不到）：`extract` 发生在分镜之前没有页数；
`asset-prompt` 的输入 `buildTargetList` 每行只有 `资产名｜类型｜状态名｜资产描述｜视觉描述｜固定特征｜attributes 前 8 项`，
**没有页数、章节引用、镜头信息**。

- 模块：`src/modules/comic/services/sceneRefSheetNeeds.ts`，**不 import 任何 service**（避免
  `promptAssetService ← storyboardService ← panelPromptService` 循环依赖），纯函数、只读审计、不写库。
- 入口：`auditSceneRefSheetNeeds({ assets, panels, chapterAssets?, chapterId? })`；
  草稿：`buildRefSheetVariantDraft({ sourceChapterId? })`（带 `origin: 'manual'`，见 §7.7）。
- 常量：`REF_SHEET_VARIANT_NAME = '机位图'`（**资产提示词模板按这个名字选九宫格版式，不要改**）。
- 触发口径：单章出镜 ≥2 页（**页级 + 格级绑定都算**，同页多次只算一页）｜跨章复用（引用章节数 ≥2 或任一 `appearance: 'reused'`）
  ｜场景内机位变化（镜头语汇命中 **≥2 类**：`高机位` / `低机位` / `反打`）。
- **`过肩`、`POV` 刻意不收** —— 它们是景别取值、对话戏里高频出现，收进来会让几乎所有场景都被判定需要机位图。
- 接入：`LongProjectAssetWorkbench.vue` 左栏顶部青色提示条「补建场景机位图状态 N」
  → `PanelGenAssetTab.vue:addRefSheetVariants` 一次性写库（**不循环写**），
  同时为每个新状态写一条 `origin: 'manual'` 的章节引用（否则新状态不在本章 variantId 集合里、生图工作台看不见它）。

**机位图交付命名**：`LOC-<场景名>-机位图.png`（场景名原样，不加章节号与序号）；空间全景版式不加后缀。已写进 `asset-prompt` 模板的机位图版式段。

### 7.9 人物四联设定版式：**整张图只保留一处高分辨率人脸**（2026-10-05 定稿）

`asset-prompt` 人物版式已从「右侧大脸 + 等宽三视图」改为**横向 1×4 非等宽四联图**：

| 格 | 内容 |
|---|---|
| 1 | **2:3 竖幅**脸部大特写（明显最宽），裁切至锁骨、脸部占该格主要面积、直视镜头 |
| 2 | 正面全身 A-POSE，**画幅从颈部中段以下开始、头部完全在画幅之外** |
| 3 | 3/4 前侧全身 A-POSE，**同样从颈部中段以下开始** |
| 4 | 背面全身 A-POSE，**完整保留头部至脚部**（只给后脑与发型背面），背对镜头看不到脸 |

背景光线：影棚中性灰（18%）无缝背景 + 柔和伦勃朗光（45° 侧上方主光、柔和三角光斑）+ 自然阴影与清晰皮肤细节。**无文字、无标注**（旧版的「基础信息卡」与 `FRONT/SIDE/BACK` 标志已删）。

**为什么**（用户实践结论，属参考图可读性红线）：一张图总像素有限，全身格里再容一个人头，脸只剩几十像素 → 下游分镜生图参考到的是**糊脸**。人脸只在第 1 格以高分辨率出现一次，其余格把画幅让给服装。

⚠️ **写这类「反直觉裁切」版式时必须显式声明「这是刻意的」**：模板里必须有
`这是刻意的版式，把画幅让给服装，不是裁切失误，不要补画头部与五官`。
图像模型见「全身照缺头」会当失误主动补上——**不写这句，机制当天失效**。
同理，背面格要单独说明「完整保留头部，但背对镜头看不到脸」，否则「裁头」规则会被套用到背面格、丢掉发型背面资料。

⚠️ 连带口径（改版式必查这四处，否则同口径留双份自相矛盾）：【转译要求】「最小必要补全」举例、
【禁止项】版式类否定句清单、【自查】、模板 `description`。

### 7.10 缺图门禁 `panelRefReadiness`（2026-10-05 新增模块）

绑定审计**不看图存不存在**：绑定齐全、审计全绿，但该视觉状态没有成品图时，
`buildPanelRefManifest` 的 `if (!image) continue` 会**静默剔除**（少发参考图、零告警）。
补齐者：`src/modules/comic/services/panelRefReadiness.ts` 的 `auditPanelRefReadiness`
（与生图共用 `resolvePanelAssetStates` + `resolvePanelRefImage`，判定必然一致）。

三条口径（新增同类门禁时照此）：
1. **必须独立成模块** —— 依赖方向 `promptAssetService` ← `storyboardService` ← `panelPromptService`，放 `promptAssetService` 会成环；
2. **顺序按 `ASSET_REF_ORDER` 自己再排** —— `resolvePanelAssetStates` 返回的是**绑定声明序**，`buildPanelRefManifest` 才重排编号；
3. 中栏「缺参考图」占位就是它（amber + `ImageOff`），**不要再新增占位种类**。

生图前**只提示不拦截**。

### 7.11 `fixedTraits`（固定特征）是**空字段**

两条生图路径（`buildTargetList` / `buildSingleAssetPrompt`）都读它，但 `assetExtractionConfirm` 写死 `[]`，
**全项目没有任何写入方**。想让它生效需改 5 处。

### 7.12 时间戳语义：判断「内容变过」只能用 `createdAt`

`updatedAt` 会被绑定重算 / 悬空修复 / 覆盖确认反复推高，拿它比对必然误判
（分镜页 `assetsChangedAfterStoryboard` 用 `run.createdAt`）。
一键重推必须复用顶栏链路，不要另写生成逻辑。

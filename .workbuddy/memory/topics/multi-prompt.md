# 专题：多提示词（候选条）—— 选中哪条就发哪条

> 从 MEMORY.md 拆出（2026-09-23 定稿）。涉及文件：`types/index.ts`、`utils/genPromptSlots.ts`、
> `services/panelPromptService.ts`、`services/panelRefManifest.ts`、`components/panel-gen/PanelPromptPanel.vue`、
> `components/AssetVariantCard.vue`、`LongProjectAssetWorkbench.vue`、`LongProjectStoryboardTab.vue`。

## 数据模型

`GenPromptSlot { id, text, attachShared, useAssetRefs?, uploadedRefs? }` —— 资产生图（视觉状态）与分镜绘图（画面工件）
共用，存在各自的 `genPrompts` / `activeGenPromptId`。**候选条只属于当前那条记录**（本镜 / 本状态），切镜不会串条。

- **开关决定这次发哪些图，图号随之重编**（否则提示词写「图3」却只发两张）：
  `panelPromptService.slotRefManifest(manifest, { attachShared, useAssetRefs })` 是唯一裁剪 + 重编号实现，
  不变式 `images[i]` = 「图 i+1」；缺省（undefined）= 都开，旧数据不会变成什么都不发。
  `composeFinalPrompt` 另需传 `FinalPromptOptions.attachShared`，false 时前后置共用属性**文字也不拼**。
- **资产侧**：只有 `attachShared`；上传图按视觉状态共用（`referenceImageIds`），不放在条内。
  工作台 `composeAssetPrompt` / `genRefImages` 一律经 `activeGenSlot(variant)`。
- **分镜侧**：多 `useAssetRefs`（关掉不发资产生成图、不写资产行）与 `uploadedRefs`（**不限张**，按条落库）。
- **取条统一走 `utils/genPromptSlots.ts`**（`resolveActiveGenSlot` / `normalizeGenPromptSlot` / `slotAttachShared` /
  `slotUseAssetRefs`）：界面（编辑态）与生图（只读态）必须拿到同一条，否则会「显示第 1 条、发出去另一条」。
  没建过条时返回虚拟条（正文取 `imagePrompt`、开关全开）。

## `imagePrompt` ≡ 第 1 条正文

绑定扫描与过期判定只认 `imagePrompt`：

- **只有第 1 条的编辑会写它**并触发 `syncBindingsAfterPromptWrite`；第 2 条及以后只活在 `genPrompts` 里。
- **仅仅切换选中条不写 `imagePrompt`**（走独立的 `select-slot` 事件只落 `activeGenPromptId`）——
  否则切到一条空白候选会在防抖 500ms 后把描述清空。
- **防抖保存（500ms）的监听源 = `JSON.stringify(slots.map(text))`**：切条不在其中，所以切条不触发保存；
  是否写 `imagePrompt` 由「第 1 条与它是否不一致」决定（在候选条 2 上打字只落 `genPrompts`）。
  ⚠️ 监听「当前条正文」是错的 —— 切条会连带触发保存。
- **读入必须先过 `PanelPromptPanel.storedSlots()`**：归一 + 若第 1 条正文为空而 `imagePrompt` 有内容则**补回第 1 条**
  （旧版「新增时复制当前正文」留下的脏数据会出现**两条候选正文一模一样**，用户观感就是「切换输入框内容没变化」；
  `text: null` 则让描述显示成空框）。它同时是 `isDirty` 的比较基准，否则补回来的那份会被误判成「用户改了描述」而标 manual。
- **新增的候选条必须空白起步**：复制当前正文会让切换看起来「没变化」，用户看不出选中了哪条。
- **`persistSlots` 记签名（`分镜id::JSON`），`resetSlots` 遇到自己刚写回的那份直接跳过**：
  否则存储回环会把正在编辑的本地对象整批换掉。
- 候选条**没有** stale 标记；分镜重导入丢弃描述时 `migratePanelArtworks` 会连 `genPrompts` 一起清掉。

## 写入路径（漏一个就出「点了没反应」）

- 单独生成用 `generatePanelImage` 的 `description` 选项传当前条正文，**禁止回写 `imagePrompt`**
  （否则用候选条 2 生成会把描述顶掉并串位）。
- 批量生图与预览区「生成」逐镜取各自选中条；`genTargets` 与预览区可生成判定都按**选中条正文**。
- AI 推导 / 导入 / 资产「AI 生成提示词」回填后**自动切回第 1 条**（否则用户停在候选条 2 上会「点了没反应」）。
- **结构变更即时落库**（切开关 / 增删条 / 上传图 / 切换选中，emit `update-slots`），文本仍走 500ms 防抖 `save`；
  否则中栏「图N」角标跟不上。
- **中栏 `PanelAssetTabs` 拿的是按当前条裁剪后的清单**（父级 `currentSlotRefManifest`），右栏拿**完整**清单自己裁 ——
  两边都裁会在防抖窗口内错位。

## 排布（2026-09-23 用户指定，两侧一致）

**输入框在上；下面一行「左 = 提示词切换（`提示词 1/2/…` + `+` + 删除），右 = 开关」**。切换条**不再放输入框上方**。

| | 输入框 | 右侧开关 |
|---|---|---|
| 分镜绘图（`PanelPromptPanel`） | `textarea` 直编 | 拼接共用属性 + 使用资产参考图（+「随这条发送 N 张图」） |
| 资产生图（`AssetVariantCard`） | 摘要按钮（点击开弹窗编辑），下面一行 | 拼接共用属性（+「未保存 / 已保存 ✓」状态文字） |

- 开关用 `components/common/ToggleSwitch.vue`（16×28 滑块），**自己接 `@update:model-value` 再赋值**，
  不要 `v-model` + 额外监听器组合 —— 两个 `update:modelValue` 监听的执行顺序不确定，可能把切换前的值落库。
- 「查看提示词」标题带「提示词 N」，明确展示的是选中那条拼出来的结果。
- 右栏「参考图设置」已改为**纯「参考图上传」**：资产图列表、上移/下移、图号速览全部删除
  （中栏 `PanelAssetTabs` 已按类型展示资产图与「图N」角标，右栏那份是冗余）。
- 卡片实例：分镜侧靠「切镜重建」，资产侧给 `AssetVariantCard` 加 `:key="selectedVariant.id"` ——
  两张卡不共用实例，视觉状态之间不会串条。

### 资产侧：草稿提交与落库必须分开（否则「新增不是空的」）

`AssetVariantCard` 的输入框是弹窗里的 textarea，草稿存在 `model.prompt`，与候选条正文是两份。

- `commitDraft()` = 把 `model.prompt` 写回**当前**条（切条 / 增删条 / 弹窗保存前调用）。
- `persistSlots()` **只落库、不碰草稿**。
- ⚠️ 旧写法在 `persistSlots()` 里顺手写草稿，于是 `addSlot()` 先切到新条再落库 → 把**上一条的正文灌进新条**，
  新增出来既不空、内容还和上一条一样（用户报的「新增就该是空的」）。切条同理：草稿会被写进刚切到的那条。
- AI 结果（`rewriteAssetPrompt` / 批量生成提示词）仍写第 1 条并**切回第 1 条**（与分镜侧推导同口径）；
  在候选条 2 上点「生成/重写」会把结果落到第 1 条 —— 这是刻意的「imagePrompt ≡ 第 1 条」口径，不是 bug。

## 实机验收口径（2026-09-23，Electron + Playwright，真实项目「22」）

分镜绘图（P01 提示词 1 = `1`、提示词 2 = `222`）：

- 布局：`textareaBottom=621 / tabTop=644 / switchTop=647` → 提示词条在输入框下方、与开关同一行。
- 切换：提示词 1/2 内容不同；`+` 新增后 = `""`（空白）；切回 = 原值。
- 不串条：P01 有 3 条、P02 有 2 条，来回切各自保留自己的条数与选中项。

资产生图工作台（资产「测验魔石碑」，3 个视觉状态）：

- 布局：`summaryBottom=354 / tabTop=358 / switchTop=361` → 同上。
- 新增：`tabs 1→2`，摘要变空态文案「暂无绘画提示词，点击填写或用 AI 生成」。
- 切条：提示词 1 = 该状态原文、提示词 2 = 空。
- **各状态各管各的**：v0 加过一条后 `tabs=2`，v1/v2 均为 `tabs=1`；切回 v0 仍是 2。
- 运行时报错 0 条。

- **数据驱动的渲染 bug，验证必须逐条遍历**：只切第 1 镜会「全绿但没覆盖到坏数据」（本项目的坏值在第 13 镜）。
- Playwright 侧两个坑：用例整体要 `test.setTimeout(240_000)`（默认 30s 不够，超时会在写诊断前中断）；
  资产列表按钮的可访问名含空状态点的 `title`（如「缺参考图」），锚定正则要用 `getByRole('button', { name: /名字/ })` 的**部分匹配**，别用 `^…$`。

## 已知未做

- 候选条第 2+ 条**没有 stale 标记**（分镜合并/拆分后只有第 1 条会被标 `stale`）。
- 编辑候选条**不触发绑定重算**（刻意：候选条是「换个画法」的尝试，不该改动本页资产绑定）。

# 专题：资产绑定（身份 / 多状态 / 审计与补绑）

> 从 MEMORY.md 拆出（2026-09-22 定稿为主）。

## 绑定身份 = 资产 + 状态；同资产多状态全链路支持

绑定身份键 `bindingIdentityKey = (assetId ?? 归一名) :: (visualVersionId ?? '')`。
**页级与格级都允许同一资产持有多个视觉状态**（去重口径 `mergeBindingsByIdentity`：资产按首次出现分组、
组内状态按首次出现排序）。「魔石碑格1 三段 + 格2 七段」→ 页级两条 → 生图清单两张图各带各的格号。

- 自动扫描：文本提及的**全部**状态都绑（`variantsMentionedInText` / `scanAssetBindingsForAsset`）；
  **manual 是用户锚点，永不自动改写、不因提及其他状态被覆盖**；未提及时维持现状，
  只在「零绑定 / 唯一一条缺状态」时延续/默认兜底。
- 手选：`applyBindingFix('set-variant')` 按 `fromVariantId` 定位那一条，**绝不抹平其他状态/格级**；
  抽屉有「+ 添加状态 / 移除此状态」。抽屉预选键 = 绑定下标（不是 assetId，否则同资产多卡互相覆盖）。
- 状态提及判定按**完整状态名或 tags**（≥2 字）子串命中 —— 正文写「三段显示」不算提及「萧炎测验·三段显示」。
- `resolvePanelAssetStates` 展开页级多条时按 (资产,状态) 去重；`reapplyVariantContinuation` 对多状态镜整镜跳过。

## 绑定审计与一键补绑 = 待核对区唯一呈现位

- `promptAssetService.buildPanelBindingFixes(panel, index)` 把 `auditPanelAssetBindings` 的 4 类问题翻成
  **带候选的可执行动作**（`add` 补绑 / `set-variant` 选状态 / `remove` 换绑或移除），
  常驻在**中栏资产区顶部**（不再是生图前才弹一次的 toast）。审计只作拦截与提示，**不要再新增第二处呈现位**。
- **判「是否漏绑」以「格级 ∪ 页级」绑定为准**（生图取图看页级 `panel.assetBindings`）。
  只看格级会让「只写页级的旧数据」被逐格误报未绑定。
- 写库统一走 `LongProjectStoryboardTab.applyBindingFix`（add/set-variant/rebind/remove 一个入口）；
  补绑落 `manual` 绑定并触发 `reapplyVariantContinuation`，与抽屉手选状态同语义。
  `setBindingVariant` 只是它的薄封装。
- **画面描述也是绑定依据（2026-09-22 修根因）**：写描述的路径（`runChapterPrompts` 整章推导 /
  `runSinglePrompt` 单镜推导 / 导入外部描述 / `savePromptEdit` 人工编辑）必须统一走
  `syncBindingsAfterPromptWrite(promptOverrides)` —— 描述并入扫描文本 → 重算**整章**绑定 → 一次性写回
  （只取 assetBindings/cells，`imagePrompt` 不落 panel）。分镜生成 / 重新导入则在 `migratePanelArtworks`
  **之后**再同步一次（`syncBindingsWithArtworkPrompts`），否则迁移过来的旧描述里提到的资产会漏。
  **新增写描述路径时务必接上**，否则描述里提到的资产不进绑定也不进参考图清单。
- **绑定以文本为事实来源**：`auto-text` / `manual` 绑定在资产名从文本中消失时都会被移除 ——
  「manual 是锚点」只指它不改状态、且会触发其后各镜延续重算。补绑前提是文本已命中该资产名，
  所以不存在「刚补上就被同步删掉」（曾尝试豁免 manual，被既有用例挡下并回退）。
- 「描述里提到了但画面上不出现」的资产（如「向下方广场人群高喊」）也会被绑上、进参考图清单 ——
  这是「描述即事实」口径的已知代价，取图角度通常可接受。
- **过期描述不得进入绑定扫描（2026-09-22 定稿）**：唯一口径 `panelPromptService.bindingScanPrompt(artwork?)`
  —— `promptStatus === 'stale'` 或空描述返回 `undefined`。**所有把描述并入扫描文本的地方必须走它**，
  不要再各自读 `artwork.imagePrompt`（原先 5 处各读各的，导致「别人那页的描述」把资产绑到本页：
  实例 P02 绑上「中年测验员」，而该名字只在过期描述里）。
  `syncBindingsAfterPromptWrite` 的 `promptOverrides` 是本批刚写入的新描述，可越过该口径直接用。

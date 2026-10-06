# 项目长期约定 — gzh-layout（漫画/公众号排版工具）

> 主文件只留**口径与红线**，细节按需读专题：
> - `topics/llm-layer.md` — LLM 调用层 / 请求传输层 / 测试连接
> - `topics/asset-pipeline.md` — 提取归属匹配 / 确认落库 / 绑定回填 / 解析器 / 引用完整性 / **`origin` 豁免（§7.7）** / **`sceneRefSheetNeeds`（§7.8）** / **人物设定图版式红线（§7.9）** / **缺图门禁（§7.10）** / **`fixedTraits` 空字段（§7.11）**
> - `topics/binding.md` — 绑定身份与多状态 / 绑定审计与一键补绑 / 描述写入后同步
> - `topics/ref-manifest.md` — 参考图清单与图号口径 / 有效参考图 / 成图口径 / refUsage / 资产配色
> - `topics/panel-prompt.md` — 画面描述管线 /「图N = …」产出点 / 中栏资产区 / 批量弹窗 / 工件迁移 / **结构名与排版规则** / **`knownField` 字段名契约** / **格数上限** / **气泡与情绪背景** / **引导线禁令**
> - `topics/multi-prompt.md` — 多提示词（候选条）数据模型 / 图号重算 / 写入路径 / 右栏排布 / 实机验收
> - `topics/formats.md` — 输出格式口径（全链路 Markdown v5 / 长篇分镜格式 / 模板约定 / **禁止项的正确落点**）
> - `topics/local-debug.md` — 本机调试环境 / 工程校验三件套 / 工具用法坑
> - `topics/cleanup.md` — 项目数据清理（级联删除 / 版本压缩）
> - `topics/storage.md` — 本地存储分区 / **图片外置（内容寻址）** / **写放大红线** / **瞬时状态归属渲染层** / **dataURL→Blob URL**

## 布局与滚动

- `custom-scrollbar` 只改外观不设 `overflow`；能滚三件套：父链一路 `min-h-0` + `flex-1` + `overflow-y-auto`。
- 弹窗统一 `fixed inset-0` + Teleport 到 body；**Teleport 浮层必须自己写 `position: fixed`**。z-index 谱系：z-40 菜单｜**z-50** 常规弹窗｜z-100/101 全屏抽屉｜z-120 覆盖确认｜**z-[130]/z-[131] 抽屉内子弹窗**｜z-140 导入弹窗｜z-200 大图预览｜**z-[9999] Toast**（Tailwind 裸值 `z-130` 无效）。通用组件用 `zIndexClass` prop。
- 组件 scoped 样式（0,2,0）压过 Tailwind 工具类（0,1,0）—— 局部覆盖必须在 scoped 里写同层级类，且定义在基类之后。
- ⚠️ **Tailwind `group` / `peer` 不可用**（`tailwind.config.js` 无 `safelist`，构建时被 purge → `group-hover:` 永不生效）。要「父行 hover 才显形子按钮」写 **scoped CSS**：`.row:hover .row-action{opacity:1}` + `.row-action{opacity:0}`。

## UI 约定

- **禁止假保存提示**：只有用户主动写入才点亮「已保存✓」。多条目共用卡片实例加 `:key="item.id"`。
- 「在弹窗内」= 同一弹窗同一视图增删内容；换配置不作废输入；多模式状态按模式分开存。
- AI 结果一律人工确认后才写回；有结果未填充时关闭弹窗二次确认。`item.text` / `item.result` 分字段存。
- 主题色：`darkMode: 'class'` + CSS 变量；语义色 `-700 dark:-300`；状态色只加标题元素不加容器；`bg-x/50` 对 `var(--...)` 不生效。
- 左栏分镜列表状态**只反映生图维度**（生图中/生图失败/已成图/未生图）—— 一栏不塞两套状态。
- 用户 UI 偏好：极简风、小圆角 4px、无多余装饰；大图用 `object-contain` 不裁切。
- ⚠️ **全局提示（Toast）**：`useToastProvider` 必须 provide **ref 本身**（`{ instance }`）；写成 `{ instance: instance.value }` 注入的是 null 快照 → **全站提示静默丢弃**（历史 bug：设置页保存成功/失败都无反馈）。层级 `z-[9999]` + 外层 `pointer-events-none`；`useToast` 四个方法要**透传 id**（支持「进行中→结果」替换）。
- 设置页所有落库动作统一走 `runSave(action, successMessage?)`：成功给正向提示，失败必须弹出具体原因（**不许静默**）。
- **资产三个子 tab 分工不能混**：**信息** = 识别与建档（提取审核 + 资产增删入口，只展示「本次识别」一套清单）｜**生图工作台** = 生产（提示词/参考图）｜**图片** = 浏览。提取未确认时信息 tab 给提示条 +「去生图工作台」，确认后自动切到工作台。

## 章节阶段（node.stage）只升不降

`LONG_CHAPTER_STAGE_ORDER`：empty → source-ready → analysis-ready → script-ready → **assets-ready → storyboard-ready** → prompts-ready → completed。统一口径在 `utils/chapterStage.ts`，**任何写 stage 的地方先过这里算目标值**（历史 bug：自动保存把 storyboard-ready 打回 source-ready）。

## 视觉状态的来源（`origin`）：非提取产出必须豁免重建

`LongProjectAssetVariant.origin?: 'extraction' | 'manual'`，**缺省一律按 `extraction`**（旧库行为不变）；语义与 `LongProjectChapterAsset.origin` 同款。

- `applyCandidatesToAsset` 口径是「**状态整表重建，本次未出现的旧状态一律删除**」，而 `extract` 永远不输出程序补建的状态（如场景「机位图」）→ 不豁免就会在下次确认提取时**静默删掉状态与已出的图**。
- 三处必须一起过：`applyCandidatesToAsset`（追加保留）／`selectDroppedVariants`（不算「本次未出现」）／`storyboardService.defaultVariant`（不挑 manual 当默认，防九宫格被绑进分镜画面）。
- **新增任何「程序按规则补建的状态」照此三处过一遍**（机位图判定见 `topics/asset-pipeline.md` §7.8）。

## 绑定（详见 `topics/binding.md`）

- 身份键 `(assetId ?? 归一名) :: (visualVersionId ?? '')`；页级与格级都允许同资产多状态。**manual 是用户锚点**但绑定以文本为事实来源；写库统一走 `applyBindingFix`；唯一扫描口径 `bindingScanPrompt(artwork?)`；写描述的四条路径必须走 `syncBindingsAfterPromptWrite`。
- **分镜文本 = 原文（blockText）**：`panel.blockText` 是页块文本唯一事实来源，程序唯一能改的是「出场资产：」行（`patchBlockTextAssetLines`）；文本格数与 cells 对不上时整体跳过回写。
- **缺图门禁**：绑定审计**不看图存不存在** → 该状态没成品图时 `buildPanelRefManifest` 的 `if (!image) continue` 会**静默剔除**（少发参考图、零告警）。补齐者 `services/panelRefReadiness.ts`（§7.10）。中栏「缺参考图」占位就是它，**不要再新增占位种类**；生图前**只提示不拦截**。

## 中断恢复：每个「先落 running 再回写」的环节都要有 recover

分镜（`useStoryboardRun.recoverInterrupted`）、文档（`useChapterDocRun`）、资产提取（`LongProject.vue:recoverAssetExtraction`）三处。漏掉的后果是 `PromptRunBar :disabled` 硬锁死。新增同类环节照此办理。

## 持久化：数据在两层，写哪一层别看错

- **项目根（`ComicProject`）**：`imageGenConfig`、`assetGenConfig`（与分镜**数据不互通**）、`comicConfig` 与元信息 → **`mutateProject`**。
- **`longProjectData`**：节点树 / 资产 / 章节资产 / 分镜版本 / 画面工件 / 提取记录 / 分析 / 剧本 → **`mutateLongProjectData`**。
- ⚠️ 用错会出现「DB 写了但页面不刷新」的假成功。
- **写放大红线**：一次操作只允许写一次库。禁止「N 个条目 → N 次写库」的循环；批量回填走显式批量入口（`updateAssetVariants` / `applyVariantPatches`）。`mutateLongProjectData` 只在**同 tick**攒批，跨 `await` 的循环不受保护。**编辑框禁止 `@input` 直连写库**（本地草稿 + 防抖提交 + 离开前冲刷）。
- **磁盘文件分两块**：设置类（`modelConfigs` / `promptTemplates` / `appSettings` + 全部密钥）在 `comic-settings.json`，项目类在 `comic-gen.json`。**设置写入绝不能落在项目库上**（实测 4.5s 阻塞）。
- 🔴 **图片已外置**：图片字段存的是 **`app-image://comic/…` 引用**，文件在 `userData/comic-images/`。三条铁律（详见 `topics/storage.md`）：① **用主进程返回的 project 刷新**（`saveProjectAndReadBack`），**长期存活的本地 ref 也要跟着换**；② **参考图发给第三方前必须过 `resolveModelInputImage`**；③ 新增图片字段名必须进 `IMAGE_FIELD_KINDS`。
- ⚠️ **瞬时状态归渲染层，不要塞进项目数据**：落库会 `project.value = updated` **整体替换**，写在内存补丁上的状态会被冲掉（范式：`runningPanelIds`、`selectedImageOverlay`）。**「切图 = 一次整库写」是卡顿主因**，切图只改内存、停手 600ms 合并写一次。
- ⚠️ **内联图片必须走 `toFastDisplayImageUrl`**（dataURL → 带 LRU 的 Blob URL）；**新增 `<img>` 不要直接绑 dataURL**，并配 `decoding="async"`。

## 时间戳语义：判断「内容变过」只能用 createdAt

`updatedAt` 会被绑定重算 / 悬空修复 / 覆盖确认反复推高，拿它比对必然误判。分镜页 `assetsChangedAfterStoryboard` 用 `run.createdAt`。一键重推必须复用顶栏链路，不要另写生成逻辑。

## 输出格式与模板（细节见 `topics/formats.md` / `topics/panel-prompt.md`）

- **模板机制**：全链路输出语法统一 Markdown（`#` 标题 + `- 字段：内容`），**解析器保持专用、禁止过度抽象**；**能被用户改的拼法必须以用户模板存在**（推荐模板只作新建底稿，**不做内置兜底**）；推荐模板**两层拼成** = `RECOMMENDED_TEMPLATE_BASE[type].content` + `OUTPUT_FORMAT_SPECS[type]` → `withFormatSpec()`。**改规则三处同改**（正文／格式段硬约束／`description`）+ 补测试断言。
- 🔴 **「改了模板没效果」第一排查项 = 存量模板优先**：用户存过的模板在 `comic-settings.json.promptTemplates`，`defaultTemplateContent(type)` 只在无用户模板时生效 → 改完必须让用户**「填入推荐模板」**；**不要先怀疑改动没落盘**。
- **解析契约（骨架不要动）**：`## 分镜 N · 结构名` + `第X格` + `字段名：内容` 是解析器契约；**加新字段名会变成一句台词**（`knownField` 20 词白名单 + `SPEAKER_RE` 兜底）、**`备注` 会被绑定扫描**（→ `missing-binding` 误报）；**格数上限是模板约定不是代码限制**（`cells` 不限长；现行 **8 格** + 叙事页／连打页双模式）；结构名词表 **4 条常量**（`PANEL_STRUCTURE_NAMES`／`PANEL_STRUCTURE_SEMANTICS`／`PANEL_LAYOUT_RULES`／`PANEL_FLOAT_RULES`）是四份模板共用单一事实源，结构名**不是解析白名单**（加名字零代码，但漏改任一份就口径断层）。细则见 `topics/panel-prompt.md`。
- 🔴 **多格页必须「悬浮散格」，不是条带**（用户实报否决 `条带连打`）：一格**不必占满页宽**（55%~85%、满宽与偏窄**交替**）／**水平起点逐格不同**／框外留**统一底衬**／可**局部叠压**（压角 ≤1/5、**后读的压住先读的**）／**POV·特写·反应格优先做偏窄浮格**。**必须给两个禁写项**（进格式段）：① 禁止沿同一条页边等距平铺成一列等宽窄条；② 禁止「各占约 X%、沿同一条页边依次排列」这类句式。细则见 `topics/panel-prompt.md`。
- **气泡与情绪背景是「写出来交给生图 AI」的规则**：气泡**形状承载情绪**（椭圆＝对白／锯齿爆炸＝喊叫／虚线抖动＝低语／云朵边＝心声／方角无尾＝旁白说明）；六条放置规则＝顺序／配额（一格 ≤3 个、总面积 ≤1/3）／避让（不遮眼睛表情与关键道具）／气尾指向嘴部下颌／可压格间沟槽但不盖邻格画面／**用气泡把视线引向下一格**；另有**沉默格**。`【情绪背景】`只在情绪焦点格用、场景首出场必须先用写实环境、**一页最多 1~2 格**、**整体替换写实背景而非叠滤镜**。
- 🔴 **不要在画面里画「引导线」**（用户实报）：`PANEL_FLOAT_RULES` 里我写过的「用一条细引导线串起阅读路径」是错的 —— **条漫没有画在画面上的引导线**。阅读引导靠构图与文字元素**自然形成**（人物看向的方向、气尾指向、气泡位置、明暗对比）。三处同改：`PANEL_FLOAT_RULES`／【表现元素】「**不画引导线**」／【禁止项】。⚠️ **速度线·集中线合法，引导线不合法**。**通用判定：把「读者的认知过程」当成「画面元素」写下来，模型就会真的把它画出来**。
- **提示词分三层，别混**：① 分镜文本（`panel.blockText`）→ ② **画面描述**（`panel.imagePrompt`，**纯净层：无图号/画风/共用属性/无「图N＝谁」**）→ ③ **最终提示词**（`composeFinalPrompt` → `buildFinalPromptSections`，**不再过模型**、生图那刻生成、不落库）。**版式落地归 `panel-prompt`**，不给分镜加格级大小字段。
- ⚠️ **这一层的两个易错点**：**图号两套呈现** —— 共用属性块的图写在**块内部**（`图N = 属性名。`）、不进 `【动态参考图】`，只有资产图进它（`图N = 资产名（状态名）` + `refUsage`），顺序恒为 **共用属性（front 按 sortOrder）→ 人物 → 场景 → 道具**；**token 必须唯一** —— 无文字＝**「文字元素：无」**、输出首行＝**「版面：」**（输入仍写「页面结构：」）、节标题与逐格行统一「表现元素」，这一行**逐字进最终生图提示词**。
- 🔴 **禁止项不要写成固定尾段**（用户实报：每条提示词末尾挂同一段通用禁令）。**约束落到「版式声明」这类一定会被写出的正向句子里**。三条判定：① 正向描述已说清的不写否定句；② 清单已给的事实（配色/发型/材质/尺寸/状态）**禁止**「不得改变 X」复述；③ 整条否定句 ≤2 句、同一章内不得两条尾句相同。**三处同改**：【禁止项】／【用语要求】例外条款／【自查】+ 格式段硬约束。⚠️ 加任何硬约束都要写「**不要写进逐格输出行**」，否则又变成新的固定尾段。
- 🔴 **参考图可读性红线：设定图里「人脸只出现一次」**。人物版式为**横向 1×4 非等宽四联图**：第 1 格 2:3 竖幅脸部大特写（裁切至锁骨）／第 2、3 格**从颈部中段以下开始、头部完全在画幅之外**／第 4 格背面全身。原理：全身格里再容人头 → 脸只剩几十像素 → **下游参考到的是糊脸**。⚠️ 写「反直觉裁切」版式**必须显式声明「这是刻意的版式，不是裁切失误，不要补画头部与五官」**（§7.9）。改版式必查四处：【转译要求】举例、【禁止项】版式类否定句、【自查】、`description`。
- **改模板前先看「下游读不读得到」**：`extract` 资产级未知字段落进 `attributes`（安全），状态块内未知字段会被**提升到资产级**（串位）；`asset-prompt` 输入每行 = `资产描述｜视觉描述｜固定特征｜attributes 前 8 项`，**单条路径不读 attributes**；**一致性靠参考图、不靠文字**；输出 `## 资产名｜状态名` + 一段，**一个状态只能一段**、多视图必须画在同一张图内。
- 长篇分镜：页头 `## 分镜 N · 双格`、格 `### 第X格`、字段 `- 字段名：内容`；**入库去包装、出库带包装**。
- **资产提取（extract）口径**：人物的服装/鞋袜/配饰/随身武器属于**人物视觉状态**，**不得再作为独立「道具」资产提取**；道具只收能脱离人物单独出图的独立物件。例外：剧情围绕某件服装/配饰本身、需单独特写时才建道具。

## 候选提示词条（genPrompts）读写口径必须对齐

读走 `resolveActiveGenSlot`（有候选条时**完全忽略 imagePrompt**），写必须走 `buildOverwriteActiveSlotPatch`（`utils/genPromptSlots.ts`）——直接只写 `imagePrompt` 是假写入。不变式：`imagePrompt` ≡ 第 1 条正文，仅第 1 条镜像。分镜 panel 的 imagePrompt 是「画面描述」（与候选条两层），不适用此口径。

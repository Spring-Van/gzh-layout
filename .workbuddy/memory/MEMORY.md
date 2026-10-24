# 项目长期约定 — gzh-layout（漫画/公众号排版工具）

> 主文件只留**跨域红线**，细节按需读专题（`topics/`）：
> - `asset-pipeline.md` — 提取→归属匹配→确认落库→绑定回填／`origin` 豁免(§7.7)／机位图(§7.8)／人物版式(§7.9)／缺图门禁(§7.10)／`fixedTraits`(§7.11)／工作台资产口径=本章引用(§7.13)／气质与差异矩阵(§7.16)／**资产提示词拼装与版式(§7.18)**／**人物辨识度三层权重 6:3:1 + 服装五步(§7.19)**
> - `binding.md` — 绑定身份与多状态／绑定审计与一键补绑／描述写入后同步
> - `ref-manifest.md` — 参考图清单与图号／有效参考图／成图口径／refUsage／资产配色
> - `panel-prompt.md` — 画面描述管线／「图N=…」产出点／结构名与排版规则／`knownField` 契约／格数上限／气泡与情绪背景／引导线禁令／POV 拆格／背景与群众／文字零遗漏
> - `multi-prompt.md` — 候选条数据模型／图号重算／写入路径／右栏排布
> - `formats.md` — Markdown v5 输出／长篇分镜格式／模板约定／禁止项的正确落点／叙事连贯与钩子
> - `llm-layer.md` — LLM 调用层／请求传输层／测试连接
> - `local-debug.md` — 本机调试环境／工程校验三件套／工具坑
> - `cleanup.md` — 项目数据清理／引用完整性
> - `storage.md` — 存储分区／图片外置／写放大／瞬时状态归属渲染层／dataURL→Blob URL

## 布局与滚动

- `custom-scrollbar` 只改外观不设 `overflow`；能滚三件套：父链一路 `min-h-0` + `flex-1` + `overflow-y-auto`。
- 弹窗统一 `fixed inset-0` + Teleport 到 body；**Teleport 浮层必须自己写 `position: fixed`**。z-index 谱系：z-40 菜单｜**z-50** 常规弹窗｜z-100/101 全屏抽屉｜z-120 覆盖确认｜**z-[130]/z-[131] 抽屉内子弹窗**｜z-140 导入弹窗｜z-150 导入覆盖确认｜z-200 大图预览｜z-[210] 预览内删除确认｜**z-[9999] Toast**（Tailwind 裸值 `z-130` 无效）。通用组件用 `zIndexClass` prop。
- 组件 scoped 样式（0,2,0）压过 Tailwind 工具类（0,1,0）—— 局部覆盖必须在 scoped 里写同层级类，且定义在基类之后。
- ⚠️ **Tailwind `group` / `peer` 不可用**（无 `safelist`，构建时被 purge）。「父行 hover 才显形子按钮」写 **scoped CSS**（`.row:hover .row-action`）。
- 🔴 **`computed` 返回对象时，禁止在模板里对它的属性 `v-model`**（`v-model="draft[field]"`）：模板对 setupState 会 unref，赋值只落到 getter 返回的临时对象，**setter 永不触发 → 编辑静默丢失**（资产版式、参考图用途都栽过）。要可编辑就用 `reactive` 草稿 + 打开时重置 + 保存时写回；否则 `@input` 显式调 setter。

## UI 约定

- **禁止假保存提示**：只有用户主动写入才点亮「已保存✓」。多条目共用卡片实例加 `:key="item.id"`。
- AI 结果一律人工确认后才写回；有结果未填充时关闭弹窗二次确认。`item.text` / `item.result` 分字段存。
- 主题色：`darkMode: 'class'` + CSS 变量；语义色 `-700 dark:-300`；状态色只加标题元素不加容器；`bg-x/50` 对 `var(--...)` 不生效。
- 用户 UI 偏好：极简风、小圆角 4px、无多余装饰；大图用 `object-contain` 不裁切。
- ⚠️ **按钮尺寸：`primary-button` / `secondary-button` 全局默认是「大号」**。**弹窗底部/顶栏按钮组必须显式写尺寸**：次要 `h-9 px-3 text-xs`、主 `h-9 px-4 text-xs`（36px / 12px）。同一按钮组内不许混排（卡片内 `h-6`/`h-7` 是刻意紧凑）。
- ⚠️ **Toast**：`useToastProvider` 必须 provide **ref 本身**（`{ instance }`），写成 `.value` 注入 null 快照 → 全站提示静默丢弃。`useToast` 四方法要**透传 id**（支持「进行中→结果」替换）。设置页落库统一走 `runSave(action, msg?)`，失败必须弹具体原因。
- **资产三个子 tab 分工不能混**：**信息** = 识别与建档（提取审核 + 资产增删）｜**生图工作台** = 生产（提示词/参考图）｜**图片** = 浏览。三 tab **同一过滤口径 = 本章 `chapterAssets` 引用**，零引用 = 空态，**不许回退全项目 assets 兜底**（§7.13）。
- **图片 tab = 纯生成图墙**：只出 `generatedImageIds`，**没有生成图就一张卡都不出**（不放占位卡、不做建档）。
  🔴 **布局 =「折叠叠牌 → 点击开弹窗」**（`LongProjectChapterAssets.vue` + `AssetShotsWallModal.vue`）：
  - 页面**只有折叠态**：一个资产收成一叠 —— 第一张 `relative` 撑尺寸，其余 `absolute` +
    `translate(i*PEEK, …) rotate(i*1.2deg)`、`z-index = n-i`；**牌堆宽度必须用 `padding-right` 补出 (n-1)*PEEK**，
    否则溢出的卡片会压到下一个资产。hover 用 `--grow` 再散开一点暗示可点。
  - 点击 → `AssetShotsWallModal`（`fixed inset-0 z-50`，面板 `w-[min(1240px,94vw)]`），
    内部 `columns-2 md:columns-3` + `break-inside-avoid` + `img` 不设高度 = **按原比例瀑布流大图**；
    下载与点击看大图（`AssetImagePreviewModal` z-200）都在弹窗里。
  - **不要再回到「原地展开 + 收起」**（用户明确否掉：展开会把其它资产挤走、还要多点一次）；
    也不要回到整页 `columns` 瀑布流（同资产图会竖着堆一列）或「固定小图高 + 一行一个资产」（图太小）。
  - 弹窗存 **assetId**（`activeGroup` 由 computed 从 `groups` 取），不存对象快照 —— 弹窗开着时图变动要能反映。
  下载走主进程 `downloadService.downloadSingle`（认 `app-image://comic/` 直接读盘）。
  ⚠️ **别给图片地址加前缀白名单**：`app-image:` 不在 `https?/data/blob/file` 那套白名单里，筛一遍图就整批消失（旧代码踩过）。
  ⚠️ `.fade-*` 过渡在本项目**没有全局定义**（各组件自己 scoped 里写），新弹窗用 `<Transition name="fade">` 要自己补四个类。
- **图片 tab 的排序口径在 `services/chapterAssetShots.ts`**（有单测）：三层 = 资产类型(人物→场景→道具) → 资产自身 `variants` 顺序 → `generatedImageIds` 顺序。**不能直接用章的 `chapterAssets` 顺序铺**：那是引用列表，确认时按候选出现顺序写，两个角色的状态会交错，同资产的图会被拆散。分组（`groupChapterAssetShots`）**顺次切分同一份排好序的结果**，不另算一套顺序 —— 否则排序与分组会各说一套。
- 左栏分镜列表状态**只反映生图维度**（生图中/失败/已成图/未生图）—— 一栏不塞两套状态。

## 章节阶段（`node.stage`）只升不降

`LONG_CHAPTER_STAGE_ORDER`：empty → source-ready → analysis-ready → script-ready → **assets-ready → storyboard-ready** → prompts-ready → completed。统一口径 `utils/chapterStage.ts`，**任何写 stage 的地方先过它算目标值**（历史 bug：自动保存把 storyboard-ready 打回 source-ready）。

## `origin`：非提取产出必须豁免重建

`LongProjectAssetVariant.origin?: 'extraction' | 'manual'`，**缺省一律按 extraction**。`applyCandidatesToAsset` 口径是「状态整表重建，本次未出现的旧状态全删」，而 extract 永不输出程序补建的状态（如机位图）→ 不豁免就**静默删状态与已出的图**。三处一起过：`applyCandidatesToAsset`／`selectDroppedVariants`／`storyboardService.defaultVariant`。新增任何「程序按规则补建的状态」照此三处办（§7.7）。

## 绑定（详见 `binding.md`）

- 身份键 `(assetId ?? 归一名) :: (visualVersionId ?? '')`；页级与格级都允许同资产多状态。绑定以**文本**为事实来源；写库统一 `applyBindingFix`；唯一扫描口径 `bindingScanPrompt(artwork?)`；写描述的四条路径必须走 `syncBindingsAfterPromptWrite`。
- **分镜文本 = 原文 `blockText`**：程序唯一能改的是「出场资产：」行（`patchBlockTextAssetLines`）；文本格数与 cells 对不上时整体跳过回写。
- **缺图门禁**：绑定审计**不看图存不存在** → 该状态没成品图时 `buildPanelRefManifest` 的 `if (!image) continue` 会**静默剔除**。补齐者 `services/panelRefReadiness.ts`（§7.10）；中栏「缺参考图」占位就是它，**不要再新增占位种类**；生图前**只提示不拦截**。

## 参考图清单：一律运行时现算，绝不写进提示词正文

- 分镜 `buildFinalPromptSections`（`{类型}`/`{格号}` 占位）与资产 `assetRefManifest.buildAssetRefSection`（`{图号}` 占位）**同构**，都只拼「图N = 标签：用途」。
- 🔴 **顺序红线**：图号由取图数组决定 → `buildAssetRefManifest` 必须与 `AssetWorkbench.genRefImages` 同序（共用属性 front 图 → 本状态图）；分镜侧同理认 `buildPanelRefManifest`。
- 🔴 **参考图说明不许写进 `imagePrompt` / 版式**：图号会随增删图与「拼接共用属性」开关整体位移，且正文会被「重新生成」覆盖。写死图号 = 安静画错。
- 用途模板**两套不可混用**：分镜 `imageGenConfig.refUsage`（人物/场景/道具，含服装）vs 资产侧**只有内置默认** `DEFAULT_ASSET_REF_USAGE`（人物默认「只取脸、服装以本段文字为准」，否则模型照抄参考图的衣服、新服装描述失效）。资产侧**没有**可编辑的按类型模板（2026-10-24 移除），要补话术走状态级 `variant.referenceNote`。
- 🔴 **`variant.referenceNote`（参考描述）的落点**：用户在选图弹窗里手写、与图一起**一次 patch 写库**；`buildRefNoteSection(note, assetType)` 渲染成「标题 + 正文」一段，拼在**共用属性（插入最前）之后、版式之前**。🔴 标题按类型给且**不带【】**：人物=`人物角色一致性`／场景=`场景一致性`／道具=`道具一致性`（裸标题才被模型当正文要求读，`【】`会被当成系统区段去复述）。纯文字、不参与图号计算；**不受「拼接共用属性」开关影响**（本状态自己的图照发）。图号由「插入图号」按确认后最终数组现算（追加去重 → 不是点击顺序）。
- 🔴 **选图弹窗是两层 tab，一层只表达一件事**：第一层「章节资产 / 公用资产」= `asset.scope`（缺省按 chapter，历史数据无该字段）；第二层「人物 / 场景 / 道具」= `asset.type`。**不许把归属降级成资产按钮上的「章/库」小标**（做过一次，用户退回）。底部的参考描述输入框**不分类型**——它本来就处在确定的归属+类型之下。打开时按 `scopeHint` + `assetType` 自动落到目标资产所在的两层，切归属时若该类型没资产才自动回落。
- ⚠️ **给 `AssetGenConfig` 加字段必须同步 `AssetImageGenDrawer` 的 reset**：它保存时写回整份 config，漏字段会静默抹掉（`layoutPrompts` 栽过）。同理给 `LongProjectAssetVariant` 加字段要检查 `update:asset` 的 patch 是否浅合并（是：`{...item, ...patch}`，`undefined` 会覆盖并随 JSON 丢弃）。

## 中断恢复：每个「先落 running 再回写」的环节都要有 recover

分镜（`useStoryboardRun.recoverInterrupted`）、文档（`useChapterDocRun`）、资产提取（`LongProject.vue:recoverAssetExtraction`）。漏掉 → `PromptRunBar :disabled` 硬锁死。新增同类环节照此办理。

## 持久化：数据在两层 + 图片已外置（详见 `storage.md`）

- **项目根（`ComicProject`）**：`imageGenConfig` / `assetGenConfig`（两者**数据不互通**）/ `comicConfig` → `mutateProject`；**`longProjectData`**：节点树/资产/章节资产/分镜版本/画面工件/提取记录/分析/剧本 → `mutateLongProjectData`。用错 = 「DB 写了但页面不刷新」的假成功。
- **写放大红线**：一次操作只允许写一次库；批量走 `updateAssetVariants` / `applyVariantPatches`；编辑框**禁止 `@input` 直连写库**。`mutateLongProjectData` 只在同 tick 攒批。
- **磁盘两文件**：设置类（含全部密钥）在 `comic-settings.json`，项目类在 `comic-gen.json`；设置写入绝不能落在项目库上。
- 🔴 **图片存 `app-image://comic/…` 引用**（文件在 `userData/comic-images/`）：① 刷新用主进程返回的 project（`saveProjectAndReadBack`），长期存活的本地 ref 也要换；② 参考图发第三方前必须过 `resolveModelInputImage`；③ 新增图片字段名必须进 `IMAGE_FIELD_KINDS`。
- ⚠️ **瞬时状态归渲染层**（`runningPanelIds` / `selectedImageOverlay`），落库会 `project.value = updated` 整体替换。**切图只改内存、停手 600ms 合并写一次**。内联图片必须走 `toFastDisplayImageUrl` + `decoding="async"`。

## 时间戳语义：判断「内容变过」只能用 createdAt

`updatedAt` 会被绑定重算/悬空修复/覆盖确认反复推高，拿它比对必然误判（分镜页 `assetsChangedAfterStoryboard` 用 `run.createdAt`）。一键重推必须复用顶栏链路。

## 模板与解析契约（详见 `formats.md` / `panel-prompt.md`）

- 输出语法统一 Markdown；解析器保持专用、禁止过度抽象；推荐模板 = `RECOMMENDED_TEMPLATE_BASE[type]` + `OUTPUT_FORMAT_SPECS[type]`。🔴 **改规则三处同改**（正文／格式段硬约束／`description`）+ 补测试断言。
- 🔴 **「改了模板没效果」第一排查项 = 存量模板优先**（用户模板在 `comic-settings.json.promptTemplates`）→ 必须让用户「填入推荐模板」；**不要先怀疑没落盘**。
- **解析契约骨架不要动**：`## 分镜 N · 结构名` + `第X格` + `字段名：内容`；**加新字段名会变成一句台词**（`knownField` 白名单）；`备注` 会被绑定扫描；**格数上限是模板约定不是代码限制**；结构名 4 条常量是四份模板的单一事实源。
- **三层提示词别混**：分镜文本 → 画面描述（`panel.imagePrompt`，**纯净层：无图号/画风/共用属性**）→ 最终提示词（`composeFinalPrompt` 生图那刻拼、不落库）。**版式落地归 `panel-prompt`**，不给分镜加格级大小字段。
- 🔴 **多格页必须「悬浮散格」不是条带**：一格不必占满页宽（55%~85%，满宽与偏窄交替）／水平起点逐格不同／统一底衬／可局部叠压（后读压先读）／POV·特写·反应格优先偏窄；必须给两个禁写项（§panel-prompt 161）。
- 🔴 **不要在画面里画「引导线」**（用户实报）。阅读引导靠构图与文字元素自然形成。**速度线·集中线合法**。通用判定：**把「读者的认知过程」当「画面元素」写下来，模型就会真的画出来**。
- 🔴 **看东西必须拆两个视角**：一格塞两个视角物理上不成立。**拆不拆格归 `storyboard`**，画法归 `panel-prompt`×2（观看格不画屏幕内容／POV 格不出现人物脸与上半身）；分镜没给 POV 格时画面描述**不许自己加格**。
- 🔴 **无场景的格必须补写实背景；群众必须写但只能用群体词**。硬红线：`panel.imagePrompt` 会被绑定审计读 → **群众与补写背景不许起名号、不许写成资产名/状态名**（否则稳定误报「未绑定」）。放开一条禁令时必须同步改写那条禁令。
- **画面描述是台词/旁白的唯一落地口**：给定几条就写几条（一条不少、不错格、一字不改）；自检类硬约束一律附「**不要写进输出**」。
- 🔴 **禁止项不要写成固定尾段**：约束落到「版式声明」这类必然写出的正向句子；整条否定句 ≤2 句、同章内不得两条尾句相同。加硬约束必须写「不要写进逐格输出行」。
- 🔴 **参考图可读性红线：设定图里人脸只出现一次**（1×4 非等宽：脸特写／颈部以下两格／背面全身）。写反直觉裁切必须声明「这是刻意的版式，不要补画头部」。版式文本住在 `services/assetLayoutSpecs.ts`，改版式必查四处（§7.9）。
- 🔴 **资产绘画提示词 = 共用属性(最前) + 参考描述 + 版式 + 提示词 + 共用属性(最后)**，生图那刻拼、不落库；模板只写主体自身，**版式不写进正文**；版式字段缺失=用推荐兜底、存在但全空=用户清空不拼（§7.18）。
- 🔴 **资产侧不拼【动态参考图】清单**：那是分镜绘图的机制（`panelRefManifest`/`composeFinalPrompt`）。资产侧图号说明只有两条路——① 共用属性块自带图号行；② 用户手写「参考描述」（图号由选图弹窗按确认后最终数组算，`previewRefImageIndexes`）。共用属性有 5 张图时清单会重复列 5 行同样说明，用户实报过，别再补第三套机制。
- 🔴 **拼进最终提示词的每一段标题都带【】标签**（`services/assetSectionTitles.ts` 单一事实源）：共用属性=`【属性名】`、参考描述=`【人物角色一致性】/【场景一致性】/【道具一致性】`、版式=`【人物版式】/【场景版式】/【道具版式】`、正文=`【人物描述】/【场景描述】/【道具描述】`。**只有标题行套，图号行不套**（`图1、图2 = 绘画风格。` 是一句归属陈述，套上等于双标签）。裸正文并排时模型分不清「风格约束／版式声明／主体外貌」，会把版式说明当外貌画出来。
- ⚠️ `buildBlockText` 是**分镜与资产共用的唯一共用属性拼装点** —— 改它两边同时生效，改格式前先确认这不是单边需求。
- **资产提取口径**：人物的服装/鞋袜/配饰/随身武器属于**人物视觉状态**，不得再作为独立「道具」；道具只收能脱离人物单独出图的独立物件。
- 🔴 **资产是「字段」不是「散文」**（2026-10-23 重构）：`extract` 人物资产级固定 **8 行**（性别年龄／身高体型／脸型／眉眼／鼻唇／皮肤头发／标志／面部张力，每行 ≤20 字）、场景 8 行、道具 6 行，**不再写「- 描述：」段**；人物状态级服装固定 **14 键**写成单行「键=值｜键=值」（廓形/腰线/长短/外套/上装/下装/鞋袜/结构/配色/材质/纹样/磨损/妆造/局部）。⚠️ 资产级字段**必须 ≤8 个**：`buildTargetList` 只取 `attributes` 前 8 项（`slice(0,8)`，单条路径同），多出的被静默截断。辨识度靠取值不靠维度数量：标志行装「锚点 2~3 个＋母题两处落点＋1 处视觉反差」，服装先定廓形（H/A/X/O/Y/T）、彩色 ≤3 种、灰度可辨、同章主色相间隔 60°、1 处有叙事理由的磨损；同章主要人物在剪影/脸型/眉眼/廓形/主色调上两两至少 3 项不同。详见 `topics/asset-pipeline.md` §7.19。
- **人物「气质」不是「性格」，也不再是独立字段**：只落成 `面部张力` 一行的结构量（眉眼舒展度／眉头间距／唇角走势／咬肌与下颌松紧／目光状态），**禁止情绪词与表情动作**，不碰躯干四肢。通用判定：**气质必须是可测量的结构量，不能是形容词**（§7.16）。
- 🔴 **提示词阶段只直译、不重写**：`asset-prompt` 按固定顺序把字段值原样搬入，不换说法、不加修饰、不解释、**不出现字段键名**、不写比喻；**字数硬上限 人物 200~320／场景 100~160／道具 60~110 字**，超了只删装饰性细节、不许删身份特征与配色。存量散文数据由模型内部先拆字段再重排，不新增信息。补全取舍：`原文硬事实 > 面部骨相 > 具体取值 > 装饰性细节`。
- 🔴 **人物缺失字段分三类，措辞必须分开**（`assetPromptService.CHARACTER_REQUIRED_TRAITS` 带 `mode`）：`convert` 性别年龄/身高体型（只换单位与量，性别无线索**绝不猜**）｜`infer` 脸型/眉眼/鼻唇/皮肤头发/面部张力（**缺字段必须推定写满**，先搬用资产描述已有写法，推定值在所有状态逐字一致）｜`never` 痣/疤/纹身/眼镜/首饰等具体标记（**没写就一定不写**，编了会跟后面几章剧情打架）。缺项提示放清单末尾、按 asset.id 去重，不再塞进每行状态。⚠️ 推定只保证同一次请求内一致，根治靠重跑提取把 8 行字段落库。
- 🔴 **人物提示词十项必备要素**：性别年龄｜身高·头身比·体型·肩型｜脸型｜眉眼｜鼻唇｜皮肤头发｜标志｜面部张力｜服装｜妆造局部；前八项跨状态一致。**唯一允许「补」的两处**：身高体型可把形容词换算成可测量的量（「极瘦高」→「约 182cm·7 头身」），性别年龄只认明确线索、**无线索不写也不许猜**；其余缺了就跳过。**输入侧必须配合**：`buildTargetList` 检测人物缺这两项时追加「缺失必填项：…」，否则模型按「清单没写就跳过」处理，模板写得再全也白搭。通用判定：**程度词一律换成可画的量（cm／头身比／可见痕迹）**。
- 🔴 **剧本钩子跨三层**：剧本=爆点前置+章末六类钩子；画面描述=页尾钩子+章末页强化；**分镜刻意不写钩子**（`备注` 被扫描，角色名会误报）。剧本 `- 钩子：` 只在第 1 场与最后一场写。**前置三禁**：不新增事件／只给入口不给答案／不跨越服装或时期状态切换点。

## 候选提示词条（genPrompts）读写口径必须对齐

读走 `resolveActiveGenSlot`（有候选条时**完全忽略 imagePrompt**），写必须走 `buildOverwriteActiveSlotPatch`（`utils/genPromptSlots.ts`）——只写 `imagePrompt` 是假写入。不变式：`imagePrompt` ≡ 第 1 条正文，仅第 1 条镜像。分镜 panel 的 imagePrompt 是「画面描述」，不适用此口径。

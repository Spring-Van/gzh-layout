# 专题：本地存储分区与性能

> 背景与实测数据：`docs/本地存储性能诊断与根治方案.md`

## 文件布局（Electron 主进程，userData）

| 文件 | 内容 | 体积量级 | 写频率 |
| --- | --- | --- | --- |
| `comic-gen.json` | projects / projectAssets / materials / generationTasks | **全部图片已外置**（2026-10-05 阶段二），只留 `app-image://` 引用，10MB 级 | 项目类操作 |
| `comic-settings.json` | modelConfigs / promptTemplates / appSettings（**含全部密钥**） | 几 KB | 系统设置页高频 |
| `gzh-layout.json` | 公众号 / 素材等旧模块（DatabaseService） | 几十 KB | 低 |

## 红线

- **设置类写入只能碰 `comic-settings.json`**。写错分区会把整份项目主库重写一遍（2026-09-27 实测 494MB：序列化 2.3s + 写盘 0.5s + 回读校验 1.5s ≈ 4.5s 同步阻塞主进程，界面直接冻结）。
- 密钥（`apiKey` / `picgoApiKey` / `appSecret` / `accessToken`）只存在于设置分区，主库不带任何密钥 → `protectCredentials` / `revealCredentials` 只作用于 `ComicSettingsData`。
- `JsonFileStore.verifyMaxBytes`（默认 8MB）决定写入后是否回读校验：大文件跳过（省 1.5s + 1.5GB 解析峰值），靠「写 .tmp → 原子替换」+ `.bak` 兜底。动这里等于动所有库的写盘语义。
- 旧单文件库迁移只发生在 `ComicDatabaseService` 构造函数 + `init()`：`comic-settings.json` 不存在时从主库 legacy 分区迁出，主库下次写盘自然去掉这些字段。不要在别处再补迁移逻辑。

## 写库失败的可见性

渲染层写库必须经统一出口捕获错误并提示（范式：`SettingsView.runSave()`）。主进程写盘失败（磁盘满 / safeStorage 不可用）会让 IPC reject，未捕获时界面毫无反应 —— 用户只会说「点了保存却没保存上」。

## 写放大红线：一次操作只能写一次库（2026-10-05）

单次写库 = 序列化整份项目 + 写盘（本机实测：库 297MB，`JSON.stringify(indent2)` 1286ms + write 329ms；
长篇项目 86.5MB 里 `panelArtworks` 66.6MB + `assets` 15MB 都是内联 base64 图片）。
**任何「N 个条目 → N 次写库」的写法都是灾难**（10 条 ≈ 25s 卡死），且每次 `project.value = updated`
都会让整棵组件树重渲染。已落地的两个机制：

1. **同 tick 攒批（通用兜底）**：`useLongProjectPersistence.mutateLongProjectData` 把同一轮事件循环里的
   多个 mutator 收进一次 read-modify-write（`queueMicrotask` flush）。跨 `await` 的循环拿不到这个保护。
   ⚠️ 新增「批量回填」功能时，**优先显式批量**（收集全部 patch 再一次调用），不要依赖循环 + 攒批。
2. **显式批量入口**：`PanelGenAssetTab.updateAssetVariants(payloads[])` 是资产视觉状态的批量回写口径，
   通过 prop `applyVariantPatches`（async）下传工作台；`AssetPromptGenerateModal.saveResults` 是
   「填充到资产」的可 await 写库入口 —— 只有真正写回才点亮「已填充」。

**输入框/编辑器红线**：`v-model`/`@input` 直连写库 = 逐字全量写盘。
长篇项目里凡是要落库的编辑框，必须「本地草稿 + 防抖提交 + 离开上下文前冲刷」。
范式：`LongProjectAssetExtractionReview.patchContent`（草稿 `activeCandidate` 在草稿内容 ≠ 已落库内容期间优先，
写库追上后自动回落 props —— 否则写库那几秒编辑框会回退成旧文本）。

## 瞬时状态不要塞进项目数据（2026-10-05）

**红线**：任何一次落库都会 `project.value = updated`，用 DB 数据**整体替换** project ——
所有"只写在内存补丁上"的状态都会在那一刻被冲掉。所以「进行中 / 已看过 / 临时选中」这类
**渲染层瞬时状态**必须由渲染层自己持有，不能依赖项目数据：

- **「生图中」= `LongProjectStoryboardTab.runningPanelIds`**（`reactive(new Set<string>)`）。
  `isPanelGenerating(panelId) = runningPanelIds.has(id) || artwork.genStatus === 'running'`（后者只兼容旧数据）。
  `beginPanelGeneration` / `endPanelGeneration` 成对收口，**所有出口（成功 / 失败 / 参数校验不通过）都要走 end**。
  左栏四态标签通过 `PanelListItem.generating` 吃同一个来源。
  ⚠️ 只信 `artwork.genStatus === 'running'` 的后果：生图前的补绑同步等落库会把它冲成旧值 →
  loading 提前熄灭，但生图还要跑十几秒才出图（2026-10-05 用户报的正是这个）。
- **切图的显示真相 = `selectedImageOverlay`**（`reactive(new Map<string,string>)`，panelId → 图片），
  由 `artworkMap` 合并生效：`override !== artwork.selectedImageId` 时用 `{...artwork, selectedImageId: override}`。
  落库由 `pendingSelectedImages` 攒批、停手 600ms 后合并成**一次**写盘；`chapterId` 变化 /
  `onDeactivated` / `onBeforeUnmount` 强制 `flushSelectedImage()`。
  覆盖在「DB 值 == 覆盖值」时由 `watch(panelArtworks)` 自动消散。
  ⚠️ 三个必须清覆盖的时机：**删掉当前显示图**（`removeGenImage`，同时清 pending，否则会把已删的图写回库）、
  **生图成功**（新图即新选中，否则旧选择会盖住新图）、**落库追上**（watch）。
  ⚠️ `artworkMap` 的 `{...artwork}` 是浅拷贝：只能做值级判断的消费者（`props.artwork?.imagePrompt` /
  `genPrompts` 引用不变），别写依赖对象 identity 的逻辑。

## 大图显示：dataURL 必须换 Blob URL（2026-10-05）

`src/shared/image/imageUrl.ts` 的 **`toFastDisplayImageUrl(source)`** 是渲染层的统一显示入口：
dataURL → 带 LRU（上限 32）的 Blob URL 缓存；非 data 地址回落 `toDisplayImageUrl`（本地路径 → `app-image://`）。

- 理由：分镜成图单张 3~11MB 内联 base64，直接用 dataURL 每次渲染都要重新解析整条超长 URL、
  解码落在主线程；blob URL 短、解码可交给图像解码线程、按 URL 命中缓存 → 切图才流畅。
- 成本极低：转换 3MB ≈ 8ms、11MB ≈ 30ms（Node 实测 `atob` 3MB 仅 2ms，V8 有快路径），
  可以放心在渲染路径同步调用、转一次后全命中缓存。**没有理由为它做异步/懒加载。**
- 已接入：`PanelPreview`（主图）、`PanelListSidebar`（缩略图）、`PanelAssetTabs`（绑定图 / 候选图）、
  `PanelPromptPanel`（参考图）、`AssetImagePreviewModal`（大图预览 + 预加载），统一配 `decoding="async"`。
- 坑：`Uint8Array<ArrayBufferLike>` 直接当 `BlobPart` 报 TS2322，用 `bytes.buffer as ArrayBuffer`（零拷贝）。
- **新增任何内联图片的 `<img>` 时，一律走 `toFastDisplayImageUrl`，不要直接绑原始 dataURL。**

## ⚠️ 攒批的边界：只减「次数」，不减「单次体积」（2026-10-05）

**现象**：用户反复报「这么多地方操作数据都会卡」——编辑提示词保存 / 删资产生成图 / 分镜删生成图 / 填充提示词 / 导入，
**全部同源**：都走 `mutateLongProjectData` → 全量 `getProject` → 改几 KB → 全量 `saveProject` → `project.value = updated`。

| 操作 | 攒批前 | 攒批后 |
| --- | --- | --- |
| 填充 10 条提示词 | 10 次搬运 | 1 次搬运 |
| **删 1 张图 / 存 1 条提示词** | 1 次搬运 | 1 次搬运（**无从合并**） |

→ **攒批对单次操作天然无效**。排查同类问题时不要因为「已经做过攒批」就排除写库路径。

代价构成（一次删图）：① `getProject` 全量回传（渲染进程反序列化）；② mutator（几百微秒，真正的业务）；
③ `saveProject` 全量回传（渲染进程序列化 = **主线程冻结**）+ 主进程 stringify + 写盘；
④ `project.value = updated` → 全树 computed 重算 + 所有 `<img>` 重绑（blob 缓存 key 是 dataURL 字符串本体，
新对象里是**新字符串实例** → 逐条重算 hash，每张 3~11 MB）。**用户感知的卡顿主要在 ①③④，都在渲染主线程上。**

## 图片外置（2026-10-05 已实施，待实机验收）

> **实施级方案 + 实施记录**：`docs/漫画工作台数据卡顿根因与图片外置迁移方案.md`
> 早期诊断（导入场景）：`docs/长篇项目导入卡顿诊断与图片外置方案.md`

- **2026-10-05 复测**：主库 **503.2 MB**；`readFileSync` 329ms ＋ utf8 719ms ＋ `parse` 773ms ＋ `stringify` **2817ms**，堆峰值 **3.5 GB**。
  长篇项目 **291.7 MB**（`panelArtworks` 194.3 ／ `storyboardRuns` 64.2 ／ `assets` 33.1）；财经 95.3 ／ 卡通漫画 58.8 ／ 公众号卡通漫画 36.9。
- **关键设计（易漏）**：外置必须**让写库返回外置后的 project**，渲染层用返回值赋 `project.value` ——
  否则渲染层内存里仍是全量 base64，下一次操作照样卡。「只在主进程写盘时替换」是不够的。
- ⚠️ **输入侧高危点**：`grsaiService` / `duomiService` / `agnesImageService` / `openaiImageService`（兼容模式）
  把参考图**原样塞进第三方请求体**，外置后必须做「输入归一化」（`app-image://` → fetch → blob → dataURL）。
  统一在 `imageGenerationService.generateWithModel` 入口 map 一次即可。
  **更正**：`agnesImageService.ts:40` 的 `b64ToDataUrl` 处理的是**模型返回值**，与输入参考图无关（早期文档误判）。
- **主库 400MB（旧测），其中 142 张内联 base64 占 399.5MB（99.9%）**。写一次仍 ≈2.5s。
  长篇项目 188.5 MB 数据里图片占 **99.93%（仅 51 张）**，挂在
  `storyboardRuns[].panels[].cells[].assetBindings[].referenceImageIds[]`、
  `panelArtworks[].generatedImageIds[]` / `selectedImageId`、`assets[].variants[].generatedImageIds[]`
  —— 字段名叫 `xxxIds` 但存的是图片数据本体，这是结构性来源。
- 根治 = 图片外置（dataURL → `app-image://` 引用，主进程 `saveProject` 写盘前替换 + 一次性迁移）。
  基础设施已就绪：协议（`main.ts:26` 已注册 secure/standard/supportFetchAPI/corsEnabled）、
  `ImageHistoryService.persistDataUrl()`、`toDisplayImageUrl()`、`urlToPngBlob()` 走 `fetch(url)` 已兼容。
  预期：单次写库 4s → **<50ms**，长篇项目 291.7MB → ≈1MB，堆峰值 3.5GB → <600MB。
  （旧稿里「渲染层 4 个消费点 `agnesImageService.ts:40` / `llmService.ts:496` / `PageSync.vue:854/891`」是误判，已作废。）
- **已落地（2026-10-05）**：新建 `electron/services/project-image-store.ts`；`comic-database.service.ts` 的
  `externalizeProjectImages` / `saveProject`（改 async，返回外置后的 project）/ `init()` 一次性迁移
  （备份 `comic-gen.json.premigration.json`，已存在则不覆盖）/ `deleteProjectCascade` 回收目录；
  `main.ts` 协议加 `comic` host；IPC + `api/comic.ts` + `useLongProjectPersistence` 接返回值；
  `imageUrl.ts` 的 `resolveModelInputImage(s)`；`imageGenerationService.generateWithModel` 入口统一归一化。
  校验：全量 **527 测试通过** + `vue-tsc` 0 错误。**待实机验收**（四条生图链路必测）。
- ⚠️ **实施期踩到的两个坑（改同类代码前先看）**：
  ① `String.replace(正则)` **不带 `g` 只替换第一个匹配字符** —— 目录名清洗这类「逐个替换」必须用带 `g` 的实例；
     反过来 `RegExp.test()` **不能**用带 `g` 的实例（`lastIndex` 跨调用残留 → 结果随机）。同一个字符集备两个实例。
  ② 写库后要用返回值刷新**长期存活的本地状态**（`ImageConfigDrawer` / 分镜页的 `imageGenConfig` ref），
     否则内存里仍压着 base64、下一次保存照样搬运，外置收益被吃掉；用完即弃的局部 `draft` 可以不管。
- **存储形态（2026-10-05 用户确认，方案文档 §5.1）**：按项目分目录 + 按来源分三类
  `userData/comic-images/<项目名 sanitize>__<id 前6位>/{generated,uploaded,reference}/<sha1>.<ext>`
  - 字段 → kind：`generatedImageIds`/`selectedImageId`/绑定 `selectedImageIds` → generated；`uploadedImageIds` → uploaded；
    `referenceImageIds`/`sharedBlocks.referenceImages` → reference。
  - 去重范围 = **项目内**（遍历时用 `Map<sha1, url>`，先由已有 `app-image://` 反向填充保证幂等），跨项目各存一份。
  - 目录名含项目名 → **项目重命名要跟着 `rename` 目录，并替换项目内所有引用前缀**（先 rename 成功再改引用；失败保持旧名，宁旧不断链）。
  - **删项目 = 删目录**：`deleteProjectCascade` 里库记录删除**成功之后**才 `rm -rf`（顺序反了会「项目还在图没了」）。
  - 已否决：扁平内容寻址（翻不了目录）、语义化文件名（改名传染+孤儿）、`index.json`（保持精简）、导出时把文件名语义化（内部缓存与用户导出是两套，文件名各自独立）。
  - ⚠️ 协议现只认单层文件名（`resolveImagePath` 用 `path.basename` 相等做校验），支持三级路径时**不能只是放开**：
    kind + 文件名走白名单、目录名查 `..`、最后 `startsWith(root + sep)` 兜底。
  - 本次不做：项目内单张删图的孤儿清理（判孤儿需全项目扫引用）→ 阶段三 GC。
- `comicDb.getAllProjects()` 会把含 base64 的全量项目经 IPC 结构克隆给渲染层（项目首页 / 素材库 / 长资产库都调），列表其实只需要摘要。
- 公众号项目（`pageData` / `syncData` / `pageRefImages`）也内联图片，但上微信链路
  `useWechatUpload.extractLocalImagePaths` 只认 http/https/data → 外置需单独适配，建议放阶段二。
- **实测效果（2026-10-05 22:31 迁移后）**：长篇项目 **291.7 MB → 0.4 MB**（内联图 0 张），
  `comic-images/长篇__f43e36/` 落 24 张 / 103 MB。主库 527.7 MB → **221.9 MB**，剩余 211.7 MB 全部来自
  3 个公众号/短篇项目（财经 95.3/37张、卡通漫画 58.8/29张、公众号卡通漫画 36.9/15张，
  字段 `pageRefImages[].character[]` + `generatedImages`）—— 即上面「阶段二」那块，仍是内联 base64。
- 🔴 **回滚锚点已移除（2026-10-05 22:57 清理）**：`comic-gen.json.premigration.json`（527.7 MB）已由用户确认删除，
  **不能再回退到迁移前的内联版本**。同批清掉的还有 `comic-gen.json.bak` 527.7 MB（`cmp` 验证与 premigration 逐字节相同）、
  Chromium 缓存 438 MB、`image-studio/` 38 MB 旧历史。应用数据目录 1.92 GB → 389 MB。
  以后若要保留回滚能力，必须**自己复制一份 `comic-gen.json` 并连同 `comic-images/` 一起备份**（库本身已不含图片）。
- 清理前必须**完全退出应用**：生图工作台 history 缓存在内存，运行中删 `image-studio/` 会被内存数据重新写回。

## 图片外置 · 阶段二（2026-10-05 已实施，待实机验收）

范围从「仅长篇项目」扩到**全库**（公众号 / 短篇 / 顶层 `projectAssets` / `materials`）。

- `IMAGE_FIELD_KINDS` 增 `generatedImages` / `generatedCoverImage`（generated）、`referenceImage`（reference）；
  `collectImageFieldValue` 支持值的三形态（string / string[] / **string 字典**）；
  `pageRefImages`（`Record<页索引,{character,scene,prop}>`）单走 `collectPageRefImageRefs`
  —— `scene`/`prop` 太通用，**不能**进字段表（已写测试锁住）。
- `externalizeProjectImages` 遍历**整个 project**；抽出 `externalizeRefs` 供 project/asset/material 共用；
  新增 `externalizeAssetImages` / `externalizeMaterialImage`（`MaterialItem.url` 同理不能进表）。
- 新增 `externalizeAllImages()` + `persistProjectData()`：**所有涉及图片的项目库写入口**改 async 并走它
  （`saveProjectAsset` / `saveMaterial` / 各 `delete*` / `deleteProjectCascade`），IPC handler 同步 await。
  `migrateInlineImages` 判据换成 `hasInlineImagesInData(data)`。
- 微信上传：`assertLocalImagePath` 放行 `app-image://`，新增 `toDiskPath` 读盘前解析；`originalPath` 仍返回原串
  （HTML 的 `split().join()` 替换靠它命中）；渲染层 `extractLocalImagePaths` 对 `app-image://` **原样保留不解码**
  —— decode 后正文 src 与 `contentImagePaths` 对不上，微信正文会残留取不到的图。
- 🔴 **`syncData.imageSignature` 必须跟着刷新**：`stores/sync.ts` 判签名不一致会**清空用户编辑的
  `contentBlocks` / 容器样式 / 整份封面配置**。外置改路径 → 签名必变 → 不刷新就是拿用户成果换性能。
  已加 `refreshSyncImageSignature`（复现渲染层算法，只在原本就有签名时才写）。
- ⚠️ **写库返回值回写本地 ref 的手法**：这些 ref 挂 `watch → savePageData`，**整体替换 `ref.value` 会再触发保存 → 死循环**；
  必须 `Object.assign` 就地改属性（浅 watch 不感知）或「值真变了才回写」（`PageSync.doSave` 2 秒一次自动保存）。
  涉及：`usePageEditorPersistence.doSave`（300ms 防抖）、`PageSync.doSave`、`PageEditor` 绘图配置与参考图写回。
- 🔴 **导出下载链路必须适配（阶段一遗留回归，阶段二才补上）**：`comic-download.service.ts` 的 `downloadWithRetry`
  原只走 `axios.get`（网络 URL）。但 `LongProjectStoryboardTab.exportImages`（分镜成图）与
  `PageExport.handleZipExport`（公众号 `generatedImages`）把项目图片引用**直接**交给
  `downloadSingle` / `downloadBatch` —— 外置后是 `app-image://`，会失败。
  已修：命中外置引用时**直接读盘**（`resolveComicImageToFsPath`，含穿越校验），扩展名走 `imageExtension()`。
  **新增/改动任何「把项目图片 URL 交给主进程处理」的消费点时，先确认它认不认 `app-image://`。**
- 校验：全量 **534 测试通过**（42 文件）+ `vue-tsc --noEmit` 0 错误。预期 `comic-gen.json` 221.9MB → 约 10MB。
  ⚠️ 首次启动会再做一次迁移并**重新生成** `comic-gen.premigration.json`（旧那份已被清理删掉）。
- 🔴 **`app-image://` 协议响应必须带 CORS 头**（2026-10-05 收尾加固）：渲染层有三处要把图片**读回来**
  （`resolveModelInputImage` 参考图归一化、`useCoverGenerator` 封面裁剪、`PageExport.handleLongImageExport` 长图拼接），
  走 `fetch` → 不同源 → 缺 `Access-Control-Allow-Origin` 会被拦。`<img>` 走 no-cors 不受影响，
  所以**只会在「读取」时暴露**。`main.ts` 的 handler 已改为包一层新 `Response` 补头。
- **实机验收必查**：`fetch('app-image://…')` 能否读通（三处功能全依赖它，失败即生图报错/封面失败/长图失败）。


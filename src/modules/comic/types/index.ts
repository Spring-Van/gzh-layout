/**
 * Comic 模块类型定义
 * 从 comic-gen-ai 迁移，保持业务类型不变
 */

/** 共用属性插入到 Prompt JSON 的位置 */
export type PromptInsertPosition = 'front' | 'back'

/** 描述区输入来源 */
export type BlockContentSource = 'manual' | 'style_template'

/**
 * 项目级共用提示属性块
 */
export interface SharedPromptBlock {
  id: string
  name: string
  description: string
  enableRefImages: boolean
  referenceImages: string[]
  storageMode?: 'cloud' | 'local'
  insertPosition: PromptInsertPosition
  sortOrder: number
  contentSource?: BlockContentSource
  styleTemplateId?: string
}

export interface ImageGenConfig {
  id?: string
  imageModelId: string
  aspectRatio: string
  resolution: string
  quality?: string
  sharedBlocks?: SharedPromptBlock[]
  /** @deprecated 兼容旧数据 */
  paintingStyle?: string
  /** @deprecated 兼容旧数据 */
  styleReferenceImages?: string[]
  /** @deprecated 兼容旧数据 */
  styleReferenceDescription?: string
  /** @deprecated 兼容旧数据 */
  styleStorageMode?: 'cloud' | 'local'
  /** @deprecated 兼容旧数据 */
  promptPrefix?: string
  /** @deprecated 兼容旧数据 */
  promptSuffix?: string
}

export type ComicProjectType = 'short' | 'long'

export type LongProjectNodeType = 'folder' | 'chapter'
/** 章节起笔模式：source = 从原文开始（默认，走完整管线）；script = 从剧本开始（跳过原文，隐藏原文页签）。 */
export type LongChapterStartMode = 'source' | 'script'
export type LongChapterStage = 'empty' | 'source-ready' | 'analysis-ready' | 'script-ready' | 'storyboard-ready' | 'assets-ready' | 'prompts-ready' | 'completed'
/**
 * 章节阶段推进顺序（与创作管线一致：原文 → 分析 → 剧本 → 资产 → 分镜）。
 * 2026-09-18 起资产提取先于分镜生成（分镜需要注入本章资产清单）；顺序只升不降，
 * 旧数据的 stage 值不重排（indexOf 比较仍成立）；`prompts-ready` / `completed` 为预留终态。
 */
export const LONG_CHAPTER_STAGE_ORDER: LongChapterStage[] = ['empty', 'source-ready', 'analysis-ready', 'script-ready', 'assets-ready', 'storyboard-ready', 'prompts-ready', 'completed']
export type LongProjectAssetType = 'character' | 'scene' | 'prop'
export type AssetAttributeValueType = 'text' | 'tags' | 'number' | 'select'

/** 工作流为资产补充的业务字段。核心身份与视觉字段不在这里定义。 */
export interface AssetCustomFieldDefinition {
  key: string
  label: string
  appliesTo: LongProjectAssetType[]
  valueType: AssetAttributeValueType
  options?: string[]
  showInSummary?: boolean
}

export interface LongProjectAssetVariant {
  id: string
  name: string
  description?: string
  /** 剧情锚点：该状态何时/因何切换生效（提取候选 state.anchor 确认时带入），供分镜环节判断状态起止与延续。 */
  anchor?: string
  /** 当前视觉状态首次在何处确认，适用范围用于按章节生成分镜时自动推荐。 */
  firstAppearanceChapterId?: string
  chapterRange?: { startChapterId: string; endChapterId?: string }
  tags?: string[]
  imagePrompt?: string
  /** 生图工作台暂存：生成的图片与上传待选图，采纳后移入 referenceImageIds。 */
  generatedImageIds?: string[]
  referenceImageIds: string[]
  sourceChapterIds: string[]
  createdAt: number
  updatedAt: number
}

export interface LongProjectAsset {
  id: string
  type: LongProjectAssetType
  name: string
  /** 资产完整信息，保留提取结果中的 Markdown 内容。 */
  content?: string
  aliases: string[]
  description?: string
  fixedTraits: string[]
  /** 由提取工作流定义的扩展信息，例如门派、职业、身份谜团。 */
  attributes?: Record<string, string | string[] | number>
  attributeSchema?: AssetCustomFieldDefinition[]
  sourceChapterIds: string[]
  variants: LongProjectAssetVariant[]
  status: 'pending' | 'confirmed' | 'conflict'
  /** 章节提取结果默认是 chapter，显式同步后才进入 project 公共库。 */
  scope?: 'chapter' | 'project'
  createdAt: number
  updatedAt: number
}

/** 章节对项目资产及其视觉状态的引用。章节不复制资产本体，只记录本章采用的状态和原文依据。 */
export interface LongProjectChapterAsset {
  id: string
  chapterId: string
  assetId: string
  variantId?: string
  appearance: 'introduced' | 'reused' | 'changed'
  evidence: string[]
  chapterNote?: string
  sourceExtractionRunId?: string
  createdAt: number
  updatedAt: number
}

export type AssetExtractionCandidateDecision = 'pending' | 'create' | 'merge' | 'ignore'
export type AssetExtractionRunStatus = 'running' | 'completed' | 'failed' | 'confirmed'

/**
 * 章节级 AI 文档（原文分析 / 漫画剧本）：每章一份，可编辑，作为后续环节的上下文输入。
 * sourceContent 记录生成时的原文快照，用于检测"原文已变更"。
 */
export type ChapterDocKind = 'analysis' | 'script'

export interface LongProjectChapterDoc {
  id: string
  chapterId: string
  /** 当前内容（Markdown，可编辑） */
  content: string
  modelId: string
  templateId: string
  /** 实际发送的最终提示词快照（发送前确认可修改） */
  prompt: string
  /** 生成时的章节原文快照，用于检测原文已变更 */
  sourceContent: string
  sourceWordCount: number
  status: 'running' | 'completed' | 'failed'
  error?: string
  /** 来源：llm = 内置大模型生成；manual = 手动粘贴外部 AI 结果导入；handwritten = 本地直接手写。缺省视为 llm（旧数据兼容）。 */
  source?: 'llm' | 'manual' | 'handwritten'
  createdAt: number
  updatedAt: number
}

/** 单次提取出的一个视觉状态候选，含与项目已有状态的匹配建议。 */
export interface LongProjectExtractedState {
  id: string
  name: string
  description?: string
  /** 剧情锚点：该状态何时/因何切换生效（如「雨夜遇袭后斗篷破损，直至章末」），供分镜环节判断状态起止。 */
  anchor?: string
  imagePrompt?: string
  tags?: string[]
  /** 匹配到的项目已有视觉状态 id，确认时按该 id 归属。 */
  suggestedVariantId?: string
  /** model 表示模型沿用已有状态名精确命中；new 表示需要新建。 */
  matchSource: 'model' | 'new'
}

/** AI 从单个章节中识别出的资产候选项，确认前不会进入项目资产库。 */
export interface LongProjectAssetExtractionCandidate {
  id: string
  type: LongProjectAssetType
  name: string
  /** 资产完整信息，保留模型返回的 Markdown 内容。 */
  content: string
  aliases: string[]
  importance: 'major' | 'minor'
  description?: string
  evidence: string[]
  /** 本次提取出的全部视觉状态；旧数据只有 visualVersion 时按单状态兼容。 */
  states?: LongProjectExtractedState[]
  visualVersion?: {
    name: string
    description?: string
    imagePrompt?: string
    tags?: string[]
  }
  attributes?: Record<string, string | string[] | number>
  suggestedAssetId?: string
  decision: AssetExtractionCandidateDecision
  /** 该候选（名称/别名）在本章文本中的出现数（有分镜按分镜数、暂无分镜按剧本行数），确定性计算，供审核页参考重要性。 */
  panelAppearances?: number
}

export interface LongProjectStoryboardAssetBinding {
  assetId?: string
  assetName: string
  visualVersionId?: string
  visualVersionName?: string
  /** 由模型、章节范围、用户选择或文本自动识别得出的建议。 */
  matchSource: 'model' | 'chapter-range' | 'manual' | 'auto-text' | 'unmatched'
  referenceImageIds?: string[]
  /**
   * 本镜使用的参考图（**单选，至多一个元素**；在分镜资产卡里点选后写入）。
   * 为空 = 从未手动选过 → 取该视觉状态的**第一张**；选中的图被从资产里删除后同样回落第一张。
   * 之所以不物化「默认 = 第一张」这个结果，是为了让资产内的图换序/删除后本镜能自动跟随。
   * 与 referenceImageIds（绑定时的快照，仅作兜底）分开，避免"快照"与"本镜选择"两种语义混在一个字段。
   * 解析口径统一走 `resolvePanelRefImage`。
   */
  selectedImageIds?: string[]
}

/**
 * 页内一格（一张漫画图里的一个分格）。
 * 页块格式：一格一行 `①【镜头】画面`，台词行另行归属最近的格。
 */
export interface LongProjectStoryboardCell {
  /** 景别（远景/中景/近景/特写/POV/过肩/仰拍），画面描述层的占比与景深推导锚点 */
  shot?: string
  /** 运镜 / 机位（v4「镜头」字段），如「从角色A侧脸下摇至小臂」 */
  camera?: string
  /** 这一格画面上能看到什么（谁 + 在做什么 + 神态/情绪） */
  content: string
  /** 本格画面内出现的角色（多人用、分隔） */
  cast?: string
  /** 本格肢体动作 */
  action?: string
  /** 本格神态与情绪 */
  expression?: string
  /** 本格音效 */
  sfx?: string
  /** 本格光效 */
  lighting?: string
  /** 本格备注（画面上必须画出来的关键点） */
  note?: string
  /** 说话人：对白/心声/画外的角色名；无人称旁白时为空 */
  speaker?: string
  /** 台词方式：缺省 = 对白；心声 = 内心独白；画外 = 说话人不在画面内 */
  delivery?: '心声' | '画外'
  /** 本格台词（不含说话人前缀与引号） */
  dialogue?: string
  /** 本格无人称旁白 */
  narration?: string
  /**
   * 本格出场资产（v4「出场资产」字段，模型逐格声明 `资产名(状态名)`）。
   * 解析/编辑保存时汇总到页级 `panel.assetBindings`（同资产多格声明取最后一格 = 镜末状态）；
   * 系统还会逐格扫描画面、人物、动作、表情与备注，补齐模型漏写的 auto-text 绑定；
   * 两条通道在页级汇总，生图参考图与画面描述按格级状态并集消费。
   */
  assetBindings?: LongProjectStoryboardAssetBinding[]
}

export interface LongProjectStoryboardPanel {
  id: string
  order: number
  content: string
  shot?: string
  /** 对白：角色台词，由分镜解析器从 LLM 输出中提取 */
  dialogue?: string
  /** 旁白：叙述性文字，由分镜解析器从 LLM 输出中提取 */
  narration?: string
  imagePrompt?: string
  /**
   * 页内分格（页块格式）。旧数据与旧格式缺省，视为「整页 = 单格」。
   * 页级 content/shot/dialogue/narration 仍会同步汇总，保证既有消费方无需改动。
   */
  cells?: LongProjectStoryboardCell[]
  /** 页头声明的格数标签（`## 分镜 1 · 双格` 里的「双格」）；旧数据缺省，展示时按 cells 长度推导 */
  cellLabel?: string
  assetBindings: LongProjectStoryboardAssetBinding[]
}

export interface LongProjectStoryboardRun {
  id: string
  chapterId: string
  sourceContent: string
  modelId: string
  templateId: string
  prompt: string
  status: 'running' | 'completed' | 'failed'
  panels: LongProjectStoryboardPanel[]
  rawResponse?: string
  error?: string
  /** 来源：llm = 内置大模型生成；manual = 手动粘贴外部 AI 结果导入。缺省视为 llm。 */
  source?: 'llm' | 'manual'
  createdAt: number
  updatedAt: number
}

/** 章节资产提取任务：保留输入快照，便于内容变更后重新核对。 */
export interface LongProjectAssetExtractionRun {
  id: string
  chapterId: string
  sourceContent: string
  sourceWordCount: number
  modelId: string
  templateId: string
  /** 实际发送给模型的最终提示词，可能在发送前确认时被临时修改。 */
  prompt: string
  status: AssetExtractionRunStatus
  candidates: LongProjectAssetExtractionCandidate[]
  rawResponse?: string
  error?: string
  /** 来源：llm = 内置大模型生成；manual = 手动粘贴外部 AI 结果导入。缺省视为 llm。 */
  source?: 'llm' | 'manual'
  createdAt: number
  updatedAt: number
}

/** 资产提示词批量生成任务：记录模型与模板选择及原始返回，便于追溯重跑。 */
export interface AssetPromptRun {
  id: string
  chapterId: string
  modelId: string
  templateId: string
  /** 实际发送的最终提示词，发送前可临时修改。 */
  prompt: string
  /** 生成目标：资产 id → 视觉状态 id 列表；为空表示整章全部状态。 */
  targets?: Record<string, string[]>
  status: 'running' | 'completed' | 'failed'
  rawResponse?: string
  error?: string
  createdAt: number
  updatedAt: number
}

export type PanelPromptStatus = 'none' | 'pending' | 'running' | 'done' | 'failed' | 'stale'
export type PanelGenStatus = 'none' | 'running' | 'done' | 'failed'

/**
 * 分镜画面：按分镜 panelId 关联的推导描述与成图。
 * 独立于 storyboardRuns 快照存储——重跑分镜不会丢掉已推导描述与成图（内容变化时标记 stale）。
 */
export interface LongProjectPanelArtwork {
  /** 对应 LongProjectStoryboardPanel.id */
  panelId: string
  chapterId: string
  /** 依次推导（或人工编辑）出的画面描述 */
  imagePrompt?: string
  promptSource?: 'inferred' | 'manual'
  promptStatus: PanelPromptStatus
  /** 当前分镜核心参考图的手动顺序（存稳定 key；图片增删后保留仍有效项，其余按默认顺序追加）。 */
  referenceImageOrder?: string[]
  /** 成图暂存：候选图列表，采纳后写 selectedImageId */
  generatedImageIds?: string[]
  selectedImageId?: string
  genStatus: PanelGenStatus
  updatedAt: number
}

/** 资产生图任务：基于视觉状态的参考图生成记录。 */
export interface AssetGenTask {
  id: string
  projectId: string
  chapterId?: string
  assetId: string
  variantId: string
  prompt: string
  refImages: string[]
  taskId?: string
  status: 'pending' | 'running' | 'done' | 'failed'
  resultImageUrl?: string
  error?: string
  createdAt: number
  updatedAt: number
}

/** 资产生图配置：项目级默认值，工作台中可单次覆盖。 */
export interface AssetGenConfig {
  /** 生图模型 id */
  imageModelId: string
  /** 提示词生成用 LLM 模型 id */
  promptModelId?: string
  /** 提示词模板 id */
  promptTemplateId?: string
  aspectRatio: string
  resolution: string
  quality?: string
  /** 批量生图并发数 */
  concurrency?: number
}

export interface LongProjectNode {
  id: string
  type: LongProjectNodeType
  name: string
  parentId: string | null
  order: number
  content?: string
  stage?: LongChapterStage
  /** 起笔模式：缺省视为 source（旧数据兼容）。script 模式下主页面隐藏「原文」页签。 */
  startMode?: LongChapterStartMode
  createdAt: number
  updatedAt: number
}

export interface LongProjectData {
  nodes: LongProjectNode[]
  /** 项目级资产库，章节解析结果最终汇总到这里 */
  assets?: LongProjectAsset[]
  /** 每章实际采用的资产和视觉状态，用于章节管理与分镜生成。 */
  chapterAssets?: LongProjectChapterAsset[]
  /** 各章节待审核或已确认的资产提取任务 */
  assetExtractionRuns?: LongProjectAssetExtractionRun[]
  storyboardRuns?: LongProjectStoryboardRun[]
  /** 分镜画面（描述推导 + 成图），按 panelId 关联分镜 */
  panelArtworks?: LongProjectPanelArtwork[]
  /** 资产提示词生成任务（按章） */
  assetPromptRuns?: AssetPromptRun[]
  /** 资产生图配置（项目级默认） */
  assetGenConfig?: AssetGenConfig
  /** 每章一份的原文分析文档（管线第一环节产物） */
  chapterAnalyses?: LongProjectChapterDoc[]
  /** 每章一份的漫画剧本文档（管线第二环节产物） */
  chapterScripts?: LongProjectChapterDoc[]
}

export interface ComicProject {
  id: string
  name: string
  /** 旧项目没有该字段时按短篇处理 */
  projectType?: ComicProjectType
  longProjectData?: LongProjectData
  description?: string
  coverImage?: string
  comicConfig?: {
    premise: string
    paintingStyle: string
    worldSetting: string
    basicFormat: string
  }
  imageGenConfig?: ImageGenConfig
  pageData?: {
    title: string
    summary: string
    pages: Record<string, unknown>[]
    assetDefinitions?: {
      人物设定?: unknown[]
      场景设定?: unknown[]
      物品设定?: unknown[]
    }
  }
  publishData?: {
    title: string
    tags: string[]
    creativeNotes: Record<string, string>
  }
  /** 同步至公众号的编辑数据（PageSync 页面持久化） */
  syncData?: ComicSyncData
  generatedImages?: Record<string, string>
  pageModelOverrides?: Record<string, string>
  pageRefImages?: Record<number, { character: string[]; scene: string[]; prop: string[] }>
  createdAt: number
  updatedAt: number
}

export type ModelCategory = 'llm' | 'image' | 'video'
export type ApiFormat = 'openai' | 'gemini' | 'claude'
/** 图片接口来源。agnes 使用 Agnes Image generations API。 */
export type ApiSource = 'grsai' | 'duomi' | 'openai' | 'agnes'

export interface ModelConfig {
  id: string
  name: string
  apiFormat?: ApiFormat
  apiSource?: ApiSource
  model: string
  baseUrl: string
  apiKey: string
  category: ModelCategory
  /**
   * 绕过系统代理，强制直连。
   * 用于本机代理（Clash / v2ray 等）对某个 API 域名线路不通的场景 ——
   * 那种情况下请求会以 `net::ERR_CONNECTION_CLOSED` 失败，而直连正常。
   */
  bypassProxy?: boolean
  aspectRatios?: string
  resolutions?: string
  qualities?: string
  openaiExtraParams?: string
  sortOrder: number
  createdAt: number
  updatedAt: number
}

export interface OpenAIImageParams {
  outputFormat?: 'png' | 'jpeg' | 'webp'
  n?: number
  moderation?: 'auto' | 'low'
  outputCompression?: number
  compatibleMode?: boolean
}

export type TemplateType = 'style' | 'extract' | 'story' | 'storyboard' | 'asset-prompt' | 'panel-prompt' | 'panel-prompt-chapter' | 'analysis' | 'script'

export interface PromptTemplate {
  id: string
  name: string
  type: TemplateType
  description: string
  /**
   * 提示词内容，也是**唯一的提示词来源**：变量、写作要求、返回格式约定全部写在这里。
   * 以前单独的 `outputProtocol` 字段已废弃 —— 返回格式（统一 Markdown）直接写进本字段，
   * 由推荐模板自带（见 promptTemplateRegistry 的 OUTPUT_FORMAT_SPECS）。
   */
  content: string
  sortOrder: number
  createdAt: number
  updatedAt: number
}

export type AssetType = 'character' | 'scene' | 'prop' | 'outfit'

export interface Outfit {
  id: string
  name: string
  description: string
  referenceImage: string
  referenceImageDesc: string
  syncedToLibrary?: boolean
}

export interface MaterialItem {
  id: string
  projectId: string
  url: string
  name: string
  assetType: AssetType
  sourceAssetId?: string
  sourceOutfitId?: string
  createdAt: number
}

export interface ProjectAsset {
  id: string
  projectId: string
  type: AssetType
  code: string
  name: string
  description: string
  prompt: string
  referenceImages: string[]
  referenceImageDescs?: string[]
  useGlobalDesc?: boolean
  globalDesc?: string
  generatedImages: string[]
  aiGenerated: boolean
  sortOrder: number
  outfits?: Outfit[]
  insertOutfitDescription?: boolean
  insertCharacterDescription?: boolean
  createdAt: number
  updatedAt: number
}

/** 生图任务记录 */
export interface GenerationTask {
  id: string
  projectId: string
  pageIndex: number
  prompt: string
  refImages: string[]
  taskId?: string
  status: 'pending' | 'running' | 'done' | 'failed'
  resultImageUrl?: string
  error?: string
  createdAt: number
  updatedAt: number
}

// ========== 同步至公众号（PageSync） ==========

/** 内容块类型（结构对齐 src/types ContentBlock，保持 comic 模块类型自包含） */
export interface ComicContentBlock {
  id: string
  type: 'image' | 'html' | 'text' | 'empty'
  content: string
  html?: string
  imagePath?: string
  imageName?: string
  align?: 'left' | 'center' | 'right'
  styleInsertPosition?: 'header' | 'between' | 'footer'
}

/** 样式插入配置（单篇） */
export interface ComicStyleInsertItem {
  enabled: boolean
  position: 'header' | 'between' | 'footer'
  templateIds: string[]
}

/** 封面裁剪矩形 */
export interface ComicCropRect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * 同步至公众号的编辑数据
 * 用于 PageSync 页面，持久化到 ComicProject.syncData
 */
export interface ComicSyncData {
  /** 文章标题 */
  title: string
  /** 文章摘要 */
  subtitle: string
  /** 原文链接 */
  sourceUrl?: string
  /** 封面配置 */
  cover: {
    templateId: string
    selectedImageIds: string[]
    pic_crop_235_1?: string
    pic_crop_1_1?: string
    generatedCoverImage?: string
    generatedCoverImagePath?: string
    imageCropRects?: Record<number, ComicCropRect>
  }
  /** 排版配置 */
  layout: {
    templateId: string
  }
  /** 样式插入配置 */
  styleInsert: {
    header: ComicStyleInsertItem
    footer: ComicStyleInsertItem
    between: ComicStyleInsertItem
  }
  /** 正文内容块（用户编辑后） */
  contentBlocks: ComicContentBlock[]
  /** 正文容器样式 */
  containerStyle: Record<string, string>
  /** 上次使用的公众号账号 ID */
  wechatAccountId?: string
  /** 上次保存时的图片路径签名（用于检测重新解析/生图后图片是否变化） */
  imageSignature?: string
}

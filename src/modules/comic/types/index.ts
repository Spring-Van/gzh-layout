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
export type LongChapterStage = 'empty' | 'source-ready' | 'assets-ready' | 'storyboard-ready' | 'prompts-ready' | 'completed'
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

export interface AssetExtractionConfig {
  enabledTypes: LongProjectAssetType[]
  includeVisualVersion: boolean
  customFields: AssetCustomFieldDefinition[]
}

export interface LongProjectAssetVariant {
  id: string
  name: string
  description?: string
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

/** 单次提取出的一个视觉状态候选，含与项目已有状态的匹配建议。 */
export interface LongProjectExtractedState {
  id: string
  name: string
  description?: string
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
}

export interface LongProjectStoryboardAssetBinding {
  assetId?: string
  assetName: string
  visualVersionId?: string
  visualVersionName?: string
  /** 由模型、章节范围或用户选择得出的建议。 */
  matchSource: 'model' | 'chapter-range' | 'manual' | 'unmatched'
  referenceImageIds?: string[]
}

export interface LongProjectStoryboardPanel {
  id: string
  order: number
  content: string
  shot?: string
  imagePrompt?: string
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
  extractionConfig?: AssetExtractionConfig
  /** 实际发送给模型的最终提示词，可能在发送前确认时被临时修改。 */
  prompt: string
  status: AssetExtractionRunStatus
  candidates: LongProjectAssetExtractionCandidate[]
  rawResponse?: string
  error?: string
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
export type ApiSource = 'grsai' | 'xiguapi' | 'duomi' | 'openai'

export interface ModelConfig {
  id: string
  name: string
  apiFormat?: ApiFormat
  apiSource?: ApiSource
  model: string
  baseUrl: string
  apiKey: string
  category: ModelCategory
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

export type TemplateType = 'style' | 'extract' | 'story' | 'storyboard' | 'asset-prompt' | 'panel-prompt'

export interface PromptTemplate {
  id: string
  name: string
  type: TemplateType
  description: string
  content: string
  /** 仅资产提取模板使用。核心资产协议由系统固定，模板只配置提取范围与扩展字段。 */
  assetExtractionConfig?: AssetExtractionConfig
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

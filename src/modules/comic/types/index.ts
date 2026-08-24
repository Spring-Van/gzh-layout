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

export interface LongProjectAssetVariant {
  id: string
  name: string
  description?: string
  referenceImageIds: string[]
  sourceChapterIds: string[]
  createdAt: number
  updatedAt: number
}

export interface LongProjectAsset {
  id: string
  type: LongProjectAssetType
  name: string
  aliases: string[]
  description?: string
  fixedTraits: string[]
  sourceChapterIds: string[]
  variants: LongProjectAssetVariant[]
  status: 'pending' | 'confirmed' | 'conflict'
  createdAt: number
  updatedAt: number
}

export type AssetExtractionCandidateDecision = 'pending' | 'create' | 'merge' | 'ignore'
export type AssetExtractionRunStatus = 'running' | 'completed' | 'failed' | 'confirmed'

/** AI 从单个章节中识别出的资产候选项，确认前不会进入项目资产库。 */
export interface LongProjectAssetExtractionCandidate {
  id: string
  type: LongProjectAssetType
  name: string
  aliases: string[]
  importance: 'major' | 'minor'
  description?: string
  evidence: string[]
  visualVersion?: {
    name: string
    description?: string
    imagePrompt?: string
  }
  suggestedAssetId?: string
  decision: AssetExtractionCandidateDecision
}

/** 章节资产提取任务：保留输入快照，便于内容变更后重新核对。 */
export interface LongProjectAssetExtractionRun {
  id: string
  chapterId: string
  sourceContent: string
  sourceWordCount: number
  modelId: string
  templateId: string
  status: AssetExtractionRunStatus
  candidates: LongProjectAssetExtractionCandidate[]
  rawResponse?: string
  error?: string
  createdAt: number
  updatedAt: number
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
  /** 各章节待审核或已确认的资产提取任务 */
  assetExtractionRuns?: LongProjectAssetExtractionRun[]
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

export type TemplateType = 'style' | 'extract' | 'story' | 'storyboard'

export interface PromptTemplate {
  id: string
  name: string
  type: TemplateType
  description: string
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

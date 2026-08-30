import { v4 as uuidv4 } from 'uuid'
import { llmService } from './llmService'
import type {
  LongProjectAsset,
  LongProjectAssetExtractionCandidate,
  LongProjectAssetType,
  LongProjectExtractedState,
  ModelConfig,
  PromptTemplate,
} from '@comic/types'

interface ModelAsset {
  type?: string
  name?: string
  aliases?: unknown
  importance?: string
  description?: string
  evidence?: unknown
  visualVersion?: { name?: string; description?: string; imagePrompt?: string }
  attributes?: unknown
}

const supportedTypes = new Set<LongProjectAssetType>(['character', 'scene', 'prop'])

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[\s　]+/g, '')
}

function extractJson(content: string): unknown {
  const withoutFence = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try { return JSON.parse(withoutFence) } catch { /* Try the JSON object within an otherwise valid response. */ }
  const start = withoutFence.indexOf('{')
  const end = withoutFence.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('模型未返回有效 JSON，请调整提示词后重试。')
  return JSON.parse(withoutFence.slice(start, end + 1))
}

function toStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean) : []
}

function normalizeAttributes(value: unknown): Record<string, string | string[] | number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const source = value as Record<string, unknown>
  return Object.entries(source).reduce<Record<string, string | string[] | number>>((result, [key, raw]) => {
    if (typeof raw === 'string' || typeof raw === 'number') result[key] = raw
    else if (Array.isArray(raw)) result[key] = toStrings(raw)
    return result
  }, {})
}

function matchExistingAsset(candidate: Pick<LongProjectAssetExtractionCandidate, 'type' | 'name' | 'aliases'>, assets: LongProjectAsset[]): string | undefined {
  const names = new Set([candidate.name, ...candidate.aliases].map(normalize).filter(Boolean))
  return assets.find((asset) => asset.type === candidate.type && [asset.name, ...asset.aliases].some((name) => names.has(normalize(name))))?.id
}

function typeFromHeading(value: string): LongProjectAssetType | undefined {
  const key = value.trim().replace(/[：:]/g, '')
  return key === '人物' ? 'character' : key === '场景' ? 'scene' : key === '道具' ? 'prop' : undefined
}

function splitValue(value: string): string[] { return value.split(/[、,，；;\n]/).map((item) => item.trim()).filter(Boolean) }

/**
 * 按名称取视觉状态，不存在时新建。
 * 模型可能同时以「- 视觉状态：X」字段和「### 视觉状态：X」标题输出同一状态，需按名称去重，避免产生多余的空状态。
 */
function getOrCreateState(candidate: LongProjectAssetExtractionCandidate, name: string): LongProjectExtractedState {
  const trimmed = name.trim()
  const existing = candidate.states?.find((state) => state.name.trim() === trimmed)
  if (existing) return existing
  const state: LongProjectExtractedState = { id: uuidv4(), name: trimmed, description: '', imagePrompt: '', matchSource: 'new' }
  candidate.states = [...(candidate.states ?? []), state]
  return state
}

function parseChineseAssetReport(content: string): LongProjectAssetExtractionCandidate[] {
  let currentType: LongProjectAssetType | undefined
  let current: LongProjectAssetExtractionCandidate | undefined
  let currentState: LongProjectExtractedState | undefined
  let contentLines: string[] = []
  /** 状态字段出现在 ### 视觉状态 标题之前时先缓冲，待标题创建状态后回填 */
  let pendingStateFields: { description?: string; imagePrompt?: string; tags?: string[] } = {}
  const result: LongProjectAssetExtractionCandidate[] = []
  /** 将缓冲字段填充到状态（仅补空缺，不覆盖块内已有值） */
  const applyPendingFields = (state: LongProjectExtractedState) => {
    if (pendingStateFields.description && !state.description) state.description = pendingStateFields.description
    if (pendingStateFields.imagePrompt && !state.imagePrompt) state.imagePrompt = pendingStateFields.imagePrompt
    if (pendingStateFields.tags?.length && !state.tags) state.tags = pendingStateFields.tags
    pendingStateFields = {}
  }
  const flush = () => {
    if (current && currentType) {
      // 前导字段未被任何标题消费：落到默认状态，避免数据丢失
      if (pendingStateFields.description || pendingStateFields.imagePrompt || pendingStateFields.tags?.length) {
        applyPendingFields(getOrCreateState(current, '默认状态'))
      }
      result.push({ ...current, content: contentLines.join('\n').trim() })
    }
    current = undefined
    currentState = undefined
    contentLines = []
    pendingStateFields = {}
  }
  for (const rawLine of content.replace(/\r/g, '').split('\n')) {
    const line = rawLine.trim()
    const heading = line.match(/^#\s+(.+)$/)
    if (heading) { flush(); currentType = typeFromHeading(heading[1]); continue }
    const item = line.match(/^##\s+(.+)$/)
    if (item && currentType) {
      flush()
      current = { id: uuidv4(), type: currentType, name: item[1].trim(), content: '', aliases: [], importance: 'major', description: '', evidence: [], attributes: {}, states: [], decision: 'create' }
      continue
    }
    // ### 视觉状态：xxx → 开启一个新状态块；同名状态已存在（如已按字段形式输出）时复用
    const stateHeading = line.match(/^###\s*(?:视觉状态|视觉版本)[：:]\s*(.+)$/)
    if (stateHeading && current) {
      currentState = getOrCreateState(current, stateHeading[1])
      applyPendingFields(currentState)
      contentLines.push(rawLine)
      continue
    }
    if (current) contentLines.push(rawLine)
    const field = line.match(/^[-*]\s*([^：:]+)[：:]\s*(.*)$/)
    if (!field || !current) continue
    const key = field[1].trim(); const value = field[2].trim()
    if (key === '别名') current.aliases = splitValue(value)
    else if (key === '原文依据') current.evidence = splitValue(value)
    else if (key === '重要性') current.importance = value === '次要' || value === 'minor' ? 'minor' : 'major'
    else if (key === '描述' || key === '资产描述') current.description = value
    else if (key === '视觉状态' || key === '视觉版本') {
      // 兼容旧协议：单状态字段形式；同名状态已存在（如已有 ### 标题块）时复用，避免重复
      currentState = getOrCreateState(current, value)
      applyPendingFields(currentState)
    } else if (key === '视觉描述') {
      // 字段可能出现在状态标题之前（资产字段位置），缓冲待回填，避免丢失
      if (currentState) currentState.description = value
      else pendingStateFields.description = value
    } else if (key === '绘画提示词') {
      if (currentState) currentState.imagePrompt = value
      else pendingStateFields.imagePrompt = value
    } else if (key === '状态标签') {
      if (currentState) currentState.tags = splitValue(value)
      else pendingStateFields.tags = splitValue(value)
    } else if (value) current.attributes = { ...current.attributes, [key]: value }
  }
  flush()
  return result.filter((item) => item.name)
}

function parseLegacyJson(content: string): LongProjectAssetExtractionCandidate[] {
  const parsed = extractJson(content) as { assets?: unknown }
  if (!Array.isArray(parsed.assets)) throw new Error('模型返回格式无法识别，请使用系统输出协议重试。')

  return parsed.assets.reduce<LongProjectAssetExtractionCandidate[]>((result, item) => {
    const asset = item as ModelAsset
    const type = asset.type as LongProjectAssetType
    const name = typeof asset.name === 'string' ? asset.name.trim() : ''
    if (!supportedTypes.has(type) || !name) return result
    const candidate: LongProjectAssetExtractionCandidate = {
      id: uuidv4(),
      type,
      name,
      content: typeof (asset as ModelAsset & { content?: unknown }).content === 'string' ? (asset as ModelAsset & { content: string }).content.trim() : '',
      aliases: toStrings(asset.aliases),
      importance: asset.importance === 'minor' ? 'minor' : 'major',
      description: typeof asset.description === 'string' ? asset.description.trim() : '',
      evidence: toStrings(asset.evidence),
      attributes: normalizeAttributes(asset.attributes),
      decision: 'create',
    }
    if (asset.visualVersion?.name?.trim()) {
      candidate.visualVersion = {
        name: asset.visualVersion.name.trim(),
        description: asset.visualVersion.description?.trim() || '',
        imagePrompt: asset.visualVersion.imagePrompt?.trim() || '',
      }
      candidate.states = [{ id: uuidv4(), ...candidate.visualVersion, matchSource: 'new' }]
    }
    result.push(candidate)
    return result
  }, [])
}

/** 取候选的全部视觉状态；旧数据只有 visualVersion 时按单状态兼容。 */
export function getCandidateStates(candidate: LongProjectAssetExtractionCandidate): LongProjectExtractedState[] {
  if (candidate.states?.length) return candidate.states
  return candidate.visualVersion?.name.trim() ? [{ id: candidate.id, ...candidate.visualVersion, matchSource: 'new' }] : []
}

/** 状态名与项目已有视觉状态匹配：精确 → 归一化（去空格/大小写） */
function matchExistingVariant(state: LongProjectExtractedState, asset: LongProjectAsset): string | undefined {
  return asset.variants.find((variant) => variant.name.trim() === state.name.trim())?.id
    ?? asset.variants.find((variant) => normalize(variant.name) === normalize(state.name))?.id
}

export function parseAssetExtractionResponse(content: string, existingAssets: LongProjectAsset[]): LongProjectAssetExtractionCandidate[] {
  let candidates: LongProjectAssetExtractionCandidate[]
  try { candidates = parseChineseAssetReport(content) } catch { candidates = [] }
  if (!candidates.length) candidates = parseLegacyJson(content)
  return candidates.map((candidate) => {
    const suggestedAssetId = matchExistingAsset(candidate, existingAssets)
    if (!suggestedAssetId) return candidate
    const asset = existingAssets.find((item) => item.id === suggestedAssetId)
    if (!asset) return { ...candidate, suggestedAssetId, decision: 'merge' }
    // 状态级匹配：模型沿用了已有状态名时标记归属，避免确认时新建重复状态
    const states = getCandidateStates(candidate).map((state) => {
      const suggestedVariantId = matchExistingVariant(state, asset)
      return suggestedVariantId ? { ...state, suggestedVariantId, matchSource: 'model' as const } : state
    })
    return { ...candidate, suggestedAssetId, decision: 'merge', states }
  })
}

export function buildAssetExtractionPrompt(templateContent: string, chapterContent: string, existingAssets: LongProjectAsset[] = []): string {
  const template = templateContent.includes('{{chapter_content}}')
    ? templateContent.replace(/\{\{chapter_content\}\}/g, chapterContent)
    : `${templateContent}\n\n【章节原文】\n${chapterContent}`
  const assetContext = existingAssets.length
    ? `\n\n【项目已有资产】\n${existingAssets.map((asset) => {
        const states = asset.variants.map((variant) => variant.name).join('、') || '无'
        return `- ${asset.name}（${asset.type === 'character' ? '人物' : asset.type === 'scene' ? '场景' : '道具'}；已有视觉状态：${states}）`
      }).join('\n')}\n规则：资产已存在且本章外观未变化时，视觉状态名必须与已有状态名完全一致；仅当原文出现明确外观变化时才新建视觉状态。\n`
    : ''
  return `${template}${assetContext}\n\n【系统固定输出协议】\n只输出中文 Markdown，不要解释、代码块或 JSON。\n一级标题只能是 # 人物、# 场景、# 道具；没有该类资产则不输出该标题。\n每项资产必须以 ## 资产名称 开始；其余信息每行写为 - 属性名：属性内容。\n每个视觉状态必须以 ### 视觉状态：状态名 单独成块，块内使用字段：视觉描述、状态标签、绘画提示词；同一资产可输出多个视觉状态。\n系统识别字段：姓名、别名、重要性（主要/次要）、描述、原文依据、视觉描述、状态标签、绘画提示词；视觉状态只能通过 ### 视觉状态：状态名 标题声明，不要以字段形式重复输出。\n除系统识别字段外，你可根据模板规则自由输出中文属性，例如门派、身份关系、境界、材质、时代、氛围。\n视觉状态表示该资产在当前剧情中的稳定外观或形态，如“少年期·布衣”“宗门弟子服”“战损”；正面、侧面、背面属于同一状态的参考图，不要单列为状态。\n只基于原文明确内容，不要编造。`
}

export async function extractChapterAssets(options: {
  model: ModelConfig
  template: PromptTemplate
  chapterContent: string
  existingAssets: LongProjectAsset[]
  prompt?: string
}) {
  const prompt = options.prompt ?? buildAssetExtractionPrompt(options.template.content, options.chapterContent, options.existingAssets)
  const result = await llmService.call({ modelConfig: options.model, userMessage: prompt })
  if (!result.success || !result.content) throw new Error(result.error || '模型没有返回内容')
  return { rawResponse: result.content, candidates: parseAssetExtractionResponse(result.content, options.existingAssets) }
}

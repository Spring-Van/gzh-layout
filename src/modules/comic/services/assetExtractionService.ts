import { v4 as uuidv4 } from 'uuid'
import { llmService } from './llmService'
import { defaultTemplateContent, renderPromptTemplate } from './promptTemplateRegistry'
import type {
  LongProjectAsset,
  LongProjectAssetExtractionCandidate,
  LongProjectAssetType,
  LongProjectExtractedState,
  LongProjectStoryboardCell,
  LongProjectStoryboardPanel,
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

/** 单个资产候选的字段解析结果；importance 未出现对应行时为 undefined，便于调用方保留旧值。 */
export interface ParsedCandidateFields {
  aliases: string[]
  importance?: 'major' | 'minor'
  description: string
  evidence: string[]
  attributes: Record<string, string | string[] | number>
  states: LongProjectExtractedState[]
}

/**
 * 解析单个资产候选的 Markdown 正文（## 标题之后的内容），提取字段与视觉状态。
 * 供审核页在编辑资产信息后同步下方结构化数据；与 serializeCandidateContent 可互相往返。
 */
export function parseCandidateContent(content: string): ParsedCandidateFields {
  let currentState: LongProjectExtractedState | undefined
  /** 状态字段出现在 ### 视觉状态 标题之前时先缓冲，待标题创建状态后回填 */
  let pendingStateFields: { description?: string; imagePrompt?: string; tags?: string[] } = {}
  const result: ParsedCandidateFields = { aliases: [], description: '', evidence: [], attributes: {}, states: [] }
  /**
   * 按名称取视觉状态，不存在时新建。
   * 模型可能同时以「- 视觉状态：X」字段和「### 视觉状态：X」标题输出同一状态，需按名称去重，避免产生多余的空状态。
   */
  const getOrCreateState = (name: string): LongProjectExtractedState => {
    const trimmed = name.trim()
    const existing = result.states.find((state) => state.name.trim() === trimmed)
    if (existing) return existing
    const state: LongProjectExtractedState = { id: uuidv4(), name: trimmed, description: '', imagePrompt: '', matchSource: 'new' }
    result.states.push(state)
    return state
  }
  /** 将缓冲字段填充到状态（仅补空缺，不覆盖块内已有值） */
  const applyPendingFields = (state: LongProjectExtractedState) => {
    if (pendingStateFields.description && !state.description) state.description = pendingStateFields.description
    if (pendingStateFields.imagePrompt && !state.imagePrompt) state.imagePrompt = pendingStateFields.imagePrompt
    if (pendingStateFields.tags?.length && !state.tags) state.tags = pendingStateFields.tags
    pendingStateFields = {}
  }
  for (const rawLine of content.replace(/\r/g, '').split('\n')) {
    const line = rawLine.trim()
    // ### 视觉状态：xxx → 开启一个新状态块；同名状态已存在（如已按字段形式输出）时复用
    const stateHeading = line.match(/^###\s*(?:视觉状态|视觉版本)[：:]\s*(.+)$/)
    if (stateHeading) {
      currentState = getOrCreateState(stateHeading[1])
      applyPendingFields(currentState)
      continue
    }
    const field = line.match(/^[-*]\s*([^：:]+)[：:]\s*(.*)$/)
    if (!field) continue
    const key = field[1].trim(); const value = field[2].trim()
    if (key === '别名') result.aliases = splitValue(value)
    else if (key === '原文依据') result.evidence = splitValue(value)
    else if (key === '重要性') result.importance = value === '次要' || value === 'minor' ? 'minor' : 'major'
    else if (key === '描述' || key === '资产描述') result.description = value
    else if (key === '视觉状态' || key === '视觉版本') {
      // 兼容旧协议：单状态字段形式；同名状态已存在（如已有 ### 标题块）时复用，避免重复
      currentState = getOrCreateState(value)
      applyPendingFields(currentState)
    } else if (key === '视觉描述') {
      // 字段可能出现在状态标题之前（资产字段位置），缓冲待回填，避免丢失
      if (currentState) currentState.description = value
      else pendingStateFields.description = value
    } else if (key === '绘画提示词') {
      // 向后兼容：提取阶段已不再要求输出绘画提示词（改由「资产绘画提示词」环节基于视觉描述生成），
      // 但旧协议结果与手动导入的 Markdown 仍可能带此字段，照旧解析，避免已有数据丢失。
      if (currentState) currentState.imagePrompt = value
      else pendingStateFields.imagePrompt = value
    } else if (key === '状态标签') {
      if (currentState) currentState.tags = splitValue(value)
      else pendingStateFields.tags = splitValue(value)
    } else if (value) result.attributes = { ...result.attributes, [key]: value }
  }
  // 前导字段未被任何标题消费：落到默认状态，避免数据丢失
  if (pendingStateFields.description || pendingStateFields.imagePrompt || pendingStateFields.tags?.length) {
    applyPendingFields(getOrCreateState('默认状态'))
  }
  return result
}

/** 将候选资产的字段与视觉状态序列化为 Markdown 内容；供视觉状态弹窗编辑后回写资产信息。 */
export function serializeCandidateContent(candidate: LongProjectAssetExtractionCandidate): string {
  const lines: string[] = []
  if (candidate.aliases.length) lines.push(`- 别名：${candidate.aliases.join('、')}`)
  lines.push(`- 重要性：${candidate.importance === 'minor' ? '次要' : '主要'}`)
  if (candidate.description) lines.push(`- 描述：${candidate.description}`)
  if (candidate.evidence.length) lines.push(`- 原文依据：${candidate.evidence.join('、')}`)
  for (const [key, value] of Object.entries(candidate.attributes ?? {})) {
    if (Array.isArray(value)) { if (value.length) lines.push(`- ${key}：${value.join('、')}`) }
    else if (value !== '' && value !== null && value !== undefined) lines.push(`- ${key}：${String(value)}`)
  }
  for (const state of getCandidateStates(candidate)) {
    lines.push('', `### 视觉状态：${state.name.trim()}`)
    if (state.description) lines.push(`- 视觉描述：${state.description}`)
    if (state.tags?.length) lines.push(`- 状态标签：${state.tags.join('、')}`)
    if (state.imagePrompt) lines.push(`- 绘画提示词：${state.imagePrompt}`)
  }
  return lines.join('\n')
}

function parseChineseAssetReport(content: string): LongProjectAssetExtractionCandidate[] {
  let currentType: LongProjectAssetType | undefined
  let currentName = ''
  let contentLines: string[] = []
  const result: LongProjectAssetExtractionCandidate[] = []
  const flush = () => {
    if (currentType && currentName) {
      const body = contentLines.join('\n')
      const parsed = parseCandidateContent(body)
      result.push({
        id: uuidv4(), type: currentType, name: currentName, content: body.trim(),
        aliases: parsed.aliases, importance: parsed.importance ?? 'major', description: parsed.description,
        evidence: parsed.evidence, attributes: parsed.attributes, states: parsed.states, decision: 'create',
      })
    }
    currentName = ''
    contentLines = []
  }
  for (const rawLine of content.replace(/\r/g, '').split('\n')) {
    const line = rawLine.trim()
    const heading = line.match(/^#\s+(.+)$/)
    if (heading) { flush(); currentType = typeFromHeading(heading[1]); continue }
    const item = line.match(/^##\s+(.+)$/)
    if (item && currentType) { flush(); currentName = item[1].trim(); continue }
    if (currentName) contentLines.push(rawLine)
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

/** 去掉常见分隔符的紧凑状态名，用于宽松匹配（如「阶段·外观」→「阶段外观」）。 */
function compactName(value: string): string {
  return normalize(value).replace(/[·・•\-—－~～_/|,，、;；:：.。()（）[\]【】]/g, '')
}

/**
 * 状态与已有资产视觉状态的匹配：精确 → 归一化（去空格/大小写）→ 去分隔符 → 包含匹配（较短一侧至少 2 字）。
 * 供提取解析与审核页编辑后重新归属使用。
 */
export function matchVariantForState(state: Pick<LongProjectExtractedState, 'name'>, asset: LongProjectAsset): string | undefined {
  const rawName = state.name.trim()
  if (!rawName) return undefined
  const exact = asset.variants.find((variant) => variant.name.trim() === rawName)
  if (exact) return exact.id
  const norm = normalize(rawName)
  const normalized = asset.variants.find((variant) => normalize(variant.name) === norm)
  if (normalized) return normalized.id
  const compact = compactName(rawName)
  if (!compact) return undefined
  const compactMatch = asset.variants.find((variant) => compactName(variant.name) === compact)
  if (compactMatch) return compactMatch.id
  if (compact.length < 2) return undefined
  return asset.variants.find((variant) => {
    const variantCompact = compactName(variant.name)
    return variantCompact.length >= 2 && (variantCompact.includes(compact) || compact.includes(variantCompact))
  })?.id
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
      const suggestedVariantId = matchVariantForState(state, asset)
      return suggestedVariantId ? { ...state, suggestedVariantId, matchSource: 'model' as const } : state
    })
    return { ...candidate, suggestedAssetId, decision: 'merge', states }
  })
}

/** 资产提取提示词的管线上下文：新管线下汇总原文分析、剧本与分镜概要。 */
export interface AssetExtractionContext {
  /** 原文分析文档内容（管线第一环节产物） */
  analysis?: string
  /** 漫画剧本文档内容（管线第二环节产物） */
  script?: string
  /** 分镜概要（每镜一行剧情提要） */
  panelsOutline?: string
  /** 项目已有资产，用于状态名沿用与归属建议 */
  existingAssets?: LongProjectAsset[]
}

/**
 * 组装资产提取的"章节底稿"：原文优先；本章从剧本开始（无原文）时以漫画剧本兜底，
 * 并加说明头告知模型底稿来源，避免误把剧本当作原文。
 * 两者皆空时返回空串（调用方以此判定是否允许提取）。
 */
export function buildExtractionSourceText(original: string, script: string): string {
  const trimmedOriginal = original.trim()
  if (trimmedOriginal) return trimmedOriginal
  const trimmedScript = script.trim()
  if (!trimmedScript) return ''
  return `（说明：本章从剧本开始创作，无原文；以下为漫画剧本全文，请以此作为提取底稿。）\n\n${trimmedScript}`
}

/** 一格「人物」字段 → 角色名数组（支持 、／，／, 分隔）。 */
function cellCastNames(cell: LongProjectStoryboardCell): string[] {
  return (cell.cast ?? '')
    .split(/[、,，]/)
    .map((name) => name.trim())
    .filter(Boolean)
}

/** 一页的出场人物：各格「人物」字段去重，保持出现顺序。 */
export function panelCastNames(panel: LongProjectStoryboardPanel): string[] {
  return [...new Set((panel.cells ?? []).flatMap(cellCastNames))]
}

/**
 * 分镜概要（资产提取用）：每镜一行，只给「画面 + 出场人物」。
 * 画面 = 页级画面汇总（多格页含每格画面）；人物 = 各格「人物」去重。
 * 只取这两项——它们回答"谁出现、画面里有什么"；台词/音效/光效/备注属绘制指令，不是资产特征。
 * 无分镜 / 全为空白时返回 undefined（模板没插 {{分镜概要}} 或值为空即不出现）。
 */
export function buildPanelsOutline(panels: LongProjectStoryboardPanel[]): string | undefined {
  if (!panels.length) return undefined
  const text = panels.map((panel) => {
    const cast = panelCastNames(panel)
    const head = `分镜${panel.order}：${(panel.content ?? '').trim()}`
    return cast.length ? `${head}｜人物：${cast.join('、')}` : head
  }).join('\n').trim()
  return text || undefined
}

/**
 * 组装"资产提取"提示词：章节底稿（原文，无原文时剧本兜底）+ 原文分析 + 漫画剧本 + 分镜概要 + 已有资产。
 * 变量：{{章节原文}} / {{原文分析}} / {{漫画剧本}} / {{分镜概要}} / {{已有资产}}；
 * 是否进入提示词完全由模板决定——模板没写的变量不会出现（无自动追加兜底）。
 */
export function buildAssetExtractionPrompt(templateContent: string, chapterContent: string, context: AssetExtractionContext = {}): string {
  const existingAssets = context.existingAssets ?? []
  const existingAssetsText = existingAssets.length
    ? existingAssets.map((asset) => {
        const states = asset.variants.map((variant) => variant.name).join('、') || '无'
        return `- ${asset.name}（${asset.type === 'character' ? '人物' : asset.type === 'scene' ? '场景' : '道具'}；已有视觉状态：${states}）`
      }).join('\n')
    : undefined
  return renderPromptTemplate({
    type: 'extract',
    content: templateContent.trim() || defaultTemplateContent('extract'),
    values: {
      章节原文: chapterContent,
      原文分析: context.analysis,
      漫画剧本: context.script,
      分镜概要: context.panelsOutline,
      已有资产: existingAssetsText,
    },
  })
}

/**
 * 批量统计候选资产在分镜中的出现数（确定性计算，不依赖模型）：
 * 对每个分镜的扫描文本（画面+对白+旁白+提示词+各格出场人物）做长名优先、命中区间消费的名称匹配，
 * 按分镜计数（出现在 N 个分镜中），返回 候选 id → 分镜数。
 */
export function countCandidatesAppearances(
  candidates: Array<Pick<LongProjectAssetExtractionCandidate, 'id' | 'name' | 'aliases'>>,
  panels: LongProjectStoryboardPanel[],
): Record<string, number> {
  const counts: Record<string, number> = {}
  if (!panels.length) return counts
  // 名称索引：候选名 + 全部别名（≥2 字），长名优先
  const entries = candidates
    .flatMap((candidate) => [candidate.name, ...(candidate.aliases ?? [])]
      .map((name) => name.trim())
      .filter((name) => name.length >= 2)
      .map((name) => ({ name, candidateId: candidate.id })))
    .sort((a, b) => b.name.length - a.name.length)
  if (!entries.length) return counts
  for (const panel of panels) {
    const text = [panel.content, panel.dialogue, panel.narration, panel.imagePrompt, panelCastNames(panel).join(' ')].filter(Boolean).join('\n')
    if (!text) continue
    const spans: Array<{ start: number; end: number; candidateId: string }> = []
    for (const entry of entries) {
      let searchFrom = 0
      for (;;) {
        const pos = text.indexOf(entry.name, searchFrom)
        if (pos < 0) break
        searchFrom = pos + entry.name.length
        // 与更长名称的命中区间重叠时跳过，避免短名误吃包含它的长名
        if (spans.some(({ start, end }) => pos < end && pos + entry.name.length > start)) continue
        spans.push({ start: pos, end: pos + entry.name.length, candidateId: entry.candidateId })
      }
    }
    for (const { candidateId } of spans) counts[candidateId] = (counts[candidateId] ?? 0) + 1
  }
  return counts
}

export async function extractChapterAssets(options: {
  model: ModelConfig
  template: PromptTemplate
  chapterContent: string
  existingAssets: LongProjectAsset[]
  /** 新管线上下文：原文分析 / 剧本 / 分镜（用于提示词与出现次数统计） */
  analysis?: string
  script?: string
  panels?: LongProjectStoryboardPanel[]
  prompt?: string
}) {
  const prompt = options.prompt ?? buildAssetExtractionPrompt(options.template.content, options.chapterContent, {
    analysis: options.analysis,
    script: options.script,
    panelsOutline: buildPanelsOutline(options.panels ?? []),
    existingAssets: options.existingAssets,
  })
  const result = await llmService.call({ modelConfig: options.model, userMessage: prompt })
  if (!result.success || !result.content) throw new Error(result.error || '模型没有返回内容')
  const candidates = parseAssetExtractionResponse(result.content, options.existingAssets)
  // 确定性统计每个候选在本章分镜文本中的出现数，供审核页参考重要性
  if (options.panels?.length) {
    const counts = countCandidatesAppearances(candidates, options.panels)
    for (const candidate of candidates) candidate.panelAppearances = counts[candidate.id] ?? 0
  }
  return { rawResponse: result.content, candidates }
}

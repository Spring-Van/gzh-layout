import { v4 as uuidv4 } from 'uuid'
import { llmService } from './llmService'
import type {
  LongProjectAsset,
  LongProjectAssetExtractionCandidate,
  LongProjectAssetType,
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

function matchExistingAsset(candidate: Pick<LongProjectAssetExtractionCandidate, 'type' | 'name' | 'aliases'>, assets: LongProjectAsset[]): string | undefined {
  const names = new Set([candidate.name, ...candidate.aliases].map(normalize).filter(Boolean))
  return assets.find((asset) => asset.type === candidate.type && [asset.name, ...asset.aliases].some((name) => names.has(normalize(name))))?.id
}

export function parseAssetExtractionResponse(content: string, existingAssets: LongProjectAsset[]): LongProjectAssetExtractionCandidate[] {
  const parsed = extractJson(content) as { assets?: unknown }
  if (!Array.isArray(parsed.assets)) throw new Error('模型返回中缺少 assets 数组，请检查提示词输出格式。')

  return parsed.assets.reduce<LongProjectAssetExtractionCandidate[]>((result, item) => {
    const asset = item as ModelAsset
    const type = asset.type as LongProjectAssetType
    const name = typeof asset.name === 'string' ? asset.name.trim() : ''
    if (!supportedTypes.has(type) || !name) return result
    const candidate: LongProjectAssetExtractionCandidate = {
      id: uuidv4(),
      type,
      name,
      aliases: toStrings(asset.aliases),
      importance: asset.importance === 'minor' ? 'minor' : 'major',
      description: typeof asset.description === 'string' ? asset.description.trim() : '',
      evidence: toStrings(asset.evidence),
      decision: 'create',
    }
    if (asset.visualVersion?.name?.trim()) {
      candidate.visualVersion = {
        name: asset.visualVersion.name.trim(),
        description: asset.visualVersion.description?.trim() || '',
        imagePrompt: asset.visualVersion.imagePrompt?.trim() || '',
      }
    }
    const suggestedAssetId = matchExistingAsset(candidate, existingAssets)
    if (suggestedAssetId) {
      candidate.suggestedAssetId = suggestedAssetId
      candidate.decision = 'merge'
    }
    result.push(candidate)
    return result
  }, [])
}

export async function extractChapterAssets(options: {
  model: ModelConfig
  template: PromptTemplate
  chapterContent: string
  existingAssets: LongProjectAsset[]
}) {
  const prompt = options.template.content.includes('{{chapter_content}}')
    ? options.template.content.replace(/\{\{chapter_content\}\}/g, options.chapterContent)
    : `${options.template.content}\n\n【章节原文】\n${options.chapterContent}`
  const result = await llmService.call({ modelConfig: options.model, userMessage: prompt })
  if (!result.success || !result.content) throw new Error(result.error || '模型没有返回内容')
  return { rawResponse: result.content, candidates: parseAssetExtractionResponse(result.content, options.existingAssets) }
}

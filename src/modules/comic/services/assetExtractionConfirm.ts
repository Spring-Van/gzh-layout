import { v4 as uuidv4 } from 'uuid'
import type {
  LongProjectAsset,
  LongProjectAssetExtractionCandidate,
  LongProjectAssetExtractionRun,
  LongProjectChapterAsset,
  LongProjectStoryboardPanel,
} from '@comic/types'
import { getCandidateStates } from './assetExtractionService'
import { buildAssetNameIndex, syncPanelsAutoBindings } from './promptAssetService'
import { defaultVariant } from './storyboardService'

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

/**
 * 由候选创建章节范围新资产（候选 → 新资产的字段映射）。
 * 提取自长篇主页面确认流程，供资产确认环节复用。
 */
export function createAssetFromCandidate(candidate: LongProjectAssetExtractionCandidate, chapterId: string): LongProjectAsset {
  const now = Date.now()
  return {
    id: uuidv4(), type: candidate.type, name: candidate.name, content: candidate.content || candidate.description, aliases: uniqueStrings(candidate.aliases),
    description: candidate.description || candidate.content, fixedTraits: [], attributes: candidate.attributes,
    sourceChapterIds: [chapterId], status: 'confirmed', scope: 'chapter',
    variants: getCandidateStates(candidate).filter((state) => state.name.trim()).map((state) => ({
      id: uuidv4(), name: state.name.trim(), description: state.description,
      firstAppearanceChapterId: chapterId, chapterRange: { startChapterId: chapterId }, tags: state.tags, imagePrompt: state.imagePrompt,
      referenceImageIds: [], sourceChapterIds: [chapterId], createdAt: now, updatedAt: now,
    })),
    createdAt: now, updatedAt: now,
  }
}

/**
 * 把候选合并进已有资产：视觉状态按建议归属，已有状态只补充章节引用与空缺字段；
 * 审核页编辑后的候选信息优先，避免编辑结果被已有资产旧值覆盖。
 */
export function mergeCandidateIntoAsset(asset: LongProjectAsset, candidate: LongProjectAssetExtractionCandidate, chapterId: string): LongProjectAsset {
  const now = Date.now()
  const variants = [...asset.variants]
  for (const state of getCandidateStates(candidate)) {
    const name = state.name.trim()
    if (!name) continue
    // 归属到已有状态时不新建，只补充章节引用与空缺字段
    const existing = state.suggestedVariantId ? variants.find((variant) => variant.id === state.suggestedVariantId) : undefined
    if (existing) {
      variants.splice(variants.indexOf(existing), 1, { ...existing, sourceChapterIds: uniqueStrings([...existing.sourceChapterIds, chapterId]), description: state.description || existing.description, imagePrompt: state.imagePrompt || existing.imagePrompt, tags: state.tags?.length ? state.tags : existing.tags, updatedAt: now })
      continue
    }
    if (!variants.some((variant) => variant.name.trim() === name)) {
      variants.push({ id: uuidv4(), name, description: state.description, firstAppearanceChapterId: chapterId, chapterRange: { startChapterId: chapterId }, tags: state.tags, imagePrompt: state.imagePrompt, referenceImageIds: [], sourceChapterIds: [chapterId], createdAt: now, updatedAt: now })
    }
  }
  return {
    ...asset,
    content: candidate.content || asset.content || candidate.description,
    aliases: uniqueStrings([...asset.aliases, ...candidate.aliases]),
    description: candidate.description || asset.description,
    attributes: { ...asset.attributes, ...candidate.attributes },
    sourceChapterIds: uniqueStrings([...asset.sourceChapterIds, chapterId]),
    variants,
    updatedAt: now,
  }
}

/** 资产提取确认的数据变换结果：整体替换 assets / chapterAssets。 */
export interface ExtractionConfirmResult {
  assets: LongProjectAsset[]
  chapterAssets: LongProjectChapterAsset[]
}

/**
 * 资产提取确认的纯数据变换：以本次审核结果作为当前章节唯一生效版本。
 * 每次确认前移除本章旧章节引用与未被引用的章节资产，再按候选 decision 生成/合并；
 * 同一资产同一视觉状态只保留一条章节引用。历史提取任务仍保留，由调用方标记 confirmed。
 */
export function buildExtractionConfirmResult(
  run: LongProjectAssetExtractionRun,
  chapterId: string,
  currentAssets: LongProjectAsset[],
  currentChapterAssets: LongProjectChapterAsset[],
): ExtractionConfirmResult {
  const currentChapterEntries = currentChapterAssets.filter((entry) => entry.chapterId === chapterId)
  const currentChapterAssetIds = new Set(currentChapterEntries.map((entry) => entry.assetId))
  const referencedByOtherChapters = new Set(currentChapterAssets
    .filter((entry) => entry.chapterId !== chapterId)
    .map((entry) => entry.assetId))
  const suggestedAssetIds = new Set(run.candidates.map((candidate) => candidate.suggestedAssetId).filter(Boolean) as string[])
  let nextAssets = currentAssets
    .filter((asset) => asset.scope !== 'chapter' || !currentChapterAssetIds.has(asset.id) || referencedByOtherChapters.has(asset.id) || suggestedAssetIds.has(asset.id))
    .map((asset) => ({ ...asset, variants: [...asset.variants] }))
  const nextChapterAssets = currentChapterAssets.filter((entry) => entry.chapterId !== chapterId)
  // 同一资产同一视觉状态只保留一条章节引用，避免多状态/多候选项指向同一状态时产生重复数据
  const chapterEntryKeys = new Set<string>()
  for (const candidate of run.candidates) {
    if (candidate.decision === 'ignore' || candidate.decision === 'pending') continue
    let asset = candidate.suggestedAssetId ? nextAssets.find((item) => item.id === candidate.suggestedAssetId) : undefined
    if (!asset) {
      asset = createAssetFromCandidate(candidate, chapterId)
      nextAssets.push(asset)
    } else {
      const merged = mergeCandidateIntoAsset(asset, candidate, chapterId)
      nextAssets = nextAssets.map((item) => item.id === merged.id ? merged : item)
      asset = merged
    }
    // 每个视觉状态一条章节引用；无状态资产保留一条无 variant 引用
    const states = getCandidateStates(candidate).filter((state) => state.name.trim())
    const entries = states.length ? states : [null]
    for (const state of entries) {
      const variant = state?.suggestedVariantId ? asset.variants.find((item) => item.id === state.suggestedVariantId) ?? asset.variants.find((item) => item.name.trim() === state.name.trim()) : asset.variants.find((item) => item.name.trim() === state?.name.trim())
      const entryKey = `${asset.id}:${variant?.id ?? ''}`
      if (chapterEntryKeys.has(entryKey)) continue
      chapterEntryKeys.add(entryKey)
      nextChapterAssets.push({ id: uuidv4(), chapterId, assetId: asset.id, variantId: variant?.id, appearance: candidate.suggestedAssetId ? 'reused' : 'introduced', evidence: candidate.evidence, sourceExtractionRunId: run.id, createdAt: Date.now(), updatedAt: Date.now() })
    }
  }
  return { assets: nextAssets, chapterAssets: nextChapterAssets }
}

/**
 * 资产确认后按文本自动回填分镜绑定：
 * 重扫全部章节分镜文本，出现资产名且未绑定 → 自动添加（延续上一镜视觉状态，否则章节范围默认）；
 * auto-text 绑定且名称消失 → 自动移除；其余来源绑定不动。
 */
export function backfillPanelAutoBindings(
  panels: LongProjectStoryboardPanel[],
  assets: LongProjectAsset[],
  chapterId: string,
  chapterOrders: Record<string, number>,
): LongProjectStoryboardPanel[] {
  return syncPanelsAutoBindings(panels, buildAssetNameIndex(assets), (asset) => defaultVariant(asset, chapterId, chapterOrders))
}

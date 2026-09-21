import { v4 as uuidv4 } from 'uuid'
import type {
  LongProjectAsset,
  LongProjectAssetExtractionCandidate,
  LongProjectAssetExtractionRun,
  LongProjectAssetVariant,
  LongProjectChapterAsset,
  LongProjectExtractedState,
  LongProjectStoryboardAssetBinding,
  LongProjectStoryboardPanel,
} from '@comic/types'
import { getCandidateStates } from './assetExtractionService'
import { buildAssetNameIndex, syncPanelsAutoBindings } from './promptAssetService'
import { defaultVariant } from './storyboardService'

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

/** 资产/状态名的归一化比较键（去空白 + 小写）：同一次提取里重复出现同名条目时据此合并。 */
function nameKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '')
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
      id: uuidv4(), name: state.name.trim(), description: state.description, anchor: state.anchor,
      firstAppearanceChapterId: chapterId, chapterRange: { startChapterId: chapterId }, tags: state.tags, imagePrompt: state.imagePrompt,
      referenceImageIds: [], sourceChapterIds: [chapterId], createdAt: now, updatedAt: now,
    })),
    createdAt: now, updatedAt: now,
  }
}

/**
 * 覆盖某候选后会被删掉的旧视觉状态。
 * 保留口径与 overrideAssetWithCandidate 完全一致：候选的建议 id 命中、或状态名与旧状态同名，都算留下。
 * 审核页的「本次未出现」提示与确认前的影响面统计共用此函数，避免三处口径漂移。
 */
export function selectDroppedVariants(asset: LongProjectAsset, candidate: LongProjectAssetExtractionCandidate): LongProjectAssetVariant[] {
  const keptIds = new Set<string>()
  const keptNames = new Set<string>()
  for (const state of getCandidateStates(candidate)) {
    const name = state.name.trim()
    if (!name) continue
    if (state.suggestedVariantId) keptIds.add(state.suggestedVariantId)
    keptNames.add(name)
  }
  return asset.variants.filter((variant) => !keptIds.has(variant.id) && !keptNames.has(variant.name.trim()))
}

/**
 * 状态 → 目标视觉状态：优先归属建议 id，其次同名兜底。
 * 供重建变体与写章节引用共用，保证两处指向同一条状态。
 */
function resolveStateVariant(asset: LongProjectAsset, state: Pick<LongProjectExtractedState, 'name' | 'suggestedVariantId'>): LongProjectAssetVariant | undefined {
  const name = state.name.trim()
  return (state.suggestedVariantId ? asset.variants.find((variant) => variant.id === state.suggestedVariantId) : undefined)
    ?? asset.variants.find((variant) => nameKey(variant.name) === nameKey(name))
}

/**
 * 把一组候选（通常来自同一次提取、且都指向同一资产）合并到已有资产上（本次结果优先）：
 * 资产级 content/description/attributes 以候选为准（候选为空时回退已有值，避免把资产清空）；
 * 视觉状态按候选状态**整表重建**，本次未出现的旧状态一律删除。
 *
 * ⚠️ 两条去重是必须的，否则会产出重复视觉状态（用户反馈的"没被覆盖反而新增"）：
 * 1. **同目标去重** —— 两个候选状态都命中同一条已有状态（模糊匹配典型场景：「少年」与「少年期」都命中「少年期」）时只保留第一条；
 * 2. **同名去重** —— 两个状态都没有命中、但名字相同（模型把同一状态列了两遍）时只新建一条。
 */
function applyCandidatesToAsset(
  asset: LongProjectAsset,
  candidates: LongProjectAssetExtractionCandidate[],
  states: LongProjectExtractedState[],
  chapterId: string,
): LongProjectAsset {
  const now = Date.now()
  const seen = new Set<string>()
  const variants: LongProjectAssetVariant[] = []
  for (const state of states) {
    const name = state.name.trim()
    if (!name) continue
    const existing = resolveStateVariant(asset, state)
    // 去重键：命中已有状态用其 id，否则用归一化后的状态名
    const dedupeKey = existing ? `id:${existing.id}` : `name:${nameKey(name)}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    if (!existing) {
      variants.push({ id: uuidv4(), name, description: state.description, anchor: state.anchor, firstAppearanceChapterId: chapterId, chapterRange: { startChapterId: chapterId }, tags: state.tags, imagePrompt: state.imagePrompt, referenceImageIds: [], sourceChapterIds: [chapterId], createdAt: now, updatedAt: now })
      continue
    }
    variants.push({
      ...existing,
      name,
      description: state.description || existing.description,
      anchor: state.anchor || existing.anchor,
      imagePrompt: state.imagePrompt || existing.imagePrompt,
      tags: state.tags?.length ? state.tags : existing.tags,
      sourceChapterIds: uniqueStrings([...existing.sourceChapterIds, chapterId]),
      updatedAt: now,
    })
  }
  const merged = candidates.reduce<LongProjectAsset>((acc, candidate) => ({
    ...acc,
    content: candidate.content || acc.content || candidate.description,
    description: candidate.description || acc.description,
    aliases: uniqueStrings([...candidate.aliases, ...acc.aliases]),
    attributes: { ...acc.attributes, ...candidate.attributes },
    sourceChapterIds: uniqueStrings([...acc.sourceChapterIds, chapterId]),
  }), asset)
  return {
    ...merged,
    variants: variants.length ? variants : asset.variants,
    updatedAt: now,
  }
}

/**
 * 单候选版本的覆盖（本次结果优先）：等价于「只有一个候选」的 applyCandidatesToAsset。
 * 保留导出：调用方与测试按单候选语义使用；多候选归组在 buildExtractionConfirmResult 里统一处理。
 */
export function overrideAssetWithCandidate(asset: LongProjectAsset, candidate: LongProjectAssetExtractionCandidate, chapterId: string): LongProjectAsset {
  return applyCandidatesToAsset(asset, [candidate], getCandidateStates(candidate).filter((state) => state.name.trim()), chapterId)
}

/** 资产提取确认的数据变换结果：整体替换 assets / chapterAssets。 */
export interface ExtractionConfirmResult {
  assets: LongProjectAsset[]
  chapterAssets: LongProjectChapterAsset[]
}

/** 孤儿扫描结果：没有任何章节引用的视觉状态与章节范围资产。 */
export interface OrphanScanResult {
  /** 所在资产仍被引用、但自己没有任何章节引用（也没有分镜绑定保护）的视觉状态 */
  variants: Array<{ assetId: string; assetName: string; variantId: string; variantName: string; hasImages: boolean }>
  /** scope 为 chapter、且没有任何章节引用的整条资产 */
  assets: Array<{ assetId: string; assetName: string; variantCount: number }>
}

/**
 * 扫描"孤儿数据"：历史累积下来、已经没有任何章节在用的视觉状态与章节资产。
 * 判定只看章节引用（`LongProjectChapterAsset`），因为分镜绑定（visualVersionId）本身要靠章节引用才站得住脚，
 * 悬空绑定由调用方在删除后跑 `repairDanglingBindings` 兜底。
 * 两条豁免，避免误删：
 * 1. 资产存在 `variantId` 为空的引用（旧数据语义为"引用该资产全部状态"）→ 该资产的全部状态豁免；
 * 2. 只清理 `scope === 'chapter'` 的资产，项目级资产（用户手工维护的素材）不动。
 */
export function findOrphanEntries(assets: LongProjectAsset[], chapterAssets: LongProjectChapterAsset[]): OrphanScanResult {
  const referencedAssetIds = new Set(chapterAssets.map((entry) => entry.assetId))
  const referencedVariantIds = new Set(chapterAssets.map((entry) => entry.variantId).filter((id): id is string => Boolean(id)))
  /** 存在"整资产引用"的资产：状态级判定豁免 */
  const wholeAssetReferenced = new Set(chapterAssets.filter((entry) => !entry.variantId).map((entry) => entry.assetId))
  const result: OrphanScanResult = { variants: [], assets: [] }
  for (const asset of assets) {
    if (!referencedAssetIds.has(asset.id)) {
      if (asset.scope === 'chapter') result.assets.push({ assetId: asset.id, assetName: asset.name, variantCount: asset.variants.length })
      continue
    }
    if (wholeAssetReferenced.has(asset.id)) continue
    for (const variant of asset.variants) {
      if (referencedVariantIds.has(variant.id)) continue
      result.variants.push({
        assetId: asset.id,
        assetName: asset.name,
        variantId: variant.id,
        variantName: variant.name,
        hasImages: Boolean(variant.referenceImageIds?.length || variant.generatedImageIds?.length),
      })
    }
  }
  return result
}

/** 按孤儿扫描结果剔除视觉状态与章节资产，返回新的 assets（无变化时返回原引用）。 */
export function pruneOrphanEntries(assets: LongProjectAsset[], scan: OrphanScanResult): LongProjectAsset[] {
  if (!scan.variants.length && !scan.assets.length) return assets
  const droppedAssetIds = new Set(scan.assets.map((item) => item.assetId))
  const droppedVariantIds = new Set(scan.variants.map((item) => item.variantId))
  return assets
    .filter((asset) => !droppedAssetIds.has(asset.id))
    .map((asset) => {
      const variants = asset.variants.filter((variant) => !droppedVariantIds.has(variant.id))
      return variants.length === asset.variants.length ? asset : { ...asset, variants, updatedAt: Date.now() }
    })
}

/**
 * 资产提取确认的纯数据变换：以本次审核结果作为当前章节唯一生效版本（唯一行为，无模式选择）。
 * 每次确认前移除本章旧章节引用与未被引用的章节资产，再按候选生成或覆盖：
 * 命中已有资产 → 整表重建视觉状态（同名状态复用原 id 保住已生成的图），本次未出现的旧状态删除；
 * 同一资产同一视觉状态只保留一条章节引用。历史提取任务仍保留，由调用方标记 confirmed。
 *
 * ⚠️ **先按资产归组，再一次性重建**：模型把同一资产拆成多个候选（或同一次提取里同名条目重复）
 * 时，逐条覆盖会让后一条把前一条的状态整表冲掉（丢状态），或对同一状态重复生成条目（重复状态）。
 * 归组后同资产的所有候选状态合并重建，同目标/同名的状态只保留第一条。
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
  const nextAssets = currentAssets
    .filter((asset) => asset.scope !== 'chapter' || !currentChapterAssetIds.has(asset.id) || referencedByOtherChapters.has(asset.id) || suggestedAssetIds.has(asset.id))
    .map((asset) => ({ ...asset, variants: [...asset.variants] }))
  const nextChapterAssets = currentChapterAssets.filter((entry) => entry.chapterId !== chapterId)

  const active = run.candidates.filter((candidate) => candidate.decision !== 'ignore' && candidate.decision !== 'pending')

  // 1) 先把每个候选落到具体资产：① 解析期命中已有资产；② 本次提取里同类型同名的候选（模型重复列出同一资产时不该造两条）；
  //    ③ 都命中不了才新建。新增的资产立刻登记，供后续同名候选复用。
  const assetIdByKey = new Map<string, string>()
  const targetAssetId = new Map<string, string>()
  for (const candidate of active) {
    const key = `${candidate.type}:${nameKey(candidate.name)}`
    let assetId = candidate.suggestedAssetId && nextAssets.some((item) => item.id === candidate.suggestedAssetId) ? candidate.suggestedAssetId : assetIdByKey.get(key)
    if (!assetId) {
      const created = createAssetFromCandidate(candidate, chapterId)
      nextAssets.push(created)
      assetId = created.id
    }
    assetIdByKey.set(key, assetId)
    targetAssetId.set(candidate.id, assetId)
  }

  // 2) 按资产归组后一次性重建（同资产多候选合并，状态去重）
  const grouped = new Map<string, LongProjectAssetExtractionCandidate[]>()
  for (const candidate of active) {
    const assetId = targetAssetId.get(candidate.id)
    if (!assetId) continue
    grouped.set(assetId, [...(grouped.get(assetId) ?? []), candidate])
  }

  // 同一资产同一视觉状态只保留一条章节引用，避免多状态/多候选指向同一状态时产生重复数据
  const chapterEntryKeys = new Set<string>()
  for (const [assetId, candidates] of grouped) {
    const index = nextAssets.findIndex((item) => item.id === assetId)
    if (index < 0) continue
    // 保留「状态 → 来源候选」的对应关系：章节引用的依据与归属标记按各自来源候选取，不被同组其他候选串味
    const stateOwners = candidates.flatMap((candidate) => getCandidateStates(candidate)
      .filter((state) => state.name.trim())
      .map((state) => ({ state, candidate })))
    const updated = applyCandidatesToAsset(nextAssets[index], candidates, stateOwners.map((item) => item.state), chapterId)
    nextAssets[index] = updated
    // 每个视觉状态一条章节引用；无状态资产保留一条无 variant 引用
    const entries = stateOwners.length ? stateOwners : [{ state: null, candidate: candidates[0] }]
    for (const { state, candidate } of entries) {
      const variant = state ? resolveStateVariant(updated, state) : undefined
      const entryKey = `${updated.id}:${variant?.id ?? ''}`
      if (chapterEntryKeys.has(entryKey)) continue
      chapterEntryKeys.add(entryKey)
      nextChapterAssets.push({
        id: uuidv4(), chapterId, assetId: updated.id, variantId: variant?.id,
        appearance: candidate.suggestedAssetId ? 'reused' : 'introduced',
        evidence: candidate.evidence, sourceExtractionRunId: run.id, createdAt: Date.now(), updatedAt: Date.now(),
      })
    }
  }
  return { assets: nextAssets, chapterAssets: nextChapterAssets }
}

/**
 * 资产确认后按文本自动回填分镜绑定：
 * 逐格重扫画面、人物、动作、表情与备注，出现资产名且未绑定 → 自动添加
 * （明确状态名优先，其次延续上一格/镜视觉状态，否则章节范围默认）；
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

/**
 * 修复分镜上指向已被删除视觉状态的悬空绑定（覆盖模式专用兜底）：
 * auto-text 绑定会被 backfillPanelAutoBindings 重算，但 model / manual / chapter-range 来源的绑定
 * 只做增删不改内容，覆盖删掉视觉状态后其 visualVersionId 会悬空 → 回落到章节范围默认状态；
 * 顺带同步资产改名后的 assetName。assetId 不存在（unmatched 或资产已删除）的绑定不处理。
 *
 * ⚠️ **页级与格级「出场资产」声明必须同一口径修复**：生图取图与画面描述都按
 * `resolvePanelAssetStates`（页级 ∪ 格级）消费，若只修页级，会出现
 * 「界面仍显示已删状态名、生图实际按回落状态取图」的口径分裂。两者共用 repairBinding。
 */
export function repairDanglingBindings(
  panels: LongProjectStoryboardPanel[],
  assets: LongProjectAsset[],
  chapterId: string,
  chapterOrders: Record<string, number>,
): LongProjectStoryboardPanel[] {
  const assetById = new Map(assets.map((asset) => [asset.id, asset]))
  /** 修一条绑定：资产改名 → 同步 assetName；状态悬空 → 回落默认状态。返回原对象 = 无需改动。 */
  const repairBinding = (binding: LongProjectStoryboardAssetBinding): LongProjectStoryboardAssetBinding => {
    const asset = binding.assetId ? assetById.get(binding.assetId) : undefined
    if (!asset) return binding
    const nameChanged = binding.assetName !== asset.name
    // 无视觉状态绑定时不主动补，只同步资产名
    const dangling = Boolean(binding.visualVersionId) && !asset.variants.some((variant) => variant.id === binding.visualVersionId)
    if (!dangling) return nameChanged ? { ...binding, assetName: asset.name } : binding
    const fallback = defaultVariant(asset, chapterId, chapterOrders)
    return {
      ...binding,
      assetName: asset.name,
      visualVersionId: fallback?.id,
      visualVersionName: fallback?.name,
      referenceImageIds: fallback?.referenceImageIds ?? [],
    }
  }
  return panels.map((panel) => {
    let changed = false
    const assetBindings = panel.assetBindings.map((binding) => {
      const next = repairBinding(binding)
      if (next !== binding) changed = true
      return next
    })
    const cells = panel.cells?.map((cell) => {
      if (!cell.assetBindings?.length) return cell
      let cellChanged = false
      const nextBindings = cell.assetBindings.map((binding) => {
        const next = repairBinding(binding)
        if (next !== binding) cellChanged = true
        return next
      })
      if (!cellChanged) return cell
      changed = true
      return { ...cell, assetBindings: nextBindings }
    })
    return changed ? { ...panel, assetBindings, ...(cells ? { cells } : {}) } : panel
  })
}

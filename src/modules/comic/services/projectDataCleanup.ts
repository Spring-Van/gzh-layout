import { findOrphanEntries, pruneOrphanEntries, repairDanglingBindings, repairDanglingChapterAssets } from './assetExtractionConfirm'
import { normalizeGenPromptSlot } from '@comic/utils/genPromptSlots'
import type { ComicProject } from '@comic/types'

type LongProjectData = NonNullable<ComicProject['longProjectData']>

/** 删除章节后各集合实际清理掉的条数（用于回执与测试断言）。 */
export interface ChapterCleanupReport {
  analyses: number
  scripts: number
  storyboardRuns: number
  panelArtworks: number
  assetExtractionRuns: number
  chapterAssets: number
  /** 资产库中被清理的视觉状态 / 整条资产（仅剩该章引用者） */
  variants: number
  assets: number
  /** 因资产库变化而被修复悬空绑定的分镜版本数 */
  repairedRuns: number
  /** 被重新指向可用状态的章节资产引用数 / 因资产已删而被丢弃的引用数 */
  reassignedChapterAssets: number
  droppedChapterAssets: number
}

/**
 * 删除章节时就地清理该项目数据上**所有以 chapterId 归属**的记录。
 *
 * 存在的意义：章节节点被删掉之后，没有任何界面能再访问它的分析、剧本、分镜版本、画面工件、
 * 提取记录与章节资产引用 —— 它们会永久留在库里占体积（实测占文件 90%+），
 * 所以删除章节必须连带清理，而不是只从节点树里摘掉一行。
 *
 * 资产库的清理复用「孤儿」口径（`findOrphanEntries`）：只删**没有任何剩余章节引用**的
 * 章节范围资产与视觉状态，被其他章节继续引用的资产与状态不受影响。
 * 因此调用方必须先移除节点、再调用本函数（本函数只看 `data.nodes` 判断章节是否真的没了）。
 */
export function cleanupChapterData(data: LongProjectData, chapterIds: readonly string[]): ChapterCleanupReport {
  const aliveNodeIds = new Set((data.nodes ?? []).map((node) => node.id))
  const deadChapterIds = new Set(chapterIds.filter((id) => !aliveNodeIds.has(id)))
  const report: ChapterCleanupReport = {
    analyses: 0, scripts: 0, storyboardRuns: 0, panelArtworks: 0,
    assetExtractionRuns: 0, chapterAssets: 0, variants: 0, assets: 0, repairedRuns: 0,
    reassignedChapterAssets: 0, droppedChapterAssets: 0,
  }
  if (!deadChapterIds.size) return report

  const purge = <T extends { chapterId: string }>(list: T[] | undefined): T[] => {
    const before = list ?? []
    const next = before.filter((item) => !deadChapterIds.has(item.chapterId))
    return next.length === before.length ? before : next
  }

  const analyses = purge(data.chapterAnalyses)
  const scripts = purge(data.chapterScripts)
  const storyboardRuns = purge(data.storyboardRuns)
  const panelArtworks = purge(data.panelArtworks)
  const assetExtractionRuns = purge(data.assetExtractionRuns)
  const chapterAssets = purge(data.chapterAssets)
  report.analyses = (data.chapterAnalyses ?? []).length - analyses.length
  report.scripts = (data.chapterScripts ?? []).length - scripts.length
  report.storyboardRuns = (data.storyboardRuns ?? []).length - storyboardRuns.length
  report.panelArtworks = (data.panelArtworks ?? []).length - panelArtworks.length
  report.assetExtractionRuns = (data.assetExtractionRuns ?? []).length - assetExtractionRuns.length
  report.chapterAssets = (data.chapterAssets ?? []).length - chapterAssets.length

  // 章节引用先落定，再按「没有任何章节引用」的口径清理资产库
  const orphan = findOrphanEntries(data.assets ?? [], chapterAssets)
  const assets = pruneOrphanEntries(data.assets ?? [], orphan)
  report.variants = orphan.variants.length
  report.assets = orphan.assets.length

  // 资产/状态被清掉后，剩余章节里指向它们的引用会悬空 → 全量兜底修复
  const chapterOrders = buildChapterOrders(data)
  const repairedChapterAssets = repairDanglingChapterAssets(chapterAssets, assets, chapterOrders)
  report.reassignedChapterAssets = repairedChapterAssets.reassigned
  report.droppedChapterAssets = repairedChapterAssets.dropped
  const repaired = assets === (data.assets ?? [])
    ? storyboardRuns
    : storyboardRuns.map((run) => {
      const panels = repairDanglingBindings(run.panels, assets, run.chapterId, chapterOrders)
      if (panels === run.panels) return run
      report.repairedRuns += 1
      return { ...run, panels, updatedAt: Date.now() }
    })

  data.chapterAnalyses = analyses
  data.chapterScripts = scripts
  data.storyboardRuns = repaired
  data.panelArtworks = panelArtworks
  data.assetExtractionRuns = assetExtractionRuns
  data.chapterAssets = repairedChapterAssets.chapterAssets
  data.assets = assets
  return report
}

/** 章节顺序表（章节 ID → 序号）：视觉状态的「章节范围默认值」按章节先后取值。 */
function buildChapterOrders(data: LongProjectData): Record<string, number> {
  return Object.fromEntries(
    (data.nodes ?? []).filter((node) => node.type === 'chapter')
      .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
      .map((node, index) => [node.id, index]),
  )
}

/** 项目数据整体体检的结果：各集合清理掉的条数。 */
export interface ProjectSweepReport extends ChapterCleanupReport {
  /** 节点树里已不存在的章节数（其名下数据被一并清掉） */
  danglingChapters: number
  /** 清空的悬空 sourceExtractionRunId 引用数 */
  clearedSourceRunIds: number
  /** 清掉的旧手动排序字段数（referenceImageOrder，已停止消费） */
  clearedReferenceOrders: number
  /** 被自愈归一的候选提示词条数（text 为 null 等违规值） */
  normalizedPromptSlots: number
}

/**
 * 节点树里已不存在的章节，其名下数据没有任何界面能再访问到。
 * 只靠「删除章节时清理」不够 —— 修复之前删过的章节会永久残留，所以载入时按节点树兜底扫一次。
 */
function danglingChapterIds(data: LongProjectData): string[] {
  const aliveIds = new Set((data.nodes ?? []).map((node) => node.id))
  const referenced = new Set<string>()
  for (const item of data.storyboardRuns ?? []) referenced.add(item.chapterId)
  for (const item of data.panelArtworks ?? []) referenced.add(item.chapterId)
  for (const item of data.assetExtractionRuns ?? []) referenced.add(item.chapterId)
  for (const item of data.chapterAssets ?? []) referenced.add(item.chapterId)
  for (const item of data.chapterAnalyses ?? []) referenced.add(item.chapterId)
  for (const item of data.chapterScripts ?? []) referenced.add(item.chapterId)
  return [...referenced].filter((id) => !aliveIds.has(id))
}

/** 体检计划：只计算「该保留谁」，不改动数据。检测与执行共用，避免两处口径漂移。 */
function planSweep(data: LongProjectData) {
  const dangling = danglingChapterIds(data)

  const keepRunIds = new Set<string>()
  const runsByChapter = new Map<string, NonNullable<LongProjectData['storyboardRuns']>>()
  for (const run of data.storyboardRuns ?? []) {
    const list = runsByChapter.get(run.chapterId)
    if (list) list.push(run)
    else runsByChapter.set(run.chapterId, [run])
  }
  for (const list of runsByChapter.values()) {
    const byNewest = [...list].sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt)
    if (byNewest[0]) keepRunIds.add(byNewest[0].id)
    const newestCompleted = byNewest.find((run) => run.status === 'completed')
    if (newestCompleted) keepRunIds.add(newestCompleted.id)
  }
  const livePanelIds = new Set(
    (data.storyboardRuns ?? [])
      .filter((run) => keepRunIds.has(run.id))
      .flatMap((run) => (run.panels ?? []).map((panel) => panel.id)),
  )

  const keepExtractRunIds = new Set<string>()
  const extractByChapter = new Map<string, NonNullable<LongProjectData['assetExtractionRuns']>>()
  for (const run of data.assetExtractionRuns ?? []) {
    const list = extractByChapter.get(run.chapterId)
    if (list) list.push(run)
    else extractByChapter.set(run.chapterId, [run])
  }
  for (const list of extractByChapter.values()) {
    const byNewest = [...list].sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt)
    // 最新一版 = 审核区 / 失败重试看的那条；再留一条最新已完成，避免重提取失败后连上次成功结果都没了
    if (byNewest[0]) keepExtractRunIds.add(byNewest[0].id)
    const newestCompleted = byNewest.find((run) => run.status === 'completed')
    if (newestCompleted) keepExtractRunIds.add(newestCompleted.id)
  }

  return { dangling, keepRunIds, livePanelIds, keepExtractRunIds }
}

/**
 * 是否存在需要体检的数据（不修改入参）。用于避免每次载入项目都白写一遍库。
 * 判定与 `sweepProjectData` 共用同一份计划，宁可多报一次也不会漏报。
 */
export function hasSweepWork(data: LongProjectData): boolean {
  const plan = planSweep(data)
  if (plan.dangling.length) return true
  if ((data.storyboardRuns ?? []).length !== plan.keepRunIds.size) return true
  if ((data.assetExtractionRuns ?? []).length !== plan.keepExtractRunIds.size) return true
  if ((data.panelArtworks ?? []).some((artwork) => !plan.livePanelIds.has(artwork.panelId))) return true
  if (hasDanglingChapterAsset(data)) return true
  // 类型里已移除的死字段，旧库里可能还留着
  if ('assetPromptRuns' in (data as unknown as Record<string, unknown>)) return true
  if ((data.panelArtworks ?? []).some((artwork) => artwork.referenceImageOrder?.length)) return true
  if ((data.panelArtworks ?? []).some((artwork) => artwork.genPrompts?.some((slot) => typeof slot.text !== 'string'))) return true
  return (data.chapterAssets ?? []).some(
    (entry) => Boolean(entry.sourceExtractionRunId) && !plan.keepExtractRunIds.has(entry.sourceExtractionRunId as string),
  )
}

/** 章节资产引用是否存在悬空指针（资产已删 / 状态已删）。 */
function hasDanglingChapterAsset(data: LongProjectData): boolean {
  const assetById = new Map((data.assets ?? []).map((asset) => [asset.id, asset]))
  return (data.chapterAssets ?? []).some((entry) => {
    const asset = assetById.get(entry.assetId)
    if (!asset) return true
    return Boolean(entry.variantId) && !asset.variants.some((variant) => variant.id === entry.variantId)
  })
}

/**
 * 版本历史压缩：只保留仍会被界面消费的版本，其余连同失去归属的派生物一起删除。
 *
 * 保留规则（每章）：
 * - 分镜版本：保留**最新一版**（状态提示 / 失败原因看它）与**最新一版已完成**（生图工作台与
 *   工件迁移的基准是它，见 `LongProjectStoryboardTab` 的 `currentRun`）；两者同一条时只留一条；
 * - 画面工件：只保留 panelId 仍归属于保留版本的分镜 —— 指向已删版本的记录界面上再也看不到；
 * - 提取记录：保留**最新一版**（审核结果与失败重试看它）与**最新一版已完成**（防重提取失败后
 *   连上次成功结果一起丢）；随之清掉指向被删记录的 `chapterAssets.sourceExtractionRunId`。
 *
 * 之所以必须做：分镜与提取都是「每次重跑/重导入追加一条」的写法，历史版本没有任何界面消费，
 * 却是实测中占数据文件 90% 以上的体积来源。
 */
export function sweepProjectData(data: LongProjectData): ProjectSweepReport {
  const report: ProjectSweepReport = {
    analyses: 0, scripts: 0, storyboardRuns: 0, panelArtworks: 0,
    assetExtractionRuns: 0, chapterAssets: 0, variants: 0, assets: 0, repairedRuns: 0,
    reassignedChapterAssets: 0, droppedChapterAssets: 0,
    danglingChapters: 0, clearedSourceRunIds: 0, clearedReferenceOrders: 0, normalizedPromptSlots: 0,
  }
  const plan = planSweep(data)
  // 死字段：`assetPromptRuns` 已从类型移除（全项目零读写），旧库里可能还留着一坨
  delete (data as unknown as Record<string, unknown>).assetPromptRuns

  // ① 章节树里已不存在的章节：名下数据先整体清掉
  if (plan.dangling.length) {
    const chapterReport = cleanupChapterData(data, plan.dangling)
    report.analyses += chapterReport.analyses
    report.scripts += chapterReport.scripts
    report.storyboardRuns += chapterReport.storyboardRuns
    report.panelArtworks += chapterReport.panelArtworks
    report.assetExtractionRuns += chapterReport.assetExtractionRuns
    report.chapterAssets += chapterReport.chapterAssets
    report.variants += chapterReport.variants
    report.assets += chapterReport.assets
    report.repairedRuns += chapterReport.repairedRuns
    report.danglingChapters = plan.dangling.length
  }

  // ② 分镜版本与派生的画面工件
  const storyboardRuns = (data.storyboardRuns ?? []).filter((run) => plan.keepRunIds.has(run.id))
  const panelArtworks = (data.panelArtworks ?? []).filter((artwork) => plan.livePanelIds.has(artwork.panelId))
    .map((artwork) => {
      let next = artwork
      // 死字段：`referenceImageOrder` 随右栏上移/下移一起下线，清单已不再消费它。
      // 留着只会让图号受一个「界面上看不见也改不了」的顺序影响，直接清掉。
      if (next.referenceImageOrder?.length) {
        report.clearedReferenceOrders += 1
        next = { ...next }
        delete next.referenceImageOrder
      }
      // 脏数据自愈：候选提示词的 `text` 可能是 null（中间态写入），
      // 读入侧虽已归一，但库里的 null 会让任何直接 `.trim()` 的消费方抛错（曾导致右栏整块空白）。
      if (next.genPrompts?.some((slot) => typeof slot.text !== 'string')) {
        report.normalizedPromptSlots += 1
        next = { ...next, genPrompts: next.genPrompts.map(normalizeGenPromptSlot) }
      }
      return next
    })

  // ③ 提取记录与章节引用上的溯源 id
  const assetExtractionRuns = (data.assetExtractionRuns ?? []).filter((run) => plan.keepExtractRunIds.has(run.id))
  const chapterAssets = (data.chapterAssets ?? []).map((entry) => {
    if (!entry.sourceExtractionRunId || plan.keepExtractRunIds.has(entry.sourceExtractionRunId)) return entry
    report.clearedSourceRunIds += 1
    // 刻意不动 updatedAt：这是记账清理，不是资产内容变更 —— 分镜页靠它判断「资产是否在分镜之后变过」
    return { ...entry, sourceExtractionRunId: undefined }
  })

  // ④ 章节资产引用上的悬空指针（覆盖式确认删状态时留下的跨章残留）
  const repairedChapterAssets = repairDanglingChapterAssets(chapterAssets, data.assets ?? [], buildChapterOrders(data))
  report.reassignedChapterAssets = repairedChapterAssets.reassigned
  report.droppedChapterAssets = repairedChapterAssets.dropped

  report.storyboardRuns += (data.storyboardRuns ?? []).length - storyboardRuns.length
  report.panelArtworks += (data.panelArtworks ?? []).length - panelArtworks.length
  report.assetExtractionRuns += (data.assetExtractionRuns ?? []).length - assetExtractionRuns.length

  data.storyboardRuns = storyboardRuns
  data.panelArtworks = panelArtworks
  data.assetExtractionRuns = assetExtractionRuns
  data.chapterAssets = repairedChapterAssets.chapterAssets
  return report
}

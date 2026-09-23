import type { ComicProject, LongProjectAsset, LongProjectAssetType, LongProjectNode } from '@comic/types'
import { effectiveVariantRefImages } from './panelPromptService'

/**
 * 长篇项目全局资产库（跨项目聚合）。
 *
 * 口径：
 * - 只聚合 `projectType === 'long'` 的项目；
 * - 只收项目级资产（`scope !== 'chapter'`），与原项目内资产库一致；
 * - 章节选项来自节点树（type === 'chapter'，按 order → createdAt 排序，与侧栏树同序）；
 * - 卡片缩略图走 `effectiveVariantRefImages`（生成图 + 上传成品图），
 *   不含 `referenceImageIds` 上传参考图 —— 2026-09-23 定稿口径。
 * - 本文件全部是纯函数：聚合与过滤不碰 DB，视图层负责加载与写回。
 */

/** 一条项目级资产 + 它所属的项目（全局库的最小展示单元）。 */
export interface LongAssetLibraryEntry {
  projectId: string
  projectName: string
  asset: LongProjectAsset
}

/** 筛选条第二行的项目选项，携带第三行需要的章节选项。 */
export interface LongAssetLibraryProjectOption {
  projectId: string
  projectName: string
  chapters: { id: string; name: string }[]
}

export interface LongAssetLibraryIndex {
  entries: LongAssetLibraryEntry[]
  projects: LongAssetLibraryProjectOption[]
}

/** 四级筛选：类别 / 项目 / 章节 / 关键词（null = 全部；keyword 为空 = 不过滤）。 */
export interface LongAssetLibraryFilters {
  category: LongProjectAssetType | null
  projectId: string | null
  chapterId: string | null
  keyword: string
}

const nodeOrder = (a: LongProjectNode, b: LongProjectNode) => a.order - b.order || a.createdAt - b.createdAt;

/** 归一化关键词比较：trim + 小写 + 去所有空白（与资产归属匹配的 nameKey 口径一致）。 */
function nameKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '')
}

/**
 * 跨项目聚合长篇项目级资产与章节选项。
 * 口径（2026-09-23 放开）：**不过滤 `scope`** —— 章节提取确认后的资产默认 `scope='chapter'`，
 * 用户的实际工作流从不同步到 project 公共库，旧口径会让资产库永远为空。
 * 同名项目不去重（项目 id 唯一），顺序按传入顺序（DB 返回序）。
 */
export function collectLongAssetLibrary(projects: ComicProject[]): LongAssetLibraryIndex {
  const entries: LongAssetLibraryEntry[] = []
  const projectOptions: LongAssetLibraryProjectOption[] = []
  for (const project of projects) {
    if (project.projectType !== 'long') continue
    const chapters = (project.longProjectData?.nodes ?? [])
      .filter((node) => node.type === 'chapter')
      .sort(nodeOrder)
      .map((node) => ({ id: node.id, name: node.name }))
    projectOptions.push({ projectId: project.id, projectName: project.name, chapters })
    for (const asset of project.longProjectData?.assets ?? []) {
      entries.push({ projectId: project.id, projectName: project.name, asset })
    }
  }
  return { entries, projects: projectOptions }
}

/**
 * 四级过滤。章节筛选 = `asset.sourceChapterIds` 包含该章节（跨章资产在每个来源章都能命中）；
 * 来源章节为空的资产只出现在「全部章节」里。
 */
export function filterLibraryEntries(entries: LongAssetLibraryEntry[], filters: LongAssetLibraryFilters): LongAssetLibraryEntry[] {
  const keyword = nameKey(filters.keyword)
  return entries.filter((entry) => {
    if (filters.category && entry.asset.type !== filters.category) return false
    if (filters.projectId && entry.projectId !== filters.projectId) return false
    if (filters.chapterId && !entry.asset.sourceChapterIds.includes(filters.chapterId)) return false
    if (keyword) {
      const hit = nameKey(entry.asset.name) === keyword
        || entry.asset.aliases.some((alias) => nameKey(alias) === keyword)
        || nameKey(entry.asset.name).includes(keyword)
        || entry.asset.aliases.some((alias) => nameKey(alias).includes(keyword))
      if (!hit) return false
    }
    return true
  })
}

/** 按类别计数（含「全部」），供筛选条徽标。 */
export function countByCategory(entries: LongAssetLibraryEntry[]): Record<LongProjectAssetType | 'all', number> {
  const counts: Record<LongProjectAssetType | 'all', number> = { all: entries.length, character: 0, scene: 0, prop: 0 }
  for (const entry of entries) counts[entry.asset.type] += 1
  return counts
}

/** 按项目计数，供筛选条项目行徽标。 */
export function countByProject(entries: LongAssetLibraryEntry[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const entry of entries) counts.set(entry.projectId, (counts.get(entry.projectId) ?? 0) + 1)
  return counts
}

/**
 * 卡片缩略图：按视觉状态顺序找第一张有效参考图（生成图 + 上传成品图）。
 * 上传的参考图（referenceImageIds）不进缩略图。
 */
export function assetCardThumbnail(asset: LongProjectAsset): string | undefined {
  for (const variant of asset.variants) {
    const [first] = effectiveVariantRefImages(variant)
    if (first) return first
  }
  return undefined
}

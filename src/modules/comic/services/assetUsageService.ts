import type {
  LongProjectAsset,
  LongProjectChapterAsset,
  LongProjectStoryboardRun,
} from '@comic/types'
import { resolvePanelAssetStates } from './panelPromptService'
import { buildPanelRefManifest } from './panelRefManifest'

/**
 * 单个视觉状态被引用的情况（生图工作台展示用）。
 * - 章节引用来自 `chapterAssets`（variantId 为空 = 引用该资产全部状态）；
 * - 分镜引用来自 `resolvePanelAssetStates`（**页级绑定 ∪ 格级「出场资产」声明**）：
 *   同资产多状态时各状态分别计一次，格级独有的状态（如换装页第 1 格的便装）同样计入，
 *   避免"格级在用却显示 0 镜引用"；
 * - **图片角标来自参考图清单**（`buildPanelRefManifest`），与生图真正发送的图完全一致。
 */
export interface AssetVariantUsage {
  /** 引用该视觉状态的章节名（去重；调用方给名称解析器，缺省回落到章节 id）。 */
  chapterNames: string[]
  /** 引用该视觉状态的分镜数（按 panelId 去重，覆盖全部章节）。 */
  panelCount: number
  /** 参考图 url → 实际会取到这张图的分镜数（单选口径下，一个分镜一个状态只贡献一张图）。 */
  imagePanelCount: Record<string, number>
}

export interface AssetUsageIndex {
  /** variantId → 引用情况 */
  variants: Map<string, AssetVariantUsage>
  /** assetId → 引用该资产的章节名（整资产引用也算） */
  assets: Map<string, string[]>
}

/**
 * 构建资产引用索引：谁在用这个资产的哪个视觉状态、哪张参考图。
 *
 * 图片口径与分镜页取图严格一致（统一走 `resolvePanelRefImage`）：**单选** ——
 * 分镜手动选过 `selectedImageIds[0]` 且该图仍在状态里就用它，否则用该状态第一张；
 * 该状态没有参考图则不产生图片统计。
 * 这样工作台标出的「在用的图」就是生图时真正会发给模型的图，不会出现标了却没用、或用了却没标的情况。
 *
 * 纯函数，不依赖任何 store；调用方负责把章节 id 映射成可读名称。
 */
export function buildAssetUsageIndex(options: {
  assets: LongProjectAsset[]
  chapterAssets?: LongProjectChapterAsset[]
  storyboardRuns?: LongProjectStoryboardRun[]
  /** 章节 id → 名称（缺省直接显示 id）。 */
  chapterNameOf?: (chapterId: string) => string
}): AssetUsageIndex {
  const { assets, chapterAssets = [], storyboardRuns = [], chapterNameOf } = options
  const nameOf = chapterNameOf ?? ((id: string) => id)
  const assetById = new Map(assets.map((asset) => [asset.id, asset]))

  /** variantId → 引用它的章节名 */
  const variantChapters = new Map<string, Set<string>>()
  /** variantId → 引用它的 panelId */
  const variantPanels = new Map<string, Set<string>>()
  /** variantId → image → 取到这张图的 panelId */
  const variantImagePanels = new Map<string, Map<string, Set<string>>>()
  /** assetId → 引用它的章节名 */
  const assetChapters = new Map<string, Set<string>>()

  const push = (map: Map<string, Set<string>>, key: string, value: string) => {
    const set = map.get(key) ?? new Set<string>()
    set.add(value)
    map.set(key, set)
  }

  // 1) 章节引用（整资产引用 → 该资产全部状态都算被这一章引用）
  for (const entry of chapterAssets) {
    const asset = assetById.get(entry.assetId)
    if (!asset) continue
    const chapterName = nameOf(entry.chapterId)
    push(assetChapters, entry.assetId, chapterName)
    if (entry.variantId) {
      push(variantChapters, entry.variantId, chapterName)
    } else {
      for (const variant of asset.variants) push(variantChapters, variant.id, chapterName)
    }
  }

  // 2) 分镜绑定：「被 N 镜引用」按绑定状态展开（无参考图的状态也计入），
  //    图片角标改走参考图清单 —— 与生图实际发送的图完全同源，避免「用了却没标」。
  for (const run of storyboardRuns) {
    for (const panel of run.panels ?? []) {
      for (const { variant } of resolvePanelAssetStates(panel, assets)) {
        push(variantPanels, variant.id, panel.id)
      }
      for (const entry of buildPanelRefManifest({ panel, assets }).entries) {
        if (entry.source !== 'asset' || !entry.variantId) continue
        const perImage = variantImagePanels.get(entry.variantId) ?? new Map<string, Set<string>>()
        const set = perImage.get(entry.image) ?? new Set<string>()
        set.add(panel.id)
        perImage.set(entry.image, set)
        variantImagePanels.set(entry.variantId, perImage)
      }
    }
  }

  const variantIds = new Set([...variantChapters.keys(), ...variantPanels.keys()])
  const variants = new Map<string, AssetVariantUsage>()
  for (const variantId of variantIds) {
    const perImage = variantImagePanels.get(variantId)
    const imagePanelCount: Record<string, number> = {}
    if (perImage) for (const [image, panels] of perImage) imagePanelCount[image] = panels.size
    variants.set(variantId, {
      chapterNames: [...(variantChapters.get(variantId) ?? [])],
      panelCount: variantPanels.get(variantId)?.size ?? 0,
      imagePanelCount,
    })
  }

  return {
    variants,
    assets: new Map([...assetChapters].map(([assetId, names]) => [assetId, [...names]])),
  }
}

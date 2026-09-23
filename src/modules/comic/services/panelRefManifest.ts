/**
 * 分镜参考图清单（`panelRefManifest`）—— **全项目唯一的图号事实来源**。
 *
 * 一张图「是第几号」只在这里算一次，生图取图、右栏参考图分组、最终生图提示词、
 * 资产工作台引用统计全部读同一份清单，杜绝「标了在用其实没用」「用了却没标」的口径漂移。
 *
 * 编号规则（严格按下述顺序，**从前向后**编号）：
 * 1. 「插入最前」且启用参考图的共用属性块 —— 按 `sortOrder` 升序，块内按上传顺序；
 * 2. 资产图 —— **人物 → 场景 → 道具**，组内按页级绑定顺序；每个视觉状态取 **1 张**
 *    （单选口径见 `resolvePanelRefImage`）。
 *
 * 「插入最后」的块**不参与**取图与编号：图号是从前往后编的，而后置属性的文字出现在画面描述
 * 之后，若它也带图，图号顺序与文字出现顺序必然错位。（数据保留，切回 front 即恢复。）
 *
 * **不做截断**：清单返回全部参考图，由生图侧按需取用。
 *
 * 纯函数、无副作用、无缓存 —— 因此「改图后序号实时更新」是天然的：改图 / 换状态 / 调顺序
 * 都会在下一次拼装时立刻反映，不需要任何刷新按钮或落库同步。
 *
 * 画面内容推导模型不接收这份清单；最终图号定义由 `composeFinalPrompt` 在生图前生成。
 */

import { getBlocksByPosition } from '@comic/utils/sharedBlocks'
import { resolvePanelAssetStates, resolvePanelRefImage } from './panelPromptService'
import { resolveRefUsageTemplate } from './refUsage'
import type { LongProjectAsset, LongProjectAssetType, LongProjectStoryboardPanel, SharedPromptBlock } from '@comic/types'

/** 资产类型的图号顺序：人物 → 场景 → 道具。 */
export const ASSET_REF_ORDER: LongProjectAssetType[] = ['character', 'scene', 'prop']

/** 清单中的一条参考图。 */
export interface PanelRefEntry {
  /** 全局 1-based 图号 = 传给生图模型的数组下标 + 1。 */
  index: number
  /** 来源：共用属性 / 资产。 */
  source: 'shared' | 'asset'
  /** 共用属性：块名；资产：资产名。 */
  label: string
  /** 共用属性条目所属块 id。 */
  blockId?: string
  /** 资产条目：资产类型。 */
  assetType?: LongProjectAssetType
  /** 资产条目：资产 id。 */
  assetId?: string
  /** 资产条目：视觉状态名。 */
  variantName?: string
  /** 资产条目：视觉状态 id（引用统计按它归组）。 */
  variantId?: string
  /** 资产条目：该状态出现的格序（0 起）；页级绑定（无格级声明）时为空数组。 */
  cellIndexes?: number[]
  /**
   * 资产条目：用途描述模板（资产级覆盖 → 项目级配置 → 内置默认，已在清单层解析好）。
   * `图N`、资产名、格号由代码算，这里只承载「资产名（状态）」之后那整句。
   */
  usageTemplate?: string
  /** 图片地址。 */
  image: string
}

/** 参考图清单：`images[i]` 就是「图 i+1」，可直接喂给生图模型。 */
export interface PanelRefManifest {
  images: string[]
  entries: PanelRefEntry[]
}

/**
 * 构建某分镜的参考图清单（编号见文件头注释）。
 *
 * @param args.panel - 分镜
 * @param args.assets - 项目资产库
 * @param args.sharedBlocks - 绘图配置的共用属性（只取「插入最前」组）
 *
 * **不再接受手动排序**（`referenceOrder` 已下线）：右栏取消上移/下移后，一个界面上看不见
 * 也改不了的顺序会让图号变得无法预测，因此顺序恒定按上面的默认规则。
 */
export function buildPanelRefManifest(args: {
  panel: LongProjectStoryboardPanel
  assets: LongProjectAsset[]
  sharedBlocks?: SharedPromptBlock[] | null
  /** 项目级参考图用途描述模板（按资产类型）；资产自带 `refUsage` 时优先用资产的。 */
  refUsage?: Partial<Record<LongProjectAssetType, string>>
}): PanelRefManifest {
  const entries: PanelRefEntry[] = []

  // ① 插入最前的共用属性图
  for (const block of getBlocksByPosition(args.sharedBlocks, 'front')) {
    if (!block.enableRefImages) continue
    for (const image of block.referenceImages ?? []) {
      entries.push({
        index: 0,
        source: 'shared',
        label: block.name,
        blockId: block.id,
        image,
      })
    }
  }

  // ② 资产图：人物 → 场景 → 道具；组内保持页级绑定/状态展开顺序
  const states = resolvePanelAssetStates(args.panel, args.assets)
  for (const type of ASSET_REF_ORDER) {
    for (const { asset, variant, cellIndexes, binding } of states.filter((entry) => entry.asset.type === type)) {
      const image = resolvePanelRefImage(variant, binding ?? {})
      if (!image) continue
      entries.push({
        index: 0,
        source: 'asset',
        label: asset.name,
        assetId: asset.id,
        assetType: type,
        variantName: variant.name,
        variantId: variant.id,
        cellIndexes,
        usageTemplate: resolveRefUsageTemplate(type, asset.refUsage, args.refUsage),
        image,
      })
    }
  }

  // 默认顺序即最终顺序（手动排序已下线），直接编号：entries[i] 就是「图 i+1」。
  const indexed = entries.map((entry, index) => ({ ...entry, index: index + 1 }))
  return { images: indexed.map((entry) => entry.image), entries: indexed }
}

/** 清单按资产类型分组（右栏图号速览使用；共用属性归入 style 组）。 */
export interface ManifestRefGroup {
  type: LongProjectAssetType | 'style'
  images: string[]
  entries: PanelRefEntry[]
}

/** 按类型分组清单；每组内部保留当前全局图号顺序。 */
export function groupManifestByType(manifest: PanelRefManifest): ManifestRefGroup[] {
  const groups: ManifestRefGroup[] = [
    { type: 'style', images: [], entries: [] },
    { type: 'character', images: [], entries: [] },
    { type: 'scene', images: [], entries: [] },
    { type: 'prop', images: [], entries: [] },
  ]
  for (const entry of manifest.entries) {
    const type = entry.source === 'shared' ? 'style' : (entry.assetType ?? 'prop')
    const group = groups.find((item) => item.type === type)
    if (!group) continue
    group.images.push(entry.image)
    group.entries.push(entry)
  }
  return groups
}

/**
 * 分镜参考图清单（`panelRefManifest`）—— **全项目唯一的图号事实来源**。
 *
 * 一张图「是第几号」只在这里算一次，生图取图、右栏参考图分组、画面描述提示词、
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
 * 清单有两副面孔，来自同一份 entries：
 * - `buildRefManifestText()`：完整清单（含共用属性图），用于人工核对；
 * - `buildRefManifestText(m, { assetsOnly: true })`：喂给模型的资产图号清单，**图号不变**。
 */

import { getBlocksByPosition } from '@comic/utils/sharedBlocks'
import { resolvePanelAssetStates, resolvePanelRefImage } from './panelPromptService'
import type { LongProjectAsset, LongProjectAssetType, LongProjectStoryboardPanel, SharedPromptBlock } from '@comic/types'

/** 资产类型的图号顺序：人物 → 场景 → 道具。 */
export const ASSET_REF_ORDER: LongProjectAssetType[] = ['character', 'scene', 'prop']

/** 资产类型中文名（清单文本用）。 */
const ASSET_TYPE_LABEL: Record<LongProjectAssetType, string> = { character: '人物', scene: '场景', prop: '道具' }

/** 资产类型的用途声明（清单文本用）。 */
const ASSET_TYPE_USAGE: Record<LongProjectAssetType, string> = {
  character: '仅用于人物身份、脸部、发型、服装与外貌特征',
  scene: '仅用于环境与空间布局',
  prop: '仅用于道具外观与材质',
}

/** 共用属性图的用途声明。 */
const SHARED_USAGE = '仅用于该属性描述所述的用途'

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
  /** 资产条目：视觉状态名。 */
  variantName?: string
  /** 资产条目：视觉状态 id（引用统计按它归组）。 */
  variantId?: string
  /** 资产条目：该状态出现的格序（0 起）；页级绑定（无格级声明）时为空数组。 */
  cellIndexes?: number[]
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
 */
export function buildPanelRefManifest(args: {
  panel: LongProjectStoryboardPanel
  assets: LongProjectAsset[]
  sharedBlocks?: SharedPromptBlock[] | null
}): PanelRefManifest {
  const entries: PanelRefEntry[] = []
  let next = 1

  // ① 插入最前的共用属性图
  for (const block of getBlocksByPosition(args.sharedBlocks, 'front')) {
    if (!block.enableRefImages) continue
    for (const image of block.referenceImages ?? []) {
      entries.push({ index: next++, source: 'shared', label: block.name, blockId: block.id, image })
    }
  }

  // ② 资产图：人物 → 场景 → 道具；组内保持页级绑定/状态展开顺序
  const states = resolvePanelAssetStates(args.panel, args.assets)
  for (const type of ASSET_REF_ORDER) {
    for (const { asset, variant, cellIndexes, binding } of states.filter((entry) => entry.asset.type === type)) {
      const image = resolvePanelRefImage(variant, binding ?? {})
      if (!image) continue
      entries.push({
        index: next++,
        source: 'asset',
        label: asset.name,
        assetType: type,
        variantName: variant.name,
        variantId: variant.id,
        cellIndexes,
        image,
      })
    }
  }

  return { images: entries.map((entry) => entry.image), entries }
}

/**
 * 清单 → 提示词文本：逐图声明「图N = 谁、用于什么」。
 *
 * 形如：
 * ```
 * 图3 = 萧薰儿 · 战斗服（人物，第1-2格；仅用于人物身份、脸部、发型、服装与外貌特征）
 * ```
 *
 * 原则是**序号由代码算，语义由模型写**：模型只负责「使用图3保持萧薰儿与第1格一致」，
 * 绝不允许模型自己数图号。
 *
 * `options.assetsOnly`（推导提示词专用）：只列**资产**参考图，共用属性图只留占位说明。
 * 画面描述环节不需要看到共用属性（它由 `composeFinalPrompt` 在生成后拼到描述之外），
 * 但图号必须保持生图时的真实序号，否则模型写的「图3」会对不上真正传进去的第三张图。
 */
export function buildRefManifestText(
  manifest: PanelRefManifest,
  options: { assetsOnly?: boolean } = {},
): string {
  const entries = options.assetsOnly ? manifest.entries.filter((entry) => entry.source === 'asset') : manifest.entries
  if (!entries.length) return ''
  const lines = entries.map((entry) => {
    if (entry.source === 'shared') {
      return `图${entry.index} = ${entry.label}（共用属性，${SHARED_USAGE}）`
    }
    const type = entry.assetType ?? 'prop'
    const cellText = entry.cellIndexes?.length ? `第${entry.cellIndexes.map((index) => index + 1).join('、')}格` : '整镜'
    const variantText = entry.variantName ? ` · ${entry.variantName}` : ''
    return `图${entry.index} = ${entry.label}${variantText}（${ASSET_TYPE_LABEL[type]}，${cellText}；${ASSET_TYPE_USAGE[type]}）`
  })
  if (!options.assetsOnly) return lines.join('\n')
  const sharedNumbers = manifest.entries.filter((entry) => entry.source === 'shared').map((entry) => entry.index)
  const note = sharedNumbers.length
    ? `（${sharedNumbers.map((index) => `图${index}`).join('、')} 为前置共用属性参考图，由系统在画面描述之外另行拼接，无需在描述中引用）`
    : ''
  return [note, ...lines].filter(Boolean).join('\n')
}

/** 清单按资产类型分组（右栏「参考图设置」勾选项用；共用属性归入 style 组）。 */
export interface ManifestRefGroup {
  type: LongProjectAssetType | 'style'
  images: string[]
  entries: PanelRefEntry[]
}

/** 按类型分组清单；组顺序与图号顺序一致（style → 人物 → 场景 → 道具）。 */
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

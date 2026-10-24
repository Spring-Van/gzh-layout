import type { LongProjectAsset, LongProjectAssetType, LongProjectAssetVariant, LongProjectChapterAsset } from '@comic/types'
import { ASSET_TYPE_ORDER } from '@comic/utils/assetTypeTheme'

/**
 * 资产「图片」视图的数据：把本章引用的资产拉平成「一张图 = 一项」。
 *
 * 这个视图只做浏览，唯一的口径问题是**排序** —— 章 `chapterAssets` 是引用列表，
 * 顺序会随提取/确认交错（人物A、人物B、人物A 的另一个状态），
 * 直接按列表铺进瀑布流会把同一个资产的图拆散到各处，看起来像别人的图。
 *
 * 所以排序分三层：
 * 1. **资产类型**：人物 → 场景 → 道具（`ASSET_TYPE_ORDER`），同类型内保持首次引用顺序（`sort` 稳定）；
 * 2. **资产内状态**：按资产自己的 `variants` 顺序（= 状态定义顺序），不跟着引用顺序跳；
 * 3. **状态内图**：按 `generatedImageIds` 顺序。
 *
 * 同一变体可能被多条 entry 引用（一个状态挂多处章节引用），按变体 id 去重，图不会重复。
 * 没有生成图的状态**不产任何一项**（不做占位卡：建档在「信息」tab）。
 */
export interface ChapterAssetShot {
  /** 图片级唯一键（变体 id + 状态内序号），用作 `v-for` key 与预览定位。 */
  key: string
  /** 所属资产 id —— 视图按它分行，同一个资产的图横向排在一起。 */
  assetId: string
  url: string
  assetName: string
  variantName: string
  /** 预览 / 无障碍用的整句描述（`资产名 · 状态名`）。 */
  alt: string
  /** 下载文件名（不含扩展名；主进程按真实图片类型补后缀）。 */
  filename: string
  /** 该状态共有几张生成图（>1 时文件名带序号，避免互相覆盖）。 */
  total: number
  /** 该状态内的序号（0 起）。 */
  index: number
}

const TYPE_RANK = new Map<LongProjectAssetType, number>(
  ASSET_TYPE_ORDER.map((type, rank) => [type, rank]),
)

function rankOf(asset: LongProjectAsset): number {
  return TYPE_RANK.get(asset.type) ?? ASSET_TYPE_ORDER.length
}

export function buildChapterAssetShots(
  entries: LongProjectChapterAsset[],
  assets: LongProjectAsset[],
): ChapterAssetShot[] {
  // 资产 id → { 资产, 本章引用到的状态（去重后） }
  const buckets = new Map<string, { asset: LongProjectAsset; variants: LongProjectAssetVariant[] }>()
  const firstSeen: string[] = []
  for (const entry of entries) {
    const asset = assets.find((item) => item.id === entry.assetId)
    if (!asset) continue
    let bucket = buckets.get(asset.id)
    if (!bucket) {
      bucket = { asset, variants: [] }
      buckets.set(asset.id, bucket)
      firstSeen.push(asset.id)
    }
    // 引用指定了状态时只看该状态；未指定（旧数据）时看资产全部状态
    const variants = entry.variantId ? asset.variants.filter((variant) => variant.id === entry.variantId) : asset.variants
    for (const variant of variants) {
      if (!bucket.variants.some((item) => item.id === variant.id)) bucket.variants.push(variant)
    }
  }

  const ordered = firstSeen
    .map((id) => buckets.get(id)!)
    .sort((a, b) => rankOf(a.asset) - rankOf(b.asset))

  const shots: ChapterAssetShot[] = []
  for (const bucket of ordered) {
    // 状态按资产自身定义顺序排（引用顺序可能是乱的），并只保留本章引用到的那些
    const variants = bucket.asset.variants.filter((variant) => bucket.variants.some((item) => item.id === variant.id))
    for (const variant of variants) {
      const images = (variant.generatedImageIds ?? []).filter(Boolean)
      images.forEach((url, index) => {
        shots.push({
          key: `${variant.id}:${index}`,
          assetId: bucket.asset.id,
          url,
          assetName: bucket.asset.name,
          variantName: variant.name ?? '',
          alt: `${bucket.asset.name}${variant.name ? ` · ${variant.name}` : ''}`,
          filename: `${bucket.asset.name}${variant.name ? `_${variant.name}` : ''}${images.length > 1 ? `_${index + 1}` : ''}`,
          total: images.length,
          index,
        })
      })
    }
  }
  return shots
}

/** 一个资产（及其全部生成图）在图片视图里占一整行。 */
export interface ChapterAssetShotGroup {
  assetId: string
  assetName: string
  shots: ChapterAssetShot[]
}

/**
 * 按资产分组，供视图「一个资产一行、行内横向排列」。
 *
 * `buildChapterAssetShots` 已经把同一资产的图排成连续一段，所以这里只需顺次切分，
 * 不必再查表 —— 也顺带保证了「分组」和「排序」不会各说一套。
 * 空输入返回空数组（视图据此显示空态）。
 */
export function groupChapterAssetShots(shots: ChapterAssetShot[]): ChapterAssetShotGroup[] {
  const groups: ChapterAssetShotGroup[] = []
  for (const shot of shots) {
    const last = groups[groups.length - 1]
    if (last && last.assetId === shot.assetId) {
      last.shots.push(shot)
      continue
    }
    groups.push({ assetId: shot.assetId, assetName: shot.assetName, shots: [shot] })
  }
  return groups
}

import { Box, MapPin, UserRound, type LucideIcon } from 'lucide-vue-next'
import type { LongProjectAssetType } from '@comic/types'

/**
 * 资产类型主题：人物 / 场景 / 道具 的标签、图标与配色令牌。
 *
 * **颜色值不在这里** —— 三个颜色定义在 `src/theme/tokens.css` 的 `--asset-character` /
 * `--asset-scene` / `--asset-prop`（浅色与暗色各一份），全项目改色只需动那一个文件。
 * 本文件只负责「类型 → 用哪个令牌、叫什么、配什么图标」这层映射，避免颜色值散落各处。
 */

export interface AssetTypeTheme {
  /** 中文标签，用于 tab、提示文案。 */
  label: string
  /** 该类型的配色 CSS 变量名，如 `--asset-character`。 */
  token: string
  icon: LucideIcon
}

export const ASSET_TYPE_THEME: Record<LongProjectAssetType, AssetTypeTheme> = {
  character: { label: '人物', token: '--asset-character', icon: UserRound },
  scene: { label: '场景', token: '--asset-scene', icon: MapPin },
  prop: { label: '道具', token: '--asset-prop', icon: Box },
}

/** 三个分类的固定顺序（tab、分组展示统一按它排）。 */
export const ASSET_TYPE_ORDER: LongProjectAssetType[] = ['character', 'scene', 'prop']

/** 类型中文标签（未匹配时回落到「未匹配」）。 */
export function assetTypeLabel(type?: LongProjectAssetType | null): string {
  return type ? ASSET_TYPE_THEME[type].label : '未匹配'
}

/** 类型图标。 */
export function assetTypeIcon(type?: LongProjectAssetType | null): LucideIcon {
  return type ? ASSET_TYPE_THEME[type].icon : Box
}

/**
 * 类型配色令牌的 CSS 变量引用，如 `var(--asset-character)`。
 * 给必须用行内样式着色（无法提前写死类名）的地方用，例如浮层里按资产类型高亮「当前状态」。
 */
export function assetTokenVar(type?: LongProjectAssetType | null): string | undefined {
  return type ? `var(${ASSET_TYPE_THEME[type].token})` : undefined
}

/**
 * 输入框内高亮该资产名用的内联样式。
 * 文字取令牌本色，底色由同一令牌派生（`color-mix` 需要 Chromium ≥111，Electron 30 已满足）。
 */
export function assetHighlightStyle(type: LongProjectAssetType): Record<string, string> {
  const { token } = ASSET_TYPE_THEME[type]
  return {
    color: `var(${token})`,
    background: `color-mix(in srgb, var(${token}) 14%, transparent)`,
  }
}

/**
 * 资产 Tag 的样式类（定义在 `src/style.css`，同样由令牌驱动）。
 * 未匹配资产用琥珀虚线，与类型无关 —— 那是状态而不是类型。
 */
export function assetTagClass(type?: LongProjectAssetType | null): string {
  return type ? `asset-tag asset-tag--${type}` : 'asset-tag asset-tag--unmatched'
}

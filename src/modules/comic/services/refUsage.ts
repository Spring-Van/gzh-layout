import type { LongProjectAssetType } from '@comic/types'

/**
 * 「动态参考图」清单里每条资产图的用途文案 —— 用户可编辑的部分。
 *
 * 变与不变的分界（这是本模块存在的全部理由）：
 * - **代码算**：`图N`、资产名、`（状态名）`、格号范围 —— 这些必须与真实发送的图片数组严格同序，
 *   一旦交给用户手写就会串图；
 * - **用户写**：`图N = 资产名（状态）` 之后的整句，含类型名与用途声明。
 *
 * 模板里可用两个占位符：
 * - `{类型}` → 人物 / 场景 / 道具
 * - `{格号}` → `第1、3格`（有格级声明时）或 `整镜`
 */

/** 类型名占位符。 */
export const REF_USAGE_TYPE_TOKEN = '{类型}'
/** 格号占位符。 */
export const REF_USAGE_SCOPE_TOKEN = '{格号}'

const TYPE_LABEL: Record<LongProjectAssetType, string> = {
  character: '人物',
  scene: '场景',
  prop: '道具',
}

/** 内置默认文案 —— 与 2026-09-22 之前硬编码在 `buildFinalPromptSections` 里的完全一致。 */
export const DEFAULT_REF_USAGE: Record<LongProjectAssetType, string> = {
  character: `${REF_USAGE_TYPE_TOKEN}参考，仅用于${REF_USAGE_SCOPE_TOKEN}的人物身份、脸部、发型、服装与外貌特征`,
  scene: `${REF_USAGE_TYPE_TOKEN}参考，仅用于${REF_USAGE_SCOPE_TOKEN}的环境与空间布局`,
  prop: `${REF_USAGE_TYPE_TOKEN}参考，仅用于${REF_USAGE_SCOPE_TOKEN}的道具外观与材质`,
}

/** 资产类型的中文名（用途文案里 `{类型}` 的取值）。 */
export function assetTypeLabel(type: LongProjectAssetType): string {
  return TYPE_LABEL[type]
}

/**
 * 解析某个资产该用哪条用途模板，优先级：**资产级覆盖 → 项目级配置 → 内置默认**。
 * 空字符串视为未填写，继续向下回落（用户清空输入即回到默认）。
 */
export function resolveRefUsageTemplate(
  assetType: LongProjectAssetType,
  assetOverride?: string,
  projectUsage?: Partial<Record<LongProjectAssetType, string>>,
): string {
  const override = assetOverride?.trim()
  if (override) return override
  const project = projectUsage?.[assetType]?.trim()
  if (project) return project
  return DEFAULT_REF_USAGE[assetType]
}

/** 该模板是否是内置默认（UI 用来提示「未自定义」）。 */
export function isDefaultRefUsage(template: string, assetType: LongProjectAssetType): boolean {
  return template.trim() === DEFAULT_REF_USAGE[assetType]
}

/**
 * 渲染用途文案：替换两个占位符，并保证以句号收尾（用户自己写了句号就不会重复加）。
 * 模板里没写占位符也不会报错 —— 允许用户写完全不依赖类型/格号的固定文案。
 */
export function renderRefUsage(template: string, assetType: LongProjectAssetType, scopeText: string): string {
  // 用 split/join 而不是 replaceAll：项目 tsconfig 的 lib 未开到 ES2021，且占位符是纯文本无需正则
  const text = template
    .split(REF_USAGE_TYPE_TOKEN).join(TYPE_LABEL[assetType])
    .split(REF_USAGE_SCOPE_TOKEN).join(scopeText)
    .trim()
  return text.endsWith('。') ? text : `${text}。`
}

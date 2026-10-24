import type { LongProjectAssetType } from '@comic/types'
import { ASSET_REF_NOTE_TITLES } from './assetSectionTitles'

/**
 * 资产生图的「参考图图号」工具。
 *
 * 🔴 **资产侧不拼【动态参考图】清单**（2026-10-24 用户实报后撤掉）。
 * 清单是**分镜绘图**的机制（`panelRefManifest` / `composeFinalPrompt`），资产侧拼上会犯两个错：
 * ① 共用属性的图在属性块里已经用 `图1、图2 = 绘画风格。` 声明过，再列一遍是纯重复噪音
 *    （一个「绘画风格」块传了 5 张图，就多出 5 行一模一样的说明）；
 * ② 会让人误以为资产侧和分镜侧共用同一套图号口径，改一边以为另一边跟着变。
 *
 * 资产侧的图号说明只走两条路，不需要第三套机制：
 * 1. **共用属性块自带的图号行** —— `utils/sharedBlocks.buildBlockText` 实时算，与发送数组同序；
 * 2. **用户手写的「参考描述」** —— 标题按资产类型给（`buildRefNoteSection`），
 *    图号由选图弹窗按「确认后的最终数组」算好再插入（`previewRefImageIndexes`），
 *    所以增删图之后仍然成立，不用代码再补一段清单。
 */

/**
 * 状态级「参考描述」区段：用户在选图弹窗里写的话，原样拼在共用属性（插入最前）之后。
 *
 * 标题按资产类型给（`【人物角色一致性】`等，见 `assetSectionTitles`）。
 * 最终提示词里**每一段都带【】标签**：共用属性标题、版式段、参考描述段、绘画提示词正文——
 * 标签是模型区分「这段在讲什么」的唯一线索，少一段就少一道护栏。
 *
 * 空串不拼标题。
 */
export function buildRefNoteSection(note?: string | null, assetType?: LongProjectAssetType): string {
  const text = (note ?? '').trim()
  if (!text) return ''
  const title = assetType ? ASSET_REF_NOTE_TITLES[assetType] : '【参考图说明】'
  return `${title}\n${text}`
}

export interface PreviewRefIndexOptions {
  selected: string[]
  /** 追加模式下该状态已有的参考图（决定新图的起始位置） */
  existing: string[]
  append: boolean
  /** 共用属性参考图张数（attachShared 时）；关掉拼接共用属性传 0 */
  baseCount: number
}

/**
 * 预览「这几张图确认后会是图几」——给选图弹窗的「插入图号」按钮用。
 *
 * 必须**按确认后的最终数组**推演，而不是按点击顺序：
 * 追加模式会去重（已在列表里的图不占新位置），替换模式直接按勾选顺序重排。
 * 返回 Map<imageUrl, 图号>。
 */
export function previewRefImageIndexes(options: PreviewRefIndexOptions): Map<string, number> {
  const final = options.append
    ? [...options.existing, ...options.selected.filter((image) => !options.existing.includes(image))]
    : [...options.selected]
  const result = new Map<string, number>()
  final.forEach((image, index) => {
    // 只回填本次勾选的图：已有图不是这次插入的目标
    if (!options.selected.includes(image)) return
    if (result.has(image)) return
    result.set(image, options.baseCount + index + 1)
  })
  return result
}

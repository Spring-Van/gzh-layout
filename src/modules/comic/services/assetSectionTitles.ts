import type { LongProjectAssetType } from '@comic/types'

/**
 * 资产最终提示词的**段落标签**（单一事实源）。
 *
 * 为什么要有它：资产生图的最终提示词是拼接出来的——
 *
 * ```
 * 【绘画风格】… → 【人物角色一致性】… → 【人物版式】… → 【人物描述】… → 【后置约束】…
 * ```
 *
 * 每一段都是不同的东西（全局风格约束 / 用户的参考图话术 / 版式声明 / 主体外貌），
 * 裸正文并排时模型无法判断「这段是版式要求还是人物外貌」，容易把版式说明当成外貌写进画里，
 * 也容易把外貌细节当结构约束丢掉。因此**每一段都要有标签**，且标签按资产类型给。
 *
 * ⚠️ **只有段落标题套【】**：共用属性块里的图号行（`图1、图2 = 绘画风格。`）是一句归属陈述，
 * 套上括号会变成双标签、像又开了一个小节（用户明确要求）。
 *
 * ⚠️ **资产侧不拼【动态参考图】清单** —— 那是分镜绘图的机制，见 `assetRefManifest.ts` 文件头。
 *
 * 改文案只需改这里；渲染点在 `assetRefManifest.buildRefNoteSection`、
 * `LongProjectAssetWorkbench.composeAssetPrompt`、`AssetImagePickerModal` 的提示语（均读本文件）。
 */

/** 版式段标签：配置抽屉里编辑的那三段版式，拼进提示词时套的壳。 */
export const ASSET_LAYOUT_TITLES: Record<LongProjectAssetType, string> = {
  character: '【人物版式】',
  scene: '【场景版式】',
  prop: '【道具版式】',
}

/** 绘画提示词段标签：LLM 生成的「主体自身」那段正文。 */
export const ASSET_DESCRIPTION_TITLES: Record<LongProjectAssetType, string> = {
  character: '【人物描述】',
  scene: '【场景描述】',
  prop: '【道具描述】',
}

/** 参考描述段标签：用户在选图弹窗里手写的「这几张图怎么用」。 */
export const ASSET_REF_NOTE_TITLES: Record<LongProjectAssetType, string> = {
  character: '【人物角色一致性】',
  scene: '【场景一致性】',
  prop: '【道具一致性】',
}

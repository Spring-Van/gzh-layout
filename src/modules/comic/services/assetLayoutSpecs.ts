/**
 * 资产设定图版式（`assetLayoutSpecs`）—— 纯常量 + 纯函数，无副作用、不写库。
 *
 * **为什么版式不写在提示词里**：版式是**按资产类型固定的结构声明**（人物四联图 / 场景全景 /
 * 道具三视图），写进 `asset-prompt` 模板会让模型在每条提示词里复述一遍，既稀释外貌与服装细节，
 * 又让多状态的差异写不出来。现在版式由**生图配置的「版式」设置**在生图前拼接：
 *
 * ```
 * 共用属性（插入最前） → 本类型版式 → 绘画提示词 → 共用属性（插入最后）
 * ```
 *
 * **改版式不必重跑提示词**：版式只在这一刻拼接，不落进 `panel.imagePrompt`。
 *
 * ⚠️ 这里是**纯文字**，不挂参考图、不参与 `getSharedRefImages` 的图号计算 ——
 * 这是它优于「按类型过滤共用属性块」的关键：按类型分段**不会**造成
 * 「文字里的图N 与实际发送的图错位」。
 *
 * ⚠️ **机位图是唯一例外**：状态名含「机位图」时，九宫格版式由 `asset-prompt` 模板在提示词正文里
 * 输出（见 `REF_SHEET_VARIANT_NAME`），本模块的 `resolveLayoutPrompt` 会返回空串跳过场景版式，
 * 避免两种版式同时拼上去打架。这也是本文件要 import 那个常量的唯一原因。
 */

import type { LongProjectAssetType, AssetGenConfig } from '@comic/types'
import { REF_SHEET_VARIANT_NAME } from './sceneRefSheetNeeds'

/**
 * 推荐版式文本（新建底稿）。
 *
 * 两种用法，别混：
 * 1. **配置抽屉的「填入推荐版式」按钮** —— 一键写入 `layoutPrompts`，用户可再改；
 * 2. **`resolveLayoutPrompt` 的「从未配置」兜底** —— `layoutPrompts` 整个字段缺失（旧项目、升级前）
 *    时用它，保证升级后生图行为不回退（版式原先一直由模板输出，突然没有等于静默降级）。
 *
 * 与「留空」的区别要记牢：**字段缺失 = 从没配过**（用推荐版式）；**字段存在但某段为空串 = 用户主动清空**
 * （不拼接）。用户清空后不会被兜底悄悄填回来。
 *
 * ⚠️ **改动这里等于改全链路的版式**。人物那段的「整张图的脸只出现一次」是参考图可读性的红线
 * （全身格里再容人头 → 脸只剩几十像素 → 下游参考到的是糊脸），改版式必查四处：
 * 【转译要求】里的举例、【禁止项】版式类否定句、【自查】、以及本文件。
 */
export const RECOMMENDED_LAYOUT_SPECS: Record<LongProjectAssetType, string> = {
  character:
    '统一角色设定版式：同一人物的四联角色设定图，横向 1×4 非等宽排布——第 1 格是 2:3 竖幅人像，宽度明显大于后三格；第 2~4 格等宽并排。影棚纯色中性灰（18% 灰）无缝背景，柔和伦勃朗光（45° 侧上方主光，面部受光侧形成柔和三角光斑），自然阴影与清晰皮肤细节。第 1 格：正面脸部大特写，2:3 竖幅，直视镜头、头不歪，裁切至锁骨，脸部占该格主要面积。第 2 格：全身正面，正对镜头，画幅从颈部中段以下开始。第 3 格：全身 3/4 前侧，身体转向约 45°，同样从颈部中段以下开始。第 4 格：全身背面，背对镜头，头部至脚部完整。整张图的脸只出现一次：第 1 格是唯一的高分辨率脸部，第 2、3 格头部完全在画幅之外——这是刻意的版式，把画幅让给服装，不是裁切失误，不要补画头部与五官；第 4 格背对镜头、看不到脸。四格一律 A-POSE，双手自然下垂、不持物、不插兜、不抱臂、不背包；四格同身高基准、统一头身比例，第 1 格的脸与第 2~4 格的身体属于同一个人。画面只有本角色与四个画格，不出现第二个人物或动物，无文字、无标注。',
  scene:
    '统一空间全景版式（establishing shot）：广角平视，只交代空间结构与标志物位置的空间全貌图，不做情绪渲染、不做局部特写、不加风格化处理；画面只有该空间本身，不出现人物与动物，除空间固有招牌外无文字与水印。单张单格，不要自行加多视角或多机位。',
  prop: '统一道具设定版式：中性 18% 灰哑光背景，同一件道具的正面、侧面、顶视三个视图等距并排、同比例同大小，另附一处关键细节放大特写；各视图下方或角落标阿拉伯数字 1–4；道具完整入画、不裁切不遮挡，画面中只有该道具，不出现人物、不出现手持动作、不出现场景与台面，除视图标号外不出现任何文字与水印。单张单格拼版，不要自行加其他视角。',
}

/** 版式设置里三个可编辑的类型（顺序即 UI 展示顺序）。 */
export const LAYOUT_SPEC_FIELDS: ReadonlyArray<{
  type: LongProjectAssetType
  label: string
}> = [
  { type: 'character', label: '人物' },
  { type: 'scene', label: '场景' },
  { type: 'prop', label: '道具' },
]

/**
 * 取某资产类型该拼的版式文本。
 *
 * 两条例外都在函数里做（而不是靠调用方自觉）：
 * 1. **机位图豁免**：状态名含「机位图」时返回空串，因为那一条的九宫格版式由 `asset-prompt`
 *    模板写在提示词正文里，再拼上空间全景版式会互相打架；
 * 2. **从未配置的兜底**：`layoutPrompts` 字段缺失（旧项目）时用推荐版式，避免升级即静默丢版式；
 *    字段存在时**完全以用户值为准**（空串 = 主动清空，不再兜底）。
 *
 * @param config - 资产生图配置（读它的 `layoutPrompts`）
 * @param type - 资产类型
 * @param variantName - 视觉状态名（用于机位图判定）
 * @returns 该拼的版式文本；命中豁免或用户清空时返回空串（调用方按空串跳过拼接）
 */
export function resolveLayoutPrompt(
  config: Pick<AssetGenConfig, 'layoutPrompts'> | undefined | null,
  type: LongProjectAssetType,
  variantName?: string,
): string {
  if (type === 'scene' && (variantName ?? '').includes(REF_SHEET_VARIANT_NAME)) return ''
  const configured = config?.layoutPrompts
  if (!configured) return RECOMMENDED_LAYOUT_SPECS[type]
  return configured[type]?.trim() ?? ''
}

/**
 * 场景机位图需求判定（`sceneRefSheetNeeds`）—— 纯函数、无副作用、不写库。
 *
 * 场景需要两种出图样式：
 * 1. **空间全景图**（establishing shot）：每个场景都要，由场景的默认状态承担；
 * 2. **3×3 九宫格机位图**：满足下列**任一**条件时必须出，由场景下名为「机位图」的第二个状态承担。
 *
 * | 触发条件 | 机械口径 |
 * |---|---|
 * | 单章出镜 ≥2 页 | 本章分镜里绑定了该场景的页数 ≥ 2（页级或格级绑定都算） |
 * | 跨章复用 | 引用该场景的章节数 ≥ 2，或任一章节引用标记为 `appearance: 'reused'` |
 * | 场景内机位变化 | 该场景关联的镜头语汇里命中 ≥2 类机位（高机位 / 低机位 / 反打） |
 *
 * 为什么把判定放在这里而不是「资产提取」模板里：提取发生在分镜**之前**，拿不到出镜页数；
 * 而 `asset-prompt` 的状态清单里也没有页数、章节引用与镜头信息。所以这三条只能由程序算。
 *
 * **只读审计**：本模块只回答「哪些场景需要机位图状态」，不创建、不修改任何数据。
 * 补建动作由调用方（资产工作台）在用户点击后执行一次写库；
 * 补建出来的状态带 `origin: 'manual'`，资产提取重新确认时按「非提取产出」豁免保留（见 `assetExtractionConfirm`）。
 */

import { v4 as uuidv4 } from 'uuid'
import type { LongProjectAsset, LongProjectAssetVariant, LongProjectChapterAsset, LongProjectStoryboardPanel } from '@comic/types'

/** 「机位图」机械位图状态的固定名称 —— 资产提示词模板按这个名字选择九宫格版式，不要改。 */
export const REF_SHEET_VARIANT_NAME = '机位图'

/** 机位图状态的剧情锚点：写明它不参与分镜画面，防止分镜把参考图绑到九宫格上。 */
export const REF_SHEET_VARIANT_ANCHOR =
  '空间锚定资料，不参与分镜画面；分镜一律绑定该场景的默认状态。'

/**
 * 机位图状态的视觉描述。
 *
 * 刻意**不复写空间事实**：空间结构、物件位置与光源都在同一场景的默认状态里，
 * 资产提示词生成时两者在同一条清单里同时出现，模板已写明「空间事实取自同一场景默认状态的那条清单条目」。
 * 复写一份反而会在默认状态变更后失效。
 */
export const REF_SHEET_VARIANT_DESCRIPTION =
  '同一空间的 3×3 九宫格机位图：9 个互不重复机位（1 高位俯视／2 正面广角／3 左前 45°／4 右前 45°／5 电影主机位／6 反打机位／7 内部向外／8 侧面横向／9 低机位），每格左上角标阿拉伯数字 1–9；空间结构、物件位置与朝向、光源方向均与同一场景的默认状态一致，只改版式。'

/** 触发原因。 */
export type SceneRefSheetReason = 'multi-page' | 'reused' | 'camera-change'

/** 触发原因的中文说明（UI 提示用）。 */
export const SCENE_REF_SHEET_REASON_TEXT: Record<SceneRefSheetReason, string> = {
  'multi-page': '单章出镜 ≥2 页',
  reused: '跨章复用',
  'camera-change': '场景内机位变化',
}

/** 一个场景的机位图需求判定结果。 */
export interface SceneRefSheetNeed {
  assetId: string
  assetName: string
  /** 命中的触发原因（按固定顺序，至少 1 条）。 */
  reasons: SceneRefSheetReason[]
  /** 本章分镜里绑定了该场景的页数。 */
  panelCount: number
  /** 引用该场景的章节数（含本章）。 */
  chapterCount: number
  /** 命中的机位语汇（去重，按出现顺序）。 */
  cameraHints: string[]
  /** 该场景是否已经有「机位图」状态。 */
  hasRefSheetVariant: boolean
}

/** 整章汇总。 */
export interface SceneRefSheetSummary {
  /** 命中触发条件的场景数。 */
  sceneCount: number
  /** 其中还没有「机位图」状态的数量（= 待补建数）。 */
  pendingCount: number
}

/**
 * 机位语汇分类 —— **同类只算一类**，命中 ≥2 类才算「场景内机位发生变化」。
 *
 * 只收真正表达机位的词：`过肩`、`POV` 虽然也是镜头语言，但它们是分镜的「景别」取值、
 * 在对话戏里高频出现，收进来会让几乎所有场景都被判定需要机位图。
 */
const CAMERA_HINT_CLASSES: Array<{ label: string; pattern: RegExp }> = [
  { label: '高机位', pattern: /俯视|俯拍|俯瞰|鸟瞰|高机位|高角度|自上方/ },
  { label: '低机位', pattern: /仰视|仰拍|低机位|低角度|地面向上|自下方/ },
  { label: '反打', pattern: /反打|反拍|反向|对面视角/ },
]

/** 名称归一化：去掉空白并小写，用于兜底按名字匹配绑定。 */
function normalizedName(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase()
}

/** 该场景可被匹配到的全部名字（主名 + 别名）。 */
function assetNames(asset: LongProjectAsset): Set<string> {
  const names = new Set<string>()
  for (const name of [asset.name, ...(asset.aliases ?? [])]) {
    const trimmed = normalizedName(name ?? '')
    if (trimmed) names.add(trimmed)
  }
  return names
}

/** 一个绑定是否指向该场景（优先 assetId，其次按名字兜底）。 */
function bindingMatchesAsset(
  binding: { assetId?: string; assetName?: string },
  assetId: string,
  names: Set<string>,
): boolean {
  if (binding.assetId) return binding.assetId === assetId
  const name = normalizedName(binding.assetName ?? '')
  return !!name && names.has(name)
}

/** 该分镜是否绑定了指定场景（页级 + 格级）。 */
function panelBindsAsset(
  panel: LongProjectStoryboardPanel,
  assetId: string,
  names: Set<string>,
): boolean {
  if ((panel.assetBindings ?? []).some((binding) => bindingMatchesAsset(binding, assetId, names))) {
    return true
  }
  return (panel.cells ?? []).some((cell) =>
    (cell.assetBindings ?? []).some((binding) => bindingMatchesAsset(binding, assetId, names)),
  )
}

/** 收集该分镜里与场景相关的全部镜头语汇文本。 */
function panelCameraTexts(panel: LongProjectStoryboardPanel): string[] {
  const texts: string[] = []
  if (panel.shot) texts.push(panel.shot)
  for (const cell of panel.cells ?? []) {
    if (cell.shot) texts.push(cell.shot)
    if (cell.camera) texts.push(cell.camera)
  }
  return texts
}

/** 该场景是否已经存在「机位图」状态（按固定名判断，名称含「机位图」即可）。 */
export function hasRefSheetVariant(asset: LongProjectAsset): boolean {
  return (asset.variants ?? []).some((variant) => (variant.name ?? '').includes(REF_SHEET_VARIANT_NAME))
}

/**
 * 判定整章哪些场景需要 3×3 九宫格机位图。
 *
 * @param options.assets - 本章工作资产（场景类型会被筛出，非场景忽略）
 * @param options.panels - 本章分镜（页级 + 格级绑定都会被扫描）
 * @param options.chapterAssets - 项目章节引用表（判断跨章复用）
 * @param options.chapterId - 本章 id（用于把「本章」计入章节数）
 * @returns 命中触发条件的场景，按传入 assets 顺序；未命中的场景不返回
 */
export function auditSceneRefSheetNeeds(options: {
  assets: LongProjectAsset[]
  panels: LongProjectStoryboardPanel[]
  chapterAssets?: LongProjectChapterAsset[]
  chapterId?: string
}): SceneRefSheetNeed[] {
  const { assets, panels, chapterAssets = [], chapterId } = options
  const needs: SceneRefSheetNeed[] = []

  for (const asset of assets) {
    if (asset.type !== 'scene') continue
    const names = assetNames(asset)

    // ① 单章出镜 ≥2 页
    const boundPanels = panels.filter((panel) => panelBindsAsset(panel, asset.id, names))
    const panelCount = boundPanels.length

    // ② 跨章复用
    const refs = chapterAssets.filter((ref) => ref.assetId === asset.id)
    const chapterIds = new Set<string>(asset.sourceChapterIds ?? [])
    for (const ref of refs) if (ref.chapterId) chapterIds.add(ref.chapterId)
    if (chapterId) chapterIds.add(chapterId)
    const chapterCount = chapterIds.size
    const reused = chapterCount >= 2 || refs.some((ref) => ref.appearance === 'reused')

    // ③ 场景内机位变化（≥2 类机位语汇）
    const texts = boundPanels.flatMap(panelCameraTexts).join(' ')
    const cameraHints: string[] = []
    if (texts.trim()) {
      for (const { label, pattern } of CAMERA_HINT_CLASSES) {
        if (pattern.test(texts)) cameraHints.push(label)
      }
    }
    const cameraChange = cameraHints.length >= 2

    const reasons: SceneRefSheetReason[] = []
    if (panelCount >= 2) reasons.push('multi-page')
    if (reused) reasons.push('reused')
    if (cameraChange) reasons.push('camera-change')
    if (!reasons.length) continue

    needs.push({
      assetId: asset.id,
      assetName: asset.name,
      reasons,
      panelCount,
      chapterCount,
      cameraHints,
      hasRefSheetVariant: hasRefSheetVariant(asset),
    })
  }

  return needs
}

/** 汇总：命中数 + 待补建数（已经有「机位图」状态的不计入待补建）。 */
export function summarizeSceneRefSheetNeeds(needs: SceneRefSheetNeed[]): SceneRefSheetSummary {
  return {
    sceneCount: needs.length,
    pendingCount: needs.filter((need) => !need.hasRefSheetVariant).length,
  }
}

/** 把触发原因拼成一行提示，如「单章出镜 ≥2 页、场景内机位变化」。 */
export function formatSceneRefSheetReasons(reasons: SceneRefSheetReason[]): string {
  return reasons.map((reason) => SCENE_REF_SHEET_REASON_TEXT[reason]).join('、')
}

/** 构造「机位图」状态草稿 —— 每个场景生成一次，不要在循环里逐条写库。 */
export function buildRefSheetVariantDraft(options: { sourceChapterId?: string } = {}): LongProjectAssetVariant {
  const now = Date.now()
  return {
    id: uuidv4(),
    name: REF_SHEET_VARIANT_NAME,
    description: REF_SHEET_VARIANT_DESCRIPTION,
    anchor: REF_SHEET_VARIANT_ANCHOR,
    referenceImageIds: [],
    // `origin: 'manual'` 是**必须的**：资产提取确认会按候选状态整表重建变体，
    // 而 `extract` 模板永远不会输出「机位图」（它是程序按触发条件补建的资料性状态）——
    // 没有这个标记，用户下一次确认提取结果时这条状态会被静默删除、已生成的九宫格一起丢。
    origin: 'manual',
    sourceChapterIds: options.sourceChapterId ? [options.sourceChapterId] : [],
    createdAt: now,
    updatedAt: now,
  }
}

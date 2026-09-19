import { llmService } from './llmService'
import { renderPromptTemplate } from './promptTemplateRegistry'
import { buildStyleContext } from './assetPromptService'
import { formatCellsForPrompt } from './storyboardService'
import { buildBlockText, computeBlockImageNumbers, getBlocksByPosition } from '@comic/utils/sharedBlocks'
import type { LongProjectAsset, LongProjectPanelArtwork, LongProjectStoryboardAssetBinding, LongProjectStoryboardPanel, ModelConfig, PromptInsertPosition, SharedPromptBlock } from '@comic/types'

/**
 * 本环节**没有内置默认模板**：画面描述的拼法由用户自己的模板决定
 * （设置页新建 → 类型选「分镜画面描述」/「分镜画面描述（整章一次生成）」→ 点「填入推荐模板」得到底稿）。
 * 因此这里不再导出 DEFAULT_*_TEMPLATE，也不做任何"模板缺失时兜底"。
 */

/** 滑动窗口默认长度：推导第 i 镜时携带前 K 镜的上下文。 */
export const DEFAULT_PREV_PANEL_WINDOW = 2

/** 章节分镜概要：每镜一行剧情提要（静态拼接，不调模型）。 */
export function buildChapterOutline(panels: LongProjectStoryboardPanel[]): string {
  return panels.map((panel) => `分镜${panel.order}：${panel.content}`).join('\n')
}

/** 前文上下文条目：分镜 + 已推导的画面描述。 */
export interface PrevPanelContextEntry {
  panel: LongProjectStoryboardPanel
  prompt: string
}

/** 滑动窗口文本：前 K 镜的画面与已推导描述。 */
export function buildPrevPanelsContext(entries: PrevPanelContextEntry[]): string {
  if (!entries.length) return '当前是本章第一个分镜，无前文画面。'
  return entries.map(({ panel, prompt }) => {
    const head = `分镜${panel.order}${panel.shot ? `（${panel.shot}）` : ''}：${panel.content}`
    return prompt ? `${head}\n画面描述：${prompt}` : head
  }).join('\n\n')
}

/** 解析绑定对应的资产与视觉状态（生图参考图也按同一口径实时解析）。 */
export function resolvePanelBindings(panel: LongProjectStoryboardPanel, assets: LongProjectAsset[]): Array<{ asset: LongProjectAsset; variant: LongProjectAsset['variants'][number]; binding: LongProjectStoryboardAssetBinding }> {
  const result: Array<{ asset: LongProjectAsset; variant: LongProjectAsset['variants'][number]; binding: LongProjectStoryboardAssetBinding }> = []
  for (const binding of panel.assetBindings) {
    const asset = assets.find((item) => item.id === binding.assetId)
    if (!asset) continue
    const variant = asset.variants.find((item) => item.id === binding.visualVersionId) ?? asset.variants[0]
    if (!variant) continue
    result.push({ asset, variant, binding })
  }
  return result
}

/**
 * 视觉状态的**有效参考图列表** —— 采纳图（`referenceImageIds`）优先；没有采纳图时
 * 回落到工作台已生成的暂存图（`generatedImageIds`）。用户口径：资产生成的图就是参考图，
 * 不应因为「没点采纳」就在分镜里显示无参考图。
 *
 * 分镜缩略图候选、取图（`resolvePanelRefImage`）统一走这里，保证展示与生图同一口径。
 */
export function effectiveVariantRefImages(
  variant: Pick<LongProjectAsset['variants'][number], 'referenceImageIds' | 'generatedImageIds'>,
): string[] {
  const adopted = variant.referenceImageIds ?? []
  if (adopted.length) return adopted
  return variant.generatedImageIds ?? []
}

/**
 * 本镜实际使用的参考图 —— **单选口径，全项目唯一实现**。
 * 1. 分镜手动选过 `selectedImageIds[0]`，且该图仍存在于该视觉状态的有效参考图里 → 用它；
 * 2. 否则（从未选过 / 选中的图已被删除）→ 用有效参考图的**第一张**（采纳图为空时即生成图第一张）；
 * 3. 该状态没有任何采纳图与生成图 → `undefined`（生图不带此资产的参考图，UI 提示「无参考图」）。
 *
 * 分镜页取图、资产工作台「N 镜在用」角标、资产卡图片标记三处必须共用此函数，
 * 否则会出现「标了在用其实没用」或「用了却没标」的口径漂移。
 */
export function resolvePanelRefImage(
  variant: Pick<LongProjectAsset['variants'][number], 'referenceImageIds' | 'generatedImageIds'>,
  binding: Pick<LongProjectStoryboardAssetBinding, 'selectedImageIds'>,
): string | undefined {
  const images = effectiveVariantRefImages(variant)
  if (!images.length) return undefined
  const picked = binding.selectedImageIds?.[0]
  return picked && images.includes(picked) ? picked : images[0]
}

/** 格级绑定解析结果：资产 + 实际视觉状态 + 所在格序（0 起）。 */
export interface CellBindingResolution {
  asset: LongProjectAsset
  variant: LongProjectAsset['variants'][number]
  cellIndex: number
}

/**
 * 解析分镜各格「出场资产」声明的实际资产与视觉状态（按格序）。
 * 资产已删 / 状态悬空（id 找不到且资产无任何状态）的声明跳过。
 */
export function resolveCellBindings(panel: LongProjectStoryboardPanel, assets: LongProjectAsset[]): CellBindingResolution[] {
  const result: CellBindingResolution[] = []
  panel.cells?.forEach((cell, cellIndex) => {
    for (const binding of cell.assetBindings ?? []) {
      const asset = binding.assetId ? assets.find((item) => item.id === binding.assetId) : undefined
      if (!asset) continue
      const variant = asset.variants.find((item) => item.id === binding.visualVersionId) ?? asset.variants[0]
      if (!variant) continue
      result.push({ asset, variant, cellIndex })
    }
  })
  return result
}

/** 镜内资产状态条目：资产 + 视觉状态 + 出现的格序（0 起）。 */
export interface PanelAssetStateEntry {
  asset: LongProjectAsset
  variant: LongProjectAsset['variants'][number]
  /** 该状态出现的格序（0 起）；来自页级绑定（无格级声明）时为空数组。 */
  cellIndexes: number[]
  /** 页级绑定（手选图等用途）；该状态不是页级主状态时为 undefined。 */
  binding?: LongProjectStoryboardAssetBinding
}

/**
 * 镜内资产状态展开（页级 ∪ 格级，生图参考图与工作台引用统计共用）：
 * - 以页级 `resolvePanelBindings` 为资产清单基座；
 * - 每个资产收集格级声明的状态（按格序，同状态多格合并 cellIndexes），每个状态一条目；
 * - 无任何可信格级声明的资产退化为页级绑定状态（cellIndexes: []）；
 * - 该状态条目与页级主状态一致时附页级 binding（生图手选图口径不丢）。
 */
export function resolvePanelAssetStates(panel: LongProjectStoryboardPanel, assets: LongProjectAsset[]): PanelAssetStateEntry[] {
  const byAsset = new Map<string, Map<string, { variant: LongProjectAsset['variants'][number]; cellIndexes: number[] }>>()
  for (const { asset, variant, cellIndex } of resolveCellBindings(panel, assets)) {
    const variants = byAsset.get(asset.id) ?? new Map()
    const entry = variants.get(variant.id) ?? { variant, cellIndexes: [] }
    if (!entry.cellIndexes.includes(cellIndex)) entry.cellIndexes.push(cellIndex)
    variants.set(variant.id, entry)
    byAsset.set(asset.id, variants)
  }
  return resolvePanelBindings(panel, assets).flatMap(({ asset, variant, binding }) => {
    const variantEntries = [...(byAsset.get(asset.id)?.values() ?? [])]
    if (!variantEntries.length) return [{ asset, variant, cellIndexes: [], binding }]
    return variantEntries.map((entry) => ({
      asset,
      variant: entry.variant,
      cellIndexes: entry.cellIndexes,
      binding: entry.variant.id === binding.visualVersionId ? binding : undefined,
    }))
  })
}

/**
 * 共用属性分组文本（front / back 各一份）。
 *
 * 每个块拼成「属性名 → 图号行 → 描述正文」三段式（见 `buildBlockText`）；
 * 图号行**实时算、不落库**，因此改图 / 调顺序后下一次拼装自动生效。
 * back 组的图号恒为空（该组不支持参考图）。
 */
export function buildSharedBlockSection(
  blocks: SharedPromptBlock[] | undefined | null,
  position: PromptInsertPosition,
): string {
  const numMap = computeBlockImageNumbers(blocks)
  return getBlocksByPosition(blocks, position)
    .map((block) => buildBlockText(block, numMap.get(block.id) ?? [], position))
    .filter(Boolean)
    .join('\n\n')
}

/**
 * 三层拼接：前置共用属性（代码拼）+ 画面描述（LLM / 人工）+ 后置共用属性（代码拼）。
 *
 * **这是共用属性进入提示词的唯一入口**（推导提示词里不再有它们）：
 * 1. 描述保持纯净 → 可单独复制到外部 AI、可人工编辑，不被固定文案污染；
 * 2. 改画风 / 换共用属性图 → 不必重跑 LLM，下次生图自动生效；
 * 3. 固定文案（尤其参考图用途声明）不会因模型改写而漏句、串图。
 *
 * 序号也对得上：`buildPanelRefManifest` 把前置共用属性图算在前头，所以描述里写的
 * 「图3」就是真正传给生图的第 3 张图。
 */
export function composeFinalPrompt(
  imagePrompt: string,
  blocks: SharedPromptBlock[] | undefined | null,
): string {
  const front = buildSharedBlockSection(blocks, 'front')
  const back = buildSharedBlockSection(blocks, 'back')
  return [front, imagePrompt.trim(), back].filter(Boolean).join('\n\n')
}

/** 单镜信息文本（逐镜与全章两种模式共用同一拼法）。 */
export function buildPanelInfoText(panel: LongProjectStoryboardPanel): string {
  // 多格页：把每格的 景别/镜头/画面/人物/动作/表情/音效/光效 一并交给模型，避免只看到汇总后的「画面」而丢细节
  const cellDetail = panel.cells?.length ? formatCellsForPrompt(panel.cells) : ''
  return `分镜序号：${panel.order}
镜头：${panel.shot || '未指定'}
画面内容：${panel.content}${cellDetail ? `\n分格详情：\n${cellDetail}` : ''}${panel.imagePrompt ? `\n分镜参考描述：${panel.imagePrompt}` : ''}`
}

/**
 * 拼装**逐镜**推导提示词（panel-prompt）。
 *
 * 变量：{{参考图清单}} / {{当前分镜}} / {{镜头}} / {{前文分镜}} / {{本章分镜概要}} /
 * {{目标生图模型}}；
 * 是否进入提示词完全由模板决定——模板没写的变量不会出现（无自动追加兜底）。
 *
 * **不含共用属性**：共用属性只由 `composeFinalPrompt` 在生图时拼到描述前后，
 * 既不进模型输入也不进 `imagePrompt` 字段。也**不含资产视觉设定**：
 * 资产外观由参考图清单（图号）承载，模型照图号引用参考图即可。
 *
 * 本环节逐镜单独调用、返回纯文本，**结果不需要解析**（返回格式约定写在模板内容里）。
 *
 * `refManifestText` 由调用方用 `buildRefManifestText(buildPanelRefManifest(...), { assetsOnly: true })`
 * 生成，这样图号只有一个来源，且本服务不与 panelRefManifest 形成循环依赖。
 */
export function buildPanelPromptPrompt(options: {
  templateContent: string
  panel: LongProjectStoryboardPanel
  chapterOutline: string
  prevEntries: PrevPanelContextEntry[]
  refManifestText?: string
  targetImageModel?: string
}): string {
  const { panel } = options
  return renderPromptTemplate({
    type: 'panel-prompt',
    content: options.templateContent,
    values: {
      参考图清单: options.refManifestText ?? '',
      当前分镜: buildPanelInfoText(panel),
      镜头: panel.shot ?? '',
      前文分镜: buildPrevPanelsContext(options.prevEntries),
      本章分镜概要: options.chapterOutline,
      目标生图模型: options.targetImageModel ?? '',
    },
  })
}

/**
 * 拼装**整章一次生成**的提示词（panel-prompt-chapter）。
 *
 * 与逐镜模板的差异（这是两个模板类型，不是同一个）：
 * - `{{当前分镜}}` → `{{全章分镜}}`（全章所有镜，一次交给模型）；
 * - 新增 `{{全章参考图清单}}`（按镜分组，图号与生图实际顺序一致）；
 * - **不需要** `{{镜头}}` / `{{前文分镜}}` / `{{本章分镜概要}}`：全章分镜原文里已经包含全部镜头与上下文。
 *
 * 与逐镜模板一致：**不含共用属性**（生图时才前后拼接），也**不含资产视觉设定**（参考图清单承载资产外观）。
 */
export function buildChapterPanelPromptPrompt(options: {
  templateContent: string
  panels: LongProjectStoryboardPanel[]
  /** panelId → 该镜资产参考图清单文本（由 buildRefManifestText(..., { assetsOnly: true }) 生成）。 */
  refManifestTexts: Map<string, string>
  targetImageModel?: string
}): string {
  const { panels } = options
  return renderPromptTemplate({
    type: 'panel-prompt-chapter',
    content: options.templateContent,
    values: {
      全章分镜: panels.map((panel) => buildPanelInfoText(panel)).join('\n\n'),
      全章参考图清单: panels.map((panel) => `## 分镜 ${panel.order}\n${options.refManifestTexts.get(panel.id) || '（本镜没有资产参考图）'}`).join('\n\n'),
      目标生图模型: options.targetImageModel ?? '',
    },
  })
}

/** 全章解析结果：分镜 id → 该镜画面描述。 */
export interface ChapterPromptParseResult {
  /** 成功对位的条目。 */
  entries: Array<{ panelId: string; order: number; prompt: string }>
  /** 对位方式：按分镜标记（## 分镜 N） / 按顺序兜底。 */
  mode: 'marked' | 'sequential'
  /** 未在输出中找到段落的镜序号（仅 marked 模式可能非空）。 */
  missingOrders: number[]
}

/**
 * 解析「整章一次生成」的输出：按 `## 分镜 N` 标题分段对位到各分镜。
 *
 * 容错：标记形态放宽为 `## 分镜3` / `【分镜3】` / `【第3镜】`；
 * **`第N格` 不算分镜标记**（那是每镜内部的格小节标题，绝不能用来分段）；
 * 完全没有标记时退化为「按空行分段、按顺序对位」（`mode: 'sequential'`，UI 应提示用户核对）。
 */
export function parseChapterPanelPrompts(
  text: string,
  panels: Array<Pick<LongProjectStoryboardPanel, 'id' | 'order'>>,
): ChapterPromptParseResult {
  const ordered = [...panels].sort((a, b) => a.order - b.order)
  const pattern = /(?:^|\n)\s*(?:#{1,6}\s*)?[【\[]?\s*(?:分镜\s*(\d+)|第\s*(\d+)\s*镜)\s*[】\]]?\s*[:：]?\s*/g
  const marks: Array<{ order: number; start: number; end: number }> = []
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    marks.push({ order: Number(match[1] ?? match[2]), start: index, end: index + match[0].length })
  }
  if (marks.length) {
    const entries: ChapterPromptParseResult['entries'] = []
    const missingOrders: number[] = []
    for (const panel of ordered) {
      const markIndex = marks.findIndex((mark) => mark.order === panel.order)
      if (markIndex < 0) {
        missingOrders.push(panel.order)
        continue
      }
      const next = marks[markIndex + 1]
      const body = text.slice(marks[markIndex].end, next ? next.start : text.length).trim()
      if (!body) {
        missingOrders.push(panel.order)
        continue
      }
      entries.push({ panelId: panel.id, order: panel.order, prompt: body })
    }
    return { entries, mode: 'marked', missingOrders }
  }
  // 无标记：按空行分段顺序对位
  const chunks = text.split(/\n\s*\n/).map((chunk) => chunk.trim()).filter(Boolean)
  const entries = ordered
    .slice(0, chunks.length)
    .map((panel, index) => ({ panelId: panel.id, order: panel.order, prompt: chunks[index] }))
  return { entries, mode: 'sequential', missingOrders: ordered.slice(chunks.length).map((panel) => panel.order) }
}

/** 单镜推导执行：一次 LLM 调用只返回当前分镜的画面描述。 */
export async function inferPanelPrompt(options: {
  model: ModelConfig
  prompt: string
}): Promise<string> {
  const result = await llmService.call({ modelConfig: options.model, userMessage: options.prompt })
  if (!result.success || !result.content) throw new Error(result.error || '模型没有返回内容')
  const prompt = result.content.trim()
  if (!prompt) throw new Error('模型返回内容为空')
  return prompt
}

/**
 * 重跑分镜后迁移已有画面（panelArtworks）：
 * - 按分镜 order 对位迁移到新 panelId；
 * - 画面内容未变：保留描述与成图状态；内容已变：已有描述标记 stale（成图保留）；
 * - 进行中的状态（running/pending）按失败处理，避免永久卡住；
 * - 无法对位（新分镜数量减少等）的记录原样保留，仅不再被新分镜引用。
 */
export function migratePanelArtworks(
  artworks: LongProjectPanelArtwork[],
  oldPanels: LongProjectStoryboardPanel[],
  newPanels: LongProjectStoryboardPanel[],
  chapterId: string,
): LongProjectPanelArtwork[] {
  const oldPanelById = new Map(oldPanels.map((panel) => [panel.id, panel]))
  const newPanelByOrder = new Map(newPanels.map((panel) => [panel.order, panel]))
  const migrated = new Set<string>()
  return artworks.map((artwork) => {
    if (artwork.chapterId !== chapterId) return artwork
    const oldPanel = oldPanelById.get(artwork.panelId)
    const target = oldPanel ? newPanelByOrder.get(oldPanel.order) : undefined
    if (!oldPanel || !target || migrated.has(target.id)) return artwork
    migrated.add(target.id)
    const contentChanged = oldPanel.content !== target.content
    const promptStatus: LongProjectPanelArtwork['promptStatus'] =
      artwork.promptStatus === 'running' || artwork.promptStatus === 'pending'
        ? 'failed'
        : contentChanged && artwork.imagePrompt?.trim()
          ? 'stale'
          : artwork.promptStatus
    return {
      ...artwork,
      panelId: target.id,
      promptStatus,
      genStatus: artwork.genStatus === 'running' ? 'failed' : artwork.genStatus,
      updatedAt: Date.now(),
    }
  })
}

/** 组合导出：风格上下文构建（与资产提示词同一口径）。 */
export { buildStyleContext }
export type { SharedPromptBlock }

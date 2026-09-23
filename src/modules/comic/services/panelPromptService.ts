import { llmService } from './llmService'
import { renderPromptTemplate } from './promptTemplateRegistry'
import { buildStyleContext } from './assetPromptService'
import { formatCellsForPrompt } from './storyboardService'
import { buildBlockText, computeBlockImageNumbers, getBlocksByPosition } from '@comic/utils/sharedBlocks'
import { renderRefUsage, DEFAULT_REF_USAGE } from './refUsage'
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
    const variant = asset.variants.find((item) => item.id === binding.visualVersionId)
      ?? (!binding.visualVersionId ? asset.variants.find((item) => item.name === binding.visualVersionName) ?? asset.variants[0] : undefined)
    if (!variant) continue
    result.push({ asset, variant, binding })
  }
  return result
}

/**
 * 视觉状态绑到分镜时能用的图 —— **生成图 + 自行上传的成品图**（2026-09-23 扩口径）。
 *
 * 「当前资产」区里三种来源都算这一状态的成品图：AI 生成、用户自己上传、
 * 以及引用其他章节同一个视觉状态（数据上是同一条记录，天然共享）。
 * 前两者存在变体上（`generatedImageIds` / `uploadedImageIds`），所以这里取两份之和。
 *
 * ⚠️ 用户上传的 `referenceImageIds`（参考图）**仍不在其列**：它只是「给这个状态自己生图」的输入参数，
 * 不进入分镜参考图清单，也不参与「被 N 镜取用」统计。
 *
 * 分镜缩略图候选、取图（`resolvePanelRefImage`）统一走这里，保证展示与生图同一口径。
 */
export function effectiveVariantRefImages(
  variant: Pick<LongProjectAsset['variants'][number], 'referenceImageIds' | 'generatedImageIds' | 'uploadedImageIds'>,
): string[] {
  return [...(variant.generatedImageIds ?? []), ...(variant.uploadedImageIds ?? [])]
}

/**
 * 本镜实际使用的参考图 —— **单选口径，全项目唯一实现**。
 * 1. 分镜手动选过 `selectedImageIds[0]`，且该图仍存在于该视觉状态的生成图里 → 用它；
 * 2. 否则（从未选过 / 选中的图已被删除 / 选中的是上传参考图）→ 用生成图的**第一张**；
 * 3. 该状态没有任何生成图 → `undefined`（生图不带此资产的参考图，UI 提示「无参考图」）。
 *
 * 上传的 `referenceImageIds` 不在候选里。分镜页取图、资产工作台「N 镜在用」角标、
 * 资产卡图片标记三处必须共用此函数，否则会出现「标了在用其实没用」或「用了却没标」。
 */
export function resolvePanelRefImage(
  variant: Pick<LongProjectAsset['variants'][number], 'referenceImageIds' | 'generatedImageIds' | 'uploadedImageIds'>,
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
      const variant = asset.variants.find((item) => item.id === binding.visualVersionId)
        ?? (!binding.visualVersionId ? asset.variants.find((item) => item.name === binding.visualVersionName) ?? asset.variants[0] : undefined)
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

/** 最终生图阶段所需的参考图清单最小结构，避免与 panelRefManifest 形成循环依赖。 */
export interface RuntimeRefManifest {
  images: string[]
  entries: Array<{
    index: number
    source: 'shared' | 'asset'
    label: string
    blockId?: string
    assetType?: LongProjectAsset['type']
    /** 资产条目：资产 id / 视觉状态 id（界面按它定位角标与绑定，不参与拼装）。 */
    assetId?: string
    variantId?: string
    variantName?: string
    cellIndexes?: number[]
    /** 用途描述模板（清单层已解析：资产覆盖 → 项目配置 → 默认）；缺省时用内置默认。 */
    usageTemplate?: string
  }>
}

/** 单独生成额外附加在核心清单末尾的参考图。 */
export interface RuntimeExtraReference {
  image: string
  label: string
}

/** 最终生图提示词的四段结构；界面预览与实际发送必须共用这一结果。 */
export interface FinalPromptSections {
  front: string
  references: string
  content: string
  back: string
}

/** 一条提示词的取图开关（决定这次请求实际发哪些图，进而决定图号怎么编）。 */
export interface PromptSlotRefOptions {
  /** 拼接共用属性：false = 共用属性的文字不拼、共用属性的图也不进这次请求。 */
  attachShared?: boolean
  /** 使用资产参考图：false = 资产生成图不进这次请求（仅分镜用；资产侧没有这个开关）。 */
  useAssetRefs?: boolean
}

/** 最终拼装选项。 */
export interface FinalPromptOptions {
  /** 拼接共用属性（前置 + 后置）：false = 两段文字都不拼。 */
  attachShared?: boolean
}

/**
 * 按某一条提示词的开关**裁剪清单并重编图号**。
 *
 * 关掉哪个开关，那类图就不进这次请求；剩下的图必须从「图1」重新编号 ——
 * 否则提示词里写「图3」而实际只发了两张，模型必然对不上。
 *
 * 不变式（与 `buildPanelRefManifest` 一致）：返回的 `images[i]` 就是「图 i+1」。
 * 额外上传图由 `buildFinalPromptSections` 接在 `images.length` 之后续编。
 */
export function slotRefManifest(
  manifest: RuntimeRefManifest | undefined,
  options: PromptSlotRefOptions = {},
): RuntimeRefManifest {
  if (!manifest) return { images: [], entries: [] }
  const attachShared = options.attachShared !== false
  const useAssetRefs = options.useAssetRefs !== false
  const kept: Array<{ entry: RuntimeRefManifest['entries'][number]; image: string }> = []
  manifest.entries.forEach((entry, position) => {
    const used = entry.source === 'shared' ? attachShared : useAssetRefs
    if (!used) return
    // images 与 entries 同序（清单层不变式），按原位置取图即可。
    kept.push({ entry, image: manifest.images[position] })
  })
  const entries = kept.map(({ entry }, index) => ({ ...entry, index: index + 1 }))
  return { images: kept.map(({ image }) => image), entries }
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
  // 页级允许多条同资产不同状态的绑定（多状态语义），逐条展开时按 (资产,状态) 去重，避免重复出图
  const emitted = new Set<string>()
  const entries: PanelAssetStateEntry[] = []
  const push = (asset: LongProjectAsset, variant: LongProjectAsset['variants'][number], cellIndexes: number[], binding?: LongProjectStoryboardAssetBinding) => {
    const key = `${asset.id}::${variant.id}`
    if (emitted.has(key)) return
    emitted.add(key)
    entries.push({ asset, variant, cellIndexes, binding })
  }
  for (const { asset, variant, binding } of resolvePanelBindings(panel, assets)) {
    const variantEntries = [...(byAsset.get(asset.id)?.values() ?? [])]
    if (!variantEntries.length) {
      push(asset, variant, [], binding)
      continue
    }
    for (const entry of variantEntries) {
      push(asset, entry.variant, entry.cellIndexes, entry.variant.id === binding.visualVersionId ? binding : undefined)
    }
    // 画面描述可能补充同一资产的另一状态；若格级尚未声明该状态，也要把页级状态带入参考图清单。
    if (!variantEntries.some((entry) => entry.variant.id === variant.id)) {
      push(asset, variant, [], binding)
    }
  }
  return entries
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
  manifest?: RuntimeRefManifest,
): string {
  const numMap = manifest
    ? manifest.entries.reduce<Map<string, number[]>>((map, entry) => {
        if (entry.source !== 'shared' || !entry.blockId) return map
        const numbers = map.get(entry.blockId) ?? []
        numbers.push(entry.index)
        map.set(entry.blockId, numbers)
        return map
      }, new Map())
    : computeBlockImageNumbers(blocks)
  return getBlocksByPosition(blocks, position)
    .map((block) => buildBlockText(block, numMap.get(block.id) ?? [], position))
    .filter(Boolean)
    .join('\n\n')
}

/**
 * 最终生图拼接：前置共用属性 + 动态参考图定义 + 画面描述（LLM / 人工）+ 后置共用属性。
 *
 * **这是共用属性进入提示词的唯一入口**（推导提示词里不再有它们）：
 * 1. 描述保持纯净 → 可单独复制到外部 AI、可人工编辑，不被固定文案污染；
 * 2. 改画风 / 换共用属性图 → 不必重跑 LLM，下次生图自动生效；
 * 3. 固定文案（尤其参考图用途声明）不会因模型改写而漏句、串图。
 *
 * 图号全部来自运行时清单，并与实际发送的图片数组保持同序。
 */
export function composeFinalPrompt(
  imagePrompt: string,
  blocks: SharedPromptBlock[] | undefined | null,
  manifest?: RuntimeRefManifest,
  extraReferences: RuntimeExtraReference[] = [],
  options: FinalPromptOptions = {},
): string {
  const sections = buildFinalPromptSections(imagePrompt, blocks, manifest, extraReferences, options)
  return [sections.front, sections.references, sections.content, sections.back].filter(Boolean).join('\n\n')
}

/**
 * 构建最终提示词的可展示区段：前置共用属性 → 参考图定义 → 画面内容 → 后置共用属性。
 * 固定区段只在运行时计算，不写入可编辑的画面描述字段。
 */
export function buildFinalPromptSections(
  imagePrompt: string,
  blocks: SharedPromptBlock[] | undefined | null,
  manifest?: RuntimeRefManifest,
  extraReferences: RuntimeExtraReference[] = [],
  options: FinalPromptOptions = {},
): FinalPromptSections {
  // 关闭「拼接共用属性」时前后置文字都不拼；对应的图也已由 slotRefManifest 从清单里剔除。
  const attachShared = options.attachShared !== false
  const front = attachShared ? buildSharedBlockSection(blocks, 'front', manifest) : ''
  const back = attachShared ? buildSharedBlockSection(blocks, 'back', manifest) : ''
  const assetLines = (manifest?.entries ?? [])
    .filter((entry) => entry.source === 'asset')
    .map((entry) => {
      const type = entry.assetType ?? 'character'
      const state = entry.variantName ? `（${entry.variantName}）` : ''
      const scope = entry.cellIndexes?.length ? `第${entry.cellIndexes.map((index) => index + 1).join('、')}格` : '整镜'
      // 「资产名（状态）」之后的整句由用户在用途模板里写（默认值即原硬编码文案），
      // 图号 / 资产名 / 状态名 / 格号始终由代码算，保证与真实发送的图片数组同序。
      const usage = renderRefUsage(entry.usageTemplate ?? DEFAULT_REF_USAGE[type], type, scope)
      return `图${entry.index} = ${entry.label}${state}${usage}`
    })
  const extraLines = extraReferences.map((entry, index) => `图${(manifest?.images.length ?? 0) + index + 1} = ${entry.label}。`)
  const referenceSection = [...assetLines, ...extraLines].length
    ? `【动态参考图】\n${[...assetLines, ...extraLines].join('\n')}`
    : ''
  return { front, references: referenceSection, content: imagePrompt.trim(), back }
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
 * 变量：{{当前分镜}} / {{镜头}} / {{前文分镜}} / {{本章分镜概要}} / {{目标生图模型}}；
 * 是否进入提示词完全由模板决定——模板没写的变量不会出现（无自动追加兜底）。
 *
 * **不含共用属性、参考图清单或图号**：这些内容只由 `composeFinalPrompt` 在生图时
 * 根据当前图片顺序动态拼接，既不进模型输入也不进 `imagePrompt` 字段。
 *
 * 本环节逐镜单独调用、返回纯文本，**结果不需要解析**（返回格式约定写在模板内容里）。
 */
export function buildPanelPromptPrompt(options: {
  templateContent: string
  panel: LongProjectStoryboardPanel
  chapterOutline: string
  prevEntries: PrevPanelContextEntry[]
  targetImageModel?: string
}): string {
  const { panel } = options
  return renderPromptTemplate({
    type: 'panel-prompt',
    content: options.templateContent,
    values: {
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
 * - **不需要** `{{镜头}}` / `{{前文分镜}}` / `{{本章分镜概要}}`：全章分镜原文里已经包含全部镜头与上下文。
 *
 * 与逐镜模板一致：**不含共用属性、参考图清单或图号**，这些内容在生图时动态拼接。
 */
export function buildChapterPanelPromptPrompt(options: {
  templateContent: string
  panels: LongProjectStoryboardPanel[]
  targetImageModel?: string
}): string {
  const { panels } = options
  return renderPromptTemplate({
    type: 'panel-prompt-chapter',
    content: options.templateContent,
    values: {
      全章分镜: panels.map((panel) => buildPanelInfoText(panel)).join('\n\n'),
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
 * 画面描述参与「自动绑定扫描」的唯一口径：返回可用于扫描的描述文本，不可用则 undefined。
 *
 * `promptStatus === 'stale'` 已明确宣告「这份描述是照着另一版正文写的」，再拿它当绑定依据，
 * 就会把别的页的资产绑到这一页上（历史 bug：P02 绑上「中年测验员」+「测验魔石碑」，
 * 而这两个名字只存在于过期的画面描述里，分镜正文中根本没有）。
 *
 * 所有把描述并入绑定扫描文本的地方都必须过这里，不要各自读 `artwork.imagePrompt`。
 */
export function bindingScanPrompt(artwork?: LongProjectPanelArtwork): string | undefined {
  if (!artwork || artwork.promptStatus === 'stale') return undefined
  return artwork.imagePrompt?.trim() ? artwork.imagePrompt : undefined
}

/** 迁移结果：新分镜可用的工件列表 + 本次未能继承的既有描述条数（供调用方提示用户重推）。 */
export interface ArtworkMigrationResult {
  artworks: LongProjectPanelArtwork[]
  /** 属于上一版分镜、但正文已变或序号无对应而没能跟过来的描述条数 */
  droppedPromptCount: number
}

/**
 * 重跑/重新导入分镜后迁移已有画面工件（panelArtworks）。
 *
 * 归属判据只有一条：**新页与旧页「同序号」且正文逐字相同，才认作同一页**。
 * - 正文相同且描述未被判过期 → 描述与成图整体迁到新 panelId（描述仍然精确对应当前画面）；
 * - 正文已变、或描述本身已标 stale → 这一页手上那份描述写的不是当前画面：
 *   描述直接丢弃（留着只会被误用、误绑），只把成图（用户的劳动成果）迁到新页；
 * - 分页结构重划（页数变化）时同序号页正文必然不同，于是自然全部不继承，无需另判页数；
 * - 无法对位 / 已被占用：原样保留，仅不再被新分镜引用（进行中的 genStatus 随迁移转 failed）。
 */
export function migratePanelArtworks(
  artworks: LongProjectPanelArtwork[],
  oldPanels: LongProjectStoryboardPanel[],
  newPanels: LongProjectStoryboardPanel[],
  chapterId: string,
): ArtworkMigrationResult {
  const oldPanelById = new Map(oldPanels.map((panel) => [panel.id, panel]))
  const newPanelByOrder = new Map(newPanels.map((panel) => [panel.order, panel]))
  const migrated = new Set<string>()
  let droppedPromptCount = 0
  // 没有上一版分镜可对位（首次生成 / 上一版不存在）时什么都别动，避免把已有工件全判成无归属
  if (!oldPanels.length) return { artworks, droppedPromptCount }

  const next: LongProjectPanelArtwork[] = []
  /** 属于本章、却没跟过来的描述 → 计入回执，让用户知道要重推哪些 */
  const countDropped = (artwork: LongProjectPanelArtwork) => {
    if (artwork.imagePrompt?.trim()) droppedPromptCount++
  }
  for (const artwork of artworks) {
    if (artwork.chapterId !== chapterId) {
      next.push(artwork)
      continue
    }
    const oldPanel = oldPanelById.get(artwork.panelId)
    const target = oldPanel ? newPanelByOrder.get(oldPanel.order) : undefined
    // 找不到对应新页（旧版页被删）或该页已被别的旧记录占用 → 这条工件没有归属，丢弃
    if (!oldPanel || !target || migrated.has(target.id)) {
      countDropped(artwork)
      continue
    }
    migrated.add(target.id)
    const genStatus: LongProjectPanelArtwork['genStatus'] =
      artwork.genStatus === 'running' ? 'failed' : artwork.genStatus

    // 能跟到新页的条件有两个，缺一不可：
    // ① 同序号正文逐字相同 —— 描述写的还是这一页的画面；
    // ② 描述自身没被判过期 —— 已标 stale 说明它对着的正文早就变过（历史欠账不会自己还清）。
    const inheritable = oldPanel.content === target.content && artwork.promptStatus !== 'stale'
    if (inheritable) {
      next.push({ ...artwork, panelId: target.id, genStatus, updatedAt: Date.now() })
      continue
    }

    // 不可继承：这份描述写的不是当前画面（正文已变，或它本身已过期），直接丢弃 ——
    // 留着只会被误用、误绑（历史上的 P02 幽灵绑定就来自它）。
    // 成图是用户的劳动成果，仍迁到新页。
    countDropped(artwork)
    const hasImage = Boolean(artwork.selectedImageId) || Boolean(artwork.generatedImageIds?.length)
    if (hasImage) {
      // 连同候选提示词条一起清掉：它们写的也是「上一版正文」，留着会与已清空的描述脱节
      // （第 1 条本该镜像 imagePrompt，留着旧正文就变成一份没有来源的孤儿文本）。
      next.push({
        ...artwork,
        panelId: target.id,
        imagePrompt: undefined,
        genPrompts: undefined,
        activeGenPromptId: undefined,
        promptSource: undefined,
        promptStatus: 'none',
        genStatus,
        updatedAt: Date.now(),
      })
    }
  }

  return { artworks: next, droppedPromptCount }
}

/** 组合导出：风格上下文构建（与资产提示词同一口径）。 */
export { buildStyleContext }
export type { SharedPromptBlock }

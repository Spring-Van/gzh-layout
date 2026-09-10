import { v4 as uuidv4 } from 'uuid'
import type { LongProjectAsset, LongProjectStoryboardAssetBinding, LongProjectStoryboardCell, LongProjectStoryboardPanel, ModelConfig, PromptTemplate } from '@comic/types'
import { llmService } from './llmService'
import { renderPromptTemplate, defaultOutputProtocol } from './promptTemplateRegistry'

/**
 * 组装"分镜生成"提示词：漫画剧本（主输入）+ 原文分析（辅助上下文）+ 分镜规则模板。
 * 变量：{{漫画剧本}} / {{原文分析}}；无剧本时调用方已用章节原文兜底并提示。
 * 新管线下分镜不再依赖资产库绑定；资产绑定在资产提取确认后按文本自动回填。
 */
export function buildStoryboardPrompt(templateContent: string, scriptContent: string, analysis?: string): string {
  return renderPromptTemplate({
    type: 'storyboard',
    content: templateContent,
    values: { 漫画剧本: scriptContent, 原文分析: analysis },
  })
}

function findAsset(name: string, assets: LongProjectAsset[]) { return assets.find((asset) => [asset.name, ...asset.aliases].some((item) => item.trim() === name.trim())) }

/** 资产默认视觉状态：按章节范围（晚于当前章节出现的往后排）选最近一个已生效状态。 */
export function defaultVariant(asset: LongProjectAsset | undefined, chapterId: string, chapterOrders: Record<string, number>) {
  if (!asset) return undefined
  const currentOrder = chapterOrders[chapterId] ?? Number.MAX_SAFE_INTEGER
  return asset.variants
    .filter((variant) => (chapterOrders[variant.chapterRange?.startChapterId ?? variant.firstAppearanceChapterId ?? ''] ?? -1) <= currentOrder)
    .sort((a, b) => (chapterOrders[b.chapterRange?.startChapterId ?? b.firstAppearanceChapterId ?? ''] ?? -1) - (chapterOrders[a.chapterRange?.startChapterId ?? a.firstAppearanceChapterId ?? ''] ?? -1))[0]
    ?? asset.variants[0]
}

function bindingsFromValue(value: string, assets: LongProjectAsset[], chapterId: string, chapterOrders: Record<string, number>): LongProjectStoryboardAssetBinding[] {
  return value.split(/[、,，]/).map((part) => part.trim()).filter(Boolean).map((part) => {
    const match = part.match(/^(.+?)(?:[（(](.+?)[)）])?$/)
    const assetName = match?.[1]?.trim() || part
    const visualVersionName = match?.[2]?.trim()
    const asset = findAsset(assetName, assets)
    const variant = asset?.variants.find((item) => item.name === visualVersionName) ?? defaultVariant(asset, chapterId, chapterOrders)
    return { assetId: asset?.id, assetName, visualVersionId: variant?.id, visualVersionName: visualVersionName || variant?.name, matchSource: asset ? (visualVersionName ? 'model' : 'chapter-range') : 'unmatched', referenceImageIds: variant?.referenceImageIds ?? [] }
  })
}

/** 页头：`## 分镜 1` / `## 分镜 2 · 双格` / `## 第 3 页 · 单格` */
const PAGE_HEADER_RE = /^#{1,6}\s*(?:分镜\s*\d*|第\s*\d+\s*页)/
/** 格行标记：①~⑩ 或 1. / 1、/ 1) */
const CELL_MARK_RE = /^(?:[①②③④⑤⑥⑦⑧⑨⑩]|\d{1,2}\s*[.、)）])\s*/
/** 方括号：`【近景】画面` / `【镜头】近景` / `【画面】内容` */
const BRACKET_RE = /^[【\[]\s*([^】\]]+?)\s*[】\]]\s*(.*)$/
/** 台词 / 旁白正文的【】包装（整行被【】完整包住）：`说话人：【台词】` / `旁白：【文字】` */
const LINE_WRAP_RE = /^【\s*([\s\S]*?)\s*】$/
/** 方括号里是字段名而不是镜头类型 */
const BRACKET_FIELD_KEYS = new Set(['镜头', '画面', '内容', '对白', '台词', '旁白', '绘画提示词', '出场资产'])
/** 旁白行：`旁白：文字` */
const NARRATION_RE = /^旁白\s*[：:]\s*(.*)$/
/** 说话人行：`说话人：台词` / `说话人（心声）：台词` / `说话人（画外）：台词` */
const SPEAKER_RE = /^([^：:，。！？、；\s（）()]{1,10})\s*(?:[（(]\s*(心声|画外)\s*[)）])?\s*[：:]\s*(.*)$/
/** 旧字段行：`- 画面：内容` */
const FIELD_RE = /^[-*]\s*([^：:]+)[：:]\s*(.*)$/
/** v2 行内分格分隔符（‖ 分格、｜ 分字段） */
const INLINE_SEP_RE = /[‖｜|]/
/** 结构性行（无页头时据此自动开页，兼容外部纯文本导入） */
const STRUCTURAL_RE = /^(?:[①②③④⑤⑥⑦⑧⑨⑩]|[【\[])|[‖]|[｜|]/

/** 去掉台词 / 旁白正文首尾的【】；未被完整包裹时原样返回（旧数据 / 旧模板无【】照旧工作）。 */
function stripLineWrap(value: string): string {
  const text = value.trim()
  const wrapped = text.match(LINE_WRAP_RE)
  return wrapped ? wrapped[1].trim() : text
}

/** 是否是「说话人：台词」行（说话人部分不含分格分隔符）——用于 v2 判定，避免把带 ｜ 的台词行误拆成格。 */
function looksLikeSpeakerLine(line: string): boolean {
  const match = line.match(SPEAKER_RE)
  return Boolean(match && !INLINE_SEP_RE.test(match[1]))
}

/**
 * 解析 LLM 返回的 Markdown 分镜文本为结构化分镜数组。
 *
 * 主格式为「页块格式」（v3）：一个 `## 分镜 N · X格` 页块 = 一张漫画图，
 * 页内 `①【镜头】画面` 一格一行，`说话人：【台词】` / `旁白：【文字】`（正文【】可带可不带，解析时剥掉）归属其上最近的格。
 * 同时向下兼容三种历史形态：
 * 1. 旧字段行：`- 属性名：内容`（画面/内容、镜头、对白、旁白、绘画提示词、出场资产）；
 * 2. v2 行内分格：`近景｜画面｜台词 ‖ 中景｜画面`；
 * 3. 无页头的纯结构文本：出现 ① / 【】/ ‖ / ｜ 时自动开页。
 *
 * @param content LLM 返回的原始 Markdown 文本
 * @param assets 项目资产库，用于解析出场资产绑定
 * @param chapterId 当前章节 ID，用于资产默认视觉状态推断
 * @param chapterOrders 章节顺序表（章节 ID → 序号）
 * @returns 解析后的分镜数组；无有效分镜时抛错
 */
export function parseStoryboardResponse(content: string, assets: LongProjectAsset[], chapterId: string, chapterOrders: Record<string, number>): LongProjectStoryboardPanel[] {
  const panels: LongProjectStoryboardPanel[] = []
  let current: LongProjectStoryboardPanel | undefined
  /** 当前页的分格列表（页块格式） */
  let cells: LongProjectStoryboardCell[] = []
  /** 无格结构时的对白/旁白（旧字段行） */
  const looseDialogue: string[] = []
  const looseNarration: string[] = []
  /** 上一个成功匹配的字段名，用于旧格式续行拼接 */
  let lastField: 'content' | 'dialogue' | 'narration' | 'imagePrompt' | null = null

  const lastCell = () => cells[cells.length - 1]

  const startPage = () => {
    current = { id: uuidv4(), order: panels.length + 1, content: '', assetBindings: [] }
    cells = []
    looseDialogue.length = 0
    looseNarration.length = 0
    lastField = null
  }

  /** 收尾当前页：把格汇总回页级字段，保证既有消费方（生图推导 / 概览 / 资产计数）无需改动。 */
  const flush = () => {
    if (!current) return
    if (cells.length) {
      current.cells = cells.map((cell) => ({ ...cell }))
      const summary = summarizeCells(cells)
      if (summary.content) current.content = summary.content
      if (summary.shot) current.shot = summary.shot
      if (summary.dialogue) current.dialogue = summary.dialogue
      if (summary.narration) current.narration = summary.narration
    }
    if (looseDialogue.length) current.dialogue = [current.dialogue, ...looseDialogue].filter(Boolean).join('\n')
    if (looseNarration.length) current.narration = [current.narration, ...looseNarration].filter(Boolean).join('\n')
    if (current.content?.trim() || cells.length) panels.push(current)
    current = undefined
    cells = []
    looseDialogue.length = 0
    looseNarration.length = 0
    lastField = null
  }

  /** 写入画面：有格进当前格，无格退化为页面级 content（append 用于旧格式续行）。 */
  const pushContent = (value: string, append = false) => {
    const cell = lastCell()
    if (cell) cell.content = append ? cell.content + value : value
    else if (current) current.content = append ? current.content + value : value
    lastField = 'content'
  }

  /** 写入台词：有格进当前格（带说话人），无格退化为页面级对白；正文首尾【】在此剥掉。 */
  const pushDialogue = (speaker: string | undefined, delivery: '心声' | '画外' | undefined, text: string) => {
    const cell = lastCell()
    const body = stripLineWrap(text)
    if (cell) { cell.speaker = speaker; cell.delivery = delivery; cell.dialogue = body }
    else looseDialogue.push(`${speaker ?? ''}${delivery ? `（${delivery}）` : ''}${speaker ? '：' : ''}${body}`)
    lastField = 'dialogue'
  }

  /** 写入无人称旁白；正文首尾【】在此剥掉。 */
  const pushNarration = (text: string) => {
    const cell = lastCell()
    const body = stripLineWrap(text)
    if (cell) cell.narration = body
    else looseNarration.push(body)
    lastField = 'narration'
  }

  /** 一格正文：`【镜头】画面` 拆出镜头，其余整段作为画面。 */
  const fillCell = (cell: LongProjectStoryboardCell, text: string) => {
    const bracket = text.match(BRACKET_RE)
    if (bracket && !BRACKET_FIELD_KEYS.has(bracket[1].trim())) {
      cell.shot = bracket[1].trim()
      cell.content = bracket[2].trim()
    } else {
      cell.content = text.trim()
    }
  }

  /** 起一格并置为当前格。 */
  const pushCell = (cell: LongProjectStoryboardCell) => { cells.push(cell); lastField = null }

  for (const rawLine of content.replace(/\r/g, '').split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    if (PAGE_HEADER_RE.test(line)) { flush(); startPage(); continue }
    // 无页头但结构明确（① / 【】/ ‖ / ｜）→ 自动开页，兼容外部纯文本导入
    if (!current) {
      if (!STRUCTURAL_RE.test(line)) continue
      startPage()
    }

    // 1) 旧字段行 `- 画面：…`（优先判定，避免被说话人正则误吃）
    const field = line.match(FIELD_RE)
    if (field) {
      const key = field[1].trim()
      const value = field[2].trim()
      if (key === '画面' || key === '内容') pushContent(value)
      else if (key === '镜头') { const cell = lastCell(); if (cell) cell.shot = value; else if (current) current.shot = value; lastField = null }
      else if (key === '对白' || key === '台词') pushDialogue(undefined, undefined, value)
      else if (key === '旁白') pushNarration(value)
      else if (key === '绘画提示词') { if (current) current.imagePrompt = value; lastField = 'imagePrompt' }
      else if (key === '出场资产') { if (current) current.assetBindings = bindingsFromValue(value, assets, chapterId, chapterOrders); lastField = null }
      else lastField = null
      continue
    }

    // 2) 格行 `①【近景】画面`
    if (CELL_MARK_RE.test(line)) {
      const cell: LongProjectStoryboardCell = { content: '' }
      fillCell(cell, line.replace(CELL_MARK_RE, ''))
      pushCell(cell)
      continue
    }

    // 3) v2 行内分格 `近景｜画面｜台词 ‖ …`（说话人行优先，避免带 ｜ 的台词被误拆）
    if (INLINE_SEP_RE.test(line) && !line.startsWith('【') && !looksLikeSpeakerLine(line)) {
      for (const segment of line.split('‖')) {
        const trimmed = segment.trim()
        if (!trimmed) continue
        const parts = trimmed.split(/[｜|]/).map((part) => part.trim())
        const cell: LongProjectStoryboardCell = { content: '' }
        if (parts.length >= 2) {
          cell.shot = parts[0] || undefined
          cell.content = parts[1] || ''
          const tail = parts.slice(2).join('｜')
          if (tail) {
            const said = tail.match(SPEAKER_RE)
            if (said) { cell.speaker = said[1].trim(); cell.delivery = (said[2] as '心声' | '画外') || undefined; cell.dialogue = stripLineWrap(said[3]) }
            else if (NARRATION_RE.test(tail)) cell.narration = stripLineWrap(tail.replace(NARRATION_RE, '$1'))
            else cell.content = [cell.content, tail].filter(Boolean).join('｜')
          }
        } else {
          fillCell(cell, trimmed)
        }
        pushCell(cell)
      }
      continue
    }

    // 4) 方括号行（无格标记）：按字段名或镜头类型分流
    const bracket = line.match(BRACKET_RE)
    if (bracket) {
      const name = bracket[1].trim()
      const rest = bracket[2].trim()
      if (name === '镜头') pushCell({ content: '', shot: rest })
      else if (name === '画面' || name === '内容') pushContent(rest)
      else if (name === '对白' || name === '台词') pushDialogue(undefined, undefined, rest)
      else if (name === '旁白') pushNarration(rest)
      else pushCell({ content: rest, shot: name })
      continue
    }

    // 5) 旁白行 `旁白：文字`
    const narration = line.match(NARRATION_RE)
    if (narration) { pushNarration(narration[1].trim()); continue }

    // 6) 说话人行 `说话人：台词`（归属其上最近的格）
    const said = line.match(SPEAKER_RE)
    if (said && cells.length) {
      const cell = lastCell()!
      cell.speaker = said[1].trim()
      cell.delivery = (said[2] as '心声' | '画外') || undefined
      cell.dialogue = stripLineWrap(said[3])
      lastField = 'dialogue'
      continue
    }

    // 7) 续行：旧格式拼回上一个字段；页块格式并入最近一格的画面
    if (lastField && !cells.length && current) {
      const key = lastField as 'content' | 'dialogue' | 'narration' | 'imagePrompt'
      if (key === 'content') current.content += line
      else current[key] = (current[key] ?? '') + line
      continue
    }
    const cell = lastCell()
    if (cell) cell.content += line
    else pushContent(line, true)
  }

  flush()
  if (!panels.length) throw new Error('模型返回中未找到分镜，请检查分镜模板的输出格式。')
  return panels
}

/**
 * 格列表 → 页级字段汇总：画面换行相连、镜头去重斜杠相连、台词与旁白按格序换行拼接。
 * 生图推导 / 列表概览 / 资产计数等既有消费方只读页级字段，多格页因此无需改造。
 */
export function summarizeCells(cells: LongProjectStoryboardCell[]): Pick<LongProjectStoryboardPanel, 'content' | 'shot' | 'dialogue' | 'narration'> {
  const content = cells.map((cell) => cell.content.trim()).filter(Boolean).join('\n')
  const shots = [...new Set(cells.map((cell) => cell.shot?.trim()).filter(Boolean) as string[])]
  const dialogues = cells
    .filter((cell) => cell.dialogue?.trim())
    .map((cell) => dialogueLine(cell))
  const narrations = cells.map((cell) => cell.narration?.trim()).filter(Boolean) as string[]
  return {
    content,
    shot: shots.length ? shots.join('/') : undefined,
    dialogue: dialogues.length ? dialogues.join('\n') : undefined,
    narration: narrations.length ? narrations.join('\n') : undefined,
  }
}

/** 格序号标记（与解析器的 CELL_MARK_RE 对应）。 */
const CELL_MARKS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']

/**
 * 台词行文本：`说话人（心声）：台词`；无说话人时只输出台词。
 * wrap=true 时给正文补【】（序列化 / 展示用）；汇总进页级字段时保持裸文本，避免污染后续画面描述提示词。
 */
function dialogueLine(cell: LongProjectStoryboardCell, wrap = false): string {
  const speaker = cell.speaker?.trim() ?? ''
  const delivery = cell.delivery ? `（${cell.delivery}）` : ''
  const text = cell.dialogue?.trim() ?? ''
  const body = wrap && text ? `【${text}】` : text
  return `${speaker}${delivery}${speaker ? '：' : ''}${body}`
}

/** 台词行 → 格内字段（说话人 / 方式 / 台词）；正文首尾【】剥掉入库。 */
function fillDialogueFromLine(cell: LongProjectStoryboardCell, line: string) {
  const said = line.match(SPEAKER_RE)
  if (said) {
    cell.speaker = said[1].trim()
    cell.delivery = (said[2] as '心声' | '画外') || undefined
    cell.dialogue = stripLineWrap(said[3])
  } else {
    cell.dialogue = stripLineWrap(line)
  }
}

/**
 * 旧数据（无 cells）→ 格列表：页级画面 / 镜头落进首格，页级对白与旁白按行拆回格内。
 * 新数据直接返回 cells，保证旧分镜 run 打开编辑器时不丢内容。
 */
function panelToCells(panel: LongProjectStoryboardPanel): LongProjectStoryboardCell[] {
  if (panel.cells?.length) return panel.cells
  const cells: LongProjectStoryboardCell[] = [{ shot: panel.shot, content: panel.content ?? '' }]
  const splitLines = (value?: string) => (value ?? '').split('\n').map((line) => line.trim()).filter(Boolean)
  for (const line of splitLines(panel.dialogue)) {
    if (cells[cells.length - 1].dialogue) cells.push({ content: '' })
    fillDialogueFromLine(cells[cells.length - 1], line)
  }
  for (const line of splitLines(panel.narration)) {
    if (cells[cells.length - 1].narration) cells.push({ content: '' })
    cells[cells.length - 1].narration = line
  }
  return cells
}

/** 一页 → 页块文本（与 LLM 输出同一套语法，可在单一输入框里直接编辑与复制；台词 / 旁白正文带【】）。 */
export function serializePanelBlock(panel: LongProjectStoryboardPanel): string {
  const lines: string[] = []
  panelToCells(panel).forEach((cell, index) => {
    const shot = cell.shot?.trim()
    const mark = CELL_MARKS[index] ?? `${index + 1}.`
    lines.push(`${mark}${shot ? `【${shot}】` : ''}${(cell.content ?? '').trim()}`)
    if (cell.dialogue?.trim()) lines.push(dialogueLine(cell, true))
    if (cell.narration?.trim()) lines.push(`旁白：【${cell.narration.trim()}】`)
  })
  return lines.join('\n')
}

/**
 * 页块文本 → 格列表：复用 LLM 输出的同一套解析规则（页头 + 格行 + 台词行）。
 * 空文本返回空数组；无任何格标记时整段兜底为首格画面，避免内容丢失。
 */
export function parsePanelBlock(text: string): LongProjectStoryboardCell[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  try {
    const parsed = parseStoryboardResponse(`## 分镜 1\n${trimmed}`, [], '', {}).flatMap((panel) => panel.cells ?? [])
    return parsed.length ? parsed : [{ content: trimmed }]
  } catch {
    return [{ content: trimmed }]
  }
}

/**
 * 生成分镜：剧本为主输入、原文分析为辅助上下文。
 * prompt 为 PromptRunBar 组装好的最终提示词（优先）；未提供时用 template + 输入现场组装。
 * assets 仅用于解析旧模板仍输出"出场资产"行时的绑定回填（新管线传空数组即可）。
 */
export async function generateStoryboard(options: { model: ModelConfig; template?: PromptTemplate; scriptContent: string; analysis?: string; assets?: LongProjectAsset[]; chapterId: string; chapterOrders: Record<string, number>; prompt?: string }) {
  const prompt = options.prompt ?? buildStoryboardPrompt(options.template?.content ?? '', options.scriptContent, options.analysis)
  const result = await llmService.call({ modelConfig: options.model, userMessage: prompt })
  if (!result.success || !result.content) throw new Error(result.error || '模型没有返回内容')
  return { rawResponse: result.content, panels: parseStoryboardResponse(result.content, options.assets ?? [], options.chapterId, options.chapterOrders) }
}

/**
 * 单页分镜「AI 优化」提示词：只做格式与节奏校正（补镜头、拆台词、补说话人），
 * 不改动剧情事实与台词文字；输出仍走分镜输出协议，保证能被 parsePanelBlock 解析回格列表。
 */
export function buildPanelPolishPrompt(blockText: string, scriptContext?: string): string {
  return `你是条漫分镜校对员。请对下面这一页分镜做「格式与节奏」的校正，输出优化后的这一页分镜。

【只允许做这些校正】
- 补齐或修正每一格的【镜头】（远景 / 中景 / 近景 / 特写 / POV / 过肩 / 仰拍 之一，每格必填）；
- 台词行补全说话人写法（台词 / 旁白正文用【】括起来，说话人写在【】外面）：对白写「说话人：【台词】」，
  内心独白写「说话人（心声）：【台词】」，说话人不在本格画面内写「说话人（画外）：【台词】」，无人称旁白写「旁白：【文字】」；
- 单格台词不超过 20 字（单格满版不超过 30 字），超出时拆成多格；一页最多 4 格；
- 一格内混入两条叙事线索时拆格；画面描述补足到 15~40 字，只写画面上能看到的内容。

【必须遵守】
- 剧情、画面事实、台词文字与说话人一律不得改动、增删或润色；不要补写剧本里没有的情节；
- 只输出这一页分镜文本，不要输出其它页；不要解释、不要代码块、不要输出标题行。

【输出格式】
${defaultOutputProtocol('storyboard')}

【所属章节漫画剧本（仅供核对本页说话人与剧情，不要据此增删本页内容）】
${scriptContext?.trim() || '（本章尚未生成剧本）'}

【当前这一页分镜】
${blockText.trim()}`
}

/** 单页分镜 AI 优化执行：一次 LLM 调用，返回解析后的格列表。 */
export async function polishPanelBlock(options: { model: ModelConfig; blockText: string; scriptContext?: string }): Promise<LongProjectStoryboardCell[]> {
  const result = await llmService.call({ modelConfig: options.model, userMessage: buildPanelPolishPrompt(options.blockText, options.scriptContext) })
  if (!result.success || !result.content) throw new Error(result.error || '模型没有返回内容')
  const cells = parsePanelBlock(result.content)
  if (!cells.length) throw new Error('模型返回内容无法解析为分镜页块，请重试')
  return cells
}

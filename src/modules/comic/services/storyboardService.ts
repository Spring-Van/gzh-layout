import { v4 as uuidv4 } from 'uuid'
import type { LongProjectAsset, LongProjectStoryboardAssetBinding, LongProjectStoryboardCell, LongProjectStoryboardPanel, ModelConfig, PromptTemplate } from '@comic/types'
import { llmService } from './llmService'
import { defaultOutputProtocol, defaultTemplateContent, renderPromptTemplate } from './promptTemplateRegistry'

/**
 * 组装"分镜生成"提示词：漫画剧本（主输入）+ 原文分析 / 章节原文（辅助核对）。
 * 变量：{{漫画剧本}} / {{原文分析}} / {{章节原文}}；无剧本时调用方已用章节原文兜底填入剧本槽位。
 * 未选/未配模板时用内置默认模板（与推荐模板同源，自带全部变量）。
 * 新管线下分镜不再依赖资产库绑定；资产绑定在资产提取确认后按文本自动回填。
 */
export function buildStoryboardPrompt(templateContent: string, scriptContent: string, analysis?: string, chapterContent?: string): string {
  const script = (scriptContent ?? '').trim()
  const chapter = (chapterContent ?? '').trim()
  return renderPromptTemplate({
    type: 'storyboard',
    content: templateContent.trim() || defaultTemplateContent('storyboard'),
    values: {
      漫画剧本: scriptContent,
      原文分析: analysis,
      // 剧本缺失时调用方以章节原文兜底填入「漫画剧本」，同一份原文不再重复渲染一遍
      章节原文: script && chapter !== script ? chapterContent : '',
    },
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
/** 页头右侧的格数标签：`## 分镜 2 · 双格` → 「双格」 */
const PAGE_LABEL_RE = /[·・]\s*([^·・]+?)\s*$/
/** v4 格标题行：`【第1格】`（允许同行续写内容） */
const CELL_TITLE_RE = /^【\s*第\s*([0-9一二三四五六七八九十]+)\s*格\s*】\s*(.*)$/
/** v4 字段行：`「景别」：内容`（引号兼容 「」『』【】[]） */
const LABEL_FIELD_RE = /^[「『【\[]\s*([^」』】\]]+?)\s*[」』】\]]\s*[：:]\s*([\s\S]*)$/
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
/** v4 台词值（带引号）：`说话人：“台词”` */
const QUOTED_SPEECH_RE = /^(.{1,20}?)\s*[：:]\s*[“"‘'「『]\s*([\s\S]*?)\s*[”"’'」』]?\s*$/
/** 旧字段行：`- 画面：内容` */
const FIELD_RE = /^[-*]\s*([^：:]+)[：:]\s*(.*)$/
/** v2 行内分格分隔符（‖ 分格、｜ 分字段） */
const INLINE_SEP_RE = /[‖｜|]/
/** 结构性行（无页头时据此自动开页，兼容外部纯文本导入） */
const STRUCTURAL_RE = /^(?:[①②③④⑤⑥⑦⑧⑨⑩]|[【\[]|[「『])|[‖]|[｜|]/

/** v4 字段名 → 格字段（「景别」是景别，「镜头」是运镜） */
const CELL_FIELD_KEYS: Record<string, 'shot' | 'camera' | 'content' | 'cast' | 'action' | 'expression' | 'sfx' | 'lighting' | 'note'> = {
  景别: 'shot', 镜头: 'camera', 运镜: 'camera', 画面: 'content', 内容: 'content',
  人物: 'cast', 出场角色: 'cast', 动作: 'action', 表情: 'expression',
  音效: 'sfx', 光效: 'lighting', 备注: 'note',
}
/** v4 台词类字段名 → delivery（缺省 = 对白） */
const SPEECH_LABELS: Record<string, '心声' | '画外' | undefined> = {
  台词: undefined, 对白: undefined, 心声: '心声', 独白: '心声', 画外: '画外',
}
/** 可续行的格字段（模型把一段写换行时并回同一字段） */
type CellTextField = 'shot' | 'camera' | 'content' | 'cast' | 'action' | 'expression' | 'sfx' | 'lighting' | 'note'

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
 * v4 台词值 → [说话人, 台词正文]。
 * 优先按「说话人：“台词”」拆（引号可省）；拆不出说话人时，整段作为正文，避免误切台词里出现的冒号。
 */
function splitSpeech(value: string): [string | undefined, string] {
  const text = stripLineWrap(value)
  const quoted = text.match(QUOTED_SPEECH_RE)
  if (quoted) return [quoted[1].trim(), quoted[2].trim()]
  const said = text.match(SPEAKER_RE)
  if (said && !INLINE_SEP_RE.test(said[1])) return [said[1].trim(), stripLineWrap(said[3])]
  return [undefined, text]
}

/**
 * 解析 LLM 返回的 Markdown 分镜文本为结构化分镜数组。
 *
 * 主格式为「页块格式」（v4，符号规则：分镜格用【第X格】、字段标题用「XXX」、冒号后写具体内容）：
 * 一个 `## 分镜 N · X格` 页块 = 一张漫画图；页内先写 `【第X格】` 起一格，
 * 再从下一行起逐行写 `「字段名」：内容`（景别 / 镜头 / 画面 / 人物 / 动作 / 表情 / 台词 / 心声 / 画外 / 旁白 / 音效 / 光效 / 备注）。
 * 同时向下兼容三种历史形态：
 * 1. v3 页块：`①【镜头】画面` + `说话人：【台词】` / `旁白：【文字】`（正文【】可带可不带，解析时剥掉）；
 * 2. 旧字段行：`- 属性名：内容`（画面/内容、镜头、对白、旁白、绘画提示词、出场资产）；
 * 3. v2 行内分格：`近景｜画面｜台词 ‖ 中景｜画面`；无页头的纯结构文本（① / 【】/ 「」/ ‖ / ｜）自动开页。
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
  /** 页头声明的格数标签（`## 分镜 1 · 双格` → 「双格」） */
  let pendingLabel: string | undefined
  /** 最近写入的格字段（v4 模型换行续写时并回同一字段） */
  let lastCellKey: CellTextField | 'dialogue' | 'narration' | null = null

  const lastCell = () => cells[cells.length - 1]

  const startPage = () => {
    current = { id: uuidv4(), order: panels.length + 1, content: '', assetBindings: [] }
    cells = []
    pendingLabel = undefined
    looseDialogue.length = 0
    looseNarration.length = 0
    lastField = null
    lastCellKey = null
  }

  /** 收尾当前页：把格汇总回页级字段，保证既有消费方（生图推导 / 概览 / 资产计数）无需改动。 */
  const flush = () => {
    if (!current) return
    if (cells.length) {
      current.cells = cells.map((cell) => ({ ...cell }))
      // 格数标签：优先用页头声明的（「解析标题后面的 双格」），缺省按实际格数推导
      current.cellLabel = pendingLabel?.trim() || cellCountLabel(cells.length)
      const summary = summarizeCells(cells)
      if (summary.content) current.content = summary.content
      if (summary.shot) current.shot = summary.shot
      if (summary.dialogue) current.dialogue = summary.dialogue
      if (summary.narration) current.narration = summary.narration
    } else if (pendingLabel?.trim()) {
      current.cellLabel = pendingLabel.trim()
    }
    if (looseDialogue.length) current.dialogue = [current.dialogue, ...looseDialogue].filter(Boolean).join('\n')
    if (looseNarration.length) current.narration = [current.narration, ...looseNarration].filter(Boolean).join('\n')
    if (current.content?.trim() || cells.length) panels.push(current)
    current = undefined
    cells = []
    pendingLabel = undefined
    looseDialogue.length = 0
    looseNarration.length = 0
    lastField = null
    lastCellKey = null
  }

  /** 写入画面：有格进当前格，无格退化为页面级 content（append 用于旧格式续行）。 */
  const pushContent = (value: string, append = false) => {
    const cell = lastCell()
    if (cell) { cell.content = append ? cell.content + value : value; lastCellKey = 'content' }
    else if (current) current.content = append ? current.content + value : value
    lastField = 'content'
  }

  /** 写入格字段（v4「字段名」：内容）；无格时画面退化为页级内容，其余字段无处可放则丢弃。 */
  const pushCellField = (key: CellTextField, value: string) => {
    const cell = lastCell()
    if (!cell) { if (key === 'content') pushContent(value); return }
    cell[key] = value
    lastCellKey = key
    lastField = null
  }

  /** 写入台词：有格进当前格（带说话人），无格退化为页面级对白；正文首尾【】在此剥掉。 */
  const pushDialogue = (speaker: string | undefined, delivery: '心声' | '画外' | undefined, text: string) => {
    const cell = lastCell()
    const body = stripLineWrap(text)
    if (cell) { cell.speaker = speaker; cell.delivery = delivery; cell.dialogue = body; lastCellKey = 'dialogue' }
    else looseDialogue.push(`${speaker ?? ''}${delivery ? `（${delivery}）` : ''}${speaker ? '：' : ''}${body}`)
    lastField = 'dialogue'
  }

  /** 写入 v4 台词值（`说话人：“台词”`）：自动拆出说话人与 delivery。 */
  const pushSpeech = (delivery: '心声' | '画外' | undefined, value: string) => {
    const [speaker, body] = splitSpeech(value)
    pushDialogue(speaker, delivery, body)
  }

  /** 写入无人称旁白；正文首尾【】在此剥掉。 */
  const pushNarration = (text: string) => {
    const cell = lastCell()
    const body = stripLineWrap(text)
    if (cell) { cell.narration = body; lastCellKey = 'narration' }
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
  const pushCell = (cell: LongProjectStoryboardCell) => { cells.push(cell); lastField = null; lastCellKey = null }

  for (const rawLine of content.replace(/\r/g, '').split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    if (PAGE_HEADER_RE.test(line)) {
      flush(); startPage()
      pendingLabel = line.match(PAGE_LABEL_RE)?.[1]
      continue
    }
    // 无页头但结构明确（① / 【】/ 「」/ ‖ / ｜）→ 自动开页，兼容外部纯文本导入
    if (!current) {
      if (!STRUCTURAL_RE.test(line)) continue
      startPage()
    }

    // 1) v4 格标题行 `【第1格】`（可同行续写内容）
    const cellTitle = line.match(CELL_TITLE_RE)
    if (cellTitle) {
      pushCell({ content: cellTitle[2].trim() })
      continue
    }

    // 2) 旧字段行 `- 画面：…`（优先判定，避免被说话人正则误吃）
    const field = line.match(FIELD_RE)
    if (field) {
      const key = field[1].trim()
      const value = field[2].trim()
      if (key === '画面' || key === '内容') pushContent(value)
      // 旧格式只有「镜头」= 景别；v4 的「镜头」是运镜（走下面的「」字段行）
      else if (key === '镜头' || key === '景别') { const cell = lastCell(); if (cell) { cell.shot = value; lastCellKey = 'shot' } else if (current) current.shot = value; lastField = null }
      else if (key === '对白' || key === '台词') pushDialogue(undefined, undefined, value)
      else if (key === '心声' || key === '独白') pushSpeech('心声', value)
      else if (key === '画外') pushSpeech('画外', value)
      else if (key === '旁白') pushNarration(value)
      else if (key === '运镜') pushCellField('camera', value)
      else if (key === '人物' || key === '出场角色') pushCellField('cast', value)
      else if (key === '动作') pushCellField('action', value)
      else if (key === '表情') pushCellField('expression', value)
      else if (key === '音效') pushCellField('sfx', value)
      else if (key === '光效') pushCellField('lighting', value)
      else if (key === '备注') pushCellField('note', value)
      else if (key === '绘画提示词') { if (current) current.imagePrompt = value; lastField = 'imagePrompt' }
      else if (key === '出场资产') { if (current) current.assetBindings = bindingsFromValue(value, assets, chapterId, chapterOrders); lastField = null }
      else lastField = null
      continue
    }

    // 3) 格行 `①【近景】画面`
    if (CELL_MARK_RE.test(line)) {
      const cell: LongProjectStoryboardCell = { content: '' }
      fillCell(cell, line.replace(CELL_MARK_RE, ''))
      pushCell(cell)
      continue
    }

    // 4) v4 字段行 `「景别」：内容`
    const labeled = line.match(LABEL_FIELD_RE)
    if (labeled) {
      const label = labeled[1].trim()
      const value = labeled[2].trim()
      if (label === '旁白') { pushNarration(value); continue }
      if (label in SPEECH_LABELS) { pushSpeech(SPEECH_LABELS[label], value); continue }
      const key = CELL_FIELD_KEYS[label]
      if (key) { pushCellField(key, value); continue }
      // 协议外的自定义字段：并入本格画面（保留字段名，避免丢信息）
      const cell = lastCell()
      if (cell) { cell.content = cell.content ? `${cell.content}\n${label}：${value}` : `${label}：${value}`; lastCellKey = 'content' }
      else pushContent(value)
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

    // 6) 方括号行（无格标记）：按字段名或镜头类型分流
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

    // 7) 旁白行 `旁白：文字`
    const narration = line.match(NARRATION_RE)
    if (narration) { pushNarration(narration[1].trim()); continue }

    // 8) 说话人行 `说话人：台词`（归属其上最近的格）
    const said = line.match(SPEAKER_RE)
    if (said && cells.length) {
      const cell = lastCell()!
      cell.speaker = said[1].trim()
      cell.delivery = (said[2] as '心声' | '画外') || undefined
      cell.dialogue = stripLineWrap(said[3])
      lastField = 'dialogue'
      continue
    }

    // 9) 续行：并回上一个字段（v4 格字段优先，其次旧格式页级字段，最后并入最近一格的画面）
    const cell = lastCell()
    if (cell && lastCellKey) {
      cell[lastCellKey] = `${cell[lastCellKey] ?? ''}${line}`
      continue
    }
    if (lastField && !cells.length && current) {
      const key = lastField as 'content' | 'dialogue' | 'narration' | 'imagePrompt'
      if (key === 'content') current.content += line
      else current[key] = (current[key] ?? '') + line
      continue
    }
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

/** 格数标签表：1~4 格用中文，超出按「N 格」。 */
const CELL_COUNT_LABELS = ['', '单格', '双格', '三格', '四格']

/** 格数 → 中文标签（页头「· 双格」缺失时的兜底推导）。 */
export function cellCountLabel(count: number): string {
  return CELL_COUNT_LABELS[count] ?? `${count} 格`
}

/** 页头格数标签：优先用解析出的原文（如「双格」），旧数据缺省按实际格数推导。 */
export function resolvePanelCellLabel(panel: LongProjectStoryboardPanel): string {
  return panel.cellLabel?.trim() || cellCountLabel(panel.cells?.length ?? 1)
}

/**
 * 台词行文本（页级汇总用）：`说话人（心声）：台词`；无说话人时只输出台词。
 * 页级字段保持裸文本（不带【】/引号），避免污染下一环节的画面描述提示词。
 */
function dialogueLine(cell: LongProjectStoryboardCell): string {
  const speaker = cell.speaker?.trim() ?? ''
  const delivery = cell.delivery ? `（${cell.delivery}）` : ''
  return `${speaker}${delivery}${speaker ? '：' : ''}${cell.dialogue?.trim() ?? ''}`
}

/** 台词字段名：按 delivery 选「台词 / 心声 / 画外」。 */
function speechLabel(delivery: LongProjectStoryboardCell['delivery']): string {
  if (delivery === '心声') return '心声'
  if (delivery === '画外') return '画外'
  return '台词'
}

/** 台词值（v4）：`说话人：“台词”`；无说话人时只输出带引号的正文。 */
function speechValue(cell: LongProjectStoryboardCell): string {
  const text = cell.dialogue?.trim() ?? ''
  const body = `“${text}”`
  const speaker = cell.speaker?.trim()
  return speaker ? `${speaker}：${body}` : body
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

/**
 * 一页 → 页块文本（v4：`【第X格】` + `「字段名」：内容`）。
 * 与 LLM 输出、可复制格式完全一致，可在单一输入框里直接编辑；空字段整行省略。
 */
export function serializePanelBlock(panel: LongProjectStoryboardPanel): string {
  const cells = panelToCells(panel)
  // 完全空白的新页不给任何格块，避免出现空的「【第1格】」
  if (!cells.some((cell) => cellHasContent(cell))) return ''
  const lines: string[] = []
  cells.forEach((cell, index) => {
    lines.push(`【第${index + 1}格】`)
    const push = (label: string, value?: string) => {
      const text = (value ?? '').trim()
      if (text) lines.push(`「${label}」：${text}`)
    }
    push('景别', cell.shot)
    push('镜头', cell.camera)
    push('画面', cell.content)
    push('人物', cell.cast)
    push('动作', cell.action)
    push('表情', cell.expression)
    if (cell.dialogue?.trim()) push(speechLabel(cell.delivery), speechValue(cell))
    push('旁白', cell.narration)
    push('音效', cell.sfx)
    push('光效', cell.lighting)
    push('备注', cell.note)
  })
  return lines.join('\n')
}

/** 格内是否有任何内容（序列化时用于跳过整块空白页）。 */
function cellHasContent(cell: LongProjectStoryboardCell): boolean {
  return [
    cell.shot, cell.camera, cell.content, cell.cast, cell.action,
    cell.expression, cell.dialogue, cell.narration, cell.sfx, cell.lighting, cell.note,
  ].some((value) => Boolean(value?.trim()))
}

/**
 * 格列表 → 画面描述环节可读的多字段文本（每格一段，只给视觉相关信息）。
 * 对白 / 旁白 / 心声不进入这里——它们不是画面内容。
 */
export function formatCellsForPrompt(cells: LongProjectStoryboardCell[]): string {
  return cells.map((cell, index) => {
    const lines = [`【第${index + 1}格】`]
    const push = (label: string, value?: string) => {
      const text = (value ?? '').trim()
      if (text) lines.push(`${label}：${text}`)
    }
    push('景别', cell.shot)
    push('镜头', cell.camera)
    push('画面', cell.content)
    push('人物', cell.cast)
    push('动作', cell.action)
    push('表情', cell.expression)
    push('音效', cell.sfx)
    push('光效', cell.lighting)
    push('备注', cell.note)
    return lines.join('\n')
  }).join('\n')
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
 * 生成分镜：剧本为主输入，原文分析与章节原文为辅。
 * prompt 为 PromptRunBar 组装好的最终提示词（优先）；未提供时用 template + 输入现场组装。
 * assets 仅用于解析旧模板仍输出"出场资产"行时的绑定回填（新管线传空数组即可）。
 */
export async function generateStoryboard(options: { model: ModelConfig; template?: PromptTemplate; scriptContent: string; analysis?: string; chapterContent?: string; assets?: LongProjectAsset[]; chapterId: string; chapterOrders: Record<string, number>; prompt?: string }) {
  const prompt = options.prompt ?? buildStoryboardPrompt(options.template?.content ?? '', options.scriptContent, options.analysis, options.chapterContent)
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
- 补齐或修正每一格的「景别」（远景 / 中景 / 近景 / 特写 / POV / 过肩 / 仰拍 之一，每格必填）；
- 补齐「人物」（本格画面内出现的角色）、「动作」、「表情」，只写画面上能看到的内容，不得编造；
- 台词类字段补全说话人写法：对白用「台词」、内心独白用「心声」、说话人不在本格画面内用「画外」、
  无人称叙述用「旁白」；写法为 说话人：“台词”，引号用中文引号，说话人不得省略；
- 保持「第X格」的序号连续；同一格内台词 / 心声 / 画外 / 旁白最多出现一个；
- 单句台词不超过 20 字（单格满版不超过 30 字），超出时拆成多格；一页最多 4 格；
- 一格内混入两条叙事线索时拆格；「画面」补足到 30~80 字。

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

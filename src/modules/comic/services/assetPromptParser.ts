/**
 * 资产绘画提示词回填解析器（多层容错，单管线）。
 *
 * 设计目标：**格式固定为 Markdown 逐条，但解析要足够宽容——不管哪个模型怎么自由发挥，
 * 只要能拿到 N 段提示词就尽量回填成功。** 不同模型（以及同一模型不同温度）会裹代码块、
 * 加客套前言、换包裹符号、换分隔符、名字漂移、直接吐 JSON、只给裸提示词……任何一条都不能让整批请求白跑。
 *
 * 管线：
 *   ① 归一化预处理  normalizeModelOutput  剥围栏 / 去零宽与 emoji / 统一换行
 *   ② 多形态头识别  scanHeaders           逐行扫描，按优先级尝试 6 类头部形态
 *   ③ 模糊名字匹配  createResolver        精确 → 紧凑 → 子集交集 → 状态名全库唯一 → 资产下单状态
 *   ④ 其它形态容错  runJson / runIndexed  模型自作主张给 JSON 或序号时照样能收
 *   ⑤ 顺序兜底      splitSegments         段落数严格等于目标数时，按清单顺序 1:1 回填
 *   ⑥ 诊断          diagnostics           失败时带原始返回 / 期望条数 / 停在哪一步
 *
 * 不再有「解析方式」档位：返回格式由系统固定（见 promptTemplateRegistry 的 ASSET_PROMPT_FORMAT），
 * 用户写的输出协议只作为内容要求，改不坏解析。
 *
 * 关键安全机制：**候选头必须先 resolve 成功才算头**（两遍法）。
 * 否则「- 视觉描述：少年模样 - 略显疲惫」这类正文行会被误判成头部并把段落切碎。
 */

/** 解析目标：视觉状态的定位信息（与 assetPromptService 的目标清单同源）。 */
export interface AssetPromptTargetRef {
  assetId: string
  variantId: string
  assetName: string
  variantName: string
}

/** 精确定位索引：序号（"3"）与「资产名##状态名」→ 目标。 */
export type AssetPromptTargetIndex = Map<string, AssetPromptTargetRef>

/** 命中方式：exact 精确 / fuzzy 模糊 / order 顺序兜底。 */
export type AssetPromptMatchKind = 'exact' | 'fuzzy' | 'order'

export interface AssetPromptParseItem extends AssetPromptTargetRef {
  imagePrompt: string
  match: AssetPromptMatchKind
}

/** 解析停在哪一步（失败定位）；ok = 命中，none = 全部形态都没识别出来。 */
export type AssetPromptParseStage = 'ok' | 'bracket' | 'json' | 'indexed' | 'order' | 'none'

export interface AssetPromptParseDiagnostics {
  stage: AssetPromptParseStage
  expected: number
  parsed: number
  /** 未回填的目标标签（资产名｜状态名），供 UI 精确列出缺失项。 */
  missing: string[]
  /** 模型原始返回全文（UI 只读展示用）。 */
  raw: string
}

export interface AssetPromptParseOutcome {
  items: AssetPromptParseItem[]
  diagnostics: AssetPromptParseDiagnostics
}

export interface AssetPromptParseContext {
  /** 精确定位索引：序号 + 「资产名##状态名」。 */
  index: AssetPromptTargetIndex
  /** 按清单顺序排列的目标（顺序兜底与模糊匹配的权威来源）。 */
  ordered: AssetPromptTargetRef[]
}

/** 名字定位键：去除空白并统一常见分隔符，容忍模型输出中的全角/半角差异。 */
export function targetKey(assetName: string, variantName: string): string {
  return `${assetName}##${variantName}`.replace(/\s+/g, '').replace(/[｜|/／、,，:：]/g, '|')
}

// ========== ① 归一化预处理 ==========

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE0F}]/gu
const FENCE_LINE_RE = /^[ \t]*```[^\n]*$/gm
const RULE_LINE_RE = /^[ \t]*[-=_*]{3,}[ \t]*$/gm

/**
 * 归一化模型返回：只做「外观级」清洗，不动任何内容字符。
 * - 统一换行；
 * - 去零宽字符、不间断空格、emoji（模型爱加的装饰，会污染提示词）；
 * - 去代码块围栏行（保留围栏内的正文）；
 * - 去整行水平分隔线（`---` / `***`，模型用作分段）。
 */
export function normalizeModelOutput(raw: string): string {
  let text = raw.replace(/\r\n?/g, '\n').replace(/\u00A0/g, ' ')
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, '')
  text = text.replace(EMOJI_RE, '')
  text = text.replace(FENCE_LINE_RE, '')
  text = text.replace(RULE_LINE_RE, '')
  // 删掉围栏/分隔线行后会留下多余空行，压回单空行（顺序兜底依赖段落切分）
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
}

/** 紧凑形式：去空白与全部常见分隔符，用于宽松匹配（「阶段·外观」→「阶段外观」）。 */
function compact(value: string): string {
  return value
    .replace(/\s+/g, '')
    .replace(/[·・•\-—–－~～_/／|｜,，、;；:：.。()（）[\]【】「」『』《》<>"'*#]/g, '')
    .toLowerCase()
}

const NOISE_LINE_RE = /^(?:希望|如需|如果|以上|以上是|以下是|好的|备注|说明|注[:：]|共\s*\d+|注意|提示|（完）|\(完\))/

/** 疑似模型客套/说明行（短且带说明特征）——只在段尾清理，避免误删正文。 */
function isNoiseLine(line: string): boolean {
  return line.length <= 40 && NOISE_LINE_RE.test(line)
}

/** 清洗一段提示词正文：去行首列表符/标题符/强调符，合并为一行，去掉结尾说明行。 */
function cleanPromptText(body: string): string {
  const lines = body
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s*(?:[-*+·>]\s*)+/, '')
        .replace(/^\s*#{1,6}\s*/, '')
        .replace(/[*_]{1,3}/g, '')
        .trim(),
    )
    .filter(Boolean)
  while (lines.length > 1 && isNoiseLine(lines[lines.length - 1])) lines.pop()
  return lines.join(' ')
}

// ========== ③ 模糊名字匹配 ==========

interface ResolvedTarget {
  ref: AssetPromptTargetRef
  match: AssetPromptMatchKind
}

type Resolver = (assetName: string | undefined, variantName: string | undefined) => ResolvedTarget | undefined

const SEQ_ONLY_RE = /^(?:状态|第|序号)?\s*(\d{1,3})\s*(?:条|个|项|号)?$/

function pushTo(map: Map<string, AssetPromptTargetRef[]>, key: string, ref: AssetPromptTargetRef): void {
  if (!key) return
  const list = map.get(key)
  if (list) list.push(ref)
  else map.set(key, [ref])
}

function buildTargetIndexes(context: AssetPromptParseContext) {
  const ordered = context.ordered
  const bySeq = new Map<string, AssetPromptTargetRef>()
  for (const [key, ref] of context.index) if (/^\d+$/.test(key)) bySeq.set(key, ref)

  const byCompactPair = new Map<string, AssetPromptTargetRef>()
  const byVariant = new Map<string, AssetPromptTargetRef[]>()
  const byAsset = new Map<string, AssetPromptTargetRef[]>()
  for (const ref of ordered) {
    byCompactPair.set(`${compact(ref.assetName)}##${compact(ref.variantName)}`, ref)
    pushTo(byVariant, compact(ref.variantName), ref)
    pushTo(byAsset, compact(ref.assetName), ref)
  }
  return { bySeq, byCompactPair, byVariant, byAsset }
}

/**
 * 生成名字解析器。匹配强度由强到弱：
 * 精确键 → 紧凑键 → 资产名精确下的状态名等价 → 资产×状态候选交集唯一 →
 * 状态名全库唯一（模型常写错资产名）→ 资产名下仅一个状态。
 * 只要不是精确命中，统一标记为 fuzzy，由 UI 提示用户核对。
 */
function createResolver(context: AssetPromptParseContext): Resolver {
  const { bySeq, byCompactPair, byVariant, byAsset } = buildTargetIndexes(context)

  // 具名，供「资产名（状态名）」拆分时递归调用
  const resolve: Resolver = (assetNameRaw, variantNameRaw) => {
    const assetName = (assetNameRaw ?? '').trim()
    const variantName = (variantNameRaw ?? '').replace(/^[｜|\s]+|[｜|\s]+$/g, '').trim()

    if (!assetName && !variantName) return undefined

    const seqMatch = SEQ_ONLY_RE.exec(variantName)
    if (!assetName && seqMatch) {
      const ref = bySeq.get(seqMatch[1])
      if (ref) return { ref, match: 'fuzzy' }
    }

    const compactAsset = compact(assetName)
    const compactVariant = compact(variantName)

    if (compactAsset && compactVariant) {
      const exactPair = context.index.get(targetKey(assetName, variantName))
      if (exactPair) return { ref: exactPair, match: 'exact' }
      const compactPair = byCompactPair.get(`${compactAsset}##${compactVariant}`)
      if (compactPair) return { ref: compactPair, match: 'fuzzy' }

      const assetList = byAsset.get(compactAsset)
      const variantList = byVariant.get(compactVariant)
      // 资产名精确 + 该资产下状态名等价
      if (assetList?.length === 1 && compact(assetList[0].variantName) === compactVariant) {
        return { ref: assetList[0], match: 'fuzzy' }
      }
      // 两个维度的候选取交集，唯一命中才接受
      if (assetList?.length && variantList?.length) {
        const inter = assetList.filter((ref) => variantList.includes(ref))
        if (inter.length === 1) return { ref: inter[0], match: 'fuzzy' }
      }
      // 状态名在全库唯一 → 认状态名（模型写错资产名比写错状态名常见得多）
      if (variantList?.length === 1) return { ref: variantList[0], match: 'fuzzy' }
      // 资产名下只有一个状态 → 认资产名
      if (assetList?.length === 1) return { ref: assetList[0], match: 'fuzzy' }
      // 兜底：在资产名下做状态名包含匹配（短侧至少 2 字）
      if (assetList?.length) {
        const hit = assetList.find((ref) => {
          const refVariant = compact(ref.variantName)
          return (
            compactVariant.length >= 2 &&
            refVariant.length >= 2 &&
            (refVariant.includes(compactVariant) || compactVariant.includes(refVariant))
          )
        })
        if (hit) return { ref: hit, match: 'fuzzy' }
      }
      return undefined
    }

    if (!compactAsset && compactVariant) {
      const variantList = byVariant.get(compactVariant)
      if (variantList?.length === 1) return { ref: variantList[0], match: 'fuzzy' }
      if (variantList?.length) {
        const hit = variantList.find((ref) => {
          const refVariant = compact(ref.variantName)
          return compactVariant.length >= 2 && (refVariant.includes(compactVariant) || compactVariant.includes(refVariant))
        })
        if (hit) return { ref: hit, match: 'fuzzy' }
      }
      return undefined
    }

    if (compactAsset && !compactVariant) {
      // 「资产名（状态名）」整体被当成资产名（如 【小明（少年期）】）：拆一次括号再试
      const inline = /^(.{1,40}?)\s*[（(]\s*(.{1,40}?)\s*[）)]$/.exec(assetName)
      if (inline) {
        const inner = resolve(inline[1], inline[2])
        if (inner) return inner
      }
    }

    const assetList = byAsset.get(compactAsset)
    if (assetList?.length === 1) return { ref: assetList[0], match: 'fuzzy' }
    return undefined
  }

  return resolve
}

// ========== ② 多形态头识别 ==========

/** 行首标签（资产：/ 状态名：）——剥离后再试包裹类形态，兼容模型模仿输入清单的写法。 */
const LEADING_LABEL_RE =
  /^[\s>*+\-·]*(?:资产名|资产名称|资产|视觉状态名|视觉状态|状态名|状态名称|状态|名称)\s*[:：]\s*/

/** 行内键值形态：资产名：X 与 状态名：Y 同行出现（模型模仿清单格式）。 */
const KV_ASSET_RE = /(?:^|[|｜\s,，、;；])资产(?:名|名称)?\s*[:：]\s*([^|｜\n:：]{1,40})/
const KV_VARIANT_RE = /(?:^|[|｜\s,，、;；])(?:视觉)?状态(?:名|名称)?\s*[:：]\s*([^|｜\n:：]{1,40})/

/** 形态①：【资产名｜状态名】提示词 / [资产名|状态名] 提示词（含前置 # > - * 装饰）。 */
const P_BRACKET =
  /^[#>\-*+\s·]*[【\[]\s*([^【】\[\]|｜\n]{1,40}?)\s*[|｜/／\-–—]\s*([^【】\[\]|｜\n:：]{1,40}?)\s*[】\]]\s*[:：]?\s*(.*)$/
/**
 * 形态②：**资产名｜状态名** 提示词 / ### 资产名 - 状态名（强调或标题包裹，冒号可选）。
 * 尾部的 lookahead 是关键：状态名必须收在 `**`/`__`/冒号/行尾，否则非贪婪会提前停下，
 * 把「**小明｜少年期**：…」读成状态名「少」。
 */
const P_EMPHASIS =
  /^[#>\-*+\s·]*(?:\*\*|__|\*|_)?\s*([^【】\[\]|｜*_\n]{1,40}?)\s*[|｜/／\-–—]\s*([^【】\[\]|｜*_\n:：]{1,40}?)\s*(?=\*\*|__|[:：]|$)(?:\*\*|__|\*|_)?\s*[:：]?\s*(.*)$/
/** 形态③：资产名｜状态名：提示词（行首无包裹，必须带冒号）。 */
const P_INLINE =
  /^[#>\-*+\s·]*([^【】\[\]|｜\n:：]{1,40}?)\s*[|｜/／\-–—]\s*([^【】\[\]|｜\n:：]{1,40}?)\s*[:：]\s*(.+)$/
/** 形态④：资产名（状态名）：提示词。 */
const P_PAREN =
  /^[#>\-*+\s·]*([^【】\[\]（()|｜\n:：]{1,40}?)\s*[（(]\s*([^）)【】\[\]|｜\n:：]{1,40}?)\s*[）)]\s*[:：]?\s*(.*)$/
/** 形态⑤：【资产名】提示词（该资产下只有一个状态时可用）。 */
const P_BRACKET_SINGLE = /^[#>\-*+\s·]*[【\[]\s*([^【】\[\]|｜\n:：]{1,40}?)\s*[】\]]\s*[:：]?\s*(.*)$/

/** 行首序号前缀（`1.` / `①` / `第2条`）：模型爱给自己编号，剥掉后再试包裹类形态。 */
const INDEX_PREFIX_RE =
  /^[\s>*+\-·]*(?:[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]|\d{1,3}\s*[.、,，)）]|\d{1,3}\s*(?:条|个|项|号))\s*[\s>*+\-·]*/

/** 反复剥掉「序号前缀 + 标签前缀」，兼容「1. 资产：小明（少年期）：提示词」这类叠加写法。 */
function stripDecoration(line: string): string {
  let out = line
  for (let round = 0; round < 3; round += 1) {
    const next = out.replace(INDEX_PREFIX_RE, '').replace(LEADING_LABEL_RE, '')
    if (next === out) break
    out = next
  }
  return out
}

interface HeaderHit {
  lineIndex: number
  rest: string
  ref: AssetPromptTargetRef
  match: AssetPromptMatchKind
}

/** 单行头部识别：按优先级尝试键值 → 方括号 → 强调/标题 → 行内 → 括号并列。 */
function matchHeaderLine(line: string, resolve: Resolver): Omit<HeaderHit, 'lineIndex'> | undefined {
  const keyValueAsset = KV_ASSET_RE.exec(line)
  const keyValueVariant = KV_VARIANT_RE.exec(line)
  if (keyValueAsset && keyValueVariant) {
    const hit = resolve(keyValueAsset[1], keyValueVariant[1])
    if (hit) {
      const rest = line.slice(Math.max(keyValueAsset.index + keyValueAsset[0].length, keyValueVariant.index + keyValueVariant[0].length))
      return { rest: rest.replace(/^[\s|｜:：]+/, ''), ref: hit.ref, match: hit.match }
    }
  }

  const stripped = stripDecoration(line)
  const candidates = stripped && stripped !== line ? [line, stripped] : [line]
  for (const candidate of candidates) {
    for (const pattern of [P_BRACKET, P_EMPHASIS, P_INLINE, P_PAREN, P_BRACKET_SINGLE]) {
      const match = pattern.exec(candidate)
      if (!match) continue
      const hit = resolve(match[1], match[2])
      // 两遍法：resolve 失败直接丢弃，正文行不会被误判为头部
      if (!hit) continue
      return { rest: (match[3] ?? '').trim(), ref: hit.ref, match: hit.match }
    }
  }
  return undefined
}

/** 逐行扫描全部头部候选（只有能 resolve 的才算头）。 */
function scanHeaders(text: string, resolve: Resolver): HeaderHit[] {
  const lines = text.split('\n')
  const hits: HeaderHit[] = []
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.trim()) continue
    const hit = matchHeaderLine(line, resolve)
    if (hit) hits.push({ lineIndex: index, ...hit })
  }
  return hits
}

/** 按头部切分：每个头的内容 = 该行剩余部分 + 到下一个头之前的全部行。 */
function sliceByHeaders(lines: string[], hits: HeaderHit[]): Array<{ ref: AssetPromptTargetRef; match: AssetPromptMatchKind; body: string }> {
  return hits.map((hit, index) => {
    const next = hits[index + 1]
    const bodyLines = [hit.rest, ...lines.slice(hit.lineIndex + 1, next ? next.lineIndex : lines.length)]
    return { ref: hit.ref, match: hit.match, body: bodyLines.join('\n') }
  })
}

// ========== JSON 档 ==========

/** 从文本中截取第一个完整的 JSON 数组/对象（括号配对扫描，避免尾部说明被吞进来）。 */
function sliceFirstJson(text: string): string | undefined {
  const start = text.search(/[[{]/)
  if (start < 0) return undefined
  const open = text[start]
  const close = open === '[' ? ']' : '}'
  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < text.length; index += 1) {
    const char = text[index]
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === open) depth += 1
    else if (char === close) {
      depth -= 1
      if (depth === 0) return text.slice(start, index + 1)
    }
  }
  return undefined
}

/** 宽松 JSON 解析：原样 → 去尾逗号 → 补无引号键名。 */
function tryParseLooseJson(text: string): unknown {
  const attempts = [
    text,
    text.replace(/,\s*([\]}])/g, '$1'),
    text.replace(/,\s*([\]}])/g, '$1').replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":'),
  ]
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt)
    } catch {
      /* 继续尝试下一种修复 */
    }
  }
  return undefined
}

interface JsonRecord {
  asset?: string
  variant?: string
  prompt: string
}

const ASSET_KEYS = ['asset', 'assetName', 'assetTitle', 'name', '资产', '资产名', '资产名称', '名称']
const VARIANT_KEYS = ['variant', 'variantName', 'state', 'stateName', '视觉状态', '状态', '状态名', '状态名称']
const PROMPT_KEYS = ['prompt', 'imagePrompt', 'paintingPrompt', 'content', 'text', 'value', '提示词', '绘画提示词', '画面提示词', '内容', '描述']

function pickString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

function toJsonRecords(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) return value.flatMap((item) => toJsonRecords(item))
  if (!value || typeof value !== 'object') return []
  const source = value as Record<string, unknown>
  // 容器形状：{ items: [...] } / { 结果: [...] }
  for (const key of ['items', 'prompts', 'results', 'data', 'list', 'assetPrompts', '结果', '提示词', '数据']) {
    if (key in source) {
      const inner = toJsonRecords(source[key])
      if (inner.length) return inner
    }
  }
  const prompt = pickString(source, PROMPT_KEYS)
  const asset = pickString(source, ASSET_KEYS)
  const variant = pickString(source, VARIANT_KEYS)
  if (prompt && (asset || variant)) return [{ asset, variant, prompt }]
  // 映射形状：{ "资产名｜状态名": "提示词" }
  const entries = Object.entries(source).filter(([, item]) => typeof item === 'string' && item.trim())
  if (entries.length && !prompt) {
    return entries.map(([key, item]) => {
      const [left, right] = key.split(/[|｜/／\-–—]/).map((part) => part.trim())
      return { asset: left, variant: right, prompt: String(item) }
    })
  }
  return []
}

// ========== ④ 顺序兜底 ==========

/** 切分段落：优先空行分块，无空行时退化为逐行。 */
function splitSegments(text: string): string[] {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => cleanPromptText(block))
    .filter(Boolean)
  if (blocks.length > 1) return blocks
  return text
    .split('\n')
    .map((line) => cleanPromptText(line))
    .filter(Boolean)
}

/** 去掉模型首尾的客套段（「好的，以下是…」「希望对你有帮助」），再判断段数。 */
function trimNoiseSegments(segments: string[], expected: number): string[] {
  let out = segments
  if (out.length === expected + 1 && out.length > 1 && isNoiseLine(out[0])) out = out.slice(1)
  if (out.length === expected + 1 && out.length > 1 && isNoiseLine(out[out.length - 1])) out = out.slice(0, -1)
  return out
}

const CIRCLED_NUMBERS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'

// ========== 主入口 ==========

/**
 * 解析模型返回 → 逐条结果 + 诊断。
 * 命中优先级：精确 > 模糊（弹性匹配）> 顺序兜底；同一状态只回填一次（先到先得）。
 */
export function parseAssetPromptResponse(content: string, context: AssetPromptParseContext): AssetPromptParseOutcome {
  const ordered = context.ordered
  const expected = ordered.length
  const resolve = createResolver(context)
  const normalized = normalizeModelOutput(content)
  const segments = splitSegments(normalized)

  const collected: AssetPromptParseItem[] = []
  const seen = new Set<string>()
  const add = (ref: AssetPromptTargetRef | undefined, match: AssetPromptMatchKind, body: string): void => {
    if (!ref || seen.has(ref.variantId)) return
    const imagePrompt = cleanPromptText(body)
    if (!imagePrompt) return
    seen.add(ref.variantId)
    collected.push({ ...ref, imagePrompt, match })
  }

  const runBracket = (): void => {
    const lines = normalized.split('\n')
    for (const segment of sliceByHeaders(lines, scanHeaders(normalized, resolve))) {
      add(segment.ref, segment.match, segment.body)
    }
  }

  const runJson = (): void => {
    const jsonText = sliceFirstJson(normalized)
    if (!jsonText) return
    for (const record of toJsonRecords(tryParseLooseJson(jsonText))) {
      const hit = resolve(record.asset, record.variant)
      if (hit) add(hit.ref, hit.match, record.prompt)
    }
  }

  const runIndexed = (): void => {
    for (const segment of segments) {
      const circledIndex = CIRCLED_NUMBERS.indexOf(segment[0])
      if (circledIndex >= 0) {
        const ref = context.index.get(String(circledIndex + 1))
        if (ref) {
          add(ref, 'exact', segment.slice(1))
          continue
        }
      }
      const match = /^(?:状态|第|序号)?\s*(\d{1,3})\s*(?:条|个|项|号)?\s*[.、,，:：)）]?\s*([\s\S]+)$/.exec(segment)
      if (!match) continue
      const ref = context.index.get(match[1])
      // 序号是模型显式声明的定位键，与「资产名｜状态名」同级可信
      if (ref) add(ref, 'exact', match[2])
    }
  }

  /** 顺序回填：段落数必须严格等于目标数，宁可不填也不静默错配。 */
  const runByOrder = (): void => {
    if (!expected) return
    const trimmed = trimNoiseSegments(segments, expected)
    const candidates = trimmed.length === expected ? trimmed : segments.length === expected ? segments : []
    candidates.forEach((segment, index) => add(ordered[index], 'order', segment))
  }

  /**
   * 单管线，不再有档位。
   * 头部识别是协议要求的形态；后面三层纯粹是容错——模型自作主张吐 JSON、
   * 自己编号、或干脆不给任何标记，都尽量救回来。
   */
  runBracket()
  if (!collected.length) runJson()
  if (!collected.length) runIndexed()
  if (!collected.length) runByOrder()

  const stage: AssetPromptParseStage = collected.length ? 'ok' : 'none'

  const missing = ordered
    .filter((ref) => !seen.has(ref.variantId))
    .map((ref) => `${ref.assetName}｜${ref.variantName}`)

  return {
    items: collected,
    diagnostics: { stage, expected, parsed: collected.length, missing, raw: content },
  }
}

/** 解析完全失败：错误对象携带诊断（原始返回 / 期望条数 / 停在哪一层），供 UI 展示与人工核对。 */
export class AssetPromptParseError extends Error {
  readonly diagnostics: AssetPromptParseDiagnostics

  constructor(message: string, diagnostics: AssetPromptParseDiagnostics) {
    super(message)
    this.name = 'AssetPromptParseError'
    this.diagnostics = diagnostics
  }
}

/** 解析失败 / 只回填一部分时的文案（统一 Markdown 口径，不再提解析方式）。 */
export function describeParseFailure(diagnostics: AssetPromptParseDiagnostics): string {
  const { parsed, expected } = diagnostics
  if (!parsed) {
    return '模型返回无法解析回填：没识别到「## 资产名｜状态名」标题 + 提示词正文的 Markdown 逐条结构，按条数顺序兜底也没对上。可在弹窗内查看模型原始返回后重试；若模板的「内容要求」里要求了 JSON 或其它格式，请删掉——返回格式统一为 Markdown。'
  }
  return `模型返回只解析出 ${parsed}/${expected} 条，其余状态未返回。可在弹窗内查看原始返回后重发。`
}

// ========== 单条回填（逐条发送 / 单条重写） ==========

/**
 * 单条回填：与批量同格式、同容错管线，只是目标只有一条。
 * 命中头部就取那一条正文；完全没命中（模型只给裸文本、或加了客套前言）时退化为整段正文——
 * 单条场景不存在「张冠李戴」的风险，宁可原样收下，也不要因为格式细节把结果丢掉。
 */
export function extractSinglePromptText(content: string, ref: AssetPromptTargetRef): string {
  const index: AssetPromptTargetIndex = new Map([
    ['1', ref],
    [targetKey(ref.assetName, ref.variantName), ref],
  ])
  const { items } = parseAssetPromptResponse(content, { index, ordered: [ref] })
  if (items.length) return items[0].imagePrompt
  return cleanPromptText(stripLeadingHeader(normalizeModelOutput(content)))
}

/** 兜底路径：剥掉行首的头部包装（【资产名｜状态名】/ 资产名：）与首行客套说明，返回可用正文。 */
function stripLeadingHeader(text: string): string {
  const lines = text.split('\n')
  const first = (lines[0] ?? '').trim()
  if (/^[#>\-*+\s·]*(?:[【\[].{1,60}?[】\]]|(?:资产名|资产|视觉状态|视觉状态名|状态名|状态)\s*[:：])/.test(first)) {
    lines.shift()
  }
  while (lines.length > 1 && !lines[0].trim()) lines.shift()
  if (lines.length > 1 && isNoiseLine(lines[0].trim())) lines.shift()
  return lines.join('\n')
}

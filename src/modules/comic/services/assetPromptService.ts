import { v4 as uuidv4 } from 'uuid'
import { llmService } from './llmService'
import type {
  AssetPromptRun,
  LongProjectAsset,
  LongProjectAssetVariant,
  ModelConfig,
  PromptTemplate,
  SharedPromptBlock,
} from '@comic/types'

/** 提示词生成目标：资产 + 其下需要生成提示词的视觉状态。 */
export interface AssetPromptTarget {
  asset: LongProjectAsset
  variants: LongProjectAssetVariant[]
}

/** 单条解析结果：视觉状态 → 生成的绘画提示词。 */
export interface AssetPromptResultItem {
  assetId: string
  variantId: string
  assetName: string
  variantName: string
  imagePrompt: string
}

export interface AssetPromptGenerationResult {
  rawResponse: string
  items: AssetPromptResultItem[]
}

const typeLabel: Record<string, string> = { character: '人物', scene: '场景', prop: '道具' }

/**
 * 批量一次性发送场景的系统兜底输出协议（模板未自定义 outputProtocol 时使用，保证结果可解析回填）。
 * 与 parseAssetPromptResponse 的名字/序号协议保持兼容。
 */
export const DEFAULT_ASSET_PARSE_PROTOCOL = `只输出中文，不要解释、不要代码块。
逐条输出，每条格式为：【资产名｜状态名】绘画提示词内容（一段完整可直接用于生图的描述，包含外观、服饰/材质、姿态或氛围、画风要求；不写镜头语言，不要分点）。
资产名与状态名必须与清单中的完全一致、一字不差，不要遗漏任何状态、不要新增。提示词只基于清单给定信息与风格上下文，不要编造与原文冲突的细节。`

/**
 * 附加输出协议。
 * 优先级：模板自定义协议 > 需解析场景的系统兜底 > 不附加任何限制。
 * @param base 拼装好的 prompt 正文
 * @param protocol 模板自定义输出协议（空 = 未自定义）
 * @param requireParseable 结果是否需要程序解析回填（批量一次性发送 = true）
 */
export function applyOutputProtocol(base: string, protocol: string | undefined, requireParseable: boolean): string {
  const custom = protocol?.trim()
  if (custom) return `${base}\n\n【输出要求】\n${custom}`
  if (requireParseable) return `${base}\n\n【系统固定输出协议】\n${DEFAULT_ASSET_PARSE_PROTOCOL}`
  return base
}

/**
 * 拼装视觉状态清单文本（发模型用）。
 * 每个状态同时登记两种定位键：序号 + 「资产名##状态名」；模型按名字回写，解析时优先按名字定位。
 */
function buildTargetList(targets: AssetPromptTarget[]): { text: string; index: Map<string, { assetId: string; variantId: string; assetName: string; variantName: string }> } {
  const index = new Map<string, { assetId: string; variantId: string; assetName: string; variantName: string }>()
  const lines: string[] = []
  let counter = 0
  for (const { asset, variants } of targets) {
    for (const variant of variants) {
      counter += 1
      const entry = { assetId: asset.id, variantId: variant.id, assetName: asset.name, variantName: variant.name }
      index.set(String(counter), entry)
      index.set(targetKey(asset.name, variant.name), entry)
      const attrs = Object.entries(asset.attributes ?? {})
        .slice(0, 8)
        .map(([k, v]) => `${k}：${Array.isArray(v) ? v.join('、') : v}`)
        .join('；')
      lines.push(
        `- 状态${counter}｜资产：${asset.name}（${typeLabel[asset.type] ?? asset.type}）｜状态名：${variant.name}` +
          `｜资产描述：${asset.description || '无'}｜视觉描述：${variant.description || '无'}` +
          `｜固定特征：${asset.fixedTraits.join('、') || '无'}${attrs ? `｜${attrs}` : ''}`
      )
    }
  }
  return { text: lines.join('\n'), index }
}

/** 名字定位键：去除空白并统一常见分隔符，容忍模型输出中的全角/半角差异。 */
function targetKey(assetName: string, variantName: string): string {
  return `${assetName}##${variantName}`.replace(/\s+/g, '').replace(/[｜|｜/／、,，:：]/g, '|')
}

/** 从共用块提取风格上下文（描述部分，不含参考图——参考图只参与生图）。 */
export function buildStyleContext(sharedBlocks: SharedPromptBlock[] = [], paintingStyle = ''): string {
  const blocks = [...sharedBlocks]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((block) => block.description)
    .filter(Boolean)
  const parts: string[] = []
  if (paintingStyle) parts.push(`整体画风：${paintingStyle}`)
  if (blocks.length) parts.push(`风格与通用要求：\n${blocks.map((item) => `- ${item}`).join('\n')}`)
  return parts.join('\n')
}

/** 从模型返回中解析提示词：优先按「资产名｜状态名」定位，序号协议作兜底。 */
export function parseAssetPromptResponse(content: string, index: Map<string, { assetId: string; variantId: string; assetName: string; variantName: string }>): AssetPromptResultItem[] {
  const items: AssetPromptResultItem[] = []
  const seen = new Set<string>()

  const push = (target: { assetId: string; variantId: string; assetName: string; variantName: string } | undefined, raw: string) => {
    if (!target || seen.has(target.variantId)) return
    const prompt = raw.replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean).join(' ').trim()
    if (!prompt) return
    seen.add(target.variantId)
    items.push({ ...target, imagePrompt: prompt })
  }

  // 1. 名字协议（括号形式）：定位所有【资产名｜状态名】头，取头到下一个头之间的文本作为提示词
  const headers: Array<{ end: number; target: { assetId: string; variantId: string; assetName: string; variantName: string } | undefined }> = []
  for (const match of content.matchAll(/【\s*([^【】｜|｜\n]{1,40}?)\s*[｜|｜/／-]\s*([^【】｜|｜\n：:]{1,40}?)\s*】/g)) {
    headers.push({ end: (match.index ?? 0) + match[0].length, target: index.get(targetKey(match[1], match[2])) })
  }
  headers.forEach((header, i) => {
    const next = headers[i + 1]
    // 下一个头之前还有一次定位：回退找下一个【 的位置，避免把下一个头之前的内容误吞
    const sliceEnd = next ? content.lastIndexOf('【', next.end) : content.length
    push(header.target, content.slice(header.end, sliceEnd > header.end ? sliceEnd : content.length))
  })

  // 2. 名字协议（行首无括号形式）：资产名｜状态名：提示词（整行）
  if (!items.length) {
    for (const match of content.matchAll(/^[-*]?\s*([^\n：:【」「｜|｜]{1,40}?)\s*[｜|｜/／-]\s*([^\n：:【」「｜|｜]{1,40}?)\s*[：:]\s*(.+)$/gm)) {
      push(index.get(targetKey(match[1], match[2])), match[3])
    }
  }

  // 3. 都没命中时，回退到“状态N”序号协议
  if (!items.length) {
    for (const match of content.matchAll(/状态\s*(\d+)\s*[：:]\s*([\s\S]*?)(?=\n[-*]?\s*状态\s*\d+\s*[：:]|$)/g)) {
      push(index.get(match[1]), match[2])
    }
  }
  return items
}

/**
 * 拼装最终提示词：模板 + 风格上下文 + 状态清单。
 * 模板可使用 {{assets}} / {{style}} / {{target_model}} 变量；无变量时追加到末尾。
 * 输出协议按优先级附加：模板自定义 outputProtocol > 需解析场景的系统兜底 > 不附加。
 */
export function buildAssetPromptPrompt(options: {
  templateContent: string
  targets: AssetPromptTarget[]
  styleContext?: string
  targetImageModel?: string
  outputProtocol?: string
  requireParseable?: boolean
}): string {
  const { text } = buildTargetList(options.targets)
  const replacements: Array<[RegExp, string]> = [
    [/\{\{assets\}\}/g, text],
    [/\{\{style\}\}/g, options.styleContext ?? '无特殊风格要求'],
    [/\{\{target_model\}\}/g, options.targetImageModel ?? '未指定'],
  ]
  let template = options.templateContent
  let hasVariables = false
  for (const [pattern, value] of replacements) {
    if (pattern.test(template)) hasVariables = true
    template = template.replace(pattern, value)
  }
  const list = hasVariables ? template : `${template}\n\n【待生成状态清单】\n${text}`
  const style = options.styleContext ? `\n\n【风格上下文】\n${options.styleContext}` : ''
  return applyOutputProtocol(`${list}${style}`, options.outputProtocol, options.requireParseable ?? true)
}

/**
 * 批量生成资产绘画提示词：一次 LLM 调用覆盖整章目标。
 * 返回逐条结果，由调用方回填到 variant.imagePrompt。
 */
export async function generateAssetPrompts(options: {
  model: ModelConfig
  template: PromptTemplate
  targets: AssetPromptTarget[]
  styleContext?: string
  targetImageModel?: string
  prompt?: string
}): Promise<AssetPromptGenerationResult> {
  const { text, index } = buildTargetList(options.targets)
  if (!text) throw new Error('没有需要生成提示词的视觉状态')
  const prompt = options.prompt ?? buildAssetPromptPrompt({
    templateContent: options.template.content,
    targets: options.targets,
    styleContext: options.styleContext,
    targetImageModel: options.targetImageModel,
    outputProtocol: options.template.outputProtocol,
    requireParseable: true,
  })
  const result = await llmService.call({ modelConfig: options.model, userMessage: prompt })
  if (!result.success || !result.content) throw new Error(result.error || '模型没有返回内容')
  const items = parseAssetPromptResponse(result.content, index)
  if (!items.length) {
    throw new Error(
      options.template.outputProtocol?.trim()
        ? '模型返回无法解析回填：自定义输出协议与解析格式不匹配。建议在模板输出协议中使用「【资产名｜状态名】提示词」逐条格式，或改用逐条发送。'
        : '模型返回中没有可识别的状态提示词，请检查模板或重试',
    )
  }
  return { rawResponse: result.content, items }
}

/**
 * 单条生成/重写：只针对一个视觉状态，返回一段提示词文本。
 * - 传 templateContent：按模板 + 状态信息拼装（用于发送前确认弹窗预览）；协议用模板自定义 outputProtocol，未自定义则不附加任何输出限制；
 * - 传 prompt：直接使用调用方确认后的最终文本执行；
 * - 两者都无：使用内置默认指令（含系统默认输出要求）。
 * model 允许为空（仅拼装不调模型）。
 */
export function buildSingleAssetPrompt(options: {
  asset: LongProjectAsset
  variant: LongProjectAssetVariant
  currentPrompt?: string
  styleContext?: string
  instruction?: string
  templateContent?: string
  outputProtocol?: string
}): string {
  const { asset, variant } = options
  const info = `- 资产：${asset.name}（${typeLabel[asset.type] ?? asset.type}）
- 资产描述：${asset.description || '无'}
- 固定特征：${asset.fixedTraits.join('、') || '无'}
- 视觉状态：${variant.name}
- 视觉描述：${variant.description || '无'}`
  if (options.templateContent) {
    // 模板模式：替换 {{assets}}/{{style}} 变量；无变量时把状态信息追加到模板后
    const style = options.styleContext ?? '无特殊风格要求'
    let template = options.templateContent
    if (/\{\{assets\}\}/.test(template)) template = template.replace(/\{\{assets\}\}/g, info)
    else template += `\n\n【待生成状态】\n${info}`
    if (/\{\{style\}\}/.test(template)) template = template.replace(/\{\{style\}\}/g, style)
    else if (options.styleContext) template += `\n\n【风格上下文】\n${options.styleContext}`
    // 单条场景结果直接取全文回填，不解析：仅附加模板自定义协议，未自定义则不附加任何限制
    return applyOutputProtocol(template, options.outputProtocol, false)
  }
  return `请为以下漫画资产的视觉状态重写一段可直接用于生图的中文绘画提示词。

【资产信息】
${info}
${options.currentPrompt ? `- 当前提示词（不满意，需要重写）：${options.currentPrompt}` : ''}
${options.styleContext ? `\n【风格上下文】\n${options.styleContext}` : ''}
${options.instruction ? `\n【用户要求】\n${options.instruction}` : ''}

【输出要求】
只输出一段完整的中文提示词正文，不要任何前缀、解释或分点。包含外观、服饰/材质、姿态或氛围、画风要求；不写镜头语言；不编造与给定信息冲突的细节。`
}

/** 单条生成/重写执行：调用 LLM 并返回提示词文本。 */
export async function rewriteAssetPrompt(options: {
  model: ModelConfig
  asset: LongProjectAsset
  variant: LongProjectAssetVariant
  currentPrompt?: string
  styleContext?: string
  instruction?: string
  /** 发送前确认后的最终 prompt，优先于内部拼装。 */
  prompt?: string
}): Promise<string> {
  const userMessage = options.prompt ?? buildSingleAssetPrompt({
    asset: options.asset,
    variant: options.variant,
    currentPrompt: options.currentPrompt,
    styleContext: options.styleContext,
    instruction: options.instruction,
  })
  const result = await llmService.call({ modelConfig: options.model, userMessage })
  if (!result.success || !result.content) throw new Error(result.error || '模型没有返回内容')
  return result.content.trim()
}

/** 新建提示词生成任务记录（调用方持久化后执行）。 */
export function createAssetPromptRun(options: {
  chapterId: string
  modelId: string
  templateId: string
  prompt: string
  targets?: Record<string, string[]>
}): AssetPromptRun {
  return {
    id: uuidv4(),
    chapterId: options.chapterId,
    modelId: options.modelId,
    templateId: options.templateId,
    prompt: options.prompt,
    targets: options.targets,
    status: 'running',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

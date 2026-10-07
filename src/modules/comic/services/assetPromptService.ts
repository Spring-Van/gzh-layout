import { llmService } from './llmService'
import {
  ASSET_PROMPT_FORMAT,
  defaultTemplateContent,
  renderPromptTemplate,
} from './promptTemplateRegistry'
import {
  AssetPromptParseError,
  describeParseFailure,
  extractSinglePromptText,
  parseAssetPromptResponse,
  targetKey,
  type AssetPromptParseItem,
  type AssetPromptTargetIndex,
  type AssetPromptTargetRef,
} from './assetPromptParser'
import type {
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

/** 单条解析结果：视觉状态 → 生成的绘画提示词（match 标记命中方式，非精确命中时 UI 会提示核对）。 */
export type AssetPromptResultItem = AssetPromptParseItem

export interface AssetPromptGenerationResult {
  rawResponse: string
  items: AssetPromptResultItem[]
}

const typeLabel: Record<string, string> = { character: '人物', scene: '场景', prop: '道具' }

/**
 * 拼装最终提示词（批量·一次性发送）：模板 + 状态清单 + 风格上下文。
 * 变量：{{状态清单}} / {{风格上下文}} / {{目标生图模型}}；是否进入提示词完全由模板决定（无自动追加兜底）。
 * 未选/未配模板时用内置默认模板（与推荐模板同源，自带全部变量与【返回格式】约定）。
 * 返回格式写在模板内容里，运行时不追加任何协议段。
 */
export function buildAssetPromptPrompt(options: {
  templateContent: string
  targets: AssetPromptTarget[]
  styleContext?: string
  targetImageModel?: string
}): string {
  const { text } = buildTargetList(options.targets)
  return renderPromptTemplate({
    type: 'asset-prompt',
    content: options.templateContent.trim() || defaultTemplateContent('asset-prompt'),
    values: {
      状态清单: text,
      风格上下文: options.styleContext ?? '',
      目标生图模型: options.targetImageModel ?? '',
    },
  })
}

/**
 * 拼装视觉状态清单文本（发模型用）。
 * 每个状态同时登记两种定位键：序号 + 「资产名##状态名」；模型按名字回写，解析时优先按名字定位。
 * 同时返回按清单顺序排列的 `ordered`——顺序兜底（模型只给裸提示词时）依赖它。
 */
/** 导出供「导入外部 AI 结果」复用：同一目标清单 → 同一解析上下文（index/ordered），与内置批量解析完全同构。 */
export function buildTargetList(targets: AssetPromptTarget[]): { text: string; index: AssetPromptTargetIndex; ordered: AssetPromptTargetRef[] } {
  const index: AssetPromptTargetIndex = new Map()
  const ordered: AssetPromptTargetRef[] = []
  const lines: string[] = []
  let counter = 0
  for (const { asset, variants } of targets) {
    for (const variant of variants) {
      counter += 1
      const entry: AssetPromptTargetRef = { assetId: asset.id, variantId: variant.id, assetName: asset.name, variantName: variant.name }
      index.set(String(counter), entry)
      index.set(targetKey(asset.name, variant.name), entry)
      ordered.push(entry)
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
  return { text: lines.join('\n'), index, ordered }
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

/**
 * 批量生成资产绘画提示词：一次 LLM 调用覆盖整章目标。
 * 返回逐条结果，由调用方回填到 variant.imagePrompt。
 * 解析走多层容错管线（见 assetPromptParser）：完全无命中时抛出带诊断的错误，
 * 由 UI 展示「停在哪一层 / 模型原始返回」，用户不必盲猜重试。
 */
export async function generateAssetPrompts(options: {
  model: ModelConfig
  template: PromptTemplate
  targets: AssetPromptTarget[]
  styleContext?: string
  targetImageModel?: string
  prompt?: string
}): Promise<AssetPromptGenerationResult> {
  const { text, index, ordered } = buildTargetList(options.targets)
  if (!text) throw new Error('没有需要生成提示词的视觉状态')
  const prompt = options.prompt ?? buildAssetPromptPrompt({
    templateContent: options.template.content,
    targets: options.targets,
    styleContext: options.styleContext,
    targetImageModel: options.targetImageModel,
  })
  const result = await llmService.call({ modelConfig: options.model, userMessage: prompt })
  if (!result.success || !result.content) throw new Error(result.error || '模型没有返回内容')
  const { items, diagnostics } = parseAssetPromptResponse(result.content, { index, ordered })
  if (!items.length) throw new AssetPromptParseError(describeParseFailure(diagnostics), diagnostics)
  return { rawResponse: result.content, items }
}

/**
 * 单条生成/重写：只针对一个视觉状态，返回一段提示词文本。
 * - 传 templateContent：按模板（{{状态清单}}/{{风格上下文}}/{{目标生图模型}}）+ 状态信息拼装（用于发送前确认弹窗预览）；
 * - 传 prompt：直接使用调用方确认后的最终文本执行；
 * - 两者都无：使用内置默认指令（含系统默认内容要求与返回格式）。
 * **返回格式与批量发送完全一致**（Markdown 逐条「## 资产名｜状态名」标题 + 提示词正文），回填时只解析这一条。
 * model 允许为空（仅拼装不调模型）。
 */
export function buildSingleAssetPrompt(options: {
  asset: LongProjectAsset
  variant: LongProjectAssetVariant
  currentPrompt?: string
  styleContext?: string
  instruction?: string
  templateContent?: string
  /** 目标生图模型名（逐条路径与批量路径对齐） */
  targetImageModel?: string
}): string {
  const { asset, variant } = options
  // 属性与批量路径同口径（前 8 项）：人物的「气质」就在这里，单条重写也必须看得到，
  // 否则批量与逐条两条路径拿到的事实不一致（历史坑：单条路径不读 attributes）。
  const attrs = Object.entries(asset.attributes ?? {})
    .slice(0, 8)
    .map(([key, value]) => `${key}：${Array.isArray(value) ? value.join('、') : value}`)
    .join('；')
  const info = `- 资产：${asset.name}（${typeLabel[asset.type] ?? asset.type}）
- 资产描述：${asset.description || '无'}
- 固定特征：${asset.fixedTraits.join('、') || '无'}${attrs ? `\n- 属性：${attrs}` : ''}
- 视觉状态：${variant.name}
- 视觉描述：${variant.description || '无'}`
  if (options.templateContent) {
    return renderPromptTemplate({
      type: 'asset-prompt',
      content: options.templateContent,
      values: {
        状态清单: info,
        风格上下文: options.styleContext ?? '',
        目标生图模型: options.targetImageModel ?? '',
      },
    })
  }
  return `请为以下漫画资产的视觉状态生成/重写一段可直接用于生图的中文绘画提示词。

【资产信息】
${info}
${options.currentPrompt ? `- 当前提示词（不满意，需要重写）：${options.currentPrompt}` : ''}
${options.styleContext ? `\n【风格上下文】\n${options.styleContext}` : ''}
${options.instruction ? `\n【用户要求】\n${options.instruction}` : ''}

【写作要求】
- 写成一份完整的资产设定描述：给定信息原样保留；笼统或没写、不补就画不出来的维度（颜色、材质、款式、尺寸、磨损质感等）补全到可画精度，不留「某色」「某种材质」这类空档；
- 人物按「性别 → 年龄 → 身高体型 → 外貌特征（含颧骨、下颌与面部张力）→ 识别锚点 → 详细服装」六层写全，每件衣服给全款式＋颜色＋材质＋版型＋装饰细节；给定信息里有「气质」时把它落成看得见的静态生理结构——眉眼舒展度、眉头间距、唇角平直或微扬、咬肌与下颌松紧、目光状态（如清冷克制 → 眉眼间距舒展、眉头平直不聚、唇角自然平直、下颌放松、目光平稳疏离），不写成情绪、表情动作或台词；场景写空间类型与用途、时代与地域、尺度与结构、材质、固定物件位置与光线；道具写用途、各面轮廓、尺寸参照、材质细节与磨损形态；
- 一段完整、连贯的中文描述，不要分点、不要字段标题；
- 不写版式与画格分工、背景与打光方式、画风与画质词、媒介质感词（纸张颗粒、网点、笔触这类）、姿态与手部动作、镜头机位——这些由生图配置的共用属性与「版式」设置在生图前统一拼接；**结尾不要给每条都挂同一句质感标签**（各条一个样、且与共用属性重复）；
- 补全不得与给定信息冲突，也不得改变时代、地域与身份。

【返回格式】
${ASSET_PROMPT_FORMAT}`
}

/**
 * 单条生成/重写执行：调用 LLM 并回填那一条的提示词正文。
 * 返回格式与批量一致，所以这里同样过解析器（单目标，只解析一条）——把「## 资产名｜状态名」
 * 包装剥掉，写回资产的是干净正文；模型完全没按格式返回时退化为整段正文，不让格式细节把结果丢掉。
 */
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
  const text = extractSinglePromptText(result.content, {
    assetId: options.asset.id,
    variantId: options.variant.id,
    assetName: options.asset.name,
    variantName: options.variant.name,
  })
  if (!text) throw new Error('模型没有返回可用的提示词内容')
  return text
}


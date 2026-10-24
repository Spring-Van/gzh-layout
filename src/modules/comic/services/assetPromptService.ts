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
 * 人物身份层的必填项，以及缺失时该怎么处理。
 *
 * 为什么要在输入侧显式标注缺失：模板的默认规则是「清单没写的字段跳过」，
 * 而老资产（2026-10-23 字段化改造之前提取的）只有一段散文描述，`attributes` 里压根没有
 * 脸型 / 眉眼 / 鼻唇 / 皮肤头发 —— 模型读到「清单没写」，就会老老实实跳过，
 * 输出只剩「常垂眼、薄唇」这类零碎词，人像骨相全靠生图模型乱猜。
 *
 * 两类缺失，处理方式完全不同：
 * - `convert`：清单常给形容词（高瘦、很脏），缺的是**单位与量**。换算即可，不新增信息。
 * - `infer`：骨相与神态（脸型／眉眼／鼻唇／皮肤头发／面部张力），生图必须要，
 *   只能按已给的性别年龄·身高体型·面部张力推定一组协调的值。推出来的必须在所有状态间逐字一致。
 *
 * 不进这张表的：痣、疤、胎记、纹身、义肢、眼镜、首饰这类**可被剧情核对的具体标记**——
 * 清单没写就绝不补，编一个断疤会跟后面几章的剧情打架。
 *
 * 键名用关键词模糊匹配：手改过的字段可能写成「性别·年龄」「身高/体型」。
 */
const CHARACTER_REQUIRED_TRAITS: Array<{ label: string; mode: 'convert' | 'infer'; keywords: string[] }> = [
  { label: '性别年龄', mode: 'convert', keywords: ['性别', '年龄'] },
  { label: '身高体型', mode: 'convert', keywords: ['身高', '体型', '头身'] },
  { label: '脸型', mode: 'infer', keywords: ['脸型', '颧骨', '下颌'] },
  { label: '眉眼', mode: 'infer', keywords: ['眉眼', '眉形', '眼型', '眼距', '瞳'] },
  { label: '鼻唇', mode: 'infer', keywords: ['鼻梁', '鼻头', '鼻翼', '唇厚', '唇形'] },
  { label: '皮肤头发', mode: 'infer', keywords: ['皮肤', '肤色', '头发', '发色', '发质', '发型'] },
  { label: '面部张力', mode: 'infer', keywords: ['面部张力', '张力'] },
]

/** 该人物资产缺了哪些必填身份项，按处理方式分组（非人物返回空组）。 */
function missingCharacterTraits(asset: LongProjectAsset): { convert: string[]; infer: string[] } {
  const convert: string[] = []
  const infer: string[] = []
  if (asset.type !== 'character') return { convert, infer }
  const joined = Object.keys(asset.attributes ?? {}).join('|')
  for (const trait of CHARACTER_REQUIRED_TRAITS) {
    if (trait.keywords.some((keyword) => joined.includes(keyword))) continue
    if (trait.mode === 'convert') convert.push(trait.label)
    else infer.push(trait.label)
  }
  return { convert, infer }
}

/** 把一个资产的缺失项拼成一句话（两类含义不同，措辞必须分开）。 */
function missingTraitText(missing: { convert: string[]; infer: string[] }): string {
  const parts: string[] = []
  if (missing.convert.length) {
    parts.push(`${missing.convert.join('、')}——清单只给了笼统说法，按可画的量换算（身高带 cm 与头身比）；性别的线索不明确时整项不写，绝不猜`)
  }
  if (missing.infer.length) {
    parts.push(`${missing.infer.join('、')}——字段缺失，必须按已给的性别年龄·身高体型·面部张力推定出一组协调值并写满，不得留空；资产描述/视觉描述里已经写到的以描述为准`)
  }
  return parts.join('；')
}

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
  /** 缺失项按资产去重后统一放清单末尾：同一资产的多个状态只提示一次，不重复刷屏。 */
  const missingNotes: string[] = []
  const notedAssets = new Set<string>()
  let counter = 0
  for (const { asset, variants } of targets) {
    if (!notedAssets.has(asset.id)) {
      notedAssets.add(asset.id)
      const missing = missingCharacterTraits(asset)
      if (missing.convert.length || missing.infer.length) {
        missingNotes.push(`- ${asset.name}：${missingTraitText(missing)}`)
      }
    }
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
  const text = missingNotes.length
    ? `${lines.join('\n')}\n\n【缺失项提示（只对下列资产生效，不影响其它资产）】\n${missingNotes.join('\n')}`
    : lines.join('\n')
  return { text, index, ordered }
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
  const missing = missingCharacterTraits(asset)
  const missingText = missingTraitText(missing)
  const info = `- 资产：${asset.name}（${typeLabel[asset.type] ?? asset.type}）
- 资产描述：${asset.description || '无'}
- 固定特征：${asset.fixedTraits.join('、') || '无'}${attrs ? `\n- 属性：${attrs}` : ''}
- 视觉状态：${variant.name}
- 视觉描述：${variant.description || '无'}${missingText ? `\n- 缺失项：${missingText}` : ''}`
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
- **直译，不重写**：给定信息里的字段值原样搬入，按固定顺序连成一段；不换说法、不加修饰；
- 顺序固定：人物＝性别年龄→身高体型→脸型→眉眼→鼻唇→皮肤头发→标志→面部张力→服装（廓形→腰线→长短→外套→上装→下装→鞋袜→结构→配色→材质→纹样→磨损）→妆造与局部；场景＝空间类型→时代地域→尺度→结构原点→材质→固定物件→光线→痕迹；道具＝用途→轮廓各面→尺寸→材质光泽→结构细节→当前状态；
- **人物十项必须写满**：性别·年龄｜身高·头身比·体型·肩型｜脸型｜眉眼｜鼻唇｜皮肤·头发｜面部张力｜服装｜妆造·局部（标志清单写了才写）；**身高必须带单位（cm）并给头身比**；
- **缺失项怎么补（身份层允许受控补全，其余不补）**：① 身高体型只给了形容词时换算成可测量的量（「极度高瘦、窄肩」→「约 182cm·7 头身·极瘦·窄肩」），只做量级与单位换算；② 性别年龄只认给定信息里的明确线索（男／女／他／她／少年／中年／职业身份词），**没有任何线索就不写，不许猜**；③ 脸型／眉眼／鼻唇／皮肤头发／面部张力缺字段时**必须推定写满**：先搬用「资产描述／视觉描述／固定特征」里已写到的（圆脸、单眼皮、薄唇、垂眼），再用性别年龄定骨相与肤质、身高体型定面部脂肪、面部张力定眉眼与唇角走向；每项写全——脸型＝轮廓·颧骨·下颌，眉眼＝眉形·眉头间距·眼型·眼距·眼皮·瞳色，鼻唇＝鼻梁·鼻头·唇厚·唇角，皮肤头发＝肤色·肤质·发色·发长·发质·发梢；④ **绝对不编**痣、疤、胎记、纹身、义肢、眼镜、项链、手绳、手表这类可核对的具体标记，母题与反差只在已写出时点明；⑤ 推定值一旦写定，同一资产的所有状态必须用同一组数值、逐字一致；
- **可画的量优先**：程度词换成可测量的量（「很高」→「约 182cm·7 头身」，「很瘦」→「颧骨与锁骨突出·脸颊凹陷」）；
- 一段连贯的中文描述，不分点、不加小标题，**不出现字段键名**（不写「廓形=」「主色：」），不写解释句与比喻，不把同一件衣服描述两遍；
- 字数上限：人物 200~320 字，场景 100~160 字，道具 60~110 字；超了只删装饰性细节，**不许删性别年龄、身高体型、骨相四项与服装主色**；给定信息若仍是散文（旧格式），先按字段表拆解再重排成短句，不新增信息；
- 不写版式与画格分工、背景与打光方式、画风与画质词、媒介质感词（纸张颗粒、网点、笔触这类）、姿态与手部动作、镜头机位——这些由生图配置的共用属性与「版式」设置在生图前统一拼接；**结尾不要给每条都挂同一句质感标签**；
- 不得与给定信息冲突，也不得改变时代、地域与身份。

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


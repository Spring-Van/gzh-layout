import type { TemplateType } from '@comic/types'

/**
 * 提示词模板注册表（单一事实来源）：
 * 长篇故事全部环节的变量定义、默认输出协议、推荐模板与统一渲染引擎。
 * 设置页（TemplateEditorForm）与运行时拼装（chapterDoc/storyboard/assetExtraction/assetPrompt/panelPrompt 各 service）共用，
 * 保证「表单所见 tag = 模板实际可插变量 = 空值兜底文案 = 默认协议」全链路一致。
 */

/** 长篇故事使用的模板类型（其余 style/story 属于其它工作流，无变量与协议）。 */
export const LONG_STORY_TEMPLATE_TYPES: TemplateType[] = ['analysis', 'script', 'storyboard', 'extract', 'asset-prompt', 'panel-prompt']

/** 变量兜底策略：变量未插入模板时的处理方式。 */
export type VariableFallback =
  /** 关键输入：无条件追加【块】（值为空则不追加） */
  | 'always'
  /** 辅助上下文：值非空才追加【块】 */
  | 'if-nonempty'
  /** 增强信息：不追加（模板作者未插即视为不需要） */
  | 'drop'

export interface PromptVariableSpec {
  /** 变量名（中文），模板中写作 {{变量名}} */
  name: string
  /** 说明：设置页变量 tag 的 tooltip */
  desc: string
  /** 旧英文别名：兼容存量模板，渲染与迁移时归一化为中文名 */
  legacy?: string[]
  fallback: VariableFallback
  /** 变量未插入模板时追加信息块的标签（always / if-nonempty 需要） */
  blockLabel?: string
  /** 变量已插入模板但值为空时的替换文案 */
  emptyText?: string
}

/** 变量注册表：按模板类型定义全部可用变量。 */
export const VARIABLE_REGISTRY: Partial<Record<TemplateType, PromptVariableSpec[]>> = {
  analysis: [
    {
      name: '章节原文',
      desc: '当前章节的原文内容（编辑草稿的实时值）',
      legacy: ['chapter_content'],
      fallback: 'always',
      blockLabel: '章节原文',
    },
  ],
  script: [
    {
      name: '章节原文',
      desc: '当前章节的原文内容（编辑草稿的实时值）',
      legacy: ['chapter_content'],
      fallback: 'always',
      blockLabel: '章节原文',
    },
    {
      name: '原文分析',
      desc: '上一环节「原文分析」的产物；未生成时替换为占位提示',
      legacy: ['analysis'],
      fallback: 'if-nonempty',
      blockLabel: '原文分析',
      emptyText: '（本章尚未生成原文分析）',
    },
  ],
  storyboard: [
    {
      name: '漫画剧本',
      desc: '上一环节「漫画剧本」的产物；本章无剧本时系统自动以章节原文兜底并提示',
      legacy: ['script_content'],
      fallback: 'always',
      blockLabel: '漫画剧本',
    },
    {
      name: '原文分析',
      desc: '原文分析产物，仅作分镜的辅助上下文',
      legacy: ['analysis'],
      fallback: 'if-nonempty',
      blockLabel: '原文分析（辅助上下文）',
      emptyText: '（本章尚未生成原文分析）',
    },
  ],
  extract: [
    {
      name: '章节原文',
      desc: '当前章节的原文；本章从剧本开始（无原文）时系统自动以漫画剧本兜底并加说明头',
      legacy: ['chapter_content'],
      fallback: 'always',
      blockLabel: '章节原文',
      emptyText: '（本章尚未录入原文与剧本）',
    },
    {
      name: '原文分析',
      desc: '管线环节①「原文分析」的产物',
      fallback: 'if-nonempty',
      blockLabel: '原文分析',
      emptyText: '（本章尚未生成原文分析）',
    },
    {
      name: '漫画剧本',
      desc: '管线环节②「漫画剧本」的产物',
      fallback: 'if-nonempty',
      blockLabel: '漫画剧本',
      emptyText: '（本章尚未生成剧本）',
    },
    {
      name: '分镜概要',
      desc: '本章分镜概要（每镜一行），辅助判断资产是否值得提取',
      fallback: 'if-nonempty',
      blockLabel: '本章分镜概要（已确定会被绘制的画面）',
      emptyText: '（本章尚未生成分镜）',
    },
    {
      name: '已有资产',
      desc: '项目已有资产清单（含各资产已有视觉状态名），保证跨章节连续性；状态名沿用规则见输出协议',
      fallback: 'if-nonempty',
      blockLabel: '项目已有资产',
      emptyText: '（项目暂无资产）',
    },
  ],
  'asset-prompt': [
    {
      name: '状态清单',
      desc: '批量·一次性发送 = 全部待生成状态的清单；逐条发送 = 当前状态的信息',
      legacy: ['assets'],
      fallback: 'always',
      blockLabel: '待生成状态清单',
    },
    {
      name: '风格上下文',
      desc: '项目画风与共用提示词块的描述（生图参考图不在此列，只参与生图）',
      legacy: ['style'],
      fallback: 'if-nonempty',
      blockLabel: '风格上下文',
      emptyText: '无特殊风格要求',
    },
    {
      name: '目标生图模型',
      desc: '资产生图配置选用的生图模型名，用于让提示词面向具体模型优化',
      legacy: ['target_model'],
      fallback: 'drop',
      emptyText: '未指定',
    },
  ],
  'panel-prompt': [
    {
      name: '当前分镜',
      desc: '当前分镜完整信息（序号、镜头、画面内容、分镜参考描述）',
      legacy: ['panel_content'],
      fallback: 'always',
      blockLabel: '当前分镜',
    },
    {
      name: '镜头',
      desc: '当前分镜的镜头类型（如全景、特写）',
      legacy: ['shot'],
      fallback: 'drop',
      emptyText: '未指定',
    },
    {
      name: '前文分镜',
      desc: '前 2 个分镜的画面内容与已推导描述（滑动窗口，批量推导时随进度刷新）',
      legacy: ['prev_panels'],
      fallback: 'drop',
      emptyText: '当前是本章第一个分镜，无前文画面。',
    },
    {
      name: '本章分镜概要',
      desc: '本章全部分镜概要，每镜一行',
      legacy: ['chapter_outline'],
      fallback: 'drop',
    },
    {
      name: '绑定资产',
      desc: '当前分镜绑定资产的视觉设定（视觉状态、固定特征、已生成的资产绘画提示词）',
      legacy: ['assets'],
      fallback: 'drop',
      emptyText: '本分镜无绑定资产。',
    },
    {
      name: '风格上下文',
      desc: '项目画风与共用提示词块的描述',
      legacy: ['style'],
      fallback: 'if-nonempty',
      blockLabel: '风格上下文',
      emptyText: '无特殊风格要求',
    },
    {
      name: '目标生图模型',
      desc: '生图配置选用的生图模型名',
      legacy: ['target_model'],
      fallback: 'drop',
      emptyText: '未指定',
    },
  ],
}

/** 获取指定类型的变量定义列表。 */
export function getTemplateVariables(type: TemplateType): PromptVariableSpec[] {
  return VARIABLE_REGISTRY[type] ?? []
}

// ========== 输出协议 ==========

/** 资产提示词「批量·一次性发送」的默认协议：与解析回填格式同构，保证结果可程序解析。 */
export const ASSET_PROMPT_BATCH_PROTOCOL = `只输出中文，不要解释、不要代码块。
逐条输出，每条格式为：【资产名｜状态名】绘画提示词内容（一段完整可直接用于生图的描述，包含外观、服饰/材质、姿态或氛围、画风要求；不写镜头语言，不要分点）。
资产名与状态名必须与清单中的完全一致、一字不差，不要遗漏任何状态、不要新增。提示词只基于清单给定信息与风格上下文，不要编造与原文冲突的细节。`

/** 资产提示词「逐条发送 / 单条重写」的默认协议：结果直接取全文回填，无需解析。 */
export const ASSET_PROMPT_PER_ITEM_PROTOCOL = `只输出一段完整的中文提示词正文，不要任何前缀、解释或分点。包含外观、服饰/材质、姿态或氛围、画风要求；不写镜头语言；不编造与给定信息冲突的细节。`

/** 各类型默认输出协议（模板未自定义时使用；设置页「填入推荐协议」按钮同源）。 */
export const OUTPUT_PROTOCOL_DEFAULTS: Partial<Record<TemplateType, string>> = {
  analysis: `只输出中文 Markdown，不要解释、代码块或 JSON。用 ## 小节标题组织（如 ## 人物、## 场景、## 道具、## 事件与时间线、## 人物关系、## 对白、## 情绪、## 重要视觉信息），每条信息写为「- 名称：描述」列表项。`,
  script: `只输出中文 Markdown，不要解释、代码块或 JSON。用 ## 场景 N 组织每个剧本场景，场景内用「- 属性名：内容」列表项写明场景、剧情、人物、动作、情绪、对白与剧情目的。`,
  storyboard: `只输出中文 Markdown，不要解释、代码块或 JSON。每个分镜以 ## 分镜 N 开始；其余信息每行写为 - 属性名：内容。
每个分镜必须有：画面、镜头。画面要完整具体，内容较长时可换行续写（续行不要重复“- 画面：”前缀）。
可选填写：绘画提示词、对白、旁白。按剧本场景拆分镜头：一个场景拆成 3~8 个镜头，重要动作给独立镜头，重要道具首次出现可用特写，对白镜头考虑正反打，高潮处适当增加镜头密度，保持人物空间关系连续。`,
  extract: `只输出中文 Markdown，不要解释、代码块或 JSON。
一级标题只能是 # 人物、# 场景、# 道具；没有该类资产则不输出该标题。
每项资产必须以 ## 资产名称 开始；其余信息每行写为 - 属性名：属性内容。
每个视觉状态必须以 ### 视觉状态：状态名 单独成块，块内使用字段：视觉描述、状态标签、绘画提示词；同一资产可输出多个视觉状态。
系统识别字段：姓名、别名、重要性（主要/次要）、描述、原文依据、视觉描述、状态标签、绘画提示词；视觉状态只能通过 ### 视觉状态：状态名 标题声明，不要以字段形式重复输出。
除系统识别字段外，你可根据模板规则自由输出中文属性，例如门派、身份关系、境界、材质、时代、氛围。
视觉状态表示该资产在当前剧情中的稳定外观或形态，如“少年期·布衣”“宗门弟子服”“战损”；正面、侧面、背面属于同一状态的参考图，不要单列为状态。
只基于原文明确内容，不要编造。
判断资产价值时参考分镜概要：在多个分镜中出现、或承载关键剧情/镜头重点的应提取；只出现一次且无辨识要求的不要提取。
资产已存在且本章外观未变化时，视觉状态名必须与已有状态名完全一致；仅当原文出现明确外观变化时才新建视觉状态。`,
  'asset-prompt': ASSET_PROMPT_BATCH_PROTOCOL,
  'panel-prompt': `只输出一段完整、连贯的中文画面描述，不要解释、分点、对白或旁白。`,
}

/** 取类型默认输出协议（asset-prompt 按发送模式区分；无默认返回空串）。 */
export function defaultOutputProtocol(type: TemplateType, mode: 'batch-once' | 'per-item' = 'batch-once'): string {
  if (type === 'asset-prompt' && mode === 'per-item') return ASSET_PROMPT_PER_ITEM_PROTOCOL
  return OUTPUT_PROTOCOL_DEFAULTS[type] ?? ''
}

/**
 * 附加输出协议：模板自定义（非空）优先，否则落到类型默认协议。
 * 统一追加标签为【输出要求】。
 */
export function applyOutputProtocol(base: string, customProtocol: string | undefined, type: TemplateType, mode: 'batch-once' | 'per-item' = 'batch-once'): string {
  const custom = customProtocol?.trim()
  if (custom) return `${base}\n\n【输出要求】\n${custom}`
  const fallback = defaultOutputProtocol(type, mode)
  return fallback ? `${base}\n\n【输出要求】\n${fallback}` : base
}

// ========== 推荐模板（设置页「填入推荐模板」与文案同源） ==========

export interface RecommendedTemplate {
  /** 一键填入时的默认名称 */
  name: string
  /** 一键填入时的默认描述 */
  description: string
  content: string
}

export const RECOMMENDED_TEMPLATES: Partial<Record<TemplateType, RecommendedTemplate>> = {
  analysis: {
    name: '长篇章节原文分析',
    description: '通读章节原文，结构化输出人物/场景/道具/事件/时间线/关系/对白/情绪/重要视觉信息。',
    content: `你是一名专业的小说解读者。请通读当前章节，输出一份结构化的原文分析，回答"这一章到底有什么"，为后续漫画剧本、分镜与资产提取提供依据。

【分析范围】
- 人物：有姓名或明确身份的全部角色，含身份、关系、当前状态。
- 场景：出现过的全部地点，含空间特征与氛围。
- 道具：推动剧情或反复出现的物品。
- 事件与时间线：按发生顺序列出本章事件。
- 人物关系：角色之间的称呼、立场、情感变化。
- 对白：关键台词与说话人。
- 情绪：主要角色的情绪变化轨迹。
- 重要视觉信息：原文明确写出的外貌、服装、环境、光线等可直接入画的信息。

【写作要求】
- 只归纳原文已经明确的信息，不要推测、补写。
- 每条信息标注出处要点（第几段/关键句），便于核对。
- 语言精炼，直接服务于后续漫画改编。

【章节原文】
{{章节原文}}`,
  },
  script: {
    name: '长篇章节漫画剧本',
    description: '基于章节原文与原文分析，按场景改编为漫画剧本。',
    content: `你是一名资深的漫画编剧。请基于章节原文与原文分析，把这一章改编成漫画剧本，回答"这一章改成漫画后要讲什么"。

【改编要求】
- 按场景组织：每个场景写明地点、出场人物、剧情推进。
- 每个场景包含：剧情概要、人物动作、情绪基调、关键对白、剧情目的（本场景为什么存在）。
- 删减不能画面化的纯心理描写与重复叙述；关键转折必须保留。
- 对白精炼口语化，符合角色身份。
- 剧情目的写清该场景在全章中的作用（铺垫/推进/转折/收束）。

【章节原文】
{{章节原文}}

【原文分析】
{{原文分析}}`,
  },
  storyboard: {
    name: '长篇章节分镜',
    description: '以漫画剧本为主输入拆解分镜，原文分析作辅助核对。',
    content: `你是一名小说漫画分镜设计师。请把当前章节改编成可直接绘制的关键分镜。

【改编要求】
- 以漫画剧本为主输入拆解镜头：一个场景拆成 3~8 个镜头，重要动作给独立镜头，重要道具首次出现可用特写，对白镜头考虑正反打，高潮处适当增加镜头密度，保持人物空间关系连续。
- 保留推动剧情、情绪转折、角色行动和重要信息的画面；删除重复叙述与不能画面化的内心独白。每个分镜只呈现一个清晰的主要动作或画面重点。
- 原文分析仅作辅助核对：与剧本冲突时以剧本为准，不要机械按章节推断回忆、倒叙、变身等特殊状态。
- 只描述本镜头明确的画面信息，不要补写原文没有的细节。

【漫画剧本】
{{漫画剧本}}

【原文分析】
{{原文分析}}`,
  },
  extract: {
    name: '长篇章节资产提取',
    description: '从章节原文中识别人物、场景、道具，并输出可审核的结构化资产。',
    content: `你是一名专业的小说漫画化资产分析师。请从当前章节中识别后续漫画创作需要反复引用、并保持视觉一致性的核心资产。

【提取范围】
仅提取人物、场景、道具三类。
- 人物：有姓名或明确身份、推动剧情、持续出现，或需要稳定视觉形象的角色。不要提取泛称路人、群众或无画面必要的一次性人物。
- 场景：承载关键事件、可能重复使用，或具有明确空间与视觉识别度的地点。不要把普通“路上”“房间里”等缺少特征的泛化地点独立成资产。
- 道具：推动剧情、反复出现、具有独特外观，或会成为镜头重点的物品。不要提取日常且无视觉重点的普通物件。

【合并与连续性】
- 同一对象的姓名、称谓、代号和代词指代应合并为同一资产；将其他称谓写入“别名”。
- 人物的年龄阶段、服装、身份、伤势、情绪外显、变身或特殊形态，不是新人物，写为“视觉状态”。
- 场景的昼夜、季节、天气、破损、节庆布置等，不是新场景，写为“视觉状态”。
- 道具的使用前后、展开/收起、损坏/修复等，不是新道具，写为“视觉状态”。
- 视觉状态必须是原文已明确的稳定形象或形态；镜头正侧背面、景别和构图不属于视觉状态。

【信息要求】
- 每项写明“重要性”：会在当前或后续分镜中重点保持一致的写“主要”，其余写“次要”。
- 每项写“描述”和 1 至 3 条“原文依据”。描述只归纳原文已经明确的信息；原文未说明的外貌、材质、环境和关系不得补写。
- 有明确外观信息时，为视觉状态写“视觉描述”和“绘画提示词”；绘画提示词只能使用本项描述中已有的信息。信息不足时留空，不要猜测。
- 可按原文补充有价值的中文属性。人物优先考虑身份、阵营/门派、职业、关系、年龄阶段、能力/境界；场景优先考虑地点类型、时代、氛围、时间/天气；道具优先考虑用途、材质、持有者、能力/状态。没有依据的属性不要输出。

【输出原则】
- 宁缺毋滥：只提取真正会影响后续画面一致性的资产。
- 不要输出原文中没有根据的设定、外貌细节、背景故事或绘画风格。
- 系统会自动处理输出结构；请严格遵守系统附加的格式要求。

【章节原文】
{{章节原文}}`,
  },
  'asset-prompt': {
    name: '资产绘画提示词',
    description: '按状态清单与风格上下文，为资产视觉状态批量生成绘画提示词。',
    content: `你是一名资深的漫画绘画提示词工程师。请根据下面的状态清单与风格上下文，为每一个视觉状态撰写一段可直接用于生图的中文绘画提示词。

【目标生图模型】
{{目标生图模型}}

【风格上下文】
{{风格上下文}}

【待生成状态清单】
{{状态清单}}

【写作要求】
- 每段提示词为一段完整、连贯的中文描述，不要分点。
- 人物包含：外貌与体型、服饰与材质、表情姿态与氛围；场景包含：空间结构、环境元素、光线与氛围；道具包含：外形、材质、细节特征。
- 结尾附上画风要求，与风格上下文保持一致。
- 严格基于清单给定信息撰写，不要编造与原文冲突的细节，不要出现镜头语言（如特写、仰视等）。`,
  },
  'panel-prompt': {
    name: '分镜画面描述',
    description: '按分镜内容、前文画面与资产视觉设定，逐镜生成可直接生图的画面描述。',
    content: `你是一名专业的漫画分镜画面描述师。请根据当前分镜信息，写出一段可直接用于漫画生图的中文画面描述。

【目标生图模型】
{{目标生图模型}}

【风格上下文】
{{风格上下文}}

【本章分镜概要】
{{本章分镜概要}}

【前文分镜与画面】
{{前文分镜}}

【当前分镜】
{{当前分镜}}

【本分镜绑定资产视觉设定】
{{绑定资产}}

【写作要求】
- 描述画面中的人物位置、动作、表情、场景环境与氛围，构图遵循当前镜头类型；
- 出场资产必须严格遵循给定的资产视觉设定（外观、服饰等固定特征），不要改动；
- 与前文分镜保持剧情与画面的连续性（人物位置关系、光线、场景细节等）；
- 严格基于给定信息撰写，不要补写原文没有的细节；
- 不写对白与旁白，只描述画面本身；
- 输出为一段完整、连贯的中文描述。`,
  },
}

// ========== 归一化与检测 ==========

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function variablePattern(name: string, flags = ''): RegExp {
  return new RegExp(`\\{\\{\\s*${escapeRegExp(name)}\\s*\\}\\}`, flags)
}

/** 旧英文占位符归一化为中文占位符（兼容存量模板）。 */
export function normalizeTemplateVariables(content: string, type: TemplateType): string {
  let text = content
  for (const spec of getTemplateVariables(type)) {
    for (const alias of spec.legacy ?? []) {
      text = text.replace(variablePattern(alias, 'g'), `{{${spec.name}}}`)
    }
  }
  return text
}

/** 检测模板中不适配当前类型的占位符（渲染时会被清理；设置页红色警告）。入参应为归一化后的内容。 */
export function findUnknownVariables(content: string, type: TemplateType): string[] {
  const known = new Set(getTemplateVariables(type).map((spec) => spec.name))
  const found = new Set<string>()
  for (const match of content.matchAll(/\{\{\s*([^{}\s][^{}]*?)\s*\}\}/g)) {
    if (!known.has(match[1])) found.add(match[1])
  }
  return [...found]
}

/** 存量模板一次性迁移：返回归一化后的内容；无需迁移（无旧占位符）时返回 null。 */
export function migrateTemplateContent(content: string, type: TemplateType): string | null {
  const normalized = normalizeTemplateVariables(content, type)
  return normalized === content ? null : normalized
}

// ========== 统一渲染引擎 ==========

/**
 * 渲染最终提示词（全链路唯一规则）：
 * 1. 归一化：旧英文占位符 → 中文占位符；
 * 2. 变量在模板中 → 原地替换（值为空替换为 emptyText）；
 *    变量不在模板中 → 按兜底策略：always / if-nonempty 追加【块】，drop 不追加；
 * 3. 清理未注册的 {{...}} 占位符（防误插变量污染提示词）；
 * 4. 附加输出协议：自定义 > 类型默认（asset-prompt 分批量/逐条两种默认）。
 */
export function renderPromptTemplate(options: {
  type: TemplateType
  content: string
  values: Record<string, string | undefined>
  /** 模板自定义输出协议；空则落到类型默认协议 */
  customProtocol?: string
  /** 资产提示词类型的协议模式（影响默认协议选择），其它类型忽略 */
  protocolMode?: 'batch-once' | 'per-item'
}): string {
  const specs = getTemplateVariables(options.type)
  let text = normalizeTemplateVariables(options.content, options.type)
  const appends: string[] = []
  for (const spec of specs) {
    if (variablePattern(spec.name).test(text)) {
      const raw = options.values[spec.name] ?? ''
      const value = raw.trim() ? raw : (spec.emptyText ?? '')
      // 函数式替换：避免注入内容中的 $&、$1 等被当作 replace 特殊序列解析
      text = text.replace(variablePattern(spec.name, 'g'), () => value)
      continue
    }
    const raw = (options.values[spec.name] ?? '').trim()
    const shouldAppend =
      raw && spec.blockLabel && (spec.fallback === 'always' || spec.fallback === 'if-nonempty')
    if (shouldAppend) appends.push(`【${spec.blockLabel}】\n${options.values[spec.name]!.trim()}`)
  }
  if (appends.length) text = `${text}\n\n${appends.join('\n\n')}`
  text = text.replace(/\{\{[^{}]*\}\}/g, '')
  return applyOutputProtocol(text, options.customProtocol, options.type, options.protocolMode)
}

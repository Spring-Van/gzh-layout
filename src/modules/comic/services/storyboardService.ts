import { v4 as uuidv4 } from 'uuid'
import type { LongProjectAsset, LongProjectStoryboardAssetBinding, LongProjectStoryboardPanel, ModelConfig, PromptTemplate } from '@comic/types'
import { llmService } from './llmService'

/**
 * 组装"分镜生成"提示词：漫画剧本（主输入）+ 原文分析（辅助上下文）+ 分镜规则模板。
 * 新管线下分镜不再依赖资产库绑定；资产绑定在资产提取确认后按文本自动回填。
 */
export function buildStoryboardPrompt(templateContent: string, scriptContent: string, analysis?: string): string {
  let template = templateContent
  const appended: string[] = []
  if (/\{\{script_content\}\}/.test(template)) template = template.replace(/\{\{script_content\}\}/g, scriptContent)
  else appended.push(`【漫画剧本】\n${scriptContent}`)
  if (/\{\{analysis\}\}/.test(template)) template = template.replace(/\{\{analysis\}\}/g, analysis ?? '（本章尚未生成原文分析）')
  else if (analysis?.trim()) appended.push(`【原文分析（辅助上下文）】\n${analysis}`)
  const body = appended.length ? `${template}\n\n${appended.join('\n\n')}` : template
  return `${body}\n\n【系统固定输出协议】\n只输出中文 Markdown，不要解释、代码块或 JSON。每个分镜以 ## 分镜 N 开始；其余信息每行写为 - 属性名：内容。\n每个分镜必须有：画面、镜头。画面要完整具体，内容较长时可换行续写（续行不要重复“- 画面：”前缀）。\n可选填写：绘画提示词、对白、旁白。按剧本场景拆分镜头：一个场景拆成 3~8 个镜头，重要动作给独立镜头，重要道具首次出现可用特写，对白镜头考虑正反打，高潮处适当增加镜头密度，保持人物空间关系连续。`
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

/**
 * 解析 LLM 返回的 Markdown 分镜文本为结构化分镜数组。
 *
 * 支持两种行形态：
 * 1. 字段行：`- 属性名：内容`（画面/内容、镜头、对白、旁白、绘画提示词、出场资产）
 * 2. 续行：不匹配字段格式的非空行，拼接至上一个字段（出场资产/镜头除外），
 *    用于保留模型换行续写的多行画面描述，避免内容被截断。
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
  /** 上一个成功匹配的字段名，用于续行拼接 */
  let lastField: 'content' | 'dialogue' | 'narration' | 'imagePrompt' | null = null
  const flush = () => { if (current?.content) panels.push(current); current = undefined; lastField = null }
  for (const rawLine of content.replace(/\r/g, '').split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    if (/^##\s*分镜\s*\d*/.test(line)) { flush(); current = { id: uuidv4(), order: panels.length + 1, content: '', assetBindings: [] }; continue }
    if (!current) continue
    const field = line.match(/^[-*]\s*([^：:]+)[：:]\s*(.*)$/)
    if (field) {
      const key = field[1].trim(); const value = field[2].trim()
      if (key === '画面' || key === '内容') { current.content = value; lastField = 'content' }
      else if (key === '镜头') { current.shot = value; lastField = null }
      else if (key === '对白') { current.dialogue = value; lastField = 'dialogue' }
      else if (key === '旁白') { current.narration = value; lastField = 'narration' }
      else if (key === '绘画提示词') { current.imagePrompt = value; lastField = 'imagePrompt' }
      else if (key === '出场资产') { current.assetBindings = bindingsFromValue(value, assets, chapterId, chapterOrders); lastField = null }
      else lastField = null
      continue
    }
    // 续行：拼接到上一个字段的已有内容后（中文直接相连，无需空格）
    if (lastField && current[lastField]) current[lastField] += line
  }
  flush()
  if (!panels.length) throw new Error('模型返回中未找到分镜，请检查分镜模板的输出格式。')
  return panels
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

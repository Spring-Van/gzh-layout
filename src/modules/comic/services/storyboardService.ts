import { v4 as uuidv4 } from 'uuid'
import type { LongProjectAsset, LongProjectStoryboardAssetBinding, LongProjectStoryboardPanel, ModelConfig, PromptTemplate } from '@comic/types'
import { llmService } from './llmService'

function assetContext(assets: LongProjectAsset[]): string {
  if (!assets.length) return '当前项目资产库为空。'
  return assets.map((asset) => {
    const states = asset.variants.map((variant) => variant.name).join('、') || '默认状态'
    return `- ${asset.name}（${asset.type}；可用视觉状态：${states}）`
  }).join('\n')
}

export function buildStoryboardPrompt(templateContent: string, chapterContent: string, assets: LongProjectAsset[]): string {
  const template = templateContent.includes('{{chapter_content}}')
    ? templateContent.replace(/\{\{chapter_content\}\}/g, chapterContent)
    : `${templateContent}\n\n【章节原文】\n${chapterContent}`
  return `${template}\n\n【项目资产库】\n${assetContext(assets)}\n\n【系统固定输出协议】\n只输出中文 Markdown，不要解释、代码块或 JSON。每个分镜以 ## 分镜 N 开始；其余信息每行写为 - 属性名：内容。\n每个分镜必须有：画面、镜头、出场资产。出场资产格式为“资产名称（视觉状态）”，多个资产用顿号分隔；仅引用项目资产库中存在的名称和状态。\n可选填写：绘画提示词、对白、旁白。按重要剧情拆分，避免复述全部原文。`
}

function findAsset(name: string, assets: LongProjectAsset[]) { return assets.find((asset) => [asset.name, ...asset.aliases].some((item) => item.trim() === name.trim())) }

function defaultVariant(asset: LongProjectAsset | undefined, chapterId: string, chapterOrders: Record<string, number>) {
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

export function parseStoryboardResponse(content: string, assets: LongProjectAsset[], chapterId: string, chapterOrders: Record<string, number>): LongProjectStoryboardPanel[] {
  const panels: LongProjectStoryboardPanel[] = []
  let current: LongProjectStoryboardPanel | undefined
  const flush = () => { if (current?.content) panels.push(current); current = undefined }
  for (const rawLine of content.replace(/\r/g, '').split('\n')) {
    const line = rawLine.trim()
    if (/^##\s*分镜\s*\d*/.test(line)) { flush(); current = { id: uuidv4(), order: panels.length + 1, content: '', assetBindings: [] }; continue }
    const field = line.match(/^[-*]\s*([^：:]+)[：:]\s*(.*)$/)
    if (!field || !current) continue
    const key = field[1].trim(); const value = field[2].trim()
    if (key === '画面' || key === '内容') current.content = value
    else if (key === '镜头') current.shot = value
    else if (key === '绘画提示词') current.imagePrompt = value
    else if (key === '出场资产') current.assetBindings = bindingsFromValue(value, assets, chapterId, chapterOrders)
  }
  flush()
  if (!panels.length) throw new Error('模型返回中未找到分镜，请检查分镜模板的输出格式。')
  return panels
}

export async function generateStoryboard(options: { model: ModelConfig; template: PromptTemplate; chapterContent: string; assets: LongProjectAsset[]; chapterId: string; chapterOrders: Record<string, number>; prompt?: string }) {
  const prompt = options.prompt ?? buildStoryboardPrompt(options.template.content, options.chapterContent, options.assets)
  const result = await llmService.call({ modelConfig: options.model, userMessage: prompt })
  if (!result.success || !result.content) throw new Error(result.error || '模型没有返回内容')
  return { rawResponse: result.content, panels: parseStoryboardResponse(result.content, options.assets, options.chapterId, options.chapterOrders) }
}

import { llmService } from './llmService'
import { applyOutputProtocol, buildStyleContext } from './assetPromptService'
import type { LongProjectAsset, LongProjectPanelArtwork, LongProjectStoryboardPanel, ModelConfig, SharedPromptBlock } from '@comic/types'

/** 内置默认分镜画面描述模板：无用户模板时使用，与 panel-prompt 模板使用相同变量。 */
export const DEFAULT_PANEL_PROMPT_TEMPLATE = `你是一名专业的漫画分镜画面描述师。请根据当前分镜信息，写出一段可直接用于漫画生图的中文画面描述。

要求：
- 描述画面中的人物位置、动作、表情、场景环境与氛围；
- 出场资产必须严格遵循给定的资产视觉设定（外观、服饰等），不要改动固定特征；
- 与前几分镜保持剧情与画面的连续性（人物位置关系、光线、场景细节等）；
- 不写镜头语言、对白与旁白，只描述画面本身；
- 输出为一段完整中文描述。`

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

const typeLabel: Record<string, string> = { character: '人物', scene: '场景', prop: '道具' }

/** 解析绑定对应的资产与视觉状态（生图参考图也按同一口径实时解析）。 */
export function resolvePanelBindings(panel: LongProjectStoryboardPanel, assets: LongProjectAsset[]): Array<{ asset: LongProjectAsset; variant: LongProjectAsset['variants'][number] }> {
  const result: Array<{ asset: LongProjectAsset; variant: LongProjectAsset['variants'][number] }> = []
  for (const binding of panel.assetBindings) {
    const asset = assets.find((item) => item.id === binding.assetId)
    if (!asset) continue
    const variant = asset.variants.find((item) => item.id === binding.visualVersionId) ?? asset.variants[0]
    if (!variant) continue
    result.push({ asset, variant })
  }
  return result
}

/** 资产视觉设定文本：绑定资产的视觉状态 + 绘画提示词 + 固定特征。 */
export function buildPanelAssetsContext(panel: LongProjectStoryboardPanel, assets: LongProjectAsset[]): string {
  const resolved = resolvePanelBindings(panel, assets)
  if (!resolved.length) return '本分镜无绑定资产。'
  return resolved.map(({ asset, variant }) => {
    const parts = [
      `- ${asset.name}（${typeLabel[asset.type] ?? asset.type}）｜视觉状态：${variant.name}`,
      variant.description ? `视觉描述：${variant.description}` : '',
      variant.imagePrompt ? `绘画提示词：${variant.imagePrompt}` : '',
      asset.fixedTraits.length ? `固定特征：${asset.fixedTraits.join('、')}` : '',
    ].filter(Boolean)
    return parts.join('；')
  }).join('\n')
}

/**
 * 拼装单镜推导的最终提示词。
 * 输出协议：模板自定义 outputProtocol 优先；未自定义则不附加任何输出限制（结果直接取全文回填，无需解析）。
 */
export function buildPanelPromptPrompt(options: {
  templateContent: string
  panel: LongProjectStoryboardPanel
  chapterOutline: string
  prevEntries: PrevPanelContextEntry[]
  assets: LongProjectAsset[]
  styleContext?: string
  targetImageModel?: string
  outputProtocol?: string
}): string {
  const { panel } = options
  const replacements: Array<[RegExp, string]> = [
    [/\{\{panel_content\}\}/g, panel.content],
    [/\{\{shot\}\}/g, panel.shot || '未指定'],
    [/\{\{prev_panels\}\}/g, buildPrevPanelsContext(options.prevEntries)],
    [/\{\{chapter_outline\}\}/g, options.chapterOutline],
    [/\{\{assets\}\}/g, buildPanelAssetsContext(panel, options.assets)],
    [/\{\{style\}\}/g, options.styleContext ?? '无特殊风格要求'],
    [/\{\{target_model\}\}/g, options.targetImageModel ?? '未指定'],
  ]
  let template = options.templateContent
  let hasVariables = false
  for (const [pattern, value] of replacements) {
    if (pattern.test(template)) hasVariables = true
    template = template.replace(pattern, value)
  }
  const info = `【当前分镜】
分镜序号：${panel.order}
镜头：${panel.shot || '未指定'}
画面内容：${panel.content}
${panel.imagePrompt ? `分镜参考描述：${panel.imagePrompt}` : ''}`
  const body = hasVariables ? template : `${template}\n\n${info}`
  const style = options.styleContext ? `\n\n【风格上下文】\n${options.styleContext}` : ''
  return applyOutputProtocol(`${body}${style}`, options.outputProtocol, false)
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
 * 重跑分镜后迁移已有画面（panelArtworks）：
 * - 按分镜 order 对位迁移到新 panelId；
 * - 画面内容未变：保留描述与成图状态；内容已变：已有描述标记 stale（成图保留）；
 * - 进行中的状态（running/pending）按失败处理，避免永久卡住；
 * - 无法对位（新分镜数量减少等）的记录原样保留，仅不再被新分镜引用。
 */
export function migratePanelArtworks(
  artworks: LongProjectPanelArtwork[],
  oldPanels: LongProjectStoryboardPanel[],
  newPanels: LongProjectStoryboardPanel[],
  chapterId: string,
): LongProjectPanelArtwork[] {
  const oldPanelById = new Map(oldPanels.map((panel) => [panel.id, panel]))
  const newPanelByOrder = new Map(newPanels.map((panel) => [panel.order, panel]))
  const migrated = new Set<string>()
  return artworks.map((artwork) => {
    if (artwork.chapterId !== chapterId) return artwork
    const oldPanel = oldPanelById.get(artwork.panelId)
    const target = oldPanel ? newPanelByOrder.get(oldPanel.order) : undefined
    if (!oldPanel || !target || migrated.has(target.id)) return artwork
    migrated.add(target.id)
    const contentChanged = oldPanel.content !== target.content
    const promptStatus: LongProjectPanelArtwork['promptStatus'] =
      artwork.promptStatus === 'running' || artwork.promptStatus === 'pending'
        ? 'failed'
        : contentChanged && artwork.imagePrompt?.trim()
          ? 'stale'
          : artwork.promptStatus
    return {
      ...artwork,
      panelId: target.id,
      promptStatus,
      genStatus: artwork.genStatus === 'running' ? 'failed' : artwork.genStatus,
      updatedAt: Date.now(),
    }
  })
}

/** 组合导出：风格上下文构建（与资产提示词同一口径）。 */
export { buildStyleContext }
export type { SharedPromptBlock }

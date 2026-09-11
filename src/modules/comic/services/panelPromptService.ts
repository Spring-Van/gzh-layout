import { llmService } from './llmService'
import { defaultTemplateContent, renderPromptTemplate } from './promptTemplateRegistry'
import { buildStyleContext } from './assetPromptService'
import { formatCellsForPrompt } from './storyboardService'
import type { LongProjectAsset, LongProjectPanelArtwork, LongProjectStoryboardPanel, ModelConfig, SharedPromptBlock } from '@comic/types'

/** 内置默认分镜画面描述模板：无用户模板时使用，与 panel-prompt 推荐模板同源（自带全部变量）。 */
export const DEFAULT_PANEL_PROMPT_TEMPLATE = defaultTemplateContent('panel-prompt')

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
 * 变量：{{当前分镜}} / {{镜头}} / {{前文分镜}} / {{本章分镜概要}} / {{绑定资产}} / {{风格上下文}} / {{目标生图模型}}；
 * 是否进入提示词完全由模板决定——模板没写的变量不会出现（无自动追加兜底）。
 * 输出协议：模板自定义 outputProtocol 优先，未自定义使用逐条默认协议（结果直接取全文回填，无需解析）。
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
  // 多格页：把每格的 景别/镜头/画面/人物/动作/表情/音效/光效 一并交给模型，避免只看到汇总后的「画面」而丢细节
  const cellDetail = panel.cells?.length ? formatCellsForPrompt(panel.cells) : ''
  const info = `分镜序号：${panel.order}
镜头：${panel.shot || '未指定'}
画面内容：${panel.content}${cellDetail ? `\n分格详情：\n${cellDetail}` : ''}${panel.imagePrompt ? `\n分镜参考描述：${panel.imagePrompt}` : ''}`
  return renderPromptTemplate({
    type: 'panel-prompt',
    content: options.templateContent,
    values: {
      当前分镜: info,
      镜头: panel.shot ?? '',
      前文分镜: buildPrevPanelsContext(options.prevEntries),
      本章分镜概要: options.chapterOutline,
      绑定资产: buildPanelAssetsContext(panel, options.assets),
      风格上下文: options.styleContext ?? '',
      目标生图模型: options.targetImageModel ?? '',
    },
    customProtocol: options.outputProtocol,
    protocolMode: 'per-item',
  })
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

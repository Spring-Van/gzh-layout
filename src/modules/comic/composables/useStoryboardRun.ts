import { ref, type Ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { generateStoryboard } from '@comic/services/storyboardService'
import { migratePanelArtworks } from '@comic/services/panelPromptService'
import type { ComicProject, LongProjectNode, LongProjectStoryboardRun, ModelConfig, PromptTemplate } from '@comic/types'

/**
 * 分镜生成 composable（生图工作台）：
 * 剧本为主输入、原文分析为辅助上下文；无剧本时以章节原文兜底并提示。
 * 生成前记录旧分镜，成功后对位迁移已推导描述与成图（panelArtworks）。
 */
export function useStoryboardRun(options: {
  project: Ref<ComicProject | null>
  mutateLongProjectData: (mutate: (data: NonNullable<ComicProject['longProjectData']>) => void) => Promise<void>
  /** 获取当前章节（生成分镜的目标章节）。 */
  getCurrentChapter: () => LongProjectNode | null
  /** 获取本章漫画剧本内容（无则原文兜底）。 */
  getScriptContent: () => string | undefined
  /** 获取本章原文分析内容。 */
  getAnalysisContent: () => string | undefined
  /** 章节顺序表（章节 ID → 序号）。 */
  getChapterOrders: () => Record<string, number>
  /** 无剧本兜底时的提示回调（通常为 toast.info）。 */
  notifyFallback?: (message: string) => void
  /** 生成失败的提示回调（通常为 toast.error）。 */
  notifyError?: (message: string) => void
}) {
  const selectedModelId = ref('')
  const selectedTemplateId = ref('')

  /** 从模型/模板配置列表初始化默认选择。 */
  function initDefaults(models: ModelConfig[], templates: PromptTemplate[]) {
    selectedModelId.value = models.filter((model) => model.category === 'llm')[0]?.id ?? ''
    selectedTemplateId.value = templates.find((template) => template.type === 'storyboard')?.id ?? ''
  }

  /** 本章最近一次已完成分镜（用于重跑前的旧分镜记录）。 */
  function latestCompletedRun(chapterId: string): LongProjectStoryboardRun | undefined {
    return (options.project.value?.longProjectData?.storyboardRuns ?? [])
      .filter((run) => run.chapterId === chapterId && run.status === 'completed')
      .sort((a, b) => b.updatedAt - a.updatedAt)[0]
  }

  /**
   * 执行分镜生成：先落一份 running run（刷新后可恢复为 failed），
   * 模型返回后写回分镜并迁移 panelArtworks；失败时记录错误信息。
   */
  async function runStoryboard(params: { model: ModelConfig; templateId: string; prompt: string }) {
    const chapter = options.getCurrentChapter()
    if (!chapter) return
    const scriptContent = options.getScriptContent()?.trim()
    if (!scriptContent) options.notifyFallback?.('本章尚未生成剧本，将以原文兜底生成分镜')
    const chapterContent = chapter.content ?? ''
    const now = Date.now()
    const previousPanels = latestCompletedRun(chapter.id)?.panels ?? []
    const run: LongProjectStoryboardRun = {
      id: uuidv4(), chapterId: chapter.id, sourceContent: chapterContent,
      modelId: params.model.id, templateId: params.templateId, prompt: params.prompt,
      status: 'running', panels: [], createdAt: now, updatedAt: now,
    }
    await options.mutateLongProjectData((data) => {
      data.storyboardRuns = [...(data.storyboardRuns ?? []), run]
    })
    try {
      const result = await generateStoryboard({
        model: params.model,
        scriptContent: scriptContent || chapterContent,
        analysis: options.getAnalysisContent(),
        chapterId: chapter.id,
        chapterOrders: options.getChapterOrders(),
        prompt: params.prompt,
      })
      await options.mutateLongProjectData((data) => {
        data.storyboardRuns = (data.storyboardRuns ?? []).map((item) =>
          item.id === run.id ? { ...item, status: 'completed' as const, panels: result.panels, rawResponse: result.rawResponse, updatedAt: Date.now() } : item)
        data.nodes = (data.nodes ?? []).map((node) =>
          node.id === chapter.id ? { ...node, stage: 'storyboard-ready' as const, updatedAt: Date.now() } : node)
        data.panelArtworks = migratePanelArtworks(data.panelArtworks ?? [], previousPanels, result.panels, chapter.id)
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '分镜生成失败，请重试'
      await options.mutateLongProjectData((data) => {
        data.storyboardRuns = (data.storyboardRuns ?? []).map((item) =>
          item.id === run.id ? { ...item, status: 'failed' as const, error: message, updatedAt: Date.now() } : item)
      })
      options.notifyError?.(message)
    }
  }

  /** 异常恢复：页面加载时残留 running 的分镜 run 标记为失败，避免界面永远转圈。 */
  async function recoverInterrupted() {
    const runs = options.project.value?.longProjectData?.storyboardRuns ?? []
    if (!runs.some((run) => run.status === 'running')) return
    await options.mutateLongProjectData((data) => {
      data.storyboardRuns = (data.storyboardRuns ?? []).map((run) =>
        run.status === 'running'
          ? { ...run, status: 'failed' as const, error: '上次分镜生成被中断，请重新生成', updatedAt: Date.now() }
          : run)
    })
  }

  return { selectedModelId, selectedTemplateId, initDefaults, runStoryboard, recoverInterrupted }
}

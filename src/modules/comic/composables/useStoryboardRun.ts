import { ref, type Ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { buildVariantCodeMap, generateStoryboard, parseStoryboardResponse, type ChapterAssetContext } from '@comic/services/storyboardService'
import { bindingScanPrompt, migratePanelArtworks } from '@comic/services/panelPromptService'
import { sweepProjectData } from '@comic/services/projectDataCleanup'
import { buildAssetNameIndex, syncPanelsAutoBindings } from '@comic/services/promptAssetService'
import { defaultVariant } from '@comic/services/storyboardService'
import { LONG_CHAPTER_STAGE_ORDER } from '@comic/types'
import type { ComicProject, LongProjectAsset, LongProjectNode, LongProjectPanelArtwork, LongProjectStoryboardPanel, LongProjectStoryboardRun, ModelConfig, PromptTemplate } from '@comic/types'

/** 分镜完成后章节阶段只升不降（避免重跑分镜把已到资产/生图阶段的章节打回）。 */
function advanceStoryboardStage(node: LongProjectNode): LongProjectNode {
  return LONG_CHAPTER_STAGE_ORDER.indexOf(node.stage ?? 'empty') < LONG_CHAPTER_STAGE_ORDER.indexOf('storyboard-ready')
    ? { ...node, stage: 'storyboard-ready' as const, updatedAt: Date.now() }
    : { ...node, updatedAt: Date.now() }
}

/**
 * 分镜生成 composable（生图工作台）：
 * 剧本为主输入，原文分析与章节原文为辅助核对；无剧本时以章节原文兜底并提示。
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
  /** 获取本章资产上下文（资产 + 可用状态），注入分镜提示词的 {{本章资产}} 变量。 */
  getChapterAssets: () => ChapterAssetContext[]
  /** 获取项目资产库（解析格级/页级「出场资产」声明的绑定回填；手动导入路径使用）。 */
  getAssets?: () => LongProjectAsset[]
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
   * 迁移过来的旧描述也是绑定依据：描述里提到的资产必须进绑定，否则取图清单里没有它。
   *
   * `syncPanelsAutoBindings` 只扫分镜 panel 的文本，而画面描述存在 `panelArtworks` 里，
   * 所以这里先把迁移结果里的描述临时并入扫描文本，算完绑定再摘掉（描述不落进 panel，避免双份存储）。
   * 但只有 `bindingScanPrompt` 放行的描述才算数 —— 搬迁过来的「过期描述」写的是别的画面。
   */
  function syncBindingsWithArtworkPrompts(
    panels: LongProjectStoryboardPanel[],
    artworks: LongProjectPanelArtwork[],
    chapterId: string,
  ): LongProjectStoryboardPanel[] {
    const promptByPanelId = new Map<string, string>()
    for (const artwork of artworks) {
      if (artwork.chapterId !== chapterId) continue
      const prompt = bindingScanPrompt(artwork)
      if (prompt) promptByPanelId.set(artwork.panelId, prompt)
    }
    if (!promptByPanelId.size) return panels
    const scanned = panels.map((panel) => {
      const imagePrompt = promptByPanelId.get(panel.id)
      return imagePrompt && imagePrompt !== panel.imagePrompt ? { ...panel, imagePrompt } : panel
    })
    const synced = syncPanelsAutoBindings(
      scanned,
      buildAssetNameIndex(options.getAssets?.() ?? []),
      (asset) => defaultVariant(asset, chapterId, options.getChapterOrders()),
    )
    return synced.map((panel, index) => {
      const source = panels[index]
      const scan = scanned[index]
      return panel.assetBindings === scan.assetBindings && panel.cells === scan.cells
        ? source
        : { ...source, assetBindings: panel.assetBindings, cells: panel.cells }
    })
  }

  /**
   * 执行分镜生成：先落一份 running run（刷新后可恢复为 failed），
   * 模型返回后写回分镜并迁移 panelArtworks；失败时记录错误信息。
   */
  async function runStoryboard(params: { model: ModelConfig; templateId: string; prompt: string }) {
    const chapter = options.getCurrentChapter()
    if (!chapter) return { droppedPromptCount: 0 }
    const scriptContent = options.getScriptContent()?.trim()
    if (!scriptContent) options.notifyFallback?.('本章尚未生成剧本，将以原文兜底生成分镜')
    const chapterContent = chapter.content ?? ''
    const now = Date.now()
    const previousPanels = latestCompletedRun(chapter.id)?.panels ?? []
    // 因正文变化而未继承的旧画面描述条数（返回给调用方提示用户重推）
    let droppedPromptCount = 0
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
        chapterContent,
        analysis: options.getAnalysisContent(),
        assets: options.getAssets?.() ?? [],
        chapterAssets: options.getChapterAssets(),
        chapterId: chapter.id,
        chapterOrders: options.getChapterOrders(),
        prompt: params.prompt,
      })
      // 模型声明是显式证据，逐格文本扫描是确定性兜底；两者合并后再落库，避免模型漏写「出场资产」导致整格漏绑。
      const generatedPanels = syncPanelsAutoBindings(
        result.panels,
        buildAssetNameIndex(options.getAssets?.() ?? []),
        (asset) => defaultVariant(asset, chapter.id, options.getChapterOrders()),
      )
      await options.mutateLongProjectData((data) => {
        // 先迁移旧描述，再让描述参与绑定扫描 —— 迁移过来的描述里提到的资产同样要进参考图清单
        const migration = migratePanelArtworks(data.panelArtworks ?? [], previousPanels, generatedPanels, chapter.id)
        droppedPromptCount = migration.droppedPromptCount
        const panels = syncBindingsWithArtworkPrompts(generatedPanels, migration.artworks, chapter.id)
        data.storyboardRuns = (data.storyboardRuns ?? []).map((item) =>
          item.id === run.id ? { ...item, status: 'completed' as const, panels, rawResponse: result.rawResponse, updatedAt: Date.now() } : item)
        data.nodes = (data.nodes ?? []).map((node) => node.id === chapter.id ? advanceStoryboardStage(node) : node)
        data.panelArtworks = migration.artworks
        // 写完新版本立刻压掉旧版本：历史分镜版本没有任何界面消费，留着只会撑大库
        sweepProjectData(data)
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '分镜生成失败，请重试'
      await options.mutateLongProjectData((data) => {
        data.storyboardRuns = (data.storyboardRuns ?? []).map((item) =>
          item.id === run.id ? { ...item, status: 'failed' as const, error: message, updatedAt: Date.now() } : item)
      })
      options.notifyError?.(message)
    }
    return { droppedPromptCount }
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

  /**
   * 手动导入分镜（外部 AI 代跑）：解析粘贴的 Markdown 文本为分镜数组，跳过模型调用。
   * 与 runStoryboard 同语义：记录旧分镜 → 对位迁移已推导描述与成图（panelArtworks）。
   * 解析失败抛错（调用方在弹窗内展示），不落库。
   * @returns 落库的分镜数组（调用方据此做绑定体检提示）+ 因正文变化未继承的旧描述条数
   */
  async function importStoryboard(content: string) {
    const chapter = options.getCurrentChapter()
    if (!chapter) return { panels: [] as LongProjectStoryboardPanel[], droppedPromptCount: 0 }
    const now = Date.now()
    const previousPanels = latestCompletedRun(chapter.id)?.panels ?? []
    const panels = syncPanelsAutoBindings(
      parseStoryboardResponse(content, options.getAssets?.() ?? [], chapter.id, options.getChapterOrders(), buildVariantCodeMap(options.getChapterAssets())),
      buildAssetNameIndex(options.getAssets?.() ?? []),
      (asset) => defaultVariant(asset, chapter.id, options.getChapterOrders()),
    )
    const run: LongProjectStoryboardRun = {
      id: uuidv4(), chapterId: chapter.id, sourceContent: chapter.content ?? '',
      modelId: '', templateId: '', prompt: '',
      status: 'completed', panels, rawResponse: content, source: 'manual',
      createdAt: now, updatedAt: now,
    }
    let syncedPanels: LongProjectStoryboardPanel[] = panels
    let droppedPromptCount = 0
    await options.mutateLongProjectData((data) => {
      // 先迁移旧描述，再让描述参与绑定扫描（重新导入/生成后描述里提到的资产要留在参考图清单里）
      const migration = migratePanelArtworks(data.panelArtworks ?? [], previousPanels, panels, chapter.id)
      droppedPromptCount = migration.droppedPromptCount
      syncedPanels = syncBindingsWithArtworkPrompts(panels, migration.artworks, chapter.id)
      data.storyboardRuns = [...(data.storyboardRuns ?? []), { ...run, panels: syncedPanels }]
      data.nodes = (data.nodes ?? []).map((node) => node.id === chapter.id ? advanceStoryboardStage(node) : node)
      data.panelArtworks = migration.artworks
      // 同上：重新导入后只保留最新一版分镜
      sweepProjectData(data)
    })
    return { panels: syncedPanels, droppedPromptCount }
  }

  return { selectedModelId, selectedTemplateId, initDefaults, runStoryboard, importStoryboard, recoverInterrupted }
}

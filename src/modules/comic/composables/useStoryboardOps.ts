import { computed, onBeforeUnmount, ref, type Ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { buildAssetNameIndex, syncPanelsAutoBindings } from '@comic/services/promptAssetService'
import { defaultVariant } from '@comic/services/storyboardService'
import type { StoryboardMenuAction } from '@comic/components/StoryboardContextMenu.vue'
import type {
  ComicProject,
  LongProjectAsset,
  LongProjectNode,
  LongProjectPanelArtwork,
  LongProjectStoryboardPanel,
  LongProjectStoryboardRun,
} from '@comic/types'

/**
 * 分镜结构操作 composable（生图工作台左栏右键菜单）：
 * 合并 / 拆分 / 复制 / 跳转，含 8 秒可撤销快照与 panelArtworks 归属迁移。
 * 迁移自长篇主页面，合并吸收候选图、拆分父镜继承 + 内容变化标 stale 的逻辑逐行保留。
 */
export function useStoryboardOps(options: {
  mutateLongProjectData: (mutate: (data: NonNullable<ComicProject['longProjectData']>) => void) => Promise<void>
  notify: (type: 'success' | 'info' | 'error', message: string) => void
  /** 当前章节最近一次已完成分镜 run。 */
  currentRun: Ref<LongProjectStoryboardRun | undefined>
  currentChapter: Ref<LongProjectNode | null>
  panelArtworks: Ref<LongProjectPanelArtwork[]>
  /** panelId → artwork 映射（本章）。 */
  artworkMap: Ref<Map<string, LongProjectPanelArtwork>>
  assets: Ref<LongProjectAsset[]>
  chapterOrders: Ref<Record<string, number>>
  /** 批量任务进行中时禁用右键菜单（true = 锁定）。 */
  opsLocked: Ref<boolean>
}) {
  const mergeDialogVisible = ref(false)
  const splitDialogVisible = ref(false)
  const splitTargetPanel = ref<LongProjectStoryboardPanel | null>(null)
  /** 拆分模式：multi 原地拆多段；up 新镜插入上方；down 新镜插入下方。 */
  const splitMode = ref<'multi' | 'up' | 'down'>('multi')
  /** 合并方向与条数（由右键菜单选择）。 */
  const mergeDirection = ref<'up' | 'down'>('up')
  const mergeCount = ref(1)

  /** 分镜右键菜单状态。 */
  const panelMenu = ref<{ visible: boolean; x: number; y: number; panel: LongProjectStoryboardPanel | null }>({ visible: false, x: 0, y: 0, panel: null })

  /** 操作前快照（仅一步撤销），8 秒内可恢复。 */
  let storyboardOpSnapshot: { runId: string; panels: LongProjectStoryboardPanel[]; artworks: LongProjectPanelArtwork[]; label: string } | null = null
  let storyboardUndoTimer: ReturnType<typeof setTimeout> | undefined
  const storyboardUndoAvailable = ref(false)
  const storyboardUndoLabel = ref('')

  /** 待合并分镜（按 order 升序）：当前分镜 + 上/下方相邻 mergeCount 个。 */
  const mergeSelectedPanels = computed(() => {
    const run = options.currentRun.value
    const anchor = panelMenu.value.panel
    if (!run || !anchor) return []
    const index = run.panels.findIndex((panel) => panel.id === anchor.id)
    if (index < 0) return []
    return mergeDirection.value === 'up'
      ? run.panels.slice(Math.max(0, index - mergeCount.value), index + 1)
      : run.panels.slice(index, index + mergeCount.value + 1)
  })

  /** 打开分镜右键菜单（批量任务进行中时禁用）。 */
  function openPanelMenu(event: MouseEvent, panel: LongProjectStoryboardPanel) {
    if (options.opsLocked.value) return
    panelMenu.value = { visible: true, x: event.clientX, y: event.clientY, panel }
  }

  /** 处理分镜右键菜单动作。 */
  function handlePanelMenuAction(action: StoryboardMenuAction, openWorkbench: (panel: LongProjectStoryboardPanel) => void) {
    const panel = panelMenu.value.panel
    if (!panel) return
    if (action.action === 'merge-up' || action.action === 'merge-down') {
      mergeDirection.value = action.action === 'merge-up' ? 'up' : 'down'
      mergeCount.value = action.count
      mergeDialogVisible.value = true
      return
    }
    if (action.action === 'split') { openSplitDialog(panel, 'multi'); return }
    if (action.action === 'split-up') { openSplitDialog(panel, 'up'); return }
    if (action.action === 'split-down') { openSplitDialog(panel, 'down'); return }
    if (action.action === 'copy') {
      const text = [panel.content, panel.dialogue ? `对白：${panel.dialogue}` : '', panel.narration ? `旁白：${panel.narration}` : ''].filter(Boolean).join('\n')
      void navigator.clipboard?.writeText(text).then(() => options.notify('success', '已复制分镜内容')).catch(() => options.notify('error', '复制失败'))
      return
    }
    if (action.action === 'open-workbench') openWorkbench(panel)
  }

  /** 打开拆分弹窗。 */
  function openSplitDialog(panel: LongProjectStoryboardPanel, mode: 'multi' | 'up' | 'down' = 'multi') {
    splitTargetPanel.value = panel
    splitMode.value = mode
    splitDialogVisible.value = true
  }

  /** 记录操作前快照并启动 8 秒撤销窗口。 */
  function snapshotForUndo(label: string) {
    const run = options.currentRun.value
    if (!run) return
    storyboardOpSnapshot = { runId: run.id, panels: run.panels, artworks: options.panelArtworks.value, label }
    storyboardUndoLabel.value = label
    storyboardUndoAvailable.value = true
    if (storyboardUndoTimer) clearTimeout(storyboardUndoTimer)
    storyboardUndoTimer = setTimeout(() => { storyboardUndoAvailable.value = false; storyboardOpSnapshot = null }, 8000)
  }

  /** 撤销最近一次合并/拆分操作。 */
  async function undoStoryboardOp() {
    const snapshot = storyboardOpSnapshot
    if (!snapshot) return
    if (storyboardUndoTimer) clearTimeout(storyboardUndoTimer)
    storyboardUndoAvailable.value = false
    storyboardOpSnapshot = null
    await options.mutateLongProjectData((data) => {
      data.storyboardRuns = (data.storyboardRuns ?? []).map((item) => item.id === snapshot.runId ? { ...item, panels: snapshot.panels, updatedAt: Date.now() } : item)
      data.panelArtworks = snapshot.artworks
    })
    options.notify('success', '已撤销上一步操作')
  }

  /** 工件状态标记：内容变化且有描述时置为 stale；进行中置为 failed。 */
  function reevaluatePromptStatus(artwork: LongProjectPanelArtwork, contentChanged: boolean): LongProjectPanelArtwork['promptStatus'] {
    if (artwork.promptStatus === 'running' || artwork.promptStatus === 'pending') return 'failed'
    if (contentChanged && artwork.imagePrompt?.trim()) return 'stale'
    return artwork.promptStatus
  }

  /**
   * 执行合并：连续分镜合为 1 个，保留所选分镜的成图归属。
   * 被合并分镜的候选图并入保留工件的 generatedImageIds，不丢失。
   */
  async function applyMerge(sourcePanelId: string) {
    const run = options.currentRun.value
    const chapter = options.currentChapter.value
    const panelsToMerge = mergeSelectedPanels.value
    if (!run || !chapter || panelsToMerge.length < 2) return
    snapshotForUndo(`已合并 ${panelsToMerge.length} 个分镜`)
    const sourcePanel = panelsToMerge.find((panel) => panel.id === sourcePanelId)
    if (!sourcePanel) return

    // 资产绑定按 assetId+visualVersionId 去重取并集
    const seen = new Set<string>()
    const assetBindings = panelsToMerge.flatMap((panel) => panel.assetBindings).filter((binding) => {
      const key = `${binding.assetId ?? binding.assetName}::${binding.visualVersionId ?? binding.visualVersionName ?? ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const merged: LongProjectStoryboardPanel = {
      id: sourcePanelId,
      order: panelsToMerge[0].order,
      content: panelsToMerge.map((panel) => panel.content).filter(Boolean).join('\n'),
      shot: panelsToMerge.map((panel) => panel.shot).find(Boolean),
      dialogue: panelsToMerge.map((panel) => panel.dialogue).filter(Boolean).join('\n') || undefined,
      narration: panelsToMerge.map((panel) => panel.narration).filter(Boolean).join('\n') || undefined,
      imagePrompt: panelsToMerge.map((panel) => panel.imagePrompt).find(Boolean),
      assetBindings,
    }

    const startIdx = run.panels.findIndex((panel) => panel.id === panelsToMerge[0].id)
    const nextPanels = autoSyncBindings([...run.panels.slice(0, startIdx), merged, ...run.panels.slice(startIdx + panelsToMerge.length)].map((panel, index) => ({ ...panel, order: index + 1 })), chapter.id)

    // 成图归属：保留所选分镜的工件（id 未变，panelId 不动）；其余分镜候选图并入
    const otherIds = panelsToMerge.filter((panel) => panel.id !== sourcePanelId).map((panel) => panel.id)
    const keptArtwork = options.artworkMap.value.get(sourcePanelId)
    const extraImages = otherIds.flatMap((id) => options.artworkMap.value.get(id)?.generatedImageIds ?? [])
    let nextArtworks = options.panelArtworks.value.filter((artwork) => artwork.chapterId !== chapter.id || !otherIds.includes(artwork.panelId))
    if (keptArtwork) {
      const contentChanged = merged.content !== sourcePanel.content
      nextArtworks = nextArtworks.map((artwork) => artwork.panelId === sourcePanelId ? {
        ...artwork,
        generatedImageIds: [...new Set([...(artwork.generatedImageIds ?? []), ...extraImages])],
        promptStatus: reevaluatePromptStatus(artwork, contentChanged),
        genStatus: artwork.genStatus === 'running' ? 'failed' : artwork.genStatus,
        updatedAt: Date.now(),
      } : artwork)
    }

    await options.mutateLongProjectData((data) => {
      data.storyboardRuns = (data.storyboardRuns ?? []).map((item) => item.id === run.id ? { ...item, panels: nextPanels, updatedAt: Date.now() } : item)
      data.panelArtworks = nextArtworks
    })
    options.notify('success', '已合并为 1 个分镜，顺序号已重排')
  }

  /**
   * 执行拆分：
   * - multi：原地拆成 N 段，第一段继承父 ID（保留成图）；
   * - up：拆成 2 段，第一段为新分镜插入父分镜上方，父分镜保留第二段（继承成图）；
   * - down：拆成 2 段，第二段为新分镜插入父分镜下方，父分镜保留第一段（继承成图）。
   * 新分镜继承镜头与资产绑定，无描述无成图。
   */
  async function applySplit(parts: string[]) {
    const run = options.currentRun.value
    const chapter = options.currentChapter.value
    const parent = splitTargetPanel.value
    const mode = splitMode.value
    if (!run || !chapter || !parent || parts.length < 2) return
    if (mode !== 'multi' && parts.length !== 2) return
    snapshotForUndo(`已拆分分镜 ${parent.order} 为 ${parts.length} 个`)

    /** 新分镜构造：继承镜头与绑定，新 ID。 */
    const makeChild = (content: string): LongProjectStoryboardPanel => ({
      id: uuidv4(), order: parent.order, content, shot: parent.shot,
      assetBindings: parent.assetBindings.map((binding) => ({ ...binding })),
    })
    const children: LongProjectStoryboardPanel[] =
      mode === 'multi'
        ? parts.map((content, index) => index === 0 ? { ...parent, content } : { ...makeChild(content), order: parent.order + index })
        : mode === 'up'
          ? [makeChild(parts[0]), { ...parent, content: parts[1] }]
          : [{ ...parent, content: parts[0] }, makeChild(parts[1])]

    const index = run.panels.findIndex((panel) => panel.id === parent.id)
    const nextPanels = autoSyncBindings([...run.panels.slice(0, index), ...children, ...run.panels.slice(index + 1)].map((panel, i) => ({ ...panel, order: i + 1 })), chapter.id)

    // 成图归属：父分镜保留段 panelId 未变自动继承；内容变化时标记 stale 提示重新推导
    const parentContent = mode === 'up' ? parts[1] : parts[0]
    const parentArtwork = options.artworkMap.value.get(parent.id)
    let nextArtworks = options.panelArtworks.value
    if (parentArtwork && parentContent !== parent.content) {
      nextArtworks = options.panelArtworks.value.map((artwork) => artwork.panelId === parent.id ? { ...artwork, promptStatus: reevaluatePromptStatus(artwork, true), updatedAt: Date.now() } : artwork)
    }

    await options.mutateLongProjectData((data) => {
      data.storyboardRuns = (data.storyboardRuns ?? []).map((item) => item.id === run.id ? { ...item, panels: nextPanels, updatedAt: Date.now() } : item)
      data.panelArtworks = nextArtworks
    })
    splitTargetPanel.value = null
    options.notify('success', `已拆分为 ${parts.length} 个分镜`)
  }

  /**
   * 分镜文本自动绑定同步：编辑/合并/拆分后重扫全部分镜文本，
   * 出现资产名且未绑定 → 自动添加（延续上一镜视觉状态，否则章节范围默认）；
   * auto-text 绑定且名称消失 → 自动移除；其余来源绑定不动。
   */
  function autoSyncBindings(panels: LongProjectStoryboardPanel[], chapterId: string): LongProjectStoryboardPanel[] {
    return syncPanelsAutoBindings(panels, buildAssetNameIndex(options.assets.value), (asset) => defaultVariant(asset, chapterId, options.chapterOrders.value))
  }

  onBeforeUnmount(() => {
    if (storyboardUndoTimer) clearTimeout(storyboardUndoTimer)
  })

  return {
    mergeDialogVisible, splitDialogVisible, splitTargetPanel, splitMode,
    panelMenu, storyboardUndoAvailable, storyboardUndoLabel, mergeSelectedPanels,
    openPanelMenu, handlePanelMenuAction, undoStoryboardOp, applyMerge, applySplit, autoSyncBindings, reevaluatePromptStatus,
  }
}

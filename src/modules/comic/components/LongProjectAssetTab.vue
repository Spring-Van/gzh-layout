<template>
  <!-- 单根节点：抽屉/页面内均直接填充父容器 -->
  <div class="flex h-full min-h-0 flex-col overflow-hidden bg-app-bg text-text-primary">
    <!-- 资产主体：三子视图（信息 | 图片 | 生图工作台）；顶部操作按钮经 #actions 注入子 tab 行右侧 -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <PanelGenAssetTab
        v-if="currentChapter"
        ref="assetTabRef"
        v-model:view="assetView"
        :chapter="currentChapter"
        :panels="panels"
        :analysis-content="analysisDoc?.content ?? ''"
        :script-content="scriptDoc?.content ?? ''"
        :models="models"
        :templates="templates"
        :assets="assets"
        :chapter-assets="chapterAssets"
        :asset-extraction-runs="assetExtractionRuns"
        :asset-gen-config="assetGenConfig"
        :painting-style="project?.comicConfig?.paintingStyle"
        :shared-blocks="project?.imageGenConfig?.sharedBlocks"
        :focus-target="focusTarget"
        :mutate-long-project-data="mutateLongProjectData"
        @retry-extraction="retryExtraction"
        @import-extraction="extractImportVisible = true"
      >
        <!-- 信息视图：资产提取操作区 + 确认本章资产 -->
        <template v-if="assetView === 'info'" #actions>
          <div class="min-w-0 max-w-2xl">
            <PromptRunBar
              v-model:model-id="extractModelId"
              v-model:template-id="extractTemplateId"
              :models="llmModels"
              :templates="extractTemplates"
              :action-label="extractActionLabel"
              :disabled="extractDisabled"
              :busy="extractBusy"
              confirm-storage-key="comic-long-extract-confirm"
              :build-prompt="buildExtractPrompt"
              @run="runExtraction"
            />
          </div>
          <span
            v-if="scriptFallbackHint"
            class="shrink-0 rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-1 text-[11px] text-amber-300"
            title="本章无原文（从剧本开始创作），提取将以漫画剧本作为底稿"
          >剧本兜底</span>
          <button
            class="secondary-button h-9 shrink-0 px-2.5 text-xs"
            title="粘贴外部 AI 生成的资产提取结果，解析后进入审核确认"
            @click="extractImportVisible = true"
          ><ClipboardPaste :size="14" />手动导入</button>

          <!-- 确认本章资产：主按钮按上次用过的方式直接执行，箭头展开切换应用方式 -->
          <div ref="applyMenuRef" class="relative flex shrink-0 items-stretch">
            <button
              class="primary-button split-main h-9 text-xs"
              :disabled="!assetTabRef?.canConfirmReview"
              :title="confirmButtonTitle"
              @click="confirmAssets()"
            >
              <CheckCircle2 :size="14" />
              确认本章资产
            </button>
            <button
              class="primary-button split-toggle h-9"
              :disabled="!assetTabRef?.canConfirmReview"
              title="选择应用方式：合并到已有资产 / 覆盖已有资产"
              @click="applyMenuOpen = !applyMenuOpen"
            ><ChevronDown :size="13" /></button>

            <div
              v-if="applyMenuOpen"
              class="absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-lg border border-border-subtle bg-surface py-1 shadow-lg"
            >
              <button
                v-for="option in applyOptions"
                :key="option.value"
                class="apply-option"
                @click="confirmAssets(option.value)"
              >
                <Check :size="13" class="mt-0.5 shrink-0" :class="applyMode === option.value ? 'text-cyan-400' : 'text-transparent'" />
                <span class="min-w-0 flex-1">
                  <span class="block text-xs font-medium text-text-primary">{{ option.label }}</span>
                  <span class="mt-0.5 block text-[11px] leading-4 text-text-muted">{{ option.hint }}</span>
                </span>
              </button>
              <p class="mt-1 border-t border-border-subtle px-3 pt-2 pb-1 text-[11px] text-text-muted">
                本次识别：并入 {{ assetTabRef?.applySummary?.merged ?? 0 }} 项 · 新建 {{ assetTabRef?.applySummary?.created ?? 0 }} 项
              </p>
            </div>
          </div>
        </template>

        <!-- 生图工作台视图：批量提示词 / 批量生图 / 生图配置 -->
        <template v-else-if="assetView === 'workbench'" #actions>
          <button
            class="secondary-button h-9 shrink-0 px-3 text-xs"
            :disabled="!assetTabRef?.workbench?.hasPromptTargets || assetTabRef?.workbench?.promptBatchBusy"
            :title="assetTabRef?.workbench?.hasPromptTargets ? '为视觉状态批量生成绘画提示词，可选仅补缺失或全部重新生成' : '本章暂无视觉状态，请先完成资产提取'"
            @click="assetTabRef?.workbench?.openPromptModal()"
          >
            <LoaderCircle v-if="assetTabRef?.workbench?.promptBatchBusy" :size="14" class="animate-spin" />
            <Sparkles v-else :size="14" />
            批量生成提示词
          </button>
          <button
            class="primary-button h-9 shrink-0 px-3 text-xs"
            :disabled="!assetTabRef?.workbench?.hasGenTargets || assetTabRef?.workbench?.batchBusy"
            :title="assetTabRef?.workbench?.hasGenTargets ? '串行生成视觉状态参考图' : '没有可生图的视觉状态（需先有提示词且未成图）'"
            @click="assetTabRef?.workbench?.runBatchGen()"
          >
            <LoaderCircle v-if="assetTabRef?.workbench?.batchBusy" :size="14" class="animate-spin" />
            批量生图{{ assetTabRef?.workbench?.batchBusy ? ` ${assetTabRef?.workbench?.batchDone}/${assetTabRef?.workbench?.batchTotal}` : '' }}
          </button>
          <button
            class="secondary-button h-9 shrink-0 px-3 text-xs"
            title="资产生图模型与共用属性配置"
            @click="assetTabRef?.workbench?.openConfigDrawer()"
          ><Settings2 :size="14" />生图配置</button>
        </template>
      </PanelGenAssetTab>
      <div v-else class="flex h-full items-center justify-center text-sm text-text-secondary">请先选择章节</div>
    </div>

    <!-- 手动导入资产（外部 AI 代跑）：粘贴 → 解析预览 → 确认后进入审核链路 -->
    <ManualResultImportDialog
      :visible="extractImportVisible"
      title="手动导入资产"
      placeholder="粘贴外部 AI 生成的资产提取结果…"
      z-index-class="z-[130]"
      :parse="parseExtractionPreview"
      @confirm="confirmExtractionImport"
      @close="extractImportVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 长篇项目「资产」面板（分镜页全屏抽屉内容）：资产提取 + 审核 + 资产生图工作台（PanelGenAssetTab 三子视图）。
 * 提取底稿 = 章节原文优先，无原文（从剧本开始）时以漫画剧本兜底并加说明头；
 * 提取上下文 = 原文分析 + 漫画剧本 + 分镜概要（本章最近完成分镜）+ 已有资产，
 * 由提示词模板决定插入哪些（模板没写的变量不会进入提示词）。
 * 确认后写回资产与章节引用，并按文本自动回填本章分镜绑定。
 * 顶部操作按钮经 #actions 插槽注入子 tab 行右侧（信息 = 提取 + 确认；生图工作台 = 批量提示词/生图/配置）。
 */
import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { Check, CheckCircle2, ChevronDown, ClipboardPaste, LoaderCircle, Settings2, Sparkles } from 'lucide-vue-next'
import { useToast } from '@comic/composables/useToast'
import PromptRunBar from '@comic/components/common/PromptRunBar.vue'
import ManualResultImportDialog from '@comic/components/common/ManualResultImportDialog.vue'
import PanelGenAssetTab from '@comic/components/panel-gen/PanelGenAssetTab.vue'
import {
  buildAssetExtractionPrompt,
  buildExtractionSourceText,
  buildPanelsOutline,
  countCandidatesAppearances,
  extractChapterAssets,
  parseAssetExtractionResponse,
} from '@comic/services/assetExtractionService'
import type {
  ComicProject,
  ExtractionApplyMode,
  LongProjectAssetExtractionRun,
  LongProjectStoryboardPanel,
  ModelConfig,
  PromptTemplate,
} from '@comic/types'

const props = defineProps<{
  projectId: string
  /** 当前章节 ID（由主页面侧栏章节树决定）。 */
  chapterId: string
  /** 主页面共享的项目数据（含 loading 后的完整状态）。 */
  project: ComicProject | null
  models: ModelConfig[]
  templates: PromptTemplate[]
  /** 资产接力定位目标（从分镜页跳转时携带，直达工作台具体资产/视觉状态）。 */
  focusTarget?: { assetId: string; variantId?: string } | null
  mutateLongProjectData: (mutate: (data: NonNullable<ComicProject['longProjectData']>) => void) => Promise<void>
}>()

const toast = useToast()

/** 主页面共享的项目数据（computed 保持 .value 读写习惯；只读）。 */
const project = computed(() => props.project) as Ref<ComicProject | null>
const chapterId = computed(() => props.chapterId)

// ========== 页面状态 ==========

/** 资产子 tab：信息（提取审核）｜图片（资产浏览）｜生图工作台；顶栏操作按钮随其切换。 */
const assetView = ref<'info' | 'images' | 'workbench'>('info')
/** 资产视图实例引用：顶栏按钮调用其暴露的确认/工作台批量操作。 */
const assetTabRef = ref<InstanceType<typeof PanelGenAssetTab>>()

// ========== 确认应用方式（合并 / 覆盖） ==========

const APPLY_MODE_KEY = 'comic-long-extract-apply-mode'
/** 确认动作的应用方式，记忆到本地（与发送前确认偏好同一套习惯）。 */
const applyMode = ref<ExtractionApplyMode>(localStorage.getItem(APPLY_MODE_KEY) === 'override' ? 'override' : 'merge')
const applyMenuOpen = ref(false)
const applyMenuRef = ref<HTMLElement>()

/** 两种应用方式的文案：差异只写"谁优先 + 旧状态怎么办"，不写实现细节。 */
const applyOptions: Array<{ value: ExtractionApplyMode; label: string; hint: string }> = [
  { value: 'merge', label: '合并到已有资产', hint: '已有内容优先：只补空缺字段，保留全部旧视觉状态' },
  { value: 'override', label: '覆盖已有资产', hint: '本次结果优先：重写资产信息，删除本次未出现的视觉状态' },
]
const applyModeLabel = computed(() => applyOptions.find((option) => option.value === applyMode.value)?.label ?? '合并到已有资产')
const confirmButtonTitle = computed(() => assetTabRef.value?.canConfirmReview
  ? `按「${applyModeLabel.value}」保存本次审核结果，并自动回填分镜绑定`
  : '暂无待审核的资产提取结果，请先执行提取')

/** 菜单外点击关闭。 */
function onDocumentClick(event: MouseEvent) {
  if (!applyMenuRef.value?.contains(event.target as Node)) applyMenuOpen.value = false
}
watch(applyMenuOpen, (open) => {
  if (open) document.addEventListener('click', onDocumentClick)
  else document.removeEventListener('click', onDocumentClick)
})
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))

/** 执行确认：点主按钮用记忆的方式，点菜单项切换并立即执行。 */
function confirmAssets(mode?: ExtractionApplyMode) {
  const next = mode ?? applyMode.value
  if (mode) {
    applyMode.value = mode
    localStorage.setItem(APPLY_MODE_KEY, mode)
  }
  applyMenuOpen.value = false
  if (next === 'override' && !window.confirm('覆盖会用本次提取结果重写已有资产信息，并删除本次未出现的视觉状态。\n已生成参考图的旧状态也会被删除，是否继续？')) return
  void assetTabRef.value?.confirmReview(next)
}

// ========== 派生数据 ==========

const nodes = computed(() => project.value?.longProjectData?.nodes ?? [])
const chapters = computed(() =>
  nodes.value.filter((node) => node.type === 'chapter').sort((a, b) => a.order - b.order || a.createdAt - b.createdAt),
)
const currentChapter = computed(() => chapters.value.find((chapter) => chapter.id === chapterId.value) ?? null)
const assets = computed(() => project.value?.longProjectData?.assets ?? [])
const chapterAssets = computed(() => project.value?.longProjectData?.chapterAssets ?? [])
const assetExtractionRuns = computed(() => project.value?.longProjectData?.assetExtractionRuns ?? [])
const assetGenConfig = computed(() => project.value?.longProjectData?.assetGenConfig)

/** 本章原文分析 / 漫画剧本文档（资产提取的管线上下文）。 */
const analysisDoc = computed(() => (project.value?.longProjectData?.chapterAnalyses ?? []).find((doc) => doc.chapterId === chapterId.value))
const scriptDoc = computed(() => (project.value?.longProjectData?.chapterScripts ?? []).find((doc) => doc.chapterId === chapterId.value))

/** 本章最近一次已完成分镜（提取出现次数统计与确认后回填绑定的数据源，与分镜页签同口径）。 */
const latestStoryboardRun = computed(() => {
  const chapter = currentChapter.value
  if (!chapter) return null
  return (project.value?.longProjectData?.storyboardRuns ?? [])
    .filter((item) => item.chapterId === chapter.id && item.status === 'completed')
    .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null
})
const panels = computed<LongProjectStoryboardPanel[]>(() => latestStoryboardRun.value?.panels ?? [])

const llmModels = computed(() => props.models.filter((model) => model.category === 'llm'))

/** 章节切换时资产子视图回到「信息」（提取审核为主入口）。 */
watch(chapterId, () => {
  assetView.value = 'info'
})

/** 接力定位：携带目标（分镜页「无参考图」等入口跳转）时直达生图工作台。 */
watch(() => props.focusTarget, (target) => {
  if (target) assetView.value = 'workbench'
}, { immediate: true })

// ========== 资产提取（顶栏信息视图操作区） ==========

/** extract 类型提示词模板。 */
const extractTemplates = computed(() => props.templates.filter((template) => template.type === 'extract').sort((a, b) => a.sortOrder - b.sortOrder))
const extractModelId = ref('')
const extractTemplateId = ref('')

/** 模型/模板列表就绪后初始化默认选择（仅未选择时）。 */
watch([llmModels, extractTemplates], () => {
  if (!extractModelId.value) extractModelId.value = llmModels.value[0]?.id ?? ''
  if (!extractTemplateId.value) extractTemplateId.value = extractTemplates.value[0]?.id ?? ''
}, { immediate: true })

/** 本章提取 run（最新在前）。 */
const chapterExtractRuns = computed(() =>
  assetExtractionRuns.value
    .filter((run) => run.chapterId === chapterId.value)
    .sort((a, b) => b.updatedAt - a.updatedAt))
const latestExtractRun = computed(() => chapterExtractRuns.value[0] ?? null)
const extractBusy = computed(() => latestExtractRun.value?.status === 'running')

/** 提取底稿：原文优先，无原文（从剧本开始）时以剧本兜底。 */
const extractionSourceText = computed(() => buildExtractionSourceText(currentChapter.value?.content ?? '', scriptDoc.value?.content ?? ''))
/** 无原文且剧本非空：顶栏显示「剧本兜底」提示。 */
const scriptFallbackHint = computed(() =>
  !(currentChapter.value?.content ?? '').trim() && Boolean(scriptDoc.value?.content?.trim()))
const extractDisabled = computed(() => !extractionSourceText.value.trim() || !extractModelId.value || !extractTemplateId.value)
const extractActionLabel = computed(() => chapterExtractRuns.value.length ? '重新提取' : '提取资产')

/** 生成最终发送提示词：底稿（原文/剧本兜底）+ 分析 + 剧本 + 分镜概要 + 已有资产。 */
function buildExtractPrompt(): string {
  const template = extractTemplates.value.find((item) => item.id === extractTemplateId.value)
  return buildAssetExtractionPrompt(template?.content ?? '', extractionSourceText.value, {
    analysis: analysisDoc.value?.content ?? '',
    script: scriptDoc.value?.content ?? '',
    panelsOutline: buildPanelsOutline(panels.value),
    existingAssets: assets.value,
  })
}

/** 持久化更新提取 run 的部分字段。 */
function updateExtractRun(runId: string, changes: Partial<LongProjectAssetExtractionRun>) {
  return props.mutateLongProjectData((data) => {
    data.assetExtractionRuns = (data.assetExtractionRuns ?? []).map((run) => run.id === runId ? { ...run, ...changes, updatedAt: Date.now() } : run)
  })
}

/** 执行资产提取（PromptRunBar 已完成发送前确认，prompt 为最终版）。 */
async function runExtraction(prompt: string) {
  const chapter = currentChapter.value
  if (!chapter || !prompt.trim()) return
  const model = llmModels.value.find((item) => item.id === extractModelId.value)
  const template = extractTemplates.value.find((item) => item.id === extractTemplateId.value)
  if (!model || !template) return
  const sourceText = extractionSourceText.value
  const now = Date.now()
  const run: LongProjectAssetExtractionRun = {
    id: uuidv4(), chapterId: chapter.id, sourceContent: sourceText,
    sourceWordCount: sourceText.replace(/\s/g, '').length,
    modelId: model.id, templateId: template.id,
    prompt, status: 'running', candidates: [], createdAt: now, updatedAt: now,
  }
  await props.mutateLongProjectData((data) => {
    data.assetExtractionRuns = [...(data.assetExtractionRuns ?? []), run]
  })
  try {
    const result = await extractChapterAssets({
      model, template, chapterContent: sourceText,
      existingAssets: assets.value,
      analysis: analysisDoc.value?.content ?? '', script: scriptDoc.value?.content ?? '',
      panels: panels.value, prompt,
    })
    await updateExtractRun(run.id, { status: 'completed', candidates: result.candidates, rawResponse: result.rawResponse, error: undefined })
  } catch (error) {
    const message = error instanceof Error ? error.message : '资产提取失败，请重试'
    await updateExtractRun(run.id, { status: 'failed', error: message })
    toast.error(message)
  }
}

/** 失败态的「重新提取」（资产视图 emit）：沿用上次发送的最终提示词。 */
function retryExtraction() {
  const run = latestExtractRun.value
  if (!run?.prompt) return
  void runExtraction(run.prompt)
}

// ========== 资产手动导入（外部 AI 代跑） ==========

const extractImportVisible = ref(false)

/** 资产导入解析预览：返回标题与候选摘要（解析失败抛错）。 */
function parseExtractionPreview(content: string): { title: string; items: string[] } {
  const candidates = parseAssetExtractionResponse(content, assets.value)
  if (!candidates.length) throw new Error('未识别到任何资产，请检查内容是否符合「# 人物 / # 场景 / # 道具」格式。')
  const typeLabel: Record<string, string> = { character: '人物', scene: '场景', prop: '道具' }
  return {
    title: `解析到 ${candidates.length} 项资产候选`,
    items: candidates.map((candidate) => `${typeLabel[candidate.type] ?? candidate.type} · ${candidate.name}（${candidate.decision === 'merge' ? '并入已有资产' : '新建'}）`),
  }
}

/** 确认导入资产：解析为候选 → 创建 completed run → 复用 AssetExtractionReview 审核确认链路。 */
async function confirmExtractionImport(content: string) {
  const chapter = currentChapter.value
  if (!chapter || !content.trim()) return
  if (latestExtractRun.value && !window.confirm('本章已有资产提取结果，导入将生成新一版候选，是否继续？')) return
  try {
    const candidates = parseAssetExtractionResponse(content, assets.value)
    if (!candidates.length) throw new Error('未识别到任何资产，请检查格式。')
    if (panels.value.length) {
      const counts = countCandidatesAppearances(candidates, panels.value)
      for (const candidate of candidates) candidate.panelAppearances = counts[candidate.id] ?? 0
    }
    const sourceText = extractionSourceText.value
    const now = Date.now()
    const run: LongProjectAssetExtractionRun = {
      id: uuidv4(), chapterId: chapter.id, sourceContent: sourceText,
      sourceWordCount: sourceText.replace(/\s/g, '').length,
      modelId: '', templateId: '', prompt: '',
      status: 'completed', candidates, rawResponse: content, source: 'manual',
      createdAt: now, updatedAt: now,
    }
    await props.mutateLongProjectData((data) => {
      data.assetExtractionRuns = [...(data.assetExtractionRuns ?? []), run]
    })
    extractImportVisible.value = false
    toast.success(`已导入 ${candidates.length} 项资产候选，请审核确认`)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '资产解析失败')
  }
}
</script>

<style scoped>
.primary-button { display: flex; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 0.5rem; background: #06b6d4; padding: 0.5rem 0.75rem; font-size: 0.75rem; font-weight: 500; color: #020617; transition: background-color 0.15s ease; }
.primary-button:hover { background: #22d3ee; }
.primary-button:disabled { cursor: not-allowed; opacity: 0.4; }
/* 分体确认按钮：scoped 样式特异性高于 Tailwind 工具类，圆角 / 内边距 / 分隔线必须写在这里 */
.split-main { padding: 0 0.75rem; border-top-right-radius: 0; border-bottom-right-radius: 0; }
.split-toggle { padding: 0 0.4rem; border-top-left-radius: 0; border-bottom-left-radius: 0; border-left: 1px solid rgba(2, 6, 23, 0.25); }
.primary-button:disabled:hover { background: #06b6d4; }
.apply-option { display: flex; width: 100%; align-items: flex-start; gap: 0.5rem; padding: 0.5rem 0.75rem; text-align: left; transition: background-color 0.15s ease; }
.apply-option:hover { background: var(--bg-elevated); }
.secondary-button { display: inline-flex; align-items: center; justify-content: center; gap: 0.25rem; border-radius: 0.5rem; border: 1px solid var(--border-default); color: var(--text-secondary); font-weight: 500; transition: color 0.15s ease, border-color 0.15s ease; background: transparent; }
.secondary-button:hover { color: var(--text-primary); border-color: var(--border-strong); }
</style>

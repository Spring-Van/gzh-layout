<template>
  <!-- 单根节点：顶级页签内直接填充父容器 -->
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
        :storyboard-runs="storyboardRuns"
        :chapter-names="chapterNames"
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

          <!-- 确认本章资产：唯一行为（本次结果为准），跨章影响在确认弹窗里列明细 -->
          <button
            class="primary-button h-9 shrink-0 px-3 text-xs"
            :disabled="!assetTabRef?.canConfirmReview"
            :title="confirmButtonTitle"
            @click="confirmAssets()"
          >
            <CheckCircle2 :size="14" />
            确认本章资产
          </button>
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

    <!-- 确认本章资产前的明细弹窗：覆盖严格全删、不做跨章保护，跨章影响必须先看见 -->
    <ConfirmExtractionDialog
      v-model="confirmDialogVisible"
      :items="dropPlan"
      @confirm="runConfirm"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 长篇项目「资产」顶级页签（2026-09-18 起与分镜平级，位于其左侧）：资产提取 + 审核 + 资产生图工作台（PanelGenAssetTab 三子视图）。
 * 新管线顺序为 原文 → 分析 → 剧本 → 资产 → 分镜：先在此确认本章资产与视觉状态（含参考图），分镜生成时注入本章资产清单。
 * 提取底稿 = 章节原文优先，无原文（从剧本开始）时以漫画剧本兜底并加说明头；
 * 提取上下文 = 原文分析 + 漫画剧本 + 已有资产，
 * 由提示词模板决定插入哪些（模板没写的变量不会进入提示词）。
 * 确认后写回资产与章节引用，并按文本自动回填本章分镜绑定（旧顺序章节有分镜时）。
 * 顶部操作按钮经 #actions 插槽注入子 tab 行右侧（信息 = 提取 + 确认；生图工作台 = 批量提示词/生图/配置）。
 */
import { computed, ref, watch, type Ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { CheckCircle2, ClipboardPaste, LoaderCircle, Settings2, Sparkles } from 'lucide-vue-next'
import { useToast } from '@comic/composables/useToast'
import PromptRunBar from '@comic/components/common/PromptRunBar.vue'
import ManualResultImportDialog from '@comic/components/common/ManualResultImportDialog.vue'
import ConfirmExtractionDialog from '@comic/components/ConfirmExtractionDialog.vue'
import PanelGenAssetTab from '@comic/components/panel-gen/PanelGenAssetTab.vue'
import {
  buildAssetExtractionPrompt,
  buildExtractionSourceText,
  countCandidatesAppearances,
  extractChapterAssets,
  parseAssetExtractionResponse,
} from '@comic/services/assetExtractionService'
import { selectDroppedVariants } from '@comic/services/assetExtractionConfirm'
import type {
  ComicProject,
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

// ========== 确认本章资产（唯一行为：本次结果为准） ==========

/**
 * 覆盖将删除的旧状态明细：逐条列出「资产 · 状态」、引用它的其他章节、图片数。
 * 用于确认弹窗逐条核对 —— 覆盖是严格全删（不跨章感知），其他章节正在用的状态也会被删掉。
 */
const dropPlan = computed(() => {
  const run = latestExtractRun.value
  if (!run) return []
  const chapterNameById = new Map(chapters.value.map((chapter) => [chapter.id, chapter.name]))
  const seen = new Set<string>()
  const items: Array<{ key: string; assetName: string; variantName: string; chapters: string[]; imageCount: number }> = []
  for (const candidate of run.candidates) {
    if (candidate.decision === 'ignore' || candidate.decision === 'pending' || !candidate.suggestedAssetId) continue
    const asset = assets.value.find((item) => item.id === candidate.suggestedAssetId)
    if (!asset) continue
    for (const variant of selectDroppedVariants(asset, candidate)) {
      if (seen.has(variant.id)) continue
      seen.add(variant.id)
      items.push({
        key: variant.id,
        assetName: asset.name,
        variantName: variant.name,
        chapters: [...new Set(chapterAssets.value
          .filter((entry) => entry.variantId === variant.id && entry.chapterId !== chapterId.value)
          .map((entry) => chapterNameById.get(entry.chapterId) ?? '其他章节'))],
        imageCount: (variant.referenceImageIds?.length ?? 0) + (variant.generatedImageIds?.length ?? 0),
      })
    }
  }
  return items
})

const confirmDialogVisible = ref(false)
const confirmButtonTitle = computed(() => assetTabRef.value?.canConfirmReview
  ? '以本次提取结果为准保存本章资产，并重算分镜绑定'
  : '暂无待审核的资产提取结果，请先执行提取')

/** 点确认：先弹明细弹窗（跨章影响必须先看见），确认后才真正执行。 */
function confirmAssets() {
  if (!assetTabRef.value?.canConfirmReview) return
  confirmDialogVisible.value = true
}

/** 弹窗内确认：执行覆盖并关闭。 */
async function runConfirm() {
  confirmDialogVisible.value = false
  await assetTabRef.value?.confirmReview()
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
/** 项目全部章节分镜（资产引用统计：哪个视觉状态的哪张图被哪些分镜在用）。 */
const storyboardRuns = computed(() => project.value?.longProjectData?.storyboardRuns ?? [])
/** 章节 id → 名称（引用文案展示用，避免在子组件里再解一遍章节树）。 */
const chapterNames = computed(() => Object.fromEntries(chapters.value.map((chapter) => [chapter.id, chapter.name])))
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

/** 生成最终发送提示词：底稿（原文/剧本兜底）+ 分析 + 剧本 + 已有资产。 */
function buildExtractPrompt(): string {
  const template = extractTemplates.value.find((item) => item.id === extractTemplateId.value)
  return buildAssetExtractionPrompt(template?.content ?? '', extractionSourceText.value, {
    analysis: analysisDoc.value?.content ?? '',
    script: scriptDoc.value?.content ?? '',
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
    items: candidates.map((candidate) => `${typeLabel[candidate.type] ?? candidate.type} · ${candidate.name}（${candidate.decision === 'merge' ? '沿用已有资产' : '新建'}）`),
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
    // 出现数统计：有分镜按分镜、无分镜按剧本行（新管线资产先于分镜提取，剧本为常态输入）
    const counts = countCandidatesAppearances(candidates, panels.value, scriptDoc.value?.content ?? '')
    for (const candidate of candidates) candidate.panelAppearances = counts[candidate.id] ?? 0
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
.primary-button:disabled:hover { background: #06b6d4; }
.secondary-button { display: inline-flex; align-items: center; justify-content: center; gap: 0.25rem; border-radius: 0.5rem; border: 1px solid var(--border-default); color: var(--text-secondary); font-weight: 500; transition: color 0.15s ease, border-color 0.15s ease; background: transparent; }
.secondary-button:hover { color: var(--text-primary); border-color: var(--border-strong); }
</style>

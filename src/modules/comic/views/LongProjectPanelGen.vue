<template>
  <div class="flex h-screen flex-col overflow-hidden bg-app-bg text-text-primary">
    <!-- 顶栏：返回 + 章节切换 + 操作按钮（与短篇生图页同构） -->
    <header class="relative flex h-14 shrink-0 items-center gap-3 border-b border-border-subtle bg-surface px-4">
      <button class="icon-button" title="返回长篇项目" @click="goBack"><ArrowLeft :size="18" /></button>

      <div class="min-w-0 shrink-0">
        <p class="truncate text-sm font-semibold text-text-primary">{{ project?.name || '分镜生图' }}</p>
        <p class="text-[11px] text-text-muted">{{ describedCount }} 已描述 · {{ completedCount }} 已成图</p>
      </div>

      <!-- 章节切换：下拉框内嵌项目树，固定高度超出滚动 -->
      <div class="relative shrink-0">
        <button
          class="secondary-button h-9 max-w-52 px-3 text-xs"
          title="切换章节"
          @click="toggleChapterMenu"
        >
          <BookOpen :size="14" />
          <span class="truncate">{{ currentChapter?.name || '选择章节' }}</span>
          <ChevronDown :size="14" class="text-text-muted transition-transform" :class="chapterMenuVisible ? 'rotate-180' : ''" />
        </button>

        <!-- 下拉树面板：透明遮罩点击外部关闭 -->
        <div v-if="chapterMenuVisible" class="fixed inset-0 z-40" @click="chapterMenuVisible = false" />
        <Transition name="fade">
          <div
            v-if="chapterMenuVisible"
            class="absolute left-0 top-full z-50 mt-1.5 w-[280px] overflow-hidden rounded-lg border border-border-subtle bg-surface shadow-xl shadow-black/20"
          >
            <div class="custom-scrollbar max-h-72 overflow-y-auto p-2">
              <LongProjectTree
                :project-name="project?.name || '长篇项目'"
                :nodes="nodes"
                :selected-id="chapterId || null"
                :expanded-ids="treeExpandedIds"
                @select="onTreeSelect"
                @toggle="toggleTreeFolder"
              />
              <p v-if="!chapters.length" class="px-2 py-4 text-center text-xs text-text-muted">暂无章节</p>
            </div>
          </div>
        </Transition>
      </div>

      <div class="ml-auto flex shrink-0 items-center gap-2">
        <button
          class="secondary-button h-9 px-3 text-xs"
          :disabled="!panels.length || batchPromptBusy"
          :title="!panels.length ? '本章暂无分镜' : '依次推导缺失分镜的画面描述（一次一条，前后自动关联）'"
          @click="promptModalVisible = true"
        >
          <LoaderCircle v-if="batchPromptBusy" :size="14" class="animate-spin" />
          <Sparkles v-else :size="14" />
          批量推导描述
        </button>
        <button
          class="primary-button h-9 px-3 text-xs"
          :disabled="!genTargets.length || batchGenBusy"
          :title="!genTargets.length ? '没有可生图的分镜（需先有画面描述且未成图）' : `串行生成 ${genTargets.length} 个分镜画面`"
          @click="runBatchGen"
        >
          <LoaderCircle v-if="batchGenBusy" :size="14" class="animate-spin" />
          批量生图{{ batchGenBusy ? ` ${batchGenDone}/${batchGenTotal}` : genTargets.length ? `（${genTargets.length}）` : '' }}
        </button>
        <button v-if="batchGenBusy" class="secondary-button h-9 px-3 text-xs" @click="cancelBatchGen">取消</button>

        <button
          class="flex h-9 items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!completedCount || exportBusy"
          :title="!completedCount ? '本章还没有已采纳的成图' : `导出 ${completedCount} 张已采纳成图`"
          @click="exportImages"
        >
          <LoaderCircle v-if="exportBusy" :size="14" class="animate-spin" />
          <Download v-else :size="14" />
          导出发布
        </button>

        <!-- 绘图配置：点击打开抽屉（与短篇生图页一致） -->
        <button
          class="secondary-button h-9 px-3 text-xs"
          title="设置绘画模型与共用属性（风格提示词/参考图）"
          @click="configDrawerVisible = true"
        ><SlidersHorizontal :size="14" />绘图配置</button>
      </div>
    </header>

    <!-- 主体 -->
    <div v-if="loading" class="flex flex-1 items-center justify-center text-sm text-text-secondary">正在加载分镜数据...</div>

    <div v-else-if="!panels.length" class="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <ListTree :size="30" class="mb-4 text-text-muted" />
      <h2 class="text-base font-medium text-text-primary">{{ emptyTitle }}</h2>
      <p class="mt-2 max-w-md text-sm text-text-secondary">{{ emptyMessage }}</p>
      <button class="primary-button mt-5" @click="goBack"><ArrowLeft :size="16" />返回长篇项目</button>
    </div>

    <div v-else class="flex min-h-0 flex-1 gap-3 p-3">
      <!-- 左：分镜列表（宽度与短篇生图页一致） -->
      <div class="w-[20%] min-w-[220px] max-w-[280px] shrink-0 overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-lg shadow-black/20">
        <PanelListSidebar :items="panelItems" :current-index="currentIndex" @select="currentIndex = $event" @infer="inferFromSidebar" />
      </div>

      <!-- 中：成图预览（上）+ 资产绑定三 tab（下） -->
      <div
        class="flex flex-1 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-lg shadow-black/20"
        style="max-width: 24%; min-width: 260px"
      >
        <div class="min-h-0 flex-1 overflow-hidden">
          <PanelPreview
            :panel="currentPanel"
            :artwork="currentArtwork"
            :is-generating="currentArtwork?.genStatus === 'running'"
            @generate="generatePanelImage(currentPanel)"
            @adopt="adoptImage"
            @remove-gen-image="removeGenImage"
            @preview="openPreview"
          />
        </div>
        <div class="h-52 shrink-0 border-t border-border-subtle">
          <PanelAssetTabs
            :panel="currentPanel"
            :assets="assets"
            @update-variant-images="updateVariantImages"
            @preview="openPreview"
          />
        </div>
      </div>

      <!-- 右：画面描述（提示词模式单一输入框，底部参考图设置） -->
      <div
        class="flex-1 shrink-0 overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-lg shadow-black/20"
        style="min-width: 440px"
      >
        <PanelPromptPanel
          :panel="currentPanel"
          :artwork="currentArtwork"
          :assets="assets"
          :prompt-busy="promptBusyIds.has(currentPanel.id)"
          :generating="currentArtwork?.genStatus === 'running'"
          :ref-groups="currentRefGroups"
          :generated-image="currentArtwork?.selectedImageId ?? currentArtwork?.generatedImageIds?.at(-1) ?? null"
          @infer="singleModalVisible = true"
          @save="savePromptEdit"
          @single-generate="runSingleGenerate"
        />
      </div>
    </div>


    <!-- 批量推导确认弹窗 -->
    <PanelPromptGenerateModal
      v-model="promptModalVisible"
      :llm-models="llmModels"
      :templates="panelPromptTemplates"
      :default-model-id="config.promptModelId"
      :default-template-id="config.promptTemplateId"
      mode="batch"
      :missing-count="missingInferCount"
      :total-count="panels.length"
      :busy="batchPromptBusy"
      :build-prompt="buildBatchPromptPreview"
      @confirm="runBatchPrompts"
    />

    <!-- 单镜推导确认弹窗 -->
    <PanelPromptGenerateModal
      v-model="singleModalVisible"
      :llm-models="llmModels"
      :templates="panelPromptTemplates"
      :default-model-id="config.promptModelId"
      :default-template-id="config.promptTemplateId"
      mode="single"
      :panel-order="currentPanel?.order ?? 0"
      :busy="currentPanel ? promptBusyIds.has(currentPanel.id) : false"
      :build-prompt="buildSinglePromptPreview"
      @confirm="runSinglePrompt"
    />

    <!-- 大图预览 -->
    <AssetImagePreviewModal
      v-model="previewVisible"
      :images="previewImages"
      :image-index="previewIndex"
      :alt="previewAlt"
      @remove="removePreviewImage"
    />

    <!-- 绘图配置抽屉（复用短篇生图页同款组件） -->
    <ImageConfigDrawer
      v-model="configDrawerVisible"
      :image-models="imageModels"
      :initial-config="imageGenConfig"
      :project-id="projectId"
      @save="handleSaveImageConfig"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 长篇分镜生图工作台（独立页面，不影响短篇 PageEditor）：
 * 左列分镜列表 → 中列成图预览 + 资产绑定三 tab（人物/场景/道具）→ 右列画面描述输入框（提示词模式）。
 * 底部栏承载批量推导/批量生图/导出发布与绘图配置。画面描述按「依次推导」执行
 * （滑动窗口携带前文），生图自动携带绑定资产参考图。
 * 数据持久化走 panelArtworks（panelId 关联），重跑分镜由迁移逻辑保留/标记过期。
 */
import { computed, onMounted, reactive, ref, toRaw, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, BookOpen, ChevronDown, Download, ListTree, LoaderCircle, SlidersHorizontal, Sparkles } from 'lucide-vue-next'
import { comicDb, comicDownload } from '@/api/comic'
import { useToast } from '@comic/composables/useToast'
import { imageGenerationService } from '@comic/services/imageGenerationService'
import {
  DEFAULT_PANEL_PROMPT_TEMPLATE,
  DEFAULT_PREV_PANEL_WINDOW,
  buildChapterOutline,
  buildPanelPromptPrompt,
  buildStyleContext,
  inferPanelPrompt,
  resolvePanelBindings,
  type PrevPanelContextEntry,
} from '@comic/services/panelPromptService'
import { buildAssetNameIndex, computeAutoBindings } from '@comic/services/promptAssetService'
import { defaultVariant } from '@comic/services/storyboardService'
import PanelListSidebar from '@comic/components/panel-gen/PanelListSidebar.vue'
import LongProjectTree from '@comic/components/LongProjectTree.vue'
import PanelPreview from '@comic/components/panel-gen/PanelPreview.vue'
import PanelAssetTabs from '@comic/components/panel-gen/PanelAssetTabs.vue'
import PanelPromptPanel, { type PanelRefConfig, type TypedRefGroup } from '@comic/components/panel-gen/PanelPromptPanel.vue'
import PanelPromptGenerateModal from '@comic/components/panel-gen/PanelPromptGenerateModal.vue'
import AssetImagePreviewModal from '@comic/components/AssetImagePreviewModal.vue'
import ImageConfigDrawer from '@comic/components/ImageConfigDrawer.vue'
import { migrateLegacyImageGenConfig } from '@comic/utils/sharedBlocks'
import type { PanelListItem } from '@comic/components/panel-gen/PanelListSidebar.vue'
import type {
  ComicProject,
  ImageGenConfig,
  LongProjectPanelArtwork,
  LongProjectStoryboardPanel,
  ModelConfig,
  PromptTemplate,
} from '@comic/types'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const projectId = String(route.params.projectId)

/** 生图参考图上限（与短篇生图页一致）。 */
const MAX_REF_IMAGES = 14

// ========== 页面状态 ==========

const loading = ref(true)
const project = ref<ComicProject | null>(null)
const models = ref<ModelConfig[]>([])
const templates = ref<PromptTemplate[]>([])
const chapterId = ref(String(route.params.chapterId || ''))
const currentIndex = ref(0)

/** 生图/推导配置：localStorage 按项目持久化。 */
interface PanelGenConfig {
  imageModelId: string
  aspectRatio: string
  resolution: string
  quality: string
  promptModelId?: string
  promptTemplateId?: string
}
const config = reactive<PanelGenConfig>({
  imageModelId: '',
  aspectRatio: '3:4',
  resolution: '1K',
  quality: '',
  promptModelId: '',
  promptTemplateId: '',
})

/** 推导中的分镜（panelId 集合）。 */
const promptBusyIds = reactive(new Set<string>())
const batchPromptBusy = ref(false)
const batchGenBusy = ref(false)
const batchGenDone = ref(0)
const batchGenTotal = ref(0)
let batchGenCancelled = false

const promptModalVisible = ref(false)
const singleModalVisible = ref(false)

/** 左栏列表快捷推导：选中该分镜并打开单镜推导弹窗。 */
function inferFromSidebar(index: number) {
  currentIndex.value = index
  singleModalVisible.value = true
}
const chapterMenuVisible = ref(false)
const configDrawerVisible = ref(false)
const exportBusy = ref(false)

/** 项目级绘图配置（绘画模型 + 共用属性），与短篇生图页共用存储。 */
const imageGenConfig = ref<ImageGenConfig>(migrateLegacyImageGenConfig(null))
const previewVisible = ref(false)
const previewImages = ref<string[]>([])
const previewIndex = ref(0)
const previewAlt = ref('')

// ========== 派生数据 ==========

const nodes = computed(() => project.value?.longProjectData?.nodes ?? [])
const chapters = computed(() =>
  nodes.value.filter((node) => node.type === 'chapter').sort((a, b) => a.order - b.order || a.createdAt - b.createdAt),
)
const currentChapter = computed(() => chapters.value.find((chapter) => chapter.id === chapterId.value) ?? null)
const assets = computed(() => project.value?.longProjectData?.assets ?? [])
const panelArtworks = computed(() => project.value?.longProjectData?.panelArtworks ?? [])
const storyboardRuns = computed(() => project.value?.longProjectData?.storyboardRuns ?? [])

/** 本章最近一次已完成分镜（生图工作台只消费完成态分镜）。 */
const currentRun = computed(() => {
  const chapter = currentChapter.value
  if (!chapter) return undefined
  return storyboardRuns.value
    .filter((run) => run.chapterId === chapter.id && run.status === 'completed')
    .sort((a, b) => b.updatedAt - a.updatedAt)[0]
})
const panels = computed(() => currentRun.value?.panels ?? [])
const chapterOutline = computed(() => buildChapterOutline(panels.value))

/** 空态文案：按本章最近一次分镜 run 的状态区分，便于定位「进了工作台却空白」的原因。 */
const latestChapterRun = computed(() => {
  const chapter = currentChapter.value
  if (!chapter) return undefined
  return storyboardRuns.value
    .filter((run) => run.chapterId === chapter.id)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0]
})
const emptyTitle = computed(() => {
  if (!currentChapter.value) return '请选择章节'
  const status = latestChapterRun.value?.status
  if (status === 'running') return '分镜正在生成中'
  if (status === 'failed') return '分镜生成失败'
  return '本章尚未生成分镜'
})
const emptyMessage = computed(() => {
  if (!currentChapter.value) return '请先在顶部选择要处理的章节。'
  const run = latestChapterRun.value
  if (run?.status === 'running') return '分镜生成仍在进行，请回到长篇项目的分镜页等待完成后再进入工作台。'
  if (run?.status === 'failed') return `最近一次分镜生成失败：${run.error ?? '未知错误'}。请回到长篇项目重新执行「生成分镜」。`
  return '分镜生图工作台依赖已完成的分镜结果。请先回到长篇项目，在原文底部执行「生成分镜」。'
})

/** panelId → artwork 映射（仅本章）。 */
const artworkMap = computed(() => {
  const map = new Map<string, LongProjectPanelArtwork>()
  if (!currentChapter.value) return map
  for (const artwork of panelArtworks.value) {
    if (artwork.chapterId === currentChapter.value.id) map.set(artwork.panelId, artwork)
  }
  return map
})

const panelItems = computed<PanelListItem[]>(() =>
  panels.value.map((panel) => ({ panel, artwork: artworkMap.value.get(panel.id) })),
)
const currentPanel = computed(() => panels.value[currentIndex.value] ?? panels.value[0])
const currentArtwork = computed(() => (currentPanel.value ? artworkMap.value.get(currentPanel.value.id) : undefined))

const describedCount = computed(() => panelItems.value.filter((item) => item.artwork?.imagePrompt?.trim()).length)
const completedCount = computed(() => panelItems.value.filter((item) => item.artwork?.selectedImageId).length)

const llmModels = computed(() => models.value.filter((model) => model.category === 'llm'))
const imageModels = computed(() => models.value.filter((model) => model.category === 'image'))
const panelPromptTemplates = computed(() =>
  templates.value.filter((template) => template.type === 'panel-prompt').sort((a, b) => a.sortOrder - b.sortOrder),
)

const styleContext = computed(() =>
  buildStyleContext(project.value?.imageGenConfig?.sharedBlocks ?? [], project.value?.comicConfig?.paintingStyle ?? ''),
)
const imageModelName = computed(() => imageModels.value.find((model) => model.id === config.imageModelId)?.name)

/** 需要推导的分镜：无描述 / 推导失败 / 已过期。 */
function needsInfer(panel: LongProjectStoryboardPanel): boolean {
  const artwork = artworkMap.value.get(panel.id)
  if (!artwork?.imagePrompt?.trim()) return true
  return artwork.promptStatus === 'failed' || artwork.promptStatus === 'stale'
}
const missingInferCount = computed(() => panels.value.filter((panel) => needsInfer(panel)).length)

/** 批量生图目标：有描述、未成图、未在生成中。 */
const genTargets = computed(() =>
  panels.value.filter((panel) => {
    const artwork = artworkMap.value.get(panel.id)
    return Boolean(artwork?.imagePrompt?.trim()) && !artwork?.selectedImageId && artwork?.genStatus !== 'running'
  }),
)

/** 当前分镜参考图分组（按类型，右栏「参考图设置」勾选用）。 */
const currentRefGroups = computed<TypedRefGroup[]>(() => {
  const panel = currentPanel.value
  if (!panel) return []
  const groups: TypedRefGroup[] = [
    { type: 'character', images: [] },
    { type: 'scene', images: [] },
    { type: 'prop', images: [] },
    { type: 'style', images: [] },
  ]
  for (const { asset, variant } of resolvePanelBindings(panel, assets.value)) {
    const group = groups.find((item) => item.type === asset.type)
    group?.images.push(...variant.referenceImageIds)
  }
  const styleGroup = groups.find((item) => item.type === 'style')!
  styleGroup.images.push(
    ...(project.value?.imageGenConfig?.sharedBlocks ?? [])
      .filter((block) => block.enableRefImages)
      .flatMap((block) => block.referenceImages),
  )
  return groups
})

// ========== 持久化（串行队列，与 LongProject 同一模式） ==========

let persistQueue: Promise<unknown> = Promise.resolve()
const runPersistTask = (task: () => Promise<void>): Promise<void> => {
  const run = persistQueue.then(task, task)
  persistQueue = run.then(() => undefined, () => undefined)
  return run
}
/** 基于最新数据做局部修改后持久化（patch 在队列任务内计算，避免旧快照覆盖）。 */
const mutateLongProjectData = (mutate: (data: NonNullable<ComicProject['longProjectData']>) => void) =>
  runPersistTask(async () => {
    if (!project.value) return
    const current = project.value.longProjectData ?? { nodes: [] }
    const draft = JSON.parse(JSON.stringify(current)) as NonNullable<ComicProject['longProjectData']>
    mutate(draft)
    const updated: ComicProject = {
      ...project.value,
      longProjectData: JSON.parse(JSON.stringify(draft)),
      updatedAt: Date.now(),
    }
    await comicDb.saveProject(updated)
    project.value = updated
  })

/** 新增/更新分镜画面记录。 */
function upsertArtwork(panelId: string, patch: Partial<LongProjectPanelArtwork>) {
  const chapter = currentChapter.value
  const panel = panels.value.find((item) => item.id === panelId)
  if (!chapter || !panel) return Promise.resolve()
  return mutateLongProjectData((data) => {
    data.panelArtworks ??= []
    const index = data.panelArtworks.findIndex((item) => item.panelId === panelId)
    const now = Date.now()
    if (index >= 0) {
      data.panelArtworks[index] = { ...data.panelArtworks[index], ...patch, updatedAt: now }
    } else {
      data.panelArtworks.push({
        panelId,
        chapterId: chapter.id,
        promptStatus: 'none',
        genStatus: 'none',
        ...patch,
        updatedAt: now,
      })
    }
  })
}

/** 更换资产视觉状态参考图：替换式写回资产库并持久化（对所有引用该资产的分镜生效）。 */
function updateVariantImages(payload: { assetId: string; variantId: string; images: string[] }) {
  void mutateLongProjectData((data) => {
    data.assets ??= []
    const asset = data.assets.find((item) => item.id === payload.assetId)
    if (!asset) return
    const variant = asset.variants.find((item) => item.id === payload.variantId)
    if (!variant) return
    variant.referenceImageIds = [...payload.images]
    variant.updatedAt = Date.now()
    asset.updatedAt = Date.now()
  })
}

// ========== 画面描述推导 ==========

/** 模板解析：空模板 id / 未命中走内置默认模板，返回内容与自定义输出协议。 */
function resolveTemplate(templateId?: string): { content: string; outputProtocol?: string } {
  const template = templateId ? panelPromptTemplates.value.find((item) => item.id === templateId) : undefined
  return {
    content: template?.content ?? DEFAULT_PANEL_PROMPT_TEMPLATE,
    outputProtocol: template?.outputProtocol,
  }
}

/** 滑动窗口前文：前 K 镜 + 各自已推导描述（批量推导时随进度动态刷新）。 */
function prevEntriesOf(index: number): PrevPanelContextEntry[] {
  const start = Math.max(0, index - DEFAULT_PREV_PANEL_WINDOW)
  const entries: PrevPanelContextEntry[] = []
  for (let i = start; i < index; i++) {
    const panel = panels.value[i]
    if (!panel) continue
    entries.push({ panel, prompt: artworkMap.value.get(panel.id)?.imagePrompt ?? '' })
  }
  return entries
}

/** 拼装单镜最终提示词（输出协议取模板自定义，未自定义则不附加任何输出限制）。 */
function buildPromptForPanel(panel: LongProjectStoryboardPanel, index: number, template: { content: string; outputProtocol?: string }): string {
  return buildPanelPromptPrompt({
    templateContent: template.content,
    outputProtocol: template.outputProtocol,
    panel: toRaw(panel),
    chapterOutline: chapterOutline.value,
    prevEntries: prevEntriesOf(index),
    assets: assets.value.map(toRaw),
    styleContext: styleContext.value,
    targetImageModel: imageModelName.value,
  })
}

/** 弹窗回调的模板 → 拼装参数（null = 内置默认模板）。 */
function toPromptTemplateArg(template: PromptTemplate | null): { content: string; outputProtocol?: string } {
  return template ? { content: template.content, outputProtocol: template.outputProtocol } : { content: DEFAULT_PANEL_PROMPT_TEMPLATE }
}

/** 批量弹窗预览：按范围取首个目标分镜拼装示例。 */
function buildBatchPromptPreview(template: PromptTemplate | null, scope?: 'missing' | 'all'): string {
  const firstIndex = scope === 'all' ? 0 : panels.value.findIndex((panel) => needsInfer(panel))
  if (firstIndex < 0) return ''
  return buildPromptForPanel(panels.value[firstIndex], firstIndex, toPromptTemplateArg(template))
}

/** 单镜弹窗预览：当前分镜的最终提示词（可在弹窗内编辑）。 */
function buildSinglePromptPreview(template: PromptTemplate | null): string {
  if (!currentPanel.value) return ''
  return buildPromptForPanel(currentPanel.value, currentIndex.value, toPromptTemplateArg(template))
}

/** 批量推导：按分镜顺序依次执行，每镜一次 LLM 调用，前文滑动窗口自动关联。 */
async function runBatchPrompts(options: { modelId: string; templateId: string; scope?: 'missing' | 'all' }) {
  const model = llmModels.value.find((item) => item.id === options.modelId)
  if (!model) return
  const scope = options.scope ?? 'missing'
  const template = resolveTemplate(options.templateId)
  const targets = panels.value
    .map((panel, index) => ({ panel, index }))
    .filter(({ panel }) => scope === 'all' || needsInfer(panel))
  if (!targets.length) {
    toast.warning(scope === 'all' ? '本章暂无分镜' : '所有分镜都已有描述，可切换为「全部重新推导」')
    return
  }
  promptModalVisible.value = false
  batchPromptBusy.value = true
  config.promptModelId = options.modelId
  config.promptTemplateId = options.templateId
  saveConfig()
  targets.forEach(({ panel }) => promptBusyIds.add(panel.id))
  let failed = 0
  for (const { panel, index } of targets) {
    try {
      await upsertArtwork(panel.id, { promptStatus: 'running' })
      const prompt = buildPromptForPanel(panel, index, template)
      const result = await inferPanelPrompt({ model: toRaw(model), prompt })
      await upsertArtwork(panel.id, { imagePrompt: result, promptSource: 'inferred', promptStatus: 'done' })
    } catch (error) {
      failed += 1
      console.error(`[分镜推导] 分镜${panel.order} 失败:`, error)
      await upsertArtwork(panel.id, { promptStatus: 'failed' })
    } finally {
      promptBusyIds.delete(panel.id)
    }
  }
  batchPromptBusy.value = false
  toast[failed ? 'warning' : 'success'](`推导完成：成功 ${targets.length - failed}，失败 ${failed}`)
}

/** 单镜推导：弹窗确认后执行（prompt 可在弹窗内编辑）。 */
async function runSinglePrompt(options: { modelId: string; templateId: string; prompt?: string }) {
  const panel = currentPanel.value
  const model = llmModels.value.find((item) => item.id === options.modelId)
  if (!panel || !model) return
  singleModalVisible.value = false
  config.promptModelId = options.modelId
  config.promptTemplateId = options.templateId
  saveConfig()
  promptBusyIds.add(panel.id)
  try {
    await upsertArtwork(panel.id, { promptStatus: 'running' })
    const prompt =
      options.prompt?.trim() || buildPromptForPanel(panel, currentIndex.value, resolveTemplate(options.templateId))
    const result = await inferPanelPrompt({ model: toRaw(model), prompt })
    await upsertArtwork(panel.id, { imagePrompt: result, promptSource: 'inferred', promptStatus: 'done' })
    toast.success('画面描述已生成')
  } catch (error) {
    console.error('[分镜推导] 单镜失败:', error)
    await upsertArtwork(panel.id, { promptStatus: 'failed' })
    toast.error(error instanceof Error ? error.message : '画面描述推导失败')
  } finally {
    promptBusyIds.delete(panel.id)
  }
}

/** 人工编辑画面描述。 */
function savePromptEdit(prompt: string) {
  const panel = currentPanel.value
  if (!panel) return
  void upsertArtwork(panel.id, { imagePrompt: prompt, promptSource: 'manual', promptStatus: 'done' })
  syncCurrentPanelBindings(prompt)
}

/**
 * 自动绑定同步：扫描当前分镜文本（画面/对白/旁白 + 最新提示词），
 * 出现资产名且未绑定 → 自动添加（延续上一镜同资产视觉状态，否则章节范围默认）；
 * auto-text 绑定且名称消失 → 自动移除；其余来源绑定不动。
 */
function syncCurrentPanelBindings(prompt?: string) {
  const runId = currentRun.value?.id
  const panel = currentPanel.value
  const chapter = currentChapter.value
  if (!runId || !panel || !chapter) return
  const index = buildAssetNameIndex(assets.value)
  const chapterOrders = Object.fromEntries(chapters.value.map((item) => [item.id, item.order]))
  const prevPanel = panels.value.find((item) => item.order === panel.order - 1)
  const prevVariants = new Map(
    (prevPanel?.assetBindings ?? []).filter((binding) => binding.assetId && binding.visualVersionId).map((binding) => [binding.assetId!, binding.visualVersionId!]),
  )
  const scanPanel = prompt === undefined ? toRaw(panel) : { ...toRaw(panel), imagePrompt: prompt }
  const next = computeAutoBindings(scanPanel, index, (asset) => {
    const continued = prevVariants.get(asset.id)
    return asset.variants.find((variant) => variant.id === continued) ?? defaultVariant(asset, chapter.id, chapterOrders)
  })
  if (!next) return
  void mutateLongProjectData((data) => {
    const run = (data.storyboardRuns ?? []).find((item) => item.id === runId)
    if (!run) return
    run.panels = run.panels.map((item) => (item.id === panel.id ? { ...item, assetBindings: next } : item))
    run.updatedAt = Date.now()
  })
}

// ========== 生图 ==========

/** 生图参考图：绑定资产视觉状态的参考图 + 共用块启用的参考图，截断至上限。 */
function panelRefImages(panel: LongProjectStoryboardPanel): string[] {
  const assetRefs = resolvePanelBindings(panel, assets.value).flatMap(({ variant }) => variant.referenceImageIds)
  const sharedRefs = (project.value?.imageGenConfig?.sharedBlocks ?? [])
    .filter((block) => block.enableRefImages)
    .flatMap((block) => block.referenceImages)
  return [...assetRefs, ...sharedRefs].slice(0, MAX_REF_IMAGES)
}

/** 单镜生图：描述 + 资产参考图 → 候选图暂存区（首次成功自动采纳）。refImages 可覆盖默认参考图。 */
async function generatePanelImage(panel: LongProjectStoryboardPanel, refImages?: string[]): Promise<boolean> {
  const artwork = artworkMap.value.get(panel.id)
  const prompt = artwork?.imagePrompt?.trim()
  if (!prompt) {
    toast.warning('请先推导或编辑画面描述')
    return false
  }
  const model = imageModels.value.find((item) => item.id === config.imageModelId)
  if (!model) {
    toast.error('请先在顶部绘图配置中选择生图模型')
    return false
  }
  if (!model.apiKey) {
    toast.error('请先在系统设置中配置该模型的 API Key')
    return false
  }
  await upsertArtwork(panel.id, { genStatus: 'running' })
  try {
    const result = await imageGenerationService.generateWithModel(
      toRaw(model),
      prompt,
      refImages ?? panelRefImages(panel),
      config.aspectRatio,
      config.resolution,
      config.quality,
    )
    if (result.success && result.imageUrl) {
      const latest = artworkMap.value.get(panel.id)
      await upsertArtwork(panel.id, {
        generatedImageIds: [...(latest?.generatedImageIds ?? []), result.imageUrl],
        selectedImageId: latest?.selectedImageId ?? result.imageUrl,
        genStatus: 'done',
      })
      return true
    }
    await upsertArtwork(panel.id, { genStatus: 'failed' })
    toast.error(result.error || '生成失败')
  } catch (error) {
    console.error('[分镜生图] 失败:', error)
    await upsertArtwork(panel.id, { genStatus: 'failed' })
    toast.error(error instanceof Error ? error.message : '生成失败')
  }
  return false
}

/** 批量生图：串行执行（风格稳定与 API 稳定性），结果进入各分镜候选区。 */
async function runBatchGen() {
  if (batchGenBusy.value || !genTargets.value.length) return
  batchGenBusy.value = true
  batchGenCancelled = false
  batchGenDone.value = 0
  batchGenTotal.value = genTargets.value.length
  saveConfig()
  let failed = 0
  for (const panel of genTargets.value) {
    if (batchGenCancelled) break
    const ok = await generatePanelImage(panel)
    if (!ok) failed += 1
    batchGenDone.value += 1
  }
  batchGenBusy.value = false
  if (batchGenCancelled) toast.info(`已取消批量生图（完成 ${batchGenDone.value}/${batchGenTotal.value}）`)
  else toast[failed ? 'warning' : 'success'](`批量生图完成：成功 ${batchGenDone.value - failed}，失败 ${failed}`)
}

function cancelBatchGen() {
  batchGenCancelled = true
}

/** 右栏「单独生成」：先保存描述，再按勾选的参考图配置生成本镜。 */
async function runSingleGenerate(prompt: string, refConfig: PanelRefConfig) {
  const panel = currentPanel.value
  if (!panel) return
  await upsertArtwork(panel.id, { imagePrompt: prompt, promptSource: 'manual', promptStatus: 'done' })
  const groups = currentRefGroups.value
  const byType = (type: TypedRefGroup['type']) => groups.find((group) => group.type === type)?.images ?? []
  const refs: string[] = [
    ...(refConfig.useStyleRef ? byType('style') : []),
    ...(refConfig.useCharacterRef ? byType('character') : []),
    ...(refConfig.useSceneRef ? byType('scene') : []),
    ...(refConfig.usePropRef ? byType('prop') : []),
    ...(refConfig.useGeneratedImage ? [currentArtwork.value?.selectedImageId ?? currentArtwork.value?.generatedImageIds?.at(-1)].filter(Boolean) as string[] : []),
    ...refConfig.customImages,
  ]
  await generatePanelImage(panel, refs.slice(0, MAX_REF_IMAGES))
}

/** 导出发布：按分镜顺序下载本章所有已采纳成图到本地。 */
async function exportImages() {
  const completed = panelItems.value
    .filter((item) => item.artwork?.selectedImageId)
    .sort((a, b) => a.panel.order - b.panel.order)
  if (!completed.length) {
    toast.warning('本章还没有已采纳的成图')
    return
  }
  exportBusy.value = true
  try {
    for (const item of completed) {
      await comicDownload.downloadSingle(
        item.artwork!.selectedImageId!,
        `分镜${String(item.panel.order).padStart(3, '0')}.png`,
      )
    }
    toast.success(`已导出 ${completed.length} 张成图`)
  } catch (error) {
    console.error('[分镜导出] 失败:', error)
    toast.error(error instanceof Error ? error.message : '导出失败')
  } finally {
    exportBusy.value = false
  }
}

// ========== 候选图管理 ==========

/** 采纳候选图为主成图。 */
function adoptImage(image: string) {
  const panel = currentPanel.value
  if (!panel) return
  void upsertArtwork(panel.id, { selectedImageId: image, genStatus: 'done' })
}

/** 删除候选图（被删的是主成图时回退到首张候选）。 */
function removeGenImage(index: number) {
  const panel = currentPanel.value
  const artwork = currentArtwork.value
  if (!panel || !artwork) return
  const next = (artwork.generatedImageIds ?? []).filter((_, i) => i !== index)
  const patch: Partial<LongProjectPanelArtwork> = { generatedImageIds: next }
  if (artwork.selectedImageId && !next.includes(artwork.selectedImageId)) patch.selectedImageId = next[0]
  void upsertArtwork(panel.id, patch)
}

// ========== 大图预览 ==========

function openPreview(payload: { images: string[]; index: number }) {
  previewImages.value = [...payload.images]
  previewIndex.value = payload.index
  previewAlt.value = `分镜 ${currentPanel.value?.order ?? ''} · 图片`
  previewVisible.value = true
}

/** 大图预览内删除：仅支持删除当前分镜候选图。 */
function removePreviewImage(index: number) {
  const image = previewImages.value[index]
  const artwork = currentArtwork.value
  if (image && artwork?.generatedImageIds?.includes(image)) {
    removeGenImage(artwork.generatedImageIds.indexOf(image))
  }
  previewImages.value = previewImages.value.filter((_, i) => i !== index)
  if (previewIndex.value >= previewImages.value.length) {
    previewIndex.value = Math.max(0, previewImages.value.length - 1)
  }
}

// ========== 配置持久化与导航 ==========

const CONFIG_KEY = `comic-panel-gen-config:${projectId}`

function saveConfig() {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...config }))
}

function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) Object.assign(config, JSON.parse(raw) as PanelGenConfig)
  } catch {
    /* 忽略损坏的本地配置 */
  }
}

watch(
  () => [config.imageModelId, config.aspectRatio, config.resolution, config.quality],
  () => saveConfig(),
)

/** 绘图配置抽屉保存：写回项目 imageGenConfig，并同步本页生图参数。 */
async function handleSaveImageConfig(next: ImageGenConfig) {
  const normalized = migrateLegacyImageGenConfig(next)
  const plain = JSON.parse(JSON.stringify(normalized)) as ImageGenConfig
  imageGenConfig.value = plain
  // 同步本页生图参数（模型/比例/分辨率/质量来自抽屉「绘画模型」tab）
  config.imageModelId = plain.imageModelId || config.imageModelId
  config.aspectRatio = plain.aspectRatio || config.aspectRatio
  config.resolution = plain.resolution || config.resolution
  config.quality = plain.quality ?? config.quality
  saveConfig()
  await mutateLongProjectData(() => { /* 队列占位，避免与进行中写入并发 */ })
  try {
    const latest = await comicDb.getProject(projectId)
    if (!latest) return
    const updated: ComicProject = { ...latest, imageGenConfig: plain, updatedAt: Date.now() }
    await comicDb.saveProject(updated)
    project.value = updated
    toast.success('绘图配置已保存到项目')
  } catch (error) {
    console.error('[绘图配置] 保存失败:', error)
    toast.error('绘图配置保存失败，请重试')
  }
}

function goBack() {
  // 返回长篇项目：带上当前章节与 tab 参数，落地后选中该章节并停在分镜 tab
  const chapter = currentChapter.value?.id
  const query: Record<string, string> = { tab: 'storyboard' }
  if (chapter) query.chapter = chapter
  router.push({ path: `/comic/long-project/${projectId}`, query })
}

// ========== 章节切换 ==========

/** 项目树展开状态：打开下拉时默认展开全部文件夹。 */
const treeExpandedIds = ref<Set<string>>(new Set())

watch(chapterMenuVisible, (visible) => {
  if (visible) treeExpandedIds.value = new Set(nodes.value.filter((node) => node.type === 'folder').map((node) => node.id))
})

/** 展开/收起下拉树。 */
function toggleChapterMenu() {
  chapterMenuVisible.value = !chapterMenuVisible.value
}

/** 树节点选择：仅章节可选（文件夹走 toggle 展开/收起）。 */
function onTreeSelect(node: { id: string; type: string }) {
  if (node.type !== 'chapter') return
  selectChapter(node.id)
}

/** 展开/收起文件夹。 */
function toggleTreeFolder(id: string) {
  const next = new Set(treeExpandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  treeExpandedIds.value = next
}

/** 下拉内选择章节。 */
function selectChapter(id: string) {
  chapterMenuVisible.value = false
  if (id !== chapterId.value) chapterId.value = id
}

watch(chapterId, (id) => {
  currentIndex.value = 0
  if (id) void router.replace({ name: 'ComicPanelGen', params: { projectId, chapterId: id } })
})

// ========== 初始化 ==========

onMounted(async () => {
  try {
    loadConfig()
    project.value = await comicDb.getProject(projectId)
    if (!project.value || project.value.projectType !== 'long') {
      await router.replace('/comic/projects')
      return
    }
    ;[models.value, templates.value] = await Promise.all([
      comicDb.getAllModelConfigs(),
      comicDb.getAllPromptTemplates(),
    ])
    // 项目绘图配置（绘画模型 + 共用属性），旧数据自动迁移
    imageGenConfig.value = JSON.parse(
      JSON.stringify(migrateLegacyImageGenConfig(project.value.imageGenConfig)),
    ) as ImageGenConfig
    // 生图参数兜底：本地未配置时取项目配置
    if (!config.imageModelId && imageGenConfig.value.imageModelId) config.imageModelId = imageGenConfig.value.imageModelId
    if (imageGenConfig.value.aspectRatio) config.aspectRatio = imageGenConfig.value.aspectRatio
    if (imageGenConfig.value.resolution) config.resolution = imageGenConfig.value.resolution
    if (!config.quality && imageGenConfig.value.quality) config.quality = imageGenConfig.value.quality
    // 默认章节：路由指定 > 首个有已完成分镜的章节 > 第一章
    if (!chapterId.value || !chapters.value.some((chapter) => chapter.id === chapterId.value)) {
      chapterId.value =
        chapters.value.find((chapter) =>
          (project.value?.longProjectData?.storyboardRuns ?? []).some(
            (run) => run.chapterId === chapter.id && run.status === 'completed',
          ),
        )?.id ?? chapters.value[0]?.id ?? ''
    }
    // 异常恢复：上次退出时卡在 running 的状态按失败处理
    const artworks = project.value.longProjectData?.panelArtworks ?? []
    if (artworks.some((item) => item.promptStatus === 'running' || item.genStatus === 'running')) {
      void mutateLongProjectData((data) => {
        data.panelArtworks = (data.panelArtworks ?? []).map((item) => ({
          ...item,
          promptStatus: item.promptStatus === 'running' ? 'failed' : item.promptStatus,
          genStatus: item.genStatus === 'running' ? 'failed' : item.genStatus,
        }))
      })
    }
    // 定位分镜：从长篇页右键「在生图工作台查看」跳转携带 ?panel=<panelId>
    const queryPanel = route.query.panel
    if (typeof queryPanel === 'string') {
      const index = panels.value.findIndex((panel) => panel.id === queryPanel)
      if (index >= 0) currentIndex.value = index
      void router.replace({ name: 'ComicPanelGen', params: { projectId, chapterId: chapterId.value } })
    }
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.icon-button { display: flex; width: 2rem; height: 2rem; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 0.5rem; color: var(--text-secondary); transition: color 0.15s ease, background-color 0.15s ease; }
.icon-button:hover { color: var(--text-primary); background: var(--bg-elevated); }
.task-select { height: 2.25rem; border: 1px solid var(--border-subtle); border-radius: 0.375rem; background: var(--bg-app); padding: 0 0.625rem; color: var(--text-secondary); font-size: 0.75rem; outline: none; }
.task-select:focus { border-color: rgba(34, 211, 238, 0.55); color: var(--text-primary); }
</style>

<template>
  <!-- 单根节点：保证父页面 v-show 页签切换生效 -->
  <div class="flex h-full min-h-0 flex-col overflow-hidden bg-app-bg text-text-primary">
    <!-- 顶部操作按钮：Teleport 到主页面 tab 行右侧容器（#storyboard-actions） -->
    <Teleport to="#storyboard-actions">
      <!-- 资产视图切换：分镜内容 ⇋ 资产内容 -->
      <button
        class="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs transition-colors"
        :class="pageTab === 'assets'
          ? 'border-violet-500/40 bg-violet-500/15 text-violet-300'
          : 'border-border-subtle bg-surface text-text-secondary hover:bg-app-bg hover:text-text-primary'"
        title="切换到本章资产（提取 / 审核 / 资产生图工作台）"
        @click="pageTab = pageTab === 'panels' ? 'assets' : 'panels'"
      >
        <Boxes :size="14" />
        资产
      </button>

      <template v-if="pageTab === 'panels'">
        <button
          class="secondary-button h-9 shrink-0 px-3 text-xs"
          :disabled="!panels.length || batchPromptBusy"
          :title="!panels.length ? '本章暂无分镜' : '依次推导缺失分镜的画面描述（一次一条，前后自动关联）'"
          @click="promptModalVisible = true"
        >
          <LoaderCircle v-if="batchPromptBusy" :size="14" class="animate-spin" />
          <Sparkles v-else :size="14" />
          批量推导描述
        </button>
        <button
          class="primary-button h-9 shrink-0 px-3 text-xs"
          :disabled="!genTargets.length || batchGenBusy"
          :title="!genTargets.length ? '没有可生图的分镜（需先有画面描述且未成图）' : `串行生成 ${genTargets.length} 个分镜画面`"
          @click="runBatchGen"
        >
          <LoaderCircle v-if="batchGenBusy" :size="14" class="animate-spin" />
          批量生图{{ batchGenBusy ? ` ${batchGenDone}/${batchGenTotal}` : genTargets.length ? `（${genTargets.length}）` : '' }}
        </button>
        <button v-if="batchGenBusy" class="secondary-button h-9 shrink-0 px-3 text-xs" @click="cancelBatchGen">取消</button>

        <button
          class="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!completedCount || exportBusy"
          :title="!completedCount ? '本章还没有已采纳的成图' : `导出 ${completedCount} 张已采纳成图`"
          @click="exportImages"
        >
          <LoaderCircle v-if="exportBusy" :size="14" class="animate-spin" />
          <Download v-else :size="14" />
          导出发布
        </button>

        <!-- 绘图配置：点击打开抽屉（与短篇生图页一致，仅分镜页展示） -->
        <button
          class="secondary-button h-9 shrink-0 px-3 text-xs"
          title="设置绘画模型与共用属性（风格提示词/参考图）"
          @click="configDrawerVisible = true"
        ><SlidersHorizontal :size="14" />绘图配置</button>
      </template>

      <!-- 资产视图：操作按钮跟随子视图（信息 | 生图工作台）切换 -->
      <template v-else>
        <!-- 信息视图：资产提取操作区 + 确认本章资产 -->
        <template v-if="assetView === 'info'">
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
          <button
            class="secondary-button h-9 shrink-0 px-2.5 text-xs"
            title="粘贴外部 AI 生成的资产提取结果，解析后进入审核确认"
            @click="extractImportVisible = true"
          ><ClipboardPaste :size="14" />手动导入</button>
          <button
            class="primary-button h-9 shrink-0 px-3 text-xs"
            :disabled="!assetTabRef?.canConfirmReview"
            :title="assetTabRef?.canConfirmReview ? '将审核结果保存为本章资产，并自动回填分镜绑定' : '暂无待审核的资产提取结果，请先执行提取'"
            @click="assetTabRef?.confirmReview()"
          >
            <CheckCircle2 :size="14" />
            确认本章资产
          </button>
        </template>

        <!-- 生图工作台视图：批量提示词 / 批量生图 / 生图配置 -->
        <template v-else-if="assetView === 'workbench'">
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
      </template>
    </Teleport>

    <!-- 资产视图：三子视图（信息 | 图片 | 生图工作台） -->
    <div v-if="pageTab === 'assets'" class="min-h-0 flex-1 overflow-hidden">
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
        :mutate-long-project-data="mutateLongProjectData"
        @retry-extraction="retryExtraction"
        @import-extraction="extractImportVisible = true"
      />
      <div v-else class="flex h-full items-center justify-center text-sm text-text-secondary">请先选择章节</div>
    </div>

    <!-- 分镜视图：左列表 + 中预览 + 右[分镜内容|提示词] -->
    <div v-else class="flex min-h-0 flex-1 gap-3 p-3">
      <!-- 左：分镜列表（右键合并/拆分/复制） -->
      <div class="w-[20%] min-w-[220px] max-w-[280px] shrink-0 overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-lg shadow-black/20">
        <PanelListSidebar
          :items="panelItems"
          :current-index="currentIndex"
          @select="currentIndex = $event"
          @contextmenu="onPanelContextMenu"
        />
      </div>

      <!-- 中：成图预览（上）+ 资产绑定三 tab（下） -->
      <div
        class="flex flex-1 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-lg shadow-black/20"
        style="max-width: 24%; min-width: 260px"
      >
        <template v-if="currentPanel">
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
        </template>
        <div v-else class="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <ListTree :size="26" class="text-text-muted" />
          <p class="mt-3 text-xs text-text-secondary">生成分镜后在此预览成图</p>
        </div>
      </div>

      <!-- 右：分镜内容（生成分镜 + 逐镜编辑）⇋ 提示词（画面描述编辑） -->
      <div
        class="flex flex-1 shrink-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-lg shadow-black/20"
        style="min-width: 440px"
      >
        <div class="flex h-10 shrink-0 items-center justify-between border-b border-border-subtle px-4">
          <p class="text-xs text-text-secondary">{{ rightTab === 'content' ? '分镜内容（剧本 → 分镜）' : '绘画提示词（分镜 → 画面描述）' }}</p>
          <div class="flex items-center gap-0.5 rounded-lg border border-border-subtle bg-app-bg p-0.5">
            <button
              v-for="tab in rightTabs"
              :key="tab.id"
              class="rounded-md px-2.5 py-1 text-[11px] transition-colors"
              :class="rightTab === tab.id ? 'bg-cyan-500/15 text-cyan-300' : 'text-text-muted hover:text-text-secondary'"
              @click="rightTab = tab.id"
            >{{ tab.label }}</button>
          </div>
        </div>

        <div class="min-h-0 flex-1">
          <PanelContentEditor
            v-if="rightTab === 'content'"
            :panel="currentPanel"
            :panels-count="panels.length"
            :run-status="latestChapterRun?.status"
            :run-error="latestChapterRun?.error"
            :models="llmModels"
            :templates="storyboardTemplates"
            :model-id="storyboardModelId"
            :template-id="storyboardTemplateId"
            :script-content="scriptDoc?.content ?? ''"
            :source-content="currentChapter?.content ?? ''"
            :analysis-content="analysisDoc?.content ?? ''"
            @update:model-id="storyboardModelId = $event"
            @update:template-id="storyboardTemplateId = $event"
            @run="runStoryboardFromEditor"
            @import="storyboardImportVisible = true"
            @save-panel="savePanelEdit"
          />
          <PanelPromptPanel
            v-else-if="currentPanel"
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
          <div v-else class="flex h-full items-center justify-center text-xs text-text-muted">请先生成分镜</div>
        </div>
      </div>
    </div>

    <!-- 分镜右键菜单（合并/拆分/复制） -->
    <StoryboardContextMenu
      :visible="panelMenu.visible && !!panelMenu.panel"
      :x="panelMenu.x"
      :y="panelMenu.y"
      :panel="panelMenu.panel!"
      :total="panels.length"
      :max-merge="3"
      @close="panelMenu.visible = false"
      @action="onPanelMenuAction"
    />

    <!-- 合并确认弹窗 -->
    <StoryboardMergeDialog
      v-model="mergeDialogVisible"
      :panels="mergeSelectedPanels"
      :artwork-map="artworkMap"
      @confirm="applyMerge"
    />

    <!-- 拆分弹窗 -->
    <StoryboardSplitDialog
      v-model="splitDialogVisible"
      :panel="splitTargetPanel ?? undefined"
      :mode="splitMode"
      @confirm="applySplit"
    />

    <!-- 合并/拆分撤销条（8 秒内可撤销） -->
    <Transition name="fade">
      <div
        v-if="storyboardUndoAvailable"
        class="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-cyan-500/30 bg-surface px-4 py-2 shadow-xl shadow-black/30"
      >
        <span class="text-xs text-text-secondary">{{ storyboardUndoLabel }}</span>
        <button class="flex items-center gap-1 text-xs text-cyan-400 transition-colors hover:text-cyan-300" @click="undoStoryboardOp">
          <Undo2 :size="13" />
          撤销
        </button>
      </div>
    </Transition>

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

    <!-- 手动导入分镜（外部 AI 代跑）：粘贴 → 解析预览 → 确认导入 -->
    <ManualResultImportDialog
      :visible="storyboardImportVisible"
      title="手动导入分镜"
      placeholder="粘贴外部 AI 生成的分镜结果…"
      :parse="parseStoryboardPreview"
      @confirm="confirmStoryboardImport"
      @close="storyboardImportVisible = false"
    />

    <!-- 手动导入资产（外部 AI 代跑）：粘贴 → 解析预览 → 确认后进入审核链路 -->
    <ManualResultImportDialog
      :visible="extractImportVisible"
      title="手动导入资产"
      placeholder="粘贴外部 AI 生成的资产提取结果…"
      :parse="parseExtractionPreview"
      @confirm="confirmExtractionImport"
      @close="extractImportVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 长篇项目「分镜」tab（原独立生图工作台并入主页面）：
 * 内部视图「分镜（列表+预览+编辑）｜资产（提取+工作台）」，由顶部操作区「资产」按钮切换。
 * - 分镜视图：左列分镜列表（右键合并/拆分/复制）→ 中列成图预览 + 资产绑定三 tab
 *   → 右列 [分镜内容|提示词] 切换（分镜内容 = 生成分镜 + 逐镜编辑；提示词 = 画面描述编辑）。
 * - 资产视图：资产提取入口 + 审核区 + 资产生图工作台。
 * 顶部操作按钮通过 Teleport 注入主页面 tab 行右侧（#storyboard-actions 容器）。
 * 分镜生成以漫画剧本为主输入、原文分析为辅助（无剧本时原文兜底）；
 * 画面描述按「依次推导」执行（滑动窗口携带前文），生图自动携带绑定资产参考图。
 * 数据持久化走 panelArtworks（panelId 关联），重跑分镜由迁移逻辑保留/标记过期；
 * 项目数据与持久化队列共享主页面实例（props 注入），不再独立读写。
 */
import { computed, onMounted, reactive, ref, toRaw, watch, type Ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { Boxes, CheckCircle2, ClipboardPaste, Download, ListTree, LoaderCircle, Settings2, SlidersHorizontal, Sparkles, Undo2 } from 'lucide-vue-next'
import { comicDb, comicDownload } from '@/api/comic'
import { useToast } from '@comic/composables/useToast'
import PromptRunBar from '@comic/components/common/PromptRunBar.vue'
import ManualResultImportDialog from '@comic/components/common/ManualResultImportDialog.vue'
import { imageGenerationService } from '@comic/services/imageGenerationService'
import { buildAssetExtractionPrompt, extractChapterAssets, parseAssetExtractionResponse, countCandidatesAppearances } from '@comic/services/assetExtractionService'
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
import { defaultVariant, parseStoryboardResponse } from '@comic/services/storyboardService'
import { useStoryboardRun } from '@comic/composables/useStoryboardRun'
import { useStoryboardOps } from '@comic/composables/useStoryboardOps'
import PanelListSidebar from '@comic/components/panel-gen/PanelListSidebar.vue'
import PanelPreview from '@comic/components/panel-gen/PanelPreview.vue'
import PanelAssetTabs from '@comic/components/panel-gen/PanelAssetTabs.vue'
import PanelContentEditor, { type PanelEditFields } from '@comic/components/panel-gen/PanelContentEditor.vue'
import PanelGenAssetTab from '@comic/components/panel-gen/PanelGenAssetTab.vue'
import PanelPromptPanel, { type PanelRefConfig, type TypedRefGroup } from '@comic/components/panel-gen/PanelPromptPanel.vue'
import PanelPromptGenerateModal from '@comic/components/panel-gen/PanelPromptGenerateModal.vue'
import StoryboardContextMenu, { type StoryboardMenuAction } from '@comic/components/StoryboardContextMenu.vue'
import StoryboardMergeDialog from '@comic/components/StoryboardMergeDialog.vue'
import StoryboardSplitDialog from '@comic/components/StoryboardSplitDialog.vue'
import AssetImagePreviewModal from '@comic/components/AssetImagePreviewModal.vue'
import ImageConfigDrawer from '@comic/components/ImageConfigDrawer.vue'
import { migrateLegacyImageGenConfig } from '@comic/utils/sharedBlocks'
import type { PanelListItem } from '@comic/components/panel-gen/PanelListSidebar.vue'
import type {
  ComicProject,
  ImageGenConfig,
  LongProjectAssetExtractionRun,
  LongProjectPanelArtwork,
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
  mutateLongProjectData: (mutate: (data: NonNullable<ComicProject['longProjectData']>) => void) => Promise<void>
}>()

const toast = useToast()

const emit = defineEmits<{
  /** 绘图配置已直接写库（imageGenConfig 在 longProjectData 之外），父页面需重载项目数据。 */
  (e: 'image-config-saved'): void
}>()

/** 主页面共享的项目数据（computed 保持 .value 读写习惯；只读）。 */
const project = computed(() => props.project) as Ref<ComicProject | null>
const chapterId = computed(() => props.chapterId)
const projectId = computed(() => props.projectId)

/** 生图参考图上限（与短篇生图页一致）。 */
const MAX_REF_IMAGES = 14

// ========== 页面状态 ==========

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

// ========== 页面级 / 右栏视图 ==========

/** 页面级视图：分镜（列表+预览+编辑）｜资产（提取+工作台），由顶部「资产」按钮切换。 */
const pageTab = ref<'panels' | 'assets'>('panels')

/** 右栏 tab：分镜内容（生成分镜 + 逐镜编辑）｜提示词（画面描述）。 */
const rightTab = ref<'content' | 'prompt'>('content')
const rightTabs = [
  { id: 'content' as const, label: '分镜内容' },
  { id: 'prompt' as const, label: '提示词' },
]

/** 资产视图子 tab：信息（提取审核）｜图片（资产浏览）｜生图工作台；顶栏操作按钮随其切换。 */
const assetView = ref<'info' | 'images' | 'workbench'>('info')
/** 资产视图实例引用：顶栏按钮调用其暴露的确认/工作台批量操作。 */
const assetTabRef = ref<InstanceType<typeof PanelGenAssetTab>>()

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

/** 本章最近一次分镜 run（含 running/failed，右栏「分镜内容」状态条数据源）。 */
const latestChapterRun = computed(() => {
  const chapter = currentChapter.value
  if (!chapter) return undefined
  return storyboardRuns.value
    .filter((run) => run.chapterId === chapter.id)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0]
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

/** 章节顺序表（章节 ID → 序号），视觉状态章节范围默认值计算用。 */
const chapterOrders = computed(() => Object.fromEntries(chapters.value.map((item) => [item.id, item.order])))

/** 本章原文分析 / 漫画剧本文档（分镜与资产提取的管线上下文）。 */
const analysisDoc = computed(() => (project.value?.longProjectData?.chapterAnalyses ?? []).find((doc) => doc.chapterId === chapterId.value))
const scriptDoc = computed(() => (project.value?.longProjectData?.chapterScripts ?? []).find((doc) => doc.chapterId === chapterId.value))

/** 资产视图数据源。 */
const chapterAssets = computed(() => project.value?.longProjectData?.chapterAssets ?? [])
const assetExtractionRuns = computed(() => project.value?.longProjectData?.assetExtractionRuns ?? [])
const assetGenConfig = computed(() => project.value?.longProjectData?.assetGenConfig)

const completedCount = computed(() => panelItems.value.filter((item) => item.artwork?.selectedImageId).length)

const llmModels = computed(() => props.models.filter((model) => model.category === 'llm'))
const imageModels = computed(() => props.models.filter((model) => model.category === 'image'))

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
const extractDisabled = computed(() => !(currentChapter.value?.content ?? '').trim() || !extractModelId.value || !extractTemplateId.value)
const extractActionLabel = computed(() => chapterExtractRuns.value.length ? '重新提取' : '提取资产')

/** 生成最终发送提示词：原文 + 分析 + 剧本 + 分镜概要 + 已有资产。 */
function buildExtractPrompt(): string {
  const template = extractTemplates.value.find((item) => item.id === extractTemplateId.value)
  const chapterContent = currentChapter.value?.content ?? ''
  return buildAssetExtractionPrompt(template?.content ?? '', chapterContent, {
    analysis: analysisDoc.value?.content ?? '',
    script: scriptDoc.value?.content ?? '',
    panelsOutline: panels.value.length ? panels.value.map((panel) => `分镜${panel.order}：${panel.content}`).join('\n') : undefined,
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
  const chapterContent = chapter.content ?? ''
  const now = Date.now()
  const run: LongProjectAssetExtractionRun = {
    id: uuidv4(), chapterId: chapter.id, sourceContent: chapterContent,
    sourceWordCount: chapterContent.replace(/\s/g, '').length,
    modelId: model.id, templateId: template.id,
    prompt, status: 'running', candidates: [], createdAt: now, updatedAt: now,
  }
  await props.mutateLongProjectData((data) => {
    data.assetExtractionRuns = [...(data.assetExtractionRuns ?? []), run]
  })
  try {
    const result = await extractChapterAssets({
      model, template, chapterContent,
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
    const now = Date.now()
    const run: LongProjectAssetExtractionRun = {
      id: uuidv4(), chapterId: chapter.id, sourceContent: chapter.content ?? '',
      sourceWordCount: (chapter.content ?? '').replace(/\s/g, '').length,
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

const panelPromptTemplates = computed(() =>
  props.templates.filter((template) => template.type === 'panel-prompt').sort((a, b) => a.sortOrder - b.sortOrder),
)
const storyboardTemplates = computed(() =>
  props.templates.filter((template) => template.type === 'storyboard').sort((a, b) => a.sortOrder - b.sortOrder),
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

// ========== 持久化 ==========

/** 新增/更新分镜画面记录。 */
function upsertArtwork(panelId: string, patch: Partial<LongProjectPanelArtwork>) {
  const chapter = currentChapter.value
  const panel = panels.value.find((item) => item.id === panelId)
  if (!chapter || !panel) return Promise.resolve()
  return props.mutateLongProjectData((data) => {
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
  void props.mutateLongProjectData((data) => {
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

// ========== 分镜生成（剧本主输入 + 原文分析辅助） ==========

const {
  selectedModelId: storyboardModelId,
  selectedTemplateId: storyboardTemplateId,
  initDefaults: initStoryboardDefaults,
  runStoryboard,
  importStoryboard,
  recoverInterrupted: recoverStoryboardRun,
} = useStoryboardRun({
  project,
  mutateLongProjectData: props.mutateLongProjectData,
  getCurrentChapter: () => currentChapter.value,
  getScriptContent: () => scriptDoc.value?.content,
  getAnalysisContent: () => analysisDoc.value?.content,
  getChapterOrders: () => chapterOrders.value,
  notifyFallback: (message) => toast.info(message),
  notifyError: (message) => toast.error(message),
})

/** 右栏「分镜内容」触发生成：PromptRunBar 已完成发送前确认，prompt 为最终版。 */
async function runStoryboardFromEditor(prompt: string) {
  const model = llmModels.value.find((item) => item.id === storyboardModelId.value)
  if (!model) {
    toast.error('请选择分镜生成模型')
    return
  }
  await runStoryboard({ model, templateId: storyboardTemplateId.value, prompt })
}

// ========== 分镜手动导入（外部 AI 代跑） ==========

const storyboardImportVisible = ref(false)

/** 分镜导入解析预览：返回标题与每镜摘要（解析失败抛错，由弹窗展示红字）。 */
function parseStoryboardPreview(content: string): { title: string; items: string[] } {
  const panels = parseStoryboardResponse(content, [], currentChapter.value?.id ?? '', chapterOrders.value)
  return {
    title: `解析到 ${panels.length} 个分镜`,
    items: panels.map((panel) => `分镜 ${panel.order}：${panel.content.slice(0, 40)}${panel.content.length > 40 ? '…' : ''}`),
  }
}

/** 确认导入分镜：覆盖已有分镜前提示（已推导描述与成图将自动对位迁移）。 */
async function confirmStoryboardImport(content: string) {
  if (!currentChapter.value) return
  if (panels.value.length && !window.confirm('本章已有分镜，导入将生成新一版分镜并自动对位迁移已推导描述与成图，是否继续？')) return
  try {
    await importStoryboard(content)
    storyboardImportVisible.value = false
    toast.success(`已导入分镜`)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '分镜解析失败')
  }
}

// ========== 分镜结构操作（右键合并/拆分/复制/撤销） ==========

/** 批量任务或分镜生成进行中时锁定结构操作，避免并发写入。 */
const opsLocked = computed(() => batchPromptBusy.value || batchGenBusy.value || latestChapterRun.value?.status === 'running')

const {
  panelMenu,
  mergeDialogVisible,
  splitDialogVisible,
  splitTargetPanel,
  splitMode,
  storyboardUndoAvailable,
  storyboardUndoLabel,
  mergeSelectedPanels,
  openPanelMenu,
  handlePanelMenuAction,
  undoStoryboardOp,
  applyMerge,
  applySplit,
  autoSyncBindings,
  reevaluatePromptStatus,
} = useStoryboardOps({
  mutateLongProjectData: props.mutateLongProjectData,
  notify: (type, message) => toast[type](message),
  currentRun,
  currentChapter,
  panelArtworks,
  artworkMap,
  assets,
  chapterOrders,
  opsLocked,
})

/** 左栏分镜右键：打开结构操作菜单。 */
function onPanelContextMenu(payload: { event: MouseEvent; panel: LongProjectStoryboardPanel }) {
  openPanelMenu(payload.event, payload.panel)
}

/** 右键菜单动作分发（「在生图工作台查看」即选中该分镜）。 */
function onPanelMenuAction(action: StoryboardMenuAction) {
  handlePanelMenuAction(action, (panel) => {
    const index = panels.value.findIndex((item) => item.id === panel.id)
    if (index >= 0) currentIndex.value = index
  })
}

/**
 * 右栏「分镜内容」逐镜编辑保存：写回 run.panels 并同步自动绑定；
 * 画面变化且已有描述时标 stale 提示重新推导。
 */
function savePanelEdit(payload: { panelId: string; fields: PanelEditFields }) {
  const run = currentRun.value
  const chapter = currentChapter.value
  if (!run || !chapter) return
  const target = run.panels.find((panel) => panel.id === payload.panelId)
  if (!target) return
  const contentChanged = payload.fields.content !== target.content
  const nextPanels = autoSyncBindings(
    run.panels.map((panel) =>
      panel.id === payload.panelId
        ? {
            ...panel,
            shot: payload.fields.shot || undefined,
            content: payload.fields.content,
            dialogue: payload.fields.dialogue || undefined,
            narration: payload.fields.narration || undefined,
          }
        : panel,
    ),
    chapter.id,
  )
  void props.mutateLongProjectData((data) => {
    data.storyboardRuns = (data.storyboardRuns ?? []).map((item) =>
      item.id === run.id ? { ...item, panels: nextPanels, updatedAt: Date.now() } : item,
    )
    if (contentChanged && (data.panelArtworks ?? []).some((item) => item.panelId === payload.panelId && item.imagePrompt?.trim())) {
      data.panelArtworks = (data.panelArtworks ?? []).map((item) =>
        item.panelId === payload.panelId ? { ...item, promptStatus: reevaluatePromptStatus(item, true), updatedAt: Date.now() } : item,
      )
    }
  })
}

/** 分镜数量变化（生成/合并/拆分/撤销）后钳制选中索引，避免越界。 */
watch(
  () => panels.value.length,
  (length) => {
    if (currentIndex.value >= length) currentIndex.value = Math.max(0, length - 1)
  },
)

/** 章节切换（主页面侧栏选章）：重置分镜选中索引。 */
watch(chapterId, () => {
  currentIndex.value = 0
})

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
  void props.mutateLongProjectData((data) => {
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

// ========== 配置持久化 ==========

const CONFIG_KEY = computed(() => `comic-panel-gen-config:${props.projectId}`)

function saveConfig() {
  localStorage.setItem(CONFIG_KEY.value, JSON.stringify({ ...config }))
}

function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY.value)
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
  await props.mutateLongProjectData(() => { /* 队列占位，避免与进行中写入并发 */ })
  try {
    const latest = await comicDb.getProject(props.projectId)
    if (!latest) return
    const updated: ComicProject = { ...latest, imageGenConfig: plain, updatedAt: Date.now() }
    await comicDb.saveProject(updated)
    emit('image-config-saved')
    toast.success('绘图配置已保存到项目')
  } catch (error) {
    console.error('[绘图配置] 保存失败:', error)
    toast.error('绘图配置保存失败，请重试')
  }
}

// ========== 初始化 ==========

onMounted(() => {
  loadConfig()
  // 分镜生成环节的模型/模板默认选择
  initStoryboardDefaults(props.models, props.templates)
  // 异常恢复：上次退出时分镜生成卡在 running 的按失败处理
  void recoverStoryboardRun()
  // 项目绘图配置（绘画模型 + 共用属性），旧数据自动迁移
  imageGenConfig.value = JSON.parse(
    JSON.stringify(migrateLegacyImageGenConfig(props.project?.imageGenConfig)),
  ) as ImageGenConfig
  // 生图参数兜底：本地未配置时取项目配置
  if (!config.imageModelId && imageGenConfig.value.imageModelId) config.imageModelId = imageGenConfig.value.imageModelId
  if (imageGenConfig.value.aspectRatio) config.aspectRatio = imageGenConfig.value.aspectRatio
  if (imageGenConfig.value.resolution) config.resolution = imageGenConfig.value.resolution
  if (!config.quality && imageGenConfig.value.quality) config.quality = imageGenConfig.value.quality
  // 异常恢复：上次退出时卡在 running 的状态按失败处理
  const artworks = props.project?.longProjectData?.panelArtworks ?? []
  if (artworks.some((item) => item.promptStatus === 'running' || item.genStatus === 'running')) {
    void props.mutateLongProjectData((data) => {
      data.panelArtworks = (data.panelArtworks ?? []).map((item) => ({
        ...item,
        promptStatus: item.promptStatus === 'running' ? 'failed' : item.promptStatus,
        genStatus: item.genStatus === 'running' ? 'failed' : item.genStatus,
      }))
    })
  }
})
</script>

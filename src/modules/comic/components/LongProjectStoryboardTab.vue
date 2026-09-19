<template>
  <!-- 单根节点：保证父页面 v-show 页签切换生效 -->
  <div class="flex h-full min-h-0 flex-col overflow-hidden bg-app-bg text-text-primary">
    <!-- 顶部操作区：Teleport 到主页面 tab 行右侧容器（#storyboard-actions）
         动作组由内容阶段决定（页签行「分镜」下拉 / 右栏「分镜内容 | 提示词」共用同一状态）；资产常驻，绘图配置归属提示词阶段 -->
    <Teleport to="#storyboard-actions">
      <!-- 分镜内容阶段：生成分镜（与「原文 / 剧本」页签执行栏同构，导入入口在发送前确认弹窗内） -->
      <template v-if="stage === 'storyboard'">
        <div class="min-w-0 max-w-2xl">
          <PromptRunBar
            v-model:model-id="storyboardModelId"
            v-model:template-id="storyboardTemplateId"
            :models="llmModels"
            :templates="storyboardTemplates"
            :action-label="panels.length ? '重新生成分镜' : '生成分镜'"
            :disabled="!storyboardSourceContent.trim() || !storyboardModelId || !storyboardTemplateId"
            :busy="latestChapterRun?.status === 'running'"
            force-compact
            confirm-storage-key="comic-long-storyboard-confirm"
            :build-prompt="buildStoryboardRunPrompt"
            @run="runStoryboardFromEditor"
            @import="storyboardImportVisible = true"
          />
        </div>
      </template>

      <!-- 提示词阶段：画面描述推导 → 生图 → 导出；绘图配置属于本阶段 -->
      <template v-else>
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
        <!-- 外部 AI 代跑「整章一次生成」的导入入口收进批量推导弹窗（一次性发送时展示） -->
        <!-- 绘图配置：绘画模型 + 共用属性，属于「提示词 → 生图」阶段；紧贴批量生图，便于生图前调参 -->
        <button
          class="secondary-button h-9 shrink-0 px-3 text-xs"
          title="设置绘画模型与共用属性（风格提示词/参考图）"
          @click="configDrawerVisible = true"
        ><SlidersHorizontal :size="14" />绘图配置</button>
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
      </template>
    </Teleport>

    <!-- 资产接力引导条：有分镜但本章资产未就绪 → 一键跳转同级「资产」页签提取（固定视觉，保证分镜间画面一致） -->
    <div
      v-if="showAssetHandoff"
      class="flex shrink-0 items-center justify-between gap-3 border-b border-amber-400/25 bg-amber-400/10 px-4 py-2"
    >
      <p class="min-w-0 truncate text-xs text-amber-300">本章分镜已就绪，但资产尚未提取 —— 建议先固定人物 / 场景 / 道具的视觉状态，再生成分镜画面</p>
      <button
        class="flex shrink-0 items-center gap-1 rounded-lg border border-amber-400/40 px-2.5 py-1 text-xs text-amber-300 transition-colors hover:bg-amber-400/15"
        @click="emit('go-assets')"
      >去提取资产 <ArrowRight :size="13" /></button>
    </div>

    <!-- 分镜视图：左列表 + 中预览 + 右（分镜内容 = 页块文本编辑 + 本页操作 / 提示词 = 画面描述 + 单镜操作） -->
    <div class="flex min-h-0 flex-1 gap-3 p-3">
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
              @switch-image="switchPanelImage"
              @delete-image="deleteCurrentGenImage"
              @preview="openPreview"
            />
          </div>
          <div class="h-52 shrink-0 border-t border-border-subtle">
            <PanelAssetTabs
              :panel="currentPanel"
              :assets="assets"
              :chapter-orders="chapterOrders"
              :ref-manifest="currentRefManifest"
              @set-binding-images="setBindingImages"
              @set-binding-variant="setBindingVariant"
              @preview="openPreview"
            />
          </div>
        </template>
        <div v-else class="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <ListTree :size="26" class="text-text-muted" />
          <p class="mt-3 text-xs text-text-secondary">生成分镜后在此预览成图</p>
        </div>
      </div>

      <!-- 右：分镜内容 = 页块文本编辑 + 本页操作；提示词 = 画面描述 + 单镜操作 -->
      <div
        class="flex flex-1 shrink-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-lg shadow-black/20"
        style="min-width: 440px"
      >
        <div class="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border-subtle px-4">
          <p class="min-w-0 truncate text-xs text-text-secondary">{{ stage === 'storyboard' ? '分镜内容（剧本 → 分镜）' : '绘画提示词（分镜 → 画面描述）' }}</p>
          <div class="flex shrink-0 items-center gap-3">
            <p v-if="latestChapterRun?.status === 'running'" class="text-[11px] text-cyan-400">分镜生成中…</p>
            <p v-else class="text-[11px] text-text-muted">{{ stage === 'storyboard' ? `${panels.length} 页` : `${describedCount}/${panels.length} 已描述` }}</p>
            <!-- 内容切换：与主页面页签行「分镜」下拉共用同一个 stage（v-model） -->
            <div class="flex items-center gap-0.5 rounded-lg border border-border-subtle bg-app-bg p-0.5">
              <button
                v-for="tab in stageTabs"
                :key="tab.id"
                class="rounded-md px-2.5 py-1 text-[11px] transition-colors"
                :class="stage === tab.id ? 'bg-cyan-500/15 text-cyan-300' : 'text-text-muted hover:text-text-secondary'"
                @click="stage = tab.id"
              >{{ tab.label }}</button>
            </div>
          </div>
        </div>

        <div class="min-h-0 flex-1">
          <PanelContentEditor
            v-if="stage === 'storyboard'"
            :panel="currentPanel"
            :assets="assets"
            :run-status="latestChapterRun?.status"
            :ops-locked="opsLocked"
            :optimize-busy="currentPanel ? polishBusyIds.has(currentPanel.id) : false"
            @save-panel="savePanelEdit"
            @optimize="polishCurrentPanel"
          />
          <PanelPromptPanel
            v-else-if="currentPanel"
            :panel="currentPanel"
            :artwork="currentArtwork"
            :assets="assets"
            :prompt-busy="promptBusyIds.has(currentPanel.id)"
            :generating="currentArtwork?.genStatus === 'running'"
            :ref-groups="currentRefGroups"
            :shared-blocks="sharedBlocks"
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
      :assets="assets"
      @confirm="applyMerge"
    />

    <!-- 拆分弹窗 -->
    <StoryboardSplitDialog
      v-model="splitDialogVisible"
      :panel="splitTargetPanel ?? undefined"
      :mode="splitMode"
      @confirm="applySplit"
    />

    <!-- 删除单页确认弹窗（系统通用删除确认样式） -->
    <ConfirmDialog
      v-model="deleteDialogVisible"
      title="删除这一页"
      :content="deleteDialogContent"
      confirm-text="确认删除"
      @confirm="confirmDeletePanel"
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

    <!-- 批量推导确认弹窗（逐条 / 一次性 两种发送方式，始终全部重新推导） -->
    <PanelPromptGenerateModal
      v-model="promptModalVisible"
      :llm-models="llmModels"
      :templates="panelPromptTemplates"
      :chapter-templates="chapterPanelPromptTemplates"
      :default-model-id="config.promptModelId"
      :default-template-id="config.promptTemplateId"
      mode="batch"
      :total-count="panels.length"
      :busy="batchPromptBusy"
      :build-prompt="buildBatchPromptPreview"
      :build-chapter-prompt="buildChapterPromptPreview"
      :build-copy-text="buildCopyText"
      :create-template="createPanelPromptTemplate"
      @confirm="runBatchPrompts"
      @import="promptImportVisible = true"
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
      :create-template="createPanelPromptTemplate"
      @confirm="runSinglePrompt"
    />

    <!-- 大图预览 -->
    <AssetImagePreviewModal
      v-model="previewVisible"
      :images="previewImages"
      :image-index="previewIndex"
      :alt="previewAlt"
      @remove="requestRemovePreviewImage"
    />

    <!-- 预览内删除生成图确认（z-[210] 压过大图预览 z-[200]） -->
    <ConfirmDialog
      v-model="previewDeleteVisible"
      title="删除这张成图"
      content="将删除分镜当前显示的成图，删除后无法恢复，是否确认？"
      confirm-text="确认删除"
      z-index-class="z-[210]"
      @confirm="confirmRemovePreviewImage"
    />

    <!-- 绘图配置抽屉（复用短篇生图页同款组件） -->
    <ImageConfigDrawer
      v-model="configDrawerVisible"
      :image-models="imageModels"
      :initial-config="imageGenConfig"
      :project-id="projectId"
      @save="handleSaveImageConfig"
    />

    <!-- 手动导入分镜（外部 AI 代跑）：粘贴 → 解析预览 → 确认导入；z-[140] 压过「确认发送内容」/批量推导弹窗（z-50/z-[130] 层级） -->
    <ManualResultImportDialog
      :visible="storyboardImportVisible"
      title="手动导入分镜"
      placeholder="粘贴外部 AI 生成的分镜结果…"
      z-index-class="z-[140]"
      :parse="parseStoryboardPreview"
      @confirm="confirmStoryboardImport"
      @close="storyboardImportVisible = false"
    />

    <!-- 手动导入画面描述（外部 AI 代跑整章生成）：粘贴 → 按 ## 分镜 N 对位预览 → 确认写入；z-[140] 压过批量推导弹窗 -->
    <ManualResultImportDialog
      :visible="promptImportVisible"
      title="手动导入整章画面描述"
      placeholder="粘贴外部 AI 生成的整章画面描述（每镜以 ## 分镜 N 开头）…"
      z-index-class="z-[140]"
      :parse="parsePromptImportPreview"
      @confirm="confirmPromptImport"
      @close="promptImportVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 长篇项目「分镜」顶级页签（原独立生图工作台并入主页面，资产已拆分至同级「资产」页签）：
 * 左列分镜列表（右键合并/拆分/复制/删除）→ 中列成图预览 + 资产绑定三 tab
 * → 右列随「内容阶段」切换（分镜内容 = 页块文本编辑 + 本页操作；提示词 = 画面描述 + 单镜操作）。
 * 内容阶段由主页面页签行的「分镜」下拉按钮持有（默认分镜，可下拉切绘图），经 v-model 注入；
 * 右栏标题栏的「分镜内容 | 提示词」两个按钮与其共用同一状态，两处入口永远一致。
 * 顶部操作区通过 Teleport 注入主页面 tab 行右侧（#storyboard-actions 容器），随阶段切换动作组——
 * 分镜内容显示「生成分镜（剧本 → 分镜）+ 手动导入」，提示词显示「批量推导描述 + 批量生图 + 导出发布 + 绘图配置」；
 * 资产不在本页签内（跳转主页面同级「资产」页签，经 go-assets 事件携带定位目标）；生成分镜是章节级动作，
 * 与「原文 / 剧本」页签执行栏同构，不再挂在单页编辑框下方。
 * 分镜生成以漫画剧本为主输入、原文分析与章节原文为辅助核对（无剧本时原文兜底进剧本槽位）；
 * 画面描述按「依次推导」执行（滑动窗口携带前文），生图自动携带绑定资产参考图。
 * 数据持久化走 panelArtworks（panelId 关联），重跑分镜由迁移逻辑保留/标记过期；
 * 项目数据与持久化队列共享主页面实例（props 注入），不再独立读写。
 */
import { computed, onMounted, reactive, ref, toRaw, watch, type Ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { ArrowRight, Download, ListTree, LoaderCircle, SlidersHorizontal, Sparkles, Undo2 } from 'lucide-vue-next'
import { comicDb, comicDownload } from '@/api/comic'
import { useToast } from '@comic/composables/useToast'
import ManualResultImportDialog from '@comic/components/common/ManualResultImportDialog.vue'
import PromptRunBar from '@comic/components/common/PromptRunBar.vue'
import { imageGenerationService } from '@comic/services/imageGenerationService'
import { RECOMMENDED_TEMPLATES } from '@comic/services/promptTemplateRegistry'
import {
  DEFAULT_PREV_PANEL_WINDOW,
  buildChapterOutline,
  buildChapterPanelPromptPrompt,
  buildPanelPromptPrompt,
  composeFinalPrompt,
  inferPanelPrompt,
  parseChapterPanelPrompts,
  type PrevPanelContextEntry,
} from '@comic/services/panelPromptService'
import { buildPanelRefManifest, buildRefManifestText, groupManifestByType } from '@comic/services/panelRefManifest'
import { buildAssetNameIndex, computeAutoBindings, reapplyVariantContinuation } from '@comic/services/promptAssetService'
import { bindingsFromValue, buildStoryboardPrompt, cellCountLabel, defaultVariant, parseStoryboardResponse, polishPanelBlock, serializeBindings, summarizeCellBindings, summarizeCells, type ChapterAssetContext } from '@comic/services/storyboardService'
import { useStoryboardRun } from '@comic/composables/useStoryboardRun'
import { useStoryboardOps } from '@comic/composables/useStoryboardOps'
import PanelListSidebar from '@comic/components/panel-gen/PanelListSidebar.vue'
import PanelPreview from '@comic/components/panel-gen/PanelPreview.vue'
import PanelAssetTabs from '@comic/components/panel-gen/PanelAssetTabs.vue'
import PanelContentEditor, { type PanelEditPayload } from '@comic/components/panel-gen/PanelContentEditor.vue'
import PanelPromptPanel, { type PanelRefConfig, type TypedRefGroup } from '@comic/components/panel-gen/PanelPromptPanel.vue'
import PanelPromptGenerateModal from '@comic/components/panel-gen/PanelPromptGenerateModal.vue'
import StoryboardContextMenu, { type StoryboardMenuAction } from '@comic/components/StoryboardContextMenu.vue'
import StoryboardMergeDialog from '@comic/components/StoryboardMergeDialog.vue'
import StoryboardSplitDialog from '@comic/components/StoryboardSplitDialog.vue'
import ConfirmDialog from '@comic/components/ConfirmDialog.vue'
import AssetImagePreviewModal from '@comic/components/AssetImagePreviewModal.vue'
import ImageConfigDrawer from '@comic/components/ImageConfigDrawer.vue'
import { migrateLegacyImageGenConfig } from '@comic/utils/sharedBlocks'
import type { PanelListItem } from '@comic/components/panel-gen/PanelListSidebar.vue'
import type {
  ComicProject,
  ImageGenConfig,
  LongProjectAsset,
  LongProjectPanelArtwork,
  LongProjectStoryboardAssetBinding,
  LongProjectStoryboardPanel,
  ModelConfig,
  PromptTemplate,
  TemplateType,
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
  /** 提示词模板已直接写库（一键新建画面描述模板），父页面需重载模板列表。 */
  (e: 'templates-changed'): void
  /** 跳转主页面同级「资产」页签（可携带定位目标：直达工作台具体资产/视觉状态）。 */
  (e: 'go-assets', payload?: { assetId: string; variantId?: string }): void
}>()

/** 主页面共享的项目数据（computed 保持 .value 读写习惯；只读）。 */
const project = computed(() => props.project) as Ref<ComicProject | null>
const chapterId = computed(() => props.chapterId)
const projectId = computed(() => props.projectId)

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
/** 正在「AI 优化本页」的分镜（panelId 集合）。 */
const polishBusyIds = reactive(new Set<string>())
const batchPromptBusy = ref(false)
const batchGenBusy = ref(false)
const batchGenDone = ref(0)
const batchGenTotal = ref(0)
let batchGenCancelled = false

const promptModalVisible = ref(false)
const singleModalVisible = ref(false)

// ========== 内容阶段（由主页面页签行的「分镜」下拉持有，双向同步） ==========

/**
 * 分镜内容：顶栏是「生成分镜 + 手动导入」，右栏编辑分镜页块文本，底部为本页操作；
 * 提示词：顶栏是「批量推导描述 + 批量生图 + 导出发布 + 绘图配置」，右栏编辑画面描述，底部为单镜操作。
 * 状态由父页面 LongProject.vue 的页签行下拉（分镜 / 绘图）持有并传入；右栏「分镜内容 | 提示词」
 * 两个按钮写的是同一个 v-model，因此两处入口永远一致。
 */
const stage = defineModel<'storyboard' | 'draw'>('stage', { default: 'storyboard' })
const stageTabs = [
  { id: 'storyboard' as const, label: '分镜内容' },
  { id: 'draw' as const, label: '提示词' },
]

const configDrawerVisible = ref(false)
const exportBusy = ref(false)

/** 项目级绘图配置（绘画模型 + 共用属性），与短篇生图页共用存储。 */
const imageGenConfig = ref<ImageGenConfig>(migrateLegacyImageGenConfig(null))
const previewVisible = ref(false)
const previewImages = ref<string[]>([])
const previewIndex = ref(0)
const previewAlt = ref('')
/** 大图预览内删除的二次确认。 */
const previewDeleteVisible = ref(false)
const previewDeleteIndex = ref(0)

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

// ========== 资产接力引导（有分镜但本章资产未就绪 → 引导去资产 tab） ==========

/** 本章章节资产引用（确认提取后写入）。 */
const chapterAssetEntries = computed(() =>
  (project.value?.longProjectData?.chapterAssets ?? []).filter((entry) => entry.chapterId === chapterId.value))
/**
 * 本章资产上下文（注入分镜提示词 {{本章资产}} 变量）：章节引用按资产归组；
 * 引用带具体状态时只列被引用状态，否则（整资产引用 / 旧数据）列资产全部状态。
 * 本章未确认资产时为空数组，模板变量渲染为占位提示（存量模板未写该变量时自动退化）。
 */
const chapterAssetContexts = computed<ChapterAssetContext[]>(() => {
  if (!chapterAssetEntries.value.length) return []
  const groups = new Map<string, { asset: LongProjectAsset; variantIds: Set<string> }>()
  for (const entry of chapterAssetEntries.value) {
    const asset = assets.value.find((item) => item.id === entry.assetId)
    if (!asset) continue
    const group = groups.get(asset.id) ?? { asset, variantIds: new Set<string>() }
    if (entry.variantId) group.variantIds.add(entry.variantId)
    groups.set(asset.id, group)
  }
  return [...groups.values()].map(({ asset, variantIds }) => ({
    asset,
    variants: variantIds.size ? asset.variants.filter((variant) => variantIds.has(variant.id)) : asset.variants,
  }))
})
/** 本章最近一次资产提取 run（含手动导入）。 */
const latestAssetExtractRun = computed(() =>
  (project.value?.longProjectData?.assetExtractionRuns ?? [])
    .filter((run) => run.chapterId === chapterId.value)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null)
/** 资产接力引导条：有分镜、无章节资产引用且最近提取未确认（提取进行中不打扰）。 */
const showAssetHandoff = computed(() =>
  panels.value.length > 0
  && chapterAssetEntries.value.length === 0
  && latestAssetExtractRun.value?.status !== 'confirmed'
  && latestAssetExtractRun.value?.status !== 'running')

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

/** 本章原文分析 / 漫画剧本文档（分镜生成的管线上下文）。 */
const analysisDoc = computed(() => (project.value?.longProjectData?.chapterAnalyses ?? []).find((doc) => doc.chapterId === chapterId.value))
const scriptDoc = computed(() => (project.value?.longProjectData?.chapterScripts ?? []).find((doc) => doc.chapterId === chapterId.value))

/** 分镜生成主输入：漫画剧本优先，无剧本时章节原文兜底。 */
const storyboardSourceContent = computed(() => (scriptDoc.value?.content ?? '').trim() || (currentChapter.value?.content ?? ''))

const completedCount = computed(() => panelItems.value.filter((item) => item.artwork?.selectedImageId).length)
/** 已推导画面描述的分镜数（右栏绘图阶段进度徽标）。 */
const describedCount = computed(() => panelItems.value.filter((item) => item.artwork?.imagePrompt?.trim()).length)

const llmModels = computed(() => props.models.filter((model) => model.category === 'llm'))
const imageModels = computed(() => props.models.filter((model) => model.category === 'image'))

const panelPromptTemplates = computed(() =>
  props.templates.filter((template) => template.type === 'panel-prompt').sort((a, b) => a.sortOrder - b.sortOrder),
)
/** 「整章一次生成」模板（panel-prompt-chapter）：变量与输出协议都与逐镜模板不同。 */
const chapterPanelPromptTemplates = computed(() =>
  props.templates.filter((template) => template.type === 'panel-prompt-chapter').sort((a, b) => a.sortOrder - b.sortOrder),
)
const storyboardTemplates = computed(() =>
  props.templates.filter((template) => template.type === 'storyboard').sort((a, b) => a.sortOrder - b.sortOrder),
)

/** 绘图配置的共用属性（前置/后置共用属性的唯一来源）。 */
const sharedBlocks = computed(() => project.value?.imageGenConfig?.sharedBlocks ?? [])
const imageModelName = computed(() => imageModels.value.find((model) => model.id === config.imageModelId)?.name)

/** 批量生图目标：有描述、未成图、未在生成中。 */
const genTargets = computed(() =>
  panels.value.filter((panel) => {
    const artwork = artworkMap.value.get(panel.id)
    return Boolean(artwork?.imagePrompt?.trim()) && !artwork?.selectedImageId && artwork?.genStatus !== 'running'
  }),
)

/** 当前分镜参考图清单（唯一图号来源，生图 / 分组 / 提示词 / 中栏图N角标四处同源）。 */
function refManifestOf(panel: LongProjectStoryboardPanel) {
  return buildPanelRefManifest({ panel: toRaw(panel), assets: assets.value.map(toRaw), sharedBlocks: sharedBlocks.value })
}

/** 当前分镜清单（中栏资产绑定的「图N」角标与说明用）。 */
const currentRefManifest = computed(() => (currentPanel.value ? refManifestOf(currentPanel.value) : undefined))

/** 当前分镜参考图分组（按类型，右栏「参考图设置」勾选用）。
 * 顺序严格等于图号顺序：共用属性（style）→ 人物 → 场景 → 道具；每个视觉状态一张（单选口径）。 */
const currentRefGroups = computed<TypedRefGroup[]>(() => {
  const panel = currentPanel.value
  if (!panel) return []
  return groupManifestByType(refManifestOf(panel)).map((group) => ({
    type: group.type,
    images: group.images,
    numbers: group.entries.map((entry) => entry.index),
  }))
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

/**
 * 批量新增/更新分镜画面记录：合并为**一次** read-modify-write。
 *
 * 逐条 await upsertArtwork 会让每条都走一遍「DB 全量读 → 两次全量深拷贝 → 全量写回」，
 * 整章 34 镜就是 34 次全量 IO，导入会卡死界面；批量场景一律用本函数。
 */
function upsertArtworksBatch(items: Array<{ panelId: string; patch: Partial<LongProjectPanelArtwork> }>) {
  const chapter = currentChapter.value
  const panelIds = new Set(panels.value.map((item) => item.id))
  if (!chapter || !items.length) return Promise.resolve()
  return props.mutateLongProjectData((data) => {
    data.panelArtworks ??= []
    const now = Date.now()
    for (const { panelId, patch } of items) {
      // 分镜可能已被删除（导入/推导期间结构变动），跳过不存在镜
      if (!panelIds.has(panelId)) continue
      const index = data.panelArtworks.findIndex((item) => item.panelId === panelId)
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
    }
  })
}

/**
 * 设定本镜使用的参考图（**单选**，见 `resolvePanelRefImage`）。
 * 传空数组表示回到"未选"状态 —— 即取该视觉状态的第一张，不在绑定里留快照，
 * 这样资产里的图换序或删掉第一张后本镜能自动跟随。
 *
 * 视觉状态本身不在这里改：它由分镜文本自动绑定推导（沿用上一镜 → 章节范围默认）。
 */
function setBindingImages(payload: { panelId: string; assetId: string; imageIds: string[] }) {
  const run = currentRun.value
  if (!run) return
  const imageIds = payload.imageIds.slice(0, 1)
  void props.mutateLongProjectData((data) => {
    data.storyboardRuns = (data.storyboardRuns ?? []).map((item) => item.id === run.id
      ? {
          ...item,
          panels: item.panels.map((panel) => panel.id === payload.panelId
            ? {
                ...panel,
                assetBindings: panel.assetBindings.map((binding) => binding.assetId === payload.assetId
                  ? { ...binding, selectedImageIds: imageIds.length ? [...imageIds] : undefined }
                  : binding),
              }
            : panel),
          updatedAt: Date.now(),
        }
      : item)
  })
}

/**
 * 手动切换本镜某资产绑定的视觉状态（绑定卡状态 pill）。
 * 目标镜页级绑定写为 manual 来源（新状态 id/名/参考图；清空单选快照，回落新状态首图），
 * 格级「出场资产」声明同步更新状态（防后续序列化回写旧状态）；
 * 其后各镜的 auto-text 绑定以新状态为起点延续重算（model/manual/chapter-range 不动）。
 */
function setBindingVariant(payload: { panelId: string; assetId: string; variantId: string }) {
  const run = currentRun.value
  if (!run) return
  const asset = assets.value.find((item) => item.id === payload.assetId)
  const variant = asset?.variants.find((item) => item.id === payload.variantId)
  if (!asset || !variant) return
  const target = run.panels.find((panel) => panel.id === payload.panelId)
  if (!target) return
  const anchorPanels = run.panels.map((panel) => {
    if (panel.id !== payload.panelId) return panel
    // 页级绑定：该资产改 manual + 新状态（含参考图刷新；selectedImageIds 清空 = 未选，回落新状态首图）
    const assetBindings: LongProjectStoryboardAssetBinding[] = panel.assetBindings.map((binding) =>
      binding.assetId === payload.assetId
        ? {
            ...binding,
            visualVersionId: variant.id,
            visualVersionName: variant.name,
            matchSource: 'manual',
            referenceImageIds: [...variant.referenceImageIds],
            selectedImageIds: undefined,
          }
        : binding)
    // 格级「出场资产」声明同步新状态（无 assetId 的按资产名兜底匹配），防序列化回写旧状态
    const cells = panel.cells?.map((cell) => {
      if (!cell.assetBindings?.length) return cell
      return {
        ...cell,
        assetBindings: cell.assetBindings.map((binding) =>
          binding.assetId === payload.assetId || (!binding.assetId && binding.assetName.trim() === asset.name)
            ? { ...binding, visualVersionId: variant.id, visualVersionName: variant.name }
            : binding),
      }
    })
    return { ...panel, assetBindings, cells }
  })
  const nextPanels = reapplyVariantContinuation(anchorPanels, payload.assetId, variant.id, target.order, assets.value)
  void props.mutateLongProjectData((data) => {
    data.storyboardRuns = (data.storyboardRuns ?? []).map((item) =>
      item.id === run.id ? { ...item, panels: nextPanels ?? anchorPanels, updatedAt: Date.now() } : item)
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
  getChapterAssets: () => chapterAssetContexts.value,
  getAssets: () => assets.value,
  getChapterOrders: () => chapterOrders.value,
  notifyFallback: (message) => toast.info(message),
  notifyError: (message) => toast.error(message),
})

/** 组装分镜生成的最终发送提示词（分镜模板 + 漫画剧本 + 本章资产 + 原文分析 + 章节原文），供顶栏阶段操作栏使用。 */
function buildStoryboardRunPrompt(): string {
  const template = storyboardTemplates.value.find((item) => item.id === storyboardTemplateId.value)
  return buildStoryboardPrompt(
    template?.content ?? '',
    storyboardSourceContent.value,
    analysisDoc.value?.content ?? '',
    currentChapter.value?.content ?? '',
    chapterAssetContexts.value,
  )
}

/** 顶栏「分镜」阶段触发生成：PromptRunBar 已完成发送前确认，prompt 为最终版。 */
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
  const panels = parseStoryboardResponse(content, assets.value, currentChapter.value?.id ?? '', chapterOrders.value)
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

/** 整章画面描述手动导入（外部 AI 代跑「整章一次生成」后回贴）。 */
const promptImportVisible = ref(false)

/** 导入预览：按分镜标记对位，标出命中的镜号与方式。 */
function parsePromptImportPreview(content: string): { title: string; items: string[] } {
  const parsed = parseChapterPanelPrompts(content, panels.value.map((panel) => ({ id: panel.id, order: panel.order })))
  if (!parsed.entries.length) throw new Error('没有解析出任何分镜描述，请检查内容是否为空。')
  const head = parsed.mode === 'marked' ? `按 ## 分镜 N 对位到 ${parsed.entries.length} 个分镜` : `未找到分镜标记，按顺序对位到 ${parsed.entries.length} 个分镜（请核对序号）`
  const items = parsed.entries.map((entry) => `分镜 ${entry.order}：${entry.prompt.slice(0, 40)}${entry.prompt.length > 40 ? '…' : ''}`)
  if (parsed.missingOrders.length) items.push(`未对上（保持原样）：分镜 ${parsed.missingOrders.join('、')}`)
  return { title: head, items }
}

/** 确认导入整章画面描述：命中即覆盖描述，未命中的分镜保持原样。 */
const promptImportBusy = ref(false)

async function confirmPromptImport(content: string) {
  const parsed = parseChapterPanelPrompts(content, panels.value.map((panel) => ({ id: panel.id, order: panel.order })))
  if (!parsed.entries.length) {
    toast.error('没有解析出任何分镜描述')
    return
  }
  promptImportBusy.value = true
  try {
    await upsertArtworksBatch(parsed.entries.map((entry) => ({ panelId: entry.panelId, patch: { imagePrompt: entry.prompt, promptSource: 'manual' as const, promptStatus: 'done' as const } })))
  } finally {
    promptImportBusy.value = false
  }
  promptImportVisible.value = false
  toast[parsed.missingOrders.length ? 'warning' : 'success'](
    `已导入 ${parsed.entries.length} 个分镜的画面描述${parsed.missingOrders.length ? `，${parsed.missingOrders.length} 个未对上` : ''}`,
  )
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
  deleteDialogVisible,
  deleteDialogContent,
  confirmDeletePanel,
  openPanelMenu,
  movePanel,
  addPanel,
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

/** 右键菜单动作分发（页级结构操作在左栏右键菜单触发，操作后跟随选中）。 */
async function onPanelMenuAction(action: StoryboardMenuAction) {
  const panel = panelMenu.value.panel
  if (!panel) return
  if (action.action === 'move-up' || action.action === 'move-down') {
    const index = panels.value.findIndex((item) => item.id === panel.id)
    const direction = action.action === 'move-up' ? 'up' : 'down'
    await movePanel(panel.id, direction)
    const next = direction === 'up' ? index - 1 : index + 1
    if (next >= 0 && next < panels.value.length) currentIndex.value = next
    return
  }
  if (action.action === 'add-above' || action.action === 'add-below') {
    const newPanelId = await addPanel(panel.id, action.action === 'add-above' ? 'before' : 'after')
    const index = newPanelId ? panels.value.findIndex((item) => item.id === newPanelId) : -1
    if (index >= 0) currentIndex.value = index
    return
  }
  handlePanelMenuAction(action)
}

/**
 * 右栏「本页操作」——AI 优化：按分镜协议规整当前页（补镜头 / 拆超长台词 / 补说话人），
 * 不改动剧情与台词文字；使用顶栏所选分镜模型。text 为输入框当前文本，避免未失焦的编辑丢失。
 */
async function polishCurrentPanel(text: string) {
  const panel = currentPanel.value
  const model = llmModels.value.find((item) => item.id === storyboardModelId.value)
  if (!panel) return
  if (!model) { toast.warning('请先在顶部选择分镜模型'); return }
  const blockText = text.trim()
  if (!blockText) { toast.info('这一页还是空的，先写点内容再优化'); return }
  polishBusyIds.add(panel.id)
  try {
    const cells = await polishPanelBlock({ model: toRaw(model), blockText, scriptContext: scriptDoc.value?.content ?? '' })
    savePanelEdit({ panelId: panel.id, cells })
    toast.success('已按分镜协议优化本页')
  } catch (error) {
    console.error('[分镜优化] 失败:', error)
    toast.error(error instanceof Error ? error.message : '分镜优化失败')
  } finally {
    polishBusyIds.delete(panel.id)
  }
}

/**
 * 右栏「分镜内容」逐页编辑保存：页块文本解析出的格列表写回 run.panels（页级字段汇总回填），
 * 并同步自动绑定；画面变化且已有描述时标 stale 提示重新推导。
 */
function savePanelEdit(payload: PanelEditPayload) {
  const run = currentRun.value
  const chapter = currentChapter.value
  if (!run || !chapter) return
  const target = run.panels.find((panel) => panel.id === payload.panelId)
  if (!target) return
  const summary = summarizeCells(payload.cells)
  // 格级「出场资产」声明重解析：编辑器解析时未关联项目资产，保存时按声明绑定回项目资产与状态
  const cells = payload.cells.map((cell) => {
    if (!cell.assetBindings?.length) return cell
    return { ...cell, assetBindings: bindingsFromValue(serializeBindings(cell.assetBindings), assets.value, chapter.id, chapterOrders.value) }
  })
  // 页级绑定基线：格级声明汇总（文本「出场资产」行增删即声明增删）+ manual（绑定卡手选，同资产优先于文本声明）
  // + auto-text（保留旧项，交给 autoSyncBindings 按文本重算增删与状态延续）
  const declaredBindings = summarizeCellBindings(cells)
  const keyOf = (binding: LongProjectStoryboardAssetBinding) => binding.assetId ?? binding.assetName.trim()
  const manualBindings = (target.assetBindings ?? []).filter((binding) => binding.matchSource === 'manual')
  const manualKeys = new Set(manualBindings.map(keyOf))
  const autoTextBindings = cells.length ? (target.assetBindings ?? []).filter((binding) => binding.matchSource === 'auto-text') : []
  const mergedBindings = [
    ...manualBindings,
    ...declaredBindings.filter((binding) => !manualKeys.has(keyOf(binding))),
    ...autoTextBindings,
  ]
  const contentChanged = summary.content !== target.content
  const nextPanels = autoSyncBindings(
    run.panels.map((panel) =>
      panel.id === payload.panelId
        ? {
            ...panel,
            cells: cells.length ? cells : undefined,
            // 编辑框不含页头，格数标签按实际格数重算（左栏列表直接显示它，不能留过期值）
            cellLabel: cells.length ? cellCountLabel(cells.length) : undefined,
            shot: summary.shot,
            content: summary.content,
            dialogue: summary.dialogue,
            narration: summary.narration,
            assetBindings: mergedBindings,
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

/**
 * 模板解析：**本环节没有内置默认模板**（画面描述的拼法由用户自己的模板决定），
 * 空 id / 未命中一律返回 null，由弹窗与调用方提示「去新建模板」。
 */
function resolvePanelTemplate(templateId?: string): PromptTemplate | null {
  if (!templateId) return null
  return panelPromptTemplates.value.find((item) => item.id === templateId) ?? null
}

/** 整章一次生成模式的模板解析（panel-prompt-chapter）。 */
function resolveChapterTemplate(templateId?: string): PromptTemplate | null {
  if (!templateId) return null
  return chapterPanelPromptTemplates.value.find((item) => item.id === templateId) ?? null
}

/**
 * 一键新建画面描述模板：内容直接填入该类型的**推荐模板**，用户随后可在
 * 系统设置 → 提示词模板 里改；这样"模板"永远是用户自己的，而不是藏在代码里的内置文案。
 */
async function createPanelPromptTemplate(type: TemplateType): Promise<PromptTemplate | null> {
  const preset = RECOMMENDED_TEMPLATES[type]
  if (!preset) return null
  const now = Date.now()
  const all = await comicDb.getAllPromptTemplates()
  const maxOrder = all.length ? Math.max(...all.map((item) => item.sortOrder ?? 0)) : 0
  const template: PromptTemplate = {
    id: uuidv4(),
    name: preset.name,
    type,
    description: preset.description,
    content: preset.content,
    sortOrder: maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  }
  const result = await comicDb.savePromptTemplate(template)
  if (!result?.success) {
    toast.error('模板创建失败')
    return null
  }
  emit('templates-changed')
  toast.success(`已新建模板「${template.name}」，可在系统设置 → 提示词模板 中编辑`)
  return template
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

/**
 * 拼装单镜最终提示词（只按模板内容拼，运行时不追加任何协议段）；无模板返回空串。
 * 参考图清单用 `assetsOnly` 口径：只给资产图（图号仍是生图真实序号），
 * 共用属性正文不给模型——它由 `composeFinalPrompt` 在生图时拼到描述前后。
 */
function buildPromptForPanel(panel: LongProjectStoryboardPanel, index: number, template: PromptTemplate | null): string {
  if (!template) return ''
  return buildPanelPromptPrompt({
    templateContent: template.content,
    panel: toRaw(panel),
    chapterOutline: chapterOutline.value,
    prevEntries: prevEntriesOf(index),
    refManifestText: buildRefManifestText(refManifestOf(panel), { assetsOnly: true }),
    targetImageModel: imageModelName.value,
  })
}

/** 拼装「整章一次生成」提示词：全章分镜 + 各镜资产参考图清单；无模板返回空串。 */
function buildChapterPromptFor(template: PromptTemplate | null): string {
  if (!template) return ''
  const chapterPanels = panels.value.map(toRaw)
  const refManifestTexts = new Map(
    chapterPanels.map((panel) => [panel.id, buildRefManifestText(refManifestOf(panel), { assetsOnly: true })]),
  )
  return buildChapterPanelPromptPrompt({
    templateContent: template.content,
    panels: chapterPanels,
    refManifestTexts,
    targetImageModel: imageModelName.value,
  })
}

/** 批量弹窗预览：首个分镜的拼装示例（批量始终全部重新推导）。 */
function buildBatchPromptPreview(template: PromptTemplate | null): string {
  if (!template || !panels.value.length) return ''
  return buildPromptForPanel(panels.value[0], 0, template)
}

/** 整章一次生成弹窗预览：全章提示词（不截断，完整展示模型将收到的内容）。 */
function buildChapterPromptPreview(template: PromptTemplate | null): string {
  if (!panels.value.length) return ''
  return buildChapterPromptFor(template)
}

/**
 * 逐镜批量复制时附加的输出格式要求 —— **只加在复制文本里，不写进模板**：
 * 内置调用是逐镜的、本就知道是哪一镜，不需要标记；写进模板反而污染内置输出。
 */
const COPY_FORMAT_NOTE = `【输出格式要求】
为每一镜各输出一段，逐镜之间用 ## 分镜 N 标题行分段；N 必须与上面的分镜序号一致，按序号递增，不遗漏、不新增、不打乱顺序。
每段内部严格按各镜提示词中的返回格式输出三部分：「资产参考图：」小节照抄该镜清单中该镜用到的图行 → 「请根据以上参考图生成一页N格漫画。」→ 逐格「第X格：」小节。`

/** 复制到外部 AI 的文本：整章一次 → 与内置调用完全一致；逐镜依次 → 全章逐镜拼接 + 输出格式要求。 */
function buildCopyText(template: PromptTemplate | null, source: 'per-panel' | 'chapter'): string {
  if (!template) return ''
  if (source === 'chapter') return buildChapterPromptFor(template)
  const parts = panels.value.map((panel, index) => `## 分镜 ${panel.order}\n${buildPromptForPanel(panel, index, template)}`)
  return [COPY_FORMAT_NOTE, ...parts].join('\n\n')
}

/** 单镜弹窗预览：当前分镜的最终提示词（可在弹窗内编辑）。 */
function buildSinglePromptPreview(template: PromptTemplate | null): string {
  if (!currentPanel.value) return ''
  return buildPromptForPanel(currentPanel.value, currentIndex.value, template)
}

/** 批量推导入口：按发送方式分流到「逐条发送（逐镜依次）」或「一次性发送（整章一次）」。 */
async function runBatchPrompts(options: { modelId: string; templateId: string; source?: 'per-panel' | 'chapter' }) {
  if (options.source === 'chapter') return runChapterPrompts(options)
  generalRunPrompts(options)
}

/** 逐条发送：按分镜顺序依次执行，每镜一次 LLM 调用，前文滑动窗口自动关联。始终全部重新推导（覆盖已有描述）。 */
async function generalRunPrompts(options: { modelId: string; templateId: string }) {
  const model = llmModels.value.find((item) => item.id === options.modelId)
  const template = resolvePanelTemplate(options.templateId)
  if (!model || !template) {
    toast.warning('请先选择一个「分镜画面描述」模板')
    return
  }
  const targets = panels.value.map((panel, index) => ({ panel, index }))
  if (!targets.length) {
    toast.warning('本章暂无分镜')
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

/**
 * 整章一次：一次 LLM 调用产出全章各镜描述，按 `## 分镜 N` 标题分段对位写回。
 *
 * 与逐镜的差别：调用 1 次（快、便宜、上下文全局一致），但没有滑动窗口的「已生成描述」做
 * 连续性锚点，且长章可能被截断 / 模型漏段 —— 因此对位失败会逐条提示，未对上的镜保持原状、
 * 不覆盖已有描述，用户可直接改用逐镜模式只补这几镜。
 */
async function runChapterPrompts(options: { modelId: string; templateId: string }) {
  const model = llmModels.value.find((item) => item.id === options.modelId)
  const template = resolveChapterTemplate(options.templateId)
  if (!model || !template) {
    toast.warning('请先选择一个「分镜画面描述（整章一次生成）」模板')
    return
  }
  const targets = panels.value.map((panel) => ({ panel }))
  if (!targets.length) {
    toast.warning('本章暂无分镜')
    return
  }
  promptModalVisible.value = false
  batchPromptBusy.value = true
  config.promptModelId = options.modelId
  saveConfig()
  targets.forEach(({ panel }) => promptBusyIds.add(panel.id))
  try {
    const prompt = buildChapterPromptFor(template)
    const raw = await inferPanelPrompt({ model: toRaw(model), prompt })
    const parsed = parseChapterPanelPrompts(raw, panels.value.map((panel) => ({ id: panel.id, order: panel.order })))
    await upsertArtworksBatch([
      ...parsed.entries.map((entry) => ({ panelId: entry.panelId, patch: { imagePrompt: entry.prompt, promptSource: 'inferred' as const, promptStatus: 'done' as const } })),
      // 未对上的镜按失败标记（保留已有描述不动）
      ...parsed.missingOrders
        .map((order) => panels.value.find((item) => item.order === order)?.id)
        .filter((id): id is string => Boolean(id))
        .map((panelId) => ({ panelId, patch: { promptStatus: 'failed' as const } })),
    ])
    const ok = parsed.entries.length
    if (parsed.mode === 'sequential' && ok) {
      toast.info('模型未输出分镜标记，已按顺序对位，请逐镜核对')
    }
    toast[parsed.missingOrders.length ? 'warning' : 'success'](
      `整章推导完成：成功 ${ok}，未对上 ${parsed.missingOrders.length}`,
    )
  } catch (error) {
    console.error('[分镜推导] 整章生成失败:', error)
    toast.error(error instanceof Error ? error.message : '整章推导失败')
  } finally {
    targets.forEach(({ panel }) => promptBusyIds.delete(panel.id))
    batchPromptBusy.value = false
  }
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
      options.prompt?.trim() || buildPromptForPanel(panel, currentIndex.value, resolvePanelTemplate(options.templateId))
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

/**
 * 生图参考图：直接取参考图清单（唯一图号来源）。
 * 顺序 = 共用属性图（插入最前）→ 人物 → 场景 → 道具；不做截断，全部发送。
 */
function panelRefImages(panel: LongProjectStoryboardPanel): string[] {
  return refManifestOf(panel).images
}

/** 单镜生图：三层拼接提示词（前置共用属性 + 画面描述 + 后置共用属性）+ 清单参考图。refImages 可覆盖默认参考图。 */
async function generatePanelImage(panel: LongProjectStoryboardPanel, refImages?: string[]): Promise<boolean> {
  const artwork = artworkMap.value.get(panel.id)
  const description = artwork?.imagePrompt?.trim()
  if (!description) {
    toast.warning('请先推导或编辑画面描述')
    return false
  }
  // 共用属性不进 imagePrompt 字段：改画风 / 换共用属性图不必重跑 LLM，下次生图自动生效
  const prompt = composeFinalPrompt(description, sharedBlocks.value)
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
        // 生成即显示即使用：新图直接成为当前成图（多张时悬停可切回旧图）
        selectedImageId: result.imageUrl,
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
  await generatePanelImage(panel, refs)
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

// ========== 成图切换与删除（显示哪张就用哪张，导出即当前显示张） ==========

/** 切换成图：方向 -1 上一张 / 1 下一张（循环），切换立即落库生效。 */
function switchPanelImage(direction: -1 | 1) {
  const panel = currentPanel.value
  const artwork = currentArtwork.value
  const list = artwork?.generatedImageIds ?? []
  if (!panel || !artwork || list.length < 2) return
  const index = artwork.selectedImageId ? Math.max(0, list.indexOf(artwork.selectedImageId)) : 0
  const next = (index + direction + list.length) % list.length
  void upsertArtwork(panel.id, { selectedImageId: list[next] })
}

/** 删除当前显示的成图（PanelPreview 内已弹窗确认）。 */
function deleteCurrentGenImage() {
  const panel = currentPanel.value
  const artwork = currentArtwork.value
  if (!panel || !artwork?.selectedImageId) return
  removeGenImage((artwork.generatedImageIds ?? []).indexOf(artwork.selectedImageId))
}

/** 删除指定生成图；被删的是显示图时回落到剩余第一张，删空则回到未生成状态。 */
function removeGenImage(index: number) {
  const panel = currentPanel.value
  const artwork = currentArtwork.value
  if (!panel || !artwork || index < 0) return
  const next = (artwork.generatedImageIds ?? []).filter((_, i) => i !== index)
  const patch: Partial<LongProjectPanelArtwork> = { generatedImageIds: next }
  if (artwork.selectedImageId && !next.includes(artwork.selectedImageId)) {
    if (next.length) patch.selectedImageId = next[0]
    else {
      patch.selectedImageId = undefined
      patch.genStatus = 'none'
    }
  }
  void upsertArtwork(panel.id, patch)
}

// ========== 大图预览 ==========

function openPreview(payload: { images: string[]; index: number }) {
  previewImages.value = [...payload.images]
  previewIndex.value = payload.index
  previewAlt.value = `分镜 ${currentPanel.value?.order ?? ''} · 图片`
  previewVisible.value = true
}

/** 大图预览内删除：先弹窗确认，确认后才真正删除（仅支持删除当前分镜的生成图）。 */
function requestRemovePreviewImage(index: number) {
  previewDeleteIndex.value = index
  previewDeleteVisible.value = true
}

function confirmRemovePreviewImage() {
  const index = previewDeleteIndex.value
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

<style scoped>
/* 撤销条淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<template>
  <div class="h-screen flex flex-col overflow-hidden relative bg-app-bg">
    <!-- 背景装饰 -->
    <div class="absolute top-10 right-1/4 w-96 h-96 bg-[#07c160]/8 rounded-full blur-[120px] pointer-events-none" />
    <div class="absolute bottom-10 left-1/3 w-80 h-80 bg-[#07c160]/5 rounded-full blur-[100px] pointer-events-none" />

    <main class="flex-1 flex flex-col overflow-hidden relative">
      <!-- 顶部 header -->
      <div class="shrink-0 h-14 px-6 border-b border-border-subtle flex items-center gap-4">
        <button
          class="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors text-sm"
          @click="goBack"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回
        </button>
        <div class="w-px h-4 bg-border-subtle" />
        <h1 class="text-sm font-semibold text-text-primary leading-7">
          {{ comicSync.projectName }} · 同步至公众号
        </h1>
        <div class="flex-1" />
        <span v-if="isSaving" class="text-[10px] text-text-tertiary">保存中...</span>
        <span v-else-if="lastSavedAt" class="text-[10px] text-text-tertiary">已保存</span>
      </div>

      <Teleport to="body">
      <div
        v-if="showSyncTerminal"
        class="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
        @click.self="closeSyncTerminal"
      >
        <section class="flex h-[min(620px,calc(100vh-2rem))] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
          <header class="flex shrink-0 items-center gap-2 border-b border-slate-700 bg-slate-900 px-4 py-3">
            <span class="h-3 w-3 rounded-full bg-red-500/90"></span>
            <span class="h-3 w-3 rounded-full bg-amber-400/90"></span>
            <span class="h-3 w-3 rounded-full bg-emerald-400/90"></span>
            <span class="ml-2 font-mono text-[11px] tracking-[0.18em] text-slate-400">WECHAT_SYNC_TERMINAL</span>
            <span
              class="ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium"
              :class="isPublishing ? 'bg-emerald-500/15 text-emerald-300' : syncTerminalFailed ? 'bg-red-500/15 text-red-300' : 'bg-slate-700 text-slate-300'"
            >
              {{ isPublishing ? '运行中' : syncTerminalFailed ? '失败' : '完成' }}
            </span>
            <button
              class="ml-2 rounded p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="isPublishing"
              aria-label="关闭同步日志"
              @click="closeSyncTerminal"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </header>
          <div ref="syncTerminalRef" class="min-h-0 flex-1 overflow-y-auto p-4 font-mono text-xs leading-6">
            <div v-for="(log, index) in consoleLogs" :key="`${index}-${log}`" :class="getSyncLogClass(log)">
              {{ log }}
            </div>
            <div v-if="isPublishing" class="animate-pulse text-emerald-300">▋</div>
          </div>
          <footer class="flex shrink-0 items-center justify-between border-t border-slate-800 bg-slate-900/80 px-4 py-2.5">
            <span class="text-[11px] text-slate-500">{{ consoleLogs.length }} 条运行日志</span>
            <button class="text-xs text-slate-300 transition-colors hover:text-white" @click="clearSyncTerminalLogs">清空日志</button>
          </footer>
        </section>
      </div>
    </Teleport>

    <!-- 三栏布局 -->
      <div class="flex-1 flex overflow-hidden gap-3 p-3">
        <!-- 左栏：图片队列 + 项目信息（tab 切换） -->
        <SyncImageQueue
          v-if="!isPreloadingImages"
          :images="comicSync.sourceImages"
          :get-image-url="getImageUrl"
          :project-title="projectInfo.title"
          :project-tags="projectInfo.tags"
          :creative-notes="projectInfo.creativeNotes"
          @preview="handlePreviewImage"
        />
        <aside
          v-else
          class="w-[20%] min-w-[220px] max-w-[280px] rounded-xl bg-surface border border-border-subtle shadow-lg shadow-black/20 overflow-hidden flex flex-col items-center justify-center"
        >
          <svg class="w-5 h-5 text-[#07c160] animate-spin mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span class="text-xs text-text-tertiary">加载图片中...</span>
        </aside>

        <!-- 中栏：手机预览 -->
        <div
          class="flex-1 rounded-xl bg-surface border border-border-subtle shadow-lg shadow-black/20 overflow-hidden flex flex-col items-center p-4 relative"
          style="min-width: 320px"
        >
          <!-- 预览模式切换（参考 TypesetView，置于手机预览上方居中） -->
          <div class="w-full max-w-md mb-4 flex items-center justify-center gap-2 shrink-0">
            <div class="flex bg-app-bg rounded-lg p-0.5 border border-border-subtle">
              <button
                v-for="mode in previewModes"
                :key="mode.value"
                class="px-4 py-1.5 text-xs font-medium rounded-md transition-colors"
                :class="comicSync.previewMode === mode.value ? 'bg-[#07c160] text-white shadow-sm' : 'text-text-tertiary hover:text-text-secondary hover:bg-surface'"
                @click="comicSync.setPreviewMode(mode.value)"
              >
                {{ mode.label }}
              </button>
            </div>
          </div>

          <!-- 图片预加载完成前显示加载状态，不渲染图片组件避免重复请求 -->
          <div v-if="isPreloadingImages" class="flex-1 w-full flex flex-col items-center justify-center">
            <div class="flex items-center gap-3 mb-3">
              <svg class="w-5 h-5 text-[#07c160] animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span class="text-sm text-text-secondary">加载图片中...</span>
            </div>
            <div class="w-40 h-1.5 bg-app-bg rounded-full overflow-hidden">
              <div
                class="h-full bg-[#07c160] rounded-full transition-all duration-300"
                :style="{ width: `${Math.round(preloadProgress * 100)}%` }"
              />
            </div>
            <span class="text-[10px] text-text-tertiary mt-1.5">
              {{ Math.round(preloadProgress * 100) }}%
            </span>
          </div>

          <!-- 预加载完成后渲染图片组件 -->
          <div v-else class="flex-1 w-full flex items-center justify-center overflow-hidden">
            <PhoneMockup class="max-h-[calc(100vh-220px)]">
              <template v-if="comicSync.previewMode === 'cover'">
                <CoverPreview
                  v-model:ratio="selectedCoverRatio"
                  :template-id="comicSync.coverConfig.templateId"
                  :generated-cover-image="comicSync.coverConfig.generatedCoverImage"
                  :images="comicSync.sourceImages as any"
                  :selected-cover-index="0"
                  :title="comicSync.title"
                  :subtitle="comicSync.subtitle"
                  :get-image-url="getImageUrl"
                  :pic-crop-235="comicSync.coverConfig.pic_crop_235_1"
                  :pic-crop-11="comicSync.coverConfig.pic_crop_1_1"
                  @crop="handleCropRequest"
                />
              </template>
              <template v-else>
                <ContentPreview
                  :title="comicSync.title"
                  :subtitle="comicSync.subtitle"
                  :account-name="wechatOfficialAccountName"
                  :template-id="currentTemplateId"
                  :images="comicSync.sourceImages as any"
                  :processed-html="processedTemplateHtml"
                  :source-url="comicSync.syncData.sourceUrl"
                  :get-image-url="getImageUrl"
                  :article-id="comicSync.articleId"
                  :stored-content-blocks="comicSync.contentBlocks as any"
                  :stored-container-style="comicSync.containerStyle"
                  :style-insert-config="comicSync.styleInsertConfig as any"
                  @open-style-manager="showStyleTemplateModal = true"
                  @edit-style-template="handleEditStyleTemplate"
                  @update:content-blocks="handleContentBlocksUpdate"
                />
              </template>
            </PhoneMockup>
          </div>
        </div>

        <!-- 右栏：配置面板 -->
        <SyncConfigPanel
          :model-tab="comicSync.configTab"
          :title="comicSync.title"
          :subtitle="comicSync.subtitle"
          :cover-template-id="comicSync.coverConfig.templateId"
          :cover-template-name="coverTemplateName"
          :cover-image-ids="comicSync.coverConfig.selectedImageIds"
          :generated-cover-image="comicSync.coverConfig.generatedCoverImage"
          :pic-crop-235="comicSync.coverConfig.pic_crop_235_1"
          :pic-crop-11="comicSync.coverConfig.pic_crop_1_1"
          :is-generating-cover="isGeneratingCover"
          :layout-template-id="comicSync.layoutConfig.templateId"
          :images="comicSync.sourceImages"
          :get-image-url="getImageUrl"
          :is-publishing="isPublishing"
          :can-publish="canPublish"
          :accounts="wechatAccountStore.accounts"
          :selected-account-id="comicSync.wechatAccountId"
          @update:tab="comicSync.setConfigTab"
          @update:title="comicSync.updateTitle"
          @update:subtitle="comicSync.updateSubtitle"
          @open-cover-template-selector="showCoverTemplateSelector = true"
          @open-image-selector="showImageSelector = true"
          @open-image-position-editor="showImagePositionEditor = true"
          @crop="handleCropRequest"
          @regenerate-cover="handleRegenerateCover"
          @update:layout-template="handleUpdateLayoutTemplate"
          @open-image-manager="showImageManager = true"
          @open-template-manager="showTemplateModal = true"
          @open-account-selector="showAccountSelector = true"
          @publish="handlePublish"
        />
      </div>
    </main>

    <!-- ========== Modals & Drawers ========== -->
    <ModalCoverTemplateSelector
      :visible="showCoverTemplateSelector"
      :current-template-id="comicSync.coverConfig.templateId"
      @close="showCoverTemplateSelector = false"
      @select="handleCoverTemplateSelect"
      @open-cover-template="showCoverTemplateSelector = false; showCoverTemplateManager = true"
    />

    <ModalCoverTemplate
      :visible="showCoverTemplateManager"
      @close="showCoverTemplateManager = false"
    />

    <CoverImageSelectorDrawer
      :visible="showImageSelector"
      :images="comicSync.sourceImages as any"
      :selected-image-ids="comicSync.coverConfig.selectedImageIds"
      :required-count="coverTemplateImageCount"
      :get-image-url="getImageUrl"
      :image-crop-rects="comicSync.coverConfig.imageCropRects"
      @close="showImageSelector = false"
      @update:selected-image-ids="handleUpdateCoverImageIds"
      @update:image-crop-rects="handleUpdateImageCropRects"
    />

    <CoverCropTool
      :visible="showCoverCropTool"
      :image-src="cropImageSrc"
      :initial-crop-235="comicSync.coverConfig.pic_crop_235_1"
      :initial-crop-11="comicSync.coverConfig.pic_crop_1_1"
      @close="showCoverCropTool = false"
      @confirm="handleCoverCropConfirm"
    />

    <!-- 排版模板管理（ModalTemplateSelector 和 StyleTemplateDrawer 已由 ArticleLayoutConfig 内部自带） -->
    <ModalTemplate
      :visible="showTemplateModal"
      @close="showTemplateModal = false"
    />

    <!-- 样式模板编辑 -->
    <ModalStyleTemplate
      :visible="showStyleTemplateModal"
      :template-id-to-edit="styleTemplateIdToEdit"
      @close="handleCloseStyleModal"
    />

    <!-- 封面图片位置编辑器 -->
    <CoverImagePositionEditor
      :visible="showImagePositionEditor"
      :images="selectedCoverImagesForPosition"
      :get-image-url="getImageUrl"
      :current-crop-rects="comicSync.coverConfig.imageCropRects"
      :slot-ratios="currentArticleSlotRatios"
      @close="showImagePositionEditor = false"
      @confirm="handleImagePositionConfirm"
    />

    <ImageManagerDrawer
      :visible="showImageManager"
      :images="comicSync.sourceImages as any"
      :get-image-url-fn="getImageUrl"
      @close="showImageManager = false"
      @update:images="handleUpdateImages"
    />

    <!-- 公众号账号选择 Modal -->
    <div
      v-if="showAccountSelector"
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      @click.self="showAccountSelector = false"
    >
      <div class="bg-surface rounded-xl border border-border-subtle shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col overflow-hidden">
        <div class="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <h3 class="text-sm font-semibold text-text-primary">选择公众号</h3>
          <button class="text-text-tertiary hover:text-text-primary" @click="showAccountSelector = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-3 space-y-2">
          <div
            v-for="acc in wechatAccountStore.accounts"
            :key="acc.id"
            class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
            :class="comicSync.wechatAccountId === acc.id ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-border-subtle hover:border-cyan-500/30'"
            @click="handleSelectAccount(acc.id)"
          >
            <div class="w-9 h-9 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-sm font-medium flex-shrink-0">
              {{ acc.nickname.charAt(0) || '微' }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-text-primary truncate">{{ acc.nickname }}</div>
              <div class="text-[10px] text-text-tertiary truncate">{{ acc.appId }}</div>
            </div>
            <span v-if="acc.isDefaultSync" class="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">默认</span>
          </div>
          <div
            v-if="wechatAccountStore.accounts.length === 0"
            class="text-center py-8 text-xs text-text-tertiary"
          >
            暂无公众号账号<br />请先在设置中添加
          </div>
        </div>
      </div>
    </div>

    <!-- 图片大图预览 -->
    <div
      v-if="previewingImage"
      class="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8"
      @click.self="previewingImage = null"
    >
      <button class="absolute top-4 right-4 text-white hover:text-slate-300" @click="previewingImage = null">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <img
        :src="getImageUrl(previewingImage.path)"
        class="max-w-full max-h-[90vh] object-contain rounded-lg"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { comicDb } from '@/api/comic'
import { useToast } from '@comic/composables/useToast'
import { useComicSyncStore } from '@comic/stores/sync'
import { useCoverTemplateStore } from '@/stores/coverTemplate'
import { useTemplateStore } from '@/stores/template'
import { useStyleTemplateStore } from '@/stores/styleTemplate'
import { useWechatAccountStore } from '@/stores/wechatAccount'
import { useCoverGenerator } from '@/composables/useCoverGenerator'
import { useWechatUpload, extractLocalImagePaths } from '@/composables/useWechatUpload'
import { expandTemplateWithImages } from '@/composables/useTemplateRender'
import { useImagePreload } from '@comic/composables/useImagePreload'
import { getCoverSlotRatios } from '@/utils/coverSlotRatios'
import type { ComicContentBlock, ComicProject } from '@comic/types'
import type { ContentBlock } from '@/types'
import PhoneMockup from '@/components/common/PhoneMockup.vue'
import CoverPreview from '@/components/typeset/CoverPreview.vue'
import ContentPreview from '@/components/typeset/ContentPreview.vue'
import ModalCoverTemplateSelector from '@/components/layout/ModalCoverTemplateSelector.vue'
import ModalCoverTemplate from '@/components/layout/ModalCoverTemplate.vue'
import CoverImageSelectorDrawer from '@/components/common/CoverImageSelectorDrawer.vue'
import CoverCropTool from '@/components/common/CoverCropTool.vue'
import CoverImagePositionEditor from '@/components/common/CoverImagePositionEditor.vue'
import ModalTemplate from '@/components/layout/ModalTemplate.vue'
import ModalStyleTemplate from '@/components/layout/ModalStyleTemplate.vue'
import ImageManagerDrawer from '@/components/typeset/ImageManagerDrawer.vue'
import SyncImageQueue from './SyncImageQueue.vue'
import SyncConfigPanel from './SyncConfigPanel.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const projectId = route.params.projectId as string

const comicSync = useComicSyncStore()
const coverTemplateStore = useCoverTemplateStore()
const templateStore = useTemplateStore()
const styleTemplateStore = useStyleTemplateStore()
const wechatAccountStore = useWechatAccountStore()

const { generateCoverImage, getCoverTemplateImageCount } = useCoverGenerator({
  coverTemplates: coverTemplateStore.coverTemplates,
  getImageUrl: (path) => getImageUrl(path),
  addLog: (msg) => console.log('[cover]', msg),
})

const { startBatchUpload, consoleLogs, uploadError } = useWechatUpload()

// === 图片预加载（避免多张远程大图同时加载导致卡顿） ===
const { isLoading: isPreloadingImages, progress: preloadProgress, preload } = useImagePreload({ concurrency: 3 })

// === Modal 状态 ===
const showCoverTemplateSelector = ref(false)
const showCoverTemplateManager = ref(false)
const showImageSelector = ref(false)
const showCoverCropTool = ref(false)
const showTemplateModal = ref(false)
const showStyleTemplateModal = ref(false)
const showImagePositionEditor = ref(false)
const showImageManager = ref(false)
const showAccountSelector = ref(false)
const styleTemplateIdToEdit = ref<string | undefined>(undefined)
const selectedCoverRatio = ref<'235' | '11'>('235')
const previewingImage = ref<{ path: string; name: string } | null>(null)

// === 状态 ===
const isGeneratingCover = ref(false)
const isPublishing = ref(false)
const isSaving = ref(false)
const lastSavedAt = ref(false)
const showSyncTerminal = ref(false)
const syncTerminalRef = ref<HTMLElement | null>(null)
const syncTerminalError = ref<string | null>(null)
const syncTerminalFailed = computed(() => Boolean(syncTerminalError.value || uploadError.value))

// === 项目信息（左侧"项目信息" tab 展示，同导出发布页） ===
const projectInfo = ref<{ title: string; tags: string[]; creativeNotes: Record<string, string> }>({
  title: '',
  tags: [],
  creativeNotes: {},
})

/** 从页面 JSON 数据中提取标签（与导出发布页逻辑一致） */
function extractTagsFromPages(pages: Record<string, unknown>[]): string[] {
  const tagKeys = ['标签', 'tags', '类型', '分类', '风格', 'genre']
  for (const page of pages) {
    for (const key of tagKeys) {
      const val = page[key]
      if (typeof val === 'string' && val.trim())
        return val.split(/[,，、]/).map((s) => s.trim()).filter(Boolean)
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string')
        return val.map(String)
    }
  }
  return []
}

/** 加载项目信息：优先 publishData，其次从 pageData 提取（与导出发布页逻辑一致） */
function loadProjectInfo(project: ComicProject) {
  if (project.publishData) {
    projectInfo.value = {
      title: project.publishData.title || '',
      tags: project.publishData.tags || [],
      creativeNotes: project.publishData.creativeNotes || {},
    }
  } else if (project.pageData) {
    const rawTags = extractTagsFromPages(project.pageData.pages || [])
    projectInfo.value = {
      title: project.pageData.title || '',
      tags: rawTags,
      creativeNotes: {},
    }
  }
}

const previewModes = [
  { label: '封面', value: 'cover' as const },
  { label: '正文', value: 'content' as const },
]

// === 计算属性 ===
const coverTemplateName = computed(() => {
  const tid = comicSync.coverConfig.templateId
  if (!tid) return ''
  const tpl = coverTemplateStore.coverTemplates.find((t) => t.id === tid)
  return tpl?.name || '未知模板'
})

const coverTemplateImageCount = computed(() =>
  getCoverTemplateImageCount(comicSync.coverConfig.templateId || ''),
)

const wechatOfficialAccountName = computed(() => {
  const acc = wechatAccountStore.accounts.find((a) => a.id === comicSync.wechatAccountId)
  return acc?.nickname || '微信公众号配置名称'
})

const selectedAccount = computed(() =>
  wechatAccountStore.accounts.find((a) => a.id === comicSync.wechatAccountId),
)

const currentTemplate = computed(() => {
  const tid = currentTemplateId.value
  if (!tid || tid === 'flow' || tid === 'card') return null
  return templateStore.customTemplates.find((t) => t.id === tid) || null
})

/** 当前排版模板 ID（无自定义模板时默认 flow，与矩阵发布保持一致） */
const currentTemplateId = computed(() => {
  return comicSync.layoutConfig.templateId || 'flow'
})

/** 图片路径签名，仅当图片路径或顺序变化时才重新渲染模板 */
const imageSignature = computed(() =>
  comicSync.sourceImages.map((i) => i.path).join('|'),
)

const processedTemplateHtml = computed(() => {
  if (!currentTemplate.value) return ''
  // 依赖 imageSignature 而非整个 sourceImages 对象，避免无谓重算
  void imageSignature.value
  return expandTemplateWithImages(
    currentTemplate.value.html,
    comicSync.sourceImages,
    getImageUrl,
  )
})

const canPublish = computed(() => {
  return !!selectedAccount.value && comicSync.sourceImages.length > 0 && !!comicSync.title
})

/** 封面位置编辑器：选中的封面图片列表 */
const selectedCoverImagesForPosition = computed(() => {
  const ids = comicSync.coverConfig.selectedImageIds
  return ids
    .map((id) => comicSync.sourceImages.find((img) => img.id === id))
    .filter((img): img is NonNullable<typeof img> => !!img)
})

/** 封面位置编辑器：当前封面模板的槽位比例 */
const currentArticleSlotRatios = computed(() => {
  const tid = comicSync.coverConfig.templateId
  if (!tid) return []
  const tpl = coverTemplateStore.coverTemplates.find((t) => t.id === tid)
  if (!tpl) return []
  return getCoverSlotRatios(tpl.html)
})

const cropImageSrc = computed(() => {
  if (comicSync.coverConfig.generatedCoverImage) {
    return comicSync.coverConfig.generatedCoverImage
  }
  const firstId = comicSync.coverConfig.selectedImageIds[0]
  if (firstId) {
    const img = comicSync.sourceImages.find((i) => i.id === firstId)
    if (img) return getImageUrl(img.path)
  }
  return ''
})

// === 初始化 ===
onMounted(async () => {
  await Promise.all([
    coverTemplateStore.loadCoverTemplates(),
    templateStore.loadTemplates(),
    styleTemplateStore.loadCustomTemplates(),
    wechatAccountStore.loadAccounts(),
  ])

  const project = await comicDb.getProject(projectId)
  if (!project) {
    toast.error('项目不存在')
    router.push('/comic/projects')
    return
  }

  // 加载项目信息（标题、标签、创作备注），用于左侧"项目信息" tab 展示
  loadProjectInfo(project)

  comicSync.init(
    projectId,
    project.name,
    project.generatedImages,
    project.syncData,
  )

  // 右侧标题取解析项目 JSON 时的标题字段（优先 publishData.title，其次 pageData.title）
  // 仅在首次进入（无 syncData）或标题为空时覆盖，避免覆盖用户已编辑的标题
  const parsedTitle = project.publishData?.title || project.pageData?.title || ''
  if (parsedTitle && !comicSync.title) {
    comicSync.updateTitle(parsedTitle)
  }

  // 预加载所有图片（限制并发，避免卡顿）
  preload(comicSync.sourceImages.map((img) => getImageUrl(img.path)))

  // 图片变化（重新解析/生图后）时，按封面模板要求补全选中图片，并自动重新生成封面
  if (comicSync.imagesChanged) {
    await maybeAutoRegenerateCover()
  }

  // 开启自动保存：用脏标记 + 定时器轮询，避免 deep watch 遍历含 html 长字符串的 syncData 导致卡顿
  startAutoSave()
})

/**
 * 图片变化后自动重新生成封面：
 * - 按当前封面模板需要的图片数量补全 selectedImageIds
 * - 若已有封面模板和选中图片，静默调用封面生成
 */
async function maybeAutoRegenerateCover() {
  const { templateId, selectedImageIds } = comicSync.coverConfig
  if (!templateId) return
  // 按模板要求补全选中图片（默认仅选了第一张）
  const need = getCoverTemplateImageCount(templateId)
  if (need > 0 && selectedImageIds.length < need) {
    const ids = comicSync.sourceImages.slice(0, need).map((img) => img.id)
    comicSync.updateCoverConfig({ selectedImageIds: ids })
  }
  if (comicSync.coverConfig.selectedImageIds.length === 0) return
  isGeneratingCover.value = true
  try {
    const result = await generateCoverImage(
      comicSync.coverConfig.templateId,
      comicSync.coverConfig.selectedImageIds,
      comicSync.sourceImages,
      comicSync.coverConfig.imageCropRects,
    )
    if (result) {
      const coverPath = await window.electronAPI.saveBase64Image(
        result,
        `comic-cover-${projectId}.png`,
      )
      comicSync.updateCoverConfig({
        generatedCoverImage: result,
        generatedCoverImagePath: coverPath,
        pic_crop_235_1: '0_0_1_1',
        pic_crop_1_1: '0.287234_0_0.712766_1',
      })
    }
  } catch (e) {
    console.error('[comic-sync] 自动重新生成封面失败:', e)
  } finally {
    isGeneratingCover.value = false
  }
}

// === 持久化 ===
// 用脏标记 + 定时器轮询替代 deep watch syncData
// 避免 deep watch 遍历含 html 长字符串的 contentBlocks 导致输入卡顿
let isDirty = false
let saveIntervalId: ReturnType<typeof setInterval> | null = null

/** 标记数据已变化，需要保存 */
function markDirty() {
  isDirty = true
}

/** 启动自动保存定时器：每 2 秒检查一次脏标记，有变化才保存 */
function startAutoSave() {
  if (saveIntervalId) return
  saveIntervalId = setInterval(async () => {
    if (!isDirty) return
    isDirty = false
    await doSave()
  }, 2000)
}

/** 执行保存 */
async function doSave() {
  isSaving.value = true
  try {
    const project = await comicDb.getProject(projectId)
    if (project) {
      await comicDb.saveProject({
        ...project,
        syncData: comicSync.exportData(),
        updatedAt: Date.now(),
      })
      lastSavedAt.value = true
      setTimeout(() => { lastSavedAt.value = false }, 2000)
    }
  } catch (e) {
    console.error('保存同步数据失败:', e)
  } finally {
    isSaving.value = false
  }
}

/**
 * 组件卸载时兜底保存：
 * ContentPreview 的 onBeforeUnmount 会 emit 最新 contentBlocks 更新 store，
 * 此时定时器可能还没到点，所以在此直接保存一次，确保编辑不丢失。
 * onUnmounted 在子组件卸载之后执行，store 数据已是最新的。
 */
onUnmounted(() => {
  // 停止定时器
  if (saveIntervalId) {
    clearInterval(saveIntervalId)
    saveIntervalId = null
  }
  // fire-and-forget：不阻塞卸载流程
  comicDb.getProject(projectId).then((project) => {
    if (project) {
      return comicDb.saveProject({
        ...project,
        syncData: comicSync.exportData(),
        updatedAt: Date.now(),
      })
    }
    return null
  }).catch((e) => {
    console.error('[comic-sync] 卸载时兜底保存失败:', e)
  })
})

// === 工具函数 ===
/**
 * 将图片路径转为可用的 URL
 * 漫画模块的 generatedImages 可能已是完整 URL（data:/blob:/file:/http:），
 * 仅对裸文件路径追加 file:// 协议
 */
function getImageUrl(filePath: string): string {
  if (!filePath) return ''
  // 已有协议（data:, blob:, file:, http:, https:）直接返回
  if (/^(data:|blob:|file:|https?:)/i.test(filePath)) return filePath
  const normalizedPath = filePath.replace(/\\/g, '/')
  return normalizedPath.match(/^[a-zA-Z]:/)
    ? `file:///${normalizedPath}`
    : `file://${normalizedPath}`
}

function goBack() {
  router.push(`/comic/page-editor/${projectId}`)
}

// === 事件处理 ===
function handlePreviewImage(img: { path: string; name: string }) {
  previewingImage.value = img
}

/** 排版模板更新（来自 SyncConfigPanel 内置的 ModalTemplateSelector） */
function handleUpdateLayoutTemplate(templateId: string) {
  comicSync.updateLayoutConfig({ templateId })
  // 切换模板时清除旧的内容块，让 ContentPreview 按新模板重新渲染
  comicSync.updateContentBlocks([])
}

async function handleCoverTemplateSelect(templateId: string) {
  comicSync.updateCoverConfig({ templateId })
  showCoverTemplateSelector.value = false
  // 自动选中前 N 张
  const count = getCoverTemplateImageCount(templateId)
  if (count > 0) {
    const ids = comicSync.sourceImages.slice(0, count).map((img) => img.id)
    comicSync.updateCoverConfig({ selectedImageIds: ids })
  }
}

function handleUpdateCoverImageIds(ids: string[]) {
  comicSync.updateCoverConfig({
    selectedImageIds: ids,
    generatedCoverImage: undefined,
    generatedCoverImagePath: undefined,
  })
}

function handleUpdateImageCropRects(rects: Record<number, { x: number; y: number; w: number; h: number }>) {
  comicSync.updateCoverConfig({
    imageCropRects: rects,
    generatedCoverImage: undefined,
    generatedCoverImagePath: undefined,
  })
}

function handleUpdateImages(images: Array<{ id: string; path: string; name: string }>) {
  comicSync.updateSourceImagesOrder(images)
  showImageManager.value = false
}

async function handleRegenerateCover() {
  const { templateId, selectedImageIds } = comicSync.coverConfig
  if (!templateId || selectedImageIds.length === 0) {
    toast.error('请先选择封面模板和图片')
    return
  }
  isGeneratingCover.value = true
  try {
    const result = await generateCoverImage(
      templateId,
      selectedImageIds,
      comicSync.sourceImages,
      comicSync.coverConfig.imageCropRects,
    )
    if (result) {
      const coverPath = await window.electronAPI.saveBase64Image(
        result,
        `comic-cover-${projectId}.png`,
      )
      comicSync.updateCoverConfig({
        generatedCoverImage: result,
        generatedCoverImagePath: coverPath,
        pic_crop_235_1: '0_0_1_1',
        pic_crop_1_1: '0.287234_0_0.712766_1',
      })
      toast.success('封面生成成功')
    } else {
      toast.error('封面生成失败')
    }
  } catch (e) {
    console.error(e)
    toast.error('封面生成失败')
  } finally {
    isGeneratingCover.value = false
  }
}

function handleCropRequest(ratio: '235' | '11') {
  selectedCoverRatio.value = ratio
  showCoverCropTool.value = true
}

function handleCoverCropConfirm(data: { pic_crop_235_1: string; pic_crop_1_1: string }) {
  comicSync.updateCoverConfig({
    pic_crop_235_1: data.pic_crop_235_1,
    pic_crop_1_1: data.pic_crop_1_1,
  })
  showCoverCropTool.value = false
}

/** 封面图片位置编辑器确认 */
async function handleImagePositionConfirm(cropRects: Record<number, { x: number; y: number; w: number; h: number }>) {
  comicSync.updateCoverConfig({ imageCropRects: cropRects })
  showImagePositionEditor.value = false
  // 确认后自动重新生成封面
  if (comicSync.coverConfig.templateId && comicSync.coverConfig.selectedImageIds.length > 0) {
    await handleRegenerateCover()
  }
}

function handleContentBlocksUpdate(blocks: ContentBlock[], containerStyle: Record<string, string>) {
  comicSync.updateContentBlocks(blocks as ComicContentBlock[], containerStyle)
  markDirty()
}

function handleEditStyleTemplate(templateId: string) {
  styleTemplateIdToEdit.value = templateId
  showStyleTemplateModal.value = true
}

function handleCloseStyleModal() {
  showStyleTemplateModal.value = false
  styleTemplateIdToEdit.value = undefined
}

function handleSelectAccount(id: string) {
  comicSync.setWechatAccountId(id)
  showAccountSelector.value = false
}

// === 发布流程 ===
function buildContentHtml(): string {
  const blocks = comicSync.contentBlocks
  if (blocks && blocks.length > 0) {
    return buildHtmlFromContentBlocks(blocks)
  }
  // 无自定义模板时用 flow 模式（简单图片堆叠）
  if (!currentTemplate.value) {
    return comicSync.sourceImages
      .map((img) => `<p><img src="${img.path}" alt="${img.name}" style="width:100%;display:block;margin:8px 0;" /></p>`)
      .join('')
  }
  // 自定义模板：用 expandTemplateWithImages 渲染（与预览保持一致）
  return expandTemplateWithImages(
    currentTemplate.value.html,
    comicSync.sourceImages,
    (p) => p, // 发布时用原始路径，后续 extractLocalImagePaths 会处理
  )
}

function buildHtmlFromContentBlocks(blocks: ComicContentBlock[]): string {
  const parts: string[] = []
  for (const block of blocks) {
    if (block.type === 'image') {
      parts.push(`<p><img src="${block.imagePath}" style="max-width:100%;display:block;margin:0 auto;"/></p>`)
    } else if (block.type === 'html') {
      parts.push(block.html || '')
    } else if (block.type === 'empty') {
      const align = block.align || 'left'
      parts.push(`<p style="text-align:${align}">${block.content || '<br/>'}</p>`)
    } else if (block.type === 'text') {
      parts.push(`<p>${block.content || ''}</p>`)
    }
  }
  let html = parts.join('\n')
  const containerStyle = comicSync.containerStyle
  if (containerStyle && Object.keys(containerStyle).length > 0) {
    const styleStr = Object.entries(containerStyle)
      .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}:${v}`)
      .join(';')
    html = `<section style="${styleStr}">${html}</section>`
  }
  return html
}

async function resolveWechatUploadablePath(source: string, filename: string): Promise<string> {
  if (!source.startsWith('data:image/')) return source
  return window.electronAPI.saveBase64Image(source, filename)
}

function getSyncLogClass(log: string): string {
  if (log.includes('[ERROR]') || log.includes('失败') || log.includes('异常')) return 'text-red-300'
  if (log.includes('成功') || log.includes('完成') || log.includes('草稿')) return 'text-emerald-300'
  if (log.includes('上传') || log.includes('处理中') || log.includes('开始')) return 'text-sky-300'
  return 'text-slate-300'
}

function clearSyncTerminalLogs() {
  consoleLogs.value = []
}

function closeSyncTerminal() {
  if (!isPublishing.value) showSyncTerminal.value = false
}

watch(consoleLogs, async () => {
  await nextTick()
  if (syncTerminalRef.value) {
    syncTerminalRef.value.scrollTop = syncTerminalRef.value.scrollHeight
  }
}, { deep: true })

async function handlePublish() {
  if (!canPublish.value || !selectedAccount.value) return
  isPublishing.value = true
  showSyncTerminal.value = true
  syncTerminalError.value = null
  try {
    const sourcePathMap = new Map<string, string>()
    const resolveSourcePath = async (source: string, index: number) => {
      const cachedPath = sourcePathMap.get(source)
      if (cachedPath) return cachedPath

      const extension = source.match(/^data:image\/(png|jpe?g);base64,/i)?.[1]?.replace('jpeg', 'jpg') || 'png'
      const resolvedPath = await resolveWechatUploadablePath(
        source,
        `comic-sync-${projectId}-${index + 1}.${extension}`,
      )
      sourcePathMap.set(source, resolvedPath)
      return resolvedPath
    }

    const contentHtml = buildContentHtml()
    const styleImagePaths = extractLocalImagePaths(contentHtml)
    const contentImagePaths = await Promise.all(
      comicSync.sourceImages.map((image, index) => resolveSourcePath(image.path, index)),
    )
    const allContentImagePaths = [...contentImagePaths, ...styleImagePaths.filter((path) => !contentImagePaths.includes(path))]
    let uploadContentHtml = contentHtml
    sourcePathMap.forEach((resolvedPath, sourcePath) => {
      uploadContentHtml = uploadContentHtml.split(sourcePath).join(resolvedPath)
    })

    let coverImagePath = comicSync.coverConfig.generatedCoverImagePath || ''
    if (!coverImagePath && comicSync.coverConfig.generatedCoverImage) {
      coverImagePath = await resolveWechatUploadablePath(
        comicSync.coverConfig.generatedCoverImage,
        `comic-cover-${projectId}.png`,
      )
      comicSync.updateCoverConfig({ generatedCoverImagePath: coverImagePath })
    }
    if (!coverImagePath) {
      const firstCoverId = comicSync.coverConfig.selectedImageIds[0]
      if (firstCoverId) {
        const image = comicSync.sourceImages.find((item) => item.id === firstCoverId)
        if (image) {
          const imageIndex = comicSync.sourceImages.findIndex((item) => item.id === image.id)
          coverImagePath = await resolveSourcePath(image.path, imageIndex)
        }
      }
    }

    const syncArticle = {
      id: comicSync.articleId,
      title: comicSync.title,
      summary: comicSync.subtitle || comicSync.title,
      coverImagePath,
      contentImagePaths: allContentImagePaths,
      contentHtml: uploadContentHtml,
      contentSourceUrl: comicSync.syncData.sourceUrl,
      picCrop2351: comicSync.coverConfig.pic_crop_235_1,
      picCrop11: comicSync.coverConfig.pic_crop_1_1,
      generatedCoverImage: comicSync.coverConfig.generatedCoverImage,
      generatedCoverImagePath: comicSync.coverConfig.generatedCoverImagePath,
    }

    const result = await startBatchUpload([syncArticle], {
      appId: selectedAccount.value.appId,
      appSecret: selectedAccount.value.appSecret || '',
      publish: false,
    })

    if (result.success) {
      toast.success('同步至公众号成功')
    } else {
      toast.error('同步失败：' + (result.error || '未知错误'))
    }
  } catch (error) {
    console.error(error)
    syncTerminalError.value = error instanceof Error ? error.message : String(error)
    consoleLogs.value.push(`[ERROR] 异常: ${syncTerminalError.value}`)
    toast.error('同步失败：' + syncTerminalError.value)
  } finally {
    isPublishing.value = false
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- 内容区 -->
    <div class="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
      <!-- 最终提示词同源预览：固定前置/后置只读，中间画面内容可编辑并单独保存。 -->
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-sm shadow-black/10">
        <div
          v-if="finalPromptSections.front || finalPromptSections.references"
          class="max-h-[38%] shrink-0 overflow-y-auto border-b border-border-subtle bg-elevated/35 px-4 py-3 text-[11px] leading-relaxed text-text-secondary"
        >
          <div v-if="finalPromptSections.front" class="whitespace-pre-wrap break-words">{{ finalPromptSections.front }}</div>
          <div v-if="finalPromptSections.references" class="mt-3 whitespace-pre-wrap break-words text-cyan-200/85">{{ finalPromptSections.references }}</div>
        </div>

        <div class="relative min-h-32 flex-1 p-4">
          <div ref="layerEl" class="pointer-events-none absolute inset-4 overflow-hidden whitespace-pre-wrap break-all text-xs leading-relaxed" aria-hidden="true">
            <template v-for="(segment, index) in segments" :key="index">
              <span
                v-if="segment.text"
                :class="segment.asset ? 'asset-highlight' : ''"
                :style="segment.asset ? assetHighlightStyle(segment.asset.type) : undefined"
                :data-asset-id="segment.asset?.id"
              >{{ segment.text }}</span>
            </template>
          </div>
          <textarea
            v-model="promptText"
            class="relative h-full w-full resize-none bg-transparent text-xs leading-relaxed text-transparent caret-cyan-400 placeholder:text-text-muted focus:outline-none"
            placeholder="在此输入本分镜的画面描述（生图提示词），可点击底部「AI 推导」由 LLM 生成后再修改..."
            @scroll="syncScroll"
            @click="handleClick"
          />
        </div>

        <div
          v-if="finalPromptSections.back"
          class="max-h-[24%] shrink-0 overflow-y-auto border-t border-border-subtle bg-elevated/35 px-4 py-3 text-[11px] leading-relaxed text-text-secondary"
        >
          <div class="whitespace-pre-wrap break-words">{{ finalPromptSections.back }}</div>
        </div>
      </div>
      <div v-if="bindingAuditLabels.length" class="mt-1.5 flex shrink-0 items-start gap-1.5 border-l-2 border-amber-500/70 bg-amber-500/5 px-2 py-1.5 text-[10px] leading-4 text-amber-300">
        <AlertTriangle :size="13" class="mt-0.5 shrink-0" />
        <span class="min-w-0 flex-1">资产绑定待确认：{{ bindingAuditLabels.join('、') }}</span>
        <button
          class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-amber-300 transition-colors hover:bg-amber-500/15 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="repairingBindings"
          title="重新检查并补齐资产绑定"
          @click="emit('repair-bindings', promptText.trim())"
        >
          <RefreshCw :size="13" :class="repairingBindings ? 'animate-spin' : ''" />
        </button>
      </div>

      <!-- 参考图设置（与短篇提示词模式一致） -->
      <div class="mt-2 shrink-0">
        <button
          class="mb-1.5 flex items-center gap-1.5 text-[11px] text-text-secondary transition-colors hover:text-text-primary"
          @click="showRefConfig = !showRefConfig"
        >
          <ChevronRight :size="12" class="transition-transform" :class="showRefConfig ? 'rotate-90' : ''" />
          参考图设置
          <span class="text-text-muted">({{ selectedRefCount }}张)</span>
        </button>

        <Transition name="collapse">
          <div v-if="showRefConfig" class="space-y-2 rounded-lg border border-border-subtle bg-surface p-2.5">
            <!-- 核心参考图固定携带；顺序可手动调整，图号与最终发送数组实时同源。 -->
            <div v-if="refManifest?.entries.length" class="space-y-1">
              <div
                v-for="(entry, index) in refManifest.entries"
                :key="entry.key"
                class="flex items-center gap-2 rounded-md border border-border-subtle px-2 py-1"
              >
                <img :src="entry.image" class="h-8 w-8 shrink-0 rounded object-cover" alt="参考图" />
                <span class="w-8 shrink-0 text-[10px] font-medium text-cyan-400">图{{ entry.index }}</span>
                <span class="min-w-0 flex-1 truncate text-[10px] text-text-secondary">
                  {{ entry.label }}{{ entry.variantName ? ` · ${entry.variantName}` : '' }}
                </span>
                <button class="text-text-muted hover:text-text-primary disabled:opacity-25" :disabled="index === 0" title="上移" @click="moveReference(index, -1)"><ChevronUp :size="13" /></button>
                <button class="text-text-muted hover:text-text-primary disabled:opacity-25" :disabled="index === refManifest.entries.length - 1" title="下移" @click="moveReference(index, 1)"><ChevronDown :size="13" /></button>
              </div>
            </div>
            <p v-else class="text-[10px] text-text-muted">当前分镜没有核心参考图</p>

            <label class="flex select-none items-center gap-1.5 text-[11px]" :class="generatedImage ? 'cursor-pointer text-text-primary' : 'cursor-not-allowed text-text-muted'">
              <input v-model="refConfig.useGeneratedImage" type="checkbox" :disabled="!generatedImage" class="h-3 w-3 rounded border-border-subtle bg-input-bg text-cyan-500 focus:ring-cyan-500/30 focus:ring-offset-0" />
              <span>追加上一版结果图</span>
            </label>

            <!-- 图号速览：按当前手动顺序汇总，与生图实际发送顺序一致。 -->
            <p v-if="numberSummary" class="text-[10px] leading-4 text-text-muted">{{ numberSummary }}</p>

            <!-- 自定义上传参考图 -->
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5">
                <label class="text-[10px] text-text-muted">存储方式</label>
                <div class="flex items-center rounded-lg border border-border-subtle bg-surface p-[2px]">
                  <button
                    class="rounded px-2 py-0.5 text-[10px] transition-[color,background-color,border-color,box-shadow]"
                    :class="customStorageMode === 'cloud' ? 'bg-elevated text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'"
                    @click="customStorageMode = 'cloud'"
                  >云端</button>
                  <button
                    class="rounded px-2 py-0.5 text-[10px] transition-[color,background-color,border-color,box-shadow]"
                    :class="customStorageMode === 'local' ? 'bg-elevated text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'"
                    @click="customStorageMode = 'local'"
                  >本地</button>
                </div>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <div
                v-for="(url, idx) in customRefImages"
                :key="idx"
                class="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border-subtle"
              >
                <img :src="url" class="h-full w-full object-cover" alt="自定义参考图" />
                <div class="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    class="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
                    title="查看大图"
                    @click="openCustomPreview(idx)"
                  ><Eye :size="14" /></button>
                  <button
                    class="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/60 text-white transition-colors hover:bg-red-500/80"
                    title="删除"
                    @click="removeCustomImage(idx)"
                  ><X :size="14" /></button>
                </div>
              </div>
              <button
                class="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-border-subtle text-text-muted transition-colors hover:border-border-default hover:text-text-primary"
                :class="{ 'pointer-events-none opacity-50': isUploading }"
                :title="customStorageMode === 'local' ? '上传参考图（本地 base64）' : '上传参考图（云端临时，3天后自动删除）'"
                @click="triggerCustomUpload"
              >
                <LoaderCircle v-if="isUploading" :size="18" class="animate-spin" />
                <Plus v-else :size="18" />
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- 底部单镜操作（与短篇「单页操作」一致） -->
    <div class="shrink-0 border-t border-border-subtle p-3">
      <div class="rounded-xl border border-border-subtle bg-surface p-3 shadow-sm shadow-black/10">
        <div class="mb-2">
          <span class="text-[11px] font-medium text-text-secondary">单镜操作</span>
        </div>
        <div class="flex items-center justify-between gap-2">
          <div class="flex min-w-0 items-center gap-2">
            <p class="min-w-0 truncate text-[10px] text-text-muted">分镜 {{ panel.order }} · {{ promptText.length.toLocaleString() }} 字符</p>
            <span v-if="isManuallyEdited" class="flex shrink-0 items-center gap-1 text-[10px] text-amber-300">
              <Pencil :size="11" />已手动修改
            </span>
          </div>
          <div class="flex items-center gap-1.5">
            <!-- 复制运行时完整提示词，图号与当前参考图设置一致。 -->
            <button
              class="flex items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 py-1.5 text-[11px] text-text-secondary transition-colors hover:border-border-default hover:text-text-primary"
              title="复制完整提示词（前置共用属性 + 动态图号定义 + 画面描述 + 后置共用属性）"
              @click="copyFinalPrompt"
            >
              <Check v-if="copied" :size="13" class="text-emerald-400" />
              <Copy v-else :size="13" />
              {{ copied ? '已复制' : '复制' }}
            </button>
            <!-- AI 推导按钮 -->
            <button
              class="flex items-center gap-1.5 rounded-lg border border-purple-500/30 px-3 py-1.5 text-[11px] text-purple-400 transition-colors hover:bg-purple-500/10 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="promptBusy"
              :title="artwork?.imagePrompt?.trim() ? '使用 LLM 重新推导画面描述' : '使用 LLM 推导画面描述'"
              @click="$emit('infer')"
            >
              <Sparkles :size="14" />
              AI 推导
            </button>
            <!-- 单独生成按钮 -->
            <button
              class="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg shadow-amber-500/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!promptText.trim() || generating"
              :title="!promptText.trim() ? '请先输入画面描述' : bindingAuditLabels.length ? '生成前将自动补绑并校验待确认项' : '按参考图设置生成本分镜画面'"
              @click="handleSingleGenerate"
            >
              <LoaderCircle v-if="generating" :size="14" class="animate-spin" />
              <Eye v-else :size="14" />
              单独生成
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 隐藏的文件上传输入 -->
    <input ref="customFileInputRef" type="file" accept="image/*" multiple class="hidden" @change="handleCustomUpload" />

    <!-- 图片预览弹窗 -->
    <ImagePreviewModal v-model="showPreview" :images="previewImages" :image-index="previewIndex" alt="自定义参考图" />
  </div>
</template>

<script setup lang="ts">
/**
 * 分镜生图工作台右栏（提示词模式）：结构与短篇生图页 PageContentPanel 提示词模式一致——
 * 提示词输入框 + 核心参考图排序 + 自定义上传 + 底部「单镜操作」（AI 推导 / 单独生成）。
 * 提示词防抖自动保存；核心参考图固定携带，上一版结果图和自定义图追加在末尾。
 */
import { computed, reactive, ref, watch } from 'vue'
import { AlertTriangle, ChevronDown, ChevronRight, ChevronUp, Check, Copy, Eye, LoaderCircle, Pencil, Plus, RefreshCw, Sparkles, X } from 'lucide-vue-next'
import type { LongProjectAsset, LongProjectPanelArtwork, LongProjectStoryboardPanel, SharedPromptBlock } from '@comic/types'
import ImagePreviewModal from '@comic/components/ImagePreviewModal.vue'
import { processImage, uploadImage, type ImageStorageMode } from '@comic/services/uploadService'
import { buildFinalPromptSections, composeFinalPrompt, effectiveVariantRefImages } from '@comic/services/panelPromptService'
import type { PanelRefManifest } from '@comic/services/panelRefManifest'
import { useAssetHighlight } from '@comic/composables/useAssetHighlight'
import { useToast } from '@comic/composables/useToast'
import { assetHighlightStyle } from '@comic/utils/assetTypeTheme'
import { auditPanelAssetBindings, buildAssetNameIndex, formatPanelBindingAuditIssues } from '@comic/services/promptAssetService'

const toast = useToast()

/** 单独生成时可追加在核心清单末尾的参考图配置。 */
export interface PanelRefConfig {
  useGeneratedImage: boolean
  customImages: string[]
}

/** 按类型分组的参考图来源 */
export interface TypedRefGroup {
  type: 'character' | 'scene' | 'prop' | 'style'
  images: string[]
  /** 每张图对应的全局图号（与生图实际发送顺序一致，来自参考图清单）。 */
  numbers?: number[]
}

const props = defineProps<{
  panel: LongProjectStoryboardPanel
  artwork?: LongProjectPanelArtwork
  promptBusy?: boolean
  /** 是否正在生图（禁用单独生成按钮）。 */
  generating?: boolean
  /** 是否正在重新扫描并写回本章资产绑定。 */
  repairingBindings?: boolean
  /** 兼容旧调用方的参考图分组；图号与排序以 refManifest 为准。 */
  refGroups: TypedRefGroup[]
  /** 当前分镜核心参考图清单；顺序即实际发送顺序。 */
  refManifest?: PanelRefManifest
  /** 当前已采纳成图（作为「结果图」参考选项）。 */
  generatedImage?: string | null
  /** 项目资产库：用于提示词内资产名识别、高亮与查看资产图。 */
  assets?: LongProjectAsset[]
  /** 绘图配置的共用属性：用于拼出「最终送生图」的完整提示词（前置 + 描述 + 后置）。 */
  sharedBlocks?: SharedPromptBlock[]
}>()

const emit = defineEmits<{
  (e: 'infer'): void
  (e: 'save', prompt: string): void
  (e: 'reorder-reference', keys: string[]): void
  (e: 'single-generate', prompt: string, refConfig: PanelRefConfig): void
  (e: 'repair-bindings', prompt: string): void
}>()

const promptText = ref(props.artwork?.imagePrompt ?? '')
const showRefConfig = ref(true)

/** 当前草稿也参与审计；保存完成前即可提示歧义、悬空状态或漏绑。 */
const bindingAuditLabels = computed(() => {
  const issues = auditPanelAssetBindings(
    { ...props.panel, imagePrompt: promptText.value },
    buildAssetNameIndex(props.assets ?? []),
  )
  return formatPanelBindingAuditIssues(issues)
})

// ===== 提示词资产识别与高亮 =====
// 高亮渲染与滚动同步都在 useAssetHighlight 里，与「分镜内容」框共用同一套。
// 点击正文中的高亮资产名可查看当前绑定状态的参考图。
const {
  layerEl,
  segments,
  syncScroll,
  handleClick,
} = useAssetHighlight({
  text: () => promptText.value,
  assets: () => props.assets ?? [],
  onPick: openAssetPreview,
})

/** 查看资产视觉状态参考图。 */
function openAssetPreview(asset: LongProjectAsset | null) {
  if (!asset) {
    toast.warning('资产未匹配，请先在资产库中修正名称')
    return
  }
  const binding = props.panel.assetBindings.find((item) => item.assetId === asset.id)
  const variant = asset.variants.find((item) => item.id === binding?.visualVersionId)
    ?? (!binding?.visualVersionId ? asset.variants.find((item) => item.name === binding?.visualVersionName) ?? asset.variants[0] : undefined)
  const images = variant ? effectiveVariantRefImages(variant) : []
  if (!images.length) {
    toast.info(`「${asset.name} · ${variant?.name ?? '默认'}」暂无参考图`)
    return
  }
  previewImages.value = [...images]
  previewIndex.value = 0
  showPreview.value = true
}

const isUploading = ref(false)
const customRefImages = ref<string[]>([])
const customStorageMode = ref<ImageStorageMode>('local')
const customFileInputRef = ref<HTMLInputElement | null>(null)
const showPreview = ref(false)
const previewImages = ref<string[]>([])
const previewIndex = ref(0)

const refConfig = reactive<PanelRefConfig>({
  useGeneratedImage: false,
  customImages: [],
})

// 切换分镜 / 外部描述更新（推导完成）时同步草稿
watch(
  () => [props.panel.id, props.artwork?.imagePrompt] as const,
  ([, prompt]) => { promptText.value = prompt ?? '' },
  { immediate: true },
)

// 提示词变化时防抖保存
let saveTimer: ReturnType<typeof setTimeout> | null = null
watch(promptText, () => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const value = promptText.value.trim()
    if (value !== (props.artwork?.imagePrompt ?? '').trim()) emit('save', value)
  }, 500)
})

/** 推导结果一旦被人工编辑（含导入的人工内容），在操作区持续标识。 */
const isManuallyEdited = computed(() =>
  promptText.value.trim() !== (props.artwork?.imagePrompt ?? '').trim()
  || props.artwork?.promptSource === 'manual',
)

/** 图号速览：严格按当前手动顺序显示，避免按资产类型分组后掩盖真实发送顺序。 */
const numberSummary = computed(() =>
  (props.refManifest?.entries ?? [])
    .map((entry) => `图${entry.index} ${entry.label}${entry.variantName ? `（${entry.variantName}）` : ''}`)
    .join(' · '),
)

/** 当前追加参考图；图号接在核心清单之后。 */
const extraReferences = computed(() => {
  const entries: Array<{ image: string; label: string }> = []
  if (refConfig.useGeneratedImage && props.generatedImage) {
    entries.push({ image: props.generatedImage, label: '本镜上一版结果图，用于构图与连续性参考' })
  }
  customRefImages.value.forEach((image, index) => entries.push({ image, label: `自定义参考图 ${index + 1}` }))
  return entries
})

/** 编辑器与最终发送使用同一个四段拼接结果，属性或参考图变化后立即刷新。 */
const finalPromptSections = computed(() => buildFinalPromptSections(
  promptText.value,
  props.sharedBlocks ?? [],
  props.refManifest,
  extraReferences.value,
))

/** 最终送生图的完整提示词：动态参考图定义不进入 LLM 模板，在复制/生图时实时拼接。 */
const finalPrompt = computed(() => composeFinalPrompt(
  promptText.value.trim(),
  props.sharedBlocks ?? [],
  props.refManifest,
  extraReferences.value,
))

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

/** 复制完整提示词到剪贴板（用于在外部 AI 里生成，再粘回导入）。 */
async function copyFinalPrompt() {
  const text = finalPrompt.value.trim()
  if (!text) {
    toast.warning('提示词为空，请先输入画面描述')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copied.value = false }, 1600)
    toast.success('已复制完整提示词（含前置/后置共用属性）')
  } catch {
    toast.error('复制失败，请手动选择文本复制')
  }
}

/** 已选中的参考图总数 */
const selectedRefCount = computed(() => {
  let count = props.refManifest?.images.length ?? 0
  if (refConfig.useGeneratedImage && props.generatedImage) count += 1
  count += customRefImages.value.length
  return count
})

/** 手动调整核心参考图顺序；父组件持久化 key 列表，清单随即重新编号。 */
function moveReference(index: number, direction: -1 | 1) {
  const entries = props.refManifest?.entries ?? []
  const target = index + direction
  if (target < 0 || target >= entries.length) return
  const keys = entries.map((entry) => entry.key)
  ;[keys[index], keys[target]] = [keys[target], keys[index]]
  emit('reorder-reference', keys)
}

/** 触发自定义参考图上传 */
function triggerCustomUpload() {
  if (isUploading.value) return
  customFileInputRef.value?.click()
}

/** 处理自定义参考图上传（按存储模式走本地 base64 或云端临时） */
async function handleCustomUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return
  isUploading.value = true
  const mode = customStorageMode.value
  const results = await Promise.all(
    Array.from(files).map(async (file) => {
      const result = mode === 'local' ? await processImage(file, 'local') : await uploadImage(file, { expiration: 'P3D' })
      return result.success && result.url ? result.url : null
    }),
  )
  isUploading.value = false
  input.value = ''
  const urls = results.filter(Boolean) as string[]
  if (urls.length) {
    customRefImages.value.push(...urls)
    toast.success(`成功上传 ${urls.length} 张参考图`)
  } else {
    toast.error('参考图上传失败，请重试')
  }
}

function removeCustomImage(idx: number) {
  customRefImages.value.splice(idx, 1)
}

function openCustomPreview(idx: number) {
  previewImages.value = [...customRefImages.value]
  previewIndex.value = idx
  showPreview.value = true
}

/** 单独生成：组装参考图配置后发射事件 */
function handleSingleGenerate() {
  const value = promptText.value.trim()
  if (!value) return
  emit('single-generate', value, { ...refConfig, customImages: [...customRefImages.value] })
}
</script>

<style scoped>
.collapse-enter-active,
.collapse-leave-active {
  transition: opacity 0.2s ease, max-height 0.2s ease, margin-top 0.2s ease;
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 300px;
}
</style>

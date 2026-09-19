<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- 内容区 -->
    <div class="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
      <!-- 提示词输入框：叠加高亮层（textarea 文字透明，背后按资产类型着色渲染资产名，点击高亮名看大图） -->
      <div class="relative min-h-0 flex-1 rounded-xl border border-border-subtle bg-surface p-4 shadow-sm shadow-black/10">
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
      <!-- 检测提示：提示词中识别到的资产（点击标签查看参考图） -->
      <div v-if="detectedAssetChips.length" class="mt-1.5 shrink-0">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="text-[10px] text-text-muted">识别资产</span>
          <AssetBindingTag
            v-for="asset in detectedAssetChips"
            :key="asset.id"
            :binding="asset.tagBinding"
            :assets="assets"
            @inspect="openAssetPreview"
          />
        </div>
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
            <!-- 参考图勾选项 -->
            <div class="flex flex-wrap gap-x-3 gap-y-1.5">
              <label
                v-for="opt in refOptions"
                :key="opt.key"
                class="flex select-none items-center gap-1.5 text-[11px]"
                :class="opt.available ? 'cursor-pointer text-text-primary' : 'cursor-not-allowed text-text-muted'"
              >
                <input
                  v-model="refConfig[opt.key]"
                  type="checkbox"
                  :disabled="!opt.available"
                  class="h-3 w-3 rounded border-border-subtle bg-input-bg text-cyan-500 focus:ring-cyan-500/30 focus:ring-offset-0"
                />
                <span>{{ opt.label }}</span>
                <span v-if="opt.count > 0" class="text-text-muted">({{ opt.count }})</span>
              </label>
            </div>

            <!-- 图号速览：与生图实际发送顺序一致（共用属性 → 人物 → 场景 → 道具） -->
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
          <p class="min-w-0 truncate text-[10px] text-text-muted">分镜 {{ panel.order }} · {{ promptText.length.toLocaleString() }} 字符</p>
          <div class="flex items-center gap-1.5">
            <!-- 复制完整提示词（含共用属性）：粘到外部 AI 生成后再用「导入描述」回贴 -->
            <button
              class="flex items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 py-1.5 text-[11px] text-text-secondary transition-colors hover:border-border-default hover:text-text-primary"
              title="复制完整提示词（前置共用属性 + 画面描述 + 后置共用属性），可粘贴到外部 AI 生成"
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
              :title="!promptText.trim() ? '请先输入画面描述' : '按参考图设置生成本分镜画面'"
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
 * 提示词输入框 + 参考图设置（分类勾选 + 自定义上传）+ 底部「单镜操作」（AI 推导 / 单独生成）。
 * 提示词防抖自动保存；单独生成携带勾选的参考图配置。
 */
import { computed, reactive, ref, watch } from 'vue'
import { ChevronRight, Check, Copy, Eye, LoaderCircle, Plus, Sparkles, X } from 'lucide-vue-next'
import type { LongProjectAsset, LongProjectPanelArtwork, LongProjectStoryboardAssetBinding, LongProjectStoryboardPanel, SharedPromptBlock } from '@comic/types'
import ImagePreviewModal from '@comic/components/ImagePreviewModal.vue'
import AssetBindingTag from '@comic/components/AssetBindingTag.vue'
import { processImage, uploadImage, type ImageStorageMode } from '@comic/services/uploadService'
import { composeFinalPrompt } from '@comic/services/panelPromptService'
import { useAssetHighlight } from '@comic/composables/useAssetHighlight'
import { useToast } from '@comic/composables/useToast'
import { assetHighlightStyle } from '@comic/utils/assetTypeTheme'

const toast = useToast()

/** 单独生成的参考图配置（与短篇 RefImageConfig 同构） */
export interface PanelRefConfig {
  useStyleRef: boolean
  useCharacterRef: boolean
  useSceneRef: boolean
  usePropRef: boolean
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
  /** 生图可携带的参考图分组（按类型）。 */
  refGroups: TypedRefGroup[]
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
  (e: 'single-generate', prompt: string, refConfig: PanelRefConfig): void
}>()

const promptText = ref(props.artwork?.imagePrompt ?? '')
const showRefConfig = ref(true)

// ===== 提示词资产识别与高亮 =====
// 高亮渲染与滚动同步都在 useAssetHighlight 里，与「分镜内容」框共用同一套。
// 点击高亮名字打开大图预览（onPick）；底部「识别资产」标签点击同样可查看。
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

/** 底部识别资产 chips：优先用分镜已有绑定快照（含视觉状态），未绑定时临时构造。 */
const detectedAssetChips = computed<Array<{ id: string; tagBinding: LongProjectStoryboardAssetBinding }>>(() => {
  const seen = new Set<string>()
  const result: Array<{ id: string; tagBinding: LongProjectStoryboardAssetBinding }> = []
  for (const segment of segments.value) {
    const asset = segment.asset
    if (!asset || seen.has(asset.id)) continue
    seen.add(asset.id)
    const binding = props.panel.assetBindings.find((item) => item.assetId === asset.id)
    result.push({
      id: asset.id,
      tagBinding: binding ?? { assetId: asset.id, assetName: asset.name, matchSource: 'auto-text' as const },
    })
  }
  return result
})

/** 查看资产视觉状态参考图。 */
function openAssetPreview(asset: LongProjectAsset | null) {
  if (!asset) {
    toast.warning('资产未匹配，请先在资产库中修正名称')
    return
  }
  const binding = props.panel.assetBindings.find((item) => item.assetId === asset.id)
  const variant = asset.variants.find((item) => item.id === binding?.visualVersionId) ?? asset.variants[0]
  const images = variant?.referenceImageIds ?? []
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
  useStyleRef: false,
  useCharacterRef: false,
  useSceneRef: false,
  usePropRef: false,
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
    if (value && value !== props.artwork?.imagePrompt) emit('save', value)
  }, 500)
})

/** 各类型参考图数量 */
const groupCount = (type: TypedRefGroup['type']) => props.refGroups.find((group) => group.type === type)?.images.length ?? 0

const GROUP_LABEL: Record<TypedRefGroup['type'], string> = { style: '共用属性', character: '人物', scene: '场景', prop: '道具' }

/** 图号速览：把「图1 = 谁」按类型归并成一行，与生图实际发送顺序完全一致。 */
const numberSummary = computed(() =>
  props.refGroups
    .filter((group) => group.images.length && group.numbers?.length)
    .map((group) => `${GROUP_LABEL[group.type]} ${(group.numbers ?? []).map((n) => `图${n}`).join('、')}`)
    .join(' · '),
)

/** 最终送生图的完整提示词（三层拼接：前置共用属性 + 画面描述 + 后置共用属性），与生图实际发送内容一致。 */
const finalPrompt = computed(() => composeFinalPrompt(promptText.value.trim(), props.sharedBlocks ?? []))

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

/** 参考图勾选项配置 */
const refOptions = computed(() => [
  { key: 'useStyleRef' as const, label: '风格参考', count: groupCount('style'), available: groupCount('style') > 0 },
  { key: 'useCharacterRef' as const, label: '人物参考', count: groupCount('character'), available: groupCount('character') > 0 },
  { key: 'useSceneRef' as const, label: '场景参考', count: groupCount('scene'), available: groupCount('scene') > 0 },
  { key: 'usePropRef' as const, label: '物品参考', count: groupCount('prop'), available: groupCount('prop') > 0 },
  { key: 'useGeneratedImage' as const, label: '结果图', count: props.generatedImage ? 1 : 0, available: Boolean(props.generatedImage) },
])

/** 已选中的参考图总数 */
const selectedRefCount = computed(() => {
  let count = 0
  if (refConfig.useStyleRef) count += groupCount('style')
  if (refConfig.useCharacterRef) count += groupCount('character')
  if (refConfig.useSceneRef) count += groupCount('scene')
  if (refConfig.usePropRef) count += groupCount('prop')
  if (refConfig.useGeneratedImage && props.generatedImage) count += 1
  count += customRefImages.value.length
  return count
})

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

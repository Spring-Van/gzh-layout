<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- 顶部工具栏：标题 + 状态（与短篇提示词模式一致） -->
    <div class="flex shrink-0 items-center gap-2 border-b border-border-subtle bg-surface px-3 py-2.5">
      <span class="text-[11px] font-medium text-text-primary">提示词编辑</span>
      <span v-if="promptBusy" class="flex items-center gap-1 text-[10px] text-cyan-400"><LoaderCircle :size="10" class="animate-spin" />推导中</span>
      <span v-else-if="artwork?.promptStatus === 'stale'" class="rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-300" title="分镜已重新生成，描述可能过期，建议重新推导">已过期</span>
      <span v-else-if="artwork?.promptSource === 'manual'" class="text-[10px] text-text-muted">人工编辑</span>
      <span v-if="panel.shot" class="ml-auto rounded border border-border-subtle bg-app-bg px-1.5 py-0.5 text-[11px] text-text-muted">{{ panel.shot }}</span>
    </div>

    <!-- 内容区 -->
    <div class="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
      <!-- 提示词输入框 -->
      <div class="min-h-0 flex-1 rounded-xl border border-border-subtle bg-surface p-4 shadow-sm shadow-black/10">
        <textarea
          v-model="promptText"
          class="h-full w-full resize-none bg-transparent text-xs leading-relaxed text-text-primary placeholder:text-text-muted focus:outline-none"
          placeholder="在此输入本分镜的画面描述（生图提示词），可点击底部「AI 推导」由 LLM 生成后再修改..."
        />
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
import { ChevronRight, Eye, LoaderCircle, Plus, Sparkles, X } from 'lucide-vue-next'
import type { LongProjectPanelArtwork, LongProjectStoryboardPanel } from '@comic/types'
import ImagePreviewModal from '@comic/components/ImagePreviewModal.vue'
import { processImage, uploadImage, type ImageStorageMode } from '@comic/services/uploadService'
import { useToast } from '@comic/composables/useToast'

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
}>()

const emit = defineEmits<{
  (e: 'infer'): void
  (e: 'save', prompt: string): void
  (e: 'single-generate', prompt: string, refConfig: PanelRefConfig): void
}>()

const promptText = ref(props.artwork?.imagePrompt ?? '')
const showRefConfig = ref(true)
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

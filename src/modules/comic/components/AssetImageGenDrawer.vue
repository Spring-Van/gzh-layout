<template>
  <Teleport to="body">
    <!-- 遮罩层 -->
    <Transition name="fade">
      <!-- 生图配置抽屉：z-[130]/[131] 高于资产全屏抽屉（z-[101]）、低于大图预览（z-[200]） -->
      <div v-if="modelValue" class="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm" @click="handleClose" />
    </Transition>

    <!-- 抽屉：浮动卡片，右侧滑入。宽度与分镜绘图配置抽屉一致，共用属性才能左右分栏 -->
    <Transition name="slide-right">
      <div v-if="modelValue" class="fixed bottom-0 right-0 top-0 z-[131] flex w-[min(920px,96vw)] flex-col overflow-hidden p-4">
        <div class="flex flex-1 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-2xl shadow-black/40">
          <header class="flex shrink-0 items-center justify-between border-b border-border-subtle px-6 py-4">
            <div class="flex items-center gap-2">
              <svg class="h-5 w-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <h2 class="text-base font-semibold text-text-primary">资产生图配置</h2>
            </div>
            <button
              class="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-elevated hover:text-text-primary"
              title="关闭"
              @click="handleClose"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </header>

          <!-- Tab 切换：只保留绘画模型 / 共用属性（与分镜绘图配置这两页同构，不含参考图用途） -->
          <div class="flex shrink-0 items-center gap-1 border-b border-border-subtle px-6 pb-0 pt-4">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="relative -mb-px px-4 py-2.5 text-sm font-medium transition-colors"
              :class="activeTab === tab.key ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-text-secondary hover:text-text-primary'"
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>

          <div class="custom-scrollbar relative min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            <!-- 绘画模型 Tab：字段与分镜绘图配置完全一致，选项取所选生图模型自身支持的范围 -->
            <template v-if="activeTab === 'model'">
              <div>
                <label class="mb-2 block text-xs text-text-secondary">图片生成模型</label>
                <div class="relative">
                  <select
                    v-model="config.imageModelId"
                    class="w-full cursor-pointer appearance-none rounded-lg border border-border-subtle bg-input-bg py-2 pl-3 pr-8 text-sm text-text-primary transition-colors focus:border-cyan-500/30 focus:outline-none"
                    @change="onImageModelChange"
                  >
                    <option value="" class="bg-surface">请选择模型</option>
                    <option v-for="model in imageModels" :key="model.id" :value="model.id" class="bg-surface">{{ model.name }}</option>
                  </select>
                  <svg class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-xs text-text-secondary">图片比例</label>
                <div class="relative">
                  <select
                    v-model="config.aspectRatio"
                    class="w-full cursor-pointer appearance-none rounded-lg border border-border-subtle bg-input-bg py-2 pl-3 pr-8 text-sm text-text-primary transition-colors focus:border-cyan-500/30 focus:outline-none"
                  >
                    <option value="" class="bg-surface">默认</option>
                    <option v-for="ratio in availableAspectRatios" :key="ratio" :value="ratio" class="bg-surface">{{ ratio }}</option>
                  </select>
                  <svg class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div>
                <label class="mb-2 block text-xs text-text-secondary">分辨率</label>
                <div class="relative">
                  <select
                    v-model="config.resolution"
                    class="w-full cursor-pointer appearance-none rounded-lg border border-border-subtle bg-input-bg py-2 pl-3 pr-8 text-sm text-text-primary transition-colors focus:border-cyan-500/30 focus:outline-none"
                  >
                    <option value="" class="bg-surface">默认</option>
                    <option v-for="item in availableResolutions" :key="item" :value="item" class="bg-surface">{{ item }}</option>
                  </select>
                  <svg class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div v-if="availableQualities.length > 0">
                <label class="mb-2 block text-xs text-text-secondary">图片质量</label>
                <div class="relative">
                  <select
                    v-model="config.quality"
                    class="w-full cursor-pointer appearance-none rounded-lg border border-border-subtle bg-input-bg py-2 pl-3 pr-8 text-sm text-text-primary transition-colors focus:border-cyan-500/30 focus:outline-none"
                  >
                    <option value="" class="bg-surface">默认</option>
                    <option v-for="item in availableQualities" :key="item" :value="item" class="bg-surface">{{ item }}</option>
                  </select>
                  <svg class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </template>

            <!-- 共用属性 Tab：左右分栏，与分镜绘图配置同布局；数据是资产自己的一份，不与分镜互通 -->
            <template v-if="activeTab === 'blocks'">
              <div class="flex shrink-0 items-center justify-between">
                <p class="text-[11px] text-text-secondary">
                  共用 {{ sharedImageCount }} 张参考图
                  <span class="mx-1.5 text-text-muted">|</span>
                  左：提示词最前 · 右：提示词最后（不支持参考图）
                </p>
              </div>

              <div class="blocks-split-layout" style="display: flex; flex-direction: row; align-items: flex-start; gap: 16px; width: 100%">
                <!-- 左：插入最前 -->
                <div
                  class="blocks-split-col"
                  style="flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 12px; border: 1px solid rgba(34, 211, 238, 0.15); background: rgba(34, 211, 238, 0.03)"
                >
                  <div class="flex items-center gap-2 text-[11px] text-text-secondary">
                    <span class="rounded border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.5 text-cyan-400">插入最前</span>
                    <span class="text-text-muted">排在绘画提示词之前</span>
                    <span class="text-text-muted">{{ frontBlocks.length }} 项</span>
                    <button
                      class="ml-auto rounded-lg border border-cyan-500/20 px-2 py-0.5 text-[11px] text-cyan-400 transition-colors hover:bg-cyan-500/10"
                      @click="addBlock('front')"
                    >+ 添加属性</button>
                  </div>
                  <div v-if="!frontBlocks.length" class="rounded-lg border border-dashed border-border-subtle py-8 text-center text-[11px] text-text-muted">暂无属性</div>
                  <div v-for="block in frontBlocks" :key="block.id" class="space-y-2.5 rounded-xl border border-border-subtle bg-surface p-3">
                    <BlockCard
                      :block="block"
                      :image-numbers="imageNumberMap.get(block.id) || []"
                      :style-templates="styleTemplates"
                      :is-uploading="uploadingBlockId === block.id"
                      @update="(patch) => updateBlock(block.id, patch)"
                      @remove="removeBlock(block.id)"
                      @move-up="moveBlock(block.id, 'up')"
                      @move-down="moveBlock(block.id, 'down')"
                      @upload="triggerUpload(block.id)"
                      @remove-image="(i) => removeBlockImage(block.id, i)"
                      @preview-image="(i) => previewBlockImage(block.id, i)"
                      @style-template-change="(tid) => handleStyleTemplateChange(block.id, tid)"
                    />
                  </div>
                </div>

                <!-- 右：插入最后 -->
                <div
                  class="blocks-split-col"
                  style="flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 12px; border: 1px solid rgba(251, 191, 36, 0.15); background: rgba(251, 191, 36, 0.03)"
                >
                  <div class="flex items-center gap-2 text-[11px] text-text-secondary">
                    <span class="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-amber-400">插入最后</span>
                    <span class="text-text-muted">排在绘画提示词之后</span>
                    <span class="text-text-muted">{{ backBlocks.length }} 项</span>
                    <button
                      class="ml-auto rounded-lg border border-amber-500/20 px-2 py-0.5 text-[11px] text-amber-400 transition-colors hover:bg-amber-500/10"
                      @click="addBlock('back')"
                    >+ 添加属性</button>
                  </div>
                  <div v-if="!backBlocks.length" class="rounded-lg border border-dashed border-border-subtle py-8 text-center text-[11px] text-text-muted">暂无属性</div>
                  <div v-for="block in backBlocks" :key="block.id" class="space-y-2.5 rounded-xl border border-border-subtle bg-surface p-3">
                    <BlockCard
                      :block="block"
                      :image-numbers="[]"
                      :style-templates="styleTemplates"
                      :is-uploading="uploadingBlockId === block.id"
                      @update="(patch) => updateBlock(block.id, patch)"
                      @remove="removeBlock(block.id)"
                      @move-up="moveBlock(block.id, 'up')"
                      @move-down="moveBlock(block.id, 'down')"
                      @style-template-change="(tid) => handleStyleTemplateChange(block.id, tid)"
                    />
                  </div>
                </div>
              </div>

              <input ref="fileInputRef" type="file" accept="image/*" multiple class="hidden" @change="handleFileUpload" />
            </template>

            <div class="h-px bg-elevated" />

            <div class="rounded-lg border border-cyan-500/10 bg-cyan-500/5 p-3">
              <div class="flex items-start gap-2">
                <svg class="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="text-xs leading-relaxed text-text-secondary">
                  配置保存到当前项目，只供资产生图使用，与分镜「绘图配置」互不影响。
                  发送提示词 = 插入最前的属性 + 绘画提示词 + 插入最后的属性；参考图序号按属性顺序与上传顺序计算。
                </p>
              </div>
            </div>
          </div>

          <footer class="relative flex shrink-0 items-center justify-end gap-3 border-t border-border-subtle px-6 py-4">
            <button class="rounded-lg px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary" @click="handleClose">取消</button>
            <button
              class="rounded-lg bg-accent-gradient px-5 py-2 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!config.imageModelId"
              @click="handleSave"
            >保存配置</button>
          </footer>
        </div>
      </div>
    </Transition>

    <!-- 块参考图预览 -->
    <ImagePreviewModal v-model="showImagePreview" :images="previewImages" :image-index="previewImageIndex" alt="共用属性参考图" />
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 资产生图配置抽屉：只服务资产生图，与分镜「绘图配置」数据不互通。
 *
 * 布局对齐分镜绘图配置的两个 tab：
 * - 绘画模型：生图模型 / 图片比例 / 分辨率 / 图片质量（选项取所选模型自身支持的范围，不写死）；
 * - 共用属性：左右分栏（插入最前 / 插入最后），编辑的是 `AssetGenConfig.sharedBlocks`。
 *
 * 绘画提示词用的 LLM 与模板不在这里填 —— 那是「批量生成提示词」弹窗的事，
 * 上次选择仍记在 `AssetGenConfig.promptModelId / promptTemplateId`，保存时原样带回去，不被本抽屉清空。
 * 共用属性随「保存配置」一次性写回（不再边改边写），避免取消时已经落库。
 */
import { computed, reactive, ref, watch } from 'vue'
import type { AssetGenConfig, ModelConfig, PromptTemplate, SharedPromptBlock } from '@comic/types'
import { comicDb } from '@/api/comic'
import { processImage, type ImageStorageMode } from '@comic/services/uploadService'
import { useToast } from '@comic/composables/useToast'
import ImagePreviewModal from '@comic/components/ImagePreviewModal.vue'
import BlockCard from '@comic/components/SharedPromptBlockCard.vue'
import { computeBlockImageNumbers, createEmptyBlock, getBlocksByPosition, getSharedRefImages, reindexBlockSortOrders } from '@comic/utils/sharedBlocks'

interface Props {
  modelValue: boolean
  imageModels: ModelConfig[]
  /** 已保存的资产生图配置（含自己的 sharedBlocks）。 */
  config?: AssetGenConfig
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', config: AssetGenConfig): void
}>()

const toast = useToast()

const config = reactive<AssetGenConfig>({
  imageModelId: '',
  promptModelId: '',
  promptTemplateId: '',
  aspectRatio: '',
  resolution: '',
  quality: '',
  sharedBlocks: [],
  concurrency: 1,
})

const activeTab = ref<'model' | 'blocks'>('model')
const tabs = [
  { key: 'model' as const, label: '绘画模型' },
  { key: 'blocks' as const, label: '共用属性' },
]

/** 模型支持范围：逗号分隔字符串拆成选项，与分镜绘图配置同一口径。 */
function splitOptions(raw?: string): string[] {
  if (!raw) return []
  return raw.split(/[,，]/).map((item) => item.trim()).filter(Boolean)
}

const selectedImageModel = computed(() => props.imageModels.find((model) => model.id === config.imageModelId))
const availableAspectRatios = computed(() => splitOptions(selectedImageModel.value?.aspectRatios))
const availableResolutions = computed(() => splitOptions(selectedImageModel.value?.resolutions))
const availableQualities = computed(() => splitOptions(selectedImageModel.value?.qualities))

/** 换模型后，当前比例 / 分辨率 / 质量若不在新模型支持范围内就清空（回落「默认」）。 */
function onImageModelChange() {
  if (!availableAspectRatios.value.includes(config.aspectRatio)) config.aspectRatio = ''
  if (!availableResolutions.value.includes(config.resolution)) config.resolution = ''
  if (!availableQualities.value.includes(config.quality ?? '')) config.quality = ''
}

watch(() => props.modelValue, (visible) => {
  if (!visible) return
  Object.assign(config, {
    imageModelId: '',
    promptModelId: '',
    promptTemplateId: '',
    aspectRatio: '',
    resolution: '',
    quality: '',
    sharedBlocks: [],
    concurrency: 1,
  }, props.config)
  config.sharedBlocks = JSON.parse(JSON.stringify(props.config?.sharedBlocks ?? []))
  // 模型已不存在：清空，避免保存一个失效的 id
  if (config.imageModelId && !props.imageModels.some((model) => model.id === config.imageModelId)) {
    config.imageModelId = ''
    config.aspectRatio = ''
    config.resolution = ''
    config.quality = ''
  }
  void loadStyleTemplates()
})

function handleSave() {
  emit('save', JSON.parse(JSON.stringify(config)) as AssetGenConfig)
  emit('update:modelValue', false)
}

function handleClose() {
  emit('update:modelValue', false)
}

// ========== 共用属性块编辑（资产自己的一份，随「保存配置」一起提交） ==========
const styleTemplates = ref<PromptTemplate[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadingBlockId = ref<string | null>(null)
const pendingUploadBlockId = ref<string | null>(null)
const showImagePreview = ref(false)
const previewImages = ref<string[]>([])
const previewImageIndex = ref(0)

const frontBlocks = computed(() => getBlocksByPosition(config.sharedBlocks, 'front'))
const backBlocks = computed(() => getBlocksByPosition(config.sharedBlocks, 'back'))
const imageNumberMap = computed(() => computeBlockImageNumbers(config.sharedBlocks))
const sharedImageCount = computed(() => getSharedRefImages(config.sharedBlocks).length)

const loadStyleTemplates = async () => {
  const all = await comicDb.getAllPromptTemplates()
  styleTemplates.value = all.filter((template) => template.type === 'style')
}

/** 风格模板切换：填充 description（与分镜绘图配置同语义）。 */
const handleStyleTemplateChange = (blockId: string, templateId: string) => {
  const tmpl = styleTemplates.value.find((template) => template.id === templateId)
  updateBlock(blockId, { styleTemplateId: templateId, description: tmpl?.content || '' })
}

const updateBlock = (id: string, patch: Partial<SharedPromptBlock>) => {
  const list = [...(config.sharedBlocks ?? [])]
  const idx = list.findIndex((block) => block.id === id)
  if (idx < 0) return

  const prev = list[idx]
  let next: SharedPromptBlock = { ...prev, ...patch }

  // 切换插入位置时重新编号
  if (patch.insertPosition && patch.insertPosition !== prev.insertPosition) {
    const targetPos = patch.insertPosition
    const maxOrder = list
      .filter((block) => (targetPos === 'front' ? block.insertPosition === 'front' : block.insertPosition !== 'front'))
      .reduce((max, block) => Math.max(max, block.sortOrder), -1)
    next = { ...next, sortOrder: maxOrder + 1 }
  }

  list[idx] = next
  config.sharedBlocks = reindexBlockSortOrders(list)
}

const removeBlock = (id: string) => {
  config.sharedBlocks = reindexBlockSortOrders((config.sharedBlocks ?? []).filter((block) => block.id !== id))
}

/** 同组内上下移动。 */
const moveBlock = (id: string, dir: 'up' | 'down') => {
  const list = [...(config.sharedBlocks ?? [])]
  const block = list.find((item) => item.id === id)
  if (!block) return

  const group = list.filter((item) => item.insertPosition === block.insertPosition).sort((a, b) => a.sortOrder - b.sortOrder)
  const groupIndex = group.findIndex((item) => item.id === id)
  const swapIndex = dir === 'up' ? groupIndex - 1 : groupIndex + 1
  if (swapIndex < 0 || swapIndex >= group.length) return

  const current = group[groupIndex]
  const target = group[swapIndex]
  const order = current.sortOrder
  current.sortOrder = target.sortOrder
  target.sortOrder = order

  config.sharedBlocks = reindexBlockSortOrders(list)
}

const addBlock = (position: 'front' | 'back') => {
  const list = [...(config.sharedBlocks ?? [])]
  const groupCount = list.filter((block) => (position === 'front' ? block.insertPosition === 'front' : block.insertPosition !== 'front')).length
  list.push(createEmptyBlock({
    name: `自定义属性${list.length + 1}`,
    insertPosition: position,
    sortOrder: groupCount,
    contentSource: 'manual',
  }))
  config.sharedBlocks = reindexBlockSortOrders(list)
}

const triggerUpload = (blockId: string) => {
  if (uploadingBlockId.value) return
  pendingUploadBlockId.value = blockId
  fileInputRef.value?.click()
}

const handleFileUpload = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = input.files
  const blockId = pendingUploadBlockId.value
  pendingUploadBlockId.value = null
  if (!files || files.length === 0 || !blockId) return

  const block = (config.sharedBlocks ?? []).find((item) => item.id === blockId)
  if (!block) {
    input.value = ''
    return
  }
  // 插入最后的属性不参与取图（与分镜口径一致：后置图会与图号错位）
  if (block.insertPosition !== 'front') {
    toast.warning('「插入最后」的属性不支持参考图')
    input.value = ''
    return
  }

  uploadingBlockId.value = blockId
  const mode: ImageStorageMode = block.storageMode || 'local'
  const images = [...(block.referenceImages || [])]

  const results = await Promise.all(Array.from(files).map(async (file) => {
    const result = await processImage(file, mode)
    return result.success && result.url ? { ok: true as const, url: result.url } : { ok: false as const, url: '' }
  }))

  let successCount = 0
  let failCount = 0
  for (const result of results) {
    if (result.ok) {
      images.push(result.url)
      successCount += 1
    } else {
      failCount += 1
    }
  }

  if (successCount > 0) updateBlock(blockId, { referenceImages: images, enableRefImages: true })

  uploadingBlockId.value = null
  input.value = ''

  if (successCount > 0) toast.success(`已添加 ${successCount} 张参考图，保存配置后生效`)
  if (failCount > 0) toast.error(`${failCount} 张图片处理失败，请重试`)
}

const removeBlockImage = (blockId: string, idx: number) => {
  const block = (config.sharedBlocks ?? []).find((item) => item.id === blockId)
  if (!block) return
  const images = [...(block.referenceImages || [])]
  images.splice(idx, 1)
  updateBlock(blockId, { referenceImages: images })
}

const previewBlockImage = (blockId: string, idx: number) => {
  const block = (config.sharedBlocks ?? []).find((item) => item.id === blockId)
  if (!block?.referenceImages?.length) return
  previewImages.value = [...block.referenceImages]
  previewImageIndex.value = idx
  showImagePreview.value = true
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}
</style>

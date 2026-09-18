<template>
  <div class="flex flex-col gap-2.5 rounded-lg border border-border-subtle bg-surface p-3">
    <!-- 状态头：名称 + 操作 -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex min-w-0 items-center gap-2">
        <span class="truncate text-sm font-medium text-text-primary">{{ variant.name }}</span>
        <span
          v-if="usageText"
          class="shrink-0 rounded border px-1.5 py-0.5 text-[11px]"
          :class="usageWarn
            ? 'border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-300'
            : 'border-border-subtle text-text-muted'"
          :title="usageTitle"
        >{{ usageText }}</span>
      </div>
      <div class="flex shrink-0 items-center gap-1.5">
        <button
          class="secondary-button h-7 px-2.5 text-xs"
          :disabled="promptBusy"
          :title="variant.imagePrompt ? 'AI 重写提示词' : 'AI 生成提示词'"
          @click="$emit('rewrite-prompt', variant)"
        >
          <LoaderCircle v-if="promptBusy" :size="13" class="shrink-0 animate-spin" />
          <Sparkles v-else :size="13" class="shrink-0" />
          {{ variant.imagePrompt ? 'AI 重写' : '生成提示词' }}
        </button>
        <button
          class="primary-button h-7 px-2.5 text-xs"
          :disabled="genBusy"
          title="按绘画提示词 + 上方参考图生成图片"
          @click="$emit('generate', variant)"
        >
          <LoaderCircle v-if="genBusy" :size="13" class="shrink-0 animate-spin" />
          <ImagePlus v-else :size="13" class="shrink-0" />
          {{ genBusy ? '生成中' : '生成图片' }}
        </button>
      </div>
    </div>

    <!-- 提示词区：只读摘要 + 弹窗编辑 -->
    <div class="flex flex-col gap-1">
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs text-text-secondary">绘画提示词</span>
        <span v-if="promptBusy" class="text-xs text-cyan-400">生成中…</span>
        <span v-else-if="model.promptDirty" class="text-xs text-amber-500">未保存</span>
        <span v-else-if="model.savedAt" class="text-xs text-emerald-500">已保存 ✓</span>
      </div>
      <button
        class="flex w-full items-start rounded border border-border-subtle bg-input-bg px-2.5 py-2 text-left transition-colors hover:border-cyan-500/50"
        :class="{ 'opacity-60': promptBusy }"
        :disabled="promptBusy"
        :title="model.prompt ? '点击编辑绘画提示词' : '点击填写绘画提示词'"
        @click="editModalVisible = true"
      >
        <span v-if="model.prompt" class="line-clamp-2 min-w-0 flex-1 text-sm leading-relaxed text-text-primary">{{ model.prompt }}</span>
        <span v-else class="flex-1 text-sm text-text-muted">{{ promptBusy ? '提示词生成中…' : '暂无绘画提示词，点击填写或用 AI 生成' }}</span>
      </button>
    </div>

    <!-- 参考图区：用户上传，作为生图参数发给模型 -->
    <div class="flex flex-col gap-1.5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-xs text-text-secondary">
          参考图{{ variant.referenceImageIds.length ? `（${variant.referenceImageIds.length}）` : '' }}
          <span class="ml-1 text-[11px] text-text-muted">上传或从资产库选择图片，生图时作为参数发给模型</span>
        </span>
        <div class="flex shrink-0 items-center gap-1.5">
          <div class="inline-flex h-6 rounded-md border border-border-subtle bg-elevated p-0.5" title="上传图片的存储方式：本地 = 转为 base64 直存；云端 = 上传云端图床">
            <button
              v-for="option in storageOptions"
              :key="option.value"
              class="rounded px-2 text-[11px] transition-colors"
              :class="storageMode === option.value ? 'bg-surface text-cyan-400 shadow-sm' : 'text-text-muted hover:text-text-primary'"
              @click="storageMode = option.value"
            >{{ option.label }}</button>
          </div>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="(image, index) in variant.referenceImageIds"
          :key="image"
          class="group relative h-20 w-20 cursor-pointer overflow-hidden rounded-lg border bg-elevated"
          :class="imageUsageCount(image) ? 'border-cyan-500/50' : 'border-border-subtle'"
          title="点击预览大图"
          @click="$emit('preview', { images: variant.referenceImageIds, index, source: 'reference' })"
        >
          <img :src="image" class="h-full w-full object-cover" :alt="`${variant.name} 参考图${index + 1}`" />
          <!-- 在用标记：这张图正被 N 个分镜当参考图取用（口径与分镜页参考图设置一致） -->
          <span
            v-if="imageUsageCount(image)"
            class="absolute bottom-1 left-1 rounded-sm bg-black/70 px-1 text-[10px] leading-4 text-cyan-200"
            :title="`这张参考图正被 ${imageUsageCount(image)} 个分镜取用`"
          >{{ imageUsageCount(image) }} 镜</span>
          <button
            class="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
            title="删除"
            @click.stop="$emit('remove-image', { variant, index })"
          ><X :size="12" /></button>
        </div>
        <!-- 上传预览框：点击/拖拽上传本地或云端参考图 -->
        <button
          class="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border-subtle text-[11px] text-text-muted transition-colors hover:border-cyan-500/50 hover:text-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="model.uploading"
          :title="`上传参考图（${storageMode === 'local' ? '本地' : '云端'}存储）`"
          @click="triggerUpload"
          @dragover.prevent
          @drop.prevent="handleDrop"
        >
          <LoaderCircle v-if="model.uploading" :size="18" class="animate-spin" />
          <template v-else>
            <Upload :size="18" />
            <span>上传参考图</span>
          </template>
        </button>
        <!-- 资产库选择：从项目资产图勾选追加为参考图 -->
        <button
          class="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border-subtle text-[11px] text-text-muted transition-colors hover:border-cyan-500/50 hover:text-cyan-400"
          title="从项目资产库选择图片作为参考图"
          @click="$emit('pick-images', variant)"
        >
          <Images :size="18" />
          <span>从资产选择</span>
        </button>
      </div>
    </div>

    <!-- 生成预览区：AI 生成结果，按图片比例瀑布流展示 -->
    <div class="flex flex-col gap-1.5 border-t border-border-subtle pt-2.5">
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs text-text-secondary">
          生成预览{{ generatedImages.length ? `（${generatedImages.length}）` : '' }}
          <span class="ml-1 text-[11px] text-text-muted">AI 生成的图片</span>
        </span>
      </div>

      <!-- 瀑布流：按图片原始比例展示（无图时显示空态提示） -->
      <p v-if="!generatedImages.length && !genBusy" class="text-[11px] text-text-muted">暂无生成图片，点击上方「生成图片」按提示词生成。</p>
      <p v-else-if="genBusy" class="flex items-center gap-1.5 text-[11px] text-cyan-400"><LoaderCircle :size="12" class="animate-spin" />生成中…</p>
      <div v-if="generatedImages.length" class="columns-2 gap-2">
        <div
          v-for="(image, index) in generatedImages"
          :key="image"
          class="group relative mb-2 w-full cursor-pointer break-inside-avoid overflow-hidden rounded-lg border border-border-subtle bg-elevated"
          title="点击预览大图"
          @click="$emit('preview', { images: generatedImages, index, source: 'generated' })"
        >
          <img :src="image" class="block w-full" loading="lazy" :alt="`${variant.name} 生成图${index + 1}`" />
          <button
            class="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
            title="删除"
            @click.stop="$emit('remove-gen-image', { variant, index })"
          ><X :size="13" /></button>
        </div>
      </div>
      <p v-if="model.genError" class="truncate text-xs text-red-400" :title="model.genError">{{ model.genError }}</p>
    </div>

    <!-- 提示词编辑弹窗：完整查看与修改，不受卡片高度限制 -->
    <Teleport to="body">
      <Transition name="fade">
        <!-- 编辑视觉状态：z-[130] 高于资产全屏抽屉（z-[101]）、低于大图预览（z-[200]） -->
        <div v-if="editModalVisible" class="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" @click.self="closeEditModal">
          <section class="flex h-[92vh] w-[min(1080px,100%)] flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface shadow-2xl">
            <header class="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-4">
              <div>
                <h2 class="text-base font-semibold text-text-primary">编辑绘画提示词</h2>
                <p class="mt-1 text-xs text-text-muted">{{ variant.name }}</p>
              </div>
              <button class="icon-button" title="关闭" @click="closeEditModal"><X :size="18" /></button>
            </header>
            <!-- 输入框独占主体并可滚动，弹窗本身不出现滚动条 -->
            <div class="min-h-0 flex-1 p-5">
              <textarea
                class="h-full w-full resize-none rounded-md border border-border-subtle bg-input-bg p-3 font-mono text-sm leading-6 text-text-primary placeholder-text-muted outline-none focus:border-cyan-500/50"
                :value="model.prompt"
                placeholder="填写绘画提示词，或用「生成提示词」让 AI 生成"
                aria-label="绘画提示词"
                @input="handlePromptInput"
              />
            </div>
            <footer class="flex shrink-0 items-center justify-between border-t border-border-subtle px-5 py-3">
              <p class="text-xs text-text-muted">{{ model.prompt.length.toLocaleString() }} 个字符</p>
              <div class="flex items-center gap-3">
                <button class="secondary-button h-9 px-4 text-xs" @click="closeEditModal">取消</button>
                <button class="primary-button h-9 px-4 text-xs" @click="saveAndCloseEditModal">保存</button>
              </div>
            </footer>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
/**
 * 资产视觉状态卡片：提示词编辑 + 参考图区（本地上传 / 云端 / 资产库选图，生图参数）+ 生成预览区（AI 结果，瀑布流）。
 * 参考图在上方：上传或从资产库选择后作为参数随提示词一起发给生图模型；
 * 生成预览在下方：模型返回的图片按原始比例瀑布流展示。
 * 引用展示：状态头显示「被 N 章 · M 镜引用」，参考图角标显示「N 镜」——即哪张图正被哪些分镜取用。
 * 数据回写与持久化由父组件（工作台）统一处理，本组件只发事件。
 */
import { computed, reactive, ref, watch } from 'vue'
import { ImagePlus, Images, LoaderCircle, Sparkles, Upload, X } from 'lucide-vue-next'
import type { LongProjectAssetVariant } from '@comic/types'
import type { AssetVariantUsage } from '@comic/services/assetUsageService'
import { processImage, type ImageStorageMode } from '@comic/services/uploadService'

/** 图片所属区域：AI 生成预览 / 用户上传参考图。 */
type ImageSource = 'generated' | 'reference'

interface Props {
  variant: LongProjectAssetVariant
  /** 提示词是否正在生成（批量/单条 AI） */
  promptBusy?: boolean
  /** 图片是否正在生成 */
  genBusy?: boolean
  /** 该视觉状态的引用情况（哪些章节引用、多少分镜绑定、每张参考图被多少分镜取用）。 */
  usage?: AssetVariantUsage
}

const props = withDefaults(defineProps<Props>(), {
  promptBusy: false,
  genBusy: false,
})

const emit = defineEmits<{
  (e: 'update:prompt', value: string): void
  (e: 'rewrite-prompt', variant: LongProjectAssetVariant): void
  (e: 'generate', variant: LongProjectAssetVariant): void
  (e: 'remove-gen-image', payload: { variant: LongProjectAssetVariant; index: number }): void
  (e: 'remove-image', payload: { variant: LongProjectAssetVariant; index: number }): void
  (e: 'add-image', payload: { variant: LongProjectAssetVariant; url: string }): void
  (e: 'pick-images', variant: LongProjectAssetVariant): void
  (e: 'preview', payload: { images: string[]; index: number; source: ImageSource }): void
}>()

/** 卡片本地 UI 状态（不持久化）。 */
const model = reactive({
  prompt: props.variant.imagePrompt ?? '',
  promptDirty: false,
  savedAt: false,
  genError: '',
  uploading: false,
})

/** 提示词编辑弹窗 + 打开时的草稿备份（取消时恢复）。 */
const editModalVisible = ref(false)
const promptBackup = ref('')

/** 上传存储方式：本地 base64 / 云端图床（参考短篇漫画资产上传）。 */
const storageMode = ref<ImageStorageMode>('local')
const storageOptions: Array<{ value: ImageStorageMode; label: string }> = [
  { value: 'cloud', label: '云端' },
  { value: 'local', label: '本地' },
]

/** 生成预览区图片（AI 生成结果）。 */
const generatedImages = computed(() => props.variant.generatedImageIds ?? [])

// ========== 引用状态（章节级 + 图片级） ==========

const chapterCount = computed(() => props.usage?.chapterNames.length ?? 0)
const panelCount = computed(() => props.usage?.panelCount ?? 0)
/** 状态头引用标签：被 N 章 · M 镜引用；只有章节引用没有分镜绑定时改文案并转琥珀提示。 */
const usageText = computed(() => {
  if (!chapterCount.value && !panelCount.value) return ''
  if (!panelCount.value) return `被 ${chapterCount.value} 章引用 · 暂无分镜绑定`
  return `被 ${chapterCount.value} 章 · ${panelCount.value} 镜引用`
})
const usageTitle = computed(() => {
  const names = props.usage?.chapterNames ?? []
  const lines = [names.length ? `引用章节：${names.join('、')}` : '', panelCount.value ? `绑定分镜：${panelCount.value} 个` : '尚未有分镜绑定该视觉状态']
  return lines.filter(Boolean).join('\n')
})
/** 有章节在用、却没有分镜绑定：多半是分镜还没生成/绑定，用琥珀色提醒而不是灰色。 */
const usageWarn = computed(() => Boolean(props.usage) && chapterCount.value > 0 && panelCount.value === 0)

/** 该参考图被多少个分镜取用（0 = 目前没有任何分镜会取到这张图）。 */
function imageUsageCount(image: string): number {
  return props.usage?.imagePanelCount[image] ?? 0
}

/**
 * 外部回填（AI 生成 / 重写 / 提取确认写入）时同步本地草稿。
 * ⚠️ 这里**不能**点亮「已保存」——用户没保存过任何东西，那只是数据被外部改写；
 * 原来在这里置 `savedAt` 会在确认资产后让整列状态集体闪一下「已保存」，纯噪音。
 * 另外切换视觉状态 tab 时卡片实例是复用的，若外部值变成空也要跟着清空，否则会残留上一个状态的提示词。
 */
watch(() => props.variant.imagePrompt, (value) => {
  if (value === undefined) return
  if (value === model.prompt) return
  model.prompt = value
  model.promptDirty = false
  model.savedAt = false
})

/** 提示词输入：仅更新本地草稿，弹窗「保存」时统一上抛。 */
function handlePromptInput(event: Event) {
  const value = (event.target as HTMLTextAreaElement).value
  model.prompt = value
  model.promptDirty = true
}

/** 打开弹窗时备份当前提示词（取消时恢复）。 */
watch(editModalVisible, (visible) => {
  if (visible) promptBackup.value = model.prompt
})

/** 关闭弹窗：未保存则恢复备份。 */
function closeEditModal() {
  if (model.promptDirty) {
    model.prompt = promptBackup.value
    model.promptDirty = false
  }
  editModalVisible.value = false
}

/** 保存并关闭弹窗：上抛最新提示词。**只有这里才点亮「已保存」**——这是唯一由用户主动触发的写入。 */
function saveAndCloseEditModal() {
  if (model.promptDirty) {
    model.promptDirty = false
    model.savedAt = true
    emit('update:prompt', model.prompt)
    setTimeout(() => { model.savedAt = false }, 1500)
  }
  editModalVisible.value = false
}

let fileInput: HTMLInputElement | null = null

/** 触发本地文件上传（参考图，作为生图参数）。 */
function triggerUpload() {
  if (!fileInput) {
    fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/*'
    fileInput.style.display = 'none'
    fileInput.addEventListener('change', handleFileChange)
    document.body.appendChild(fileInput)
  }
  fileInput.click()
}

/** 拖拽上传参考图。 */
function handleDrop(event: DragEvent) {
  const file = event.dataTransfer?.files?.[0]
  if (file) void processUpload(file)
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return
  await processUpload(file)
}

/** 按当前存储方式处理并上抛上传结果。 */
async function processUpload(file: File) {
  model.uploading = true
  try {
    const result = await processImage(file, storageMode.value)
    if (!result.success || !result.url) {
      model.genError = result.error || '图片处理失败'
      return
    }
    model.genError = ''
    emit('add-image', { variant: props.variant, url: result.url })
  } catch (error) {
    model.genError = error instanceof Error ? error.message : '图片处理失败'
  } finally {
    model.uploading = false
  }
}
</script>

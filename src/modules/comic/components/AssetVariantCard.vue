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
          :title="activeSlotHasText ? 'AI 重写提示词' : 'AI 生成提示词'"
          @click="$emit('rewrite-prompt', variant)"
        >
          <LoaderCircle v-if="promptBusy" :size="13" class="shrink-0 animate-spin" />
          <Sparkles v-else :size="13" class="shrink-0" />
          {{ activeSlotHasText ? 'AI 重写' : '生成提示词' }}
        </button>
        <button
          class="secondary-button h-7 px-2.5 text-xs"
          title="查看拼接后的最终生图提示词（共用属性 + 绘画提示词 + 共用属性）"
          @click="$emit('view-prompt', variant)"
        >
          <FileText :size="13" class="shrink-0" />
          查看提示词
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

    <!-- 提示词区：只读摘要（点击进弹窗编辑）+ 输入框下方一行「左=多条提示词 右=开关」 -->
    <div class="flex flex-col gap-1">
      <!-- 输入框固定 3 行高：文本超出用 line-clamp-3 截断，点击进弹窗编辑 -->
      <button
        class="flex h-[86px] w-full items-start rounded border border-border-subtle bg-input-bg px-2.5 py-2 text-left transition-colors hover:border-cyan-500/50"
        :class="{ 'opacity-60': promptBusy }"
        :disabled="promptBusy"
        :title="model.prompt ? '点击编辑绘画提示词' : '点击填写绘画提示词'"
        @click="editModalVisible = true"
      >
        <span v-if="model.prompt" class="line-clamp-3 min-w-0 flex-1 text-sm leading-relaxed text-text-primary">{{ model.prompt }}</span>
        <span v-else class="flex-1 text-sm text-text-muted">{{ promptBusy ? '提示词生成中…' : '暂无绘画提示词，点击填写或用 AI 生成' }}</span>
      </button>

      <!-- 输入框下方一行：**左=本视觉状态的多条提示词**（选中哪条就编辑 / 发送哪条），
           **右=拼接共用属性开关**。提示词条存在视觉状态上，各状态各管各的；新增条空白起步。 -->
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 flex-wrap items-center gap-1">
          <button
            v-for="(slot, index) in slots"
            :key="slot.id"
            class="rounded-md border px-1.5 py-0.5 text-[11px] transition-colors"
            :class="slot.id === activeId ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-border-subtle text-text-muted hover:border-border-default hover:text-text-primary'"
            :title="`切换到提示词 ${index + 1}${(slot.text ?? '').trim() ? '' : '（空）'}`"
            @click="selectSlot(slot.id)"
          >提示词 {{ index + 1 }}</button>
          <button
            class="flex h-5 w-5 items-center justify-center rounded-md border border-dashed border-border-subtle text-text-muted transition-colors hover:border-border-default hover:text-text-primary"
            title="新增一条空白提示词"
            @click="addSlot"
          ><Plus :size="11" /></button>
          <button
            v-if="slots.length > 1"
            class="flex h-5 w-5 items-center justify-center rounded-md border border-border-subtle text-text-muted transition-colors hover:border-red-500/40 hover:text-red-400"
            title="删除当前这条提示词"
            @click="removeActiveSlot"
          ><Trash2 :size="11" /></button>
          <span v-if="promptBusy" class="ml-1 text-xs text-cyan-400">生成中…</span>
          <span v-else-if="model.promptDirty" class="ml-1 text-xs text-amber-500">未保存</span>
          <span v-else-if="model.savedAt" class="ml-1 text-xs text-emerald-500">已保存 ✓</span>
        </div>
        <ToggleSwitch
          class="ml-auto"
          :model-value="activeSlot.attachShared"
          label="拼接共用属性"
          @update:model-value="toggleAttachShared"
        />
      </div>
    </div>

    <!-- 参考图区：用户上传，作为生图参数发给模型 -->
    <div class="flex flex-col gap-1.5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-xs text-text-secondary">
          参考图{{ variant.referenceImageIds.length ? `（${variant.referenceImageIds.length}）` : '' }}
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
          class="group relative h-20 w-20 cursor-pointer overflow-hidden rounded-lg border border-border-subtle bg-elevated"
          title="点击预览大图"
          @click="$emit('preview', { images: variant.referenceImageIds, index, source: 'reference' })"
        >
          <img :src="image" class="h-full w-full object-cover" :alt="`${variant.name} 图${refImageNumber(index)}`" />
          <!-- 图号：共用属性参考图编完后，本状态上传图按上传顺序续编（与实际发送数组同序） -->
          <span
            class="absolute bottom-1 left-1 rounded-sm bg-black/70 px-1 text-[10px] leading-4 text-cyan-200"
            :title="`生图时作为第 ${refImageNumber(index)} 张参考图发送（共用属性图占前 ${sharedImageCount} 张）`"
          >图{{ refImageNumber(index) }}</span>
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

    <!-- 当前资产区：本视觉状态的成品图（AI 生成 / 自行上传 / 引用其他章节的已生成图），按原始比例瀑布流展示 -->
    <div class="flex flex-col gap-1.5 border-t border-border-subtle pt-2.5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="flex min-w-0 items-center gap-1.5 text-xs text-text-secondary">
          当前资产{{ assetImages.length ? `（${assetImages.length}）` : '' }}
          <span
            v-if="linkedChapterName"
            class="shrink-0 rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-300"
            :title="`本条状态由「${linkedChapterName}」维护，图片只在原章节增删`"
          >引用自 {{ linkedChapterName }}</span>
        </span>
        <div class="flex shrink-0 items-center gap-1.5">
          <button
            class="secondary-button h-6 px-2 text-[11px]"
            :disabled="model.assetUploading"
            title="上传本状态的成品图（与生成图一样可被分镜取用）"
            @click="triggerAssetUpload"
          >
            <LoaderCircle v-if="model.assetUploading" :size="12" class="shrink-0 animate-spin" />
            <Upload v-else :size="12" class="shrink-0" />
            上传图片
          </button>
          <button
            class="secondary-button h-6 px-2 text-[11px]"
            title="引用其他章节已生成好的图（同一资产的某个视觉状态，只关联不复制）"
            @click="$emit('link-chapter', variant)"
          >
            <Link2 :size="12" class="shrink-0" />
            引用其他章节
          </button>
          <button
            v-if="detachVisible"
            class="secondary-button h-6 px-2 text-[11px]"
            title="只移除本章对这条状态的引用，不动原章节的图片"
            @click="$emit('detach-chapter', variant)"
          >
            <Unlink :size="12" class="shrink-0" />
            移出本章
          </button>
        </div>
      </div>

      <!-- 瀑布流：生成图在前、自上传图在后，角标标出来源（无图时显示空态提示） -->
      <p v-if="!assetImages.length && !genBusy" class="text-[11px] text-text-muted">暂无图片：可「生成图片」、上传成品图，或引用其他章节已生成的图。</p>
      <p v-else-if="genBusy" class="flex items-center gap-1.5 text-[11px] text-cyan-400"><LoaderCircle :size="12" class="animate-spin" />生成中…</p>
      <div v-if="assetImages.length" class="columns-2 gap-2">
        <div
          v-for="(image, index) in assetImages"
          :key="image"
          class="group relative mb-2 w-full cursor-pointer break-inside-avoid overflow-hidden rounded-lg border border-border-subtle bg-elevated"
          title="点击预览大图"
          @click="$emit('preview', { images: assetImages, index, source: imageSource(index) })"
        >
          <img :src="image" class="block w-full" loading="lazy" :alt="`${variant.name}${imageSource(index) === 'generated' ? '生成图' : '上传图'}${index + 1}`" />
          <!-- 来源角标：生成 / 上传（引用其他章节的图会跟着原状态一起出现，来源即原状态自己的来源） -->
          <span
            class="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[9px] leading-4"
            :class="imageSource(index) === 'generated' ? 'text-cyan-300' : 'text-emerald-300'"
            :title="imageSource(index) === 'generated' ? 'AI 生成的成品图' : '本状态自行上传的成品图'"
          >{{ imageSource(index) === 'generated' ? '生成' : '上传' }}</span>
          <!-- 删除只在原章节提供；引用方章节不显示（图由原章节维护） -->
          <button
            v-if="canDeleteImages"
            class="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
            title="删除"
            @click.stop="$emit('remove-asset-image', { variant, image })"
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
 * 资产视觉状态卡片：提示词编辑 + 参考图区（本地上传 / 云端 / 资产库选图，只作生图参数）+ 当前资产区（成品图，瀑布流）。
 * 提示词区排布：**输入框（点击进弹窗编辑）在上，下面一行「左 = 多条提示词切换 + 新增/删除，右 = 拼接共用属性开关」**；
 * 提示词条存在视觉状态上，**各状态各管各的**，新增条空白起步。「查看提示词」看的是选中那条拼完的结果。
 * 参考图在上方：只作为参数随提示词一起发给生图模型，不进分镜。
 * 当前资产在下方：本状态的**成品图**，三个来源 —— AI 生成、自行上传、引用其他章节的同一视觉状态（只关联不复制）。
 *   前两者存在本状态上（`generatedImageIds` / `uploadedImageIds`），一起走 `effectiveVariantRefImages`，分镜可选取用。
 *   **删除只在原章节提供**：引用方章节不显示删除按钮（图由原章节维护），改为可「移出本章」。
 * 引用展示：状态头显示「被 N 章 · M 镜引用」（按成品图统计）。
 * 上传参考图角标显示「图N」：共用属性参考图编完后按上传顺序续编，与实际发送数组同序；不进分镜。
 * 数据回写与持久化由父组件（工作台）统一处理，本组件只发事件。
 */
import { computed, reactive, ref, watch } from 'vue'
import { FileText, ImagePlus, Images, Link2, LoaderCircle, Plus, Sparkles, Trash2, Unlink, Upload, X } from 'lucide-vue-next'
import { v4 as uuidv4 } from 'uuid'
import type { GenPromptSlot, LongProjectAssetVariant } from '@comic/types'
import type { AssetVariantUsage } from '@comic/services/assetUsageService'
import { effectiveVariantRefImages } from '@comic/services/panelPromptService'
import { processImage, type ImageStorageMode } from '@comic/services/uploadService'
import { createGenPromptSlot, normalizeGenPromptSlot } from '@comic/utils/genPromptSlots'
import ToggleSwitch from '@comic/components/common/ToggleSwitch.vue'

/** 图片所属区域：成品图（生成 / 自上传） / 参考图（只给模型看的输入）。 */
type ImageSource = 'generated' | 'uploaded' | 'reference'

interface Props {
  variant: LongProjectAssetVariant
  /** 提示词是否正在生成（批量/单条 AI） */
  promptBusy?: boolean
  /** 图片是否正在生成 */
  genBusy?: boolean
  /** 该视觉状态的引用情况（哪些章节引用、多少分镜绑定、每张生成图被多少分镜取用）。 */
  usage?: AssetVariantUsage
  /**
   * 共用属性参考图张数（只算「插入最前」且启用参考图的）。
   * 本状态上传图的图号从它之后续编：第 1 张上传图 = 图 sharedImageCount+1。
   */
  sharedImageCount?: number
  /**
   * 本章是否为该资产的原章节 —— **图只能在原章节删**。
   * false 时当前资产区不显示删除按钮（引用方章节），改为可「移出本章」。
   */
  canDeleteImages?: boolean
  /** 本章不是原章节时原章节名，用于「引用自 X」角标。 */
  linkedChapterName?: string
  /** 本章是引用方且引用了这条状态 → 显示「移出本章」（只删引用，不动图）。 */
  detachVisible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  promptBusy: false,
  genBusy: false,
  sharedImageCount: 0,
  canDeleteImages: true,
  linkedChapterName: '',
  detachVisible: false,
})

const emit = defineEmits<{
  (e: 'update:prompt', value: string): void
  /** 候选提示词条整体写回（正文 / 开关 / 当前选中）。 */
  (e: 'update:slots', slots: GenPromptSlot[], activeId: string): void
  (e: 'rewrite-prompt', variant: LongProjectAssetVariant): void
  (e: 'view-prompt', variant: LongProjectAssetVariant): void
  (e: 'generate', variant: LongProjectAssetVariant): void
  /** 当前资产区：上传成品图（进 `uploadedImageIds`，与生成图一样可被分镜取用）。 */
  (e: 'add-asset-image', payload: { variant: LongProjectAssetVariant; url: string }): void
  /** 当前资产区：删除成品图（按图片 URL 定位 —— 生成图与上传图都在这一区，各自归各自的数组）。 */
  (e: 'remove-asset-image', payload: { variant: LongProjectAssetVariant; image: string }): void
  /** 引用其他章节已生成的图（同一资产的某视觉状态，由容器打开选择弹窗）。 */
  (e: 'link-chapter', variant: LongProjectAssetVariant): void
  /** 移出本章：只删本章的引用条目，不动原章节的图。 */
  (e: 'detach-chapter', variant: LongProjectAssetVariant): void
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
  /** 当前资产区正在上传成品图（与「参考图上传」分开，两个区的按钮各自转圈）。 */
  assetUploading: false,
})

/** 提示词编辑弹窗 + 打开时的草稿备份（取消时恢复）。 */
const editModalVisible = ref(false)
const promptBackup = ref('')

/**
 * 建一条提示词（开关默认开）。资产侧上传图各条共用，挂在视觉状态上，不放在条内。
 * 统一走 `createGenPromptSlot` —— 与分镜侧同一个形状，读回比较才不会因为缺字段而反复重建。
 */
function makeSlot(text: string): GenPromptSlot {
  return createGenPromptSlot(uuidv4(), text)
}

/**
 * 候选提示词条 —— **只属于当前视觉状态**（存在该状态上，切状态不会串条）。
 * 没建过条时按「一条默认槽」展示，正文取 `imagePrompt`；旧数据缺开关字段时按「开」补全。
 */
const slots = ref<GenPromptSlot[]>([])
const activeId = ref('')
/** 当前编辑 / 发送的这一条。 */
const activeSlot = computed(() => slots.value.find((slot) => slot.id === activeId.value) ?? slots.value[0])
/** 当前条下标：`imagePrompt` 恒等于第 1 条的正文，只有第 1 条的编辑会写它。 */
const activeSlotIndex = computed(() => Math.max(0, slots.value.findIndex((slot) => slot.id === activeId.value)))
/** 当前条是否已有正文（决定按钮显示「AI 重写」还是「生成提示词」）。 */
const activeSlotHasText = computed(() => Boolean(activeSlot.value?.text?.trim()))

/**
 * 库里这份候选条（已归一，并修复「`imagePrompt` ≡ 第 1 条正文」不变式）。
 *
 * 旧版「新增候选时复制当前正文」留下的脏数据会让两条正文一模一样（切换看不出区别），
 * `text: null` 则让摘要显示成空框；这里按 `imagePrompt` 把第 1 条补回来。
 */
function storedSlots(): GenPromptSlot[] | null {
  if (!props.variant.genPrompts?.length) return null
  const normalized = props.variant.genPrompts.map(normalizeGenPromptSlot)
  const primary = normalized[0]
  const prompt = props.variant.imagePrompt ?? ''
  if (primary && !primary.text.trim() && prompt.trim()) primary.text = prompt
  return normalized
}

/** 上一次自己写回库里的候选条签名（含状态 id）：存储回环到达时跳过重建，别把正在编辑的草稿打回。 */
let persistedSlotsSignature = ''

function resetSlots() {
  const stored = storedSlots() ?? [makeSlot(props.variant.imagePrompt ?? '')]
  if (`${props.variant.id}::${JSON.stringify(stored)}` === persistedSlotsSignature) return
  persistedSlotsSignature = ''
  slots.value = stored
  const remembered = props.variant.activeGenPromptId
  activeId.value = remembered && stored.some((slot) => slot.id === remembered) ? remembered : stored[0].id
  model.prompt = activeSlot.value?.text ?? ''
}

// 切换视觉状态 / 外部整体替换候选条时重建，避免把上一个状态的条带过来
watch(() => [props.variant.id, props.variant.genPrompts] as const, () => resetSlots(), { immediate: true })

/**
 * 把输入框草稿写回**当前**条。
 * ⚠️ 必须在切条 / 增删条**之前**调用 —— 否则「落库」那一步（`persistSlots` 不再碰草稿）之前的
 * 旧写法会把草稿写进刚切到的那一条，于是「新增」出来的条不是空的、还把上一条正文复制了一份。
 */
function commitDraft() {
  if (activeSlot.value) activeSlot.value.text = model.prompt
}

/** 切条：先把当前草稿存回旧条，再载入新条正文；选中项立刻落库。 */
function selectSlot(id: string) {
  if (id === activeId.value) return
  commitDraft()
  activeId.value = id
  model.prompt = activeSlot.value?.text ?? ''
  model.promptDirty = false
  model.savedAt = false
  persistSlots()
}

/** 新增一条：**空白**起步 —— 复制当前正文会让切换看起来「没变化」，看不出选中了哪条。 */
function addSlot() {
  commitDraft()
  const slot = makeSlot('')
  slots.value.push(slot)
  activeId.value = slot.id
  model.prompt = ''
  model.promptDirty = false
  model.savedAt = false
  persistSlots()
}

/** 删除当前条；至少保留一条。 */
function removeActiveSlot() {
  if (slots.value.length <= 1) return
  const index = slots.value.findIndex((slot) => slot.id === activeId.value)
  if (index < 0) return
  slots.value.splice(index, 1)
  activeId.value = slots.value[Math.min(index, slots.value.length - 1)].id
  model.prompt = activeSlot.value?.text ?? ''
  model.promptDirty = false
  model.savedAt = false
  persistSlots()
}

/**
 * 结构变化立刻写回（切条 / 增删条 / 开关）。**不动草稿字段** ——
 * 草稿只由弹窗「保存」提交（`saveAndCloseEditModal` 会先 `commitDraft()`）。
 */
function persistSlots() {
  persistedSlotsSignature = `${props.variant.id}::${JSON.stringify(slots.value)}`
  emit('update:slots', slots.value.map((slot) => ({ ...slot })), activeId.value)
}

/**
 * 切换「拼接共用属性」：自己接值再写回，不用 v-model + 监听的组合 ——
 * 那样两个 `update:modelValue` 监听器的执行顺序不确定，可能把切换前的值落库。
 */
function toggleAttachShared(value: boolean) {
  if (activeSlot.value) activeSlot.value.attachShared = value
  persistSlots()
}

/** 上传存储方式：本地 base64 / 云端图床（参考短篇漫画资产上传）。 */
const storageMode = ref<ImageStorageMode>('local')
const storageOptions: Array<{ value: ImageStorageMode; label: string }> = [
  { value: 'cloud', label: '云端' },
  { value: 'local', label: '本地' },
]

/**
 * 当前资产区的图片 = **生成图 + 自上传成品图**（顺序 = 分镜可选的顺序）。
 * 走全项目统一取图口径 `effectiveVariantRefImages`，与分镜参考图清单 / 缩略图候选完全同源；
 * 上传的**参考图**（`referenceImageIds`）不在这里 —— 它只是发给模型的输入。
 */
const assetImages = computed(() => effectiveVariantRefImages(props.variant))

/** 第 index 张图的来源（生成图排在前面，自上传图接在后面）。 */
function imageSource(index: number): 'generated' | 'uploaded' {
  return index < (props.variant.generatedImageIds ?? []).length ? 'generated' : 'uploaded'
}

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

/**
 * 上传参考图的图号（1 起）：共用属性图编完后按上传顺序续编，与实际发送数组同序。
 * **关掉「拼接共用属性」时共用属性图不进这次请求**，上传图直接从「图1」起。
 */
function refImageNumber(index: number): number {
  return (activeSlot.value?.attachShared === false ? 0 : props.sharedImageCount) + index + 1
}

/**
 * 外部回填（AI 生成 / 重写 / 提取确认写入）时同步本地草稿。
 * ⚠️ 这里**不能**点亮「已保存」——用户没保存过任何东西，那只是数据被外部改写；
 * 原来在这里置 `savedAt` 会在确认资产后让整列状态集体闪一下「已保存」，纯噪音。
 * 另外切换视觉状态 tab 时卡片实例是复用的，若外部值变成空也要跟着清空，否则会残留上一个状态的提示词。
 */
watch(() => props.variant.imagePrompt, (value) => {
  if (value === undefined) return
  // imagePrompt 恒等于第 1 条正文；外部写入（AI 生成 / 重写 / 提取确认）也只落第 1 条
  const primary = slots.value[0]
  if (!primary) return
  if (value !== primary.text) {
    primary.text = value
    // 回填后切回第 1 条：否则用户在候选条 2 上点「生成提示词」会看着没反应
    if (activeId.value !== primary.id) {
      activeId.value = primary.id
      model.prompt = value
      model.promptDirty = false
      model.savedAt = false
      return
    }
  }
  if (activeSlotIndex.value !== 0) return
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
    commitDraft()
    // 只有第 1 条与 imagePrompt 互为镜像；改别条不写 imagePrompt，免得把描述换成某个候选变体。
    if (activeSlotIndex.value === 0) emit('update:prompt', model.prompt)
    emit('update:slots', slots.value.map((slot) => ({ ...slot })), activeId.value)
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

/** 按当前存储方式处理并上抛上传结果（参考图区）。 */
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

/**
 * 当前资产区「上传图片」：把本地图作为**本状态的成品图**（不是参考图）。
 * 支持多选，逐张处理并追加；与分镜取图同源，上传后分镜即可选到它。
 */
let assetFileInput: HTMLInputElement | null = null

function triggerAssetUpload() {
  if (!assetFileInput) {
    assetFileInput = document.createElement('input')
    assetFileInput.type = 'file'
    assetFileInput.accept = 'image/*'
    assetFileInput.multiple = true
    assetFileInput.style.display = 'none'
    assetFileInput.addEventListener('change', handleAssetFileChange)
    document.body.appendChild(assetFileInput)
  }
  assetFileInput.click()
}

async function handleAssetFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files ?? [])
  target.value = ''
  if (!files.length) return
  model.assetUploading = true
  try {
    for (const file of files) {
      const result = await processImage(file, storageMode.value)
      if (!result.success || !result.url) {
        model.genError = result.error || '图片处理失败'
        continue
      }
      model.genError = ''
      emit('add-asset-image', { variant: props.variant, url: result.url })
    }
  } catch (error) {
    model.genError = error instanceof Error ? error.message : '图片处理失败'
  } finally {
    model.assetUploading = false
  }
}
</script>

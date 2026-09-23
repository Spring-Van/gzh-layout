<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- 内容区 -->
    <div class="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
      <!-- 输入框：前置/后置共用属性与动态参考图定义都由 composeFinalPrompt 在复制 / 生图时实时拼接，
           不再在上方下方做只读预览（2026-09-22 简化）。 -->
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-sm shadow-black/10">
        <div class="relative min-h-32 flex-1 p-4">
          <textarea
            v-model="activeSlot.text"
            class="custom-scrollbar relative h-full w-full resize-none bg-transparent text-xs leading-relaxed text-text-primary caret-cyan-400 placeholder:text-text-muted focus:outline-none"
            placeholder="在此输入本分镜的画面描述（生图提示词），可点击底部「AI 推导」由 LLM 生成后再修改..."
          />
        </div>
      </div>

      <!-- 输入框下方一行：**左=本分镜的多条提示词**（选中哪条就编辑 / 发送哪条），
           **右=这一条的开关**（决定实际发哪些图，图号随之重编）。
           提示词条存在本镜的画面工件上，切镜不会串到别的分镜去。 -->
      <div class="mt-1.5 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 flex-wrap items-center gap-1">
          <button
            v-for="(slot, index) in slots"
            :key="slot.id"
            class="rounded-md border px-2 py-0.5 text-[11px] transition-colors"
            :class="slot.id === activeId ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-border-subtle text-text-muted hover:border-border-default hover:text-text-primary'"
            :title="`切换到提示词 ${index + 1}${(slot.text ?? '').trim() ? '' : '（空）'}`"
            @click="selectSlot(slot.id)"
          >提示词 {{ index + 1 }}</button>
          <button
            class="flex h-5 w-5 items-center justify-center rounded-md border border-dashed border-border-subtle text-text-muted transition-colors hover:border-border-default hover:text-text-primary"
            title="新增一条空白提示词"
            @click="addSlot"
          ><Plus :size="12" /></button>
          <button
            v-if="slots.length > 1"
            class="flex h-5 w-5 items-center justify-center rounded-md border border-border-subtle text-text-muted transition-colors hover:border-red-500/40 hover:text-red-400"
            title="删除当前这条提示词"
            @click="removeActiveSlot"
          ><Trash2 :size="12" /></button>
        </div>
        <div class="ml-auto flex shrink-0 items-center gap-3">
          <ToggleSwitch
            :model-value="activeSlot.attachShared !== false"
            label="拼接共用属性"
            @update:model-value="setAttachShared"
          />
          <ToggleSwitch
            :model-value="activeSlot.useAssetRefs !== false"
            label="使用资产参考图"
            @update:model-value="setUseAssetRefs"
          />
          <span class="text-[10px] text-text-muted">随这条发送 {{ selectedRefCount }} 张图</span>
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

      <!-- 参考图上传（本条独立、不限张）。
           资产图与共用属性图不在这里重复列出 —— 中栏已按人物/场景/道具展示并带「图N」角标，
           「查看提示词」里能看到完整拼接结果。 -->
      <div class="mt-2 shrink-0">
        <button
          class="mb-1.5 flex items-center gap-1.5 text-[11px] text-text-secondary transition-colors hover:text-text-primary"
          @click="showRefConfig = !showRefConfig"
        >
          <ChevronRight :size="12" class="transition-transform" :class="showRefConfig ? 'rotate-90' : ''" />
          参考图上传
          <span class="text-text-muted">({{ activeUploads.length }}张)</span>
        </button>

        <Transition name="collapse">
          <div v-if="showRefConfig" class="space-y-2 rounded-lg border border-border-subtle bg-surface p-2.5">
            <label class="flex select-none items-center gap-1.5 text-[11px]" :class="generatedImage ? 'cursor-pointer text-text-primary' : 'cursor-not-allowed text-text-muted'">
              <input v-model="refConfig.useGeneratedImage" type="checkbox" :disabled="!generatedImage" class="h-3 w-3 rounded border-border-subtle bg-input-bg text-cyan-500 focus:ring-cyan-500/30 focus:ring-offset-0" />
              <span>追加上一版结果图</span>
            </label>

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
                v-for="(url, idx) in activeUploads"
                :key="idx"
                class="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border-subtle"
              >
                <img :src="url" class="h-full w-full object-cover" alt="本条参考图" />
                <!-- 图号：接在这一条实际会发的图之后，随开关实时变。 -->
                <span
                  class="absolute bottom-0 left-0 rounded-tr bg-black/60 px-1 text-[10px] font-medium text-cyan-300"
                  :title="`这条发送时作为第 ${uploadNumber(idx)} 张参考图`"
                >图{{ uploadNumber(idx) }}</span>
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
            <!-- 查看最终提示词：弹出弹窗查看当前拼接后发给 AI 生图的完整提示词 -->
            <button
              class="flex items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 py-1.5 text-[11px] text-text-secondary transition-colors hover:border-border-default hover:text-text-primary"
              title="查看拼接后的最终生图提示词（前置共用属性 + 动态图号定义 + 画面描述 + 后置共用属性）"
              @click="showPromptModal = true"
            >
              <FileText :size="13" />
              查看提示词
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

    <!-- 最终生图提示词查看弹窗：与「单独生成 / 复制」完全同源（composeFinalPrompt 实时拼装） -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showPromptModal"
          class="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-6"
          @click.self="showPromptModal = false"
        >
          <div class="flex max-h-[82vh] w-[min(760px,92vw)] flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-2xl">
            <div class="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-3.5">
              <h2 class="text-sm font-semibold text-text-primary">最终生图提示词 · 第 {{ panel.order }} 镜 · 提示词 {{ activeSlotIndex + 1 }}</h2>
              <button
                class="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-elevated hover:text-text-primary"
                @click="showPromptModal = false"
              ><X :size="15" /></button>
            </div>
            <pre class="custom-scrollbar min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 text-xs leading-relaxed text-text-primary">{{ finalPrompt }}</pre>
            <div class="flex shrink-0 items-center justify-between gap-3 border-t border-border-subtle px-5 py-3">
              <p class="text-[10px] text-text-muted">共 {{ finalPrompt.length.toLocaleString() }} 字符 · 与「单独生成」发送内容一致</p>
              <div class="flex items-center gap-2">
                <button
                  class="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-[11px] text-text-secondary transition-colors hover:border-border-default hover:text-text-primary"
                  @click="copyFinalPrompt"
                >
                  <Check v-if="copied" :size="12" class="text-emerald-400" />
                  <Copy v-else :size="12" />
                  {{ copied ? '已复制' : '复制' }}
                </button>
                <button
                  class="rounded-lg bg-cyan-500 px-4 py-1.5 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
                  @click="showPromptModal = false"
                >关闭</button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
/**
 * 分镜生图工作台右栏（提示词模式）：**多条可切换的提示词** + 折叠的参考图上传 + 底部「单镜操作」
 * （AI 推导 / 单独生成）。提示词防抖自动保存。
 *
 * **选中哪条就发哪条**：每条自带正文、两个取图开关与本条上传图（不限张）。
 * 开关决定这条实际发哪些图，图号随之重编（见 `slotRefManifest`）——
 * 关掉「拼接共用属性」后共用属性图不进这次请求，剩下的图从「图1」重新编号。
 *
 * `imagePrompt` 仍是绑定扫描与过期判定的唯一来源，**恒等于第 1 条的正文**（互为镜像）：
 * 只有第 1 条的编辑会写它，第 2 条及以后只活在自己的候选条里 —— 因此切换选中条、
 * 改别条的开关都不会动到描述，也不会触发绑定重算。
 *
 * 2026-09-22 简化：去掉了上下两块只读预览与文本框内的资产名高亮 —— 编辑区只留纯描述文本；
 * 2026-09-23：右栏不再重复列出资产图与上移/下移（中栏已按类型展示并带「图N」角标）。
 */
import { computed, reactive, ref, watch } from 'vue'
import { AlertTriangle, Check, ChevronRight, Copy, Eye, FileText, LoaderCircle, Pencil, Plus, RefreshCw, Sparkles, Trash2, X } from 'lucide-vue-next'
import { v4 as uuidv4 } from 'uuid'
import type { GenPromptSlot, LongProjectAsset, LongProjectPanelArtwork, LongProjectStoryboardPanel, SharedPromptBlock } from '@comic/types'
import ImagePreviewModal from '@comic/components/ImagePreviewModal.vue'
import ToggleSwitch from '@comic/components/common/ToggleSwitch.vue'
import { processImage, uploadImage, type ImageStorageMode } from '@comic/services/uploadService'
import { composeFinalPrompt, slotRefManifest } from '@comic/services/panelPromptService'
import { createGenPromptSlot, normalizeGenPromptSlot } from '@comic/utils/genPromptSlots'
import type { PanelRefManifest } from '@comic/services/panelRefManifest'
import { useToast } from '@comic/composables/useToast'
import { auditPanelAssetBindings, buildAssetNameIndex, formatPanelBindingAuditIssues } from '@comic/services/promptAssetService'

const toast = useToast()

/** 单独生成时可追加在核心清单末尾的参考图配置。 */
export interface PanelRefConfig {
  useGeneratedImage: boolean
  customImages: string[]
  /** 是否拼接共用属性：false = 前后置文字都不拼、共用属性图也不进这次请求。 */
  attachShared?: boolean
  /** 是否使用资产参考图：false = 资产生成图不进这次请求（图号随之重编）。 */
  useAssetRefs?: boolean
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
  (e: 'save', prompt: string | null, slots: GenPromptSlot[], activeId: string): void
  /**
   * 候选条的结构变化（切开关 / 增删条 / 上传图 / 仅切换选中）：**立刻落库，不走防抖** ——
   * 中栏「图N」角标与资产区都读这份数据，等 500ms 会让角标短暂对不上。
   */
  (e: 'update-slots', slots: GenPromptSlot[], activeId: string): void
  (e: 'single-generate', prompt: string, refConfig: PanelRefConfig): void
  (e: 'repair-bindings', prompt: string): void
}>()

/**
 * 建一条提示词（开关默认全开，与旧行为一致；上传图不限张）。
 * 统一走 `createGenPromptSlot` —— 与资产侧同一个形状，读回比较才不会因为缺字段而反复重建。
 */
function makeSlot(text: string): GenPromptSlot {
  return createGenPromptSlot(uuidv4(), text)
}

/**
 * 候选提示词条 —— **只属于当前分镜**（存在本镜的画面工件上，切镜不会串条）。
 * 没建过条时按「一条默认槽」展示，正文取 `imagePrompt`；旧数据缺开关字段时按全开补全，
 * 不会因为新增字段而变成「什么都不发」。
 */
const slots = ref<GenPromptSlot[]>([])
const activeId = ref('')
const showRefConfig = ref(false)

/**
 * 库里这份候选条（已归一，并修复「`imagePrompt` ≡ 第 1 条正文」不变式）。
 *
 * 旧版写入过的脏数据可能是 `text: null`，或建条时把正文丢了 —— 那会让画面描述在界面上
 * 显示成空框，表现为「切条看不出区别」。这里按 `imagePrompt` 把第 1 条补回来。
 * 它同时是 `isDirty` 的比较基准：否则补回来的这份会被当成「用户改了描述」而误标 manual。
 */
function storedSlots(): GenPromptSlot[] | null {
  if (!props.artwork?.genPrompts?.length) return null
  const normalized = props.artwork.genPrompts.map(normalizeGenPromptSlot)
  const primary = normalized[0]
  const prompt = props.artwork.imagePrompt ?? ''
  if (primary && !primary.text.trim() && prompt.trim()) primary.text = prompt
  return normalized
}

/** 上一次自己写回库里的候选条签名（含分镜 id）：存储回环到达时跳过重建，别把正在编辑的地基换掉。 */
let persistedSlotsSignature = ''

function resetSlots() {
  const stored = storedSlots() ?? [makeSlot(props.artwork?.imagePrompt ?? '')]
  if (`${props.panel.id}::${JSON.stringify(stored)}` === persistedSlotsSignature) return
  persistedSlotsSignature = ''
  slots.value = stored
  const remembered = props.artwork?.activeGenPromptId
  activeId.value = remembered && stored.some((slot) => slot.id === remembered)
    ? remembered
    : stored[0].id
}

/** 当前编辑 / 发送的这一条。 */
const activeSlot = computed(() => slots.value.find((slot) => slot.id === activeId.value) ?? slots.value[0])

/** 当前条正文（底部字数、审计、最终拼接都读它）。 */
const promptText = computed(() => activeSlot.value?.text ?? '')

/** 本条上传的参考图（不限张）；资产图不在这里列，中栏已展示。 */
const activeUploads = computed(() => activeSlot.value?.uploadedRefs ?? [])

/** 这一条实际会发出的参考图清单：按开关裁剪后重新编号。 */
const slotManifest = computed(() => slotRefManifest(props.refManifest, {
  attachShared: activeSlot.value?.attachShared,
  useAssetRefs: activeSlot.value?.useAssetRefs,
}))

resetSlots()

/** 当前草稿也参与审计；保存完成前即可提示歧义、悬空状态或漏绑。 */
const bindingAuditLabels = computed(() => {
  const issues = auditPanelAssetBindings(
    { ...props.panel, imagePrompt: promptText.value },
    buildAssetNameIndex(props.assets ?? []),
  )
  return formatPanelBindingAuditIssues(issues)
})

const isUploading = ref(false)
const customStorageMode = ref<ImageStorageMode>('local')
const customFileInputRef = ref<HTMLInputElement | null>(null)
const showPreview = ref(false)
const previewImages = ref<string[]>([])
const previewIndex = ref(0)

/** 最终提示词查看弹窗 */
const showPromptModal = ref(false)

const refConfig = reactive<PanelRefConfig>({
  useGeneratedImage: false,
  customImages: [],
})

// 切换分镜 / 外部替换候选条：整体重建，避免把上一镜的候选提示词带过来
watch(
  () => [props.panel.id, props.artwork?.genPrompts] as const,
  () => resetSlots(),
  { immediate: true },
)

// 外部写入描述（AI 推导 / 导入 / 批量推导）：`imagePrompt` 恒等于**第 1 条**的正文，
// 所以回填也只写第 1 条 —— 否则在别条上编辑时会被推导结果悄悄覆盖。
// 回填后把选中条切回第 1 条：推导写的是描述，不切回去的话用户在候选条 2 上「点了没反应」。
watch(
  () => props.artwork?.imagePrompt,
  (prompt) => {
    if (prompt === undefined) return
    const primary = slots.value[0]
    if (!primary || prompt === primary.text) return
    primary.text = prompt
    if (activeId.value !== primary.id) {
      activeId.value = primary.id
      persistSlots()
    }
  },
)

/** 有文本改动才保存：第 1 条正文决定 `imagePrompt`，别条只进自己的候选条。 */
const isDirty = computed(() => {
  const textChanged = (slots.value[0]?.text ?? '').trim() !== (props.artwork?.imagePrompt ?? '').trim()
  const baseline = storedSlots()
  const slotsChanged = baseline
    ? JSON.stringify(slots.value) !== JSON.stringify(baseline)
    : (props.artwork?.genPrompts?.length ?? 0) > 0
  return textChanged || slotsChanged
})

/**
 * 输入框防抖保存。
 * ⚠️ 监听源是**候选条的正文集合**，刻意不含 `activeId`：切换选中条只是「这次编辑 / 发送哪条」，
 * 不是「描述改了」—— 若换成监听「当前条正文」，切到一条空白候选就会在 500ms 后把 `imagePrompt` 清空。
 * 只有第 1 条（= 画面描述）的改动才写 `imagePrompt`，别条只落进自己的候选条。
 */
let saveTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => JSON.stringify(slots.value.map((slot) => slot.text ?? '')),
  () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      if (!isDirty.value) return
      const primary = slots.value[0]
      const primaryDirty = (primary?.text ?? '').trim() !== (props.artwork?.imagePrompt ?? '').trim()
      emit(
        'save',
        primaryDirty && primary ? primary.text.trim() : null,
        slots.value.map((slot) => ({ ...slot })),
        activeId.value,
      )
    }, 500)
  },
)

/** 结构变化立刻落库（开关 / 增删条 / 上传图 / 切换选中）；记下签名让存储回环不重建。 */
function persistSlots() {
  const payload = slots.value.map((slot) => ({ ...slot }))
  persistedSlotsSignature = `${props.panel.id}::${JSON.stringify(payload)}`
  emit('update-slots', payload, activeId.value)
}

/** 当前选中条的下标（「查看提示词」标题里标出是第几条，避免看错）。 */
const activeSlotIndex = computed(() => Math.max(0, slots.value.findIndex((slot) => slot.id === activeId.value)))

/** 切换选中条：输入框随即换成那条正文；只落选中项，不改 imagePrompt。 */
function selectSlot(id: string) {
  if (id === activeId.value) return
  activeId.value = id
  persistSlots()
}

/** 开关写回：自己接值再赋值，避免 v-model 与额外监听器的执行顺序问题；改完立刻落库。 */
function setAttachShared(value: boolean) {
  if (activeSlot.value) activeSlot.value.attachShared = value
  persistSlots()
}

function setUseAssetRefs(value: boolean) {
  if (activeSlot.value) activeSlot.value.useAssetRefs = value
  persistSlots()
}

/** 新增一条：**空白**起步 —— 复制当前正文会让切换看起来「没变化」，看不出到底选中了哪条。 */
function addSlot() {
  const slot = makeSlot('')
  slots.value.push(slot)
  activeId.value = slot.id
  persistSlots()
}

/** 删除当前条；至少保留一条。 */
function removeActiveSlot() {
  if (slots.value.length <= 1) return
  const index = slots.value.findIndex((slot) => slot.id === activeId.value)
  if (index < 0) return
  slots.value.splice(index, 1)
  activeId.value = slots.value[Math.min(index, slots.value.length - 1)].id
  persistSlots()
}

/** 推导结果一旦被人工编辑（含导入的人工内容），在操作区持续标识。 */
const isManuallyEdited = computed(() =>
  props.artwork?.promptSource === 'manual'
  || (activeSlotIndex.value === 0 && (slots.value[0]?.text ?? '').trim() !== (props.artwork?.imagePrompt ?? '').trim()),
)

/** 本条上传图的起始图号：接在这一条实际会发的图之后（含「上一版结果图」占位）。 */
const extraBase = computed(() =>
  slotManifest.value.images.length + (refConfig.useGeneratedImage && props.generatedImage ? 1 : 0),
)

/** 本条第 index 张上传图的图号（1 起）。 */
function uploadNumber(index: number): number {
  return extraBase.value + index + 1
}

/** 当前追加参考图：上一版结果图（可选）+ 本条上传图；图号接在这一条的清单之后。 */
const extraReferences = computed(() => {
  const entries: Array<{ image: string; label: string }> = []
  if (refConfig.useGeneratedImage && props.generatedImage) {
    entries.push({ image: props.generatedImage, label: '本镜上一版结果图，用于构图与连续性参考' })
  }
  activeUploads.value.forEach((image, index) => entries.push({ image, label: `自定义参考图 ${index + 1}` }))
  return entries
})

/**
 * 最终送生图的完整提示词：动态参考图定义不进入 LLM 模板，在复制/生图时实时拼接。
 * 清单与共用属性都按**当前这条**的开关裁剪 —— 预览与「单独生成」必须同源。
 */
const finalPrompt = computed(() => composeFinalPrompt(
  promptText.value.trim(),
  props.sharedBlocks ?? [],
  slotManifest.value,
  extraReferences.value,
  { attachShared: activeSlot.value?.attachShared },
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

/** 随这条发送的参考图总数 */
const selectedRefCount = computed(() => {
  let count = slotManifest.value.images.length
  if (refConfig.useGeneratedImage && props.generatedImage) count += 1
  count += activeUploads.value.length
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
    const slot = activeSlot.value
    if (!slot.uploadedRefs) slot.uploadedRefs = []
    slot.uploadedRefs.push(...urls)
    persistSlots()
    toast.success(`成功上传 ${urls.length} 张参考图`)
  } else {
    toast.error('参考图上传失败，请重试')
  }
}

function removeCustomImage(idx: number) {
  activeSlot.value?.uploadedRefs?.splice(idx, 1)
  persistSlots()
}

function openCustomPreview(idx: number) {
  previewImages.value = [...activeUploads.value]
  previewIndex.value = idx
  showPreview.value = true
}

/** 单独生成：把当前这条的正文与开关一起发出去（父组件按同一套开关裁剪清单）。 */
function handleSingleGenerate() {
  const value = promptText.value.trim()
  if (!value) return
  emit('single-generate', value, {
    ...refConfig,
    customImages: [...activeUploads.value],
    attachShared: activeSlot.value?.attachShared,
    useAssetRefs: activeSlot.value?.useAssetRefs,
  })
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

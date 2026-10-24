<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        @click.self="close"
      >
        <!-- 🔴 必须给**确定高度**（h-[85vh]），不能只写 max-h：
             图片区用 flex-1 + min-h-0（basis 0），父容器高度 auto 时它会塌成 0。 -->
        <div class="confirm-card flex h-[85vh] w-[960px] max-w-[92vw] flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface p-5 shadow-2xl shadow-black/40">
          <!-- 标题 -->
          <div class="flex shrink-0 items-center justify-between">
            <h3 class="text-base font-semibold text-text-primary">{{ append ? '从资产库选择参考图' : '更换资产图片' }}</h3>
            <button class="rounded-md p-1 text-text-muted transition-colors hover:text-text-primary" @click="close"><X :size="16" /></button>
          </div>
          <p class="mt-1 shrink-0 text-xs text-text-muted">只列 AI 生成图：资产上传的参考图只是发给模型的输入，不作为可挑选的资产图{{ append ? '；确认后追加为当前视觉状态的参考图。' : '；确认后替换该视觉状态的参考图列表。' }}</p>

          <!-- 两层分类（指定 assetId 时只展示该资产，隐藏分类）：
               第一层「章节资产 / 公用资产」＝ 资产归属；第二层「人物 / 场景 / 道具」＝ 资产类型。 -->
          <div v-if="assetId" class="mt-3 flex shrink-0 items-center gap-4 border-b border-border-subtle">
            <span class="border-b-2 border-cyan-400 px-0.5 py-1.5 text-xs font-medium text-cyan-400">
              {{ targetAsset?.name ?? '资产' }}<span class="ml-1 text-[10px]">({{ targetAsset?.variants.length ?? 0 }} 个视觉状态)</span>
            </span>
          </div>
          <template v-else>
            <div class="mt-3 flex shrink-0 items-center gap-4 border-b border-border-subtle">
              <button
                v-for="tab in scopeTabs"
                :key="tab.key"
                class="border-b-2 px-0.5 py-1.5 text-xs transition-colors"
                :class="activeScope === tab.key ? 'border-cyan-400 font-medium text-cyan-400' : 'border-transparent text-text-muted hover:text-text-primary'"
                @click="activeScope = tab.key"
              >{{ tab.label }}<span class="ml-1 text-[10px]">({{ assetsOf(tab.key).length }})</span></button>
            </div>

            <div class="mt-2 flex shrink-0 items-center gap-1">
              <button
                v-for="tab in typeTabs"
                :key="tab.key"
                class="rounded-md px-2 py-1 text-[11px] transition-colors"
                :class="activeType === tab.key ? 'bg-cyan-500/15 text-cyan-300' : 'text-text-muted hover:bg-app-bg hover:text-text-secondary'"
                @click="activeType = tab.key"
              >{{ tab.label }}<span class="ml-1 text-[10px]">({{ assetsOf(activeScope, tab.key).length }})</span></button>
            </div>

            <!-- 资产按钮行：当前归属 + 当前类型下的资产 -->
            <div v-if="scopedAssets.length" class="custom-scrollbar flex max-h-24 shrink-0 flex-wrap gap-1.5 overflow-y-auto pt-2.5">
              <button
                v-for="asset in scopedAssets"
                :key="asset.id"
                class="flex h-7 max-w-full items-center gap-1.5 rounded-lg px-2.5 text-xs transition-colors"
                :class="activeAsset?.id === asset.id ? 'bg-cyan-500/15 text-cyan-300' : 'text-text-muted hover:bg-app-bg hover:text-text-secondary'"
                :title="asset.name"
                @click="activeAssetId = asset.id"
              >
                <span class="max-w-40 truncate">{{ asset.name }}</span>
                <span class="shrink-0 text-[10px] text-text-muted">{{ assetImageCount(asset) }}</span>
              </button>
            </div>
          </template>

          <!-- 图片区：按图片原始比例瀑布流展示。
               🔴 必须 min-h-0 + flex-1（滚动三件套），**不能写 min-h-[280px]**：
               参考描述区出现后总高会超过 max-h-[85vh]，硬最小值会顶住不让收缩，
               把底部按钮挤出弹窗外（用户实报）。 -->
          <div class="custom-scrollbar mt-3 min-h-0 flex-1 overflow-y-auto">
            <div v-for="group in imageGroups" :key="group.id" class="mb-3">
              <p class="mb-2 text-xs text-text-secondary">{{ group.name }}<span class="ml-1.5 text-[10px] text-text-muted">{{ group.subLabel }} · {{ group.images.length }} 张</span></p>
              <div v-if="group.images.length" class="columns-3 gap-2.5">
                <button
                  v-for="image in group.images"
                  :key="image"
                  class="group relative mb-2.5 block w-full break-inside-avoid overflow-hidden rounded-lg border transition-colors"
                  :class="selected.includes(image) ? 'border-cyan-500 ring-1 ring-cyan-500/40' : 'border-border-subtle hover:border-border-strong'"
                  :title="group.name"
                  @click="toggleSelect(image)"
                >
                  <img :src="image" class="block w-full" loading="lazy" :alt="`${group.name}生成图`" />
                  <span v-if="selected.includes(image)" class="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-white shadow"><Check :size="12" /></span>
                </button>
              </div>
              <p v-else class="py-2 text-[11px] text-text-muted">暂无生成图</p>
            </div>
            <p v-if="!imageGroups.length" class="flex h-[240px] items-center justify-center text-xs text-text-muted">{{ assetId ? '该资产暂无视觉状态' : emptyHint }}</p>
          </div>

          <!-- 参考描述：勾选图片后才出现。确认后原样拼在提示词「共用属性（插入最前）之后」，
               图号按确认后的最终数组现算，所以不会因之后增删图而错位。 -->
          <div v-if="noteVisible" class="mt-3 shrink-0 rounded-lg border border-border-subtle p-3">
            <div class="flex items-center justify-between gap-3">
              <span class="shrink-0 text-xs text-text-secondary">参考描述<span class="ml-1 text-[10px] text-text-muted">生图时以 {{ noteTitle }} 为标题拼在共用属性之后</span></span>
              <button
                class="shrink-0 rounded border border-cyan-500/40 px-2 py-0.5 text-[11px] text-cyan-300 transition-colors hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:border-border-subtle disabled:text-text-muted"
                :disabled="!selectedNumbers.length"
                :title="selectedNumbers.length ? '把本次选中图片的图号填进参考描述' : '先勾选图片'"
                @click="insertImageNumbers"
              >插入图号{{ selectedNumbers.length ? `（${selectedNumbersText}）` : '' }}</button>
            </div>
            <textarea
              ref="noteInputRef"
              v-model="noteDraft"
              rows="2"
              class="custom-scrollbar mt-2 w-full resize-none rounded-md border border-border-subtle bg-app-bg px-2.5 py-1.5 text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-cyan-500/60"
              placeholder="例：图1 只取脸与发型，服装按本段文字，不要照搬参考图的衣服"
            />
            <p class="mt-1 text-[11px] text-text-muted">这一段只写「这几张图怎么用」，不写画面内容；留空则不拼。</p>
          </div>

          <!-- 底部：已选与确认 -->
          <div class="mt-3 flex shrink-0 items-center justify-between border-t border-border-subtle pt-3">
            <p class="text-[11px] text-text-muted">已选 {{ selected.length }} 张（{{ append ? '确认后追加到当前参考图' : '确认后替换现有参考图' }}）</p>
            <div class="flex gap-2">
              <button class="rounded-lg border border-border-subtle px-4 py-2 text-sm text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary" @click="close">取消</button>
              <button
                class="rounded-lg bg-cyan-500/90 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="!selected.length && !noteDirty"
                @click="confirm"
              >{{ append ? '确认添加' : '确认更换' }}</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 资产图片选择弹窗：从项目资产库勾选**各视觉状态的 AI 生成图**，多选后确认。
 *
 * ⚠️ 图源**只有生成图**：资产上传的参考图（`referenceImageIds`）只是「发给生图模型的输入参数」，
 * 不是可供挑选的资产图，因此不进这个列表（2026-09-23 用户口径）。
 *
 * 2026-10-24 改版（两次迭代后的最终形态）：
 * - **两层分类**：第一层「章节资产 / 公用资产」= 资产归属（`asset.scope`，缺省按章节）；
 *   第二层「人物 / 场景 / 道具」= 资产类型。归属不再塞进资产按钮的小标里 —— 一层只表达一件事。
 *   打开时自动落在目标资产所在的归属与类型上。
 * - 勾选图片后下方出现**参考描述**输入框：写这几张图怎么用，可一键插入图号；确认后存到
 *   `variant.referenceNote`，生图时拼在共用属性（插入最前）之后。
 *   因为输入框永远处在确定的「归属 + 类型」之下，所以它**不再按类型分三段**，一条描述管这一批图。
 *   图号按「确认后的最终数组」推演（追加会去重），所以之后增删图不会让这段文字错位。
 * - 已经选了图、只是想改描述时，不选新图也能确认（按钮的 disabled 条件包含 noteDirty）。
 */
import { computed, nextTick, ref, watch } from 'vue'
import { Check, X } from 'lucide-vue-next'
import type { LongProjectAsset, LongProjectAssetType } from '@comic/types'
import { effectiveVariantRefImages } from '@comic/services/panelPromptService'
import { previewRefImageIndexes } from '@comic/services/assetRefManifest'
import { ASSET_REF_NOTE_TITLES } from '@comic/services/assetSectionTitles'

const props = defineProps<{
  modelValue: boolean
  /** 项目全部资产（含各视觉状态生成图）。 */
  assets: LongProjectAsset[]
  /** 指定资产 id 时进入单资产模式：只展示该资产的各视觉状态图片。 */
  assetId?: string
  /** 当前已用的参考图（打开时预勾选；追加模式下不预勾选，但仍参与图号推演）。 */
  currentImages?: string[]
  /** 追加模式：确认后追加到现有参考图（不替换）。 */
  append?: boolean
  /** 共用属性参考图张数：本状态新图的图号从这之后起（关掉「拼接共用属性」时传 0）。 */
  numberBase?: number
  /** 目标视觉状态所属资产类型：决定打开时落在哪个人物/场景/道具 tab。 */
  assetType?: LongProjectAssetType
  /** 目标资产所属归属：决定打开时落在「章节资产」还是「公用资产」（缺省按章节）。 */
  scopeHint?: AssetScope
  /** 已存的参考描述（打开时预填，改完确认即写回状态）。 */
  referenceNote?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  /** 确认：图片列表（追加/替换由调用方决定）+ 参考描述（空串 = 清除）。 */
  (e: 'confirm', payload: { images: string[]; note: string }): void
}>()

/** 第一层：资产归属。章节提取产生的资产默认是 `chapter`，显式同步后才进公用库。 */
type AssetScope = 'chapter' | 'project'
const scopeTabs: Array<{ key: AssetScope; label: string }> = [
  { key: 'chapter', label: '章节资产' },
  { key: 'project', label: '公用资产' },
]
/** 第二层：资产类型。 */
const typeTabs: Array<{ key: LongProjectAssetType; label: string }> = [
  { key: 'character', label: '人物' },
  { key: 'scene', label: '场景' },
  { key: 'prop', label: '道具' },
]

const activeScope = ref<AssetScope>('chapter')
const activeType = ref<LongProjectAssetType>('character')
/** 当前查看的资产 id（未指定时回退当前两层筛选下的第一个资产）。 */
const activeAssetId = ref<string | null>(null)
const selected = ref<string[]>([])

// ========== 参考描述 ==========
const noteDraft = ref('')
const noteInputRef = ref<HTMLTextAreaElement | null>(null)

/**
 * 勾了图、或这条状态本来就写过描述时才出现。
 * 已写过的情况要一直显示：否则用户清空文字后输入框会立刻消失，看起来像没生效。
 */
const noteVisible = computed(
  () => selected.value.length > 0 || !!props.referenceNote?.trim() || noteDraft.value.length > 0,
)

/** 描述与已存值不同才算脏 —— 只改描述不选图时也要能保存。 */
const noteDirty = computed(() => noteDraft.value.trim() !== (props.referenceNote ?? '').trim())

/** 本次勾选的图在确认后的图号（追加会去重，所以按最终数组推演，不是按点击顺序）。 */
const selectedNumbers = computed(() => {
  const map = previewRefImageIndexes({
    selected: selected.value,
    existing: props.append ? (props.currentImages ?? []) : [],
    append: !!props.append,
    baseCount: props.numberBase ?? 0,
  })
  return selected.value
    .map((image) => map.get(image))
    .filter((value): value is number => typeof value === 'number')
})

const selectedNumbersText = computed(() => selectedNumbers.value.map((n) => `图${n}`).join('、'))

/** 把图号插到光标处（没聚焦就追加到末尾）。 */
function insertImageNumbers() {
  if (!selectedNumbers.value.length) return
  const text = selectedNumbersText.value
  const current = noteDraft.value
  const el = noteInputRef.value
  if (!el) {
    noteDraft.value = current + text
    return
  }
  const start = el.selectionStart ?? current.length
  const end = el.selectionEnd ?? current.length
  noteDraft.value = current.slice(0, start) + text + current.slice(end)
  const caret = start + text.length
  nextTick(() => {
    el.focus()
    el.setSelectionRange(caret, caret)
  })
}

watch(() => props.modelValue, (visible) => {
  if (visible) {
    selected.value = props.append ? [] : [...(props.currentImages ?? [])]
    // 打开时落在目标资产所在的那个归属 + 类型上，不用手动切
    activeScope.value = props.scopeHint ?? (targetAsset.value ? scopeOf(targetAsset.value) : 'chapter')
    activeType.value = props.assetType ?? 'character'
    activeAssetId.value = null
    noteDraft.value = props.referenceNote ?? ''
    ensureTypeHasAssets()
  }
})

/** 单资产模式的目标资产。 */
const targetAsset = computed(() => props.assets.find((asset) => asset.id === props.assetId))

/** 资产的归属：`scope` 缺省按章节（历史数据没有这个字段）。 */
function scopeOf(asset: LongProjectAsset): AssetScope {
  return asset.scope === 'project' ? 'project' : 'chapter'
}

/** 某归属下的资产；给 type 就再按类型过滤。 */
function assetsOf(scope: AssetScope, type?: LongProjectAssetType): LongProjectAsset[] {
  return props.assets.filter((asset) => scopeOf(asset) === scope && (!type || asset.type === type))
}

/** 当前两层筛选下的资产列表。 */
const scopedAssets = computed(() => assetsOf(activeScope.value, activeType.value))

const activeAsset = computed(() => scopedAssets.value.find((asset) => asset.id === activeAssetId.value) ?? scopedAssets.value[0] ?? null)

// 切换归属或类型时重置资产选中
watch(activeScope, () => {
  activeAssetId.value = null
  ensureTypeHasAssets()
})
watch(activeType, () => { activeAssetId.value = null })

/**
 * 切归属后，若当前类型在该归属下没有资产，落到第一个有资产的类型。
 * 只在切「归属」时兜底：用户主动点某个类型 tab（哪怕 0 个）应该能看到它的空态，不该被弹回去。
 */
function ensureTypeHasAssets() {
  if (assetsOf(activeScope.value, activeType.value).length) return
  const fallback = typeTabs.find((tab) => assetsOf(activeScope.value, tab.key).length)
  if (fallback) activeType.value = fallback.key
}

/**
 * 某视觉状态可挑选的图片 = **AI 生成图**。
 * 直接复用全项目取图口径 `effectiveVariantRefImages`（= `generatedImageIds`）：
 * 上传的参考图（`referenceImageIds`）只是「发给生图模型的输入参数」，不是可供挑选的资产图。
 */
function variantImages(variant: LongProjectAsset['variants'][number]): string[] {
  return effectiveVariantRefImages(variant)
}

/** 资产可选图片总数（资产按钮角标）。 */
function assetImageCount(asset: LongProjectAsset): number {
  return new Set(asset.variants.flatMap((variant) => variantImages(variant))).size
}

/** 图片分组：单资产模式按视觉状态分组；全库模式仅展示当前选中资产的图片合集。 */
const imageGroups = computed<Array<{ id: string; name: string; subLabel: string; images: string[] }>>(() => {
  if (props.assetId) {
    const asset = targetAsset.value
    if (!asset) return []
    return asset.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      subLabel: typeLabel(asset.type),
      images: variantImages(variant),
    }))
  }
  const asset = activeAsset.value
  if (!asset) return []
  return [{
    id: asset.id,
    name: asset.name,
    subLabel: typeLabel(asset.type),
    images: [...new Set(asset.variants.flatMap((variant) => variantImages(variant)))],
  }]
})

function typeLabel(type: string): string {
  return ({ character: '人物', scene: '场景', prop: '道具' })[type] ?? type
}

/** 空态文案按当前两层筛选说清楚，避免「怎么什么都没有」。 */
const emptyHint = computed(() => {
  const scopeLabel = activeScope.value === 'chapter' ? '章节资产' : '公用资产'
  return `${scopeLabel}里还没有${typeLabel(activeType.value)}`
})

/** 参考描述在最终提示词里的标题：与 `buildRefNoteSection` 读同一份常量，不各写一遍。 */
const noteTitle = computed(() => ASSET_REF_NOTE_TITLES[activeType.value] ?? '【参考图说明】')

/** 勾选/取消一张图。 */
function toggleSelect(image: string) {
  const index = selected.value.indexOf(image)
  if (index >= 0) selected.value.splice(index, 1)
  else selected.value.push(image)
}

function close() {
  emit('update:modelValue', false)
}

function confirm() {
  if (!selected.value.length && !noteDirty.value) return
  // 图片与描述一次提交：调用方一处写库（避免写放大）
  emit('confirm', { images: [...selected.value], note: noteDraft.value.trim() })
  emit('update:modelValue', false)
}
</script>

<style scoped>
.confirm-enter-active,
.confirm-leave-active {
  transition: opacity 0.18s ease;
}
.confirm-enter-active .confirm-card,
.confirm-leave-active .confirm-card {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}
.confirm-enter-from .confirm-card,
.confirm-leave-to .confirm-card {
  opacity: 0;
  transform: scale(0.96);
}
</style>

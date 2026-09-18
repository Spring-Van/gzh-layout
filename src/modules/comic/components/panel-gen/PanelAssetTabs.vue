<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- 资产分类 tab -->
    <div class="flex shrink-0 items-center gap-4 border-b border-border-subtle px-3">
      <button
        v-for="tab in tabs"
        :key="tab.type"
        class="border-b-2 px-0.5 py-2 text-xs transition-colors"
        :class="activeType === tab.type ? 'border-cyan-400 font-medium text-cyan-400' : 'border-transparent text-text-muted hover:text-text-primary'"
        @click="activeType = tab.type"
      >
        {{ tab.label }}
        <span class="ml-0.5 text-[10px]">({{ countOf(tab.type) }})</span>
      </button>
    </div>

    <div class="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
      <!-- 未匹配绑定：仅提示，不支持换绑（资产关联以分镜文本/资产库为准） -->
      <div v-if="unmatchedBindings.length" class="mb-2.5 rounded-lg border border-amber-400/30 bg-amber-400/5 p-2.5">
        <p class="text-[10px] text-amber-300">未匹配资产（名称与资产库对不上，请回资产工作台核对）</p>
        <div class="mt-1.5 flex flex-wrap gap-1.5">
          <span
            v-for="entry in unmatchedBindings"
            :key="`unmatched-${entry.index}`"
            class="rounded border border-amber-400/30 px-2 py-1 text-[11px] text-amber-200"
          >{{ entry.binding.assetName }}</span>
        </div>
      </div>

      <!-- 当前分类绑定 -->
      <div v-if="activeBindings.length" class="flex flex-col gap-2">
        <div
          v-for="entry in activeBindings"
          :key="entry.index"
          class="rounded-lg border border-border-subtle bg-surface p-2.5"
        >
          <div class="flex items-center gap-1.5">
            <AssetBindingTag class="min-w-0 flex-1 justify-start" :binding="entry.binding" :assets="assets" @inspect="inspectEntry(entry)">
              <!-- 视觉状态就在这个框里切换：点状态名展开状态列表，选完即写 manual 绑定并让其后各镜延续跟随 -->
              <template #trailing>
                <button
                  v-if="canSwitchVariant(entry)"
                  class="asset-state-trigger"
                  :class="{ 'asset-state-trigger--active': variantMenuEntry?.index === entry.index }"
                  :title="currentVariantTip(entry) || '切换本镜该资产的视觉状态'"
                  @click.stop="toggleVariantMenu(entry, $event)"
                  @keydown.enter.stop.prevent="toggleVariantMenu(entry, $event)"
                >
                  <span class="asset-state-trigger__label">{{ currentVariantOf(entry)?.name || '默认' }}</span>
                  <ChevronDown :size="10" class="asset-state-trigger__caret" />
                </button>
                <!-- 只有一个状态时无可切换对象，退化为只读文本 -->
                <span v-else-if="currentVariantOf(entry)" class="shrink-0 opacity-85">· {{ currentVariantOf(entry)?.name }}</span>
              </template>
            </AssetBindingTag>
            <button
              v-if="!refImagesOf(entry).length"
              class="shrink-0 rounded border border-amber-400/40 px-1.5 py-0.5 text-[10px] text-amber-700 transition-colors hover:bg-amber-400/10 dark:text-amber-300"
              title="该视觉状态还没有参考图，点击前往资产生图工作台生成"
              @click="emit('go-asset-workbench', focusTargetOf(entry))"
            >无参考图</button>
            <button class="shrink-0 text-[11px] text-cyan-400 hover:text-cyan-300" @click="openPicker(entry)">{{ refImagesOf(entry).length ? '更换图片' : '添加图片' }}</button>
          </div>

          <!-- 镜内各格状态明细：同资产不同格状态不同时列出（镜末 = 页级主状态高亮，延续链与手选图以此为准） -->
          <div v-if="cellVariantRows(entry).length" class="mt-1.5 flex flex-wrap items-center gap-x-2 text-[10px] text-text-muted">
            <span
              v-for="row in cellVariantRows(entry)"
              :key="row.label"
              :class="row.isPrimary ? 'text-cyan-300' : ''"
            >{{ row.label }}：{{ row.variantName }}</span>
          </div>

          <!-- 本镜参考图：单选。视觉状态由分镜文本自动绑定推导，这里只决定本镜取该状态的哪一张图。 -->
          <div v-if="refImagesOf(entry).length" class="mt-2">
            <div class="flex flex-wrap gap-1.5">
              <div v-for="(image, imageIndex) in refImagesOf(entry)" :key="image" class="group relative">
                <img
                  :src="image"
                  class="h-11 w-11 cursor-pointer rounded border object-cover transition-[border-color,opacity]"
                  :class="selectedImage(entry) === image ? 'border-cyan-400' : 'border-border-subtle opacity-45 hover:opacity-80'"
                  :alt="`${entry.binding.assetName}参考图${imageIndex + 1}`"
                  :title="selectedImage(entry) === image ? '本镜生图使用这张' : '点击切换为本镜使用的参考图'"
                  @click="pickImage(entry, image)"
                />
                <!-- 已选中标记 -->
                <span
                  v-if="selectedImage(entry) === image"
                  class="pointer-events-none absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-400 text-slate-900"
                ><Check :size="10" /></span>
                <!-- 看大图（不改变选择） -->
                <button
                  class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-border-default bg-surface text-text-muted opacity-0 transition-opacity hover:border-cyan-400 hover:text-cyan-400 group-hover:opacity-100"
                  title="查看大图"
                  @click.stop="emit('preview', { images: refImagesOf(entry), index: imageIndex })"
                ><Maximize2 :size="9" /></button>
              </div>
            </div>
            <p v-if="refImagesOf(entry).length > 1" class="mt-1 text-[10px] text-text-muted">
              本镜使用第 {{ selectedIndex(entry) + 1 }} 张 · 共 {{ refImagesOf(entry).length }} 张
            </p>
          </div>
        </div>
      </div>
      <p v-else class="rounded-lg border border-dashed border-border-subtle px-3 py-4 text-center text-xs text-text-muted">本分镜未绑定{{ activeTabLabel }}资产</p>
    </div>

    <!-- 更换资产图片弹窗：仅替换该视觉状态的参考图，不改变绑定 -->
    <AssetImagePickerModal
      v-model="pickerVisible"
      :assets="assets"
      :asset-id="pickerEntry?.asset?.id"
      :current-images="pickerEntry ? refImagesOf(pickerEntry) : []"
      @confirm="confirmImages"
    />

    <!-- 视觉状态切换列表：锚定在 tag 内那个状态按钮下方（空间不足自动向上翻），
         Teleport 到 body —— 中栏是固定高度 + overflow 容器，留在原地会被裁掉。 -->
    <Teleport to="body">
      <div v-if="variantMenuEntry" class="fixed inset-0 z-50" @click="closeVariantMenu" @contextmenu.prevent="closeVariantMenu" />
      <Transition name="variant-menu">
        <div v-if="variantMenuEntry" ref="variantMenuRef" class="variant-menu" :style="variantMenuStyle">
          <p class="variant-menu__hint">切换本镜视觉状态</p>
          <div class="variant-menu__list custom-scrollbar">
            <button
              v-for="variant in variantMenuVariants"
              :key="variant.id"
              class="variant-menu__item"
              :class="{ 'variant-menu__item--current': variant.id === menuCurrentVariantId }"
              @click="chooseVariant(variant)"
            >
              <Check :size="11" class="variant-menu__check" />
              <span
                class="variant-menu__name"
                :style="variant.id === menuCurrentVariantId && menuAccentColor ? { color: menuAccentColor } : undefined"
              >{{ variant.name }}</span>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
/**
 * 分镜生图工作台中栏底部：按「人物 / 场景 / 道具」三个 tab 展示当前分镜的资产绑定与实时参考图。
 *
 * 绑定与视觉状态默认**自动**推导（分镜文本扫名字 → 绑定；视觉状态走「延续上一镜 → 章节范围默认」），
 * 本组件保留两项手动干预：
 * 1. **手动切换本镜视觉状态**：状态名直接渲染在资产 Tag 框内，点它展开状态列表（不用单独占一行），
 *    选中后写为 manual 绑定，其后各镜的 auto 绑定自动延续跟随；
 * 2. **本镜取该视觉状态的哪一张参考图（单选）**。
 * - 没手动选过 → 默认第一张（不写库，`selectedImageIds` 为空即代表"未选"，资产换图后能自动跟随）；
 * - 手动选过 → 记在 `binding.selectedImageIds`（至多一个元素）；
 * - 选中的那张被从资产里删除 → 交集为空，自动回落第一张；
 * - 该状态一张图都没有 → 不选任何图，显示「无参考图」并跳转资产生图工作台。
 *
 * ⚠️ 取图口径必须与生图时（`LongProjectStoryboardTab.currentRefGroups`）、工作台引用角标
 * （`assetUsageService`）三处一致，统一走 `resolvePanelRefImage`，否则会「标了在用其实没用」。
 *
 * 「更换图片」写回资产库（对所有引用分镜生效），与"本镜选哪一张"是两件事。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Check, ChevronDown, Maximize2 } from 'lucide-vue-next'
import type { LongProjectAsset, LongProjectAssetType, LongProjectAssetVariant, LongProjectStoryboardAssetBinding, LongProjectStoryboardPanel } from '@comic/types'
import { resolvePanelBindings, resolvePanelRefImage } from '@comic/services/panelPromptService'
import { ASSET_TYPE_ORDER, assetTokenVar, assetTypeLabel } from '@comic/utils/assetTypeTheme'
import AssetBindingTag from '@comic/components/AssetBindingTag.vue'
import AssetImagePickerModal from '@comic/components/AssetImagePickerModal.vue'

type BindingEntry = { index: number; binding: LongProjectStoryboardAssetBinding; asset?: LongProjectAsset }

const props = defineProps<{
  panel: LongProjectStoryboardPanel
  /** 本章可用资产（含全部视觉状态）。 */
  assets: LongProjectAsset[]
  /** 章节顺序表（章节 ID → 序号），用于视觉状态的章节范围悬浮提示。 */
  chapterOrders?: Record<string, number>
}>()

const emit = defineEmits<{
  /** 确认更换某资产视觉状态的参考图列表（替换式）。 */
  (e: 'update-variant-images', payload: { assetId: string; variantId: string; images: string[] }): void
  /** 设定本镜使用的参考图（单选；空数组 = 恢复"未选"，即取第一张）。 */
  (e: 'set-binding-images', payload: { panelId: string; assetId: string; imageIds: string[] }): void
  (e: 'preview', payload: { images: string[]; index: number }): void
  /** 前往资产生图工作台（定位到该绑定对应的资产与视觉状态）。 */
  (e: 'go-asset-workbench', payload: { assetId: string; variantId?: string }): void
  /** 手动切换本镜某资产绑定的视觉状态（父组件持久化为 manual 绑定 + 其后 auto 绑定延续重算）。 */
  (e: 'set-binding-variant', payload: { panelId: string; assetId: string; variantId: string }): void
}>()

const tabs = ASSET_TYPE_ORDER.map((type) => ({ type, label: assetTypeLabel(type) }))

const activeType = ref<LongProjectAssetType>('character')
const pickerVisible = ref(false)
const pickerEntry = ref<BindingEntry | null>(null)

watch(() => props.panel.id, () => {
  pickerEntry.value = null
  pickerVisible.value = false
  closeVariantMenu()
})

/** 全部绑定（带原始下标）+ 资产分类信息。 */
const entries = computed<BindingEntry[]>(() =>
  props.panel.assetBindings.map((binding, index) => ({
    index,
    binding,
    asset: props.assets.find((item) => item.id === binding.assetId),
  })),
)

function countOf(type: LongProjectAssetType): number {
  return entries.value.filter((entry) => entry.asset?.type === type).length
}

const activeBindings = computed(() => entries.value.filter((entry) => entry.asset?.type === activeType.value))
const unmatchedBindings = computed(() => entries.value.filter((entry) => !entry.asset))
const activeTabLabel = computed(() => assetTypeLabel(activeType.value))

/** 页级绑定解析结果（绑定快照 → 当前资产/状态），本次渲染内复用，避免每个 helper 各算一遍。 */
const resolvedBindings = computed(() => resolvePanelBindings(props.panel, props.assets))

/** 绑定解析到的资产 + 当前生效状态（未命中资产时为 undefined）。 */
function resolvedOf(entry: BindingEntry) {
  return resolvedBindings.value.find((item) => item.asset.id === entry.binding.assetId)
}

/** 本镜实际使用的参考图：以 visualVersionId 实时查 variant（绑定快照仅作兜底）。 */
function selectedImage(entry: BindingEntry): string | undefined {
  const resolved = resolvedOf(entry)
  if (!resolved) return entry.binding.referenceImageIds?.[0]
  return resolvePanelRefImage(resolved.variant, resolved.binding)
}

/** 该资产当前生效的视觉状态参考图列表（用于展示候选缩略图）。 */
function refImagesOf(entry: BindingEntry): string[] {
  const resolved = resolvedOf(entry)
  if (resolved) return resolved.variant.referenceImageIds
  return entry.binding.referenceImageIds ?? []
}

/** 选中图在候选里的下标（用于「第 N 张」文案）。 */
function selectedIndex(entry: BindingEntry): number {
  const index = refImagesOf(entry).indexOf(selectedImage(entry) ?? '')
  return index < 0 ? 0 : index
}

/** 无参考图跳转目标：解析该绑定实际生效的资产与视觉状态（供资产生图工作台定位）。 */
function focusTargetOf(entry: BindingEntry): { assetId: string; variantId?: string } {
  const resolved = resolvedOf(entry)
  if (resolved) return { assetId: resolved.asset.id, variantId: resolved.variant.id }
  return { assetId: entry.binding.assetId ?? entry.asset?.id ?? '' }
}

/** 该绑定实际生效的视觉状态（状态名展示与切换菜单的选中依据；绑定快照仅作兜底）。 */
function currentVariantOf(entry: BindingEntry): LongProjectAssetVariant | undefined {
  const resolved = resolvedOf(entry)
  return resolved?.variant ?? entry.asset?.variants.find((item) => item.id === entry.binding.visualVersionId)
}

/**
 * 该资产在本镜各格的实际状态行（格级「出场资产」声明解析）。
 * 各格状态一致、无格级声明或单格页时不显示（避免噪音）；
 * 镜末状态（= 页级主状态）高亮标注。
 */
function cellVariantRows(entry: BindingEntry): Array<{ label: string; variantName: string; isPrimary: boolean }> {
  if (!entry.asset) return []
  const rows: Array<{ label: string; variantName: string }> = []
  props.panel.cells?.forEach((cell, cellIndex) => {
    const binding = (cell.assetBindings ?? []).find((item) => entry.binding.assetId && item.assetId === entry.binding.assetId)
    if (!binding) return
    rows.push({ label: `格${cellIndex + 1}`, variantName: binding.visualVersionName || '默认' })
  })
  if (rows.length < 2) return []
  if (new Set(rows.map((row) => row.variantName)).size < 2) return []
  const primaryName = currentVariantOf(entry)?.name
  return rows.map((row) => ({ ...row, isPrimary: row.variantName === primaryName }))
}

/** 状态的章节范围提示文案（无章节顺序表或无范围时返回 undefined）。 */
function chapterRangeLabel(variant: LongProjectAssetVariant): string | undefined {
  if (!props.chapterOrders || !variant.chapterRange) return undefined
  const start = props.chapterOrders[variant.chapterRange.startChapterId]
  if (start === undefined) return undefined
  const end = variant.chapterRange.endChapterId ? props.chapterOrders[variant.chapterRange.endChapterId] : undefined
  if (end === undefined) return `第 ${start} 章起`
  return end === start ? `第 ${start} 章` : `第 ${start}-${end} 章`
}

/** 状态提示：剧情锚点（或视觉描述）+ 章节范围。 */
function variantTip(variant: LongProjectAssetVariant): string {
  return [variant.anchor || variant.description || '', chapterRangeLabel(variant)].filter(Boolean).join(' · ')
}

/** 当前生效状态的提示文案（tag 内状态按钮的 title）。 */
function currentVariantTip(entry: BindingEntry): string {
  const variant = currentVariantOf(entry)
  return variant ? variantTip(variant) : ''
}

/* ===== 视觉状态切换菜单：状态名就在资产 Tag 框里，点它展开列表 ===== */

/** 菜单尺寸估算（px）：宽度用于左右避让，高度用于判断向下还是向上展开。 */
const MENU_WIDTH = 208
const MENU_MAX_HEIGHT = 264

const variantMenuEntry = ref<BindingEntry | null>(null)
const variantMenuRef = ref<HTMLElement | null>(null)
/** 触发器矩形（视口坐标），菜单 fixed 定位在它下方；空间不足时改为贴住它的上边向上展开。 */
const menuAnchor = ref({ left: 0, top: 0, bottom: 0 })

/** 是否值得做成切换器：只有一个状态时没有可选项，退化成只读文本。 */
function canSwitchVariant(entry: BindingEntry): boolean {
  return (entry.asset?.variants.length ?? 0) > 1
}

/** 菜单列出的状态（= 当前绑定资产的全部视觉状态）。 */
const variantMenuVariants = computed<LongProjectAssetVariant[]>(() => variantMenuEntry.value?.asset?.variants ?? [])

/** 当前生效状态 id（菜单项勾选与高亮依据）。 */
const menuCurrentVariantId = computed(() => {
  const entry = variantMenuEntry.value
  return entry ? currentVariantOf(entry)?.id : undefined
})

/** 「当前状态」的强调色：取该资产类型令牌，与 Tag 同色系。 */
const menuAccentColor = computed(() => assetTokenVar(variantMenuEntry.value?.asset?.type))

const variantMenuStyle = computed<Record<string, string>>(() => {
  const { left, top, bottom } = menuAnchor.value
  const spaceBelow = window.innerHeight - bottom - 8
  const spaceAbove = top - 8
  const flipUp = spaceBelow < 180 && spaceAbove > spaceBelow
  const maxHeight = Math.max(120, Math.min(MENU_MAX_HEIGHT, flipUp ? spaceAbove : spaceBelow))
  const x = Math.max(8, Math.min(left, window.innerWidth - MENU_WIDTH - 8))
  const style: Record<string, string> = { left: `${x}px`, maxHeight: `${maxHeight}px` }
  // 向上展开用 bottom 定位（菜单底边贴住触发器），菜单变高只会往上长，不会把触发器顶走
  if (flipUp) style.bottom = `${window.innerHeight - top + 4}px`
  else style.top = `${bottom + 4}px`
  return style
})

/** 展开状态切换菜单（记录触发器位置）。 */
function toggleVariantMenu(entry: BindingEntry, event: Event) {
  if (variantMenuEntry.value?.index === entry.index) {
    closeVariantMenu()
    return
  }
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  menuAnchor.value = { left: rect.left, top: rect.top, bottom: rect.bottom }
  variantMenuEntry.value = entry
}

function closeVariantMenu() {
  variantMenuEntry.value = null
}

/**
 * 选中某个视觉状态：交由父组件持久化为 manual 绑定并触发其后各镜的延续重算；已是当前状态时不写库。
 */
function chooseVariant(variant: LongProjectAssetVariant) {
  const entry = variantMenuEntry.value
  closeVariantMenu()
  if (!entry?.asset) return
  if (currentVariantOf(entry)?.id === variant.id) return
  emit('set-binding-variant', { panelId: props.panel.id, assetId: entry.asset.id, variantId: variant.id })
}

/**
 * 菜单是 fixed 定位，外层滚动或窗口变化都会让锚点错位 —— 一有位移就直接收起。
 * 菜单自身内部的滚动要放过，否则在列表里滚动会把自己关掉。
 */
function onViewportChange(event?: Event) {
  if (!variantMenuEntry.value) return
  if (event?.type === 'scroll' && variantMenuRef.value?.contains(event.target as Node)) return
  closeVariantMenu()
}

function onMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeVariantMenu()
}

onMounted(() => {
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
  window.addEventListener('keydown', onMenuKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
  window.removeEventListener('keydown', onMenuKeydown)
})

/** 打开图片更换弹窗，定位到该绑定对应的视觉状态。 */
function openPicker(entry: BindingEntry) {
  pickerEntry.value = entry
  pickerVisible.value = true
}

/** 确认更换：把新的参考图列表写回资产视觉状态（父组件持久化）。
 * 写入目标 = 界面实际展示/取图的那个状态（`currentVariantOf`），避免「看的是 A 状态、写回 B 状态」。 */
function confirmImages(images: string[]) {
  const entry = pickerEntry.value
  if (!entry?.asset) return
  const variant = currentVariantOf(entry)
  if (!variant) return
  emit('update-variant-images', { assetId: entry.asset.id, variantId: variant.id, images })
}

/** 点击资产 tag：放大查看该视觉状态参考图。 */
function inspectEntry(entry: BindingEntry) {
  const images = refImagesOf(entry)
  if (images.length) emit('preview', { images, index: selectedIndex(entry) })
}

/**
 * 选中本镜使用的参考图（单选）。
 * 点第一张等价于"未选"（默认就是第一张），写空数组而不是重复记一份快照 ——
 * 这样资产里的图换序或删掉第一张后，本镜能自动跟随。
 */
function pickImage(entry: BindingEntry, image: string) {
  if (!entry.asset) return
  const alreadyPicked = Boolean(entry.binding.selectedImageIds?.length)
  const isFirst = refImagesOf(entry)[0] === image
  // 本来就是默认态（未选过）又点了第一张，无需写库
  if (isFirst && !alreadyPicked) return
  emit('set-binding-images', {
    panelId: props.panel.id,
    assetId: entry.asset.id,
    imageIds: isFirst ? [] : [image],
  })
}
</script>

<style scoped>
/* ===== 资产 Tag 框内的视觉状态切换器 =====
   颜色全部由 currentColor 派生 —— Tag 的资产类型色（.asset-tag--x）已设在父级 color 上，
   这里只管形状与交互，不写任何颜色值。 */
.asset-state-trigger {
  display: inline-flex;
  flex: 0 1 auto;
  align-items: center;
  gap: 2px;
  min-width: 0;
  max-width: 100%;
  padding: 0 3px;
  border: 0;
  border-radius: 3px;
  background: color-mix(in srgb, currentColor 12%, transparent);
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  cursor: pointer;
  transition: background-color 0.12s ease;
}
.asset-state-trigger:hover,
.asset-state-trigger--active {
  background: color-mix(in srgb, currentColor 26%, transparent);
}
.asset-state-trigger__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.asset-state-trigger__caret {
  flex: none;
  opacity: 0.7;
}

/* ===== 视觉状态切换菜单（Teleport 到 body，fixed 定位） ===== */
.variant-menu {
  /* Teleport 到 body 后必须自己声明 fixed + z-index：
     漏掉 position 会退化成静态元素排在文档末尾 —— 既看不见（left/top 失效），又会把页面撑高出滚动条。 */
  position: fixed;
  z-index: 60;
  display: flex;
  flex-direction: column;
  width: 208px;
  overflow: hidden;
  transform-origin: top left;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: var(--bg-elevated);
  box-shadow: 0 10px 30px -6px rgba(0, 0, 0, 0.35);
  color: var(--text-primary);
  backdrop-filter: blur(12px);
}
.variant-menu__hint {
  flex: none;
  padding: 5px 8px;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 10px;
  color: var(--text-muted);
}
.variant-menu__list {
  min-height: 0;
  padding: 3px 0;
  overflow-y: auto;
}
.variant-menu__item {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 4px 8px;
  border: 0;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: 11px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s ease;
}
.variant-menu__item:hover {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}
.variant-menu__item--current {
  background: color-mix(in srgb, var(--accent) 16%, transparent);
}
.variant-menu__check {
  flex: none;
  opacity: 0;
}
.variant-menu__item--current .variant-menu__check {
  opacity: 1;
}
.variant-menu__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.variant-menu__item--current .variant-menu__name {
  font-weight: 500;
}
.variant-menu-enter-active,
.variant-menu-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.variant-menu-enter-from,
.variant-menu-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
</style>

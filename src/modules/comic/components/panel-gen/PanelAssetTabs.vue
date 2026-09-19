<template>
  <div class="flex h-full flex-col overflow-hidden">
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

      <!-- 底部：人物/场景/道具 tab 分组的缩略图墙，点击缩略图放大预览；抽屉由 tab 行右侧按钮打开 -->
      <div v-if="orderedEntries.length">
        <!-- Tab 切换：人物 / 场景 / 道具（与抽屉内 tab 同款样式）；右侧按钮打开参考图抽屉 -->
        <div class="mb-2.5 flex items-center gap-1 border-b border-border-subtle">
          <button
            v-for="tab in tabs"
            :key="tab.type"
            class="relative -mb-px border-b-2 px-3 py-1.5 text-xs font-medium transition-colors"
            :class="bottomTab === tab.type ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-text-secondary hover:text-text-primary'"
            @click="bottomTab = tab.type"
          >
            {{ tab.label }}
            <span class="ml-0.5 text-[10px]">({{ countOf(tab.type) }})</span>
          </button>
          <button
            class="ml-auto flex shrink-0 items-center gap-0.5 text-[11px] text-text-secondary transition-colors hover:text-cyan-400"
            title="打开参考图抽屉（切换视觉状态 / 参考图）"
            @click="openDrawer()"
          >更多<ChevronRight :size="13" /></button>
        </div>

        <!-- 缩略图墙：从左往右排列、自动换行；只显示缩略图，点击放大预览 -->
        <div class="flex flex-wrap gap-2">
          <template v-for="entry in bottomEntries" :key="entry.index">
            <button
              v-if="selectedImage(entry)"
              class="group relative block shrink-0 overflow-hidden rounded border border-border-subtle transition-colors hover:border-cyan-400"
              :title="`${entry.asset?.name ?? entry.binding.assetName} · ${currentVariantOf(entry)?.name ?? ''}（点击放大预览）`"
              @click="inspectEntry(entry)"
            >
              <img :src="selectedImage(entry)" class="h-16 w-16 object-cover" :alt="`${entry.binding.assetName}参考图`" />
              <span
                v-if="manifestIndexOf(entry) > 0"
                class="pointer-events-none absolute inset-x-0 bottom-0 bg-black/60 px-0.5 text-center text-[9px] leading-4 text-white"
              >图{{ manifestIndexOf(entry) }}</span>
            </button>
            <button
              v-else
              class="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-dashed border-border-subtle text-[10px] text-text-muted transition-colors hover:border-cyan-400 hover:text-cyan-400"
              :title="`${entry.asset?.name ?? entry.binding.assetName}：无参考图（点击打开参考图抽屉）`"
              @click="openDrawer(bottomTab)"
            >无图</button>
          </template>
        </div>

        <p v-if="!bottomEntries.length" class="rounded-lg border border-dashed border-border-subtle px-3 py-4 text-center text-xs text-text-muted">
          本分镜未绑定{{ assetTypeLabel(bottomTab) }}资产
        </p>
      </div>
      <p v-else class="rounded-lg border border-dashed border-border-subtle px-3 py-4 text-center text-xs text-text-muted">本分镜未绑定资产</p>
    </div>

    <!-- 参考图抽屉（左侧滑出，样式对齐 ImageConfigDrawer）：按 人物/场景/道具 tab 组织，
         视觉状态与参考图切换都在抽屉内本地预选，点「保存」一次性写库（避免逐次写盘卡顿）。
         Teleport 到 body —— 中栏是固定高度 + overflow 容器，留在原地会被裁掉。 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="drawerVisible" class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" @click="closeDrawer" />
      </Transition>
      <Transition name="slide-left">
        <div v-if="drawerVisible" class="fixed left-0 top-0 bottom-0 z-[101] w-[min(440px,94vw)] flex flex-col overflow-hidden p-4">
          <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-2xl shadow-black/40 dark:bg-slate-800">
            <!-- 头部 -->
            <div class="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-3.5">
              <div class="flex items-center gap-2">
                <h2 class="text-sm font-semibold text-text-primary">本镜参考图 · 第 {{ panel.order }} 镜</h2>
              </div>
              <button
                class="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-elevated hover:text-text-primary"
                @click="closeDrawer"
              ><X :size="15" /></button>
            </div>

            <!-- Tab 切换：人物 / 场景 / 道具 -->
            <div class="flex shrink-0 items-center gap-1 border-b border-border-subtle px-5 pb-0 pt-3">
              <button
                v-for="tab in tabs"
                :key="tab.type"
                class="relative -mb-px border-b-2 px-3.5 py-2 text-xs font-medium transition-colors"
                :class="drawerTab === tab.type ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-text-secondary hover:text-text-primary'"
                @click="drawerTab = tab.type"
              >
                {{ tab.label }}
                <span class="ml-0.5 text-[10px]">({{ countOf(tab.type) }})</span>
              </button>
            </div>

            <!-- 内容区 -->
            <div class="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <template v-if="drawerEntries.length">
                <div
                  v-for="entry in drawerEntries"
                  :key="entry.index"
                  class="space-y-2.5 rounded-xl border border-border-subtle bg-elevated p-3"
                >
                  <div class="flex items-center gap-1.5">
                    <AssetBindingTag class="min-w-0 justify-start" :binding="entry.binding" :assets="assets" @inspect="inspectEntry(entry)">
                      <template #trailing>
                        <span class="shrink-0 opacity-85">· {{ drawerVariantOf(entry)?.name || '默认' }}</span>
                      </template>
                    </AssetBindingTag>
                  </div>

                  <div v-if="cellVariantRows(entry).length" class="flex flex-wrap items-center gap-x-2 text-[10px] text-text-muted">
                    <span
                      v-for="row in cellVariantRows(entry)"
                      :key="row.label"
                      :class="row.isPrimary ? 'text-cyan-300' : ''"
                    >{{ row.label }}：{{ row.variantName }}</span>
                  </div>

                  <!-- 视觉状态切换：chip 本地预选 -->
                  <div v-if="(entry.asset?.variants.length ?? 0) > 1" class="flex flex-wrap gap-1.5">
                    <button
                      v-for="variant in entry.asset?.variants ?? []"
                      :key="variant.id"
                      class="drawer-chip"
                      :class="{ 'drawer-chip--active': variant.id === drawerVariantOf(entry)?.id }"
                      :title="variantTip(variant)"
                      @click="pickDrawerVariant(entry, variant)"
                    >{{ variant.name }}</button>
                  </div>

                  <!-- 参考图切换：本地预选，选第一张 = 恢复默认 -->
                  <div v-if="drawerImages(entry).length" class="flex flex-wrap gap-2">
                    <button v-for="image in drawerImages(entry)" :key="image" class="relative" @click="pickDrawerImage(entry, image)">
                      <img
                        :src="image"
                        class="h-16 w-16 rounded border object-cover"
                        :class="drawerSelected(entry) === image ? 'border-cyan-400' : 'border-border-subtle opacity-60 hover:opacity-90'"
                        :alt="`${entry.binding.assetName}候选图`"
                      />
                      <span
                        v-if="drawerSelected(entry) === image"
                        class="pointer-events-none absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-400 text-slate-900"
                      ><Check :size="10" /></span>
                      <span
                        v-if="drawerSelected(entry) === image && manifestIndexOf(entry) > 0"
                        class="pointer-events-none absolute inset-x-0 bottom-0 rounded-b bg-black/60 px-0.5 text-center text-[9px] leading-4 text-white"
                      >图{{ manifestIndexOf(entry) }}</span>
                    </button>
                    <p class="w-full text-[10px] leading-4 text-text-muted">选第一张 = 恢复默认（资产换图后自动跟随）</p>
                  </div>
                  <p v-else class="text-[10px] text-text-muted">该视觉状态暂无参考图（去资产工作台生成）</p>
                </div>
              </template>
              <p v-else class="rounded-lg border border-dashed border-border-subtle px-3 py-8 text-center text-xs text-text-muted">
                本分镜未绑定{{ assetTypeLabel(drawerTab) }}资产
              </p>
            </div>

            <!-- 底部操作 -->
            <div class="flex shrink-0 items-center justify-end gap-3 border-t border-border-subtle px-5 py-3.5">
              <button
                class="rounded-lg px-4 py-2 text-xs text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary"
                @click="closeDrawer"
              >取消</button>
              <button
                class="rounded-lg bg-cyan-500 px-5 py-2 text-xs font-medium text-white shadow-lg shadow-cyan-500/20 transition-opacity hover:opacity-90"
                @click="saveDrawer"
              >保存</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
/**
 * 分镜生图工作台中栏底部：按 人物 / 场景 / 道具 **三个 tab** 分组展示当前分镜的资产绑定与参考图缩略图。
 *
 * **底部只显示缩略图墙**：每个 tab 下候选图从左往右排列、自动换行（无图显示「无图」占位，悬浮提示资产名）；
 * 点击缩略图放大预览；tab 行右侧「参考图抽屉」按钮打开左侧抽屉
 * （样式对齐 ImageConfigDrawer：遮罩 z-[100] + 面板 z-[101] + 人物/场景/道具 tab + 底部保存）：
 * - **切视觉状态**：chip 本地预选；**切参考图**：缩略图本地预选（选第一张 = 恢复默认）；
 * - 点「保存」一次性写库（set-binding-variant + set-binding-images）—— 逐次点击立即写盘是之前切换卡顿的根因；
 * - 点「取消」/ 遮罩 / Esc 关闭，丢弃未保存的预选。
 *
 * 有效参考图口径走 `effectiveVariantRefImages`：采纳图（referenceImageIds）为空时回落生成图
 * （generatedImageIds）—— 资产生成的图就是参考图。
 *
 * 「图N」来自生图清单（`buildPanelRefManifest`，全项目唯一图号来源）：编号覆盖前置共用属性图 +
 * 各资产参考图的最终生图顺序，与生图 / 右栏分组 / 画面描述提示词同一口径。
 *
 * ⚠️ 取图口径必须与生图时（`LongProjectStoryboardTab.currentRefGroups`）、工作台引用角标
 * （`assetUsageService`）三处一致，统一走 `resolvePanelRefImage`，否则会「标了在用其实没用」。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Check, ChevronRight, X } from 'lucide-vue-next'
import type { LongProjectAsset, LongProjectAssetType, LongProjectAssetVariant, LongProjectStoryboardAssetBinding, LongProjectStoryboardPanel } from '@comic/types'
import type { PanelRefManifest } from '@comic/services/panelRefManifest'
import { effectiveVariantRefImages, resolvePanelBindings, resolvePanelRefImage } from '@comic/services/panelPromptService'
import { ASSET_TYPE_ORDER, assetTypeLabel } from '@comic/utils/assetTypeTheme'
import AssetBindingTag from '@comic/components/AssetBindingTag.vue'

type BindingEntry = { index: number; binding: LongProjectStoryboardAssetBinding; asset?: LongProjectAsset }

const props = defineProps<{
  panel: LongProjectStoryboardPanel
  /** 本章可用资产（含全部视觉状态）。 */
  assets: LongProjectAsset[]
  /** 章节顺序表（章节 ID → 序号），用于视觉状态的章节范围悬浮提示。 */
  chapterOrders?: Record<string, number>
  /** 当前分镜的生图参考图清单（唯一图号来源 buildPanelRefManifest），「图N」角标由此对齐。 */
  refManifest?: PanelRefManifest
}>()

const emit = defineEmits<{
  /** 设定本镜使用的参考图（单选；空数组 = 恢复"未选"，即取第一张）。 */
  (e: 'set-binding-images', payload: { panelId: string; assetId: string; imageIds: string[] }): void
  (e: 'preview', payload: { images: string[]; index: number }): void
  /** 手动切换本镜某资产绑定的视觉状态（父组件持久化为 manual 绑定 + 其后 auto 绑定延续重算）。 */
  (e: 'set-binding-variant', payload: { panelId: string; assetId: string; variantId: string }): void
}>()

const tabs = ASSET_TYPE_ORDER.map((type) => ({ type, label: assetTypeLabel(type) }))

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

const unmatchedBindings = computed(() => entries.value.filter((entry) => !entry.asset))

/** 底部卡片排序：人物 → 场景 → 道具（与生图清单的资产顺序一致）。 */
const orderedEntries = computed<BindingEntry[]>(() =>
  ASSET_TYPE_ORDER.flatMap((type) => entries.value.filter((entry) => entry.asset?.type === type)),
)

/* ===== 底部 tab：人物 / 场景 / 道具 ===== */

const bottomTab = ref<LongProjectAssetType>('character')

/** 当前 tab 下的底部卡片。 */
const bottomEntries = computed<BindingEntry[]>(() =>
  orderedEntries.value.filter((entry) => entry.asset?.type === bottomTab.value),
)

/** 切换分镜时：底部 tab 自动定位到第一个有绑定的分类。 */
watch(
  () => props.panel.id,
  () => {
    bottomTab.value = ASSET_TYPE_ORDER.find((type) => countOf(type) > 0) ?? 'character'
  },
  { immediate: true },
)

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

/** 选中图在候选里的下标（点击资产 tag 预览时的定位）。 */
function selectedIndex(entry: BindingEntry): number {
  const images = effectiveImagesOf(entry)
  const index = images.indexOf(selectedImage(entry) ?? '')
  return index < 0 ? 0 : index
}

/** 该绑定实际生效（已落库）视觉状态的参考图列表（采纳图为空时回落到生成图）。 */
function effectiveImagesOf(entry: BindingEntry): string[] {
  const resolved = resolvedOf(entry)
  if (resolved) return effectiveVariantRefImages(resolved.variant)
  return entry.binding.referenceImageIds ?? []
}

/** 该绑定生效参考图在生图清单中的图号（1 起；该状态无图 / 不在清单时为 0）。 */
function manifestIndexOf(entry: BindingEntry): number {
  const variantId = currentVariantOf(entry)?.id
  if (!variantId) return 0
  return props.refManifest?.entries.find((item) => item.source === 'asset' && item.variantId === variantId)?.index ?? 0
}

/** 该绑定实际生效的视觉状态（绑定快照仅作兜底）。 */
function currentVariantOf(entry: BindingEntry): LongProjectAssetVariant | undefined {
  const resolved = resolvedOf(entry)
  return resolved?.variant ?? entry.asset?.variants.find((item) => item.id === entry.binding.visualVersionId)
}

/**
 * 该资产在本镜各格的实际状态行（格级「出场资产」声明解析）。
 * 各格状态一致、无格级声明或单格页时不显示（避免噪音）；镜末状态高亮标注。
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

/** 点击资产 tag：放大查看该视觉状态参考图。 */
function inspectEntry(entry: BindingEntry) {
  const images = effectiveImagesOf(entry)
  if (images.length) emit('preview', { images, index: selectedIndex(entry) })
}

/* ===== 参考图抽屉：本地预选 + 保存一次性写库 ===== */

const drawerVisible = ref(false)
const drawerTab = ref<LongProjectAssetType>('character')
/** 预选的视觉状态（assetId → variantId）。 */
const pendingVariants = ref<Record<string, string>>({})
/** 预选的参考图（assetId → 图片地址；'' = 恢复默认第一张）。 */
const pendingImages = ref<Record<string, string>>({})

watch(() => props.panel.id, () => closeDrawer())

/** 打开抽屉：可指定定位到的分类 tab（缺省用底部当前 tab）。 */
function openDrawer(type?: LongProjectAssetType) {
  drawerTab.value = type ?? bottomTab.value
  pendingVariants.value = {}
  pendingImages.value = {}
  drawerVisible.value = true
}

function closeDrawer() {
  drawerVisible.value = false
  pendingVariants.value = {}
  pendingImages.value = {}
}

const drawerEntries = computed<BindingEntry[]>(() => entries.value.filter((entry) => entry.asset?.type === drawerTab.value))

/** 抽屉内该绑定展示的视觉状态：预选优先，未预选用当前生效状态。 */
function drawerVariantOf(entry: BindingEntry): LongProjectAssetVariant | undefined {
  const pendingId = entry.asset ? pendingVariants.value[entry.asset.id] : undefined
  if (pendingId) return entry.asset?.variants.find((variant) => variant.id === pendingId)
  return currentVariantOf(entry)
}

/** 抽屉内候选图：跟随预选状态的参考图（采纳图为空回落生成图）。 */
function drawerImages(entry: BindingEntry): string[] {
  const variant = drawerVariantOf(entry)
  return variant ? effectiveVariantRefImages(variant) : []
}

/** 抽屉内当前选中图：预选优先；未预选且换过状态 → 新状态第一张；否则跟随已落库选择。 */
function drawerSelected(entry: BindingEntry): string | undefined {
  const images = drawerImages(entry)
  if (!images.length) return undefined
  const pending = entry.asset ? pendingImages.value[entry.asset.id] : undefined
  if (pending !== undefined) return images.includes(pending) ? pending : images[0]
  if (pendingVariants.value[entry.asset?.id ?? '']) return images[0]
  const applied = selectedImage(entry)
  return applied && images.includes(applied) ? applied : images[0]
}

/** 预选视觉状态：清掉该资产的图片预选（新状态的候选图不同）。 */
function pickDrawerVariant(entry: BindingEntry, variant: LongProjectAssetVariant) {
  if (!entry.asset || drawerVariantOf(entry)?.id === variant.id) return
  pendingVariants.value = { ...pendingVariants.value, [entry.asset.id]: variant.id }
  const next = { ...pendingImages.value }
  delete next[entry.asset.id]
  pendingImages.value = next
}

/** 预选参考图：'' = 恢复默认（保存时写空数组）。 */
function pickDrawerImage(entry: BindingEntry, image: string) {
  if (!entry.asset) return
  pendingImages.value = { ...pendingImages.value, [entry.asset.id]: image }
}

/** 保存：一次性把全部预选写库（先状态后图片），随后关闭抽屉。 */
function saveDrawer() {
  const panelId = props.panel.id
  for (const entry of entries.value) {
    if (!entry.asset) continue
    const pendingVariant = pendingVariants.value[entry.asset.id]
    if (pendingVariant && currentVariantOf(entry)?.id !== pendingVariant) {
      emit('set-binding-variant', { panelId, assetId: entry.asset.id, variantId: pendingVariant })
    }
    const pendingImage = pendingImages.value[entry.asset.id]
    if (pendingImage !== undefined) {
      emit('set-binding-images', { panelId, assetId: entry.asset.id, imageIds: pendingImage === '' ? [] : [pendingImage] })
    }
  }
  closeDrawer()
}

function onDrawerKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && drawerVisible.value) closeDrawer()
}

onMounted(() => window.addEventListener('keydown', onDrawerKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onDrawerKeydown))
</script>

<style scoped>
/* 抽屉内视觉状态 chip */
.drawer-chip {
  padding: 2px 8px;
  border: 1px solid var(--border-subtle);
  border-radius: 3px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.6;
  cursor: pointer;
  transition: background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}
.drawer-chip:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  color: var(--text-primary);
}
.drawer-chip--active {
  border-color: var(--accent, #22d3ee);
  background: color-mix(in srgb, var(--accent, #22d3ee) 12%, transparent);
  color: var(--accent, #22d3ee);
}

/* 抽屉过渡：左侧滑入 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
}
</style>

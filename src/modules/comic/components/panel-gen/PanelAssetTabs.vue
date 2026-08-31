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
          :key="`${entry.binding.assetId}-${entry.index}`"
          class="rounded-lg border border-border-subtle bg-surface p-2.5"
        >
          <div class="flex items-center gap-2">
            <AssetBindingTag class="min-w-0 flex-1 justify-start" :binding="entry.binding" :assets="assets" @inspect="inspectEntry(entry)" />
            <span v-if="!refImagesOf(entry).length" class="shrink-0 text-[10px] text-amber-300" title="该视觉状态还没有参考图，点击右侧按钮添加">无参考图</span>
            <button class="shrink-0 text-[11px] text-cyan-400 hover:text-cyan-300" @click="openPicker(entry)">{{ refImagesOf(entry).length ? '更换图片' : '添加图片' }}</button>
          </div>

          <div v-if="refImagesOf(entry).length" class="mt-2 flex flex-wrap gap-1.5">
            <img
              v-for="image in refImagesOf(entry)"
              :key="image"
              :src="image"
              class="h-11 w-11 cursor-zoom-in rounded border border-border-subtle object-cover"
              :alt="`${entry.binding.assetName}参考图`"
              @click="$emit('preview', { images: refImagesOf(entry), index: 0 })"
            />
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
  </div>
</template>

<script setup lang="ts">
/**
 * 分镜生图工作台中栏底部：按「人物 / 场景 / 道具」三个 tab 展示当前分镜的资产绑定与实时参考图。
 * 绑定关系由分镜文本自动推导，不支持换绑；仅支持更换绑定视觉状态的参考图（对所有引用分镜生效）。
 */
import { computed, ref, watch } from 'vue'
import type { LongProjectAsset, LongProjectAssetType, LongProjectStoryboardAssetBinding, LongProjectStoryboardPanel } from '@comic/types'
import { resolvePanelBindings } from '@comic/services/panelPromptService'
import AssetBindingTag from '@comic/components/AssetBindingTag.vue'
import AssetImagePickerModal from '@comic/components/AssetImagePickerModal.vue'

type BindingEntry = { index: number; binding: LongProjectStoryboardAssetBinding; asset?: LongProjectAsset }

const props = defineProps<{
  panel: LongProjectStoryboardPanel
  /** 本章可用资产（含全部视觉状态）。 */
  assets: LongProjectAsset[]
}>()

const emit = defineEmits<{
  /** 确认更换某资产视觉状态的参考图列表（替换式）。 */
  (e: 'update-variant-images', payload: { assetId: string; variantId: string; images: string[] }): void
  (e: 'preview', payload: { images: string[]; index: number }): void
}>()

const tabs: Array<{ type: LongProjectAssetType; label: string }> = [
  { type: 'character', label: '人物' },
  { type: 'scene', label: '场景' },
  { type: 'prop', label: '道具' },
]

const activeType = ref<LongProjectAssetType>('character')
const pickerVisible = ref(false)
const pickerEntry = ref<BindingEntry | null>(null)

watch(() => props.panel.id, () => { pickerEntry.value = null; pickerVisible.value = false })

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
const activeTabLabel = computed(() => tabs.find((tab) => tab.type === activeType.value)?.label ?? '')

/** 绑定资产实时参考图：以 visualVersionId 查 variant.referenceImageIds（绑定快照仅作兜底）。 */
function refImagesOf(entry: BindingEntry): string[] {
  const resolved = resolvePanelBindings(props.panel, props.assets).find((item) => item.asset.id === entry.binding.assetId)
  if (resolved) return resolved.variant.referenceImageIds
  return entry.binding.referenceImageIds ?? []
}

/** 打开图片更换弹窗，定位到该绑定对应的视觉状态。 */
function openPicker(entry: BindingEntry) {
  pickerEntry.value = entry
  pickerVisible.value = true
}

/** 确认更换：把新的参考图列表写回资产视觉状态（父组件持久化）。 */
function confirmImages(images: string[]) {
  const entry = pickerEntry.value
  if (!entry?.asset) return
  const variant =
    entry.asset.variants.find((item) => item.id === entry.binding.visualVersionId) ?? entry.asset.variants[0]
  if (!variant) return
  emit('update-variant-images', { assetId: entry.asset.id, variantId: variant.id, images })
}

/** 点击资产 tag：放大查看该视觉状态参考图。 */
function inspectEntry(entry: BindingEntry) {
  const images = refImagesOf(entry)
  if (images.length) emit('preview', { images, index: 0 })
}
</script>

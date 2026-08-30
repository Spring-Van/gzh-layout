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
      <!-- 未匹配绑定：固定提示条，任何 tab 下都可见 -->
      <div v-if="unmatchedBindings.length" class="mb-2.5 rounded-lg border border-amber-400/30 bg-amber-400/5 p-2.5">
        <p class="mb-1.5 text-[10px] text-amber-300">未匹配资产（名称与资产库对不上，建议换绑）</p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="entry in unmatchedBindings"
            :key="`unmatched-${entry.index}`"
            class="rounded border border-amber-400/30 px-2 py-1 text-[11px] text-amber-200 transition-colors hover:bg-amber-400/10"
            @click="toggleRebind(entry.index)"
          >
            {{ entry.binding.assetName }} · 换绑
          </button>
        </div>
        <div v-if="unmatchedRebindBinding" class="mt-2">
          <RebindForm
            :key="`form-unmatched-${rebindOpen}`"
            :binding="unmatchedRebindBinding"
            :assets="assets"
            @change="(binding) => $emit('update-binding', { index: rebindOpen!, binding })"
          />
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
            <span class="min-w-0 flex-1 truncate text-xs text-text-primary">
              {{ entry.binding.assetName }}
              <template v-if="entry.binding.visualVersionName"> · {{ entry.binding.visualVersionName }}</template>
            </span>
            <span v-if="!refImagesOf(entry).length" class="shrink-0 text-[10px] text-amber-300" title="该视觉状态还没有参考图，请先在资产工作台准备">无参考图</span>
            <button class="shrink-0 text-[11px] text-cyan-400 hover:text-cyan-300" @click="toggleRebind(entry.index)">{{ rebindOpen === entry.index ? '收起' : '换绑' }}</button>
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

          <div v-if="rebindOpen === entry.index" class="mt-2.5">
            <RebindForm
              :key="`form-${entry.index}`"
              :binding="entry.binding"
              :assets="assets"
              @change="(binding) => $emit('update-binding', { index: entry.index, binding })"
            />
          </div>
        </div>
      </div>
      <p v-else class="rounded-lg border border-dashed border-border-subtle px-3 py-4 text-center text-xs text-text-muted">本分镜未绑定{{ activeTabLabel }}资产</p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 分镜生图工作台中栏底部：按「人物 / 场景 / 道具」三个 tab 展示当前分镜的资产绑定、
 * 实时参考图与手动换绑；未匹配绑定以固定提示条常显，换绑后自动归入对应 tab。
 */
import { computed, ref, watch } from 'vue'
import type { LongProjectAsset, LongProjectAssetType, LongProjectStoryboardAssetBinding, LongProjectStoryboardPanel } from '@comic/types'
import { resolvePanelBindings } from '@comic/services/panelPromptService'
import RebindForm from './RebindForm.vue'

type BindingEntry = { index: number; binding: LongProjectStoryboardAssetBinding; asset?: LongProjectAsset }

const props = defineProps<{
  panel: LongProjectStoryboardPanel
  /** 本章可用资产（含全部视觉状态）。 */
  assets: LongProjectAsset[]
}>()

defineEmits<{
  (e: 'update-binding', payload: { index: number; binding: LongProjectStoryboardAssetBinding }): void
  (e: 'preview', payload: { images: string[]; index: number }): void
}>()

const tabs: Array<{ type: LongProjectAssetType; label: string }> = [
  { type: 'character', label: '人物' },
  { type: 'scene', label: '场景' },
  { type: 'prop', label: '道具' },
]

const activeType = ref<LongProjectAssetType>('character')
const rebindOpen = ref<number | null>(null)

watch(() => props.panel.id, () => { rebindOpen.value = null })

/** 全部绑定（带原始下标，供父组件按 index 更新）+ 资产分类信息。 */
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
const unmatchedRebindBinding = computed(() =>
  unmatchedBindings.value.find((entry) => entry.index === rebindOpen.value)?.binding,
)
const activeTabLabel = computed(() => tabs.find((tab) => tab.type === activeType.value)?.label ?? '')

/** 绑定资产实时参考图：以 visualVersionId 查 variant.referenceImageIds（绑定快照仅作兜底）。 */
function refImagesOf(entry: BindingEntry): string[] {
  const resolved = resolvePanelBindings(props.panel, props.assets).find((item) => item.asset.id === entry.binding.assetId)
  if (resolved) return resolved.variant.referenceImageIds
  return entry.binding.referenceImageIds ?? []
}

function toggleRebind(index: number) {
  rebindOpen.value = rebindOpen.value === index ? null : index
}
</script>

<template>
  <div class="flex flex-col gap-2 rounded-md border border-border-subtle bg-app-bg p-2.5">
    <label class="flex flex-col gap-1 text-[11px] text-text-secondary">
      资产
      <select
        class="h-8 rounded-md border border-border-subtle bg-surface px-2 text-xs text-text-primary outline-none focus:border-cyan-500/50"
        :value="binding.assetId ?? ''"
        @change="handleAssetChange(($event.target as HTMLSelectElement).value)"
      >
        <option value="">未匹配</option>
        <option v-for="asset in assets" :key="asset.id" :value="asset.id">{{ asset.name }}（{{ asset.variants.length }} 状态）</option>
      </select>
    </label>
    <label class="flex flex-col gap-1 text-[11px] text-text-secondary">
      视觉状态
      <select
        class="h-8 rounded-md border border-border-subtle bg-surface px-2 text-xs text-text-primary outline-none focus:border-cyan-500/50 disabled:opacity-50"
        :value="binding.visualVersionId ?? ''"
        :disabled="!binding.assetId"
        @change="handleVariantChange(($event.target as HTMLSelectElement).value)"
      >
        <option value="">默认（按章节范围）</option>
        <option v-for="variant in variants" :key="variant.id" :value="variant.id">{{ variant.name }}</option>
      </select>
    </label>
  </div>
</template>

<script setup lang="ts">
/**
 * 资产换绑表单：选择资产与视觉状态后回传完整 binding（快照参考图一并刷新）。
 */
import { computed, toRaw } from 'vue'
import type { LongProjectAsset, LongProjectStoryboardAssetBinding } from '@comic/types'

const props = defineProps<{
  binding: LongProjectStoryboardAssetBinding
  assets: LongProjectAsset[]
}>()

const emit = defineEmits<{
  (e: 'change', binding: LongProjectStoryboardAssetBinding): void
}>()

const variants = computed(() => props.assets.find((item) => item.id === props.binding.assetId)?.variants ?? [])

function handleAssetChange(assetId: string) {
  const asset = props.assets.find((item) => item.id === assetId)
  const variant = asset?.variants[0]
  emit('change', {
    ...toRaw(props.binding),
    assetId: assetId || undefined,
    assetName: asset?.name ?? props.binding.assetName,
    visualVersionId: variant?.id,
    visualVersionName: variant?.name,
    matchSource: asset ? 'manual' : 'unmatched',
    referenceImageIds: variant?.referenceImageIds ?? [],
  })
}

function handleVariantChange(variantId: string) {
  const asset = props.assets.find((item) => item.id === props.binding.assetId)
  const variant = asset?.variants.find((item) => item.id === variantId)
  emit('change', {
    ...toRaw(props.binding),
    visualVersionId: variantId || undefined,
    visualVersionName: variant?.name,
    matchSource: 'manual',
    referenceImageIds: variant?.referenceImageIds ?? [],
  })
}
</script>

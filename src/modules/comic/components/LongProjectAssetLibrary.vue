<template>
  <section class="flex h-full min-h-0 bg-app-bg">
    <aside class="custom-scrollbar flex w-72 shrink-0 flex-col border-r border-border-subtle bg-surface">
      <div class="border-b border-border-subtle px-4 py-4"><h1 class="text-base font-semibold text-text-primary">{{ categoryLabel }}资产</h1><p class="mt-1 text-xs text-text-muted">{{ assets.length }} 项已确认资产</p></div>
      <div class="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
        <button v-for="asset in assets" :key="asset.id" class="mb-1 w-full rounded-md px-3 py-2.5 text-left transition-colors" :class="selectedId === asset.id ? 'bg-violet-500/12' : 'hover:bg-elevated'" @click="selectedId = asset.id">
          <div class="flex items-center justify-between gap-2"><span class="truncate text-sm font-medium text-text-primary">{{ asset.name }}</span><span class="shrink-0 text-[11px] text-text-muted">{{ asset.variants.length }} 版本</span></div>
          <p class="mt-1 truncate text-xs text-text-secondary">{{ summary(asset) || asset.description || '暂无补充信息' }}</p>
        </button>
      </div>
    </aside>
    <div v-if="activeAsset" class="custom-scrollbar min-w-0 flex-1 overflow-y-auto">
      <div class="mx-auto max-w-3xl px-8 py-7">
        <p class="text-xs text-violet-300">项目资产库 · {{ categoryLabel }}</p>
        <h2 class="mt-1 text-xl font-semibold text-text-primary">{{ activeAsset.name }}</h2>
        <p v-if="activeAsset.aliases.length" class="mt-2 text-xs text-text-muted">别名：{{ activeAsset.aliases.join('、') }}</p>
        <div class="mt-6 border-t border-border-subtle pt-5"><p class="text-sm font-medium text-text-primary">资产描述</p><p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{{ activeAsset.description || '暂无描述' }}</p></div>
        <div v-if="visibleAttributes.length" class="mt-6 border-t border-border-subtle pt-5"><p class="text-sm font-medium text-text-primary">补充信息</p><dl class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"><template v-for="field in visibleAttributes" :key="field.key"><div><dt class="text-xs text-text-muted">{{ field.label }}</dt><dd class="mt-1 text-sm text-text-primary">{{ attributeText(field.value) }}</dd></div></template></dl></div>
        <div class="mt-6 border-t border-border-subtle pt-5"><div class="flex items-center justify-between"><p class="text-sm font-medium text-text-primary">视觉状态</p><span class="text-xs text-text-muted">{{ activeAsset.variants.length }} 个</span></div><div v-if="activeAsset.variants.length" class="mt-3 grid gap-2 sm:grid-cols-2"><article v-for="variant in activeAsset.variants" :key="variant.id" class="rounded-md border border-border-subtle bg-surface px-4 py-3"><div class="flex items-center justify-between gap-2"><p class="text-sm font-medium text-text-primary">{{ variant.name }}</p><span class="text-[11px] text-text-muted">{{ chapterRangeText(variant) }}</span></div><p class="mt-1 text-xs leading-5 text-text-secondary">{{ variant.description || '暂无视觉描述' }}</p><p v-if="variant.tags?.length" class="mt-2 text-[11px] text-violet-200">{{ variant.tags.join(' · ') }}</p><p class="mt-3 text-[11px] text-text-muted">{{ variant.referenceImageIds.length }} 张参考图</p></article></div><p v-else class="mt-3 text-xs text-text-muted">尚未整理视觉状态与参考图。</p></div>
        <div class="mt-6 border-t border-border-subtle pt-5"><p class="text-sm font-medium text-text-primary">来源章节</p><p class="mt-2 text-xs text-text-secondary">来自 {{ activeAsset.sourceChapterIds.length }} 个章节的解析结果</p></div>
      </div>
    </div>
    <div v-else class="flex flex-1 items-center justify-center text-sm text-text-muted">当前还没有{{ categoryLabel }}资产</div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { LongProjectAsset, LongProjectAssetType, LongProjectAssetVariant } from '@comic/types'

const props = defineProps<{ category: LongProjectAssetType; assets: LongProjectAsset[] }>()
const selectedId = ref<string | null>(props.assets[0]?.id ?? null)
watch(() => props.assets, (assets) => { if (!assets.some((asset) => asset.id === selectedId.value)) selectedId.value = assets[0]?.id ?? null }, { deep: true })
const activeAsset = computed(() => props.assets.find((asset) => asset.id === selectedId.value) ?? null)
const categoryLabel = computed(() => ({ character: '人物', scene: '场景', prop: '道具' })[props.category])
const visibleAttributes = computed(() => Object.entries(activeAsset.value?.attributes ?? {}).map(([key, value]) => ({ key, label: key, value })))
function attributeText(value: string | string[] | number | undefined) { return Array.isArray(value) ? value.join('、') : String(value ?? '') }
function summary(asset: LongProjectAsset) { return Object.values(asset.attributes ?? {}).slice(0, 2).map(attributeText).filter(Boolean).join(' · ') }
function chapterRangeText(variant: LongProjectAssetVariant) { return variant.chapterRange?.endChapterId ? '跨章节状态' : '本章首次出现' }
</script>

<template>
  <span
    role="button"
    tabindex="0"
    class="inline-flex max-w-full cursor-pointer select-none items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] leading-4 transition-colors"
    :class="tagClass"
    :title="tooltip"
    @click.stop="emit('inspect', resolved)"
    @keydown.enter.stop.prevent="emit('inspect', resolved)"
  >
    <component :is="typeIcon" :size="10" class="shrink-0" />
    <span class="truncate">{{ binding.assetName }}</span>
    <span v-if="versionLabel" class="shrink-0 opacity-85">· {{ versionLabel }}</span>
  </span>
</template>

<script setup lang="ts">
/**
 * 资产绑定统一 Tag：按资产类型着色（人物紫 / 场景蓝 / 道具绿 / 未匹配琥珀虚线），
 * 显示资产名与视觉状态名；点击触发 inspect 事件用于查看资产视觉状态详情与参考图。
 */
import { computed } from 'vue'
import { Box, MapPin, UserRound } from 'lucide-vue-next'
import type { LongProjectAsset, LongProjectStoryboardAssetBinding } from '@comic/types'

const props = defineProps<{
  binding: LongProjectStoryboardAssetBinding
  /** 项目资产库，用于解析类型与视觉状态；未匹配绑定时可缺省。 */
  assets?: LongProjectAsset[]
  /** 是否可点击查看（默认可）。 */
  interactive?: boolean
}>()

const emit = defineEmits<{
  /** 点击 tag：payload 为解析到的资产（未匹配时为 null）。 */
  (e: 'inspect', asset: LongProjectAsset | null): void
}>()

/** 解析绑定对应的资产。 */
const resolved = computed(() => props.assets?.find((asset) => asset.id === props.binding.assetId) ?? null)

/** 类型图标。 */
const typeIcon = computed(() => {
  if (!resolved.value) return Box
  if (resolved.value.type === 'character') return UserRound
  if (resolved.value.type === 'scene') return MapPin
  return Box
})

/** 视觉状态名：绑定快照优先，缺失时回落到资产当前状态名。 */
const versionLabel = computed(() => {
  if (props.binding.visualVersionName) return props.binding.visualVersionName
  const variant = resolved.value?.variants.find((item) => item.id === props.binding.visualVersionId)
  return variant?.name ?? ''
})

const typeLabelMap: Record<string, string> = { character: '人物', scene: '场景', prop: '道具' }

const typeLabel = computed(() => typeLabelMap[resolved.value?.type ?? ''] ?? '未匹配')

const tagClass = computed(() => {
  // 明暗两套配色：浅色模式深字浅底，暗色模式亮字半透明底，保证两套主题下文字都清晰
  if (!resolved.value) return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200 border-dashed'
  if (resolved.value.type === 'character') return 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/15 dark:text-violet-200'
  if (resolved.value.type === 'scene') return 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-500/15 dark:text-sky-200'
  if (resolved.value.type === 'prop') return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200'
  return 'border-border-subtle bg-elevated text-text-secondary'
})

const tooltip = computed(() =>
  resolved.value
    ? `${typeLabel.value} · ${props.binding.assetName}${versionLabel.value ? ` · ${versionLabel.value}` : ''}（点击查看）`
    : `${props.binding.assetName} · 未匹配资产（名称与资产库对不上，建议换绑）`,
)
</script>

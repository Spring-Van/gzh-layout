<template>
  <span
    :role="interactive ? 'button' : undefined"
    :tabindex="interactive ? 0 : undefined"
    :class="[tagClass, interactive ? 'cursor-pointer select-none transition-colors' : '']"
    :title="tooltip"
    @click.stop="interactive && emit('inspect', resolved)"
    @keydown.enter.stop.prevent="interactive && emit('inspect', resolved)"
  >
    <component :is="typeIcon" :size="10" class="shrink-0" />
    <span class="truncate">{{ binding.assetName }}</span>
    <!-- 尾随区：默认是只读的视觉状态名；分镜工作台用 trailing 插槽换成可点击的状态切换器。 -->
    <slot name="trailing">
      <span v-if="versionLabel" class="shrink-0 opacity-85">· {{ versionLabel }}</span>
    </slot>
  </span>
</template>

<script setup lang="ts">
/**
 * 资产绑定统一 Tag：按资产类型着色，显示资产名与视觉状态名；
 * 点击触发 inspect 事件用于查看资产视觉状态详情与参考图。
 *
 * 视觉状态的展示方式由 `trailing` 插槽决定：
 * - 不传插槽（默认）→ 只读文本 `· 状态名`；
 * - 传插槽 → 由调用方渲染（分镜工作台在这里放「状态切换器」，让状态在框内就能直接换）。
 *
 * 配色不写在这里 —— 样式类 `.asset-tag--{character|scene|prop}` 定义在 `src/style.css`，
 * 颜色来自 `tokens.css` 的 `--asset-*` 令牌。改色请改令牌，本组件无需改动。
 */
import { computed } from 'vue'
import type { LongProjectAsset, LongProjectStoryboardAssetBinding } from '@comic/types'
import { assetTagClass, assetTypeIcon, assetTypeLabel } from '@comic/utils/assetTypeTheme'

const props = withDefaults(defineProps<{
  binding: LongProjectStoryboardAssetBinding
  /** 项目资产库，用于解析类型与视觉状态；未匹配绑定时可缺省。 */
  assets?: LongProjectAsset[]
  /** 是否可点击查看（默认 true；纯展示场景传 false 去掉手型与按钮语义）。 */
  interactive?: boolean
}>(), { interactive: true })

const emit = defineEmits<{
  /** 点击 tag：payload 为解析到的资产（未匹配时为 null）。 */
  (e: 'inspect', asset: LongProjectAsset | null): void
}>()

/** 解析绑定对应的资产。 */
const resolved = computed(() => props.assets?.find((asset) => asset.id === props.binding.assetId) ?? null)

/** 类型图标。 */
const typeIcon = computed(() => assetTypeIcon(resolved.value?.type))

/** 视觉状态名：绑定快照优先，缺失时回落到资产当前状态名。 */
const versionLabel = computed(() => {
  if (props.binding.visualVersionName) return props.binding.visualVersionName
  const variant = resolved.value?.variants.find((item) => item.id === props.binding.visualVersionId)
  return variant?.name ?? ''
})

const typeLabel = computed(() => assetTypeLabel(resolved.value?.type))

const tagClass = computed(() => assetTagClass(resolved.value?.type))

const tooltip = computed(() =>
  resolved.value
    ? `${typeLabel.value} · ${props.binding.assetName}${versionLabel.value ? ` · ${versionLabel.value}` : ''}（点击查看）`
    : `${props.binding.assetName} · 未匹配资产（名称与资产库对不上，建议换绑）`,
)
</script>

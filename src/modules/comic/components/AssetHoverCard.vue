<template>
  <Teleport to="body">
    <div
      class="asset-hover-card"
      :style="cardStyle"
      @mouseenter="emit('enter')"
      @mouseleave="emit('leave')"
    >
      <div class="mb-1.5 flex items-center justify-between gap-2">
        <span class="min-w-0 truncate text-[11px] font-medium text-text-primary">{{ asset.name }}</span>
        <span class="asset-tag shrink-0" :class="tagClass">{{ typeLabel }}</span>
      </div>

      <div class="mb-1.5 flex items-center justify-between gap-2">
        <span class="min-w-0 truncate text-[10px] text-text-secondary">{{ variantName }}</span>
        <span v-if="images.length" class="shrink-0 text-[10px] text-text-muted">{{ images.length }} 张</span>
      </div>

      <div v-if="images.length" class="flex flex-wrap gap-1">
        <button
          v-for="(image, index) in images"
          :key="image"
          class="asset-hover-thumb"
          :class="image === inUseImage ? 'asset-hover-thumb--on' : ''"
          :title="image === inUseImage ? '本镜生图会带上的参考图，点击看大图' : '点击看大图'"
          @click="emit('preview', { images, index })"
        >
          <img :src="image" :alt="`${asset.name} 参考图${index + 1}`" />
        </button>
      </div>
      <p v-else class="text-[10px] leading-4 text-text-muted">该视觉状态暂无参考图，可前往资产生图工作台生成</p>

      <p class="mt-1.5 text-[10px] leading-4 text-text-muted">高亮框 = 本镜生图实际带上的那张</p>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 资产悬停卡：在输入框里的资产名高亮文字、或底部「识别资产」标签上悬停时弹出，
 * 展示该资产**当前生效的视觉状态**与它的参考图。
 *
 * 只做展示 —— 视觉状态由分镜文本自动绑定推导，这里不提供切换入口
 * （2026-09-17 决策：底部资产卡与悬停卡都不再手动切状态）。
 */
import { computed } from 'vue'
import type { LongProjectAsset, LongProjectStoryboardPanel } from '@comic/types'
import { resolvePanelBindings, resolvePanelRefImage } from '@comic/services/panelPromptService'
import { assetTagClass, assetTypeLabel } from '@comic/utils/assetTypeTheme'

const props = defineProps<{
  asset: LongProjectAsset
  /** 当前分镜：用于解析本镜生效的视觉状态与实际取用的参考图。 */
  panel: LongProjectStoryboardPanel
  /** 项目资产库（解析未匹配资产需要）。 */
  assets?: LongProjectAsset[]
  /** 定位样式（由 useAssetHighlight 计算，跟随鼠标且不越出视口）。 */
  cardStyle: Record<string, string>
}>()

const emit = defineEmits<{
  /** 鼠标进入卡片：取消待执行的关闭计时。 */
  (e: 'enter'): void
  /** 鼠标离开卡片：开始延迟关闭。 */
  (e: 'leave'): void
  (e: 'preview', payload: { images: string[]; index: number }): void
}>()

const tagClass = computed(() => assetTagClass(props.asset.type))
const typeLabel = computed(() => assetTypeLabel(props.asset.type))

/** 本镜解析到的资产 + 生效视觉状态（按绑定实时解析，而不是取资产第一个状态）。 */
const resolved = computed(() => resolvePanelBindings(props.panel, props.assets ?? [props.asset]).find((item) => item.asset.id === props.asset.id))

const variantName = computed(() => resolved.value?.variant.name ?? '无视觉状态')

const images = computed(() => resolved.value?.variant.referenceImageIds ?? [])

/** 本镜生图实际会带上的那张（单选口径，见 resolvePanelRefImage）。 */
const inUseImage = computed(() => {
  if (!resolved.value) return undefined
  return resolvePanelRefImage(resolved.value.variant, resolved.value.binding)
})
</script>

<style scoped>
.asset-hover-card { position: fixed; z-index: 150; border-radius: .5rem; border: 1px solid var(--border-subtle); background: var(--bg-app); padding: .5rem; box-shadow: 0 10px 28px rgba(0, 0, 0, .38); }
.asset-hover-thumb { border-radius: .25rem; border: 1px solid var(--border-subtle); padding: 1px; transition: border-color .15s ease; }
.asset-hover-thumb:hover { border-color: var(--border-strong); }
.asset-hover-thumb--on { border-color: rgba(34, 211, 238, .7); }
.asset-hover-thumb img { display: block; height: 3rem; width: 3rem; border-radius: .1875rem; object-fit: cover; }
</style>

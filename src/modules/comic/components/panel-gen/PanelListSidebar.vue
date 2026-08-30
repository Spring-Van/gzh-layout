<template>
  <div class="flex h-full flex-col overflow-hidden">
    <div class="flex shrink-0 items-center justify-between border-b border-border-subtle px-3 py-2.5">
      <p class="text-xs text-text-secondary">分镜 · {{ items.length }}</p>
      <p class="text-[11px] text-text-muted">{{ describedCount }} 已描述 · {{ completedCount }} 已成图</p>
    </div>

    <div class="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
      <button
        v-for="(item, index) in items"
        :key="item.panel.id"
        class="mb-1 flex w-full items-start gap-2 rounded-lg border p-2 text-left transition-colors"
        :class="index === currentIndex ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-transparent hover:bg-app-bg'"
        @click="$emit('select', index)"
      >
        <span class="w-5 shrink-0 pt-0.5 text-center text-[11px] font-medium" :class="index === currentIndex ? 'text-cyan-400' : 'text-text-muted'">{{ item.panel.order }}</span>

        <span class="relative h-11 w-11 shrink-0 overflow-hidden rounded-md border border-border-subtle bg-app-bg">
          <img v-if="item.artwork?.selectedImageId" :src="item.artwork.selectedImageId" class="h-full w-full object-cover" :alt="`分镜${item.panel.order}成图`" />
          <ImageIcon v-else class="h-full w-full p-2.5 text-text-muted/40" :size="18" />
          <span v-if="item.artwork?.genStatus === 'running'" class="absolute inset-0 flex items-center justify-center bg-black/50"><LoaderCircle :size="15" class="animate-spin text-cyan-300" /></span>
        </span>

        <span class="min-w-0 flex-1">
          <span class="line-clamp-2 text-xs leading-4 text-text-primary">{{ item.panel.content }}</span>
          <span class="mt-1 flex items-center gap-1.5">
            <span class="status-dot" :class="dotClass(item)" :title="statusLabel(item)" />
            <span class="text-[10px]" :class="statusTextClass(item)">{{ statusLabel(item) }}</span>
          </span>
        </span>
      </button>

      <p v-if="!items.length" class="px-2 py-6 text-center text-xs text-text-muted">本章暂无分镜</p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 分镜生图工作台左栏：分镜列表 + 推导/成图状态角标。
 */
import { computed } from 'vue'
import { ImageIcon, LoaderCircle } from 'lucide-vue-next'
import type { LongProjectPanelArtwork, LongProjectStoryboardPanel } from '@comic/types'

export interface PanelListItem {
  panel: LongProjectStoryboardPanel
  artwork?: LongProjectPanelArtwork
}

const props = defineProps<{ items: PanelListItem[]; currentIndex: number }>()

defineEmits<{ (e: 'select', index: number): void }>()

const describedCount = computed(() => props.items.filter((item) => item.artwork?.imagePrompt?.trim()).length)
const completedCount = computed(() => props.items.filter((item) => item.artwork?.selectedImageId).length)

function dotClass(item: PanelListItem): string {
  const status = item.artwork?.promptStatus
  const gen = item.artwork?.genStatus
  if (gen === 'running') return 'bg-cyan-400 animate-pulse'
  if (status === 'running') return 'bg-cyan-400 animate-pulse'
  if (gen === 'failed') return 'bg-red-400'
  if (status === 'failed') return 'bg-red-400'
  if (status === 'stale') return 'bg-amber-400'
  if (item.artwork?.selectedImageId) return 'bg-emerald-400'
  if (item.artwork?.imagePrompt?.trim()) return 'bg-violet-400'
  return 'bg-zinc-600'
}

function statusLabel(item: PanelListItem): string {
  const artwork = item.artwork
  if (!artwork) return '未推导'
  if (artwork.genStatus === 'running') return '生图中'
  if (artwork.promptStatus === 'running') return '推导中'
  if (artwork.promptStatus === 'failed') return '推导失败'
  if (artwork.genStatus === 'failed') return '生图失败'
  if (artwork.promptStatus === 'stale') return '描述过期'
  if (artwork.selectedImageId) return '已成图'
  if (artwork.imagePrompt?.trim()) return '已描述'
  return '未推导'
}

function statusTextClass(item: PanelListItem): string {
  const label = statusLabel(item)
  if (label === '已成图') return 'text-emerald-400'
  if (label === '已描述') return 'text-violet-300'
  if (label === '描述过期') return 'text-amber-300'
  if (label === '推导失败' || label === '生图失败') return 'text-red-400'
  if (label === '推导中' || label === '生图中') return 'text-cyan-400'
  return 'text-text-muted'
}
</script>

<style scoped>
.status-dot { display: inline-block; width: 0.375rem; height: 0.375rem; flex-shrink: 0; border-radius: 9999px; }
</style>

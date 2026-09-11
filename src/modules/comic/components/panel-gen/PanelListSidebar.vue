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
        class="mb-1.5 flex w-full cursor-context-menu items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors"
        :class="index === currentIndex ? 'border border-cyan-500/20 bg-cyan-500/10' : 'border-border-subtle bg-surface hover:border-border-default hover:bg-elevated'"
        @click="$emit('select', index)"
        @contextmenu.prevent="$emit('contextmenu', { event: $event, panel: item.panel })"
      >
        <!-- 缩略图（同短篇页面列表：生成中转圈 / 成图 / 占位） -->
        <span class="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg border border-border-subtle bg-surface">
          <img v-if="item.artwork?.selectedImageId" :src="item.artwork.selectedImageId" class="h-full w-full object-cover" loading="lazy" :alt="`分镜${item.panel.order}成图`" />
          <ImageIcon v-else class="h-full w-full p-2.5 text-text-muted/40" :size="18" />
          <span v-if="item.artwork?.genStatus === 'running'" class="absolute inset-0 flex items-center justify-center bg-black/50"><LoaderCircle :size="15" class="animate-spin text-cyan-300" /></span>
          <span v-if="index === currentIndex" class="absolute right-0 top-0 rounded-bl bg-cyan-500 px-1 py-px text-[7px] font-medium leading-none text-white">当前</span>
        </span>

        <!-- 标题 + 状态 + 一行文字预览（找页用） -->
        <span class="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <span class="flex items-center gap-1.5">
            <span class="shrink-0 text-xs font-medium text-text-primary">P{{ String(item.panel.order).padStart(2, '0') }}</span>
            <span class="status-dot" :class="dotClass(item)" />
            <span class="min-w-0 truncate text-[11px]" :class="statusTextClass(item)">{{ statusLabel(item) }}</span>
          </span>
          <span class="truncate text-[11px] text-text-secondary" :title="previewText(item)">{{ cellLabel(item) }}</span>
        </span>
      </button>

      <p v-if="!items.length" class="px-2 py-6 text-center text-xs text-text-muted">本章暂无分镜</p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 分镜生图工作台左栏：分镜列表（缩略图 + `P01` 页号 + 状态 + 格数标签）。
 * 第二行显示本页格数（页头声明的「单格 / 双格 / 三格 / 四格」，旧数据按实际格数推导），
 * 不再占位显示内容描述——内容预览收进 hover tooltip 备查。
 * 右键分镜触发 contextmenu 事件（合并/拆分/复制/删除等操作由父级菜单承载）。
 */
import { computed } from 'vue'
import { ImageIcon, LoaderCircle } from 'lucide-vue-next'
import { resolvePanelCellLabel } from '@comic/services/storyboardService'
import type { LongProjectPanelArtwork, LongProjectStoryboardPanel } from '@comic/types'

export interface PanelListItem {
  panel: LongProjectStoryboardPanel
  artwork?: LongProjectPanelArtwork
}

const props = defineProps<{ items: PanelListItem[]; currentIndex: number }>()

defineEmits<{
  (e: 'select', index: number): void
  (e: 'contextmenu', payload: { event: MouseEvent; panel: LongProjectStoryboardPanel }): void
}>()

const describedCount = computed(() => props.items.filter((item) => item.artwork?.imagePrompt?.trim()).length)
const completedCount = computed(() => props.items.filter((item) => item.artwork?.selectedImageId).length)

/** 内容预览（仅作 hover tooltip）：优先本页第一句台词（带说话人），无台词取首格画面；空页给占位文案。 */
function previewText(item: PanelListItem): string {
  const panel = item.panel
  const cells = panel.cells ?? []
  const said = cells.find((cell) => cell.dialogue?.trim())
  if (said) return `${said.speaker ? `${said.speaker}：` : ''}${said.dialogue!.trim()}`
  if (!cells.length && panel.dialogue?.trim()) return panel.dialogue.trim().split('\n')[0]
  const content = cells.find((cell) => cell.content?.trim())?.content ?? panel.content
  return (content ?? '').trim().split('\n')[0] || '（空白页）'
}

/** 第二行：本页格数标签（解析页头「· 双格」；旧数据按实际格数推导）。 */
function cellLabel(item: PanelListItem): string {
  return resolvePanelCellLabel(item.panel)
}

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

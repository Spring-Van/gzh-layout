<template>
  <div class="flex h-full flex-col overflow-hidden">
    <div class="flex shrink-0 items-center justify-between border-b border-border-subtle px-3 py-2.5">
      <p class="text-xs font-medium text-text-primary">分镜 {{ panel.order }} 成图</p>
      <div class="flex items-center gap-2">
        <span v-if="isGenerating" class="flex items-center gap-1 text-[11px] text-cyan-400"><LoaderCircle :size="12" class="animate-spin" />生成中</span>
        <button
          class="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-300 transition-colors hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="isGenerating || !readyToGenerate"
          :title="!readyToGenerate ? '请先推导或编辑画面描述' : '使用画面描述 + 资产参考图生图'"
          @click="$emit('generate')"
        >
          {{ images.length ? '重新生成' : '生成图片' }}
        </button>
      </div>
    </div>

    <!-- 当前成图：显示哪张就用哪张（导出即此张）；多张时悬停左右切换，悬停右下角删除（弹窗确认） -->
    <div class="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3">
      <div v-if="currentImage" class="group relative flex h-full max-h-full w-full items-center justify-center">
        <img
          :src="currentImage"
          class="max-h-full max-w-full cursor-zoom-in rounded-lg border border-border-subtle object-contain"
          :alt="`分镜${panel.order}成图`"
          @click="$emit('preview', { images: images, index: currentIndex })"
        />

        <!-- 左右切换（仅多张时显示）：切到哪张就用哪张 -->
        <template v-if="images.length > 1">
          <button
            class="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
            title="上一张"
            @click="$emit('switch-image', -1)"
          ><ChevronLeft :size="18" /></button>
          <button
            class="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
            title="下一张"
            @click="$emit('switch-image', 1)"
          ><ChevronRight :size="18" /></button>
          <!-- 序号角标 -->
          <span class="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">{{ currentIndex + 1 }}/{{ images.length }}</span>
        </template>

        <!-- 删除当前图（右下角） -->
        <button
          class="absolute bottom-2 right-2 hidden h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-red-500 group-hover:flex"
          title="删除这张图"
          @click="deleteConfirmVisible = true"
        ><Trash2 :size="14" /></button>
      </div>
      <div v-else class="flex flex-col items-center text-center">
        <ImageIcon v-if="!isGenerating" :size="30" class="mb-3 text-text-muted/40" />
        <LoaderCircle v-else :size="28" class="mb-3 animate-spin text-cyan-400" />
        <p class="text-xs text-text-secondary">{{ isGenerating ? '正在生成分镜画面...' : '尚未生成成图' }}</p>
        <p v-if="!isGenerating" class="mt-1 text-[11px] text-text-muted">生图时会自动携带绑定资产的参考图</p>
      </div>
    </div>

    <!-- 删除成图确认 -->
    <ConfirmDialog
      v-model="deleteConfirmVisible"
      title="删除这张成图"
      :content="`将删除分镜 ${panel.order} 当前显示的成图，删除后无法恢复，是否确认？`"
      confirm-text="确认删除"
      @confirm="$emit('delete-image')"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 分镜生图工作台中栏：当前分镜成图预览。
 *
 * 2026-09-19 交互定稿：**没有「候选图 / 点击采纳」环节** —— 显示哪张就用哪张，
 * 导出导的就是当前显示的这张（`selectedImageId`）。同一分镜生成了多张时：
 * 悬停主图出现左右切换箭头，切到哪张立即生效；右下角删除，带确认弹窗。
 */
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight, ImageIcon, LoaderCircle, Trash2 } from 'lucide-vue-next'
import ConfirmDialog from '@comic/components/ConfirmDialog.vue'
import type { LongProjectPanelArtwork, LongProjectStoryboardPanel } from '@comic/types'

const props = defineProps<{
  panel: LongProjectStoryboardPanel
  artwork?: LongProjectPanelArtwork
  isGenerating?: boolean
  /**
   * 当前选中的候选提示词条是否已有正文。
   * 不传则回落到 `artwork.imagePrompt`（第 1 条）—— 传了才与「选中哪条发哪条」一致。
   */
  promptReady?: boolean
}>()

defineEmits<{
  (e: 'generate'): void
  /** 切换成图：参数为方向（-1 上一张 / 1 下一张），落库由父级处理。 */
  (e: 'switch-image', direction: -1 | 1): void
  /** 删除当前显示的成图（确认弹窗已在本组件内通过）。 */
  (e: 'delete-image'): void
  (e: 'preview', payload: { images: string[]; index: number }): void
}>()

/** 本镜全部生成图（按生成顺序）。 */
const images = computed(() => props.artwork?.generatedImageIds ?? [])

/** 能否生图：以当前选中提示词条的正文为准（未传时回落到第 1 条）。 */
const readyToGenerate = computed(() => props.promptReady ?? Boolean(props.artwork?.imagePrompt?.trim()))

/** 当前显示的下标：以 selectedImageId 定位，悬空（被删/未选）时回落第一张。 */
const currentIndex = computed(() => {
  const list = images.value
  if (!list.length) return 0
  const index = props.artwork?.selectedImageId ? list.indexOf(props.artwork.selectedImageId) : -1
  return index >= 0 ? index : 0
})

const currentImage = computed(() => images.value[currentIndex.value])

/** 删除确认弹窗（本组件内确认后上抛 delete-image）。 */
const deleteConfirmVisible = ref(false)
</script>

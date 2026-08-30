<template>
  <div class="flex h-full flex-col overflow-hidden">
    <div class="flex shrink-0 items-center justify-between border-b border-border-subtle px-3 py-2.5">
      <p class="text-xs font-medium text-text-primary">分镜 {{ panel.order }} 成图</p>
      <div class="flex items-center gap-2">
        <span v-if="isGenerating" class="flex items-center gap-1 text-[11px] text-cyan-400"><LoaderCircle :size="12" class="animate-spin" />生成中</span>
        <button
          class="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-300 transition-colors hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="isGenerating || !artwork?.imagePrompt?.trim()"
          :title="!artwork?.imagePrompt?.trim() ? '请先推导或编辑画面描述' : '使用画面描述 + 资产参考图生图'"
          @click="$emit('generate')"
        >
          {{ artwork?.selectedImageId ? '重新生成' : '生成图片' }}
        </button>
      </div>
    </div>

    <!-- 当前成图 -->
    <div class="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3">
      <div v-if="artwork?.selectedImageId" class="flex h-full w-full items-center justify-center">
        <img
          :src="artwork.selectedImageId"
          class="max-h-full max-w-full cursor-zoom-in rounded-lg border border-border-subtle object-contain"
          :alt="`分镜${panel.order}成图`"
          @click="$emit('preview', { images: [artwork.selectedImageId!], index: 0 })"
        />
      </div>
      <div v-else class="flex flex-col items-center text-center">
        <ImageIcon v-if="!isGenerating" :size="30" class="mb-3 text-text-muted/40" />
        <LoaderCircle v-else :size="28" class="mb-3 animate-spin text-cyan-400" />
        <p class="text-xs text-text-secondary">{{ isGenerating ? '正在生成分镜画面...' : '尚未生成成图' }}</p>
        <p v-if="!isGenerating" class="mt-1 text-[11px] text-text-muted">生图时会自动携带绑定资产的参考图</p>
      </div>
    </div>

    <!-- 生成候选暂存区 -->
    <div v-if="candidateImages.length" class="shrink-0 border-t border-border-subtle p-3">
      <p class="mb-2 text-[11px] text-text-secondary">候选图（{{ candidateImages.length }}）· 点击采纳</p>
      <div class="flex flex-wrap gap-2">
        <div v-for="(image, index) in candidateImages" :key="image + index" class="group relative">
          <img
            :src="image"
            class="h-16 w-16 cursor-pointer rounded-md border border-border-subtle object-cover transition-colors hover:border-cyan-400/60"
            :class="image === artwork?.selectedImageId ? 'border-cyan-400 ring-1 ring-cyan-400/50' : ''"
            :alt="`候选图 ${index + 1}`"
            @click="$emit('adopt', image)"
          />
          <button
            class="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
            title="删除候选图"
            @click.stop="$emit('remove-gen-image', index)"
          ><X :size="10" /></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 分镜生图工作台中栏：当前分镜成图预览 + 候选图暂存区（点击采纳）。
 */
import { computed } from 'vue'
import { ImageIcon, LoaderCircle, X } from 'lucide-vue-next'
import type { LongProjectPanelArtwork, LongProjectStoryboardPanel } from '@comic/types'

const props = defineProps<{
  panel: LongProjectStoryboardPanel
  artwork?: LongProjectPanelArtwork
  isGenerating?: boolean
}>()

defineEmits<{
  (e: 'generate'): void
  (e: 'adopt', image: string): void
  (e: 'remove-gen-image', index: number): void
  (e: 'preview', payload: { images: string[]; index: number }): void
}>()

const candidateImages = computed(() => props.artwork?.generatedImageIds ?? [])
</script>

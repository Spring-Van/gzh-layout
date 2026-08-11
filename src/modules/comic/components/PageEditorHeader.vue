<template>
  <header class="shrink-0 h-14 px-6 border-b border-border-subtle flex items-center gap-4">
    <button class="nav-button" @click="$emit('back')"><ArrowLeft class="w-4 h-4" />上一步</button>
    <div class="w-px h-4 bg-border-subtle" />
    <button class="nav-button" @click="$emit('project')"><FolderOpen class="w-4 h-4" />项目</button>
    <div class="w-px h-4 bg-border-subtle" />
    <h1 class="text-sm font-semibold text-text-primary leading-7 truncate">{{ projectName }}</h1>
    <div class="flex-1" />
    <div class="flex items-center gap-3">
      <button class="action-button" @click="$emit('config')"><SlidersHorizontal class="w-3.5 h-3.5" />绘图配置</button>
      <button class="action-button action-button--primary" :disabled="batchRunning" @click="$emit('batch')">
        <LoaderCircle v-if="batchRunning" class="w-3.5 h-3.5 animate-spin" />
        <Zap v-else class="w-3.5 h-3.5" />
        {{ batchRunning ? `生成中 ${batchCompleted}/${batchTotal}` : '批量生成' }}
      </button>
      <button v-if="batchRunning" class="w-7 h-7 inline-flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded-lg" title="取消批量生成" @click="$emit('cancelBatch')"><X class="w-3.5 h-3.5" /></button>
      <button class="action-button action-button--sync" @click="$emit('sync')"><UploadCloud class="w-3.5 h-3.5" />同步至公众号</button>
      <button class="action-button action-button--export" @click="$emit('export')"><Download class="w-3.5 h-3.5" />导出发布</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ArrowLeft, Download, FolderOpen, LoaderCircle, SlidersHorizontal, UploadCloud, X, Zap } from 'lucide-vue-next';

withDefaults(defineProps<{ projectName: string; batchRunning?: boolean; batchCompleted?: number; batchTotal?: number }>(), {
  batchRunning: false,
  batchCompleted: 0,
  batchTotal: 0,
});
defineEmits<{
  back: [];
  project: [];
  config: [];
  batch: [];
  cancelBatch: [];
  sync: [];
  export: [];
}>();
</script>

<style scoped>
.nav-button,
.action-button {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--text-secondary);
  font-size: 0.75rem;
  transition: color 150ms, background-color 150ms, border-color 150ms;
}
.nav-button:hover { color: var(--text-primary); }
.action-button {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  background: var(--bg-surface);
}
.action-button:hover { color: var(--text-primary); background: var(--bg-elevated); }
.action-button:disabled { opacity: .75; cursor: wait; }
.action-button--primary { color: white; border-color: transparent; background: linear-gradient(90deg, rgb(6 182 212), rgb(37 99 235)); }
.action-button--sync { color: rgb(125 211 252); border-color: rgb(14 165 233 / .3); background: rgb(14 165 233 / .1); }
.action-button--export { color: rgb(110 231 183); border-color: rgb(16 185 129 / .3); background: rgb(16 185 129 / .1); }
</style>

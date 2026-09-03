<template>
  <article class="markdown-view custom-scrollbar" v-html="html"></article>
</template>

<script setup lang="ts">
/**
 * Markdown 只读渲染视图：原文分析 / 漫画剧本 / 资产信息等 AI 产物的统一预览组件。
 */
import { computed } from 'vue'
import { renderMarkdown } from '@comic/utils/markdown'

const props = defineProps<{ content: string; emptyText?: string }>()

const html = computed(() => renderMarkdown(props.content ?? '', props.emptyText ?? '暂无内容'))
</script>

<style scoped>
.markdown-view{min-height:100%;padding:1rem 1.25rem;color:var(--text-primary);font-size:.8125rem;line-height:1.9}
.markdown-view :deep(h1),.markdown-view :deep(h2),.markdown-view :deep(h3){margin:1rem 0 .45rem;font-weight:600}
.markdown-view :deep(h3){color:#67e8f9}
.markdown-view :deep(p){margin:.35rem 0;white-space:pre-wrap}
.markdown-view :deep(ul){margin:.4rem 0;padding-left:1.25rem;list-style:disc}
.markdown-view :deep(li){margin:.2rem 0}
.markdown-view :deep(.empty-preview){color:var(--text-muted)}
</style>

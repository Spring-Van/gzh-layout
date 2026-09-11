<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm" @click.self="emit('close')">
      <section class="flex h-[min(720px,calc(100vh-3rem))] w-[min(860px,100%)] flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface shadow-2xl">
        <header class="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-4">
          <div><h2 class="text-base font-semibold text-text-primary">确认发送内容</h2><p class="mt-1 text-xs text-text-muted">可在本次执行前修改，修改不会覆盖系统提示词模板。</p></div>
          <button class="icon-button" title="关闭" @click="emit('close')"><X :size="18" /></button>
        </header>
        <div class="min-h-0 flex-1 p-5">
          <textarea
            class="custom-scrollbar h-full w-full resize-none rounded-md border border-border-subtle bg-app-bg p-4 font-mono text-xs leading-6 text-text-primary outline-none focus:border-cyan-500/50"
            :value="content"
            aria-label="最终发送提示词"
            @input="emit('update:content', ($event.target as HTMLTextAreaElement).value)"
          />
        </div>
        <footer class="flex shrink-0 items-center justify-between border-t border-border-subtle px-5 py-3">
          <p class="text-xs text-text-muted">{{ content.length.toLocaleString() }} 个字符</p>
          <div class="flex items-center gap-3">
            <button class="secondary-button" title="复制最终提示词，可粘贴到外部 AI 生成后手动导入结果" @click="copyContent"><Copy :size="14" />复制提示词</button>
            <button class="secondary-button" @click="emit('close')">取消</button>
            <button class="primary-button h-9 px-4 text-xs" :disabled="!content.trim()" @click="emit('confirm', content)">确认发送<ArrowRight :size="15" /></button>
          </div>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 发送前确认弹窗：调用大模型前展示并允许修改最终发送的提示词。
 * 抽取自长篇项目主页面，供原文分析 / 剧本 / 分镜 / 资产提取等全部 AI 环节复用。
 * 「复制提示词」：外部 AI 代跑工作流——复制最终提示词到外部生成，结果经「手动导入」写回。
 */
import { ArrowRight, Copy, X } from 'lucide-vue-next'
import { useToast } from '@comic/composables/useToast'

const props = defineProps<{ visible: boolean; content: string }>()
const emit = defineEmits<{
  (e: 'update:content', value: string): void
  (e: 'confirm', content: string): void
  (e: 'close'): void
}>()

const toast = useToast()

/** 复制当前提示词全文（弹窗保持打开，可继续编辑再复制）。 */
async function copyContent() {
  try {
    await navigator.clipboard.writeText(props.content)
    toast.success('已复制提示词，可粘贴到外部 AI')
  } catch {
    toast.error('复制失败，请手动全选复制')
  }
}
</script>

<style scoped>
.icon-button{display:flex;width:2rem;height:2rem;flex-shrink:0;align-items:center;justify-content:center;border-radius:.5rem;color:var(--text-secondary);transition:color .15s ease,background-color .15s ease}
.icon-button:hover{color:var(--text-primary);background:var(--bg-elevated)}
.primary-button{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border-radius:.5rem;background:#06b6d4;font-weight:500;color:#020617;transition:background-color .15s ease}
.primary-button:hover{background:#22d3ee}
.primary-button:disabled{cursor:not-allowed;opacity:.4}
.secondary-button{display:inline-flex;align-items:center;gap:.4rem;border-radius:.5rem;border:1px solid var(--border-subtle);padding:.5rem .9rem;font-size:.75rem;color:var(--text-secondary);transition:color .15s ease,border-color .15s ease}
.secondary-button:hover{color:var(--text-primary);border-color:var(--border-strong)}
</style>

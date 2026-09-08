<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm" @click.self="close">
      <section class="flex h-[min(720px,calc(100vh-3rem))] w-[min(860px,100%)] flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface shadow-2xl">
        <header class="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-4">
          <div>
            <h2 class="text-base font-semibold text-text-primary">{{ title }}</h2>
            <p class="mt-1 text-xs text-text-muted">把外部 AI 生成的结果粘贴进来，与内置大模型走相同的解析与存储流程。</p>
          </div>
          <button class="icon-button" title="关闭" @click="close"><X :size="18" /></button>
        </header>

        <div class="min-h-0 flex-1 p-5">
          <textarea
            class="custom-scrollbar h-full w-full resize-none rounded-md border border-border-subtle bg-app-bg p-4 font-mono text-xs leading-6 text-text-primary outline-none focus:border-cyan-500/50"
            v-model="content"
            :placeholder="placeholder"
            aria-label="粘贴导入内容"
          />
        </div>

        <!-- 解析预览结果（仅带 parse 的环节） -->
        <div v-if="parseError" class="shrink-0 border-t border-red-400/30 bg-red-500/10 px-5 py-2.5 text-xs text-red-500">
          {{ parseError }}
        </div>
        <div v-else-if="preview && preview.length" class="shrink-0 border-t border-border-subtle bg-app-bg px-5 py-2.5">
          <p class="mb-1.5 text-xs font-medium text-text-primary">{{ previewTitle }}：</p>
          <ul class="custom-scrollbar max-h-32 space-y-0.5 overflow-y-auto">
            <li v-for="(item, index) in preview" :key="index" class="flex items-center gap-2 text-xs text-text-secondary">
              <span class="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-cyan-500/15 text-[10px] text-cyan-400">{{ index + 1 }}</span>
              <span class="truncate">{{ item }}</span>
            </li>
          </ul>
        </div>

        <footer class="flex shrink-0 items-center justify-between border-t border-border-subtle px-5 py-3">
          <p class="text-xs text-text-muted">{{ content.length.toLocaleString() }} 个字符</p>
          <div class="flex items-center gap-3">
            <button v-if="parse" class="secondary-button" :disabled="!content.trim()" @click="runParse">解析预览</button>
            <button class="secondary-button" @click="close">取消</button>
            <button
              class="primary-button h-9 px-4 text-xs"
              :disabled="!canConfirm"
              @click="confirm"
            >{{ parse ? '确认导入' : '保存' }}<ArrowRight :size="15" /></button>
          </div>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 手动导入结果弹窗：外部 AI 代跑工作流的结果写回入口。
 * 两类形态：
 * - 无 parse（原文分析/漫画剧本）：粘贴后直接「保存」。
 * - 有 parse（分镜/资产提取）：先「解析预览」展示结构化摘要，解析失败红字提示且不可确认导入。
 * 确认后 emit('confirm', content) 由调用方走落库逻辑（与 LLM 路径共用）。
 */
import { computed, ref, watch } from 'vue'
import { ArrowRight, X } from 'lucide-vue-next'

const props = defineProps<{
  visible: boolean
  title: string
  placeholder?: string
  /** 可选解析函数：返回标题与摘要列表；失败抛错（消息展示为红字）。 */
  parse?: (content: string) => { title: string; items: string[] }
}>()

const emit = defineEmits<{
  (e: 'confirm', content: string): void
  (e: 'close'): void
}>()

const content = ref('')
const parseError = ref('')
const preview = ref<string[]>([])
const previewTitle = ref('')

/** 解析预览标题（解析函数通过抛错前暂存，或由调用方通过 parse 返回值约定——这里用通用「解析结果」）。 */
const canConfirm = computed(() => {
  if (!content.value.trim()) return false
  // 带解析的环节：必须成功解析出至少 1 项才可导入
  if (props.parse) return !parseError.value && preview.value.length > 0
  return true
})

watch(() => props.visible, (visible) => {
  if (visible) {
    content.value = ''
    parseError.value = ''
    preview.value = []
  }
})

/** 解析预览：调用 parse 解析内容，成功则展示标题与摘要列表。 */
function runParse() {
  parseError.value = ''
  preview.value = []
  previewTitle.value = ''
  if (!props.parse || !content.value.trim()) return
  try {
    const result = props.parse(content.value)
    previewTitle.value = result.title
    preview.value = result.items
  } catch (error) {
    parseError.value = error instanceof Error ? error.message : '解析失败，请检查内容格式。'
  }
}

function confirm() {
  if (!canConfirm.value) return
  emit('confirm', content.value)
}

function close() {
  emit('close')
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
.secondary-button:disabled{cursor:not-allowed;opacity:.4}
</style>

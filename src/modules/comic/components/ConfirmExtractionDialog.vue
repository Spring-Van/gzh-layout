<template>
  <Teleport to="body">
    <!-- z-[130]：资产全屏抽屉是 z-[101]，必须用任意值语法（Tailwind 默认没有 z-130 这个档） -->
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4"
      @click.self="close"
    >
      <div class="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface">
        <div class="flex shrink-0 items-center gap-2 border-b border-border-subtle px-4 py-3">
          <AlertTriangle :size="15" class="shrink-0 text-amber-400" />
          <h3 class="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">确认本章资产</h3>
          <button class="shrink-0 text-text-muted transition-colors hover:text-text-primary" title="关闭" @click="close">
            <X :size="15" />
          </button>
        </div>

        <div class="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3 text-xs leading-relaxed text-text-secondary">
          <p>
            以本次提取结果为准：命中的同名视觉状态会
            <span class="text-text-primary">复用原状态</span>
            （已生成的参考图、生成图与分镜绑定保留），其余字段按本次重写。
          </p>

          <div v-if="items.length" class="mt-3">
            <p class="text-text-primary">本次将删除 {{ items.length }} 个本次未出现的旧视觉状态：</p>
            <ul class="mt-1.5 space-y-1">
              <li
                v-for="item in items"
                :key="item.key"
                class="rounded-md border border-border-subtle bg-app-bg px-2 py-1.5"
              >
                <span class="text-text-primary">{{ item.assetName }} · {{ item.variantName }}</span>
                <span v-if="item.imageCount" class="ml-1 text-text-muted">（{{ item.imageCount }} 张图）</span>
                <span v-if="item.chapters.length" class="mt-0.5 block text-amber-700 dark:text-amber-300">
                  仍被「{{ item.chapters.join('」「') }}」引用 —— 那些章节的图片卡与分镜绑定会一并失效
                </span>
              </li>
            </ul>
          </div>
          <p v-else class="mt-3 text-text-muted">本次没有需要删除的旧视觉状态，确认后按本次结果重写。</p>

          <p v-if="sharedCount" class="mt-3 text-amber-700 dark:text-amber-300">
            共 {{ sharedCount }} 个状态仍被其他章节引用。覆盖是严格全删、不做跨章保护，建议先核对上面的清单。
          </p>
        </div>

        <div class="flex shrink-0 items-center justify-end gap-2 border-t border-border-subtle px-4 py-3">
          <button class="dialog-btn" @click="close">取消</button>
          <button class="dialog-btn-primary" @click="emit('confirm')">确认覆盖</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 确认覆盖本章资产前的明细弹窗。
 * 覆盖是唯一行为且严格全删（不做跨章保护），所以必须在执行前逐条列出「资产 · 状态」、
 * 引用它的其他章节与图片数 —— 这些状态上的参考图/生成图会一并消失。
 */
import { computed } from 'vue'
import { AlertTriangle, X } from 'lucide-vue-next'

export interface ExtractionDropItem {
  key: string
  assetName: string
  variantName: string
  /** 引用该状态的其他章节名（不含本章）；非空即意味着覆盖会牵连别的章。 */
  chapters: string[]
  imageCount: number
}

const props = defineProps<{
  modelValue: boolean
  items: ExtractionDropItem[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
}>()

const sharedCount = computed(() => props.items.filter((item) => item.chapters.length).length)

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.dialog-btn { border-radius: .5rem; border: 1px solid var(--border-default); padding: .45rem .9rem; font-size: .75rem; font-weight: 500; color: var(--text-secondary); transition: color .15s ease, border-color .15s ease; }
.dialog-btn:hover { color: var(--text-primary); border-color: var(--border-strong); }
.dialog-btn-primary { border-radius: .5rem; background: #06b6d4; padding: .45rem .9rem; font-size: .75rem; font-weight: 500; color: #020617; transition: background-color .15s ease; }
.dialog-btn-primary:hover { background: #22d3ee; }
</style>

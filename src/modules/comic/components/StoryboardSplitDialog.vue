<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div
        v-if="modelValue && panel"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        @click.self="close"
      >
        <div class="confirm-card flex max-h-[85vh] w-[600px] max-w-[90vw] flex-col rounded-xl border border-border-subtle bg-surface p-5 shadow-2xl shadow-black/40">
          <!-- 标题 -->
          <div class="flex shrink-0 items-center justify-between">
            <h3 class="text-base font-semibold text-text-primary">{{ titleText }}</h3>
            <button class="rounded-md p-1 text-text-muted transition-colors hover:text-text-primary" @click="close"><X :size="16" /></button>
          </div>
          <p class="mt-1 shrink-0 text-xs text-text-muted">{{ hint }}</p>

          <!-- 内容编辑区 -->
          <textarea
            v-model="draft"
            class="custom-scrollbar mt-3 min-h-0 flex-1 resize-none rounded-lg border border-border-subtle bg-app-bg p-3 text-sm leading-7 text-text-primary outline-none focus:border-cyan-500/50"
            placeholder="编辑分镜画面内容，插入空行作为拆分点..."
          />

          <!-- 拆分结果实时预览 -->
          <div class="mt-3 max-h-44 shrink-0 overflow-y-auto custom-scrollbar">
            <p class="mb-1.5 text-xs font-medium text-text-secondary">拆分预览 · {{ parts.length }} 个分镜</p>
            <div
              v-for="(part, index) in parts"
              :key="index"
              class="mb-1.5 rounded-lg border border-border-subtle bg-app-bg p-2.5"
            >
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium text-cyan-400">{{ partLabel(index) }}</span>
                <span v-if="keepsParent(index)" class="rounded bg-amber-400/10 px-1 py-0.5 text-[10px] text-amber-300">保留成图（描述需重推）</span>
                <span v-else class="rounded bg-app-bg px-1 py-0.5 text-[10px] text-text-muted">待重新生图</span>
              </div>
              <p class="mt-1 text-xs leading-5 text-text-primary">{{ part }}</p>
            </div>
            <p v-if="!parts.length" class="py-3 text-center text-xs text-text-muted">内容为空，无法拆分</p>
          </div>

          <!-- 操作按钮 -->
          <div class="mt-4 flex shrink-0 justify-end gap-2">
            <button class="rounded-lg border border-border-subtle px-4 py-2 text-sm text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary" @click="close">取消</button>
            <button
              class="rounded-lg bg-cyan-500/90 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!canConfirm"
              :title="confirmTitle"
              @click="confirm"
            >确认拆分</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 分镜拆分弹窗：编辑分镜画面内容，插入空行作为拆分点，实时预览拆分结果。
 * 三种模式：
 * - multi：原地拆成 N 段（第一段继承父分镜 ID，保留成图）；
 * - up：拆成 2 段，第一段作为新分镜插入当前分镜上方，当前分镜保留第二段（继承成图）；
 * - down：拆成 2 段，第二段作为新分镜插入当前分镜下方，当前分镜保留第一段（继承成图）。
 */
import { computed, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import type { LongProjectStoryboardPanel } from '@comic/types'

const props = defineProps<{
  modelValue: boolean
  /** 待拆分的分镜 */
  panel?: LongProjectStoryboardPanel
  /** 拆分模式：multi 原地拆多段；up 新镜插入上方；down 新镜插入下方 */
  mode?: 'multi' | 'up' | 'down'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  /** 确认拆分；payload 为拆分后的内容段数组 */
  (e: 'confirm', parts: string[]): void
}>()

const draft = ref('')
const mode = computed(() => props.mode ?? 'multi')

watch(() => props.modelValue, (visible) => {
  if (visible) draft.value = props.panel?.content ?? ''
})

/** 按空行（一段或多行空行）拆分为内容段。 */
const parts = computed(() =>
  draft.value.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean),
)

/** up/down 模式必须恰好拆成 2 段；multi 至少 2 段。 */
const canConfirm = computed(() => parts.value.length === 2 || (mode.value === 'multi' && parts.value.length > 2))

const titleText = computed(() => ({ multi: `拆分分镜 ${props.panel?.order ?? ''}`, up: `向上拆分分镜 ${props.panel?.order ?? ''}`, down: `向下拆分分镜 ${props.panel?.order ?? ''}` })[mode.value])
const hint = computed(() =>
  mode.value === 'multi'
    ? '在要拆开的位置插入空行（可多处），下方实时预览拆分结果。'
    : '拆成 2 段：插入一个空行，新分镜将插入到当前分镜的' + (mode.value === 'up' ? '上方' : '下方') + '，当前分镜保留剩余内容与成图。',
)

/** 该段是否保留父分镜 ID（从而继承成图）。 */
function keepsParent(index: number): boolean {
  if (mode.value === 'multi') return index === 0
  if (mode.value === 'up') return index === 1
  return index === 0
}

/** 预览标签：标注该段成为哪个分镜。 */
function partLabel(index: number): string {
  const order = props.panel?.order ?? 0
  if (mode.value === 'multi') return `新分镜 ${order + index}`
  if (mode.value === 'up') return index === 0 ? `新分镜 ${order}（插入上方）` : `分镜 ${order + 1}（当前）`
  return index === 0 ? `分镜 ${order}（当前）` : `新分镜 ${order + 1}（插入下方）`
}

const confirmTitle = computed(() => {
  if (parts.value.length === 2 || (mode.value === 'multi' && parts.value.length > 2)) {
    return `拆分为 ${parts.value.length} 个分镜`
  }
  return mode.value === 'multi' ? '至少插入一个空行拆成 2 段' : '请插入一个空行拆成 2 段'
})

function close() {
  emit('update:modelValue', false)
}

function confirm() {
  if (!canConfirm.value) return
  emit('confirm', parts.value)
  emit('update:modelValue', false)
}
</script>

<style scoped>
.confirm-enter-active,
.confirm-leave-active {
  transition: opacity 0.18s ease;
}
.confirm-enter-active .confirm-card,
.confirm-leave-active .confirm-card {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}
.confirm-enter-from .confirm-card,
.confirm-leave-to .confirm-card {
  opacity: 0;
  transform: scale(0.96);
}
</style>

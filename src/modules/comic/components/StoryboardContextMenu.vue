<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50" @click="close" @contextmenu.prevent="close" />
    <Transition name="menu">
      <div
        v-if="visible"
        class="fixed z-[60] w-52 rounded-lg border border-border-subtle bg-elevated py-1 text-text-primary shadow-xl shadow-black/40"
        :style="{ left: `${Math.min(x, windowWidth - 216)}px`, top: `${Math.min(y, windowHeight - 300)}px` }"
      >
        <!-- 菜单头：当前分镜摘要 -->
        <div class="border-b border-border-subtle px-3 py-1.5">
          <span class="text-xs font-medium text-cyan-400">分镜 {{ panel.order }}</span>
          <span v-if="panel.shot" class="ml-1.5 text-[11px] text-text-muted">{{ panel.shot }}</span>
        </div>

        <!-- 向上合并：子菜单选择合并条数 -->
        <div class="group relative">
          <button class="menu-item flex w-full items-center justify-between" :disabled="!canMergeUp" :title="!canMergeUp ? '上方没有可合并的分镜' : ''" @mouseenter="activeSub = 'up'" @mouseleave="activeSub = null">
            <span class="flex items-center gap-2"><Merge :size="13" />向上合并</span>
            <ChevronRight :size="12" class="text-text-muted" />
          </button>
          <div v-if="canMergeUp && activeSub === 'up'" class="absolute left-full top-0 ml-1 w-32 rounded-lg border border-border-subtle bg-elevated py-1 shadow-xl shadow-black/40">
            <button
              v-for="count in maxUp"
              :key="count"
              class="menu-item w-full px-3 py-1.5 text-left text-xs text-text-primary"
              @click="emitAction({ action: 'merge-up', count })"
            >与上 {{ count }} 个</button>
          </div>
        </div>

        <!-- 向下合并：子菜单选择合并条数 -->
        <div class="group relative">
          <button class="menu-item flex w-full items-center justify-between" :disabled="!canMergeDown" :title="!canMergeDown ? '下方没有可合并的分镜' : ''" @mouseenter="activeSub = 'down'" @mouseleave="activeSub = null">
            <span class="flex items-center gap-2"><Merge :size="13" class="rotate-180" />向下合并</span>
            <ChevronRight :size="12" class="text-text-muted" />
          </button>
          <div v-if="canMergeDown && activeSub === 'down'" class="absolute left-full top-0 ml-1 w-32 rounded-lg border border-border-subtle bg-elevated py-1 shadow-xl shadow-black/40">
            <button
              v-for="count in maxDown"
              :key="count"
              class="menu-item w-full px-3 py-1.5 text-left text-xs text-text-primary"
              @click="emitAction({ action: 'merge-down', count })"
            >与下 {{ count }} 个</button>
          </div>
        </div>

        <div class="my-1 border-t border-border-subtle" />

        <button class="menu-item w-full text-left" @click="emitAction({ action: 'split' })"><Scissors :size="13" />拆分此分镜…</button>
        <button class="menu-item w-full text-left" :disabled="order <= 1" @click="emitAction({ action: 'split-up' })"><ArrowUpToLine :size="13" />向上拆分…</button>
        <button class="menu-item w-full text-left" :disabled="order >= total" @click="emitAction({ action: 'split-down' })"><ArrowDownToLine :size="13" />向下拆分…</button>

        <div class="my-1 border-t border-border-subtle" />

        <button class="menu-item w-full text-left" @click="emitAction({ action: 'copy' })"><Copy :size="13" />复制分镜内容</button>
        <button class="menu-item w-full text-left" @click="emitAction({ action: 'open-workbench' })"><ExternalLink :size="13" />在生图工作台查看</button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 分镜表格行右键菜单：向上/向下合并（子菜单选条数）、原地拆分/向上拆分/向下拆分、
 * 复制分镜内容、跳转生图工作台。菜单在视口内自动避让边界。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowDownToLine, ArrowUpToLine, ChevronRight, Copy, ExternalLink, Merge, Scissors } from 'lucide-vue-next'
import type { LongProjectStoryboardPanel } from '@comic/types'

/** 菜单动作（向上/向下合并 count = 与相邻分镜合并的个数）。 */
export type StoryboardMenuAction =
  | { action: 'merge-up' | 'merge-down'; count: number }
  | { action: 'split' | 'split-up' | 'split-down' | 'copy' | 'open-workbench' }

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  /** 当前分镜 */
  panel: LongProjectStoryboardPanel
  /** 本章分镜总数 */
  total: number
  /** 合并子菜单最大可选条数 */
  maxMerge?: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'action', payload: StoryboardMenuAction): void
}>()

const activeSub = ref<'up' | 'down' | null>(null)
const windowWidth = ref(window.innerWidth)
const windowHeight = ref(window.innerHeight)
const onResize = () => {
  windowWidth.value = window.innerWidth
  windowHeight.value = window.innerHeight
}
onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))

const maxUp = computed(() => Math.min(props.panel.order - 1, props.maxMerge ?? 3))
const maxDown = computed(() => Math.min(props.total - props.panel.order, props.maxMerge ?? 3))
const canMergeUp = computed(() => maxUp.value > 0)
const canMergeDown = computed(() => maxDown.value > 0)
const order = computed(() => props.panel.order)

function close() {
  activeSub.value = null
  emit('close')
}

function emitAction(payload: StoryboardMenuAction) {
  emit('action', payload)
  close()
}
</script>

<style scoped>
.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;
  color: inherit;
  transition: background-color 0.12s ease;
}
.menu-item:hover:not(:disabled) {
  background: rgba(34, 211, 238, 0.08);
}
.menu-item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.menu-enter-active,
.menu-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
</style>

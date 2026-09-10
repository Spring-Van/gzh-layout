<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50" @click="close" @contextmenu.prevent="close" />
    <Transition name="menu">
      <div
        v-if="visible"
        class="fixed z-[60] w-56 rounded-lg border border-border-subtle bg-elevated py-1 text-text-primary shadow-xl shadow-black/40"
        :style="menuStyle"
      >
        <!-- 页序调整 -->
        <button class="menu-item w-full text-left" :disabled="order <= 1" @click="emitAction({ action: 'move-up' })"><ArrowUp :size="13" />上移一页</button>
        <button class="menu-item w-full text-left" :disabled="order >= total" @click="emitAction({ action: 'move-down' })"><ArrowDown :size="13" />下移一页</button>
        <button class="menu-item w-full text-left" @click="emitAction({ action: 'add-above' })"><Plus :size="13" />在上方新增页</button>
        <button class="menu-item w-full text-left" @click="emitAction({ action: 'add-below' })"><Plus :size="13" />在下方新增页</button>

        <div class="my-1 border-t border-border-subtle" />

        <!-- 合并：行内数字框直接指定合并页数（默认 1，可编辑），点行或回车执行 -->
        <div
          class="menu-item w-full select-none"
          :class="canMergeUp ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'"
          :title="canMergeUp ? '把上方相邻页合并进这一页（点这里或回车执行）' : '上方没有可合并的分镜'"
          @click="runMerge('up')"
        >
          <Merge :size="13" />
          <span class="shrink-0">向上合并</span>
          <input
            v-model.number="upCount"
            class="merge-count"
            type="number"
            min="1"
            :max="Math.max(1, maxUp)"
            :disabled="!canMergeUp"
            aria-label="向上合并页数"
            @click.stop
            @mousedown.stop
            @keydown.enter.stop.prevent="runMerge('up')"
          />
          <span class="shrink-0">个</span>
        </div>
        <div
          class="menu-item w-full select-none"
          :class="canMergeDown ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'"
          :title="canMergeDown ? '把下方相邻页合并进这一页（点这里或回车执行）' : '下方没有可合并的分镜'"
          @click="runMerge('down')"
        >
          <Merge :size="13" class="rotate-180" />
          <span class="shrink-0">向下合并</span>
          <input
            v-model.number="downCount"
            class="merge-count"
            type="number"
            min="1"
            :max="Math.max(1, maxDown)"
            :disabled="!canMergeDown"
            aria-label="向下合并页数"
            @click.stop
            @mousedown.stop
            @keydown.enter.stop.prevent="runMerge('down')"
          />
          <span class="shrink-0">个</span>
        </div>

        <div class="my-1 border-t border-border-subtle" />

        <button class="menu-item w-full text-left" @click="emitAction({ action: 'split' })"><Scissors :size="13" />拆分此分镜…</button>
        <button class="menu-item w-full text-left" :disabled="order <= 1" @click="emitAction({ action: 'split-up' })"><ArrowUpToLine :size="13" />向上拆分…</button>
        <button class="menu-item w-full text-left" :disabled="order >= total" @click="emitAction({ action: 'split-down' })"><ArrowDownToLine :size="13" />向下拆分…</button>

        <div class="my-1 border-t border-border-subtle" />

        <button class="menu-item w-full text-left" @click="emitAction({ action: 'copy' })"><Copy :size="13" />复制分镜内容</button>

        <div class="my-1 border-t border-border-subtle" />

        <button class="menu-item menu-item--danger w-full text-left" :disabled="total <= 1" :title="total <= 1 ? '至少保留一页分镜' : ''" @click="emitAction({ action: 'delete' })"><Trash2 :size="13" />删除这一页</button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 分镜列表行右键菜单（分镜结构操作的唯一入口）：
 * 上移/下移一页、上方/下方新增页、向上/向下合并（行内数字框指定页数）、
 * 原地拆分/向上拆分/向下拆分、复制分镜内容、删除这一页。
 * 菜单始终贴住光标展开：下方空间不足时自动向上翻转，避免被视口底部遮挡。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpToLine, Copy, Merge, Plus, Scissors, Trash2 } from 'lucide-vue-next'
import type { LongProjectStoryboardPanel } from '@comic/types'

/** 菜单动作（向上/向下合并 count = 与相邻分镜合并的个数）。 */
export type StoryboardMenuAction =
  | { action: 'merge-up' | 'merge-down'; count: number }
  | { action: 'move-up' | 'move-down' | 'add-above' | 'add-below' }
  | { action: 'split' | 'split-up' | 'split-down' | 'copy' | 'delete' }

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  /** 当前分镜 */
  panel: LongProjectStoryboardPanel
  /** 本章分镜总数 */
  total: number
  /** 合并最大可选页数 */
  maxMerge?: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'action', payload: StoryboardMenuAction): void
}>()

/** 菜单尺寸估算（px）：宽度与最大高度，用于视口边界避让与上下翻转判定。 */
const MENU_WIDTH = 224
const MENU_HEIGHT = 356

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

/** 行内合并页数（默认 1，可编辑；实际执行时会按可用相邻页数收敛）。 */
const upCount = ref(1)
const downCount = ref(1)

/**
 * 菜单定位：左侧越界则右对齐；下方空间不足且上方更充裕时向上展开（菜单底边贴住光标），
 * 避免光标靠近视口底部时菜单被裁掉。
 */
const menuStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {}
  style.left = `${Math.max(8, Math.min(props.x, windowWidth.value - MENU_WIDTH - 8))}px`
  const spaceBelow = windowHeight.value - props.y - 8
  const spaceAbove = props.y - 8
  if (spaceBelow >= MENU_HEIGHT || spaceBelow >= spaceAbove) {
    style.top = `${Math.max(8, Math.min(props.y, windowHeight.value - MENU_HEIGHT - 8))}px`
  } else {
    style.bottom = `${Math.max(8, windowHeight.value - props.y + 4)}px`
  }
  return style
})

function close() {
  emit('close')
}

function emitAction(payload: StoryboardMenuAction) {
  emit('action', payload)
  close()
}

/** 执行合并：把输入框数值收敛到 [1, 可用相邻页数] 后发出动作。 */
function runMerge(direction: 'up' | 'down') {
  const isUp = direction === 'up'
  const max = isUp ? maxUp.value : maxDown.value
  if (max <= 0) return
  const raw = Number(isUp ? upCount.value : downCount.value)
  const count = Math.min(Math.max(Number.isFinite(raw) ? Math.trunc(raw) : 1, 1), max)
  if (isUp) upCount.value = count
  else downCount.value = count
  emitAction({ action: isUp ? 'merge-up' : 'merge-down', count })
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
.menu-item:hover:not(.cursor-not-allowed) {
  background: rgba(34, 211, 238, 0.08);
}
.menu-item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
/* 危险项（删除这一页）：红色文字 + 红色悬停底，需覆盖 .menu-item 的 color: inherit */
.menu-item--danger {
  color: #dc2626;
}
.menu-item--danger:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.1);
}
:global(html.dark) .menu-item--danger {
  color: #f87171;
}
/* 行内合并页数输入框：窄、居中、去原生步进器 */
.merge-count {
  width: 40px;
  flex: none;
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  background: var(--bg-app);
  padding: 1px 4px;
  text-align: center;
  font-size: 12px;
  color: var(--text-primary);
  outline: none;
}
.merge-count:focus {
  border-color: rgba(34, 211, 238, 0.55);
}
.merge-count:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.merge-count::-webkit-outer-spin-button,
.merge-count::-webkit-inner-spin-button {
  margin: 0;
  -webkit-appearance: none;
  appearance: none;
}
.merge-count {
  -moz-appearance: textfield;
  appearance: textfield;
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

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- 顶部标题栏 -->
    <div
      class="shrink-0 px-3 py-2.5 border-b border-border-subtle flex items-center justify-between"
    >
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-text-primary">页面列表</span>
        <span class="text-[10px] text-text-muted">{{ pages.length }} 个</span>
      </div>
      <button
        class="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-cyan-400 hover:bg-cyan-500/10 transition-colors"
        @click="$emit('add')"
      >
        <svg
          class="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        新建
      </button>
    </div>

    <!-- 页面列表 -->
    <div class="flex-1 overflow-y-auto p-2 space-y-1.5">
      <div
        v-for="(page, index) in pages"
        :key="index"
        class="group flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-[background-color,border-color,box-shadow,opacity] duration-200"
        :class="[
          currentIndex === index
            ? 'bg-cyan-500/10 border border-cyan-500/20 shadow-sm shadow-cyan-500/5'
            : 'bg-surface border border-border-subtle hover:bg-elevated hover:border-border-default hover:shadow-sm hover:shadow-black/20',
          dragOverIndex === index && dragSide === 'before'
            ? 'border-t-2 border-t-cyan-400'
            : '',
          dragOverIndex === index && dragSide === 'after'
            ? 'border-b-2 border-b-cyan-400'
            : '',
          draggingIndex === index ? 'opacity-40' : '',
        ]"
        draggable="true"
        @click="$emit('select', index)"
        @contextmenu.prevent="openContextMenu($event, index)"
        @dragstart="onDragStart($event, index)"
        @dragover="onDragOver($event, index)"
        @dragleave="onDragLeave"
        @drop="onDrop($event, index)"
        @dragend="onDragEnd"
      >
        <!-- 左侧小缩略图 -->
        <div
          class="w-10 h-12 flex-shrink-0 rounded-lg overflow-hidden relative bg-surface border border-border-subtle flex items-center justify-center"
        >
          <template v-if="generatingPageIndices.has(index)">
            <div
              class="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin"
            />
          </template>
          <template v-else-if="generatedImages[index]">
            <img
              :src="generatedImages[index]"
              class="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </template>
          <template v-else-if="recoverableTaskIds.has(index)">
            <svg
              class="w-4 h-4 text-orange-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </template>
          <template v-else>
            <span class="text-[9px] text-text-muted">未生成</span>
          </template>
          <!-- 当前页角标 -->
          <div
            v-if="currentIndex === index"
            class="absolute top-0 right-0 bg-cyan-500 text-white text-[7px] px-1 py-px rounded-bl font-medium leading-none"
          >
            当前
          </div>
        </div>

        <!-- 右侧文字信息 -->
        <div class="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          <span class="text-xs font-medium text-text-primary truncate"
            >第 {{ index + 1 }} 页</span
          >
          <p class="text-[10px] text-text-muted truncate leading-tight">
            {{ getPagePreview(page) }}
          </p>
          <!-- 状态tag放在下方 -->
          <span
            class="text-[9px] px-1.5 py-px rounded w-fit"
            :class="getStatusClass(index)"
            >{{ getStatusText(index) }}</span
          >
        </div>

        <!-- 拖拽手柄（hover 显示） -->
        <div
          class="flex-shrink-0 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          title="拖动排序"
        >
          <svg
            class="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>
      </div>
    </div>

    <!-- 底部生成进度 -->
    <div class="shrink-0 p-3 border-t border-border-subtle">
      <div class="rounded-lg bg-surface border border-border-subtle p-3">
        <h4 class="text-[11px] font-medium text-text-secondary mb-2">生成进度</h4>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <div class="text-[10px] text-text-muted mb-0.5">总页数</div>
            <span class="font-semibold text-text-primary text-lg leading-none">{{
              totalPages
            }}</span>
          </div>
          <div>
            <div class="text-[10px] text-text-muted mb-0.5">已生成页数</div>
            <span class="font-semibold text-emerald-400 text-lg leading-none">{{
              generatedCount
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="contextMenu.visible"
          class="fixed z-[300] min-w-[140px] rounded-lg bg-surface border border-border-subtle backdrop-blur-xl shadow-2xl shadow-black/40 py-1"
          :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
          @click.stop
        >
          <button
            class="w-full px-3 py-2 text-left text-[11px] text-text-primary hover:bg-elevated transition-colors flex items-center gap-2"
            @click="handleInsertAbove"
          >
            <svg
              class="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            向上插入
          </button>
          <button
            class="w-full px-3 py-2 text-left text-[11px] text-text-primary hover:bg-elevated transition-colors flex items-center gap-2"
            @click="handleInsertBelow"
          >
            <svg
              class="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            向下插入
          </button>
          <div class="h-px bg-border-subtle my-1" />
          <button
            class="w-full px-3 py-2 text-left text-[11px] text-text-primary hover:bg-elevated transition-colors flex items-center gap-2"
            @click="handleDuplicate"
          >
            <svg
              class="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            复制此页
          </button>
          <button
            class="w-full px-3 py-2 text-left text-[11px] text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="pages.length <= 1"
            @click="handleDelete"
          >
            <svg
              class="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            删除此页
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from "vue";
import type { ComicPage } from "./types";

interface Props {
  pages: ComicPage[];
  currentIndex: number;
  totalPages: number;
  generatedCount: number;
  generatingPageIndices: Set<number>;
  generatedImages: Record<number, string>;
  /** 可恢复任务的页面索引集合 */
  recoverableTaskIds: Set<number>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "select", index: number): void;
  (e: "add"): void;
  (e: "reorder", from: number, to: number): void;
  (e: "insert", index: number): void;
  (e: "duplicate", index: number): void;
  (e: "delete", index: number): void;
}>();

const getStatusText = (index: number): string => {
  if (props.generatingPageIndices.has(index)) return "正在生成";
  if (props.generatedImages[index]) return "已生成";
  if (props.recoverableTaskIds.has(index)) return "可恢复";
  return "待生成";
};

const getStatusClass = (index: number): string => {
  if (props.generatingPageIndices.has(index))
    return "bg-cyan-500/15 text-cyan-400";
  if (props.generatedImages[index]) return "bg-emerald-500/15 text-emerald-400";
  if (props.recoverableTaskIds.has(index)) return "bg-orange-500/15 text-orange-400";
  return "bg-yellow-500/15 text-yellow-400";
};

const getPagePreview = (page: ComicPage): string => {
  for (const key of Object.keys(page)) {
    const val = page[key];
    if (typeof val === "string" && val.length > 0) {
      return val.length > 20 ? val.slice(0, 20) + "…" : val;
    }
    if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      const obj = val as Record<string, unknown>;
      for (const subKey of Object.keys(obj)) {
        const subVal = obj[subKey];
        if (typeof subVal === "string" && subVal.length > 0) {
          return subVal.length > 20 ? subVal.slice(0, 20) + "…" : subVal;
        }
      }
    }
  }
  return "暂无内容";
};

// ==================== 拖拽排序 ====================
const draggingIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);
const dragSide = ref<"before" | "after">("before");

const onDragStart = (e: DragEvent, index: number) => {
  draggingIndex.value = index;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    // Firefox 需要 setData 才能触发拖拽
    e.dataTransfer.setData("text/plain", String(index));
  }
};

const onDragOver = (e: DragEvent, index: number) => {
  if (draggingIndex.value === null) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

  // 根据鼠标在元素中的位置判断插入到前面还是后面
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  dragOverIndex.value = index;
  dragSide.value = e.clientY < midY ? "before" : "after";
};

const onDragLeave = () => {
  // 不立即清除，避免子元素抖动；由 drop/dragend 统一清理
};

const onDrop = (e: DragEvent, index: number) => {
  e.preventDefault();
  const from = draggingIndex.value;
  if (from === null) return;

  let to = index;
  // 计算目标索引：after 时插入到下一位置，再根据 from 与 to 关系修正
  if (dragSide.value === "after") to = index + 1;

  if (from !== to && from !== to - 1) {
    // 调整目标：当 from < to-1 时，移除 from 后目标索引减一
    const adjustedTo = from < to ? to - 1 : to;
    if (from !== adjustedTo) {
      emit("reorder", from, adjustedTo);
    }
  }

  draggingIndex.value = null;
  dragOverIndex.value = null;
  dragSide.value = "before";
};

const onDragEnd = () => {
  draggingIndex.value = null;
  dragOverIndex.value = null;
  dragSide.value = "before";
};

// ==================== 右键菜单 ====================
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  index: 0,
});

const openContextMenu = (e: MouseEvent, index: number) => {
  contextMenu.visible = true;
  contextMenu.index = index;
  // 防止菜单超出视窗
  const menuWidth = 160;
  const menuHeight = 180;
  contextMenu.x = Math.min(e.clientX, window.innerWidth - menuWidth);
  contextMenu.y = Math.min(e.clientY, window.innerHeight - menuHeight);
};

const closeContextMenu = () => {
  contextMenu.visible = false;
};

const handleInsertAbove = () => {
  emit("insert", contextMenu.index);
  closeContextMenu();
};

const handleInsertBelow = () => {
  emit("insert", contextMenu.index + 1);
  closeContextMenu();
};

const handleDuplicate = () => {
  emit("duplicate", contextMenu.index);
  closeContextMenu();
};

const handleDelete = () => {
  if (props.pages.length <= 1) {
    closeContextMenu();
    return;
  }
  emit("delete", contextMenu.index);
  closeContextMenu();
};

const onWindowClick = () => {
  if (contextMenu.visible) closeContextMenu();
};

const onWindowScroll = () => {
  if (contextMenu.visible) closeContextMenu();
};

onMounted(() => {
  window.addEventListener("click", onWindowClick);
  window.addEventListener("scroll", onWindowScroll, true);
});

onUnmounted(() => {
  window.removeEventListener("click", onWindowClick);
  window.removeEventListener("scroll", onWindowScroll, true);
});
</script>

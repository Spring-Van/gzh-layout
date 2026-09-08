<template>
  <!-- 遮罩：拦截浮层右侧区域的点击，点击即关闭；不覆盖侧栏（left-14 起），否则触发按钮
       hover 被遮罩夺走 → 延迟收起 → hover 恢复 → 再弹出，循环闪动 -->
  <div v-if="visible" class="fixed inset-y-0 left-14 right-0 z-30" @click="close" />

  <!-- 章节浮层：锚定触发按钮的垂直位置（anchorTop 由触发方传入），固定最大高度，超出滚动 -->
  <div
    v-show="visible"
    class="absolute left-full z-40 flex w-72 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-xl"
    :style="{ top: `${anchorTop}px`, maxHeight: `min(70vh, 560px, calc(100vh - ${anchorTop}px - 16px))` }"
    @mouseenter="panelEnter"
    @mouseleave="panelLeave"
  >
    <div class="shrink-0 border-b border-border-subtle p-2">
      <input
        v-model="keyword"
        type="text"
        placeholder="搜索章节…"
        class="h-8 w-full rounded-lg bg-app-bg px-2.5 text-xs text-text-primary outline-none placeholder:text-text-muted"
      />
    </div>

    <div ref="listRef" class="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-1.5">
      <template v-for="group in visibleGroups" :key="group.id">
        <button
          v-if="group.name"
          class="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-elevated"
          @click="toggleGroup(group.id)"
        >
          <ChevronRight :size="12" class="shrink-0 text-text-muted transition-transform" :class="isGroupOpen(group.id) ? 'rotate-90' : ''" />
          <Folder :size="13" class="shrink-0 text-amber-400" />
          <span class="min-w-0 flex-1 truncate text-left">{{ group.name }}</span>
          <span class="shrink-0 text-[11px] font-normal text-text-muted">{{ group.chapters.length }} 章</span>
        </button>
        <template v-if="!group.name || isGroupOpen(group.id)">
          <button
            v-for="item in group.chapters"
            :key="item.node.id"
            :data-selected="item.node.id === selectedChapterId ? 'true' : undefined"
            class="flex w-full items-center gap-2 rounded-lg py-1.5 pl-6 pr-2 text-left text-xs transition-colors hover:bg-elevated"
            :class="item.node.id === selectedChapterId ? 'bg-cyan-500/12' : ''"
            @click="select(item.node)"
          >
            <FileText :size="13" class="shrink-0" :class="item.node.id === selectedChapterId ? 'text-cyan-400' : 'text-text-muted'" />
            <span class="min-w-0 flex-1 truncate" :class="item.node.id === selectedChapterId ? 'font-medium text-cyan-400' : 'text-text-primary'">{{ item.node.name }}</span>
            <span v-if="item.sub" class="shrink-0 text-[10px] text-text-muted">{{ item.sub }}</span>
          </button>
        </template>
      </template>
      <p v-if="visibleGroups.length === 0" class="px-3 py-6 text-center text-xs leading-5 text-text-muted">{{ emptyText }}</p>
    </div>

    <div class="flex shrink-0 items-center justify-between border-t border-border-subtle px-3 py-1.5 text-[11px] text-text-muted">
      <span>共 {{ chapterTotal }} 章 · {{ readyTotal }} 章有正文</span>
      <span>Esc 关闭</span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 收缩侧栏的章节浮层：hover/点击窄条入口图标弹出，叶子优先的分组章节列表。
 * - 默认扁平展示所有章节（叶子节点），按一级文件夹分组；第三级以下路径压入行尾 sub 前缀；
 * - 固定最大高度 min(70vh, 560px)，超出滚动，打开时自动定位到当前选中章节；
 * - hover 触发 120ms 延迟弹出、移出触发区+面板 260ms 后收起；Esc / 点击遮罩 / 选中章节后关闭；
 * - 只做浏览与选择，拖拽排序等管理操作在展开态侧栏完成。
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { ChevronRight, FileText, Folder } from "lucide-vue-next";
import type { LongProjectNode } from "@comic/types";
import { useFlyoutVisibility } from "@comic/composables/useFlyoutVisibility";

const props = defineProps<{
  nodes: LongProjectNode[];
  selectedChapterId: string | null;
}>();

const emit = defineEmits<{
  (event: "select", chapter: LongProjectNode): void;
}>();

interface FlyChapter { node: LongProjectNode; sub: string }
interface FlyGroup { id: string; name: string; chapters: FlyChapter[] }

const keyword = ref("");
const collapsedGroups = ref(new Set<string>());
const listRef = ref<HTMLElement | null>(null);

const nodeMap = computed(() => new Map(props.nodes.map((node) => [node.id, node])));
const sortNodes = (a: LongProjectNode, b: LongProjectNode) => a.order - b.order || a.createdAt - b.createdAt;

/** 节点的祖先链（根 → 直接父级）。 */
const ancestorChain = (node: LongProjectNode): LongProjectNode[] => {
  const chain: LongProjectNode[] = [];
  let current = node.parentId ? nodeMap.value.get(node.parentId) : undefined;
  while (current) {
    chain.unshift(current);
    current = current.parentId ? nodeMap.value.get(current.parentId) : undefined;
  }
  return chain;
};

const matchChapter = (chapter: FlyChapter, keywordLower: string) =>
  !keywordLower || chapter.node.name.toLowerCase().includes(keywordLower) || chapter.sub.toLowerCase().includes(keywordLower);

/** 顶层章节归入无标题默认组；一级文件夹各成一组，更深层级以「子文件夹 / …」前缀展示。 */
const visibleGroups = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  const out: FlyGroup[] = [];
  const topChapters = props.nodes
    .filter((node) => node.type === "chapter" && node.parentId === null)
    .sort(sortNodes)
    .map((node) => ({ node, sub: "" }))
    .filter((chapter) => matchChapter(chapter, kw));
  if (topChapters.length) out.push({ id: "__root__", name: "", chapters: topChapters });
  props.nodes
    .filter((node) => node.type === "folder" && node.parentId === null)
    .sort(sortNodes)
    .forEach((folder) => {
      const chapters = props.nodes
        .filter((node) => node.type === "chapter")
        .sort(sortNodes)
        .map((node) => {
          const chain = ancestorChain(node);
          if (chain[0]?.id !== folder.id) return null;
          return { node, sub: chain.slice(1).map((item) => item.name).join(" / ") };
        })
        .filter((chapter): chapter is FlyChapter => Boolean(chapter))
        .filter((chapter) => matchChapter(chapter, kw));
      if (chapters.length) out.push({ id: folder.id, name: folder.name, chapters });
    });
  return out;
});

const chapterTotal = computed(() => props.nodes.filter((node) => node.type === "chapter").length);
const readyTotal = computed(() => props.nodes.filter((node) => node.type === "chapter" && node.content?.trim()).length);
const emptyText = computed(() => (chapterTotal.value === 0 ? "暂无章节，展开侧栏后可创建" : "无匹配章节"));

const isGroupOpen = (id: string) => (keyword.value.trim() ? true : !collapsedGroups.value.has(id));
const toggleGroup = (id: string) => {
  const next = new Set(collapsedGroups.value);
  next.has(id) ? next.delete(id) : next.add(id);
  collapsedGroups.value = next;
};

const select = (chapter: LongProjectNode) => {
  emit("select", chapter);
  close();
};

/* ---- 显隐时机：共用 useFlyoutVisibility（hover 防误触 + 延迟收起） ---- */
const { visible, anchorTop, triggerEnter, triggerLeave, triggerClick, panelEnter, panelLeave, close } = useFlyoutVisibility();

const onKeydown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };

watch(visible, (value) => {
  if (!value) { window.removeEventListener("keydown", onKeydown); return; }
  window.addEventListener("keydown", onKeydown);
  nextTick(() => {
    listRef.value?.querySelector<HTMLElement>('[data-selected="true"]')?.scrollIntoView({ block: "center" });
  });
});

onBeforeUnmount(() => { window.removeEventListener("keydown", onKeydown); });

defineExpose({ triggerEnter, triggerLeave, triggerClick, close });
</script>

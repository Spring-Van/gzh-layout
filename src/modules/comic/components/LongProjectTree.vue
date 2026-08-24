<template>
  <div class="tree-root" @dragenter.capture="trackDropTarget" @dragover.capture="trackDropTarget">
    <button
      class="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm text-text-primary transition-colors hover:bg-elevated"
      :class="dropTarget === null && draggingId ? 'bg-cyan-500/10 ring-1 ring-inset ring-cyan-500/40' : ''"
      @click="rootExpanded = !rootExpanded"
      @contextmenu.prevent.stop="emitContextMenu($event, null)"
      @dragover.prevent="setDropTarget(null)"
      @drop.prevent="dropNode(null)"
    >
      <ChevronRight :size="15" class="shrink-0 text-text-muted transition-transform" :class="rootExpanded ? 'rotate-90' : ''" />
      <BookOpen :size="16" class="shrink-0 text-cyan-400" />
      <span class="min-w-0 flex-1 truncate font-medium">{{ projectName }}</span>
    </button>

    <div v-if="rootExpanded" class="mt-1">
      <div v-if="rootNodes.length === 0" class="px-8 py-8 text-center text-xs leading-5 text-text-muted">暂无章节<br />右键项目名称开始创建</div>
      <TreeNode
        v-for="(node, index) in rootNodes"
        :key="node.id"
        :node="node"
        :nodes="nodes"
        :selected-id="selectedId"
        :expanded-ids="expandedIds"
        :dragging-id="draggingId"
        :drop-target="dropTarget"
        :drop-mode="dropMode"
        :sibling-index="index"
        @select="emit('select', $event)"
        @toggle="emit('toggle', $event)"
        @contextmenu="emit('contextmenu', $event)"
        @drag-start="startDrag"
        @drag-end="endDrag"
        @drag-over="setDropTarget"
        @drag-enter="setDropTarget"
        @drop="dropNode"
      />
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref } from "vue";
import { BookOpen, ChevronRight, FileText, Folder } from "lucide-vue-next";
import type { LongProjectNode } from "@comic/types";

const props = defineProps<{
  projectName: string;
  nodes: LongProjectNode[];
  selectedId: string | null;
  expandedIds: Set<string>;
}>();

const emit = defineEmits<{
  (event: "select", node: LongProjectNode): void;
  (event: "toggle", id: string): void;
  (event: "contextmenu", payload: { event: MouseEvent; node: LongProjectNode | null }): void;
  (event: "update:nodes", nodes: LongProjectNode[]): void;
}>();

const draggingId = ref<string | null>(null);
const dropTarget = ref<string | null | undefined>(undefined);
const dropMode = ref<"inside" | "before" | "after">("inside");
const rootExpanded = ref(true);

const rootNodes = computed(() => props.nodes.filter((node) => node.parentId === null).sort(sortNodes));

const isDescendant = (nodeId: string, possibleParentId: string) => {
  let current = props.nodes.find((node) => node.id === possibleParentId);
  while (current?.parentId) {
    if (current.parentId === nodeId) return true;
    current = props.nodes.find((node) => node.id === current?.parentId);
  }
  return false;
};

const emitContextMenu = (event: MouseEvent, node: LongProjectNode | null) => emit("contextmenu", { event, node });
const startDrag = (node: LongProjectNode) => { draggingId.value = node.id; dropTarget.value = undefined; dropMode.value = "inside"; };
const endDrag = () => { draggingId.value = null; dropTarget.value = undefined; dropMode.value = "inside"; };
const canDropOn = (target: string | null) => Boolean(draggingId.value && target !== draggingId.value && (!target || !isDescendant(draggingId.value, target)));
const setDropTarget = (target: string | null) => {
  if (!canDropOn(target)) return;
  dropTarget.value = target;
};
const trackDropTarget = (event: DragEvent) => {
  if (!draggingId.value || !(event.target instanceof Element)) return;
  const row = event.target.closest<HTMLElement>("[data-tree-node-id]");
  const targetId = row?.dataset.treeNodeId || null;
  if (!canDropOn(targetId)) return;
  setDropTarget(targetId);
  if (!row || !targetId) { dropMode.value = "inside"; return; }
  const target = props.nodes.find((node) => node.id === targetId);
  if (!target) return;
  const offset = (event.clientY - row.getBoundingClientRect().top) / row.getBoundingClientRect().height;
  if (target.type === "folder" && offset > 0.26 && offset < 0.74) dropMode.value = "inside";
  else dropMode.value = offset < 0.5 ? "before" : "after";
};

const normalize = (nodes: LongProjectNode[]) => {
  const grouped = new Map<string | null, LongProjectNode[]>();
  nodes.forEach((node) => {
    const siblings = grouped.get(node.parentId) ?? [];
    siblings.push(node);
    grouped.set(node.parentId, siblings);
  });
  const orderById = new Map<string, number>();
  grouped.forEach((siblings) => {
    siblings.forEach((node, index) => orderById.set(node.id, index));
  });
  return nodes.map((node) => ({ ...node, order: orderById.get(node.id) ?? 0 }));
};

const dropNode = (targetId: string | null) => {
  const sourceId = draggingId.value;
  if (!sourceId || sourceId === targetId) return endDrag();
  const source = props.nodes.find((node) => node.id === sourceId);
  if (!source || (targetId && isDescendant(sourceId, targetId))) return endDrag();
  const target = targetId ? props.nodes.find((node) => node.id === targetId) : null;
  const next = props.nodes.filter((node) => node.id !== sourceId).map((node) => ({ ...node }));
  const moving = { ...source };
  if (!moving) return endDrag();

  // The center of a folder nests the node; its top and bottom edges reorder siblings.
  if (target?.type === "folder" && dropMode.value === "inside") {
    moving.parentId = target.id;
    next.push(moving);
  } else {
    moving.parentId = target?.parentId ?? null;
    if (target) {
      const targetIndex = next.findIndex((node) => node.id === target.id);
      const insertAt = targetIndex < 0 ? next.length : targetIndex + (dropMode.value === "after" ? 1 : 0);
      next.splice(insertAt, 0, moving);
    } else {
      next.push(moving);
    }
  }
  emit("update:nodes", normalize(next));
  endDrag();
};

function sortNodes(a: LongProjectNode, b: LongProjectNode) { return a.order - b.order || a.createdAt - b.createdAt; }

const TreeNode: ReturnType<typeof defineComponent> = defineComponent({
  name: "LongProjectTreeNode",
  props: {
    node: { type: Object as () => LongProjectNode, required: true },
    nodes: { type: Array as () => LongProjectNode[], required: true },
    selectedId: { type: String, default: null },
    expandedIds: { type: Object as () => Set<string>, required: true },
    draggingId: { type: String, default: null },
    dropTarget: { type: [String, null] as unknown as () => string | null, default: null },
    dropMode: { type: String as () => "inside" | "before" | "after", default: "inside" },
  },
  emits: ["select", "toggle", "contextmenu", "drag-start", "drag-end", "drag-enter", "drag-over", "drop"],
  setup(nodeProps, { emit: nodeEmit }) {
    const children = computed(() => nodeProps.nodes.filter((node) => node.parentId === nodeProps.node.id).sort(sortNodes));
    const onContextMenu = (event: MouseEvent) => nodeEmit("contextmenu", { event, node: nodeProps.node });
    return () => h("div", { class: "tree-node" }, [
      h("div", {
        "data-tree-node-id": nodeProps.node.id,
        class: ["group relative flex h-9 items-center rounded-lg pr-1 transition-colors", nodeProps.node.type === "folder" ? "pl-5" : "pl-9", nodeProps.selectedId === nodeProps.node.id ? "bg-cyan-500/12 text-cyan-400" : "hover:bg-elevated", nodeProps.dropTarget === nodeProps.node.id && nodeProps.dropMode === "inside" ? "bg-cyan-500/10 ring-1 ring-inset ring-cyan-500/40" : ""],
        draggable: true,
        onContextmenu: (event: MouseEvent) => { event.preventDefault(); event.stopPropagation(); onContextMenu(event); },
        onDragstart: () => nodeEmit("drag-start", nodeProps.node),
        onDragend: () => nodeEmit("drag-end"),
        onDragenter: (event: DragEvent) => { event.preventDefault(); event.stopPropagation(); nodeEmit("drag-enter", nodeProps.node.id); },
        onDragover: (event: DragEvent) => { event.preventDefault(); event.stopPropagation(); if (event.dataTransfer) event.dataTransfer.dropEffect = "move"; nodeEmit("drag-over", nodeProps.node.id); },
        onDrop: (event: DragEvent) => { event.preventDefault(); event.stopPropagation(); nodeEmit("drop", nodeProps.node.id); },
      }, [
        nodeProps.dropTarget === nodeProps.node.id && nodeProps.dropMode !== "inside"
          ? h("span", { class: ["pointer-events-none absolute inset-x-2 h-0.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]", nodeProps.dropMode === "before" ? "top-0" : "bottom-0"] })
          : null,
        h("button", { class: "flex min-w-0 flex-1 items-center gap-2 text-left text-sm", onClick: () => nodeProps.node.type === "folder" ? nodeEmit("toggle", nodeProps.node.id) : nodeEmit("select", nodeProps.node) }, [
          nodeProps.node.type === "folder" ? h(ChevronRight, { size: 14, class: ["shrink-0 text-text-muted transition-transform", nodeProps.expandedIds.has(nodeProps.node.id) ? "rotate-90" : ""] }) : null,
          nodeProps.node.type === "folder" ? h(Folder, { size: 16, class: "shrink-0 text-amber-400" }) : h(FileText, { size: 15, class: nodeProps.selectedId === nodeProps.node.id ? "shrink-0 text-cyan-400" : "shrink-0 text-text-muted" }),
          h("span", { class: "truncate text-text-primary" }, nodeProps.node.name),
        ]),
      ]),
      nodeProps.node.type === "folder" && nodeProps.expandedIds.has(nodeProps.node.id)
        ? h("div", { class: "tree-children" }, children.value.map((child) => h(TreeNode, { key: child.id, node: child, nodes: nodeProps.nodes, selectedId: nodeProps.selectedId, expandedIds: nodeProps.expandedIds, draggingId: nodeProps.draggingId, dropTarget: nodeProps.dropTarget, dropMode: nodeProps.dropMode, onSelect: (value: LongProjectNode) => nodeEmit("select", value), onToggle: (value: string) => nodeEmit("toggle", value), onContextmenu: (value: { event: MouseEvent; node: LongProjectNode }) => nodeEmit("contextmenu", value), onDragStart: (value: LongProjectNode) => nodeEmit("drag-start", value), onDragEnd: () => nodeEmit("drag-end"), onDragEnter: (value: string) => nodeEmit("drag-enter", value), onDragOver: (value: string) => nodeEmit("drag-over", value), onDrop: (value: string) => nodeEmit("drop", value) })))
        : null,
    ]);
  },
});
</script>

<style scoped>
.tree-children { margin-left: 0.75rem; border-left: 1px solid var(--border-subtle); }
</style>

<template>
  <!-- 遮罩：与章节浮层一致，从侧栏右缘开始，避免覆盖触发按钮导致 hover 循环闪动 -->
  <div v-if="visible" class="fixed inset-y-0 left-14 right-0 z-30" @click="close" />

  <!-- 资产库浮层：锚定资产入口按钮的垂直位置（anchorTop 由触发方传入） -->
  <div
    v-show="visible"
    class="absolute left-full z-40 w-56 rounded-xl border border-border-subtle bg-surface shadow-xl"
    :style="{ top: `${anchorTop}px`, maxHeight: `calc(100vh - ${anchorTop}px - 16px)` }"
    @mouseenter="panelEnter"
    @mouseleave="panelLeave"
  >
    <div class="flex items-center gap-2 border-b border-border-subtle px-3 py-2">
      <Boxes :size="14" class="shrink-0 text-violet-400" />
      <span class="text-xs font-medium text-text-primary">资产库</span>
    </div>
    <div class="p-1.5">
      <button
        v-for="category in categories"
        :key="category.key"
        class="flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs transition-colors"
        :class="selectedCategory === category.key ? 'bg-violet-500/12 text-violet-300' : 'text-text-secondary hover:bg-elevated hover:text-text-primary'"
        @click="select(category.key)"
      >
        <component :is="category.icon" :size="14" class="shrink-0" />
        <span class="min-w-0 flex-1 truncate">{{ category.label }}</span>
        <span class="shrink-0 text-[10px] text-text-muted">{{ countOf(category.key) }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 收缩侧栏的资产库浮层：hover/点击窄条资产入口弹出，列出人物/场景/道具分类。
 * 与章节浮层共用 useFlyoutVisibility 的显隐时机（120ms 弹出 / 260ms 收起）。
 */
import { Boxes, MapPin, Package, UserRound } from "lucide-vue-next";
import type { LongProjectAsset } from "@comic/types";
import type { AssetLibraryCategory } from "./LongProjectAssetLibraryTree.vue";
import { useFlyoutVisibility } from "@comic/composables/useFlyoutVisibility";

const props = defineProps<{
  assets: LongProjectAsset[];
  selectedCategory: AssetLibraryCategory | null;
}>();

const emit = defineEmits<{
  (event: "select", category: AssetLibraryCategory): void;
}>();

const categories = [
  { key: "character" as const, label: "人物", icon: UserRound },
  { key: "scene" as const, label: "场景", icon: MapPin },
  { key: "prop" as const, label: "道具", icon: Package },
];

/** 项目级资产计数（与资产库主视图口径一致：不含章节范围资产）。 */
const countOf = (key: AssetLibraryCategory) => props.assets.filter((asset) => asset.type === key && asset.scope !== "chapter").length;

const select = (category: AssetLibraryCategory) => {
  emit("select", category);
  close();
};

const { visible, anchorTop, triggerEnter, triggerLeave, triggerClick, panelEnter, panelLeave, close } = useFlyoutVisibility();

defineExpose({ triggerEnter, triggerLeave, triggerClick, close });
</script>

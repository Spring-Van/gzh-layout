<template>
  <section class="border-t border-border-subtle pt-2">
    <button
      class="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm text-text-primary transition-colors hover:bg-elevated"
      :class="selectedCategory ? 'bg-elevated' : ''"
      @click="expanded = !expanded"
    >
      <ChevronRight :size="15" class="shrink-0 text-text-muted transition-transform" :class="expanded ? 'rotate-90' : ''" />
      <Boxes :size="16" class="shrink-0 text-violet-400" />
      <span class="min-w-0 flex-1 truncate font-medium">资产库</span>
    </button>

    <div v-if="expanded" class="mt-1">
      <button
        v-for="category in categories"
        :key="category.key"
        class="flex h-9 w-full items-center gap-2 rounded-lg pl-9 pr-2 text-left text-sm transition-colors"
        :class="selectedCategory === category.key ? 'bg-violet-500/12 text-violet-300' : 'text-text-secondary hover:bg-elevated hover:text-text-primary'"
        @click="emit('select', category.key)"
      >
        <component :is="category.icon" :size="15" class="shrink-0" />
        <span class="truncate">{{ category.label }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Boxes, ChevronRight, MapPin, Package, UserRound } from "lucide-vue-next";

export type AssetLibraryCategory = "character" | "scene" | "prop";

defineProps<{ selectedCategory: AssetLibraryCategory | null }>();

const emit = defineEmits<{ (event: "select", category: AssetLibraryCategory): void }>();
const expanded = ref(true);
const categories = [
  { key: "character" as const, label: "人物", icon: UserRound },
  { key: "scene" as const, label: "场景", icon: MapPin },
  { key: "prop" as const, label: "道具", icon: Package },
];
</script>

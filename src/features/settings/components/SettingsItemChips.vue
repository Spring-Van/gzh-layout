<template>
  <div class="chips-scrollbar flex items-center gap-1.5 overflow-x-auto">
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      class="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors"
      :class="item.id === activeId && !creating
        ? 'border-accent bg-accent text-white'
        : 'border-border-subtle bg-surface text-text-primary hover:border-border-default'"
      @click="$emit('select', item.id)"
    >
      <span
        class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] leading-none"
        :class="item.id === activeId && !creating ? 'bg-white/20' : 'bg-cyan-500/10 text-accent'"
      >{{ avatarChar(item.name) }}</span>
      <span class="max-w-[8rem] truncate">{{ item.name }}</span>
    </button>

    <button
      type="button"
      class="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-border-subtle px-2.5 py-1 text-xs text-text-secondary transition-colors hover:border-cyan-500/40 hover:text-accent"
      @click="$emit('add')"
    >
      <Plus class="h-3 w-3" />
      添加
    </button>
  </div>
</template>

<script setup lang="ts">
import { Plus } from 'lucide-vue-next';

defineProps<{
  items: { id: string; name: string }[];
  activeId: string | null;
  creating: boolean;
}>();

defineEmits<{
  select: [id: string];
  add: [];
}>();

function avatarChar(name: string) {
  return (name || '?').trim().charAt(0).toUpperCase();
}
</script>

<style scoped>
.chips-scrollbar {
  scrollbar-width: none;
}
.chips-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>

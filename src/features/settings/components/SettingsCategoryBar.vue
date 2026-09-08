<template>
  <div class="relative flex rounded border border-border-subtle bg-app-bg p-0.5">
    <div
      class="absolute top-0.5 bottom-0.5 rounded-[3px] bg-accent transition-[left] duration-150 ease-out"
      :style="indicatorStyle"
    />
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      class="relative z-10 flex-1 truncate px-2 py-1.5 text-xs transition-colors"
      :class="tab.key === modelValue ? 'font-medium text-white' : 'text-text-secondary hover:text-text-primary'"
      @click="$emit('select', tab.key)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue';

export interface CategoryTabItem {
  key: string;
  label: string;
  icon: Component;
}

const props = defineProps<{
  tabs: CategoryTabItem[];
  modelValue: string;
}>();

defineEmits<{ select: [key: string] }>();

const indicatorStyle = computed(() => {
  const index = Math.max(0, props.tabs.findIndex(tab => tab.key === props.modelValue));
  const cell = `((100% - 4px) / ${props.tabs.length})`;
  return {
    left: `calc(2px + ${index} * ${cell})`,
    width: `calc(${cell})`,
  };
});
</script>

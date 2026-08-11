<template>
  <button
    type="button"
    class="w-7 h-7 inline-flex items-center justify-center transition-colors"
    :class="toneClass"
    :title="title"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{ title: string; tone?: 'default' | 'success' | 'danger' }>(), {
  tone: 'default',
});
const toneClass = computed(() => ({
  default: 'text-text-secondary hover:text-accent',
  success: 'text-text-secondary hover:text-emerald-400',
  danger: 'text-text-secondary hover:text-red-400',
})[props.tone]);
</script>

<template>
  <label class="flex flex-col items-end gap-0.5 shrink-0">
    <span class="text-[10px] text-text-secondary">{{ label }}</span>
    <span class="relative block w-full">
      <select
        :value="modelValue"
        class="w-full appearance-none bg-input-bg border border-border-subtle rounded-lg pl-3 pr-8 py-1 text-[11px] text-text-primary focus:outline-none focus:border-cyan-500/30 transition-colors cursor-pointer"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option value="" class="bg-surface">{{ placeholder }}</option>
        <option v-for="option in options" :key="option.value" :value="option.value" class="bg-surface">
          {{ option.label }}
        </option>
      </select>
      <ChevronDown class="w-3 h-3 text-text-secondary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </span>
  </label>
</template>

<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next';

defineProps<{
  label: string;
  modelValue: string;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
}>();

defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

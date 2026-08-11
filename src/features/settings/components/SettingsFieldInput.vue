<template>
  <label class="block text-xs text-text-secondary">
    <span class="block mb-1.5">{{ label }}</span>
    <input
      :value="modelValue"
      type="text"
      class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </label>
</template>

<script setup lang="ts">
defineProps<{ modelValue: string; label: string; placeholder?: string }>();
defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

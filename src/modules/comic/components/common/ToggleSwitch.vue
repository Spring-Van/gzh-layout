<template>
  <label
    class="inline-flex shrink-0 items-center gap-1.5"
    :class="disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'"
  >
    <span class="relative inline-flex h-4 w-7 shrink-0 items-center">
      <input
        type="checkbox"
        class="sr-only"
        :checked="modelValue"
        :disabled="disabled"
        :aria-label="label"
        @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      />
      <span
        class="absolute inset-0 rounded-full border transition-colors"
        :class="modelValue ? 'border-cyan-500/60 bg-cyan-500' : 'border-border-subtle bg-elevated'"
      />
      <span
        class="absolute left-[2px] h-3 w-3 rounded-full bg-white shadow transition-transform"
        :class="modelValue ? 'translate-x-3' : 'translate-x-0'"
      />
    </span>
    <span class="whitespace-nowrap text-[11px] text-text-secondary"><slot>{{ label }}</slot></span>
  </label>
</template>

<script setup lang="ts">
/**
 * 小尺寸滑块开关：替代复选框，用于「这一条要不要带某类内容」这类**点了立刻生效**的开关。
 * 16×28，与 11px 文案同一行；受控组件，只靠 v-model 驱动，不存内部状态。
 */
withDefaults(defineProps<{
  modelValue: boolean
  disabled?: boolean
  /** 无障碍标签（不写 slot 时同时作为显示文案）。 */
  label?: string
}>(), {
  disabled: false,
  label: '',
})

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()
</script>

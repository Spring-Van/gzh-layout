<template>
  <div
    class="p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 flex items-center gap-3"
    :class="[
      isActive ? 'bg-blue-50/50 border-primary' : 'bg-white border-transparent hover:border-slate-200 shadow-sm'
    ]"
    @click="$emit('click')"
  >
    <div class="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-[9px] font-mono border border-slate-200 font-medium"
      :class="coverStyle"
    >
      封面
    </div>
    <div class="flex-1 min-w-0">
      <div class="text-xs font-bold truncate mb-1" :class="isActive ? 'text-primary' : 'text-slate-700'">
        {{ title }}
      </div>
      <div class="text-[10px] text-slate-400 font-mono">
        {{ imageCount }} Pics
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TemplateType } from '../../types';

interface Props {
  title: string;
  imageCount: number;
  coverStyle: string;
  isActive?: boolean;
}

defineProps<Props>();
defineEmits(['click']);
</script>

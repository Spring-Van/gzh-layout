<script setup lang="ts">
import type { Project } from '../../types';

interface Props {
  project: Project;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'click'): void;
}>();

const statusColors = {
  success: 'bg-emerald-500/10 text-emerald-400',
  warn: 'bg-amber-500/10 text-amber-400',
  error: 'bg-red-500/10 text-red-400',
};
</script>

<template>
  <button
    @click="emit('click')"
    class="group text-left bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300 overflow-hidden"
  >
    <div class="flex items-start justify-between mb-6">
      <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6ca8ff] to-[#8d6cff] flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
        📁
      </div>
      <span :class="['px-3 py-1 rounded-full text-xs font-bold', statusColors[project.status]]">
        {{ project.statusText }}
      </span>
    </div>

    <h3 class="text-xl font-bold text-white mb-2 group-hover:text-[#6ca8ff] transition-colors">
      {{ project.name }}
    </h3>

    <div class="grid grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/5">
      <div class="text-center">
        <div class="text-2xl font-bold text-white">{{ project.stats.files }}</div>
        <div class="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">素材</div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold text-white">{{ project.stats.groups }}</div>
        <div class="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">分组</div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold text-white">{{ project.stats.drafts }}</div>
        <div class="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">草稿</div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-bold text-white">{{ project.stats.published }}</div>
        <div class="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">已发</div>
      </div>
    </div>
  </button>
</template>

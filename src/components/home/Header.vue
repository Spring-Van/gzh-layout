<script setup lang="ts">
import { Search, Bell } from 'lucide-vue-next';
import type { AppView } from '../../types';

interface Props {
  currentView: AppView;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'navigate', view: AppView): void;
}>();

const navItems = [
  { label: '项目管理', view: 'project' as AppView },
  { label: '模板库', view: 'templates' as AppView },
  { label: '历史记录', view: 'history' as AppView },
  { label: '设置', view: 'settings' as AppView },
];
</script>

<template>
  <header class="h-20 px-8 flex items-center justify-between border-b border-white/5 z-50">
    <div class="flex items-center gap-4">
      <div class="w-10 h-10 bg-gradient-to-br from-[#6ca8ff] to-[#8d6cff] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20">
        🎨
      </div>
      <span class="font-bold text-lg tracking-tight">排版助手 Pro</span>
    </div>

    <nav class="flex items-center gap-8">
      <button
        v-for="item in navItems"
        :key="item.view"
        @click="emit('navigate', item.view)"
        :class="[
          'text-sm font-medium transition-colors hover:text-white',
          currentView === item.view ? 'text-white' : 'text-zinc-500'
        ]"
      >
        {{ item.label }}
      </button>
    </nav>

    <div class="flex items-center gap-4">
      <button class="p-2 text-zinc-500 hover:text-white transition-colors">
        <Search :size="20" />
      </button>
      <button class="p-2 text-zinc-500 hover:text-white transition-colors">
        <Bell :size="20" />
      </button>
      <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-800 border border-white/10" />
    </div>
  </header>
</template>

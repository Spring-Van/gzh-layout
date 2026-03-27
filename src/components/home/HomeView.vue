<script setup lang="ts">
import Header from './Header.vue';
import Hero from './Hero.vue';
import ProjectCard from './ProjectCard.vue';
import Features from './Features.vue';
import type { AppView, Project } from '../../types';

interface Props {
  currentView: AppView;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'newProject'): void;
  (e: 'navigate', view: AppView): void;
}>();

const projects: Project[] = [
  {
    id: '1',
    name: '2026-03 壁纸合集',
    status: 'success',
    statusText: '素材处理完成',
    stats: { files: 284, groups: 8, drafts: 3, published: 1 },
  },
  {
    id: '2',
    name: '日系头像 Vol.42',
    status: 'warn',
    statusText: '等待去重处理',
    stats: { files: 156, groups: 4, drafts: 0, published: 0 },
  },
  {
    id: '3',
    name: '情绪摄影 第三期',
    status: 'success',
    statusText: '全部已发布',
    stats: { files: 98, groups: 5, drafts: 5, published: 5 },
  },
];
</script>

<template>
  <div class="flex flex-col min-h-screen bg-[#0a0e18] text-white">
    <Header :current-view="currentView" @navigate="emit('navigate', $event)" />
    <Hero @new-project="emit('newProject')" />

    <div class="max-w-7xl mx-auto w-full p-12 space-y-12">
      <div class="flex items-end justify-between border-b border-white/5 pb-6">
        <div class="space-y-2">
          <h2 class="text-3xl font-bold text-white tracking-tight">最近项目</h2>
          <p class="text-sm text-zinc-500">继续您未完成的排版任务</p>
        </div>
        <button class="text-[11px] font-bold text-zinc-500 uppercase tracking-widest hover:text-white transition-colors">
          查看全部项目 ›
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <ProjectCard
          v-for="project in projects"
          :key="project.id"
          :project="project"
          @click="emit('newProject')"
        />
      </div>
    </div>

    <Features />
  </div>
</template>

<template>
  <header class="h-16 bg-white border-b border-border-color flex items-center justify-between px-6 flex-shrink-0 z-20 shadow-sm">
    <!-- Logo & Title -->
    <div class="flex items-center gap-3 cursor-pointer" @click="$emit('go-to-step', 'home')">
      <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center text-white font-bold shadow">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
        </svg>
      </div>
      <span class="font-bold text-slate-800 hidden md:block tracking-wide">矩阵排版引擎</span>
    </div>

    <!-- 中间向导步骤 -->
    <div class="hidden md:flex items-center gap-2 text-sm font-medium">
      <template v-for="(step, index) in steps" :key="step.id">
        <div :id="`pt-${step.id}`" class="flex items-center gap-2"
          :class="[
            index === currentStepIndex ? 'text-primary font-bold' :
            index < currentStepIndex ? 'text-slate-800' : 'text-slate-400'
          ]"
        >
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs"
            :class="[
              index === currentStepIndex ? 'bg-blue-50 text-primary border border-blue-200' :
              index < currentStepIndex ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
            ]"
          >
            {{ index < currentStepIndex ? '✓' : index + 1 }}
          </span>
          <span>{{ step.label }}</span>
        </div>
        <div v-if="index < steps.length - 1" class="w-6 h-[1px] bg-slate-200"></div>
      </template>
    </div>

    <!-- 右侧全局配置 -->
    <div class="flex items-center gap-4">
      <button class="flex items-center gap-1.5 text-sm text-slate-600 hover:text-primary transition" @click="$emit('open-modal', 'template')">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
        </svg>
        模板配置
      </button>
      <div class="w-px h-4 bg-slate-200"></div>
      <button class="flex items-center gap-1.5 text-sm text-slate-600 hover:text-primary transition" @click="$emit('open-modal', 'account')">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
        </svg>
        账号配置
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const steps = [
  { id: 'home', label: '项目主页' },
  { id: 'setup', label: '清洗与拆分' },
  { id: 'typeset', label: '批量排版' },
  { id: 'sync', label: '发布同步' },
];

interface Props {
  currentStep: string;
}

const props = defineProps<Props>();
const emit = defineEmits(['go-to-step', 'open-modal']);

const currentStepIndex = computed(() => steps.findIndex(s => s.id === props.currentStep));
</script>


<script setup lang="ts">
import { Zap, Plus } from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'newProject'): void;
}>();
</script>

<template>
  <div class="relative h-[600px] flex items-center justify-center overflow-hidden border-b border-white/5 shrink-0">
    <div class="absolute inset-0 opacity-20 pointer-events-none">
      <div class="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#6ca8ff] rounded-full blur-[150px]" />
      <div class="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#8d6cff] rounded-full blur-[150px]" />
    </div>

    <div class="relative z-10 text-center space-y-10 max-w-4xl px-6">
      <div class="space-y-6">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-[#6ca8ff] uppercase tracking-[0.2em] mb-4">
          <Zap :size="14" />
          AI Powered Workflow
        </div>
        <h1 class="text-7xl md:text-9xl font-bold tracking-tighter text-white leading-[0.85] uppercase">
          IMAGINE
          <br />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#6ca8ff] to-[#8d6cff]">
            WORKFLOW
          </span>
        </h1>
        <p class="text-xl text-zinc-400 max-w-2xl mx-auto font-medium leading-relaxed">
          从素材文件夹到微信草稿，只需一键。智能去重、自动拆分、AI 文案生成，让排版回归艺术。
        </p>
      </div>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-6">
        <button
          @click="emit('newProject')"
          class="group relative px-12 py-5 bg-white text-black rounded-2xl font-black text-lg transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/10 overflow-hidden"
        >
          <div class="absolute inset-0 bg-gradient-to-r from-[#6ca8ff] to-[#8d6cff] opacity-0 group-hover:opacity-10 transition-opacity" />
          <span class="relative flex items-center gap-3">
            <Plus :size="24" :stroke-width="3" />
            开始新项目
          </span>
        </button>
        <button class="px-12 py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all backdrop-blur-sm">
          查看教程
        </button>
      </div>
    </div>
  </div>
</template>

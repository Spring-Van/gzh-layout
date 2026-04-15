<template>
  <section class="w-full h-full p-8 md:p-12 overflow-y-auto">
    <div class="max-w-5xl mx-auto">
      <h1 class="text-3xl font-bold mb-2 text-slate-800">{{ greeting }}，创作者 ☕️</h1>
      <p class="text-slate-500 text-sm mb-10">从这里开启或继续你的高频图文生产任务。</p>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <div class="bg-surface p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-primary hover:bg-blue-50/30 cursor-pointer transition duration-300 flex flex-col items-center justify-center text-center gap-4 min-h-[200px] shadow-sm" @click="$router.push('/setup')">
          <div class="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white mb-2 shadow-lg shadow-blue-500/30">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
          </div>
          <div>
            <h3 class="font-bold text-slate-800 text-lg">开启新任务</h3>
            <p class="text-sm text-slate-400 mt-1">选择本地文件夹一键处理</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 8) return "早上好";
  if (hour >= 8 && hour < 12) return "上午好";
  if (hour >= 12 && hour < 14) return "中午好";
  if (hour >= 14 && hour < 18) return "下午好";
  if (hour >= 18 && hour < 22) return "晚上好";
  return "夜深了";
});
</script>

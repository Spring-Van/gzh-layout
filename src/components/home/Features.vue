<script setup lang="ts">
import { Layers, Sparkles, Zap } from 'lucide-vue-next';
</script>

<template>
  <div class="bg-white/[0.02] border-y border-white/5">
    <div class="max-w-7xl mx-auto w-full p-20 grid grid-cols-1 md:grid-cols-3 gap-16">
      <div class="space-y-6 group">
        <div class="w-14 h-14 bg-[#6ca8ff]/10 rounded-2xl flex items-center justify-center text-[#6ca8ff] group-hover:scale-110 transition-transform">
          <Layers :size="28" />
        </div>
        <h3 class="text-2xl font-bold text-white">智能拆分</h3>
        <p class="text-base text-zinc-500 leading-relaxed">
          自动识别素材文件夹结构，按日期或数量智能拆分任务组，告别手动分类。
        </p>
      </div>

      <div class="space-y-6 group">
        <div class="w-14 h-14 bg-[#8d6cff]/10 rounded-2xl flex items-center justify-center text-[#8d6cff] group-hover:scale-110 transition-transform">
          <Sparkles :size="28" />
        </div>
        <h3 class="text-2xl font-bold text-white">AI 赋能</h3>
        <p class="text-base text-zinc-500 leading-relaxed">
          集成 Gemini 3.1 Pro，一键生成吸引人的文章引言与标题，让内容更有生命力。
        </p>
      </div>

      <div class="space-y-6 group">
        <div class="w-14 h-14 bg-[#2dd4bf]/10 rounded-2xl flex items-center justify-center text-[#2dd4bf] group-hover:scale-110 transition-transform">
          <Zap :size="28" />
        </div>
        <h3 class="text-2xl font-bold text-white">极速同步</h3>
        <p class="text-base text-zinc-500 leading-relaxed">
          通过微信 API 直接同步至草稿箱，支持批量处理，效率提升 10 倍以上。
        </p>
      </div>
    </div>
  </div>
</template>

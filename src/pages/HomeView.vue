<template>
  <section class="w-full h-full p-8 md:p-12 overflow-y-auto">
    <div class="max-w-5xl mx-auto">
      <h1 class="text-3xl font-bold mb-2 text-slate-800">早上好，创作者 ☕️</h1>
      <p class="text-slate-500 text-sm mb-10">从这里开启或继续你的高频图文生产任务。</p>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <!-- 新建入口 -->
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

        <!-- 历史任务卡片 -->
        <div class="bg-surface p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition min-h-[200px] flex flex-col">
          <div class="flex justify-between items-start mb-4">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                </svg>
              </div>
              <span class="text-xs font-mono text-slate-500">2026-03-24</span>
            </div>
            <span class="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded font-medium border border-green-100">已同步完毕</span>
          </div>
          <h3 class="font-bold text-base mb-1 text-slate-800 line-clamp-1">极简风景壁纸合集 - 第12期</h3>
          <p class="text-xs text-slate-500 mb-6 flex-1">共读取 45 张素材 · 拆分生成 5 篇草稿</p>
          <div class="flex gap-2.5">
            <button class="flex-1 py-2 border border-slate-200 text-slate-600 font-medium text-xs rounded-lg hover:bg-slate-50 transition" @click="$router.push('/typeset')">打开重排</button>
            <button class="flex-1 py-2 bg-slate-100 text-slate-600 font-medium text-xs rounded-lg hover:bg-slate-200 transition">详情</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
</script>

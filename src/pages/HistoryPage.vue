<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const searchQuery = ref('');

const draftRecords = [
  {
    id: '1',
    title: '2026-03 壁纸合集',
    projectName: '2026-03 壁纸合集',
    coverUrl: '',
    syncedAt: '2026-03-25T14:30:00Z',
    status: 'published' as const,
    url: 'https://mp.weixin.qq.com/s/xxx',
  },
  {
    id: '2',
    title: '日系头像 Vol.41',
    projectName: '日系头像 Vol.41',
    coverUrl: '',
    syncedAt: '2026-03-24T10:15:00Z',
    status: 'draft' as const,
  },
  {
    id: '3',
    title: '情绪摄影 第二期',
    projectName: '情绪摄影 第二期',
    coverUrl: '',
    syncedAt: '2026-03-22T16:45:00Z',
    status: 'published' as const,
    url: 'https://mp.weixin.qq.com/s/yyy',
  },
  {
    id: '4',
    title: '治愈插画精选',
    projectName: '治愈插画精选',
    coverUrl: '',
    syncedAt: '2026-03-20T09:00:00Z',
    status: 'draft' as const,
  },
];

const navigateTo = (view: string) => {
  const routeMap: Record<string, string> = {
    project: '/project',
    templates: '/templates',
    history: '/history',
    settings: '/settings',
  };
  router.push(routeMap[view] || '/project');
};
</script>

<template>
  <div class="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
    <!-- 侧边栏 -->
    <aside class="w-64 bg-slate-900 flex flex-col p-6 shrink-0">
      <div class="flex items-center gap-3 mb-10 px-2">
        <div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          ⚡
        </div>
        <h1 class="text-xl font-bold text-white tracking-tight">闪电排版</h1>
      </div>

      <nav class="flex-1 space-y-2">
        <button
          @click="navigateTo('project')"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          <span class="text-lg">📁</span>
          <span class="font-medium">项目处理</span>
        </button>
        <button
          @click="navigateTo('templates')"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          <span class="text-lg">📄</span>
          <span class="font-medium">自定义模板库</span>
        </button>
        <button
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 bg-blue-600 text-white shadow-lg shadow-blue-500/30"
        >
          <span class="text-lg">📜</span>
          <span class="font-medium">历史记录</span>
        </button>
        <button
          @click="navigateTo('settings')"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          <span class="text-lg">⚙️</span>
          <span class="font-medium">账号设置</span>
        </button>
      </nav>

      <div class="mt-auto pt-6 border-t border-slate-800">
        <div class="bg-slate-800/50 rounded-2xl p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-slate-400 font-medium">系统状态</span>
            <div class="flex items-center gap-1.5">
              <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span class="text-[10px] text-green-500 font-bold uppercase">Online</span>
            </div>
          </div>
          <div class="flex items-center gap-3 text-slate-300">
            <span class="text-blue-500">📊</span>
            <span class="text-xs">API 链路正常</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="flex-1 flex flex-col min-w-0">
      <header class="h-20 bg-white border-b border-slate-200 flex items-center px-8 sticky top-0 z-10">
        <div class="flex-1">
          <h1 class="text-2xl font-bold text-slate-800">历史记录</h1>
          <p class="text-slate-500 text-sm mt-1">查看和管理已同步的草稿</p>
        </div>
        <!-- 搜索框 -->
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span class="text-slate-400">🔍</span>
          </div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索标题..."
            class="w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </header>

      <div class="flex-1 p-8 overflow-auto">
        <div class="max-w-5xl mx-auto space-y-4">
          <div
            v-for="record in draftRecords"
            :key="record.id"
            class="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-slate-300 transition-all"
          >
            <div class="flex items-center gap-5">
              <!-- 封面 -->
              <div class="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center shrink-0">
                🖼️
              </div>

              <!-- 信息 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-3 mb-1">
                  <h3 class="font-semibold truncate text-slate-800">{{ record.title }}</h3>
                  <span
                    :class="[
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      record.status === 'published'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    ]"
                  >
                    {{ record.status === 'published' ? '已发布' : '草稿' }}
                  </span>
                </div>
                <p class="text-sm text-slate-500 mb-2">项目：{{ record.projectName }}</p>
                <div class="flex items-center gap-4 text-xs text-slate-500">
                  <span class="flex items-center gap-1">
                    📅
                    {{ new Date(record.syncedAt).toLocaleDateString() }}
                  </span>
                  <span class="flex items-center gap-1">
                    🕐
                    {{ new Date(record.syncedAt).toLocaleTimeString() }}
                  </span>
                </div>
              </div>

              <!-- 操作 -->
              <div class="flex items-center gap-2">
                <a
                  v-if="record.url"
                  :href="record.url"
                  target="_blank"
                  class="px-3 py-1.5 text-sm text-blue-600 hover:underline"
                >
                  查看文章
                </a>
                <button class="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                  重新同步
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

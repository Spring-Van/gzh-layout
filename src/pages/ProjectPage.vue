<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import type { Project } from '../types';

const router = useRouter();

const searchQuery = ref('');

const recentProjects: Project[] = [
  {
    id: '1',
    name: '2026-03 壁纸合集',
    status: 'success',
    statusText: '素材处理完成',
    stats: { files: 284, groups: 8, drafts: 3, published: 1 },
    createdAt: '2026-03-20T10:00:00Z',
    updatedAt: '2026-03-25T14:30:00Z',
  },
  {
    id: '2',
    name: '日系头像 Vol.42',
    status: 'warn',
    statusText: '等待去重处理',
    stats: { files: 156, groups: 4, drafts: 0, published: 0 },
    createdAt: '2026-03-22T09:15:00Z',
    updatedAt: '2026-03-24T16:45:00Z',
  },
  {
    id: '3',
    name: '情绪摄影 第三期',
    status: 'success',
    statusText: '全部已发布',
    stats: { files: 98, groups: 5, drafts: 5, published: 5 },
    createdAt: '2026-03-18T11:20:00Z',
    updatedAt: '2026-03-23T08:00:00Z',
  },
];

const handleNewProject = async () => {
  router.push('/project/workspace');
};

const handleOpenProject = (project: Project) => {
  router.push('/project/workspace');
};

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
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 bg-blue-600 text-white shadow-lg shadow-blue-500/30"
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
          @click="navigateTo('history')"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
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
      <!-- 顶部路径栏 -->
      <header class="h-20 bg-white border-b border-slate-200 flex items-center px-8 sticky top-0 z-10">
        <div class="flex-1">
          <h1 class="text-2xl font-bold text-slate-800">项目管理</h1>
          <p class="text-slate-500 text-sm mt-1">管理和创建您的排版项目</p>
        </div>
        <div class="flex items-center gap-4">
          <!-- 搜索框 -->
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span class="text-slate-400">🔍</span>
            </div>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索项目..."
              class="w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <!-- 新建项目按钮 -->
          <button
            @click="handleNewProject"
            class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            <span>+</span>
            新建项目
          </button>
        </div>
      </header>

      <!-- 项目列表 -->
      <div class="flex-1 p-8 overflow-auto">
        <div class="max-w-6xl mx-auto">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- 新建项目卡片 -->
            <button
              @click="handleNewProject"
              class="group relative border-2 border-dashed border-slate-200 rounded-3xl p-8 hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-300 bg-white"
            >
              <div class="flex flex-col items-center justify-center h-full space-y-4">
                <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <span class="text-3xl text-slate-400 group-hover:text-blue-600 transition-colors">+</span>
                </div>
                <div class="text-center">
                  <div class="text-lg font-bold text-slate-600 group-hover:text-blue-700 transition-colors">
                    新建项目
                  </div>
                  <div class="text-sm text-slate-400 mt-1">
                    选择文件夹开始排版
                  </div>
                </div>
              </div>
            </button>

            <!-- 历史项目卡片 -->
            <div
              v-for="project in recentProjects"
              :key="project.id"
              @click="handleOpenProject(project)"
              class="group cursor-pointer bg-white border border-slate-200 rounded-3xl p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300"
            >
              <div class="flex items-start justify-between mb-4">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-lg">
                  📁
                </div>
                <span
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-bold',
                    project.status === 'success'
                      ? 'bg-emerald-100 text-emerald-700'
                      : project.status === 'warn'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                  ]"
                >
                  {{ project.statusText }}
                </span>
              </div>

              <h3 class="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                {{ project.name }}
              </h3>
              <p class="text-sm text-slate-500 mb-4">
                更新于 {{ new Date(project.updatedAt).toLocaleDateString() }}
              </p>

              <div class="grid grid-cols-4 gap-3 pt-4 border-t border-slate-100">
                <div class="text-center">
                  <div class="text-xl font-bold text-slate-800">{{ project.stats.files }}</div>
                  <div class="text-[10px] text-slate-500 uppercase tracking-wider mt-1">素材</div>
                </div>
                <div class="text-center">
                  <div class="text-xl font-bold text-slate-800">{{ project.stats.groups }}</div>
                  <div class="text-[10px] text-slate-500 uppercase tracking-wider mt-1">分组</div>
                </div>
                <div class="text-center">
                  <div class="text-xl font-bold text-slate-800">{{ project.stats.drafts }}</div>
                  <div class="text-[10px] text-slate-500 uppercase tracking-wider mt-1">草稿</div>
                </div>
                <div class="text-center">
                  <div class="text-xl font-bold text-slate-800">{{ project.stats.published }}</div>
                  <div class="text-[10px] text-slate-500 uppercase tracking-wider mt-1">已发</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

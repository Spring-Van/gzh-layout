<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const selectedTemplate = ref('minimal');

const templates = [
  {
    id: 'minimal',
    name: '极简长图流',
    description: '适合壁纸号，图片纵向依次排列',
    thumbnail: '📄',
    tags: ['壁纸', '头像'],
    isDefault: true,
  },
  {
    id: 'card',
    name: '卡片式分段',
    description: '每张图有圆角卡片，更精致',
    thumbnail: '💳',
    tags: ['精致', '摄影'],
  },
  {
    id: 'grid',
    name: '宫格预览',
    description: '前面放 2 列预览，后面放原图',
    thumbnail: '📱',
    tags: ['互动', '多图'],
  },
  {
    id: 'section',
    name: '按组分节',
    description: '每 3~4 张图一个小标题',
    thumbnail: '📑',
    tags: ['分组', '系列'],
  },
  {
    id: 'cover',
    name: '封面+正文',
    description: '自动选一张做头图，正文按顺序展示',
    thumbnail: '🖼️',
    tags: ['封面', '文章'],
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
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 bg-blue-600 text-white shadow-lg shadow-blue-500/30"
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
      <header class="h-20 bg-white border-b border-slate-200 flex items-center px-8 sticky top-0 z-10">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">模板库</h1>
          <p class="text-slate-500 text-sm mt-1">选择合适的模板快速开始排版</p>
        </div>
      </header>

      <div class="flex-1 p-8 overflow-auto">
        <div class="max-w-6xl mx-auto">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="tpl in templates"
              :key="tpl.id"
              @click="selectedTemplate = tpl.id"
              :class="[
                'group relative bg-white border-2 rounded-3xl p-6 cursor-pointer transition-all duration-300',
                selectedTemplate === tpl.id
                  ? 'border-blue-500 bg-blue-50/30'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-lg'
              ]"
            >
              <!-- 选中标记 -->
              <div
                v-if="selectedTemplate === tpl.id"
                class="absolute top-4 right-4 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white"
              >
                ✓
              </div>

              <!-- 默认标记 -->
              <div
                v-else-if="tpl.isDefault"
                class="absolute top-4 right-4 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium"
              >
                默认
              </div>

              <!-- 模板预览 -->
              <div class="aspect-[3/4] bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mb-4 overflow-hidden group-hover:scale-[1.02] transition-transform">
                <div class="text-6xl">{{ tpl.thumbnail }}</div>
              </div>

              <h3 class="text-lg font-bold text-slate-800 mb-1">{{ tpl.name }}</h3>
              <p class="text-sm text-slate-500 mb-4">{{ tpl.description }}</p>

              <div class="flex flex-wrap gap-2">
                <span
                  v-for="tag in tpl.tags"
                  :key="tag"
                  class="px-2 py-1 bg-slate-100 rounded-lg text-xs text-slate-600"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

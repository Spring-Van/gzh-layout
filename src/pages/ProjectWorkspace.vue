<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { ImageFile } from '../types';

const route = useRoute();
const router = useRouter();

const activeTab = ref<'material' | 'layout' | 'sync'>('material');
const openSteps = ref<Record<string, boolean>>({ '1': true, '2': true, '3': true, '4': true });
const config = ref({
  path: 'X:\\自媒体壁纸\\05-iPhone壁纸',
  steps: {
    deduplicate: true,
    split: true,
    typography: true,
    sync: true,
  },
  deduplicateMode: 'recycle',
  splitConfig: {
    startDate: '2026-03-25',
    groupsPerDay: 2,
    imagesPerGroup: 9,
  },
  typographyConfig: {
    templateId: 'default-grid',
    titles: ['闪电排版工具', '每日壁纸精选'],
  },
  wechatConfig: {
    appId: 'wx318e3d832dfebd71',
    appSecret: '********************************',
  },
});

// 模拟数据
const mockImages: ImageFile[] = [
  {
    id: '1',
    path: '/mock/img1.jpg',
    name: 'wallpaper_01.jpg',
    size: 2048000,
    width: 1080,
    height: 1920,
    format: 'jpg',
    enabled: true,
    isCover: true,
    order: 0,
  },
  {
    id: '2',
    path: '/mock/img2.jpg',
    name: 'wallpaper_02.jpg',
    size: 1843200,
    width: 1080,
    height: 1920,
    format: 'jpg',
    enabled: true,
    isCover: false,
    order: 1,
  },
  {
    id: '3',
    path: '/mock/img3.jpg',
    name: 'wallpaper_03.jpg',
    size: 2201600,
    width: 1080,
    height: 1920,
    format: 'jpg',
    enabled: true,
    isCover: false,
    order: 2,
  },
  {
    id: '4',
    path: '/mock/img4.jpg',
    name: 'wallpaper_04.jpg',
    size: 1966080,
    width: 1080,
    height: 1920,
    format: 'jpg',
    enabled: true,
    isCover: false,
    order: 3,
  },
  {
    id: '5',
    path: '/mock/img5.jpg',
    name: 'wallpaper_05.jpg',
    size: 2129920,
    width: 1080,
    height: 1920,
    format: 'jpg',
    enabled: true,
    isCover: false,
    order: 4,
  },
  {
    id: '6',
    path: '/mock/img6.jpg',
    name: 'wallpaper_06.jpg',
    size: 1769472,
    width: 1080,
    height: 1920,
    format: 'jpg',
    enabled: true,
    isCover: false,
    order: 5,
  },
];

const articleTitle = ref('2026-03 高清壁纸合集');
const articleSummary = ref('');
const selectedTemplate = ref('minimal');
const themeColor = ref('#3b82f6');
const footerText = ref('感谢观看，欢迎关注');
const previewMode = ref<'mobile' | 'desktop'>('mobile');

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

const totalSize = computed(() => mockImages.reduce((sum, img) => sum + img.size, 0));
const enabledCount = computed(() => mockImages.filter(img => img.enabled).length);

const toggleStep = (id: string) => {
  openSteps.value = { ...openSteps.value, [id]: !openSteps.value[id] };
};

const toggleImageEnabled = (id: string) => {
  const img = mockImages.find(i => i.id === id);
  if (img) img.enabled = !img.enabled;
};

const setCoverImage = (id: string) => {
  mockImages.forEach(img => {
    img.isCover = img.id === id;
  });
};

onMounted(() => {
  const projectId = route.params.id as string;
  console.log('Loading project:', projectId);
});
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
          :class="[
            'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
            activeTab === 'material'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          ]"
          @click="activeTab = 'material'"
        >
          <span class="text-lg">📁</span>
          <span class="font-medium">项目处理</span>
        </button>
        <button
          :class="[
            'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
            activeTab === 'layout'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          ]"
          @click="activeTab = 'layout'"
        >
          <span class="text-lg">📄</span>
          <span class="font-medium">自定义模板库</span>
        </button>
        <button
          :class="[
            'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
            activeTab === 'sync'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          ]"
          @click="activeTab = 'sync'"
        >
          <span class="text-lg">⚙️</span>
          <span class="font-medium">账号设置</span>
        </button>
        <button
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          @click="router.push('/history')"
        >
          <span class="text-lg">📜</span>
          <span class="font-medium">历史记录</span>
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

    <!-- 主工作区 -->
    <main class="flex-1 flex flex-col min-w-0 relative">
      <!-- 顶部路径栏 -->
      <header class="h-20 bg-white border-b border-slate-200 flex items-center px-8 sticky top-0 z-10">
        <div class="flex-1 flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 max-w-2xl">
          <span class="text-slate-400">📂</span>
          <input
            type="text"
            v-model="config.path"
            class="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-600"
          />
          <div class="h-4 w-px bg-slate-200 mx-2" />
          <div class="flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap">
            <span>💾</span>
            <span>剩余 {{ formatBytes(55 * 1024 * 1024 * 1024) }}</span>
          </div>
          <button class="p-1.5 hover:bg-white rounded-lg transition-colors text-slate-500">
            <span class="text-sm">›</span>
          </button>
        </div>

        <div class="ml-auto flex items-center gap-4">
          <button
            class="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20 active:scale-95"
          >
            <span>▶</span>
            开始处理
          </button>
        </div>
      </header>

      <!-- 工作区内容 -->
      <div class="flex-1 flex overflow-hidden">
        <!-- 左栏：配置 -->
        <section class="w-[400px] border-r border-slate-200 bg-white overflow-y-auto p-6 space-y-6">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-lg font-bold text-slate-800">任务参数配置</h2>
            <span class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">4 步骤</span>
          </div>

          <!-- 步骤卡片 1：去重 -->
          <div
            :class="[
              'border rounded-2xl overflow-hidden transition-all duration-300',
              config.steps.deduplicate ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-75'
            ]"
          >
            <div class="flex items-center justify-between px-5 py-4 cursor-pointer" @click="toggleStep('1')">
              <div class="flex items-center gap-3">
                <div
                  :class="[
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                    config.steps.deduplicate ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'
                  ]"
                >
                  1
                </div>
                <h3 class="font-semibold text-slate-800">图片去重</h3>
              </div>
              <div class="flex items-center gap-3">
                <div
                  @click.stop="config.steps.deduplicate = !config.steps.deduplicate"
                  :class="[
                    'w-10 h-5 rounded-full relative transition-colors duration-200 cursor-pointer',
                    config.steps.deduplicate ? 'bg-blue-500' : 'bg-slate-300'
                  ]"
                >
                  <div
                    :class="[
                      'absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-200',
                      config.steps.deduplicate ? 'left-6' : 'left-1'
                    ]"
                  />
                </div>
                <span>{{ openSteps['1'] ? '↑' : '↓' }}</span>
              </div>
            </div>
            <div v-if="openSteps['1']" class="px-5 pb-5 border-t border-slate-50 pt-4">
              <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span class="text-sm font-medium text-slate-600">处理模式</span>
                <div class="flex bg-white p-1 rounded-lg border border-slate-200">
                  <button
                    :class="[
                      'px-3 py-1 text-xs font-bold rounded-md transition-all',
                      config.deduplicateMode === 'recycle'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    ]"
                    @click="config.deduplicateMode = 'recycle'"
                  >
                    移至回收站
                  </button>
                  <button
                    :class="[
                      'px-3 py-1 text-xs font-bold rounded-md transition-all',
                      config.deduplicateMode === 'delete'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    ]"
                    @click="config.deduplicateMode = 'delete'"
                  >
                    物理删除
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 步骤卡片 2：拆分 -->
          <div
            :class="[
              'border rounded-2xl overflow-hidden transition-all duration-300',
              config.steps.split ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-75'
            ]"
          >
            <div class="flex items-center justify-between px-5 py-4 cursor-pointer" @click="toggleStep('2')">
              <div class="flex items-center gap-3">
                <div
                  :class="[
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                    config.steps.split ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'
                  ]"
                >
                  2
                </div>
                <h3 class="font-semibold text-slate-800">图片拆分</h3>
              </div>
              <div class="flex items-center gap-3">
                <div
                  @click.stop="config.steps.split = !config.steps.split"
                  :class="[
                    'w-10 h-5 rounded-full relative transition-colors duration-200 cursor-pointer',
                    config.steps.split ? 'bg-blue-500' : 'bg-slate-300'
                  ]"
                >
                  <div
                    :class="[
                      'absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-200',
                      config.steps.split ? 'left-6' : 'left-1'
                    ]"
                  />
                </div>
                <span>{{ openSteps['2'] ? '↑' : '↓' }}</span>
              </div>
            </div>
            <div v-if="openSteps['2']" class="px-5 pb-5 border-t border-slate-50 pt-4 space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">起始日期</label>
                  <div class="relative">
                    <input
                      type="date"
                      v-model="config.splitConfig.startDate"
                      class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div class="space-y-1.5">
                  <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">每日组数</label>
                  <input
                    type="number"
                    v-model.number="config.splitConfig.groupsPerDay"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">标题矩阵</label>
                <div class="space-y-2 max-h-48 overflow-y-auto pr-2">
                  <div v-for="(title, i) in config.typographyConfig.titles" :key="i" class="flex items-center gap-3">
                    <span class="text-[10px] font-mono font-bold text-slate-300">{{ (i + 1).toString().padStart(2, '0') }}</span>
                    <input
                      type="text"
                      v-model="config.typographyConfig.titles[i]"
                      class="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <button class="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-all flex items-center justify-center gap-2 text-xs font-bold">
                  <span>+</span> 批量导入标题
                </button>
              </div>
            </div>
          </div>

          <!-- 步骤卡片 3：排版 -->
          <div
            :class="[
              'border rounded-2xl overflow-hidden transition-all duration-300',
              config.steps.typography ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-75'
            ]"
          >
            <div class="flex items-center justify-between px-5 py-4 cursor-pointer" @click="toggleStep('3')">
              <div class="flex items-center gap-3">
                <div
                  :class="[
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                    config.steps.typography ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'
                  ]"
                >
                  3
                </div>
                <h3 class="font-semibold text-slate-800">壁纸排版</h3>
              </div>
              <div class="flex items-center gap-3">
                <div
                  @click.stop="config.steps.typography = !config.steps.typography"
                  :class="[
                    'w-10 h-5 rounded-full relative transition-colors duration-200 cursor-pointer',
                    config.steps.typography ? 'bg-blue-500' : 'bg-slate-300'
                  ]"
                >
                  <div
                    :class="[
                      'absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-200',
                      config.steps.typography ? 'left-6' : 'left-1'
                    ]"
                  />
                </div>
                <span>{{ openSteps['3'] ? '↑' : '↓' }}</span>
              </div>
            </div>
            <div v-if="openSteps['3']" class="px-5 pb-5 border-t border-slate-50 pt-4 space-y-3">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">选择模板</label>
              <select
                v-model="config.typographyConfig.templateId"
                class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="default-grid">默认网格</option>
                <option value="minimal">极简长图</option>
                <option value="card">卡片式</option>
              </select>
              <button class="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
                <span>⌨️</span> 进入 CSS 实验室
              </button>
            </div>
          </div>

          <!-- 步骤卡片 4：同步 -->
          <div
            :class="[
              'border rounded-2xl overflow-hidden transition-all duration-300',
              config.steps.sync ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-75'
            ]"
          >
            <div class="flex items-center justify-between px-5 py-4 cursor-pointer" @click="toggleStep('4')">
              <div class="flex items-center gap-3">
                <div
                  :class="[
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                    config.steps.sync ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'
                  ]"
                >
                  4
                </div>
                <h3 class="font-semibold text-slate-800">同步微信</h3>
              </div>
              <div class="flex items-center gap-3">
                <div
                  @click.stop="config.steps.sync = !config.steps.sync"
                  :class="[
                    'w-10 h-5 rounded-full relative transition-colors duration-200 cursor-pointer',
                    config.steps.sync ? 'bg-blue-500' : 'bg-slate-300'
                  ]"
                >
                  <div
                    :class="[
                      'absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-200',
                      config.steps.sync ? 'left-6' : 'left-1'
                    ]"
                  />
                </div>
                <span>{{ openSteps['4'] ? '↑' : '↓' }}</span>
              </div>
            </div>
            <div v-if="openSteps['4']" class="px-5 pb-5 border-t border-slate-50 pt-4 space-y-3">
              <div class="p-3 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
                <span class="text-blue-500 shrink-0 mt-0.5">ℹ️</span>
                <p class="text-[11px] text-blue-700 leading-relaxed">
                  同步前请确保已在微信后台将当前 IP 加入白名单。
                </p>
              </div>
              <div class="space-y-3">
                <input
                  type="text"
                  placeholder="AppID"
                  v-model="config.wechatConfig.appId"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
                <input
                  type="password"
                  placeholder="AppSecret"
                  v-model="config.wechatConfig.appSecret"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </section>

        <!-- 中栏：预览 -->
        <section class="flex-1 bg-slate-100 flex flex-col p-8 overflow-hidden">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <span class="text-slate-400">📱</span>
              <h2 class="text-lg font-bold text-slate-800">实时排版预览</h2>
            </div>
            <div class="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              <button
                :class="[
                  'px-4 py-1.5 text-xs font-bold rounded-lg',
                  previewMode === 'mobile' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
                ]"
                @click="previewMode = 'mobile'"
              >
                手机模式
              </button>
              <button
                :class="[
                  'px-4 py-1.5 text-xs font-bold rounded-lg',
                  previewMode === 'desktop' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
                ]"
                @click="previewMode = 'desktop'"
              >
                桌面预览
              </button>
            </div>
          </div>

          <div class="flex-1 flex items-center justify-center">
            <!-- 手机模拟器 -->
            <div class="w-[320px] h-[640px] bg-white rounded-[40px] border-[8px] border-slate-900 shadow-2xl overflow-hidden relative flex flex-col">
              <div class="h-6 w-32 bg-slate-900 absolute top-0 left-1/2 -translate-x-1/2 rounded-b-2xl z-20" />

              <div class="flex-1 overflow-y-auto bg-white pt-6">
                <!-- 文章内容 -->
                <div class="px-4 pb-8">
                  <h1 class="text-xl font-bold mb-4">{{ articleTitle || '2026-03 高清壁纸合集' }}</h1>

                  <div class="flex items-center gap-2 text-xs text-slate-400 mb-6">
                    <div class="w-6 h-6 rounded-full bg-slate-200" />
                    <span>闪电排版</span>
                    <span>·</span>
                    <span>{{ new Date().toLocaleDateString() }}</span>
                  </div>

                  <div v-if="articleSummary" class="text-slate-600 mb-6">
                    {{ articleSummary }}
                  </div>

                  <div class="space-y-4">
                    <div
                      v-for="(img, idx) in mockImages.filter(i => i.enabled)"
                      :key="img.id"
                      class="rounded-xl overflow-hidden bg-slate-100"
                    >
                      <div class="aspect-[3/4] bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                        <span class="text-slate-500">图片 {{ idx + 1 }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="mt-8 pt-6 border-t border-slate-100 text-center text-slate-400 text-sm">
                    {{ footerText }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 右栏：监控 -->
        <section class="w-[320px] border-l border-slate-200 bg-white p-6 flex flex-col space-y-8">
          <div class="space-y-4">
            <h2 class="text-lg font-bold text-slate-800">实时监控面板</h2>

            <!-- 圆形图表 -->
            <div class="h-48 relative flex items-center justify-center">
              <div class="relative">
                <!-- 外圈 -->
                <div class="w-36 h-36 rounded-full border-8 border-slate-100" />
                <!-- 进度 -->
                <div
                  class="absolute inset-0 rounded-full border-8 border-blue-500"
                  style="clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%)"
                />
                <!-- 中心文字 -->
                <div class="absolute inset-0 flex items-center justify-center flex-col">
                  <span class="block text-2xl font-black text-slate-800">100%</span>
                  <span class="text-[10px] font-bold text-slate-400 uppercase">资源就绪</span>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full bg-blue-500" />
                  <span class="text-slate-500 font-medium">待处理</span>
                </div>
                <span class="font-bold text-slate-800">40%</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full bg-emerald-500" />
                  <span class="text-slate-500 font-medium">已去重</span>
                </div>
                <span class="font-bold text-slate-800">30%</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full bg-amber-500" />
                  <span class="text-slate-500 font-medium">已拆分</span>
                </div>
                <span class="font-bold text-slate-800">30%</span>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">API 链路状态</h3>
              <span class="text-[10px] font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded">稳定</span>
            </div>

            <div class="p-4 bg-slate-50 rounded-2xl space-y-4">
              <div class="space-y-2">
                <div class="flex justify-between text-[10px] font-bold">
                  <span class="text-slate-400">AccessToken 寿命</span>
                  <span class="text-blue-600">84%</span>
                </div>
                <div class="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div class="h-full bg-blue-500 w-[84%]" />
                </div>
              </div>
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                  🖥️
                </div>
                <div>
                  <p class="text-[11px] font-bold text-slate-700">IP 访问权限</p>
                  <p class="text-[10px] text-slate-400">175.152.205.147 (已授权)</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 日志预览 -->
          <div class="flex-1 flex flex-col min-h-0">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">实时运行日志</h3>
            <div class="flex-1 bg-slate-900 rounded-2xl p-4 font-mono text-[10px] overflow-y-auto space-y-1.5">
              <span class="text-slate-600 italic">等待任务启动...</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

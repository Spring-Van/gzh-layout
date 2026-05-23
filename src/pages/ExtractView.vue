<template>
  <section class="w-full h-full flex flex-col bg-slate-50">
    <header class="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
      <div class="flex items-center gap-3">
        <button
          class="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          @click="$router.push('/')"
        >
          <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 class="text-xl font-bold text-slate-800">图片提取</h1>
          <p class="text-sm text-slate-500">从各大平台链接批量提取原图</p>
        </div>
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden">
      <aside class="w-96 bg-white border-r border-slate-200 flex flex-col">
        <div class="p-4 border-b border-slate-100">
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-slate-700">输入链接</label>
            <span class="text-[10px] text-slate-400">每行一个，支持粘贴分享文本</span>
          </div>
          <textarea
            v-model="urlInput"
            class="w-full h-40 p-3 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-400"
            placeholder="https://mp.weixin.qq.com/s/...&#10;https://www.xiaohongshu.com/explore/...&#10;https://www.douyin.com/video/..."
            :disabled="isProcessing"
            @paste="handlePaste"
          />
          <div class="mt-2 flex flex-wrap gap-1.5">
            <span class="px-2 py-0.5 text-[10px] bg-green-50 text-green-600 rounded-full">微信公众号</span>
            <span class="px-2 py-0.5 text-[10px] bg-red-50 text-red-600 rounded-full">小红书</span>
            <span class="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded-full">抖音</span>
          </div>
        </div>

        <div class="p-4 border-b border-slate-100">
          <label class="block text-sm font-medium text-slate-700 mb-2">保存目录</label>
          <div class="flex gap-2">
            <input
              v-model="savePath"
              class="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
              placeholder="选择保存目录..."
              readonly
            />
            <button
              class="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              @click="selectFolder"
              :disabled="isProcessing"
            >
              <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </button>
          </div>
        </div>

        <div class="p-4 flex-1 overflow-y-auto">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-slate-700">
              解析结果
              <span v-if="tasks.length > 0" class="text-slate-400">（{{ tasks.length }} 个链接）</span>
            </h3>
            <div class="flex items-center gap-2">
              <button
                class="text-xs text-slate-400 hover:text-blue-500 transition-colors"
                @click="showLogs = !showLogs"
              >
                {{ showLogs ? '隐藏日志' : '显示日志' }}
              </button>
              <button
                v-if="tasks.length > 0"
                class="text-xs text-slate-400 hover:text-red-500 transition-colors"
                @click="clearTasks"
                :disabled="isProcessing"
              >
                清空
              </button>
            </div>
          </div>

          <div v-if="tasks.length === 0" class="text-center py-8 text-slate-400">
            <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p class="text-sm">输入链接后点击解析</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="task in tasks"
              :key="task.id"
              class="p-3 bg-slate-50 rounded-lg border border-slate-100"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="platformClass(task.platform)">
                  {{ platformName(task.platform) }}
                </span>
                <span class="text-xs text-slate-400">
                  {{ task.images.length }} 张图片
                </span>
              </div>
              <p class="text-xs text-slate-500 truncate mb-2">{{ task.url }}</p>
              <div v-if="task.error" class="text-xs text-red-500">{{ task.error }}</div>
              <div v-if="task.status === 'parsing'" class="flex items-center gap-2 text-xs text-emerald-600">
                <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                正在解析...
              </div>
            </div>
          </div>

          <div v-if="showLogs && logs.length > 0" class="mt-4">
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-xs font-medium text-slate-600">调试日志</h4>
              <button
                class="text-xs text-slate-400 hover:text-slate-600"
                @click="logs = []"
              >
                清除
              </button>
            </div>
            <div class="bg-slate-900 text-slate-300 p-3 rounded-lg text-xs font-mono max-h-60 overflow-y-auto">
              <div v-for="(log, index) in logs" :key="index" class="py-0.5">
                {{ log }}
              </div>
            </div>
          </div>
        </div>

        <div class="p-4 border-t border-slate-100 bg-white">
          <div class="flex gap-2">
            <button
              class="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              @click="parseUrls"
              :disabled="!canParse"
            >
              <svg v-if="isProcessing" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ isProcessing ? '解析中...' : '解析链接' }}
            </button>
            <button
              class="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              @click="downloadAll"
              :disabled="isDownloading"
            >
              <svg v-if="isDownloading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ isDownloading ? '下载中...' : '下载全部' }}
            </button>
          </div>
        </div>
      </aside>

      <main class="flex-1 flex flex-col overflow-hidden">
        <div class="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-100">
          <div class="flex items-center gap-4">
            <h2 class="text-sm font-medium text-slate-700">
              图片预览
              <span v-if="allImages.length > 0" class="text-slate-400">（{{ downloadedCount }}/{{ allImages.length }}）</span>
            </h2>
            <div v-if="isDownloading" class="flex items-center gap-2">
              <div class="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  class="h-full bg-blue-500 rounded-full transition-all duration-300"
                  :style="{ width: `${downloadProgress}%` }"
                />
              </div>
              <span class="text-xs text-slate-500">{{ downloadProgress }}%</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              :class="{ 'bg-slate-100': viewMode === 'grid' }"
              @click="viewMode = 'grid'"
            >
              <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              class="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              :class="{ 'bg-slate-100': viewMode === 'list' }"
              @click="viewMode = 'list'"
            >
              <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-6 relative">
          <div v-if="isProcessing" class="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <div class="text-center">
              <svg class="w-12 h-12 mx-auto mb-3 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <p class="text-sm text-slate-500">正在解析链接...</p>
            </div>
          </div>
          
          <div v-if="allImages.length === 0 && !isProcessing" class="h-full flex items-center justify-center">
            <div class="text-center">
              <svg class="w-20 h-20 mx-auto mb-4 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p class="text-slate-400">解析链接后将在此显示图片</p>
            </div>
          </div>

          <div v-else-if="viewMode === 'grid'" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <div
              v-for="image in allImages"
              :key="image.id"
              class="group relative aspect-square bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <img
                :src="getProxiedImageSrc(image)"
                class="w-full h-full object-cover"
                @error="handleImageError"
                loading="lazy"
              />
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <div class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button
                    class="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors"
                    @click="previewImage(image)"
                  >
                    <svg class="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </button>
                </div>
              </div>
              <div class="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent">
                <p class="text-xs text-white truncate">{{ image.filename }}</p>
              </div>
              <div v-if="image.downloaded" class="absolute top-2 right-2">
                <span class="w-5 h-5 flex items-center justify-center bg-green-500 rounded-full">
                  <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              </div>
              <div v-else-if="image.error" class="absolute top-2 right-2">
                <span class="w-5 h-5 flex items-center justify-center bg-red-500 rounded-full">
                  <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              </div>
            </div>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="image in allImages"
              :key="image.id"
              class="flex items-center gap-4 p-3 bg-white rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
            >
              <div class="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                <img
                  :src="getProxiedImageSrc(image)"
                  class="w-full h-full object-cover"
                  @error="handleImageError"
                  loading="lazy"
                />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-slate-700 truncate">{{ image.filename }}</p>
                <p class="text-xs text-slate-400">{{ platformName(image.platform) }}</p>
              </div>
              <div class="flex items-center gap-2">
                <span v-if="image.downloaded" class="px-2 py-0.5 text-xs bg-green-50 text-green-600 rounded-full">已下载</span>
                <span v-else-if="image.error" class="px-2 py-0.5 text-xs bg-red-50 text-red-600 rounded-full">失败</span>
                <span v-else class="px-2 py-0.5 text-xs bg-slate-100 text-slate-500 rounded-full">待下载</span>
                <button
                  class="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  @click="previewImage(image)"
                >
                  <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <div
      v-if="previewImageVisible"
      class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
      @click.self="previewImageVisible = false"
      @keydown="handleKeydown"
      tabindex="0"
    >
      <button
        class="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-lg transition-colors z-10"
        @click="previewImageVisible = false"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <button
        v-if="previewImageIndex > 0"
        class="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white/10 rounded-full transition-colors z-10"
        @click="prevImage"
      >
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        v-if="previewImageIndex < allImages.length - 1"
        class="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white/10 rounded-full transition-colors z-10"
        @click="nextImage"
      >
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <img
        :src="previewImageUrl"
        class="max-w-full max-h-full object-contain rounded-lg"
        @error="handleImageError"
      />

      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 rounded-full text-white text-sm">
        {{ previewImageIndex + 1 }} / {{ allImages.length }}
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue';
import { useToast } from '../hooks/useToast';

interface ExtractedImage {
  id: string;
  url: string;
  originalUrl: string;
  filename: string;
  platform: string;
  downloaded: boolean;
  localPath?: string;
  error?: string;
}

interface ExtractTask {
  id: string;
  url: string;
  platform: string;
  status: 'pending' | 'parsing' | 'downloading' | 'completed' | 'failed';
  images: ExtractedImage[];
  error?: string;
}

const { success: showSuccess, error: showError, warning: showWarning } = useToast();

const urlInput = ref('');
const savePath = ref('');
const tasks = ref<ExtractTask[]>([]);
const isProcessing = ref(false);
const isDownloading = ref(false);
const downloadProgress = ref(0);
const viewMode = ref<'grid' | 'list'>('grid');
const previewImageVisible = ref(false);
const previewImageIndex = ref(0);
const showLogs = ref(false);
const logs = ref<string[]>([]);

const imageProxyCache = reactive<Record<string, string>>({});
const imageLoadingState = reactive<Record<string, boolean>>({});

let unsubscribeProgress: (() => void) | null = null;
let unsubscribeLog: (() => void) | null = null;

const allImages = computed(() => {
  return tasks.value.flatMap(task => task.images);
});

const previewImageUrl = computed(() => {
  const image = allImages.value[previewImageIndex.value];
  if (!image) return '';
  if (image.downloaded && image.localPath) {
    return 'file://' + image.localPath;
  }
  if (imageProxyCache[image.id]) {
    return imageProxyCache[image.id];
  }
  return image.url;
});

const downloadedCount = computed(() => {
  return allImages.value.filter(img => img.downloaded).length;
});

const canParse = computed(() => {
  return urlInput.value.trim().length > 0 && !isProcessing.value;
});

function platformName(platform: string): string {
  const names: Record<string, string> = {
    wechat: '微信公众号',
    xiaohongshu: '小红书',
    douyin: '抖音',
    weibo: '微博',
    unknown: '其他',
  };
  return names[platform] || platform;
}

function platformClass(platform: string): string {
  const classes: Record<string, string> = {
    wechat: 'bg-green-50 text-green-600',
    xiaohongshu: 'bg-red-50 text-red-600',
    douyin: 'bg-slate-100 text-slate-600',
    weibo: 'bg-orange-50 text-orange-600',
    unknown: 'bg-slate-100 text-slate-500',
  };
  return classes[platform] || classes.unknown;
}

function getProxiedImageSrc(image: ExtractedImage): string {
  if (image.downloaded && image.localPath) {
    return 'file://' + image.localPath;
  }
  
  if (imageProxyCache[image.id]) {
    return imageProxyCache[image.id];
  }
  
  if (!imageLoadingState[image.id]) {
    imageLoadingState[image.id] = true;
    loadProxiedImage(image);
  }
  
  return '';
}

async function loadProxiedImage(image: ExtractedImage) {
  try {
    const base64Data = await window.electronAPI.extract.proxyImage(image.url);
    imageProxyCache[image.id] = base64Data;
  } catch (error) {
    console.error('代理图片加载失败:', error);
    imageProxyCache[image.id] = image.url;
  }
}

function extractUrlsFromText(text: string): string[] {
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
  const matches = text.match(urlPattern);
  return matches || [];
}

function handlePaste(event: ClipboardEvent) {
  event.preventDefault();
  const pastedText = event.clipboardData?.getData('text') || '';
  const urls = extractUrlsFromText(pastedText);
  
  if (urls.length > 0) {
    const currentLines = urlInput.value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    const newLines = [...currentLines, ...urls];
    urlInput.value = newLines.join('\n');
  } else {
    urlInput.value = urlInput.value + pastedText;
  }
}

async function selectFolder() {
  try {
    const result = await window.electronAPI.selectFolder();
    if (result) {
      savePath.value = result;
    }
  } catch (error) {
    showError('选择文件夹失败');
  }
}

async function parseUrls() {
  if (!canParse.value) return;

  isProcessing.value = true;
  const urls = urlInput.value
    .split('\n')
    .map(url => url.trim())
    .filter(url => url.length > 0);

  try {
    const results = await window.electronAPI.extract.parseUrls(urls);
    tasks.value = results;
    
    const totalImages = results.reduce((sum: number, task: ExtractTask) => sum + task.images.length, 0);
    if (totalImages > 0) {
      showSuccess(`解析完成，共发现 ${totalImages} 张图片`);
    } else {
      showWarning('未找到可下载的图片');
    }
  } catch (error) {
    showError('解析失败：' + (error instanceof Error ? error.message : '未知错误'));
  } finally {
    isProcessing.value = false;
  }
}

async function downloadAll() {
  if (allImages.value.length === 0) {
    showWarning('请先解析链接');
    return;
  }
  
  if (!savePath.value) {
    showWarning('请先选择保存目录');
    return;
  }
  
  if (isDownloading.value) return;

  isDownloading.value = true;
  showLogs.value = true;
  downloadProgress.value = 0;

  try {
    logs.value.push(`[前端] 开始下载 ${allImages.value.length} 张图片到 ${savePath.value}`);
    const plainImages = JSON.parse(JSON.stringify(allImages.value));
    const results = await window.electronAPI.extract.downloadImages(plainImages, savePath.value);
    logs.value.push(`[前端] 下载完成，结果: ${results?.length ?? 'null'} 张`);
    
    for (const task of tasks.value) {
      task.images = task.images.map(img => {
        const result = results.find((r: ExtractedImage) => r.id === img.id);
        return result || img;
      });
    }

    const successCount = results.filter((r: ExtractedImage) => r.downloaded).length;
    const failCount = results.filter((r: ExtractedImage) => !r.downloaded).length;

    if (failCount === 0) {
      showSuccess(`全部下载完成，共 ${successCount} 张图片`);
    } else {
      showWarning(`下载完成：${successCount} 成功，${failCount} 失败`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : '未知错误';
    logs.value.push(`[前端] 下载出错: ${msg}`);
    showError('下载失败：' + msg);
  } finally {
    isDownloading.value = false;
  }
}

function clearTasks() {
  tasks.value = [];
  urlInput.value = '';
  logs.value = [];
  Object.keys(imageProxyCache).forEach(key => {
    delete imageProxyCache[key];
  });
  Object.keys(imageLoadingState).forEach(key => {
    delete imageLoadingState[key];
  });
}

function previewImage(image: ExtractedImage) {
  const index = allImages.value.findIndex(img => img.id === image.id);
  if (index !== -1) {
    previewImageIndex.value = index;
  }
  previewImageVisible.value = true;
}

function prevImage() {
  if (previewImageIndex.value > 0) {
    previewImageIndex.value--;
  }
}

function nextImage() {
  if (previewImageIndex.value < allImages.value.length - 1) {
    previewImageIndex.value++;
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (!previewImageVisible.value) return;
  if (event.key === 'ArrowLeft') {
    prevImage();
  } else if (event.key === 'ArrowRight') {
    nextImage();
  } else if (event.key === 'Escape') {
    previewImageVisible.value = false;
  }
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptLTIgMTVsLTUtNSAxLjQxLTEuNDFMMTAgMTQuMTdsNy41OS03LjU5TDkgOWwtMyAzeiIgZmlsbD0iI0NDQyIvPjwvc3ZnPg==';
}

onMounted(() => {
  unsubscribeProgress = window.electronAPI.extract.onDownloadProgress((progress: any) => {
    downloadProgress.value = Math.round((progress.current / progress.total) * 100);
    
    const image = allImages.value.find(img => img.id === progress.image.id);
    if (image) {
      image.downloaded = progress.image.downloaded;
      image.localPath = progress.image.localPath;
      image.error = progress.image.error;
    }
  });
  
  unsubscribeLog = window.electronAPI.extract.onLog((message: string) => {
    logs.value.push(message);
    if (logs.value.length > 200) {
      logs.value.shift();
    }
  });
  
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  if (unsubscribeProgress) {
    unsubscribeProgress();
  }
  if (unsubscribeLog) {
    unsubscribeLog();
  }
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>

<template>
  <section class="w-full h-full p-6 md:p-10 flex flex-col bg-slate-50 overflow-y-auto">
    <div class="max-w-4xl mx-auto w-full">
      <button class="text-sm text-slate-500 flex items-center gap-1 mb-6 hover:text-slate-800 transition" @click="router.back()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
        </svg>
        返回编辑排版
      </button>

      <h1 class="text-2xl font-bold mb-2 text-slate-800">任务终点：发布矩阵同步</h1>
      <p class="text-slate-500 text-sm mb-8">即将执行自动流水线作业，将本地素材推至云端并生成可用草稿。</p>

      <!-- 微信配置区域 -->
      <div v-if="!uploadSuccess" class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div class="bg-slate-50/80 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <span class="text-sm font-bold text-slate-700">公众号配置</span>
          <span class="text-xs text-slate-500 bg-white border rounded px-2 py-0.5">必填</span>
        </div>
        <div class="p-5 space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1.5">AppID</label>
            <input
              v-model="appId"
              type="text"
              placeholder="微信公众号 AppID"
              class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              :disabled="isUploading"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1.5">AppSecret</label>
            <input
              v-model="appSecret"
              type="password"
              placeholder="微信公众号 AppSecret"
              class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              :disabled="isUploading"
            />
          </div>
          <div class="flex items-center gap-2">
            <input
              id="publish-checkbox"
              v-model="shouldPublish"
              type="checkbox"
              class="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
              :disabled="isUploading"
            />
            <label for="publish-checkbox" class="text-xs text-slate-600">同步后自动发布（否则仅创建草稿）</label>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div class="bg-slate-50/80 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <span class="text-sm font-bold text-slate-700">就绪队列 ({{ syncArticles.length }} 篇)</span>
          <span class="text-xs text-slate-500 bg-white border rounded px-2 py-0.5">自动抓取首图作为封面</span>
        </div>

        <div class="divide-y divide-slate-100 max-h-[400px] overflow-y-auto custom-scrollbar">
          <SyncItem
            v-for="(article, index) in syncArticles"
            :key="article.id"
            :title="article.title"
            :summary="article.summary"
            cover-style="bg-gradient-to-br from-slate-200 to-slate-300 text-slate-400"
            :file-count="article.contentImagePaths.length"
            :status="articleStatuses[index] || 'pending'"
          />
        </div>
      </div>

      <!-- 终端日志区域 -->
      <div
        class="bg-slate-900 rounded-xl overflow-hidden mb-6 flex-col shadow-lg border border-slate-800"
        :class="[showConsole ? 'flex' : 'hidden']"
      >
        <div class="bg-slate-800 px-4 py-2 flex items-center gap-2 border-b border-slate-700">
          <div class="w-3 h-3 rounded-full bg-red-500 opacity-80"></div>
          <div class="w-3 h-3 rounded-full bg-yellow-500 opacity-80"></div>
          <div class="w-3 h-3 rounded-full bg-green-500 opacity-80"></div>
          <span class="text-[10px] text-slate-400 font-mono ml-2 tracking-widest">DEPLOY_TERMINAL</span>
        </div>
        <div
          ref="consoleRef"
          class="text-emerald-400 p-4 text-xs font-mono h-[200px] overflow-y-auto flex-col gap-1 tracking-tight leading-relaxed"
        >
          <div v-for="(log, idx) in consoleLogs" :key="idx">{{ log }}</div>
        </div>
      </div>

      <!-- 错误提示 -->
      <div v-if="uploadError" class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div>
          <p class="text-sm font-medium text-red-800">上传失败</p>
          <p class="text-xs text-red-600 mt-1">{{ uploadError }}</p>
        </div>
      </div>

      <!-- 按钮与结果 -->
      <div id="sync-action-area" v-if="!uploadSuccess" class="flex justify-end gap-4">
        <button
          class="bg-primary text-white font-bold px-8 py-3.5 rounded-xl shadow-md hover:bg-primary-hover transition flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isUploading || !canStartUpload"
          @click="startBatchSync"
        >
          <svg v-if="!isUploading" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
          </svg>
          <svg v-if="isUploading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ isUploading ? '同步中...' : '一键自动同步草稿箱' }}</span>
        </button>
      </div>

      <div
        id="sync-success"
        v-if="uploadSuccess"
        class="bg-white border border-green-200 rounded-2xl p-8 items-center justify-between shadow-sm flex"
      >
        <div class="flex items-center gap-5">
          <div class="w-14 h-14 bg-green-50 text-green-600 border border-green-100 rounded-full flex items-center justify-center text-3xl shadow-sm">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <div>
            <h3 class="font-bold text-slate-800 text-lg mb-1">矩阵分发完毕！</h3>
            <p class="text-sm text-slate-500">所有批次内容已推送至绑定的微信公众号，可前往微信后台确认群发。</p>
            <p class="text-xs text-slate-400 mt-2">共创建 {{ uploadResults.length }} 篇草稿</p>
          </div>
        </div>
        <button class="px-6 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition shadow-sm" @click="router.push('/')">
          返回工作台
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import SyncItem from '../components/common/SyncItem.vue';
import { useToast } from '../hooks/useToast';
import { useWechatUpload } from '../composables/useWechatUpload';
import type { SyncArticleItem } from '../composables/useWechatUpload';
import { useBatchTypesetStore } from '../stores/batchTypeset';

const router = useRouter();
const { success, error: showError } = useToast();
const batchStore = useBatchTypesetStore();

const {
  isUploading,
  uploadSuccess,
  uploadError,
  consoleLogs,
  articleStatuses,
  uploadResults,
  buildArticleParams,
  startBatchUpload,
} = useWechatUpload();

const appId = ref('');
const appSecret = ref('');
const shouldPublish = ref(false);
const showConsole = ref(false);
const consoleRef = ref<HTMLElement | null>(null);

const syncArticles = computed<SyncArticleItem[]>(() => {
  if (batchStore.articles.length === 0) {
    return generateFallbackArticles();
  }
  return buildArticleParams(batchStore.articles, batchStore.globalConfig);
});

const canStartUpload = computed(() => {
  return appId.value.trim().length > 0 && appSecret.value.trim().length > 0 && syncArticles.value.length > 0;
});

watch(consoleLogs, () => {
  nextTick(() => {
    if (consoleRef.value) {
      consoleRef.value.scrollTop = consoleRef.value.scrollHeight;
    }
  });
}, { deep: true });

watch(isUploading, (val) => {
  if (val) {
    showConsole.value = true;
  }
});

function generateFallbackArticles(): SyncArticleItem[] {
  const countPerArticle = 9;
  const totalValidImages = 34 - 6;
  const result: SyncArticleItem[] = [];

  for (let i = 0; i < totalValidImages; i += countPerArticle) {
    const chunkSize = Math.min(countPerArticle, totalValidImages - i);
    const groupNum = result.length + 1;
    result.push({
      id: `article_${groupNum}`,
      title: `每日高级无字壁纸分享 | Vol.${groupNum}`,
      summary: `精选极简风格壁纸合集第 ${groupNum} 期。色彩沉稳内敛，不杂乱，不刺眼，适合追求桌面轻量化。`,
      coverImagePath: '',
      contentImagePaths: Array(chunkSize).fill(''),
    });
  }
  return result;
}

async function startBatchSync() {
  if (!canStartUpload.value) return;

  const result = await startBatchUpload(syncArticles.value, {
    appId: appId.value.trim(),
    appSecret: appSecret.value.trim(),
    publish: shouldPublish.value,
  });

  if (result.success) {
    success('同步完成');
  } else {
    showError('同步失败，请检查配置后重试');
  }
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>

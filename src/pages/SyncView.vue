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

      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div class="bg-slate-50/80 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <span class="text-sm font-bold text-slate-700">就绪队列 ({{ articles.length }} 篇)</span>
          <span class="text-xs text-slate-500 bg-white border rounded px-2 py-0.5">自动抓取首图作为封面</span>
        </div>

        <div class="divide-y divide-slate-100 max-h-[400px] overflow-y-auto custom-scrollbar">
          <SyncItem
            v-for="(article, index) in articles"
            :key="article.id"
            :title="article.title"
            :summary="article.summary"
            :cover-style="article.images[0]?.style || 'bg-slate-200'"
            :file-count="article.images.length"
            :status="syncStatuses[index]"
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
          id="sync-console"
          class="text-emerald-400 p-4 text-xs font-mono h-[200px] overflow-y-auto flex-col gap-1 tracking-tight leading-relaxed"
        >
          <div v-for="(log, idx) in consoleLogs" :key="idx">{{ log }}</div>
        </div>
      </div>

      <!-- 按钮与结果 -->
      <div id="sync-action-area" v-if="!syncSuccess" class="flex justify-end gap-4">
        <button
          class="bg-primary text-white font-bold px-8 py-3.5 rounded-xl shadow-md hover:bg-primary-hover transition flex items-center gap-2 text-sm"
          :disabled="syncing"
          @click="startBatchSync"
        >
          <svg v-if="!syncing" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
          </svg>
          <svg v-if="syncing" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ syncing ? '同步中...' : '一键自动同步草稿箱' }}</span>
        </button>
      </div>

      <div
        id="sync-success"
        v-if="syncSuccess"
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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import SyncItem from '../components/common/SyncItem.vue';
import { useToast } from '../hooks/useToast';

const router = useRouter();
const { success, error } = useToast();

// 模拟文章数据
const mockImageStyles = [
  'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-400',
  'bg-gradient-to-br from-stone-200 to-stone-300 text-stone-400',
  'bg-gradient-to-br from-zinc-200 to-zinc-300 text-zinc-400',
  'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-400'
];

interface Article {
  id: string;
  title: string;
  summary: string;
  images: {
    id: string;
    style: string;
  }[];
}

const articles = ref<Article[]>([]);
const syncStatuses = ref<('pending' | 'processing' | 'success' | 'failed')[]>([]);
const syncing = ref(false);
const syncSuccess = ref(false);
const showConsole = ref(false);
const consoleLogs = ref<string[]>([]);

// 初始化
onMounted(() => {
  generateMockData();
});

// 生成模拟数据
function generateMockData() {
  const countPerArticle = 9;
  const totalValidImages = 34 - 6;
  const result: Article[] = [];

  let imgCounter = 1;
  for (let i = 0; i < totalValidImages; i += countPerArticle) {
    const chunkSize = Math.min(countPerArticle, totalValidImages - i);
    const images = [];
    for(let j=0; j<chunkSize; j++) {
      images.push({
        id: `PIC_${imgCounter.toString().padStart(3, '0')}`,
        style: mockImageStyles[Math.floor(Math.random() * mockImageStyles.length)]
      });
      imgCounter++;
    }

    const groupNum = result.length + 1;
    result.push({
      id: `article_${groupNum}`,
      title: `每日高级无字壁纸分享 | Vol.${groupNum}`,
      summary: `精选极简风格壁纸合集第 ${groupNum} 期。色彩沉稳内敛，不杂乱，不刺眼，适合追求桌面轻量化。`,
      images: images
    });
  }
  articles.value = result;
  syncStatuses.value = articles.value.map(() => 'pending');
}

// 开始同步
async function startBatchSync() {
  syncing.value = true;
  showConsole.value = true;
  consoleLogs.value = [];
  syncSuccess.value = false;

  try {
    let currentArtIdx = 0;
    let step = 0;

    const processNext = async () => {
      if (currentArtIdx >= articles.value.length) {
        logToConsole('-------------------------------------------');
        logToConsole('[SYS] 所有矩阵草稿同步完毕。流水线停止。');
        syncSuccess.value = true;
        syncing.value = false;
        success('同步完成');
        return;
      }

      const art = articles.value[currentArtIdx];
      syncStatuses.value[currentArtIdx] = 'processing';

      if (step === 0) {
        logToConsole(`[START] 分发节点 ${currentArtIdx + 1}/${articles.value.length}: ${art.title}`);
        step++;
        setTimeout(processNext, 400);
      }
      else if (step === 1) {
        logToConsole(`  -> 编译渲染为微信兼容 HTML 模板结构...`);
        step++;
        setTimeout(processNext, 500);
      }
      else if (step === 2) {
        logToConsole(`  -> 正在将 ${art.images.length} 张流数据推送到微信 CDN 服务器...`);
        step++;
        setTimeout(processNext, 700);
      }
      else if (step === 3) {
        logToConsole(`  -> 生成封面对象，调用接口 POST /cgi-bin/draft/add...`);
        step++;
        setTimeout(processNext, 600);
      }
      else if (step === 4) {
        const draftId = Math.floor(Math.random()*999999);
        logToConsole(`  -> [SUCCESS] 创建草稿完成! Draft_ID: ${draftId}`);
        syncStatuses.value[currentArtIdx] = 'success';
        currentArtIdx++;
        step = 0;
        setTimeout(processNext, 500);
      }
    };

    processNext();
  } catch (e) {
    error('同步失败，请重试');
    syncing.value = false;
  }
}

function logToConsole(msg: string) {
  consoleLogs.value.push(msg);
  setTimeout(() => {
    const el = document.getElementById('sync-console');
    if (el) el.scrollTop = el.scrollHeight;
  }, 10);
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>

<template>
  <section class="w-full h-full flex flex-col lg:flex-row overflow-hidden bg-background">
    <!-- 左侧：文章矩阵列表 -->
    <div class="w-full lg:w-72 bg-white border-r border-slate-200 flex flex-col h-1/3 lg:h-full flex-shrink-0 z-10 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.02)]">
      <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
        <span class="font-bold text-sm text-slate-800 flex items-center gap-2">
          <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
          </svg>
          输出队列 ({{ articles.length }})
        </span>
        <button class="text-xs text-slate-400 hover:text-primary transition" @click="$router.push('/setup')">
          重配素材
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-slate-50/50">
        <ArticleCard
          v-for="(article, index) in articles"
          :key="article.id"
          :title="article.title"
          :image-count="article.images.length"
          :cover-style="article.images[0]?.style || 'bg-slate-200'"
          :is-active="index === currentArticleIndex"
          @click="selectArticle(index)"
        />
      </div>
    </div>

    <!-- 中间：单篇文章实时预览 -->
    <div class="flex-1 h-full flex items-center justify-center p-4 lg:p-8 relative overflow-hidden bg-slate-100/50">
      <PhoneMockup>
        <h1 class="text-[22px] font-bold mb-3 leading-snug text-slate-900" id="preview-title">
          {{ currentArticle?.title || '标题加载中...' }}
        </h1>
        <div class="flex items-center gap-2 text-sm text-slate-500 mb-6 font-medium">
          <span class="text-[#576b95]">微信公众号配置名称</span>
        </div>

        <div class="text-[15px] leading-relaxed text-slate-600 mb-8" id="preview-summary">
          {{ currentArticle?.summary || '摘要加载中...' }}
        </div>

        <div id="preview-article" class="space-y-6">
          <template v-if="currentArticle">
            <template v-if="globalTemplate === 'flow'">
              <div v-for="img in currentArticle.images" :key="img.id" class="w-full mb-3">
                <div
                  class="w-full aspect-[4/5] rounded-[4px] flex items-center justify-center text-sm font-mono tracking-widest relative border border-slate-200"
                  :class="img.style"
                >
                  {{ img.id }}
                </div>
              </div>
            </template>
            <template v-else-if="globalTemplate === 'card'">
              <div v-for="(img, idx) in currentArticle.images" :key="img.id" class="w-full p-3.5 bg-white shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06)] rounded-[1.5rem] mb-6 border border-slate-100 flex flex-col items-center">
                <div
                  class="w-full aspect-square rounded-[1rem] flex items-center justify-center text-sm font-mono border border-black/5 mb-3"
                  :class="img.style"
                >
                  {{ img.id }}
                </div>
                <span class="text-[10px] text-slate-300 font-mono tracking-wider italic">
                  FIG. {{ String(idx+1).padStart(2,'0') }}
                </span>
              </div>
            </template>
          </template>
        </div>
        <div class="mt-16 mb-8 text-center text-slate-400 text-xs">— 预览到底部了 —</div>
      </PhoneMockup>
    </div>

    <!-- 右侧：全局控制台与局部属性 -->
    <div class="w-full lg:w-80 bg-white border-l border-slate-200 h-1/2 lg:h-full overflow-y-auto flex-shrink-0 flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)] z-10">
      <div class="p-4 border-b border-slate-100 font-bold text-sm text-slate-800 flex justify-between items-center sticky top-0 bg-white">
        文案与排版智控
      </div>

      <div class="p-5 flex flex-col gap-6">
        <!-- 全局：矩阵标题规则 -->
        <div class="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-1.5 h-4 bg-primary rounded-full"></span>
            <label class="text-sm font-bold text-slate-800">矩阵发文统一前缀</label>
          </div>
          <input
            type="text"
            v-model="batchTitlePrefix"
            class="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white mb-2 shadow-sm"
            placeholder="输入标题前缀"
          />
          <button
            class="w-full bg-white border border-slate-300 text-slate-700 text-xs py-2 rounded-lg hover:bg-slate-50 transition font-medium"
            @click="applyBatchTitles"
          >
            统一应用并带上序列号
          </button>
        </div>

        <hr class="border-slate-100">

        <!-- 当前文章的单独属性 -->
        <div>
          <div class="flex items-center gap-2 mb-4">
            <span class="w-1.5 h-4 bg-slate-400 rounded-full"></span>
            <label class="text-sm font-bold text-slate-800">
              细节微调 <span class="text-xs font-normal text-primary bg-blue-50 px-1.5 rounded ml-1">#{{ currentArticleIndex + 1 }}</span>
            </label>
          </div>
          <div class="space-y-4">
            <div>
              <span class="text-xs font-medium text-slate-500 block mb-1">本篇展示标题</span>
              <input
                type="text"
                v-model="currentForm.title"
                class="w-full border border-slate-300 rounded-lg shadow-sm text-sm px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
              />
            </div>
            <div>
              <span class="text-xs font-medium text-slate-500 block mb-1">本篇导语/文案</span>
              <textarea
                v-model="currentForm.summary"
                rows="3"
                class="w-full border border-slate-300 rounded-lg shadow-sm text-sm px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition custom-scrollbar"
              ></textarea>
            </div>
          </div>
        </div>

        <hr class="border-slate-100">

        <!-- 全局排版模板 -->
        <div>
          <div class="flex justify-between items-center mb-3">
            <label class="text-sm font-bold text-slate-800">渲染模板 (全局装配)</label>
            <span class="text-[10px] text-slate-400 cursor-pointer hover:text-primary" @click="$emit('open-modal', 'template')">
              管理
            </span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div
              class="border-2 rounded-lg p-3 cursor-pointer text-center transition"
              :class="[globalTemplate === 'flow' ? 'border-primary bg-blue-50/30' : 'border-slate-200 hover:border-slate-300']"
              @click="setTemplate('flow')"
            >
              <div class="w-full h-8 bg-white rounded border border-slate-200 flex flex-col gap-1 items-center justify-center mb-2 overflow-hidden px-2 shadow-sm">
                <div class="w-full h-2 bg-slate-200 rounded-sm"></div>
                <div class="w-full h-2 bg-slate-200 rounded-sm"></div>
              </div>
              <span class="text-xs font-bold text-slate-700">常规极简流</span>
            </div>
            <div
              class="border-2 rounded-lg p-3 cursor-pointer text-center transition"
              :class="[globalTemplate === 'card' ? 'border-primary bg-blue-50/30' : 'border-slate-200 hover:border-slate-300']"
              @click="setTemplate('card')"
            >
              <div class="w-full h-8 bg-white rounded border border-slate-200 flex flex-col items-center justify-center p-1.5 mb-2 shadow-sm">
                <div class="w-full h-full bg-slate-200 rounded-sm"></div>
              </div>
              <span class="text-xs font-bold text-slate-700">留白画框</span>
            </div>
          </div>
        </div>

        <div class="flex-1 mt-4"></div>

        <div class="grid grid-cols-2 gap-3 sticky bottom-0 bg-white pt-2">
          <button class="w-full bg-slate-100 text-slate-600 font-medium py-3 rounded-xl hover:bg-slate-200 transition text-sm" @click="$router.push('/setup')">
            上一步
          </button>
          <button class="w-full bg-slate-800 text-white font-medium py-3 rounded-xl shadow-md hover:bg-slate-700 transition text-sm flex items-center justify-center gap-1" @click="$router.push('/sync')">
            确认发布
            <svg class="w-4 h-4 relative top-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useProjectStore } from '../stores/project';
import PhoneMockup from '../components/common/PhoneMockup.vue';
import ArticleCard from '../components/common/ArticleCard.vue';
import { useToast } from '../hooks/useToast';

const { success } = useToast();

const projectStore = useProjectStore();
const router = useRouter();

const emit = defineEmits(['open-modal']);

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
const currentArticleIndex = ref(0);
const globalTemplate = ref<'flow' | 'card'>('flow');
const batchTitlePrefix = ref('每日高级无字壁纸分享 | ');
const currentForm = reactive({
  title: '',
  summary: '',
});

// 初始化
onMounted(() => {
  generateMockData();
  loadCurrentArticle();
});

// 监听表单变化自动同步到当前文章
watch([() => currentForm.title, () => currentForm.summary], () => {
  if (currentArticle.value) {
    currentArticle.value.title = currentForm.title;
    currentArticle.value.summary = currentForm.summary;
  }
}, { deep: true });

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
      title: `${batchTitlePrefix.value}Vol.${groupNum}`,
      summary: `精选极简风格壁纸合集第 ${groupNum} 期。色彩沉稳内敛，不杂乱，不刺眼，适合追求桌面轻量化。`,
      images: images
    });
  }
  articles.value = result;
}

const currentArticle = computed(() => articles.value[currentArticleIndex.value]);

function selectArticle(index: number) {
  currentArticleIndex.value = index;
  loadCurrentArticle();
}

function loadCurrentArticle() {
  if (!currentArticle.value) return;
  currentForm.title = currentArticle.value.title;
  currentForm.summary = currentArticle.value.summary;
}

function updateCurrentArticleMeta() {
  if (!currentArticle.value) return;
  currentArticle.value.title = currentForm.title;
  currentArticle.value.summary = currentForm.summary;
}

function applyBatchTitles() {
  articles.value.forEach((art, idx) => {
    art.title = `${batchTitlePrefix.value}Vol.${idx + 1}`;
  });
  loadCurrentArticle();
  success('批量标题已应用');
}

function setTemplate(type: 'flow' | 'card') {
  globalTemplate.value = type;
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

.background {
  background-color: #f8fafc;
}
</style>

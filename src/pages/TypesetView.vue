<template>
  <section
    class="w-full h-full flex flex-col lg:flex-row overflow-hidden bg-background"
  >
    <!-- 左侧：文章矩阵列表 -->
    <div
      class="w-full lg:w-72 bg-white border-r border-slate-200 flex flex-col h-1/3 lg:h-full flex-shrink-0 z-10 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.02)]"
    >
      <div
        class="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0"
      >
        <span class="font-bold text-sm text-slate-800 flex items-center gap-2">
          <svg
            class="w-4 h-4 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 10h16M4 14h16M4 18h16"
            ></path>
          </svg>
          输出队列 ({{ articles.length }})
        </span>
        <button
          class="text-xs text-slate-400 hover:text-primary transition"
          @click="$router.push('/setup')"
        >
          重配素材
        </button>
      </div>
      <div
        class="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-slate-50/50"
      >
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
    <div
      class="flex-1 h-full flex items-center justify-center p-4 lg:p-8 relative overflow-hidden bg-slate-100/50"
    >
      <PhoneMockup>
        <h1
          class="text-[22px] font-bold mb-3 leading-snug text-slate-900"
          id="preview-title"
        >
          {{ currentArticle?.title || "标题加载中..." }}
        </h1>
        <div
          class="flex items-center gap-2 text-sm text-slate-500 mb-6 font-medium"
        >
          <span class="text-[#576b95]">微信公众号配置名称</span>
        </div>

        <div
          class="text-[15px] leading-relaxed text-slate-600 mb-8"
          id="preview-summary"
        >
          {{ currentArticle?.summary || "摘要加载中..." }}
        </div>

        <div id="preview-article" class="space-y-6">
          <template v-if="currentArticle">
            <template v-if="globalTemplate === 'flow'">
              <div
                v-for="img in currentArticle.images"
                :key="img.id"
                class="w-full mb-3"
              >
                <img
                  :src="getImageUrl(img.path)"
                  :alt="img.name"
                  class="w-full rounded-[4px] object-cover"
                  loading="lazy"
                  @error="
                    (e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }
                  "
                />
              </div>
            </template>
            <template v-else-if="globalTemplate === 'card'">
              <div
                v-for="(img, idx) in currentArticle.images"
                :key="img.id"
                class="w-full p-3.5 bg-white shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06)] rounded-[1.5rem] mb-6 border border-slate-100 flex flex-col items-center"
              >
                <img
                  :src="getImageUrl(img.path)"
                  :alt="img.name"
                  class="w-full aspect-square rounded-[1rem] object-cover mb-3"
                  loading="lazy"
                  @error="
                    (e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }
                  "
                />
                <span
                  class="text-[10px] text-slate-300 font-mono tracking-wider italic"
                >
                  FIG. {{ String(idx + 1).padStart(2, "0") }}
                </span>
              </div>
            </template>
            <template v-else-if="currentCustomTemplate">
              <div v-html="processedCustomHtml"></div>
            </template>
          </template>
        </div>
        <div class="mt-16 mb-8 text-center text-slate-400 text-xs">
          — 预览到底部了 —
        </div>
      </PhoneMockup>
    </div>

    <!-- 右侧：全局控制台与局部属性 -->
    <div
      class="w-full lg:w-80 bg-white border-l border-slate-200 h-1/2 lg:h-full overflow-y-auto flex-shrink-0 flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)] z-10"
    >
      <div
        class="p-4 border-b border-slate-100 font-bold text-sm text-slate-800 flex justify-between items-center sticky top-0 bg-white"
      >
        文案与排版智控
      </div>

      <div class="p-5 flex flex-col gap-6">
        <!-- 全局：矩阵标题规则 -->
        <div class="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-1.5 h-4 bg-primary rounded-full"></span>
            <label class="text-sm font-bold text-slate-800"
              >矩阵发文统一前缀</label
            >
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

        <hr class="border-slate-100" />

        <!-- 当前文章的单独属性 -->
        <div>
          <div class="flex items-center gap-2 mb-4">
            <span class="w-1.5 h-4 bg-slate-400 rounded-full"></span>
            <label class="text-sm font-bold text-slate-800">
              细节微调
              <span
                class="text-xs font-normal text-primary bg-blue-50 px-1.5 rounded ml-1"
                >#{{ currentArticleIndex + 1 }}</span
              >
            </label>
          </div>
          <div class="space-y-4">
            <div>
              <span class="text-xs font-medium text-slate-500 block mb-1"
                >本篇展示标题</span
              >
              <input
                type="text"
                v-model="currentForm.title"
                class="w-full border border-slate-300 rounded-lg shadow-sm text-sm px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
              />
            </div>
            <div>
              <span class="text-xs font-medium text-slate-500 block mb-1"
                >本篇导语/文案</span
              >
              <textarea
                v-model="currentForm.summary"
                rows="3"
                class="w-full border border-slate-300 rounded-lg shadow-sm text-sm px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition custom-scrollbar"
              ></textarea>
            </div>
          </div>
        </div>

        <hr class="border-slate-100" />

        <!-- 封面配置 -->
        <div v-if="currentArticle">
          <CoverSelector
            :images="currentArticle.images"
            :cover-config="currentArticle.coverConfig"
            :get-image-url="getImageUrl"
            @update:cover-config="
              (config) => {
                if (currentArticle) currentArticle.coverConfig = config;
              }
            "
            @open-manager="showCoverTemplateManager = true"
          />
        </div>

        <hr class="border-slate-100" />

        <!-- 全局排版模板 -->
        <div>
          <div class="flex justify-between items-center mb-3">
            <label class="text-sm font-bold text-slate-800"
              >渲染模板 (全局装配)</label
            >
            <span
              class="text-[10px] text-slate-400 cursor-pointer hover:text-primary"
              @click="showTemplateModal = true"
            >
              管理
            </span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div
              class="border-2 rounded-lg p-3 cursor-pointer text-center transition"
              :class="[
                globalTemplate === 'flow'
                  ? 'border-primary bg-blue-50/30'
                  : 'border-slate-200 hover:border-slate-300',
              ]"
              @click="setTemplate('flow')"
            >
              <div
                class="w-full h-8 bg-white rounded border border-slate-200 flex flex-col gap-1 items-center justify-center mb-2 overflow-hidden px-2 shadow-sm"
              >
                <div class="w-full h-2 bg-slate-200 rounded-sm"></div>
                <div class="w-full h-2 bg-slate-200 rounded-sm"></div>
              </div>
              <span class="text-xs font-bold text-slate-700">常规极简流</span>
            </div>
            <div
              class="border-2 rounded-lg p-3 cursor-pointer text-center transition"
              :class="[
                globalTemplate === 'card'
                  ? 'border-primary bg-blue-50/30'
                  : 'border-slate-200 hover:border-slate-300',
              ]"
              @click="setTemplate('card')"
            >
              <div
                class="w-full h-8 bg-white rounded border border-slate-200 flex flex-col items-center justify-center p-1.5 mb-2 shadow-sm"
              >
                <div class="w-full h-full bg-slate-200 rounded-sm"></div>
              </div>
              <span class="text-xs font-bold text-slate-700">留白画框</span>
            </div>
          </div>
          <div v-if="templateStore.customTemplates.length > 0" class="mt-4">
            <p class="text-xs font-medium text-slate-500 mb-2">自定义模板</p>
            <div class="space-y-2">
              <div
                v-for="template in templateStore.customTemplates"
                :key="template.id"
                class="border-2 rounded-lg p-2.5 cursor-pointer transition"
                :class="[
                  globalTemplate === 'custom' &&
                  selectedCustomTemplateId === template.id
                    ? 'border-primary bg-blue-50/30'
                    : 'border-slate-200 hover:border-slate-300',
                ]"
                @click="setTemplate('custom', template.id)"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-700 truncate">{{
                    template.name
                  }}</span>
                  <span class="text-[10px] text-slate-400">{{
                    formatDate(template.updatedAt)
                  }}</span>
                </div>
                <p
                  v-if="template.description"
                  class="text-[10px] text-slate-500 truncate mt-1"
                >
                  {{ template.description }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="flex-1 mt-4"></div>

        <div class="grid grid-cols-2 gap-3 sticky bottom-0 bg-white pt-2">
          <button
            class="w-full bg-slate-100 text-slate-600 font-medium py-3 rounded-xl hover:bg-slate-200 transition text-sm"
            @click="$router.push('/setup')"
          >
            上一步
          </button>
          <button
            class="w-full bg-slate-800 text-white font-medium py-3 rounded-xl shadow-md hover:bg-slate-700 transition text-sm flex items-center justify-center gap-1"
            @click="$router.push('/sync')"
          >
            确认发布
            <svg
              class="w-4 h-4 relative top-px"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              ></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
    <ModalTemplate
      :visible="showTemplateModal"
      @close="showTemplateModal = false"
      @select="handleSelectCustomTemplate"
    />

    <ModalCoverTemplate
      :visible="showCoverTemplateManager"
      @close="showCoverTemplateManager = false"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useProjectStore } from "../stores/project";
import { useTemplateStore } from "../stores/template";
import { useCoverTemplateStore } from "../stores/coverTemplate";
import PhoneMockup from "../components/common/PhoneMockup.vue";
import ArticleCard from "../components/common/ArticleCard.vue";
import ModalTemplate from "../components/layout/ModalTemplate.vue";
import ModalCoverTemplate from "../components/layout/ModalCoverTemplate.vue";
import CoverSelector from "../components/common/CoverSelector.vue";
import { useToast } from "../hooks/useToast";
import { useTemplateRender } from "../composables/useTemplateRender";
import type { ImageFile, CustomTemplate, ArticleCoverConfig } from "../types";

const { success } = useToast();

const projectStore = useProjectStore();
const templateStore = useTemplateStore();
const coverTemplateStore = useCoverTemplateStore();
const { renderTemplate } = useTemplateRender();
const router = useRouter();

const showTemplateModal = ref(false);
const showCoverTemplateManager = ref(false);

interface Article {
  id: string;
  title: string;
  summary: string;
  images: {
    id: string;
    path: string;
    name: string;
  }[];
  coverConfig?: ArticleCoverConfig;
}

const articles = ref<Article[]>([]);
const currentArticleIndex = ref(0);
const globalTemplate = ref<string>("flow");
const selectedCustomTemplateId = ref<string>("");
const batchTitlePrefix = ref("每日高级无字壁纸分享 | ");
const currentForm = reactive({
  title: "",
  summary: "",
});

const currentCustomTemplate = computed<CustomTemplate | undefined>(() => {
  if (globalTemplate.value === "custom" && selectedCustomTemplateId.value) {
    return templateStore.customTemplates.find(
      (t) => t.id === selectedCustomTemplateId.value,
    );
  }
  return undefined;
});

const processedCustomHtml = computed(() => {
  if (!currentCustomTemplate.value || !currentArticle.value) return "";

  // 使用模板渲染 composable 处理实际图片
  return renderTemplate(
    currentCustomTemplate.value,
    currentArticle.value.images,
    getImageUrl,
  );
});

// 初始化
onMounted(() => {
  generateArticlesFromProject();
  loadCurrentArticle();
});

// 监听表单变化自动同步到当前文章
watch(
  [() => currentForm.title, () => currentForm.summary],
  () => {
    if (currentArticle.value) {
      currentArticle.value.title = currentForm.title;
      currentArticle.value.summary = currentForm.summary;
    }
  },
  { deep: true },
);

// 从项目数据生成文章
function generateArticlesFromProject() {
  const result: Article[] = [];

  if (
    projectStore.currentProject?.groups &&
    projectStore.currentProject.groups.length > 0
  ) {
    // 使用项目中已有的分组
    projectStore.currentProject.groups.forEach((group, index) => {
      const groupNum = index + 1;
      result.push({
        id: group.id,
        title: `${batchTitlePrefix.value}Vol.${groupNum}`,
        summary: `精选极简风格壁纸合集第 ${groupNum} 期。色彩沉稳内敛，不杂乱，不刺眼，适合追求桌面轻量化。`,
        images: group.images.map((img: ImageFile) => ({
          id: img.id,
          path: img.path,
          name: img.name,
        })),
      });
    });
  } else if (projectStore.currentProject?.images) {
    // 如果没有分组，按默认 9 张一组分割
    const countPerArticle = 9;
    const images = projectStore.currentProject.images;

    for (let i = 0; i < images.length; i += countPerArticle) {
      const chunk = images.slice(i, i + countPerArticle);
      const groupNum = result.length + 1;
      result.push({
        id: `article_${groupNum}`,
        title: `${batchTitlePrefix.value}Vol.${groupNum}`,
        summary: `精选极简风格壁纸合集第 ${groupNum} 期。色彩沉稳内敛，不杂乱，不刺眼，适合追求桌面轻量化。`,
        images: chunk.map((img: ImageFile) => ({
          id: img.id,
          path: img.path,
          name: img.name,
        })),
      });
    }
  }

  articles.value = result;
}

const currentArticle = computed(
  () => articles.value[currentArticleIndex.value],
);

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
  success("批量标题已应用");
}

function setTemplate(type: string, templateId?: string) {
  globalTemplate.value = type;
  if (templateId) {
    selectedCustomTemplateId.value = templateId;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-CN");
}

function handleSelectCustomTemplate(templateId: string) {
  setTemplate("custom", templateId);
  success("模板已选择");
}

// 将文件路径转换为可预览的 URL
function getImageUrl(filePath: string): string {
  // Electron 中可以使用 file:// 协议
  return `file://${filePath.replace(/\\/g, "/")}`;
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.background {
  background-color: #f8fafc;
}
</style>

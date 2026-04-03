<template>
  <section
    class="w-full h-full flex flex-col lg:flex-row overflow-hidden bg-background"
  >
    <!-- 左栏：文章队列 -->
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
              d="M4 6h16M4 10h16M4 14h16M4 18h18"
            ></path>
          </svg>
          输出队列 ({{ batchStore.articles.length }})
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
        <div
          v-for="(article, index) in batchStore.articles"
          :key="article.id"
          class="bg-white border rounded-xl p-3 cursor-pointer transition-all hover:shadow-md"
          :class="[
            index === batchStore.currentArticleIndex
              ? 'border-primary bg-blue-50/30 shadow-sm'
              : 'border-slate-200',
          ]"
          @click="batchStore.selectArticle(index)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm text-slate-800 truncate">
                #{{ index + 1 }} {{ getArticleDisplayTitle(article, index) }}
              </div>
              <div class="text-xs text-slate-400 mt-1">
                {{ article.images.length }} 张图片
              </div>
            </div>
          </div>
          <div class="flex gap-1 mt-2 flex-wrap">
            <span
              v-if="
                !article.override.title &&
                !article.override.cover &&
                !article.override.layout
              "
              class="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700"
            >
              继承全局
            </span>
            <span
              v-if="article.override.title"
              class="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700"
            >
              已覆盖标题
            </span>
            <span
              v-if="article.override.cover"
              class="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700"
            >
              已覆盖封面
            </span>
            <span
              v-if="article.override.layout"
              class="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700"
            >
              已覆盖排版
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 中栏：实时预览 -->
    <div
      class="flex-1 h-full flex flex-col items-center p-4 lg:p-8 relative overflow-hidden bg-slate-100/50"
    >
      <div class="w-full max-w-md mb-4 flex items-center justify-center gap-2">
        <div
          class="flex bg-white rounded-lg p-1 shadow-sm border border-slate-200"
        >
          <button
            v-for="mode in previewModes"
            :key="mode.value"
            class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
            :class="[
              batchStore.previewMode === mode.value
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100',
            ]"
            @click="batchStore.setPreviewMode(mode.value)"
          >
            {{ mode.label }}
          </button>
        </div>
      </div>

      <PhoneMockup class="flex-1 overflow-hidden">
        <template v-if="batchStore.previewMode === 'cover'">
          <div class="space-y-6">
            <div class="flex justify-center">
              <div
                v-if="selectedCoverIndex === 0"
                ref="coverImageRef"
                class="aspect-[2.35/1] w-full rounded-2xl overflow-hidden bg-slate-100"
              >
                <img
                  v-if="currentArticle?.images[0]"
                  :src="getImageUrl(currentArticle.images[0].path)"
                  class="w-full h-full object-cover"
                />
              </div>
              <div
                v-else-if="selectedCoverIndex === 1"
                class="rounded-2xl overflow-hidden bg-slate-100 flex justify-center"
                :style="{ height: coverImageHeight + 'px' }"
              >
                <img
                  v-if="currentArticle?.images[1]"
                  :src="getImageUrl(currentArticle.images[1].path)"
                  class="h-full aspect-square object-cover"
                />
              </div>
            </div>

            <div class="flex gap-4 justify-center">
              <div
                v-for="(img, idx) in currentArticle?.images.slice(0, 2) || []"
                :key="img.id"
                class="rounded-xl overflow-hidden cursor-pointer border-2 transition-all"
                :class="[
                  selectedCoverIndex === idx
                    ? 'border-green-500'
                    : 'border-transparent',
                  idx === 0 ? 'w-20 h-14' : 'w-14 h-14',
                ]"
                @click="selectedCoverIndex = idx"
              >
                <img
                  :src="getImageUrl(img.path)"
                  :alt="img.name"
                  class="w-full h-full object-cover"
                />
              </div>
            </div>

            <div class="mt-8">
              <h1 class="text-base font-bold text-slate-900 mb-1">
                {{ batchStore.currentArticleFinalTitle || "标题加载中..." }}
              </h1>
              <p class="text-xs text-slate-400">
                {{ currentArticle?.titleConfig.subtitle || "摘要加载中..." }}
              </p>
            </div>
          </div>
        </template>

        <template v-else>
          <h1
            class="text-[22px] font-bold mb-3 leading-snug text-slate-900"
            id="preview-title"
          >
            {{ batchStore.currentArticleFinalTitle || "标题加载中..." }}
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
            {{ currentArticle?.titleConfig.subtitle || "摘要加载中..." }}
          </div>

          <div id="preview-article" class="space-y-6">
            <template v-if="currentArticle">
              <template v-if="currentTemplateId === 'flow'">
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
              <template v-else-if="currentTemplateId === 'card'">
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
              <template v-else-if="currentTemplate">
                <div v-html="processedTemplateHtml"></div>
              </template>
            </template>
          </div>
          <div class="mt-16 mb-8 text-center text-slate-400 text-xs">
            — 预览到底部了 —
          </div>
        </template>
      </PhoneMockup>
    </div>

    <!-- 右栏：配置面板 -->
    <div
      class="w-full lg:w-80 bg-white border-l border-slate-200 h-1/2 lg:h-full overflow-y-auto flex-shrink-0 flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)] z-10"
    >
      <div class="p-4 border-b border-slate-100 sticky top-0 bg-white z-20">
        <div class="flex bg-slate-100 rounded-lg p-0.5">
          <button
            class="flex-1 py-2 text-xs font-medium rounded-md transition-all"
            :class="[
              batchStore.configMode === 'global'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            ]"
            @click="batchStore.setConfigMode('global')"
          >
            全局设置
          </button>
          <button
            class="flex-1 py-2 text-xs font-medium rounded-md transition-all"
            :class="[
              batchStore.configMode === 'article'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            ]"
            @click="batchStore.setConfigMode('article')"
          >
            当前文章
          </button>
        </div>

        <div class="flex mt-3 border-b border-slate-200">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            class="flex-1 pb-2 text-xs font-medium border-b-2 transition-all"
            :class="[
              batchStore.configTab === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-slate-600',
            ]"
            @click="batchStore.setConfigTab(tab.value)"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="p-5 flex flex-col gap-6 flex-1">
        <!-- 全局设置 - 标题 -->
        <template
          v-if="
            batchStore.configMode === 'global' &&
            batchStore.configTab === 'title'
          "
        >
          <GlobalTitleConfig
            :config="batchStore.globalConfig.title"
            @update:config="batchStore.setGlobalTitleConfig"
          />
        </template>

        <!-- 全局设置 - 封面 -->
        <template
          v-else-if="
            batchStore.configMode === 'global' &&
            batchStore.configTab === 'cover'
          "
        >
          <div class="space-y-4">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-1.5 h-4 bg-primary rounded-full"></span>
              <label class="text-sm font-bold text-slate-800"
                >全局封面规则</label
              >
            </div>
            <p class="text-xs text-slate-500">封面模板选择和配置（预留）</p>
          </div>
        </template>

        <!-- 全局设置 - 排版 -->
        <template
          v-else-if="
            batchStore.configMode === 'global' &&
            batchStore.configTab === 'layout'
          "
        >
          <GlobalLayoutConfig
            :config="batchStore.globalConfig.layout"
            @update:config="batchStore.setGlobalLayoutConfig"
            @open-template-manager="showTemplateModal = true"
          />
        </template>

        <!-- 当前文章 - 标题 -->
        <template
          v-else-if="
            batchStore.configMode === 'article' &&
            batchStore.configTab === 'title' &&
            currentArticle
          "
        >
          <ArticleTitleConfig
            :config="currentArticle.titleConfig"
            :global-config="batchStore.globalConfig.title"
            :article-index="batchStore.currentArticleIndex"
            @update:config="batchStore.updateCurrentArticleTitleConfig"
          />
        </template>

        <!-- 当前文章 - 封面 -->
        <template
          v-else-if="
            batchStore.configMode === 'article' &&
            batchStore.configTab === 'cover' &&
            currentArticle
          "
        >
          <div class="space-y-4">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-1.5 h-4 bg-slate-400 rounded-full"></span>
              <label class="text-sm font-bold text-slate-800"
                >当前文章封面</label
              >
            </div>
            <div
              class="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-200"
            >
              <label class="text-xs font-medium text-slate-600"
                >继承全局封面</label
              >
              <input
                type="checkbox"
                :checked="currentArticle.coverConfig.inheritGlobal"
                @change="
                  (e) =>
                    batchStore.updateCurrentArticleCoverConfig({
                      inheritGlobal: (e.target as HTMLInputElement).checked,
                    })
                "
                class="w-4 h-4 text-primary"
              />
            </div>
            <CoverSelector
              v-if="!currentArticle.coverConfig.inheritGlobal"
              :images="currentArticle.images"
              :cover-config="{
                selectedImageIds: currentArticle.coverConfig.selectedImageIds,
              }"
              :get-image-url="getImageUrl"
              @update:cover-config="
                (config) => {
                  batchStore.updateCurrentArticleCoverConfig({
                    selectedImageIds: config.selectedImageIds,
                  });
                }
              "
            />
            <div
              v-if="currentArticle"
              class="bg-blue-50 rounded-lg p-3 border border-blue-200"
            >
              <p class="text-xs text-blue-600">
                {{
                  currentArticle.coverConfig.inheritGlobal
                    ? "当前生效：来自全局"
                    : "当前生效：已覆盖"
                }}
              </p>
            </div>
          </div>
        </template>

        <!-- 当前文章 - 排版 -->
        <template
          v-else-if="
            batchStore.configMode === 'article' &&
            batchStore.configTab === 'layout' &&
            currentArticle
          "
        >
          <ArticleLayoutConfig
            :config="currentArticle.layoutConfig"
            :images="currentArticle.images"
            @update:config="batchStore.updateCurrentArticleLayoutConfig"
            @open-image-manager="showImageManagerDrawer = true"
          />
        </template>

        <div class="flex-1"></div>

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
    />

    <ModalCoverTemplate
      :visible="showCoverTemplateManager"
      @close="showCoverTemplateManager = false"
    />

    <ImageManagerDrawer
      :visible="showImageManagerDrawer"
      :images="currentArticle?.images || []"
      @close="showImageManagerDrawer = false"
      @update:images="handleUpdateArticleImages"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useProjectStore } from "../stores/project";
import { useTemplateStore } from "../stores/template";
import { useCoverTemplateStore } from "../stores/coverTemplate";
import { useBatchTypesetStore } from "../stores/batchTypeset";
import PhoneMockup from "../components/common/PhoneMockup.vue";
import ModalTemplate from "../components/layout/ModalTemplate.vue";
import ModalCoverTemplate from "../components/layout/ModalCoverTemplate.vue";
import CoverSelector from "../components/common/CoverSelector.vue";
import GlobalTitleConfig from "../components/typeset/GlobalTitleConfig.vue";
import ArticleTitleConfig from "../components/typeset/ArticleTitleConfig.vue";
import GlobalLayoutConfig from "../components/typeset/GlobalLayoutConfig.vue";
import ArticleLayoutConfig from "../components/typeset/ArticleLayoutConfig.vue";
import ImageManagerDrawer from "../components/typeset/ImageManagerDrawer.vue";
import type { ImageFile } from "../types";

const projectStore = useProjectStore();
const templateStore = useTemplateStore();
const coverTemplateStore = useCoverTemplateStore();
const batchStore = useBatchTypesetStore();

const showTemplateModal = ref(false);
const showCoverTemplateManager = ref(false);
const showImageManagerDrawer = ref(false);
const selectedCoverIndex = ref(0);
const coverImageHeight = ref(0);
const coverImageRef = ref<HTMLDivElement>();

const tabs = [
  { label: "标题", value: "title" },
  { label: "封面", value: "cover" },
  { label: "排版", value: "layout" },
];

const previewModes = [
  { label: "封面", value: "cover" },
  { label: "正文", value: "content" },
];

const currentArticle = computed(() => batchStore.currentArticle);

const currentTemplateId = computed(() => {
  if (!currentArticle.value) return "flow";
  if (
    !currentArticle.value.layoutConfig.inheritGlobal &&
    currentArticle.value.layoutConfig.templateId
  ) {
    return currentArticle.value.layoutConfig.templateId;
  }
  return batchStore.globalConfig.layout.templateId;
});

const currentTemplate = computed(() => {
  if (
    !currentTemplateId.value ||
    currentTemplateId.value === "flow" ||
    currentTemplateId.value === "card"
  ) {
    return null;
  }
  return (
    templateStore.customTemplates.find(
      (t) => t.id === currentTemplateId.value,
    ) || null
  );
});

const processedTemplateHtml = computed(() => {
  if (!currentTemplate.value || !currentArticle.value) return "";
  const templateHtml = currentTemplate.value.html;
  const images = currentArticle.value.images;

  // 先统计模板中有多少个占位图
  const placeholderMatch = templateHtml.match(
    /https:\/\/toai\.art\/b\d+\.png/g,
  );
  const placeholderCount = placeholderMatch ? placeholderMatch.length : 0;

  if (placeholderCount === 0) return templateHtml;

  let resultHtml = "";
  let imageIndex = 0;
  const totalImages = images.length;

  // 计算需要多少个完整块
  const fullBlocks = Math.floor(totalImages / placeholderCount);
  const remainingImages = totalImages % placeholderCount;

  // 生成完整块
  for (let i = 0; i < fullBlocks; i++) {
    let blockHtml = templateHtml;
    blockHtml = blockHtml.replace(/https:\/\/toai\.art\/b\d+\.png/g, () => {
      const imgUrl = getImageUrl(images[imageIndex].path);
      imageIndex++;
      return imgUrl;
    });
    resultHtml += blockHtml;
  }

  // 如果有剩余图片，生成最后一个块
  if (remainingImages > 0) {
    const placeholderRegex = /https:\/\/toai\.art\/b\d+\.png/g;
    const parts: string[] = [];
    let lastIndex = 0;
    let match;

    placeholderRegex.lastIndex = 0;

    while ((match = placeholderRegex.exec(templateHtml)) !== null) {
      parts.push(templateHtml.slice(lastIndex, match.index));
      parts.push(match[0]);
      lastIndex = match.index + match[0].length;
    }
    parts.push(templateHtml.slice(lastIndex));

    const keepCount = 2 * remainingImages + 1;
    const keptParts = parts.slice(0, keepCount);

    let finalBlockHtml = "";
    let placeholderIdx = 0;

    for (let i = 0; i < keptParts.length; i++) {
      const part = keptParts[i];
      if (part.match(placeholderRegex)) {
        if (placeholderIdx < remainingImages && imageIndex < totalImages) {
          const imgUrl = getImageUrl(images[imageIndex].path);
          imageIndex++;
          placeholderIdx++;
          finalBlockHtml += imgUrl;
        }
      } else {
        finalBlockHtml += part;
      }
    }

    resultHtml += finalBlockHtml;
  }

  return resultHtml;
});

onMounted(() => {
  generateArticlesFromProject();
  templateStore.loadTemplates();
  nextTick(() => {
    if (coverImageRef.value) {
      coverImageHeight.value = coverImageRef.value.offsetHeight;
    }
  });
});

function generateArticlesFromProject() {
  const articleData: Array<{
    id: string;
    images: Array<{ id: string; path: string; name: string }>;
  }> = [];

  if (
    projectStore.currentProject?.groups &&
    projectStore.currentProject.groups.length > 0
  ) {
    projectStore.currentProject.groups.forEach((group) => {
      articleData.push({
        id: group.id,
        images: (group as any).images.map((img: ImageFile) => ({
          id: img.id,
          path: img.path,
          name: img.name,
        })),
      });
    });
  } else if (projectStore.currentProject?.images) {
    const countPerArticle = 9;
    const images = projectStore.currentProject.images;

    for (let i = 0; i < images.length; i += countPerArticle) {
      const chunk = images.slice(i, i + countPerArticle);
      articleData.push({
        id: `article_${articleData.length + 1}`,
        images: chunk.map((img: ImageFile) => ({
          id: img.id,
          path: img.path,
          name: img.name,
        })),
      });
    }
  }

  batchStore.initArticles(articleData);
}

function getArticleDisplayTitle(article: any, index: number): string {
  if (article.titleConfig.inheritGlobal) {
    const config = batchStore.globalConfig.title;
    const numbering = batchStore.generateNumbering(
      index + 1,
      config.numberingRule,
    );
    return `${config.prefix}${config.separator}${numbering}`.trim();
  }
  return article.titleConfig.title || "未设置标题";
}

watch(selectedCoverIndex, async (newIndex) => {
  if (newIndex === 0) {
    await nextTick();
    if (coverImageRef.value) {
      coverImageHeight.value = coverImageRef.value.offsetHeight;
    }
  }
});

function handleUpdateArticleImages(images: any[]) {
  if (currentArticle.value) {
    batchStore.updateCurrentArticleImages(images);
  }
}

function getImageUrl(filePath: string): string {
  return `file://${filePath.replace(/\\/g, "/")}`;
}
</script>

<style>
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

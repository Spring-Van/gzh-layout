<template>
  <div
    class="w-full lg:w-80 bg-white border-l border-slate-200 h-1/2 lg:h-full overflow-y-auto flex-shrink-0 flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)] z-10"
  >
    <div class="p-4 border-b border-slate-100 sticky top-0 bg-white z-20">
      <div class="flex bg-slate-100 rounded-lg p-0.5">
        <button
          class="flex-1 py-2 text-xs font-medium rounded-md transition-all"
          :class="[
            configMode === 'global'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700',
          ]"
          @click="$emit('update:configMode', 'global')"
        >
          全局设置
        </button>
        <button
          class="flex-1 py-2 text-xs font-medium rounded-md transition-all"
          :class="[
            configMode === 'article'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700',
          ]"
          @click="$emit('update:configMode', 'article')"
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
            configTab === tab.value
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600',
          ]"
          @click="$emit('update:configTab', tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <div class="p-5 flex flex-col gap-6 flex-1">
      <!-- 全局设置 - 标题 -->
      <template v-if="configMode === 'global' && configTab === 'title'">
        <GlobalTitleConfigComponent
          :config="globalTitleConfig"
          @update:config="handleGlobalTitleUpdate"
        />
      </template>

      <!-- 全局设置 - 封面 -->
      <template v-else-if="configMode === 'global' && configTab === 'cover'">
        <GlobalCoverConfig
          :template-id="globalCoverTemplateId"
          :template-name="globalCoverTemplateName"
          :generated-cover-image="globalGeneratedCoverImageSrc"
          :cover-image-indices="globalCoverImageIndices"
          :required-image-count="globalCoverTemplateImageCount"
          :total-image-count="currentArticleImageCount"
          :pic-crop-235="globalPicCrop235"
          :pic-crop-11="globalPicCrop11"
          @open-template-selector="$emit('open-cover-template-selector')"
          @open-template-manager="$emit('open-cover-template-manager')"
          @open-index-selector="$emit('open-index-selector')"
          @crop="$emit('crop', 'global', $event)"
        />
      </template>

      <!-- 全局设置 - 排版 -->
      <template v-else-if="configMode === 'global' && configTab === 'layout'">
        <GlobalLayoutConfigComponent
          :config="globalLayoutConfig"
          @update:config="handleGlobalLayoutUpdate"
          @open-template-manager="$emit('open-template-manager')"
        />
      </template>

      <!-- 当前文章 - 标题 -->
      <template
        v-else-if="
          configMode === 'article' && configTab === 'title' && currentArticle
        "
      >
        <ArticleTitleConfigComponent
          :config="currentArticle.titleConfig"
          :global-config="globalTitleConfig"
          :article-index="currentArticleIndex"
          @update:config="handleArticleTitleUpdate"
        />
      </template>

      <!-- 当前文章 - 封面 -->
      <template
        v-else-if="
          configMode === 'article' && configTab === 'cover' && currentArticle
        "
      >
        <ArticleCoverConfig
          :article="currentArticle"
          :cover-template-name="currentArticleCoverTemplateName"
          :generated-cover-image="currentArticleGeneratedCoverImageSrc"
          :required-image-count="currentArticleCoverTemplateImageCount"
          :pic-crop-235="currentArticlePicCrop235"
          :pic-crop-11="currentArticlePicCrop11"
          @toggle-inherit="$emit('toggle:inheritCover')"
          @open-template-selector="
            $emit('open-article-cover-template-selector')
          "
          @open-template-manager="$emit('open-cover-template-manager')"
          @open-image-selector="$emit('open-image-selector')"
          @crop="$emit('crop', 'article', $event)"
        />
      </template>

      <!-- 当前文章 - 排版 -->
      <template
        v-else-if="
          configMode === 'article' && configTab === 'layout' && currentArticle
        "
      >
        <ArticleLayoutConfigComponent
          :config="currentArticle.layoutConfig"
          :images="currentArticle.images"
          @update:config="handleArticleLayoutUpdate"
          @open-image-manager="$emit('open-image-manager')"
          @open-template-manager="$emit('open-template-manager')"
        />
      </template>

      <div class="flex-1"></div>

      <div class="grid grid-cols-2 gap-3 sticky bottom-0 bg-white pt-2">
        <button
          class="w-full bg-slate-100 text-slate-600 font-medium py-3 rounded-xl hover:bg-slate-200 transition text-sm"
          @click="$emit('back')"
        >
          上一步
        </button>
        <button
          class="w-full bg-slate-800 text-white font-medium py-3 rounded-xl shadow-md hover:bg-slate-700 transition text-sm flex items-center justify-center gap-1"
          @click="$emit('publish')"
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
</template>

<script setup lang="ts">
import type {
  BatchArticle,
  GlobalTitleConfig,
  GlobalLayoutConfig,
  ArticleTitleConfig,
  ArticleLayoutConfig,
} from "../../types";
import GlobalTitleConfigComponent from "./GlobalTitleConfig.vue";
import GlobalLayoutConfigComponent from "./GlobalLayoutConfig.vue";
import ArticleTitleConfigComponent from "./ArticleTitleConfig.vue";
import ArticleLayoutConfigComponent from "./ArticleLayoutConfig.vue";
import GlobalCoverConfig from "./GlobalCoverConfig.vue";
import ArticleCoverConfig from "./ArticleCoverConfig.vue";

type ConfigMode = "global" | "article";
type ConfigTab = "title" | "cover" | "layout";

interface Props {
  configMode: ConfigMode;
  configTab: ConfigTab;
  globalTitleConfig: GlobalTitleConfig;
  globalLayoutConfig: GlobalLayoutConfig;
  globalCoverTemplateId?: string;
  globalCoverTemplateName: string;
  globalGeneratedCoverImageSrc?: string;
  globalCoverImageIndices?: number[];
  globalCoverTemplateImageCount: number;
  globalPicCrop235?: string;
  globalPicCrop11?: string;
  currentArticle?: BatchArticle | null;
  currentArticleIndex: number;
  currentArticleCoverTemplateName: string;
  currentArticleGeneratedCoverImageSrc?: string;
  currentArticleCoverTemplateImageCount: number;
  currentArticleImageCount: number;
  currentArticlePicCrop235?: string;
  currentArticlePicCrop11?: string;
}

interface Emits {
  (e: "update:configMode", value: ConfigMode): void;
  (e: "update:configTab", value: ConfigTab): void;
  (e: "update:globalTitleConfig", config: GlobalTitleConfig): void;
  (e: "update:globalLayoutConfig", config: GlobalLayoutConfig): void;
  (e: "update:articleTitleConfig", config: Partial<ArticleTitleConfig>): void;
  (e: "update:articleLayoutConfig", config: Partial<ArticleLayoutConfig>): void;
  (e: "toggle:inheritCover"): void;
  (e: "open-template-manager"): void;
  (e: "open-cover-template-manager"): void;
  (e: "open-cover-template-selector"): void;
  (e: "open-article-cover-template-selector"): void;
  (e: "open-index-selector"): void;
  (e: "open-image-selector"): void;
  (e: "open-image-manager"): void;
  (e: "crop", mode: "global" | "article", ratio: "235" | "11"): void;
  (e: "back"): void;
  (e: "publish"): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const tabs = [
  { label: "标题", value: "title" as ConfigTab },
  { label: "封面", value: "cover" as ConfigTab },
  { label: "排版", value: "layout" as ConfigTab },
];

function handleGlobalTitleUpdate(config: GlobalTitleConfig) {
  emit("update:globalTitleConfig", config);
}

function handleGlobalLayoutUpdate(config: GlobalLayoutConfig) {
  emit("update:globalLayoutConfig", config);
}

function handleArticleTitleUpdate(config: Partial<ArticleTitleConfig>) {
  emit("update:articleTitleConfig", config);
}

function handleArticleLayoutUpdate(config: Partial<ArticleLayoutConfig>) {
  emit("update:articleLayoutConfig", config);
}
</script>

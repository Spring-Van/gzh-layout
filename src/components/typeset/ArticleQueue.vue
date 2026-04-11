<template>
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
        输出队列 ({{ props.articles.length }})
      </span>
      <button
        class="text-xs text-slate-400 hover:text-primary transition"
        @click="onReconfigure"
      >
        重配素材
      </button>
    </div>
    <div
      class="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-slate-50/50"
    >
      <div
        v-for="(article, index) in props.articles"
        :key="article.id"
        class="bg-white border rounded-xl p-3 cursor-pointer transition-all hover:shadow-md"
        :class="[
          index === props.currentArticleIndex
            ? 'border-primary bg-blue-50/30 shadow-sm'
            : 'border-slate-200',
        ]"
        @click="onSelectArticle(index)"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm text-slate-800 truncate">
              #{{ index + 1 }} {{ getDisplayTitle(article, index) }}
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
</template>

<script setup lang="ts">
import type { BatchArticle } from "../../types";

interface Props {
  articles: BatchArticle[];
  currentArticleIndex: number;
  globalTitleConfig?: {
    enabled: boolean;
    prefix: string;
    numberingRule: string;
    customFormat: string;
    separator: string;
  };
}

interface Emits {
  (e: "select-article", index: number): void;
  (e: "reconfigure"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

function getDisplayTitle(article: BatchArticle, index: number): string {
  if (article.titleConfig.inheritGlobal && props.globalTitleConfig?.enabled) {
    const config = props.globalTitleConfig;
    let numbering = "";

    if (config.numberingRule === "vol") {
      numbering = `Vol.${index + 1}`;
    } else if (config.numberingRule === "issue") {
      numbering = `第${index + 1}期`;
    } else if (config.numberingRule === "custom" && config.customFormat) {
      numbering = config.customFormat.replace("{n}", String(index + 1));
    }

    return `${config.prefix || ""}${config.separator || ""}${numbering}`.trim();
  }
  return article.titleConfig.title || "未设置标题";
}

function onSelectArticle(index: number) {
  emit("select-article", index);
}

function onReconfigure() {
  emit("reconfigure");
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
</style>

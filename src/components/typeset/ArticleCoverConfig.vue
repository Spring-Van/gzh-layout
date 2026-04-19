<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="w-1.5 h-4 bg-slate-400 rounded-full"></span>
      <label class="text-sm font-bold text-slate-800">当前文章封面</label>
    </div>
    <div
      class="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-200"
    >
      <label class="text-xs font-medium text-slate-600">继承全局封面</label>
      <button
        :class="[
          'w-11 h-6 rounded-full transition-colors relative',
          article.coverConfig.inheritGlobal ? 'bg-primary' : 'bg-slate-300',
        ]"
        @click="$emit('toggle-inherit')"
      >
        <span
          :class="[
            'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
            article.coverConfig.inheritGlobal ? 'left-6' : 'left-1',
          ]"
        ></span>
      </button>
    </div>

    <template v-if="!article.coverConfig.inheritGlobal">
      <div>
        <label class="block text-xs font-medium text-slate-500 mb-2"
          >封面模板</label
        >
        <div
          class="border-2 border-slate-200 rounded-xl p-3 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition"
          @click="$emit('open-template-selector')"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 bg-white rounded-lg border border-slate-200 flex items-center justify-center shadow-sm overflow-hidden"
            >
              <template v-if="article.coverConfig.templateId">
                <div class="w-full h-full flex items-center justify-center p-1">
                  <svg
                    class="w-6 h-6 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    ></path>
                  </svg>
                </div>
              </template>
              <template v-else>
                <svg
                  class="w-6 h-6 text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M12 4v16m8-8H4"
                  ></path>
                </svg>
              </template>
            </div>
            <div class="flex-1">
              <p class="text-sm font-bold text-slate-700">
                {{ coverTemplateName || "未选择封面模板" }}
              </p>
              <p class="text-xs text-slate-400">
                {{
                  article.coverConfig.templateId
                    ? "点击更换模板"
                    : "点击选择封面模板"
                }}
              </p>
            </div>
            <svg
              class="w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              ></path>
            </svg>
          </div>
        </div>
      </div>

      <div v-if="generatedCoverImage" class="space-y-2">
        <label class="block text-xs font-medium text-slate-500">{{
          article.coverConfig.inheritGlobal ? "全局封面预览" : "封面预览"
        }}</label>
        <CoverPreviewCard
          v-model:ratio="previewRatio"
          :generated-cover-image="generatedCoverImage"
          :pic-crop-235="picCrop235"
          :pic-crop-11="picCrop11"
          @crop="$emit('crop', $event)"
        />
      </div>

      <button
        class="w-full py-2.5 text-sm font-medium text-primary bg-primary/10 rounded-xl hover:bg-primary/20 transition flex items-center justify-center gap-2"
        @click="$emit('open-image-selector')"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          ></path>
        </svg>
        选择封面图片
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import CoverPreviewCard from "./CoverPreviewCard.vue";
import type { BatchArticle } from "../../types";

const previewRatio = ref<"235" | "11">("235");

interface Props {
  article: BatchArticle;
  coverTemplateName: string;
  generatedCoverImage?: string;
  requiredImageCount: number;
  picCrop235?: string;
  picCrop11?: string;
}

interface Emits {
  (e: "toggle-inherit"): void;
  (e: "open-template-selector"): void;
  (e: "open-template-manager"): void;
  (e: "open-image-selector"): void;
  (e: "crop", ratio: "235" | "11"): void;
}

defineProps<Props>();
defineEmits<Emits>();
</script>

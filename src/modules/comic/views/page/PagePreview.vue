<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- 顶部标题栏 -->
    <div
      class="shrink-0 px-3 py-2.5 border-b border-border-subtle flex items-center justify-between gap-2"
    >
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-xs font-medium text-text-primary whitespace-nowrap"
          >第 {{ pageIndex + 1 }} 页预览</span
        >
        <span class="text-[10px] text-text-muted whitespace-nowrap">{{
          getLayoutInfo(page) ? `${getLayoutInfo(page)}格` : ""
        }}</span>
      </div>

      <!-- 单页模型选择器 -->
      <div class="relative flex-shrink-0">
        <select
          :value="selectedModelId"
          class="appearance-none bg-input-bg border text-[10px] rounded-md pl-2 pr-6 py-1 text-text-primary focus:outline-none cursor-pointer transition-colors max-w-[140px] truncate"
          :class="
            selectedModelId
              ? 'border-cyan-500/30 hover:border-cyan-500/50'
              : 'border-border-subtle hover:border-border-default'
          "
          @change="
            handleModelChange(($event.target as HTMLSelectElement).value)
          "
        >
          <option value="" class="bg-surface text-text-muted">
            {{ globalModelName ? `全局 · ${globalModelName}` : "跟随全局" }}
          </option>
          <option
            v-for="model in imageModels"
            :key="model.id"
            :value="model.id"
            class="bg-surface"
          >
            {{ model.name }}
          </option>
        </select>
        <svg
          class="w-3 h-3 text-text-muted absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>

    <!-- 预览内容区 -->
    <div class="flex-1 overflow-y-auto p-3">
      <div class="h-full flex flex-col gap-3">
        <!-- 主预览图 -->
        <div
          class="flex-1 min-h-0 bg-surface relative flex items-center justify-center rounded-xl border border-border-subtle shadow-sm shadow-black/10 group"
          style="min-height: 200px"
        >
          <!-- 生成中 loading 遮罩 -->
          <div
            v-if="isGenerating"
            class="absolute inset-0 z-10 bg-black/40 rounded-xl flex flex-col items-center justify-center backdrop-blur-sm"
          >
            <div
              class="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3"
            />
            <p class="text-xs text-cyan-400 font-medium">正在生成...</p>
          </div>

          <img
            v-if="generatedImage"
            :src="generatedImage"
            class="w-full h-full object-contain rounded-xl"
            alt="生成结果"
            decoding="async"
          />
          <!-- 左下角放大查看图标 -->
          <button
            v-if="generatedImage"
            class="absolute left-2.5 bottom-2.5 z-20 p-1 bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
            @click="openGeneratedPreview"
          >
            <svg
              class="w-3.5 h-3.5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
              />
            </svg>
          </button>
          <!-- 可恢复任务：重新查询按钮（兜底操作） -->
          <div
            v-else-if="hasRecoverableTask"
            class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
          >
            <div class="text-center px-4">
              <svg
                class="w-10 h-10 text-orange-400/80 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <p class="text-[11px] text-text-secondary mb-3">检测到未完成的任务</p>
              <button
                class="px-3 py-1.5 rounded-md bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[11px] font-medium hover:bg-orange-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 mx-auto"
                :disabled="recovering"
                @click="handleRecover"
              >
                <template v-if="recovering">
                  <div
                    class="w-3 h-3 border border-orange-400 border-t-transparent rounded-full animate-spin"
                  />
                  查询中...
                </template>
                <template v-else>
                  <svg
                    class="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  重新查询结果
                </template>
              </button>
            </div>
          </div>
          <div v-else-if="!isGenerating" class="text-center p-4">
            <svg
              class="w-10 h-10 text-text-muted mx-auto mb-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p class="text-[11px] text-text-muted">暂无生成结果</p>
          </div>
        </div>

        <!-- 底部参考图区域 -->
        <div
          class="shrink-0 rounded-xl bg-surface border border-border-subtle p-3 shadow-sm shadow-black/10"
        >
          <div class="flex items-center gap-2 mb-2.5">
            <span class="text-[11px] text-text-secondary font-medium"
              >人物参考图</span
            >
            <span class="text-[10px] text-text-muted"
              >{{ characterRefImages.length }} 张</span
            >
            <div class="flex-1" />
            <button
              class="px-2 py-1 text-[10px] text-text-secondary hover:text-cyan-400 flex items-center gap-1 transition-colors"
              @click="openMaterialLibrary"
            >
              <svg
                class="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              素材库
            </button>
          </div>

          <div
            v-if="characterRefImages.length > 0"
            class="flex items-center gap-1.5 overflow-x-auto scrollbar-hide min-h-[52px]"
          >
            <div
              v-for="(url, idx) in characterRefImages"
              :key="idx"
              class="relative w-[52px] h-[52px] flex-shrink-0 rounded-lg border border-border-subtle overflow-hidden group cursor-pointer"
              @click="openPreview(idx)"
              >
                <img
                  :src="url"
                  class="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              <span
                class="absolute bottom-0 left-0 right-0 text-center text-[9px] bg-black/70 text-cyan-300 py-0.5 pointer-events-none"
                >图{{ characterImageNumbers[idx] }}</span
              >
              <div
                class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                <svg
                  class="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                  />
                </svg>
              </div>
              <!-- 删除按钮 -->
              <button
                class="absolute top-0.5 right-0.5 z-10 w-4 h-4 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                @click.stop="handleRemoveRefImage(idx)"
              >
                <svg
                  class="w-2.5 h-2.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="3"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div
            v-else
            class="text-[10px] text-text-muted py-2 text-center min-h-[52px] flex items-center justify-center"
          >
            暂无参考图
          </div>
        </div>
      </div>
    </div>

    <ImagePreviewModal
      v-model="showPreview"
      :images="characterRefImages"
      :image-index="previewIndex"
      alt="人物参考图"
    />

    <!-- 生成图放大查看 -->
    <ImagePreviewModal
      v-model="showGeneratedPreview"
      :images="
        allGeneratedImageList.length > 0
          ? allGeneratedImageList
          : generatedImage
            ? [generatedImage]
            : []
      "
      :image-index="currentImageIndexInAll >= 0 ? currentImageIndexInAll : 0"
      alt="生成结果"
    />

    <!-- 素材库抽屉 -->
    <MaterialLibrary
      v-model="showMaterialLibrary"
      :project-id="projectId"
      select-label="添加到参考图"
      @select="handleMaterialSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { ComicPage } from "./types";
import type { ModelConfig } from "@comic/types";
import ImagePreviewModal from "@comic/components/ImagePreviewModal.vue";
import MaterialLibrary from "@comic/components/MaterialLibrary.vue";

interface Props {
  page: ComicPage | null;
  pageIndex: number;
  generatedImage: string | null;
  isGenerating: boolean;
  imageModels: ModelConfig[];
  selectedModelId: string;
  globalModelName: string;
  projectId: string;
  pageRefImages?: { character: string[]; scene: string[]; prop: string[] };
  /** 共用参考图数量（决定本页人物参考图的全局图号偏移） */
  refImageOffset?: number;
  allGeneratedImages?: Record<number, string>;
  /** 是否有可恢复的任务（pendingTasks 中存在 taskId） */
  hasRecoverableTask?: boolean;
  /** 是否正在执行重新查询 */
  recovering?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  hasRecoverableTask: false,
  recovering: false,
  refImageOffset: 0,
});

const emit = defineEmits<{
  (e: "generate"): void;
  (e: "recover"): void;
  (e: "preview-line"): void;
  (e: "delete"): void;
  (e: "duplicate"): void;
  (e: "update:selectedModelId", modelId: string): void;
  (
    e: "update:pageRefImages",
    value: { character: string[]; scene: string[]; prop: string[] },
  ): void;
}>();

/** 触发重新查询任务 */
const handleRecover = () => {
  emit("recover");
};

const handleModelChange = (modelId: string) => {
  emit("update:selectedModelId", modelId);
};

const showMaterialLibrary = ref(false);

/** 当前页的人物参考图列表 */
const characterRefImages = computed(() => {
  if (!props.pageRefImages) return [];
  const images = props.pageRefImages.character || [];
  return images.filter((u: string) => typeof u === "string" && u);
});

/** 每张人物参考图对应的全局图号（1-based，偏移量 = 共用参考图数量） */
const characterImageNumbers = computed(() =>
  characterRefImages.value.map((_, idx) => props.refImageOffset + idx + 1),
);

/** 图片预览 */
const showPreview = ref(false);
const previewIndex = ref(0);
/** 生成图预览 */
const showGeneratedPreview = ref(false);

const openPreview = (index: number) => {
  previewIndex.value = index;
  showPreview.value = true;
};

/** 所有已生成的图片列表（按页面顺序） */
const allGeneratedImageList = computed(() => {
  if (!props.allGeneratedImages) return [];
  const images: string[] = [];
  const indices = Object.keys(props.allGeneratedImages)
    .map(Number)
    .sort((a, b) => a - b);
  for (const idx of indices) {
    if (props.allGeneratedImages[idx]) {
      images.push(props.allGeneratedImages[idx]);
    }
  }
  return images;
});

/** 当前图片在所有生成图列表中的索引 */
const currentImageIndexInAll = computed(() => {
  if (!props.generatedImage || !props.allGeneratedImages) return 0;
  const images = allGeneratedImageList.value;
  return images.indexOf(props.generatedImage);
});

const openGeneratedPreview = () => {
  showGeneratedPreview.value = true;
};

/** 打开素材库选择 */
const openMaterialLibrary = () => {
  showMaterialLibrary.value = true;
};

/** 素材库选中素材时的回调 */
const handleMaterialSelect = (url: string) => {
  const refImages = props.pageRefImages || {
    character: [],
    scene: [],
    prop: [],
  };
  const currentImages = refImages.character || [];
  if (currentImages.includes(url)) return;

  const newRefImages = {
    ...refImages,
    character: [...currentImages, url],
  };
  emit("update:pageRefImages", newRefImages);
  showMaterialLibrary.value = false;
};

/** 移除参考图 */
const handleRemoveRefImage = (index: number) => {
  const refImages = props.pageRefImages || {
    character: [],
    scene: [],
    prop: [],
  };
  const currentImages = [...(refImages.character || [])];
  currentImages.splice(index, 1);

  const newRefImages = {
    ...refImages,
    character: currentImages,
  };
  emit("update:pageRefImages", newRefImages);
};

function getFirstStringField(obj: unknown): string {
  if (!obj || typeof obj !== "object") return "";
  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (typeof record[key] === "string" && record[key]) {
      return String(record[key]);
    }
  }
  return "";
}

function getLayoutInfo(page: ComicPage | null): string {
  if (!page) return "";
  const layoutKeys = ["排版布局", "layout", "Layout"];
  for (const lk of layoutKeys) {
    const val = page[lk];
    if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      const obj = val as Record<string, unknown>;
      for (const field of ["格子数量", "格数", "数量", "count"]) {
        const v = obj[field];
        if (typeof v === "string" && v) return v;
        if (typeof v === "number") return String(v);
      }
      const str = getFirstStringField(obj);
      if (str) return str;
    }
  }
  return "";
}
</script>

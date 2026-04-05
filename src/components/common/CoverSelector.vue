<template>
  <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
    <div class="p-4 border-b border-slate-100">
      <div class="flex items-center justify-between">
        <span class="font-bold text-sm text-slate-800">封面配置</span>
        <button
          @click="$emit('open-manager')"
          class="text-xs text-primary hover:text-primary-hover transition"
        >
          管理模板
        </button>
      </div>
    </div>

    <div class="p-4 space-y-4">
      <div>
        <label class="block text-xs font-medium text-slate-500 mb-2"
          >选择封面模板</label
        >
        <div class="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
          <button
            v-for="template in coverTemplateStore.coverTemplates"
            :key="template.id"
            @click="selectTemplate(template)"
            class="p-2 border-2 rounded-lg text-left transition hover:border-primary"
            :class="{
              'border-primary bg-blue-50': selectedTemplate?.id === template.id,
              'border-slate-200': selectedTemplate?.id !== template.id,
            }"
          >
            <p class="text-xs font-medium text-slate-800 truncate">
              {{ template.name }}
            </p>
            <p class="text-[10px] text-slate-500 truncate mt-1">
              {{ template.description || "无描述" }}
            </p>
            <span
              v-if="selectedTemplate?.id === template.id"
              class="text-[9px] text-primary mt-0.5 block"
            >
              需要 {{ getTemplateImageCount(template) }} 张图片
            </span>
          </button>
          <div
            v-if="coverTemplateStore.coverTemplates.length === 0"
            class="col-span-2 p-3 text-center text-sm text-slate-400"
          >
            暂无封面模板，请先创建
          </div>
        </div>
      </div>

      <div v-if="selectedTemplate">
        <div class="flex items-center justify-between mb-2">
          <label class="block text-xs font-medium text-slate-500"
            >封面图片（{{ requiredImageCount }}张）</label
          >
          <button
            @click="$emit('open-image-manager')"
            class="text-[10px] text-primary hover:text-primary-hover transition flex items-center gap-1"
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
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              ></path>
            </svg>
            图片素材
          </button>
        </div>

        <div class="grid grid-cols-5 gap-1.5">
          <div
            v-for="(img, idx) in autoSelectedImages"
            :key="img.id"
            class="aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition relative group"
            :class="[
              idx < requiredImageCount
                ? 'border-green-400 bg-green-50'
                : 'border-slate-200 opacity-40',
            ]"
          >
            <img
              :src="getImageUrl(img.path)"
              :alt="img.name"
              class="w-full h-full object-cover"
              @error="
                (e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }
              "
            />
            <div
              class="absolute top-0.5 left-0.5 w-4 h-4 bg-black/60 text-white text-[9px] rounded-full flex items-center justify-center font-medium"
            >
              {{ idx + 1 }}
            </div>
            <div
              v-if="idx >= requiredImageCount"
              class="absolute inset-0 bg-slate-900/30 flex items-center justify-center"
            >
              <span class="text-[8px] text-white bg-black/60 px-1 rounded"
                >超出</span
              >
            </div>
          </div>
        </div>
        <p class="text-[10px] text-slate-400 mt-1.5">
          自动按顺序使用前
          {{ Math.min(requiredImageCount, images.length) }} 张图片
        </p>
      </div>

      <div
        v-if="selectedTemplate && autoSelectedImages.length > 0"
        class="pt-2 border-t border-slate-100"
      >
        <div class="flex justify-between items-center mb-2">
          <label class="text-xs font-medium text-slate-500">封面预览</label>
          <button
            @click="showZoomModal = true"
            class="text-[10px] text-primary hover:text-primary-hover transition"
          >
            点击放大
          </button>
        </div>

        <div
          ref="coverPreviewRef"
          class="w-full bg-white rounded-lg shadow overflow-hidden border border-slate-200 cursor-zoom-in flex items-center justify-center p-4"
          @click="showZoomModal = true"
        >
          <div class="bg-white w-full max-w-full" v-html="coverPreview"></div>
        </div>

        <div class="mt-2 flex items-center gap-2">
          <button
            @click="showCropTool = true"
            class="text-[10px] px-2.5 py-1 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition flex items-center gap-1"
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
                d="M7 7h10v10M17 7L7 17"
              ></path>
            </svg>
            裁剪设置
          </button>
          <span class="text-[9px] text-slate-400">
            2.35:1={{ currentCrop235 }} | 1:1={{ currentCrop11 }}
          </span>
        </div>
      </div>
    </div>

    <CoverCropTool
      :visible="showCropTool"
      :initial-crop-235="currentCrop235"
      :initial-crop-11="currentCrop11"
      @close="showCropTool = false"
      @confirm="handleCropConfirm"
    />

    <div
      v-if="showZoomModal"
      class="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-8"
      @click.self="showZoomModal = false"
    >
      <button
        class="absolute top-4 right-4 text-white hover:text-slate-300 transition z-10"
        @click="showZoomModal = false"
      >
        <svg
          class="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          ></path>
        </svg>
      </button>

      <div
        class="bg-white shadow-2xl rounded-xl overflow-auto max-w-[80vw] max-h-[80vh] flex items-center justify-center"
      >
        <div
          class="p-4"
          v-html="coverPreview"
          :style="{
            transform: `scale(${zoomScale})`,
            transformOrigin: 'center center',
          }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useCoverTemplateStore } from "../../stores/coverTemplate";
import CoverCropTool from "./CoverCropTool.vue";
import type { CoverTemplate, ImageFile, ArticleCoverConfig } from "../../types";

interface Props {
  images: ImageFile[];
  coverConfig?: ArticleCoverConfig;
  getImageUrl: (path: string) => string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "update:coverConfig", config: ArticleCoverConfig): void;
  (e: "open-manager"): void;
  (e: "open-image-manager"): void;
}>();

const coverTemplateStore = useCoverTemplateStore();
const selectedTemplate = ref<CoverTemplate | null>(null);
const showZoomModal = ref(false);
const showCropTool = ref(false);
const zoomScale = ref(1);
const coverPreviewRef = ref<HTMLDivElement>();

const requiredImageCount = computed(() => {
  if (!selectedTemplate.value) return 0;
  return getTemplateImageCount(selectedTemplate.value);
});

function getTemplateImageCount(template: CoverTemplate): number {
  const imgRegex = /<img[^>]*>/gi;
  const matches = template.html.match(imgRegex);
  return matches ? matches.length : 0;
}

const autoSelectedImages = computed<ImageFile[]>(() => {
  if (!props.images || props.images.length === 0) return [];
  return [...props.images].sort((a, b) => a.order - b.order);
});

const coverPreview = computed(() => {
  if (!selectedTemplate.value || autoSelectedImages.value.length === 0)
    return "";

  let html = selectedTemplate.value.html.replace(/`/g, "");
  const imgRegex = /<img[^>]*>/gi;
  const imgTags = html.match(imgRegex) || [];

  imgTags.forEach((imgTag, index) => {
    if (
      index < autoSelectedImages.value.length &&
      index < requiredImageCount.value
    ) {
      const img = autoSelectedImages.value[index];
      const srcMatch = imgTag.match(/src="[^"]*"/);
      if (srcMatch) {
        const newImgTag = imgTag.replace(
          srcMatch[0],
          `src="${props.getImageUrl(img.path)}"`,
        );
        html = html.replace(imgTag, newImgTag);
      }
    }
  });

  return html;
});

const currentCrop235 = computed(
  () => props.coverConfig?.pic_crop_235_1 ?? "0_0_1_1",
);
const currentCrop11 = computed(
  () => props.coverConfig?.pic_crop_1_1 ?? "0.287234_0_0.712766_1",
);

function selectTemplate(template: CoverTemplate) {
  selectedTemplate.value = template;
  updateCoverConfig();
}

function updateCoverConfig() {
  const config: ArticleCoverConfig = {
    inheritGlobal: false,
    templateId: selectedTemplate.value?.id,
    selectedImageIds: autoSelectedImages.value
      .slice(0, requiredImageCount.value)
      .map((img) => img.id),
    cropMode: "cover",
    pic_crop_235_1: currentCrop235.value,
    pic_crop_1_1: currentCrop11.value,
  };
  emit("update:coverConfig", config);
}

function handleCropConfirm(data: {
  pic_crop_235_1: string;
  pic_crop_1_1: string;
}) {
  const config: ArticleCoverConfig = {
    inheritGlobal: false,
    templateId: selectedTemplate.value?.id,
    selectedImageIds: autoSelectedImages.value
      .slice(0, requiredImageCount.value)
      .map((img) => img.id),
    cropMode: "cover",
    pic_crop_235_1: data.pic_crop_235_1,
    pic_crop_1_1: data.pic_crop_1_1,
  };
  emit("update:coverConfig", config);
}

watch(
  () => [selectedTemplate.value, showCropTool.value],
  () => {
    nextTick(() => (zoomScale.value = 1));
  },
  { deep: true },
);

watch(showZoomModal, (val) => {
  if (val) zoomScale.value = 1;
});

watch(
  () => props.coverConfig,
  (config) => {
    if (!config) return;
    if (config.templateId && !selectedTemplate.value) {
      const found = coverTemplateStore.coverTemplates.find(
        (t) => t.id === config.templateId,
      );
      if (found) selectedTemplate.value = found;
    }
  },
  { immediate: true, deep: true },
);

watch(
  () => props.images,
  () => {
    if (selectedTemplate.value) updateCoverConfig();
  },
  { deep: true },
);
</script>

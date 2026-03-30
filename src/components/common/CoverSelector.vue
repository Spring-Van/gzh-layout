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
        <div class="grid grid-cols-2 gap-2">
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
          </button>
          <div
            v-if="coverTemplateStore.coverTemplates.length === 0"
            class="col-span-2 p-3 text-center text-sm text-slate-400"
          >
            暂无封面模板
          </div>
        </div>
      </div>

      <div v-if="selectedTemplate">
        <label class="block text-xs font-medium text-slate-500 mb-2"
          >选择封面图片</label
        >
        <div class="grid grid-cols-4 gap-2">
          <div
            v-for="img in images"
            :key="img.id"
            @click="toggleImage(img)"
            class="aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition"
            :class="{
              'border-primary': selectedImageIds.includes(img.id),
              'border-slate-200 hover:border-slate-300':
                !selectedImageIds.includes(img.id),
            }"
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
          </div>
        </div>
        <p
          v-if="images.length === 0"
          class="text-xs text-slate-400 text-center py-2"
        >
          暂无图片可选
        </p>
      </div>

      <div
        v-if="selectedTemplate && selectedImageIds.length > 0"
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
          class="w-full bg-white rounded-lg shadow overflow-hidden border border-slate-200 cursor-zoom-in flex items-center justify-center p-4"
          @click="showZoomModal = true"
        >
          <div class="bg-white w-full max-w-full" v-html="coverPreview"></div>
        </div>
      </div>
    </div>

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

      <div class="absolute top-4 left-4 flex gap-2 z-10">
        <button
          @click.stop="zoomIn"
          class="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg transition"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            ></path>
          </svg>
        </button>
        <button
          @click.stop="zoomOut"
          class="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg transition"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M20 12H4"
            ></path>
          </svg>
        </button>
        <button
          @click.stop="resetZoom"
          class="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg transition text-xs"
        >
          重置
        </button>
      </div>

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
}>();

const coverTemplateStore = useCoverTemplateStore();
const selectedTemplate = ref<CoverTemplate | null>(null);
const selectedImageIds = ref<string[]>([]);
const showZoomModal = ref(false);
const zoomScale = ref(1);

const coverPreview = computed(() => {
  if (!selectedTemplate.value || selectedImageIds.value.length === 0) return "";

  let html = selectedTemplate.value.html.replace(/`/g, "");

  const imgRegex = /<img[^>]*>/gi;
  const imgTags = html.match(imgRegex) || [];

  imgTags.forEach((imgTag, index) => {
    if (index < selectedImageIds.value.length) {
      const img = props.images.find(
        (i) => i.id === selectedImageIds.value[index],
      );
      if (img) {
        const srcMatch = imgTag.match(/src="[^"]*"/);
        if (srcMatch) {
          const newImgTag = imgTag.replace(
            srcMatch[0],
            `src="${props.getImageUrl(img.path)}"`,
          );
          html = html.replace(imgTag, newImgTag);
        }
      }
    }
  });

  return html;
});

function selectTemplate(template: CoverTemplate) {
  selectedTemplate.value = template;
  updateCoverConfig();
}

function toggleImage(img: ImageFile) {
  const index = selectedImageIds.value.indexOf(img.id);
  if (index !== -1) {
    selectedImageIds.value.splice(index, 1);
  } else {
    selectedImageIds.value.push(img.id);
  }
  updateCoverConfig();
}

function updateCoverConfig() {
  const config: ArticleCoverConfig = {
    templateId: selectedTemplate.value?.id,
    selectedImageIds: [...selectedImageIds.value],
  };
  emit("update:coverConfig", config);
}

function zoomIn() {
  if (zoomScale.value < 3) {
    zoomScale.value = Math.min(zoomScale.value + 0.25, 3);
  }
}

function zoomOut() {
  if (zoomScale.value > 0.25) {
    zoomScale.value = Math.max(zoomScale.value - 0.25, 0.25);
  }
}

function resetZoom() {
  zoomScale.value = 1;
}

watch(
  [() => selectedTemplate.value, () => selectedImageIds.value],
  () => {
    nextTick(() => {
      zoomScale.value = 1;
    });
  },
  { deep: true },
);

watch(showZoomModal, (newVal) => {
  if (newVal) {
    zoomScale.value = 1;
  }
});
</script>

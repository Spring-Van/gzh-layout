<template>
  <div
    class="w-full h-full flex flex-col lg:flex-row overflow-hidden bg-background"
  >
    <!-- 左侧：HTML 编辑器 -->
    <div
      class="w-full lg:w-1/2 bg-white border-r border-slate-200 flex flex-col h-1/2 lg:h-full flex-shrink-0 z-10"
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
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            ></path>
          </svg>
          {{ isEditing ? "编辑模板" : "HTML 模板编辑器" }}
        </span>
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-700 mb-2"
            >模板名称</label
          >
          <input
            v-model="templateName"
            type="text"
            class="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white shadow-sm"
            placeholder="输入模板名称"
          />
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-700 mb-2"
            >模板描述（可选）</label
          >
          <input
            v-model="templateDescription"
            type="text"
            class="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white shadow-sm"
            placeholder="简单描述一下这个模板"
          />
        </div>

        <div class="mb-4">
          <div
            class="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-200"
          >
            <label class="text-sm font-medium text-slate-700"
              >设为默认模板</label
            >
            <button
              type="button"
              :class="[
                'w-11 h-6 rounded-full transition-colors relative',
                isDefault ? 'bg-primary' : 'bg-slate-300',
              ]"
              @click="isDefault = !isDefault"
            >
              <span
                :class="[
                  'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                  isDefault ? 'left-6' : 'left-1',
                ]"
              ></span>
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2"
            >HTML 代码</label
          >
          <textarea
            v-model="templateHtml"
            rows="20"
            class="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white shadow-sm font-mono custom-scrollbar"
            placeholder="在此输入 HTML 代码..."
          ></textarea>
        </div>
      </div>

      <div class="p-4 border-t border-slate-100 flex justify-end gap-3">
        <button
          @click="$emit('cancel')"
          class="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
        >
          取消
        </button>
        <button
          @click="saveTemplate"
          :disabled="!templateName || !templateHtml"
          class="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isEditing ? "更新模板" : "保存模板" }}
        </button>
      </div>
    </div>

    <!-- 右侧：预览 -->
    <div
      class="flex-1 h-full flex items-center justify-center p-4 lg:p-8 relative overflow-hidden bg-slate-100/50"
    >
      <PhoneMockup>
        <h1 class="text-[22px] font-bold mb-3 leading-snug text-slate-900">
          {{ templateName || "标题加载中..." }}
        </h1>
        <div
          class="flex items-center gap-2 text-sm text-slate-500 mb-6 font-medium"
        >
          <span class="text-[#576b95]">{{
            templateDescription || "模板描述"
          }}</span>
        </div>

        <div v-html="processedHtml" class="template-preview-reset"></div>
        <div class="mt-16 mb-8 text-center text-slate-400 text-xs">
          — 预览到底部了 —
        </div>
      </PhoneMockup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import PhoneMockup from "./PhoneMockup.vue";
import type { CustomTemplate } from "../../types";

interface Props {
  template?: CustomTemplate;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "save", template: CustomTemplate): void;
  (e: "cancel"): void;
}>();

const templateName = ref("");
const templateDescription = ref("");
const templateHtml = ref("");
const isDefault = ref(false);

const isEditing = computed(() => !!props.template?.id);

const processedHtml = computed(() => {
  let html = templateHtml.value;
  // 替换占位图片 URL 为实际可访问的图片
  html = html.replace(
    /`https:\/\/toai\.art\/b1\.png`/g,
    "https://via.placeholder.com/400x500",
  );
  html = html.replace(/`/g, "");
  return html;
});

watch(
  () => props.template,
  (newTemplate) => {
    if (newTemplate) {
      templateName.value = newTemplate.name;
      templateDescription.value = newTemplate.description || "";
      templateHtml.value = newTemplate.html;
      isDefault.value = newTemplate.isDefault || false;
    } else {
      templateName.value = "";
      templateDescription.value = "";
      templateHtml.value = "";
      isDefault.value = false;
    }
  },
  { immediate: true },
);

function saveTemplate() {
  if (!templateName.value || !templateHtml.value) return;

  const now = new Date().toISOString();
  const template: CustomTemplate = {
    id: props.template?.id || crypto.randomUUID(),
    name: templateName.value,
    description: templateDescription.value,
    html: templateHtml.value,
    isDefault: isDefault.value,
    createdAt: props.template?.createdAt || now,
    updatedAt: now,
  };

  emit("save", template);
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.background {
  background-color: #f8fafc;
}

.template-preview-reset {
  all: initial;
  display: block;
}

.template-preview-reset :deep(p) {
  margin: 1em 0;
}
.template-preview-reset :deep(h1),
.template-preview-reset :deep(h2),
.template-preview-reset :deep(h3),
.template-preview-reset :deep(h4),
.template-preview-reset :deep(h5),
.template-preview-reset :deep(h6) {
  margin: 0.67em 0;
  font-weight: bold;
}
.template-preview-reset :deep(h1) { font-size: 2em; }
.template-preview-reset :deep(h2) { font-size: 1.5em; }
.template-preview-reset :deep(h3) { font-size: 1.17em; }
.template-preview-reset :deep(h4) { font-size: 1em; }
.template-preview-reset :deep(h5) { font-size: 0.83em; }
.template-preview-reset :deep(h6) { font-size: 0.67em; }
.template-preview-reset :deep(blockquote),
.template-preview-reset :deep(figure),
.template-preview-reset :deep(ul),
.template-preview-reset :deep(ol),
.template-preview-reset :deep(dl),
.template-preview-reset :deep(dd),
.template-preview-reset :deep(pre) {
  margin: 1em 0;
}
</style>

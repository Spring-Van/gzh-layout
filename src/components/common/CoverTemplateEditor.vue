<template>
  <div class="w-full h-full flex flex-col lg:flex-row overflow-hidden bg-background">
    <div class="w-full lg:w-1/2 bg-white border-r border-slate-200 flex flex-col h-1/2 lg:h-full flex-shrink-0 z-10">
      <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
        <span class="font-bold text-sm text-slate-800 flex items-center gap-2">
          <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
          </svg>
          {{ isEditing ? "编辑封面模板" : "封面模板编辑器" }}
        </span>
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-700 mb-2">模板名称</label>
          <input
            v-model="templateName"
            type="text"
            class="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white shadow-sm"
            placeholder="输入模板名称"
          />
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-700 mb-2">模板描述（可选）</label>
          <input
            v-model="templateDescription"
            type="text"
            class="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white shadow-sm"
            placeholder="简单描述一下这个模板"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">HTML 代码</label>
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

    <div class="flex-1 h-full flex items-center justify-center p-4 lg:p-8 relative overflow-hidden bg-slate-100/50">
      <div class="w-full max-w-[600px] bg-white rounded-xl shadow-lg overflow-hidden">
        <div class="aspect-[2.35/1] bg-white relative" v-html="processedHtml"></div>
        <div class="p-3 bg-slate-50 border-t border-slate-200">
          <p class="text-xs text-slate-500 text-center">公众号封面预览 (2.35:1)</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { CoverTemplate } from "../../types";

interface Props {
  template?: CoverTemplate;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "save", template: CoverTemplate): void;
  (e: "cancel"): void;
}>();

const templateName = ref("");
const templateDescription = ref("");
const templateHtml = ref("");

const isEditing = computed(() => !!props.template?.id);

const processedHtml = computed(() => {
  let html = templateHtml.value;
  html = html.replace(
    /`https:\/\/toai\.art\/b1\.png`/g,
    "https://via.placeholder.com/400x300",
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
    }
  },
  { immediate: true },
);

function saveTemplate() {
  if (!templateName.value || !templateHtml.value) return;

  const now = new Date().toISOString();
  const template: CoverTemplate = {
    id: props.template?.id || crypto.randomUUID(),
    name: templateName.value,
    description: templateDescription.value,
    html: templateHtml.value,
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
</style>

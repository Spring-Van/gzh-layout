<template>
  <div
    class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity"
    :class="[visible ? 'opacity-100' : 'opacity-0 pointer-events-none']"
    @click.self="$emit('close')"
  >
    <div
      class="bg-white w-full h-full overflow-hidden flex flex-col"
      :class="[visible ? 'scale-100' : 'scale-95']"
    >
      <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
        <h3 class="font-bold text-slate-800">封面模板全局配置</h3>
        <button class="text-slate-400 hover:text-slate-600" @click="$emit('close')">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-hidden flex">
        <div class="w-64 border-r border-slate-200 bg-slate-50 flex flex-col">
          <div class="p-4 border-b border-slate-200">
            <button
              @click="coverTemplateStore.openEditor"
              class="w-full bg-primary text-white text-sm font-medium py-2 rounded-lg hover:bg-primary-hover transition flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              新建模板
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-3 space-y-2">
            <div
              v-for="template in coverTemplateStore.coverTemplates"
              :key="template.id"
              class="p-3 border border-slate-200 rounded-lg cursor-pointer hover:border-primary transition"
              :class="{
                'border-primary bg-blue-50': selectedTemplateId === template.id,
              }"
              @click="selectTemplate(template.id)"
            >
              <div class="flex items-center gap-2 mb-1">
                <p class="text-sm font-medium text-slate-800 truncate">{{ template.name }}</p>
                <span v-if="coverTemplateStore.isBuiltInTemplate(template.id)" class="px-1.5 py-0.5 bg-primary/10 text-primary text-[9px] rounded">内置</span>
              </div>
              <p class="text-xs text-slate-500 truncate">{{ template.description || "无描述" }}</p>
              <div class="flex justify-between items-center mt-2">
                <span class="text-[10px] text-slate-400">{{ formatDate(template.updatedAt) }}</span>
                <div class="flex gap-1">
                  <button 
                    v-if="!coverTemplateStore.isBuiltInTemplate(template.id)"
                    @click.stop="editTemplate(template)" 
                    class="text-slate-400 hover:text-primary transition"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                  </button>
                  <button 
                    v-if="!coverTemplateStore.isBuiltInTemplate(template.id)"
                    @click.stop="deleteTemplate(template.id)" 
                    class="text-slate-400 hover:text-red-500 transition"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <p
              v-if="coverTemplateStore.coverTemplates.length === 0"
              class="text-sm text-slate-500 text-center py-4"
            >
              暂无封面模板
            </p>
          </div>
        </div>

        <div class="flex-1 overflow-hidden">
          <CoverTemplateEditor
            v-if="coverTemplateStore.showEditor || editingTemplate"
            :template="editingTemplate"
            @save="handleSaveTemplate"
            @cancel="handleCancelEdit"
          />
          <div v-else-if="selectedTemplate" class="w-full h-full flex items-center justify-center p-4 lg:p-8 relative overflow-hidden bg-slate-100/50">
            <div class="w-full max-w-[600px] bg-white rounded-xl shadow-lg overflow-hidden">
              <div class="aspect-[2.35/1] bg-white relative" v-html="selectedTemplatePreview"></div>
              <div class="p-4 bg-white border-t border-slate-200">
                <h3 class="text-lg font-bold text-slate-900">{{ selectedTemplate.name }}</h3>
                <p class="text-sm text-slate-500 mt-1">{{ selectedTemplate.description || "无描述" }}</p>
              </div>
            </div>
          </div>
          <div v-else class="w-full h-full flex items-center justify-center">
            <div class="text-center">
              <svg class="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              <p class="text-slate-400 text-sm">选择一个模板开始预览</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useCoverTemplateStore } from "../../stores/coverTemplate";
import CoverTemplateEditor from "../common/CoverTemplateEditor.vue";
import type { CoverTemplate } from "../../types";

interface Props {
  visible: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "select", template: CoverTemplate): void;
}>();

const coverTemplateStore = useCoverTemplateStore();
const selectedTemplateId = ref<string | null>(null);
const editingTemplate = ref<CoverTemplate | null>(null);

const selectedTemplate = computed(() =>
  coverTemplateStore.coverTemplates.find((t) => t.id === selectedTemplateId.value)
);

const selectedTemplatePreview = computed(() => {
  if (!selectedTemplate.value) return "";
  let html = selectedTemplate.value.html.replace(/`/g, "");
  html = html.replace(
    /https:\/\/toai\.art\/b1\.png/g,
    "https://via.placeholder.com/400x300",
  );
  return html;
});

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
}

function selectTemplate(templateId: string) {
  selectedTemplateId.value = templateId;
  const template = coverTemplateStore.coverTemplates.find((t) => t.id === templateId);
  if (template) {
    emit("select", template);
  }
}

function editTemplate(template: CoverTemplate) {
  editingTemplate.value = { ...template };
  coverTemplateStore.showEditor = true;
}

async function deleteTemplate(templateId: string) {
  if (confirm("确定要删除这个模板吗？")) {
    await coverTemplateStore.deleteCoverTemplate(templateId);
    if (selectedTemplateId.value === templateId) {
      selectedTemplateId.value = null;
    }
  }
}

function handleSaveTemplate(template: CoverTemplate) {
  coverTemplateStore.saveCoverTemplateToStore(template);
  editingTemplate.value = null;
  selectedTemplateId.value = template.id;
}

function handleCancelEdit() {
  coverTemplateStore.closeEditor();
  editingTemplate.value = null;
}
</script>

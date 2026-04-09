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
      <div
        class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0"
      >
        <h3 class="font-bold text-slate-800">选择封面模板</h3>
        <button
          class="text-slate-400 hover:text-slate-600"
          @click="$emit('close')"
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
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-hidden flex">
        <div class="w-64 border-r border-slate-200 bg-slate-50 flex flex-col">
          <div class="flex-1 overflow-y-auto p-3 space-y-2">
            <div
              v-for="template in userTemplates"
              :key="template.id"
              class="p-3 border border-slate-200 rounded-lg cursor-pointer hover:border-primary transition"
              :class="{
                'border-primary bg-blue-50': selectedTemplateId === template.id,
              }"
              @click="selectTemplate(template.id)"
            >
              <p class="text-sm font-medium text-slate-800 truncate">
                {{ template.name }}
              </p>
              <p class="text-xs text-slate-500 truncate mt-1">
                {{ template.description || "无描述" }}
              </p>
            </div>
            <p
              v-if="userTemplates.length === 0"
              class="text-sm text-slate-500 text-center py-4"
            >
              暂无封面模板
            </p>
          </div>
        </div>

        <div class="flex-1 overflow-hidden">
          <div
            v-if="selectedTemplate"
            class="w-full h-full flex items-center justify-center p-4 lg:p-8 relative overflow-hidden bg-slate-100/50"
          >
            <div
              class="w-full max-w-[600px] bg-white rounded-xl shadow-lg overflow-hidden"
            >
              <div
                class="aspect-[2.35/1] bg-white relative"
                v-html="selectedTemplatePreview"
              ></div>
              <div class="p-4 bg-white border-t border-slate-200">
                <h3 class="text-lg font-bold text-slate-900">
                  {{ selectedTemplate.name }}
                </h3>
                <p class="text-sm text-slate-500 mt-1">
                  {{ selectedTemplate.description || "无描述" }}
                </p>
              </div>
            </div>
          </div>
          <div v-else class="w-full h-full flex items-center justify-center">
            <div class="text-center">
              <svg
                class="w-12 h-12 text-slate-300 mx-auto mb-3"
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
              <p class="text-slate-500 text-sm">从左侧选择一个模板进行预览</p>
            </div>
          </div>
        </div>
      </div>

      <div
        class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0"
      >
        <button
          class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded"
          @click="$emit('close')"
        >
          关闭
        </button>
        <button
          v-if="selectedTemplateId"
          class="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary-hover transition"
          @click="handleSelectTemplate"
        >
          选择此模板
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useCoverTemplateStore } from "../../stores/coverTemplate";
import type { CoverTemplate } from "../../types";

interface Props {
  visible: boolean;
  currentTemplateId?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "select", templateId: string): void;
  (e: "openCoverTemplate"): void;
}>();

const coverTemplateStore = useCoverTemplateStore();
const selectedTemplateId = ref<string | undefined>(props.currentTemplateId);

const userTemplates = computed(() => coverTemplateStore.coverTemplates);

const selectedTemplate = computed(() => {
  if (!selectedTemplateId.value) return null;
  return (
    coverTemplateStore.coverTemplates.find(
      (t) => t.id === selectedTemplateId.value,
    ) || null
  );
});

function openCoverTemplateModal() {
  emit("openCoverTemplate");
}

watch(
  () => props.visible,
  (newVal) => {
    if (newVal && coverTemplateStore.coverTemplates.length === 0) {
      if (confirm("暂无封面模板，是否立即新建封面模板？")) {
        emit("openCoverTemplate");
        emit("close");
      }
    }
  },
  { immediate: true },
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

function selectTemplate(templateId: string) {
  selectedTemplateId.value = templateId;
}

function handleSelectTemplate() {
  if (selectedTemplateId.value) {
    emit("select", selectedTemplateId.value);
    emit("close");
  }
}

watch(
  () => props.currentTemplateId,
  (newId) => {
    selectedTemplateId.value = newId;
  },
);
</script>

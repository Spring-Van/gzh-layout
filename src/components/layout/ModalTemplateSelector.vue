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
        <h3 class="font-bold text-slate-800">选择排版模板</h3>
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
              v-for="template in templateStore.customTemplates"
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
                {{ template.description || "微信公众号配置名称" }}
              </p>
              <div class="mt-2">
                <span class="text-[10px] text-slate-400">{{
                  formatDate(template.updatedAt)
                }}</span>
              </div>
            </div>
            <p
              v-if="templateStore.customTemplates.length === 0"
              class="text-sm text-slate-500 text-center py-4"
            >
              暂无排版模板
            </p>
          </div>
        </div>

        <div class="flex-1 overflow-hidden">
          <div
            v-if="selectedTemplate"
            class="w-full h-full flex items-center justify-center p-4 lg:p-8 relative overflow-hidden bg-slate-100/50"
          >
            <PhoneMockup>
              <h1
                class="text-[22px] font-bold mb-3 leading-snug text-slate-900"
              >
                {{ selectedTemplate.name || "标题加载中..." }}
              </h1>
              <div
                class="flex items-center gap-2 text-sm text-slate-500 mb-6 font-medium"
              >
                <span class="text-[#576b95]">{{
                  selectedTemplate.description || "微信公众号配置名称"
                }}</span>
              </div>

              <div v-html="selectedTemplatePreview" class="space-y-6"></div>
              <div class="mt-16 mb-8 text-center text-slate-400 text-xs">
                — 预览到底部了 —
              </div>
            </PhoneMockup>
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
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
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
/* eslint-disable vue/no-unused-properties */
import { ref, computed, watch } from "vue";
import { useTemplateStore } from "../../stores/template";
import PhoneMockup from "../common/PhoneMockup.vue";
import type { CustomTemplate } from "../../types";

interface Props {
  visible: boolean;
  currentTemplateId?: string;
}

const props = defineProps<Props>();
/* eslint-enable vue/no-unused-properties */
const emit = defineEmits<{
  (e: "close"): void;
  (e: "select", templateId: string): void;
  (e: "openTemplate"): void;
}>();

const templateStore = useTemplateStore();
const selectedTemplateId = ref<string>(props.currentTemplateId || "");

watch(
  () => props.visible,
  (newVal) => {
    if (newVal && templateStore.customTemplates.length === 0) {
      if (confirm("暂无排版模板，是否立即新建排版模板？")) {
        emit("openTemplate");
        emit("close");
      }
    }
  },
  { immediate: true },
);

const selectedTemplate = computed<CustomTemplate | undefined>(() => {
  if (!selectedTemplateId.value) return undefined;
  return templateStore.customTemplates.find(
    (t) => t.id === selectedTemplateId.value,
  );
});

const selectedTemplatePreview = computed(() => {
  if (!selectedTemplate.value) return "";
  let html = selectedTemplate.value.html;
  html = html.replace(
    /`https:\/\/toai\.art\/b1\.png`/g,
    "https://via.placeholder.com/400x500",
  );
  html = html.replace(/`/g, "");
  return html;
});

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-CN");
}

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
    selectedTemplateId.value = newId || "";
  },
);
</script>

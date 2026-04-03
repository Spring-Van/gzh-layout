<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex">
    <div class="absolute inset-0 bg-black/50" @click="$emit('close')"></div>
    <div
      class="relative ml-auto w-[420px] h-full bg-white shadow-2xl flex flex-col"
    >
      <div
        class="flex items-center justify-between p-4 border-b border-slate-200"
      >
        <div class="flex items-center gap-2">
          <span class="w-1.5 h-4 bg-primary rounded-full"></span>
          <h3 class="text-lg font-bold text-slate-800">选择排版模板</h3>
        </div>
        <button
          @click="$emit('close')"
          class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition"
        >
          <svg
            class="w-5 h-5 text-slate-500"
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

      <div class="flex-1 overflow-y-auto p-4">
        <template v-if="customTemplates.length > 0">
          <p class="text-xs font-medium text-slate-500 mb-3">自定义模板</p>
          <div class="grid grid-cols-2 gap-4">
            <div
              v-for="template in customTemplates"
              :key="template.id"
              :class="[
                'relative cursor-pointer transition',
                currentTemplateId === template.id
                  ? 'opacity-100'
                  : 'opacity-70 hover:opacity-100',
              ]"
              @click="selectTemplate(template.id)"
            >
              <div
                v-if="currentTemplateId === template.id"
                class="absolute -inset-2 border-2 border-primary rounded-[2.5rem] z-10 pointer-events-none"
              ></div>
              <PhoneMockup class="w-full">
                <h1
                  class="text-[22px] font-bold mb-3 leading-snug text-slate-900"
                >
                  {{ template.name || "标题加载中..." }}
                </h1>
                <div
                  class="flex items-center gap-2 text-sm text-slate-500 mb-6 font-medium"
                >
                  <span class="text-[#576b95]">{{
                    template.description || "微信公众号配置名称"
                  }}</span>
                </div>
                <div v-html="template.html" class="space-y-6"></div>
                <div class="mt-16 mb-8 text-center text-slate-400 text-xs">
                  — 预览到底部了 —
                </div>
              </PhoneMockup>
            </div>
          </div>
        </template>

        <template v-else>
          <div
            class="flex flex-col items-center justify-center h-full text-center py-12"
          >
            <svg
              class="w-16 h-16 text-slate-200 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              ></path>
            </svg>
            <p class="text-sm text-slate-500 mb-2">还没有自定义模板</p>
            <p class="text-xs text-slate-400 mb-4">
              点击下方按钮创建您的第一个排版模板
            </p>
          </div>
        </template>
      </div>

      <div class="p-4 border-t border-slate-200">
        <button
          class="w-full bg-primary text-white font-medium py-2.5 rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2 text-sm"
          @click="$emit('open-template-manager')"
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
              d="M12 4v16m8-8H4"
            ></path>
          </svg>
          管理自定义模板
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useTemplateStore } from "../../stores/template";
import PhoneMockup from "../common/PhoneMockup.vue";
import type { CustomTemplate } from "../../types";

interface Props {
  visible: boolean;
  currentTemplateId: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  select: [templateId: string];
  "open-template-manager": [];
}>();

const templateStore = useTemplateStore();

const customTemplates = computed<CustomTemplate[]>(
  () => templateStore.customTemplates,
);

function selectTemplate(templateId: string) {
  emit("select", templateId);
  emit("close");
}
</script>

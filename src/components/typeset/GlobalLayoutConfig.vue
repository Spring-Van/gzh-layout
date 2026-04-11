<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="w-1.5 h-4 bg-primary rounded-full"></span>
      <label class="text-sm font-bold text-slate-800">全局排版规则</label>
    </div>

    <div class="space-y-3">
      <div>
        <label class="text-xs font-medium text-slate-500 block mb-1"
          >排版模板</label
        >
        <div
          class="border-2 border-slate-200 rounded-xl p-3 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition"
          @click="showSelector = true"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 bg-white rounded-lg border border-slate-200 flex items-center justify-center shadow-sm overflow-hidden"
            >
              <template v-if="localConfig.templateId">
                <div class="w-full h-full flex items-center justify-center p-1">
                  <svg
                    class="w-5 h-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                    ></path>
                  </svg>
                </div>
              </template>
              <template v-else>
                <svg
                  class="w-5 h-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                  ></path>
                </svg>
              </template>
            </div>
            <div class="flex-1">
              <p class="text-sm font-bold text-slate-700">
                {{ currentTemplateName }}
              </p>
              <p class="text-xs text-slate-400">
                {{ currentTemplateDescription }}
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

      <div class="bg-blue-50 rounded-lg p-3 border border-blue-200">
        <p class="text-xs text-blue-600">当前生效：全局默认</p>
      </div>
    </div>

    <ModalTemplateSelector
      :visible="showSelector"
      :current-template-id="localConfig.templateId"
      @close="showSelector = false"
      @select="updateTemplate"
      @open-template="openTemplateManager"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useTemplateStore } from "../../stores/template";
import ModalTemplateSelector from "../layout/ModalTemplateSelector.vue";
import type { GlobalLayoutConfig } from "../../types";

interface Props {
  config: GlobalLayoutConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:config": [config: GlobalLayoutConfig];
  "open-template-manager": [];
}>();

const templateStore = useTemplateStore();
const showSelector = ref(false);

const localConfig = computed({
  get: () => props.config,
  set: (val) => emit("update:config", val),
});

function openTemplateManager() {
  emit("open-template-manager");
}

const currentTemplateName = computed(() => {
  const custom = templateStore.customTemplates.find(
    (t) => t.id === props.config.templateId,
  );
  return custom?.name || "未选择模板";
});

const currentTemplateDescription = computed(() => {
  const custom = templateStore.customTemplates.find(
    (t) => t.id === props.config.templateId,
  );
  return custom?.description || "自定义排版模板";
});

function updateTemplate(templateId: string) {
  emit("update:config", { ...props.config, templateId });
}
</script>

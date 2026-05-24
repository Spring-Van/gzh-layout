<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="w-1.5 h-4 bg-primary rounded-full"></span>
      <label class="text-sm font-bold text-slate-800">全局排版规则</label>
    </div>

    <div class="space-y-3">
      <div>
        <label class="text-xs font-medium text-slate-500 block mb-1">排版模板</label>
        <div
          class="border-2 border-slate-200 rounded-xl p-3 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition"
          @click="showSelector = true"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 bg-white rounded-lg border border-slate-200 flex items-center justify-center shadow-sm overflow-hidden"
            >
              <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-sm font-bold text-slate-700">{{ currentTemplateName }}</p>
              <p class="text-xs text-slate-400">{{ currentTemplateDescription }}</p>
            </div>
            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="border-t border-slate-200 pt-3">
        <div class="flex items-center gap-2 mb-3">
          <span class="w-1 h-3 bg-slate-400 rounded-full"></span>
          <label class="text-xs font-bold text-slate-700">样式插入</label>
        </div>

        <div
          v-for="position in positions"
          :key="position.value"
          class="bg-slate-50 rounded-lg p-3 border border-slate-200 mb-2"
        >
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-medium text-slate-600">{{ position.label }}</label>
            <button
              :class="[
                'w-11 h-6 rounded-full transition-colors relative',
                styleInsertConfig[position.value].enabled ? 'bg-primary' : 'bg-slate-300',
              ]"
              @click="toggleStyleEnabled(position.value)"
            >
              <span
                :class="[
                  'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                  styleInsertConfig[position.value].enabled ? 'left-6' : 'left-1',
                ]"
              ></span>
            </button>
          </div>

          <div
            v-if="styleInsertConfig[position.value].enabled"
            class="flex items-center gap-2 cursor-pointer"
            @click="openStyleDrawer(position.value)"
          >
            <div class="flex-1">
              <p class="text-xs text-slate-500">
                已选择 {{ styleInsertConfig[position.value].templateIds.length }} 个样式
              </p>
            </div>
            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
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

    <StyleTemplateDrawer
      :visible="showStyleDrawer"
      :initial-selected-ids="currentDrawerSelectedIds"
      @close="showStyleDrawer = false"
      @confirm="handleStyleConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useTemplateStore } from "../../stores/template";
import ModalTemplateSelector from "../layout/ModalTemplateSelector.vue";
import StyleTemplateDrawer from "./StyleTemplateDrawer.vue";
import type { GlobalLayoutConfig, GlobalStyleInsertConfig, StyleInsertPosition } from "../../types";

interface Props {
  config: GlobalLayoutConfig;
  styleInsertConfig: GlobalStyleInsertConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:config": [config: GlobalLayoutConfig];
  "update:styleInsertConfig": [config: GlobalStyleInsertConfig];
  "open-template-manager": [];
}>();

const templateStore = useTemplateStore();
const showSelector = ref(false);
const showStyleDrawer = ref(false);
const currentEditPosition = ref<StyleInsertPosition>('header');

const positions = [
  { value: 'header' as StyleInsertPosition, label: '文章头部' },
  { value: 'between' as StyleInsertPosition, label: '段落之间' },
  { value: 'footer' as StyleInsertPosition, label: '文章底部' },
];

const localConfig = computed({
  get: () => props.config,
  set: (val) => emit("update:config", val),
});

const currentDrawerSelectedIds = computed(() => {
  return props.styleInsertConfig[currentEditPosition.value].templateIds;
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

function toggleStyleEnabled(position: StyleInsertPosition) {
  const newConfig = { ...props.styleInsertConfig };
  newConfig[position] = {
    ...newConfig[position],
    enabled: !newConfig[position].enabled,
  };
  emit("update:styleInsertConfig", newConfig);
}

function openStyleDrawer(position: StyleInsertPosition) {
  currentEditPosition.value = position;
  showStyleDrawer.value = true;
}

function handleStyleConfirm(selectedIds: string[]) {
  const newConfig = { ...props.styleInsertConfig };
  newConfig[currentEditPosition.value] = {
    ...newConfig[currentEditPosition.value],
    templateIds: selectedIds,
  };
  emit("update:styleInsertConfig", newConfig);
}
</script>

<template>
  <header class="shrink-0 min-h-14 px-6 border-b border-border-subtle flex items-center gap-4">
    <button
      class="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors text-sm"
      @click="$emit('back')"
    >
      <FolderOpen class="w-4 h-4" />
      项目
    </button>
    <div class="w-px h-4 bg-elevated" />
    <h1 class="text-sm font-semibold text-text-primary leading-7 truncate">{{ projectName }}</h1>
    <div class="flex-1" />

    <div class="flex items-center gap-3 overflow-x-auto py-1">
      <ToolbarSelect
        label="绘画风格"
        :model-value="styleId"
        :options="styleOptions"
        placeholder="请选择风格"
        class="min-w-[120px]"
        @update:model-value="updateStyle"
      />
      <ToolbarSelect
        label="图片生成模型"
        :model-value="imageModelId"
        :options="modelOptions"
        placeholder="请选择模型"
        class="min-w-[140px]"
        @update:model-value="updateImageModel"
      />
      <ToolbarSelect
        label="图片比例"
        :model-value="aspectRatio"
        :options="aspectRatioOptions"
        placeholder="默认"
        class="min-w-[100px]"
        @update:model-value="$emit('update:aspectRatio', $event)"
      />
      <ToolbarSelect
        label="分辨率"
        :model-value="resolution"
        :options="resolutionOptions"
        placeholder="默认"
        class="min-w-[100px]"
        @update:model-value="$emit('update:resolution', $event)"
      />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { FolderOpen } from 'lucide-vue-next';
import type { ModelConfig, PromptTemplate } from '@comic/types';
import ToolbarSelect from './ProjectAssetsToolbarSelect.vue';

const props = defineProps<{
  projectName: string;
  styleTemplates: PromptTemplate[];
  models: ModelConfig[];
  styleId: string;
  imageModelId: string;
  aspectRatio: string;
  resolution: string;
}>();

const emit = defineEmits<{
  back: [];
  styleChange: [];
  'update:styleId': [value: string];
  'update:imageModelId': [value: string];
  'update:aspectRatio': [value: string];
  'update:resolution': [value: string];
}>();

const selectedImageModel = computed(() => props.models.find(model => model.id === props.imageModelId));
const styleOptions = computed(() => props.styleTemplates.map(template => ({ value: template.id, label: template.name })));
const modelOptions = computed(() => props.models
  .filter(model => model.category === 'image')
  .map(model => ({ value: model.id, label: model.name })));
const aspectRatioOptions = computed(() => splitOptions(selectedImageModel.value?.aspectRatios));
const resolutionOptions = computed(() => splitOptions(selectedImageModel.value?.resolutions));

function splitOptions(value?: string) {
  if (!value) return [];
  return value.split(/[,，]/).map(item => item.trim()).filter(Boolean).map(item => ({ value: item, label: item }));
}

function updateStyle(value: string) {
  emit('update:styleId', value);
  emit('styleChange');
}

function updateImageModel(value: string) {
  emit('update:imageModelId', value);
}
</script>

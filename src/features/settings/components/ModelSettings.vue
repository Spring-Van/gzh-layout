<template>
  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
    <article
      v-for="model in filteredModels"
      :key="model.id"
      class="bg-surface border border-border-subtle rounded-lg p-4 hover:bg-elevated hover:border-border-default hover:shadow-lg hover:shadow-cyan-500/5 transition-[background-color,border-color,box-shadow] duration-300 flex flex-col"
      :class="{ 'opacity-50': draggedModelId === model.id }"
      draggable="true"
      @dragstart="startDrag($event, model.id)"
      @dragover.prevent
      @drop="dropOn($event, model.id)"
    >
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-2 min-w-0">
          <GripVertical class="w-4 h-4 text-text-secondary cursor-grab active:cursor-grabbing shrink-0" />
          <h3 class="text-sm font-semibold text-text-primary truncate">{{ model.name }}</h3>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <IconButton title="编辑模型" @click="openEdit(model)"><Pencil class="w-3.5 h-3.5" /></IconButton>
          <IconButton title="复制模型" tone="success" @click="duplicate(model)"><Copy class="w-3.5 h-3.5" /></IconButton>
          <IconButton title="删除模型" tone="danger" @click="remove(model.id)"><Trash2 class="w-3.5 h-3.5" /></IconButton>
        </div>
      </div>

      <dl class="flex-1 space-y-2 min-w-0">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <dt class="text-[11px] text-text-secondary mb-0.5">{{ model.category === 'image' ? 'API来源' : 'API格式' }}</dt>
            <dd class="text-xs text-text-secondary">{{ model.category === 'image' ? formatApiSource(model.apiSource) : formatApiFormat(model.apiFormat) }}</dd>
          </div>
          <div class="min-w-0">
            <dt class="text-[11px] text-text-secondary mb-0.5">Model</dt>
            <dd class="text-xs text-text-secondary truncate" :title="model.model">{{ model.model }}</dd>
          </div>
        </div>
        <div>
          <dt class="text-[11px] text-text-secondary mb-0.5">Base URL</dt>
          <dd class="text-xs text-text-secondary truncate" :title="model.baseUrl">{{ model.baseUrl }}</dd>
        </div>
        <div>
          <dt class="text-[11px] text-text-secondary mb-0.5">API Key</dt>
          <dd class="text-xs text-text-secondary font-mono truncate">{{ maskApiKey(model.apiKey) }}</dd>
        </div>
      </dl>

      <div v-if="model.category === 'llm'" class="pt-3 mt-3 border-t border-border-subtle">
        <button
          class="w-full px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
          :class="testButtonClass(model.id)"
          :disabled="testLoadingId === model.id"
          @click="testFromCard(model)"
        >
          <template v-if="testLoadingId === model.id">测试中...</template>
          <template v-else-if="testResults[model.id]?.success">连接成功（{{ testResults[model.id]?.duration }}ms）</template>
          <template v-else-if="testResults[model.id]?.error">连接失败</template>
          <template v-else>测试连接</template>
        </button>
      </div>
    </article>

    <div v-if="filteredModels.length === 0" class="col-span-full text-center text-text-muted text-sm py-12 bg-surface border border-border-subtle rounded-lg">
      暂无{{ categoryLabel }}模型，点击右上角添加
    </div>
  </div>

  <ModelEditorModal
    :visible="modalVisible"
    :category="category"
    :model="editingModel"
    @close="closeModal"
    @save="save"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { Copy, GripVertical, Pencil, Trash2 } from 'lucide-vue-next';
import { comicDb } from '@/api/comic';
import { llmService, type TestConnectionResult } from '@comic/services/llmService';
import type { ApiFormat, ApiSource, ModelCategory, ModelConfig } from '@comic/types';
import IconButton from './SettingsIconButton.vue';
import ModelEditorModal, { type ModelEditorValue } from './ModelEditorModal.vue';

const props = defineProps<{ category: ModelCategory }>();
const models = ref<ModelConfig[]>([]);
const modalVisible = ref(false);
const editingId = ref<string | null>(null);
const draggedModelId = ref<string | null>(null);
const testLoadingId = ref<string | null>(null);
const testResults = reactive<Record<string, TestConnectionResult | null>>({});

const filteredModels = computed(() => models.value.filter(model => model.category === props.category));
const editingModel = computed(() => editingId.value ? models.value.find(model => model.id === editingId.value) || null : null);
const categoryLabel = computed(() => ({ llm: 'LLM', image: '图片', video: '视频' })[props.category]);

async function loadModels() {
  const all = await comicDb.getAllModelConfigs();
  all.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  models.value = all;
}

function openCreate() {
  editingId.value = null;
  modalVisible.value = true;
}

function openEdit(model: ModelConfig) {
  editingId.value = model.id;
  modalVisible.value = true;
}

function closeModal() {
  modalVisible.value = false;
  editingId.value = null;
}

async function save(value: ModelEditorValue) {
  const isImage = props.category === 'image';
  const existing = editingModel.value;
  const modelFields = {
    name: value.name,
    ...(isImage ? { apiSource: value.apiSource } : { apiFormat: value.apiFormat }),
    model: value.model,
    baseUrl: value.baseUrl,
    apiKey: value.apiKey,
    ...(isImage ? {
      aspectRatios: value.aspectRatios,
      resolutions: value.resolutions,
      qualities: value.qualities,
    } : {}),
    openaiExtraParams: value.openaiExtraParams,
  };

  if (existing) {
    await comicDb.saveModelConfig({ ...existing, ...modelFields, updatedAt: Date.now() });
  } else {
    const maxOrder = models.value.length ? Math.max(...models.value.map(model => model.sortOrder ?? 0)) : 0;
    const now = Date.now();
    await comicDb.saveModelConfig({
      id: uuidv4(),
      ...modelFields,
      category: props.category,
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    });
  }
  await loadModels();
  closeModal();
}

async function remove(id: string) {
  if (!confirm('确定要删除这个模型吗？')) return;
  await comicDb.deleteModelConfig(id);
  await loadModels();
}

async function duplicate(model: ModelConfig) {
  const maxOrder = models.value.length ? Math.max(...models.value.map(item => item.sortOrder ?? 0)) : 0;
  const now = Date.now();
  await comicDb.saveModelConfig({
    ...model,
    id: uuidv4(),
    name: `${model.name} (副本)`,
    sortOrder: maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  });
  await loadModels();
}

function startDrag(event: DragEvent, modelId: string) {
  draggedModelId.value = modelId;
  if (!event.dataTransfer) return;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', modelId);
}

async function dropOn(event: DragEvent, targetId: string) {
  event.preventDefault();
  const sourceId = draggedModelId.value;
  draggedModelId.value = null;
  if (!sourceId || sourceId === targetId) return;
  const source = models.value.find(model => model.id === sourceId);
  const target = models.value.find(model => model.id === targetId);
  if (!source || !target || source.category !== target.category) return;
  const now = Date.now();
  await comicDb.saveModelConfig({ ...source, sortOrder: target.sortOrder ?? 0, updatedAt: now });
  await comicDb.saveModelConfig({ ...target, sortOrder: source.sortOrder ?? 0, updatedAt: now });
  await loadModels();
}

function formatApiFormat(value?: ApiFormat) {
  return value ? ({ openai: 'OpenAI', gemini: 'Gemini', claude: 'Claude' })[value] : '-';
}

function formatApiSource(value?: ApiSource) {
  return value ? ({ grsai: 'GRSAI', xiguapi: 'Xiguapi', duomi: 'Duomi', openai: 'OpenAI' })[value] : '-';
}

function maskApiKey(key: string) {
  if (!key || key.length <= 8) return '***';
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

function testButtonClass(id: string) {
  if (testLoadingId.value === id) return 'border-cyan-500/30 text-accent bg-cyan-500/10 cursor-wait';
  if (testResults[id]?.success) return 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10';
  if (testResults[id]?.error) return 'border-red-500/30 text-red-400 bg-red-500/10';
  return 'border-border-subtle text-text-secondary hover:border-cyan-500/30 hover:text-accent hover:bg-cyan-500/10';
}

async function testFromCard(model: ModelConfig) {
  testLoadingId.value = model.id;
  testResults[model.id] = null;
  try {
    testResults[model.id] = await llmService.testConnection({
      baseUrl: model.baseUrl,
      apiKey: model.apiKey,
      model: model.model,
    });
  } finally {
    testLoadingId.value = null;
  }
}

defineExpose({ openCreate });
onMounted(loadModels);
</script>

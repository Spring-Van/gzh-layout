<template>
  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
    <article
      v-for="template in templates"
      :key="template.id"
      class="bg-surface border border-border-subtle rounded-lg p-4 hover:bg-elevated hover:border-border-default hover:shadow-lg hover:shadow-cyan-500/5 transition-[background-color,border-color,box-shadow] flex flex-col"
      :class="{ 'opacity-50': draggedId === template.id }"
      draggable="true"
      @dragstart="startDrag($event, template.id)"
      @dragover.prevent
      @drop="dropOn($event, template.id)"
    >
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-2 pr-2 min-w-0">
          <GripVertical class="w-4 h-4 text-text-secondary cursor-grab shrink-0" />
          <h3 class="text-sm font-semibold text-text-primary truncate">{{ template.name }}</h3>
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-accent border border-cyan-500/20 shrink-0">
            {{ typeLabel(template.type) }}
          </span>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <IconButton title="编辑模板" @click="openEdit(template)"><Pencil class="w-3.5 h-3.5" /></IconButton>
          <IconButton title="复制模板" tone="success" @click="duplicate(template)"><Copy class="w-3.5 h-3.5" /></IconButton>
          <IconButton title="删除模板" tone="danger" @click="remove(template.id)"><Trash2 class="w-3.5 h-3.5" /></IconButton>
        </div>
      </div>
      <dl class="flex-1 space-y-2 min-w-0">
        <div v-if="template.description">
          <dt class="text-[11px] text-text-secondary mb-0.5">描述</dt>
          <dd class="text-xs text-text-secondary truncate">{{ template.description }}</dd>
        </div>
        <div>
          <dt class="text-[11px] text-text-secondary mb-0.5">提示词内容</dt>
          <dd class="text-xs text-text-secondary truncate" :title="template.content">{{ template.content }}</dd>
        </div>
      </dl>
    </article>

    <div v-if="templates.length === 0" class="col-span-full text-center text-text-muted text-sm py-12 bg-surface border border-border-subtle rounded-lg">
      暂无提示词模板，点击右上角添加
    </div>
  </div>

  <div
    v-if="modalVisible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    @click.self="closeModal"
  >
    <form class="bg-surface border border-border-subtle rounded-lg w-[560px] max-w-full p-6" @submit.prevent="save">
      <h3 class="text-base font-semibold text-text-primary mb-4">
        {{ editingId ? '编辑' : '添加' }}提示词模板
      </h3>
      <div class="space-y-4">
        <SettingsFieldInput v-model="form.name" label="模板名称" placeholder="例如：角色提取模板" />
        <div>
          <label class="block text-xs text-text-secondary mb-1.5">模板类型</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="option in typeOptions"
              :key="option.value"
              type="button"
              class="px-3 py-2 rounded-lg text-sm border transition-colors"
              :class="form.type === option.value
                ? 'border-cyan-500/50 bg-cyan-500/10 text-accent'
                : 'border-border-subtle bg-input-bg text-text-secondary hover:border-border-default'"
              @click="form.type = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <SettingsFieldInput v-model="form.description" label="模板描述" placeholder="简要描述该模板的用途" />
        <label class="block text-xs text-text-secondary">
          <span class="block mb-1.5">提示词内容</span>
          <textarea
            v-model="form.content"
            rows="7"
            class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 resize-none leading-relaxed"
            placeholder="输入提示词内容"
          />
        </label>
      </div>
      <div class="flex justify-end gap-2 mt-6">
        <button type="button" class="px-4 py-2 text-sm text-text-secondary hover:text-text-primary" @click="closeModal">取消</button>
        <button
          type="submit"
          class="px-4 py-2 rounded-lg bg-accent-gradient text-white text-sm font-medium hover:opacity-90 disabled:opacity-40"
          :disabled="!form.name.trim() || !form.content.trim()"
        >
          {{ editingId ? '保存修改' : '确认添加' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { Copy, GripVertical, Pencil, Trash2 } from 'lucide-vue-next';
import { comicDb } from '@/api/comic';
import type { PromptTemplate, TemplateType } from '@comic/types';
import IconButton from './SettingsIconButton.vue';
import SettingsFieldInput from './SettingsFieldInput.vue';

const templates = ref<PromptTemplate[]>([]);
const modalVisible = ref(false);
const editingId = ref<string | null>(null);
const draggedId = ref<string | null>(null);
const form = reactive({ name: '', type: 'extract' as TemplateType, description: '', content: '' });
const typeOptions: Array<{ value: TemplateType; label: string }> = [
  { value: 'style', label: '风格模板' },
  { value: 'extract', label: '提取模板' },
  { value: 'story', label: '故事模板' },
];

function typeLabel(type: TemplateType): string {
  return ({ style: '风格', extract: '提取', story: '故事' })[type];
}

async function load() {
  const result = await comicDb.getAllPromptTemplates();
  templates.value = result.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

function resetForm() {
  Object.assign(form, { name: '', type: 'extract', description: '', content: '' });
  editingId.value = null;
}

function openCreate() {
  resetForm();
  modalVisible.value = true;
}

function openEdit(template: PromptTemplate) {
  editingId.value = template.id;
  Object.assign(form, {
    name: template.name,
    type: template.type,
    description: template.description,
    content: template.content,
  });
  modalVisible.value = true;
}

function closeModal() {
  modalVisible.value = false;
  resetForm();
}

async function save() {
  if (!form.name.trim() || !form.content.trim()) return;
  const existing = editingId.value ? templates.value.find((item) => item.id === editingId.value) : null;
  const maxOrder = templates.value.length ? Math.max(...templates.value.map((item) => item.sortOrder ?? 0)) : 0;
  const now = Date.now();
  await comicDb.savePromptTemplate({
    id: existing?.id || uuidv4(),
    name: form.name.trim(),
    type: form.type,
    description: form.description.trim(),
    content: form.content,
    sortOrder: existing?.sortOrder ?? maxOrder + 1,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
  await load();
  closeModal();
}

async function duplicate(template: PromptTemplate) {
  const maxOrder = templates.value.length ? Math.max(...templates.value.map((item) => item.sortOrder ?? 0)) : 0;
  const now = Date.now();
  await comicDb.savePromptTemplate({
    ...template,
    id: uuidv4(),
    name: `${template.name} (副本)`,
    sortOrder: maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  });
  await load();
}

async function remove(id: string) {
  if (!confirm('确定要删除这个提示词模板吗？')) return;
  await comicDb.deletePromptTemplate(id);
  await load();
}

function startDrag(event: DragEvent, id: string) {
  draggedId.value = id;
  event.dataTransfer?.setData('text/plain', id);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

async function dropOn(event: DragEvent, targetId: string) {
  event.preventDefault();
  const sourceId = draggedId.value;
  draggedId.value = null;
  if (!sourceId || sourceId === targetId) return;
  const source = templates.value.find((item) => item.id === sourceId);
  const target = templates.value.find((item) => item.id === targetId);
  if (!source || !target) return;
  await Promise.all([
    comicDb.savePromptTemplate({ ...source, sortOrder: target.sortOrder ?? 0, updatedAt: Date.now() }),
    comicDb.savePromptTemplate({ ...target, sortOrder: source.sortOrder ?? 0, updatedAt: Date.now() }),
  ]);
  await load();
}

defineExpose({ openCreate });
onMounted(load);
</script>

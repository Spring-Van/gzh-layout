<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-5" @click.self="close">
      <section class="w-[900px] max-w-full h-[620px] max-h-[90vh] bg-surface border border-border-subtle rounded-lg shadow-2xl flex flex-col overflow-hidden">
        <header class="shrink-0 px-5 py-3 border-b border-border-subtle flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Sparkles class="w-4 h-4 text-purple-400" />
            <h2 class="text-sm font-semibold text-text-primary">AI 改写</h2>
          </div>
          <button class="w-8 h-8 inline-flex items-center justify-center text-text-secondary hover:text-text-primary" title="关闭" @click="close"><X class="w-4 h-4" /></button>
        </header>

        <div class="flex-1 min-h-0 grid grid-cols-2">
          <div class="p-5 border-r border-border-subtle flex flex-col gap-4 min-w-0">
            <label class="text-xs text-text-secondary">
              <span class="block mb-1.5">LLM 模型</span>
              <select v-model="selectedModelId" class="field-control">
                <option value="">请选择模型</option>
                <option v-for="model in llmModels" :key="model.id" :value="model.id">{{ model.name }}</option>
              </select>
            </label>
            <label class="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input v-model="includeExistingContent" type="checkbox" class="w-4 h-4" />
              包含当前内容
            </label>
            <label class="flex-1 min-h-0 text-xs text-text-secondary flex flex-col">
              <span class="block mb-1.5">改写要求</span>
              <textarea v-model="instruction" class="field-control flex-1 resize-none" placeholder="描述需要如何调整内容" />
            </label>
            <button class="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50" :disabled="rewriting || !instruction.trim() || !selectedModelId" @click="rewrite">
              <LoaderCircle v-if="rewriting" class="w-4 h-4 animate-spin" />
              <Send v-else class="w-4 h-4" />
              {{ rewriting ? 'AI 改写中...' : '发送' }}
            </button>
          </div>

          <div class="flex flex-col min-w-0">
            <div class="shrink-0 px-5 py-3 border-b border-border-subtle flex items-center justify-between">
              <span class="text-xs text-text-secondary">{{ editing ? '编辑结果' : '输出结果' }}</span>
              <div v-if="result && !rewriting" class="flex items-center gap-2">
                <button v-if="!editing" class="small-button" @click="startEdit"><Pencil class="w-3 h-3" />编辑</button>
                <template v-else>
                  <button class="small-button text-red-400" @click="cancelEdit">取消</button>
                  <button class="small-button text-emerald-400" @click="saveEdit">保存</button>
                </template>
              </div>
            </div>
            <div class="flex-1 min-h-0 overflow-auto p-5">
              <div v-if="!result && !rewriting" class="h-full flex flex-col items-center justify-center text-text-muted">
                <Sparkles class="w-10 h-10 opacity-30 mb-3" />
                <p class="text-sm">AI 改写结果将在此显示</p>
              </div>
              <textarea v-else-if="editing" v-model="editedResult" class="field-control w-full h-full resize-none font-mono" />
              <pre v-else class="text-sm text-text-primary whitespace-pre-wrap break-words font-sans leading-relaxed">{{ result }}</pre>
            </div>
            <div v-if="result && !rewriting" class="shrink-0 p-4 border-t border-border-subtle">
              <button class="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium inline-flex items-center justify-center gap-2" @click="applyResult"><Check class="w-4 h-4" />确认应用</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Check, LoaderCircle, Pencil, Send, Sparkles, X } from 'lucide-vue-next';
import { llmService } from '@comic/services/llmService';
import { useToast } from '@comic/composables/useToast';
import type { ModelConfig } from '@comic/types';
import type { ComicPage } from './types';

const props = defineProps<{
  modelValue: boolean;
  viewMode: 'json' | 'prompt';
  page: ComicPage | null;
  promptText: string;
  llmModels: ModelConfig[];
}>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  applyPrompt: [value: string];
  applyPage: [value: Record<string, unknown>];
}>();
const toast = useToast();
const instruction = ref('');
const selectedModelId = ref('');
const includeExistingContent = ref(true);
const rewriting = ref(false);
const result = ref('');
const editing = ref(false);
const editedResult = ref('');

watch(() => props.modelValue, visible => {
  if (!visible) reset();
  else if (!selectedModelId.value) selectedModelId.value = props.llmModels[0]?.id || '';
});

function close() { emit('update:modelValue', false); }
function reset() {
  instruction.value = '';
  result.value = '';
  editing.value = false;
  editedResult.value = '';
  rewriting.value = false;
}

async function rewrite() {
  const model = props.llmModels.find(item => item.id === selectedModelId.value);
  if (!model || !instruction.value.trim()) return;
  if (!model.apiKey) {
    toast.error('请先在系统设置中配置该模型的 API Key');
    return;
  }
  rewriting.value = true;
  result.value = '';
  const existing = includeExistingContent.value ? currentContent() : '';
  const systemPrompt = props.viewMode === 'prompt'
    ? '你是专业的漫画提示词改写助手。只返回改写后的提示词，不要添加解释。'
    : '你是专业的漫画 JSON 数据改写助手。只返回有效 JSON，不要添加解释、注释或 markdown 标记。';
  const userMessage = includeExistingContent.value
    ? `原始内容：\n${existing}\n\n改写要求：${instruction.value}`
    : `改写要求：${instruction.value}`;
  try {
    const response = await llmService.call({
      modelConfig: model,
      systemPrompt,
      userMessage,
      onChunk: chunk => { result.value += chunk; },
    });
    if (!response.success) toast.error(response.error || 'AI 改写失败');
  } catch (error) {
    toast.error(`AI 改写失败：${error instanceof Error ? error.message : '未知错误'}`);
  } finally {
    rewriting.value = false;
  }
}

function currentContent() {
  if (props.viewMode === 'prompt') return props.promptText;
  const page = Object.fromEntries(Object.entries(props.page || {}).filter(([key]) => !key.startsWith('_')));
  return JSON.stringify(page, null, 2);
}
function startEdit() { editedResult.value = result.value; editing.value = true; }
function cancelEdit() { editing.value = false; editedResult.value = ''; }
function saveEdit() { result.value = editedResult.value; cancelEdit(); toast.success('已保存编辑'); }

function applyResult() {
  const value = (editing.value ? editedResult.value : result.value).trim();
  if (!value) return;
  if (props.viewMode === 'prompt') emit('applyPrompt', value);
  else {
    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
      for (const [key, field] of Object.entries(props.page || {})) {
        if (key.startsWith('_') && parsed[key] === undefined) parsed[key] = field;
      }
      emit('applyPage', parsed);
    } catch {
      toast.error('AI 返回的内容不是有效的 JSON 对象');
      return;
    }
  }
  toast.success('已应用 AI 改写结果');
  close();
}
</script>

<style scoped>
.field-control { width: 100%; border-radius: .5rem; border: 1px solid var(--border-subtle); background: var(--bg-input); padding: .5rem .75rem; color: var(--text-primary); outline: none; }
.field-control:focus { border-color: rgb(168 85 247 / .5); }
.small-button { display: inline-flex; align-items: center; gap: .25rem; padding: .25rem .5rem; border: 1px solid var(--border-subtle); border-radius: .375rem; color: var(--text-secondary); font-size: .625rem; }
</style>

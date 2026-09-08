<template>
  <div class="flex h-full min-h-0 flex-col">
    <header class="shrink-0 border-b border-border-subtle px-6 pb-3 pt-4">
      <h2 class="truncate text-base font-semibold text-text-primary">
        {{ model ? model.name : `添加${categoryLabel}模型` }}
      </h2>
      <p class="mt-0.5 text-xs text-text-secondary">
        {{ categoryLabel }}模型 · {{ model ? '编辑已保存配置' : '新模型，保存后加入列表' }}
      </p>
    </header>

    <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
      <div class="grid grid-cols-2 gap-3">
        <FieldInput v-model="form.name" label="模型名称" placeholder="例如：GPT-4" />
        <FieldInput v-model="form.model" label="Model" placeholder="例如：gpt-4" />
      </div>

      <label class="block text-xs text-text-secondary">
        <span class="mb-1.5 block">{{ category === 'image' ? 'API 来源' : 'API 格式' }}</span>
        <select v-if="category === 'image'" v-model="form.apiSource" class="field-control">
          <option v-for="option in apiSources" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
        <select v-else v-model="form.apiFormat" class="field-control">
          <option v-for="option in apiFormats" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>

      <FieldInput v-model="form.baseUrl" label="Base URL" placeholder="https://api.openai.com/v1" />

      <div>
        <label class="mb-1.5 block text-xs text-text-secondary">API Key</label>
        <div class="relative">
          <input
            v-model="form.apiKey"
            :type="showApiKey ? 'text' : 'password'"
            autocomplete="off"
            class="w-full rounded-lg border border-border-subtle bg-input-bg px-3 py-2 pr-10 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50"
            placeholder="输入 API Key"
          />
          <button
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary"
            :title="showApiKey ? '隐藏密钥' : '显示密钥'"
            @click="showApiKey = !showApiKey"
          >
            <EyeOff v-if="showApiKey" class="h-4 w-4" />
            <Eye v-else class="h-4 w-4" />
          </button>
        </div>
      </div>

      <template v-if="category === 'image'">
        <div class="grid grid-cols-3 gap-3">
          <FieldInput v-model="form.aspectRatios" label="图片比例" placeholder="1:1, 16:9" />
          <FieldInput v-model="form.resolutions" label="分辨率" placeholder="1K, 2K, 4K" />
          <FieldInput v-model="form.qualities" label="图片质量" placeholder="auto, high" />
        </div>

        <template v-if="form.apiSource === 'openai'">
          <div class="grid grid-cols-3 gap-3">
            <label class="text-xs text-text-secondary">
              <span class="mb-1.5 block">输出格式</span>
              <select v-model="form.openaiOutputFormat" class="field-control">
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
                <option value="webp">WebP</option>
              </select>
            </label>
            <label class="text-xs text-text-secondary">
              <span class="mb-1.5 block">生成数量</span>
              <input v-model.number="form.openaiN" type="number" min="1" max="10" class="field-control" />
            </label>
            <label class="text-xs text-text-secondary">
              <span class="mb-1.5 block">内容审核</span>
              <select v-model="form.openaiModeration" class="field-control">
                <option value="auto">auto</option>
                <option value="low">low</option>
              </select>
            </label>
          </div>
          <label v-if="form.openaiOutputFormat !== 'png'" class="block max-w-[160px] text-xs text-text-secondary">
            <span class="mb-1.5 block">压缩质量 (0-100)</span>
            <input v-model.number="form.openaiOutputCompression" type="number" min="0" max="100" class="field-control" />
          </label>
          <label class="flex items-center gap-2 text-xs text-text-secondary">
            <input v-model="form.openaiCompatibleMode" type="checkbox" class="h-4 w-4 rounded border-border-default bg-input-bg text-accent" />
            兼容模式
          </label>
        </template>
      </template>
    </div>

    <footer class="flex shrink-0 items-center justify-between gap-3 border-t border-border-subtle bg-surface px-6 py-3">
      <div class="flex min-w-0 items-center gap-2">
        <button
          v-if="category === 'llm'"
          type="button"
          class="max-w-[260px] truncate rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
          :class="testButtonClass"
          :disabled="testLoading || !canTest"
          @click="testConnection"
        >
          {{ testButtonText }}
        </button>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <button
          type="button"
          class="rounded-md border border-border-subtle px-3 py-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
          @click="resetForm"
        >
          重置
        </button>
        <button
          type="button"
          class="rounded-md bg-accent-gradient px-4 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
          :disabled="!canSave"
          @click="submit"
        >
          保存
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Eye, EyeOff } from 'lucide-vue-next';
import FieldInput from './SettingsFieldInput.vue';
import { llmService, type TestConnectionResult } from '@comic/services/llmService';
import type { ApiFormat, ApiSource, ModelCategory, ModelConfig } from '@comic/types';

export interface ModelEditorValue {
  name: string;
  apiFormat: ApiFormat;
  apiSource: ApiSource;
  model: string;
  baseUrl: string;
  apiKey: string;
  aspectRatios: string;
  resolutions: string;
  qualities: string;
  openaiExtraParams?: string;
}

const props = defineProps<{
  category: ModelCategory;
  model: ModelConfig | null;
}>();

const emit = defineEmits<{
  save: [value: ModelEditorValue];
  'dirty-change': [dirty: boolean];
  'test-result': [result: TestConnectionResult | null];
}>();

const apiFormats = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'claude', label: 'Claude' },
] as const;
const apiSources = [
  { value: 'grsai', label: 'GRSAI' },
  { value: 'xiguapi', label: 'Xiguapi' },
  { value: 'duomi', label: 'Duomi' },
  { value: 'openai', label: 'OpenAI' },
] as const;

function defaultForm() {
  return {
    name: '', apiFormat: 'openai' as ApiFormat, apiSource: 'grsai' as ApiSource,
    model: '', baseUrl: '', apiKey: '', aspectRatios: '', resolutions: '', qualities: '',
    openaiOutputFormat: 'png' as 'png' | 'jpeg' | 'webp', openaiN: 1,
    openaiModeration: 'auto' as 'auto' | 'low', openaiOutputCompression: 50,
    openaiCompatibleMode: false,
  };
}

const form = ref(defaultForm());
const showApiKey = ref(false);
const testLoading = ref(false);
const testResult = ref<TestConnectionResult | null>(null);

let snapshot = '';

const categoryLabel = computed(() => ({ llm: 'LLM', image: '图片', video: '视频' })[props.category]);
const canSave = computed(() => Boolean(form.value.name.trim() && form.value.model.trim() && form.value.baseUrl.trim()));
const canTest = computed(() => Boolean(form.value.baseUrl && form.value.apiKey && form.value.model));
const testButtonText = computed(() => {
  if (testLoading.value) return '测试中...';
  if (testResult.value?.success) return `连接成功（${testResult.value.duration}ms）`;
  if (testResult.value?.error) return `连接失败：${testResult.value.error}`;
  return '测试连接';
});
const testButtonClass = computed(() => {
  if (testLoading.value) return 'border-cyan-500/30 text-accent bg-cyan-500/10 cursor-wait';
  if (testResult.value?.success) return 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10';
  if (testResult.value?.error) return 'border-red-500/30 text-red-400 bg-red-500/10';
  return 'border-border-subtle text-text-secondary hover:border-cyan-500/30 hover:text-accent';
});

function fillForm() {
  const next = defaultForm();
  if (props.model) {
    let openaiParams: Record<string, unknown> = {};
    try { openaiParams = props.model.openaiExtraParams ? JSON.parse(props.model.openaiExtraParams) : {}; } catch { /* ignore invalid legacy data */ }
    Object.assign(next, {
      name: props.model.name, apiFormat: props.model.apiFormat || 'openai', apiSource: props.model.apiSource || 'grsai',
      model: props.model.model, baseUrl: props.model.baseUrl, apiKey: props.model.apiKey,
      aspectRatios: props.model.aspectRatios || '', resolutions: props.model.resolutions || '', qualities: props.model.qualities || '',
      openaiOutputFormat: openaiParams.outputFormat || 'png', openaiN: openaiParams.n || 1,
      openaiModeration: openaiParams.moderation || 'auto', openaiOutputCompression: openaiParams.outputCompression ?? 50,
      openaiCompatibleMode: openaiParams.compatibleMode || false,
    });
  }
  form.value = next;
  showApiKey.value = false;
  testLoading.value = false;
  testResult.value = null;
  snapshot = JSON.stringify(form.value);
  emit('dirty-change', false);
}

watch(() => props.model, fillForm, { immediate: true });

watch(form, () => {
  emit('dirty-change', JSON.stringify(form.value) !== snapshot);
}, { deep: true });

function resetForm() {
  fillForm();
}

async function testConnection() {
  if (!canTest.value) return;
  testLoading.value = true;
  testResult.value = null;
  try {
    testResult.value = await llmService.testConnection({
      baseUrl: form.value.baseUrl,
      apiKey: form.value.apiKey,
      model: form.value.model,
    });
    emit('test-result', testResult.value);
  } finally {
    testLoading.value = false;
  }
}

function submit() {
  if (!canSave.value) return;
  const openaiExtraParams = form.value.apiSource === 'openai'
    ? JSON.stringify({
        outputFormat: form.value.openaiOutputFormat,
        n: form.value.openaiN,
        moderation: form.value.openaiModeration,
        outputCompression: form.value.openaiOutputFormat === 'png' ? undefined : form.value.openaiOutputCompression,
        compatibleMode: form.value.openaiCompatibleMode,
      })
    : undefined;
  emit('save', { ...form.value, openaiExtraParams });
}
</script>

<style scoped>
.field-control {
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid var(--border-subtle);
  background: var(--bg-input);
  padding: 0.5rem 0.75rem;
  color: var(--text-primary);
  font-size: 0.875rem;
  outline: none;
}

.field-control:focus {
  border-color: rgb(6 182 212 / 0.5);
}
</style>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    @click.self="$emit('close')"
  >
    <form
      class="bg-surface border border-border-subtle rounded-lg w-[520px] max-w-full max-h-[90vh] flex flex-col"
      @submit.prevent="submit"
    >
      <div class="px-6 pt-6 pb-4 border-b border-border-subtle">
        <h3 class="text-base font-semibold text-text-primary">
          {{ model ? '编辑' : '添加' }}{{ categoryLabel }}模型
        </h3>
      </div>

      <div class="px-6 py-5 space-y-4 overflow-y-auto">
        <FieldInput v-model="form.name" label="模型名称" placeholder="例如：GPT-4" />

        <div>
          <label class="block text-xs text-text-secondary mb-1.5">
            {{ category === 'image' ? 'API 来源' : 'API 格式' }}
          </label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="option in category === 'image' ? apiSources : apiFormats"
              :key="option.value"
              type="button"
              class="px-3 py-2 rounded-lg text-sm border transition-colors"
              :class="selectedApiOption === option.value
                ? 'border-cyan-500/50 bg-cyan-500/10 text-accent'
                : 'border-border-subtle bg-input-bg text-text-secondary hover:border-border-default'"
              @click="selectApiOption(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <FieldInput v-model="form.model" label="Model" placeholder="例如：gpt-4" />
        <FieldInput v-model="form.baseUrl" label="Base URL" placeholder="https://api.openai.com/v1" />

        <div>
          <label class="block text-xs text-text-secondary mb-1.5">API Key</label>
          <div class="relative">
            <input
              v-model="form.apiKey"
              :type="showApiKey ? 'text' : 'password'"
              autocomplete="off"
              class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 pr-10 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50"
              placeholder="输入 API Key"
            />
            <button
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary"
              :title="showApiKey ? '隐藏密钥' : '显示密钥'"
              @click="showApiKey = !showApiKey"
            >
              <EyeOff v-if="showApiKey" class="w-4 h-4" />
              <Eye v-else class="w-4 h-4" />
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
                <span class="block mb-1.5">输出格式</span>
                <select v-model="form.openaiOutputFormat" class="field-control">
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                  <option value="webp">WebP</option>
                </select>
              </label>
              <label class="text-xs text-text-secondary">
                <span class="block mb-1.5">生成数量</span>
                <input v-model.number="form.openaiN" type="number" min="1" max="10" class="field-control" />
              </label>
              <label class="text-xs text-text-secondary">
                <span class="block mb-1.5">内容审核</span>
                <select v-model="form.openaiModeration" class="field-control">
                  <option value="auto">auto</option>
                  <option value="low">low</option>
                </select>
              </label>
            </div>
            <label v-if="form.openaiOutputFormat !== 'png'" class="block text-xs text-text-secondary max-w-[160px]">
              <span class="block mb-1.5">压缩质量 (0-100)</span>
              <input v-model.number="form.openaiOutputCompression" type="number" min="0" max="100" class="field-control" />
            </label>
            <label class="flex items-center gap-2 text-xs text-text-secondary">
              <input v-model="form.openaiCompatibleMode" type="checkbox" class="w-4 h-4 rounded border-border-default bg-input-bg text-accent" />
              兼容模式
            </label>
          </template>
        </template>
      </div>

      <div class="px-6 py-4 border-t border-border-subtle flex items-center justify-between gap-3">
        <button
          v-if="category === 'llm'"
          type="button"
          class="px-3 py-2 rounded-lg text-xs font-medium border transition-colors max-w-[250px] truncate"
          :class="testButtonClass"
          :disabled="testLoading || !canTest"
          @click="testConnection"
        >
          {{ testButtonText }}
        </button>
        <span v-else />
        <div class="flex items-center gap-2">
          <button type="button" class="px-4 py-2 text-sm text-text-secondary hover:text-text-primary" @click="$emit('close')">
            取消
          </button>
          <button
            type="submit"
            class="px-4 py-2 rounded-lg bg-accent-gradient text-white text-sm font-medium hover:opacity-90 disabled:opacity-40"
            :disabled="!canSave"
          >
            {{ model ? '保存修改' : '确认添加' }}
          </button>
        </div>
      </div>
    </form>
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
  visible: boolean;
  category: ModelCategory;
  model: ModelConfig | null;
}>();
const emit = defineEmits<{ close: []; save: [value: ModelEditorValue] }>();

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

const categoryLabel = computed(() => ({ llm: 'LLM', image: '图片', video: '视频' })[props.category]);
const selectedApiOption = computed(() => props.category === 'image' ? form.value.apiSource : form.value.apiFormat);
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

watch(() => [props.visible, props.model] as const, ([visible, model]) => {
  if (!visible) return;
  const next = defaultForm();
  if (model) {
    let openaiParams: Record<string, unknown> = {};
    try { openaiParams = model.openaiExtraParams ? JSON.parse(model.openaiExtraParams) : {}; } catch { /* ignore invalid legacy data */ }
    Object.assign(next, {
      name: model.name, apiFormat: model.apiFormat || 'openai', apiSource: model.apiSource || 'grsai',
      model: model.model, baseUrl: model.baseUrl, apiKey: model.apiKey,
      aspectRatios: model.aspectRatios || '', resolutions: model.resolutions || '', qualities: model.qualities || '',
      openaiOutputFormat: openaiParams.outputFormat || 'png', openaiN: openaiParams.n || 1,
      openaiModeration: openaiParams.moderation || 'auto', openaiOutputCompression: openaiParams.outputCompression ?? 50,
      openaiCompatibleMode: openaiParams.compatibleMode || false,
    });
  }
  form.value = next;
  showApiKey.value = false;
  testLoading.value = false;
  testResult.value = null;
}, { immediate: true });

function selectApiOption(value: ApiFormat | ApiSource) {
  if (props.category === 'image') form.value.apiSource = value as ApiSource;
  else form.value.apiFormat = value as ApiFormat;
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
</style>

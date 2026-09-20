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

      <label v-if="category === 'image'" class="block text-xs text-text-secondary">
        <span class="mb-1.5 block">API 来源</span>
        <select v-model="form.apiSource" class="field-control">
          <option v-for="option in apiSources" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
      <div v-else class="block text-xs text-text-secondary">
        <span class="mb-1.5 block">API 格式</span>
        <div class="field-control field-static">OpenAI 兼容 · /chat/completions</div>
      </div>

      <FieldInput
        v-model="form.baseUrl"
        label="Base URL"
        :placeholder="form.apiSource === 'agnes' ? 'https://apihub.agnes-ai.com' : 'https://api.openai.com/v1'"
        :hint="form.apiSource === 'agnes'
          ? 'Agnes 默认地址：https://apihub.agnes-ai.com；程序自动拼接 /v1/images/generations'
          : '填到版本段为止即可（如 https://xxx/v1），接口路径由程序自动拼接'"
      />

      <label v-if="category === 'llm'" class="flex items-start gap-2 text-xs text-text-secondary">
        <input
          v-model="form.bypassProxy"
          type="checkbox"
          class="mt-0.5 h-4 w-4 shrink-0 rounded border-border-default bg-input-bg text-accent"
        />
        <span class="min-w-0">
          绕过系统代理（直连）
          <span class="mt-0.5 block text-[11px] leading-snug text-text-muted">
            不勾选时代理失败会自动改用直连重试一次；若该地址经代理始终连不上（报 ERR_CONNECTION_CLOSED），勾上它可省掉每次约 10 秒的超时等待
          </span>
        </span>
      </label>

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

      <div v-if="category === 'llm'" class="rounded-lg border border-border-subtle bg-input-bg p-3">
        <div class="flex items-center justify-between gap-3">
          <label for="llm-test-prompt" class="shrink-0 text-xs text-text-secondary">测试内容</label>
          <span class="min-w-0 truncate text-[11px] text-text-muted" :title="channelLabel">{{ channelLabel }}</span>
        </div>
        <textarea
          id="llm-test-prompt"
          v-model="testPrompt"
          rows="2"
          class="mt-1.5 w-full resize-none rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm leading-snug text-text-primary placeholder-text-muted focus:border-cyan-500/50 focus:outline-none"
          placeholder="填写测试时发送给模型的内容"
        />
        <div class="mt-2 flex items-center justify-between gap-3">
          <span class="text-[11px] leading-snug text-text-muted">仅用于本次测试，不随模型保存</span>
          <button
            type="button"
            class="shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
            :class="testButtonClass"
            :disabled="testLoading || !canTest"
            @click="testConnection"
          >
            {{ testLoading ? '测试中…' : '测试连接' }}
          </button>
        </div>

        <div
          v-if="testResult"
          ref="resultRef"
          class="mt-2.5 rounded-md border p-2.5"
          :class="resultPanelClass"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex min-w-0 items-center gap-1.5 text-xs font-medium" :class="resultTitleClass">
              <CheckCircle2 v-if="testResult.success" class="h-3.5 w-3.5 shrink-0" />
              <XCircle v-else class="h-3.5 w-3.5 shrink-0" />
              <span class="truncate">{{ resultTitle }}</span>
            </div>
            <button
              type="button"
              class="flex shrink-0 items-center gap-1 rounded border border-black/10 px-1.5 py-0.5 text-[11px] text-text-secondary transition-colors hover:text-text-primary dark:border-white/15"
              title="复制完整结果（含模型 / 地址 / 通道 / 耗时）"
              @click="copyResult"
            >
              <Check v-if="copied" class="h-3 w-3" />
              <Copy v-else class="h-3 w-3" />
              {{ copied ? '已复制' : '复制' }}
            </button>
          </div>

          <!-- 失败：完整换行展示，不截断、可选中复制 -->
          <p
            v-if="testResult.error"
            class="mt-2 select-text whitespace-pre-wrap break-words text-xs leading-relaxed text-text-primary"
          >
            {{ testResult.error }}
          </p>

          <!-- 成功：回显模型回复 -->
          <template v-else>
            <p
              v-if="testResult.content"
              class="mt-2 select-text whitespace-pre-wrap break-words text-xs leading-relaxed text-text-secondary"
            >
              {{ testResult.content }}
            </p>
            <div v-if="testResult.reasoning" class="mt-2">
              <p class="text-[11px] text-text-muted">
                思维链{{ testResult.content ? '' : '（正文为空，以下为思考过程）' }}
              </p>
              <p class="mt-1 select-text whitespace-pre-wrap break-words text-[11px] leading-relaxed text-text-muted">
                {{ testResult.reasoning }}
              </p>
            </div>
          </template>

          <div
            class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-black/5 pt-2 text-[11px] text-text-muted dark:border-white/10"
          >
            <span v-if="testResult.duration !== undefined">耗时 {{ testResult.duration }}ms</span>
            <span v-if="testResult.finishReason">finish_reason: {{ testResult.finishReason }}</span>
            <span v-if="testResult.bypassProxy !== undefined">
              代理 {{ testResult.bypassProxy ? '绕过（直连）' : '跟随系统' }}
            </span>
            <span v-if="testResult.url" class="max-w-full truncate" :title="testResult.url">
              地址 {{ testResult.url }}
            </span>
          </div>
        </div>
      </div>

      <template v-if="category === 'image'">
        <div class="grid grid-cols-3 gap-3">
          <FieldInput v-model="form.aspectRatios" label="图片比例" placeholder="1:1, 16:9" />
          <FieldInput v-model="form.resolutions" label="分辨率" placeholder="1K, 2K, 4K" />
          <FieldInput v-if="form.apiSource !== 'agnes'" v-model="form.qualities" label="图片质量" placeholder="auto, high" />
          <label v-else class="text-xs text-text-secondary">
            <span class="mb-1.5 block">返回格式</span>
            <select v-model="form.agnesResponseFormat" class="field-control">
              <option value="url">URL（推荐）</option>
              <option value="b64_json">Base64</option>
            </select>
          </label>
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

    <footer class="flex shrink-0 items-center justify-end gap-2 border-t border-border-subtle bg-surface px-6 py-3">
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
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { Check, CheckCircle2, Copy, Eye, EyeOff, XCircle } from 'lucide-vue-next';
import FieldInput from './SettingsFieldInput.vue';
import { DEFAULT_TEST_PROMPT, llmService, type TestConnectionResult } from '@comic/services/llmService';
import { getTransportChannel } from '@comic/services/httpTransport';
import type { ApiFormat, ApiSource, ModelCategory, ModelConfig } from '@comic/types';

export interface ModelEditorValue {
  name: string;
  apiFormat: ApiFormat;
  apiSource: ApiSource;
  model: string;
  baseUrl: string;
  apiKey: string;
  /** 绕过系统代理直连（仅 LLM 使用） */
  bypassProxy: boolean;
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

const apiSources = [
  { value: 'grsai', label: 'GRSAI' },
  { value: 'duomi', label: 'Duomi' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'agnes', label: 'Agnes' },
] as const;

function defaultForm() {
  return {
    name: '', apiFormat: 'openai' as ApiFormat, apiSource: 'grsai' as ApiSource,
    model: '', baseUrl: '', apiKey: '', bypassProxy: false,
    aspectRatios: '', resolutions: '', qualities: '',
    openaiOutputFormat: 'png' as 'png' | 'jpeg' | 'webp', openaiN: 1,
    openaiModeration: 'auto' as 'auto' | 'low', openaiOutputCompression: 50,
    openaiCompatibleMode: false,
    agnesResponseFormat: 'url' as 'url' | 'b64_json',
  };
}

const form = ref(defaultForm());
const showApiKey = ref(false);
const testLoading = ref(false);
const testResult = ref<TestConnectionResult | null>(null);
const testPrompt = ref(DEFAULT_TEST_PROMPT);
const resultRef = ref<HTMLElement | null>(null);
const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;

let snapshot = '';

const categoryLabel = computed(() => ({ llm: 'LLM', image: '图片', video: '视频' })[props.category]);
const canSave = computed(() => Boolean(form.value.name.trim() && form.value.model.trim() && form.value.baseUrl.trim()));
const canTest = computed(() => Boolean(form.value.baseUrl && form.value.apiKey && form.value.model));

/** 请求实际通道：一眼看出主进程转发是否生效（历史踩坑：桥接路径写错会静默回退） */
const channelLabel = computed(() =>
  getTransportChannel() === 'electron-main' ? '通道：主进程转发' : '通道：渲染进程直连',
);
const resultTitle = computed(() => {
  if (!testResult.value) return '';
  return testResult.value.success ? `连接成功 · ${testResult.value.duration ?? '-'}ms` : '连接失败';
});
const testButtonClass = computed(() => {
  if (testLoading.value) return 'border-cyan-500/30 text-accent bg-cyan-500/10 cursor-wait';
  if (testResult.value?.success) return 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10';
  if (testResult.value?.error) return 'border-red-500/40 text-red-700 dark:text-red-300 bg-red-500/10';
  return 'border-border-subtle text-text-secondary hover:border-cyan-500/30 hover:text-accent';
});
// 状态色只加在标题上：若挂在面板容器上，会盖掉元信息行的 text-muted（同为 color 工具类，靠样式表顺序决胜）
const resultPanelClass = computed(() =>
  testResult.value?.success ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-red-500/40 bg-red-500/10',
);
// 浅色底用 700、暗色底用 300，两个主题下都保证可读
const resultTitleClass = computed(() =>
  testResult.value?.success ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300',
);

function fillForm() {
  const next = defaultForm();
  if (props.model) {
    let openaiParams: Record<string, unknown> = {};
    try { openaiParams = props.model.openaiExtraParams ? JSON.parse(props.model.openaiExtraParams) : {}; } catch { /* ignore invalid legacy data */ }
    Object.assign(next, {
      // 旧数据里可能存着 gemini / claude —— 它们从未被任何代码消费，统一归一为 openai，
      // 避免界面显示「OpenAI 兼容」而库里却存着别的值
      name: props.model.name,
      apiFormat: 'openai',
      // 旧配置中若保存了已不存在的来源，打开时统一迁移到默认 GRSAI。
      apiSource: apiSources.some((option) => option.value === props.model?.apiSource) ? props.model.apiSource! : 'grsai',
      model: props.model.model, baseUrl: props.model.baseUrl, apiKey: props.model.apiKey,
      bypassProxy: Boolean(props.model.bypassProxy),
      aspectRatios: props.model.aspectRatios || '', resolutions: props.model.resolutions || '', qualities: props.model.qualities || '',
      openaiOutputFormat: openaiParams.outputFormat || 'png', openaiN: openaiParams.n || 1,
      openaiModeration: openaiParams.moderation || 'auto', openaiOutputCompression: openaiParams.outputCompression ?? 50,
      openaiCompatibleMode: openaiParams.compatibleMode || false,
      agnesResponseFormat: openaiParams.responseFormat === 'b64_json' ? 'b64_json' : 'url',
    });
  }
  form.value = next;
  showApiKey.value = false;
  testLoading.value = false;
  testResult.value = null;
  // 切换模型时清掉上一条结果（结果属于上一个模型），但**保留用户填写的测试内容**
  copied.value = false;
  snapshot = JSON.stringify(form.value);
  emit('dirty-change', false);
}

watch(() => props.model, fillForm, { immediate: true });

watch(form, () => {
  emit('dirty-change', JSON.stringify(form.value) !== snapshot);
}, { deep: true });

// Agnes 文档中的默认值直接填入，用户仍可按需覆盖比例、分辨率和地址。
watch(() => form.value.apiSource, (source, previous) => {
  if (source !== 'agnes' || source === previous) return;
  if (!form.value.model.trim()) form.value.model = 'agnes-image-2.5-flash';
  if (!form.value.baseUrl.trim()) form.value.baseUrl = 'https://apihub.agnes-ai.com';
  if (!form.value.aspectRatios.trim()) form.value.aspectRatios = '1:1, 3:4, 4:3, 16:9, 9:16, 2:3, 3:2, 21:9';
  if (!form.value.resolutions.trim()) form.value.resolutions = '1K, 2K, 3K, 4K';
}, { flush: 'sync' });

function resetForm() {
  fillForm();
}

async function testConnection() {
  if (!canTest.value) return;
  testLoading.value = true;
  testResult.value = null;
  copied.value = false;
  try {
    const result = await llmService.testConnection(
      {
        baseUrl: form.value.baseUrl,
        apiKey: form.value.apiKey,
        model: form.value.model,
        bypassProxy: form.value.bypassProxy,
      },
      { prompt: testPrompt.value },
    );
    testResult.value = result;
    emit('test-result', result);
    // 结果面板在表单底部，长表单下可能超出视口，滚到可见位置
    await nextTick();
    resultRef.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  } finally {
    testLoading.value = false;
  }
}

/** 组装可整段粘贴到工单/群里的自诊断文本 */
function buildResultText(result: TestConnectionResult): string {
  const lines = [
    result.success ? `✅ 连接成功（${result.duration ?? '-'}ms）` : '❌ 连接失败',
    `模型：${form.value.model || '(未填)'}`,
    `地址：${result.url || form.value.baseUrl || '(未填)'}`,
    '格式：OpenAI 兼容 · /chat/completions',
  ];
  if (result.channel) {
    lines.push(`通道：${result.channel === 'electron-main' ? '主进程转发' : '渲染进程直连'}`);
  }
  if (result.bypassProxy !== undefined) {
    lines.push(`代理：${result.bypassProxy ? '绕过系统代理（直连）' : '跟随系统代理'}`);
  }
  if (result.finishReason) lines.push(`finish_reason：${result.finishReason}`);
  lines.push(`测试内容：${testPrompt.value.trim() || '(空)'}`, '');
  if (result.error) {
    lines.push(`错误信息：${result.error}`);
  } else {
    lines.push(`模型回复：${result.content || '(空)'}`);
    if (result.reasoning) lines.push(`思维链：${result.reasoning}`);
  }
  return lines.join('\n');
}

/**
 * 复制文本。优先 Clipboard API；在非安全上下文等场景降级到 execCommand，
 * 避免「点了复制没反应」。
 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 落到下面的降级实现
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

async function copyResult() {
  if (!testResult.value) return;
  const ok = await copyText(buildResultText(testResult.value));
  copied.value = ok;
  if (copiedTimer) clearTimeout(copiedTimer);
  if (ok) {
    copiedTimer = setTimeout(() => {
      copied.value = false;
    }, 1600);
  }
}

onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer);
});

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
    : form.value.apiSource === 'agnes'
      ? JSON.stringify({ responseFormat: form.value.agnesResponseFormat })
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

/* 只读展示项：复用输入框外观，但用次要色表明不可编辑 */
.field-static {
  color: var(--text-secondary);
  cursor: default;
}
</style>

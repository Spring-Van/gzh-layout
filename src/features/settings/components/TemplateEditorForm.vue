<template>
  <div class="flex h-full min-h-0 flex-col">
    <header class="shrink-0 border-b border-border-subtle px-6 pb-3 pt-4">
      <h2 class="truncate text-base font-semibold text-text-primary">
        {{ template ? template.name : '添加提示词模板' }}
      </h2>
      <p class="mt-0.5 text-xs text-text-secondary">
        提示词模板 · {{ template ? '编辑已保存配置' : '新模板，保存后加入列表' }}
      </p>
    </header>

    <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
      <div class="grid grid-cols-2 gap-3">
        <SettingsFieldInput v-model="form.name" label="模板名称" placeholder="例如：角色提取模板" />
        <label class="block text-xs text-text-secondary">
          <span class="mb-1.5 block">模板类型</span>
          <select v-model="form.type" class="field-control">
            <option v-for="option in typeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
      </div>

      <p class="rounded-md border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs leading-relaxed text-text-secondary">
        {{ typeHint }}
      </p>

      <!-- 变量状态：当前类型全部可用变量；已插入高亮、未插入灰显、不适配红色警告；点击插入到光标处 -->
      <div v-if="variableSpecs.length || unknownVariables.length" class="shrink-0 text-xs text-text-secondary">
        <span class="mb-1.5 flex items-center justify-between gap-3">
          <span>变量状态</span>
          <span class="text-[11px] text-text-muted">点击 tag 插入到光标处；未插入的变量不会进入提示词</span>
        </span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="spec in variableSpecs"
            :key="spec.name"
            type="button"
            class="rounded border px-2.5 py-0.5 font-mono text-[11px] transition-colors"
            :class="usedVariableNames.has(spec.name)
              ? 'border-cyan-500/50 bg-cyan-500/10 font-medium text-cyan-700'
              : 'border-border-subtle text-text-secondary hover:text-text-primary'"
            :title="spec.desc"
            @click="insertVariable(spec.name)"
          >{{ variableTag(spec.name) }}</button>
          <span
            v-for="name in unknownVariables"
            :key="name"
            class="cursor-not-allowed rounded border border-red-500/50 bg-red-500/10 px-2.5 py-0.5 font-mono text-[11px] text-red-600"
            :title="`「${variableTag(name)}」不适配当前模板类型，构建提示词时将被清理，不会生效`"
          >{{ variableTag(name) }}</span>
        </div>
        <p v-if="unknownVariables.length" class="mt-1.5 text-[11px] leading-4 text-red-500/90">
          红色 tag 为不适配当前类型的变量，构建提示词时将被清理。
        </p>
      </div>

      <label class="flex min-h-[176px] flex-1 flex-col text-xs text-text-secondary">
        <span class="mb-1.5 flex shrink-0 items-center justify-between gap-3">
          <span>提示词内容</span>
          <button v-if="recommendedTemplate" type="button" class="text-cyan-400 hover:text-cyan-300" @click="applyRecommendedTemplate">填入推荐模板</button>
        </span>
        <textarea
          ref="contentTextarea"
          v-model="form.content"
          class="min-h-[120px] w-full flex-1 resize-none rounded-lg border border-border-subtle bg-input-bg px-3 py-2 text-sm leading-relaxed text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50"
          :placeholder="contentPlaceholder"
        />
      </label>

      <!-- 结果会被程序解析的环节：底部一行提示，避免用户改掉内容里的格式约定后无从察觉 -->
      <p v-if="parseHint" class="shrink-0 text-[11px] leading-4 text-amber-700 dark:text-amber-300">
        {{ parseHint }}
      </p>
    </div>

    <footer class="flex shrink-0 items-center justify-between gap-3 border-t border-border-subtle bg-surface px-6 py-3">
      <div class="min-w-0" />
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
import { computed, nextTick, ref, watch } from 'vue';
import {
  RECOMMENDED_TEMPLATES,
  findUnknownVariables,
  getTemplateVariables,
  normalizeTemplateVariables,
} from '@comic/services/promptTemplateRegistry';
import type { PromptTemplate, TemplateType } from '@comic/types';
import SettingsFieldInput from './SettingsFieldInput.vue';

export interface TemplateEditorValue {
  name: string;
  type: TemplateType;
  description: string;
  /** 提示词内容，也是唯一的提示词来源（返回格式约定直接写在这里） */
  content: string;
}

const props = defineProps<{
  template: PromptTemplate | null;
}>();

const emit = defineEmits<{
  save: [value: TemplateEditorValue];
  'dirty-change': [dirty: boolean];
}>();

const typeOptions: Array<{ value: TemplateType; label: string; hint: string }> = [
  { value: 'style', label: '风格模板', hint: '定义画风与视觉风格描述，生图时作为风格上下文注入。' },
  { value: 'extract', label: '资产提取模板', hint: '从章节原文中提取人物、场景、道具等可复用资产。' },
  { value: 'analysis', label: '原文分析模板', hint: '通读章节原文，结构化输出人物、事件、时间线等分析结果。' },
  { value: 'script', label: '漫画剧本模板', hint: '基于章节原文与分析结果，改编为漫画剧本。' },
  { value: 'story', label: '故事模板', hint: '用于短篇故事的创作与改编。' },
  { value: 'storyboard', label: '分镜模板', hint: '将章节拆分为可绘制的分镜序列。' },
  { value: 'asset-prompt', label: '资产绘画提示词模板', hint: '为资产视觉状态批量生成可直接生图的绘画提示词。' },
  { value: 'panel-prompt', label: '分镜画面描述模板', hint: '逐镜生成可直接生图的画面描述（一次只写一镜）。' },
  { value: 'panel-prompt-chapter', label: '分镜画面描述模板（整章一次生成）', hint: '一次把本章全部分镜交给模型，按 ## 分镜 N 分段输出各镜画面描述。' },
];

const typeHint = computed(() => typeOptions.find(option => option.value === form.value.type)?.hint ?? '');

const contentPlaceholder = '输入提示词内容，可用 {{变量}} 占位';

const form = ref({
  name: '',
  type: 'extract' as TemplateType,
  description: '',
  content: '',
});

let snapshot = '';

const canSave = computed(() => Boolean(form.value.name.trim() && form.value.content.trim()));

// ========== 变量状态 ==========

/** 当前类型的可用变量定义（style/story 等类型为空数组）。 */
const variableSpecs = computed(() => getTemplateVariables(form.value.type));

/** 归一化后的内容（旧英文占位符视为对应中文变量，保证存量模板也能正确高亮）。 */
const normalizedContent = computed(() => normalizeTemplateVariables(form.value.content, form.value.type));

/** 已插入模板的变量名集合（高亮判定）。 */
const usedVariableNames = computed(() => {
  const used = new Set<string>();
  for (const spec of variableSpecs.value) {
    if (normalizedContent.value.includes(`{{${spec.name}}}`)) used.add(spec.name);
  }
  return used;
});

/** 不适配当前类型的占位符（红色警告，构建时会被清理）。 */
const unknownVariables = computed(() => findUnknownVariables(normalizedContent.value, form.value.type));

const contentTextarea = ref<HTMLTextAreaElement>();

/** 变量 tag 显示文本（模板插值里不能写字面 {{ }}，统一由此函数生成）。 */
function variableTag(name: string) {
  return `{{${name}}}`;
}

/** 点击 tag：把变量插入到提示词内容的光标处（无选区时插入在光标位置）。 */
function insertVariable(name: string) {
  const snippet = `{{${name}}}`;
  const el = contentTextarea.value;
  if (!el) {
    form.value.content += snippet;
    return;
  }
  const start = el.selectionStart ?? form.value.content.length;
  const end = el.selectionEnd ?? start;
  form.value.content = form.value.content.slice(0, start) + snippet + form.value.content.slice(end);
  void nextTick(() => {
    el.focus();
    el.setSelectionRange(start + snippet.length, start + snippet.length);
  });
}

// ========== 解析提示 / 推荐模板 ==========

/**
 * 结果会被程序解析的环节：底部只提示一行。
 * 返回格式约定已写进模板内容（推荐模板自带），用户改动内容就可能改坏解析，所以必须提醒。
 */
const PARSE_HINTS: Partial<Record<TemplateType, string>> = {
  storyboard: '本环节结果按 Markdown 解析，请保留上面的输出结构。',
  extract: '本环节结果按 Markdown 解析，请保留上面的输出结构。',
  'asset-prompt': '本环节结果按 Markdown 解析，请保留上面的输出结构。',
  'panel-prompt-chapter': '本环节结果按「## 分镜 N」分段解析，请保留上面的分段格式。',
  story: '本环节结果按 JSON 解析，请保留上面的 JSON 结构。',
};

const parseHint = computed(() => PARSE_HINTS[form.value.type] ?? '');

/** 当前类型的推荐模板（含默认名称/描述，一键填入）。 */
const recommendedTemplate = computed(() => RECOMMENDED_TEMPLATES[form.value.type]);

function applyRecommendedTemplate() {
  const recommended = recommendedTemplate.value;
  if (!recommended) return;
  form.value.name = form.value.name.trim() || recommended.name;
  form.value.description = form.value.description.trim() || recommended.description;
  form.value.content = recommended.content;
}

function fillForm() {
  const next = {
    name: props.template?.name ?? '',
    type: props.template?.type ?? ('extract' as TemplateType),
    description: props.template?.description ?? '',
    content: props.template?.content ?? '',
  };
  form.value = next;
  snapshot = JSON.stringify(form.value);
  emit('dirty-change', false);
}

watch(() => props.template, fillForm, { immediate: true });

watch(form, () => {
  emit('dirty-change', JSON.stringify(form.value) !== snapshot);
}, { deep: true });

function resetForm() {
  fillForm();
}

function submit() {
  if (!canSave.value) return;
  emit('save', { ...form.value });
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

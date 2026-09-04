<template>
  <div class="flex min-h-0 flex-1 gap-4 p-6">
    <!-- 左列：章节原文只读 -->
    <section class="custom-scrollbar min-h-0 w-1/2 overflow-y-auto rounded-lg border border-border-subtle bg-surface p-5">
      <div class="mb-3 flex items-center gap-2">
        <FileText :size="15" class="shrink-0 text-cyan-400" />
        <h2 class="text-sm font-semibold text-text-primary">章节原文</h2>
        <span class="text-xs text-text-muted">{{ wordCount(sourceContent) }} 字</span>
      </div>
      <p class="whitespace-pre-wrap text-sm leading-7 text-text-primary">{{ sourceContent || "（本章暂无正文）" }}</p>
    </section>

    <!-- 右列：漫画剧本（预览 ⇋ 编辑） -->
    <section class="flex min-h-0 w-1/2 flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface">
      <div class="flex shrink-0 items-center justify-between gap-3 border-b border-border-subtle px-4 py-2.5">
        <div class="flex min-w-0 items-center gap-2">
          <ScrollText :size="15" class="shrink-0 text-cyan-400" />
          <h2 class="text-sm font-semibold text-text-primary">漫画剧本</h2>
          <span v-if="sourceChanged" class="shrink-0 rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-300" title="剧本生成后原文发生过修改，建议重新生成">原文已变更</span>
        </div>
        <button v-if="scriptDoc?.status === 'completed'" class="secondary-button h-7 px-2 text-[11px]" @click="toggleEditing">
          <Pencil v-if="!editing" :size="12" />{{ editing ? "完成编辑" : "编辑" }}
        </button>
      </div>

      <!-- 分析缺失提示：剧本仍可生成，但仅基于原文 -->
      <div v-if="!analysisContent.trim()" class="flex shrink-0 items-center gap-2 border-b border-amber-400/25 bg-amber-400/10 px-4 py-2 text-xs text-amber-300">
        <TriangleAlert :size="14" class="shrink-0" />
        <span>本章尚未生成原文分析，将仅基于原文生成剧本。建议先在「原文」页签完成分析。</span>
      </div>

      <!-- 生成中 -->
      <div v-if="scriptDoc?.status === 'running'" class="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center">
        <div class="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/10">
          <span class="absolute inset-0 rounded-lg border border-cyan-400/40 doc-ring" />
          <LoaderCircle :size="22" class="animate-spin text-cyan-400" />
        </div>
        <h3 class="text-sm font-medium text-text-primary">正在生成剧本</h3>
        <p class="mt-2 text-xs text-text-secondary">正在结合原文与原文分析，按场景改编漫画剧本。</p>
        <div class="mt-4 flex items-center gap-1.5 text-xs text-text-muted"><span class="loading-dot" /><span class="loading-dot" /><span class="loading-dot" /><span class="ml-1">大模型生成中</span></div>
      </div>

      <!-- 编辑模式 -->
      <textarea
        v-else-if="editing"
        v-model="scriptDraft"
        class="custom-scrollbar min-h-0 flex-1 resize-none bg-transparent p-5 font-mono text-xs leading-6 text-text-primary outline-none"
        aria-label="编辑漫画剧本"
        @blur="commitScriptDraft"
      />

      <!-- 失败 -->
      <div v-else-if="scriptDoc?.status === 'failed'" class="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center">
        <ScrollText :size="26" class="text-red-400" />
        <h3 class="mt-3 text-sm font-medium text-text-primary">剧本生成失败</h3>
        <p class="mt-2 max-w-md text-xs leading-5 text-text-secondary">{{ scriptDoc.error || "请求未能完成，请检查模型配置与提示词后重试。" }}</p>
      </div>

      <!-- 预览 / 空态 -->
      <div v-else class="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
        <MarkdownView v-if="scriptDoc?.content" :content="scriptDoc.content" empty-text="尚无剧本" />
        <div v-else class="flex h-full flex-col items-center justify-center text-center">
          <ScrollText :size="26" class="text-text-muted" />
          <h3 class="mt-3 text-sm font-medium text-text-primary">尚未生成剧本</h3>
          <p class="mt-2 max-w-sm text-xs leading-5 text-text-secondary">基于章节原文与原文分析，把这一章改编成按场景组织的漫画剧本（剧情、人物、动作、情绪、对白、剧情目的），供分镜生成使用。</p>
        </div>
      </div>

      <!-- 执行底栏：生成剧本 + 进入分镜生图（窄宽度时按钮折行右对齐） -->
      <div class="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-t border-border-subtle px-4 py-3">
        <div class="min-w-0 flex-1 basis-64">
          <PromptRunBar
            v-model:model-id="modelId"
            v-model:template-id="templateId"
            :models="models"
            :templates="templates"
            :action-label="scriptDoc ? '重新生成' : '生成剧本'"
            :disabled="!sourceContent.trim() || !modelId || !templateId"
            :busy="scriptDoc?.status === 'running'"
            confirm-storage-key="comic-long-script-confirm"
            :build-prompt="buildPrompt"
            @run="(prompt) => emit('run', prompt)"
          />
        </div>
        <button class="primary-button ms-auto shrink-0 px-4" title="进入分镜页签（无剧本时将以原文兜底生成）" @click="emit('open-panel-gen')">进入分镜<ArrowRight :size="15" /></button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * 长篇章节「剧本」页签：左列只读章节原文，右列为 AI 漫画剧本（Markdown 预览 ⇋ 编辑）。
 * 剧本 = 原文 + 原文分析 + 剧本规则；分析缺失时黄条提示并以原文兜底。
 * 底部提供「进入分镜」入口（切换到主页面分镜页签）。
 */
import { computed, ref, watch } from "vue";
import { ArrowRight, FileText, LoaderCircle, Pencil, ScrollText, TriangleAlert } from "lucide-vue-next";
import MarkdownView from "@comic/components/common/MarkdownView.vue";
import PromptRunBar from "@comic/components/common/PromptRunBar.vue";
import { buildScriptPrompt } from "@comic/services/chapterDocService";
import type { LongProjectChapterDoc, ModelConfig, PromptTemplate } from "@comic/types";

const props = defineProps<{
  /** 章节原文（只读展示） */
  sourceContent: string;
  /** 原文分析内容（可能为空，为空时黄条提示） */
  analysisContent: string;
  /** 本章漫画剧本文档（可能不存在） */
  scriptDoc?: LongProjectChapterDoc;
  /** 剧本生成后原文是否已变更 */
  sourceChanged: boolean;
  models: ModelConfig[];
  /** 已按 type=script 过滤的模板列表 */
  templates: PromptTemplate[];
  modelId: string;
  templateId: string;
}>();

const emit = defineEmits<{
  (e: "update:modelId", value: string): void;
  (e: "update:templateId", value: string): void;
  (e: "run", prompt: string): void;
  (e: "save-script", content: string): void;
  (e: "open-panel-gen"): void;
}>();

const modelId = computed({ get: () => props.modelId, set: (value: string) => emit("update:modelId", value) });
const templateId = computed({ get: () => props.templateId, set: (value: string) => emit("update:templateId", value) });

/** 字数统计（去空白字符）。 */
function wordCount(content: string) { return content.replace(/\s/g, "").length; }

// ========== 右列剧本编辑（预览 ⇋ 编辑，失焦回传保存） ==========
const editing = ref(false);
const scriptDraft = ref("");

watch(() => props.scriptDoc?.content, () => { scriptDraft.value = props.scriptDoc?.content ?? ""; }, { immediate: true });

/** 切换编辑/预览；退出编辑时保存。 */
function toggleEditing() {
  if (editing.value) commitScriptDraft();
  editing.value = !editing.value;
}

/** 提交编辑内容（失焦或退出编辑时回传父级持久化）。 */
function commitScriptDraft() {
  if (!props.scriptDoc) return;
  if (scriptDraft.value !== props.scriptDoc.content) emit("save-script", scriptDraft.value);
}

/** 生成最终发送提示词（模板 + 章节原文 + 原文分析）。 */
function buildPrompt(): string {
  const template = props.templates.find((item) => item.id === props.templateId);
  return buildScriptPrompt(template?.content ?? "", props.sourceContent, props.analysisContent);
}
</script>

<style scoped>
.primary-button { display: flex; height: 2.25rem; align-items: center; justify-content: center; gap: 0.4rem; border-radius: 0.5rem; background: #06b6d4; font-size: 0.8125rem; font-weight: 500; color: #020617; transition: background-color 0.15s ease; }
.primary-button:hover { background: #22d3ee; }
.secondary-button { display: inline-flex; align-items: center; justify-content: center; gap: 0.25rem; border-radius: 0.5rem; border: 1px solid var(--border-default); color: var(--text-secondary); font-weight: 500; transition: color 0.15s ease, border-color 0.15s ease; background: transparent; }
.secondary-button:hover { color: var(--text-primary); border-color: var(--border-strong); }
.doc-ring { animation: doc-ring 1.8s ease-out infinite; }
.loading-dot { width: 0.3rem; height: 0.3rem; border-radius: 999px; background: #22d3ee; animation: doc-loading-dot 1.2s ease-in-out infinite; }
.loading-dot:nth-child(2) { animation-delay: 0.15s; }
.loading-dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes doc-ring { 0% { opacity: 0.8; transform: scale(0.88); } 100% { opacity: 0; transform: scale(1.28); } }
@keyframes doc-loading-dot { 0%, 100% { transform: translateY(0); opacity: 0.35; } 50% { transform: translateY(-0.2rem); opacity: 1; } }
</style>

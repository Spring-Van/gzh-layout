<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- 顶部：分镜生成执行区 -->
    <div class="shrink-0 space-y-2.5 border-b border-border-subtle px-4 py-3">
      <div v-if="runStatus === 'running'" class="flex items-center gap-2 text-xs text-cyan-400">
        <LoaderCircle :size="14" class="animate-spin" />
        <span>正在生成分镜，剧本为主输入，完成后自动刷新左侧列表。</span>
      </div>
      <div v-else-if="runStatus === 'failed'" class="flex items-start gap-2 text-xs text-red-400">
        <CircleAlert :size="14" class="mt-0.5 shrink-0" />
        <span class="leading-5">{{ runError || '上次分镜生成失败，可重新生成。' }}</span>
      </div>
      <PromptRunBar
        v-model:model-id="modelId"
        v-model:template-id="templateId"
        :models="models"
        :templates="templates"
        :action-label="panelsCount ? '重新生成分镜' : '生成分镜'"
        :disabled="!sourceContent.trim() || !modelId || !templateId"
        :busy="runStatus === 'running'"
        confirm-storage-key="comic-long-storyboard-confirm"
        :build-prompt="buildPrompt"
        @run="(prompt) => emit('run', prompt)"
      />
      <p v-if="!scriptContent.trim()" class="text-[11px] leading-4 text-amber-300">本章尚未生成漫画剧本，将以章节原文兜底生成分镜。</p>
    </div>

    <!-- 主体：当前分镜逐字段编辑 -->
    <div v-if="panel" class="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium text-cyan-400">分镜 {{ panel.order }}</span>
        <span class="text-[11px] text-text-muted">修改在失焦或切换分镜时自动保存</span>
      </div>
      <label class="block">
        <span class="mb-1 block text-[11px] text-text-muted">镜头</span>
        <textarea v-model="draft.shot" rows="2" class="custom-scrollbar w-full resize-y rounded-lg border border-border-subtle bg-input-bg p-2 text-sm leading-6 text-text-primary outline-none focus:border-cyan-500/50" placeholder="近景 / 全景…（可空）" @blur="commitDraft" />
      </label>
      <label class="block">
        <span class="mb-1 block text-[11px] text-text-muted">画面（必填）</span>
        <textarea v-model="draft.content" rows="5" class="custom-scrollbar w-full resize-y rounded-lg border border-border-subtle bg-input-bg p-2 text-sm leading-6 text-text-primary outline-none focus:border-cyan-500/50" placeholder="这一格画面发生了什么…" @blur="commitDraft" />
      </label>
      <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <label class="block">
          <span class="mb-1 block text-[11px] text-text-muted">对白</span>
          <textarea v-model="draft.dialogue" rows="2" class="custom-scrollbar w-full resize-y rounded-lg border border-border-subtle bg-input-bg p-2 text-sm leading-6 text-text-primary outline-none focus:border-cyan-500/50" placeholder="角色台词（可空）" @blur="commitDraft" />
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] text-text-muted">旁白</span>
          <textarea v-model="draft.narration" rows="2" class="custom-scrollbar w-full resize-y rounded-lg border border-border-subtle bg-input-bg p-2 text-sm leading-6 text-text-primary outline-none focus:border-cyan-500/50" placeholder="画外音 / 内心独白（可空）" @blur="commitDraft" />
        </label>
      </div>
    </div>

    <!-- 空态 -->
    <div v-else class="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center">
      <ListTree :size="26" class="text-text-muted" />
      <h3 class="mt-3 text-sm font-medium text-text-primary">{{ runStatus === 'running' ? '分镜生成中' : '本章尚未生成分镜' }}</h3>
      <p class="mt-2 max-w-sm text-xs leading-5 text-text-secondary">点击上方「生成分镜」，按漫画剧本拆解镜头（一个场景 3~8 个镜头），生成后可在此逐镜编辑画面、对白与旁白。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 生图工作台右栏「分镜内容」模式：
 * 顶部为分镜生成执行区（PromptRunBar + 运行/失败状态），
 * 主体为当前分镜的镜头/画面/对白/旁白逐字段编辑，失焦或切换分镜时自动保存。
 */
import { ref, watch } from "vue";
import { CircleAlert, ListTree, LoaderCircle } from "lucide-vue-next";
import PromptRunBar from "@comic/components/common/PromptRunBar.vue";
import { buildStoryboardPrompt } from "@comic/services/storyboardService";
import type { LongProjectStoryboardPanel, ModelConfig, PromptTemplate } from "@comic/types";

/** 分镜字段编辑结果（已 trim）。 */
export interface PanelEditFields { shot: string; content: string; dialogue: string; narration: string }

const props = defineProps<{
  /** 当前选中的分镜（可能不存在：尚未生成分镜） */
  panel?: LongProjectStoryboardPanel;
  /** 本章分镜总数（决定按钮文案：生成分镜 / 重新生成分镜） */
  panelsCount: number;
  /** 本章最近一次分镜 run 状态 */
  runStatus?: "running" | "completed" | "failed";
  runError?: string;
  models: ModelConfig[];
  /** 已按 type=storyboard 过滤的模板列表 */
  templates: PromptTemplate[];
  modelId: string;
  templateId: string;
  /** 漫画剧本内容（分镜主输入，空则原文兜底） */
  scriptContent: string;
  /** 章节原文（兜底输入） */
  sourceContent: string;
  /** 原文分析内容（辅助上下文） */
  analysisContent: string;
}>();

const emit = defineEmits<{
  (e: "update:modelId", value: string): void;
  (e: "update:templateId", value: string): void;
  (e: "run", prompt: string): void;
  (e: "save-panel", payload: { panelId: string; fields: PanelEditFields }): void;
}>();

const modelId = ref(props.modelId);
const templateId = ref(props.templateId);
watch(() => props.modelId, (value) => { modelId.value = value; });
watch(() => props.templateId, (value) => { templateId.value = value; });
watch(modelId, (value) => emit("update:modelId", value));
watch(templateId, (value) => emit("update:templateId", value));

// ========== 分镜字段草稿（切换分镜/失焦时提交保存） ==========
const draft = ref<PanelEditFields>({ shot: "", content: "", dialogue: "", narration: "" });
/** 草稿对应的分镜 ID（用于切换后回写旧分镜）。 */
const draftPanelId = ref("");
/** 加载草稿时的字段快照（比对是否发生变化，避免无效写入）。 */
let loadedSnapshot: PanelEditFields = { shot: "", content: "", dialogue: "", narration: "" };

watch(() => props.panel, (panel) => {
  commitDraft();
  draftPanelId.value = panel?.id ?? "";
  loadedSnapshot = { shot: panel?.shot ?? "", content: panel?.content ?? "", dialogue: panel?.dialogue ?? "", narration: panel?.narration ?? "" };
  draft.value = { ...loadedSnapshot };
}, { immediate: true });

/** 提交当前草稿（失焦或切换分镜时触发，仅在有修改时 emit）。 */
function commitDraft() {
  const id = draftPanelId.value;
  if (!id) return;
  const value = draft.value;
  if (value.shot === loadedSnapshot.shot && value.content === loadedSnapshot.content
    && value.dialogue === loadedSnapshot.dialogue && value.narration === loadedSnapshot.narration) return;
  const fields: PanelEditFields = { shot: value.shot.trim(), content: value.content.trim(), dialogue: value.dialogue.trim(), narration: value.narration.trim() };
  loadedSnapshot = { ...fields };
  emit("save-panel", { panelId: id, fields });
}

/** 生成最终发送提示词：剧本（主）+ 原文分析（辅），无剧本时原文兜底。 */
function buildPrompt(): string {
  const template = props.templates.find((item) => item.id === templateId.value);
  return buildStoryboardPrompt(template?.content ?? "", props.scriptContent.trim() || props.sourceContent, props.analysisContent);
}
</script>

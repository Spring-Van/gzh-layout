<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- 内容区：圆角卡片输入框（与提示词模式一致） -->
    <div class="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
      <div class="min-h-0 flex-1 rounded-xl border border-border-subtle bg-surface p-4 shadow-sm shadow-black/10">
        <textarea
          v-if="panel"
          v-model="draftText"
          class="custom-scrollbar h-full w-full resize-none bg-transparent text-xs leading-relaxed text-text-primary outline-none placeholder:text-text-muted focus:outline-none"
          placeholder="这一格分镜内容…&#10;可按行前缀组织：&#10;【镜头】近景&#10;【画面】李明推门而入…&#10;【对白】“谁在那里？”&#10;【旁白】夜雨滂沱…"
          @blur="commitDraft"
        />

        <!-- 空态 -->
        <div v-else class="flex h-full flex-col items-center justify-center text-center">
          <ListTree :size="26" class="text-text-muted" />
          <h3 class="mt-3 text-sm font-medium text-text-primary">{{ runStatus === 'running' ? '分镜生成中' : '本章尚未生成分镜' }}</h3>
          <p class="mt-2 max-w-sm text-xs leading-5 text-text-secondary">在下方选择模型与模板执行「生成分镜」，按漫画剧本拆解镜头（一个场景 3~8 个镜头），生成后可在此逐镜编辑。</p>
        </div>
      </div>
    </div>

    <!-- 底部操作区：卡片式（与提示词模式「单镜操作」一致） -->
    <div class="shrink-0 border-t border-border-subtle p-3">
      <div class="space-y-2 rounded-xl border border-border-subtle bg-surface p-3 shadow-sm shadow-black/10">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-medium text-text-secondary">分镜生成</span>
          <span v-if="panel" class="text-[10px] text-text-muted">分镜 {{ panel.order }} · 修改自动保存</span>
        </div>
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
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 生图工作台右栏「分镜内容」模式：
 * 主体为当前分镜的单一文本编辑框（镜头/画面/对白/旁白以【】行前缀序列化展示，
 * 保存时反解析回结构化字段），失焦或切换分镜时自动保存；
 * 底部为分镜生成操作区（PromptRunBar + 运行/失败状态），与「提示词」模式底部同构。
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

// ========== 单一文本 ⇋ 结构化字段双向转换 ==========

/** 字段行前缀 → 字段名映射（序列化/反解析共用）。 */
const PREFIX_KEYS = { "【镜头】": "shot", "【画面】": "content", "【对白】": "dialogue", "【旁白】": "narration" } as const;

/** 结构化分镜字段序列化为带行前缀的可读文本（空字段不输出行）。 */
function serializePanel(panel?: LongProjectStoryboardPanel): string {
  if (!panel) return "";
  const lines: string[] = [];
  if (panel.shot?.trim()) lines.push(`【镜头】${panel.shot.trim()}`);
  lines.push(`【画面】${panel.content ?? ""}`);
  if (panel.dialogue?.trim()) lines.push(`【对白】${panel.dialogue.trim()}`);
  if (panel.narration?.trim()) lines.push(`【旁白】${panel.narration.trim()}`);
  return lines.join("\n");
}

/** 带行前缀文本反解析为结构化字段：前缀行开始一个字段段（可跨行），无前缀行归入画面。 */
function parsePanelText(text: string): PanelEditFields {
  const buckets: Record<keyof PanelEditFields, string[]> = { shot: [], content: [], dialogue: [], narration: [] };
  let current: keyof PanelEditFields = "content";
  for (const line of text.split("\n")) {
    const prefix = (Object.keys(PREFIX_KEYS) as Array<keyof typeof PREFIX_KEYS>).find((key) => line.startsWith(key));
    if (prefix) {
      current = PREFIX_KEYS[prefix];
      const rest = line.slice(prefix.length).trim();
      if (rest) buckets[current].push(rest);
    } else {
      buckets[current].push(line);
    }
  }
  return {
    shot: buckets.shot.join("\n").trim(),
    content: buckets.content.join("\n").trim(),
    dialogue: buckets.dialogue.join("\n").trim(),
    narration: buckets.narration.join("\n").trim(),
  };
}

// ========== 文本草稿（切换分镜/失焦时提交保存） ==========

const draftText = ref("");
/** 草稿对应的分镜 ID（用于切换后回写旧分镜）。 */
const draftPanelId = ref("");
/** 加载草稿时的文本快照（比对是否发生变化，避免无效写入）。 */
let loadedSnapshot = "";

watch(() => props.panel, (panel) => {
  commitDraft();
  draftPanelId.value = panel?.id ?? "";
  loadedSnapshot = serializePanel(panel);
  draftText.value = loadedSnapshot;
}, { immediate: true });

/** 提交当前草稿（失焦或切换分镜时触发，仅在有修改时反解析并 emit）。 */
function commitDraft() {
  const id = draftPanelId.value;
  if (!id) return;
  if (draftText.value === loadedSnapshot) return;
  const fields = parsePanelText(draftText.value);
  loadedSnapshot = draftText.value;
  emit("save-panel", { panelId: id, fields });
}

/** 生成最终发送提示词：剧本（主）+ 原文分析（辅），无剧本时原文兜底。 */
function buildPrompt(): string {
  const template = props.templates.find((item) => item.id === templateId.value);
  return buildStoryboardPrompt(template?.content ?? "", props.scriptContent.trim() || props.sourceContent, props.analysisContent);
}
</script>

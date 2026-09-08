<template>
  <div class="flex min-h-0 flex-1 gap-4 p-6">
    <!-- 左列：章节原文编辑（文本整理工具栏 + 自动保存） -->
    <section class="flex min-h-0 w-1/2 flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface focus-within:border-cyan-500/50">
      <div class="flex shrink-0 items-center justify-between gap-3 border-b border-border-subtle px-3 py-2">
        <div class="flex shrink-0 items-center gap-1">
          <button class="editor-tool" title="清理空行" @click="formatContent('empty-lines')"><Rows3 :size="15" /><span>清理空行</span></button>
          <button class="editor-tool" title="去除行首序号" @click="formatContent('line-numbers')"><ListX :size="15" /><span>去序号</span></button>
          <button class="editor-tool" title="合并碎行" @click="formatContent('merge-lines')"><AlignJustify :size="15" /><span>合并碎行</span></button>
          <button class="editor-tool" title="撤销文本整理" :disabled="!contentHistory.length" @click="undoFormat"><Undo2 :size="15" /><span>撤销</span></button>
          <div class="relative">
            <button class="editor-tool" title="更多文本整理操作" @click.stop="formatMenuOpen = !formatMenuOpen"><Ellipsis :size="16" /><span>更多</span></button>
            <div v-if="formatMenuOpen" class="absolute left-0 top-9 z-10 min-w-32 rounded-md border border-border-subtle bg-surface p-1 shadow-xl" @click.stop>
              <button class="format-menu-action" @click="formatContent('indent'); formatMenuOpen = false"><TextAlignStart :size="14" />去除缩进</button>
              <button class="format-menu-action" @click="formatContent('trim-lines'); formatMenuOpen = false"><Eraser :size="14" />清理行尾空格</button>
            </div>
          </div>
        </div>
        <p class="min-w-0 truncate text-xs text-text-muted">{{ wordCount(draft) }} 字 · {{ paragraphCount }} 段 · {{ saveStatus }}</p>
      </div>
      <textarea
        :value="draft"
        class="custom-scrollbar min-h-0 flex-1 resize-none bg-transparent p-5 text-sm leading-7 text-text-primary outline-none placeholder:text-text-muted"
        placeholder="粘贴或输入当前小说章节内容..."
        @input="emit('update:draft', ($event.target as HTMLTextAreaElement).value)"
      />
    </section>

    <!-- 右列：AI 原文分析（预览 ⇋ 编辑） -->
    <section class="flex min-h-0 w-1/2 flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface">
      <div class="flex shrink-0 items-center justify-between gap-3 border-b border-border-subtle px-4 py-2.5">
        <div class="flex min-w-0 items-center gap-2">
          <ScanText :size="15" class="shrink-0 text-cyan-400" />
          <h2 class="text-sm font-semibold text-text-primary">原文分析</h2>
          <span v-if="analysisDoc?.source === 'manual'" class="shrink-0 rounded border border-violet-400/30 bg-violet-400/10 px-1.5 py-0.5 text-[10px] text-violet-300" title="由外部 AI 生成后手动导入">手动导入</span>
          <span v-if="sourceChanged" class="shrink-0 rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-300" title="分析生成后原文发生过修改，建议重新分析">原文已变更</span>
        </div>
        <button v-if="analysisDoc?.status === 'completed'" class="secondary-button h-7 px-2 text-[11px]" @click="toggleEditing">
          <Pencil v-if="!editing" :size="12" />{{ editing ? "完成编辑" : "编辑" }}
        </button>
      </div>

      <!-- 生成中 -->
      <div v-if="analysisDoc?.status === 'running'" class="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center">
        <div class="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/10">
          <span class="absolute inset-0 rounded-lg border border-cyan-400/40 doc-ring" />
          <LoaderCircle :size="22" class="animate-spin text-cyan-400" />
        </div>
        <h3 class="text-sm font-medium text-text-primary">正在分析原文</h3>
        <p class="mt-2 text-xs text-text-secondary">正在通读章节，梳理人物、场景、道具、事件与时间线。</p>
        <div class="mt-4 flex items-center gap-1.5 text-xs text-text-muted"><span class="loading-dot" /><span class="loading-dot" /><span class="loading-dot" /><span class="ml-1">大模型生成中</span></div>
      </div>

      <!-- 编辑模式 -->
      <textarea
        v-else-if="editing"
        v-model="analysisDraft"
        class="custom-scrollbar min-h-0 flex-1 resize-none bg-transparent p-5 font-mono text-xs leading-6 text-text-primary outline-none"
        aria-label="编辑原文分析"
        @blur="commitAnalysisDraft"
      />

      <!-- 失败 -->
      <div v-else-if="analysisDoc?.status === 'failed'" class="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center">
        <ScanText :size="26" class="text-red-400" />
        <h3 class="mt-3 text-sm font-medium text-text-primary">分析失败</h3>
        <p class="mt-2 max-w-md text-xs leading-5 text-text-secondary">{{ analysisDoc.error || "请求未能完成，请检查模型配置与提示词后重试。" }}</p>
      </div>

      <!-- 预览 / 空态 -->
      <div v-else class="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
        <MarkdownView v-if="analysisDoc?.content" :content="analysisDoc.content" empty-text="尚无分析结果" />
        <div v-else class="flex h-full flex-col items-center justify-center text-center">
          <ScanText :size="26" class="text-text-muted" />
          <h3 class="mt-3 text-sm font-medium text-text-primary">尚未生成分析</h3>
          <p class="mt-2 max-w-sm text-xs leading-5 text-text-secondary">录入原文后，在顶部页签行右侧选择模型与提示词模板执行「分析原文」，梳理本章人物、场景、道具、事件与时间线，作为后续剧本、分镜与资产提取的依据。</p>
          <button class="mt-4 secondary-button h-8 px-3 text-xs" @click="emit('import-analysis')"><ClipboardPaste :size="14" />手动写入分析结果</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * 长篇章节「原文」页签：左列编辑章节原文（含文本整理工具栏），
 * 右列为 AI 原文分析（Markdown 预览 ⇋ 编辑）；执行栏由主页面渲染在页签行右侧。
 * 分析结果可编辑，编辑内容实时回传父级持久化。
 */
import { computed, ref, watch } from "vue";
import { AlignJustify, ClipboardPaste, Ellipsis, Eraser, ListX, LoaderCircle, Pencil, Rows3, ScanText, TextAlignStart, Undo2 } from "lucide-vue-next";
import MarkdownView from "@comic/components/common/MarkdownView.vue";
import type { LongProjectChapterDoc } from "@comic/types";

const props = defineProps<{
  /** 章节原文草稿（父级自动保存） */
  draft: string;
  /** 保存状态文案（"已自动保存"等） */
  saveStatus: string;
  /** 本章原文分析文档（可能不存在） */
  analysisDoc?: LongProjectChapterDoc;
  /** 分析生成后原文是否已变更 */
  sourceChanged: boolean;
}>();

const emit = defineEmits<{
  (e: "update:draft", value: string): void;
  (e: "save-analysis", content: string): void;
  (e: "import-analysis"): void;
}>();

// ========== 文本整理工具栏（撤销栈本地持有） ==========
const contentHistory = ref<string[]>([]);
const formatMenuOpen = ref(false);

/** 有效段落数。 */
const paragraphCount = computed(() => props.draft.split(/\n\s*\n/).filter((paragraph) => paragraph.trim()).length);

/** 字数统计（去空白字符）。 */
function wordCount(content: string) { return content.replace(/\s/g, "").length; }

/** 文本整理：清理空行 / 去序号 / 合并碎行 / 去缩进 / 清行尾空格。 */
function formatContent(operation: "empty-lines" | "line-numbers" | "merge-lines" | "indent" | "trim-lines") {
  const source = props.draft;
  let formatted = source;
  if (operation === "empty-lines") formatted = source.replace(/\n[\t \u3000]*\n(?:[\t \u3000]*\n)+/g, "\n\n");
  if (operation === "line-numbers") formatted = source.replace(/^[\t \u3000 ]*(?:\d+[.、)]|[（(]\d+[）)]|[一二三四五六七八九十]+[、.])[\t \u3000 ]*/gm, "");
  if (operation === "indent") formatted = source.replace(/^[\t \u3000 ]+/gm, "");
  if (operation === "trim-lines") formatted = source.replace(/[\t \u3000 ]+$/gm, "");
  if (operation === "merge-lines") {
    formatted = source.split(/\r?\n/).reduce<string[]>((paragraphs, line) => {
      const text = line.trim();
      if (!text) { if (paragraphs.at(-1) !== "") paragraphs.push(""); return paragraphs; }
      if (!paragraphs.length || paragraphs.at(-1) === "") paragraphs.push(text);
      else paragraphs[paragraphs.length - 1] += text;
      return paragraphs;
    }, []).join("\n");
  }
  if (formatted === source) return;
  contentHistory.value = [...contentHistory.value.slice(-19), source];
  emit("update:draft", formatted);
}

/** 撤销上一次文本整理。 */
function undoFormat() {
  const previous = contentHistory.value.at(-1);
  if (previous === undefined) return;
  contentHistory.value = contentHistory.value.slice(0, -1);
  emit("update:draft", previous);
}

// ========== 右列分析编辑（预览 ⇋ 编辑，失焦回传保存） ==========
const editing = ref(false);
const analysisDraft = ref("");

watch(() => props.analysisDoc?.content, () => { analysisDraft.value = props.analysisDoc?.content ?? ""; }, { immediate: true });

/** 切换编辑/预览；退出编辑时保存。 */
function toggleEditing() {
  if (editing.value) commitAnalysisDraft();
  editing.value = !editing.value;
}

/** 提交编辑内容（失焦或退出编辑时回传父级持久化）。 */
function commitAnalysisDraft() {
  if (!props.analysisDoc) return;
  if (analysisDraft.value !== props.analysisDoc.content) emit("save-analysis", analysisDraft.value);
}
</script>

<style scoped>
.editor-tool { display: flex; height: 1.875rem; align-items: center; gap: 0.3125rem; justify-content: center; border-radius: 0.375rem; padding: 0 0.5rem; color: var(--text-secondary); font-size: 0.75rem; transition: color 0.15s ease, background-color 0.15s ease; }
.editor-tool:hover:not(:disabled) { background: var(--bg-elevated); color: #67e8f9; }
.editor-tool:disabled { cursor: not-allowed; opacity: 0.35; }
.format-menu-action { display: flex; width: 100%; align-items: center; gap: 0.5rem; border-radius: 0.25rem; padding: 0.5rem 0.625rem; text-align: left; font-size: 0.75rem; color: var(--text-secondary); }
.format-menu-action:hover { background: var(--bg-elevated); color: var(--text-primary); }
.secondary-button { display: inline-flex; align-items: center; justify-content: center; gap: 0.25rem; border-radius: 0.5rem; border: 1px solid var(--border-default); color: var(--text-secondary); font-weight: 500; transition: color 0.15s ease, border-color 0.15s ease; background: transparent; }
.secondary-button:hover { color: var(--text-primary); border-color: var(--border-strong); }
.doc-ring { animation: doc-ring 1.8s ease-out infinite; }
.loading-dot { width: 0.3rem; height: 0.3rem; border-radius: 999px; background: #22d3ee; animation: doc-loading-dot 1.2s ease-in-out infinite; }
.loading-dot:nth-child(2) { animation-delay: 0.15s; }
.loading-dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes doc-ring { 0% { opacity: 0.8; transform: scale(0.88); } 100% { opacity: 0; transform: scale(1.28); } }
@keyframes doc-loading-dot { 0%, 100% { transform: translateY(0); opacity: 0.35; } 50% { transform: translateY(-0.2rem); opacity: 1; } }
</style>

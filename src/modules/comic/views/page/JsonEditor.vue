<template>
  <div
    class="json-editor h-full flex flex-col rounded-xl border border-border-subtle bg-app-bg overflow-hidden shadow-sm shadow-black/20"
  >
    <!-- 工具栏 -->
    <div
      class="flex items-center justify-between px-3 py-1.5 bg-surface border-b border-border-subtle flex-shrink-0"
    >
      <span class="text-[10px] text-text-secondary font-mono tracking-wider"
        >JSON</span
      >
      <div class="flex items-center gap-1.5">
        <button
          class="px-2.5 py-1 text-[10px] border border-border-subtle rounded-md hover:bg-elevated text-text-secondary hover:text-text-primary transition-colors"
          @click="formatJson"
          title="格式化 (Ctrl+Shift+F)"
        >
          <svg
            class="w-3 h-3 inline mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16m-7 6h7"
            /></svg
          >格式化
        </button>
        <button
          class="px-2.5 py-1 text-[10px] border border-border-subtle rounded-md hover:bg-elevated text-text-secondary hover:text-text-primary transition-colors"
          @click="compressJson"
          title="压缩"
        >
          压缩
        </button>
      </div>
    </div>

    <!-- 编辑区 -->
    <div ref="editorContainer" class="flex-1 min-h-0"></div>

    <!-- 错误提示 -->
    <div
      v-if="error"
      class="px-3 py-1.5 bg-red-500/10 border-t border-red-500/20 flex-shrink-0"
    >
      <p class="text-[10px] text-red-400 flex items-center gap-1">
        <svg
          class="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {{ error }}
      </p>
    </div>

    <!-- 状态栏 -->
    <div
      class="px-3 py-1 bg-surface border-t border-border-subtle flex items-center justify-between flex-shrink-0"
    >
      <span class="text-[10px] text-text-muted font-mono"
        >{{ lineCount }} 行</span
      >
      <span class="text-[10px] text-text-muted font-mono"
        >Ln {{ currentLine }}, Col {{ currentCol }}</span
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
// 按需导入 monaco：只加载 editor 核心 + JSON 语言，避免全量打包
import { basicSetup } from "codemirror";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import { useTheme } from "@/theme/useTheme";

interface Props {
  modelValue: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "update:modelValue", val: string): void;
  (e: "valid", data: unknown): void;
}>();

const editorContainer = ref<HTMLDivElement | null>(null);
const error = ref("");
const currentLine = ref(1);
const currentCol = ref(1);

const { theme } = useTheme();

let editor: EditorView | null = null;
const themeCompartment = new Compartment();

const lineCount = computed(() => {
  if (!props.modelValue) return 1;
  return props.modelValue.split("\n").length;
});

watch(
  () => props.modelValue,
  (val) => {
    if (editor && val !== editor.state.doc.toString()) {
      const cursor = Math.min(editor.state.selection.main.head, val.length);
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: val },
        selection: { anchor: cursor },
      });
      validate(val);
    }
  },
);

function validate(value: string): boolean {
  error.value = "";
  if (!value.trim()) {
    emit("valid", null);
    return true;
  }
  try {
    const parsed = JSON.parse(value);
    emit("valid", parsed);
    return true;
  } catch (_e) {
    error.value = "JSON 格式错误";
    emit("valid", null);
    return false;
  }
}

function formatJson() {
  if (!editor) return;
  const value = editor.state.doc.toString();
  try {
    const parsed = JSON.parse(value);
    const formatted = JSON.stringify(parsed, null, 2);
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: formatted } });
    emit("update:modelValue", formatted);
    error.value = "";
  } catch (_e) {
    error.value = "无法格式化：JSON 格式有误";
  }
}

function compressJson() {
  if (!editor) return;
  const value = editor.state.doc.toString();
  try {
    const parsed = JSON.parse(value);
    const compressed = JSON.stringify(parsed);
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: compressed } });
    emit("update:modelValue", compressed);
    error.value = "";
  } catch (_e) {
    error.value = "无法压缩：JSON 格式有误";
  }
}

function updateCursorPosition() {
  if (!editor) return;
  const position = editor.state.selection.main.head;
  const line = editor.state.doc.lineAt(position);
  currentLine.value = line.number;
  currentCol.value = position - line.from + 1;
}

onMounted(() => {
  if (!editorContainer.value) return;

  editor = new EditorView({
    parent: editorContainer.value,
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        basicSetup,
        json(),
        EditorState.tabSize.of(2),
        themeCompartment.of(theme.value === "dark" ? oneDark : []),
        EditorView.theme({
          "&": { height: "100%", fontSize: "12px" },
          ".cm-scroller": {
            overflow: "auto",
            fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'SF Mono', Consolas, monospace",
            lineHeight: "19px",
          },
          ".cm-content": { padding: "12px 0" },
        }),
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            const value = update.state.doc.toString();
            emit("update:modelValue", value);
            validate(value);
          }
          if (update.docChanged || update.selectionSet) updateCursorPosition();
        }),
      ],
    }),
  });

  // 主题切换时更新 monaco 主题
  watch(theme, (t) => {
    editor?.dispatch({
      effects: themeCompartment.reconfigure(t === "dark" ? oneDark : []),
    });
  });

  validate(props.modelValue);
});

onBeforeUnmount(() => {
  if (editor) {
    editor.destroy();
    editor = null;
  }
});
</script>

<style scoped>
/* 滚动条等通用样式（与主题无关） */
.json-editor :deep(.cm-scroller) {
  scrollbar-width: thin;
}

.json-editor :deep(.cm-scroller)::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.json-editor :deep(.cm-scroller)::-webkit-scrollbar-thumb {
  border-radius: 3px;
}
</style>

<!-- dark 模式下覆盖 monaco 配色，light 模式用 monaco 内置 vs 主题 -->
<style>
html.dark .json-editor .cm-editor {
  background: #0a0a0f;
}

html.dark .json-editor .cm-gutters {
  border-right: 1px solid rgba(255, 255, 255, 0.04);
}

html.dark .json-editor .cm-scroller {
  scrollbar-color: rgba(255, 255, 255, 0.08) transparent;
}

html.dark .json-editor .cm-scroller::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
}

html.dark .json-editor .cm-scroller::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}
</style>

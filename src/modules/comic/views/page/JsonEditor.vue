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
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/language/json/monaco.contribution";
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

let editor: monaco.editor.IStandaloneCodeEditor | null = null;

const lineCount = computed(() => {
  if (!props.modelValue) return 1;
  return props.modelValue.split("\n").length;
});

watch(
  () => props.modelValue,
  (val) => {
    if (editor && val !== editor.getValue()) {
      const position = editor.getPosition();
      editor.setValue(val);
      if (position) {
        editor.setPosition(position);
      }
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
  const value = editor.getValue();
  try {
    const parsed = JSON.parse(value);
    const formatted = JSON.stringify(parsed, null, 2);
    editor.setValue(formatted);
    emit("update:modelValue", formatted);
    error.value = "";
  } catch (_e) {
    error.value = "无法格式化：JSON 格式有误";
  }
}

function compressJson() {
  if (!editor) return;
  const value = editor.getValue();
  try {
    const parsed = JSON.parse(value);
    const compressed = JSON.stringify(parsed);
    editor.setValue(compressed);
    emit("update:modelValue", compressed);
    error.value = "";
  } catch (_e) {
    error.value = "无法压缩：JSON 格式有误";
  }
}

function updateCursorPosition() {
  if (!editor) return;
  const position = editor.getPosition();
  if (position) {
    currentLine.value = position.lineNumber;
    currentCol.value = position.column;
  }
}

onMounted(() => {
  if (!editorContainer.value) return;

  editor = monaco.editor.create(editorContainer.value, {
    value: props.modelValue,
    language: "json",
    theme: theme.value === "dark" ? "vs-dark" : "vs",
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 12,
    fontFamily:
      "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'SF Mono', Consolas, monospace",
    lineHeight: 19,
    lineNumbers: "on",
    renderLineHighlight: "line",
    automaticLayout: true,
    tabSize: 2,
    wordWrap: "off",
    scrollbar: {
      verticalScrollbarSize: 6,
      horizontalScrollbarSize: 6,
    },
    padding: { top: 12, bottom: 12 },
    contextmenu: true,
    quickSuggestions: false,
    suggestOnTriggerCharacters: false,
  });

  // 主题切换时更新 monaco 主题
  watch(theme, (t) => {
    monaco.editor.setTheme(t === "dark" ? "vs-dark" : "vs");
  });

  editor.onDidChangeModelContent(() => {
    const value = editor!.getValue();
    emit("update:modelValue", value);
    validate(value);
    updateCursorPosition();
  });

  editor.onDidChangeCursorPosition(() => {
    updateCursorPosition();
  });

  validate(props.modelValue);
});

onBeforeUnmount(() => {
  if (editor) {
    editor.dispose();
    editor = null;
  }
});
</script>

<style scoped>
/* 滚动条等通用样式（与主题无关） */
.json-editor :deep(.monaco-editor .monaco-scrollable-element) {
  scrollbar-width: thin;
}

.json-editor
  :deep(.monaco-editor .monaco-scrollable-element)::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.json-editor
  :deep(.monaco-editor .monaco-scrollable-element)::-webkit-scrollbar-thumb {
  border-radius: 3px;
}
</style>

<!-- dark 模式下覆盖 monaco 配色，light 模式用 monaco 内置 vs 主题 -->
<style>
html.dark .json-editor .monaco-editor {
  --vscode-editor-background: #0a0a0f;
  --vscode-editorGutter-background: #0a0a0f;
  --vscode-editorLineNumber-foreground: #4a5568;
  --vscode-editorLineNumber-activeForeground: #94a3b8;
  --vscode-editorCursor-foreground: #22d3ee;
  --vscode-editor-selectionBackground: rgba(34, 211, 238, 0.15);
  --vscode-editor-lineHighlightBackground: rgba(255, 255, 255, 0.03);
  --vscode-editorWidget-background: #0f172a;
  --vscode-editorWidget-border: rgba(255, 255, 255, 0.08);
}

html.dark .json-editor .monaco-editor .margin {
  border-right: 1px solid rgba(255, 255, 255, 0.04);
}

html.dark .json-editor .monaco-editor .monaco-scrollable-element {
  scrollbar-color: rgba(255, 255, 255, 0.08) transparent;
}

html.dark .json-editor .monaco-editor .monaco-scrollable-element::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
}

html.dark .json-editor .monaco-editor .monaco-scrollable-element::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}
</style>

<template>
  <Teleport to="body">
    <Transition name="node-dialog">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" @click.self="close">
        <form class="node-dialog-panel w-full max-w-[460px] rounded-lg border border-border-subtle bg-surface p-6 shadow-2xl shadow-black/40" @submit.prevent="submit">
          <div class="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 class="text-base font-semibold text-text-primary">{{ title }}</h2>
              <p v-if="parentName" class="mt-1 text-sm text-text-secondary">创建位置：{{ parentName }}</p>
            </div>
            <button type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary" title="关闭" @click="close">
              <X :size="18" />
            </button>
          </div>

          <label class="block">
            <span class="mb-2 block text-sm font-medium text-text-primary">{{ nodeType === "folder" ? "文件夹名称" : "章节名称" }}</span>
            <input ref="nameInput" v-model="name" type="text" maxlength="50" autocomplete="off" class="w-full rounded-lg border border-border-subtle bg-input-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-cyan-500/60" :placeholder="nodeType === 'folder' ? '例如：第一卷' : '例如：第 1 章 雨夜来客'" @keydown.esc.prevent="close" />
          </label>

          <!-- 创作方式：仅新建章节时可选（重命名/文件夹不展示） -->
          <div v-if="nodeType === 'chapter' && !renameMode" class="mt-4">
            <span class="mb-2 block text-sm font-medium text-text-primary">创作方式</span>
            <div class="grid grid-cols-2 gap-2">
              <label class="flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2.5 transition-colors" :class="startMode === 'source' ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-border-subtle hover:border-border-strong'" @click="startMode = 'source'">
                <input v-model="startMode" type="radio" value="source" class="mt-0.5 accent-cyan-500" />
                <span>
                  <span class="block text-sm text-text-primary">从原文开始</span>
                  <span class="mt-0.5 block text-xs leading-4 text-text-muted">粘贴小说原文，走完整管线</span>
                </span>
              </label>
              <label class="flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2.5 transition-colors" :class="startMode === 'script' ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-border-subtle hover:border-border-strong'" @click="startMode = 'script'">
                <input v-model="startMode" type="radio" value="script" class="mt-0.5 accent-cyan-500" />
                <span>
                  <span class="block text-sm text-text-primary">从剧本开始</span>
                  <span class="mt-0.5 block text-xs leading-4 text-text-muted">跳过原文，直接编写/导入剧本</span>
                </span>
              </label>
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button type="button" class="rounded-lg border border-border-subtle px-4 py-2 text-sm text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary" @click="close">取消</button>
            <button type="submit" class="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40" :disabled="!name.trim()">
              {{ renameMode ? "保存" : "创建" }}
            </button>
          </div>
        </form>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { X } from "lucide-vue-next";
import type { LongChapterStartMode, LongProjectNodeType } from "@comic/types";

const props = withDefaults(defineProps<{ modelValue: boolean; nodeType: LongProjectNodeType; initialName?: string; renameMode?: boolean; parentName?: string }>(), {
  initialName: "", renameMode: false, parentName: "",
});
const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void;
  (event: "submit", payload: { name: string; content: string; startMode: LongChapterStartMode }): void;
}>();

const nameInput = ref<HTMLInputElement | null>(null);
const name = ref("");
/** 章节起笔模式：从原文开始（默认）｜从剧本开始（隐藏原文页签）。 */
const startMode = ref<LongChapterStartMode>("source");
const title = computed(() => `${props.renameMode ? "重命名" : "新建"}${props.nodeType === "folder" ? "文件夹" : "章节"}`);

watch(() => props.modelValue, async (visible) => {
  if (!visible) return;
  name.value = props.initialName;
  startMode.value = "source";
  await nextTick();
  nameInput.value?.focus();
  nameInput.value?.select();
});

const close = () => emit("update:modelValue", false);
const submit = () => {
  const trimmedName = name.value.trim();
  if (!trimmedName) return;
  emit("submit", { name: trimmedName, content: "", startMode: startMode.value });
};
</script>

<style scoped>
.node-dialog-enter-active, .node-dialog-leave-active { transition: opacity 0.18s ease; }
.node-dialog-enter-active .node-dialog-panel, .node-dialog-leave-active .node-dialog-panel { transition: opacity 0.18s ease, transform 0.18s ease; }
.node-dialog-enter-from, .node-dialog-leave-to, .node-dialog-enter-from .node-dialog-panel, .node-dialog-leave-to .node-dialog-panel { opacity: 0; }
.node-dialog-enter-from .node-dialog-panel, .node-dialog-leave-to .node-dialog-panel { transform: translateY(6px) scale(0.98); }
</style>

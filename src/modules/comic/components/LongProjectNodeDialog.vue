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
import type { LongProjectNodeType } from "@comic/types";

const props = withDefaults(defineProps<{ modelValue: boolean; nodeType: LongProjectNodeType; initialName?: string; renameMode?: boolean; parentName?: string }>(), {
  initialName: "", renameMode: false, parentName: "",
});
const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void;
  (event: "submit", payload: { name: string; content: string }): void;
}>();

const nameInput = ref<HTMLInputElement | null>(null);
const name = ref("");
const title = computed(() => `${props.renameMode ? "重命名" : "新建"}${props.nodeType === "folder" ? "文件夹" : "章节"}`);

watch(() => props.modelValue, async (visible) => {
  if (!visible) return;
  name.value = props.initialName;
  await nextTick();
  nameInput.value?.focus();
  nameInput.value?.select();
});

const close = () => emit("update:modelValue", false);
const submit = () => {
  const trimmedName = name.value.trim();
  if (!trimmedName) return;
  emit("submit", { name: trimmedName, content: "" });
};
</script>

<style scoped>
.node-dialog-enter-active, .node-dialog-leave-active { transition: opacity 0.18s ease; }
.node-dialog-enter-active .node-dialog-panel, .node-dialog-leave-active .node-dialog-panel { transition: opacity 0.18s ease, transform 0.18s ease; }
.node-dialog-enter-from, .node-dialog-leave-to, .node-dialog-enter-from .node-dialog-panel, .node-dialog-leave-to .node-dialog-panel { opacity: 0; }
.node-dialog-enter-from .node-dialog-panel, .node-dialog-leave-to .node-dialog-panel { transform: translateY(6px) scale(0.98); }
</style>

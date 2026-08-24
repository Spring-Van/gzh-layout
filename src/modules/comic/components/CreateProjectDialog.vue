<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
        @click.self="close"
      >
        <form
          class="dialog-panel w-full max-w-[440px] rounded-lg border border-border-subtle bg-surface p-6 shadow-2xl shadow-black/40"
          @submit.prevent="submit"
        >
          <div class="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 class="text-base font-semibold text-text-primary">新建漫画项目</h2>
              <p class="mt-1 text-sm text-text-secondary">设置项目名称与创作类型</p>
            </div>
            <button
              type="button"
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary"
              title="关闭"
              @click="close"
            >
              <X :size="18" />
            </button>
          </div>

          <label class="mb-5 block">
            <span class="mb-2 block text-sm font-medium text-text-primary">项目名称</span>
            <input
              ref="nameInput"
              v-model="name"
              type="text"
              maxlength="50"
              autocomplete="off"
              class="w-full rounded-lg border border-border-subtle bg-input-bg px-3 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-cyan-500/60"
              placeholder="输入项目名称"
              @keydown.esc.prevent="close"
            />
            <span class="mt-1.5 block text-right text-xs text-text-muted">{{ name.length }}/50</span>
          </label>

          <fieldset class="mb-7">
            <legend class="mb-2 text-sm font-medium text-text-primary">创作类型</legend>
            <div class="grid grid-cols-2 rounded-lg border border-border-subtle bg-input-bg p-1">
              <button
                v-for="option in typeOptions"
                :key="option.value"
                type="button"
                class="flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors"
                :class="projectType === option.value
                  ? 'bg-surface text-cyan-400 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'"
                @click="projectType = option.value"
              >
                <component :is="option.icon" :size="17" />
                {{ option.label }}
              </button>
            </div>
          </fieldset>

          <div class="flex justify-end gap-3">
            <button
              type="button"
              class="rounded-lg border border-border-subtle px-4 py-2 text-sm text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
              @click="close"
            >
              取消
            </button>
            <button
              type="submit"
              class="inline-flex min-w-24 items-center justify-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!canSubmit || submitting"
            >
              {{ submitting ? "创建中..." : "创建项目" }}
            </button>
          </div>
        </form>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { BookOpen, PanelsTopLeft, X } from "lucide-vue-next";
import type { ComicProjectType } from "@comic/types";

const props = withDefaults(defineProps<{
  modelValue: boolean;
  submitting?: boolean;
}>(), {
  submitting: false,
});

const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void;
  (event: "create", payload: { name: string; projectType: ComicProjectType }): void;
}>();

const nameInput = ref<HTMLInputElement | null>(null);
const name = ref("");
const projectType = ref<ComicProjectType>("short");
const canSubmit = ref(false);

const typeOptions = [
  { value: "short" as const, label: "短篇漫画", icon: PanelsTopLeft },
  { value: "long" as const, label: "长篇漫画", icon: BookOpen },
];

watch(name, (value) => {
  canSubmit.value = value.trim().length > 0;
});

watch(() => props.modelValue, async (visible) => {
  if (!visible) return;
  name.value = "";
  projectType.value = "short";
  await nextTick();
  nameInput.value?.focus();
});

const close = () => {
  if (!props.submitting) emit("update:modelValue", false);
};

const submit = () => {
  const projectName = name.value.trim();
  if (!projectName || props.submitting) return;
  emit("create", { name: projectName, projectType: projectType.value });
};
</script>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.18s ease;
}
.dialog-enter-active .dialog-panel,
.dialog-leave-active .dialog-panel {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.dialog-enter-from,
.dialog-leave-to,
.dialog-enter-from .dialog-panel,
.dialog-leave-to .dialog-panel {
  opacity: 0;
}
.dialog-enter-from .dialog-panel,
.dialog-leave-to .dialog-panel {
  transform: translateY(6px) scale(0.98);
}
</style>

<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        @click.self="handleCancel"
      >
        <div
          class="confirm-card bg-surface dark:bg-[#0a0a0a] border border-border-subtle rounded-xl w-[360px] max-w-[90vw] p-6 shadow-2xl shadow-black/40"
        >
            <!-- 图标 -->
            <div class="flex items-center justify-center mb-4">
              <div
                class="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center"
              >
                <svg
                  class="w-6 h-6 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
            </div>

            <!-- 标题 -->
            <h3 class="text-base font-semibold text-text-primary text-center mb-2">
              {{ title }}
            </h3>

            <!-- 内容 -->
            <p class="text-sm text-text-secondary text-center mb-6 leading-relaxed">
              {{ content }}
            </p>

            <!-- 按钮 -->
            <div class="flex items-center justify-center gap-3">
              <button
                class="px-5 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors border border-border-subtle hover:border-border-strong"
                @click="handleCancel"
              >
                {{ cancelText }}
              </button>
              <button
                class="px-5 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-red-500/20"
                @click="handleConfirm"
              >
                {{ confirmText }}
              </button>
            </div>
          </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean;
  title?: string;
  content?: string;
  confirmText?: string;
  cancelText?: string;
}

withDefaults(defineProps<Props>(), {
  title: "确认删除",
  content: "删除后无法恢复，是否确认删除？",
  confirmText: "确认删除",
  cancelText: "取消",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "confirm"): void;
  (e: "cancel"): void;
}>();

const handleConfirm = () => {
  emit("confirm");
  emit("update:modelValue", false);
};

const handleCancel = () => {
  emit("cancel");
  emit("update:modelValue", false);
};
</script>

<style scoped>
/* 遮罩淡入淡出 + 卡片 scale，合并为单次合成层动画，避免嵌套 Transition 双重调度 */
.confirm-enter-active,
.confirm-leave-active {
  transition: opacity 0.18s ease;
}
.confirm-enter-active .confirm-card,
.confirm-leave-active .confirm-card {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}
.confirm-enter-from .confirm-card,
.confirm-leave-to .confirm-card {
  opacity: 0;
  transform: scale(0.96);
}
</style>

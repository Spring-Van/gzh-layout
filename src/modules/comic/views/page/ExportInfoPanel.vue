<template>
  <div
    class="w-[20%] min-w-[220px] max-w-[280px] rounded-xl bg-surface border border-border-subtle backdrop-blur-sm shadow-lg shadow-black/20 overflow-hidden flex flex-col"
  >
    <div class="h-10 px-4 border-b border-border-subtle flex items-center shrink-0">
      <span class="text-xs font-medium text-text-secondary">项目信息</span>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-5">
      <!-- 标题：默认文字展示，双击编辑 -->
      <div>
        <label class="block text-[11px] text-text-muted mb-1.5">标题</label>
        <div
          v-if="!isEditingTitle"
          class="px-1 py-2 text-sm text-text-primary min-h-[36px] flex items-center cursor-pointer hover:bg-elevated rounded transition-colors"
          @dblclick="startEditTitle"
        >
          <span v-if="title" class="break-all whitespace-pre-wrap">{{
            title
          }}</span>
          <span v-else class="text-text-muted text-xs">双击编辑标题</span>
        </div>
        <input
          v-else
          ref="titleInputRef"
          :value="title"
          type="text"
          class="w-full px-1 py-2 bg-transparent border-b border-cyan-500/50 text-sm text-text-primary focus:outline-none transition-colors"
          placeholder="输入标题..."
          @blur="finishEditTitle"
          @keydown.enter="finishEditTitle"
          @input="
            $emit('update:title', ($event.target as HTMLInputElement).value)
          "
        />
      </div>

      <!-- 标签：只读展示 -->
      <div>
        <label class="block text-[11px] text-text-muted mb-1.5">标签</label>
        <div class="px-1 py-2 min-h-[36px]">
          <div v-if="tags.length > 0" class="flex flex-wrap gap-1.5">
            <span
              v-for="(tag, i) in normalizedTags"
              :key="i"
              class="inline-block text-xs px-2 py-0.5 rounded-full bg-elevated text-text-secondary border border-border-subtle"
            >
              {{ tag }}
            </span>
          </div>
          <span v-else class="text-text-muted text-xs">暂无标签</span>
        </div>
      </div>

      <!-- 创作备注 -->
      <div v-if="creativeNotes && Object.keys(creativeNotes).length > 0">
        <label class="block text-[11px] text-text-muted mb-1.5">创作备注</label>
        <div class="space-y-2">
          <div
            v-for="(value, key) in creativeNotes"
            :key="key"
            class="rounded-lg bg-surface border border-border-subtle px-3 py-2"
          >
            <div class="text-[10px] text-text-muted mb-0.5">{{ key }}</div>
            <div class="text-xs text-text-secondary break-all whitespace-pre-wrap">
              {{ value }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from "vue";

interface Props {
  title: string;
  tags: string[];
  creativeNotes?: Record<string, string>;
}

const props = defineProps<Props>();

defineEmits<{
  (e: "update:title", value: string): void;
}>();

const isEditingTitle = ref(false);
const titleInputRef = ref<HTMLInputElement | null>(null);

/** 标签规范化：确保每个标签以 # 开头 */
const normalizedTags = computed(() =>
  props.tags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)),
);

const startEditTitle = () => {
  isEditingTitle.value = true;
  nextTick(() => titleInputRef.value?.focus());
};

const finishEditTitle = () => {
  isEditingTitle.value = false;
};
</script>

<template>
  <div
    class="w-full h-full flex flex-col lg:flex-row overflow-hidden bg-background"
  >
    <!-- 左侧：表单编辑器 -->
    <div
      class="w-full lg:w-1/2 bg-white border-r border-slate-200 flex flex-col h-1/2 lg:h-full flex-shrink-0 z-10"
    >
      <div
        class="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0"
      >
        <span class="font-bold text-sm text-slate-800 flex items-center gap-2">
          <svg
            class="w-4 h-4 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            ></path>
          </svg>
          {{ isEditing ? "编辑样式" : "新建样式" }}
        </span>
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-700 mb-2"
            >样式名称</label
          >
          <input
            :value="name"
            @input="$emit('update:name', ($event.target as HTMLInputElement).value)"
            type="text"
            class="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white shadow-sm"
            placeholder="输入样式名称"
          />
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-700 mb-2"
            >样式描述（可选）</label
          >
          <input
            :value="description"
            @input="$emit('update:description', ($event.target as HTMLInputElement).value)"
            type="text"
            class="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white shadow-sm"
            placeholder="简单描述一下这个样式"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2"
            >HTML 代码</label
          >
          <textarea
            :value="html"
            @input="$emit('update:html', ($event.target as HTMLTextAreaElement).value)"
            rows="16"
            class="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white shadow-sm font-mono custom-scrollbar"
            placeholder="在此输入 HTML 代码..."
          ></textarea>
        </div>
      </div>

      <div class="p-4 border-t border-slate-100 flex justify-end gap-3">
        <button
          @click="$emit('cancel')"
          class="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
        >
          取消
        </button>
        <button
          @click="$emit('save')"
          :disabled="!name || !html"
          class="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isEditing ? "更新样式" : "保存样式" }}
        </button>
      </div>
    </div>

    <!-- 右侧：预览 -->
    <div
      class="flex-1 h-full flex items-center justify-center p-4 lg:p-8 relative overflow-hidden bg-slate-100/50"
    >
      <div class="w-full max-w-lg bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100">
          <h3 class="font-bold text-slate-800">{{ name || '样式名称' }}</h3>
          <p v-if="description" class="text-xs text-slate-500 mt-1">{{ description }}</p>
        </div>
        <div class="p-6 flex items-center justify-center min-h-[200px] bg-slate-50/50">
          <div v-if="html" v-html="html"></div>
          <p v-else class="text-slate-300 text-sm">输入 HTML 后显示预览</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  name: string;
  description: string;
  html: string;
  isEditing: boolean;
}

defineProps<Props>();

defineEmits<{
  (e: "update:name", value: string): void;
  (e: "update:description", value: string): void;
  (e: "update:html", value: string): void;
  (e: "save"): void;
  (e: "cancel"): void;
}>();
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>

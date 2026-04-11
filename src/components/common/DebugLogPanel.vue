<template>
  <div
    class="fixed bottom-4 left-4 w-80 max-h-48 overflow-y-auto bg-slate-900/90 text-white text-xs p-3 rounded-lg shadow-2xl z-40 font-mono backdrop-blur-sm"
  >
    <div
      class="flex justify-between items-center mb-2 sticky top-0 bg-slate-900/90 pb-1 border-b border-slate-700"
    >
      <span class="font-bold">调试日志</span>
      <div class="flex gap-1">
        <button
          @click="$emit('close')"
          class="text-slate-400 hover:text-white"
          title="隐藏"
        >
          <svg
            class="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 15l7-7 7 7"
            ></path>
          </svg>
        </button>
        <button
          @click="$emit('clear')"
          class="text-slate-400 hover:text-white"
          title="清空"
        >
          <svg
            class="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            ></path>
          </svg>
        </button>
      </div>
    </div>
    <div class="space-y-0.5 text-[10px]">
      <div
        v-for="(log, idx) in logs.slice(-30)"
        :key="idx"
        class="truncate"
        :class="{
          'text-green-400': log.includes('成功') || log.includes('完成'),
          'text-red-400': log.includes('失败') || log.includes('错误'),
          'text-yellow-400': log.includes('警告') || log.includes('warn'),
          'text-blue-400': log.includes('开始') || log.includes('选择'),
        }"
      >
        {{ log }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  logs: string[];
}

interface Emits {
  (e: "close"): void;
  (e: "clear"): void;
}

defineProps<Props>();
defineEmits<Emits>();
</script>

<template>
  <div
    class="px-6 py-4 flex items-center gap-4"
    :class="[
      status === 'processing'
        ? 'bg-blue-50/50'
        : status === 'success'
          ? 'bg-green-50/30'
          : 'bg-white',
    ]"
  >
    <div
      class="w-5 h-5 rounded-full border-[3px] flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
      :class="[
        status === 'pending'
          ? 'border-slate-200'
          : status === 'processing'
            ? 'border-primary border-t-transparent animate-spin'
            : status === 'success'
              ? 'bg-green-500'
              : 'bg-red-500',
      ]"
    >
      {{ status === "success" ? "✓" : status === "failed" ? "✕" : "" }}
    </div>

    <div
      class="w-12 h-12 rounded border border-slate-200 flex-shrink-0 flex items-center justify-center text-[10px] font-medium text-slate-500"
      :class="coverStyle"
    >
      封面
    </div>

    <div class="flex-1 min-w-0">
      <h4 class="font-bold text-sm text-slate-800 truncate mb-1">
        {{ title }}
      </h4>
      <p class="text-xs text-slate-400 truncate">
        {{ summary }}
      </p>
    </div>

    <div
      class="text-xs font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-100"
    >
      {{ fileCount }} Files
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string;
  summary: string;
  coverStyle: string;
  fileCount: number;
  status: "pending" | "processing" | "success" | "failed";
}

defineProps<Props>();
</script>

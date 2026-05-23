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
      class="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
      :class="[
        status === 'pending'
          ? 'border-[3px] border-slate-200'
          : status === 'processing'
            ? 'border-[3px] border-primary border-t-transparent animate-spin'
            : status === 'success'
              ? 'bg-green-500'
              : 'bg-red-500',
      ]"
    >
      <svg
        v-if="status === 'success'"
        class="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="3"
          d="M5 13l4 4L19 7"
        />
      </svg>
      <span v-else-if="status === 'failed'">✕</span>
    </div>

    <div
      v-if="coverImageSrc"
      class="w-12 h-12 rounded overflow-hidden flex-shrink-0 border border-slate-200"
    >
      <img
        :src="coverImageSrc"
        :alt="title"
        class="w-full h-full object-cover"
      />
    </div>
    <div
      v-else
      class="w-12 h-12 rounded border border-slate-200 flex-shrink-0 flex items-center justify-center text-[10px] font-medium text-slate-400 bg-slate-100"
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
  coverImageSrc?: string;
  fileCount: number;
  status: "pending" | "processing" | "success" | "failed";
}

defineProps<Props>();
</script>

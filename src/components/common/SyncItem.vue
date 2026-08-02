<template>
  <div
    class="px-6 py-4 flex items-center gap-4"
    :class="[
      status === 'processing'
        ? 'bg-green-50/50'
        : status === 'success'
          ? 'bg-green-50/30'
          : 'bg-white',
    ]"
  >
    <button
      class="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition"
      :class="[
        selected
          ? 'bg-green-500 border-green-500'
          : 'border-2 border-slate-300 hover:border-green-400',
      ]"
      @click.stop="$emit('toggle')"
    >
      <svg
        v-if="selected"
        class="w-3 h-3 text-white"
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
    </button>

    <div
      v-if="coverImageSrc"
      class="w-12 h-12 rounded overflow-hidden flex-shrink-0 border border-slate-200"
    >
      <img
        :src="coverImageSrc"
        :alt="title"
        class="w-full h-full object-cover"
        loading="lazy"
        decoding="async"
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

    <div class="flex-shrink-0 w-16 flex justify-end">
      <div v-if="status === 'pending'" class="text-xs text-slate-400">
        待同步
      </div>
      <div v-else-if="status === 'processing'" class="flex items-center gap-1.5">
        <svg
          class="w-4 h-4 text-green-500 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span class="text-xs text-green-600">同步中</span>
      </div>
      <div v-else-if="status === 'success'" class="flex items-center gap-1.5">
        <svg
          class="w-4 h-4 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.5"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span class="text-xs text-green-600">已同步</span>
      </div>
      <div v-else-if="status === 'failed'" class="flex items-center gap-1.5">
        <svg
          class="w-4 h-4 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.5"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        <span class="text-xs text-red-600">失败</span>
      </div>
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
  selected: boolean;
}

defineProps<Props>();
defineEmits<{
  toggle: [];
}>();
</script>

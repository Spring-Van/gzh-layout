<template>
  <div
    class="flex-1 rounded-xl bg-surface border border-border-subtle backdrop-blur-sm shadow-lg shadow-black/20 overflow-hidden flex flex-col"
    style="min-width: 300px"
  >
    <div
      class="h-10 px-4 border-b border-border-subtle flex items-center justify-between shrink-0"
    >
      <span class="text-xs font-medium text-text-secondary">图片预览</span>
      <div class="flex items-center gap-2">
        <button
          class="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
          @click="$emit('select-all')"
        >
          全选脱敏
        </button>
        <button
          class="text-[11px] text-text-muted hover:text-text-primary transition-colors"
          @click="$emit('deselect-all')"
        >
          取消全选
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4">
      <div
        v-if="images.length === 0"
        class="flex flex-col items-center justify-center h-full text-text-muted"
      >
        <svg
          class="w-12 h-12 mb-3 opacity-30"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span class="text-sm">暂无已生成的图片</span>
      </div>

      <div v-else class="grid grid-cols-3 gap-2.5">
        <div
          v-for="(url, index) in images"
          :key="index"
          class="relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-[border-color,box-shadow] aspect-[3/4]"
          :class="
            selectedIndices.has(index)
              ? 'border-cyan-500/70 shadow-md shadow-cyan-500/10'
              : 'border-border-subtle hover:border-border-strong'
          "
          @click="$emit('toggle-select', index)"
        >
          <img
            :src="url"
            :alt="`第${index + 1}页`"
            class="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />

          <!-- 页码 -->
          <div
            class="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-white font-medium"
          >
            {{ index + 1 }}
          </div>

          <!-- 脱敏选中标记 -->
          <div
            class="absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-[background-color,border-color,opacity]"
            :class="
              selectedIndices.has(index)
                ? 'bg-cyan-500 border-cyan-500'
                : 'bg-black/40 border-white/30 opacity-0 group-hover:opacity-100'
            "
          >
            <svg
              v-if="selectedIndices.has(index)"
              class="w-3 h-3 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <!-- 脱敏标签 -->
          <div
            v-if="selectedIndices.has(index)"
            class="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-cyan-500/80 text-white text-[9px] rounded font-medium"
          >
            脱敏
          </div>

          <!-- 放大按钮 -->
          <button
            class="absolute bottom-1.5 left-1.5 p-1 bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
            @click.stop="$emit('preview', index)"
          >
            <svg
              class="w-3.5 h-3.5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  images: string[];
  selectedIndices: Set<number>;
}

defineProps<Props>();

defineEmits<{
  (e: "toggle-select", index: number): void;
  (e: "preview", index: number): void;
  (e: "select-all"): void;
  (e: "deselect-all"): void;
}>();
</script>

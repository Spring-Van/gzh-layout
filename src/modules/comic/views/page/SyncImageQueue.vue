<template>
  <aside
    class="w-[15%] min-w-[200px] max-w-[260px] rounded-xl bg-surface border border-border-subtle shadow-lg shadow-black/20 overflow-hidden flex flex-col"
  >
    <!-- 顶部标题 -->
    <div
      class="shrink-0 px-4 py-3 border-b border-border-subtle bg-elevated/50"
    >
      <div class="flex items-center justify-between">
        <h2 class="text-xs font-semibold text-text-primary">图片队列</h2>
        <span class="text-[10px] text-text-tertiary">
          共 {{ images.length }} 张
        </span>
      </div>
    </div>

    <!-- 图片网格 -->
    <div
      v-if="images.length > 0"
      class="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar"
    >
      <div
        v-for="(img, idx) in images"
        :key="img.id"
        class="group relative rounded-lg overflow-hidden border border-border-subtle hover:border-border-default transition-all cursor-pointer"
        @click="$emit('preview', img)"
      >
        <!-- 图片 -->
        <div class="aspect-[3/4] bg-elevated">
          <img
            :src="getImageUrl(img.path)"
            :alt="img.name"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            decoding="async"
            @error="(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }"
          />
        </div>

        <!-- 序号 -->
        <div
          class="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium"
        >
          {{ idx + 1 }}
        </div>

        <!-- 名称 -->
        <div
          class="absolute bottom-0 left-0 right-0 px-2 py-1 bg-gradient-to-t from-black/80 to-transparent"
        >
          <span class="text-[10px] text-white truncate block">{{ img.name }}</span>
        </div>

        <!-- 悬浮预览提示 -->
        <div
          class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          <svg
            class="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div
      v-else
      class="flex-1 flex flex-col items-center justify-center p-6 text-center"
    >
      <svg
        class="w-10 h-10 text-text-tertiary mb-2"
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
      <p class="text-xs text-text-tertiary">暂无生成图片</p>
      <p class="text-[10px] text-text-tertiary mt-1">
        请先在页面编辑器中生成图片
      </p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { ComicSyncImage } from '../../stores/sync'

interface Props {
  images: ComicSyncImage[]
  getImageUrl: (path: string) => string
}

defineProps<Props>()

defineEmits<{
  (e: 'preview', img: ComicSyncImage): void
}>()
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--color-border-default, #cbd5e1);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary, #94a3b8);
}
</style>

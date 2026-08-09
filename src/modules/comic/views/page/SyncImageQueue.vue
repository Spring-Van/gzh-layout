<template>
  <aside
    class="w-[20%] min-w-[220px] max-w-[280px] rounded-xl bg-surface border border-border-subtle shadow-lg shadow-black/20 overflow-hidden flex flex-col"
  >
    <!-- Tab 切换 -->
    <div class="shrink-0 flex border-b border-border-subtle bg-elevated/50">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors"
        :class="
          activeTab === tab.value
            ? 'border-[#07c160] text-[#07c160]'
            : 'border-transparent text-text-tertiary hover:text-text-secondary'
        "
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 图片队列 Tab -->
    <template v-if="activeTab === 'images'">
      <!-- 图片数量 -->
      <div class="shrink-0 px-4 py-2 border-b border-border-subtle flex items-center justify-between">
        <span class="text-[10px] text-text-tertiary">共 {{ images.length }} 张</span>
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
    </template>

    <!-- 项目信息 Tab -->
    <template v-else>
      <div class="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        <!-- 标题 -->
        <div>
          <label class="block text-[11px] text-text-muted mb-1.5">标题</label>
          <div class="px-1 py-2 text-sm text-text-primary min-h-[36px]">
            <span v-if="projectTitle" class="break-all whitespace-pre-wrap">{{ projectTitle }}</span>
            <span v-else class="text-text-muted text-xs">暂无标题</span>
          </div>
        </div>

        <!-- 标签 -->
        <div>
          <label class="block text-[11px] text-text-muted mb-1.5">标签</label>
          <div class="px-1 py-2 min-h-[36px]">
            <div v-if="projectTags.length > 0" class="flex flex-wrap gap-1.5">
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
    </template>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ComicSyncImage } from '../../stores/sync'

interface Props {
  images: ComicSyncImage[]
  getImageUrl: (path: string) => string
  /** 项目信息：标题（来自解析 JSON 时的 publishData/pageData） */
  projectTitle?: string
  /** 项目信息：标签 */
  projectTags?: string[]
  /** 项目信息：创作备注 */
  creativeNotes?: Record<string, string>
}

const props = withDefaults(defineProps<Props>(), {
  projectTitle: '',
  projectTags: () => [],
  creativeNotes: () => ({}),
})

defineEmits<{
  (e: 'preview', img: ComicSyncImage): void
}>()

type QueueTab = 'images' | 'info'

const tabs: Array<{ label: string; value: QueueTab }> = [
  { label: '图片队列', value: 'images' },
  { label: '项目信息', value: 'info' },
]

const activeTab = ref<QueueTab>('images')

/** 标签规范化：确保每个标签以 # 开头（与 ExportInfoPanel 一致） */
const normalizedTags = computed(() =>
  props.projectTags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)),
)
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

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- 图片预览区 -->
    <div class="flex-1 flex flex-col min-h-0 px-5 pt-5 pb-3">
      <div class="flex items-center justify-between mb-3 shrink-0">
        <h3 class="text-sm font-semibold text-text-primary">
          图像预览
          <span v-if="store.currentImage" class="text-xs font-normal text-text-muted ml-2">
            {{ store.currentImage.aspectRatio }}
          </span>
        </h3>
        <div v-if="store.currentImage" class="flex items-center gap-2">
          <!-- 复用（还原提示词与参考图） -->
          <button
            class="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-elevated transition-colors"
            title="复用提示词与参考图"
            @click="handleReuse"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <!-- 作为参考图 -->
          <button
            class="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-elevated transition-colors"
            title="作为参考图编辑"
            @click="handleUseAsReference"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <!-- 设置分类 -->
          <div class="relative">
            <button
              class="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-elevated transition-colors"
              title="设置分类"
              @click="showCategoryPopover = !showCategoryPopover"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </button>
            <!-- 透明遮罩，点击关闭面板 -->
            <div
              v-if="showCategoryPopover"
              class="fixed inset-0 z-20"
              @click="showCategoryPopover = false"
            />
            <!-- 分类下拉面板 -->
            <div
              v-if="showCategoryPopover"
              class="absolute right-0 top-full mt-1 z-30 w-48 bg-surface border border-border-subtle rounded-xl shadow-xl p-2"
            >
              <p class="text-xs font-semibold text-text-secondary px-2 py-1 mb-1">设置分类</p>
              <div class="max-h-48 overflow-y-auto">
                <button
                  v-for="cat in store.categories"
                  :key="cat.id"
                  class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors"
                  :class="
                    store.currentImage?.categoryIds.includes(cat.id)
                      ? 'bg-cyan-500/10 text-accent'
                      : 'text-text-secondary hover:bg-elevated hover:text-text-primary'
                  "
                  @click.stop="store.toggleImageCategory(store.currentImage!.id, cat.id)"
                >
                  <span class="truncate">{{ cat.name }}</span>
                  <svg
                    v-if="store.currentImage?.categoryIds.includes(cat.id)"
                    class="w-3.5 h-3.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
              <!-- 新建分类 -->
              <div class="mt-1 pt-1.5 border-t border-border-subtle flex gap-1.5">
                <input
                  v-model="newCategoryName"
                  type="text"
                  class="flex-1 min-w-0 bg-input-bg border border-border-subtle rounded-lg px-2 py-1 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors"
                  placeholder="新分类"
                  @keyup.enter="addCategoryFromPopover"
                />
                <button
                  class="px-2 py-1 rounded-lg bg-accent-gradient text-white text-xs font-medium hover:opacity-90 transition-opacity shrink-0"
                  @click.stop="addCategoryFromPopover"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
          <!-- 下载 -->
          <button
            class="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors"
            title="下载"
            @click="downloadImage(store.currentImage!.url)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <!-- 全屏 -->
          <button
            class="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors"
            title="全屏查看"
            @click="showFullscreen = true"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
          <!-- 删除 -->
          <button
            class="p-1.5 rounded-lg text-text-secondary hover:text-red-400 hover:bg-elevated transition-colors"
            title="删除"
            @click="deleteCurrentImage"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 预览图片 -->
      <div class="flex-1 min-h-0 rounded-xl bg-elevated/50 border border-border-subtle flex items-center justify-center overflow-hidden relative">
        <template v-if="store.isGenerating && !store.currentImage">
          <!-- 生成中占位 -->
          <div class="text-center">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-500/10 flex items-center justify-center">
              <svg class="w-8 h-8 text-accent animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <p class="text-sm text-text-secondary">正在生成图片...</p>
            <p class="text-xs text-text-muted mt-1">{{ store.progressStatus }}</p>
          </div>
        </template>
        <template v-else-if="store.currentImage">
          <img
            :src="store.currentImage.url"
            class="max-w-full max-h-full object-contain"
            alt="生成的图片"
          />
          <!-- 多张图切换 -->
          <div v-if="store.currentImages.length > 1" class="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
            <button
              v-for="(_, idx) in store.currentImages"
              :key="idx"
              class="w-2 h-2 rounded-full transition-all"
              :class="
                store.selectedImageIndex === idx
                  ? 'bg-cyan-400 w-5'
                  : 'bg-white/40 hover:bg-white/60'
              "
              @click="store.selectedImageIndex = idx"
            />
          </div>
        </template>
        <template v-else>
          <!-- 空状态 -->
          <div class="text-center">
            <svg class="w-12 h-12 mx-auto mb-3 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p class="text-sm text-text-muted">输入提示词，点击生成</p>
          </div>
        </template>
      </div>
    </div>

    <!-- 历史记录 -->
    <div class="shrink-0 px-5 pb-5 pt-3">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-text-primary">历史记录</h3>
        <button
          class="text-xs text-accent hover:underline transition-colors flex items-center gap-1"
          @click="$emit('openGallery')"
        >
          查看全部
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div v-if="store.recentHistory.length > 0" class="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
        <div
          v-for="img in store.recentHistory"
          :key="img.id"
          class="relative shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 cursor-pointer transition-all duration-200 group"
          :class="
            store.currentImage?.id === img.id
              ? 'border-cyan-400 shadow-md shadow-cyan-500/20'
              : 'border-border-subtle hover:border-border-default'
          "
          @click="$emit('selectHistory', img)"
        >
          <img :src="img.url" class="w-full h-full object-cover" alt="" />
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
            <p class="text-[10px] text-white/80 truncate">{{ store.formatRelativeTime(img.createdAt) }}</p>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-4">
        <p class="text-xs text-text-muted">暂无历史记录</p>
      </div>
    </div>

    <!-- 全屏预览 -->
    <div
      v-if="showFullscreen && store.currentImage"
      class="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center"
      @click="showFullscreen = false"
    >
      <img
        :src="store.currentImage.url"
        class="max-w-[90vw] max-h-[90vh] object-contain"
        alt="全屏预览"
      />
      <button
        class="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        @click="showFullscreen = false"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- 操作提示 toast -->
    <div
      v-if="toastMessage"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-cyan-500/90 text-white text-sm px-4 py-2 rounded-xl shadow-lg backdrop-blur-sm flex items-center gap-2 animate-fade-in"
    >
      <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useImageStudioStore } from '@/stores/imageStudio'
import type { GeneratedImage } from '@/stores/imageStudio'

const store = useImageStudioStore()

const showFullscreen = ref(false)
const showCategoryPopover = ref(false)
const newCategoryName = ref('')
const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

defineEmits<{
  selectHistory: [image: GeneratedImage]
  openGallery: []
}>()

/** 显示短暂提示 */
const showToast = (msg: string) => {
  toastMessage.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 2000)
}

/** 在分类面板中新建分类并归入当前图片 */
const addCategoryFromPopover = () => {
  const name = newCategoryName.value.trim()
  if (!name || !store.currentImage) return
  const cat = store.addCategory(name)
  store.toggleImageCategory(store.currentImage.id, cat.id)
  newCategoryName.value = ''
  showToast(`已创建并归入「${cat.name}」`)
}

/** 下载图片 */
const downloadImage = (url: string) => {
  const link = document.createElement('a')
  link.href = url
  link.download = `generated_${Date.now()}.png`
  link.click()
}

/** 删除当前图片 */
const deleteCurrentImage = () => {
  if (!store.currentImage) return
  store.deleteImage(store.currentImage.id)
  store.currentImages = []
  store.selectedImageIndex = 0
}

/** 复用当前图片的提示词与参考图 */
const handleReuse = () => {
  if (!store.currentImage) return
  store.reuseImage(store.currentImage)
  const hasRef = !!store.currentImage.referenceImages?.length
  showToast(hasRef ? '已还原提示词与参考图' : '已还原提示词')
}

/** 将当前图片作为参考图 */
const handleUseAsReference = () => {
  if (!store.currentImage) return
  store.useAsReference(store.currentImage)
  showToast('已加入参考图')
}
</script>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}
.scrollbar-thin::-webkit-scrollbar {
  height: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: var(--border-subtle);
  border-radius: 2px;
}
</style>

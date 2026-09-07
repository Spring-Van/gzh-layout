<template>
  <div class="h-full flex flex-col overflow-hidden relative bg-app-bg">
    <!-- 主内容区：左右分栏 -->
    <main class="flex-1 flex overflow-hidden">
      <!-- 左侧面板：参数设置 -->
      <div class="w-[380px] shrink-0 border-r border-border-subtle bg-surface overflow-hidden flex flex-col">
        <LeftPanel @generate="handleGenerate" />
      </div>

      <!-- 右侧面板：预览 + 历史 -->
      <div class="flex-1 overflow-hidden flex flex-col bg-app-bg">
        <RightPanel
          @select-history="handleSelectHistory"
          @open-gallery="$router.push('/gallery')"
        />
      </div>
    </main>

    <!-- 错误提示 -->
    <div
      v-if="errorMessage"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white text-sm px-5 py-2.5 rounded-xl shadow-lg backdrop-blur-sm flex items-center gap-2 animate-fade-in"
    >
      <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {{ errorMessage }}
      <button class="ml-2 text-white/70 hover:text-white" @click="errorMessage = ''">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ImageStudioView' });
import { ref, onMounted } from 'vue'
import { useImageStudioStore } from '@/stores/imageStudio'
import LeftPanel from '@/components/image-studio/LeftPanel.vue'
import RightPanel from '@/components/image-studio/RightPanel.vue'
import type { GeneratedImage } from '@/stores/imageStudio'

const store = useImageStudioStore()
const errorMessage = ref('')

const handleGenerate = async () => {
  errorMessage.value = ''
  try {
    await store.generate()
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : '生成失败，请重试'
  }
}

const handleSelectHistory = (image: GeneratedImage) => {
  store.selectFromHistory(image)
}

onMounted(async () => {
  await Promise.all([store.loadModels(), store.loadHistory()])
  store.selectLatest()
})
</script>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}
</style>

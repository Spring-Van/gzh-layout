<template>
  <div class="h-screen flex flex-col overflow-hidden relative bg-app-bg">
    <!-- 顶部 Header -->
    <header
      class="h-14 bg-surface border-b border-border-subtle flex items-center justify-between px-5 flex-shrink-0 z-20"
    >
      <div class="flex items-center gap-3 min-w-0">
        <button
          class="p-2 rounded-lg hover:bg-elevated transition-colors"
          @click="$router.push('/')"
          title="返回"
        >
          <svg class="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div class="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-white shadow">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div class="min-w-0">
          <h1 class="text-base font-bold text-text-primary leading-tight">生图工作台</h1>
          <p class="text-xs text-text-secondary leading-tight hidden md:block">AI 图像生成</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="px-3 py-1.5 rounded-lg text-sm font-medium border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-default transition-colors flex items-center gap-1.5"
          @click="$router.push('/gallery')"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          画夹
        </button>
        <button
          class="flex items-center justify-center w-9 h-9 text-text-secondary hover:text-text-primary hover:bg-elevated rounded-lg transition"
          :title="theme === 'dark' ? '切换到浅色' : '切换到深色'"
          @click="toggleTheme"
        >
          <svg v-if="theme === 'dark'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </button>
      </div>
    </header>

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
import { ref, onMounted } from 'vue'
import { useImageStudioStore } from '@/stores/imageStudio'
import { useTheme } from '@/theme/useTheme'
import LeftPanel from '@/components/image-studio/LeftPanel.vue'
import RightPanel from '@/components/image-studio/RightPanel.vue'
import type { GeneratedImage } from '@/stores/imageStudio'

const store = useImageStudioStore()
const { theme, toggle: toggleTheme } = useTheme()
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

onMounted(() => {
  store.loadModels()
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

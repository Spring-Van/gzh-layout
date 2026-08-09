<template>
  <div class="h-screen flex flex-col overflow-hidden relative bg-app-bg">
    <!-- 顶部 Header -->
    <header
      class="h-14 bg-surface border-b border-border-subtle flex items-center justify-between px-5 flex-shrink-0 z-20"
    >
      <div class="flex items-center gap-3 min-w-0">
        <button
          class="p-2 rounded-lg hover:bg-elevated transition-colors"
          @click="$router.push('/image-studio')"
          title="返回生图工作台"
        >
          <svg class="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div class="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white shadow">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </div>
        <div class="min-w-0">
          <h1 class="text-base font-bold text-text-primary leading-tight">画夹</h1>
          <p class="text-xs text-text-secondary leading-tight hidden md:block">管理生成的图片</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="px-3 py-1.5 rounded-lg text-sm font-medium bg-accent-gradient text-white hover:opacity-90 transition-opacity flex items-center gap-1.5"
          @click="showAddCategory = true"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          新建分类
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

    <!-- 主内容区 -->
    <main class="flex-1 flex overflow-hidden">
      <!-- 左侧分类列表 -->
      <div class="w-64 shrink-0 border-r border-border-subtle bg-surface overflow-y-auto">
        <div class="p-4">
          <h3 class="text-sm font-semibold text-text-primary mb-3">分类</h3>
          <div class="space-y-1">
            <button
              v-for="cat in store.categories"
              :key="cat.id"
              class="w-full px-3 py-2 rounded-lg text-sm text-left transition-all duration-200 flex items-center justify-between group"
              :class="
                selectedCategoryId === cat.id
                  ? 'bg-cyan-500/10 text-accent border border-cyan-500/30'
                  : 'text-text-secondary hover:bg-elevated hover:text-text-primary border border-transparent'
              "
              @click="selectedCategoryId = cat.id"
            >
              <span class="truncate">{{ cat.name }}</span>
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  v-if="cat.id !== 'default'"
                  class="p-1 rounded hover:bg-white/10"
                  @click.stop="editCategory(cat)"
                  title="重命名"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  v-if="cat.id !== 'default'"
                  class="p-1 rounded hover:bg-red-500/10 text-text-secondary hover:text-red-400"
                  @click.stop="deleteCategory(cat.id)"
                  title="删除"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- 右侧图片网格 -->
      <div class="flex-1 overflow-y-auto p-5">
        <!-- 工具栏 -->
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-lg font-semibold text-text-primary">
              {{ currentCategoryName }}
            </h2>
            <p class="text-xs text-text-secondary mt-0.5">
              共 {{ filteredImages.length }} 张图片
            </p>
          </div>
          <div v-if="selectedImages.size > 0" class="flex items-center gap-2">
            <button
              class="px-3 py-1.5 rounded-lg text-sm font-medium border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-default transition-colors"
              @click="selectedImages.clear()"
            >
              取消选择
            </button>
            <button
              class="px-3 py-1.5 rounded-lg text-sm font-medium bg-accent-gradient text-white hover:opacity-90 transition-opacity flex items-center gap-1.5"
              @click="downloadSelected"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              下载选中 ({{ selectedImages.size }})
            </button>
          </div>
        </div>

        <!-- 图片瀑布流 -->
        <div v-if="filteredImages.length > 0" class="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 [column-fill:_balance]">
          <div
            v-for="img in filteredImages"
            :key="img.id"
            class="relative group rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer mb-4 break-inside-avoid"
            :class="
              selectedImages.has(img.id)
                ? 'border-cyan-400 shadow-lg shadow-cyan-500/20'
                : 'border-border-subtle hover:border-border-default'
            "
            @click="toggleSelect(img.id)"
          >
            <img :src="img.url" class="w-full h-auto block" alt="" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div class="absolute bottom-0 left-0 right-0 p-2">
                <p class="text-xs text-white/80 truncate">{{ store.formatRelativeTime(img.createdAt) }}</p>
                <p class="text-[10px] text-white/60 truncate mt-0.5">{{ img.modelName }}</p>
              </div>
            </div>
            <!-- 右上角操作按钮组 -->
            <div class="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
              <button
                class="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 flex items-center justify-center transition-colors"
                title="查看详情"
                @click="openDetail(img)"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
              <button
                class="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-cyan-600 flex items-center justify-center transition-colors"
                title="复用提示词与参考图"
                @click="reuseImage(img)"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                class="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-cyan-600 flex items-center justify-center transition-colors"
                title="作为参考图编辑"
                @click="useAsReference(img)"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
            <!-- 选中标记 -->
            <div
              v-if="selectedImages.has(img.id)"
              class="absolute top-2 left-2 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center"
            >
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="text-center py-20">
          <svg class="w-16 h-16 mx-auto mb-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p class="text-sm text-text-muted">该分类暂无图片</p>
          <button
            class="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-accent-gradient text-white hover:opacity-90 transition-opacity"
            @click="$router.push('/image-studio')"
          >
            去生图
          </button>
        </div>
      </div>
    </main>

    <!-- 添加分类弹窗 -->
    <div
      v-if="showAddCategory"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      @click.self="showAddCategory = false"
    >
      <div class="bg-surface border border-border-subtle rounded-xl w-[400px] max-w-[90vw] p-6">
        <h3 class="text-base font-semibold text-text-primary mb-4">新建分类</h3>
        <input
          v-model="newCategoryName"
          type="text"
          class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors"
          placeholder="分类名称"
          @keyup.enter="confirmAddCategory"
        />
        <div class="flex items-center justify-end gap-3 mt-6">
          <button
            class="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
            @click="showAddCategory = false"
          >
            取消
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-accent-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity"
            @click="confirmAddCategory"
          >
            确认
          </button>
        </div>
      </div>
    </div>

    <!-- 重命名分类弹窗 -->
    <div
      v-if="showRenameCategory"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      @click.self="showRenameCategory = false"
    >
      <div class="bg-surface border border-border-subtle rounded-xl w-[400px] max-w-[90vw] p-6">
        <h3 class="text-base font-semibold text-text-primary mb-4">重命名分类</h3>
        <input
          v-model="renameCategoryName"
          type="text"
          class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors"
          placeholder="分类名称"
          @keyup.enter="confirmRenameCategory"
        />
        <div class="flex items-center justify-end gap-3 mt-6">
          <button
            class="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
            @click="showRenameCategory = false"
          >
            取消
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-accent-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity"
            @click="confirmRenameCategory"
          >
            确认
          </button>
        </div>
      </div>
    </div>

    <!-- 图片详情弹窗 -->
    <div
      v-if="detailImage"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      @click.self="detailImage = null"
    >
      <div class="bg-surface border border-border-subtle rounded-xl w-[760px] max-w-full max-h-[90vh] overflow-hidden flex flex-col">
        <!-- 弹窗头部 -->
        <div class="flex items-center justify-between px-5 py-3 border-b border-border-subtle shrink-0">
          <h3 class="text-base font-semibold text-text-primary">图片详情</h3>
          <button
            class="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors"
            @click="detailImage = null"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- 弹窗内容 -->
        <div class="flex-1 overflow-y-auto p-5 flex flex-col md:flex-row gap-5">
          <!-- 左：图片 -->
          <div class="md:w-[360px] shrink-0">
            <div class="rounded-lg overflow-hidden bg-elevated border border-border-subtle flex items-center justify-center">
              <img :src="detailImage.url" class="w-full max-h-[420px] object-contain" alt="图片详情" />
            </div>
            <div class="flex items-center gap-2 mt-3">
              <button
                class="flex-1 py-2 rounded-lg text-xs font-medium border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-default transition-colors flex items-center justify-center gap-1.5"
                @click="downloadImage(detailImage)"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                下载
              </button>
              <button
                class="flex-1 py-2 rounded-lg text-xs font-medium bg-accent-gradient text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                @click="reuseImage(detailImage)"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                复用
              </button>
              <button
                class="flex-1 py-2 rounded-lg text-xs font-medium bg-accent-gradient text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                @click="useAsReference(detailImage)"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                作为参考图
              </button>
            </div>
          </div>

          <!-- 右：信息 -->
          <div class="flex-1 min-w-0 space-y-4">
            <!-- 提示词 -->
            <div>
              <h4 class="text-xs font-semibold text-text-secondary mb-1.5">提示词</h4>
              <div class="bg-input-bg border border-border-subtle rounded-lg p-3 text-sm text-text-primary leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                {{ detailImage.prompt || '（无提示词）' }}
              </div>
            </div>

            <!-- 参考图 -->
            <div v-if="detailImage.referenceImages && detailImage.referenceImages.length > 0">
              <h4 class="text-xs font-semibold text-text-secondary mb-1.5">
                参考图 ({{ detailImage.referenceImages.length }})
              </h4>
              <div class="flex flex-wrap gap-2">
                <div
                  v-for="(refImg, idx) in detailImage.referenceImages"
                  :key="idx"
                  class="w-20 h-20 rounded-lg overflow-hidden border border-border-subtle"
                >
                  <img :src="refImg" class="w-full h-full object-cover" alt="参考图" />
                </div>
              </div>
            </div>

            <!-- 分类设置 -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <h4 class="text-xs font-semibold text-text-secondary">分类</h4>
                <button
                  class="text-xs text-accent hover:underline transition-colors"
                  @click="showDetailAddCategory = !showDetailAddCategory"
                >
                  {{ showDetailAddCategory ? '取消' : '+ 新建' }}
                </button>
              </div>
              <!-- 新建分类输入 -->
              <div v-if="showDetailAddCategory" class="flex gap-2 mb-2">
                <input
                  v-model="detailNewCategoryName"
                  type="text"
                  class="flex-1 bg-input-bg border border-border-subtle rounded-lg px-2.5 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors"
                  placeholder="分类名称"
                  @keyup.enter="confirmDetailAddCategory"
                />
                <button
                  class="px-3 py-1.5 rounded-lg bg-accent-gradient text-white text-xs font-medium hover:opacity-90 transition-opacity"
                  @click="confirmDetailAddCategory"
                >
                  添加
                </button>
              </div>
              <!-- 分类标签 -->
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="cat in store.categories"
                  :key="cat.id"
                  class="px-2.5 py-1 rounded-md text-xs font-medium border transition-all duration-200"
                  :class="
                    detailImage.categoryIds.includes(cat.id)
                      ? 'border-cyan-500/50 bg-cyan-500/10 text-accent'
                      : 'border-border-subtle bg-input-bg text-text-secondary hover:border-border-default hover:text-text-primary'
                  "
                  @click="toggleDetailCategory(cat.id)"
                >
                  {{ cat.name }}
                </button>
              </div>
            </div>

            <!-- 参数信息 -->
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-input-bg border border-border-subtle rounded-lg p-3">
                <p class="text-xs text-text-muted mb-1">模型</p>
                <p class="text-sm text-text-primary truncate">{{ detailImage.modelName }}</p>
              </div>
              <div class="bg-input-bg border border-border-subtle rounded-lg p-3">
                <p class="text-xs text-text-muted mb-1">比例</p>
                <p class="text-sm text-text-primary">{{ detailImage.aspectRatio || '-' }}</p>
              </div>
              <div class="bg-input-bg border border-border-subtle rounded-lg p-3">
                <p class="text-xs text-text-muted mb-1">质量</p>
                <p class="text-sm text-text-primary">{{ detailImage.quality || '-' }}</p>
              </div>
              <div class="bg-input-bg border border-border-subtle rounded-lg p-3">
                <p class="text-xs text-text-muted mb-1">生成时间</p>
                <p class="text-sm text-text-primary">{{ store.formatRelativeTime(detailImage.createdAt) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作提示 toast -->
    <div
      v-if="toastMessage"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-cyan-500/90 text-white text-sm px-4 py-2 rounded-xl shadow-lg backdrop-blur-sm flex items-center gap-2"
    >
      <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useImageStudioStore } from '@/stores/imageStudio'
import { useTheme } from '@/theme/useTheme'
import type { GalleryCategory, GeneratedImage } from '@/stores/imageStudio'

const router = useRouter()
const store = useImageStudioStore()
const { theme, toggle: toggleTheme } = useTheme()

const selectedCategoryId = ref('default')
const selectedImages = ref(new Set<string>())
const showAddCategory = ref(false)
const showRenameCategory = ref(false)
const newCategoryName = ref('')
const renameCategoryName = ref('')
const editingCategory = ref<GalleryCategory | null>(null)
const detailImage = ref<GeneratedImage | null>(null)
const showDetailAddCategory = ref(false)
const detailNewCategoryName = ref('')
const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

const currentCategoryName = computed(() => {
  const cat = store.categories.find(c => c.id === selectedCategoryId.value)
  return cat?.name || '未知分类'
})

const filteredImages = computed(() => {
  return store.history
    .filter(img => img.categoryIds.includes(selectedCategoryId.value))
    .sort((a, b) => b.createdAt - a.createdAt)
})

const toggleSelect = (imageId: string) => {
  if (selectedImages.value.has(imageId)) {
    selectedImages.value.delete(imageId)
  } else {
    selectedImages.value.add(imageId)
  }
}

const downloadSelected = async () => {
  const images = store.history.filter(img => selectedImages.value.has(img.id))
  for (const img of images) {
    const link = document.createElement('a')
    link.href = img.url
    link.download = `generated_${img.id}.png`
    link.click()
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  selectedImages.value.clear()
}

/** 显示短暂 toast */
const showToast = (msg: string) => {
  toastMessage.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 2000)
}

/** 打开图片详情弹窗 */
const openDetail = (img: GeneratedImage) => {
  detailImage.value = img
}

/** 下载单张图片 */
const downloadImage = (img: GeneratedImage) => {
  const link = document.createElement('a')
  link.href = img.url
  link.download = `generated_${img.id}.png`
  link.click()
}

/** 复用提示词与参考图，跳转到生图工作台 */
const reuseImage = (img: GeneratedImage) => {
  store.reuseImage(img)
  detailImage.value = null
  showToast('已还原提示词与参考图')
  setTimeout(() => router.push('/image-studio'), 400)
}

/** 作为参考图，跳转到生图工作台 */
const useAsReference = (img: GeneratedImage) => {
  store.useAsReference(img)
  detailImage.value = null
  showToast('已加入参考图')
  setTimeout(() => router.push('/image-studio'), 400)
}

/** 切换详情图片的分类归属 */
const toggleDetailCategory = (categoryId: string) => {
  if (!detailImage.value) return
  store.toggleImageCategory(detailImage.value.id, categoryId)
  // 同步当前详情视图对象（history 内对象已被直接修改）
  const updated = store.history.find(i => i.id === detailImage.value!.id)
  if (updated) detailImage.value = { ...updated }
}

/** 在详情弹窗中新建分类并归入当前图片 */
const confirmDetailAddCategory = () => {
  const name = detailNewCategoryName.value.trim()
  if (!name || !detailImage.value) return
  const cat = store.addCategory(name)
  store.toggleImageCategory(detailImage.value.id, cat.id)
  const updated = store.history.find(i => i.id === detailImage.value!.id)
  if (updated) detailImage.value = { ...updated }
  detailNewCategoryName.value = ''
  showDetailAddCategory.value = false
}

const confirmAddCategory = () => {
  if (newCategoryName.value.trim()) {
    store.addCategory(newCategoryName.value.trim())
    newCategoryName.value = ''
    showAddCategory.value = false
  }
}

const editCategory = (cat: GalleryCategory) => {
  editingCategory.value = cat
  renameCategoryName.value = cat.name
  showRenameCategory.value = true
}

const confirmRenameCategory = () => {
  if (editingCategory.value && renameCategoryName.value.trim()) {
    store.renameCategory(editingCategory.value.id, renameCategoryName.value.trim())
    renameCategoryName.value = ''
    editingCategory.value = null
    showRenameCategory.value = false
  }
}

const deleteCategory = (id: string) => {
  if (confirm('确定要删除这个分类吗？该分类下的图片不会被删除。')) {
    store.deleteCategory(id)
    if (selectedCategoryId.value === id) {
      selectedCategoryId.value = 'default'
    }
  }
}

onMounted(() => {
  store.loadModels()
})
</script>

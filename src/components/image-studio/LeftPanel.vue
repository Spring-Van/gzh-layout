<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- 模型选择 -->
    <div class="px-5 pt-5 pb-3 shrink-0">
      <h3 class="text-sm font-semibold text-text-primary mb-3">模型选择</h3>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="model in store.imageModels"
          :key="model.id"
          class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200"
          :class="
            store.selectedModelId === model.id
              ? 'border-cyan-500/50 bg-cyan-500/10 text-accent shadow-sm shadow-cyan-500/10'
              : 'border-border-subtle bg-input-bg text-text-secondary hover:border-border-default hover:text-text-primary'
          "
          @click="store.selectedModelId = model.id"
        >
          {{ model.name }}
        </button>
      </div>
    </div>

    <!-- 可滚动参数区域 -->
    <div class="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
      <!-- 提示词 -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-semibold text-text-primary">提示词 <span class="text-xs font-normal text-text-muted">Prompt</span></h3>
          <div class="flex items-center gap-1.5">
            <!-- 常用提示词 -->
            <div class="relative">
              <button
                ref="promptBtnRef"
                class="flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors px-1.5 py-0.5 rounded-md hover:bg-elevated"
                @click="togglePromptPopover"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                常用
              </button>
            </div>
            <!-- 保存为常用 -->
            <button
              class="flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors px-1.5 py-0.5 rounded-md hover:bg-elevated disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-muted"
              :disabled="!store.prompt.trim()"
              @click="handleSavePrompt"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              保存
            </button>
            <!-- 清空 -->
            <button
              class="text-xs text-text-muted hover:text-text-primary transition-colors"
              @click="store.prompt = ''"
            >
              清空
            </button>
          </div>
        </div>
        <textarea
          v-model="store.prompt"
          rows="4"
          class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors resize-none leading-relaxed"
          placeholder="描述你想要生成的图片..."
        />
        <div class="text-xs text-text-muted text-right mt-1">
          {{ store.prompt.length }} / 2000
        </div>
      </div>

      <!-- 参考图 -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-semibold text-text-primary">
            参考图 <span class="text-xs font-normal text-text-muted">可选</span>
          </h3>
          <button
            v-if="store.referenceImages.length > 0"
            class="text-xs text-text-muted hover:text-text-primary transition-colors"
            @click="store.clearReferenceImages()"
          >
            清空
          </button>
        </div>

        <!-- 已上传的参考图 -->
        <div v-if="store.referenceImages.length > 0" class="flex flex-wrap gap-2 mb-2">
          <div
            v-for="(img, idx) in store.referenceImages"
            :key="idx"
            class="relative w-16 h-16 rounded-lg overflow-hidden border border-border-subtle group"
          >
            <img :src="img" class="w-full h-full object-cover" alt="参考图" />
            <button
              class="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              @click="store.removeReferenceImage(idx)"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- 上传按钮 -->
        <div
          class="w-full py-3 rounded-lg border border-dashed border-border-subtle text-text-muted hover:border-cyan-500/50 hover:text-accent transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer"
          :class="isDragOver ? 'border-cyan-500 bg-cyan-500/5 text-accent' : ''"
          @click="triggerFileInput"
          @dragover.prevent="isDragOver = true"
          @dragleave.prevent="isDragOver = false"
          @drop.prevent="handleDrop"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          点击或拖拽上传参考图
        </div>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          multiple
          class="hidden"
          @change="handleFileUpload"
        />
      </div>

      <!-- 参数设置 -->
      <div>
        <h3 class="text-sm font-semibold text-text-primary mb-3">参数设置</h3>

        <!-- 比例 -->
        <div v-if="availableRatios.length > 0" class="mb-4">
          <label class="block text-xs text-text-secondary mb-2">比例</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="ratio in availableRatios"
              :key="ratio"
              class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200"
              :class="
                store.aspectRatio === ratio
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-accent'
                  : 'border-border-subtle bg-input-bg text-text-secondary hover:border-border-default hover:text-text-primary'
              "
              @click="store.aspectRatio = ratio"
            >
              {{ ratio }}
            </button>
          </div>
        </div>

        <!-- 分辨率 -->
        <div v-if="availableResolutions.length > 0" class="mb-4">
          <label class="block text-xs text-text-secondary mb-2">分辨率</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="res in availableResolutions"
              :key="res"
              class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200"
              :class="
                store.resolution === res
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-accent'
                  : 'border-border-subtle bg-input-bg text-text-secondary hover:border-border-default hover:text-text-primary'
              "
              @click="store.resolution = res"
            >
              {{ res }}
            </button>
          </div>
        </div>

        <!-- 图像质量 -->
        <div v-if="availableQualities.length > 0">
          <label class="block text-xs text-text-secondary mb-2">图像质量</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="q in availableQualities"
              :key="q"
              class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200"
              :class="
                store.quality === q
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-accent'
                  : 'border-border-subtle bg-input-bg text-text-secondary hover:border-border-default hover:text-text-primary'
              "
              @click="store.quality = q"
            >
              {{ q }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷入口 -->
    <div class="px-5 pt-3 shrink-0 flex items-center gap-2">
      <button
        class="flex-1 py-1.5 rounded-lg text-xs font-medium border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-default transition-colors"
        @click="router.push('/gallery')"
      >
        画夹
      </button>
      <button
        class="flex-1 py-1.5 rounded-lg text-xs font-medium border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-default transition-colors"
        @click="router.push('/prompt-templates')"
      >
        常用提示词
      </button>
    </div>

    <!-- 底部生成按钮 -->
    <div class="px-5 pb-5 pt-3 shrink-0">
      <button
        class="relative w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
        :class="
          store.isGenerating
            ? 'bg-gradient-to-r from-cyan-600 to-blue-600'
            : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 shadow-lg shadow-cyan-500/20'
        "
        :disabled="store.isGenerating"
        @click="$emit('generate')"
      >
        <!-- 按钮内底部进度条（绝对定位，不占额外高度） -->
        <div
          v-if="store.isGenerating"
          class="absolute bottom-0 left-0 h-0.5 bg-white/40 transition-all duration-300"
          :style="{ width: `${store.progress}%` }"
        />
        <svg v-if="store.isGenerating" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
        {{ store.isGenerating ? `生成中 ${store.progress}%` : '生成图像' }}
      </button>
    </div>

    <!-- 常用提示词快速选用面板 -->
    <teleport to="body">
      <div v-if="showPromptPopover">
        <!-- 透明遮罩 -->
        <div class="fixed inset-0 z-40" @click="showPromptPopover = false" />
        <!-- 面板：fixed 定位，避免被左侧 overflow 容器裁剪 -->
        <div
          class="fixed z-50 w-72 bg-surface border border-border-subtle rounded-xl shadow-xl"
          :style="popoverStyle"
        >
          <!-- 分类筛选 -->
          <div class="flex items-center gap-1 p-2 border-b border-border-subtle overflow-x-auto">
            <button
              class="px-2 py-1 rounded-md text-xs whitespace-nowrap transition-colors"
              :class="promptFilterCategoryId === '' ? 'bg-cyan-500/10 text-accent' : 'text-text-secondary hover:bg-elevated'"
              @click.stop="promptFilterCategoryId = ''"
            >
              全部
            </button>
            <button
              v-for="cat in store.promptCategories"
              :key="cat.id"
              class="px-2 py-1 rounded-md text-xs whitespace-nowrap transition-colors"
              :class="promptFilterCategoryId === cat.id ? 'bg-cyan-500/10 text-accent' : 'text-text-secondary hover:bg-elevated'"
              @click.stop="promptFilterCategoryId = cat.id"
            >
              {{ cat.name }}
            </button>
          </div>
          <!-- 提示词列表 -->
          <div class="max-h-64 overflow-y-auto p-1.5">
            <button
              v-for="tpl in filteredPromptTemplates"
              :key="tpl.id"
              class="w-full text-left px-2.5 py-2 rounded-lg hover:bg-elevated transition-colors"
              @click.stop="handleUsePrompt(tpl)"
            >
              <p class="text-xs font-medium text-text-primary truncate">{{ tpl.title }}</p>
              <p class="text-xs text-text-muted truncate mt-0.5">{{ tpl.content }}</p>
            </button>
            <p v-if="filteredPromptTemplates.length === 0" class="text-xs text-text-muted text-center py-6">
              暂无常用提示词
            </p>
          </div>
          <!-- 管理入口 -->
          <div class="border-t border-border-subtle p-1.5">
            <button
              class="w-full text-center text-xs text-accent hover:bg-cyan-500/10 rounded-lg py-1.5 transition-colors"
              @click.stop="goToPromptManager"
            >
              管理常用提示词
            </button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 保存提示词弹窗 -->
    <teleport to="body">
      <div
        v-if="showSavePromptDialog"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        @click="showSavePromptDialog = false"
      >
        <div
          class="w-80 bg-surface border border-border-subtle rounded-2xl shadow-2xl p-5"
          @click.stop
        >
          <h3 class="text-base font-semibold text-text-primary mb-4">保存为常用提示词</h3>
          <div class="space-y-3">
            <div>
              <label class="text-xs font-medium text-text-secondary block mb-1.5">标题（可选）</label>
              <input
                v-model="newPromptTitle"
                type="text"
                class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-cyan-500/50 transition-colors"
                placeholder="给这个提示词起个名字"
                @keyup.enter="confirmSavePrompt"
              />
            </div>
            <div>
              <label class="text-xs font-medium text-text-secondary block mb-1.5">分类</label>
              <select
                v-model="newPromptCategoryId"
                class="w-full bg-input-bg border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-cyan-500/50 transition-colors"
              >
                <option v-for="cat in store.promptCategories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>
            <div class="bg-input-bg border border-border-subtle rounded-lg px-3 py-2 max-h-24 overflow-y-auto">
              <p class="text-xs text-text-muted line-clamp-3">{{ store.prompt }}</p>
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button
              class="flex-1 py-2 rounded-lg text-sm text-text-secondary border border-border-subtle hover:bg-elevated transition-colors"
              @click="showSavePromptDialog = false"
            >
              取消
            </button>
            <button
              class="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-accent-gradient hover:opacity-90 transition-opacity"
              @click="confirmSavePrompt"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useImageStudioStore } from '@/stores/imageStudio'
import type { PromptTemplate } from '@/stores/imageStudio'

const store = useImageStudioStore()
const router = useRouter()

defineEmits<{
  generate: []
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)

// ===== 常用提示词 =====
const showPromptPopover = ref(false)
const promptFilterCategoryId = ref('')
const promptBtnRef = ref<HTMLButtonElement | null>(null)
const popoverStyle = ref<Record<string, string>>({})
const showSavePromptDialog = ref(false)
const newPromptTitle = ref('')
const newPromptCategoryId = ref('default')

/** 计算面板位置并打开/关闭 */
const togglePromptPopover = () => {
  if (showPromptPopover.value) {
    showPromptPopover.value = false
    return
  }
  const btn = promptBtnRef.value
  if (btn) {
    const rect = btn.getBoundingClientRect()
    const panelWidth = 288 // w-72
    // 优先右对齐按钮，若会超出左边则贴左边
    const left = Math.max(8, rect.right - panelWidth)
    popoverStyle.value = {
      left: `${left}px`,
      top: `${rect.bottom + 6}px`
    }
  }
  showPromptPopover.value = true
}

/** 按当前筛选分类过滤的提示词列表 */
const filteredPromptTemplates = computed(() => {
  const list = promptFilterCategoryId.value === ''
    ? store.promptTemplates
    : store.promptTemplates.filter(t => t.categoryId === promptFilterCategoryId.value)
  return [...list].sort((a, b) => b.createdAt - a.createdAt)
})

/** 使用某个提示词模板（覆盖填入） */
const handleUsePrompt = (tpl: PromptTemplate) => {
  store.usePromptTemplate(tpl)
  showPromptPopover.value = false
}

/** 保存当前提示词为常用 */
const handleSavePrompt = () => {
  if (!store.prompt.trim()) return
  newPromptTitle.value = ''
  newPromptCategoryId.value = 'default'
  showSavePromptDialog.value = true
}

/** 确认保存提示词 */
const confirmSavePrompt = () => {
  if (!store.prompt.trim()) return
  store.savePromptTemplate(newPromptTitle.value, store.prompt.trim(), newPromptCategoryId.value)
  showSavePromptDialog.value = false
}

/** 跳转到提示词管理页面 */
const goToPromptManager = () => {
  showPromptPopover.value = false
  router.push('/prompt-templates')
}

/** 触发文件选择 */
const triggerFileInput = () => {
  fileInputRef.value?.click()
}

/** 将文件列表转为 data URL 加入参考图 */
const addFiles = async (files: FileList | File[]) => {
  for (const file of Array.from(files)) {
    if (!file.type.startsWith('image/')) continue
    const dataUrl = await readFileAsDataUrl(file)
    store.addReferenceImage(dataUrl)
  }
}

/** 处理文件上传，转为 data URL 存入 store */
const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    await addFiles(input.files)
  }
  // 重置 input 以便重复选择同一文件
  input.value = ''
}

/** 处理拖拽放下 */
const handleDrop = async (event: DragEvent) => {
  isDragOver.value = false
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    await addFiles(event.dataTransfer.files)
  }
}

/** 读取文件为 data URL */
const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** 从模型配置解析参数列表 */
function parseList(value?: string): string[] {
  return (value || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

/** 当前模型可用的比例 */
const availableRatios = computed(() => parseList(store.currentModel?.aspectRatios))

/** 当前模型可用的分辨率 */
const availableResolutions = computed(() => parseList(store.currentModel?.resolutions))

/** 当前模型可用的质量选项 */
const availableQualities = computed(() => parseList(store.currentModel?.qualities))

/** 切换模型时，若当前选中的参数不在新模型可用列表中，则回退到第一个 */
watch([availableRatios, availableResolutions, availableQualities], () => {
  if (availableRatios.value.length > 0 && !availableRatios.value.includes(store.aspectRatio)) {
    store.aspectRatio = availableRatios.value[0]
  }
  if (availableResolutions.value.length > 0 && !availableResolutions.value.includes(store.resolution)) {
    store.resolution = availableResolutions.value[0]
  }
  if (availableQualities.value.length > 0 && !availableQualities.value.includes(store.quality)) {
    store.quality = availableQualities.value[0]
  }
}, { immediate: true })
</script>

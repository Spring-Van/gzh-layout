/**
 * 生图工作台 Store
 * 管理生图状态、历史记录、画夹分类
 * 数据持久化到 localStorage
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { comicDb } from '@/api/comic'
import { imageGenerationService } from '@/modules/comic/services/imageGenerationService'
import type { ModelConfig } from '@/modules/comic/types'

/** 生成的图片记录 */
export interface GeneratedImage {
  id: string
  url: string
  prompt: string
  /** 生成时使用的参考图（data URL 列表） */
  referenceImages?: string[]
  modelId: string
  modelName: string
  aspectRatio: string
  quality: string
  categoryIds: string[]
  createdAt: number
}

/** 画夹分类 */
export interface GalleryCategory {
  id: string
  name: string
  createdAt: number
}

/** 常用提示词分类 */
export interface PromptCategory {
  id: string
  name: string
  createdAt: number
}

/** 常用提示词模板 */
export interface PromptTemplate {
  id: string
  title: string
  content: string
  categoryId: string
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY_HISTORY = 'image-studio-history'
const STORAGE_KEY_CATEGORIES = 'image-studio-categories'
const STORAGE_KEY_PROMPT_TEMPLATES = 'image-studio-prompt-templates'
const STORAGE_KEY_PROMPT_CATEGORIES = 'image-studio-prompt-categories'

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data))
}

export const useImageStudioStore = defineStore('imageStudio', () => {
  // ===== 生图参数 =====
  const selectedModelId = ref<string>('')
  const prompt = ref('')
  const aspectRatio = ref('')
  const resolution = ref('')
  const quality = ref('')
  /** 参考图列表（data URL，便于预览与直接传入生图接口） */
  const referenceImages = ref<string[]>([])

  // ===== 生图状态 =====
  const isGenerating = ref(false)
  const progress = ref(0)
  const progressStatus = ref('')
  const currentImages = ref<GeneratedImage[]>([])
  const selectedImageIndex = ref(0)

  // ===== 历史记录 =====
  const history = ref<GeneratedImage[]>([])
  let historyLoadPromise: Promise<void> | null = null
  let historySavePromise = Promise.resolve()
  let historyRevision = 0

  // ===== 画夹分类 =====
  const categories = ref<GalleryCategory[]>(
    loadFromStorage<GalleryCategory[]>(STORAGE_KEY_CATEGORIES, [
      { id: 'default', name: '默认', createdAt: Date.now() }
    ])
  )

  // ===== 模型列表 =====
  const imageModels = ref<ModelConfig[]>([])

  const currentModel = computed(() =>
    imageModels.value.find(m => m.id === selectedModelId.value)
  )

  const currentImage = computed(() =>
    currentImages.value[selectedImageIndex.value] || null
  )

  /** 最近的历史记录（用于工作台展示） */
  const recentHistory = computed(() =>
    [...history.value].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8)
  )

  /** 加载图片模型列表 */
  const loadModels = async () => {
    const all = await comicDb.getAllModelConfigs()
    imageModels.value = all
      .filter(m => m.category === 'image')
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    // 默认选中第一个
    if (!selectedModelId.value && imageModels.value.length > 0) {
      selectedModelId.value = imageModels.value[0].id
    }
  }

  /** 持久化历史记录 */
  const loadHistory = async () => {
    if (historyLoadPromise) return historyLoadPromise

    historyLoadPromise = (async () => {
      const diskHistory = await window.electronAPI.imageHistory.load()
      const legacyHistory = loadFromStorage<GeneratedImage[]>(STORAGE_KEY_HISTORY, [])
      if (diskHistory.length === 0 && legacyHistory.length > 0) {
        history.value = await window.electronAPI.imageHistory.save(legacyHistory)
      } else {
        history.value = diskHistory
      }
      localStorage.removeItem(STORAGE_KEY_HISTORY)
    })().catch(error => {
      historyLoadPromise = null
      throw error
    })

    return historyLoadPromise
  }

  const persistHistory = async () => {
    const revision = ++historyRevision
    const snapshot = structuredClone(history.value)
    let saved: GeneratedImage[] = []
    historySavePromise = historySavePromise.then(async () => {
      saved = await window.electronAPI.imageHistory.save(snapshot)
      if (revision === historyRevision) history.value = saved
    })
    await historySavePromise
    return saved
  }

  /** 持久化分类 */
  const persistCategories = () => {
    saveToStorage(STORAGE_KEY_CATEGORIES, categories.value)
  }

  /** 执行生图 */
  const generate = async () => {
    const model = currentModel.value
    if (!model) return
    if (!model.apiKey) {
      throw new Error('请先在系统设置中配置模型的 API Key')
    }
    if (!prompt.value.trim()) {
      throw new Error('请输入提示词')
    }

    isGenerating.value = true
    progress.value = 0
    progressStatus.value = '准备中'
    currentImages.value = []
    selectedImageIndex.value = 0

    try {
      const result = await imageGenerationService.generateWithModel(
        model,
        prompt.value.trim(),
        referenceImages.value,
        aspectRatio.value,
        resolution.value,
        quality.value,
        (p, s) => {
          progress.value = p
          progressStatus.value = s
        }
      )

      if (result.success && result.imageUrls && result.imageUrls.length > 0) {
        // 记录当时的提示词与参考图快照
        const snapshotPrompt = prompt.value.trim()
        const snapshotRefs = referenceImages.value.length > 0 ? [...referenceImages.value] : undefined
        const images: GeneratedImage[] = result.imageUrls.map(url => ({
          id: uuidv4(),
          url,
          prompt: snapshotPrompt,
          referenceImages: snapshotRefs,
          modelId: model.id,
          modelName: model.name,
          aspectRatio: aspectRatio.value,
          quality: quality.value,
          categoryIds: ['default'],
          createdAt: Date.now()
        }))
        currentImages.value = images
        selectedImageIndex.value = 0
        // 添加到历史记录
        history.value = [...images, ...history.value]
        await persistHistory()
      } else {
        throw new Error(result.error || '生成失败')
      }
    } finally {
      isGenerating.value = false
      progress.value = 0
      progressStatus.value = ''
    }
  }

  /** 选中某张历史图片 */
  const selectFromHistory = (image: GeneratedImage) => {
    currentImages.value = [image]
    selectedImageIndex.value = 0
  }

  /** 选中最近生成的一张图片（用于进入工作台时默认展示） */
  const selectLatest = () => {
    if (history.value.length === 0) return
    const latest = [...history.value].sort((a, b) => b.createdAt - a.createdAt)[0]
    currentImages.value = [latest]
    selectedImageIndex.value = 0
  }

  /** 添加参考图（data URL） */
  const addReferenceImage = (dataUrl: string) => {
    referenceImages.value.push(dataUrl)
  }

  /** 复用某张图片的提示词、参考图及参数 */
  const reuseImage = (image: GeneratedImage) => {
    prompt.value = image.prompt
    referenceImages.value = image.referenceImages ? [...image.referenceImages] : []
    if (image.modelId && imageModels.value.some(m => m.id === image.modelId)) {
      selectedModelId.value = image.modelId
    }
    if (image.aspectRatio) aspectRatio.value = image.aspectRatio
    if (image.quality) quality.value = image.quality
  }

  /** 将指定图片作为参考图加入参考图列表 */
  const useAsReference = (image: GeneratedImage) => {
    if (!referenceImages.value.includes(image.url)) {
      referenceImages.value.push(image.url)
    }
  }

  /** 移除指定参考图 */
  const removeReferenceImage = (index: number) => {
    referenceImages.value.splice(index, 1)
  }

  /** 清空参考图 */
  const clearReferenceImages = () => {
    referenceImages.value = []
  }

  // ===== 画夹分类管理 =====

  const addCategory = (name: string) => {
    const cat: GalleryCategory = {
      id: uuidv4(),
      name,
      createdAt: Date.now()
    }
    categories.value.push(cat)
    persistCategories()
    return cat
  }

  const renameCategory = (id: string, name: string) => {
    const cat = categories.value.find(c => c.id === id)
    if (cat) {
      cat.name = name
      persistCategories()
    }
  }

  const deleteCategory = (id: string) => {
    categories.value = categories.value.filter(c => c.id !== id)
    // 从图片中移除该分类
    history.value = history.value.map(img => ({
      ...img,
      categoryIds: img.categoryIds.filter(cid => cid !== id)
    }))
    persistCategories()
    void persistHistory()
  }

  const toggleImageCategory = (imageId: string, categoryId: string) => {
    // 同步修改 history 中的对应图片
    history.value = history.value.map(img => {
      if (img.id !== imageId) return img
      const has = img.categoryIds.includes(categoryId)
      return {
        ...img,
        categoryIds: has
          ? img.categoryIds.filter(cid => cid !== categoryId)
          : [...img.categoryIds, categoryId]
      }
    })
    // 同步修改 currentImages 中的对应图片
    currentImages.value = currentImages.value.map(img => {
      if (img.id !== imageId) return img
      const has = img.categoryIds.includes(categoryId)
      return {
        ...img,
        categoryIds: has
          ? img.categoryIds.filter(cid => cid !== categoryId)
          : [...img.categoryIds, categoryId]
      }
    })
    void persistHistory()
  }

  const deleteImage = (imageId: string) => {
    history.value = history.value.filter(i => i.id !== imageId)
    currentImages.value = currentImages.value.filter(i => i.id !== imageId)
    if (selectedImageIndex.value >= currentImages.value.length) {
      selectedImageIndex.value = Math.max(0, currentImages.value.length - 1)
    }
    void persistHistory()
  }

  const clearHistory = () => {
    history.value = []
    void persistHistory()
  }

  /** 格式化相对时间 */
  const formatRelativeTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 30) return `${days}天前`
    return new Date(timestamp).toLocaleDateString('zh-CN')
  }

  // ===== 常用提示词 =====

  const promptCategories = ref<PromptCategory[]>(
    loadFromStorage<PromptCategory[]>(STORAGE_KEY_PROMPT_CATEGORIES, [
      { id: 'default', name: '默认', createdAt: Date.now() }
    ])
  )

  const promptTemplates = ref<PromptTemplate[]>(
    loadFromStorage<PromptTemplate[]>(STORAGE_KEY_PROMPT_TEMPLATES, [])
  )

  /** 按分类筛选的提示词列表 */
  const filteredPromptTemplates = computed(() => {
    // 不缓存，由调用方传 categoryId 过滤
    return promptTemplates.value
  })

  /** 持久化提示词模板 */
  const persistPromptTemplates = () => {
    saveToStorage(STORAGE_KEY_PROMPT_TEMPLATES, promptTemplates.value)
  }

  /** 持久化提示词分类 */
  const persistPromptCategories = () => {
    saveToStorage(STORAGE_KEY_PROMPT_CATEGORIES, promptCategories.value)
  }

  /** 添加提示词分类 */
  const addPromptCategory = (name: string): PromptCategory => {
    const cat: PromptCategory = {
      id: uuidv4(),
      name,
      createdAt: Date.now()
    }
    promptCategories.value.push(cat)
    persistPromptCategories()
    return cat
  }

  /** 重命名提示词分类 */
  const renamePromptCategory = (id: string, name: string) => {
    promptCategories.value = promptCategories.value.map(c =>
      c.id === id ? { ...c, name } : c
    )
    persistPromptCategories()
  }

  /** 删除提示词分类，其下模板归到默认分类 */
  const deletePromptCategory = (id: string) => {
    if (id === 'default') return
    promptCategories.value = promptCategories.value.filter(c => c.id !== id)
    promptTemplates.value = promptTemplates.value.map(t =>
      t.categoryId === id ? { ...t, categoryId: 'default' } : t
    )
    persistPromptCategories()
    persistPromptTemplates()
  }

  /** 保存提示词为常用模板 */
  const savePromptTemplate = (title: string, content: string, categoryId = 'default'): PromptTemplate => {
    const tpl: PromptTemplate = {
      id: uuidv4(),
      title: title.trim() || content.slice(0, 20),
      content,
      categoryId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    promptTemplates.value = [tpl, ...promptTemplates.value]
    persistPromptTemplates()
    return tpl
  }

  /** 更新提示词模板 */
  const updatePromptTemplate = (id: string, data: Partial<Pick<PromptTemplate, 'title' | 'content' | 'categoryId'>>) => {
    promptTemplates.value = promptTemplates.value.map(t =>
      t.id === id ? { ...t, ...data, updatedAt: Date.now() } : t
    )
    persistPromptTemplates()
  }

  /** 删除提示词模板 */
  const deletePromptTemplate = (id: string) => {
    promptTemplates.value = promptTemplates.value.filter(t => t.id !== id)
    persistPromptTemplates()
  }

  /** 使用某个提示词模板（覆盖填入提示词框） */
  const usePromptTemplate = (template: PromptTemplate) => {
    prompt.value = template.content
  }

  return {
    // 生图参数
    selectedModelId,
    prompt,
    aspectRatio,
    resolution,
    quality,
    referenceImages,
    // 生图状态
    isGenerating,
    progress,
    progressStatus,
    currentImages,
    selectedImageIndex,
    // 历史与分类
    history,
    categories,
    imageModels,
    // 常用提示词
    promptCategories,
    promptTemplates,
    filteredPromptTemplates,
    // 计算属性
    currentModel,
    currentImage,
    recentHistory,
    // 方法
    loadModels,
    loadHistory,
    generate,
    selectFromHistory,
    selectLatest,
    addReferenceImage,
    removeReferenceImage,
    clearReferenceImages,
    reuseImage,
    useAsReference,
    addCategory,
    renameCategory,
    deleteCategory,
    toggleImageCategory,
    deleteImage,
    clearHistory,
    formatRelativeTime,
    // 常用提示词方法
    addPromptCategory,
    renamePromptCategory,
    deletePromptCategory,
    savePromptTemplate,
    updatePromptTemplate,
    deletePromptTemplate,
    usePromptTemplate
  }
})

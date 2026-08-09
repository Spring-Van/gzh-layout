/**
 * Comic 同步至公众号 Store
 * 独立于 batchTypeset，仅管理单篇文章的同步状态
 * 数据持久化到 ComicProject.syncData
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ComicSyncData, ComicContentBlock } from '../types'

/** 预览模式 */
export type ComicPreviewMode = 'cover' | 'content'

/** 右栏配置 Tab */
export type ComicConfigTab = 'title' | 'cover' | 'layout'

/** 图片资源（对齐 src/types ImageFile 的子集，供预览组件使用） */
export interface ComicSyncImage {
  id: string
  path: string
  name: string
}

/** 默认同步数据 */
function createDefaultSyncData(): ComicSyncData {
  return {
    title: '',
    subtitle: '',
    sourceUrl: '',
    cover: {
      templateId: '',
      selectedImageIds: [],
    },
    layout: {
      templateId: '',
    },
    styleInsert: {
      header: { enabled: false, position: 'header', templateIds: [] },
      footer: { enabled: false, position: 'footer', templateIds: [] },
      between: { enabled: false, position: 'between', templateIds: [] },
    },
    contentBlocks: [],
    containerStyle: {},
  }
}

export const useComicSyncStore = defineStore('comicSync', () => {
  // === 状态 ===
  const projectId = ref<string>('')
  /** 漫画项目生成的图片列表（来自 generatedImages） */
  const sourceImages = ref<ComicSyncImage[]>([])
  /** 项目名称 */
  const projectName = ref<string>('')
  /** 预览模式 */
  const previewMode = ref<ComicPreviewMode>('cover')
  /** 右栏 Tab */
  const configTab = ref<ComicConfigTab>('title')
  /** 同步编辑数据 */
  const syncData = ref<ComicSyncData>(createDefaultSyncData())
  /** ContentPreview 用的 articleId（隔离用，确保不命中 batchTypeset） */
  const articleId = ref<string>('')
  /** 选中的公众号账号 ID */
  const wechatAccountId = ref<string>('')

  // === 计算属性 ===
  /** 当前标题 */
  const title = computed(() => syncData.value.title)
  /** 当前摘要 */
  const subtitle = computed(() => syncData.value.subtitle)
  /** 封面配置 */
  const coverConfig = computed(() => syncData.value.cover)
  /** 排版配置 */
  const layoutConfig = computed(() => syncData.value.layout)
  /** 样式插入配置 */
  const styleInsertConfig = computed(() => syncData.value.styleInsert)
  /** 内容块 */
  const contentBlocks = computed(() => syncData.value.contentBlocks)
  /** 容器样式 */
  const containerStyle = computed(() => syncData.value.containerStyle)

  // === Actions ===

  /** 标记初始化时是否检测到图片变化（调用方可据此自动重新生成封面） */
  const imagesChanged = ref(false)

  /**
   * 初始化：从漫画项目加载数据
   * @param id 项目 ID
   * @param name 项目名称
   * @param generatedImages 漫画生成的图片（Record<pageIndex, imagePath>）
   * @param savedSyncData 已保存的同步数据（可选）
   */
  function init(
    id: string,
    name: string,
    generatedImages: Record<string, string> | Record<number, string> | undefined,
    savedSyncData?: ComicSyncData,
  ) {
    projectId.value = id
    projectName.value = name
    articleId.value = `comic-sync-${id}`

    // 转换 generatedImages 为图片列表
    const images: ComicSyncImage[] = []
    if (generatedImages) {
      const entries = Object.entries(generatedImages)
        .map(([k, v]) => [Number(k), v] as [number, string])
        .filter(([, v]) => typeof v === 'string' && v.length > 0)
        .sort((a, b) => a[0] - b[0])
      entries.forEach(([idx, path], i) => {
        images.push({
          id: `page-${idx}`,
          path,
          name: `第${i + 1}页`,
        })
      })
    }
    sourceImages.value = images

    // 当前图片路径签名（仅路径，不含顺序变化以外的影响）
    const currentImageSignature = images.map((i) => i.path).join('|')

    // 恢复已保存的同步数据，否则用默认值（并预填标题/封面图）
    if (savedSyncData) {
      // 检测图片是否变化（重新解析/生图后路径会变）
      const savedSignature = savedSyncData.imageSignature || ''
      const changed = savedSignature !== currentImageSignature && currentImageSignature.length > 0
      imagesChanged.value = changed

      if (changed) {
        // 图片已变化：保留标题/摘要/排版/样式插入配置，但重置封面和正文
        syncData.value = {
          ...createDefaultSyncData(),
          ...savedSyncData,
          // 图片变化后旧的封面图和正文内容已失效，必须重置
          contentBlocks: [],
          containerStyle: {},
          imageSignature: currentImageSignature,
          cover: {
            ...createDefaultSyncData().cover,
            templateId: savedSyncData.cover?.templateId || '',
            pic_crop_235_1: savedSyncData.cover?.pic_crop_235_1,
            pic_crop_1_1: savedSyncData.cover?.pic_crop_1_1,
            // 重新选中第一张图片（数量由调用方按封面模板要求调整）
            selectedImageIds: images.length > 0 ? [images[0].id] : [],
            // 清除旧封面图，触发调用方重新生成
            generatedCoverImage: undefined,
            generatedCoverImagePath: undefined,
            imageCropRects: undefined,
          },
          layout: { ...createDefaultSyncData().layout, ...savedSyncData.layout },
          styleInsert: {
            ...createDefaultSyncData().styleInsert,
            ...savedSyncData.styleInsert,
          },
        }
        // 标题若为空则用项目名
        if (!syncData.value.title) syncData.value.title = name || ''
      } else {
        // 图片未变化：完整保留上次的所有编辑内容（标题/封面/正文/样式等）
        syncData.value = {
          ...createDefaultSyncData(),
          ...savedSyncData,
          // 保留用户编辑的正文内容（不再强制清空）
          contentBlocks: savedSyncData.contentBlocks || [],
          containerStyle: savedSyncData.containerStyle || {},
          imageSignature: currentImageSignature,
          cover: { ...createDefaultSyncData().cover, ...savedSyncData.cover },
          layout: { ...createDefaultSyncData().layout, ...savedSyncData.layout },
          styleInsert: {
            ...createDefaultSyncData().styleInsert,
            ...savedSyncData.styleInsert,
          },
        }
      }
      wechatAccountId.value = savedSyncData.wechatAccountId || ''
    } else {
      imagesChanged.value = false
      const fresh = createDefaultSyncData()
      // 默认标题用项目名
      fresh.title = name || ''
      // 默认封面选中第一张图
      fresh.cover.selectedImageIds = images.length > 0 ? [images[0].id] : []
      fresh.imageSignature = currentImageSignature
      // contentBlocks 留空：ContentPreview 会用 flow 模板自动渲染所有图片
      syncData.value = fresh
    }
  }

  /** 设置预览模式 */
  function setPreviewMode(mode: ComicPreviewMode) {
    previewMode.value = mode
  }

  /** 设置配置 Tab */
  function setConfigTab(tab: ComicConfigTab) {
    configTab.value = tab
  }

  /** 更新标题 */
  function updateTitle(title: string) {
    syncData.value.title = title
  }

  /** 更新摘要 */
  function updateSubtitle(subtitle: string) {
    syncData.value.subtitle = subtitle
  }

  /** 更新原文链接 */
  function updateSourceUrl(url: string) {
    syncData.value.sourceUrl = url
  }

  /** 更新封面配置 */
  function updateCoverConfig(config: Partial<ComicSyncData['cover']>) {
    syncData.value.cover = { ...syncData.value.cover, ...config }
  }

  /** 更新排版配置 */
  function updateLayoutConfig(config: Partial<ComicSyncData['layout']>) {
    syncData.value.layout = { ...syncData.value.layout, ...config }
  }

  /** 更新样式插入配置 */
  function updateStyleInsertConfig(
    config: Partial<ComicSyncData['styleInsert']>,
  ) {
    syncData.value.styleInsert = {
      ...syncData.value.styleInsert,
      ...config,
    }
  }

  /** 更新内容块 */
  function updateContentBlocks(
    blocks: ComicContentBlock[],
    style?: Record<string, string>,
  ) {
    syncData.value.contentBlocks = blocks
    if (style !== undefined) {
      syncData.value.containerStyle = style
    }
  }

  /** 设置公众号账号 ID */
  function setWechatAccountId(id: string) {
    wechatAccountId.value = id
    syncData.value.wechatAccountId = id
  }

  /** 更新图片顺序（管理图片素材后保存） */
  function updateSourceImagesOrder(images: ComicSyncImage[]) {
    sourceImages.value = [...images]
  }

  /** 导出用于持久化的数据（浅拷贝，IPC 传输时会自动序列化，无需手动深拷贝） */
  function exportData(): ComicSyncData {
    return { ...syncData.value }
  }

  return {
    // State
    projectId,
    sourceImages,
    projectName,
    previewMode,
    configTab,
    syncData,
    articleId,
    wechatAccountId,
    // 标记：初始化时是否检测到图片变化
    imagesChanged,
    // Computed
    title,
    subtitle,
    coverConfig,
    layoutConfig,
    styleInsertConfig,
    contentBlocks,
    containerStyle,
    // Actions
    init,
    setPreviewMode,
    setConfigTab,
    updateTitle,
    updateSubtitle,
    updateSourceUrl,
    updateCoverConfig,
    updateLayoutConfig,
    updateStyleInsertConfig,
    updateContentBlocks,
    setWechatAccountId,
    updateSourceImagesOrder,
    exportData,
  }
})

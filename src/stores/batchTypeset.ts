import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  GlobalConfig,
  BatchArticle,
  GlobalTitleConfig,
  GlobalCoverConfig,
  GlobalLayoutConfig,
  ArticleTitleConfig,
  ArticleCoverConfig,
  ArticleLayoutConfig,
  ConfigMode,
  ConfigTab,
  PreviewMode,
  NumberingRule,
} from '../types';
import { useTemplateStore } from './template';
import { useCoverTemplateStore } from './coverTemplate';

/**
 * 批量排版 Store
 * 管理全局设置和文章的配置、状态等
 */
export const useBatchTypesetStore = defineStore('batchTypeset', () => {
  // === 状态 ===

  // 全局配置
  const globalConfig = ref<GlobalConfig>({
    title: {
      enabled: true,
      prefix: '每日高级无字壁纸分享',
      numberingRule: 'vol',
      customFormat: '',
      separator: ' | ',
    },
    cover: {
      templateId: '',
      imageSource: 'default',
      showTitle: true,
      showSubtitle: true,
      cropMode: 'cover',
      selectedImageIds: [],
      coverImageIndices: [],
    },
    layout: {
      templateId: '',
      imageSortRule: 'original',
      imageFillMode: 'cover',
      imageStructure: 'flow',
    },
  });

  // 文章列表
  const articles = ref<BatchArticle[]>([]);

  // 当前选中的文章索引
  const currentArticleIndex = ref(0);

  // 右栏配置模式
  const configMode = ref<ConfigMode>('global');

  // 右栏 Tab
  const configTab = ref<ConfigTab>('title');

  // 预览模式
  const previewMode = ref<PreviewMode>('cover');

  // === 计算属性 ===

  // 当前选中的文章
  const currentArticle = computed(() => articles.value[currentArticleIndex.value]);

  // 当前文章是否有继承关系
  const currentArticleOverride = computed(() => currentArticle.value?.override);

  // 当前文章最终标题（继承全局 + 单篇覆盖）
  const currentArticleFinalTitle = computed(() => {
    const article = currentArticle.value;
    if (!article) return '';

    if (article.titleConfig.inheritGlobal) {
      const titleConfig = globalConfig.value.title;
      const numbering = generateNumbering(currentArticleIndex.value + 1, titleConfig.numberingRule);
      return `${titleConfig.prefix}${titleConfig.separator}${numbering}`;
    }

    return article.titleConfig.title;
  });

  // === Actions ===

  /**
   * 生成编号
   */
  function generateNumbering(index: number, rule: NumberingRule): string {
    switch (rule) {
      case 'none':
        return '';
      case 'vol':
        return `Vol.${index}`;
      case 'issue':
        return `第${index}期`;
      case 'custom':
        return globalConfig.value.title.customFormat.replace('{n}', String(index));
      default:
        return '';
    }
  }

  /**
   * 设置全局配置
   */
  function setGlobalConfig(config: Partial<GlobalConfig>) {
    globalConfig.value = { ...globalConfig.value, ...config };
  }

  /**
   * 设置全局标题配置
   */
  function setGlobalTitleConfig(config: Partial<GlobalTitleConfig>) {
    globalConfig.value.title = { ...globalConfig.value.title, ...config };
  }

  /**
   * 设置全局封面配置
   */
  function setGlobalCoverConfig(config: Partial<GlobalCoverConfig>) {
    globalConfig.value.cover = { ...globalConfig.value.cover, ...config };
  }

  /**
   * 设置全局排版配置
   */
  function setGlobalLayoutConfig(config: Partial<GlobalLayoutConfig>) {
    globalConfig.value.layout = { ...globalConfig.value.layout, ...config };
  }

  /**
   * 初始化文章列表
   */
  function initArticles(articleData: Array<{
    id: string;
    images: Array<{ id: string; path: string; name: string }>;
  }>) {
    // 获取第一个自定义排版模板 ID
    const templateStore = useTemplateStore();
    const firstLayoutTemplateId = templateStore.customTemplates.length > 0
      ? templateStore.customTemplates[0].id
      : '';

    // 获取第一个自定义封面模板 ID
    const coverTemplateStore = useCoverTemplateStore();
    const firstCoverTemplateId = coverTemplateStore.coverTemplates.length > 0
      ? coverTemplateStore.coverTemplates[0].id
      : '';

    articles.value = articleData.map((data) => ({
      id: data.id,
      titleConfig: {
        inheritGlobal: true,
        title: '',
        subtitle: '',
      },
      coverConfig: {
        inheritGlobal: true,
        templateId: firstCoverTemplateId,
        selectedImageIds: data.images.length > 0 ? data.images.slice(0, 6).map(img => img.id) : [],
        cropMode: 'cover',
      },
      layoutConfig: {
        inheritGlobal: true,
        templateId: firstLayoutTemplateId,
      },
      images: data.images,
      override: {
        title: false,
        cover: false,
        layout: false,
      },
    }));

    // 更新全局配置的模板 ID
    if (firstLayoutTemplateId) {
      globalConfig.value.layout.templateId = firstLayoutTemplateId;
    }
    if (firstCoverTemplateId) {
      globalConfig.value.cover.templateId = firstCoverTemplateId;
    }

    currentArticleIndex.value = 0;
  }

  /**
   * 选择文章
   */
  function selectArticle(index: number) {
    if (index >= 0 && index < articles.value.length) {
      currentArticleIndex.value = index;
    }
  }

  /**
   * 更新当前文章标题配置
   */
  function updateCurrentArticleTitleConfig(config: Partial<ArticleTitleConfig>) {
    const article = currentArticle.value;
    if (!article) return;

    article.titleConfig = { ...article.titleConfig, ...config };

    if (!config.inheritGlobal && config.title) {
      article.override.title = true;
    } else if (config.inheritGlobal) {
      article.override.title = false;
    }
  }

  /**
   * 更新当前文章封面配置
   */
  function updateCurrentArticleCoverConfig(config: Partial<ArticleCoverConfig>) {
    const article = currentArticle.value;
    if (!article) return;

    article.coverConfig = { ...article.coverConfig, ...config };

    if (!config.inheritGlobal) {
      article.override.cover = true;
    } else if (config.inheritGlobal) {
      article.override.cover = false;
    }
  }

  /**
   * 根据索引更新文章封面配置
   */
  function updateArticleCoverConfigByIndex(
    index: number,
    config: Partial<ArticleCoverConfig>,
  ) {
    if (index < 0 || index >= articles.value.length) return;

    const article = articles.value[index];
    article.coverConfig = { ...article.coverConfig, ...config };

    if (!config.inheritGlobal) {
      article.override.cover = true;
    } else if (config.inheritGlobal) {
      article.override.cover = false;
    }
  }

  /**
   * 更新当前文章排版配置
   */
  function updateCurrentArticleLayoutConfig(config: Partial<ArticleLayoutConfig>) {
    const article = currentArticle.value;
    if (!article) return;

    article.layoutConfig = { ...article.layoutConfig, ...config };

    if (!config.inheritGlobal) {
      article.override.layout = true;
    } else if (config.inheritGlobal) {
      article.override.layout = false;
    }
  }

  /**
   * 更新当前文章图片
   */
  function updateCurrentArticleImages(images: any[]) {
    const article = currentArticle.value;
    if (!article) return;
    article.images = images;
  }

  /**
   * 设置配置模式
   */
  function setConfigMode(mode: ConfigMode) {
    configMode.value = mode;
  }

  /**
   * 设置配置 Tab
   */
  function setConfigTab(tab: ConfigTab) {
    configTab.value = tab;
  }

  /**
   * 设置预览模式
   */
  function setPreviewMode(mode: PreviewMode) {
    previewMode.value = mode;
  }

  /**
   * 批量应用标题
   */
  function applyBatchTitles() {
    articles.value.forEach((article) => {
      article.titleConfig.inheritGlobal = true;
      article.override.title = false;
    });
  }

  /**
   * 根据全局配置的封面图片序号更新各文章的封面图片
   */
  function updateArticlesCoverImagesByIndices() {
    const { coverImageIndices } = globalConfig.value.cover;
    if (!coverImageIndices || coverImageIndices.length === 0) {
      return;
    }

    articles.value.forEach((article) => {
      const selectedImageIds: string[] = [];
      coverImageIndices.forEach((index) => {
        if (article.images[index - 1]) {
          selectedImageIds.push(article.images[index - 1].id);
        }
      });

      article.coverConfig.selectedImageIds = selectedImageIds;
    });
  }

  return {
    // State
    globalConfig,
    articles,
    currentArticleIndex,
    configMode,
    configTab,
    previewMode,

    // Computed
    currentArticle,
    currentArticleOverride,
    currentArticleFinalTitle,

    // Actions
    setGlobalConfig,
    setGlobalTitleConfig,
    setGlobalCoverConfig,
    setGlobalLayoutConfig,
    initArticles,
    selectArticle,
    updateCurrentArticleTitleConfig,
    updateCurrentArticleCoverConfig,
    updateArticleCoverConfigByIndex,
    updateCurrentArticleLayoutConfig,
    updateCurrentArticleImages,
    setConfigMode,
    setConfigTab,
    setPreviewMode,
    applyBatchTitles,
    generateNumbering,
    updateArticlesCoverImagesByIndices,
  };
});

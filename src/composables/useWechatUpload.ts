import { ref, onUnmounted } from 'vue';
import {
  wechatBatchUpload,
  wechatClearTokenCache,
  onWechatUploadProgress,
} from '../api/wechat';
import type {
  UploadArticleParams,
  BatchUploadResult,
  UploadProgress,
  ArticleUploadResult,
} from '../api/wechat';
import type { BatchArticle, GlobalConfig } from '../types';
import { expandTemplateWithImages } from './useTemplateRender';

export interface WechatUploadOptions {
  appId: string;
  appSecret: string;
  publish?: boolean;
  webpConvertedMap?: Record<string, string>; // webp原路径 -> 转换后png路径
}

/**
 * 根据模板 HTML 和图片列表生成正文内容 HTML
 * 使用本地文件路径作为 src，上传后由 Electron 层替换为微信 URL
 * 内部调用 expandTemplateWithImages 按行单元循环展开
 */
export function buildContentHtmlFromTemplate(
  templateHtml: string,
  images: Array<{ id: string; path: string; name: string }>,
): string {
  if (images.length === 0) return templateHtml;
  return expandTemplateWithImages(templateHtml, images);
}

/**
 * 为 flow/card 内置模板生成 HTML
 */
export function buildBuiltinTemplateHtml(
  templateId: string,
  images: Array<{ id: string; path: string; name: string }>,
): string {
  if (templateId === "flow") {
    return images
      .map(
        (img) =>
          `<p><img src="${img.path}" style="max-width:100%;display:block;margin:0 auto;"/></p>`,
      )
      .join("\n");
  }

  if (templateId === "card") {
    return images
      .map(
        (img, idx) =>
          `<section style="padding:14px;background:#fff;box-shadow:0 4px 16px -4px rgba(0,0,0,0.06);border-radius:24px;margin-bottom:24px;border:1px solid #f1f5f9;display:flex;flex-direction:column;align-items:center;"><img src="${img.path}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:16px;margin-bottom:12px;"/><span style="font-size:10px;color:#cbd5e1;font-family:monospace;letter-spacing:2px;font-style:italic;">FIG. ${String(idx + 1).padStart(2, "0")}</span></section>`,
      )
      .join("\n");
  }

  return images
    .map(
      (img) =>
        `<p><img src="${img.path}" style="max-width:100%;display:block;margin:0 auto;"/></p>`,
    )
    .join("\n");
}

export interface SyncArticleItem {
  id: string;
  title: string;
  summary: string;
  coverImagePath: string;
  contentImagePaths: string[];
  contentHtml?: string;
  picCrop2351?: string;
  picCrop11?: string;
  generatedCoverImage?: string;
  generatedCoverImagePath?: string;
}

type ArticleSyncStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface BuildArticleParamsOptions {
  buildContentHtml?: (article: BatchArticle, globalConfig: GlobalConfig, index: number) => string;
}

export function useWechatUpload() {
  const isUploading = ref(false);
  const uploadSuccess = ref(false);
  const uploadError = ref<string | null>(null);
  const consoleLogs = ref<string[]>([]);
  const articleStatuses = ref<ArticleSyncStatus[]>([]);
  const currentProgress = ref<UploadProgress | null>(null);
  const uploadResults = ref<ArticleUploadResult[]>([]);

  let unsubscribeProgress: (() => void) | null = null;

  onUnmounted(() => {
    unsubscribeProgress?.();
  });

  function log(message: string) {
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    consoleLogs.value.push(`[${timestamp}] ${message}`);
  }

  function buildArticleParams(
    articles: BatchArticle[],
    globalConfig: GlobalConfig,
    options?: BuildArticleParamsOptions,
  ): SyncArticleItem[] {
    return articles.map((article, index) => {
      const title = resolveArticleTitle(article, globalConfig, index);
      const summary = resolveArticleSubtitle(article, globalConfig);
      const coverImage = resolveCoverImage(article);
      const contentImages = article.images.map(img => img.path);
      const contentHtml = options?.buildContentHtml?.(article, globalConfig, index) ?? undefined;

      return {
        id: article.id,
        title,
        summary: summary || title,
        coverImagePath: coverImage,
        contentImagePaths: contentImages,
        contentHtml,
        picCrop2351: article.coverConfig.pic_crop_235_1 || globalConfig.cover.pic_crop_235_1,
        picCrop11: article.coverConfig.pic_crop_1_1 || globalConfig.cover.pic_crop_1_1,
        generatedCoverImage: article.coverConfig.generatedCoverImage,
        generatedCoverImagePath: article.coverConfig.generatedCoverImagePath,
      };
    });
  }

  function resolveArticleTitle(article: BatchArticle, globalConfig: GlobalConfig, index: number): string {
    if (article.titleConfig.inheritGlobal) {
      const titleConfig = globalConfig.title;
      const numbering = generateNumbering(index + 1, titleConfig.numberingRule, titleConfig.customFormat);
      return `${titleConfig.prefix}${titleConfig.separator}${numbering}`;
    }
    return article.titleConfig.title;
  }

  function resolveArticleSubtitle(article: BatchArticle, globalConfig: GlobalConfig): string {
    if (article.titleConfig.inheritGlobal) {
      return globalConfig.title.subtitle || '';
    }
    return article.titleConfig.subtitle || '';
  }

  function generateNumbering(index: number, rule: string, customFormat: string): string {
    switch (rule) {
      case 'none': return '';
      case 'vol': return `Vol.${index}`;
      case 'issue': return `第${index}期`;
      case 'custom': return customFormat.replace('{n}', String(index));
      default: return '';
    }
  }

  function resolveCoverImage(article: BatchArticle): string {
    // 优先使用已生成的封面图路径
    if (article.coverConfig.generatedCoverImagePath) {
      return article.coverConfig.generatedCoverImagePath;
    }

    // 否则使用选中的图片
    const selectedIds = article.coverConfig.selectedImageIds;
    if (selectedIds && selectedIds.length > 0) {
      const found = article.images.find(img => selectedIds.includes(img.id));
      if (found) return found.path;
    }
    return '';
  }

  async function startBatchUpload(
    syncArticles: SyncArticleItem[],
    options: WechatUploadOptions
  ): Promise<BatchUploadResult> {
    isUploading.value = true;
    uploadSuccess.value = false;
    uploadError.value = null;
    consoleLogs.value = [];
    uploadResults.value = [];
    articleStatuses.value = syncArticles.map(() => 'pending');

    unsubscribeProgress = onWechatUploadProgress((progress: UploadProgress) => {
      currentProgress.value = progress;
      log(progress.message);

      if (progress.step === 'cover' || progress.step === 'images') {
        articleStatuses.value[progress.currentArticleIndex] = 'processing';
      }

      if (progress.step === 'done') {
        if (progress.message.includes('失败')) {
          articleStatuses.value[progress.currentArticleIndex] = 'failed';
        }
      }
    });

    log(`开始批量上传，共 ${syncArticles.length} 篇文章`);
    log(`AppID: ${options.appId.slice(0, 6)}****`);

    try {
      const uploadParams: UploadArticleParams[] = await Promise.all(
        syncArticles.map(async (article, index) => {
          let coverImagePath = article.coverImagePath;

          // 如果已经有生成的封面图路径，直接使用
          if (article.generatedCoverImagePath) {
            log(`[${index + 1}/${syncArticles.length}] 使用已生成的封面图：${article.generatedCoverImagePath}`);
            coverImagePath = article.generatedCoverImagePath;
          }

          // WebP 路径替换：如果封面图是 webp，使用转换后的路径
          coverImagePath = resolveWebpPath(coverImagePath, options.webpConvertedMap);

          // WebP 路径替换：正文图片路径
          const resolvedContentImagePaths = article.contentImagePaths.map(
            (p) => resolveWebpPath(p, options.webpConvertedMap)
          );

          // WebP 路径替换：HTML 内容中的本地路径
          let resolvedContentHtml = article.contentHtml;
          if (resolvedContentHtml && options.webpConvertedMap) {
            for (const [originalPath, convertedPath] of Object.entries(options.webpConvertedMap)) {
              resolvedContentHtml = resolvedContentHtml.split(originalPath).join(convertedPath);
            }
          }

          return {
            title: article.title,
            coverImagePath,
            contentImagePaths: resolvedContentImagePaths,
            contentHtml: resolvedContentHtml,
            digest: article.summary,
            picCrop2351: article.picCrop2351,
            picCrop11: article.picCrop11,
          };
        })
      );

      const result = await wechatBatchUpload({
        appId: options.appId,
        appSecret: options.appSecret,
        articles: uploadParams,
        publish: options.publish ?? false,
      });

      if (result.success) {
        uploadSuccess.value = true;
        uploadResults.value = result.results;

        result.results.forEach((_, index) => {
          articleStatuses.value[index] = 'success';
        });

        log('-------------------------------------------');
        log(`[SYS] 所有矩阵草稿同步完毕。共 ${result.results.length} 篇。`);
        result.results.forEach((r, i) => {
          log(`  草稿 ${i + 1}: ${r.title} → Draft_ID: ${r.draftMediaId}`);
        });
      } else {
        uploadError.value = result.error ?? '未知错误';
        log(`[ERROR] 上传失败: ${result.error}`);

        result.results.forEach((_, index) => {
          articleStatuses.value[index] = 'success';
        });
        if (result.results.length < syncArticles.length) {
          for (let i = result.results.length; i < syncArticles.length; i++) {
            articleStatuses.value[i] = 'failed';
          }
        }
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      uploadError.value = message;
      log(`[ERROR] 异常: ${message}`);
      return { success: false, results: [], error: message };
    } finally {
      isUploading.value = false;
      unsubscribeProgress?.();
      unsubscribeProgress = null;
    }
  }

  function reset() {
    isUploading.value = false;
    uploadSuccess.value = false;
    uploadError.value = null;
    consoleLogs.value = [];
    articleStatuses.value = [];
    currentProgress.value = null;
    uploadResults.value = [];
    wechatClearTokenCache();
  }

  /**
   * 根据映射表将 WebP 路径替换为转换后的 PNG 路径
   */
  function resolveWebpPath(imagePath: string, webpConvertedMap?: Record<string, string>): string {
    if (!imagePath || !webpConvertedMap) return imagePath;
    return webpConvertedMap[imagePath] || imagePath;
  }

  return {
    isUploading,
    uploadSuccess,
    uploadError,
    consoleLogs,
    articleStatuses,
    currentProgress,
    uploadResults,
    buildArticleParams,
    startBatchUpload,
    reset,
  };
}

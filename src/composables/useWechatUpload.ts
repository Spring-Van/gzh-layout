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

export interface WechatUploadOptions {
  appId: string;
  appSecret: string;
  publish?: boolean;
}

export interface SyncArticleItem {
  id: string;
  title: string;
  summary: string;
  coverImagePath: string;
  contentImagePaths: string[];
  picCrop2351?: string;
  picCrop11?: string;
}

type ArticleSyncStatus = 'pending' | 'processing' | 'success' | 'failed';

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
    globalConfig: GlobalConfig
  ): SyncArticleItem[] {
    return articles.map((article, index) => {
      const title = resolveArticleTitle(article, globalConfig, index);
      const coverImage = resolveCoverImage(article);
      const contentImages = article.images.map(img => img.path);

      return {
        id: article.id,
        title,
        summary: article.titleConfig.subtitle || title,
        coverImagePath: coverImage,
        contentImagePaths: contentImages,
        picCrop2351: article.coverConfig.pic_crop_235_1 || globalConfig.cover.pic_crop_235_1,
        picCrop11: article.coverConfig.pic_crop_1_1 || globalConfig.cover.pic_crop_1_1,
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
    const selectedIds = article.coverConfig.selectedImageIds;
    if (selectedIds && selectedIds.length > 0) {
      const found = article.images.find(img => selectedIds.includes(img.id));
      if (found) return found.path;
    }
    return article.images.length > 0 ? article.images[0].path : '';
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
      const uploadParams: UploadArticleParams[] = syncArticles.map(article => ({
        title: article.title,
        coverImagePath: article.coverImagePath,
        contentImagePaths: article.contentImagePaths,
        digest: article.summary,
        picCrop2351: article.picCrop2351,
        picCrop11: article.picCrop11,
      }));

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

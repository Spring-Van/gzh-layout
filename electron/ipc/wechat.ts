import { ipcMain } from 'electron';
import { wechatService } from '../services/wechat.service';
import type { BatchUploadProgress } from '../services/wechat.service';
import type { WechatAccountInfo, AuthResult } from '../services/wechat.service';

export type { WechatAccountInfo, AuthResult };

export interface UploadArticleParams {
  title: string;
  coverImagePath: string;
  contentImagePaths: string[];
  author?: string;
  digest?: string;
  picCrop2351?: string;
  picCrop11?: string;
}

export interface BatchUploadParams {
  appId: string;
  appSecret: string;
  articles: UploadArticleParams[];
  publish?: boolean;
}

export interface ArticleUploadResult {
  title: string;
  draftMediaId: string;
  coverUrl: string;
  publishId?: string;
}

export function registerWechatIpc() {
  ipcMain.handle('wechat:getAccessToken', async (_, appId: string, appSecret: string) => {
    return wechatService.getAccessToken(appId, appSecret);
  });

  ipcMain.handle('wechat:clearTokenCache', async () => {
    wechatService.clearTokenCache();
  });

  ipcMain.handle('wechat:getAccountInfo', async (_, accessToken: string) => {
    return wechatService.getAccountInfo(accessToken);
  });

  ipcMain.handle('wechat:authenticate', async (_, appId: string, appSecret: string) => {
    return wechatService.authenticate(appId, appSecret);
  });

  ipcMain.handle('wechat:verifyToken', async (_, accessToken: string) => {
    return wechatService.verifyToken(accessToken);
  });

  ipcMain.handle('wechat:getTokenCacheInfo', async () => {
    return wechatService.getTokenCacheInfo();
  });

  ipcMain.handle('wechat:uploadCoverImage', async (_, accessToken: string, imagePath: string) => {
    return wechatService.uploadCoverImage(accessToken, imagePath);
  });

  ipcMain.handle('wechat:uploadContentImage', async (_, accessToken: string, imagePath: string) => {
    return wechatService.uploadContentImage(accessToken, imagePath);
  });

  ipcMain.handle('wechat:batchUploadContentImages', async (_, accessToken: string, imagePaths: string[]) => {
    return wechatService.batchUploadContentImages(accessToken, imagePaths);
  });

  ipcMain.handle('wechat:createDraft', async (_, accessToken: string, params: {
    title: string;
    thumbMediaId: string;
    author?: string;
    digest?: string;
    content: string;
    contentSourceUrl?: string;
    needOpenComment?: number;
    onlyFansCanComment?: number;
    picCrop2351?: string;
    picCrop11?: string;
  }) => {
    return wechatService.createDraft(accessToken, params);
  });

  ipcMain.handle('wechat:publishDraft', async (_, accessToken: string, draftMediaId: string) => {
    return wechatService.publishDraft(accessToken, draftMediaId);
  });

  ipcMain.handle('wechat:buildArticleHtml', async (_, title: string, imageUrls: string[]) => {
    return wechatService.buildArticleHtml(title, imageUrls);
  });

  ipcMain.handle('wechat:calculateCropParams', async (_, originalRatio?: number) => {
    return wechatService.calculateCropParams(originalRatio);
  });

  ipcMain.handle('wechat:batchUpload', async (event, params: BatchUploadParams) => {
    const { appId, appSecret, articles, publish = false } = params;
    const results: ArticleUploadResult[] = [];
    const sender = event.sender;

    const sendProgress = (progress: BatchUploadProgress) => {
      try {
        if (!sender.isDestroyed()) {
          sender.send('wechat:uploadProgress', progress);
        }
      } catch {}
    };

    try {
      sendProgress({
        currentArticleIndex: 0,
        totalArticles: articles.length,
        step: 'token',
        message: '正在获取 AccessToken...',
      });

      let accessToken: string;
      if (appSecret) {
        accessToken = await wechatService.getAccessToken(appId, appSecret);
      } else {
        const tokenInfo = wechatService.getTokenCacheInfo();
        if (tokenInfo && tokenInfo.expiresAt > Date.now()) {
          accessToken = tokenInfo.accessToken;
        } else {
          throw new Error('AccessToken 已过期，请重新鉴权');
        }
      }

      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];

        sendProgress({
          currentArticleIndex: i,
          totalArticles: articles.length,
          step: 'cover',
          message: `[${i + 1}/${articles.length}] 正在上传封面图...`,
        });

        const coverResult = await wechatService.uploadCoverImage(accessToken, article.coverImagePath);

        sendProgress({
          currentArticleIndex: i,
          totalArticles: articles.length,
          step: 'images',
          message: `[${i + 1}/${articles.length}] 正在上传正文图片 (${article.contentImagePaths.length} 张)...`,
        });

        const contentResults = await wechatService.batchUploadContentImages(
          accessToken,
          article.contentImagePaths,
          (p) => sendProgress({ ...p, currentArticleIndex: i, totalArticles: articles.length }),
          i,
          articles.length,
        );

        sendProgress({
          currentArticleIndex: i,
          totalArticles: articles.length,
          step: 'draft',
          message: `[${i + 1}/${articles.length}] 正在创建草稿...`,
        });

        const imageUrls = contentResults.map(r => r.url);
        const htmlContent = wechatService.buildArticleHtml(article.title, imageUrls);

        const draftMediaId = await wechatService.createDraft(accessToken, {
          title: article.title,
          thumbMediaId: coverResult.mediaId,
          author: article.author,
          digest: article.digest,
          content: htmlContent,
          picCrop2351: article.picCrop2351,
          picCrop11: article.picCrop11,
        });

        const result: ArticleUploadResult = {
          title: article.title,
          draftMediaId,
          coverUrl: coverResult.url,
        };

        if (publish) {
          sendProgress({
            currentArticleIndex: i,
            totalArticles: articles.length,
            step: 'publish',
            message: `[${i + 1}/${articles.length}] 正在发布草稿...`,
          });

          result.publishId = await wechatService.publishDraft(accessToken, draftMediaId);
        }

        results.push(result);

        if (i < articles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      sendProgress({
        currentArticleIndex: articles.length,
        totalArticles: articles.length,
        step: 'done',
        message: `全部完成！共处理 ${articles.length} 篇文章。`,
      });

      return { success: true, results };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendProgress({
        currentArticleIndex: results.length,
        totalArticles: articles.length,
        step: 'done',
        message: `上传失败: ${message}`,
      });
      return { success: false, error: message, results };
    }
  });
}

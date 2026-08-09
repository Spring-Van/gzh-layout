import { ipcMain } from 'electron';
import { wechatService } from '../services/wechat.service';
import type { BatchUploadProgress } from '../services/wechat.service';
import type { WechatAccountInfo, AuthResult } from '../services/wechat.service';

export type { WechatAccountInfo, AuthResult };

export interface UploadArticleParams {
  title: string;
  coverImagePath: string;
  contentImagePaths: string[];
  contentHtml?: string;
  author?: string;
  digest?: string;
  contentSourceUrl?: string;
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
  publishError?: string;
}

function minifyHtml(html: string): string {
  return html
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .trim();
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
      } catch { }
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
        let htmlContent: string;

        if (article.contentHtml) {
          htmlContent = article.contentHtml;
          for (let j = 0; j < contentResults.length; j++) {
            const originalPath = contentResults[j].originalPath;
            const wechatUrl = contentResults[j].url;
            const normalizedPath = originalPath.replace(/\\/g, '/');
            const encodedPath = encodeURIComponent(normalizedPath).replace(/%2F/g, '/');
            // 先替换 file:// 变体（长匹配优先），避免 raw path 子串误匹配破坏 file:// URL
            htmlContent = htmlContent.split(`file:///${encodedPath.replace(/^\//, '')}`).join(wechatUrl);
            htmlContent = htmlContent.split(`file://${encodedPath}`).join(wechatUrl);
            htmlContent = htmlContent.split(`file:///${normalizedPath.replace(/^\//, '')}`).join(wechatUrl);
            htmlContent = htmlContent.split(`file://${normalizedPath}`).join(wechatUrl);
            // 最后替换裸路径（此时 file:// 变体已全部处理完，不会被误匹配）
            htmlContent = htmlContent.split(originalPath).join(wechatUrl);
          }
        } else {
          htmlContent = wechatService.buildArticleHtml(article.title, imageUrls);
        }

        htmlContent = minifyHtml(htmlContent);

        const draftMediaId = await wechatService.createDraft(accessToken, {
          title: article.title,
          thumbMediaId: coverResult.mediaId,
          author: article.author,
          digest: article.digest,
          content: htmlContent,
          contentSourceUrl: article.contentSourceUrl,
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

          try {
            result.publishId = await wechatService.publishDraft(accessToken, draftMediaId);
          } catch (publishErr) {
            const publishMessage = publishErr instanceof Error ? publishErr.message : String(publishErr);
            result.publishError = publishMessage;
            // 发布失败单独发 publish 事件，不影响后续重命名逻辑
            sendProgress({
              currentArticleIndex: i,
              totalArticles: articles.length,
              step: 'publish',
              message: `[${i + 1}/${articles.length}] 草稿已创建，但发布失败：${publishMessage}`,
            });
          }
        }

        results.push(result);

        // 单篇同步完成（草稿创建成功，无论发布是否成功）
        // 前端基于此事件触发分组文件夹重命名为文章标题
        sendProgress({
          currentArticleIndex: i,
          totalArticles: articles.length,
          step: 'done',
          message: `[${i + 1}/${articles.length}] 同步成功：${article.title}`,
        });

        if (i < articles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // 全部完成的汇总事件（currentArticleIndex === totalArticles，前端据此区分单篇 vs 全部）
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

import fs from 'fs-extra';
import path from 'path';
import { Buffer } from 'node:buffer';

const WECHAT_API_BASE = 'https://api.weixin.qq.com';
const TOKEN_EXPIRE_BUFFER = 300;
const BOUNDARY_PREFIX = '----WechatFormBoundary';

interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
  errcode?: number;
  errmsg?: string;
}

interface UploadMaterialResponse {
  media_id: string;
  url: string;
  errcode?: number;
  errmsg?: string;
}

interface UploadImgResponse {
  url: string;
  errcode?: number;
  errmsg?: string;
}

interface DraftAddResponse {
  media_id: string;
  errcode?: number;
  errmsg?: string;
}

interface FreepublishSubmitResponse {
  publish_id: string;
  errcode?: number;
  errmsg?: string;
}

interface CallbackIpResponse {
  ip_list: string[];
  errcode?: number;
  errmsg?: string;
}

export interface WechatAccountInfo {
  nickname: string;
  headImg: string;
  serviceType: number;
  verifyType: number;
  userName: string;
  alias: string;
  qrcodeUrl: string;
}

export interface AuthResult {
  success: boolean;
  accessToken: string;
  expiresIn: number;
  accountInfo: WechatAccountInfo;
}

export interface WechatTokenCache {
  accessToken: string;
  expiresAt: number;
}

export interface CoverUploadResult {
  mediaId: string;
  url: string;
}

export interface ContentImageResult {
  originalPath: string;
  url: string;
}

export interface DraftCreateParams {
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
}

export interface BatchUploadProgress {
  currentArticleIndex: number;
  totalArticles: number;
  step: 'token' | 'cover' | 'images' | 'draft' | 'publish' | 'done';
  message: string;
}

export type ProgressCallback = (progress: BatchUploadProgress) => void;

function generateBoundary(): string {
  return `${BOUNDARY_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function buildMultipartBody(fieldName: string, fileName: string, fileBuffer: Buffer, mimeType: string): { body: Buffer; contentType: string; boundary: string } {
  const boundary = generateBoundary();
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
    'utf-8'
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
  return {
    body: Buffer.concat([header, fileBuffer, footer]),
    contentType: `multipart/form-data; boundary=${boundary}`,
    boundary,
  };
}

class WechatService {
  private tokenCache: WechatTokenCache | null = null;

  async getAccessToken(appId: string, appSecret: string): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.accessToken;
    }

    const url = `${WECHAT_API_BASE}/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`;

    const response = await fetch(url);
    const data: AccessTokenResponse = await response.json();

    if (data.errcode) {
      throw new Error(`获取AccessToken失败 [${data.errcode}]: ${data.errmsg}`);
    }

    this.tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in - TOKEN_EXPIRE_BUFFER) * 1000,
    };

    return data.access_token;
  }

  clearTokenCache(): void {
    this.tokenCache = null;
  }

  getTokenCacheInfo(): WechatTokenCache | null {
    return this.tokenCache;
  }

  async getAccountInfo(accessToken: string): Promise<WechatAccountInfo> {
    const verifyUrl = `${WECHAT_API_BASE}/cgi-bin/getcallbackip?access_token=${accessToken}`;
    const verifyResponse = await fetch(verifyUrl);
    const verifyData: CallbackIpResponse = await verifyResponse.json();

    if (verifyData.errcode) {
      throw new Error(`Token 校验失败 [${verifyData.errcode}]: ${verifyData.errmsg}`);
    }

    const infoUrl = `${WECHAT_API_BASE}/cgi-bin/account/getaccountbasicinfo?access_token=${accessToken}`;
    const infoResponse = await fetch(infoUrl, { method: 'POST' });
    const infoData = await infoResponse.json();

    if (infoData.errcode) {
      return {
        nickname: '',
        headImg: '',
        serviceType: -1,
        verifyType: -1,
        userName: '',
        alias: '',
        qrcodeUrl: '',
      };
    }

    return {
      nickname: infoData.nickname || '',
      headImg: infoData.head_img || '',
      serviceType: infoData.service_type ?? -1,
      verifyType: infoData.verify_type ?? -1,
      userName: infoData.user_name || '',
      alias: infoData.alias || '',
      qrcodeUrl: infoData.qrcode_url || '',
    };
  }

  async authenticate(appId: string, appSecret: string): Promise<AuthResult> {
    const accessToken = await this.getAccessToken(appId, appSecret);

    const tokenCache = this.tokenCache!;
    const expiresIn = Math.floor((tokenCache.expiresAt - Date.now()) / 1000);

    const accountInfo = await this.getAccountInfo(accessToken);

    return {
      success: true,
      accessToken,
      expiresIn,
      accountInfo,
    };
  }

  async verifyToken(accessToken: string): Promise<boolean> {
    const url = `${WECHAT_API_BASE}/cgi-bin/getcallbackip?access_token=${accessToken}`;
    const response = await fetch(url);
    const data: CallbackIpResponse = await response.json();
    return !data.errcode;
  }

  async uploadCoverImage(
    accessToken: string,
    imagePath: string
  ): Promise<CoverUploadResult> {
    const buffer = await fs.readFile(imagePath);
    const fileName = path.basename(imagePath);
    const ext = path.extname(fileName).toLowerCase();
    const mimeMap: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif' };
    const mimeType = mimeMap[ext] || 'image/jpeg';

    const { body: multipartBody, contentType } = buildMultipartBody('media', fileName, buffer, mimeType);

    const url = `${WECHAT_API_BASE}/cgi-bin/material/add_material?access_token=${accessToken}&type=image`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: new Uint8Array(multipartBody),
    });
    const data: UploadMaterialResponse = await response.json();

    if (data.errcode) {
      throw new Error(`上传封面图失败 [${data.errcode}]: ${data.errmsg}`);
    }

    return { mediaId: data.media_id, url: data.url };
  }

  async uploadContentImage(
    accessToken: string,
    imagePath: string
  ): Promise<ContentImageResult> {
    const buffer = await fs.readFile(imagePath);
    const fileName = path.basename(imagePath);
    const ext = path.extname(fileName).toLowerCase();
    const mimeMap: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif' };
    const mimeType = mimeMap[ext] || 'image/jpeg';

    const { body: multipartBody, contentType } = buildMultipartBody('media', fileName, buffer, mimeType);

    const url = `${WECHAT_API_BASE}/cgi-bin/media/uploadimg?access_token=${accessToken}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: new Uint8Array(multipartBody),
    });
    const data: UploadImgResponse = await response.json();

    if (data.errcode) {
      throw new Error(`上传正文图片失败 (${fileName}) [${data.errcode}]: ${data.errmsg}`);
    }

    return { originalPath: imagePath, url: data.url };
  }

  async batchUploadContentImages(
    accessToken: string,
    imagePaths: string[],
    onProgress?: ProgressCallback,
    articleIndex?: number,
    totalArticles?: number
  ): Promise<ContentImageResult[]> {
    const results: ContentImageResult[] = [];

    for (let i = 0; i < imagePaths.length; i++) {
      onProgress?.({
        currentArticleIndex: articleIndex ?? 0,
        totalArticles: totalArticles ?? 1,
        step: 'images',
        message: `正在上传正文图片 ${i + 1}/${imagePaths.length}...`,
      });

      const result = await this.uploadContentImage(accessToken, imagePaths[i]);
      results.push(result);

      if (i < imagePaths.length - 1) {
        await this.delay(300);
      }
    }

    return results;
  }

  async createDraft(accessToken: string, params: DraftCreateParams): Promise<string> {
    const body = {
      articles: [
        {
          title: params.title,
          thumb_media_id: params.thumbMediaId,
          author: params.author ?? '',
          digest: params.digest ?? params.title,
          content: params.content,
          content_source_url: params.contentSourceUrl ?? '',
          need_open_comment: params.needOpenComment ?? 1,
          only_fans_can_comment: params.onlyFansCanComment ?? 0,
          pic_crop_235_1: params.picCrop2351 ?? '0_0_1_1',
          pic_crop_1_1: params.picCrop11 ?? '0.287234_0_0.712766_1',
        },
      ],
    };

    const url = `${WECHAT_API_BASE}/cgi-bin/draft/add?access_token=${accessToken}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data: DraftAddResponse = await response.json();

    if (data.errcode) {
      throw new Error(`创建草稿失败 [${data.errcode}]: ${data.errmsg}`);
    }

    return data.media_id;
  }

  async publishDraft(accessToken: string, draftMediaId: string): Promise<string> {
    const body = { media_id: draftMediaId };
    const url = `${WECHAT_API_BASE}/cgi-bin/freepublish/submit?access_token=${accessToken}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data: FreepublishSubmitResponse = await response.json();

    if (data.errcode) {
      throw new Error(`发布草稿失败 [${data.errcode}]: ${data.errmsg}`);
    }

    return data.publish_id;
  }

  buildArticleHtml(title: string, imageUrls: string[]): string {
    const header = `<section style="text-align:center;color:#000;font-size:16px;padding-bottom:20px;font-weight:bold;">${this.escapeHtml(title)}</section>`;
    const images = imageUrls
      .map(url => `<p><img src="${url}" data-src="${url}" style="max-width:100%;display:block;margin:0 auto;"></p>`)
      .join('\n');
    return header + images;
  }

  calculateCropParams(originalRatio = 2.35): { pic_crop_235_1: string; pic_crop_1_1: string } {
    const pic_crop_235_1 = '0_0_1_1';

    const cropWidth = 1 / originalRatio;
    const margin = (1 - cropWidth) / 2;
    const x1 = margin.toFixed(6);
    const x2 = (1 - margin).toFixed(6);
    const pic_crop_1_1 = `${x1}_0_${x2}_1`;

    return { pic_crop_235_1, pic_crop_1_1 };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

export const wechatService = new WechatService();

/**
 * Comic 图片上传服务
 * 替代原 server/upload.ts（Express），改为 Electron 主进程直接调用
 * 转发到 PicGo API 实现图片上传
 */

import axios from 'axios';
import FormData from 'form-data';

/** PicGo API 配置 */
const PICGO_API_URL = 'https://www.picgo.net/api/1/upload';
const PICGO_API_KEY =
  'chv_S6XBh_0285d849632041e151a0ea2a657ff70587f09171227ad033894ca8e46c9099e0_d03916762cfa46d3e5057761603636b584fbeb285440a3d7f2ca07504a8d120d';

/** 上传选项 */
export interface ComicUploadOptions {
  title?: string;
  description?: string;
  tags?: string;
  albumId?: string;
  categoryId?: string;
  width?: number;
  expiration?: string;
  nsfw?: number;
}

/** 上传结果 */
export interface ComicUploadResult {
  success: boolean;
  url?: string;
  thumbUrl?: string;
  deleteUrl?: string;
  name?: string;
  size?: number;
  width?: number;
  height?: number;
  error?: string;
}

/** 上传请求参数（从前端 IPC 传入） */
export interface ComicUploadRequest {
  /** base64 编码的图片数据（不含 data:image/xxx;base64, 前缀） */
  base64: string;
  /** 原始文件名 */
  filename: string;
  /** MIME 类型 */
  mimetype: string;
  /** 上传选项 */
  options?: ComicUploadOptions;
}

export class ComicUploadService {
  /**
   * 上传图片到 PicGo
   * @param request - 上传请求（base64 图片 + 选项）
   * @returns 上传结果
   */
  async uploadImage(request: ComicUploadRequest): Promise<ComicUploadResult> {
    const { base64, filename, mimetype, options = {} } = request;

    try {
      const formData = new FormData();

      // base64 转 Buffer
      const buffer = Buffer.from(base64, 'base64');
      formData.append('source', buffer, {
        filename,
        contentType: mimetype,
      });

      // 添加可选参数
      if (options.title) formData.append('title', options.title);
      if (options.description) formData.append('description', options.description);
      if (options.tags) formData.append('tags', options.tags);
      if (options.albumId) formData.append('album_id', options.albumId);
      if (options.categoryId) formData.append('category_id', options.categoryId);
      if (options.width) formData.append('width', options.width.toString());
      if (options.expiration) formData.append('expiration', options.expiration);
      if (options.nsfw !== undefined) formData.append('nsfw', options.nsfw.toString());
      formData.append('format', 'json');

      // 转发到 PicGo API
      const response = await axios.post(PICGO_API_URL, formData, {
        headers: {
          ...formData.getHeaders(),
          'X-API-Key': PICGO_API_KEY,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      const result = response.data;

      if (result.status_code === 200) {
        return {
          success: true,
          url: result.image.url,
          thumbUrl: result.image.thumb?.url || result.image.url,
          deleteUrl: result.image.delete_url,
          name: result.image.name,
          size: result.image.size,
          width: result.image.width,
          height: result.image.height,
        };
      } else {
        return {
          success: false,
          error: result.status_txt || '上传失败',
        };
      }
    } catch (error: any) {
      console.error('上传失败:', error.message);

      if (error.response) {
        return {
          success: false,
          error: `HTTP ${error.response.status}: ${JSON.stringify(error.response.data).slice(0, 200)}`,
        };
      }
      return {
        success: false,
        error: error.message || '服务器内部错误',
      };
    }
  }

  /**
   * 从 URL 上传图片到 PicGo
   * @param imageUrl - 图片 URL
   * @param options - 上传选项
   */
  async uploadImageFromUrl(
    imageUrl: string,
    options: ComicUploadOptions = {}
  ): Promise<ComicUploadResult> {
    try {
      const formData = new FormData();
      formData.append('source', imageUrl);

      if (options.title) formData.append('title', options.title);
      if (options.description) formData.append('description', options.description);
      if (options.tags) formData.append('tags', options.tags);
      if (options.albumId) formData.append('album_id', options.albumId);
      if (options.categoryId) formData.append('category_id', options.categoryId);
      if (options.width) formData.append('width', options.width.toString());
      if (options.expiration) formData.append('expiration', options.expiration);
      if (options.nsfw !== undefined) formData.append('nsfw', options.nsfw.toString());
      formData.append('format', 'json');

      const response = await axios.post(PICGO_API_URL, formData, {
        headers: {
          ...formData.getHeaders(),
          'X-API-Key': PICGO_API_KEY,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      const result = response.data;

      if (result.status_code === 200) {
        return {
          success: true,
          url: result.image.url,
          thumbUrl: result.image.thumb?.url || result.image.url,
          deleteUrl: result.image.delete_url,
          name: result.image.name,
          size: result.image.size,
          width: result.image.width,
          height: result.image.height,
        };
      } else {
        return {
          success: false,
          error: result.status_txt || '上传失败',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '上传失败',
      };
    }
  }
}

export const comicUploadService = new ComicUploadService();

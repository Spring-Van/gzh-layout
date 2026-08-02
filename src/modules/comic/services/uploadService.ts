/**
 * 图片上传服务
 * 基于 PicGo API 实现图片上传功能
 * 改造为通过 Electron IPC 调用主进程，替代原 fetch('/api/upload')
 */

import { comicUpload } from '@/api/comic';

interface UploadOptions {
  title?: string;
  description?: string;
  tags?: string;
  albumId?: string;
  categoryId?: string;
  width?: number;
  expiration?: string;
  nsfw?: number;
}

interface UploadResult {
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

/**
 * 将本地文件转换为 base64 格式
 * 用于 OpenAI 等支持 base64 上传的 API
 * @param file - 要转换的文件对象
 * @returns base64 编码的 data URL（如 data:image/png;base64,...）
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}

/**
 * 将 File 转换为 { base64, filename, mimetype }
 * @param file - 文件对象
 * @returns base64 数据（不含 data URL 前缀）+ 元信息
 */
async function fileToBase64Parts(file: File): Promise<{
  base64: string;
  filename: string;
  mimetype: string;
}> {
  const dataUrl = await fileToBase64(file);
  // 去掉 data:image/xxx;base64, 前缀
  const base64 = dataUrl.split(',')[1];
  return {
    base64,
    filename: file.name,
    mimetype: file.type || 'image/jpeg',
  };
}

/** 参考图存储模式：cloud=云端URL，local=本地base64 */
export type ImageStorageMode = 'cloud' | 'local';

/**
 * 上传图片到 PicGo（通过 Electron IPC）
 * @param file - 要上传的文件对象
 * @param options - 上传选项配置
 * @returns 上传结果，包含成功状态和图片信息
 */
export async function uploadImage(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    const { base64, filename, mimetype } = await fileToBase64Parts(file);

    const result = await comicUpload.uploadImage({
      base64,
      filename,
      mimetype,
      options,
    });

    return result as UploadResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "上传失败",
    };
  }
}

/**
 * 统一的图片处理入口
 * 根据存储模式决定上传到云端还是转为本地 base64
 * @param file - 要处理的文件对象
 * @param mode - 存储模式：'cloud' 上传云端，'local' 本地 base64
 * @returns 处理结果，url 为图片地址（云端URL或base64）
 */
export async function processImage(
  file: File,
  mode: ImageStorageMode = 'cloud'
): Promise<UploadResult> {
  if (mode === 'local') {
    try {
      const base64 = await fileToBase64(file)
      return {
        success: true,
        url: base64,
        name: file.name,
        size: file.size,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '文件转换失败',
      }
    }
  }
  return uploadImage(file)
}

/**
 * 从 URL 上传图片到 PicGo（通过 Electron IPC）
 * @param imageUrl - 图片的 URL 地址
 * @param options - 上传选项配置
 * @returns 上传结果，包含成功状态和图片信息
 */
export async function uploadImageFromUrl(
  imageUrl: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    const result = await comicUpload.uploadImageFromUrl(imageUrl, options);
    return result as UploadResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "网络请求失败",
    };
  }
}

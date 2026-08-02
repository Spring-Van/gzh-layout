/**
 * Comic 下载服务
 * 替代原 server/download.ts（Express），改为 Electron 主进程直接执行
 * 提供单张下载和批量下载打包功能，支持图片脱敏处理
 */

import axios from 'axios';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import * as https from 'https';
import { app, shell } from 'electron';
import {
  secureProcessImage,
  type VibePreset,
} from './comic-secure-image';
import { comicDbService } from './comic-database.service';

/** 用于绕过证书验证的 HTTPS Agent（仅开发测试用） */
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

/**
 * 带重试的下载函数
 * @param url - 下载地址
 * @param retries - 重试次数
 * @param delayMs - 重试间隔
 */
async function downloadWithRetry(
  url: string,
  retries = 3,
  delayMs = 1000
): Promise<Buffer> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        httpsAgent,
      });
      return Buffer.from(response.data);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`   ⚠️ 第 ${i + 1} 次尝试失败，等待 ${delayMs}ms 后重试...`);
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

/** 下载结果 */
export interface ComicDownloadResult {
  success: boolean;
  filename?: string;
  filePath?: string;
  error?: string;
  securedCount?: number;
}

/** 批量下载请求参数 */
export interface ComicDownloadBatchRequest {
  urls: string[];
  folderName?: string;
  secureIndices?: number[];
  vibePreset?: VibePreset;
  vibeOptions?: VibeOptions;
  /** 是否在完成后自动打开文件所在文件夹 */
  showInFolder?: boolean;
}

/** 网感滤镜自定义配置（与前端 VibeOptions 对齐） */
export interface VibeOptions {
  medianSize?: number;
  blurSigma?: number;
  sharpenSigma?: number;
  brightness?: number;
  saturation?: number;
  contrast?: number;
  normalise?: boolean;
  tintEnabled?: boolean;
  tintRGB?: { r: number; g: number; b: number };
}

export class ComicDownloadService {
  /**
   * 下载目录：优先读应用设置中的自定义导出路径，
   * 未配置时回退到系统「下载」目录下的 comic-downloads 子目录。
   * 每次访问都确保目录存在（自定义路径可能尚未创建）。
   */
  private get downloadsDir(): string {
    const configured = comicDbService.getAppSettings().exportDir;
    const dir = configured && configured.trim()
      ? configured
      : path.join(app.getPath('downloads'), 'comic-downloads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  constructor() {
    if (!fs.existsSync(this.downloadsDir)) {
      fs.mkdirSync(this.downloadsDir, { recursive: true });
    }
  }

  /**
   * 下载单个图片
   * @param url - 图片 URL
   * @param filename - 可选的文件名
   * @param showInFolder - 是否在完成后打开文件夹
   */
  async downloadSingle(
    url: string,
    filename?: string,
    showInFolder = false
  ): Promise<ComicDownloadResult> {
    if (!url) {
      return { success: false, error: '缺少 url 参数' };
    }

    try {
      const data = await downloadWithRetry(url);
      const ext = path.extname(new URL(url).pathname) || '.jpg';
      const safeFilename = filename
        ? `${filename.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}${ext}`
        : `image_${Date.now()}${ext}`;

      const filePath = path.join(this.downloadsDir, safeFilename);
      fs.writeFileSync(filePath, data);

      if (showInFolder) {
        shell.showItemInFolder(filePath);
      }

      return {
        success: true,
        filename: safeFilename,
        filePath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '下载失败',
      };
    }
  }

  /**
   * 批量下载图片并打包成 ZIP
   * 支持对指定索引的图片进行脱敏处理
   */
  async downloadBatch(request: ComicDownloadBatchRequest): Promise<ComicDownloadResult> {
    const { urls, folderName, secureIndices, vibePreset, vibeOptions, showInFolder = true } = request;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return { success: false, error: '缺少 urls 参数或 urls 为空' };
    }

    try {
      const timestamp = Date.now();
      const safeFolderName = folderName
        ? folderName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
        : `images_${timestamp}`;
      const zipPath = path.join(this.downloadsDir, `${safeFolderName}.zip`);

      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        console.log(`ZIP 文件创建完成：${zipPath}`);
      });

      archive.on('error', (err) => {
        console.error('ZIP 创建失败:', err);
        throw err;
      });

      archive.pipe(output);

      const secureSet = new Set(secureIndices || []);
      const tempDir = path.join(this.downloadsDir, `temp_${timestamp}`);

      // 下载所有图片并添加到 ZIP
      const downloadPromises = urls.map(async (url, index) => {
        try {
          let imageData: Buffer;
          const originalData = await downloadWithRetry(url);

          if (secureSet.has(index)) {
            try {
              if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
              }

              const tempInputPath = path.join(tempDir, `input_${index}.jpg`);
              const tempOutputPath = path.join(tempDir, `secure_${index}.jpg`);

              fs.writeFileSync(tempInputPath, originalData);

              const secureOptions: any = {};
              if (vibePreset || vibeOptions) {
                secureOptions.vibeBlur = {
                  preset: vibePreset || 'natural',
                  enabled: true,
                  ...vibeOptions,
                };
              }
              await secureProcessImage(tempInputPath, tempOutputPath, secureOptions);

              imageData = fs.readFileSync(tempOutputPath);
              fs.unlinkSync(tempInputPath);
              fs.unlinkSync(tempOutputPath);
            } catch (secureError) {
              console.error(`   ⚠️ 图片 ${index + 1} 脱敏失败，使用原图:`, secureError);
              imageData = originalData;
            }
          } else {
            imageData = originalData;
          }

          const ext = path.extname(new URL(url).pathname) || '.jpg';
          const filename = `image_${String(index + 1).padStart(3, '0')}${ext}`;
          archive.append(imageData, { name: filename });
          return { success: true, filename };
        } catch (error) {
          console.error(`   ❌ 下载失败 ${url}:`, error);
          return { success: false, url, error: error instanceof Error ? error.message : '下载失败' };
        }
      });

      await Promise.all(downloadPromises);
      await archive.finalize();

      // 清理临时目录
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      // 等待 ZIP 文件写入完成
      await new Promise<void>((resolve, reject) => {
        output.on('close', resolve);
        output.on('error', reject);
      });

      if (showInFolder) {
        shell.showItemInFolder(zipPath);
      }

      return {
        success: true,
        filename: `${safeFolderName}.zip`,
        filePath: zipPath,
        securedCount: secureSet.size,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '批量下载失败',
      };
    }
  }
}

export const comicDownloadService = new ComicDownloadService();

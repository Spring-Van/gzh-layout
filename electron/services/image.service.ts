import fs from 'fs-extra';
import path from 'path';
import { nanoid } from 'nanoid';
import sharp from 'sharp';

interface ImageFile {
  id: string;
  name: string;
  path: string;
  size: number;
  width: number;
  height: number;
  format: string;
  enabled: boolean;
  isCover: boolean;
  order: number;
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// WebP Magic Number: RIFF....WEBP
const WEBP_MAGIC = Buffer.from([0x52, 0x49, 0x46, 0x46]); // "RIFF"
const WEBP_MAGIC_OFFSET = 0;
const WEBP_MARKER = Buffer.from([0x57, 0x45, 0x42, 0x50]); // "WEBP" at offset 8

export class ImageService {
  /**
   * 通过 Magic Number 检测文件是否为 WebP 格式
   */
  static async isWebpByMagicNumber(filePath: string): Promise<boolean> {
    try {
      const fd = await fs.open(filePath, 'r');
      const header = Buffer.alloc(12);
      await fd.read(header, 0, 12, 0);
      await fd.close();

      // 检查 RIFF 标识 (offset 0-3) 和 WEBP 标识 (offset 8-11)
      return (
        header.compare(WEBP_MAGIC, 0, 4, WEBP_MAGIC_OFFSET, 4) === 0 &&
        header.compare(WEBP_MARKER, 0, 4, 8, 12) === 0
      );
    } catch {
      return false;
    }
  }

  /**
   * 使用 sharp 检测图片的实际格式
   */
  static async detectActualFormat(filePath: string): Promise<string> {
    try {
      const metadata = await sharp(filePath).metadata();
      return metadata.format || 'unknown';
    } catch {
      // sharp 无法识别时，回退到 Magic Number 检测
      if (await this.isWebpByMagicNumber(filePath)) {
        return 'webp';
      }
      return 'unknown';
    }
  }

  static async scanImagesInFolder(folderPath: string): Promise<ImageFile[]> {
    const files = await fs.readdir(folderPath);
    const imageList: ImageFile[] = [];
    let order = 0;

    for (const fileName of files) {
      const fullPath = path.join(folderPath, fileName);
      const stat = await fs.stat(fullPath);

      if (!stat.isFile()) continue;

      const ext = path.extname(fileName).toLowerCase();
      if (!IMAGE_EXTENSIONS.includes(ext)) continue;

      try {
        // 使用 sharp 检测实际格式，并获取真实宽高
        const metadata = await sharp(fullPath).metadata();
        let actualFormat = metadata.format || ext.replace('.', '');
        const width = metadata.width || 1920;
        const height = metadata.height || 1080;

        // 如果 sharp 未识别为 webp，用 Magic Number 二次确认
        if (actualFormat !== 'webp' && await this.isWebpByMagicNumber(fullPath)) {
          actualFormat = 'webp';
        }

        imageList.push({
          id: nanoid(),
          name: fileName,
          path: fullPath,
          size: stat.size,
          width,
          height,
          format: actualFormat,
          enabled: true,
          isCover: false,
          order: order++,
        });
      } catch (error) {
        console.error('图片解析失败:', fullPath, error);
      }
    }

    return imageList;
  }
}

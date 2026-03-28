import fs from 'fs-extra';
import path from 'path';
import { nanoid } from 'nanoid';

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

export class ImageService {
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
        imageList.push({
          id: nanoid(),
          name: fileName,
          path: fullPath,
          size: stat.size,
          width: 1920,
          height: 1080,
          format: ext.replace('.', ''),
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

import type { ImageFile, ProjectConfig } from '../types';

export async function selectFolder(): Promise<string | null> {
  return window.electronAPI.selectFolder();
}

export async function scanFolder(folderPath: string): Promise<ImageFile[]> {
  return window.electronAPI.scanFolder(folderPath);
}

export async function backupFolder(sourcePath: string): Promise<string> {
  return window.electronAPI.backupFolder(sourcePath);
}

export async function calculateMD5(filePath: string): Promise<string> {
  return window.electronAPI.calculateMD5(filePath);
}

export async function splitIntoFolders(
  sourcePath: string,
  images: Array<{ path: string; name: string }>,
  splitCount: number,
  folderTime: string
): Promise<string[]> {
  return window.electronAPI.splitIntoFolders(sourcePath, images, splitCount, folderTime);
}

export async function findDuplicateImages(images: ImageFile[]): Promise<{ duplicates: Array<{ original: ImageFile; duplicate: ImageFile }> }> {
  const md5Map = new Map<string, ImageFile>();
  const duplicates: Array<{ original: ImageFile; duplicate: ImageFile }> = [];

  for (const image of images) {
    try {
      const md5 = await calculateMD5(image.path);
      if (md5Map.has(md5)) {
        duplicates.push({
          original: md5Map.get(md5)!,
          duplicate: image,
        });
      } else {
        md5Map.set(md5, image);
      }
    } catch (error) {
      console.error('计算 MD5 失败:', image.path, error);
    }
  }

  return { duplicates };
}

export async function deduplicateImages(images: ImageFile[], imagesToRemove: string[]): Promise<{ uniqueImages: ImageFile[]; duplicateCount: number }> {
  const uniqueImages = images.filter(img => !imagesToRemove.includes(img.id));
  return { uniqueImages, duplicateCount: imagesToRemove.length };
}

export async function createProjectFromFolder(): Promise<{ project: ProjectConfig; images: ImageFile[] } | null> {
  const folderPath = await selectFolder();
  if (!folderPath) return null;

  const images = await scanFolder(folderPath);

  const projectName = folderPath.split(/[/\\]/).pop() || '未命名项目';

  const now = new Date().toISOString();
  const project: ProjectConfig = {
    projectId: crypto.randomUUID(),
    projectName,
    sourceFolder: folderPath,
    templateId: 'minimal',
    articleTitle: projectName,
    articleSummary: '',
    status: 'idle',
    syncStatus: 'idle',
    images,
    groups: [],
    createdAt: now,
    updatedAt: now,
  };

  return { project, images };
}

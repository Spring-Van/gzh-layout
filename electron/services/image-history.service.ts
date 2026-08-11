import { app } from 'electron';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

interface HistoryImage {
  id: string;
  url: string;
  referenceImages?: string[];
  [key: string]: unknown;
}

export class ImageHistoryService {
  constructor(
    private readonly rootProvider = () => path.join(app.getPath('userData'), 'image-studio'),
  ) {}

  private get root() { return this.rootProvider(); }
  private get imagesDir() { return path.join(this.root, 'images'); }
  private get metadataPath() { return path.join(this.root, 'history.json'); }

  async load(): Promise<HistoryImage[]> {
    try {
      return JSON.parse(await readFile(this.metadataPath, 'utf8')) as HistoryImage[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  async save(history: HistoryImage[]): Promise<HistoryImage[]> {
    await mkdir(this.imagesDir, { recursive: true });
    const normalized = await Promise.all(history.map(async image => ({
      ...image,
      url: await this.persistDataUrl(image.url, `${image.id}-main`),
      referenceImages: image.referenceImages
        ? await Promise.all(image.referenceImages.map((url, index) => this.persistDataUrl(url, `${image.id}-ref-${index}`)))
        : undefined,
    })));
    const temporaryPath = `${this.metadataPath}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(normalized, null, 2), 'utf8');
    await rm(this.metadataPath, { force: true });
    await rename(temporaryPath, this.metadataPath);
    return normalized;
  }

  resolveImagePath(filename: string): string | null {
    if (!filename || filename !== path.basename(filename)) return null;
    const safeName = path.basename(filename);
    const resolved = path.join(this.imagesDir, safeName);
    return resolved.startsWith(`${this.imagesDir}${path.sep}`) ? resolved : null;
  }

  private async persistDataUrl(value: string, stem: string): Promise<string> {
    const match = value.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/i);
    if (!match) return value;
    const extension = match[1].toLowerCase().replace('jpeg', 'jpg');
    const filename = `${stem}.${extension}`;
    await writeFile(path.join(this.imagesDir, filename), Buffer.from(match[2], 'base64'));
    return `app-image://history/${encodeURIComponent(filename)}`;
  }
}

export const imageHistoryService = new ImageHistoryService();

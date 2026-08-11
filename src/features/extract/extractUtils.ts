import type { ImageFile, ImageFormat } from "@/types";
import type { ExtractedImage, ExtractFilterThresholds, ExtractPlatform } from "./types";

const PLATFORM_NAMES: Record<ExtractPlatform, string> = {
  wechat: "微信公众号",
  xiaohongshu: "小红书",
  douyin: "抖音",
  weibo: "微博",
  unknown: "其他",
};

const PLATFORM_CLASSES: Record<ExtractPlatform, string> = {
  wechat: "bg-green-50 text-green-600",
  xiaohongshu: "bg-red-50 text-red-600",
  douyin: "bg-slate-100 text-slate-600",
  weibo: "bg-orange-50 text-orange-600",
  unknown: "bg-slate-100 text-slate-500",
};

export function isFilterActive(options: ExtractFilterThresholds): boolean {
  return options.minWidth > 0 || options.minHeight > 0 || options.minSizeKB > 0;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function getPreviewFilteredIds(images: readonly ExtractedImage[], options: ExtractFilterThresholds): Set<string> {
  if (!isFilterActive(options) || options.minSizeKB <= 0) return new Set();
  const minSizeBytes = options.minSizeKB * 1024;
  return new Set(images.filter((image) => !image.downloaded && (image.fileSize ?? 0) > 0 && image.fileSize! < minSizeBytes).map((image) => image.id));
}

export function getPreviewFilterReason(image: ExtractedImage, options: ExtractFilterThresholds): string {
  if (!image.fileSize) return "";
  return `文件 ${formatFileSize(image.fileSize)} < 阈值 ${options.minSizeKB}KB`;
}

export function buildFilterDescription(images: readonly ExtractedImage[], options: ExtractFilterThresholds): string {
  if (!isFilterActive(options)) return "";
  const parts: string[] = [];
  if (options.minWidth > 0) parts.push(`宽≥${options.minWidth}px`);
  if (options.minHeight > 0) parts.push(`高≥${options.minHeight}px`);
  if (options.minSizeKB > 0) parts.push(`大小≥${options.minSizeKB}KB`);
  const minSizeBytes = options.minSizeKB * 1024;
  const willFilter = images.filter((image) => (image.fileSize ?? 0) > 0 && image.fileSize! < minSizeBytes).length;
  if (willFilter > 0) return `将过滤 ${willFilter}/${images.length} 张不满足 [${parts.join(" / ")}] 的图片`;
  if (options.minSizeKB > 0) return `当前阈值 ${options.minSizeKB}KB，所有图片（已知大小）均≥此值，将不会被过滤`;
  return `将过滤不满足 [${parts.join(" / ")}] 的图片`;
}

export function platformName(platform: ExtractPlatform): string { return PLATFORM_NAMES[platform] || platform; }
export function platformClass(platform: ExtractPlatform): string { return PLATFORM_CLASSES[platform] || PLATFORM_CLASSES.unknown; }
export function extractUrlsFromText(text: string): string[] { return text.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/g) || []; }

export function detectImageFormat(filename: string, url: string): ImageFormat {
  const lower = `${filename}|${url}`.toLowerCase();
  if (lower.includes(".png")) return "png";
  if (lower.includes(".jpg") || lower.includes(".jpeg")) return "jpeg";
  if (lower.includes(".webp")) return "webp";
  if (lower.includes(".gif")) return "gif";
  return "jpeg";
}

export function extractedToImageFile(image: ExtractedImage, order: number): ImageFile | null {
  if (!image.downloaded || !image.localPath) return null;
  return { id: image.id, path: image.localPath, name: image.filename, size: image.fileSize ?? 0, width: image.width ?? 0, height: image.height ?? 0, format: detectImageFormat(image.filename, image.url), enabled: true, isCover: false, order };
}

export function shuffleArray<T>(items: T[]): void {
  for (let index = items.length - 1; index > 0; index--) {
    const target = Math.floor(Math.random() * (index + 1));
    [items[index], items[target]] = [items[target], items[index]];
  }
}

export function rebuildGroupsFromResults(originalGroups: readonly ExtractedImage[][], flatResults: ExtractedImage[], splitCount: number): ExtractedImage[][] {
  const groups: ExtractedImage[][] = [];
  for (let index = 0; index < flatResults.length; index += splitCount) groups.push(flatResults.slice(index, index + splitCount));
  if (groups.length === 0 && originalGroups.length > 0) originalGroups.forEach(() => groups.push([]));
  return groups;
}

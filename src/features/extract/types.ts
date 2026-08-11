export type ExtractPlatform =
  | "wechat"
  | "xiaohongshu"
  | "douyin"
  | "weibo"
  | "unknown";

export interface ExtractedImage {
  id: string;
  url: string;
  originalUrl: string;
  filename: string;
  platform: ExtractPlatform;
  downloaded: boolean;
  localPath?: string;
  error?: string;
  filtered?: boolean;
  filterReason?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  loadFailed?: boolean;
}

export interface ExtractTask {
  id: string;
  url: string;
  platform: ExtractPlatform;
  status: "pending" | "parsing" | "downloading" | "completed" | "failed";
  images: ExtractedImage[];
  error?: string;
  logs?: string[];
}

export interface ExtractFilterThresholds {
  minWidth: number;
  minHeight: number;
  minSizeKB: number;
}

export interface ImageFilterOptions {
  enabled: boolean;
  minWidth?: number;
  minHeight?: number;
  minSizeKB?: number;
}

export interface ExtractDownloadProgress {
  current: number;
  total: number;
  image: ExtractedImage;
}

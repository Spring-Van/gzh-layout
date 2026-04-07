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

export interface UploadArticleParams {
  title: string;
  coverImagePath: string;
  contentImagePaths: string[];
  author?: string;
  digest?: string;
  picCrop2351?: string;
  picCrop11?: string;
}

export interface BatchUploadParams {
  appId: string;
  appSecret: string;
  articles: UploadArticleParams[];
  publish?: boolean;
}

export interface ArticleUploadResult {
  title: string;
  draftMediaId: string;
  coverUrl: string;
  publishId?: string;
}

export interface BatchUploadResult {
  success: boolean;
  results: ArticleUploadResult[];
  error?: string;
}

export interface UploadProgress {
  currentArticleIndex: number;
  totalArticles: number;
  step: 'token' | 'cover' | 'images' | 'draft' | 'publish' | 'done';
  message: string;
}

export type UnsubscribeFn = () => void;

export async function wechatGetAccessToken(appId: string, appSecret: string): Promise<string> {
  return window.electronAPI.wechat.getAccessToken(appId, appSecret);
}

export async function wechatClearTokenCache(): Promise<void> {
  return window.electronAPI.wechat.clearTokenCache();
}

export async function wechatUploadCoverImage(accessToken: string, imagePath: string): Promise<CoverUploadResult> {
  return window.electronAPI.wechat.uploadCoverImage(accessToken, imagePath);
}

export async function wechatUploadContentImage(accessToken: string, imagePath: string): Promise<ContentImageResult> {
  return window.electronAPI.wechat.uploadContentImage(accessToken, imagePath);
}

export async function wechatBatchUploadContentImages(accessToken: string, imagePaths: string[]): Promise<ContentImageResult[]> {
  return window.electronAPI.wechat.batchUploadContentImages(accessToken, imagePaths);
}

export async function wechatCreateDraft(accessToken: string, params: DraftCreateParams): Promise<string> {
  return window.electronAPI.wechat.createDraft(accessToken, params);
}

export async function wechatPublishDraft(accessToken: string, draftMediaId: string): Promise<string> {
  return window.electronAPI.wechat.publishDraft(accessToken, draftMediaId);
}

export async function wechatBuildArticleHtml(title: string, imageUrls: string[]): Promise<string> {
  return window.electronAPI.wechat.buildArticleHtml(title, imageUrls);
}

export async function wechatCalculateCropParams(originalRatio?: number): Promise<{ pic_crop_235_1: string; pic_crop_1_1: string }> {
  return window.electronAPI.wechat.calculateCropParams(originalRatio);
}

export async function wechatBatchUpload(params: BatchUploadParams): Promise<BatchUploadResult> {
  return window.electronAPI.wechat.batchUpload(params);
}

export function onWechatUploadProgress(callback: (progress: UploadProgress) => void): UnsubscribeFn {
  return window.electronAPI.wechat.onUploadProgress(callback);
}

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
  contentHtml?: string;
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

export interface WechatAccountInfo {
  nickname: string;
  headImg: string;
  serviceType: number;
  verifyType: number;
  userName: string;
  alias: string;
  qrcodeUrl: string;
}

export interface AuthResult {
  success: boolean;
  accessToken: string;
  expiresIn: number;
  accountInfo: WechatAccountInfo;
}

export interface WechatTokenCacheInfo {
  accessToken: string;
  expiresAt: number;
}

export type UnsubscribeFn = () => void;

export async function wechatGetAccessToken(appId: string, appSecret: string): Promise<string> {
  return window.electronAPI.wechat.getAccessToken(appId, appSecret);
}

export async function wechatClearTokenCache(): Promise<void> {
  return window.electronAPI.wechat.clearTokenCache();
}

export async function wechatGetAccountInfo(accessToken: string): Promise<WechatAccountInfo> {
  return window.electronAPI.wechat.getAccountInfo(accessToken);
}

export async function wechatAuthenticate(appId: string, appSecret: string): Promise<AuthResult> {
  return window.electronAPI.wechat.authenticate(appId, appSecret);
}

export async function wechatVerifyToken(accessToken: string): Promise<boolean> {
  return window.electronAPI.wechat.verifyToken(accessToken);
}

export async function wechatGetTokenCacheInfo(): Promise<WechatTokenCacheInfo | null> {
  return window.electronAPI.wechat.getTokenCacheInfo();
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

export async function dbGetAllWechatAccounts() {
  return window.electronAPI.db.getAllWechatAccounts();
}

export async function dbGetWechatAccount(accountId: string) {
  return window.electronAPI.db.getWechatAccount(accountId);
}

export async function dbGetActiveWechatAccount() {
  return window.electronAPI.db.getActiveWechatAccount();
}

export async function dbSaveWechatAccount(account: any) {
  return window.electronAPI.db.saveWechatAccount(account);
}

export async function dbSetActiveWechatAccount(accountId: string) {
  return window.electronAPI.db.setActiveWechatAccount(accountId);
}

export async function dbDeleteWechatAccount(accountId: string) {
  return window.electronAPI.db.deleteWechatAccount(accountId);
}

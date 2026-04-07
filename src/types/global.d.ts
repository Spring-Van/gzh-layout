import type { ImageFile, ProjectConfig, CustomTemplate, CoverTemplate, WechatAccount } from './index';

export { };

interface CoverUploadResult {
  mediaId: string;
  url: string;
}

interface ContentImageResult {
  originalPath: string;
  url: string;
}

interface DraftCreateParams {
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

interface UploadArticleParams {
  title: string;
  coverImagePath: string;
  contentImagePaths: string[];
  author?: string;
  digest?: string;
  picCrop2351?: string;
  picCrop11?: string;
}

interface BatchUploadParams {
  appId: string;
  appSecret: string;
  articles: UploadArticleParams[];
  publish?: boolean;
}

interface ArticleUploadResult {
  title: string;
  draftMediaId: string;
  coverUrl: string;
  publishId?: string;
}

interface BatchUploadResult {
  success: boolean;
  results: ArticleUploadResult[];
  error?: string;
}

interface UploadProgress {
  currentArticleIndex: number;
  totalArticles: number;
  step: 'token' | 'cover' | 'images' | 'draft' | 'publish' | 'done';
  message: string;
}

interface WechatAccountInfo {
  nickname: string;
  headImg: string;
  serviceType: number;
  verifyType: number;
  userName: string;
  alias: string;
  qrcodeUrl: string;
}

interface AuthResult {
  success: boolean;
  accessToken: string;
  expiresIn: number;
  accountInfo: WechatAccountInfo;
}

interface WechatTokenCacheInfo {
  accessToken: string;
  expiresAt: number;
}

declare global {
  interface Window {
    electronAPI: {
      selectFolder: () => Promise<string | null>;
      scanFolder: (folderPath: string) => Promise<ImageFile[]>;
      backupFolder: (sourcePath: string) => Promise<string>;
      calculateMD5: (filePath: string) => Promise<string>;
      splitIntoFolders: (sourcePath: string, images: Array<{ path: string; name: string }>, splitCount: number, folderTime: string) => Promise<string[]>;
      db: {
        init: () => Promise<{ success: boolean }>;
        getAllProjects: () => Promise<ProjectConfig[]>;
        getProject: (projectId: string) => Promise<ProjectConfig | null>;
        saveProject: (project: ProjectConfig) => Promise<{ success: boolean }>;
        deleteProject: (projectId: string) => Promise<{ success: boolean }>;
        getAllTemplates: () => Promise<CustomTemplate[]>;
        saveTemplate: (template: CustomTemplate) => Promise<{ success: boolean }>;
        deleteTemplate: (templateId: string) => Promise<{ success: boolean }>;
        getAllCoverTemplates: () => Promise<CoverTemplate[]>;
        saveCoverTemplate: (template: CoverTemplate) => Promise<{ success: boolean }>;
        deleteCoverTemplate: (templateId: string) => Promise<{ success: boolean }>;
        getAllWechatAccounts: () => Promise<WechatAccount[]>;
        getWechatAccount: (accountId: string) => Promise<WechatAccount | null>;
        getActiveWechatAccount: () => Promise<WechatAccount | null>;
        saveWechatAccount: (account: WechatAccount) => Promise<{ success: boolean }>;
        setActiveWechatAccount: (accountId: string) => Promise<{ success: boolean }>;
        deleteWechatAccount: (accountId: string) => Promise<{ success: boolean }>;
      };
      wechat: {
        getAccessToken: (appId: string, appSecret: string) => Promise<string>;
        clearTokenCache: () => Promise<void>;
        getAccountInfo: (accessToken: string) => Promise<WechatAccountInfo>;
        authenticate: (appId: string, appSecret: string) => Promise<AuthResult>;
        verifyToken: (accessToken: string) => Promise<boolean>;
        getTokenCacheInfo: () => Promise<WechatTokenCacheInfo | null>;
        uploadCoverImage: (accessToken: string, imagePath: string) => Promise<CoverUploadResult>;
        uploadContentImage: (accessToken: string, imagePath: string) => Promise<ContentImageResult>;
        batchUploadContentImages: (accessToken: string, imagePaths: string[]) => Promise<ContentImageResult[]>;
        createDraft: (accessToken: string, params: DraftCreateParams) => Promise<string>;
        publishDraft: (accessToken: string, draftMediaId: string) => Promise<string>;
        buildArticleHtml: (title: string, imageUrls: string[]) => Promise<string>;
        calculateCropParams: (originalRatio?: number) => Promise<{ pic_crop_235_1: string; pic_crop_1_1: string }>;
        batchUpload: (params: BatchUploadParams) => Promise<BatchUploadResult>;
        onUploadProgress: (callback: (progress: UploadProgress) => void) => () => void;
      };
    };
  }
}

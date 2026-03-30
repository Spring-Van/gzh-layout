export type AppView = 'home' | 'project' | 'templates' | 'history' | 'settings';

// 项目状态
export type ProjectStatus = 'idle' | 'scanning' | 'processing' | 'ready' | 'synced' | 'failed';

// 图片格式
export type ImageFormat = 'jpg' | 'jpeg' | 'png' | 'webp' | 'gif';

// 拆分规则
export type SplitRule = 'count' | 'orientation' | 'resolution' | 'name' | 'smart';

// 去重模式
export type DedupMode = 'hash' | 'phash' | 'manual';

// 模板类型
export type TemplateType = 'minimal' | 'card' | 'grid' | 'section' | 'cover' | 'custom';

// 自定义模板
export interface CustomTemplate {
  id: string;
  name: string;
  description?: string;
  html: string;
  createdAt: string;
  updatedAt: string;
}

// 封面模板
export interface CoverTemplate {
  id: string;
  name: string;
  description?: string;
  html: string;
  createdAt: string;
  updatedAt: string;
}

// 文章封面配置
export interface ArticleCoverConfig {
  templateId?: string;
  selectedImageIds: string[];
  title?: string;
}

// 公众号同步状态
export type SyncStatus = 'idle' | 'authorizing' | 'uploading' | 'creating' | 'success' | 'failed';

// 图片文件
export interface ImageFile {
  id: string;
  path: string;
  name: string;
  size: number;
  width: number;
  height: number;
  format: ImageFormat;
  md5?: string;
  phash?: string;
  createTime?: string;
  modifyTime?: string;
  thumbnail?: string;
  enabled: boolean;
  isCover: boolean;
  order: number;
}

// 图片分组
export interface ImageGroup {
  groupId: string;
  name: string;
  images: ImageFile[];
}

// 重复图片组
export interface DuplicateGroup {
  groupId: string;
  mode: DedupMode;
  similarity: number;
  files: ImageFile[];
  suggestedKeepId: string;
}

// 项目统计
export interface ProjectStats {
  files: number;
  groups: number;
  drafts: number;
  published: number;
}

// 项目卡片数据
export interface Project {
  id: string;
  name: string;
  status: 'success' | 'warn' | 'error';
  statusText: string;
  stats: ProjectStats;
  sourceFolder?: string;
  createdAt: string;
  updatedAt: string;
}

// 文章配置
export interface ArticleConfig {
  title: string;
  summary?: string;
  coverImage?: string;
  templateId: TemplateType;
  images: ImageFile[];
  footerText?: string;
  showImageCaption: boolean;
  themeColor: string;
  borderRadius: number;
  imageGap: number;
  coverConfig?: ArticleCoverConfig;
}

// 模板配置
export interface TemplateConfig {
  id: TemplateType;
  name: string;
  description: string;
  thumbnail: string;
}

// 项目配置
export interface ProjectConfig {
  projectId: string;
  projectName: string;
  sourceFolder: string;
  backupFolder?: string;
  templateId: TemplateType;
  articleTitle: string;
  articleSummary?: string;
  coverImage?: string;
  draftId?: string;
  publishPlanTime?: string;
  status: ProjectStatus;
  syncStatus: SyncStatus;
  images: ImageFile[];
  groups: ImageGroup[];
  createdAt: string;
  updatedAt: string;
}

// 公众号账号
export interface WechatAccount {
  id: string;
  appId: string;
  nickname: string;
  headImg?: string;
  accessToken?: string;
  tokenExpiresAt?: number;
  isActive: boolean;
}

// 草稿记录
export interface DraftRecord {
  id: string;
  projectId: string;
  draftId: string;
  title: string;
  coverUrl?: string;
  syncedAt: string;
  url?: string;
  status: 'draft' | 'published' | 'deleted';
}

// 任务日志
export interface TaskLog {
  id: string;
  projectId: string;
  action: string;
  details: string;
  status: 'success' | 'failed' | 'info';
  createdAt: string;
}

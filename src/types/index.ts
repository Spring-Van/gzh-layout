export interface CropRect { x: number; y: number; w: number; h: number }

export type AppView = 'home' | 'project' | 'templates' | 'history' | 'settings';

// 预览模式
export type PreviewMode = 'cover' | 'content';

// 编号规则
export type NumberingRule = 'none' | 'vol' | 'issue' | 'custom';

// 全局设置 - 标题配置
export interface GlobalTitleConfig {
  enabled: boolean;
  prefix: string;
  numberingRule: NumberingRule;
  customFormat: string;
  separator: string;
  subtitle?: string;
}

// 全局设置 - 封面配置
export interface GlobalCoverConfig {
  templateId?: string;
  imageSource: 'default' | 'specified' | 'perArticle';
  specifiedImageId?: string;
  showTitle: boolean;
  showSubtitle: boolean;
  cropMode: 'cover' | 'contain';
  selectedImageIds?: string[];
  pic_crop_235_1?: string;
  pic_crop_1_1?: string;
  coverImageIndices?: number[];
}

// 全局设置 - 排版配置
export interface GlobalLayoutConfig {
  templateId: string;
  imageSortRule: 'original' | 'name' | 'size' | 'date';
  imageFillMode: 'cover' | 'contain';
  imageStructure: 'flow' | 'card' | 'grid';
}

// 样式插入位置
export type StyleInsertPosition = 'header' | 'footer' | 'between';

// 样式插入配置
export interface StyleInsertConfig {
  enabled: boolean;
  position: StyleInsertPosition;
  templateIds: string[];
}

// 全局样式插入配置
export interface GlobalStyleInsertConfig {
  header: StyleInsertConfig;
  footer: StyleInsertConfig;
  between: StyleInsertConfig;
}

// 文章样式插入配置
export interface ArticleStyleInsertConfig {
  inheritGlobal: boolean;
  header: StyleInsertConfig;
  footer: StyleInsertConfig;
  between: StyleInsertConfig;
}

// 全局设置
export interface GlobalConfig {
  title: GlobalTitleConfig;
  cover: GlobalCoverConfig;
  layout: GlobalLayoutConfig;
  styleInsert: GlobalStyleInsertConfig;
}

// 文章覆盖标记
export interface ArticleOverride {
  title: boolean;
  cover: boolean;
  layout: boolean;
}

// 文章 - 标题配置
export interface ArticleTitleConfig {
  inheritGlobal: boolean;
  title: string;
  subtitle?: string;
  prefix?: string;
  numbering?: string;
  sourceUrl?: string;
}

// 文章 - 封面配置
export interface ArticleCoverConfig {
  inheritGlobal: boolean;
  templateId?: string;
  selectedImageIds: string[];
  cropMode: 'cover' | 'contain';
  titlePosition?: { x: number; y: number };
  pic_crop_235_1?: string;
  pic_crop_1_1?: string;
  generatedCoverImage?: string; // base64 格式（已废弃，保留用于向后兼容）
  generatedCoverImagePath?: string; // 文件路径，用于预览和上传到公众号
  imageCropRects?: Record<number, CropRect>;
}

// 文章 - 排版配置
export interface ArticleLayoutConfig {
  inheritGlobal: boolean;
  templateId?: string;
}

// 文章配置
export interface BatchArticle {
  id: string;
  titleConfig: ArticleTitleConfig;
  coverConfig: ArticleCoverConfig;
  layoutConfig: ArticleLayoutConfig;
  styleInsertConfig: ArticleStyleInsertConfig;
  images: {
    id: string;
    path: string;
    name: string;
  }[];
  override: ArticleOverride;
  contentBlocks?: ContentBlock[];
  containerStyle?: Record<string, string>;
}

// 右栏模式
export type ConfigMode = 'global' | 'article';

// 右栏 Tab
export type ConfigTab = 'title' | 'cover' | 'layout';

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
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

// 封面模板
export interface CoverTemplate {
  id: string;
  name: string;
  description?: string;
  html: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

// 文章封面配置（合并到上方 ArticleCoverConfig，此处保留别名引用）
export type ArticleCoverConfigSimple = Pick<ArticleCoverConfig, 'templateId' | 'selectedImageIds'> & {
  title?: string;
};

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
  /**
   * 该分组对应的本地文件夹绝对路径。
   * - 矩阵「备份拆分」场景：备份目录下的「{folderDate} - 第N组」文件夹
   * - 提取「按文章拆分下载」场景：savePath 下的「分组N」子文件夹
   * 同步成功后用于按文章标题重命名该文件夹。
   */
  folderPath?: string;
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

// 内容块类型
export type ContentBlockType = 'image' | 'text' | 'html' | 'empty';

// 内容块
export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  content: string;
  html?: string;
  imagePath?: string;
  imageName?: string;
  align?: 'left' | 'center' | 'right';
  styleInsertPosition?: 'header' | 'between' | 'footer';
}

// 样式模板
export interface StyleTemplate {
  id: string;
  name: string;
  description?: string;
  html: string;
  preview?: string;
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
  webpConvertedMap?: Record<string, string>; // 原webp路径 -> 转换后png路径
  /**
   * 是否按分组拆分到子文件夹。
   * - 矩阵场景：用户在 SetupView 勾选了「备份拆分」(createFolders) 且 groups 非空
   * - 提取场景：用户在 ExtractView 选择「按文章拆分下载到子目录」策略
   * 同步完成后会按文章标题重命名对应分组文件夹。
   */
  splitMode?: boolean;
  createdAt: string;
  updatedAt: string;
}

// 公众号账号
export interface WechatAccount {
  id: string;
  appId: string;
  appSecret?: string;
  nickname: string;
  headImg?: string;
  accessToken?: string;
  tokenExpiresAt?: number;
  isActive: boolean;
  isDefaultSync: boolean;
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

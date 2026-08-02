/**
 * Comic 模块前端 API 封装
 * 统一封装 window.electronAPI.comic 调用，提供类型安全
 * 供 comic 模块的 services / stores / views 使用
 */

import type {
  ComicProject,
  ModelConfig,
  PromptTemplate,
  ProjectAsset,
  MaterialItem,
  GenerationTask,
} from '../modules/comic/types';

/** 获取 electronAPI 的 comic 命名空间 */
function getComicApi() {
  const api = (window as any).electronAPI?.comic;
  if (!api) {
    throw new Error('electronAPI.comic 未注入，请检查 preload 脚本');
  }
  return api;
}

/** 数据库操作封装 */
export const comicDb = {
  // Projects
  getAllProjects: (): Promise<ComicProject[]> => getComicApi().db.getAllProjects(),
  getProject: (id: string): Promise<ComicProject | null> => getComicApi().db.getProject(id),
  saveProject: (project: ComicProject): Promise<{ success: boolean }> => getComicApi().db.saveProject(project),
  deleteProject: (id: string): Promise<{ success: boolean }> => getComicApi().db.deleteProject(id),

  // ModelConfigs
  getAllModelConfigs: (): Promise<ModelConfig[]> => getComicApi().db.getAllModelConfigs(),
  saveModelConfig: (config: ModelConfig): Promise<{ success: boolean }> => getComicApi().db.saveModelConfig(config),
  deleteModelConfig: (id: string): Promise<{ success: boolean }> => getComicApi().db.deleteModelConfig(id),

  // PromptTemplates
  getAllPromptTemplates: (): Promise<PromptTemplate[]> => getComicApi().db.getAllPromptTemplates(),
  savePromptTemplate: (template: PromptTemplate): Promise<{ success: boolean }> => getComicApi().db.savePromptTemplate(template),
  deletePromptTemplate: (id: string): Promise<{ success: boolean }> => getComicApi().db.deletePromptTemplate(id),

  // ProjectAssets
  getProjectAssetsByProjectId: (projectId: string): Promise<ProjectAsset[]> => getComicApi().db.getProjectAssetsByProjectId(projectId),
  getAllProjectAssets: (): Promise<ProjectAsset[]> => getComicApi().db.getAllProjectAssets(),
  saveProjectAsset: (asset: ProjectAsset): Promise<{ success: boolean }> => getComicApi().db.saveProjectAsset(asset),
  deleteProjectAsset: (id: string): Promise<{ success: boolean }> => getComicApi().db.deleteProjectAsset(id),
  deleteProjectAssetsByProjectId: (projectId: string): Promise<{ success: boolean }> => getComicApi().db.deleteProjectAssetsByProjectId(projectId),

  // Materials
  getAllMaterials: (): Promise<MaterialItem[]> => getComicApi().db.getAllMaterials(),
  getMaterialsByProjectId: (projectId: string): Promise<MaterialItem[]> => getComicApi().db.getMaterialsByProjectId(projectId),
  saveMaterial: (material: MaterialItem): Promise<{ success: boolean }> => getComicApi().db.saveMaterial(material),
  deleteMaterial: (id: string): Promise<{ success: boolean }> => getComicApi().db.deleteMaterial(id),

  // GenerationTasks
  getGenerationTasksByProjectId: (projectId: string): Promise<GenerationTask[]> => getComicApi().db.getGenerationTasksByProjectId(projectId),
  saveGenerationTask: (task: GenerationTask): Promise<{ success: boolean }> => getComicApi().db.saveGenerationTask(task),
  deleteGenerationTask: (id: string): Promise<{ success: boolean }> => getComicApi().db.deleteGenerationTask(id),
  deleteGenerationTasksByProjectId: (projectId: string): Promise<{ success: boolean }> => getComicApi().db.deleteGenerationTasksByProjectId(projectId),

  // AppSettings
  getAppSettings: (): Promise<{ exportDir?: string }> => getComicApi().db.getAppSettings(),
  saveAppSettings: (settings: { exportDir?: string }): Promise<{ success: boolean }> => getComicApi().db.saveAppSettings(settings),
};

/** 图片上传封装 */
export const comicUpload = {
  uploadImage: (request: {
    base64: string;
    filename: string;
    mimetype: string;
    options?: any;
  }) => getComicApi().upload(request),
  uploadImageFromUrl: (imageUrl: string, options?: any) => getComicApi().uploadFromUrl(imageUrl, options),
};

/** 图片下载封装 */
export const comicDownload = {
  downloadSingle: (url: string, filename?: string, showInFolder?: boolean) =>
    getComicApi().downloadSingle(url, filename, showInFolder),
  downloadBatch: (request: any) => getComicApi().downloadBatch(request),
};

/** OpenAI 代理封装 */
export const comicProxy = {
  proxy: (request: any) => getComicApi().openaiProxy(request),
};

/** 文件管理封装 */
export const comicFile = {
  showInFolder: (filePath: string) => getComicApi().showInFolder(filePath),
};

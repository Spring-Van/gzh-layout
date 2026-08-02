/**
 * Comic 模块 IPC 注册
 * 对接 ComicDatabaseService / ComicUploadService / ComicDownloadService / ComicOpenaiProxyService
 */
import { ipcMain, shell } from 'electron';
import { comicDbService } from '../services/comic-database.service';
import { comicUploadService } from '../services/comic-upload.service';
import { comicDownloadService } from '../services/comic-download.service';
import { comicOpenaiProxyService } from '../services/comic-openai-proxy.service';

export function registerComicIpc(): void {
  // ========== 数据库：AppSettings ==========

  ipcMain.handle('comic:db:getAppSettings', () => {
    return comicDbService.getAppSettings();
  });

  ipcMain.handle('comic:db:saveAppSettings', (_e, settings: any) => {
    comicDbService.saveAppSettings(settings);
    return { success: true };
  });

  // ========== 数据库：Projects ==========

  ipcMain.handle('comic:db:getAllProjects', () => {
    return comicDbService.getAllProjects();
  });

  ipcMain.handle('comic:db:getProject', (_e, id: string) => {
    return comicDbService.getProject(id);
  });

  ipcMain.handle('comic:db:saveProject', (_e, project: any) => {
    comicDbService.saveProject(project);
    return { success: true };
  });

  ipcMain.handle('comic:db:deleteProject', (_e, id: string) => {
    comicDbService.deleteProjectCascade(id);
    return { success: true };
  });

  // ========== 数据库：ModelConfigs ==========

  ipcMain.handle('comic:db:getAllModelConfigs', () => {
    return comicDbService.getAllModelConfigs();
  });

  ipcMain.handle('comic:db:saveModelConfig', (_e, config: any) => {
    comicDbService.saveModelConfig(config);
    return { success: true };
  });

  ipcMain.handle('comic:db:deleteModelConfig', (_e, id: string) => {
    comicDbService.deleteModelConfig(id);
    return { success: true };
  });

  // ========== 数据库：PromptTemplates ==========

  ipcMain.handle('comic:db:getAllPromptTemplates', () => {
    return comicDbService.getAllPromptTemplates();
  });

  ipcMain.handle('comic:db:savePromptTemplate', (_e, template: any) => {
    comicDbService.savePromptTemplate(template);
    return { success: true };
  });

  ipcMain.handle('comic:db:deletePromptTemplate', (_e, id: string) => {
    comicDbService.deletePromptTemplate(id);
    return { success: true };
  });

  // ========== 数据库：ProjectAssets ==========

  ipcMain.handle('comic:db:getProjectAssetsByProjectId', (_e, projectId: string) => {
    return comicDbService.getProjectAssetsByProjectId(projectId);
  });

  ipcMain.handle('comic:db:getAllProjectAssets', () => {
    return comicDbService.getAllProjectAssets();
  });

  ipcMain.handle('comic:db:saveProjectAsset', (_e, asset: any) => {
    comicDbService.saveProjectAsset(asset);
    return { success: true };
  });

  ipcMain.handle('comic:db:deleteProjectAsset', (_e, id: string) => {
    comicDbService.deleteProjectAsset(id);
    return { success: true };
  });

  ipcMain.handle('comic:db:deleteProjectAssetsByProjectId', (_e, projectId: string) => {
    comicDbService.deleteProjectAssetsByProjectId(projectId);
    return { success: true };
  });

  // ========== 数据库：Materials ==========

  ipcMain.handle('comic:db:getAllMaterials', () => {
    return comicDbService.getAllMaterials();
  });

  ipcMain.handle('comic:db:getMaterialsByProjectId', (_e, projectId: string) => {
    return comicDbService.getMaterialsByProjectId(projectId);
  });

  ipcMain.handle('comic:db:saveMaterial', (_e, material: any) => {
    comicDbService.saveMaterial(material);
    return { success: true };
  });

  ipcMain.handle('comic:db:deleteMaterial', (_e, id: string) => {
    comicDbService.deleteMaterial(id);
    return { success: true };
  });

  // ========== 数据库：GenerationTasks ==========

  ipcMain.handle('comic:db:getGenerationTasksByProjectId', (_e, projectId: string) => {
    return comicDbService.getGenerationTasksByProjectId(projectId);
  });

  ipcMain.handle('comic:db:saveGenerationTask', (_e, task: any) => {
    comicDbService.saveGenerationTask(task);
    return { success: true };
  });

  ipcMain.handle('comic:db:deleteGenerationTask', (_e, id: string) => {
    comicDbService.deleteGenerationTask(id);
    return { success: true };
  });

  ipcMain.handle('comic:db:deleteGenerationTasksByProjectId', (_e, projectId: string) => {
    comicDbService.deleteGenerationTasksByProjectId(projectId);
    return { success: true };
  });

  // ========== 图片上传 ==========

  ipcMain.handle('comic:upload', (_e, request: any) => {
    return comicUploadService.uploadImage(request);
  });

  ipcMain.handle('comic:uploadFromUrl', (_e, imageUrl: string, options?: any) => {
    return comicUploadService.uploadImageFromUrl(imageUrl, options);
  });

  // ========== 图片下载 ==========

  ipcMain.handle('comic:downloadSingle', (_e, url: string, filename?: string, showInFolder?: boolean) => {
    return comicDownloadService.downloadSingle(url, filename, showInFolder);
  });

  ipcMain.handle('comic:downloadBatch', (_e, request: any) => {
    return comicDownloadService.downloadBatch(request);
  });

  // ========== OpenAI 代理 ==========

  ipcMain.handle('comic:openaiProxy', (_e, request: any) => {
    return comicOpenaiProxyService.proxy(request);
  });

  // ========== 文件管理 ==========

  ipcMain.handle('comic:showInFolder', (_e, filePath: string) => {
    shell.showItemInFolder(filePath);
    return { success: true };
  });
}

import { ipcMain } from 'electron';
import { dbService } from '../services/database.service';

export function registerDatabaseIpc() {
  // Initialize database
  ipcMain.handle('db:init', async () => {
    await dbService.init();
    return { success: true };
  });

  // Projects
  ipcMain.handle('db:getAllProjects', () => {
    return dbService.getAllProjects();
  });

  ipcMain.handle('db:getProject', (_event, projectId: string) => {
    return dbService.getProject(projectId);
  });

  ipcMain.handle('db:saveProject', (_event, project) => {
    dbService.saveProject(project);
    return { success: true };
  });

  ipcMain.handle('db:deleteProject', (_event, projectId: string) => {
    dbService.deleteProject(projectId);
    return { success: true };
  });

  // Templates
  ipcMain.handle('db:getAllTemplates', () => {
    return dbService.getAllTemplates();
  });

  ipcMain.handle('db:saveTemplate', (_event, template) => {
    dbService.saveTemplate(template);
    return { success: true };
  });

  ipcMain.handle('db:deleteTemplate', (_event, templateId: string) => {
    dbService.deleteTemplate(templateId);
    return { success: true };
  });

  // Cover Templates
  ipcMain.handle('db:getAllCoverTemplates', () => {
    return dbService.getAllCoverTemplates();
  });

  ipcMain.handle('db:saveCoverTemplate', (_event, template) => {
    dbService.saveCoverTemplate(template);
    return { success: true };
  });

  ipcMain.handle('db:deleteCoverTemplate', (_event, templateId: string) => {
    dbService.deleteCoverTemplate(templateId);
    return { success: true };
  });
}

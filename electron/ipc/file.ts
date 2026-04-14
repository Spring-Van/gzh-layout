import { ipcMain } from 'electron';
import { FileService } from '../services/file.service';

export function registerFileIpc() {
  ipcMain.handle('file:selectFolder', async () => {
    return FileService.selectFolder();
  });

  ipcMain.handle('file:backupFolder', async (_, sourcePath: string) => {
    return FileService.backupFolder(sourcePath);
  });

  ipcMain.handle('file:calculateMD5', async (_, filePath: string) => {
    return FileService.calculateMD5(filePath);
  });

  ipcMain.handle('file:splitIntoFolders', async (_, sourcePath: string, images: Array<{ path: string; name: string }>, splitCount: number, folderDate: string) => {
    return FileService.splitIntoFolders(sourcePath, images, splitCount, folderDate);
  });

  ipcMain.handle('file:saveBase64Image', async (_, base64Data: string, filename: string) => {
    return FileService.saveBase64Image(base64Data, filename);
  });

  ipcMain.handle('file:createCoverFolder', async (_, basePath: string) => {
    return FileService.createCoverFolder(basePath);
  });

  ipcMain.handle('file:saveCoverImage', async (_, coverFolder: string, base64Data: string, filename: string) => {
    return FileService.saveCoverImage(coverFolder, base64Data, filename);
  });

  ipcMain.handle('file:deleteCoverFolder', async (_, coverFolder: string) => {
    return FileService.deleteCoverFolder(coverFolder);
  });

  ipcMain.handle('file:deleteCoverImage', async (_, filePath: string) => {
    return FileService.deleteCoverImage(filePath);
  });
}

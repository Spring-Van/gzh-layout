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

  ipcMain.handle('file:splitIntoFolders', async (_, sourcePath: string, images: Array<{ path: string; name: string }>, splitCount: number, folderTime: string) => {
    return FileService.splitIntoFolders(sourcePath, images, splitCount, folderTime);
  });
}

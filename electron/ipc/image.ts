import { ipcMain } from 'electron';
import { ImageService } from '../services/image.service';

export function registerImageIpc() {
  ipcMain.handle('image:scanFolder', async (_, folderPath: string) => {
    if (!folderPath) return [];
    return ImageService.scanImagesInFolder(folderPath);
  });
}

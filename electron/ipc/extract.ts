import { ipcMain, BrowserWindow } from 'electron';
import { ExtractService, ExtractedImage, ImageFilterOptions } from '../services/extract.service';

export function registerExtractIpc() {
  ipcMain.handle('extract:parseUrl', async (event, url: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);

    return ExtractService.extractFromUrl(url, (message) => {
      win?.webContents.send('extract:log', message);
    });
  });

  ipcMain.handle('extract:parseUrls', async (event, urls: string[]) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const results = [];

    for (const url of urls) {
      const result = await ExtractService.extractFromUrl(url.trim(), (message) => {
        win?.webContents.send('extract:log', message);
      });
      results.push(result);
    }
    return results;
  });

  ipcMain.handle('extract:downloadImages', async (event, images: ExtractedImage[], savePath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    console.log(`[IPC] downloadImages 被调用，图片数量: ${images.length}，保存路径: ${savePath}`);

    return ExtractService.downloadImages(images, savePath, (progress) => {
      win?.webContents.send('extract:downloadProgress', progress);
    }, (message) => {
      console.log(`[下载日志] ${message}`);
      win?.webContents.send('extract:log', message);
    });
  });

  // 带过滤条件的图片下载（可设置最小宽/高/文件大小）
  ipcMain.handle('extract:filterAndDownloadImages', async (
    event,
    images: ExtractedImage[],
    savePath: string,
    filterOptions: ImageFilterOptions,
  ) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    console.log(`[IPC] filterAndDownloadImages 被调用，图片数量: ${images.length}，过滤规则: ${JSON.stringify(filterOptions)}`);

    return ExtractService.filterAndDownloadImages(images, savePath, filterOptions, (progress) => {
      win?.webContents.send('extract:downloadProgress', progress);
    }, (message) => {
      console.log(`[下载日志] ${message}`);
      win?.webContents.send('extract:log', message);
    });
  });

  ipcMain.handle('extract:detectPlatform', async (_, url: string) => {
    return ExtractService.detectPlatform(url);
  });

  ipcMain.handle('extract:proxyImage', async (event, url: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);

    try {
      const buffer = await ExtractService.fetchImageAsBuffer(url, (message) => {
        win?.webContents.send('extract:log', message);
      });
      const base64 = buffer.toString('base64');

      let mimeType = 'image/jpeg';
      const urlLower = url.toLowerCase();
      if (urlLower.includes('.png')) mimeType = 'image/png';
      else if (urlLower.includes('.gif')) mimeType = 'image/gif';
      else if (urlLower.includes('.webp')) mimeType = 'image/webp';

      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error('图片代理失败:', error);
      throw error;
    }
  });
}

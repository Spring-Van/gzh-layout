import type { ImageFile } from './index';

export { };

declare global {
  interface Window {
    electronAPI: {
      selectFolder: () => Promise<string | null>;
      scanFolder: (folderPath: string) => Promise<ImageFile[]>;
      backupFolder: (sourcePath: string) => Promise<string>;
      calculateMD5: (filePath: string) => Promise<string>;
      splitIntoFolders: (sourcePath: string, images: Array<{ path: string; name: string }>, splitCount: number, folderTime: string) => Promise<string[]>;
    };
  }
}

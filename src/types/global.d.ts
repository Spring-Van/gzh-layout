import type { ImageFile, ProjectConfig, CustomTemplate } from './index';

export { };

declare global {
  interface Window {
    electronAPI: {
      selectFolder: () => Promise<string | null>;
      scanFolder: (folderPath: string) => Promise<ImageFile[]>;
      backupFolder: (sourcePath: string) => Promise<string>;
      calculateMD5: (filePath: string) => Promise<string>;
      splitIntoFolders: (sourcePath: string, images: Array<{ path: string; name: string }>, splitCount: number, folderTime: string) => Promise<string[]>;
      db: {
        init: () => Promise<{ success: boolean }>;
        getAllProjects: () => Promise<ProjectConfig[]>;
        getProject: (projectId: string) => Promise<ProjectConfig | null>;
        saveProject: (project: ProjectConfig) => Promise<{ success: boolean }>;
        deleteProject: (projectId: string) => Promise<{ success: boolean }>;
        getAllTemplates: () => Promise<CustomTemplate[]>;
        saveTemplate: (template: CustomTemplate) => Promise<{ success: boolean }>;
        deleteTemplate: (templateId: string) => Promise<{ success: boolean }>;
      };
    };
  }
}

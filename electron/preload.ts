import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('file:selectFolder'),
  scanFolder: (folderPath: string) => ipcRenderer.invoke('image:scanFolder', folderPath),
  backupFolder: (sourcePath: string) => ipcRenderer.invoke('file:backupFolder', sourcePath),
  calculateMD5: (filePath: string) => ipcRenderer.invoke('file:calculateMD5', filePath),
  splitIntoFolders: (sourcePath: string, images: Array<{ path: string; name: string }>, splitCount: number, folderTime: string) =>
    ipcRenderer.invoke('file:splitIntoFolders', sourcePath, images, splitCount, folderTime),
  db: {
    init: () => ipcRenderer.invoke('db:init'),
    getAllProjects: () => ipcRenderer.invoke('db:getAllProjects'),
    getProject: (projectId: string) => ipcRenderer.invoke('db:getProject', projectId),
    saveProject: (project: any) => ipcRenderer.invoke('db:saveProject', project),
    deleteProject: (projectId: string) => ipcRenderer.invoke('db:deleteProject', projectId),
    getAllTemplates: () => ipcRenderer.invoke('db:getAllTemplates'),
    saveTemplate: (template: any) => ipcRenderer.invoke('db:saveTemplate', template),
    deleteTemplate: (templateId: string) => ipcRenderer.invoke('db:deleteTemplate', templateId),
    getAllCoverTemplates: () => ipcRenderer.invoke('db:getAllCoverTemplates'),
    saveCoverTemplate: (template: any) => ipcRenderer.invoke('db:saveCoverTemplate', template),
    deleteCoverTemplate: (templateId: string) => ipcRenderer.invoke('db:deleteCoverTemplate', templateId),
  },
})

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
  splitIntoFolders: (sourcePath: string, images: Array<{ path: string; name: string }>, splitCount: number, folderDate: string) =>
    ipcRenderer.invoke('file:splitIntoFolders', sourcePath, images, splitCount, folderDate),
  saveBase64Image: (base64Data: string, filename: string) => ipcRenderer.invoke('file:saveBase64Image', base64Data, filename),
  createCoverFolder: (basePath: string) => ipcRenderer.invoke('file:createCoverFolder', basePath),
  saveCoverImage: (coverFolder: string, base64Data: string, filename: string) => ipcRenderer.invoke('file:saveCoverImage', coverFolder, base64Data, filename),
  deleteCoverFolder: (coverFolder: string) => ipcRenderer.invoke('file:deleteCoverFolder', coverFolder),
  deleteCoverImage: (filePath: string) => ipcRenderer.invoke('file:deleteCoverImage', filePath),
  convertWebpImages: (sourcePath: string, webpImages: Array<{ path: string; name: string }>, backupEnabled: boolean) =>
    ipcRenderer.invoke('file:convertWebpImages', sourcePath, webpImages, backupEnabled),
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
    getAllWechatAccounts: () => ipcRenderer.invoke('db:getAllWechatAccounts'),
    getWechatAccount: (accountId: string) => ipcRenderer.invoke('db:getWechatAccount', accountId),
    getActiveWechatAccount: () => ipcRenderer.invoke('db:getActiveWechatAccount'),
    getDefaultSyncWechatAccount: () => ipcRenderer.invoke('db:getDefaultSyncWechatAccount'),
    saveWechatAccount: (account: any) => ipcRenderer.invoke('db:saveWechatAccount', account),
    setActiveWechatAccount: (accountId: string) => ipcRenderer.invoke('db:setActiveWechatAccount', accountId),
    setDefaultSyncWechatAccount: (accountId: string) => ipcRenderer.invoke('db:setDefaultSyncWechatAccount', accountId),
    deleteWechatAccount: (accountId: string) => ipcRenderer.invoke('db:deleteWechatAccount', accountId),
  },
  wechat: {
    getAccessToken: (appId: string, appSecret: string) => ipcRenderer.invoke('wechat:getAccessToken', appId, appSecret),
    clearTokenCache: () => ipcRenderer.invoke('wechat:clearTokenCache'),
    getAccountInfo: (accessToken: string) => ipcRenderer.invoke('wechat:getAccountInfo', accessToken),
    authenticate: (appId: string, appSecret: string) => ipcRenderer.invoke('wechat:authenticate', appId, appSecret),
    verifyToken: (accessToken: string) => ipcRenderer.invoke('wechat:verifyToken', accessToken),
    getTokenCacheInfo: () => ipcRenderer.invoke('wechat:getTokenCacheInfo'),
    uploadCoverImage: (accessToken: string, imagePath: string) => ipcRenderer.invoke('wechat:uploadCoverImage', accessToken, imagePath),
    uploadContentImage: (accessToken: string, imagePath: string) => ipcRenderer.invoke('wechat:uploadContentImage', accessToken, imagePath),
    batchUploadContentImages: (accessToken: string, imagePaths: string[]) => ipcRenderer.invoke('wechat:batchUploadContentImages', accessToken, imagePaths),
    createDraft: (accessToken: string, params: any) => ipcRenderer.invoke('wechat:createDraft', accessToken, params),
    publishDraft: (accessToken: string, draftMediaId: string) => ipcRenderer.invoke('wechat:publishDraft', accessToken, draftMediaId),
    buildArticleHtml: (title: string, imageUrls: string[]) => ipcRenderer.invoke('wechat:buildArticleHtml', title, imageUrls),
    calculateCropParams: (originalRatio?: number) => ipcRenderer.invoke('wechat:calculateCropParams', originalRatio),
    batchUpload: (params: any) => ipcRenderer.invoke('wechat:batchUpload', params),
    onUploadProgress: (callback: (progress: any) => void) => {
      const listener = (_event: any, progress: any) => callback(progress);
      ipcRenderer.on('wechat:uploadProgress', listener);
      return () => ipcRenderer.off('wechat:uploadProgress', listener);
    },
  },
})

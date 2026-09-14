import { ipcRenderer, contextBridge } from 'electron'

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
  renameFolderToTitle: (oldFolderPath: string, newFolderName: string) =>
    ipcRenderer.invoke('file:renameFolderToTitle', oldFolderPath, newFolderName),
  imageHistory: {
    load: () => ipcRenderer.invoke('image-history:load'),
    save: (history: unknown[]) => ipcRenderer.invoke('image-history:save', history),
  },
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
    getAllStyleTemplates: () => ipcRenderer.invoke('db:getAllStyleTemplates'),
    saveStyleTemplate: (template: any) => ipcRenderer.invoke('db:saveStyleTemplate', template),
    deleteStyleTemplate: (templateId: string) => ipcRenderer.invoke('db:deleteStyleTemplate', templateId),
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
  extract: {
    parseUrl: (url: string) => ipcRenderer.invoke('extract:parseUrl', url),
    parseUrls: (urls: string[]) => ipcRenderer.invoke('extract:parseUrls', urls),
    downloadImages: (images: any[], savePath: string) => ipcRenderer.invoke('extract:downloadImages', images, savePath),
    filterAndDownloadImages: (images: any[], savePath: string, filterOptions: any) =>
      ipcRenderer.invoke('extract:filterAndDownloadImages', images, savePath, filterOptions),
    detectPlatform: (url: string) => ipcRenderer.invoke('extract:detectPlatform', url),
    proxyImage: (url: string) => ipcRenderer.invoke('extract:proxyImage', url),
    onDownloadProgress: (callback: (progress: any) => void) => {
      const listener = (_event: any, progress: any) => callback(progress);
      ipcRenderer.on('extract:downloadProgress', listener);
      return () => ipcRenderer.off('extract:downloadProgress', listener);
    },
    onLog: (callback: (message: string) => void) => {
      const listener = (_event: any, message: string) => callback(message);
      ipcRenderer.on('extract:log', listener);
      return () => ipcRenderer.off('extract:log', listener);
    },
  },
  comic: {
    db: {
      getAllProjects: () => ipcRenderer.invoke('comic:db:getAllProjects'),
      getProject: (id: string) => ipcRenderer.invoke('comic:db:getProject', id),
      saveProject: (project: any) => ipcRenderer.invoke('comic:db:saveProject', project),
      deleteProject: (id: string) => ipcRenderer.invoke('comic:db:deleteProject', id),
      getAllModelConfigs: () => ipcRenderer.invoke('comic:db:getAllModelConfigs'),
      saveModelConfig: (config: any) => ipcRenderer.invoke('comic:db:saveModelConfig', config),
      deleteModelConfig: (id: string) => ipcRenderer.invoke('comic:db:deleteModelConfig', id),
      getAllPromptTemplates: () => ipcRenderer.invoke('comic:db:getAllPromptTemplates'),
      savePromptTemplate: (template: any) => ipcRenderer.invoke('comic:db:savePromptTemplate', template),
      deletePromptTemplate: (id: string) => ipcRenderer.invoke('comic:db:deletePromptTemplate', id),
      getProjectAssetsByProjectId: (projectId: string) => ipcRenderer.invoke('comic:db:getProjectAssetsByProjectId', projectId),
      getAllProjectAssets: () => ipcRenderer.invoke('comic:db:getAllProjectAssets'),
      saveProjectAsset: (asset: any) => ipcRenderer.invoke('comic:db:saveProjectAsset', asset),
      deleteProjectAsset: (id: string) => ipcRenderer.invoke('comic:db:deleteProjectAsset', id),
      deleteProjectAssetsByProjectId: (projectId: string) => ipcRenderer.invoke('comic:db:deleteProjectAssetsByProjectId', projectId),
      getAllMaterials: () => ipcRenderer.invoke('comic:db:getAllMaterials'),
      getMaterialsByProjectId: (projectId: string) => ipcRenderer.invoke('comic:db:getMaterialsByProjectId', projectId),
      saveMaterial: (material: any) => ipcRenderer.invoke('comic:db:saveMaterial', material),
      deleteMaterial: (id: string) => ipcRenderer.invoke('comic:db:deleteMaterial', id),
      getGenerationTasksByProjectId: (projectId: string) => ipcRenderer.invoke('comic:db:getGenerationTasksByProjectId', projectId),
      saveGenerationTask: (task: any) => ipcRenderer.invoke('comic:db:saveGenerationTask', task),
      deleteGenerationTask: (id: string) => ipcRenderer.invoke('comic:db:deleteGenerationTask', id),
      deleteGenerationTasksByProjectId: (projectId: string) => ipcRenderer.invoke('comic:db:deleteGenerationTasksByProjectId', projectId),
      getAppSettings: () => ipcRenderer.invoke('comic:db:getAppSettings'),
      saveAppSettings: (settings: any) => ipcRenderer.invoke('comic:db:saveAppSettings', settings),
    },
    upload: (request: any) => ipcRenderer.invoke('comic:upload', request),
    uploadFromUrl: (imageUrl: string, options?: any) => ipcRenderer.invoke('comic:uploadFromUrl', imageUrl, options),
    downloadSingle: (url: string, filename?: string, showInFolder?: boolean) => ipcRenderer.invoke('comic:downloadSingle', url, filename, showInFolder),
    downloadBatch: (request: any) => ipcRenderer.invoke('comic:downloadBatch', request),
    openaiProxy: (request: any) => ipcRenderer.invoke('comic:openaiProxy', request),
    llm: {
      fetchStart: (request: any) => ipcRenderer.invoke('comic:llmFetchStart', request),
      fetchAbort: (requestId: string) => ipcRenderer.send('comic:llmFetchAbort', requestId),
      onFetchEvent: (callback: (event: any) => void) => {
        const listener = (_event: any, payload: any) => callback(payload);
        ipcRenderer.on('comic:llmFetchEvent', listener);
        return () => ipcRenderer.off('comic:llmFetchEvent', listener);
      },
    },
    showInFolder: (filePath: string) => ipcRenderer.invoke('comic:showInFolder', filePath),
  },
})

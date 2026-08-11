"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  selectFolder: () => electron.ipcRenderer.invoke("file:selectFolder"),
  scanFolder: (folderPath) => electron.ipcRenderer.invoke("image:scanFolder", folderPath),
  backupFolder: (sourcePath) => electron.ipcRenderer.invoke("file:backupFolder", sourcePath),
  calculateMD5: (filePath) => electron.ipcRenderer.invoke("file:calculateMD5", filePath),
  splitIntoFolders: (sourcePath, images, splitCount, folderDate) => electron.ipcRenderer.invoke("file:splitIntoFolders", sourcePath, images, splitCount, folderDate),
  saveBase64Image: (base64Data, filename) => electron.ipcRenderer.invoke("file:saveBase64Image", base64Data, filename),
  createCoverFolder: (basePath) => electron.ipcRenderer.invoke("file:createCoverFolder", basePath),
  saveCoverImage: (coverFolder, base64Data, filename) => electron.ipcRenderer.invoke("file:saveCoverImage", coverFolder, base64Data, filename),
  deleteCoverFolder: (coverFolder) => electron.ipcRenderer.invoke("file:deleteCoverFolder", coverFolder),
  deleteCoverImage: (filePath) => electron.ipcRenderer.invoke("file:deleteCoverImage", filePath),
  convertWebpImages: (sourcePath, webpImages, backupEnabled) => electron.ipcRenderer.invoke("file:convertWebpImages", sourcePath, webpImages, backupEnabled),
  renameFolderToTitle: (oldFolderPath, newFolderName) => electron.ipcRenderer.invoke("file:renameFolderToTitle", oldFolderPath, newFolderName),
  imageHistory: {
    load: () => electron.ipcRenderer.invoke("image-history:load"),
    save: (history) => electron.ipcRenderer.invoke("image-history:save", history)
  },
  db: {
    init: () => electron.ipcRenderer.invoke("db:init"),
    getAllProjects: () => electron.ipcRenderer.invoke("db:getAllProjects"),
    getProject: (projectId) => electron.ipcRenderer.invoke("db:getProject", projectId),
    saveProject: (project) => electron.ipcRenderer.invoke("db:saveProject", project),
    deleteProject: (projectId) => electron.ipcRenderer.invoke("db:deleteProject", projectId),
    getAllTemplates: () => electron.ipcRenderer.invoke("db:getAllTemplates"),
    saveTemplate: (template) => electron.ipcRenderer.invoke("db:saveTemplate", template),
    deleteTemplate: (templateId) => electron.ipcRenderer.invoke("db:deleteTemplate", templateId),
    getAllCoverTemplates: () => electron.ipcRenderer.invoke("db:getAllCoverTemplates"),
    saveCoverTemplate: (template) => electron.ipcRenderer.invoke("db:saveCoverTemplate", template),
    deleteCoverTemplate: (templateId) => electron.ipcRenderer.invoke("db:deleteCoverTemplate", templateId),
    getAllStyleTemplates: () => electron.ipcRenderer.invoke("db:getAllStyleTemplates"),
    saveStyleTemplate: (template) => electron.ipcRenderer.invoke("db:saveStyleTemplate", template),
    deleteStyleTemplate: (templateId) => electron.ipcRenderer.invoke("db:deleteStyleTemplate", templateId),
    getAllWechatAccounts: () => electron.ipcRenderer.invoke("db:getAllWechatAccounts"),
    getWechatAccount: (accountId) => electron.ipcRenderer.invoke("db:getWechatAccount", accountId),
    getActiveWechatAccount: () => electron.ipcRenderer.invoke("db:getActiveWechatAccount"),
    getDefaultSyncWechatAccount: () => electron.ipcRenderer.invoke("db:getDefaultSyncWechatAccount"),
    saveWechatAccount: (account) => electron.ipcRenderer.invoke("db:saveWechatAccount", account),
    setActiveWechatAccount: (accountId) => electron.ipcRenderer.invoke("db:setActiveWechatAccount", accountId),
    setDefaultSyncWechatAccount: (accountId) => electron.ipcRenderer.invoke("db:setDefaultSyncWechatAccount", accountId),
    deleteWechatAccount: (accountId) => electron.ipcRenderer.invoke("db:deleteWechatAccount", accountId)
  },
  wechat: {
    getAccessToken: (appId, appSecret) => electron.ipcRenderer.invoke("wechat:getAccessToken", appId, appSecret),
    clearTokenCache: () => electron.ipcRenderer.invoke("wechat:clearTokenCache"),
    getAccountInfo: (accessToken) => electron.ipcRenderer.invoke("wechat:getAccountInfo", accessToken),
    authenticate: (appId, appSecret) => electron.ipcRenderer.invoke("wechat:authenticate", appId, appSecret),
    verifyToken: (accessToken) => electron.ipcRenderer.invoke("wechat:verifyToken", accessToken),
    getTokenCacheInfo: () => electron.ipcRenderer.invoke("wechat:getTokenCacheInfo"),
    uploadCoverImage: (accessToken, imagePath) => electron.ipcRenderer.invoke("wechat:uploadCoverImage", accessToken, imagePath),
    uploadContentImage: (accessToken, imagePath) => electron.ipcRenderer.invoke("wechat:uploadContentImage", accessToken, imagePath),
    batchUploadContentImages: (accessToken, imagePaths) => electron.ipcRenderer.invoke("wechat:batchUploadContentImages", accessToken, imagePaths),
    createDraft: (accessToken, params) => electron.ipcRenderer.invoke("wechat:createDraft", accessToken, params),
    publishDraft: (accessToken, draftMediaId) => electron.ipcRenderer.invoke("wechat:publishDraft", accessToken, draftMediaId),
    buildArticleHtml: (title, imageUrls) => electron.ipcRenderer.invoke("wechat:buildArticleHtml", title, imageUrls),
    calculateCropParams: (originalRatio) => electron.ipcRenderer.invoke("wechat:calculateCropParams", originalRatio),
    batchUpload: (params) => electron.ipcRenderer.invoke("wechat:batchUpload", params),
    onUploadProgress: (callback) => {
      const listener = (_event, progress) => callback(progress);
      electron.ipcRenderer.on("wechat:uploadProgress", listener);
      return () => electron.ipcRenderer.off("wechat:uploadProgress", listener);
    }
  },
  extract: {
    parseUrl: (url) => electron.ipcRenderer.invoke("extract:parseUrl", url),
    parseUrls: (urls) => electron.ipcRenderer.invoke("extract:parseUrls", urls),
    downloadImages: (images, savePath) => electron.ipcRenderer.invoke("extract:downloadImages", images, savePath),
    filterAndDownloadImages: (images, savePath, filterOptions) => electron.ipcRenderer.invoke("extract:filterAndDownloadImages", images, savePath, filterOptions),
    detectPlatform: (url) => electron.ipcRenderer.invoke("extract:detectPlatform", url),
    proxyImage: (url) => electron.ipcRenderer.invoke("extract:proxyImage", url),
    onDownloadProgress: (callback) => {
      const listener = (_event, progress) => callback(progress);
      electron.ipcRenderer.on("extract:downloadProgress", listener);
      return () => electron.ipcRenderer.off("extract:downloadProgress", listener);
    },
    onLog: (callback) => {
      const listener = (_event, message) => callback(message);
      electron.ipcRenderer.on("extract:log", listener);
      return () => electron.ipcRenderer.off("extract:log", listener);
    }
  },
  comic: {
    db: {
      getAllProjects: () => electron.ipcRenderer.invoke("comic:db:getAllProjects"),
      getProject: (id) => electron.ipcRenderer.invoke("comic:db:getProject", id),
      saveProject: (project) => electron.ipcRenderer.invoke("comic:db:saveProject", project),
      deleteProject: (id) => electron.ipcRenderer.invoke("comic:db:deleteProject", id),
      getAllModelConfigs: () => electron.ipcRenderer.invoke("comic:db:getAllModelConfigs"),
      saveModelConfig: (config) => electron.ipcRenderer.invoke("comic:db:saveModelConfig", config),
      deleteModelConfig: (id) => electron.ipcRenderer.invoke("comic:db:deleteModelConfig", id),
      getAllPromptTemplates: () => electron.ipcRenderer.invoke("comic:db:getAllPromptTemplates"),
      savePromptTemplate: (template) => electron.ipcRenderer.invoke("comic:db:savePromptTemplate", template),
      deletePromptTemplate: (id) => electron.ipcRenderer.invoke("comic:db:deletePromptTemplate", id),
      getProjectAssetsByProjectId: (projectId) => electron.ipcRenderer.invoke("comic:db:getProjectAssetsByProjectId", projectId),
      getAllProjectAssets: () => electron.ipcRenderer.invoke("comic:db:getAllProjectAssets"),
      saveProjectAsset: (asset) => electron.ipcRenderer.invoke("comic:db:saveProjectAsset", asset),
      deleteProjectAsset: (id) => electron.ipcRenderer.invoke("comic:db:deleteProjectAsset", id),
      deleteProjectAssetsByProjectId: (projectId) => electron.ipcRenderer.invoke("comic:db:deleteProjectAssetsByProjectId", projectId),
      getAllMaterials: () => electron.ipcRenderer.invoke("comic:db:getAllMaterials"),
      getMaterialsByProjectId: (projectId) => electron.ipcRenderer.invoke("comic:db:getMaterialsByProjectId", projectId),
      saveMaterial: (material) => electron.ipcRenderer.invoke("comic:db:saveMaterial", material),
      deleteMaterial: (id) => electron.ipcRenderer.invoke("comic:db:deleteMaterial", id),
      getGenerationTasksByProjectId: (projectId) => electron.ipcRenderer.invoke("comic:db:getGenerationTasksByProjectId", projectId),
      saveGenerationTask: (task) => electron.ipcRenderer.invoke("comic:db:saveGenerationTask", task),
      deleteGenerationTask: (id) => electron.ipcRenderer.invoke("comic:db:deleteGenerationTask", id),
      deleteGenerationTasksByProjectId: (projectId) => electron.ipcRenderer.invoke("comic:db:deleteGenerationTasksByProjectId", projectId),
      getAppSettings: () => electron.ipcRenderer.invoke("comic:db:getAppSettings"),
      saveAppSettings: (settings) => electron.ipcRenderer.invoke("comic:db:saveAppSettings", settings)
    },
    upload: (request) => electron.ipcRenderer.invoke("comic:upload", request),
    uploadFromUrl: (imageUrl, options) => electron.ipcRenderer.invoke("comic:uploadFromUrl", imageUrl, options),
    downloadSingle: (url, filename, showInFolder) => electron.ipcRenderer.invoke("comic:downloadSingle", url, filename, showInFolder),
    downloadBatch: (request) => electron.ipcRenderer.invoke("comic:downloadBatch", request),
    openaiProxy: (request) => electron.ipcRenderer.invoke("comic:openaiProxy", request),
    showInFolder: (filePath) => electron.ipcRenderer.invoke("comic:showInFolder", filePath)
  }
});

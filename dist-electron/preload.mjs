"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
});
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
    getAllWechatAccounts: () => electron.ipcRenderer.invoke("db:getAllWechatAccounts"),
    getWechatAccount: (accountId) => electron.ipcRenderer.invoke("db:getWechatAccount", accountId),
    getActiveWechatAccount: () => electron.ipcRenderer.invoke("db:getActiveWechatAccount"),
    saveWechatAccount: (account) => electron.ipcRenderer.invoke("db:saveWechatAccount", account),
    setActiveWechatAccount: (accountId) => electron.ipcRenderer.invoke("db:setActiveWechatAccount", accountId),
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
  }
});

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
  splitIntoFolders: (sourcePath, images, splitCount, folderTime) => electron.ipcRenderer.invoke("file:splitIntoFolders", sourcePath, images, splitCount, folderTime)
});

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { dialog, ipcMain, app, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path$1 from "node:path";
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import { Buffer as Buffer$1 } from "node:buffer";
import sharp from "sharp";
import { webcrypto } from "node:crypto";
import fs$1 from "fs";
class FileService {
  static async selectFolder() {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  }
  static async backupFolder(sourcePath) {
    const folderName = path.basename(sourcePath);
    const backupPath = path.join(path.dirname(sourcePath), `${folderName}-备份`);
    if (await fs.pathExists(backupPath)) {
      await fs.remove(backupPath);
    }
    await fs.copy(sourcePath, backupPath);
    return backupPath;
  }
  static async calculateMD5(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("md5");
      const stream = fs.createReadStream(filePath);
      stream.on("error", reject);
      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("end", () => resolve(hash.digest("hex")));
    });
  }
  static async splitIntoFolders(sourcePath, images, splitCount, folderDate) {
    const folderName = path.basename(sourcePath);
    const backupPath = path.join(path.dirname(sourcePath), `${folderName}-备份`);
    if (await fs.pathExists(backupPath)) {
      await fs.remove(backupPath);
    }
    await fs.ensureDir(backupPath);
    const createdFolders = [];
    const groups = [];
    for (let i = 0; i < images.length; i += splitCount) {
      groups.push(images.slice(i, i + splitCount));
    }
    for (let i = 0; i < groups.length; i++) {
      const groupIndex = i + 1;
      const groupFolderName = `${folderDate} - 第${groupIndex}组`;
      const groupFolderPath = path.join(backupPath, groupFolderName);
      await fs.ensureDir(groupFolderPath);
      createdFolders.push(groupFolderPath);
      for (const image of groups[i]) {
        const destPath = path.join(groupFolderPath, image.name);
        await fs.copy(image.path, destPath);
      }
    }
    return createdFolders;
  }
  static async saveBase64Image(base64Data, filename) {
    const tempDir = path.join(process.env.APPDATA || process.env.HOME || "", "gzh-layout", "temp");
    await fs.ensureDir(tempDir);
    const filePath = path.join(tempDir, filename);
    const matches = base64Data.match(/^data:image\/(png|jpeg|jpg);base64,(.*)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("无效的 base64 图片格式");
    }
    const imageBuffer = Buffer$1.from(matches[2], "base64");
    await fs.writeFile(filePath, imageBuffer);
    return filePath;
  }
  static async createCoverFolder(basePath) {
    const coverFolder = path.join(basePath, "封面");
    await fs.ensureDir(coverFolder);
    return coverFolder;
  }
  static async saveCoverImage(coverFolder, base64Data, filename) {
    await fs.ensureDir(coverFolder);
    const filePath = path.join(coverFolder, filename);
    const matches = base64Data.match(/^data:image\/(png|jpeg|jpg);base64,(.*)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("无效的 base64 图片格式");
    }
    const imageBuffer = Buffer$1.from(matches[2], "base64");
    await fs.writeFile(filePath, imageBuffer);
    return filePath;
  }
  static async deleteCoverFolder(coverFolder) {
    if (await fs.pathExists(coverFolder)) {
      await fs.remove(coverFolder);
    }
  }
  static async deleteCoverImage(filePath) {
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
    }
  }
  /**
   * 将 WebP 图片转换为 PNG 格式
   * 备份模式: 保存到 {原文件夹名-备份}/webp-converted
   * 非备份模式: 保存到 {原文件夹名}/webp-converted
   */
  static async convertWebpImages(sourcePath, webpImages, backupEnabled) {
    const folderName = path.basename(sourcePath);
    const parentDir = path.dirname(sourcePath);
    const baseDir = backupEnabled ? path.join(parentDir, `${folderName}-备份`) : sourcePath;
    const outputDir = path.join(baseDir, "webp-converted");
    await fs.ensureDir(outputDir);
    const convertedMap = {};
    for (const image of webpImages) {
      const outputName = path.parse(image.name).name + ".png";
      const outputPath = path.join(outputDir, outputName);
      await sharp(image.path).png().toFile(outputPath);
      convertedMap[image.path] = outputPath;
    }
    return convertedMap;
  }
}
function registerFileIpc() {
  ipcMain.handle("file:selectFolder", async () => {
    return FileService.selectFolder();
  });
  ipcMain.handle("file:backupFolder", async (_, sourcePath) => {
    return FileService.backupFolder(sourcePath);
  });
  ipcMain.handle("file:calculateMD5", async (_, filePath) => {
    return FileService.calculateMD5(filePath);
  });
  ipcMain.handle("file:splitIntoFolders", async (_, sourcePath, images, splitCount, folderDate) => {
    return FileService.splitIntoFolders(sourcePath, images, splitCount, folderDate);
  });
  ipcMain.handle("file:saveBase64Image", async (_, base64Data, filename) => {
    return FileService.saveBase64Image(base64Data, filename);
  });
  ipcMain.handle("file:createCoverFolder", async (_, basePath) => {
    return FileService.createCoverFolder(basePath);
  });
  ipcMain.handle("file:saveCoverImage", async (_, coverFolder, base64Data, filename) => {
    return FileService.saveCoverImage(coverFolder, base64Data, filename);
  });
  ipcMain.handle("file:deleteCoverFolder", async (_, coverFolder) => {
    return FileService.deleteCoverFolder(coverFolder);
  });
  ipcMain.handle("file:deleteCoverImage", async (_, filePath) => {
    return FileService.deleteCoverImage(filePath);
  });
  ipcMain.handle("file:convertWebpImages", async (_, sourcePath, webpImages, backupEnabled) => {
    return FileService.convertWebpImages(sourcePath, webpImages, backupEnabled);
  });
}
let urlAlphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
const POOL_SIZE_MULTIPLIER = 128;
let pool, poolOffset;
function fillPool(bytes) {
  if (!pool || pool.length < bytes) {
    pool = Buffer.allocUnsafe(bytes * POOL_SIZE_MULTIPLIER);
    webcrypto.getRandomValues(pool);
    poolOffset = 0;
  } else if (poolOffset + bytes > pool.length) {
    webcrypto.getRandomValues(pool);
    poolOffset = 0;
  }
  poolOffset += bytes;
}
function nanoid(size = 21) {
  fillPool(size |= 0);
  let id = "";
  for (let i = poolOffset - size; i < poolOffset; i++) {
    id += urlAlphabet[pool[i] & 63];
  }
  return id;
}
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const WEBP_MAGIC = Buffer.from([82, 73, 70, 70]);
const WEBP_MAGIC_OFFSET = 0;
const WEBP_MARKER = Buffer.from([87, 69, 66, 80]);
class ImageService {
  /**
   * 通过 Magic Number 检测文件是否为 WebP 格式
   */
  static async isWebpByMagicNumber(filePath) {
    try {
      const fd = await fs.open(filePath, "r");
      const header = Buffer.alloc(12);
      await fd.read(header, 0, 12, 0);
      await fd.close();
      return header.compare(WEBP_MAGIC, 0, 4, WEBP_MAGIC_OFFSET, 4) === 0 && header.compare(WEBP_MARKER, 0, 4, 8, 12) === 0;
    } catch {
      return false;
    }
  }
  /**
   * 使用 sharp 检测图片的实际格式
   */
  static async detectActualFormat(filePath) {
    try {
      const metadata = await sharp(filePath).metadata();
      return metadata.format || "unknown";
    } catch {
      if (await this.isWebpByMagicNumber(filePath)) {
        return "webp";
      }
      return "unknown";
    }
  }
  static async scanImagesInFolder(folderPath) {
    const files = await fs.readdir(folderPath);
    const imageList = [];
    let order = 0;
    for (const fileName of files) {
      const fullPath = path.join(folderPath, fileName);
      const stat = await fs.stat(fullPath);
      if (!stat.isFile()) continue;
      const ext = path.extname(fileName).toLowerCase();
      if (!IMAGE_EXTENSIONS.includes(ext)) continue;
      try {
        const metadata = await sharp(fullPath).metadata();
        let actualFormat = metadata.format || ext.replace(".", "");
        const width = metadata.width || 1920;
        const height = metadata.height || 1080;
        if (actualFormat !== "webp" && await this.isWebpByMagicNumber(fullPath)) {
          actualFormat = "webp";
        }
        imageList.push({
          id: nanoid(),
          name: fileName,
          path: fullPath,
          size: stat.size,
          width,
          height,
          format: actualFormat,
          enabled: true,
          isCover: false,
          order: order++
        });
      } catch (error) {
        console.error("图片解析失败:", fullPath, error);
      }
    }
    return imageList;
  }
}
function registerImageIpc() {
  ipcMain.handle("image:scanFolder", async (_, folderPath) => {
    if (!folderPath) return [];
    return ImageService.scanImagesInFolder(folderPath);
  });
}
class DatabaseService {
  constructor() {
    __publicField(this, "dbPath");
    __publicField(this, "data");
    const userDataPath = app.getPath("userData");
    this.dbPath = path.join(userDataPath, "gzh-layout.json");
    this.data = this.loadFromFile();
  }
  loadFromFile() {
    if (fs$1.existsSync(this.dbPath)) {
      try {
        const content = fs$1.readFileSync(this.dbPath, "utf-8");
        const data = JSON.parse(content);
        return {
          projects: data.projects || [],
          templates: data.templates || [],
          coverTemplates: data.coverTemplates || [],
          wechatAccounts: data.wechatAccounts || [],
          draftRecords: data.draftRecords || []
        };
      } catch (error) {
        console.error("读取数据库文件失败:", error);
      }
    }
    return {
      projects: [],
      templates: [],
      coverTemplates: [],
      wechatAccounts: [],
      draftRecords: []
    };
  }
  saveToFile() {
    try {
      fs$1.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (error) {
      console.error("保存数据库文件失败:", error);
    }
  }
  async init() {
  }
  // ========== Projects ==========
  getAllProjects() {
    return [...this.data.projects].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
  getProject(projectId) {
    return this.data.projects.find((p) => p.projectId === projectId) || null;
  }
  saveProject(project) {
    const index = this.data.projects.findIndex((p) => p.projectId === project.projectId);
    if (index !== -1) {
      this.data.projects[index] = project;
    } else {
      this.data.projects.push(project);
    }
    this.saveToFile();
  }
  deleteProject(projectId) {
    this.data.projects = this.data.projects.filter((p) => p.projectId !== projectId);
    this.saveToFile();
  }
  // ========== Templates ==========
  getAllTemplates() {
    return [...this.data.templates].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
  saveTemplate(template) {
    const index = this.data.templates.findIndex((t) => t.id === template.id);
    if (index !== -1) {
      this.data.templates[index] = template;
    } else {
      this.data.templates.push(template);
    }
    this.saveToFile();
  }
  deleteTemplate(templateId) {
    this.data.templates = this.data.templates.filter((t) => t.id !== templateId);
    this.saveToFile();
  }
  // ========== Cover Templates ==========
  getAllCoverTemplates() {
    return [...this.data.coverTemplates].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
  saveCoverTemplate(template) {
    const index = this.data.coverTemplates.findIndex((t) => t.id === template.id);
    if (index !== -1) {
      this.data.coverTemplates[index] = template;
    } else {
      this.data.coverTemplates.push(template);
    }
    this.saveToFile();
  }
  deleteCoverTemplate(templateId) {
    this.data.coverTemplates = this.data.coverTemplates.filter((t) => t.id !== templateId);
    this.saveToFile();
  }
  // ========== Wechat Accounts ==========
  getAllWechatAccounts() {
    return [...this.data.wechatAccounts];
  }
  getWechatAccount(accountId) {
    return this.data.wechatAccounts.find((a) => a.id === accountId) || null;
  }
  getActiveWechatAccount() {
    return this.data.wechatAccounts.find((a) => a.isActive) || null;
  }
  getDefaultSyncWechatAccount() {
    return this.data.wechatAccounts.find((a) => a.isDefaultSync) || null;
  }
  saveWechatAccount(account) {
    const index = this.data.wechatAccounts.findIndex((a) => a.id === account.id);
    if (index !== -1) {
      this.data.wechatAccounts[index] = account;
    } else {
      this.data.wechatAccounts.push(account);
    }
    this.saveToFile();
  }
  setActiveWechatAccount(accountId) {
    this.data.wechatAccounts.forEach((a) => {
      a.isActive = a.id === accountId;
    });
    this.saveToFile();
  }
  setDefaultSyncWechatAccount(accountId) {
    this.data.wechatAccounts.forEach((a) => {
      a.isDefaultSync = a.id === accountId;
    });
    this.saveToFile();
  }
  deleteWechatAccount(accountId) {
    this.data.wechatAccounts = this.data.wechatAccounts.filter((a) => a.id !== accountId);
    this.saveToFile();
  }
}
const dbService = new DatabaseService();
function registerDatabaseIpc() {
  ipcMain.handle("db:init", async () => {
    await dbService.init();
    return { success: true };
  });
  ipcMain.handle("db:getAllProjects", () => {
    return dbService.getAllProjects();
  });
  ipcMain.handle("db:getProject", (_event, projectId) => {
    return dbService.getProject(projectId);
  });
  ipcMain.handle("db:saveProject", (_event, project) => {
    dbService.saveProject(project);
    return { success: true };
  });
  ipcMain.handle("db:deleteProject", (_event, projectId) => {
    dbService.deleteProject(projectId);
    return { success: true };
  });
  ipcMain.handle("db:getAllTemplates", () => {
    return dbService.getAllTemplates();
  });
  ipcMain.handle("db:saveTemplate", (_event, template) => {
    dbService.saveTemplate(template);
    return { success: true };
  });
  ipcMain.handle("db:deleteTemplate", (_event, templateId) => {
    dbService.deleteTemplate(templateId);
    return { success: true };
  });
  ipcMain.handle("db:getAllCoverTemplates", () => {
    return dbService.getAllCoverTemplates();
  });
  ipcMain.handle("db:saveCoverTemplate", (_event, template) => {
    dbService.saveCoverTemplate(template);
    return { success: true };
  });
  ipcMain.handle("db:deleteCoverTemplate", (_event, templateId) => {
    dbService.deleteCoverTemplate(templateId);
    return { success: true };
  });
  ipcMain.handle("db:getAllWechatAccounts", () => {
    return dbService.getAllWechatAccounts();
  });
  ipcMain.handle("db:getWechatAccount", (_event, accountId) => {
    return dbService.getWechatAccount(accountId);
  });
  ipcMain.handle("db:getActiveWechatAccount", () => {
    return dbService.getActiveWechatAccount();
  });
  ipcMain.handle("db:getDefaultSyncWechatAccount", () => {
    return dbService.getDefaultSyncWechatAccount();
  });
  ipcMain.handle("db:saveWechatAccount", (_event, account) => {
    dbService.saveWechatAccount(account);
    return { success: true };
  });
  ipcMain.handle("db:setActiveWechatAccount", (_event, accountId) => {
    dbService.setActiveWechatAccount(accountId);
    return { success: true };
  });
  ipcMain.handle("db:setDefaultSyncWechatAccount", (_event, accountId) => {
    dbService.setDefaultSyncWechatAccount(accountId);
    return { success: true };
  });
  ipcMain.handle("db:deleteWechatAccount", (_event, accountId) => {
    dbService.deleteWechatAccount(accountId);
    return { success: true };
  });
}
const WECHAT_API_BASE = "https://api.weixin.qq.com";
const TOKEN_EXPIRE_BUFFER = 300;
const BOUNDARY_PREFIX = "----WechatFormBoundary";
function generateBoundary() {
  return `${BOUNDARY_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
function buildMultipartBody(fieldName, fileName, fileBuffer, mimeType) {
  const boundary = generateBoundary();
  const header = Buffer$1.from(
    `--${boundary}\r
Content-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r
Content-Type: ${mimeType}\r
\r
`,
    "utf-8"
  );
  const footer = Buffer$1.from(`\r
--${boundary}--\r
`, "utf-8");
  return {
    body: Buffer$1.concat([header, fileBuffer, footer]),
    contentType: `multipart/form-data; boundary=${boundary}`,
    boundary
  };
}
class WechatService {
  constructor() {
    __publicField(this, "tokenCache", null);
  }
  async getAccessToken(appId, appSecret) {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.accessToken;
    }
    const url = `${WECHAT_API_BASE}/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.errcode) {
      throw new Error(`获取AccessToken失败 [${data.errcode}]: ${data.errmsg}`);
    }
    this.tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in - TOKEN_EXPIRE_BUFFER) * 1e3
    };
    return data.access_token;
  }
  clearTokenCache() {
    this.tokenCache = null;
  }
  getTokenCacheInfo() {
    return this.tokenCache;
  }
  async getAccountInfo(accessToken) {
    const verifyUrl = `${WECHAT_API_BASE}/cgi-bin/getcallbackip?access_token=${accessToken}`;
    const verifyResponse = await fetch(verifyUrl);
    const verifyData = await verifyResponse.json();
    if (verifyData.errcode) {
      throw new Error(`Token 校验失败 [${verifyData.errcode}]: ${verifyData.errmsg}`);
    }
    const infoUrl = `${WECHAT_API_BASE}/cgi-bin/account/getaccountbasicinfo?access_token=${accessToken}`;
    const infoResponse = await fetch(infoUrl, { method: "POST" });
    const infoData = await infoResponse.json();
    if (infoData.errcode) {
      return {
        nickname: "",
        headImg: "",
        serviceType: -1,
        verifyType: -1,
        userName: "",
        alias: "",
        qrcodeUrl: ""
      };
    }
    return {
      nickname: infoData.nickname || "",
      headImg: infoData.head_img || "",
      serviceType: infoData.service_type ?? -1,
      verifyType: infoData.verify_type ?? -1,
      userName: infoData.user_name || "",
      alias: infoData.alias || "",
      qrcodeUrl: infoData.qrcode_url || ""
    };
  }
  async authenticate(appId, appSecret) {
    const accessToken = await this.getAccessToken(appId, appSecret);
    const tokenCache = this.tokenCache;
    const expiresIn = Math.floor((tokenCache.expiresAt - Date.now()) / 1e3);
    const accountInfo = await this.getAccountInfo(accessToken);
    return {
      success: true,
      accessToken,
      expiresIn,
      accountInfo
    };
  }
  async verifyToken(accessToken) {
    const url = `${WECHAT_API_BASE}/cgi-bin/getcallbackip?access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();
    return !data.errcode;
  }
  async uploadCoverImage(accessToken, imagePath) {
    const buffer = await fs.readFile(imagePath);
    const fileName = path.basename(imagePath);
    const ext = path.extname(fileName).toLowerCase();
    const mimeMap = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif" };
    if (ext === ".webp") {
      throw new Error(`微信不支持 WebP 格式，请先将 ${fileName} 转换为 PNG 或 JPG`);
    }
    const mimeType = mimeMap[ext] || "image/jpeg";
    const { body: multipartBody, contentType } = buildMultipartBody("media", fileName, buffer, mimeType);
    const url = `${WECHAT_API_BASE}/cgi-bin/material/add_material?access_token=${accessToken}&type=image`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: new Uint8Array(multipartBody)
    });
    const data = await response.json();
    if (data.errcode) {
      throw new Error(`上传封面图失败 [${data.errcode}]: ${data.errmsg}`);
    }
    return { mediaId: data.media_id, url: data.url };
  }
  async uploadContentImage(accessToken, imagePath) {
    const buffer = await fs.readFile(imagePath);
    const fileName = path.basename(imagePath);
    const ext = path.extname(fileName).toLowerCase();
    const mimeMap = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif" };
    if (ext === ".webp") {
      throw new Error(`微信不支持 WebP 格式，请先将 ${fileName} 转换为 PNG 或 JPG`);
    }
    const mimeType = mimeMap[ext] || "image/jpeg";
    const { body: multipartBody, contentType } = buildMultipartBody("media", fileName, buffer, mimeType);
    const url = `${WECHAT_API_BASE}/cgi-bin/media/uploadimg?access_token=${accessToken}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: new Uint8Array(multipartBody)
    });
    const data = await response.json();
    if (data.errcode) {
      throw new Error(`上传正文图片失败 (${fileName}) [${data.errcode}]: ${data.errmsg}`);
    }
    return { originalPath: imagePath, url: data.url };
  }
  async batchUploadContentImages(accessToken, imagePaths, onProgress, articleIndex, totalArticles) {
    const results = [];
    for (let i = 0; i < imagePaths.length; i++) {
      onProgress == null ? void 0 : onProgress({
        currentArticleIndex: articleIndex ?? 0,
        totalArticles: totalArticles ?? 1,
        step: "images",
        message: `正在上传正文图片 ${i + 1}/${imagePaths.length}...`
      });
      const result = await this.uploadContentImage(accessToken, imagePaths[i]);
      results.push(result);
      if (i < imagePaths.length - 1) {
        await this.delay(300);
      }
    }
    return results;
  }
  async createDraft(accessToken, params) {
    const body = {
      articles: [
        {
          title: params.title,
          thumb_media_id: params.thumbMediaId,
          author: params.author ?? "",
          digest: params.digest ?? params.title,
          content: params.content,
          content_source_url: params.contentSourceUrl ?? "",
          need_open_comment: params.needOpenComment ?? 1,
          only_fans_can_comment: params.onlyFansCanComment ?? 0,
          pic_crop_235_1: params.picCrop2351 ?? "0_0_1_1",
          pic_crop_1_1: params.picCrop11 ?? "0.287234_0_0.712766_1"
        }
      ]
    };
    const url = `${WECHAT_API_BASE}/cgi-bin/draft/add?access_token=${accessToken}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (data.errcode) {
      throw new Error(`创建草稿失败 [${data.errcode}]: ${data.errmsg}`);
    }
    return data.media_id;
  }
  async publishDraft(accessToken, draftMediaId) {
    const body = { media_id: draftMediaId };
    const url = `${WECHAT_API_BASE}/cgi-bin/freepublish/submit?access_token=${accessToken}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (data.errcode) {
      throw new Error(`发布草稿失败 [${data.errcode}]: ${data.errmsg}`);
    }
    return data.publish_id;
  }
  buildArticleHtml(title, imageUrls) {
    const header = `<section style="text-align:center;color:#000;font-size:16px;padding-bottom:20px;font-weight:bold;">${this.escapeHtml(title)}</section>`;
    const images = imageUrls.map((url) => `<p><img src="${url}" data-src="${url}" style="max-width:100%;display:block;margin:0 auto;"></p>`).join("\n");
    return header + images;
  }
  calculateCropParams(originalRatio = 2.35) {
    const pic_crop_235_1 = "0_0_1_1";
    const cropWidth = 1 / originalRatio;
    const margin = (1 - cropWidth) / 2;
    const x1 = margin.toFixed(6);
    const x2 = (1 - margin).toFixed(6);
    const pic_crop_1_1 = `${x1}_0_${x2}_1`;
    return { pic_crop_235_1, pic_crop_1_1 };
  }
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
}
const wechatService = new WechatService();
function minifyHtml(html) {
  return html.replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();
}
function registerWechatIpc() {
  ipcMain.handle("wechat:getAccessToken", async (_, appId, appSecret) => {
    return wechatService.getAccessToken(appId, appSecret);
  });
  ipcMain.handle("wechat:clearTokenCache", async () => {
    wechatService.clearTokenCache();
  });
  ipcMain.handle("wechat:getAccountInfo", async (_, accessToken) => {
    return wechatService.getAccountInfo(accessToken);
  });
  ipcMain.handle("wechat:authenticate", async (_, appId, appSecret) => {
    return wechatService.authenticate(appId, appSecret);
  });
  ipcMain.handle("wechat:verifyToken", async (_, accessToken) => {
    return wechatService.verifyToken(accessToken);
  });
  ipcMain.handle("wechat:getTokenCacheInfo", async () => {
    return wechatService.getTokenCacheInfo();
  });
  ipcMain.handle("wechat:uploadCoverImage", async (_, accessToken, imagePath) => {
    return wechatService.uploadCoverImage(accessToken, imagePath);
  });
  ipcMain.handle("wechat:uploadContentImage", async (_, accessToken, imagePath) => {
    return wechatService.uploadContentImage(accessToken, imagePath);
  });
  ipcMain.handle("wechat:batchUploadContentImages", async (_, accessToken, imagePaths) => {
    return wechatService.batchUploadContentImages(accessToken, imagePaths);
  });
  ipcMain.handle("wechat:createDraft", async (_, accessToken, params) => {
    return wechatService.createDraft(accessToken, params);
  });
  ipcMain.handle("wechat:publishDraft", async (_, accessToken, draftMediaId) => {
    return wechatService.publishDraft(accessToken, draftMediaId);
  });
  ipcMain.handle("wechat:buildArticleHtml", async (_, title, imageUrls) => {
    return wechatService.buildArticleHtml(title, imageUrls);
  });
  ipcMain.handle("wechat:calculateCropParams", async (_, originalRatio) => {
    return wechatService.calculateCropParams(originalRatio);
  });
  ipcMain.handle("wechat:batchUpload", async (event, params) => {
    const { appId, appSecret, articles, publish = false } = params;
    const results = [];
    const sender = event.sender;
    const sendProgress = (progress) => {
      try {
        if (!sender.isDestroyed()) {
          sender.send("wechat:uploadProgress", progress);
        }
      } catch {
      }
    };
    try {
      sendProgress({
        currentArticleIndex: 0,
        totalArticles: articles.length,
        step: "token",
        message: "正在获取 AccessToken..."
      });
      let accessToken;
      if (appSecret) {
        accessToken = await wechatService.getAccessToken(appId, appSecret);
      } else {
        const tokenInfo = wechatService.getTokenCacheInfo();
        if (tokenInfo && tokenInfo.expiresAt > Date.now()) {
          accessToken = tokenInfo.accessToken;
        } else {
          throw new Error("AccessToken 已过期，请重新鉴权");
        }
      }
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        sendProgress({
          currentArticleIndex: i,
          totalArticles: articles.length,
          step: "cover",
          message: `[${i + 1}/${articles.length}] 正在上传封面图...`
        });
        const coverResult = await wechatService.uploadCoverImage(accessToken, article.coverImagePath);
        sendProgress({
          currentArticleIndex: i,
          totalArticles: articles.length,
          step: "images",
          message: `[${i + 1}/${articles.length}] 正在上传正文图片 (${article.contentImagePaths.length} 张)...`
        });
        const contentResults = await wechatService.batchUploadContentImages(
          accessToken,
          article.contentImagePaths,
          (p) => sendProgress({ ...p, currentArticleIndex: i, totalArticles: articles.length }),
          i,
          articles.length
        );
        sendProgress({
          currentArticleIndex: i,
          totalArticles: articles.length,
          step: "draft",
          message: `[${i + 1}/${articles.length}] 正在创建草稿...`
        });
        const imageUrls = contentResults.map((r) => r.url);
        let htmlContent;
        if (article.contentHtml) {
          htmlContent = article.contentHtml;
          for (let j = 0; j < contentResults.length; j++) {
            const originalPath = contentResults[j].originalPath;
            const wechatUrl = contentResults[j].url;
            htmlContent = htmlContent.split(originalPath).join(wechatUrl);
          }
        } else {
          htmlContent = wechatService.buildArticleHtml(article.title, imageUrls);
        }
        htmlContent = minifyHtml(htmlContent);
        const draftMediaId = await wechatService.createDraft(accessToken, {
          title: article.title,
          thumbMediaId: coverResult.mediaId,
          author: article.author,
          digest: article.digest,
          content: htmlContent,
          picCrop2351: article.picCrop2351,
          picCrop11: article.picCrop11
        });
        const result = {
          title: article.title,
          draftMediaId,
          coverUrl: coverResult.url
        };
        if (publish) {
          sendProgress({
            currentArticleIndex: i,
            totalArticles: articles.length,
            step: "publish",
            message: `[${i + 1}/${articles.length}] 正在发布草稿...`
          });
          try {
            result.publishId = await wechatService.publishDraft(accessToken, draftMediaId);
          } catch (publishErr) {
            const publishMessage = publishErr instanceof Error ? publishErr.message : String(publishErr);
            result.publishError = publishMessage;
            sendProgress({
              currentArticleIndex: i,
              totalArticles: articles.length,
              step: "done",
              message: `[${i + 1}/${articles.length}] 草稿已创建，但发布失败：${publishMessage}`
            });
          }
        }
        results.push(result);
        if (i < articles.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
      sendProgress({
        currentArticleIndex: articles.length,
        totalArticles: articles.length,
        step: "done",
        message: `全部完成！共处理 ${articles.length} 篇文章。`
      });
      return { success: true, results };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendProgress({
        currentArticleIndex: results.length,
        totalArticles: articles.length,
        step: "done",
        message: `上传失败: ${message}`
      });
      return { success: false, error: message, results };
    }
  });
}
const __dirname$1 = path$1.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path$1.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path$1.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path$1.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path$1.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path$1.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path$1.join(__dirname$1, "preload.mjs"),
      webSecurity: false
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path$1.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(async () => {
  await dbService.init();
  createWindow();
  registerFileIpc();
  registerImageIpc();
  registerDatabaseIpc();
  registerWechatIpc();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};

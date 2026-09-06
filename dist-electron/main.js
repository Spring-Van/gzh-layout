var $w = Object.defineProperty;
var wd = (t) => {
  throw TypeError(t);
};
var Bw = (t, e, n) => e in t ? $w(t, e, { enumerable: !0, configurable: !0, writable: !0, value: n }) : t[e] = n;
var ne = (t, e, n) => Bw(t, typeof e != "symbol" ? e + "" : e, n), yl = (t, e, n) => e.has(t) || wd("Cannot " + n);
var m = (t, e, n) => (yl(t, e, "read from private field"), n ? n.call(t) : e.get(t)), fe = (t, e, n) => e.has(t) ? wd("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, n), Q = (t, e, n, i) => (yl(t, e, "write to private field"), i ? i.call(t, n) : e.set(t, n), n), re = (t, e, n) => (yl(t, e, "access private method"), n);
var to = (t, e, n, i) => ({
  set _(r) {
    Q(t, e, r, n);
  },
  get _() {
    return m(t, e, i);
  }
});
import { dialog as Uw, app as Oi, ipcMain as be, safeStorage as Mg, net as $g, BrowserWindow as Hi, shell as Ju, protocol as Bg } from "electron";
import Ug, { fileURLToPath as zw, pathToFileURL as Ww } from "node:url";
import ht from "node:path";
import qe from "fs-extra";
import Ce, { resolve as _d } from "path";
import Xp from "crypto";
import { Buffer as Ns } from "node:buffer";
import Zn from "sharp";
import qw, { readFile as Gw, mkdir as Hw, writeFile as Sd, rm as Vw, rename as Kw } from "node:fs/promises";
import { webcrypto as Ed } from "node:crypto";
import ut from "node:fs";
import ss from "http";
import * as Yw from "https";
import as from "https";
import * as vl from "cheerio";
import xt from "util";
import nt, { Readable as Zw } from "stream";
import kc from "url";
import dt from "fs";
import Xw from "net";
import Jw from "tls";
import Jp from "assert";
import zg from "tty";
import Qw from "os";
import Ii, { EventEmitter as e_ } from "events";
import Wg from "http2";
import Ht from "zlib";
import t_ from "constants";
import $n from "buffer";
import n_ from "node:events";
import i_ from "node:stream";
import r_ from "node:string_decoder";
class hn {
  static async selectFolder() {
    const e = await Uw.showOpenDialog({
      properties: ["openDirectory"]
    });
    return e.canceled || e.filePaths.length === 0 ? null : e.filePaths[0];
  }
  static async backupFolder(e) {
    const n = Ce.basename(e), i = Ce.join(Ce.dirname(e), `${n}-备份`);
    return await qe.pathExists(i) && await qe.remove(i), await qe.copy(e, i), i;
  }
  static async calculateMD5(e) {
    return new Promise((n, i) => {
      const r = Xp.createHash("md5"), s = qe.createReadStream(e);
      s.on("error", i), s.on("data", (a) => r.update(a)), s.on("end", () => n(r.digest("hex")));
    });
  }
  static async splitIntoFolders(e, n, i, r) {
    const s = Ce.basename(e), a = Ce.join(Ce.dirname(e), `${s}-备份`);
    await qe.pathExists(a) && await qe.remove(a), await qe.ensureDir(a);
    const o = [], c = [];
    for (let l = 0; l < n.length; l += i)
      c.push(n.slice(l, l + i));
    for (let l = 0; l < c.length; l++) {
      const u = l + 1, p = `${r} - 第${u}组`, d = Ce.join(a, p);
      await qe.ensureDir(d), o.push(d);
      for (const b of c[l]) {
        const x = Ce.join(d, b.name);
        await qe.copy(b.path, x);
      }
    }
    return o;
  }
  static async saveBase64Image(e, n) {
    const i = Ce.join(process.env.APPDATA || process.env.HOME || "", "gzh-layout", "temp");
    await qe.ensureDir(i);
    const r = Ce.join(i, n), s = e.match(/^data:image\/(png|jpeg|jpg);base64,(.*)$/);
    if (!s || s.length !== 3)
      throw new Error("无效的 base64 图片格式");
    const a = Ns.from(s[2], "base64");
    return await qe.writeFile(r, a), r;
  }
  static async createCoverFolder(e) {
    const n = Ce.join(e, "封面");
    return await qe.ensureDir(n), n;
  }
  /**
   * 清洗字符串为合法文件夹名（去除 Windows/macOS 非法字符）
   * - 替换 \ / : * ? " < > | 为 _
   * - 去除首尾空格和点（Windows 不允许）
   * - 截断到 80 字符，避免过长
   */
  static sanitizeFolderName(e) {
    return (e || "").replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim().replace(/^\.+|\.+$/g, "").slice(0, 80) || "未命名文章";
  }
  /**
   * 把分组文件夹重命名为文章标题。
   * 用于：同步完成单篇文章后，把 savePath/分组N 改为 savePath/{文章标题}。
   *
   * @param oldFolderPath 旧文件夹绝对路径
   * @param newFolderName 期望的新文件夹名（会被自动 sanitize）
   * @returns 新文件夹绝对路径；若旧路径不存在则返回空串
   */
  static async renameFolderToTitle(e, n) {
    if (!await qe.pathExists(e))
      return "";
    const i = Ce.dirname(e), r = this.sanitizeFolderName(n);
    let s = Ce.join(i, r);
    if (s !== e && await qe.pathExists(s)) {
      let a = 2;
      for (; await qe.pathExists(Ce.join(i, `${r}_${a}`)); )
        a++;
      s = Ce.join(i, `${r}_${a}`);
    }
    return s === e ? e : (await qe.rename(e, s), s);
  }
  static async saveCoverImage(e, n, i) {
    await qe.ensureDir(e);
    const r = Ce.join(e, i), s = n.match(/^data:image\/(png|jpeg|jpg);base64,(.*)$/);
    if (!s || s.length !== 3)
      throw new Error("无效的 base64 图片格式");
    const a = Ns.from(s[2], "base64");
    return await qe.writeFile(r, a), r;
  }
  static async deleteCoverFolder(e) {
    await qe.pathExists(e) && await qe.remove(e);
  }
  static async deleteCoverImage(e) {
    await qe.pathExists(e) && await qe.remove(e);
  }
  /**
   * 将 WebP 图片转换为 PNG 格式
   * 备份模式: 保存到 {原文件夹名-备份}/webp-converted
   * 非备份模式: 保存到 {原文件夹名}/webp-converted
   */
  static async convertWebpImages(e, n, i) {
    const r = Ce.basename(e), s = Ce.dirname(e), a = i ? Ce.join(s, `${r}-备份`) : e, o = Ce.join(a, "webp-converted");
    await qe.ensureDir(o);
    const c = {};
    for (const l of n) {
      const u = Ce.parse(l.name).name + ".png", p = Ce.join(o, u);
      await Zn(l.path).png().toFile(p), c[l.path] = p;
    }
    return c;
  }
}
class s_ {
  constructor(e = () => ht.join(Oi.getPath("userData"), "image-studio")) {
    this.rootProvider = e;
  }
  get root() {
    return this.rootProvider();
  }
  get imagesDir() {
    return ht.join(this.root, "images");
  }
  get metadataPath() {
    return ht.join(this.root, "history.json");
  }
  async load() {
    try {
      return JSON.parse(await Gw(this.metadataPath, "utf8"));
    } catch (e) {
      if (e.code === "ENOENT") return [];
      throw e;
    }
  }
  async save(e) {
    await Hw(this.imagesDir, { recursive: !0 });
    const n = await Promise.all(e.map(async (r) => ({
      ...r,
      url: await this.persistDataUrl(r.url, `${r.id}-main`),
      referenceImages: r.referenceImages ? await Promise.all(r.referenceImages.map((s, a) => this.persistDataUrl(s, `${r.id}-ref-${a}`))) : void 0
    }))), i = `${this.metadataPath}.tmp`;
    return await Sd(i, JSON.stringify(n, null, 2), "utf8"), await Vw(this.metadataPath, { force: !0 }), await Kw(i, this.metadataPath), n;
  }
  resolveImagePath(e) {
    if (!e || e !== ht.basename(e)) return null;
    const n = ht.basename(e), i = ht.join(this.imagesDir, n);
    return i.startsWith(`${this.imagesDir}${ht.sep}`) ? i : null;
  }
  async persistDataUrl(e, n) {
    const i = e.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/i);
    if (!i) return e;
    const r = i[1].toLowerCase().replace("jpeg", "jpg"), s = `${n}.${r}`;
    return await Sd(ht.join(this.imagesDir, s), Buffer.from(i[2], "base64")), `app-image://history/${encodeURIComponent(s)}`;
  }
}
const Qu = new s_();
function a_() {
  be.handle("image-history:load", () => Qu.load()), be.handle("image-history:save", (t, e) => Qu.save(e)), be.handle("file:selectFolder", async () => hn.selectFolder()), be.handle("file:backupFolder", async (t, e) => hn.backupFolder(e)), be.handle("file:calculateMD5", async (t, e) => hn.calculateMD5(e)), be.handle("file:splitIntoFolders", async (t, e, n, i, r) => hn.splitIntoFolders(e, n, i, r)), be.handle("file:saveBase64Image", async (t, e, n) => hn.saveBase64Image(e, n)), be.handle("file:createCoverFolder", async (t, e) => hn.createCoverFolder(e)), be.handle("file:saveCoverImage", async (t, e, n, i) => hn.saveCoverImage(e, n, i)), be.handle("file:deleteCoverFolder", async (t, e) => hn.deleteCoverFolder(e)), be.handle("file:deleteCoverImage", async (t, e) => hn.deleteCoverImage(e)), be.handle("file:convertWebpImages", async (t, e, n, i) => hn.convertWebpImages(e, n, i)), be.handle("file:renameFolderToTitle", async (t, e, n) => hn.renameFolderToTitle(e, n));
}
let o_ = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
const c_ = 128;
let Wi, kr;
function l_(t) {
  if (t < 0 || t > 1024) throw new RangeError("Wrong ID size");
  !Wi || Wi.length < t ? (Wi = Buffer.allocUnsafe(t * c_), Ed.getRandomValues(Wi), kr = 0) : kr + t > Wi.length && (Ed.getRandomValues(Wi), kr = 0), kr += t;
}
function ep(t = 21) {
  l_(t |= 0);
  let e = "";
  for (let n = kr - t; n < kr; n++)
    e += o_[Wi[n] & 63];
  return e;
}
const u_ = [".jpg", ".jpeg", ".png", ".webp", ".gif"], p_ = Buffer.from([82, 73, 70, 70]), f_ = 0, d_ = Buffer.from([87, 69, 66, 80]);
class h_ {
  /**
   * 通过 Magic Number 检测文件是否为 WebP 格式
   */
  static async isWebpByMagicNumber(e) {
    try {
      const n = await qe.open(e, "r"), i = Buffer.alloc(12);
      return await n.read(i, 0, 12, 0), await n.close(), i.compare(p_, 0, 4, f_, 4) === 0 && i.compare(d_, 0, 4, 8, 12) === 0;
    } catch {
      return !1;
    }
  }
  /**
   * 使用 sharp 检测图片的实际格式
   */
  static async detectActualFormat(e) {
    try {
      return (await Zn(e).metadata()).format || "unknown";
    } catch {
      return await this.isWebpByMagicNumber(e) ? "webp" : "unknown";
    }
  }
  static async scanImagesInFolder(e) {
    const n = await qe.readdir(e), i = [];
    let r = 0;
    for (const s of n) {
      const a = Ce.join(e, s), o = await qe.stat(a);
      if (!o.isFile()) continue;
      const c = Ce.extname(s).toLowerCase();
      if (u_.includes(c))
        try {
          const l = await Zn(a).metadata();
          let u = l.format || c.replace(".", "");
          const p = l.width || 1920, d = l.height || 1080;
          u !== "webp" && await this.isWebpByMagicNumber(a) && (u = "webp"), i.push({
            id: ep(),
            name: s,
            path: a,
            size: o.size,
            width: p,
            height: d,
            format: u,
            enabled: !0,
            isCover: !1,
            order: r++
          });
        } catch (l) {
          console.error("图片解析失败:", a, l);
        }
    }
    return i;
  }
}
function m_() {
  be.handle("image:scanFolder", async (t, e) => e ? h_.scanImagesInFolder(e) : []);
}
class Ad extends Error {
}
class qg {
  constructor(e) {
    ne(this, "filePath");
    ne(this, "backupPath");
    ne(this, "tempPath");
    ne(this, "options");
    ne(this, "skipNextBackup", !1);
    this.options = e, this.filePath = e.filePath, this.backupPath = `${e.filePath}.bak`, this.tempPath = `${e.filePath}.tmp`;
  }
  load() {
    var i;
    const e = this.tryLoad(this.filePath, "primary file");
    if (e) return e;
    const n = this.tryLoad(this.backupPath, "backup file");
    return n ? (this.skipNextBackup = !0, (i = this.options.logger) == null || i.warn(`Recovered JSON data from backup: ${this.backupPath}`), n) : this.withCurrentVersion(this.options.createDefault());
  }
  save(e, n = {}) {
    var s;
    const i = JSON.stringify(this.withCurrentVersion(e), null, 2), r = n.backupMode ?? "previous";
    ut.mkdirSync(ht.dirname(this.filePath), { recursive: !0 });
    try {
      this.writeAndSyncTempFile(i), JSON.parse(ut.readFileSync(this.tempPath, "utf8")), r === "previous" && !this.skipNextBackup && ut.existsSync(this.filePath) && ut.copyFileSync(this.filePath, this.backupPath), this.replacePrimaryWithTemp(), r === "current" && ut.copyFileSync(this.filePath, this.backupPath), this.skipNextBackup = !1;
    } catch (a) {
      throw this.removeIfExists(this.tempPath), (s = this.options.logger) == null || s.error(`Failed to save JSON data: ${this.filePath}`, a), a;
    }
  }
  tryLoad(e, n) {
    var i;
    if (!ut.existsSync(e)) return null;
    try {
      const r = JSON.parse(ut.readFileSync(e, "utf8")), s = this.readSchemaVersion(r);
      if (s > this.options.currentVersion)
        throw new Ad(
          `Data schema version ${s} is newer than supported version ${this.options.currentVersion}`
        );
      return this.withCurrentVersion(this.options.migrate(r, s));
    } catch (r) {
      if (r instanceof Ad) throw r;
      return (i = this.options.logger) == null || i.warn(`Failed to read JSON ${n}: ${e}`, r), null;
    }
  }
  readSchemaVersion(e) {
    if (!e || typeof e != "object") return 0;
    const n = e.schemaVersion;
    return typeof n == "number" && Number.isInteger(n) ? n : 0;
  }
  withCurrentVersion(e) {
    return { ...e, schemaVersion: this.options.currentVersion };
  }
  writeAndSyncTempFile(e) {
    this.removeIfExists(this.tempPath);
    const n = ut.openSync(this.tempPath, "w");
    try {
      ut.writeFileSync(n, e, "utf8"), ut.fsyncSync(n);
    } finally {
      ut.closeSync(n);
    }
  }
  replacePrimaryWithTemp() {
    try {
      ut.renameSync(this.tempPath, this.filePath);
      return;
    } catch (n) {
      const i = n.code;
      if (!ut.existsSync(this.filePath) || !["EEXIST", "EPERM", "ENOTEMPTY"].includes(i || "")) throw n;
    }
    const e = `${this.filePath}.replacing`;
    this.removeIfExists(e), ut.renameSync(this.filePath, e);
    try {
      ut.renameSync(this.tempPath, this.filePath), this.removeIfExists(e);
    } catch (n) {
      throw !ut.existsSync(this.filePath) && ut.existsSync(e) && ut.renameSync(e, this.filePath), n;
    }
  }
  removeIfExists(e) {
    ut.existsSync(e) && ut.unlinkSync(e);
  }
}
const xl = "safe-storage:v1:";
class g_ extends Error {
}
class Gg {
  constructor(e) {
    this.adapter = e;
  }
  isProtected(e) {
    return !!(e != null && e.startsWith(xl));
  }
  protect(e) {
    if (!e || this.isProtected(e)) return e;
    this.ensureAvailable();
    const n = this.adapter.encryptString(e).toString("base64");
    return `${xl}${n}`;
  }
  reveal(e) {
    if (!e || !this.isProtected(e)) return e;
    this.ensureAvailable();
    const n = e.slice(xl.length);
    return this.adapter.decryptString(Buffer.from(n, "base64"));
  }
  protectFields(e, n) {
    const i = { ...e };
    for (const r of n) {
      const s = i[r];
      typeof s == "string" && (i[r] = this.protect(s));
    }
    return i;
  }
  revealFields(e, n) {
    const i = { ...e };
    for (const r of n) {
      const s = i[r];
      typeof s == "string" && (i[r] = this.reveal(s));
    }
    return i;
  }
  hasUnprotectedFields(e, n) {
    return n.some((i) => {
      const r = e[i];
      return typeof r == "string" && r.length > 0 && !this.isProtected(r);
    });
  }
  ensureAvailable() {
    if (!this.adapter.isEncryptionAvailable())
      throw new g_("Operating system credential encryption is unavailable");
  }
}
const wl = ["appSecret", "accessToken"];
class b_ {
  constructor() {
    ne(this, "store");
    ne(this, "data");
    ne(this, "secretStorage", new Gg(Mg));
    ne(this, "loadedVersion", 2);
    ne(this, "initialized", !1);
    const e = Oi.getPath("userData");
    this.store = new qg({
      filePath: Ce.join(e, "gzh-layout.json"),
      currentVersion: 2,
      createDefault: y_,
      migrate: (n, i) => (this.loadedVersion = i, v_(n)),
      logger: console
    }), this.data = this.store.load();
  }
  saveToFile() {
    this.store.save(this.protectCredentials(this.data));
  }
  async init() {
    if (this.initialized) return;
    const e = this.data, n = this.loadedVersion < 2 || e.wechatAccounts.some(
      (i) => this.secretStorage.hasUnprotectedFields(i, wl)
    );
    this.data = this.revealCredentials(e), n && (this.store.save(this.protectCredentials(this.data), { backupMode: "current" }), this.loadedVersion = 2), this.initialized = !0;
  }
  protectCredentials(e) {
    return {
      ...e,
      wechatAccounts: e.wechatAccounts.map(
        (n) => this.secretStorage.protectFields(n, wl)
      )
    };
  }
  revealCredentials(e) {
    return {
      ...e,
      wechatAccounts: e.wechatAccounts.map(
        (n) => this.secretStorage.revealFields(n, wl)
      )
    };
  }
  // ========== Projects ==========
  getAllProjects() {
    return [...this.data.projects].sort(
      (e, n) => new Date(n.updatedAt).getTime() - new Date(e.updatedAt).getTime()
    );
  }
  getProject(e) {
    return this.data.projects.find((n) => n.projectId === e) || null;
  }
  saveProject(e) {
    const n = this.data.projects.findIndex((i) => i.projectId === e.projectId);
    n !== -1 ? this.data.projects[n] = e : this.data.projects.push(e), this.saveToFile();
  }
  deleteProject(e) {
    this.data.projects = this.data.projects.filter((n) => n.projectId !== e), this.saveToFile();
  }
  // ========== Templates ==========
  getAllTemplates() {
    return [...this.data.templates].sort(
      (e, n) => new Date(n.updatedAt).getTime() - new Date(e.updatedAt).getTime()
    );
  }
  saveTemplate(e) {
    const n = this.data.templates.findIndex((i) => i.id === e.id);
    n !== -1 ? this.data.templates[n] = e : this.data.templates.push(e), this.saveToFile();
  }
  deleteTemplate(e) {
    this.data.templates = this.data.templates.filter((n) => n.id !== e), this.saveToFile();
  }
  // ========== Cover Templates ==========
  getAllCoverTemplates() {
    return [...this.data.coverTemplates].sort(
      (e, n) => new Date(n.updatedAt).getTime() - new Date(e.updatedAt).getTime()
    );
  }
  saveCoverTemplate(e) {
    const n = this.data.coverTemplates.findIndex((i) => i.id === e.id);
    n !== -1 ? this.data.coverTemplates[n] = e : this.data.coverTemplates.push(e), this.saveToFile();
  }
  deleteCoverTemplate(e) {
    this.data.coverTemplates = this.data.coverTemplates.filter((n) => n.id !== e), this.saveToFile();
  }
  // ========== Style Templates ==========
  getAllStyleTemplates() {
    return [...this.data.styleTemplates].sort(
      (e, n) => new Date(n.updatedAt).getTime() - new Date(e.updatedAt).getTime()
    );
  }
  saveStyleTemplate(e) {
    const n = this.data.styleTemplates.findIndex((i) => i.id === e.id);
    n !== -1 ? this.data.styleTemplates[n] = e : this.data.styleTemplates.push(e), this.saveToFile();
  }
  deleteStyleTemplate(e) {
    this.data.styleTemplates = this.data.styleTemplates.filter((n) => n.id !== e), this.saveToFile();
  }
  // ========== Wechat Accounts ==========
  getAllWechatAccounts() {
    return [...this.data.wechatAccounts];
  }
  getWechatAccount(e) {
    return this.data.wechatAccounts.find((n) => n.id === e) || null;
  }
  getActiveWechatAccount() {
    return this.data.wechatAccounts.find((e) => e.isActive) || null;
  }
  getDefaultSyncWechatAccount() {
    return this.data.wechatAccounts.find((e) => e.isDefaultSync) || null;
  }
  saveWechatAccount(e) {
    const n = this.data.wechatAccounts.findIndex((i) => i.id === e.id);
    n !== -1 ? this.data.wechatAccounts[n] = e : this.data.wechatAccounts.push(e), this.saveToFile();
  }
  setActiveWechatAccount(e) {
    this.data.wechatAccounts.forEach((n) => {
      n.isActive = n.id === e;
    }), this.saveToFile();
  }
  setDefaultSyncWechatAccount(e) {
    const n = this.data.wechatAccounts.find((i) => i.id === e);
    n && n.isDefaultSync ? this.data.wechatAccounts.forEach((i) => {
      i.isDefaultSync = !1;
    }) : this.data.wechatAccounts.forEach((i) => {
      i.isDefaultSync = i.id === e;
    }), this.saveToFile();
  }
  deleteWechatAccount(e) {
    this.data.wechatAccounts = this.data.wechatAccounts.filter((n) => n.id !== e), this.saveToFile();
  }
}
function y_() {
  return {
    schemaVersion: 2,
    projects: [],
    templates: [],
    coverTemplates: [],
    styleTemplates: [],
    wechatAccounts: [],
    draftRecords: []
  };
}
function v_(t) {
  const e = t && typeof t == "object" ? t : {};
  return {
    schemaVersion: 2,
    projects: Array.isArray(e.projects) ? e.projects : [],
    templates: Array.isArray(e.templates) ? e.templates : [],
    coverTemplates: Array.isArray(e.coverTemplates) ? e.coverTemplates : [],
    styleTemplates: Array.isArray(e.styleTemplates) ? e.styleTemplates : [],
    wechatAccounts: Array.isArray(e.wechatAccounts) ? e.wechatAccounts : [],
    draftRecords: Array.isArray(e.draftRecords) ? e.draftRecords : []
  };
}
const tt = new b_();
function x_() {
  be.handle("db:init", async () => (await tt.init(), { success: !0 })), be.handle("db:getAllProjects", () => tt.getAllProjects()), be.handle("db:getProject", (t, e) => tt.getProject(e)), be.handle("db:saveProject", (t, e) => (tt.saveProject(e), { success: !0 })), be.handle("db:deleteProject", (t, e) => (tt.deleteProject(e), { success: !0 })), be.handle("db:getAllTemplates", () => tt.getAllTemplates()), be.handle("db:saveTemplate", (t, e) => (tt.saveTemplate(e), { success: !0 })), be.handle("db:deleteTemplate", (t, e) => (tt.deleteTemplate(e), { success: !0 })), be.handle("db:getAllCoverTemplates", () => tt.getAllCoverTemplates()), be.handle("db:saveCoverTemplate", (t, e) => (tt.saveCoverTemplate(e), { success: !0 })), be.handle("db:deleteCoverTemplate", (t, e) => (tt.deleteCoverTemplate(e), { success: !0 })), be.handle("db:getAllStyleTemplates", () => tt.getAllStyleTemplates()), be.handle("db:saveStyleTemplate", (t, e) => (tt.saveStyleTemplate(e), { success: !0 })), be.handle("db:deleteStyleTemplate", (t, e) => (tt.deleteStyleTemplate(e), { success: !0 })), be.handle("db:getAllWechatAccounts", () => tt.getAllWechatAccounts()), be.handle("db:getWechatAccount", (t, e) => tt.getWechatAccount(e)), be.handle("db:getActiveWechatAccount", () => tt.getActiveWechatAccount()), be.handle("db:getDefaultSyncWechatAccount", () => tt.getDefaultSyncWechatAccount()), be.handle("db:saveWechatAccount", (t, e) => (tt.saveWechatAccount(e), { success: !0 })), be.handle("db:setActiveWechatAccount", (t, e) => (tt.setActiveWechatAccount(e), { success: !0 })), be.handle("db:setDefaultSyncWechatAccount", (t, e) => (tt.setDefaultSyncWechatAccount(e), { success: !0 })), be.handle("db:deleteWechatAccount", (t, e) => (tt.deleteWechatAccount(e), { success: !0 }));
}
const ii = "https://api.weixin.qq.com", w_ = 300, __ = "----WechatFormBoundary";
function S_() {
  return `${__}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
function Td(t, e, n, i) {
  const r = S_(), s = Ns.from(
    `--${r}\r
Content-Disposition: form-data; name="${t}"; filename="${e}"\r
Content-Type: ${i}\r
\r
`,
    "utf-8"
  ), a = Ns.from(`\r
--${r}--\r
`, "utf-8");
  return {
    body: Ns.concat([s, n, a]),
    contentType: `multipart/form-data; boundary=${r}`,
    boundary: r
  };
}
class E_ {
  constructor() {
    ne(this, "tokenCache", null);
  }
  async getAccessToken(e, n) {
    if (this.tokenCache && this.tokenCache.appId === e && this.tokenCache.expiresAt > Date.now())
      return this.tokenCache.accessToken;
    const i = `${ii}/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(e)}&secret=${encodeURIComponent(n)}`, s = await (await fetch(i)).json();
    if (s.errcode)
      throw new Error(`获取AccessToken失败 [${s.errcode}]: ${s.errmsg}`);
    return this.tokenCache = {
      appId: e,
      accessToken: s.access_token,
      expiresAt: Date.now() + (s.expires_in - w_) * 1e3
    }, s.access_token;
  }
  clearTokenCache() {
    this.tokenCache = null;
  }
  getTokenCacheInfo() {
    return this.tokenCache;
  }
  async getAccountInfo(e) {
    const n = `${ii}/cgi-bin/getcallbackip?access_token=${e}`, r = await (await fetch(n)).json();
    if (r.errcode)
      throw new Error(`Token 校验失败 [${r.errcode}]: ${r.errmsg}`);
    const s = `${ii}/cgi-bin/account/getaccountbasicinfo?access_token=${e}`, o = await (await fetch(s, { method: "POST" })).json();
    return o.errcode ? {
      nickname: "",
      headImg: "",
      serviceType: -1,
      verifyType: -1,
      userName: "",
      alias: "",
      qrcodeUrl: ""
    } : {
      nickname: o.nickname || "",
      headImg: o.head_img || "",
      serviceType: o.service_type ?? -1,
      verifyType: o.verify_type ?? -1,
      userName: o.user_name || "",
      alias: o.alias || "",
      qrcodeUrl: o.qrcode_url || ""
    };
  }
  async authenticate(e, n) {
    const i = await this.getAccessToken(e, n), r = this.tokenCache, s = Math.floor((r.expiresAt - Date.now()) / 1e3), a = await this.getAccountInfo(i);
    return {
      success: !0,
      accessToken: i,
      expiresIn: s,
      accountInfo: a
    };
  }
  async verifyToken(e) {
    const n = `${ii}/cgi-bin/getcallbackip?access_token=${e}`;
    return !(await (await fetch(n)).json()).errcode;
  }
  assertLocalImagePath(e) {
    if (!e)
      throw new Error("图片路径为空，无法上传");
    if (/^(data:|blob:|https?:)/i.test(e))
      throw new Error("图片必须是本地文件路径，data URL、blob URL 和网络 URL 请先转换为本地文件");
  }
  async uploadCoverImage(e, n) {
    this.assertLocalImagePath(n);
    const i = await qe.readFile(n), r = Ce.basename(n), s = Ce.extname(r).toLowerCase(), a = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif" };
    if (s === ".webp")
      throw new Error(`微信不支持 WebP 格式，请先将 ${r} 转换为 PNG 或 JPG`);
    const o = a[s] || "image/jpeg", { body: c, contentType: l } = Td("media", r, i, o), u = `${ii}/cgi-bin/material/add_material?access_token=${e}&type=image`, d = await (await fetch(u, {
      method: "POST",
      headers: { "Content-Type": l },
      body: new Uint8Array(c)
    })).json();
    if (d.errcode)
      throw new Error(`上传封面图失败 [${d.errcode}]: ${d.errmsg}`);
    return { mediaId: d.media_id, url: d.url };
  }
  async uploadContentImage(e, n) {
    this.assertLocalImagePath(n);
    const i = await qe.readFile(n), r = Ce.basename(n), s = Ce.extname(r).toLowerCase(), a = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif" };
    if (s === ".webp")
      throw new Error(`微信不支持 WebP 格式，请先将 ${r} 转换为 PNG 或 JPG`);
    const o = a[s] || "image/jpeg", { body: c, contentType: l } = Td("media", r, i, o), u = `${ii}/cgi-bin/media/uploadimg?access_token=${e}`, d = await (await fetch(u, {
      method: "POST",
      headers: { "Content-Type": l },
      body: new Uint8Array(c)
    })).json();
    if (d.errcode)
      throw new Error(`上传正文图片失败 (${r}) [${d.errcode}]: ${d.errmsg}`);
    return { originalPath: n, url: d.url };
  }
  async batchUploadContentImages(e, n, i, r, s) {
    const a = [];
    for (let o = 0; o < n.length; o++) {
      i == null || i({
        currentArticleIndex: r ?? 0,
        totalArticles: s ?? 1,
        step: "images",
        message: `正在上传正文图片 ${o + 1}/${n.length}...`
      });
      const c = await this.uploadContentImage(e, n[o]);
      a.push(c), o < n.length - 1 && await this.delay(300);
    }
    return a;
  }
  async createDraft(e, n) {
    const i = {
      articles: [
        {
          title: n.title,
          thumb_media_id: n.thumbMediaId,
          author: n.author ?? "",
          digest: n.digest ?? n.title,
          content: n.content,
          content_source_url: n.contentSourceUrl ?? "",
          need_open_comment: n.needOpenComment ?? 1,
          only_fans_can_comment: n.onlyFansCanComment ?? 0,
          pic_crop_235_1: n.picCrop2351 ?? "0_0_1_1",
          pic_crop_1_1: n.picCrop11 ?? "0.287234_0_0.712766_1"
        }
      ]
    }, r = `${ii}/cgi-bin/draft/add?access_token=${e}`, a = await (await fetch(r, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(i)
    })).json();
    if (a.errcode)
      throw new Error(`创建草稿失败 [${a.errcode}]: ${a.errmsg}`);
    return a.media_id;
  }
  async publishDraft(e, n) {
    const i = { media_id: n }, r = `${ii}/cgi-bin/freepublish/submit?access_token=${e}`, a = await (await fetch(r, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(i)
    })).json();
    if (a.errcode)
      throw new Error(`发布草稿失败 [${a.errcode}]: ${a.errmsg}`);
    return a.publish_id;
  }
  buildArticleHtml(e, n) {
    const i = `<section style="text-align:center;color:#000;font-size:16px;padding-bottom:20px;font-weight:bold;">${this.escapeHtml(e)}</section>`, r = n.map((s) => `<p><img src="${s}" data-src="${s}" style="max-width:100%;display:block;margin:0 auto;"></p>`).join(`
`);
    return i + r;
  }
  calculateCropParams(e = 2.35) {
    const n = "0_0_1_1", r = (1 - 1 / e) / 2, s = r.toFixed(6), a = (1 - r).toFixed(6), o = `${s}_0_${a}_1`;
    return { pic_crop_235_1: n, pic_crop_1_1: o };
  }
  delay(e) {
    return new Promise((n) => setTimeout(n, e));
  }
  escapeHtml(e) {
    return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
}
const pt = new E_();
function A_(t) {
  return t.replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();
}
function T_() {
  be.handle("wechat:getAccessToken", async (t, e, n) => pt.getAccessToken(e, n)), be.handle("wechat:clearTokenCache", async () => {
    pt.clearTokenCache();
  }), be.handle("wechat:getAccountInfo", async (t, e) => pt.getAccountInfo(e)), be.handle("wechat:authenticate", async (t, e, n) => pt.authenticate(e, n)), be.handle("wechat:verifyToken", async (t, e) => pt.verifyToken(e)), be.handle("wechat:getTokenCacheInfo", async () => pt.getTokenCacheInfo()), be.handle("wechat:uploadCoverImage", async (t, e, n) => pt.uploadCoverImage(e, n)), be.handle("wechat:uploadContentImage", async (t, e, n) => pt.uploadContentImage(e, n)), be.handle("wechat:batchUploadContentImages", async (t, e, n) => pt.batchUploadContentImages(e, n)), be.handle("wechat:createDraft", async (t, e, n) => pt.createDraft(e, n)), be.handle("wechat:publishDraft", async (t, e, n) => pt.publishDraft(e, n)), be.handle("wechat:buildArticleHtml", async (t, e, n) => pt.buildArticleHtml(e, n)), be.handle("wechat:calculateCropParams", async (t, e) => pt.calculateCropParams(e)), be.handle("wechat:batchUpload", async (t, e) => {
    const { appId: n, appSecret: i, articles: r, publish: s = !1 } = e, a = [], o = t.sender, c = (l) => {
      try {
        o.isDestroyed() || o.send("wechat:uploadProgress", l);
      } catch {
      }
    };
    try {
      c({
        currentArticleIndex: 0,
        totalArticles: r.length,
        step: "token",
        message: "正在获取 AccessToken..."
      });
      let l;
      if (i)
        l = await pt.getAccessToken(n, i);
      else {
        const u = pt.getTokenCacheInfo();
        if (u && u.expiresAt > Date.now())
          l = u.accessToken;
        else
          throw new Error("AccessToken 已过期，请重新鉴权");
      }
      for (let u = 0; u < r.length; u++) {
        const p = r[u];
        c({
          currentArticleIndex: u,
          totalArticles: r.length,
          step: "cover",
          message: `[${u + 1}/${r.length}] 正在上传封面图...`
        });
        const d = await pt.uploadCoverImage(l, p.coverImagePath);
        c({
          currentArticleIndex: u,
          totalArticles: r.length,
          step: "images",
          message: `[${u + 1}/${r.length}] 正在上传正文图片 (${p.contentImagePaths.length} 张)...`
        });
        const b = await pt.batchUploadContentImages(
          l,
          p.contentImagePaths,
          (h) => c({ ...h, currentArticleIndex: u, totalArticles: r.length }),
          u,
          r.length
        );
        c({
          currentArticleIndex: u,
          totalArticles: r.length,
          step: "draft",
          message: `[${u + 1}/${r.length}] 正在创建草稿...`
        });
        const x = b.map((h) => h.url);
        let v;
        if (p.contentHtml) {
          v = p.contentHtml;
          for (let h = 0; h < b.length; h++) {
            const g = b[h].originalPath, A = b[h].url, C = g.replace(/\\/g, "/"), V = encodeURIComponent(C).replace(/%2F/g, "/");
            v = v.split(`file:///${V.replace(/^\//, "")}`).join(A), v = v.split(`file://${V}`).join(A), v = v.split(`file:///${C.replace(/^\//, "")}`).join(A), v = v.split(`file://${C}`).join(A), v = v.split(g).join(A);
          }
        } else
          v = pt.buildArticleHtml(p.title, x);
        v = A_(v);
        const y = await pt.createDraft(l, {
          title: p.title,
          thumbMediaId: d.mediaId,
          author: p.author,
          digest: p.digest,
          content: v,
          contentSourceUrl: p.contentSourceUrl,
          picCrop2351: p.picCrop2351,
          picCrop11: p.picCrop11
        }), f = {
          title: p.title,
          draftMediaId: y,
          coverUrl: d.url
        };
        if (s) {
          c({
            currentArticleIndex: u,
            totalArticles: r.length,
            step: "publish",
            message: `[${u + 1}/${r.length}] 正在发布草稿...`
          });
          try {
            f.publishId = await pt.publishDraft(l, y);
          } catch (h) {
            const g = h instanceof Error ? h.message : String(h);
            f.publishError = g, c({
              currentArticleIndex: u,
              totalArticles: r.length,
              step: "publish",
              message: `[${u + 1}/${r.length}] 草稿已创建，但发布失败：${g}`
            });
          }
        }
        a.push(f), c({
          currentArticleIndex: u,
          totalArticles: r.length,
          step: "done",
          message: `[${u + 1}/${r.length}] 同步成功：${p.title}`
        }), u < r.length - 1 && await new Promise((h) => setTimeout(h, 500));
      }
      return c({
        currentArticleIndex: r.length,
        totalArticles: r.length,
        step: "done",
        message: `全部完成！共处理 ${r.length} 篇文章。`
      }), { success: !0, results: a };
    } catch (l) {
      const u = l instanceof Error ? l.message : String(l);
      return c({
        currentArticleIndex: a.length,
        totalArticles: r.length,
        step: "done",
        message: `上传失败: ${u}`
      }), { success: !1, error: u, results: a };
    }
  });
}
function Rd(t, e, n) {
  return t.startsWith("https:") ? as.get(t, e, n) : ss.get(t, e, n);
}
function R_(t, e, n) {
  return t.startsWith("https:") ? as.request(t, e, n) : ss.request(t, e, n);
}
const O_ = {
  wechat: [
    /mp\.weixin\.qq\.com\/s/,
    /weixin\.qq\.com\/s\//
  ],
  xiaohongshu: [
    /xiaohongshu\.com\/explore/,
    /xiaohongshu\.com\/discovery\/item/,
    /xhslink\.com/
  ],
  douyin: [
    /douyin\.com\/video/,
    /iesdouyin\.com/,
    /v\.douyin\.com/
  ],
  weibo: [
    /weibo\.com\/\d+/,
    /m\.weibo\.cn\/detail/
  ],
  unknown: []
}, no = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
};
class wr {
  static detectPlatform(e) {
    for (const [n, i] of Object.entries(O_))
      for (const r of i)
        if (r.test(e))
          return n;
    return "unknown";
  }
  static async fetchPage(e, n, i) {
    return i == null || i(`[fetchPage] 开始请求: ${e}`), new Promise((r, s) => {
      const a = $g.request({
        url: e,
        method: "GET"
      }), o = { ...no, ...n };
      for (const [p, d] of Object.entries(o))
        a.setHeader(p, d);
      let c = "", l = null;
      const u = () => {
        l && (clearTimeout(l), l = null);
      };
      l = setTimeout(() => {
        a.abort(), s(new Error("请求超时"));
      }, 15e3), a.on("response", (p) => {
        i == null || i(`[fetchPage] 收到响应: HTTP ${p.statusCode}`), p.on("data", (d) => {
          c += d.toString();
        }), p.on("end", () => {
          u(), i == null || i(`[fetchPage] 响应完成, 数据长度: ${c.length}`), p.statusCode === 200 ? r(c) : s(new Error(`HTTP ${p.statusCode}`));
        });
      }), a.on("error", (p) => {
        u(), i == null || i(`[fetchPage] 请求失败: ${p.message}`), s(p);
      }), a.end();
    });
  }
  static async getRedirectUrl(e, n) {
    return n == null || n(`[getRedirectUrl] 检查重定向: ${e}`), new Promise((i) => {
      let r = !1, s = null;
      const a = () => {
        s && (clearTimeout(s), s = null);
      }, o = (l) => {
        r || (r = !0, a(), i(l));
      }, c = Rd(e, {
        headers: {
          "User-Agent": no["User-Agent"]
        },
        timeout: 8e3
      }, (l) => {
        if (n == null || n(`[getRedirectUrl] 响应状态: ${l.statusCode}`), l.statusCode === 301 || l.statusCode === 302 || l.statusCode === 303 || l.statusCode === 307 || l.statusCode === 308) {
          const u = l.headers.location;
          if (u) {
            const p = u.startsWith("http") ? u : new URL(u, e).href;
            n == null || n(`[getRedirectUrl] 重定向到: ${p}`), o(p);
            return;
          }
        }
        n == null || n("[getRedirectUrl] 没有重定向，返回原URL"), o(e);
      });
      c.on("error", (l) => {
        n == null || n(`[getRedirectUrl] 请求失败: ${l.message}`), o(e);
      }), s = setTimeout(() => {
        n == null || n("[getRedirectUrl] 请求超时"), c.destroy(), o(e);
      }, 8e3);
    });
  }
  static async parseWechat(e, n) {
    n == null || n("[parseWechat] 开始解析微信公众号");
    try {
      const i = await this.fetchPage(e, {
        Referer: "https://mp.weixin.qq.com/"
      }, n);
      n == null || n(`[parseWechat] HTML 长度: ${i.length}`), n == null || n(`[parseWechat] HTML 前500字符: ${i.substring(0, 500)}`);
      const r = vl.load(i), s = /* @__PURE__ */ new Set(), a = r("#js_content img");
      n == null || n(`[parseWechat] #js_content img 数量: ${a.length}`);
      const o = (c) => {
        let l = c;
        l = l.replace(/\/(\d{2,4})(\?|$)/, "/0$2");
        try {
          const u = new URL(l);
          u.searchParams.delete("tp"), u.searchParams.delete("tp_type"), l = u.toString();
        } catch {
        }
        return n == null || n(`[parseWechat] URL升级: ${c} -> ${l}`), l;
      };
      return a.each((c, l) => {
        const u = r(l).attr("data-src") || r(l).attr("src");
        if (n == null || n(`[parseWechat] 图片 ${c}: src=${u}`), u && !u.startsWith("data:")) {
          const p = u.startsWith("//") ? "https:" + u : u;
          s.add(o(p));
        }
      }), s.size === 0 && (n == null || n("[parseWechat] #js_content 未找到图片，尝试查找所有 mmbiz 图片"), r("img").each((c, l) => {
        const u = r(l).attr("data-src") || r(l).attr("src");
        if (u && !u.startsWith("data:") && u.includes("mmbiz.qpic.cn")) {
          const p = u.startsWith("//") ? "https:" + u : u;
          s.add(o(p)), n == null || n(`[parseWechat] 找到 mmbiz 图片: ${p}`);
        }
      })), n == null || n(`[parseWechat] 最终找到 ${s.size} 张图片`), Array.from(s);
    } catch (i) {
      throw n == null || n(`[parseWechat] 解析失败: ${i}`), i;
    }
  }
  static async parseXiaohongshu(e, n) {
    var i, r;
    n == null || n("[parseXiaohongshu] 开始解析小红书");
    try {
      let s = e;
      e.includes("xhslink.com") && (n == null || n("[parseXiaohongshu] 检测到短链，获取重定向URL"), s = await this.getRedirectUrl(e, n), n == null || n(`[parseXiaohongshu] 重定向后URL: ${s}`));
      const a = await this.fetchPage(s, {
        Referer: "https://www.xiaohongshu.com/"
      }, n);
      n == null || n(`[parseXiaohongshu] HTML 长度: ${a.length}`), n == null || n(`[parseXiaohongshu] HTML 前1000字符: ${a.substring(0, 1e3)}`);
      const o = vl.load(a), c = [], l = o("script");
      n == null || n(`[parseXiaohongshu] 找到 ${l.length} 个 script 标签`);
      let u = "";
      if (l.each((p, d) => {
        const b = o(d).html() || "";
        b.includes("__INITIAL_STATE__") && (u = b, n == null || n(`[parseXiaohongshu] 找到 __INITIAL_STATE__ 在 script[${p}]`), n == null || n(`[parseXiaohongshu] script 内容前500字符: ${b.substring(0, 500)}`));
      }), u) {
        const p = u.match(/__INITIAL_STATE__\s*=\s*({.+?})\s*;?\s*$/s);
        if (p) {
          n == null || n("[parseXiaohongshu] 成功匹配 JSON");
          let d = p[1];
          d = d.replace(/undefined/g, "null");
          try {
            const b = JSON.parse(d);
            n == null || n(`[parseXiaohongshu] JSON 解析成功，keys: ${Object.keys(b)}`);
            const x = (i = b == null ? void 0 : b.note) == null ? void 0 : i.noteDetailMap;
            if (x) {
              const v = Object.keys(x)[0];
              n == null || n(`[parseXiaohongshu] noteId: ${v}`);
              const y = (r = x[v]) == null ? void 0 : r.note;
              if (y != null && y.imageList) {
                n == null || n(`[parseXiaohongshu] 找到 imageList, 长度: ${y.imageList.length}`);
                const f = (g) => {
                  try {
                    const A = new URL(g), C = [
                      "imageView2",
                      "imageView",
                      "xhsS3"
                    ];
                    for (const K of Array.from(A.searchParams.keys()))
                      C.some((L) => K.toLowerCase().includes(L.toLowerCase())) && A.searchParams.delete(K);
                    let V = A.pathname;
                    return V = V.replace(/\/imageView2[\w\/\.\-]*/g, "/"), A.pathname = V, A.toString();
                  } catch {
                    return g;
                  }
                }, h = (g) => {
                  var A;
                  if (g.url)
                    return f(g.url);
                  if (g.urlPre)
                    return f(g.urlPre);
                  if (g.urlDefault)
                    return f(g.urlDefault);
                  if (Array.isArray(g.infoList) && g.infoList.length > 0) {
                    const C = g.infoList.find((K) => K.imageScene === "WB_DFT"), V = g.infoList.find((K) => K.imageScene === "WB_PRV");
                    if (C != null && C.url) return f(C.url);
                    if (V != null && V.url) return f(V.url);
                    if ((A = g.infoList[0]) != null && A.url) return f(g.infoList[0].url);
                  }
                  return "";
                };
                for (const g of y.imageList) {
                  const A = h(g);
                  A && (c.push(A), n == null || n(`[parseXiaohongshu] 图片URL: ${A}`));
                }
              } else
                n == null || n("[parseXiaohongshu] 未找到 imageList");
            } else
              n == null || n("[parseXiaohongshu] 未找到 noteDetailMap");
          } catch (b) {
            n == null || n(`[parseXiaohongshu] JSON 解析失败: ${b}`);
          }
        } else
          n == null || n("[parseXiaohongshu] JSON 正则匹配失败");
      } else
        n == null || n("[parseXiaohongshu] 未找到 __INITIAL_STATE__");
      return c.length === 0 && (n == null || n("[parseXiaohongshu] 尝试从 DOM 获取图片"), o("img").each((p, d) => {
        const b = o(d).attr("src") || o(d).attr("data-src");
        b && !b.startsWith("data:") && (b.includes("sns-webpic-qc.xhscdn.com") || b.includes("ci.xiaohongshu.com")) && (c.push(b), n == null || n(`[parseXiaohongshu] DOM 图片: ${b}`));
      })), n == null || n(`[parseXiaohongshu] 最终找到 ${c.length} 张图片`), c;
    } catch (s) {
      throw n == null || n(`[parseXiaohongshu] 解析失败: ${s}`), s;
    }
  }
  static async parseDouyin(e, n) {
    var i, r, s, a;
    n == null || n("[parseDouyin] 开始解析抖音");
    try {
      let o = e;
      e.includes("v.douyin.com") && (n == null || n("[parseDouyin] 检测到短链，获取重定向URL"), o = await this.getRedirectUrl(e, n), n == null || n(`[parseDouyin] 重定向后URL: ${o}`));
      const c = o.match(/(?:video|note)\/(\d+)/);
      if (!c)
        throw n == null || n("[parseDouyin] 无法从URL提取video ID"), new Error("无法从URL提取video ID");
      const l = c[1];
      n == null || n(`[parseDouyin] 提取到 video ID: ${l}`);
      const u = `https://www.iesdouyin.com/share/video/${l}/`;
      n == null || n(`[parseDouyin] 请求URL: ${u}`);
      const p = await this.fetchPage(u, {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
        Referer: "https://www.douyin.com/"
      }, n);
      n == null || n(`[parseDouyin] HTML 长度: ${p.length}`);
      const d = [], b = p.match(/window\._ROUTER_DATA\s*=\s*(\{.*?\});?</s) || p.match(/_ROUTER_DATA\s*=\s*(\{.*?\});/s);
      if (b) {
        n == null || n("[parseDouyin] 找到 _ROUTER_DATA");
        try {
          const y = JSON.parse(b[1]), f = (A) => !Array.isArray(A) || A.length === 0 ? "" : A[A.length - 1], h = y == null ? void 0 : y.loaderData;
          if (h) {
            const A = Object.keys(h).find((K) => K.includes("video") || K.includes("note")), C = A ? h[A] : null, V = (r = (i = C == null ? void 0 : C.videoInfoRes) == null ? void 0 : i.item_list) == null ? void 0 : r[0];
            if (V) {
              if (V.images && Array.isArray(V.images)) {
                for (const L of V.images) {
                  const X = f(L.url_list);
                  X && d.push(X);
                }
                n == null || n(`[parseDouyin] 从 images 提取到 ${d.length} 张图片`);
              }
              const K = f((a = (s = V.video) == null ? void 0 : s.cover) == null ? void 0 : a.url_list);
              K && !d.includes(K) && (d.push(K), n == null || n("[parseDouyin] 提取到封面图"));
            }
          }
          const g = (A, C = 0) => {
            if (!(!A || typeof A != "object" || C > 10)) {
              if (A.images && Array.isArray(A.images))
                for (const V of A.images) {
                  const K = f(V.url_list);
                  K ? d.push(K) : V.url && d.push(V.url);
                }
              for (const V of Object.keys(A))
                g(A[V], C + 1);
            }
          };
          d.length === 0 && (g(y), n == null || n(`[parseDouyin] 递归提取到 ${d.length} 张图片`));
        } catch (y) {
          n == null || n(`[parseDouyin] JSON 解析失败: ${y}`);
        }
      } else
        n == null || n("[parseDouyin] 未找到 _ROUTER_DATA"), n == null || n(`[parseDouyin] HTML 前1000字符: ${p.substring(0, 1e3)}`);
      n == null || n(`[parseDouyin] 最终找到 ${d.length} 张图片`);
      const x = /* @__PURE__ */ new Map();
      for (const y of d) {
        const f = y.match(/\/([a-f0-9]{32})~/);
        if (f) {
          const h = f[1];
          x.has(h) || x.set(h, y);
        } else
          x.has(y) || x.set(y, y);
      }
      const v = Array.from(x.values());
      return n == null || n(`[parseDouyin] 去重后 ${v.length} 张图片`), v;
    } catch (o) {
      throw n == null || n(`[parseDouyin] 解析失败: ${o}`), o;
    }
  }
  static async parseWeibo(e, n) {
    n == null || n("[parseWeibo] 开始解析微博");
    try {
      const i = await this.fetchPage(e, {
        Referer: "https://weibo.com/"
      }, n), r = vl.load(i), s = [], a = (o) => {
        let c = o;
        return c = c.replace(
          /\/(orj360|orj240|orj480|mw690|thumbnail|small|bmiddle|square|orj960)\//i,
          "/large/"
        ), n == null || n(`[parseWeibo] URL升级: ${o} -> ${c}`), c;
      };
      return r("img").each((o, c) => {
        const l = r(c).attr("src") || r(c).attr("data-src");
        if (l && !l.startsWith("data:") && (l.includes("sinaimg.cn") || l.includes("weibocdn.com"))) {
          const u = l.startsWith("//") ? "https:" + l : l;
          s.push(a(u));
        }
      }), n == null || n(`[parseWeibo] 最终找到 ${s.length} 张图片`), [...new Set(s)];
    } catch (i) {
      throw n == null || n(`[parseWeibo] 解析失败: ${i}`), i;
    }
  }
  static extractUrlFromText(e) {
    const n = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g, i = e.match(n);
    return i && i.length > 0 ? i[0] : e.trim();
  }
  static async extractFromUrl(e, n) {
    const i = this.extractUrlFromText(e), r = this.detectPlatform(i), s = [], a = (c) => {
      s.push(c), n == null || n(c);
    };
    a(`[extractFromUrl] 输入内容: ${e}`), a(`[extractFromUrl] 提取URL: ${i}`), a(`[extractFromUrl] 检测平台: ${r}`);
    const o = {
      id: ep(),
      url: i,
      platform: r,
      status: "pending",
      images: [],
      logs: s
    };
    try {
      o.status = "parsing";
      let c = [];
      switch (r) {
        case "wechat":
          c = await this.parseWechat(i, a);
          break;
        case "xiaohongshu":
          c = await this.parseXiaohongshu(i, a);
          break;
        case "douyin":
          c = await this.parseDouyin(i, a);
          break;
        case "weibo":
          c = await this.parseWeibo(i, a);
          break;
        default:
          throw new Error("暂不支持该平台链接");
      }
      if (o.images = c.filter((l) => this.isValidImageUrl(l)).map((l, u) => ({
        id: ep(),
        url: l,
        originalUrl: l,
        filename: this.generateFilename(u, l, r),
        platform: r,
        downloaded: !1
      })), o.images.length > 0) {
        a(`[extractFromUrl] 开始获取 ${o.images.length} 张图片的元信息...`);
        const l = await this.enrichImagesWithSize(o.images, a), u = l.filter((p) => (p.fileSize ?? 0) > 0).length;
        a(`[extractFromUrl] 元信息获取完成: ${u}/${l.length} 张拿到大小`), o.images = l;
      }
      o.status = "completed", a(`[extractFromUrl] 解析完成，共 ${o.images.length} 张图片`);
    } catch (c) {
      o.status = "failed", o.error = c instanceof Error ? c.message : "解析失败", a(`[extractFromUrl] 解析失败: ${o.error}`);
    }
    return o;
  }
  static isValidImageUrl(e) {
    try {
      if (e.startsWith("data:") || e.includes("avatar") || e.includes("icon") || e.includes("logo")) return !1;
      const n = new URL(e), i = n.pathname.toLowerCase(), r = n.hostname.toLowerCase();
      return !!([".jpg", ".jpeg", ".png", ".gif", ".webp"].some((o) => i.endsWith(o)) || ["mmbiz", "xhscdn", "sinaimg", "byteimg", "pstatp", "douyinpic"].some((o) => r.includes(o)) || i.includes("/spectrum/"));
    } catch {
      return !1;
    }
  }
  static generateFilename(e, n, i) {
    const r = this.getExtensionFromUrl(n), s = Date.now();
    return `${i}_${s}_${e + 1}${r}`;
  }
  static getExtensionFromUrl(e) {
    var n;
    try {
      const i = new URL(e), r = i.pathname.toLowerCase(), s = (n = i.searchParams.get("wx_fmt")) == null ? void 0 : n.toLowerCase();
      if (s) {
        if (s.includes("jpeg") || s.includes("jpg")) return ".jpg";
        if (s.includes("png")) return ".png";
        if (s.includes("gif")) return ".gif";
        if (s.includes("webp")) return ".webp";
      }
      if (r.includes("mmbiz_jpg") || r.includes("_jpg")) return ".jpg";
      if (r.includes("mmbiz_png") || r.includes("_png")) return ".png";
      if (r.includes("mmbiz_gif") || r.includes("_gif")) return ".gif";
      if (r.includes("mmbiz_webp") || r.includes("_webp")) return ".webp";
      const a = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
      for (const o of a)
        if (r.endsWith(o))
          return o;
      return r.includes("image-view") || r.includes("~tplv-"), ".jpg";
    } catch {
      return ".jpg";
    }
  }
  static async downloadImage(e, n, i, r) {
    const s = Ce.join(n, i);
    r == null || r(`[downloadImage] 下载: ${e}`);
    const a = await this.fetchImageAsBuffer(e, r);
    return await qe.ensureDir(n), await qe.writeFile(s, a), r == null || r(`[downloadImage] 保存成功: ${s}`), s;
  }
  static async downloadImages(e, n, i, r) {
    const s = [];
    r == null || r(`[downloadImages] 开始下载 ${e.length} 张图片到 ${n}`);
    for (let a = 0; a < e.length; a++) {
      const o = e[a];
      try {
        const c = await this.downloadImage(o.url, n, o.filename, r);
        s.push({
          ...o,
          downloaded: !0,
          localPath: c
        });
      } catch (c) {
        s.push({
          ...o,
          downloaded: !1,
          error: c instanceof Error ? c.message : "下载失败"
        });
      }
      i && i({
        current: a + 1,
        total: e.length,
        image: s[s.length - 1]
      });
    }
    return r == null || r("[downloadImages] 下载完成"), s;
  }
  /**
   * 用 HEAD 请求探测图片文件大小（不下载完整内容）
   * 失败时返回 0
   */
  static async fetchImageContentLength(e, n) {
    return new Promise((i) => {
      const r = new URL(e), s = {
        "User-Agent": no["User-Agent"]
      };
      try {
        const o = r.hostname;
        o.includes("douyinpic") || o.includes("pstatp") || o.includes("byteimg") ? s.Referer = "https://www.douyin.com/" : o.includes("mmbiz") ? s.Referer = "https://mp.weixin.qq.com/" : o.includes("sinaimg") ? s.Referer = "https://weibo.com/" : o.includes("xhscdn") || (s.Referer = r.origin + "/");
      } catch {
      }
      const a = R_(e, { method: "HEAD", headers: s, timeout: 8e3 }, (o) => {
        if (o.statusCode === 405 || o.statusCode === 403) {
          i(0);
          return;
        }
        if (o.statusCode && o.statusCode >= 300 && o.statusCode < 400) {
          const l = o.headers.location;
          if (l) {
            const u = l.startsWith("http") ? l : new URL(l, e).href;
            this.fetchImageContentLength(u, n).then(i).catch(() => i(0));
            return;
          }
        }
        const c = parseInt(o.headers["content-length"] || "0", 10);
        o.resume(), i(c > 0 ? c : 0);
      });
      a.on("error", () => i(0)), a.on("timeout", () => {
        a.destroy(), i(0);
      }), a.end();
    });
  }
  /**
   * 并发获取一组图片的文件大小（HEAD 优先，失败时 GET 拿 buffer 长度兜底）。
   * 用于解析阶段就让前端能看到每张图的实际大小，便于用户设置过滤阈值。
   * 并发数限制为 6，避免被 CDN 限流。
   */
  static async enrichImagesWithSize(e, n) {
    const r = [...e];
    let s = 0;
    const a = async () => {
      for (; s < r.length; ) {
        const o = s++, c = r[o];
        let l = await this.fetchImageContentLength(c.url, n);
        if (l <= 0)
          try {
            l = (await this.fetchImageAsBuffer(c.url, n)).length;
          } catch {
            l = 0;
          }
        r[o] = { ...c, fileSize: l };
      }
    };
    return await Promise.all(Array.from({ length: Math.min(6, r.length) }, a)), r;
  }
  /**
   * 用 sharp 解析 Buffer 的图片尺寸（不写盘）
   * 失败时返回 null
   */
  static async probeImageSize(e, n) {
    try {
      const i = await Zn(e).metadata();
      return i.width && i.height ? { width: i.width, height: i.height } : null;
    } catch (i) {
      return n == null || n(`[probeImageSize] sharp 解析失败: ${i.message}`), null;
    }
  }
  /**
   * 带过滤条件的图片下载
   * 流程：
   * 1. 对每张图先用已知的 fileSize 过滤（解析阶段已经获取）；fileSize 未知或 0 的进入下载流程
   * 2. 进入下载流程的图，先用 HEAD 请求预检文件大小（拿到且<阈值则跳过，节省流量）
   * 3. HEAD 没拿到时下载 buffer，用 buffer.length 二次校验
   * 4. 用 sharp 解析 Buffer 尺寸，过滤掉比 minWidth/minHeight 小的（如果启用）
   * 5. 满足条件的图片才落盘
   *
   * 返回的结果中，被过滤的会带 `filtered: true` 和 `filterReason`；
   * 下载失败的会带 `downloaded: false` 和 `error`。
   */
  static async filterAndDownloadImages(e, n, i, r, s) {
    const a = [], o = e.length, { enabled: c, minWidth: l = 0, minHeight: u = 0, minSizeKB: p = 0 } = i, d = p * 1024, b = c && d > 0, x = c && (l > 0 || u > 0);
    if (s == null || s(`[filterAndDownloadImages] 开始 ${o} 张 -> 保存到 ${n}, 过滤规则: ${JSON.stringify(i)}`), !c)
      return this.downloadImages(e, n, r, s);
    await qe.ensureDir(n);
    for (let h = 0; h < o; h++) {
      const g = e[h];
      try {
        if (b && (g.fileSize ?? 0) > 0 && g.fileSize < d) {
          const L = {
            ...g,
            filtered: !0,
            filterReason: `文件 ${(g.fileSize / 1024).toFixed(1)}KB < 阈值 ${p}KB`,
            fileSize: g.fileSize
          };
          s == null || s(`[filterAndDownloadImages] 跳过(${h + 1}/${o}) ${g.filename}: ${L.filterReason}`), a.push(L), r == null || r({ current: h + 1, total: o, image: L });
          continue;
        }
        const A = await this.fetchImageAsBuffer(g.url, s);
        if (b && A.length < d) {
          const L = {
            ...g,
            filtered: !0,
            filterReason: `文件 ${(A.length / 1024).toFixed(1)}KB < 阈值 ${p}KB`,
            fileSize: A.length
          };
          s == null || s(`[filterAndDownloadImages] 跳过(${h + 1}/${o}) ${g.filename}: ${L.filterReason}`), a.push(L), r == null || r({ current: h + 1, total: o, image: L });
          continue;
        }
        let C = null;
        if (x && (C = await this.probeImageSize(A, s), C)) {
          if (l > 0 && C.width < l) {
            const L = {
              ...g,
              filtered: !0,
              filterReason: `宽度 ${C.width}px < 阈值 ${l}px`,
              width: C.width,
              height: C.height,
              fileSize: A.length
            };
            s == null || s(`[filterAndDownloadImages] 跳过(${h + 1}/${o}) ${g.filename}: ${L.filterReason}`), a.push(L), r == null || r({ current: h + 1, total: o, image: L });
            continue;
          }
          if (u > 0 && C.height < u) {
            const L = {
              ...g,
              filtered: !0,
              filterReason: `高度 ${C.height}px < 阈值 ${u}px`,
              width: C.width,
              height: C.height,
              fileSize: A.length
            };
            s == null || s(`[filterAndDownloadImages] 跳过(${h + 1}/${o}) ${g.filename}: ${L.filterReason}`), a.push(L), r == null || r({ current: h + 1, total: o, image: L });
            continue;
          }
        }
        const V = Ce.join(n, g.filename);
        await qe.writeFile(V, A), s == null || s(`[filterAndDownloadImages] 保存成功(${h + 1}/${o}): ${V} (${(A.length / 1024).toFixed(1)}KB${C ? `, ${C.width}x${C.height}` : ""})`);
        const K = {
          ...g,
          downloaded: !0,
          localPath: V,
          width: C == null ? void 0 : C.width,
          height: C == null ? void 0 : C.height,
          fileSize: A.length
        };
        a.push(K), r == null || r({ current: h + 1, total: o, image: K });
      } catch (A) {
        const C = {
          ...g,
          downloaded: !1,
          error: A instanceof Error ? A.message : "下载失败"
        };
        s == null || s(`[filterAndDownloadImages] 失败(${h + 1}/${o}) ${g.filename}: ${C.error}`), a.push(C), r == null || r({ current: h + 1, total: o, image: C });
      }
    }
    const v = a.filter((h) => h.filtered).length, y = a.filter((h) => h.downloaded).length, f = a.filter((h) => !h.downloaded && !h.filtered).length;
    return s == null || s(`[filterAndDownloadImages] 完成: 成功 ${y}，过滤 ${v}，失败 ${f} / 总 ${o}`), a;
  }
  static async fetchImageAsBuffer(e, n) {
    return n == null || n(`[fetchImageAsBuffer] 获取图片: ${e}`), new Promise((i, r) => {
      const s = new URL(e), a = {
        "User-Agent": no["User-Agent"],
        Accept: "image/webp,image/*,*/*;q=0.8"
      };
      try {
        const l = s.hostname;
        l.includes("douyinpic") || l.includes("pstatp") || l.includes("byteimg") ? a.Referer = "https://www.douyin.com/" : l.includes("mmbiz") ? a.Referer = "https://mp.weixin.qq.com/" : l.includes("sinaimg") ? a.Referer = "https://weibo.com/" : l.includes("xhscdn") || (a.Referer = s.origin + "/");
      } catch {
      }
      let o;
      const c = Rd(e, { headers: a }, (l) => {
        if (n == null || n(`[fetchImageAsBuffer] 响应状态: ${l.statusCode}`), l.statusCode === 301 || l.statusCode === 302 || l.statusCode === 303 || l.statusCode === 307 || l.statusCode === 308) {
          const p = l.headers.location;
          if (p) {
            clearTimeout(o);
            const d = p.startsWith("http") ? p : new URL(p, e).href;
            this.fetchImageAsBuffer(d, n).then(i).catch(r);
            return;
          }
        }
        const u = [];
        l.on("data", (p) => {
          u.push(p);
        }), l.on("end", () => {
          if (clearTimeout(o), l.statusCode === 200) {
            const p = Buffer.concat(u);
            n == null || n(`[fetchImageAsBuffer] 获取成功，大小: ${p.length}`), i(p);
          } else
            r(new Error(`HTTP ${l.statusCode}`));
        });
      });
      o = setTimeout(() => {
        c.destroy(new Error("请求超时(15s)"));
      }, 15e3), c.on("error", (l) => {
        clearTimeout(o), n == null || n(`[fetchImageAsBuffer] 获取失败: ${l.message}`), r(l);
      });
    });
  }
}
function P_() {
  be.handle("extract:parseUrl", async (t, e) => {
    const n = Hi.fromWebContents(t.sender);
    return wr.extractFromUrl(e, (i) => {
      n == null || n.webContents.send("extract:log", i);
    });
  }), be.handle("extract:parseUrls", async (t, e) => {
    const n = Hi.fromWebContents(t.sender), i = [];
    for (const r of e) {
      const s = await wr.extractFromUrl(r.trim(), (a) => {
        n == null || n.webContents.send("extract:log", a);
      });
      i.push(s);
    }
    return i;
  }), be.handle("extract:downloadImages", async (t, e, n) => {
    const i = Hi.fromWebContents(t.sender);
    return console.log(`[IPC] downloadImages 被调用，图片数量: ${e.length}，保存路径: ${n}`), wr.downloadImages(e, n, (r) => {
      i == null || i.webContents.send("extract:downloadProgress", r);
    }, (r) => {
      console.log(`[下载日志] ${r}`), i == null || i.webContents.send("extract:log", r);
    });
  }), be.handle("extract:filterAndDownloadImages", async (t, e, n, i) => {
    const r = Hi.fromWebContents(t.sender);
    return console.log(`[IPC] filterAndDownloadImages 被调用，图片数量: ${e.length}，过滤规则: ${JSON.stringify(i)}`), wr.filterAndDownloadImages(e, n, i, (s) => {
      r == null || r.webContents.send("extract:downloadProgress", s);
    }, (s) => {
      console.log(`[下载日志] ${s}`), r == null || r.webContents.send("extract:log", s);
    });
  }), be.handle("extract:detectPlatform", async (t, e) => wr.detectPlatform(e)), be.handle("extract:proxyImage", async (t, e) => {
    const n = Hi.fromWebContents(t.sender);
    try {
      const r = (await wr.fetchImageAsBuffer(e, (o) => {
        n == null || n.webContents.send("extract:log", o);
      })).toString("base64");
      let s = "image/jpeg";
      const a = e.toLowerCase();
      return a.includes(".png") ? s = "image/png" : a.includes(".gif") ? s = "image/gif" : a.includes(".webp") && (s = "image/webp"), `data:${s};base64,${r}`;
    } catch (i) {
      throw console.error("图片代理失败:", i), i;
    }
  });
}
class C_ {
  constructor() {
    ne(this, "store");
    ne(this, "data");
    ne(this, "secretStorage", new Gg(Mg));
    ne(this, "loadedVersion", 2);
    ne(this, "initialized", !1);
    const e = Oi.getPath("userData");
    this.store = new qg({
      filePath: Ce.join(e, "comic-gen.json"),
      currentVersion: 2,
      createDefault: k_,
      migrate: (n, i) => (this.loadedVersion = i, I_(n)),
      logger: console
    }), this.data = this.store.load();
  }
  saveToFile() {
    this.store.save(this.protectCredentials(this.data));
  }
  async init() {
    if (this.initialized) return;
    const e = this.data, n = this.loadedVersion < 2 || e.modelConfigs.some((i) => this.secretStorage.hasUnprotectedFields(i, ["apiKey"])) || this.secretStorage.hasUnprotectedFields(e.appSettings, ["picgoApiKey"]);
    this.data = this.revealCredentials(e), n && (this.store.save(this.protectCredentials(this.data), { backupMode: "current" }), this.loadedVersion = 2), this.initialized = !0;
  }
  // ========== AppSettings ==========
  getAppSettings() {
    return { ...this.data.appSettings };
  }
  saveAppSettings(e) {
    this.data.appSettings = { ...this.data.appSettings, ...e }, this.saveToFile();
  }
  // ========== Projects ==========
  getAllProjects() {
    return [...this.data.projects].sort((e, n) => n.updatedAt - e.updatedAt);
  }
  getProject(e) {
    return this.data.projects.find((n) => n.id === e) || null;
  }
  saveProject(e) {
    const n = this.data.projects.findIndex((i) => i.id === e.id);
    n !== -1 ? this.data.projects[n] = e : this.data.projects.push(e), this.saveToFile();
  }
  deleteProject(e) {
    this.data.projects = this.data.projects.filter((n) => n.id !== e), this.saveToFile();
  }
  // ========== ModelConfigs ==========
  getAllModelConfigs() {
    return [...this.data.modelConfigs].sort((e, n) => (e.sortOrder ?? 0) - (n.sortOrder ?? 0));
  }
  saveModelConfig(e) {
    const n = this.data.modelConfigs.findIndex((i) => i.id === e.id);
    n !== -1 ? this.data.modelConfigs[n] = e : this.data.modelConfigs.push(e), this.saveToFile();
  }
  deleteModelConfig(e) {
    this.data.modelConfigs = this.data.modelConfigs.filter((n) => n.id !== e), this.saveToFile();
  }
  // ========== PromptTemplates ==========
  getAllPromptTemplates() {
    return [...this.data.promptTemplates].sort((e, n) => (e.sortOrder ?? 0) - (n.sortOrder ?? 0));
  }
  savePromptTemplate(e) {
    const n = this.data.promptTemplates.findIndex((i) => i.id === e.id);
    n !== -1 ? this.data.promptTemplates[n] = e : this.data.promptTemplates.push(e), this.saveToFile();
  }
  deletePromptTemplate(e) {
    this.data.promptTemplates = this.data.promptTemplates.filter((n) => n.id !== e), this.saveToFile();
  }
  // ========== ProjectAssets ==========
  getAllProjectAssets() {
    return this.data.projectAssets;
  }
  getProjectAssetsByProjectId(e) {
    return this.data.projectAssets.filter((n) => n.projectId === e);
  }
  saveProjectAsset(e) {
    const n = this.data.projectAssets.findIndex((i) => i.id === e.id);
    n !== -1 ? this.data.projectAssets[n] = e : this.data.projectAssets.push(e), this.saveToFile();
  }
  deleteProjectAsset(e) {
    this.data.projectAssets = this.data.projectAssets.filter((n) => n.id !== e), this.saveToFile();
  }
  deleteProjectAssetsByProjectId(e) {
    this.data.projectAssets = this.data.projectAssets.filter((n) => n.projectId !== e), this.saveToFile();
  }
  // ========== Materials ==========
  getAllMaterials() {
    return this.data.materials;
  }
  getMaterialsByProjectId(e) {
    return this.data.materials.filter((n) => n.projectId === e);
  }
  saveMaterial(e) {
    const n = this.data.materials.findIndex((i) => i.id === e.id);
    n !== -1 ? this.data.materials[n] = e : this.data.materials.push(e), this.saveToFile();
  }
  deleteMaterial(e) {
    this.data.materials = this.data.materials.filter((n) => n.id !== e), this.saveToFile();
  }
  deleteMaterialsByProjectId(e) {
    this.data.materials = this.data.materials.filter((n) => n.projectId !== e), this.saveToFile();
  }
  // ========== GenerationTasks ==========
  getAllGenerationTasks() {
    return this.data.generationTasks;
  }
  getGenerationTasksByProjectId(e) {
    return this.data.generationTasks.filter((n) => n.projectId === e);
  }
  saveGenerationTask(e) {
    const n = this.data.generationTasks.findIndex((i) => i.id === e.id);
    n !== -1 ? this.data.generationTasks[n] = e : this.data.generationTasks.push(e), this.saveToFile();
  }
  deleteGenerationTask(e) {
    this.data.generationTasks = this.data.generationTasks.filter((n) => n.id !== e), this.saveToFile();
  }
  deleteGenerationTasksByProjectId(e) {
    this.data.generationTasks = this.data.generationTasks.filter((n) => n.projectId !== e), this.saveToFile();
  }
  /**
   * 删除项目及其所有关联数据
   * 对应原 Dexie 的级联删除逻辑
   */
  deleteProjectCascade(e) {
    this.data.generationTasks = this.data.generationTasks.filter((n) => n.projectId !== e), this.data.projectAssets = this.data.projectAssets.filter((n) => n.projectId !== e), this.data.materials = this.data.materials.filter((n) => n.projectId !== e), this.data.projects = this.data.projects.filter((n) => n.id !== e), this.saveToFile();
  }
  protectCredentials(e) {
    return {
      ...e,
      modelConfigs: e.modelConfigs.map(
        (n) => this.secretStorage.protectFields(n, ["apiKey"])
      ),
      appSettings: this.secretStorage.protectFields(e.appSettings, ["picgoApiKey"])
    };
  }
  revealCredentials(e) {
    return {
      ...e,
      modelConfigs: e.modelConfigs.map(
        (n) => this.secretStorage.revealFields(n, ["apiKey"])
      ),
      appSettings: this.secretStorage.revealFields(e.appSettings, ["picgoApiKey"])
    };
  }
}
function k_() {
  return {
    schemaVersion: 2,
    projects: [],
    modelConfigs: [],
    promptTemplates: [],
    projectAssets: [],
    materials: [],
    generationTasks: [],
    appSettings: {}
  };
}
function I_(t) {
  const e = t && typeof t == "object" ? t : {};
  return {
    schemaVersion: 2,
    projects: Array.isArray(e.projects) ? e.projects : [],
    modelConfigs: Array.isArray(e.modelConfigs) ? e.modelConfigs : [],
    promptTemplates: Array.isArray(e.promptTemplates) ? e.promptTemplates : [],
    projectAssets: Array.isArray(e.projectAssets) ? e.projectAssets : [],
    materials: Array.isArray(e.materials) ? e.materials : [],
    generationTasks: Array.isArray(e.generationTasks) ? e.generationTasks : [],
    appSettings: e.appSettings && typeof e.appSettings == "object" ? e.appSettings : {}
  };
}
const Ve = new C_();
function Hg(t, e) {
  return function() {
    return t.apply(e, arguments);
  };
}
const { toString: D_ } = Object.prototype, { getPrototypeOf: Kr } = Object, { iterator: Ra, toStringTag: Vg } = Symbol, Ko = (({ hasOwnProperty: t }) => (e, n) => t.call(e, n))(Object.prototype), Ms = (t, e) => {
  let n = t;
  const i = [];
  for (; n != null && n !== Object.prototype; ) {
    if (i.indexOf(n) !== -1)
      return !1;
    if (i.push(n), Ko(n, e))
      return !0;
    n = Kr(n);
  }
  return !1;
}, j_ = (t, e) => t != null && Ms(t, e) ? t[e] : void 0, Qp = /* @__PURE__ */ ((t) => (e) => {
  const n = D_.call(e);
  return t[n] || (t[n] = n.slice(8, -1).toLowerCase());
})(/* @__PURE__ */ Object.create(null)), dn = (t) => (t = t.toLowerCase(), (e) => Qp(e) === t), Ic = (t) => (e) => typeof e === t, { isArray: lr } = Array, ur = Ic("undefined");
function os(t) {
  return t !== null && !ur(t) && t.constructor !== null && !ur(t.constructor) && Vt(t.constructor.isBuffer) && t.constructor.isBuffer(t);
}
const Kg = dn("ArrayBuffer");
function L_(t) {
  let e;
  return typeof ArrayBuffer < "u" && ArrayBuffer.isView ? e = ArrayBuffer.isView(t) : e = t && t.buffer && Kg(t.buffer), e;
}
const N_ = Ic("string"), Vt = Ic("function"), Yg = Ic("number"), cs = (t) => t !== null && typeof t == "object", F_ = (t) => t === !0 || t === !1, Oo = (t) => {
  if (!cs(t))
    return !1;
  const e = Kr(t);
  return (e === null || e === Object.prototype || Kr(e) === null) && // Treat any genuine (non-Object.prototype-polluted) Symbol.toStringTag or
  // Symbol.iterator as evidence the value is a tagged/iterable type rather
  // than a plain object, while ignoring keys injected onto Object.prototype.
  !Ms(t, Vg) && !Ms(t, Ra);
}, M_ = (t) => {
  if (!cs(t) || os(t))
    return !1;
  try {
    return Object.keys(t).length === 0 && Object.getPrototypeOf(t) === Object.prototype;
  } catch {
    return !1;
  }
}, $_ = dn("Date"), B_ = dn("File"), U_ = (t) => !!(t && typeof t.uri < "u"), z_ = (t) => t && typeof t.getParts < "u", W_ = dn("Blob"), q_ = dn("FileList"), G_ = dn("Set"), H_ = (t) => cs(t) && Vt(t.pipe);
function V_() {
  return typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {};
}
const Od = V_(), Pd = typeof Od.FormData < "u" ? Od.FormData : void 0, K_ = (t) => {
  if (!t) return !1;
  if (Pd && t instanceof Pd) return !0;
  const e = Kr(t);
  if (!e || e === Object.prototype || !Vt(t.append)) return !1;
  const n = Qp(t);
  return n === "formdata" || // detect form-data instance
  n === "object" && Vt(t.toString) && t.toString() === "[object FormData]";
}, Y_ = dn("URLSearchParams"), [Z_, X_, J_, Q_] = [
  "ReadableStream",
  "Request",
  "Response",
  "Headers"
].map(dn), e0 = (t) => t.trim ? t.trim() : t.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
function Oa(t, e, { allOwnKeys: n = !1 } = {}) {
  if (t === null || typeof t > "u")
    return;
  let i, r;
  if (typeof t != "object" && (t = [t]), lr(t))
    for (i = 0, r = t.length; i < r; i++)
      e.call(null, t[i], i, t);
  else {
    if (os(t))
      return;
    const s = n ? Object.getOwnPropertyNames(t) : Object.keys(t), a = s.length;
    let o;
    for (i = 0; i < a; i++)
      o = s[i], e.call(null, t[o], o, t);
  }
}
function Zg(t, e) {
  if (os(t))
    return null;
  e = e.toLowerCase();
  const n = Object.keys(t);
  let i = n.length, r;
  for (; i-- > 0; )
    if (r = n[i], e === r.toLowerCase())
      return r;
  return null;
}
const Ki = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : global, Xg = (t) => !ur(t) && t !== Ki;
function tp(...t) {
  const { caseless: e, skipUndefined: n } = Xg(this) && this || {}, i = {}, r = (s, a) => {
    if (a === "__proto__" || a === "constructor" || a === "prototype")
      return;
    const o = e && typeof a == "string" && Zg(i, a) || a, c = Ko(i, o) ? i[o] : void 0;
    Oo(c) && Oo(s) ? i[o] = tp(c, s) : Oo(s) ? i[o] = tp({}, s) : lr(s) ? i[o] = s.slice() : (!n || !ur(s)) && (i[o] = s);
  };
  for (let s = 0, a = t.length; s < a; s++) {
    const o = t[s];
    if (!o || os(o) || (Oa(o, r), typeof o != "object" || lr(o)))
      continue;
    const c = Object.getOwnPropertySymbols(o);
    for (let l = 0; l < c.length; l++) {
      const u = c[l];
      f0.call(o, u) && r(o[u], u);
    }
  }
  return i;
}
const t0 = (t, e, n, { allOwnKeys: i } = {}) => (Oa(
  e,
  (r, s) => {
    n && Vt(r) ? Object.defineProperty(t, s, {
      // Null-proto descriptor so a polluted Object.prototype.get cannot
      // hijack defineProperty's accessor-vs-data resolution.
      __proto__: null,
      value: Hg(r, n),
      writable: !0,
      enumerable: !0,
      configurable: !0
    }) : Object.defineProperty(t, s, {
      __proto__: null,
      value: r,
      writable: !0,
      enumerable: !0,
      configurable: !0
    });
  },
  { allOwnKeys: i }
), t), n0 = (t) => (t.charCodeAt(0) === 65279 && (t = t.slice(1)), t), i0 = (t, e, n, i) => {
  t.prototype = Object.create(e.prototype, i), Object.defineProperty(t.prototype, "constructor", {
    __proto__: null,
    value: t,
    writable: !0,
    enumerable: !1,
    configurable: !0
  }), Object.defineProperty(t, "super", {
    __proto__: null,
    value: e.prototype
  }), n && Object.assign(t.prototype, n);
}, r0 = (t, e, n, i) => {
  let r, s, a;
  const o = {};
  if (e = e || {}, t == null) return e;
  do {
    for (r = Object.getOwnPropertyNames(t), s = r.length; s-- > 0; )
      a = r[s], (!i || i(a, t, e)) && !o[a] && (e[a] = t[a], o[a] = !0);
    t = n !== !1 && Kr(t);
  } while (t && (!n || n(t, e)) && t !== Object.prototype);
  return e;
}, s0 = (t, e, n) => {
  t = String(t), (n === void 0 || n > t.length) && (n = t.length), n -= e.length;
  const i = t.indexOf(e, n);
  return i !== -1 && i === n;
}, a0 = (t) => {
  if (!t) return null;
  if (lr(t)) return t;
  let e = t.length;
  if (!Yg(e)) return null;
  const n = new Array(e);
  for (; e-- > 0; )
    n[e] = t[e];
  return n;
}, o0 = /* @__PURE__ */ ((t) => (e) => t && e instanceof t)(typeof Uint8Array < "u" && Kr(Uint8Array)), c0 = (t, e) => {
  const i = (t && t[Ra]).call(t);
  let r;
  for (; (r = i.next()) && !r.done; ) {
    const s = r.value;
    e.call(t, s[0], s[1]);
  }
}, l0 = (t, e) => {
  let n;
  const i = [];
  for (; (n = t.exec(e)) !== null; )
    i.push(n);
  return i;
}, u0 = dn("HTMLFormElement"), p0 = (t) => t.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function(n, i, r) {
  return i.toUpperCase() + r;
}), { propertyIsEnumerable: f0 } = Object.prototype, d0 = dn("RegExp"), Jg = (t, e) => {
  const n = Object.getOwnPropertyDescriptors(t), i = {};
  Oa(n, (r, s) => {
    let a;
    (a = e(r, s, t)) !== !1 && (i[s] = a || r);
  }), Object.defineProperties(t, i);
}, h0 = (t) => {
  Jg(t, (e, n) => {
    if (Vt(t) && ["arguments", "caller", "callee"].includes(n))
      return !1;
    const i = t[n];
    if (Vt(i)) {
      if (e.enumerable = !1, "writable" in e) {
        e.writable = !1;
        return;
      }
      e.set || (e.set = () => {
        throw Error("Can not rewrite read-only method '" + n + "'");
      });
    }
  });
}, m0 = (t, e) => {
  const n = {}, i = (r) => {
    r.forEach((s) => {
      n[s] = !0;
    });
  };
  return lr(t) ? i(t) : i(String(t).split(e)), n;
}, g0 = () => {
}, b0 = (t, e) => t != null && Number.isFinite(t = +t) ? t : e;
function y0(t) {
  return !!(t && Vt(t.append) && t[Vg] === "FormData" && t[Ra]);
}
const v0 = (t) => {
  const e = /* @__PURE__ */ new WeakSet(), n = (i) => {
    if (cs(i)) {
      if (e.has(i))
        return;
      if (os(i))
        return i;
      if (!("toJSON" in i)) {
        e.add(i);
        let r;
        if (G_(i)) {
          r = [];
          for (const s of i) {
            const a = n(s);
            !ur(a) && r.push(a);
          }
        } else
          r = lr(i) ? [] : {}, Oa(i, (s, a) => {
            const o = n(s);
            !ur(o) && (r[a] = o);
          });
        return e.delete(i), r;
      }
    }
    return i;
  };
  return n(t);
}, x0 = dn("AsyncFunction"), w0 = (t) => t && (cs(t) || Vt(t)) && Vt(t.then) && Vt(t.catch), Qg = ((t, e) => t ? setImmediate : e ? ((n, i) => (Ki.addEventListener(
  "message",
  ({ source: r, data: s }) => {
    r === Ki && s === n && i.length && i.shift()();
  },
  !1
), (r) => {
  i.push(r), Ki.postMessage(n, "*");
}))(`axios@${Math.random()}`, []) : (n) => setTimeout(n))(typeof setImmediate == "function", Vt(Ki.postMessage)), _0 = typeof queueMicrotask < "u" ? queueMicrotask.bind(Ki) : typeof process < "u" && process.nextTick || Qg, eb = (t) => t != null && Vt(t[Ra]), S0 = (t) => t != null && Ms(t, Ra) && eb(t), F = {
  isArray: lr,
  isArrayBuffer: Kg,
  isBuffer: os,
  isFormData: K_,
  isArrayBufferView: L_,
  isString: N_,
  isNumber: Yg,
  isBoolean: F_,
  isObject: cs,
  isPlainObject: Oo,
  isEmptyObject: M_,
  isReadableStream: Z_,
  isRequest: X_,
  isResponse: J_,
  isHeaders: Q_,
  isUndefined: ur,
  isDate: $_,
  isFile: B_,
  isReactNativeBlob: U_,
  isReactNative: z_,
  isBlob: W_,
  isRegExp: d0,
  isFunction: Vt,
  isStream: H_,
  isURLSearchParams: Y_,
  isTypedArray: o0,
  isFileList: q_,
  forEach: Oa,
  merge: tp,
  extend: t0,
  trim: e0,
  stripBOM: n0,
  inherits: i0,
  toFlatObject: r0,
  kindOf: Qp,
  kindOfTest: dn,
  endsWith: s0,
  toArray: a0,
  forEachEntry: c0,
  matchAll: l0,
  isHTMLForm: u0,
  hasOwnProperty: Ko,
  hasOwnProp: Ko,
  // an alias to avoid ESLint no-prototype-builtins detection
  hasOwnInPrototypeChain: Ms,
  getSafeProp: j_,
  reduceDescriptors: Jg,
  freezeMethods: h0,
  toObjectSet: m0,
  toCamelCase: p0,
  noop: g0,
  toFiniteNumber: b0,
  findKey: Zg,
  global: Ki,
  isContextDefined: Xg,
  isSpecCompliantForm: y0,
  toJSONObject: v0,
  isAsyncFn: x0,
  isThenable: w0,
  setImmediate: Qg,
  asap: _0,
  isIterable: eb,
  isSafeIterable: S0
}, E0 = F.toObjectSet([
  "age",
  "authorization",
  "content-length",
  "content-type",
  "etag",
  "expires",
  "from",
  "host",
  "if-modified-since",
  "if-unmodified-since",
  "last-modified",
  "location",
  "max-forwards",
  "proxy-authorization",
  "referer",
  "retry-after",
  "user-agent"
]), A0 = (t) => {
  const e = {};
  let n, i, r;
  return t && t.split(`
`).forEach(function(a) {
    r = a.indexOf(":"), n = a.substring(0, r).trim().toLowerCase(), i = a.substring(r + 1).trim();
    const o = F.hasOwnProp(e, n);
    !n || o && F.hasOwnProp(E0, n) || (n === "set-cookie" ? o ? e[n].push(i) : e[n] = [i] : e[n] = o ? e[n] + ", " + i : i);
  }), e;
};
function T0(t) {
  let e = 0, n = t.length;
  for (; e < n; ) {
    const i = t.charCodeAt(e);
    if (i !== 9 && i !== 32)
      break;
    e += 1;
  }
  for (; n > e; ) {
    const i = t.charCodeAt(n - 1);
    if (i !== 9 && i !== 32)
      break;
    n -= 1;
  }
  return e === 0 && n === t.length ? t : t.slice(e, n);
}
const R0 = new RegExp("[\\u0000-\\u0008\\u000a-\\u001f\\u007f]+", "g"), O0 = new RegExp("[^\\u0009\\u0020-\\u007e\\u0080-\\u00ff]+", "g");
function ef(t, e) {
  return F.isArray(t) ? t.map((n) => ef(n, e)) : T0(String(t).replace(e, ""));
}
const P0 = (t) => ef(t, R0), C0 = (t) => ef(t, O0);
function tf(t) {
  const e = /* @__PURE__ */ Object.create(null);
  return F.forEach(t.toJSON(), (n, i) => {
    e[i] = C0(n);
  }), e;
}
const Cd = Symbol("internals");
function vs(t) {
  return t && String(t).trim().toLowerCase();
}
function Po(t) {
  return t === !1 || t == null ? t : F.isArray(t) ? t.map(Po) : P0(String(t));
}
function k0(t) {
  const e = /* @__PURE__ */ Object.create(null), n = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let i;
  for (; i = n.exec(t); )
    e[i[1]] = i[2];
  return e;
}
const I0 = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
function _l(t) {
  let e = 0, n = t.length;
  for (; e < n; ) {
    const i = t.charCodeAt(e);
    if (i !== 9 && i !== 32)
      break;
    e += 1;
  }
  for (; n > e; ) {
    const i = t.charCodeAt(n - 1);
    if (i !== 9 && i !== 32)
      break;
    n -= 1;
  }
  return e === 0 && n === t.length ? t : t.slice(e, n);
}
function D0(t) {
  const e = t.length - 1;
  if (e < 1 || t.charCodeAt(0) !== 34 || t.charCodeAt(e) !== 34)
    return t;
  let n = "";
  for (let i = 1; i < e; i++) {
    const r = t.charCodeAt(i);
    if (r === 34 || r === 92 && (i += 1, i >= e))
      return t;
    n += t[i];
  }
  return n;
}
function j0(t) {
  const e = /* @__PURE__ */ Object.create(null), n = String(t);
  let i = 0, r = !1, s = !1;
  function a(o) {
    const c = _l(n.slice(i, o)), l = c.indexOf("=");
    if (l < 1)
      return;
    const u = _l(c.slice(0, l));
    if (!I0.test(u))
      return;
    const p = u.toLowerCase();
    if (p === "__proto__" || p === "constructor" || p === "prototype")
      return;
    const d = _l(c.slice(l + 1));
    e[p] = D0(d);
  }
  for (let o = 0; o < n.length; o++) {
    const c = n.charCodeAt(o);
    r ? s ? s = !1 : c === 92 ? s = !0 : c === 34 && (r = !1) : c === 34 ? r = !0 : (c === 44 || c === 59) && (a(o), i = o + 1);
  }
  return a(n.length), e;
}
const L0 = (t) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(t.trim());
function Sl(t, e, n, i, r) {
  if (F.isFunction(i))
    return i.call(this, e, n);
  if (r && (e = n), !!F.isString(e)) {
    if (F.isString(i))
      return e.indexOf(i) !== -1;
    if (F.isRegExp(i))
      return i.test(e);
  }
}
function N0(t) {
  return t.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (e, n, i) => n.toUpperCase() + i);
}
function F0(t, e) {
  const n = F.toCamelCase(" " + e);
  ["get", "set", "has"].forEach((i) => {
    Object.defineProperty(t, i + n, {
      // Null-proto descriptor so a polluted Object.prototype.get cannot turn
      // this data descriptor into an accessor descriptor on the way in.
      __proto__: null,
      value: function(r, s, a) {
        return this[i].call(this, e, r, s, a);
      },
      configurable: !0
    });
  });
}
let vt = class {
  constructor(e) {
    e && this.set(e);
  }
  set(e, n, i) {
    const r = this;
    function s(o, c, l) {
      const u = vs(c);
      if (!u)
        return;
      const p = F.findKey(r, u);
      (!p || r[p] === void 0 || l === !0 || l === void 0 && r[p] !== !1) && (r[p || c] = Po(o));
    }
    const a = (o, c) => F.forEach(o, (l, u) => s(l, u, c));
    if (F.isPlainObject(e) || e instanceof this.constructor)
      a(e, n);
    else if (F.isString(e) && (e = e.trim()) && !L0(e))
      a(A0(e), n);
    else if (F.isObject(e) && F.isSafeIterable(e)) {
      let o = /* @__PURE__ */ Object.create(null), c, l;
      for (const u of e) {
        if (!F.isArray(u))
          throw new TypeError("Object iterator must return a key-value pair");
        l = u[0], F.hasOwnProp(o, l) ? (c = o[l], o[l] = F.isArray(c) ? [...c, u[1]] : [c, u[1]]) : o[l] = u[1];
      }
      a(o, n);
    } else
      e != null && s(n, e, i);
    return this;
  }
  get(e, n) {
    if (e = vs(e), e) {
      const i = F.findKey(this, e);
      if (i) {
        const r = this[i];
        if (!n)
          return r;
        if (n === !0)
          return k0(r);
        if (F.isFunction(n))
          return n.call(this, r, i);
        if (F.isRegExp(n))
          return n.exec(r);
        throw new TypeError("parser must be boolean|regexp|function");
      }
    }
  }
  has(e, n) {
    if (e = vs(e), e) {
      const i = F.findKey(this, e);
      return !!(i && this[i] !== void 0 && (!n || Sl(this, this[i], i, n)));
    }
    return !1;
  }
  delete(e, n) {
    const i = this;
    let r = !1;
    function s(a) {
      if (a = vs(a), a) {
        const o = F.findKey(i, a);
        o && (!n || Sl(i, i[o], o, n)) && (delete i[o], r = !0);
      }
    }
    return F.isArray(e) ? e.forEach(s) : s(e), r;
  }
  clear(e) {
    const n = Object.keys(this);
    let i = n.length, r = !1;
    for (; i--; ) {
      const s = n[i];
      (!e || Sl(this, this[s], s, e, !0)) && (delete this[s], r = !0);
    }
    return r;
  }
  normalize(e) {
    const n = this, i = {};
    return F.forEach(this, (r, s) => {
      const a = F.findKey(i, s);
      if (a) {
        n[a] = Po(r), delete n[s];
        return;
      }
      const o = e ? N0(s) : String(s).trim();
      o !== s && delete n[s], n[o] = Po(r), i[o] = !0;
    }), this;
  }
  concat(...e) {
    return this.constructor.concat(this, ...e);
  }
  toJSON(e) {
    const n = /* @__PURE__ */ Object.create(null);
    return F.forEach(this, (i, r) => {
      i != null && i !== !1 && (n[r] = e && F.isArray(i) ? i.join(", ") : i);
    }), n;
  }
  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }
  toString() {
    return Object.entries(this.toJSON()).map(([e, n]) => e + ": " + n).join(`
`);
  }
  getSetCookie() {
    const e = this.get("set-cookie");
    return F.isArray(e) ? e : e == null || e === !1 ? [] : [e];
  }
  get [Symbol.toStringTag]() {
    return "AxiosHeaders";
  }
  static from(e) {
    return e instanceof this ? e : new this(e);
  }
  static parseParameters(e) {
    return j0(e);
  }
  static concat(e, ...n) {
    const i = new this(e);
    return n.forEach((r) => i.set(r)), i;
  }
  static accessor(e) {
    const i = (this[Cd] = this[Cd] = {
      accessors: {}
    }).accessors, r = this.prototype;
    function s(a) {
      const o = vs(a);
      i[o] || (F0(r, a), i[o] = !0);
    }
    return F.isArray(e) ? e.forEach(s) : s(e), this;
  }
};
vt.accessor([
  "Content-Type",
  "Content-Length",
  "Accept",
  "Accept-Encoding",
  "User-Agent",
  "Authorization"
]);
F.reduceDescriptors(vt.prototype, ({ value: t }, e) => {
  let n = e[0].toUpperCase() + e.slice(1);
  return {
    get: () => t,
    set(i) {
      this[n] = i;
    }
  };
});
F.freezeMethods(vt);
const Yo = "[REDACTED ****]";
function M0(t) {
  if (F.hasOwnProp(t, "toJSON"))
    return !0;
  let e = Object.getPrototypeOf(t);
  for (; e && e !== Object.prototype; ) {
    if (F.hasOwnProp(e, "toJSON"))
      return !0;
    e = Object.getPrototypeOf(e);
  }
  return !1;
}
function $0(t, e) {
  const n = new Set(e.map((s) => String(s).toLowerCase())), i = [], r = (s) => {
    if (s === null || typeof s != "object" || F.isBuffer(s)) return s;
    if (i.indexOf(s) !== -1) return;
    s instanceof vt && (s = s.toJSON()), i.push(s);
    let a;
    if (F.isArray(s))
      a = [], s.forEach((o, c) => {
        const l = r(o);
        F.isUndefined(l) || (a[c] = l);
      });
    else {
      if (!F.isPlainObject(s) && M0(s))
        return i.pop(), s;
      a = /* @__PURE__ */ Object.create(null);
      for (const [o, c] of Object.entries(s)) {
        const l = n.has(o.toLowerCase()) ? Yo : r(c);
        F.isUndefined(l) || (a[o] = l);
      }
    }
    return i.pop(), a;
  };
  return r(t);
}
function kd(t) {
  try {
    return String(t);
  } catch {
    return "";
  }
}
function B0(t) {
  return t.errors.map((n) => {
    try {
      return n && n.message ? kd(n.message) : kd(n);
    } catch {
      return "";
    }
  }).filter(Boolean).join("; ") || t.name || "AggregateError";
}
let ce = class tb extends Error {
  static from(e, n, i, r, s, a) {
    let o = e.message;
    !o && F.isArray(e.errors) && e.errors.length && (o = B0(e));
    const c = new tb(o, n || e.code, i, r, s);
    return Object.defineProperty(c, "cause", {
      __proto__: null,
      value: e,
      writable: !0,
      enumerable: !1,
      configurable: !0
    }), c.name = e.name, e.status != null && c.status == null && (c.status = e.status), a && Object.assign(c, a), c;
  }
  /**
   * Create an Error with the specified message, config, error code, request and response.
   *
   * @param {string} message The error message.
   * @param {string} [code] The error code (for example, 'ECONNABORTED').
   * @param {Object} [config] The config.
   * @param {Object} [request] The request.
   * @param {Object} [response] The response.
   *
   * @returns {Error} The created error.
   */
  constructor(e, n, i, r, s) {
    super(e), Object.defineProperty(this, "message", {
      // Null-proto descriptor so a polluted Object.prototype.get cannot turn
      // this data descriptor into an accessor descriptor on the way in.
      __proto__: null,
      value: e,
      enumerable: !0,
      writable: !0,
      configurable: !0
    }), this.name = "AxiosError", this.isAxiosError = !0, n && (this.code = n), i && (this.config = i), r && (this.request = r), s && (this.response = s, this.status = s.status);
  }
  toJSON() {
    const e = this.config, n = e && F.hasOwnProp(e, "redact") ? e.redact : void 0, i = F.isArray(n) && n.length > 0 ? $0(e, n) : F.toJSONObject(e);
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: i,
      code: this.code,
      status: this.status
    };
  }
};
ce.ERR_BAD_OPTION_VALUE = "ERR_BAD_OPTION_VALUE";
ce.ERR_BAD_OPTION = "ERR_BAD_OPTION";
ce.ECONNABORTED = "ECONNABORTED";
ce.ETIMEDOUT = "ETIMEDOUT";
ce.ECONNREFUSED = "ECONNREFUSED";
ce.ERR_NETWORK = "ERR_NETWORK";
ce.ERR_FR_TOO_MANY_REDIRECTS = "ERR_FR_TOO_MANY_REDIRECTS";
ce.ERR_DEPRECATED = "ERR_DEPRECATED";
ce.ERR_BAD_RESPONSE = "ERR_BAD_RESPONSE";
ce.ERR_BAD_REQUEST = "ERR_BAD_REQUEST";
ce.ERR_CANCELED = "ERR_CANCELED";
ce.ERR_NOT_SUPPORT = "ERR_NOT_SUPPORT";
ce.ERR_INVALID_URL = "ERR_INVALID_URL";
ce.ERR_FORM_DATA_DEPTH_EXCEEDED = "ERR_FORM_DATA_DEPTH_EXCEEDED";
var We = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Dc(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
function nb(t) {
  if (t.__esModule) return t;
  var e = t.default;
  if (typeof e == "function") {
    var n = function i() {
      return this instanceof i ? Reflect.construct(e, arguments, this.constructor) : e.apply(this, arguments);
    };
    n.prototype = e.prototype;
  } else n = {};
  return Object.defineProperty(n, "__esModule", { value: !0 }), Object.keys(t).forEach(function(i) {
    var r = Object.getOwnPropertyDescriptor(t, i);
    Object.defineProperty(n, i, r.get ? r : {
      enumerable: !0,
      get: function() {
        return t[i];
      }
    });
  }), n;
}
var ib = nt.Stream, U0 = xt, z0 = Rn;
function Rn() {
  this.source = null, this.dataSize = 0, this.maxDataSize = 1024 * 1024, this.pauseStream = !0, this._maxDataSizeExceeded = !1, this._released = !1, this._bufferedEvents = [];
}
U0.inherits(Rn, ib);
Rn.create = function(t, e) {
  var n = new this();
  e = e || {};
  for (var i in e)
    n[i] = e[i];
  n.source = t;
  var r = t.emit;
  return t.emit = function() {
    return n._handleEmit(arguments), r.apply(t, arguments);
  }, t.on("error", function() {
  }), n.pauseStream && t.pause(), n;
};
Object.defineProperty(Rn.prototype, "readable", {
  configurable: !0,
  enumerable: !0,
  get: function() {
    return this.source.readable;
  }
});
Rn.prototype.setEncoding = function() {
  return this.source.setEncoding.apply(this.source, arguments);
};
Rn.prototype.resume = function() {
  this._released || this.release(), this.source.resume();
};
Rn.prototype.pause = function() {
  this.source.pause();
};
Rn.prototype.release = function() {
  this._released = !0, this._bufferedEvents.forEach((function(t) {
    this.emit.apply(this, t);
  }).bind(this)), this._bufferedEvents = [];
};
Rn.prototype.pipe = function() {
  var t = ib.prototype.pipe.apply(this, arguments);
  return this.resume(), t;
};
Rn.prototype._handleEmit = function(t) {
  if (this._released) {
    this.emit.apply(this, t);
    return;
  }
  t[0] === "data" && (this.dataSize += t[1].length, this._checkIfMaxDataSizeExceeded()), this._bufferedEvents.push(t);
};
Rn.prototype._checkIfMaxDataSizeExceeded = function() {
  if (!this._maxDataSizeExceeded && !(this.dataSize <= this.maxDataSize)) {
    this._maxDataSizeExceeded = !0;
    var t = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
    this.emit("error", new Error(t));
  }
};
var W0 = xt, rb = nt.Stream, Id = z0, q0 = lt;
function lt() {
  this.writable = !1, this.readable = !0, this.dataSize = 0, this.maxDataSize = 2 * 1024 * 1024, this.pauseStreams = !0, this._released = !1, this._streams = [], this._currentStream = null, this._insideLoop = !1, this._pendingNext = !1;
}
W0.inherits(lt, rb);
lt.create = function(t) {
  var e = new this();
  t = t || {};
  for (var n in t)
    e[n] = t[n];
  return e;
};
lt.isStreamLike = function(t) {
  return typeof t != "function" && typeof t != "string" && typeof t != "boolean" && typeof t != "number" && !Buffer.isBuffer(t);
};
lt.prototype.append = function(t) {
  var e = lt.isStreamLike(t);
  if (e) {
    if (!(t instanceof Id)) {
      var n = Id.create(t, {
        maxDataSize: 1 / 0,
        pauseStream: this.pauseStreams
      });
      t.on("data", this._checkDataSize.bind(this)), t = n;
    }
    this._handleErrors(t), this.pauseStreams && t.pause();
  }
  return this._streams.push(t), this;
};
lt.prototype.pipe = function(t, e) {
  return rb.prototype.pipe.call(this, t, e), this.resume(), t;
};
lt.prototype._getNext = function() {
  if (this._currentStream = null, this._insideLoop) {
    this._pendingNext = !0;
    return;
  }
  this._insideLoop = !0;
  try {
    do
      this._pendingNext = !1, this._realGetNext();
    while (this._pendingNext);
  } finally {
    this._insideLoop = !1;
  }
};
lt.prototype._realGetNext = function() {
  var t = this._streams.shift();
  if (typeof t > "u") {
    this.end();
    return;
  }
  if (typeof t != "function") {
    this._pipeNext(t);
    return;
  }
  var e = t;
  e((function(n) {
    var i = lt.isStreamLike(n);
    i && (n.on("data", this._checkDataSize.bind(this)), this._handleErrors(n)), this._pipeNext(n);
  }).bind(this));
};
lt.prototype._pipeNext = function(t) {
  this._currentStream = t;
  var e = lt.isStreamLike(t);
  if (e) {
    t.on("end", this._getNext.bind(this)), t.pipe(this, { end: !1 });
    return;
  }
  var n = t;
  this.write(n), this._getNext();
};
lt.prototype._handleErrors = function(t) {
  var e = this;
  t.on("error", function(n) {
    e._emitError(n);
  });
};
lt.prototype.write = function(t) {
  this.emit("data", t);
};
lt.prototype.pause = function() {
  this.pauseStreams && (this.pauseStreams && this._currentStream && typeof this._currentStream.pause == "function" && this._currentStream.pause(), this.emit("pause"));
};
lt.prototype.resume = function() {
  this._released || (this._released = !0, this.writable = !0, this._getNext()), this.pauseStreams && this._currentStream && typeof this._currentStream.resume == "function" && this._currentStream.resume(), this.emit("resume");
};
lt.prototype.end = function() {
  this._reset(), this.emit("end");
};
lt.prototype.destroy = function() {
  this._reset(), this.emit("close");
};
lt.prototype._reset = function() {
  this.writable = !1, this._streams = [], this._currentStream = null;
};
lt.prototype._checkDataSize = function() {
  if (this._updateDataSize(), !(this.dataSize <= this.maxDataSize)) {
    var t = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
    this._emitError(new Error(t));
  }
};
lt.prototype._updateDataSize = function() {
  this.dataSize = 0;
  var t = this;
  this._streams.forEach(function(e) {
    e.dataSize && (t.dataSize += e.dataSize);
  }), this._currentStream && this._currentStream.dataSize && (this.dataSize += this._currentStream.dataSize);
};
lt.prototype._emitError = function(t) {
  this._reset(), this.emit("error", t);
};
var sb = {};
const G0 = {
  "application/1d-interleaved-parityfec": {
    source: "iana"
  },
  "application/3gpdash-qoe-report+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/3gpp-ims+xml": {
    source: "iana",
    compressible: !0
  },
  "application/3gpphal+json": {
    source: "iana",
    compressible: !0
  },
  "application/3gpphalforms+json": {
    source: "iana",
    compressible: !0
  },
  "application/a2l": {
    source: "iana"
  },
  "application/ace+cbor": {
    source: "iana"
  },
  "application/activemessage": {
    source: "iana"
  },
  "application/activity+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-costmap+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-costmapfilter+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-directory+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-endpointcost+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-endpointcostparams+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-endpointprop+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-endpointpropparams+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-error+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-networkmap+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-networkmapfilter+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-updatestreamcontrol+json": {
    source: "iana",
    compressible: !0
  },
  "application/alto-updatestreamparams+json": {
    source: "iana",
    compressible: !0
  },
  "application/aml": {
    source: "iana"
  },
  "application/andrew-inset": {
    source: "iana",
    extensions: [
      "ez"
    ]
  },
  "application/applefile": {
    source: "iana"
  },
  "application/applixware": {
    source: "apache",
    extensions: [
      "aw"
    ]
  },
  "application/at+jwt": {
    source: "iana"
  },
  "application/atf": {
    source: "iana"
  },
  "application/atfx": {
    source: "iana"
  },
  "application/atom+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "atom"
    ]
  },
  "application/atomcat+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "atomcat"
    ]
  },
  "application/atomdeleted+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "atomdeleted"
    ]
  },
  "application/atomicmail": {
    source: "iana"
  },
  "application/atomsvc+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "atomsvc"
    ]
  },
  "application/atsc-dwd+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "dwd"
    ]
  },
  "application/atsc-dynamic-event-message": {
    source: "iana"
  },
  "application/atsc-held+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "held"
    ]
  },
  "application/atsc-rdt+json": {
    source: "iana",
    compressible: !0
  },
  "application/atsc-rsat+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rsat"
    ]
  },
  "application/atxml": {
    source: "iana"
  },
  "application/auth-policy+xml": {
    source: "iana",
    compressible: !0
  },
  "application/bacnet-xdd+zip": {
    source: "iana",
    compressible: !1
  },
  "application/batch-smtp": {
    source: "iana"
  },
  "application/bdoc": {
    compressible: !1,
    extensions: [
      "bdoc"
    ]
  },
  "application/beep+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/calendar+json": {
    source: "iana",
    compressible: !0
  },
  "application/calendar+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xcs"
    ]
  },
  "application/call-completion": {
    source: "iana"
  },
  "application/cals-1840": {
    source: "iana"
  },
  "application/captive+json": {
    source: "iana",
    compressible: !0
  },
  "application/cbor": {
    source: "iana"
  },
  "application/cbor-seq": {
    source: "iana"
  },
  "application/cccex": {
    source: "iana"
  },
  "application/ccmp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/ccxml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ccxml"
    ]
  },
  "application/cdfx+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "cdfx"
    ]
  },
  "application/cdmi-capability": {
    source: "iana",
    extensions: [
      "cdmia"
    ]
  },
  "application/cdmi-container": {
    source: "iana",
    extensions: [
      "cdmic"
    ]
  },
  "application/cdmi-domain": {
    source: "iana",
    extensions: [
      "cdmid"
    ]
  },
  "application/cdmi-object": {
    source: "iana",
    extensions: [
      "cdmio"
    ]
  },
  "application/cdmi-queue": {
    source: "iana",
    extensions: [
      "cdmiq"
    ]
  },
  "application/cdni": {
    source: "iana"
  },
  "application/cea": {
    source: "iana"
  },
  "application/cea-2018+xml": {
    source: "iana",
    compressible: !0
  },
  "application/cellml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/cfw": {
    source: "iana"
  },
  "application/city+json": {
    source: "iana",
    compressible: !0
  },
  "application/clr": {
    source: "iana"
  },
  "application/clue+xml": {
    source: "iana",
    compressible: !0
  },
  "application/clue_info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/cms": {
    source: "iana"
  },
  "application/cnrp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/coap-group+json": {
    source: "iana",
    compressible: !0
  },
  "application/coap-payload": {
    source: "iana"
  },
  "application/commonground": {
    source: "iana"
  },
  "application/conference-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/cose": {
    source: "iana"
  },
  "application/cose-key": {
    source: "iana"
  },
  "application/cose-key-set": {
    source: "iana"
  },
  "application/cpl+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "cpl"
    ]
  },
  "application/csrattrs": {
    source: "iana"
  },
  "application/csta+xml": {
    source: "iana",
    compressible: !0
  },
  "application/cstadata+xml": {
    source: "iana",
    compressible: !0
  },
  "application/csvm+json": {
    source: "iana",
    compressible: !0
  },
  "application/cu-seeme": {
    source: "apache",
    extensions: [
      "cu"
    ]
  },
  "application/cwt": {
    source: "iana"
  },
  "application/cybercash": {
    source: "iana"
  },
  "application/dart": {
    compressible: !0
  },
  "application/dash+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mpd"
    ]
  },
  "application/dash-patch+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mpp"
    ]
  },
  "application/dashdelta": {
    source: "iana"
  },
  "application/davmount+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "davmount"
    ]
  },
  "application/dca-rft": {
    source: "iana"
  },
  "application/dcd": {
    source: "iana"
  },
  "application/dec-dx": {
    source: "iana"
  },
  "application/dialog-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/dicom": {
    source: "iana"
  },
  "application/dicom+json": {
    source: "iana",
    compressible: !0
  },
  "application/dicom+xml": {
    source: "iana",
    compressible: !0
  },
  "application/dii": {
    source: "iana"
  },
  "application/dit": {
    source: "iana"
  },
  "application/dns": {
    source: "iana"
  },
  "application/dns+json": {
    source: "iana",
    compressible: !0
  },
  "application/dns-message": {
    source: "iana"
  },
  "application/docbook+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "dbk"
    ]
  },
  "application/dots+cbor": {
    source: "iana"
  },
  "application/dskpp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/dssc+der": {
    source: "iana",
    extensions: [
      "dssc"
    ]
  },
  "application/dssc+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xdssc"
    ]
  },
  "application/dvcs": {
    source: "iana"
  },
  "application/ecmascript": {
    source: "iana",
    compressible: !0,
    extensions: [
      "es",
      "ecma"
    ]
  },
  "application/edi-consent": {
    source: "iana"
  },
  "application/edi-x12": {
    source: "iana",
    compressible: !1
  },
  "application/edifact": {
    source: "iana",
    compressible: !1
  },
  "application/efi": {
    source: "iana"
  },
  "application/elm+json": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/elm+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.cap+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/emergencycalldata.comment+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.control+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.deviceinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.ecall.msd": {
    source: "iana"
  },
  "application/emergencycalldata.providerinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.serviceinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.subscriberinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emergencycalldata.veds+xml": {
    source: "iana",
    compressible: !0
  },
  "application/emma+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "emma"
    ]
  },
  "application/emotionml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "emotionml"
    ]
  },
  "application/encaprtp": {
    source: "iana"
  },
  "application/epp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/epub+zip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "epub"
    ]
  },
  "application/eshop": {
    source: "iana"
  },
  "application/exi": {
    source: "iana",
    extensions: [
      "exi"
    ]
  },
  "application/expect-ct-report+json": {
    source: "iana",
    compressible: !0
  },
  "application/express": {
    source: "iana",
    extensions: [
      "exp"
    ]
  },
  "application/fastinfoset": {
    source: "iana"
  },
  "application/fastsoap": {
    source: "iana"
  },
  "application/fdt+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "fdt"
    ]
  },
  "application/fhir+json": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/fhir+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/fido.trusted-apps+json": {
    compressible: !0
  },
  "application/fits": {
    source: "iana"
  },
  "application/flexfec": {
    source: "iana"
  },
  "application/font-sfnt": {
    source: "iana"
  },
  "application/font-tdpfr": {
    source: "iana",
    extensions: [
      "pfr"
    ]
  },
  "application/font-woff": {
    source: "iana",
    compressible: !1
  },
  "application/framework-attributes+xml": {
    source: "iana",
    compressible: !0
  },
  "application/geo+json": {
    source: "iana",
    compressible: !0,
    extensions: [
      "geojson"
    ]
  },
  "application/geo+json-seq": {
    source: "iana"
  },
  "application/geopackage+sqlite3": {
    source: "iana"
  },
  "application/geoxacml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/gltf-buffer": {
    source: "iana"
  },
  "application/gml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "gml"
    ]
  },
  "application/gpx+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "gpx"
    ]
  },
  "application/gxf": {
    source: "apache",
    extensions: [
      "gxf"
    ]
  },
  "application/gzip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "gz"
    ]
  },
  "application/h224": {
    source: "iana"
  },
  "application/held+xml": {
    source: "iana",
    compressible: !0
  },
  "application/hjson": {
    extensions: [
      "hjson"
    ]
  },
  "application/http": {
    source: "iana"
  },
  "application/hyperstudio": {
    source: "iana",
    extensions: [
      "stk"
    ]
  },
  "application/ibe-key-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/ibe-pkg-reply+xml": {
    source: "iana",
    compressible: !0
  },
  "application/ibe-pp-data": {
    source: "iana"
  },
  "application/iges": {
    source: "iana"
  },
  "application/im-iscomposing+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/index": {
    source: "iana"
  },
  "application/index.cmd": {
    source: "iana"
  },
  "application/index.obj": {
    source: "iana"
  },
  "application/index.response": {
    source: "iana"
  },
  "application/index.vnd": {
    source: "iana"
  },
  "application/inkml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ink",
      "inkml"
    ]
  },
  "application/iotp": {
    source: "iana"
  },
  "application/ipfix": {
    source: "iana",
    extensions: [
      "ipfix"
    ]
  },
  "application/ipp": {
    source: "iana"
  },
  "application/isup": {
    source: "iana"
  },
  "application/its+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "its"
    ]
  },
  "application/java-archive": {
    source: "apache",
    compressible: !1,
    extensions: [
      "jar",
      "war",
      "ear"
    ]
  },
  "application/java-serialized-object": {
    source: "apache",
    compressible: !1,
    extensions: [
      "ser"
    ]
  },
  "application/java-vm": {
    source: "apache",
    compressible: !1,
    extensions: [
      "class"
    ]
  },
  "application/javascript": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "js",
      "mjs"
    ]
  },
  "application/jf2feed+json": {
    source: "iana",
    compressible: !0
  },
  "application/jose": {
    source: "iana"
  },
  "application/jose+json": {
    source: "iana",
    compressible: !0
  },
  "application/jrd+json": {
    source: "iana",
    compressible: !0
  },
  "application/jscalendar+json": {
    source: "iana",
    compressible: !0
  },
  "application/json": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "json",
      "map"
    ]
  },
  "application/json-patch+json": {
    source: "iana",
    compressible: !0
  },
  "application/json-seq": {
    source: "iana"
  },
  "application/json5": {
    extensions: [
      "json5"
    ]
  },
  "application/jsonml+json": {
    source: "apache",
    compressible: !0,
    extensions: [
      "jsonml"
    ]
  },
  "application/jwk+json": {
    source: "iana",
    compressible: !0
  },
  "application/jwk-set+json": {
    source: "iana",
    compressible: !0
  },
  "application/jwt": {
    source: "iana"
  },
  "application/kpml-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/kpml-response+xml": {
    source: "iana",
    compressible: !0
  },
  "application/ld+json": {
    source: "iana",
    compressible: !0,
    extensions: [
      "jsonld"
    ]
  },
  "application/lgr+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "lgr"
    ]
  },
  "application/link-format": {
    source: "iana"
  },
  "application/load-control+xml": {
    source: "iana",
    compressible: !0
  },
  "application/lost+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "lostxml"
    ]
  },
  "application/lostsync+xml": {
    source: "iana",
    compressible: !0
  },
  "application/lpf+zip": {
    source: "iana",
    compressible: !1
  },
  "application/lxf": {
    source: "iana"
  },
  "application/mac-binhex40": {
    source: "iana",
    extensions: [
      "hqx"
    ]
  },
  "application/mac-compactpro": {
    source: "apache",
    extensions: [
      "cpt"
    ]
  },
  "application/macwriteii": {
    source: "iana"
  },
  "application/mads+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mads"
    ]
  },
  "application/manifest+json": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "webmanifest"
    ]
  },
  "application/marc": {
    source: "iana",
    extensions: [
      "mrc"
    ]
  },
  "application/marcxml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mrcx"
    ]
  },
  "application/mathematica": {
    source: "iana",
    extensions: [
      "ma",
      "nb",
      "mb"
    ]
  },
  "application/mathml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mathml"
    ]
  },
  "application/mathml-content+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mathml-presentation+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-associated-procedure-description+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-deregister+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-envelope+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-msk+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-msk-response+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-protection-description+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-reception-report+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-register+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-register-response+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-schedule+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbms-user-service-description+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mbox": {
    source: "iana",
    extensions: [
      "mbox"
    ]
  },
  "application/media-policy-dataset+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mpf"
    ]
  },
  "application/media_control+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mediaservercontrol+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mscml"
    ]
  },
  "application/merge-patch+json": {
    source: "iana",
    compressible: !0
  },
  "application/metalink+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "metalink"
    ]
  },
  "application/metalink4+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "meta4"
    ]
  },
  "application/mets+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mets"
    ]
  },
  "application/mf4": {
    source: "iana"
  },
  "application/mikey": {
    source: "iana"
  },
  "application/mipc": {
    source: "iana"
  },
  "application/missing-blocks+cbor-seq": {
    source: "iana"
  },
  "application/mmt-aei+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "maei"
    ]
  },
  "application/mmt-usd+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "musd"
    ]
  },
  "application/mods+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mods"
    ]
  },
  "application/moss-keys": {
    source: "iana"
  },
  "application/moss-signature": {
    source: "iana"
  },
  "application/mosskey-data": {
    source: "iana"
  },
  "application/mosskey-request": {
    source: "iana"
  },
  "application/mp21": {
    source: "iana",
    extensions: [
      "m21",
      "mp21"
    ]
  },
  "application/mp4": {
    source: "iana",
    extensions: [
      "mp4s",
      "m4p"
    ]
  },
  "application/mpeg4-generic": {
    source: "iana"
  },
  "application/mpeg4-iod": {
    source: "iana"
  },
  "application/mpeg4-iod-xmt": {
    source: "iana"
  },
  "application/mrb-consumer+xml": {
    source: "iana",
    compressible: !0
  },
  "application/mrb-publish+xml": {
    source: "iana",
    compressible: !0
  },
  "application/msc-ivr+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/msc-mixer+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/msword": {
    source: "iana",
    compressible: !1,
    extensions: [
      "doc",
      "dot"
    ]
  },
  "application/mud+json": {
    source: "iana",
    compressible: !0
  },
  "application/multipart-core": {
    source: "iana"
  },
  "application/mxf": {
    source: "iana",
    extensions: [
      "mxf"
    ]
  },
  "application/n-quads": {
    source: "iana",
    extensions: [
      "nq"
    ]
  },
  "application/n-triples": {
    source: "iana",
    extensions: [
      "nt"
    ]
  },
  "application/nasdata": {
    source: "iana"
  },
  "application/news-checkgroups": {
    source: "iana",
    charset: "US-ASCII"
  },
  "application/news-groupinfo": {
    source: "iana",
    charset: "US-ASCII"
  },
  "application/news-transmission": {
    source: "iana"
  },
  "application/nlsml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/node": {
    source: "iana",
    extensions: [
      "cjs"
    ]
  },
  "application/nss": {
    source: "iana"
  },
  "application/oauth-authz-req+jwt": {
    source: "iana"
  },
  "application/oblivious-dns-message": {
    source: "iana"
  },
  "application/ocsp-request": {
    source: "iana"
  },
  "application/ocsp-response": {
    source: "iana"
  },
  "application/octet-stream": {
    source: "iana",
    compressible: !1,
    extensions: [
      "bin",
      "dms",
      "lrf",
      "mar",
      "so",
      "dist",
      "distz",
      "pkg",
      "bpk",
      "dump",
      "elc",
      "deploy",
      "exe",
      "dll",
      "deb",
      "dmg",
      "iso",
      "img",
      "msi",
      "msp",
      "msm",
      "buffer"
    ]
  },
  "application/oda": {
    source: "iana",
    extensions: [
      "oda"
    ]
  },
  "application/odm+xml": {
    source: "iana",
    compressible: !0
  },
  "application/odx": {
    source: "iana"
  },
  "application/oebps-package+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "opf"
    ]
  },
  "application/ogg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "ogx"
    ]
  },
  "application/omdoc+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "omdoc"
    ]
  },
  "application/onenote": {
    source: "apache",
    extensions: [
      "onetoc",
      "onetoc2",
      "onetmp",
      "onepkg"
    ]
  },
  "application/opc-nodeset+xml": {
    source: "iana",
    compressible: !0
  },
  "application/oscore": {
    source: "iana"
  },
  "application/oxps": {
    source: "iana",
    extensions: [
      "oxps"
    ]
  },
  "application/p21": {
    source: "iana"
  },
  "application/p21+zip": {
    source: "iana",
    compressible: !1
  },
  "application/p2p-overlay+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "relo"
    ]
  },
  "application/parityfec": {
    source: "iana"
  },
  "application/passport": {
    source: "iana"
  },
  "application/patch-ops-error+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xer"
    ]
  },
  "application/pdf": {
    source: "iana",
    compressible: !1,
    extensions: [
      "pdf"
    ]
  },
  "application/pdx": {
    source: "iana"
  },
  "application/pem-certificate-chain": {
    source: "iana"
  },
  "application/pgp-encrypted": {
    source: "iana",
    compressible: !1,
    extensions: [
      "pgp"
    ]
  },
  "application/pgp-keys": {
    source: "iana",
    extensions: [
      "asc"
    ]
  },
  "application/pgp-signature": {
    source: "iana",
    extensions: [
      "asc",
      "sig"
    ]
  },
  "application/pics-rules": {
    source: "apache",
    extensions: [
      "prf"
    ]
  },
  "application/pidf+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/pidf-diff+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/pkcs10": {
    source: "iana",
    extensions: [
      "p10"
    ]
  },
  "application/pkcs12": {
    source: "iana"
  },
  "application/pkcs7-mime": {
    source: "iana",
    extensions: [
      "p7m",
      "p7c"
    ]
  },
  "application/pkcs7-signature": {
    source: "iana",
    extensions: [
      "p7s"
    ]
  },
  "application/pkcs8": {
    source: "iana",
    extensions: [
      "p8"
    ]
  },
  "application/pkcs8-encrypted": {
    source: "iana"
  },
  "application/pkix-attr-cert": {
    source: "iana",
    extensions: [
      "ac"
    ]
  },
  "application/pkix-cert": {
    source: "iana",
    extensions: [
      "cer"
    ]
  },
  "application/pkix-crl": {
    source: "iana",
    extensions: [
      "crl"
    ]
  },
  "application/pkix-pkipath": {
    source: "iana",
    extensions: [
      "pkipath"
    ]
  },
  "application/pkixcmp": {
    source: "iana",
    extensions: [
      "pki"
    ]
  },
  "application/pls+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "pls"
    ]
  },
  "application/poc-settings+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/postscript": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ai",
      "eps",
      "ps"
    ]
  },
  "application/ppsp-tracker+json": {
    source: "iana",
    compressible: !0
  },
  "application/problem+json": {
    source: "iana",
    compressible: !0
  },
  "application/problem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/provenance+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "provx"
    ]
  },
  "application/prs.alvestrand.titrax-sheet": {
    source: "iana"
  },
  "application/prs.cww": {
    source: "iana",
    extensions: [
      "cww"
    ]
  },
  "application/prs.cyn": {
    source: "iana",
    charset: "7-BIT"
  },
  "application/prs.hpub+zip": {
    source: "iana",
    compressible: !1
  },
  "application/prs.nprend": {
    source: "iana"
  },
  "application/prs.plucker": {
    source: "iana"
  },
  "application/prs.rdf-xml-crypt": {
    source: "iana"
  },
  "application/prs.xsf+xml": {
    source: "iana",
    compressible: !0
  },
  "application/pskc+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "pskcxml"
    ]
  },
  "application/pvd+json": {
    source: "iana",
    compressible: !0
  },
  "application/qsig": {
    source: "iana"
  },
  "application/raml+yaml": {
    compressible: !0,
    extensions: [
      "raml"
    ]
  },
  "application/raptorfec": {
    source: "iana"
  },
  "application/rdap+json": {
    source: "iana",
    compressible: !0
  },
  "application/rdf+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rdf",
      "owl"
    ]
  },
  "application/reginfo+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rif"
    ]
  },
  "application/relax-ng-compact-syntax": {
    source: "iana",
    extensions: [
      "rnc"
    ]
  },
  "application/remote-printing": {
    source: "iana"
  },
  "application/reputon+json": {
    source: "iana",
    compressible: !0
  },
  "application/resource-lists+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rl"
    ]
  },
  "application/resource-lists-diff+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rld"
    ]
  },
  "application/rfc+xml": {
    source: "iana",
    compressible: !0
  },
  "application/riscos": {
    source: "iana"
  },
  "application/rlmi+xml": {
    source: "iana",
    compressible: !0
  },
  "application/rls-services+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rs"
    ]
  },
  "application/route-apd+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rapd"
    ]
  },
  "application/route-s-tsid+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "sls"
    ]
  },
  "application/route-usd+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rusd"
    ]
  },
  "application/rpki-ghostbusters": {
    source: "iana",
    extensions: [
      "gbr"
    ]
  },
  "application/rpki-manifest": {
    source: "iana",
    extensions: [
      "mft"
    ]
  },
  "application/rpki-publication": {
    source: "iana"
  },
  "application/rpki-roa": {
    source: "iana",
    extensions: [
      "roa"
    ]
  },
  "application/rpki-updown": {
    source: "iana"
  },
  "application/rsd+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "rsd"
    ]
  },
  "application/rss+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "rss"
    ]
  },
  "application/rtf": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rtf"
    ]
  },
  "application/rtploopback": {
    source: "iana"
  },
  "application/rtx": {
    source: "iana"
  },
  "application/samlassertion+xml": {
    source: "iana",
    compressible: !0
  },
  "application/samlmetadata+xml": {
    source: "iana",
    compressible: !0
  },
  "application/sarif+json": {
    source: "iana",
    compressible: !0
  },
  "application/sarif-external-properties+json": {
    source: "iana",
    compressible: !0
  },
  "application/sbe": {
    source: "iana"
  },
  "application/sbml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "sbml"
    ]
  },
  "application/scaip+xml": {
    source: "iana",
    compressible: !0
  },
  "application/scim+json": {
    source: "iana",
    compressible: !0
  },
  "application/scvp-cv-request": {
    source: "iana",
    extensions: [
      "scq"
    ]
  },
  "application/scvp-cv-response": {
    source: "iana",
    extensions: [
      "scs"
    ]
  },
  "application/scvp-vp-request": {
    source: "iana",
    extensions: [
      "spq"
    ]
  },
  "application/scvp-vp-response": {
    source: "iana",
    extensions: [
      "spp"
    ]
  },
  "application/sdp": {
    source: "iana",
    extensions: [
      "sdp"
    ]
  },
  "application/secevent+jwt": {
    source: "iana"
  },
  "application/senml+cbor": {
    source: "iana"
  },
  "application/senml+json": {
    source: "iana",
    compressible: !0
  },
  "application/senml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "senmlx"
    ]
  },
  "application/senml-etch+cbor": {
    source: "iana"
  },
  "application/senml-etch+json": {
    source: "iana",
    compressible: !0
  },
  "application/senml-exi": {
    source: "iana"
  },
  "application/sensml+cbor": {
    source: "iana"
  },
  "application/sensml+json": {
    source: "iana",
    compressible: !0
  },
  "application/sensml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "sensmlx"
    ]
  },
  "application/sensml-exi": {
    source: "iana"
  },
  "application/sep+xml": {
    source: "iana",
    compressible: !0
  },
  "application/sep-exi": {
    source: "iana"
  },
  "application/session-info": {
    source: "iana"
  },
  "application/set-payment": {
    source: "iana"
  },
  "application/set-payment-initiation": {
    source: "iana",
    extensions: [
      "setpay"
    ]
  },
  "application/set-registration": {
    source: "iana"
  },
  "application/set-registration-initiation": {
    source: "iana",
    extensions: [
      "setreg"
    ]
  },
  "application/sgml": {
    source: "iana"
  },
  "application/sgml-open-catalog": {
    source: "iana"
  },
  "application/shf+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "shf"
    ]
  },
  "application/sieve": {
    source: "iana",
    extensions: [
      "siv",
      "sieve"
    ]
  },
  "application/simple-filter+xml": {
    source: "iana",
    compressible: !0
  },
  "application/simple-message-summary": {
    source: "iana"
  },
  "application/simplesymbolcontainer": {
    source: "iana"
  },
  "application/sipc": {
    source: "iana"
  },
  "application/slate": {
    source: "iana"
  },
  "application/smil": {
    source: "iana"
  },
  "application/smil+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "smi",
      "smil"
    ]
  },
  "application/smpte336m": {
    source: "iana"
  },
  "application/soap+fastinfoset": {
    source: "iana"
  },
  "application/soap+xml": {
    source: "iana",
    compressible: !0
  },
  "application/sparql-query": {
    source: "iana",
    extensions: [
      "rq"
    ]
  },
  "application/sparql-results+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "srx"
    ]
  },
  "application/spdx+json": {
    source: "iana",
    compressible: !0
  },
  "application/spirits-event+xml": {
    source: "iana",
    compressible: !0
  },
  "application/sql": {
    source: "iana"
  },
  "application/srgs": {
    source: "iana",
    extensions: [
      "gram"
    ]
  },
  "application/srgs+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "grxml"
    ]
  },
  "application/sru+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "sru"
    ]
  },
  "application/ssdl+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "ssdl"
    ]
  },
  "application/ssml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ssml"
    ]
  },
  "application/stix+json": {
    source: "iana",
    compressible: !0
  },
  "application/swid+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "swidtag"
    ]
  },
  "application/tamp-apex-update": {
    source: "iana"
  },
  "application/tamp-apex-update-confirm": {
    source: "iana"
  },
  "application/tamp-community-update": {
    source: "iana"
  },
  "application/tamp-community-update-confirm": {
    source: "iana"
  },
  "application/tamp-error": {
    source: "iana"
  },
  "application/tamp-sequence-adjust": {
    source: "iana"
  },
  "application/tamp-sequence-adjust-confirm": {
    source: "iana"
  },
  "application/tamp-status-query": {
    source: "iana"
  },
  "application/tamp-status-response": {
    source: "iana"
  },
  "application/tamp-update": {
    source: "iana"
  },
  "application/tamp-update-confirm": {
    source: "iana"
  },
  "application/tar": {
    compressible: !0
  },
  "application/taxii+json": {
    source: "iana",
    compressible: !0
  },
  "application/td+json": {
    source: "iana",
    compressible: !0
  },
  "application/tei+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "tei",
      "teicorpus"
    ]
  },
  "application/tetra_isi": {
    source: "iana"
  },
  "application/thraud+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "tfi"
    ]
  },
  "application/timestamp-query": {
    source: "iana"
  },
  "application/timestamp-reply": {
    source: "iana"
  },
  "application/timestamped-data": {
    source: "iana",
    extensions: [
      "tsd"
    ]
  },
  "application/tlsrpt+gzip": {
    source: "iana"
  },
  "application/tlsrpt+json": {
    source: "iana",
    compressible: !0
  },
  "application/tnauthlist": {
    source: "iana"
  },
  "application/token-introspection+jwt": {
    source: "iana"
  },
  "application/toml": {
    compressible: !0,
    extensions: [
      "toml"
    ]
  },
  "application/trickle-ice-sdpfrag": {
    source: "iana"
  },
  "application/trig": {
    source: "iana",
    extensions: [
      "trig"
    ]
  },
  "application/ttml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ttml"
    ]
  },
  "application/tve-trigger": {
    source: "iana"
  },
  "application/tzif": {
    source: "iana"
  },
  "application/tzif-leap": {
    source: "iana"
  },
  "application/ubjson": {
    compressible: !1,
    extensions: [
      "ubj"
    ]
  },
  "application/ulpfec": {
    source: "iana"
  },
  "application/urc-grpsheet+xml": {
    source: "iana",
    compressible: !0
  },
  "application/urc-ressheet+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rsheet"
    ]
  },
  "application/urc-targetdesc+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "td"
    ]
  },
  "application/urc-uisocketdesc+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vcard+json": {
    source: "iana",
    compressible: !0
  },
  "application/vcard+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vemmi": {
    source: "iana"
  },
  "application/vividence.scriptfile": {
    source: "apache"
  },
  "application/vnd.1000minds.decision-model+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "1km"
    ]
  },
  "application/vnd.3gpp-prose+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp-prose-pc3ch+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp-v2x-local-service-information": {
    source: "iana"
  },
  "application/vnd.3gpp.5gnas": {
    source: "iana"
  },
  "application/vnd.3gpp.access-transfer-events+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.bsf+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.gmop+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.gtpc": {
    source: "iana"
  },
  "application/vnd.3gpp.interworking-data": {
    source: "iana"
  },
  "application/vnd.3gpp.lpp": {
    source: "iana"
  },
  "application/vnd.3gpp.mc-signalling-ear": {
    source: "iana"
  },
  "application/vnd.3gpp.mcdata-affiliation-command+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcdata-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcdata-payload": {
    source: "iana"
  },
  "application/vnd.3gpp.mcdata-service-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcdata-signalling": {
    source: "iana"
  },
  "application/vnd.3gpp.mcdata-ue-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcdata-user-profile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-affiliation-command+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-floor-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-location-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-mbms-usage-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-service-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-signed+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-ue-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-ue-init-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcptt-user-profile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-affiliation-command+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-affiliation-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-location-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-mbms-usage-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-service-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-transmission-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-ue-config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mcvideo-user-profile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.mid-call+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.ngap": {
    source: "iana"
  },
  "application/vnd.3gpp.pfcp": {
    source: "iana"
  },
  "application/vnd.3gpp.pic-bw-large": {
    source: "iana",
    extensions: [
      "plb"
    ]
  },
  "application/vnd.3gpp.pic-bw-small": {
    source: "iana",
    extensions: [
      "psb"
    ]
  },
  "application/vnd.3gpp.pic-bw-var": {
    source: "iana",
    extensions: [
      "pvb"
    ]
  },
  "application/vnd.3gpp.s1ap": {
    source: "iana"
  },
  "application/vnd.3gpp.sms": {
    source: "iana"
  },
  "application/vnd.3gpp.sms+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.srvcc-ext+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.srvcc-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.state-and-event-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp.ussd+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp2.bcmcsinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.3gpp2.sms": {
    source: "iana"
  },
  "application/vnd.3gpp2.tcap": {
    source: "iana",
    extensions: [
      "tcap"
    ]
  },
  "application/vnd.3lightssoftware.imagescal": {
    source: "iana"
  },
  "application/vnd.3m.post-it-notes": {
    source: "iana",
    extensions: [
      "pwn"
    ]
  },
  "application/vnd.accpac.simply.aso": {
    source: "iana",
    extensions: [
      "aso"
    ]
  },
  "application/vnd.accpac.simply.imp": {
    source: "iana",
    extensions: [
      "imp"
    ]
  },
  "application/vnd.acucobol": {
    source: "iana",
    extensions: [
      "acu"
    ]
  },
  "application/vnd.acucorp": {
    source: "iana",
    extensions: [
      "atc",
      "acutc"
    ]
  },
  "application/vnd.adobe.air-application-installer-package+zip": {
    source: "apache",
    compressible: !1,
    extensions: [
      "air"
    ]
  },
  "application/vnd.adobe.flash.movie": {
    source: "iana"
  },
  "application/vnd.adobe.formscentral.fcdt": {
    source: "iana",
    extensions: [
      "fcdt"
    ]
  },
  "application/vnd.adobe.fxp": {
    source: "iana",
    extensions: [
      "fxp",
      "fxpl"
    ]
  },
  "application/vnd.adobe.partial-upload": {
    source: "iana"
  },
  "application/vnd.adobe.xdp+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xdp"
    ]
  },
  "application/vnd.adobe.xfdf": {
    source: "iana",
    extensions: [
      "xfdf"
    ]
  },
  "application/vnd.aether.imp": {
    source: "iana"
  },
  "application/vnd.afpc.afplinedata": {
    source: "iana"
  },
  "application/vnd.afpc.afplinedata-pagedef": {
    source: "iana"
  },
  "application/vnd.afpc.cmoca-cmresource": {
    source: "iana"
  },
  "application/vnd.afpc.foca-charset": {
    source: "iana"
  },
  "application/vnd.afpc.foca-codedfont": {
    source: "iana"
  },
  "application/vnd.afpc.foca-codepage": {
    source: "iana"
  },
  "application/vnd.afpc.modca": {
    source: "iana"
  },
  "application/vnd.afpc.modca-cmtable": {
    source: "iana"
  },
  "application/vnd.afpc.modca-formdef": {
    source: "iana"
  },
  "application/vnd.afpc.modca-mediummap": {
    source: "iana"
  },
  "application/vnd.afpc.modca-objectcontainer": {
    source: "iana"
  },
  "application/vnd.afpc.modca-overlay": {
    source: "iana"
  },
  "application/vnd.afpc.modca-pagesegment": {
    source: "iana"
  },
  "application/vnd.age": {
    source: "iana",
    extensions: [
      "age"
    ]
  },
  "application/vnd.ah-barcode": {
    source: "iana"
  },
  "application/vnd.ahead.space": {
    source: "iana",
    extensions: [
      "ahead"
    ]
  },
  "application/vnd.airzip.filesecure.azf": {
    source: "iana",
    extensions: [
      "azf"
    ]
  },
  "application/vnd.airzip.filesecure.azs": {
    source: "iana",
    extensions: [
      "azs"
    ]
  },
  "application/vnd.amadeus+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.amazon.ebook": {
    source: "apache",
    extensions: [
      "azw"
    ]
  },
  "application/vnd.amazon.mobi8-ebook": {
    source: "iana"
  },
  "application/vnd.americandynamics.acc": {
    source: "iana",
    extensions: [
      "acc"
    ]
  },
  "application/vnd.amiga.ami": {
    source: "iana",
    extensions: [
      "ami"
    ]
  },
  "application/vnd.amundsen.maze+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.android.ota": {
    source: "iana"
  },
  "application/vnd.android.package-archive": {
    source: "apache",
    compressible: !1,
    extensions: [
      "apk"
    ]
  },
  "application/vnd.anki": {
    source: "iana"
  },
  "application/vnd.anser-web-certificate-issue-initiation": {
    source: "iana",
    extensions: [
      "cii"
    ]
  },
  "application/vnd.anser-web-funds-transfer-initiation": {
    source: "apache",
    extensions: [
      "fti"
    ]
  },
  "application/vnd.antix.game-component": {
    source: "iana",
    extensions: [
      "atx"
    ]
  },
  "application/vnd.apache.arrow.file": {
    source: "iana"
  },
  "application/vnd.apache.arrow.stream": {
    source: "iana"
  },
  "application/vnd.apache.thrift.binary": {
    source: "iana"
  },
  "application/vnd.apache.thrift.compact": {
    source: "iana"
  },
  "application/vnd.apache.thrift.json": {
    source: "iana"
  },
  "application/vnd.api+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.aplextor.warrp+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.apothekende.reservation+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.apple.installer+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mpkg"
    ]
  },
  "application/vnd.apple.keynote": {
    source: "iana",
    extensions: [
      "key"
    ]
  },
  "application/vnd.apple.mpegurl": {
    source: "iana",
    extensions: [
      "m3u8"
    ]
  },
  "application/vnd.apple.numbers": {
    source: "iana",
    extensions: [
      "numbers"
    ]
  },
  "application/vnd.apple.pages": {
    source: "iana",
    extensions: [
      "pages"
    ]
  },
  "application/vnd.apple.pkpass": {
    compressible: !1,
    extensions: [
      "pkpass"
    ]
  },
  "application/vnd.arastra.swi": {
    source: "iana"
  },
  "application/vnd.aristanetworks.swi": {
    source: "iana",
    extensions: [
      "swi"
    ]
  },
  "application/vnd.artisan+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.artsquare": {
    source: "iana"
  },
  "application/vnd.astraea-software.iota": {
    source: "iana",
    extensions: [
      "iota"
    ]
  },
  "application/vnd.audiograph": {
    source: "iana",
    extensions: [
      "aep"
    ]
  },
  "application/vnd.autopackage": {
    source: "iana"
  },
  "application/vnd.avalon+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.avistar+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.balsamiq.bmml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "bmml"
    ]
  },
  "application/vnd.balsamiq.bmpr": {
    source: "iana"
  },
  "application/vnd.banana-accounting": {
    source: "iana"
  },
  "application/vnd.bbf.usp.error": {
    source: "iana"
  },
  "application/vnd.bbf.usp.msg": {
    source: "iana"
  },
  "application/vnd.bbf.usp.msg+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.bekitzur-stech+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.bint.med-content": {
    source: "iana"
  },
  "application/vnd.biopax.rdf+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.blink-idb-value-wrapper": {
    source: "iana"
  },
  "application/vnd.blueice.multipass": {
    source: "iana",
    extensions: [
      "mpm"
    ]
  },
  "application/vnd.bluetooth.ep.oob": {
    source: "iana"
  },
  "application/vnd.bluetooth.le.oob": {
    source: "iana"
  },
  "application/vnd.bmi": {
    source: "iana",
    extensions: [
      "bmi"
    ]
  },
  "application/vnd.bpf": {
    source: "iana"
  },
  "application/vnd.bpf3": {
    source: "iana"
  },
  "application/vnd.businessobjects": {
    source: "iana",
    extensions: [
      "rep"
    ]
  },
  "application/vnd.byu.uapi+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cab-jscript": {
    source: "iana"
  },
  "application/vnd.canon-cpdl": {
    source: "iana"
  },
  "application/vnd.canon-lips": {
    source: "iana"
  },
  "application/vnd.capasystems-pg+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cendio.thinlinc.clientconf": {
    source: "iana"
  },
  "application/vnd.century-systems.tcp_stream": {
    source: "iana"
  },
  "application/vnd.chemdraw+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "cdxml"
    ]
  },
  "application/vnd.chess-pgn": {
    source: "iana"
  },
  "application/vnd.chipnuts.karaoke-mmd": {
    source: "iana",
    extensions: [
      "mmd"
    ]
  },
  "application/vnd.ciedi": {
    source: "iana"
  },
  "application/vnd.cinderella": {
    source: "iana",
    extensions: [
      "cdy"
    ]
  },
  "application/vnd.cirpack.isdn-ext": {
    source: "iana"
  },
  "application/vnd.citationstyles.style+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "csl"
    ]
  },
  "application/vnd.claymore": {
    source: "iana",
    extensions: [
      "cla"
    ]
  },
  "application/vnd.cloanto.rp9": {
    source: "iana",
    extensions: [
      "rp9"
    ]
  },
  "application/vnd.clonk.c4group": {
    source: "iana",
    extensions: [
      "c4g",
      "c4d",
      "c4f",
      "c4p",
      "c4u"
    ]
  },
  "application/vnd.cluetrust.cartomobile-config": {
    source: "iana",
    extensions: [
      "c11amc"
    ]
  },
  "application/vnd.cluetrust.cartomobile-config-pkg": {
    source: "iana",
    extensions: [
      "c11amz"
    ]
  },
  "application/vnd.coffeescript": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.document": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.document-template": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.presentation": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.presentation-template": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.spreadsheet": {
    source: "iana"
  },
  "application/vnd.collabio.xodocuments.spreadsheet-template": {
    source: "iana"
  },
  "application/vnd.collection+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.collection.doc+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.collection.next+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.comicbook+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.comicbook-rar": {
    source: "iana"
  },
  "application/vnd.commerce-battelle": {
    source: "iana"
  },
  "application/vnd.commonspace": {
    source: "iana",
    extensions: [
      "csp"
    ]
  },
  "application/vnd.contact.cmsg": {
    source: "iana",
    extensions: [
      "cdbcmsg"
    ]
  },
  "application/vnd.coreos.ignition+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cosmocaller": {
    source: "iana",
    extensions: [
      "cmc"
    ]
  },
  "application/vnd.crick.clicker": {
    source: "iana",
    extensions: [
      "clkx"
    ]
  },
  "application/vnd.crick.clicker.keyboard": {
    source: "iana",
    extensions: [
      "clkk"
    ]
  },
  "application/vnd.crick.clicker.palette": {
    source: "iana",
    extensions: [
      "clkp"
    ]
  },
  "application/vnd.crick.clicker.template": {
    source: "iana",
    extensions: [
      "clkt"
    ]
  },
  "application/vnd.crick.clicker.wordbank": {
    source: "iana",
    extensions: [
      "clkw"
    ]
  },
  "application/vnd.criticaltools.wbs+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wbs"
    ]
  },
  "application/vnd.cryptii.pipe+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.crypto-shade-file": {
    source: "iana"
  },
  "application/vnd.cryptomator.encrypted": {
    source: "iana"
  },
  "application/vnd.cryptomator.vault": {
    source: "iana"
  },
  "application/vnd.ctc-posml": {
    source: "iana",
    extensions: [
      "pml"
    ]
  },
  "application/vnd.ctct.ws+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cups-pdf": {
    source: "iana"
  },
  "application/vnd.cups-postscript": {
    source: "iana"
  },
  "application/vnd.cups-ppd": {
    source: "iana",
    extensions: [
      "ppd"
    ]
  },
  "application/vnd.cups-raster": {
    source: "iana"
  },
  "application/vnd.cups-raw": {
    source: "iana"
  },
  "application/vnd.curl": {
    source: "iana"
  },
  "application/vnd.curl.car": {
    source: "apache",
    extensions: [
      "car"
    ]
  },
  "application/vnd.curl.pcurl": {
    source: "apache",
    extensions: [
      "pcurl"
    ]
  },
  "application/vnd.cyan.dean.root+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cybank": {
    source: "iana"
  },
  "application/vnd.cyclonedx+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.cyclonedx+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.d2l.coursepackage1p0+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.d3m-dataset": {
    source: "iana"
  },
  "application/vnd.d3m-problem": {
    source: "iana"
  },
  "application/vnd.dart": {
    source: "iana",
    compressible: !0,
    extensions: [
      "dart"
    ]
  },
  "application/vnd.data-vision.rdz": {
    source: "iana",
    extensions: [
      "rdz"
    ]
  },
  "application/vnd.datapackage+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dataresource+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dbf": {
    source: "iana",
    extensions: [
      "dbf"
    ]
  },
  "application/vnd.debian.binary-package": {
    source: "iana"
  },
  "application/vnd.dece.data": {
    source: "iana",
    extensions: [
      "uvf",
      "uvvf",
      "uvd",
      "uvvd"
    ]
  },
  "application/vnd.dece.ttml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "uvt",
      "uvvt"
    ]
  },
  "application/vnd.dece.unspecified": {
    source: "iana",
    extensions: [
      "uvx",
      "uvvx"
    ]
  },
  "application/vnd.dece.zip": {
    source: "iana",
    extensions: [
      "uvz",
      "uvvz"
    ]
  },
  "application/vnd.denovo.fcselayout-link": {
    source: "iana",
    extensions: [
      "fe_launch"
    ]
  },
  "application/vnd.desmume.movie": {
    source: "iana"
  },
  "application/vnd.dir-bi.plate-dl-nosuffix": {
    source: "iana"
  },
  "application/vnd.dm.delegation+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dna": {
    source: "iana",
    extensions: [
      "dna"
    ]
  },
  "application/vnd.document+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dolby.mlp": {
    source: "apache",
    extensions: [
      "mlp"
    ]
  },
  "application/vnd.dolby.mobile.1": {
    source: "iana"
  },
  "application/vnd.dolby.mobile.2": {
    source: "iana"
  },
  "application/vnd.doremir.scorecloud-binary-document": {
    source: "iana"
  },
  "application/vnd.dpgraph": {
    source: "iana",
    extensions: [
      "dpg"
    ]
  },
  "application/vnd.dreamfactory": {
    source: "iana",
    extensions: [
      "dfac"
    ]
  },
  "application/vnd.drive+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ds-keypoint": {
    source: "apache",
    extensions: [
      "kpxx"
    ]
  },
  "application/vnd.dtg.local": {
    source: "iana"
  },
  "application/vnd.dtg.local.flash": {
    source: "iana"
  },
  "application/vnd.dtg.local.html": {
    source: "iana"
  },
  "application/vnd.dvb.ait": {
    source: "iana",
    extensions: [
      "ait"
    ]
  },
  "application/vnd.dvb.dvbisl+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.dvbj": {
    source: "iana"
  },
  "application/vnd.dvb.esgcontainer": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcdftnotifaccess": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcesgaccess": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcesgaccess2": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcesgpdd": {
    source: "iana"
  },
  "application/vnd.dvb.ipdcroaming": {
    source: "iana"
  },
  "application/vnd.dvb.iptv.alfec-base": {
    source: "iana"
  },
  "application/vnd.dvb.iptv.alfec-enhancement": {
    source: "iana"
  },
  "application/vnd.dvb.notif-aggregate-root+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-container+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-generic+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-ia-msglist+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-ia-registration-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-ia-registration-response+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.notif-init+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.dvb.pfr": {
    source: "iana"
  },
  "application/vnd.dvb.service": {
    source: "iana",
    extensions: [
      "svc"
    ]
  },
  "application/vnd.dxr": {
    source: "iana"
  },
  "application/vnd.dynageo": {
    source: "iana",
    extensions: [
      "geo"
    ]
  },
  "application/vnd.dzr": {
    source: "iana"
  },
  "application/vnd.easykaraoke.cdgdownload": {
    source: "iana"
  },
  "application/vnd.ecdis-update": {
    source: "iana"
  },
  "application/vnd.ecip.rlp": {
    source: "iana"
  },
  "application/vnd.eclipse.ditto+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ecowin.chart": {
    source: "iana",
    extensions: [
      "mag"
    ]
  },
  "application/vnd.ecowin.filerequest": {
    source: "iana"
  },
  "application/vnd.ecowin.fileupdate": {
    source: "iana"
  },
  "application/vnd.ecowin.series": {
    source: "iana"
  },
  "application/vnd.ecowin.seriesrequest": {
    source: "iana"
  },
  "application/vnd.ecowin.seriesupdate": {
    source: "iana"
  },
  "application/vnd.efi.img": {
    source: "iana"
  },
  "application/vnd.efi.iso": {
    source: "iana"
  },
  "application/vnd.emclient.accessrequest+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.enliven": {
    source: "iana",
    extensions: [
      "nml"
    ]
  },
  "application/vnd.enphase.envoy": {
    source: "iana"
  },
  "application/vnd.eprints.data+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.epson.esf": {
    source: "iana",
    extensions: [
      "esf"
    ]
  },
  "application/vnd.epson.msf": {
    source: "iana",
    extensions: [
      "msf"
    ]
  },
  "application/vnd.epson.quickanime": {
    source: "iana",
    extensions: [
      "qam"
    ]
  },
  "application/vnd.epson.salt": {
    source: "iana",
    extensions: [
      "slt"
    ]
  },
  "application/vnd.epson.ssf": {
    source: "iana",
    extensions: [
      "ssf"
    ]
  },
  "application/vnd.ericsson.quickcall": {
    source: "iana"
  },
  "application/vnd.espass-espass+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.eszigno3+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "es3",
      "et3"
    ]
  },
  "application/vnd.etsi.aoc+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.asic-e+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.etsi.asic-s+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.etsi.cug+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvcommand+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvdiscovery+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvprofile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvsad-bc+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvsad-cod+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvsad-npvr+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvservice+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvsync+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.iptvueprofile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.mcid+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.mheg5": {
    source: "iana"
  },
  "application/vnd.etsi.overload-control-policy-dataset+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.pstn+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.sci+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.simservs+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.timestamp-token": {
    source: "iana"
  },
  "application/vnd.etsi.tsl+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.etsi.tsl.der": {
    source: "iana"
  },
  "application/vnd.eu.kasparian.car+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.eudora.data": {
    source: "iana"
  },
  "application/vnd.evolv.ecig.profile": {
    source: "iana"
  },
  "application/vnd.evolv.ecig.settings": {
    source: "iana"
  },
  "application/vnd.evolv.ecig.theme": {
    source: "iana"
  },
  "application/vnd.exstream-empower+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.exstream-package": {
    source: "iana"
  },
  "application/vnd.ezpix-album": {
    source: "iana",
    extensions: [
      "ez2"
    ]
  },
  "application/vnd.ezpix-package": {
    source: "iana",
    extensions: [
      "ez3"
    ]
  },
  "application/vnd.f-secure.mobile": {
    source: "iana"
  },
  "application/vnd.familysearch.gedcom+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.fastcopy-disk-image": {
    source: "iana"
  },
  "application/vnd.fdf": {
    source: "iana",
    extensions: [
      "fdf"
    ]
  },
  "application/vnd.fdsn.mseed": {
    source: "iana",
    extensions: [
      "mseed"
    ]
  },
  "application/vnd.fdsn.seed": {
    source: "iana",
    extensions: [
      "seed",
      "dataless"
    ]
  },
  "application/vnd.ffsns": {
    source: "iana"
  },
  "application/vnd.ficlab.flb+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.filmit.zfc": {
    source: "iana"
  },
  "application/vnd.fints": {
    source: "iana"
  },
  "application/vnd.firemonkeys.cloudcell": {
    source: "iana"
  },
  "application/vnd.flographit": {
    source: "iana",
    extensions: [
      "gph"
    ]
  },
  "application/vnd.fluxtime.clip": {
    source: "iana",
    extensions: [
      "ftc"
    ]
  },
  "application/vnd.font-fontforge-sfd": {
    source: "iana"
  },
  "application/vnd.framemaker": {
    source: "iana",
    extensions: [
      "fm",
      "frame",
      "maker",
      "book"
    ]
  },
  "application/vnd.frogans.fnc": {
    source: "iana",
    extensions: [
      "fnc"
    ]
  },
  "application/vnd.frogans.ltf": {
    source: "iana",
    extensions: [
      "ltf"
    ]
  },
  "application/vnd.fsc.weblaunch": {
    source: "iana",
    extensions: [
      "fsc"
    ]
  },
  "application/vnd.fujifilm.fb.docuworks": {
    source: "iana"
  },
  "application/vnd.fujifilm.fb.docuworks.binder": {
    source: "iana"
  },
  "application/vnd.fujifilm.fb.docuworks.container": {
    source: "iana"
  },
  "application/vnd.fujifilm.fb.jfi+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.fujitsu.oasys": {
    source: "iana",
    extensions: [
      "oas"
    ]
  },
  "application/vnd.fujitsu.oasys2": {
    source: "iana",
    extensions: [
      "oa2"
    ]
  },
  "application/vnd.fujitsu.oasys3": {
    source: "iana",
    extensions: [
      "oa3"
    ]
  },
  "application/vnd.fujitsu.oasysgp": {
    source: "iana",
    extensions: [
      "fg5"
    ]
  },
  "application/vnd.fujitsu.oasysprs": {
    source: "iana",
    extensions: [
      "bh2"
    ]
  },
  "application/vnd.fujixerox.art-ex": {
    source: "iana"
  },
  "application/vnd.fujixerox.art4": {
    source: "iana"
  },
  "application/vnd.fujixerox.ddd": {
    source: "iana",
    extensions: [
      "ddd"
    ]
  },
  "application/vnd.fujixerox.docuworks": {
    source: "iana",
    extensions: [
      "xdw"
    ]
  },
  "application/vnd.fujixerox.docuworks.binder": {
    source: "iana",
    extensions: [
      "xbd"
    ]
  },
  "application/vnd.fujixerox.docuworks.container": {
    source: "iana"
  },
  "application/vnd.fujixerox.hbpl": {
    source: "iana"
  },
  "application/vnd.fut-misnet": {
    source: "iana"
  },
  "application/vnd.futoin+cbor": {
    source: "iana"
  },
  "application/vnd.futoin+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.fuzzysheet": {
    source: "iana",
    extensions: [
      "fzs"
    ]
  },
  "application/vnd.genomatix.tuxedo": {
    source: "iana",
    extensions: [
      "txd"
    ]
  },
  "application/vnd.gentics.grd+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.geo+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.geocube+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.geogebra.file": {
    source: "iana",
    extensions: [
      "ggb"
    ]
  },
  "application/vnd.geogebra.slides": {
    source: "iana"
  },
  "application/vnd.geogebra.tool": {
    source: "iana",
    extensions: [
      "ggt"
    ]
  },
  "application/vnd.geometry-explorer": {
    source: "iana",
    extensions: [
      "gex",
      "gre"
    ]
  },
  "application/vnd.geonext": {
    source: "iana",
    extensions: [
      "gxt"
    ]
  },
  "application/vnd.geoplan": {
    source: "iana",
    extensions: [
      "g2w"
    ]
  },
  "application/vnd.geospace": {
    source: "iana",
    extensions: [
      "g3w"
    ]
  },
  "application/vnd.gerber": {
    source: "iana"
  },
  "application/vnd.globalplatform.card-content-mgt": {
    source: "iana"
  },
  "application/vnd.globalplatform.card-content-mgt-response": {
    source: "iana"
  },
  "application/vnd.gmx": {
    source: "iana",
    extensions: [
      "gmx"
    ]
  },
  "application/vnd.google-apps.document": {
    compressible: !1,
    extensions: [
      "gdoc"
    ]
  },
  "application/vnd.google-apps.presentation": {
    compressible: !1,
    extensions: [
      "gslides"
    ]
  },
  "application/vnd.google-apps.spreadsheet": {
    compressible: !1,
    extensions: [
      "gsheet"
    ]
  },
  "application/vnd.google-earth.kml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "kml"
    ]
  },
  "application/vnd.google-earth.kmz": {
    source: "iana",
    compressible: !1,
    extensions: [
      "kmz"
    ]
  },
  "application/vnd.gov.sk.e-form+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.gov.sk.e-form+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.gov.sk.xmldatacontainer+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.grafeq": {
    source: "iana",
    extensions: [
      "gqf",
      "gqs"
    ]
  },
  "application/vnd.gridmp": {
    source: "iana"
  },
  "application/vnd.groove-account": {
    source: "iana",
    extensions: [
      "gac"
    ]
  },
  "application/vnd.groove-help": {
    source: "iana",
    extensions: [
      "ghf"
    ]
  },
  "application/vnd.groove-identity-message": {
    source: "iana",
    extensions: [
      "gim"
    ]
  },
  "application/vnd.groove-injector": {
    source: "iana",
    extensions: [
      "grv"
    ]
  },
  "application/vnd.groove-tool-message": {
    source: "iana",
    extensions: [
      "gtm"
    ]
  },
  "application/vnd.groove-tool-template": {
    source: "iana",
    extensions: [
      "tpl"
    ]
  },
  "application/vnd.groove-vcard": {
    source: "iana",
    extensions: [
      "vcg"
    ]
  },
  "application/vnd.hal+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hal+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "hal"
    ]
  },
  "application/vnd.handheld-entertainment+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "zmm"
    ]
  },
  "application/vnd.hbci": {
    source: "iana",
    extensions: [
      "hbci"
    ]
  },
  "application/vnd.hc+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hcl-bireports": {
    source: "iana"
  },
  "application/vnd.hdt": {
    source: "iana"
  },
  "application/vnd.heroku+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hhe.lesson-player": {
    source: "iana",
    extensions: [
      "les"
    ]
  },
  "application/vnd.hl7cda+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.hl7v2+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.hp-hpgl": {
    source: "iana",
    extensions: [
      "hpgl"
    ]
  },
  "application/vnd.hp-hpid": {
    source: "iana",
    extensions: [
      "hpid"
    ]
  },
  "application/vnd.hp-hps": {
    source: "iana",
    extensions: [
      "hps"
    ]
  },
  "application/vnd.hp-jlyt": {
    source: "iana",
    extensions: [
      "jlt"
    ]
  },
  "application/vnd.hp-pcl": {
    source: "iana",
    extensions: [
      "pcl"
    ]
  },
  "application/vnd.hp-pclxl": {
    source: "iana",
    extensions: [
      "pclxl"
    ]
  },
  "application/vnd.httphone": {
    source: "iana"
  },
  "application/vnd.hydrostatix.sof-data": {
    source: "iana",
    extensions: [
      "sfd-hdstx"
    ]
  },
  "application/vnd.hyper+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hyper-item+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hyperdrive+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.hzn-3d-crossword": {
    source: "iana"
  },
  "application/vnd.ibm.afplinedata": {
    source: "iana"
  },
  "application/vnd.ibm.electronic-media": {
    source: "iana"
  },
  "application/vnd.ibm.minipay": {
    source: "iana",
    extensions: [
      "mpy"
    ]
  },
  "application/vnd.ibm.modcap": {
    source: "iana",
    extensions: [
      "afp",
      "listafp",
      "list3820"
    ]
  },
  "application/vnd.ibm.rights-management": {
    source: "iana",
    extensions: [
      "irm"
    ]
  },
  "application/vnd.ibm.secure-container": {
    source: "iana",
    extensions: [
      "sc"
    ]
  },
  "application/vnd.iccprofile": {
    source: "iana",
    extensions: [
      "icc",
      "icm"
    ]
  },
  "application/vnd.ieee.1905": {
    source: "iana"
  },
  "application/vnd.igloader": {
    source: "iana",
    extensions: [
      "igl"
    ]
  },
  "application/vnd.imagemeter.folder+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.imagemeter.image+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.immervision-ivp": {
    source: "iana",
    extensions: [
      "ivp"
    ]
  },
  "application/vnd.immervision-ivu": {
    source: "iana",
    extensions: [
      "ivu"
    ]
  },
  "application/vnd.ims.imsccv1p1": {
    source: "iana"
  },
  "application/vnd.ims.imsccv1p2": {
    source: "iana"
  },
  "application/vnd.ims.imsccv1p3": {
    source: "iana"
  },
  "application/vnd.ims.lis.v2.result+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ims.lti.v2.toolconsumerprofile+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ims.lti.v2.toolproxy+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ims.lti.v2.toolproxy.id+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ims.lti.v2.toolsettings+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ims.lti.v2.toolsettings.simple+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.informedcontrol.rms+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.informix-visionary": {
    source: "iana"
  },
  "application/vnd.infotech.project": {
    source: "iana"
  },
  "application/vnd.infotech.project+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.innopath.wamp.notification": {
    source: "iana"
  },
  "application/vnd.insors.igm": {
    source: "iana",
    extensions: [
      "igm"
    ]
  },
  "application/vnd.intercon.formnet": {
    source: "iana",
    extensions: [
      "xpw",
      "xpx"
    ]
  },
  "application/vnd.intergeo": {
    source: "iana",
    extensions: [
      "i2g"
    ]
  },
  "application/vnd.intertrust.digibox": {
    source: "iana"
  },
  "application/vnd.intertrust.nncp": {
    source: "iana"
  },
  "application/vnd.intu.qbo": {
    source: "iana",
    extensions: [
      "qbo"
    ]
  },
  "application/vnd.intu.qfx": {
    source: "iana",
    extensions: [
      "qfx"
    ]
  },
  "application/vnd.iptc.g2.catalogitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.conceptitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.knowledgeitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.newsitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.newsmessage+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.packageitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.iptc.g2.planningitem+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ipunplugged.rcprofile": {
    source: "iana",
    extensions: [
      "rcprofile"
    ]
  },
  "application/vnd.irepository.package+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "irp"
    ]
  },
  "application/vnd.is-xpr": {
    source: "iana",
    extensions: [
      "xpr"
    ]
  },
  "application/vnd.isac.fcs": {
    source: "iana",
    extensions: [
      "fcs"
    ]
  },
  "application/vnd.iso11783-10+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.jam": {
    source: "iana",
    extensions: [
      "jam"
    ]
  },
  "application/vnd.japannet-directory-service": {
    source: "iana"
  },
  "application/vnd.japannet-jpnstore-wakeup": {
    source: "iana"
  },
  "application/vnd.japannet-payment-wakeup": {
    source: "iana"
  },
  "application/vnd.japannet-registration": {
    source: "iana"
  },
  "application/vnd.japannet-registration-wakeup": {
    source: "iana"
  },
  "application/vnd.japannet-setstore-wakeup": {
    source: "iana"
  },
  "application/vnd.japannet-verification": {
    source: "iana"
  },
  "application/vnd.japannet-verification-wakeup": {
    source: "iana"
  },
  "application/vnd.jcp.javame.midlet-rms": {
    source: "iana",
    extensions: [
      "rms"
    ]
  },
  "application/vnd.jisp": {
    source: "iana",
    extensions: [
      "jisp"
    ]
  },
  "application/vnd.joost.joda-archive": {
    source: "iana",
    extensions: [
      "joda"
    ]
  },
  "application/vnd.jsk.isdn-ngn": {
    source: "iana"
  },
  "application/vnd.kahootz": {
    source: "iana",
    extensions: [
      "ktz",
      "ktr"
    ]
  },
  "application/vnd.kde.karbon": {
    source: "iana",
    extensions: [
      "karbon"
    ]
  },
  "application/vnd.kde.kchart": {
    source: "iana",
    extensions: [
      "chrt"
    ]
  },
  "application/vnd.kde.kformula": {
    source: "iana",
    extensions: [
      "kfo"
    ]
  },
  "application/vnd.kde.kivio": {
    source: "iana",
    extensions: [
      "flw"
    ]
  },
  "application/vnd.kde.kontour": {
    source: "iana",
    extensions: [
      "kon"
    ]
  },
  "application/vnd.kde.kpresenter": {
    source: "iana",
    extensions: [
      "kpr",
      "kpt"
    ]
  },
  "application/vnd.kde.kspread": {
    source: "iana",
    extensions: [
      "ksp"
    ]
  },
  "application/vnd.kde.kword": {
    source: "iana",
    extensions: [
      "kwd",
      "kwt"
    ]
  },
  "application/vnd.kenameaapp": {
    source: "iana",
    extensions: [
      "htke"
    ]
  },
  "application/vnd.kidspiration": {
    source: "iana",
    extensions: [
      "kia"
    ]
  },
  "application/vnd.kinar": {
    source: "iana",
    extensions: [
      "kne",
      "knp"
    ]
  },
  "application/vnd.koan": {
    source: "iana",
    extensions: [
      "skp",
      "skd",
      "skt",
      "skm"
    ]
  },
  "application/vnd.kodak-descriptor": {
    source: "iana",
    extensions: [
      "sse"
    ]
  },
  "application/vnd.las": {
    source: "iana"
  },
  "application/vnd.las.las+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.las.las+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "lasxml"
    ]
  },
  "application/vnd.laszip": {
    source: "iana"
  },
  "application/vnd.leap+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.liberty-request+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.llamagraphics.life-balance.desktop": {
    source: "iana",
    extensions: [
      "lbd"
    ]
  },
  "application/vnd.llamagraphics.life-balance.exchange+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "lbe"
    ]
  },
  "application/vnd.logipipe.circuit+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.loom": {
    source: "iana"
  },
  "application/vnd.lotus-1-2-3": {
    source: "iana",
    extensions: [
      "123"
    ]
  },
  "application/vnd.lotus-approach": {
    source: "iana",
    extensions: [
      "apr"
    ]
  },
  "application/vnd.lotus-freelance": {
    source: "iana",
    extensions: [
      "pre"
    ]
  },
  "application/vnd.lotus-notes": {
    source: "iana",
    extensions: [
      "nsf"
    ]
  },
  "application/vnd.lotus-organizer": {
    source: "iana",
    extensions: [
      "org"
    ]
  },
  "application/vnd.lotus-screencam": {
    source: "iana",
    extensions: [
      "scm"
    ]
  },
  "application/vnd.lotus-wordpro": {
    source: "iana",
    extensions: [
      "lwp"
    ]
  },
  "application/vnd.macports.portpkg": {
    source: "iana",
    extensions: [
      "portpkg"
    ]
  },
  "application/vnd.mapbox-vector-tile": {
    source: "iana",
    extensions: [
      "mvt"
    ]
  },
  "application/vnd.marlin.drm.actiontoken+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.marlin.drm.conftoken+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.marlin.drm.license+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.marlin.drm.mdcf": {
    source: "iana"
  },
  "application/vnd.mason+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.maxar.archive.3tz+zip": {
    source: "iana",
    compressible: !1
  },
  "application/vnd.maxmind.maxmind-db": {
    source: "iana"
  },
  "application/vnd.mcd": {
    source: "iana",
    extensions: [
      "mcd"
    ]
  },
  "application/vnd.medcalcdata": {
    source: "iana",
    extensions: [
      "mc1"
    ]
  },
  "application/vnd.mediastation.cdkey": {
    source: "iana",
    extensions: [
      "cdkey"
    ]
  },
  "application/vnd.meridian-slingshot": {
    source: "iana"
  },
  "application/vnd.mfer": {
    source: "iana",
    extensions: [
      "mwf"
    ]
  },
  "application/vnd.mfmp": {
    source: "iana",
    extensions: [
      "mfm"
    ]
  },
  "application/vnd.micro+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.micrografx.flo": {
    source: "iana",
    extensions: [
      "flo"
    ]
  },
  "application/vnd.micrografx.igx": {
    source: "iana",
    extensions: [
      "igx"
    ]
  },
  "application/vnd.microsoft.portable-executable": {
    source: "iana"
  },
  "application/vnd.microsoft.windows.thumbnail-cache": {
    source: "iana"
  },
  "application/vnd.miele+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.mif": {
    source: "iana",
    extensions: [
      "mif"
    ]
  },
  "application/vnd.minisoft-hp3000-save": {
    source: "iana"
  },
  "application/vnd.mitsubishi.misty-guard.trustweb": {
    source: "iana"
  },
  "application/vnd.mobius.daf": {
    source: "iana",
    extensions: [
      "daf"
    ]
  },
  "application/vnd.mobius.dis": {
    source: "iana",
    extensions: [
      "dis"
    ]
  },
  "application/vnd.mobius.mbk": {
    source: "iana",
    extensions: [
      "mbk"
    ]
  },
  "application/vnd.mobius.mqy": {
    source: "iana",
    extensions: [
      "mqy"
    ]
  },
  "application/vnd.mobius.msl": {
    source: "iana",
    extensions: [
      "msl"
    ]
  },
  "application/vnd.mobius.plc": {
    source: "iana",
    extensions: [
      "plc"
    ]
  },
  "application/vnd.mobius.txf": {
    source: "iana",
    extensions: [
      "txf"
    ]
  },
  "application/vnd.mophun.application": {
    source: "iana",
    extensions: [
      "mpn"
    ]
  },
  "application/vnd.mophun.certificate": {
    source: "iana",
    extensions: [
      "mpc"
    ]
  },
  "application/vnd.motorola.flexsuite": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.adsi": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.fis": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.gotap": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.kmr": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.ttc": {
    source: "iana"
  },
  "application/vnd.motorola.flexsuite.wem": {
    source: "iana"
  },
  "application/vnd.motorola.iprm": {
    source: "iana"
  },
  "application/vnd.mozilla.xul+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xul"
    ]
  },
  "application/vnd.ms-3mfdocument": {
    source: "iana"
  },
  "application/vnd.ms-artgalry": {
    source: "iana",
    extensions: [
      "cil"
    ]
  },
  "application/vnd.ms-asf": {
    source: "iana"
  },
  "application/vnd.ms-cab-compressed": {
    source: "iana",
    extensions: [
      "cab"
    ]
  },
  "application/vnd.ms-color.iccprofile": {
    source: "apache"
  },
  "application/vnd.ms-excel": {
    source: "iana",
    compressible: !1,
    extensions: [
      "xls",
      "xlm",
      "xla",
      "xlc",
      "xlt",
      "xlw"
    ]
  },
  "application/vnd.ms-excel.addin.macroenabled.12": {
    source: "iana",
    extensions: [
      "xlam"
    ]
  },
  "application/vnd.ms-excel.sheet.binary.macroenabled.12": {
    source: "iana",
    extensions: [
      "xlsb"
    ]
  },
  "application/vnd.ms-excel.sheet.macroenabled.12": {
    source: "iana",
    extensions: [
      "xlsm"
    ]
  },
  "application/vnd.ms-excel.template.macroenabled.12": {
    source: "iana",
    extensions: [
      "xltm"
    ]
  },
  "application/vnd.ms-fontobject": {
    source: "iana",
    compressible: !0,
    extensions: [
      "eot"
    ]
  },
  "application/vnd.ms-htmlhelp": {
    source: "iana",
    extensions: [
      "chm"
    ]
  },
  "application/vnd.ms-ims": {
    source: "iana",
    extensions: [
      "ims"
    ]
  },
  "application/vnd.ms-lrm": {
    source: "iana",
    extensions: [
      "lrm"
    ]
  },
  "application/vnd.ms-office.activex+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ms-officetheme": {
    source: "iana",
    extensions: [
      "thmx"
    ]
  },
  "application/vnd.ms-opentype": {
    source: "apache",
    compressible: !0
  },
  "application/vnd.ms-outlook": {
    compressible: !1,
    extensions: [
      "msg"
    ]
  },
  "application/vnd.ms-package.obfuscated-opentype": {
    source: "apache"
  },
  "application/vnd.ms-pki.seccat": {
    source: "apache",
    extensions: [
      "cat"
    ]
  },
  "application/vnd.ms-pki.stl": {
    source: "apache",
    extensions: [
      "stl"
    ]
  },
  "application/vnd.ms-playready.initiator+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ms-powerpoint": {
    source: "iana",
    compressible: !1,
    extensions: [
      "ppt",
      "pps",
      "pot"
    ]
  },
  "application/vnd.ms-powerpoint.addin.macroenabled.12": {
    source: "iana",
    extensions: [
      "ppam"
    ]
  },
  "application/vnd.ms-powerpoint.presentation.macroenabled.12": {
    source: "iana",
    extensions: [
      "pptm"
    ]
  },
  "application/vnd.ms-powerpoint.slide.macroenabled.12": {
    source: "iana",
    extensions: [
      "sldm"
    ]
  },
  "application/vnd.ms-powerpoint.slideshow.macroenabled.12": {
    source: "iana",
    extensions: [
      "ppsm"
    ]
  },
  "application/vnd.ms-powerpoint.template.macroenabled.12": {
    source: "iana",
    extensions: [
      "potm"
    ]
  },
  "application/vnd.ms-printdevicecapabilities+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ms-printing.printticket+xml": {
    source: "apache",
    compressible: !0
  },
  "application/vnd.ms-printschematicket+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ms-project": {
    source: "iana",
    extensions: [
      "mpp",
      "mpt"
    ]
  },
  "application/vnd.ms-tnef": {
    source: "iana"
  },
  "application/vnd.ms-windows.devicepairing": {
    source: "iana"
  },
  "application/vnd.ms-windows.nwprinting.oob": {
    source: "iana"
  },
  "application/vnd.ms-windows.printerpairing": {
    source: "iana"
  },
  "application/vnd.ms-windows.wsd.oob": {
    source: "iana"
  },
  "application/vnd.ms-wmdrm.lic-chlg-req": {
    source: "iana"
  },
  "application/vnd.ms-wmdrm.lic-resp": {
    source: "iana"
  },
  "application/vnd.ms-wmdrm.meter-chlg-req": {
    source: "iana"
  },
  "application/vnd.ms-wmdrm.meter-resp": {
    source: "iana"
  },
  "application/vnd.ms-word.document.macroenabled.12": {
    source: "iana",
    extensions: [
      "docm"
    ]
  },
  "application/vnd.ms-word.template.macroenabled.12": {
    source: "iana",
    extensions: [
      "dotm"
    ]
  },
  "application/vnd.ms-works": {
    source: "iana",
    extensions: [
      "wps",
      "wks",
      "wcm",
      "wdb"
    ]
  },
  "application/vnd.ms-wpl": {
    source: "iana",
    extensions: [
      "wpl"
    ]
  },
  "application/vnd.ms-xpsdocument": {
    source: "iana",
    compressible: !1,
    extensions: [
      "xps"
    ]
  },
  "application/vnd.msa-disk-image": {
    source: "iana"
  },
  "application/vnd.mseq": {
    source: "iana",
    extensions: [
      "mseq"
    ]
  },
  "application/vnd.msign": {
    source: "iana"
  },
  "application/vnd.multiad.creator": {
    source: "iana"
  },
  "application/vnd.multiad.creator.cif": {
    source: "iana"
  },
  "application/vnd.music-niff": {
    source: "iana"
  },
  "application/vnd.musician": {
    source: "iana",
    extensions: [
      "mus"
    ]
  },
  "application/vnd.muvee.style": {
    source: "iana",
    extensions: [
      "msty"
    ]
  },
  "application/vnd.mynfc": {
    source: "iana",
    extensions: [
      "taglet"
    ]
  },
  "application/vnd.nacamar.ybrid+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.ncd.control": {
    source: "iana"
  },
  "application/vnd.ncd.reference": {
    source: "iana"
  },
  "application/vnd.nearst.inv+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nebumind.line": {
    source: "iana"
  },
  "application/vnd.nervana": {
    source: "iana"
  },
  "application/vnd.netfpx": {
    source: "iana"
  },
  "application/vnd.neurolanguage.nlu": {
    source: "iana",
    extensions: [
      "nlu"
    ]
  },
  "application/vnd.nimn": {
    source: "iana"
  },
  "application/vnd.nintendo.nitro.rom": {
    source: "iana"
  },
  "application/vnd.nintendo.snes.rom": {
    source: "iana"
  },
  "application/vnd.nitf": {
    source: "iana",
    extensions: [
      "ntf",
      "nitf"
    ]
  },
  "application/vnd.noblenet-directory": {
    source: "iana",
    extensions: [
      "nnd"
    ]
  },
  "application/vnd.noblenet-sealer": {
    source: "iana",
    extensions: [
      "nns"
    ]
  },
  "application/vnd.noblenet-web": {
    source: "iana",
    extensions: [
      "nnw"
    ]
  },
  "application/vnd.nokia.catalogs": {
    source: "iana"
  },
  "application/vnd.nokia.conml+wbxml": {
    source: "iana"
  },
  "application/vnd.nokia.conml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nokia.iptv.config+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nokia.isds-radio-presets": {
    source: "iana"
  },
  "application/vnd.nokia.landmark+wbxml": {
    source: "iana"
  },
  "application/vnd.nokia.landmark+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nokia.landmarkcollection+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nokia.n-gage.ac+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ac"
    ]
  },
  "application/vnd.nokia.n-gage.data": {
    source: "iana",
    extensions: [
      "ngdat"
    ]
  },
  "application/vnd.nokia.n-gage.symbian.install": {
    source: "iana",
    extensions: [
      "n-gage"
    ]
  },
  "application/vnd.nokia.ncd": {
    source: "iana"
  },
  "application/vnd.nokia.pcd+wbxml": {
    source: "iana"
  },
  "application/vnd.nokia.pcd+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.nokia.radio-preset": {
    source: "iana",
    extensions: [
      "rpst"
    ]
  },
  "application/vnd.nokia.radio-presets": {
    source: "iana",
    extensions: [
      "rpss"
    ]
  },
  "application/vnd.novadigm.edm": {
    source: "iana",
    extensions: [
      "edm"
    ]
  },
  "application/vnd.novadigm.edx": {
    source: "iana",
    extensions: [
      "edx"
    ]
  },
  "application/vnd.novadigm.ext": {
    source: "iana",
    extensions: [
      "ext"
    ]
  },
  "application/vnd.ntt-local.content-share": {
    source: "iana"
  },
  "application/vnd.ntt-local.file-transfer": {
    source: "iana"
  },
  "application/vnd.ntt-local.ogw_remote-access": {
    source: "iana"
  },
  "application/vnd.ntt-local.sip-ta_remote": {
    source: "iana"
  },
  "application/vnd.ntt-local.sip-ta_tcp_stream": {
    source: "iana"
  },
  "application/vnd.oasis.opendocument.chart": {
    source: "iana",
    extensions: [
      "odc"
    ]
  },
  "application/vnd.oasis.opendocument.chart-template": {
    source: "iana",
    extensions: [
      "otc"
    ]
  },
  "application/vnd.oasis.opendocument.database": {
    source: "iana",
    extensions: [
      "odb"
    ]
  },
  "application/vnd.oasis.opendocument.formula": {
    source: "iana",
    extensions: [
      "odf"
    ]
  },
  "application/vnd.oasis.opendocument.formula-template": {
    source: "iana",
    extensions: [
      "odft"
    ]
  },
  "application/vnd.oasis.opendocument.graphics": {
    source: "iana",
    compressible: !1,
    extensions: [
      "odg"
    ]
  },
  "application/vnd.oasis.opendocument.graphics-template": {
    source: "iana",
    extensions: [
      "otg"
    ]
  },
  "application/vnd.oasis.opendocument.image": {
    source: "iana",
    extensions: [
      "odi"
    ]
  },
  "application/vnd.oasis.opendocument.image-template": {
    source: "iana",
    extensions: [
      "oti"
    ]
  },
  "application/vnd.oasis.opendocument.presentation": {
    source: "iana",
    compressible: !1,
    extensions: [
      "odp"
    ]
  },
  "application/vnd.oasis.opendocument.presentation-template": {
    source: "iana",
    extensions: [
      "otp"
    ]
  },
  "application/vnd.oasis.opendocument.spreadsheet": {
    source: "iana",
    compressible: !1,
    extensions: [
      "ods"
    ]
  },
  "application/vnd.oasis.opendocument.spreadsheet-template": {
    source: "iana",
    extensions: [
      "ots"
    ]
  },
  "application/vnd.oasis.opendocument.text": {
    source: "iana",
    compressible: !1,
    extensions: [
      "odt"
    ]
  },
  "application/vnd.oasis.opendocument.text-master": {
    source: "iana",
    extensions: [
      "odm"
    ]
  },
  "application/vnd.oasis.opendocument.text-template": {
    source: "iana",
    extensions: [
      "ott"
    ]
  },
  "application/vnd.oasis.opendocument.text-web": {
    source: "iana",
    extensions: [
      "oth"
    ]
  },
  "application/vnd.obn": {
    source: "iana"
  },
  "application/vnd.ocf+cbor": {
    source: "iana"
  },
  "application/vnd.oci.image.manifest.v1+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oftn.l10n+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.contentaccessdownload+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.contentaccessstreaming+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.cspg-hexbinary": {
    source: "iana"
  },
  "application/vnd.oipf.dae.svg+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.dae.xhtml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.mippvcontrolmessage+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.pae.gem": {
    source: "iana"
  },
  "application/vnd.oipf.spdiscovery+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.spdlist+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.ueprofile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oipf.userprofile+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.olpc-sugar": {
    source: "iana",
    extensions: [
      "xo"
    ]
  },
  "application/vnd.oma-scws-config": {
    source: "iana"
  },
  "application/vnd.oma-scws-http-request": {
    source: "iana"
  },
  "application/vnd.oma-scws-http-response": {
    source: "iana"
  },
  "application/vnd.oma.bcast.associated-procedure-parameter+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.drm-trigger+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.imd+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.ltkm": {
    source: "iana"
  },
  "application/vnd.oma.bcast.notification+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.provisioningtrigger": {
    source: "iana"
  },
  "application/vnd.oma.bcast.sgboot": {
    source: "iana"
  },
  "application/vnd.oma.bcast.sgdd+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.sgdu": {
    source: "iana"
  },
  "application/vnd.oma.bcast.simple-symbol-container": {
    source: "iana"
  },
  "application/vnd.oma.bcast.smartcard-trigger+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.sprov+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.bcast.stkm": {
    source: "iana"
  },
  "application/vnd.oma.cab-address-book+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.cab-feature-handler+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.cab-pcc+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.cab-subs-invite+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.cab-user-prefs+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.dcd": {
    source: "iana"
  },
  "application/vnd.oma.dcdc": {
    source: "iana"
  },
  "application/vnd.oma.dd2+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "dd2"
    ]
  },
  "application/vnd.oma.drm.risd+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.group-usage-list+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.lwm2m+cbor": {
    source: "iana"
  },
  "application/vnd.oma.lwm2m+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.lwm2m+tlv": {
    source: "iana"
  },
  "application/vnd.oma.pal+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.poc.detailed-progress-report+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.poc.final-report+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.poc.groups+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.poc.invocation-descriptor+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.poc.optimized-progress-report+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.push": {
    source: "iana"
  },
  "application/vnd.oma.scidm.messages+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oma.xcap-directory+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.omads-email+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.omads-file+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.omads-folder+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.omaloc-supl-init": {
    source: "iana"
  },
  "application/vnd.onepager": {
    source: "iana"
  },
  "application/vnd.onepagertamp": {
    source: "iana"
  },
  "application/vnd.onepagertamx": {
    source: "iana"
  },
  "application/vnd.onepagertat": {
    source: "iana"
  },
  "application/vnd.onepagertatp": {
    source: "iana"
  },
  "application/vnd.onepagertatx": {
    source: "iana"
  },
  "application/vnd.openblox.game+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "obgx"
    ]
  },
  "application/vnd.openblox.game-binary": {
    source: "iana"
  },
  "application/vnd.openeye.oeb": {
    source: "iana"
  },
  "application/vnd.openofficeorg.extension": {
    source: "apache",
    extensions: [
      "oxt"
    ]
  },
  "application/vnd.openstreetmap.data+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "osm"
    ]
  },
  "application/vnd.opentimestamps.ots": {
    source: "iana"
  },
  "application/vnd.openxmlformats-officedocument.custom-properties+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.customxmlproperties+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawing+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.chart+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramcolors+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramdata+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramlayout+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramstyle+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.extended-properties+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.commentauthors+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.comments+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.handoutmaster+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.notesmaster+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.notesslide+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    source: "iana",
    compressible: !1,
    extensions: [
      "pptx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presprops+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slide": {
    source: "iana",
    extensions: [
      "sldx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slide+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slidelayout+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slidemaster+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow": {
    source: "iana",
    extensions: [
      "ppsx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slideupdateinfo+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.tablestyles+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.tags+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.template": {
    source: "iana",
    extensions: [
      "potx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.template.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.presentationml.viewprops+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.calcchain+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.connections+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.externallink+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcachedefinition+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcacherecords+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivottable+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.querytable+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionheaders+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionlog+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedstrings+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    source: "iana",
    compressible: !1,
    extensions: [
      "xlsx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheetmetadata+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.tablesinglecells+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template": {
    source: "iana",
    extensions: [
      "xltx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.usernames+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.volatiledependencies+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.theme+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.themeoverride+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.vmldrawing": {
    source: "iana"
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    source: "iana",
    compressible: !1,
    extensions: [
      "docx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document.glossary+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.fonttable+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template": {
    source: "iana",
    extensions: [
      "dotx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.websettings+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-package.core-properties+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-package.digital-signature-xmlsignature+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.openxmlformats-package.relationships+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oracle.resource+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.orange.indata": {
    source: "iana"
  },
  "application/vnd.osa.netdeploy": {
    source: "iana"
  },
  "application/vnd.osgeo.mapguide.package": {
    source: "iana",
    extensions: [
      "mgp"
    ]
  },
  "application/vnd.osgi.bundle": {
    source: "iana"
  },
  "application/vnd.osgi.dp": {
    source: "iana",
    extensions: [
      "dp"
    ]
  },
  "application/vnd.osgi.subsystem": {
    source: "iana",
    extensions: [
      "esa"
    ]
  },
  "application/vnd.otps.ct-kip+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.oxli.countgraph": {
    source: "iana"
  },
  "application/vnd.pagerduty+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.palm": {
    source: "iana",
    extensions: [
      "pdb",
      "pqa",
      "oprc"
    ]
  },
  "application/vnd.panoply": {
    source: "iana"
  },
  "application/vnd.paos.xml": {
    source: "iana"
  },
  "application/vnd.patentdive": {
    source: "iana"
  },
  "application/vnd.patientecommsdoc": {
    source: "iana"
  },
  "application/vnd.pawaafile": {
    source: "iana",
    extensions: [
      "paw"
    ]
  },
  "application/vnd.pcos": {
    source: "iana"
  },
  "application/vnd.pg.format": {
    source: "iana",
    extensions: [
      "str"
    ]
  },
  "application/vnd.pg.osasli": {
    source: "iana",
    extensions: [
      "ei6"
    ]
  },
  "application/vnd.piaccess.application-licence": {
    source: "iana"
  },
  "application/vnd.picsel": {
    source: "iana",
    extensions: [
      "efif"
    ]
  },
  "application/vnd.pmi.widget": {
    source: "iana",
    extensions: [
      "wg"
    ]
  },
  "application/vnd.poc.group-advertisement+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.pocketlearn": {
    source: "iana",
    extensions: [
      "plf"
    ]
  },
  "application/vnd.powerbuilder6": {
    source: "iana",
    extensions: [
      "pbd"
    ]
  },
  "application/vnd.powerbuilder6-s": {
    source: "iana"
  },
  "application/vnd.powerbuilder7": {
    source: "iana"
  },
  "application/vnd.powerbuilder7-s": {
    source: "iana"
  },
  "application/vnd.powerbuilder75": {
    source: "iana"
  },
  "application/vnd.powerbuilder75-s": {
    source: "iana"
  },
  "application/vnd.preminet": {
    source: "iana"
  },
  "application/vnd.previewsystems.box": {
    source: "iana",
    extensions: [
      "box"
    ]
  },
  "application/vnd.proteus.magazine": {
    source: "iana",
    extensions: [
      "mgz"
    ]
  },
  "application/vnd.psfs": {
    source: "iana"
  },
  "application/vnd.publishare-delta-tree": {
    source: "iana",
    extensions: [
      "qps"
    ]
  },
  "application/vnd.pvi.ptid1": {
    source: "iana",
    extensions: [
      "ptid"
    ]
  },
  "application/vnd.pwg-multiplexed": {
    source: "iana"
  },
  "application/vnd.pwg-xhtml-print+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.qualcomm.brew-app-res": {
    source: "iana"
  },
  "application/vnd.quarantainenet": {
    source: "iana"
  },
  "application/vnd.quark.quarkxpress": {
    source: "iana",
    extensions: [
      "qxd",
      "qxt",
      "qwd",
      "qwt",
      "qxl",
      "qxb"
    ]
  },
  "application/vnd.quobject-quoxdocument": {
    source: "iana"
  },
  "application/vnd.radisys.moml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-audit+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-audit-conf+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-audit-conn+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-audit-dialog+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-audit-stream+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-conf+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-base+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-fax-detect+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-fax-sendrecv+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-group+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-speech+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.radisys.msml-dialog-transform+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.rainstor.data": {
    source: "iana"
  },
  "application/vnd.rapid": {
    source: "iana"
  },
  "application/vnd.rar": {
    source: "iana",
    extensions: [
      "rar"
    ]
  },
  "application/vnd.realvnc.bed": {
    source: "iana",
    extensions: [
      "bed"
    ]
  },
  "application/vnd.recordare.musicxml": {
    source: "iana",
    extensions: [
      "mxl"
    ]
  },
  "application/vnd.recordare.musicxml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "musicxml"
    ]
  },
  "application/vnd.renlearn.rlprint": {
    source: "iana"
  },
  "application/vnd.resilient.logic": {
    source: "iana"
  },
  "application/vnd.restful+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.rig.cryptonote": {
    source: "iana",
    extensions: [
      "cryptonote"
    ]
  },
  "application/vnd.rim.cod": {
    source: "apache",
    extensions: [
      "cod"
    ]
  },
  "application/vnd.rn-realmedia": {
    source: "apache",
    extensions: [
      "rm"
    ]
  },
  "application/vnd.rn-realmedia-vbr": {
    source: "apache",
    extensions: [
      "rmvb"
    ]
  },
  "application/vnd.route66.link66+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "link66"
    ]
  },
  "application/vnd.rs-274x": {
    source: "iana"
  },
  "application/vnd.ruckus.download": {
    source: "iana"
  },
  "application/vnd.s3sms": {
    source: "iana"
  },
  "application/vnd.sailingtracker.track": {
    source: "iana",
    extensions: [
      "st"
    ]
  },
  "application/vnd.sar": {
    source: "iana"
  },
  "application/vnd.sbm.cid": {
    source: "iana"
  },
  "application/vnd.sbm.mid2": {
    source: "iana"
  },
  "application/vnd.scribus": {
    source: "iana"
  },
  "application/vnd.sealed.3df": {
    source: "iana"
  },
  "application/vnd.sealed.csf": {
    source: "iana"
  },
  "application/vnd.sealed.doc": {
    source: "iana"
  },
  "application/vnd.sealed.eml": {
    source: "iana"
  },
  "application/vnd.sealed.mht": {
    source: "iana"
  },
  "application/vnd.sealed.net": {
    source: "iana"
  },
  "application/vnd.sealed.ppt": {
    source: "iana"
  },
  "application/vnd.sealed.tiff": {
    source: "iana"
  },
  "application/vnd.sealed.xls": {
    source: "iana"
  },
  "application/vnd.sealedmedia.softseal.html": {
    source: "iana"
  },
  "application/vnd.sealedmedia.softseal.pdf": {
    source: "iana"
  },
  "application/vnd.seemail": {
    source: "iana",
    extensions: [
      "see"
    ]
  },
  "application/vnd.seis+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.sema": {
    source: "iana",
    extensions: [
      "sema"
    ]
  },
  "application/vnd.semd": {
    source: "iana",
    extensions: [
      "semd"
    ]
  },
  "application/vnd.semf": {
    source: "iana",
    extensions: [
      "semf"
    ]
  },
  "application/vnd.shade-save-file": {
    source: "iana"
  },
  "application/vnd.shana.informed.formdata": {
    source: "iana",
    extensions: [
      "ifm"
    ]
  },
  "application/vnd.shana.informed.formtemplate": {
    source: "iana",
    extensions: [
      "itp"
    ]
  },
  "application/vnd.shana.informed.interchange": {
    source: "iana",
    extensions: [
      "iif"
    ]
  },
  "application/vnd.shana.informed.package": {
    source: "iana",
    extensions: [
      "ipk"
    ]
  },
  "application/vnd.shootproof+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.shopkick+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.shp": {
    source: "iana"
  },
  "application/vnd.shx": {
    source: "iana"
  },
  "application/vnd.sigrok.session": {
    source: "iana"
  },
  "application/vnd.simtech-mindmapper": {
    source: "iana",
    extensions: [
      "twd",
      "twds"
    ]
  },
  "application/vnd.siren+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.smaf": {
    source: "iana",
    extensions: [
      "mmf"
    ]
  },
  "application/vnd.smart.notebook": {
    source: "iana"
  },
  "application/vnd.smart.teacher": {
    source: "iana",
    extensions: [
      "teacher"
    ]
  },
  "application/vnd.snesdev-page-table": {
    source: "iana"
  },
  "application/vnd.software602.filler.form+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "fo"
    ]
  },
  "application/vnd.software602.filler.form-xml-zip": {
    source: "iana"
  },
  "application/vnd.solent.sdkm+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "sdkm",
      "sdkd"
    ]
  },
  "application/vnd.spotfire.dxp": {
    source: "iana",
    extensions: [
      "dxp"
    ]
  },
  "application/vnd.spotfire.sfs": {
    source: "iana",
    extensions: [
      "sfs"
    ]
  },
  "application/vnd.sqlite3": {
    source: "iana"
  },
  "application/vnd.sss-cod": {
    source: "iana"
  },
  "application/vnd.sss-dtf": {
    source: "iana"
  },
  "application/vnd.sss-ntf": {
    source: "iana"
  },
  "application/vnd.stardivision.calc": {
    source: "apache",
    extensions: [
      "sdc"
    ]
  },
  "application/vnd.stardivision.draw": {
    source: "apache",
    extensions: [
      "sda"
    ]
  },
  "application/vnd.stardivision.impress": {
    source: "apache",
    extensions: [
      "sdd"
    ]
  },
  "application/vnd.stardivision.math": {
    source: "apache",
    extensions: [
      "smf"
    ]
  },
  "application/vnd.stardivision.writer": {
    source: "apache",
    extensions: [
      "sdw",
      "vor"
    ]
  },
  "application/vnd.stardivision.writer-global": {
    source: "apache",
    extensions: [
      "sgl"
    ]
  },
  "application/vnd.stepmania.package": {
    source: "iana",
    extensions: [
      "smzip"
    ]
  },
  "application/vnd.stepmania.stepchart": {
    source: "iana",
    extensions: [
      "sm"
    ]
  },
  "application/vnd.street-stream": {
    source: "iana"
  },
  "application/vnd.sun.wadl+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wadl"
    ]
  },
  "application/vnd.sun.xml.calc": {
    source: "apache",
    extensions: [
      "sxc"
    ]
  },
  "application/vnd.sun.xml.calc.template": {
    source: "apache",
    extensions: [
      "stc"
    ]
  },
  "application/vnd.sun.xml.draw": {
    source: "apache",
    extensions: [
      "sxd"
    ]
  },
  "application/vnd.sun.xml.draw.template": {
    source: "apache",
    extensions: [
      "std"
    ]
  },
  "application/vnd.sun.xml.impress": {
    source: "apache",
    extensions: [
      "sxi"
    ]
  },
  "application/vnd.sun.xml.impress.template": {
    source: "apache",
    extensions: [
      "sti"
    ]
  },
  "application/vnd.sun.xml.math": {
    source: "apache",
    extensions: [
      "sxm"
    ]
  },
  "application/vnd.sun.xml.writer": {
    source: "apache",
    extensions: [
      "sxw"
    ]
  },
  "application/vnd.sun.xml.writer.global": {
    source: "apache",
    extensions: [
      "sxg"
    ]
  },
  "application/vnd.sun.xml.writer.template": {
    source: "apache",
    extensions: [
      "stw"
    ]
  },
  "application/vnd.sus-calendar": {
    source: "iana",
    extensions: [
      "sus",
      "susp"
    ]
  },
  "application/vnd.svd": {
    source: "iana",
    extensions: [
      "svd"
    ]
  },
  "application/vnd.swiftview-ics": {
    source: "iana"
  },
  "application/vnd.sycle+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.syft+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.symbian.install": {
    source: "apache",
    extensions: [
      "sis",
      "sisx"
    ]
  },
  "application/vnd.syncml+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "xsm"
    ]
  },
  "application/vnd.syncml.dm+wbxml": {
    source: "iana",
    charset: "UTF-8",
    extensions: [
      "bdm"
    ]
  },
  "application/vnd.syncml.dm+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "xdm"
    ]
  },
  "application/vnd.syncml.dm.notification": {
    source: "iana"
  },
  "application/vnd.syncml.dmddf+wbxml": {
    source: "iana"
  },
  "application/vnd.syncml.dmddf+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "ddf"
    ]
  },
  "application/vnd.syncml.dmtnds+wbxml": {
    source: "iana"
  },
  "application/vnd.syncml.dmtnds+xml": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0
  },
  "application/vnd.syncml.ds.notification": {
    source: "iana"
  },
  "application/vnd.tableschema+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.tao.intent-module-archive": {
    source: "iana",
    extensions: [
      "tao"
    ]
  },
  "application/vnd.tcpdump.pcap": {
    source: "iana",
    extensions: [
      "pcap",
      "cap",
      "dmp"
    ]
  },
  "application/vnd.think-cell.ppttc+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.tmd.mediaflex.api+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.tml": {
    source: "iana"
  },
  "application/vnd.tmobile-livetv": {
    source: "iana",
    extensions: [
      "tmo"
    ]
  },
  "application/vnd.tri.onesource": {
    source: "iana"
  },
  "application/vnd.trid.tpt": {
    source: "iana",
    extensions: [
      "tpt"
    ]
  },
  "application/vnd.triscape.mxs": {
    source: "iana",
    extensions: [
      "mxs"
    ]
  },
  "application/vnd.trueapp": {
    source: "iana",
    extensions: [
      "tra"
    ]
  },
  "application/vnd.truedoc": {
    source: "iana"
  },
  "application/vnd.ubisoft.webplayer": {
    source: "iana"
  },
  "application/vnd.ufdl": {
    source: "iana",
    extensions: [
      "ufd",
      "ufdl"
    ]
  },
  "application/vnd.uiq.theme": {
    source: "iana",
    extensions: [
      "utz"
    ]
  },
  "application/vnd.umajin": {
    source: "iana",
    extensions: [
      "umj"
    ]
  },
  "application/vnd.unity": {
    source: "iana",
    extensions: [
      "unityweb"
    ]
  },
  "application/vnd.uoml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "uoml"
    ]
  },
  "application/vnd.uplanet.alert": {
    source: "iana"
  },
  "application/vnd.uplanet.alert-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.bearer-choice": {
    source: "iana"
  },
  "application/vnd.uplanet.bearer-choice-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.cacheop": {
    source: "iana"
  },
  "application/vnd.uplanet.cacheop-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.channel": {
    source: "iana"
  },
  "application/vnd.uplanet.channel-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.list": {
    source: "iana"
  },
  "application/vnd.uplanet.list-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.listcmd": {
    source: "iana"
  },
  "application/vnd.uplanet.listcmd-wbxml": {
    source: "iana"
  },
  "application/vnd.uplanet.signal": {
    source: "iana"
  },
  "application/vnd.uri-map": {
    source: "iana"
  },
  "application/vnd.valve.source.material": {
    source: "iana"
  },
  "application/vnd.vcx": {
    source: "iana",
    extensions: [
      "vcx"
    ]
  },
  "application/vnd.vd-study": {
    source: "iana"
  },
  "application/vnd.vectorworks": {
    source: "iana"
  },
  "application/vnd.vel+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.verimatrix.vcas": {
    source: "iana"
  },
  "application/vnd.veritone.aion+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.veryant.thin": {
    source: "iana"
  },
  "application/vnd.ves.encrypted": {
    source: "iana"
  },
  "application/vnd.vidsoft.vidconference": {
    source: "iana"
  },
  "application/vnd.visio": {
    source: "iana",
    extensions: [
      "vsd",
      "vst",
      "vss",
      "vsw"
    ]
  },
  "application/vnd.visionary": {
    source: "iana",
    extensions: [
      "vis"
    ]
  },
  "application/vnd.vividence.scriptfile": {
    source: "iana"
  },
  "application/vnd.vsf": {
    source: "iana",
    extensions: [
      "vsf"
    ]
  },
  "application/vnd.wap.sic": {
    source: "iana"
  },
  "application/vnd.wap.slc": {
    source: "iana"
  },
  "application/vnd.wap.wbxml": {
    source: "iana",
    charset: "UTF-8",
    extensions: [
      "wbxml"
    ]
  },
  "application/vnd.wap.wmlc": {
    source: "iana",
    extensions: [
      "wmlc"
    ]
  },
  "application/vnd.wap.wmlscriptc": {
    source: "iana",
    extensions: [
      "wmlsc"
    ]
  },
  "application/vnd.webturbo": {
    source: "iana",
    extensions: [
      "wtb"
    ]
  },
  "application/vnd.wfa.dpp": {
    source: "iana"
  },
  "application/vnd.wfa.p2p": {
    source: "iana"
  },
  "application/vnd.wfa.wsc": {
    source: "iana"
  },
  "application/vnd.windows.devicepairing": {
    source: "iana"
  },
  "application/vnd.wmc": {
    source: "iana"
  },
  "application/vnd.wmf.bootstrap": {
    source: "iana"
  },
  "application/vnd.wolfram.mathematica": {
    source: "iana"
  },
  "application/vnd.wolfram.mathematica.package": {
    source: "iana"
  },
  "application/vnd.wolfram.player": {
    source: "iana",
    extensions: [
      "nbp"
    ]
  },
  "application/vnd.wordperfect": {
    source: "iana",
    extensions: [
      "wpd"
    ]
  },
  "application/vnd.wqd": {
    source: "iana",
    extensions: [
      "wqd"
    ]
  },
  "application/vnd.wrq-hp3000-labelled": {
    source: "iana"
  },
  "application/vnd.wt.stf": {
    source: "iana",
    extensions: [
      "stf"
    ]
  },
  "application/vnd.wv.csp+wbxml": {
    source: "iana"
  },
  "application/vnd.wv.csp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.wv.ssp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.xacml+json": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.xara": {
    source: "iana",
    extensions: [
      "xar"
    ]
  },
  "application/vnd.xfdl": {
    source: "iana",
    extensions: [
      "xfdl"
    ]
  },
  "application/vnd.xfdl.webform": {
    source: "iana"
  },
  "application/vnd.xmi+xml": {
    source: "iana",
    compressible: !0
  },
  "application/vnd.xmpie.cpkg": {
    source: "iana"
  },
  "application/vnd.xmpie.dpkg": {
    source: "iana"
  },
  "application/vnd.xmpie.plan": {
    source: "iana"
  },
  "application/vnd.xmpie.ppkg": {
    source: "iana"
  },
  "application/vnd.xmpie.xlim": {
    source: "iana"
  },
  "application/vnd.yamaha.hv-dic": {
    source: "iana",
    extensions: [
      "hvd"
    ]
  },
  "application/vnd.yamaha.hv-script": {
    source: "iana",
    extensions: [
      "hvs"
    ]
  },
  "application/vnd.yamaha.hv-voice": {
    source: "iana",
    extensions: [
      "hvp"
    ]
  },
  "application/vnd.yamaha.openscoreformat": {
    source: "iana",
    extensions: [
      "osf"
    ]
  },
  "application/vnd.yamaha.openscoreformat.osfpvg+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "osfpvg"
    ]
  },
  "application/vnd.yamaha.remote-setup": {
    source: "iana"
  },
  "application/vnd.yamaha.smaf-audio": {
    source: "iana",
    extensions: [
      "saf"
    ]
  },
  "application/vnd.yamaha.smaf-phrase": {
    source: "iana",
    extensions: [
      "spf"
    ]
  },
  "application/vnd.yamaha.through-ngn": {
    source: "iana"
  },
  "application/vnd.yamaha.tunnel-udpencap": {
    source: "iana"
  },
  "application/vnd.yaoweme": {
    source: "iana"
  },
  "application/vnd.yellowriver-custom-menu": {
    source: "iana",
    extensions: [
      "cmp"
    ]
  },
  "application/vnd.youtube.yt": {
    source: "iana"
  },
  "application/vnd.zul": {
    source: "iana",
    extensions: [
      "zir",
      "zirz"
    ]
  },
  "application/vnd.zzazz.deck+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "zaz"
    ]
  },
  "application/voicexml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "vxml"
    ]
  },
  "application/voucher-cms+json": {
    source: "iana",
    compressible: !0
  },
  "application/vq-rtcpxr": {
    source: "iana"
  },
  "application/wasm": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wasm"
    ]
  },
  "application/watcherinfo+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wif"
    ]
  },
  "application/webpush-options+json": {
    source: "iana",
    compressible: !0
  },
  "application/whoispp-query": {
    source: "iana"
  },
  "application/whoispp-response": {
    source: "iana"
  },
  "application/widget": {
    source: "iana",
    extensions: [
      "wgt"
    ]
  },
  "application/winhlp": {
    source: "apache",
    extensions: [
      "hlp"
    ]
  },
  "application/wita": {
    source: "iana"
  },
  "application/wordperfect5.1": {
    source: "iana"
  },
  "application/wsdl+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wsdl"
    ]
  },
  "application/wspolicy+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "wspolicy"
    ]
  },
  "application/x-7z-compressed": {
    source: "apache",
    compressible: !1,
    extensions: [
      "7z"
    ]
  },
  "application/x-abiword": {
    source: "apache",
    extensions: [
      "abw"
    ]
  },
  "application/x-ace-compressed": {
    source: "apache",
    extensions: [
      "ace"
    ]
  },
  "application/x-amf": {
    source: "apache"
  },
  "application/x-apple-diskimage": {
    source: "apache",
    extensions: [
      "dmg"
    ]
  },
  "application/x-arj": {
    compressible: !1,
    extensions: [
      "arj"
    ]
  },
  "application/x-authorware-bin": {
    source: "apache",
    extensions: [
      "aab",
      "x32",
      "u32",
      "vox"
    ]
  },
  "application/x-authorware-map": {
    source: "apache",
    extensions: [
      "aam"
    ]
  },
  "application/x-authorware-seg": {
    source: "apache",
    extensions: [
      "aas"
    ]
  },
  "application/x-bcpio": {
    source: "apache",
    extensions: [
      "bcpio"
    ]
  },
  "application/x-bdoc": {
    compressible: !1,
    extensions: [
      "bdoc"
    ]
  },
  "application/x-bittorrent": {
    source: "apache",
    extensions: [
      "torrent"
    ]
  },
  "application/x-blorb": {
    source: "apache",
    extensions: [
      "blb",
      "blorb"
    ]
  },
  "application/x-bzip": {
    source: "apache",
    compressible: !1,
    extensions: [
      "bz"
    ]
  },
  "application/x-bzip2": {
    source: "apache",
    compressible: !1,
    extensions: [
      "bz2",
      "boz"
    ]
  },
  "application/x-cbr": {
    source: "apache",
    extensions: [
      "cbr",
      "cba",
      "cbt",
      "cbz",
      "cb7"
    ]
  },
  "application/x-cdlink": {
    source: "apache",
    extensions: [
      "vcd"
    ]
  },
  "application/x-cfs-compressed": {
    source: "apache",
    extensions: [
      "cfs"
    ]
  },
  "application/x-chat": {
    source: "apache",
    extensions: [
      "chat"
    ]
  },
  "application/x-chess-pgn": {
    source: "apache",
    extensions: [
      "pgn"
    ]
  },
  "application/x-chrome-extension": {
    extensions: [
      "crx"
    ]
  },
  "application/x-cocoa": {
    source: "nginx",
    extensions: [
      "cco"
    ]
  },
  "application/x-compress": {
    source: "apache"
  },
  "application/x-conference": {
    source: "apache",
    extensions: [
      "nsc"
    ]
  },
  "application/x-cpio": {
    source: "apache",
    extensions: [
      "cpio"
    ]
  },
  "application/x-csh": {
    source: "apache",
    extensions: [
      "csh"
    ]
  },
  "application/x-deb": {
    compressible: !1
  },
  "application/x-debian-package": {
    source: "apache",
    extensions: [
      "deb",
      "udeb"
    ]
  },
  "application/x-dgc-compressed": {
    source: "apache",
    extensions: [
      "dgc"
    ]
  },
  "application/x-director": {
    source: "apache",
    extensions: [
      "dir",
      "dcr",
      "dxr",
      "cst",
      "cct",
      "cxt",
      "w3d",
      "fgd",
      "swa"
    ]
  },
  "application/x-doom": {
    source: "apache",
    extensions: [
      "wad"
    ]
  },
  "application/x-dtbncx+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "ncx"
    ]
  },
  "application/x-dtbook+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "dtb"
    ]
  },
  "application/x-dtbresource+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "res"
    ]
  },
  "application/x-dvi": {
    source: "apache",
    compressible: !1,
    extensions: [
      "dvi"
    ]
  },
  "application/x-envoy": {
    source: "apache",
    extensions: [
      "evy"
    ]
  },
  "application/x-eva": {
    source: "apache",
    extensions: [
      "eva"
    ]
  },
  "application/x-font-bdf": {
    source: "apache",
    extensions: [
      "bdf"
    ]
  },
  "application/x-font-dos": {
    source: "apache"
  },
  "application/x-font-framemaker": {
    source: "apache"
  },
  "application/x-font-ghostscript": {
    source: "apache",
    extensions: [
      "gsf"
    ]
  },
  "application/x-font-libgrx": {
    source: "apache"
  },
  "application/x-font-linux-psf": {
    source: "apache",
    extensions: [
      "psf"
    ]
  },
  "application/x-font-pcf": {
    source: "apache",
    extensions: [
      "pcf"
    ]
  },
  "application/x-font-snf": {
    source: "apache",
    extensions: [
      "snf"
    ]
  },
  "application/x-font-speedo": {
    source: "apache"
  },
  "application/x-font-sunos-news": {
    source: "apache"
  },
  "application/x-font-type1": {
    source: "apache",
    extensions: [
      "pfa",
      "pfb",
      "pfm",
      "afm"
    ]
  },
  "application/x-font-vfont": {
    source: "apache"
  },
  "application/x-freearc": {
    source: "apache",
    extensions: [
      "arc"
    ]
  },
  "application/x-futuresplash": {
    source: "apache",
    extensions: [
      "spl"
    ]
  },
  "application/x-gca-compressed": {
    source: "apache",
    extensions: [
      "gca"
    ]
  },
  "application/x-glulx": {
    source: "apache",
    extensions: [
      "ulx"
    ]
  },
  "application/x-gnumeric": {
    source: "apache",
    extensions: [
      "gnumeric"
    ]
  },
  "application/x-gramps-xml": {
    source: "apache",
    extensions: [
      "gramps"
    ]
  },
  "application/x-gtar": {
    source: "apache",
    extensions: [
      "gtar"
    ]
  },
  "application/x-gzip": {
    source: "apache"
  },
  "application/x-hdf": {
    source: "apache",
    extensions: [
      "hdf"
    ]
  },
  "application/x-httpd-php": {
    compressible: !0,
    extensions: [
      "php"
    ]
  },
  "application/x-install-instructions": {
    source: "apache",
    extensions: [
      "install"
    ]
  },
  "application/x-iso9660-image": {
    source: "apache",
    extensions: [
      "iso"
    ]
  },
  "application/x-iwork-keynote-sffkey": {
    extensions: [
      "key"
    ]
  },
  "application/x-iwork-numbers-sffnumbers": {
    extensions: [
      "numbers"
    ]
  },
  "application/x-iwork-pages-sffpages": {
    extensions: [
      "pages"
    ]
  },
  "application/x-java-archive-diff": {
    source: "nginx",
    extensions: [
      "jardiff"
    ]
  },
  "application/x-java-jnlp-file": {
    source: "apache",
    compressible: !1,
    extensions: [
      "jnlp"
    ]
  },
  "application/x-javascript": {
    compressible: !0
  },
  "application/x-keepass2": {
    extensions: [
      "kdbx"
    ]
  },
  "application/x-latex": {
    source: "apache",
    compressible: !1,
    extensions: [
      "latex"
    ]
  },
  "application/x-lua-bytecode": {
    extensions: [
      "luac"
    ]
  },
  "application/x-lzh-compressed": {
    source: "apache",
    extensions: [
      "lzh",
      "lha"
    ]
  },
  "application/x-makeself": {
    source: "nginx",
    extensions: [
      "run"
    ]
  },
  "application/x-mie": {
    source: "apache",
    extensions: [
      "mie"
    ]
  },
  "application/x-mobipocket-ebook": {
    source: "apache",
    extensions: [
      "prc",
      "mobi"
    ]
  },
  "application/x-mpegurl": {
    compressible: !1
  },
  "application/x-ms-application": {
    source: "apache",
    extensions: [
      "application"
    ]
  },
  "application/x-ms-shortcut": {
    source: "apache",
    extensions: [
      "lnk"
    ]
  },
  "application/x-ms-wmd": {
    source: "apache",
    extensions: [
      "wmd"
    ]
  },
  "application/x-ms-wmz": {
    source: "apache",
    extensions: [
      "wmz"
    ]
  },
  "application/x-ms-xbap": {
    source: "apache",
    extensions: [
      "xbap"
    ]
  },
  "application/x-msaccess": {
    source: "apache",
    extensions: [
      "mdb"
    ]
  },
  "application/x-msbinder": {
    source: "apache",
    extensions: [
      "obd"
    ]
  },
  "application/x-mscardfile": {
    source: "apache",
    extensions: [
      "crd"
    ]
  },
  "application/x-msclip": {
    source: "apache",
    extensions: [
      "clp"
    ]
  },
  "application/x-msdos-program": {
    extensions: [
      "exe"
    ]
  },
  "application/x-msdownload": {
    source: "apache",
    extensions: [
      "exe",
      "dll",
      "com",
      "bat",
      "msi"
    ]
  },
  "application/x-msmediaview": {
    source: "apache",
    extensions: [
      "mvb",
      "m13",
      "m14"
    ]
  },
  "application/x-msmetafile": {
    source: "apache",
    extensions: [
      "wmf",
      "wmz",
      "emf",
      "emz"
    ]
  },
  "application/x-msmoney": {
    source: "apache",
    extensions: [
      "mny"
    ]
  },
  "application/x-mspublisher": {
    source: "apache",
    extensions: [
      "pub"
    ]
  },
  "application/x-msschedule": {
    source: "apache",
    extensions: [
      "scd"
    ]
  },
  "application/x-msterminal": {
    source: "apache",
    extensions: [
      "trm"
    ]
  },
  "application/x-mswrite": {
    source: "apache",
    extensions: [
      "wri"
    ]
  },
  "application/x-netcdf": {
    source: "apache",
    extensions: [
      "nc",
      "cdf"
    ]
  },
  "application/x-ns-proxy-autoconfig": {
    compressible: !0,
    extensions: [
      "pac"
    ]
  },
  "application/x-nzb": {
    source: "apache",
    extensions: [
      "nzb"
    ]
  },
  "application/x-perl": {
    source: "nginx",
    extensions: [
      "pl",
      "pm"
    ]
  },
  "application/x-pilot": {
    source: "nginx",
    extensions: [
      "prc",
      "pdb"
    ]
  },
  "application/x-pkcs12": {
    source: "apache",
    compressible: !1,
    extensions: [
      "p12",
      "pfx"
    ]
  },
  "application/x-pkcs7-certificates": {
    source: "apache",
    extensions: [
      "p7b",
      "spc"
    ]
  },
  "application/x-pkcs7-certreqresp": {
    source: "apache",
    extensions: [
      "p7r"
    ]
  },
  "application/x-pki-message": {
    source: "iana"
  },
  "application/x-rar-compressed": {
    source: "apache",
    compressible: !1,
    extensions: [
      "rar"
    ]
  },
  "application/x-redhat-package-manager": {
    source: "nginx",
    extensions: [
      "rpm"
    ]
  },
  "application/x-research-info-systems": {
    source: "apache",
    extensions: [
      "ris"
    ]
  },
  "application/x-sea": {
    source: "nginx",
    extensions: [
      "sea"
    ]
  },
  "application/x-sh": {
    source: "apache",
    compressible: !0,
    extensions: [
      "sh"
    ]
  },
  "application/x-shar": {
    source: "apache",
    extensions: [
      "shar"
    ]
  },
  "application/x-shockwave-flash": {
    source: "apache",
    compressible: !1,
    extensions: [
      "swf"
    ]
  },
  "application/x-silverlight-app": {
    source: "apache",
    extensions: [
      "xap"
    ]
  },
  "application/x-sql": {
    source: "apache",
    extensions: [
      "sql"
    ]
  },
  "application/x-stuffit": {
    source: "apache",
    compressible: !1,
    extensions: [
      "sit"
    ]
  },
  "application/x-stuffitx": {
    source: "apache",
    extensions: [
      "sitx"
    ]
  },
  "application/x-subrip": {
    source: "apache",
    extensions: [
      "srt"
    ]
  },
  "application/x-sv4cpio": {
    source: "apache",
    extensions: [
      "sv4cpio"
    ]
  },
  "application/x-sv4crc": {
    source: "apache",
    extensions: [
      "sv4crc"
    ]
  },
  "application/x-t3vm-image": {
    source: "apache",
    extensions: [
      "t3"
    ]
  },
  "application/x-tads": {
    source: "apache",
    extensions: [
      "gam"
    ]
  },
  "application/x-tar": {
    source: "apache",
    compressible: !0,
    extensions: [
      "tar"
    ]
  },
  "application/x-tcl": {
    source: "apache",
    extensions: [
      "tcl",
      "tk"
    ]
  },
  "application/x-tex": {
    source: "apache",
    extensions: [
      "tex"
    ]
  },
  "application/x-tex-tfm": {
    source: "apache",
    extensions: [
      "tfm"
    ]
  },
  "application/x-texinfo": {
    source: "apache",
    extensions: [
      "texinfo",
      "texi"
    ]
  },
  "application/x-tgif": {
    source: "apache",
    extensions: [
      "obj"
    ]
  },
  "application/x-ustar": {
    source: "apache",
    extensions: [
      "ustar"
    ]
  },
  "application/x-virtualbox-hdd": {
    compressible: !0,
    extensions: [
      "hdd"
    ]
  },
  "application/x-virtualbox-ova": {
    compressible: !0,
    extensions: [
      "ova"
    ]
  },
  "application/x-virtualbox-ovf": {
    compressible: !0,
    extensions: [
      "ovf"
    ]
  },
  "application/x-virtualbox-vbox": {
    compressible: !0,
    extensions: [
      "vbox"
    ]
  },
  "application/x-virtualbox-vbox-extpack": {
    compressible: !1,
    extensions: [
      "vbox-extpack"
    ]
  },
  "application/x-virtualbox-vdi": {
    compressible: !0,
    extensions: [
      "vdi"
    ]
  },
  "application/x-virtualbox-vhd": {
    compressible: !0,
    extensions: [
      "vhd"
    ]
  },
  "application/x-virtualbox-vmdk": {
    compressible: !0,
    extensions: [
      "vmdk"
    ]
  },
  "application/x-wais-source": {
    source: "apache",
    extensions: [
      "src"
    ]
  },
  "application/x-web-app-manifest+json": {
    compressible: !0,
    extensions: [
      "webapp"
    ]
  },
  "application/x-www-form-urlencoded": {
    source: "iana",
    compressible: !0
  },
  "application/x-x509-ca-cert": {
    source: "iana",
    extensions: [
      "der",
      "crt",
      "pem"
    ]
  },
  "application/x-x509-ca-ra-cert": {
    source: "iana"
  },
  "application/x-x509-next-ca-cert": {
    source: "iana"
  },
  "application/x-xfig": {
    source: "apache",
    extensions: [
      "fig"
    ]
  },
  "application/x-xliff+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "xlf"
    ]
  },
  "application/x-xpinstall": {
    source: "apache",
    compressible: !1,
    extensions: [
      "xpi"
    ]
  },
  "application/x-xz": {
    source: "apache",
    extensions: [
      "xz"
    ]
  },
  "application/x-zmachine": {
    source: "apache",
    extensions: [
      "z1",
      "z2",
      "z3",
      "z4",
      "z5",
      "z6",
      "z7",
      "z8"
    ]
  },
  "application/x400-bp": {
    source: "iana"
  },
  "application/xacml+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xaml+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "xaml"
    ]
  },
  "application/xcap-att+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xav"
    ]
  },
  "application/xcap-caps+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xca"
    ]
  },
  "application/xcap-diff+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xdf"
    ]
  },
  "application/xcap-el+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xel"
    ]
  },
  "application/xcap-error+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xcap-ns+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xns"
    ]
  },
  "application/xcon-conference-info+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xcon-conference-info-diff+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xenc+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xenc"
    ]
  },
  "application/xhtml+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xhtml",
      "xht"
    ]
  },
  "application/xhtml-voice+xml": {
    source: "apache",
    compressible: !0
  },
  "application/xliff+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xlf"
    ]
  },
  "application/xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xml",
      "xsl",
      "xsd",
      "rng"
    ]
  },
  "application/xml-dtd": {
    source: "iana",
    compressible: !0,
    extensions: [
      "dtd"
    ]
  },
  "application/xml-external-parsed-entity": {
    source: "iana"
  },
  "application/xml-patch+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xmpp+xml": {
    source: "iana",
    compressible: !0
  },
  "application/xop+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xop"
    ]
  },
  "application/xproc+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "xpl"
    ]
  },
  "application/xslt+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xsl",
      "xslt"
    ]
  },
  "application/xspf+xml": {
    source: "apache",
    compressible: !0,
    extensions: [
      "xspf"
    ]
  },
  "application/xv+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "mxml",
      "xhvml",
      "xvml",
      "xvm"
    ]
  },
  "application/yang": {
    source: "iana",
    extensions: [
      "yang"
    ]
  },
  "application/yang-data+json": {
    source: "iana",
    compressible: !0
  },
  "application/yang-data+xml": {
    source: "iana",
    compressible: !0
  },
  "application/yang-patch+json": {
    source: "iana",
    compressible: !0
  },
  "application/yang-patch+xml": {
    source: "iana",
    compressible: !0
  },
  "application/yin+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "yin"
    ]
  },
  "application/zip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "zip"
    ]
  },
  "application/zlib": {
    source: "iana"
  },
  "application/zstd": {
    source: "iana"
  },
  "audio/1d-interleaved-parityfec": {
    source: "iana"
  },
  "audio/32kadpcm": {
    source: "iana"
  },
  "audio/3gpp": {
    source: "iana",
    compressible: !1,
    extensions: [
      "3gpp"
    ]
  },
  "audio/3gpp2": {
    source: "iana"
  },
  "audio/aac": {
    source: "iana"
  },
  "audio/ac3": {
    source: "iana"
  },
  "audio/adpcm": {
    source: "apache",
    extensions: [
      "adp"
    ]
  },
  "audio/amr": {
    source: "iana",
    extensions: [
      "amr"
    ]
  },
  "audio/amr-wb": {
    source: "iana"
  },
  "audio/amr-wb+": {
    source: "iana"
  },
  "audio/aptx": {
    source: "iana"
  },
  "audio/asc": {
    source: "iana"
  },
  "audio/atrac-advanced-lossless": {
    source: "iana"
  },
  "audio/atrac-x": {
    source: "iana"
  },
  "audio/atrac3": {
    source: "iana"
  },
  "audio/basic": {
    source: "iana",
    compressible: !1,
    extensions: [
      "au",
      "snd"
    ]
  },
  "audio/bv16": {
    source: "iana"
  },
  "audio/bv32": {
    source: "iana"
  },
  "audio/clearmode": {
    source: "iana"
  },
  "audio/cn": {
    source: "iana"
  },
  "audio/dat12": {
    source: "iana"
  },
  "audio/dls": {
    source: "iana"
  },
  "audio/dsr-es201108": {
    source: "iana"
  },
  "audio/dsr-es202050": {
    source: "iana"
  },
  "audio/dsr-es202211": {
    source: "iana"
  },
  "audio/dsr-es202212": {
    source: "iana"
  },
  "audio/dv": {
    source: "iana"
  },
  "audio/dvi4": {
    source: "iana"
  },
  "audio/eac3": {
    source: "iana"
  },
  "audio/encaprtp": {
    source: "iana"
  },
  "audio/evrc": {
    source: "iana"
  },
  "audio/evrc-qcp": {
    source: "iana"
  },
  "audio/evrc0": {
    source: "iana"
  },
  "audio/evrc1": {
    source: "iana"
  },
  "audio/evrcb": {
    source: "iana"
  },
  "audio/evrcb0": {
    source: "iana"
  },
  "audio/evrcb1": {
    source: "iana"
  },
  "audio/evrcnw": {
    source: "iana"
  },
  "audio/evrcnw0": {
    source: "iana"
  },
  "audio/evrcnw1": {
    source: "iana"
  },
  "audio/evrcwb": {
    source: "iana"
  },
  "audio/evrcwb0": {
    source: "iana"
  },
  "audio/evrcwb1": {
    source: "iana"
  },
  "audio/evs": {
    source: "iana"
  },
  "audio/flexfec": {
    source: "iana"
  },
  "audio/fwdred": {
    source: "iana"
  },
  "audio/g711-0": {
    source: "iana"
  },
  "audio/g719": {
    source: "iana"
  },
  "audio/g722": {
    source: "iana"
  },
  "audio/g7221": {
    source: "iana"
  },
  "audio/g723": {
    source: "iana"
  },
  "audio/g726-16": {
    source: "iana"
  },
  "audio/g726-24": {
    source: "iana"
  },
  "audio/g726-32": {
    source: "iana"
  },
  "audio/g726-40": {
    source: "iana"
  },
  "audio/g728": {
    source: "iana"
  },
  "audio/g729": {
    source: "iana"
  },
  "audio/g7291": {
    source: "iana"
  },
  "audio/g729d": {
    source: "iana"
  },
  "audio/g729e": {
    source: "iana"
  },
  "audio/gsm": {
    source: "iana"
  },
  "audio/gsm-efr": {
    source: "iana"
  },
  "audio/gsm-hr-08": {
    source: "iana"
  },
  "audio/ilbc": {
    source: "iana"
  },
  "audio/ip-mr_v2.5": {
    source: "iana"
  },
  "audio/isac": {
    source: "apache"
  },
  "audio/l16": {
    source: "iana"
  },
  "audio/l20": {
    source: "iana"
  },
  "audio/l24": {
    source: "iana",
    compressible: !1
  },
  "audio/l8": {
    source: "iana"
  },
  "audio/lpc": {
    source: "iana"
  },
  "audio/melp": {
    source: "iana"
  },
  "audio/melp1200": {
    source: "iana"
  },
  "audio/melp2400": {
    source: "iana"
  },
  "audio/melp600": {
    source: "iana"
  },
  "audio/mhas": {
    source: "iana"
  },
  "audio/midi": {
    source: "apache",
    extensions: [
      "mid",
      "midi",
      "kar",
      "rmi"
    ]
  },
  "audio/mobile-xmf": {
    source: "iana",
    extensions: [
      "mxmf"
    ]
  },
  "audio/mp3": {
    compressible: !1,
    extensions: [
      "mp3"
    ]
  },
  "audio/mp4": {
    source: "iana",
    compressible: !1,
    extensions: [
      "m4a",
      "mp4a"
    ]
  },
  "audio/mp4a-latm": {
    source: "iana"
  },
  "audio/mpa": {
    source: "iana"
  },
  "audio/mpa-robust": {
    source: "iana"
  },
  "audio/mpeg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "mpga",
      "mp2",
      "mp2a",
      "mp3",
      "m2a",
      "m3a"
    ]
  },
  "audio/mpeg4-generic": {
    source: "iana"
  },
  "audio/musepack": {
    source: "apache"
  },
  "audio/ogg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "oga",
      "ogg",
      "spx",
      "opus"
    ]
  },
  "audio/opus": {
    source: "iana"
  },
  "audio/parityfec": {
    source: "iana"
  },
  "audio/pcma": {
    source: "iana"
  },
  "audio/pcma-wb": {
    source: "iana"
  },
  "audio/pcmu": {
    source: "iana"
  },
  "audio/pcmu-wb": {
    source: "iana"
  },
  "audio/prs.sid": {
    source: "iana"
  },
  "audio/qcelp": {
    source: "iana"
  },
  "audio/raptorfec": {
    source: "iana"
  },
  "audio/red": {
    source: "iana"
  },
  "audio/rtp-enc-aescm128": {
    source: "iana"
  },
  "audio/rtp-midi": {
    source: "iana"
  },
  "audio/rtploopback": {
    source: "iana"
  },
  "audio/rtx": {
    source: "iana"
  },
  "audio/s3m": {
    source: "apache",
    extensions: [
      "s3m"
    ]
  },
  "audio/scip": {
    source: "iana"
  },
  "audio/silk": {
    source: "apache",
    extensions: [
      "sil"
    ]
  },
  "audio/smv": {
    source: "iana"
  },
  "audio/smv-qcp": {
    source: "iana"
  },
  "audio/smv0": {
    source: "iana"
  },
  "audio/sofa": {
    source: "iana"
  },
  "audio/sp-midi": {
    source: "iana"
  },
  "audio/speex": {
    source: "iana"
  },
  "audio/t140c": {
    source: "iana"
  },
  "audio/t38": {
    source: "iana"
  },
  "audio/telephone-event": {
    source: "iana"
  },
  "audio/tetra_acelp": {
    source: "iana"
  },
  "audio/tetra_acelp_bb": {
    source: "iana"
  },
  "audio/tone": {
    source: "iana"
  },
  "audio/tsvcis": {
    source: "iana"
  },
  "audio/uemclip": {
    source: "iana"
  },
  "audio/ulpfec": {
    source: "iana"
  },
  "audio/usac": {
    source: "iana"
  },
  "audio/vdvi": {
    source: "iana"
  },
  "audio/vmr-wb": {
    source: "iana"
  },
  "audio/vnd.3gpp.iufp": {
    source: "iana"
  },
  "audio/vnd.4sb": {
    source: "iana"
  },
  "audio/vnd.audiokoz": {
    source: "iana"
  },
  "audio/vnd.celp": {
    source: "iana"
  },
  "audio/vnd.cisco.nse": {
    source: "iana"
  },
  "audio/vnd.cmles.radio-events": {
    source: "iana"
  },
  "audio/vnd.cns.anp1": {
    source: "iana"
  },
  "audio/vnd.cns.inf1": {
    source: "iana"
  },
  "audio/vnd.dece.audio": {
    source: "iana",
    extensions: [
      "uva",
      "uvva"
    ]
  },
  "audio/vnd.digital-winds": {
    source: "iana",
    extensions: [
      "eol"
    ]
  },
  "audio/vnd.dlna.adts": {
    source: "iana"
  },
  "audio/vnd.dolby.heaac.1": {
    source: "iana"
  },
  "audio/vnd.dolby.heaac.2": {
    source: "iana"
  },
  "audio/vnd.dolby.mlp": {
    source: "iana"
  },
  "audio/vnd.dolby.mps": {
    source: "iana"
  },
  "audio/vnd.dolby.pl2": {
    source: "iana"
  },
  "audio/vnd.dolby.pl2x": {
    source: "iana"
  },
  "audio/vnd.dolby.pl2z": {
    source: "iana"
  },
  "audio/vnd.dolby.pulse.1": {
    source: "iana"
  },
  "audio/vnd.dra": {
    source: "iana",
    extensions: [
      "dra"
    ]
  },
  "audio/vnd.dts": {
    source: "iana",
    extensions: [
      "dts"
    ]
  },
  "audio/vnd.dts.hd": {
    source: "iana",
    extensions: [
      "dtshd"
    ]
  },
  "audio/vnd.dts.uhd": {
    source: "iana"
  },
  "audio/vnd.dvb.file": {
    source: "iana"
  },
  "audio/vnd.everad.plj": {
    source: "iana"
  },
  "audio/vnd.hns.audio": {
    source: "iana"
  },
  "audio/vnd.lucent.voice": {
    source: "iana",
    extensions: [
      "lvp"
    ]
  },
  "audio/vnd.ms-playready.media.pya": {
    source: "iana",
    extensions: [
      "pya"
    ]
  },
  "audio/vnd.nokia.mobile-xmf": {
    source: "iana"
  },
  "audio/vnd.nortel.vbk": {
    source: "iana"
  },
  "audio/vnd.nuera.ecelp4800": {
    source: "iana",
    extensions: [
      "ecelp4800"
    ]
  },
  "audio/vnd.nuera.ecelp7470": {
    source: "iana",
    extensions: [
      "ecelp7470"
    ]
  },
  "audio/vnd.nuera.ecelp9600": {
    source: "iana",
    extensions: [
      "ecelp9600"
    ]
  },
  "audio/vnd.octel.sbc": {
    source: "iana"
  },
  "audio/vnd.presonus.multitrack": {
    source: "iana"
  },
  "audio/vnd.qcelp": {
    source: "iana"
  },
  "audio/vnd.rhetorex.32kadpcm": {
    source: "iana"
  },
  "audio/vnd.rip": {
    source: "iana",
    extensions: [
      "rip"
    ]
  },
  "audio/vnd.rn-realaudio": {
    compressible: !1
  },
  "audio/vnd.sealedmedia.softseal.mpeg": {
    source: "iana"
  },
  "audio/vnd.vmx.cvsd": {
    source: "iana"
  },
  "audio/vnd.wave": {
    compressible: !1
  },
  "audio/vorbis": {
    source: "iana",
    compressible: !1
  },
  "audio/vorbis-config": {
    source: "iana"
  },
  "audio/wav": {
    compressible: !1,
    extensions: [
      "wav"
    ]
  },
  "audio/wave": {
    compressible: !1,
    extensions: [
      "wav"
    ]
  },
  "audio/webm": {
    source: "apache",
    compressible: !1,
    extensions: [
      "weba"
    ]
  },
  "audio/x-aac": {
    source: "apache",
    compressible: !1,
    extensions: [
      "aac"
    ]
  },
  "audio/x-aiff": {
    source: "apache",
    extensions: [
      "aif",
      "aiff",
      "aifc"
    ]
  },
  "audio/x-caf": {
    source: "apache",
    compressible: !1,
    extensions: [
      "caf"
    ]
  },
  "audio/x-flac": {
    source: "apache",
    extensions: [
      "flac"
    ]
  },
  "audio/x-m4a": {
    source: "nginx",
    extensions: [
      "m4a"
    ]
  },
  "audio/x-matroska": {
    source: "apache",
    extensions: [
      "mka"
    ]
  },
  "audio/x-mpegurl": {
    source: "apache",
    extensions: [
      "m3u"
    ]
  },
  "audio/x-ms-wax": {
    source: "apache",
    extensions: [
      "wax"
    ]
  },
  "audio/x-ms-wma": {
    source: "apache",
    extensions: [
      "wma"
    ]
  },
  "audio/x-pn-realaudio": {
    source: "apache",
    extensions: [
      "ram",
      "ra"
    ]
  },
  "audio/x-pn-realaudio-plugin": {
    source: "apache",
    extensions: [
      "rmp"
    ]
  },
  "audio/x-realaudio": {
    source: "nginx",
    extensions: [
      "ra"
    ]
  },
  "audio/x-tta": {
    source: "apache"
  },
  "audio/x-wav": {
    source: "apache",
    extensions: [
      "wav"
    ]
  },
  "audio/xm": {
    source: "apache",
    extensions: [
      "xm"
    ]
  },
  "chemical/x-cdx": {
    source: "apache",
    extensions: [
      "cdx"
    ]
  },
  "chemical/x-cif": {
    source: "apache",
    extensions: [
      "cif"
    ]
  },
  "chemical/x-cmdf": {
    source: "apache",
    extensions: [
      "cmdf"
    ]
  },
  "chemical/x-cml": {
    source: "apache",
    extensions: [
      "cml"
    ]
  },
  "chemical/x-csml": {
    source: "apache",
    extensions: [
      "csml"
    ]
  },
  "chemical/x-pdb": {
    source: "apache"
  },
  "chemical/x-xyz": {
    source: "apache",
    extensions: [
      "xyz"
    ]
  },
  "font/collection": {
    source: "iana",
    extensions: [
      "ttc"
    ]
  },
  "font/otf": {
    source: "iana",
    compressible: !0,
    extensions: [
      "otf"
    ]
  },
  "font/sfnt": {
    source: "iana"
  },
  "font/ttf": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ttf"
    ]
  },
  "font/woff": {
    source: "iana",
    extensions: [
      "woff"
    ]
  },
  "font/woff2": {
    source: "iana",
    extensions: [
      "woff2"
    ]
  },
  "image/aces": {
    source: "iana",
    extensions: [
      "exr"
    ]
  },
  "image/apng": {
    compressible: !1,
    extensions: [
      "apng"
    ]
  },
  "image/avci": {
    source: "iana",
    extensions: [
      "avci"
    ]
  },
  "image/avcs": {
    source: "iana",
    extensions: [
      "avcs"
    ]
  },
  "image/avif": {
    source: "iana",
    compressible: !1,
    extensions: [
      "avif"
    ]
  },
  "image/bmp": {
    source: "iana",
    compressible: !0,
    extensions: [
      "bmp"
    ]
  },
  "image/cgm": {
    source: "iana",
    extensions: [
      "cgm"
    ]
  },
  "image/dicom-rle": {
    source: "iana",
    extensions: [
      "drle"
    ]
  },
  "image/emf": {
    source: "iana",
    extensions: [
      "emf"
    ]
  },
  "image/fits": {
    source: "iana",
    extensions: [
      "fits"
    ]
  },
  "image/g3fax": {
    source: "iana",
    extensions: [
      "g3"
    ]
  },
  "image/gif": {
    source: "iana",
    compressible: !1,
    extensions: [
      "gif"
    ]
  },
  "image/heic": {
    source: "iana",
    extensions: [
      "heic"
    ]
  },
  "image/heic-sequence": {
    source: "iana",
    extensions: [
      "heics"
    ]
  },
  "image/heif": {
    source: "iana",
    extensions: [
      "heif"
    ]
  },
  "image/heif-sequence": {
    source: "iana",
    extensions: [
      "heifs"
    ]
  },
  "image/hej2k": {
    source: "iana",
    extensions: [
      "hej2"
    ]
  },
  "image/hsj2": {
    source: "iana",
    extensions: [
      "hsj2"
    ]
  },
  "image/ief": {
    source: "iana",
    extensions: [
      "ief"
    ]
  },
  "image/jls": {
    source: "iana",
    extensions: [
      "jls"
    ]
  },
  "image/jp2": {
    source: "iana",
    compressible: !1,
    extensions: [
      "jp2",
      "jpg2"
    ]
  },
  "image/jpeg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "jpeg",
      "jpg",
      "jpe"
    ]
  },
  "image/jph": {
    source: "iana",
    extensions: [
      "jph"
    ]
  },
  "image/jphc": {
    source: "iana",
    extensions: [
      "jhc"
    ]
  },
  "image/jpm": {
    source: "iana",
    compressible: !1,
    extensions: [
      "jpm"
    ]
  },
  "image/jpx": {
    source: "iana",
    compressible: !1,
    extensions: [
      "jpx",
      "jpf"
    ]
  },
  "image/jxr": {
    source: "iana",
    extensions: [
      "jxr"
    ]
  },
  "image/jxra": {
    source: "iana",
    extensions: [
      "jxra"
    ]
  },
  "image/jxrs": {
    source: "iana",
    extensions: [
      "jxrs"
    ]
  },
  "image/jxs": {
    source: "iana",
    extensions: [
      "jxs"
    ]
  },
  "image/jxsc": {
    source: "iana",
    extensions: [
      "jxsc"
    ]
  },
  "image/jxsi": {
    source: "iana",
    extensions: [
      "jxsi"
    ]
  },
  "image/jxss": {
    source: "iana",
    extensions: [
      "jxss"
    ]
  },
  "image/ktx": {
    source: "iana",
    extensions: [
      "ktx"
    ]
  },
  "image/ktx2": {
    source: "iana",
    extensions: [
      "ktx2"
    ]
  },
  "image/naplps": {
    source: "iana"
  },
  "image/pjpeg": {
    compressible: !1
  },
  "image/png": {
    source: "iana",
    compressible: !1,
    extensions: [
      "png"
    ]
  },
  "image/prs.btif": {
    source: "iana",
    extensions: [
      "btif"
    ]
  },
  "image/prs.pti": {
    source: "iana",
    extensions: [
      "pti"
    ]
  },
  "image/pwg-raster": {
    source: "iana"
  },
  "image/sgi": {
    source: "apache",
    extensions: [
      "sgi"
    ]
  },
  "image/svg+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "svg",
      "svgz"
    ]
  },
  "image/t38": {
    source: "iana",
    extensions: [
      "t38"
    ]
  },
  "image/tiff": {
    source: "iana",
    compressible: !1,
    extensions: [
      "tif",
      "tiff"
    ]
  },
  "image/tiff-fx": {
    source: "iana",
    extensions: [
      "tfx"
    ]
  },
  "image/vnd.adobe.photoshop": {
    source: "iana",
    compressible: !0,
    extensions: [
      "psd"
    ]
  },
  "image/vnd.airzip.accelerator.azv": {
    source: "iana",
    extensions: [
      "azv"
    ]
  },
  "image/vnd.cns.inf2": {
    source: "iana"
  },
  "image/vnd.dece.graphic": {
    source: "iana",
    extensions: [
      "uvi",
      "uvvi",
      "uvg",
      "uvvg"
    ]
  },
  "image/vnd.djvu": {
    source: "iana",
    extensions: [
      "djvu",
      "djv"
    ]
  },
  "image/vnd.dvb.subtitle": {
    source: "iana",
    extensions: [
      "sub"
    ]
  },
  "image/vnd.dwg": {
    source: "iana",
    extensions: [
      "dwg"
    ]
  },
  "image/vnd.dxf": {
    source: "iana",
    extensions: [
      "dxf"
    ]
  },
  "image/vnd.fastbidsheet": {
    source: "iana",
    extensions: [
      "fbs"
    ]
  },
  "image/vnd.fpx": {
    source: "iana",
    extensions: [
      "fpx"
    ]
  },
  "image/vnd.fst": {
    source: "iana",
    extensions: [
      "fst"
    ]
  },
  "image/vnd.fujixerox.edmics-mmr": {
    source: "iana",
    extensions: [
      "mmr"
    ]
  },
  "image/vnd.fujixerox.edmics-rlc": {
    source: "iana",
    extensions: [
      "rlc"
    ]
  },
  "image/vnd.globalgraphics.pgb": {
    source: "iana"
  },
  "image/vnd.microsoft.icon": {
    source: "iana",
    compressible: !0,
    extensions: [
      "ico"
    ]
  },
  "image/vnd.mix": {
    source: "iana"
  },
  "image/vnd.mozilla.apng": {
    source: "iana"
  },
  "image/vnd.ms-dds": {
    compressible: !0,
    extensions: [
      "dds"
    ]
  },
  "image/vnd.ms-modi": {
    source: "iana",
    extensions: [
      "mdi"
    ]
  },
  "image/vnd.ms-photo": {
    source: "apache",
    extensions: [
      "wdp"
    ]
  },
  "image/vnd.net-fpx": {
    source: "iana",
    extensions: [
      "npx"
    ]
  },
  "image/vnd.pco.b16": {
    source: "iana",
    extensions: [
      "b16"
    ]
  },
  "image/vnd.radiance": {
    source: "iana"
  },
  "image/vnd.sealed.png": {
    source: "iana"
  },
  "image/vnd.sealedmedia.softseal.gif": {
    source: "iana"
  },
  "image/vnd.sealedmedia.softseal.jpg": {
    source: "iana"
  },
  "image/vnd.svf": {
    source: "iana"
  },
  "image/vnd.tencent.tap": {
    source: "iana",
    extensions: [
      "tap"
    ]
  },
  "image/vnd.valve.source.texture": {
    source: "iana",
    extensions: [
      "vtf"
    ]
  },
  "image/vnd.wap.wbmp": {
    source: "iana",
    extensions: [
      "wbmp"
    ]
  },
  "image/vnd.xiff": {
    source: "iana",
    extensions: [
      "xif"
    ]
  },
  "image/vnd.zbrush.pcx": {
    source: "iana",
    extensions: [
      "pcx"
    ]
  },
  "image/webp": {
    source: "apache",
    extensions: [
      "webp"
    ]
  },
  "image/wmf": {
    source: "iana",
    extensions: [
      "wmf"
    ]
  },
  "image/x-3ds": {
    source: "apache",
    extensions: [
      "3ds"
    ]
  },
  "image/x-cmu-raster": {
    source: "apache",
    extensions: [
      "ras"
    ]
  },
  "image/x-cmx": {
    source: "apache",
    extensions: [
      "cmx"
    ]
  },
  "image/x-freehand": {
    source: "apache",
    extensions: [
      "fh",
      "fhc",
      "fh4",
      "fh5",
      "fh7"
    ]
  },
  "image/x-icon": {
    source: "apache",
    compressible: !0,
    extensions: [
      "ico"
    ]
  },
  "image/x-jng": {
    source: "nginx",
    extensions: [
      "jng"
    ]
  },
  "image/x-mrsid-image": {
    source: "apache",
    extensions: [
      "sid"
    ]
  },
  "image/x-ms-bmp": {
    source: "nginx",
    compressible: !0,
    extensions: [
      "bmp"
    ]
  },
  "image/x-pcx": {
    source: "apache",
    extensions: [
      "pcx"
    ]
  },
  "image/x-pict": {
    source: "apache",
    extensions: [
      "pic",
      "pct"
    ]
  },
  "image/x-portable-anymap": {
    source: "apache",
    extensions: [
      "pnm"
    ]
  },
  "image/x-portable-bitmap": {
    source: "apache",
    extensions: [
      "pbm"
    ]
  },
  "image/x-portable-graymap": {
    source: "apache",
    extensions: [
      "pgm"
    ]
  },
  "image/x-portable-pixmap": {
    source: "apache",
    extensions: [
      "ppm"
    ]
  },
  "image/x-rgb": {
    source: "apache",
    extensions: [
      "rgb"
    ]
  },
  "image/x-tga": {
    source: "apache",
    extensions: [
      "tga"
    ]
  },
  "image/x-xbitmap": {
    source: "apache",
    extensions: [
      "xbm"
    ]
  },
  "image/x-xcf": {
    compressible: !1
  },
  "image/x-xpixmap": {
    source: "apache",
    extensions: [
      "xpm"
    ]
  },
  "image/x-xwindowdump": {
    source: "apache",
    extensions: [
      "xwd"
    ]
  },
  "message/cpim": {
    source: "iana"
  },
  "message/delivery-status": {
    source: "iana"
  },
  "message/disposition-notification": {
    source: "iana",
    extensions: [
      "disposition-notification"
    ]
  },
  "message/external-body": {
    source: "iana"
  },
  "message/feedback-report": {
    source: "iana"
  },
  "message/global": {
    source: "iana",
    extensions: [
      "u8msg"
    ]
  },
  "message/global-delivery-status": {
    source: "iana",
    extensions: [
      "u8dsn"
    ]
  },
  "message/global-disposition-notification": {
    source: "iana",
    extensions: [
      "u8mdn"
    ]
  },
  "message/global-headers": {
    source: "iana",
    extensions: [
      "u8hdr"
    ]
  },
  "message/http": {
    source: "iana",
    compressible: !1
  },
  "message/imdn+xml": {
    source: "iana",
    compressible: !0
  },
  "message/news": {
    source: "iana"
  },
  "message/partial": {
    source: "iana",
    compressible: !1
  },
  "message/rfc822": {
    source: "iana",
    compressible: !0,
    extensions: [
      "eml",
      "mime"
    ]
  },
  "message/s-http": {
    source: "iana"
  },
  "message/sip": {
    source: "iana"
  },
  "message/sipfrag": {
    source: "iana"
  },
  "message/tracking-status": {
    source: "iana"
  },
  "message/vnd.si.simp": {
    source: "iana"
  },
  "message/vnd.wfa.wsc": {
    source: "iana",
    extensions: [
      "wsc"
    ]
  },
  "model/3mf": {
    source: "iana",
    extensions: [
      "3mf"
    ]
  },
  "model/e57": {
    source: "iana"
  },
  "model/gltf+json": {
    source: "iana",
    compressible: !0,
    extensions: [
      "gltf"
    ]
  },
  "model/gltf-binary": {
    source: "iana",
    compressible: !0,
    extensions: [
      "glb"
    ]
  },
  "model/iges": {
    source: "iana",
    compressible: !1,
    extensions: [
      "igs",
      "iges"
    ]
  },
  "model/mesh": {
    source: "iana",
    compressible: !1,
    extensions: [
      "msh",
      "mesh",
      "silo"
    ]
  },
  "model/mtl": {
    source: "iana",
    extensions: [
      "mtl"
    ]
  },
  "model/obj": {
    source: "iana",
    extensions: [
      "obj"
    ]
  },
  "model/step": {
    source: "iana"
  },
  "model/step+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "stpx"
    ]
  },
  "model/step+zip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "stpz"
    ]
  },
  "model/step-xml+zip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "stpxz"
    ]
  },
  "model/stl": {
    source: "iana",
    extensions: [
      "stl"
    ]
  },
  "model/vnd.collada+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "dae"
    ]
  },
  "model/vnd.dwf": {
    source: "iana",
    extensions: [
      "dwf"
    ]
  },
  "model/vnd.flatland.3dml": {
    source: "iana"
  },
  "model/vnd.gdl": {
    source: "iana",
    extensions: [
      "gdl"
    ]
  },
  "model/vnd.gs-gdl": {
    source: "apache"
  },
  "model/vnd.gs.gdl": {
    source: "iana"
  },
  "model/vnd.gtw": {
    source: "iana",
    extensions: [
      "gtw"
    ]
  },
  "model/vnd.moml+xml": {
    source: "iana",
    compressible: !0
  },
  "model/vnd.mts": {
    source: "iana",
    extensions: [
      "mts"
    ]
  },
  "model/vnd.opengex": {
    source: "iana",
    extensions: [
      "ogex"
    ]
  },
  "model/vnd.parasolid.transmit.binary": {
    source: "iana",
    extensions: [
      "x_b"
    ]
  },
  "model/vnd.parasolid.transmit.text": {
    source: "iana",
    extensions: [
      "x_t"
    ]
  },
  "model/vnd.pytha.pyox": {
    source: "iana"
  },
  "model/vnd.rosette.annotated-data-model": {
    source: "iana"
  },
  "model/vnd.sap.vds": {
    source: "iana",
    extensions: [
      "vds"
    ]
  },
  "model/vnd.usdz+zip": {
    source: "iana",
    compressible: !1,
    extensions: [
      "usdz"
    ]
  },
  "model/vnd.valve.source.compiled-map": {
    source: "iana",
    extensions: [
      "bsp"
    ]
  },
  "model/vnd.vtu": {
    source: "iana",
    extensions: [
      "vtu"
    ]
  },
  "model/vrml": {
    source: "iana",
    compressible: !1,
    extensions: [
      "wrl",
      "vrml"
    ]
  },
  "model/x3d+binary": {
    source: "apache",
    compressible: !1,
    extensions: [
      "x3db",
      "x3dbz"
    ]
  },
  "model/x3d+fastinfoset": {
    source: "iana",
    extensions: [
      "x3db"
    ]
  },
  "model/x3d+vrml": {
    source: "apache",
    compressible: !1,
    extensions: [
      "x3dv",
      "x3dvz"
    ]
  },
  "model/x3d+xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "x3d",
      "x3dz"
    ]
  },
  "model/x3d-vrml": {
    source: "iana",
    extensions: [
      "x3dv"
    ]
  },
  "multipart/alternative": {
    source: "iana",
    compressible: !1
  },
  "multipart/appledouble": {
    source: "iana"
  },
  "multipart/byteranges": {
    source: "iana"
  },
  "multipart/digest": {
    source: "iana"
  },
  "multipart/encrypted": {
    source: "iana",
    compressible: !1
  },
  "multipart/form-data": {
    source: "iana",
    compressible: !1
  },
  "multipart/header-set": {
    source: "iana"
  },
  "multipart/mixed": {
    source: "iana"
  },
  "multipart/multilingual": {
    source: "iana"
  },
  "multipart/parallel": {
    source: "iana"
  },
  "multipart/related": {
    source: "iana",
    compressible: !1
  },
  "multipart/report": {
    source: "iana"
  },
  "multipart/signed": {
    source: "iana",
    compressible: !1
  },
  "multipart/vnd.bint.med-plus": {
    source: "iana"
  },
  "multipart/voice-message": {
    source: "iana"
  },
  "multipart/x-mixed-replace": {
    source: "iana"
  },
  "text/1d-interleaved-parityfec": {
    source: "iana"
  },
  "text/cache-manifest": {
    source: "iana",
    compressible: !0,
    extensions: [
      "appcache",
      "manifest"
    ]
  },
  "text/calendar": {
    source: "iana",
    extensions: [
      "ics",
      "ifb"
    ]
  },
  "text/calender": {
    compressible: !0
  },
  "text/cmd": {
    compressible: !0
  },
  "text/coffeescript": {
    extensions: [
      "coffee",
      "litcoffee"
    ]
  },
  "text/cql": {
    source: "iana"
  },
  "text/cql-expression": {
    source: "iana"
  },
  "text/cql-identifier": {
    source: "iana"
  },
  "text/css": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "css"
    ]
  },
  "text/csv": {
    source: "iana",
    compressible: !0,
    extensions: [
      "csv"
    ]
  },
  "text/csv-schema": {
    source: "iana"
  },
  "text/directory": {
    source: "iana"
  },
  "text/dns": {
    source: "iana"
  },
  "text/ecmascript": {
    source: "iana"
  },
  "text/encaprtp": {
    source: "iana"
  },
  "text/enriched": {
    source: "iana"
  },
  "text/fhirpath": {
    source: "iana"
  },
  "text/flexfec": {
    source: "iana"
  },
  "text/fwdred": {
    source: "iana"
  },
  "text/gff3": {
    source: "iana"
  },
  "text/grammar-ref-list": {
    source: "iana"
  },
  "text/html": {
    source: "iana",
    compressible: !0,
    extensions: [
      "html",
      "htm",
      "shtml"
    ]
  },
  "text/jade": {
    extensions: [
      "jade"
    ]
  },
  "text/javascript": {
    source: "iana",
    compressible: !0
  },
  "text/jcr-cnd": {
    source: "iana"
  },
  "text/jsx": {
    compressible: !0,
    extensions: [
      "jsx"
    ]
  },
  "text/less": {
    compressible: !0,
    extensions: [
      "less"
    ]
  },
  "text/markdown": {
    source: "iana",
    compressible: !0,
    extensions: [
      "markdown",
      "md"
    ]
  },
  "text/mathml": {
    source: "nginx",
    extensions: [
      "mml"
    ]
  },
  "text/mdx": {
    compressible: !0,
    extensions: [
      "mdx"
    ]
  },
  "text/mizar": {
    source: "iana"
  },
  "text/n3": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "n3"
    ]
  },
  "text/parameters": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/parityfec": {
    source: "iana"
  },
  "text/plain": {
    source: "iana",
    compressible: !0,
    extensions: [
      "txt",
      "text",
      "conf",
      "def",
      "list",
      "log",
      "in",
      "ini"
    ]
  },
  "text/provenance-notation": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/prs.fallenstein.rst": {
    source: "iana"
  },
  "text/prs.lines.tag": {
    source: "iana",
    extensions: [
      "dsc"
    ]
  },
  "text/prs.prop.logic": {
    source: "iana"
  },
  "text/raptorfec": {
    source: "iana"
  },
  "text/red": {
    source: "iana"
  },
  "text/rfc822-headers": {
    source: "iana"
  },
  "text/richtext": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rtx"
    ]
  },
  "text/rtf": {
    source: "iana",
    compressible: !0,
    extensions: [
      "rtf"
    ]
  },
  "text/rtp-enc-aescm128": {
    source: "iana"
  },
  "text/rtploopback": {
    source: "iana"
  },
  "text/rtx": {
    source: "iana"
  },
  "text/sgml": {
    source: "iana",
    extensions: [
      "sgml",
      "sgm"
    ]
  },
  "text/shaclc": {
    source: "iana"
  },
  "text/shex": {
    source: "iana",
    extensions: [
      "shex"
    ]
  },
  "text/slim": {
    extensions: [
      "slim",
      "slm"
    ]
  },
  "text/spdx": {
    source: "iana",
    extensions: [
      "spdx"
    ]
  },
  "text/strings": {
    source: "iana"
  },
  "text/stylus": {
    extensions: [
      "stylus",
      "styl"
    ]
  },
  "text/t140": {
    source: "iana"
  },
  "text/tab-separated-values": {
    source: "iana",
    compressible: !0,
    extensions: [
      "tsv"
    ]
  },
  "text/troff": {
    source: "iana",
    extensions: [
      "t",
      "tr",
      "roff",
      "man",
      "me",
      "ms"
    ]
  },
  "text/turtle": {
    source: "iana",
    charset: "UTF-8",
    extensions: [
      "ttl"
    ]
  },
  "text/ulpfec": {
    source: "iana"
  },
  "text/uri-list": {
    source: "iana",
    compressible: !0,
    extensions: [
      "uri",
      "uris",
      "urls"
    ]
  },
  "text/vcard": {
    source: "iana",
    compressible: !0,
    extensions: [
      "vcard"
    ]
  },
  "text/vnd.a": {
    source: "iana"
  },
  "text/vnd.abc": {
    source: "iana"
  },
  "text/vnd.ascii-art": {
    source: "iana"
  },
  "text/vnd.curl": {
    source: "iana",
    extensions: [
      "curl"
    ]
  },
  "text/vnd.curl.dcurl": {
    source: "apache",
    extensions: [
      "dcurl"
    ]
  },
  "text/vnd.curl.mcurl": {
    source: "apache",
    extensions: [
      "mcurl"
    ]
  },
  "text/vnd.curl.scurl": {
    source: "apache",
    extensions: [
      "scurl"
    ]
  },
  "text/vnd.debian.copyright": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/vnd.dmclientscript": {
    source: "iana"
  },
  "text/vnd.dvb.subtitle": {
    source: "iana",
    extensions: [
      "sub"
    ]
  },
  "text/vnd.esmertec.theme-descriptor": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/vnd.familysearch.gedcom": {
    source: "iana",
    extensions: [
      "ged"
    ]
  },
  "text/vnd.ficlab.flt": {
    source: "iana"
  },
  "text/vnd.fly": {
    source: "iana",
    extensions: [
      "fly"
    ]
  },
  "text/vnd.fmi.flexstor": {
    source: "iana",
    extensions: [
      "flx"
    ]
  },
  "text/vnd.gml": {
    source: "iana"
  },
  "text/vnd.graphviz": {
    source: "iana",
    extensions: [
      "gv"
    ]
  },
  "text/vnd.hans": {
    source: "iana"
  },
  "text/vnd.hgl": {
    source: "iana"
  },
  "text/vnd.in3d.3dml": {
    source: "iana",
    extensions: [
      "3dml"
    ]
  },
  "text/vnd.in3d.spot": {
    source: "iana",
    extensions: [
      "spot"
    ]
  },
  "text/vnd.iptc.newsml": {
    source: "iana"
  },
  "text/vnd.iptc.nitf": {
    source: "iana"
  },
  "text/vnd.latex-z": {
    source: "iana"
  },
  "text/vnd.motorola.reflex": {
    source: "iana"
  },
  "text/vnd.ms-mediapackage": {
    source: "iana"
  },
  "text/vnd.net2phone.commcenter.command": {
    source: "iana"
  },
  "text/vnd.radisys.msml-basic-layout": {
    source: "iana"
  },
  "text/vnd.senx.warpscript": {
    source: "iana"
  },
  "text/vnd.si.uricatalogue": {
    source: "iana"
  },
  "text/vnd.sosi": {
    source: "iana"
  },
  "text/vnd.sun.j2me.app-descriptor": {
    source: "iana",
    charset: "UTF-8",
    extensions: [
      "jad"
    ]
  },
  "text/vnd.trolltech.linguist": {
    source: "iana",
    charset: "UTF-8"
  },
  "text/vnd.wap.si": {
    source: "iana"
  },
  "text/vnd.wap.sl": {
    source: "iana"
  },
  "text/vnd.wap.wml": {
    source: "iana",
    extensions: [
      "wml"
    ]
  },
  "text/vnd.wap.wmlscript": {
    source: "iana",
    extensions: [
      "wmls"
    ]
  },
  "text/vtt": {
    source: "iana",
    charset: "UTF-8",
    compressible: !0,
    extensions: [
      "vtt"
    ]
  },
  "text/x-asm": {
    source: "apache",
    extensions: [
      "s",
      "asm"
    ]
  },
  "text/x-c": {
    source: "apache",
    extensions: [
      "c",
      "cc",
      "cxx",
      "cpp",
      "h",
      "hh",
      "dic"
    ]
  },
  "text/x-component": {
    source: "nginx",
    extensions: [
      "htc"
    ]
  },
  "text/x-fortran": {
    source: "apache",
    extensions: [
      "f",
      "for",
      "f77",
      "f90"
    ]
  },
  "text/x-gwt-rpc": {
    compressible: !0
  },
  "text/x-handlebars-template": {
    extensions: [
      "hbs"
    ]
  },
  "text/x-java-source": {
    source: "apache",
    extensions: [
      "java"
    ]
  },
  "text/x-jquery-tmpl": {
    compressible: !0
  },
  "text/x-lua": {
    extensions: [
      "lua"
    ]
  },
  "text/x-markdown": {
    compressible: !0,
    extensions: [
      "mkd"
    ]
  },
  "text/x-nfo": {
    source: "apache",
    extensions: [
      "nfo"
    ]
  },
  "text/x-opml": {
    source: "apache",
    extensions: [
      "opml"
    ]
  },
  "text/x-org": {
    compressible: !0,
    extensions: [
      "org"
    ]
  },
  "text/x-pascal": {
    source: "apache",
    extensions: [
      "p",
      "pas"
    ]
  },
  "text/x-processing": {
    compressible: !0,
    extensions: [
      "pde"
    ]
  },
  "text/x-sass": {
    extensions: [
      "sass"
    ]
  },
  "text/x-scss": {
    extensions: [
      "scss"
    ]
  },
  "text/x-setext": {
    source: "apache",
    extensions: [
      "etx"
    ]
  },
  "text/x-sfv": {
    source: "apache",
    extensions: [
      "sfv"
    ]
  },
  "text/x-suse-ymp": {
    compressible: !0,
    extensions: [
      "ymp"
    ]
  },
  "text/x-uuencode": {
    source: "apache",
    extensions: [
      "uu"
    ]
  },
  "text/x-vcalendar": {
    source: "apache",
    extensions: [
      "vcs"
    ]
  },
  "text/x-vcard": {
    source: "apache",
    extensions: [
      "vcf"
    ]
  },
  "text/xml": {
    source: "iana",
    compressible: !0,
    extensions: [
      "xml"
    ]
  },
  "text/xml-external-parsed-entity": {
    source: "iana"
  },
  "text/yaml": {
    compressible: !0,
    extensions: [
      "yaml",
      "yml"
    ]
  },
  "video/1d-interleaved-parityfec": {
    source: "iana"
  },
  "video/3gpp": {
    source: "iana",
    extensions: [
      "3gp",
      "3gpp"
    ]
  },
  "video/3gpp-tt": {
    source: "iana"
  },
  "video/3gpp2": {
    source: "iana",
    extensions: [
      "3g2"
    ]
  },
  "video/av1": {
    source: "iana"
  },
  "video/bmpeg": {
    source: "iana"
  },
  "video/bt656": {
    source: "iana"
  },
  "video/celb": {
    source: "iana"
  },
  "video/dv": {
    source: "iana"
  },
  "video/encaprtp": {
    source: "iana"
  },
  "video/ffv1": {
    source: "iana"
  },
  "video/flexfec": {
    source: "iana"
  },
  "video/h261": {
    source: "iana",
    extensions: [
      "h261"
    ]
  },
  "video/h263": {
    source: "iana",
    extensions: [
      "h263"
    ]
  },
  "video/h263-1998": {
    source: "iana"
  },
  "video/h263-2000": {
    source: "iana"
  },
  "video/h264": {
    source: "iana",
    extensions: [
      "h264"
    ]
  },
  "video/h264-rcdo": {
    source: "iana"
  },
  "video/h264-svc": {
    source: "iana"
  },
  "video/h265": {
    source: "iana"
  },
  "video/iso.segment": {
    source: "iana",
    extensions: [
      "m4s"
    ]
  },
  "video/jpeg": {
    source: "iana",
    extensions: [
      "jpgv"
    ]
  },
  "video/jpeg2000": {
    source: "iana"
  },
  "video/jpm": {
    source: "apache",
    extensions: [
      "jpm",
      "jpgm"
    ]
  },
  "video/jxsv": {
    source: "iana"
  },
  "video/mj2": {
    source: "iana",
    extensions: [
      "mj2",
      "mjp2"
    ]
  },
  "video/mp1s": {
    source: "iana"
  },
  "video/mp2p": {
    source: "iana"
  },
  "video/mp2t": {
    source: "iana",
    extensions: [
      "ts"
    ]
  },
  "video/mp4": {
    source: "iana",
    compressible: !1,
    extensions: [
      "mp4",
      "mp4v",
      "mpg4"
    ]
  },
  "video/mp4v-es": {
    source: "iana"
  },
  "video/mpeg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "mpeg",
      "mpg",
      "mpe",
      "m1v",
      "m2v"
    ]
  },
  "video/mpeg4-generic": {
    source: "iana"
  },
  "video/mpv": {
    source: "iana"
  },
  "video/nv": {
    source: "iana"
  },
  "video/ogg": {
    source: "iana",
    compressible: !1,
    extensions: [
      "ogv"
    ]
  },
  "video/parityfec": {
    source: "iana"
  },
  "video/pointer": {
    source: "iana"
  },
  "video/quicktime": {
    source: "iana",
    compressible: !1,
    extensions: [
      "qt",
      "mov"
    ]
  },
  "video/raptorfec": {
    source: "iana"
  },
  "video/raw": {
    source: "iana"
  },
  "video/rtp-enc-aescm128": {
    source: "iana"
  },
  "video/rtploopback": {
    source: "iana"
  },
  "video/rtx": {
    source: "iana"
  },
  "video/scip": {
    source: "iana"
  },
  "video/smpte291": {
    source: "iana"
  },
  "video/smpte292m": {
    source: "iana"
  },
  "video/ulpfec": {
    source: "iana"
  },
  "video/vc1": {
    source: "iana"
  },
  "video/vc2": {
    source: "iana"
  },
  "video/vnd.cctv": {
    source: "iana"
  },
  "video/vnd.dece.hd": {
    source: "iana",
    extensions: [
      "uvh",
      "uvvh"
    ]
  },
  "video/vnd.dece.mobile": {
    source: "iana",
    extensions: [
      "uvm",
      "uvvm"
    ]
  },
  "video/vnd.dece.mp4": {
    source: "iana"
  },
  "video/vnd.dece.pd": {
    source: "iana",
    extensions: [
      "uvp",
      "uvvp"
    ]
  },
  "video/vnd.dece.sd": {
    source: "iana",
    extensions: [
      "uvs",
      "uvvs"
    ]
  },
  "video/vnd.dece.video": {
    source: "iana",
    extensions: [
      "uvv",
      "uvvv"
    ]
  },
  "video/vnd.directv.mpeg": {
    source: "iana"
  },
  "video/vnd.directv.mpeg-tts": {
    source: "iana"
  },
  "video/vnd.dlna.mpeg-tts": {
    source: "iana"
  },
  "video/vnd.dvb.file": {
    source: "iana",
    extensions: [
      "dvb"
    ]
  },
  "video/vnd.fvt": {
    source: "iana",
    extensions: [
      "fvt"
    ]
  },
  "video/vnd.hns.video": {
    source: "iana"
  },
  "video/vnd.iptvforum.1dparityfec-1010": {
    source: "iana"
  },
  "video/vnd.iptvforum.1dparityfec-2005": {
    source: "iana"
  },
  "video/vnd.iptvforum.2dparityfec-1010": {
    source: "iana"
  },
  "video/vnd.iptvforum.2dparityfec-2005": {
    source: "iana"
  },
  "video/vnd.iptvforum.ttsavc": {
    source: "iana"
  },
  "video/vnd.iptvforum.ttsmpeg2": {
    source: "iana"
  },
  "video/vnd.motorola.video": {
    source: "iana"
  },
  "video/vnd.motorola.videop": {
    source: "iana"
  },
  "video/vnd.mpegurl": {
    source: "iana",
    extensions: [
      "mxu",
      "m4u"
    ]
  },
  "video/vnd.ms-playready.media.pyv": {
    source: "iana",
    extensions: [
      "pyv"
    ]
  },
  "video/vnd.nokia.interleaved-multimedia": {
    source: "iana"
  },
  "video/vnd.nokia.mp4vr": {
    source: "iana"
  },
  "video/vnd.nokia.videovoip": {
    source: "iana"
  },
  "video/vnd.objectvideo": {
    source: "iana"
  },
  "video/vnd.radgamettools.bink": {
    source: "iana"
  },
  "video/vnd.radgamettools.smacker": {
    source: "iana"
  },
  "video/vnd.sealed.mpeg1": {
    source: "iana"
  },
  "video/vnd.sealed.mpeg4": {
    source: "iana"
  },
  "video/vnd.sealed.swf": {
    source: "iana"
  },
  "video/vnd.sealedmedia.softseal.mov": {
    source: "iana"
  },
  "video/vnd.uvvu.mp4": {
    source: "iana",
    extensions: [
      "uvu",
      "uvvu"
    ]
  },
  "video/vnd.vivo": {
    source: "iana",
    extensions: [
      "viv"
    ]
  },
  "video/vnd.youtube.yt": {
    source: "iana"
  },
  "video/vp8": {
    source: "iana"
  },
  "video/vp9": {
    source: "iana"
  },
  "video/webm": {
    source: "apache",
    compressible: !1,
    extensions: [
      "webm"
    ]
  },
  "video/x-f4v": {
    source: "apache",
    extensions: [
      "f4v"
    ]
  },
  "video/x-fli": {
    source: "apache",
    extensions: [
      "fli"
    ]
  },
  "video/x-flv": {
    source: "apache",
    compressible: !1,
    extensions: [
      "flv"
    ]
  },
  "video/x-m4v": {
    source: "apache",
    extensions: [
      "m4v"
    ]
  },
  "video/x-matroska": {
    source: "apache",
    compressible: !1,
    extensions: [
      "mkv",
      "mk3d",
      "mks"
    ]
  },
  "video/x-mng": {
    source: "apache",
    extensions: [
      "mng"
    ]
  },
  "video/x-ms-asf": {
    source: "apache",
    extensions: [
      "asf",
      "asx"
    ]
  },
  "video/x-ms-vob": {
    source: "apache",
    extensions: [
      "vob"
    ]
  },
  "video/x-ms-wm": {
    source: "apache",
    extensions: [
      "wm"
    ]
  },
  "video/x-ms-wmv": {
    source: "apache",
    compressible: !1,
    extensions: [
      "wmv"
    ]
  },
  "video/x-ms-wmx": {
    source: "apache",
    extensions: [
      "wmx"
    ]
  },
  "video/x-ms-wvx": {
    source: "apache",
    extensions: [
      "wvx"
    ]
  },
  "video/x-msvideo": {
    source: "apache",
    extensions: [
      "avi"
    ]
  },
  "video/x-sgi-movie": {
    source: "apache",
    extensions: [
      "movie"
    ]
  },
  "video/x-smv": {
    source: "apache",
    extensions: [
      "smv"
    ]
  },
  "x-conference/x-cooltalk": {
    source: "apache",
    extensions: [
      "ice"
    ]
  },
  "x-shader/x-fragment": {
    compressible: !0
  },
  "x-shader/x-vertex": {
    compressible: !0
  }
};
/*!
 * mime-db
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015-2022 Douglas Christopher Wilson
 * MIT Licensed
 */
var H0 = G0;
/*!
 * mime-types
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */
(function(t) {
  var e = H0, n = Ce.extname, i = /^\s*([^;\s]*)(?:;|\s|$)/, r = /^text\//i;
  t.charset = s, t.charsets = { lookup: s }, t.contentType = a, t.extension = o, t.extensions = /* @__PURE__ */ Object.create(null), t.lookup = c, t.types = /* @__PURE__ */ Object.create(null), l(t.extensions, t.types);
  function s(u) {
    if (!u || typeof u != "string")
      return !1;
    var p = i.exec(u), d = p && e[p[1].toLowerCase()];
    return d && d.charset ? d.charset : p && r.test(p[1]) ? "UTF-8" : !1;
  }
  function a(u) {
    if (!u || typeof u != "string")
      return !1;
    var p = u.indexOf("/") === -1 ? t.lookup(u) : u;
    if (!p)
      return !1;
    if (p.indexOf("charset") === -1) {
      var d = t.charset(p);
      d && (p += "; charset=" + d.toLowerCase());
    }
    return p;
  }
  function o(u) {
    if (!u || typeof u != "string")
      return !1;
    var p = i.exec(u), d = p && t.extensions[p[1].toLowerCase()];
    return !d || !d.length ? !1 : d[0];
  }
  function c(u) {
    if (!u || typeof u != "string")
      return !1;
    var p = n("x." + u).toLowerCase().substr(1);
    return p && t.types[p] || !1;
  }
  function l(u, p) {
    var d = ["nginx", "apache", void 0, "iana"];
    Object.keys(e).forEach(function(x) {
      var v = e[x], y = v.extensions;
      if (!(!y || !y.length)) {
        u[x] = y;
        for (var f = 0; f < y.length; f++) {
          var h = y[f];
          if (p[h]) {
            var g = d.indexOf(e[p[h]].source), A = d.indexOf(v.source);
            if (p[h] !== "application/octet-stream" && (g > A || g === A && p[h].substr(0, 12) === "application/"))
              continue;
          }
          p[h] = x;
        }
      }
    });
  }
})(sb);
var V0 = K0;
function K0(t) {
  var e = typeof setImmediate == "function" ? setImmediate : typeof process == "object" && typeof process.nextTick == "function" ? process.nextTick : null;
  e ? e(t) : setTimeout(t, 0);
}
var Dd = V0, ab = Y0;
function Y0(t) {
  var e = !1;
  return Dd(function() {
    e = !0;
  }), function(i, r) {
    e ? t(i, r) : Dd(function() {
      t(i, r);
    });
  };
}
var ob = Z0;
function Z0(t) {
  Object.keys(t.jobs).forEach(X0.bind(t)), t.jobs = {};
}
function X0(t) {
  typeof this.jobs[t] == "function" && this.jobs[t]();
}
var jd = ab, J0 = ob, cb = Q0;
function Q0(t, e, n, i) {
  var r = n.keyedList ? n.keyedList[n.index] : n.index;
  n.jobs[r] = eS(e, r, t[r], function(s, a) {
    r in n.jobs && (delete n.jobs[r], s ? J0(n) : n.results[r] = a, i(s, n.results));
  });
}
function eS(t, e, n, i) {
  var r;
  return t.length == 2 ? r = t(n, jd(i)) : r = t(n, e, jd(i)), r;
}
var lb = tS;
function tS(t, e) {
  var n = !Array.isArray(t), i = {
    index: 0,
    keyedList: n || e ? Object.keys(t) : null,
    jobs: {},
    results: n ? {} : [],
    size: n ? Object.keys(t).length : t.length
  };
  return e && i.keyedList.sort(n ? e : function(r, s) {
    return e(t[r], t[s]);
  }), i;
}
var nS = ob, iS = ab, ub = rS;
function rS(t) {
  Object.keys(this.jobs).length && (this.index = this.size, nS(this), iS(t)(null, this.results));
}
var sS = cb, aS = lb, oS = ub, cS = lS;
function lS(t, e, n) {
  for (var i = aS(t); i.index < (i.keyedList || t).length; )
    sS(t, e, i, function(r, s) {
      if (r) {
        n(r, s);
        return;
      }
      if (Object.keys(i.jobs).length === 0) {
        n(null, i.results);
        return;
      }
    }), i.index++;
  return oS.bind(i, n);
}
var jc = { exports: {} }, Ld = cb, uS = lb, pS = ub;
jc.exports = fS;
jc.exports.ascending = pb;
jc.exports.descending = dS;
function fS(t, e, n, i) {
  var r = uS(t, n);
  return Ld(t, e, r, function s(a, o) {
    if (a) {
      i(a, o);
      return;
    }
    if (r.index++, r.index < (r.keyedList || t).length) {
      Ld(t, e, r, s);
      return;
    }
    i(null, r.results);
  }), pS.bind(r, i);
}
function pb(t, e) {
  return t < e ? -1 : t > e ? 1 : 0;
}
function dS(t, e) {
  return -1 * pb(t, e);
}
var fb = jc.exports, hS = fb, mS = gS;
function gS(t, e, n) {
  return hS(t, e, null, n);
}
var bS = {
  parallel: cS,
  serial: mS,
  serialOrdered: fb
}, db = Object, yS = Error, vS = EvalError, xS = RangeError, wS = ReferenceError, _S = SyntaxError, El, Nd;
function nf() {
  return Nd || (Nd = 1, El = TypeError), El;
}
var SS = URIError, ES = Math.abs, AS = Math.floor, TS = Math.max, RS = Math.min, OS = Math.pow, PS = Math.round, CS = Number.isNaN || function(e) {
  return e !== e;
}, kS = CS, IS = function(e) {
  return kS(e) || e === 0 ? e : e < 0 ? -1 : 1;
}, DS = Object.getOwnPropertyDescriptor, Co = DS;
if (Co)
  try {
    Co([], "length");
  } catch {
    Co = null;
  }
var hb = Co, ko = Object.defineProperty || !1;
if (ko)
  try {
    ko({}, "a", { value: 1 });
  } catch {
    ko = !1;
  }
var jS = ko, Al, Fd;
function mb() {
  return Fd || (Fd = 1, Al = function() {
    if (typeof Symbol != "function" || typeof Object.getOwnPropertySymbols != "function")
      return !1;
    if (typeof Symbol.iterator == "symbol")
      return !0;
    var e = {}, n = Symbol("test"), i = Object(n);
    if (typeof n == "string" || Object.prototype.toString.call(n) !== "[object Symbol]" || Object.prototype.toString.call(i) !== "[object Symbol]")
      return !1;
    var r = 42;
    e[n] = r;
    for (var s in e)
      return !1;
    if (typeof Object.keys == "function" && Object.keys(e).length !== 0 || typeof Object.getOwnPropertyNames == "function" && Object.getOwnPropertyNames(e).length !== 0)
      return !1;
    var a = Object.getOwnPropertySymbols(e);
    if (a.length !== 1 || a[0] !== n || !Object.prototype.propertyIsEnumerable.call(e, n))
      return !1;
    if (typeof Object.getOwnPropertyDescriptor == "function") {
      var o = (
        /** @type {PropertyDescriptor} */
        Object.getOwnPropertyDescriptor(e, n)
      );
      if (o.value !== r || o.enumerable !== !0)
        return !1;
    }
    return !0;
  }), Al;
}
var Tl, Md;
function LS() {
  if (Md) return Tl;
  Md = 1;
  var t = typeof Symbol < "u" && Symbol, e = mb();
  return Tl = function() {
    return typeof t != "function" || typeof Symbol != "function" || typeof t("foo") != "symbol" || typeof Symbol("bar") != "symbol" ? !1 : e();
  }, Tl;
}
var Rl, $d;
function gb() {
  return $d || ($d = 1, Rl = typeof Reflect < "u" && Reflect.getPrototypeOf || null), Rl;
}
var Ol, Bd;
function bb() {
  if (Bd) return Ol;
  Bd = 1;
  var t = db;
  return Ol = t.getPrototypeOf || null, Ol;
}
var NS = "Function.prototype.bind called on incompatible ", FS = Object.prototype.toString, MS = Math.max, $S = "[object Function]", Ud = function(e, n) {
  for (var i = [], r = 0; r < e.length; r += 1)
    i[r] = e[r];
  for (var s = 0; s < n.length; s += 1)
    i[s + e.length] = n[s];
  return i;
}, BS = function(e, n) {
  for (var i = [], r = n, s = 0; r < e.length; r += 1, s += 1)
    i[s] = e[r];
  return i;
}, US = function(t, e) {
  for (var n = "", i = 0; i < t.length; i += 1)
    n += t[i], i + 1 < t.length && (n += e);
  return n;
}, zS = function(e) {
  var n = this;
  if (typeof n != "function" || FS.apply(n) !== $S)
    throw new TypeError(NS + n);
  for (var i = BS(arguments, 1), r, s = function() {
    if (this instanceof r) {
      var u = n.apply(
        this,
        Ud(i, arguments)
      );
      return Object(u) === u ? u : this;
    }
    return n.apply(
      e,
      Ud(i, arguments)
    );
  }, a = MS(0, n.length - i.length), o = [], c = 0; c < a; c++)
    o[c] = "$" + c;
  if (r = Function("binder", "return function (" + US(o, ",") + "){ return binder.apply(this,arguments); }")(s), n.prototype) {
    var l = function() {
    };
    l.prototype = n.prototype, r.prototype = new l(), l.prototype = null;
  }
  return r;
}, WS = zS, Lc = Function.prototype.bind || WS, Pl, zd;
function rf() {
  return zd || (zd = 1, Pl = Function.prototype.call), Pl;
}
var Cl, Wd;
function yb() {
  return Wd || (Wd = 1, Cl = Function.prototype.apply), Cl;
}
var kl, qd;
function qS() {
  return qd || (qd = 1, kl = typeof Reflect < "u" && Reflect && Reflect.apply), kl;
}
var Il, Gd;
function GS() {
  if (Gd) return Il;
  Gd = 1;
  var t = Lc, e = yb(), n = rf(), i = qS();
  return Il = i || t.call(n, e), Il;
}
var Dl, Hd;
function HS() {
  if (Hd) return Dl;
  Hd = 1;
  var t = Lc, e = nf(), n = rf(), i = GS();
  return Dl = function(s) {
    if (s.length < 1 || typeof s[0] != "function")
      throw new e("a function is required");
    return i(t, n, s);
  }, Dl;
}
var jl, Vd;
function VS() {
  if (Vd) return jl;
  Vd = 1;
  var t = HS(), e = hb, n;
  try {
    n = /** @type {{ __proto__?: typeof Array.prototype }} */
    [].__proto__ === Array.prototype;
  } catch (a) {
    if (!a || typeof a != "object" || !("code" in a) || a.code !== "ERR_PROTO_ACCESS")
      throw a;
  }
  var i = !!n && e && e(
    Object.prototype,
    /** @type {keyof typeof Object.prototype} */
    "__proto__"
  ), r = Object, s = r.getPrototypeOf;
  return jl = i && typeof i.get == "function" ? t([i.get]) : typeof s == "function" ? (
    /** @type {import('./get')} */
    function(o) {
      return s(o == null ? o : r(o));
    }
  ) : !1, jl;
}
var Ll, Kd;
function KS() {
  if (Kd) return Ll;
  Kd = 1;
  var t = gb(), e = bb(), n = VS();
  return Ll = t ? function(r) {
    return t(r);
  } : e ? function(r) {
    if (!r || typeof r != "object" && typeof r != "function")
      throw new TypeError("getProto: not an object");
    return e(r);
  } : n ? function(r) {
    return n(r);
  } : null, Ll;
}
var YS = Function.prototype.call, ZS = Object.prototype.hasOwnProperty, XS = Lc, sf = XS.call(YS, ZS), Be, JS = db, QS = yS, eE = vS, tE = xS, nE = wS, Yr = _S, Dr = nf(), iE = SS, rE = ES, sE = AS, aE = TS, oE = RS, cE = OS, lE = PS, uE = IS, vb = Function, Nl = function(t) {
  try {
    return vb('"use strict"; return (' + t + ").constructor;")();
  } catch {
  }
}, $s = hb, pE = jS, Fl = function() {
  throw new Dr();
}, fE = $s ? function() {
  try {
    return arguments.callee, Fl;
  } catch {
    try {
      return $s(arguments, "callee").get;
    } catch {
      return Fl;
    }
  }
}() : Fl, _r = LS()(), Tt = KS(), dE = bb(), hE = gb(), xb = yb(), Pa = rf(), Or = {}, mE = typeof Uint8Array > "u" || !Tt ? Be : Tt(Uint8Array), rr = {
  __proto__: null,
  "%AggregateError%": typeof AggregateError > "u" ? Be : AggregateError,
  "%Array%": Array,
  "%ArrayBuffer%": typeof ArrayBuffer > "u" ? Be : ArrayBuffer,
  "%ArrayIteratorPrototype%": _r && Tt ? Tt([][Symbol.iterator]()) : Be,
  "%AsyncFromSyncIteratorPrototype%": Be,
  "%AsyncFunction%": Or,
  "%AsyncGenerator%": Or,
  "%AsyncGeneratorFunction%": Or,
  "%AsyncIteratorPrototype%": Or,
  "%Atomics%": typeof Atomics > "u" ? Be : Atomics,
  "%BigInt%": typeof BigInt > "u" ? Be : BigInt,
  "%BigInt64Array%": typeof BigInt64Array > "u" ? Be : BigInt64Array,
  "%BigUint64Array%": typeof BigUint64Array > "u" ? Be : BigUint64Array,
  "%Boolean%": Boolean,
  "%DataView%": typeof DataView > "u" ? Be : DataView,
  "%Date%": Date,
  "%decodeURI%": decodeURI,
  "%decodeURIComponent%": decodeURIComponent,
  "%encodeURI%": encodeURI,
  "%encodeURIComponent%": encodeURIComponent,
  "%Error%": QS,
  "%eval%": eval,
  // eslint-disable-line no-eval
  "%EvalError%": eE,
  "%Float16Array%": typeof Float16Array > "u" ? Be : Float16Array,
  "%Float32Array%": typeof Float32Array > "u" ? Be : Float32Array,
  "%Float64Array%": typeof Float64Array > "u" ? Be : Float64Array,
  "%FinalizationRegistry%": typeof FinalizationRegistry > "u" ? Be : FinalizationRegistry,
  "%Function%": vb,
  "%GeneratorFunction%": Or,
  "%Int8Array%": typeof Int8Array > "u" ? Be : Int8Array,
  "%Int16Array%": typeof Int16Array > "u" ? Be : Int16Array,
  "%Int32Array%": typeof Int32Array > "u" ? Be : Int32Array,
  "%isFinite%": isFinite,
  "%isNaN%": isNaN,
  "%IteratorPrototype%": _r && Tt ? Tt(Tt([][Symbol.iterator]())) : Be,
  "%JSON%": typeof JSON == "object" ? JSON : Be,
  "%Map%": typeof Map > "u" ? Be : Map,
  "%MapIteratorPrototype%": typeof Map > "u" || !_r || !Tt ? Be : Tt((/* @__PURE__ */ new Map())[Symbol.iterator]()),
  "%Math%": Math,
  "%Number%": Number,
  "%Object%": JS,
  "%Object.getOwnPropertyDescriptor%": $s,
  "%parseFloat%": parseFloat,
  "%parseInt%": parseInt,
  "%Promise%": typeof Promise > "u" ? Be : Promise,
  "%Proxy%": typeof Proxy > "u" ? Be : Proxy,
  "%RangeError%": tE,
  "%ReferenceError%": nE,
  "%Reflect%": typeof Reflect > "u" ? Be : Reflect,
  "%RegExp%": RegExp,
  "%Set%": typeof Set > "u" ? Be : Set,
  "%SetIteratorPrototype%": typeof Set > "u" || !_r || !Tt ? Be : Tt((/* @__PURE__ */ new Set())[Symbol.iterator]()),
  "%SharedArrayBuffer%": typeof SharedArrayBuffer > "u" ? Be : SharedArrayBuffer,
  "%String%": String,
  "%StringIteratorPrototype%": _r && Tt ? Tt(""[Symbol.iterator]()) : Be,
  "%Symbol%": _r ? Symbol : Be,
  "%SyntaxError%": Yr,
  "%ThrowTypeError%": fE,
  "%TypedArray%": mE,
  "%TypeError%": Dr,
  "%Uint8Array%": typeof Uint8Array > "u" ? Be : Uint8Array,
  "%Uint8ClampedArray%": typeof Uint8ClampedArray > "u" ? Be : Uint8ClampedArray,
  "%Uint16Array%": typeof Uint16Array > "u" ? Be : Uint16Array,
  "%Uint32Array%": typeof Uint32Array > "u" ? Be : Uint32Array,
  "%URIError%": iE,
  "%WeakMap%": typeof WeakMap > "u" ? Be : WeakMap,
  "%WeakRef%": typeof WeakRef > "u" ? Be : WeakRef,
  "%WeakSet%": typeof WeakSet > "u" ? Be : WeakSet,
  "%Function.prototype.call%": Pa,
  "%Function.prototype.apply%": xb,
  "%Object.defineProperty%": pE,
  "%Object.getPrototypeOf%": dE,
  "%Math.abs%": rE,
  "%Math.floor%": sE,
  "%Math.max%": aE,
  "%Math.min%": oE,
  "%Math.pow%": cE,
  "%Math.round%": lE,
  "%Math.sign%": uE,
  "%Reflect.getPrototypeOf%": hE
};
if (Tt)
  try {
    null.error;
  } catch (t) {
    var gE = Tt(Tt(t));
    rr["%Error.prototype%"] = gE;
  }
var bE = function t(e) {
  var n;
  if (e === "%AsyncFunction%")
    n = Nl("async function () {}");
  else if (e === "%GeneratorFunction%")
    n = Nl("function* () {}");
  else if (e === "%AsyncGeneratorFunction%")
    n = Nl("async function* () {}");
  else if (e === "%AsyncGenerator%") {
    var i = t("%AsyncGeneratorFunction%");
    i && (n = i.prototype);
  } else if (e === "%AsyncIteratorPrototype%") {
    var r = t("%AsyncGenerator%");
    r && Tt && (n = Tt(r.prototype));
  }
  return rr[e] = n, n;
}, Yd = {
  __proto__: null,
  "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
  "%ArrayPrototype%": ["Array", "prototype"],
  "%ArrayProto_entries%": ["Array", "prototype", "entries"],
  "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
  "%ArrayProto_keys%": ["Array", "prototype", "keys"],
  "%ArrayProto_values%": ["Array", "prototype", "values"],
  "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
  "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
  "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
  "%BooleanPrototype%": ["Boolean", "prototype"],
  "%DataViewPrototype%": ["DataView", "prototype"],
  "%DatePrototype%": ["Date", "prototype"],
  "%ErrorPrototype%": ["Error", "prototype"],
  "%EvalErrorPrototype%": ["EvalError", "prototype"],
  "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
  "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
  "%FunctionPrototype%": ["Function", "prototype"],
  "%Generator%": ["GeneratorFunction", "prototype"],
  "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
  "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
  "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
  "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
  "%JSONParse%": ["JSON", "parse"],
  "%JSONStringify%": ["JSON", "stringify"],
  "%MapPrototype%": ["Map", "prototype"],
  "%NumberPrototype%": ["Number", "prototype"],
  "%ObjectPrototype%": ["Object", "prototype"],
  "%ObjProto_toString%": ["Object", "prototype", "toString"],
  "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
  "%PromisePrototype%": ["Promise", "prototype"],
  "%PromiseProto_then%": ["Promise", "prototype", "then"],
  "%Promise_all%": ["Promise", "all"],
  "%Promise_reject%": ["Promise", "reject"],
  "%Promise_resolve%": ["Promise", "resolve"],
  "%RangeErrorPrototype%": ["RangeError", "prototype"],
  "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
  "%RegExpPrototype%": ["RegExp", "prototype"],
  "%SetPrototype%": ["Set", "prototype"],
  "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
  "%StringPrototype%": ["String", "prototype"],
  "%SymbolPrototype%": ["Symbol", "prototype"],
  "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
  "%TypedArrayPrototype%": ["TypedArray", "prototype"],
  "%TypeErrorPrototype%": ["TypeError", "prototype"],
  "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
  "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
  "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
  "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
  "%URIErrorPrototype%": ["URIError", "prototype"],
  "%WeakMapPrototype%": ["WeakMap", "prototype"],
  "%WeakSetPrototype%": ["WeakSet", "prototype"]
}, Ca = Lc, Zo = sf, yE = Ca.call(Pa, Array.prototype.concat), vE = Ca.call(xb, Array.prototype.splice), Zd = Ca.call(Pa, String.prototype.replace), Xo = Ca.call(Pa, String.prototype.slice), xE = Ca.call(Pa, RegExp.prototype.exec), wE = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g, _E = /\\(\\)?/g, SE = function(e) {
  var n = Xo(e, 0, 1), i = Xo(e, -1);
  if (n === "%" && i !== "%")
    throw new Yr("invalid intrinsic syntax, expected closing `%`");
  if (i === "%" && n !== "%")
    throw new Yr("invalid intrinsic syntax, expected opening `%`");
  var r = [];
  return Zd(e, wE, function(s, a, o, c) {
    r[r.length] = o ? Zd(c, _E, "$1") : a || s;
  }), r;
}, EE = function(e, n) {
  var i = e, r;
  if (Zo(Yd, i) && (r = Yd[i], i = "%" + r[0] + "%"), Zo(rr, i)) {
    var s = rr[i];
    if (s === Or && (s = bE(i)), typeof s > "u" && !n)
      throw new Dr("intrinsic " + e + " exists, but is not available. Please file an issue!");
    return {
      alias: r,
      name: i,
      value: s
    };
  }
  throw new Yr("intrinsic " + e + " does not exist!");
}, AE = function(e, n) {
  if (typeof e != "string" || e.length === 0)
    throw new Dr("intrinsic name must be a non-empty string");
  if (arguments.length > 1 && typeof n != "boolean")
    throw new Dr('"allowMissing" argument must be a boolean');
  if (xE(/^%?[^%]*%?$/, e) === null)
    throw new Yr("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
  var i = SE(e), r = i.length > 0 ? i[0] : "", s = EE("%" + r + "%", n), a = s.name, o = s.value, c = !1, l = s.alias;
  l && (r = l[0], vE(i, yE([0, 1], l)));
  for (var u = 1, p = !0; u < i.length; u += 1) {
    var d = i[u], b = Xo(d, 0, 1), x = Xo(d, -1);
    if ((b === '"' || b === "'" || b === "`" || x === '"' || x === "'" || x === "`") && b !== x)
      throw new Yr("property names with quotes must have matching quotes");
    if ((d === "constructor" || !p) && (c = !0), r += "." + d, a = "%" + r + "%", Zo(rr, a))
      o = rr[a];
    else if (o != null) {
      if (!(d in o)) {
        if (!n)
          throw new Dr("base intrinsic for " + e + " exists, but the property is not available.");
        return;
      }
      if ($s && u + 1 >= i.length) {
        var v = $s(o, d);
        p = !!v, p && "get" in v && !("originalValue" in v.get) ? o = v.get : o = o[d];
      } else
        p = Zo(o, d), o = o[d];
      p && !c && (rr[a] = o);
    }
  }
  return o;
}, Ml, Xd;
function TE() {
  if (Xd) return Ml;
  Xd = 1;
  var t = mb();
  return Ml = function() {
    return t() && !!Symbol.toStringTag;
  }, Ml;
}
var RE = AE, Jd = RE("%Object.defineProperty%", !0), OE = TE()(), PE = sf, CE = nf(), io = OE ? Symbol.toStringTag : null, kE = function(e, n) {
  var i = arguments.length > 2 && !!arguments[2] && arguments[2].force, r = arguments.length > 2 && !!arguments[2] && arguments[2].nonConfigurable;
  if (typeof i < "u" && typeof i != "boolean" || typeof r < "u" && typeof r != "boolean")
    throw new CE("if provided, the `overrideIfSet` and `nonConfigurable` options must be booleans");
  io && (i || !PE(e, io)) && (Jd ? Jd(e, io, {
    configurable: !r,
    enumerable: !1,
    value: n,
    writable: !1
  }) : e[io] = n);
}, IE = function(t, e) {
  return Object.keys(e).forEach(function(n) {
    t[n] = t[n] || e[n];
  }), t;
}, af = q0, DE = xt, $l = Ce, jE = ss, LE = as, NE = kc.parse, FE = dt, ME = nt.Stream, $E = Xp, Bl = sb, BE = bS, UE = kE, xi = sf, np = IE;
function wb(t) {
  return String(t).replace(/\r/g, "%0D").replace(/\n/g, "%0A").replace(/"/g, "%22");
}
function ze(t) {
  if (!(this instanceof ze))
    return new ze(t);
  this._overheadLength = 0, this._valueLength = 0, this._valuesToMeasure = [], af.call(this), t = t || {};
  for (var e in t)
    this[e] = t[e];
}
DE.inherits(ze, af);
ze.LINE_BREAK = `\r
`;
ze.DEFAULT_CONTENT_TYPE = "application/octet-stream";
ze.prototype.append = function(t, e, n) {
  n = n || {}, typeof n == "string" && (n = { filename: n });
  var i = af.prototype.append.bind(this);
  if ((typeof e == "number" || e == null) && (e = String(e)), Array.isArray(e)) {
    this._error(new Error("Arrays are not supported."));
    return;
  }
  var r = this._multiPartHeader(t, e, n), s = this._multiPartFooter();
  i(r), i(e), i(s), this._trackLength(r, e, n);
};
ze.prototype._trackLength = function(t, e, n) {
  var i = 0;
  n.knownLength != null ? i += Number(n.knownLength) : Buffer.isBuffer(e) ? i = e.length : typeof e == "string" && (i = Buffer.byteLength(e)), this._valueLength += i, this._overheadLength += Buffer.byteLength(t) + ze.LINE_BREAK.length, !(!e || !e.path && !(e.readable && xi(e, "httpVersion")) && !(e instanceof ME)) && (n.knownLength || this._valuesToMeasure.push(e));
};
ze.prototype._lengthRetriever = function(t, e) {
  xi(t, "fd") ? t.end != null && t.end != 1 / 0 && t.start != null ? e(null, t.end + 1 - (t.start ? t.start : 0)) : FE.stat(t.path, function(n, i) {
    if (n) {
      e(n);
      return;
    }
    var r = i.size - (t.start ? t.start : 0);
    e(null, r);
  }) : xi(t, "httpVersion") ? e(null, Number(t.headers["content-length"])) : xi(t, "httpModule") ? (t.on("response", function(n) {
    t.pause(), e(null, Number(n.headers["content-length"]));
  }), t.resume()) : e("Unknown stream");
};
ze.prototype._multiPartHeader = function(t, e, n) {
  if (typeof n.header == "string")
    return n.header;
  var i = this._getContentDisposition(e, n), r = this._getContentType(e, n), s = "", a = {
    // add custom disposition as third element or keep it two elements if not
    "Content-Disposition": ["form-data", 'name="' + wb(t) + '"'].concat(i || []),
    // if no content type. allow it to be empty array
    "Content-Type": [].concat(r || [])
  };
  typeof n.header == "object" && np(a, n.header);
  var o;
  for (var c in a)
    if (xi(a, c)) {
      if (o = a[c], o == null)
        continue;
      Array.isArray(o) || (o = [o]), o.length && (s += c + ": " + o.join("; ") + ze.LINE_BREAK);
    }
  return "--" + this.getBoundary() + ze.LINE_BREAK + s + ze.LINE_BREAK;
};
ze.prototype._getContentDisposition = function(t, e) {
  var n;
  if (typeof e.filepath == "string" ? n = $l.normalize(e.filepath).replace(/\\/g, "/") : e.filename || t && (t.name || t.path) ? n = $l.basename(e.filename || t && (t.name || t.path)) : t && t.readable && xi(t, "httpVersion") && (n = $l.basename(t.client._httpMessage.path || "")), n)
    return 'filename="' + wb(n) + '"';
};
ze.prototype._getContentType = function(t, e) {
  var n = e.contentType;
  return !n && t && t.name && (n = Bl.lookup(t.name)), !n && t && t.path && (n = Bl.lookup(t.path)), !n && t && t.readable && xi(t, "httpVersion") && (n = t.headers["content-type"]), !n && (e.filepath || e.filename) && (n = Bl.lookup(e.filepath || e.filename)), !n && t && typeof t == "object" && (n = ze.DEFAULT_CONTENT_TYPE), n;
};
ze.prototype._multiPartFooter = function() {
  return (function(t) {
    var e = ze.LINE_BREAK, n = this._streams.length === 0;
    n && (e += this._lastBoundary()), t(e);
  }).bind(this);
};
ze.prototype._lastBoundary = function() {
  return "--" + this.getBoundary() + "--" + ze.LINE_BREAK;
};
ze.prototype.getHeaders = function(t) {
  var e, n = {
    "content-type": "multipart/form-data; boundary=" + this.getBoundary()
  };
  for (e in t)
    xi(t, e) && (n[e.toLowerCase()] = t[e]);
  return n;
};
ze.prototype.setBoundary = function(t) {
  if (typeof t != "string")
    throw new TypeError("FormData boundary must be a string");
  this._boundary = t;
};
ze.prototype.getBoundary = function() {
  return this._boundary || this._generateBoundary(), this._boundary;
};
ze.prototype.getBuffer = function() {
  for (var t = new Buffer.alloc(0), e = this.getBoundary(), n = 0, i = this._streams.length; n < i; n++)
    typeof this._streams[n] != "function" && (Buffer.isBuffer(this._streams[n]) ? t = Buffer.concat([t, this._streams[n]]) : t = Buffer.concat([t, Buffer.from(this._streams[n])]), (typeof this._streams[n] != "string" || this._streams[n].substring(2, e.length + 2) !== e) && (t = Buffer.concat([t, Buffer.from(ze.LINE_BREAK)])));
  return Buffer.concat([t, Buffer.from(this._lastBoundary())]);
};
ze.prototype._generateBoundary = function() {
  this._boundary = "--------------------------" + $E.randomBytes(12).toString("hex");
};
ze.prototype.getLengthSync = function() {
  var t = this._overheadLength + this._valueLength;
  return this._streams.length && (t += this._lastBoundary().length), this.hasKnownLength() || this._error(new Error("Cannot calculate proper length in synchronous way.")), t;
};
ze.prototype.hasKnownLength = function() {
  var t = !0;
  return this._valuesToMeasure.length && (t = !1), t;
};
ze.prototype.getLength = function(t) {
  var e = this._overheadLength + this._valueLength;
  if (this._streams.length && (e += this._lastBoundary().length), !this._valuesToMeasure.length) {
    process.nextTick(t.bind(this, null, e));
    return;
  }
  BE.parallel(this._valuesToMeasure, this._lengthRetriever, function(n, i) {
    if (n) {
      t(n);
      return;
    }
    i.forEach(function(r) {
      e += r;
    }), t(null, e);
  });
};
ze.prototype.submit = function(t, e) {
  var n, i, r = { method: "post" };
  return typeof t == "string" ? (t = NE(t), i = np({
    port: t.port,
    path: t.pathname,
    host: t.hostname,
    protocol: t.protocol
  }, r)) : (i = np(t, r), i.port || (i.port = i.protocol === "https:" ? 443 : 80)), i.headers = this.getHeaders(t.headers), i.protocol === "https:" ? n = LE.request(i) : n = jE.request(i), this.getLength((function(s, a) {
    if (s && s !== "Unknown stream") {
      this._error(s);
      return;
    }
    if (a && n.setHeader("Content-Length", a), this.pipe(n), e) {
      var o, c = function(l, u) {
        return n.removeListener("error", c), n.removeListener("response", o), e.call(this, l, u);
      };
      o = c.bind(this, null), n.on("error", c), n.on("response", o);
    }
  }).bind(this)), n;
};
ze.prototype._error = function(t) {
  this.error || (this.error = t, this.pause(), this.emit("error", t));
};
ze.prototype.toString = function() {
  return "[object FormData]";
};
UE(ze.prototype, "FormData");
var zE = ze;
const Bs = /* @__PURE__ */ Dc(zE), Ul = {
  isBufferAvailable() {
    return typeof Buffer < "u";
  },
  from(t) {
    return Buffer.from(t);
  }
}, _b = 100;
function ip(t) {
  return F.isPlainObject(t) || F.isArray(t);
}
function Sb(t) {
  return F.endsWith(t, "[]") ? t.slice(0, -2) : t;
}
function zl(t, e, n) {
  return t ? t.concat(e).map(function(r, s) {
    return r = Sb(r), !n && s ? "[" + r + "]" : r;
  }).join(n ? "." : "") : e;
}
function WE(t) {
  return F.isArray(t) && !t.some(ip);
}
const qE = F.toFlatObject(F, {}, null, function(e) {
  return /^is[A-Z]/.test(e);
});
function Nc(t, e, n) {
  if (!F.isObject(t))
    throw new TypeError("target must be an object");
  e = e || new (Bs || FormData)(), n = F.toFlatObject(
    n,
    {
      metaTokens: !0,
      dots: !1,
      indexes: !1
    },
    !1,
    function(h, g) {
      return !F.isUndefined(g[h]);
    }
  );
  const i = n.metaTokens, r = n.visitor || x, s = n.dots, a = n.indexes, o = n.Blob || typeof Blob < "u" && Blob, c = n.maxDepth === void 0 ? _b : n.maxDepth, l = o && F.isSpecCompliantForm(e), u = [];
  if (!F.isFunction(r))
    throw new TypeError("visitor must be a function");
  function p(f) {
    if (f === null) return "";
    if (F.isDate(f))
      return f.toISOString();
    if (F.isBoolean(f))
      return f.toString();
    if (!l && F.isBlob(f))
      throw new ce("Blob is not supported. Use a Buffer instead.");
    if (F.isArrayBuffer(f) || F.isTypedArray(f)) {
      if (l && typeof o == "function")
        return new o([f]);
      if (Ul && Ul.isBufferAvailable())
        return Ul.from(f);
      throw new ce("Blob is not supported. Use a Buffer instead.", ce.ERR_NOT_SUPPORT);
    }
    return f;
  }
  function d(f) {
    if (f > c)
      throw new ce(
        "Object is too deeply nested (" + f + " levels). Max depth: " + c,
        ce.ERR_FORM_DATA_DEPTH_EXCEEDED
      );
  }
  function b(f, h) {
    if (c === 1 / 0)
      return JSON.stringify(f);
    const g = [];
    return JSON.stringify(f, function(C, V) {
      if (!F.isObject(V))
        return V;
      for (; g.length && g[g.length - 1] !== this; )
        g.pop();
      return g.push(V), d(h + g.length - 1), V;
    });
  }
  function x(f, h, g) {
    let A = f;
    if (F.isReactNative(e) && F.isReactNativeBlob(f))
      return e.append(zl(g, h, s), p(f)), !1;
    if (f && !g && typeof f == "object") {
      if (F.endsWith(h, "{}"))
        h = i ? h : h.slice(0, -2), f = b(f, 1);
      else if (F.isArray(f) && WE(f) || (F.isFileList(f) || F.endsWith(h, "[]")) && (A = F.toArray(f)))
        return h = Sb(h), A.forEach(function(V, K) {
          !(F.isUndefined(V) || V === null) && e.append(
            // eslint-disable-next-line no-nested-ternary
            a === !0 ? zl([h], K, s) : a === null ? h : h + "[]",
            p(V)
          );
        }), !1;
    }
    return ip(f) ? !0 : (e.append(zl(g, h, s), p(f)), !1);
  }
  const v = Object.assign(qE, {
    defaultVisitor: x,
    convertValue: p,
    isVisitable: ip
  });
  function y(f, h, g = 0) {
    if (!F.isUndefined(f)) {
      if (d(g), u.indexOf(f) !== -1)
        throw new Error("Circular reference detected in " + h.join("."));
      u.push(f), F.forEach(f, function(C, V) {
        (!(F.isUndefined(C) || C === null) && r.call(e, C, F.isString(V) ? V.trim() : V, h, v)) === !0 && y(C, h ? h.concat(V) : [V], g + 1);
      }), u.pop();
    }
  }
  if (!F.isObject(t))
    throw new TypeError("data must be an object");
  return y(t), e;
}
function Qd(t) {
  const e = {
    "!": "%21",
    "'": "%27",
    "(": "%28",
    ")": "%29",
    "~": "%7E",
    "%20": "+"
  };
  return encodeURIComponent(t).replace(/[!'()~]|%20/g, function(i) {
    return e[i];
  });
}
function Eb(t, e) {
  this._pairs = [], t && Nc(t, this, e);
}
const Ab = Eb.prototype;
Ab.append = function(e, n) {
  this._pairs.push([e, n]);
};
Ab.toString = function(e) {
  const n = e ? (i) => e.call(this, i, Qd) : Qd;
  return this._pairs.map(function(r) {
    return n(r[0]) + "=" + n(r[1]);
  }, "").join("&");
};
function GE(t) {
  return encodeURIComponent(t).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+");
}
function of(t, e, n) {
  if (!e)
    return t;
  t = t || "";
  const i = F.isFunction(n) ? {
    serialize: n
  } : n, r = F.getSafeProp(i, "encode") || GE, s = F.getSafeProp(i, "serialize");
  let a;
  if (s ? a = s(e, i) : a = F.isURLSearchParams(e) ? e.toString() : new Eb(e, i).toString(r), a) {
    const o = t.indexOf("#");
    o !== -1 && (t = t.slice(0, o)), t += (t.indexOf("?") === -1 ? "?" : "&") + a;
  }
  return t;
}
class eh {
  constructor() {
    this.handlers = [];
  }
  /**
   * Add a new interceptor to the stack
   *
   * @param {Function} fulfilled The function to handle `then` for a `Promise`
   * @param {Function} rejected The function to handle `reject` for a `Promise`
   * @param {Object} options The options for the interceptor, synchronous and runWhen
   *
   * @return {Number} An ID used to remove interceptor later
   */
  use(e, n, i) {
    return this.handlers.push({
      fulfilled: e,
      rejected: n,
      synchronous: i ? i.synchronous : !1,
      runWhen: i ? i.runWhen : null
    }), this.handlers.length - 1;
  }
  /**
   * Remove an interceptor from the stack
   *
   * @param {Number} id The ID that was returned by `use`
   *
   * @returns {void}
   */
  eject(e) {
    this.handlers[e] && (this.handlers[e] = null);
  }
  /**
   * Clear all interceptors from the stack
   *
   * @returns {void}
   */
  clear() {
    this.handlers && (this.handlers = []);
  }
  /**
   * Iterate over all the registered interceptors
   *
   * This method is particularly useful for skipping over any
   * interceptors that may have become `null` calling `eject`.
   *
   * @param {Function} fn The function to call for each interceptor
   *
   * @returns {void}
   */
  forEach(e) {
    F.forEach(this.handlers, function(i) {
      i !== null && e(i);
    });
  }
}
const Fc = {
  silentJSONParsing: !0,
  forcedJSONParsing: !0,
  clarifyTimeoutError: !1,
  legacyInterceptorReqResOrdering: !0,
  advertiseZstdAcceptEncoding: !1,
  validateStatusUndefinedResolves: !0
}, HE = kc.URLSearchParams, Wl = "abcdefghijklmnopqrstuvwxyz", th = "0123456789", Tb = {
  DIGIT: th,
  ALPHA: Wl,
  ALPHA_DIGIT: Wl + Wl.toUpperCase() + th
}, VE = (t = 16, e = Tb.ALPHA_DIGIT) => {
  let n = "";
  const { length: i } = e, r = new Uint32Array(t);
  Xp.randomFillSync(r);
  for (let s = 0; s < t; s++)
    n += e[r[s] % i];
  return n;
}, KE = {
  isNode: !0,
  classes: {
    URLSearchParams: HE,
    FormData: Bs,
    Blob: typeof Blob < "u" && Blob || null
  },
  ALPHABET: Tb,
  generateString: VE,
  protocols: ["http", "https", "file", "data"]
}, cf = typeof window < "u" && typeof document < "u", rp = typeof navigator == "object" && navigator || void 0, YE = cf && (!rp || ["ReactNative", "NativeScript", "NS"].indexOf(rp.product) < 0), ZE = typeof WorkerGlobalScope < "u" && // eslint-disable-next-line no-undef
self instanceof WorkerGlobalScope && typeof self.importScripts == "function", XE = cf && window.location.href || "http://localhost", JE = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  hasBrowserEnv: cf,
  hasStandardBrowserEnv: YE,
  hasStandardBrowserWebWorkerEnv: ZE,
  navigator: rp,
  origin: XE
}, Symbol.toStringTag, { value: "Module" })), rt = {
  ...JE,
  ...KE
};
function QE(t, e) {
  return Nc(t, new rt.classes.URLSearchParams(), {
    visitor: function(n, i, r, s) {
      return rt.isNode && F.isBuffer(n) ? (this.append(i, n.toString("base64")), !1) : s.defaultVisitor.apply(this, arguments);
    },
    ...e
  });
}
const nh = _b;
function Rb(t) {
  if (t > nh)
    throw new ce(
      "FormData field is too deeply nested (" + t + " levels). Max depth: " + nh,
      ce.ERR_FORM_DATA_DEPTH_EXCEEDED
    );
}
function e1(t) {
  const e = [], n = /[^.[\]]+|\[([^.[\]]*)]/g;
  let i;
  for (; (i = n.exec(t)) !== null; )
    Rb(e.length), e.push(i[0] === "[]" ? "" : i[1] || i[0]);
  return e;
}
function t1(t) {
  const e = {}, n = Object.keys(t);
  let i;
  const r = n.length;
  let s;
  for (i = 0; i < r; i++)
    s = n[i], e[s] = t[s];
  return e;
}
function Ob(t) {
  function e(n, i, r, s) {
    Rb(s);
    let a = n[s++];
    if (a === "__proto__") return !0;
    const o = Number.isFinite(+a), c = s >= n.length;
    return a = !a && F.isArray(r) ? r.length : a, c ? (F.hasOwnProp(r, a) ? r[a] = F.isArray(r[a]) ? r[a].concat(i) : [r[a], i] : r[a] = i, !o) : ((!F.hasOwnProp(r, a) || !F.isObject(r[a])) && (r[a] = []), e(n, i, r[a], s) && F.isArray(r[a]) && (r[a] = t1(r[a])), !o);
  }
  if (F.isFormData(t) && F.isFunction(t.entries)) {
    const n = {};
    return F.forEachEntry(t, (i, r) => {
      e(e1(i), r, n, 0);
    }), n;
  }
  return null;
}
const Sr = (t, e) => t != null && F.hasOwnProp(t, e) ? t[e] : void 0;
function n1(t, e, n) {
  if (F.isString(t))
    try {
      return (e || JSON.parse)(t), F.trim(t);
    } catch (i) {
      if (i.name !== "SyntaxError")
        throw i;
    }
  return (n || JSON.stringify)(t);
}
const ka = {
  transitional: Fc,
  adapter: ["xhr", "http", "fetch"],
  transformRequest: [
    function(e, n) {
      const i = n.getContentType() || "", r = i.indexOf("application/json") > -1, s = F.isObject(e);
      if (s && F.isHTMLForm(e) && (e = new FormData(e)), F.isFormData(e))
        return r ? JSON.stringify(Ob(e)) : e;
      if (F.isArrayBuffer(e) || F.isBuffer(e) || F.isStream(e) || F.isFile(e) || F.isBlob(e) || F.isReadableStream(e))
        return e;
      if (F.isArrayBufferView(e))
        return e.buffer;
      if (F.isURLSearchParams(e))
        return n.setContentType("application/x-www-form-urlencoded;charset=utf-8", !1), e.toString();
      let o;
      if (s) {
        const c = Sr(this, "formSerializer");
        if (i.indexOf("application/x-www-form-urlencoded") > -1)
          return QE(e, c).toString();
        if ((o = F.isFileList(e)) || i.indexOf("multipart/form-data") > -1) {
          const l = Sr(this, "env"), u = l && l.FormData;
          return Nc(
            o ? { "files[]": e } : e,
            u && new u(),
            c
          );
        }
      }
      return s || r ? (n.setContentType("application/json", !1), n1(e)) : e;
    }
  ],
  transformResponse: [
    function(e) {
      const n = Sr(this, "transitional") || ka.transitional, i = n && n.forcedJSONParsing, r = Sr(this, "responseType"), s = r === "json";
      if (F.isResponse(e) || F.isReadableStream(e))
        return e;
      if (e && F.isString(e) && (i && !r || s)) {
        const o = !(n && n.silentJSONParsing) && s;
        try {
          return JSON.parse(e, Sr(this, "parseReviver"));
        } catch (c) {
          if (o)
            throw c.name === "SyntaxError" ? ce.from(c, ce.ERR_BAD_RESPONSE, this, null, Sr(this, "response")) : c;
        }
      }
      return e;
    }
  ],
  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  maxContentLength: -1,
  maxBodyLength: -1,
  env: {
    FormData: rt.classes.FormData,
    Blob: rt.classes.Blob
  },
  validateStatus: function(e) {
    return e >= 200 && e < 300;
  },
  headers: {
    common: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": void 0
    }
  }
};
F.forEach(["delete", "get", "head", "post", "put", "patch", "query"], (t) => {
  ka.headers[t] = {};
});
function ql(t, e) {
  const n = this || ka, i = e || n, r = vt.from(i.headers);
  let s = i.data;
  return F.forEach(t, function(o) {
    s = o.call(n, s, r.normalize(), e ? e.status : void 0);
  }), r.normalize(), s;
}
function Pb(t) {
  return !!(t && t.__CANCEL__);
}
let pr = class extends ce {
  /**
   * A `CanceledError` is an object that is thrown when an operation is canceled.
   *
   * @param {string=} message The message.
   * @param {Object=} config The config.
   * @param {Object=} request The request.
   *
   * @returns {CanceledError} The created error.
   */
  constructor(e, n, i) {
    super(e ?? "canceled", ce.ERR_CANCELED, n, i), this.name = "CanceledError", this.__CANCEL__ = !0;
  }
};
function Ir(t, e, n) {
  const i = n.config.validateStatus;
  !n.status || !i || i(n.status) ? t(n) : e(new ce(
    "Request failed with status code " + n.status,
    n.status >= 400 && n.status < 500 ? ce.ERR_BAD_REQUEST : ce.ERR_BAD_RESPONSE,
    n.config,
    n.request,
    n
  ));
}
function i1(t) {
  return typeof t != "string" ? !1 : /^([a-z][a-z\d+\-.]*:)?\/\//i.test(t);
}
function r1(t, e) {
  if (!e)
    return t;
  let n = t.length;
  for (; n > 0 && t.charCodeAt(n - 1) === 47; )
    n--;
  return t.slice(0, n) + "/" + e.replace(/^\/+/, "");
}
const s1 = /^https?:(?!\/\/)/i, a1 = /[\t\n\r]/g;
function o1(t) {
  let e = 0;
  for (; e < t.length && t.charCodeAt(e) <= 32; )
    e++;
  return t.slice(e);
}
function c1(t) {
  return o1(t).replace(a1, "");
}
function l1(t) {
  return t && t.replace(/(^|&)([^=&]*=)?[^&]+/g, (e, n, i = "") => `${n}${i}${Yo}`);
}
function u1(t) {
  const e = t.replace(/^(https?:\/{0,2})[^/?#]*@/i, `$1${Yo}@`), n = e.indexOf("#"), r = (n === -1 ? e : e.slice(0, n)).replace(
    /([?&][^=&#]*=)[^&#]*/g,
    `$1${Yo}`
  );
  return n === -1 ? r : `${r}#${l1(e.slice(n + 1))}`;
}
function ih(t, e) {
  if (typeof t == "string") {
    const n = c1(t);
    if (s1.test(n))
      throw new ce(
        `Invalid URL ${JSON.stringify(u1(n))}: missing "//" after protocol`,
        ce.ERR_INVALID_URL,
        e
      );
  }
}
function lf(t, e, n, i) {
  ih(e, i);
  let r = !i1(e);
  return t && (r || n === !1) ? (ih(t, i), r1(t, e)) : e;
}
var p1 = {
  ftp: 21,
  gopher: 70,
  http: 80,
  https: 443,
  ws: 80,
  wss: 443
};
function f1(t) {
  try {
    return new URL(t);
  } catch {
    return null;
  }
}
function d1(t) {
  var e = (typeof t == "string" ? f1(t) : t) || {}, n = e.protocol, i = e.host, r = e.port;
  if (typeof i != "string" || !i || typeof n != "string" || (n = n.split(":", 1)[0], i = i.replace(/:\d*$/, ""), r = parseInt(r) || p1[n] || 0, !h1(i, r)))
    return "";
  var s = sp(n + "_proxy") || sp("all_proxy");
  return s && s.indexOf("://") === -1 && (s = n + "://" + s), s;
}
function h1(t, e) {
  var n = sp("no_proxy").toLowerCase();
  return n ? n === "*" ? !1 : n.split(/[,\s]/).every(function(i) {
    if (!i)
      return !0;
    var r = i.match(/^(.+):(\d+)$/), s = r ? r[1] : i, a = r ? parseInt(r[2]) : 0;
    return a && a !== e ? !0 : /^[.*]/.test(s) ? (s.charAt(0) === "*" && (s = s.slice(1)), !t.endsWith(s)) : t !== s;
  }) : !0;
}
function sp(t) {
  return process.env[t.toLowerCase()] || process.env[t.toUpperCase()] || "";
}
var uf = {}, ap = { exports: {} }, ro = { exports: {} }, Gl, rh;
function m1() {
  if (rh) return Gl;
  rh = 1;
  var t = 1e3, e = t * 60, n = e * 60, i = n * 24, r = i * 7, s = i * 365.25;
  Gl = function(u, p) {
    p = p || {};
    var d = typeof u;
    if (d === "string" && u.length > 0)
      return a(u);
    if (d === "number" && isFinite(u))
      return p.long ? c(u) : o(u);
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(u)
    );
  };
  function a(u) {
    if (u = String(u), !(u.length > 100)) {
      var p = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        u
      );
      if (p) {
        var d = parseFloat(p[1]), b = (p[2] || "ms").toLowerCase();
        switch (b) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return d * s;
          case "weeks":
          case "week":
          case "w":
            return d * r;
          case "days":
          case "day":
          case "d":
            return d * i;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return d * n;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return d * e;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return d * t;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return d;
          default:
            return;
        }
      }
    }
  }
  function o(u) {
    var p = Math.abs(u);
    return p >= i ? Math.round(u / i) + "d" : p >= n ? Math.round(u / n) + "h" : p >= e ? Math.round(u / e) + "m" : p >= t ? Math.round(u / t) + "s" : u + "ms";
  }
  function c(u) {
    var p = Math.abs(u);
    return p >= i ? l(u, p, i, "day") : p >= n ? l(u, p, n, "hour") : p >= e ? l(u, p, e, "minute") : p >= t ? l(u, p, t, "second") : u + " ms";
  }
  function l(u, p, d, b) {
    var x = p >= d * 1.5;
    return Math.round(u / d) + " " + b + (x ? "s" : "");
  }
  return Gl;
}
var Hl, sh;
function Cb() {
  if (sh) return Hl;
  sh = 1;
  function t(e) {
    i.debug = i, i.default = i, i.coerce = l, i.disable = o, i.enable = s, i.enabled = c, i.humanize = m1(), i.destroy = u, Object.keys(e).forEach((p) => {
      i[p] = e[p];
    }), i.names = [], i.skips = [], i.formatters = {};
    function n(p) {
      let d = 0;
      for (let b = 0; b < p.length; b++)
        d = (d << 5) - d + p.charCodeAt(b), d |= 0;
      return i.colors[Math.abs(d) % i.colors.length];
    }
    i.selectColor = n;
    function i(p) {
      let d, b = null, x, v;
      function y(...f) {
        if (!y.enabled)
          return;
        const h = y, g = Number(/* @__PURE__ */ new Date()), A = g - (d || g);
        h.diff = A, h.prev = d, h.curr = g, d = g, f[0] = i.coerce(f[0]), typeof f[0] != "string" && f.unshift("%O");
        let C = 0;
        f[0] = f[0].replace(/%([a-zA-Z%])/g, (K, L) => {
          if (K === "%%")
            return "%";
          C++;
          const X = i.formatters[L];
          if (typeof X == "function") {
            const D = f[C];
            K = X.call(h, D), f.splice(C, 1), C--;
          }
          return K;
        }), i.formatArgs.call(h, f), (h.log || i.log).apply(h, f);
      }
      return y.namespace = p, y.useColors = i.useColors(), y.color = i.selectColor(p), y.extend = r, y.destroy = i.destroy, Object.defineProperty(y, "enabled", {
        enumerable: !0,
        configurable: !1,
        get: () => b !== null ? b : (x !== i.namespaces && (x = i.namespaces, v = i.enabled(p)), v),
        set: (f) => {
          b = f;
        }
      }), typeof i.init == "function" && i.init(y), y;
    }
    function r(p, d) {
      const b = i(this.namespace + (typeof d > "u" ? ":" : d) + p);
      return b.log = this.log, b;
    }
    function s(p) {
      i.save(p), i.namespaces = p, i.names = [], i.skips = [];
      const d = (typeof p == "string" ? p : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const b of d)
        b[0] === "-" ? i.skips.push(b.slice(1)) : i.names.push(b);
    }
    function a(p, d) {
      let b = 0, x = 0, v = -1, y = 0;
      for (; b < p.length; )
        if (x < d.length && (d[x] === p[b] || d[x] === "*"))
          d[x] === "*" ? (v = x, y = b, x++) : (b++, x++);
        else if (v !== -1)
          x = v + 1, y++, b = y;
        else
          return !1;
      for (; x < d.length && d[x] === "*"; )
        x++;
      return x === d.length;
    }
    function o() {
      const p = [
        ...i.names,
        ...i.skips.map((d) => "-" + d)
      ].join(",");
      return i.enable(""), p;
    }
    function c(p) {
      for (const d of i.skips)
        if (a(p, d))
          return !1;
      for (const d of i.names)
        if (a(p, d))
          return !0;
      return !1;
    }
    function l(p) {
      return p instanceof Error ? p.stack || p.message : p;
    }
    function u() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    return i.enable(i.load()), i;
  }
  return Hl = t, Hl;
}
var ah;
function g1() {
  return ah || (ah = 1, function(t, e) {
    e.formatArgs = i, e.save = r, e.load = s, e.useColors = n, e.storage = a(), e.destroy = /* @__PURE__ */ (() => {
      let c = !1;
      return () => {
        c || (c = !0, console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."));
      };
    })(), e.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function n() {
      if (typeof window < "u" && window.process && (window.process.type === "renderer" || window.process.__nwjs))
        return !0;
      if (typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/))
        return !1;
      let c;
      return typeof document < "u" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window < "u" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator < "u" && navigator.userAgent && (c = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(c[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function i(c) {
      if (c[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + c[0] + (this.useColors ? "%c " : " ") + "+" + t.exports.humanize(this.diff), !this.useColors)
        return;
      const l = "color: " + this.color;
      c.splice(1, 0, l, "color: inherit");
      let u = 0, p = 0;
      c[0].replace(/%[a-zA-Z%]/g, (d) => {
        d !== "%%" && (u++, d === "%c" && (p = u));
      }), c.splice(p, 0, l);
    }
    e.log = console.debug || console.log || (() => {
    });
    function r(c) {
      try {
        c ? e.storage.setItem("debug", c) : e.storage.removeItem("debug");
      } catch {
      }
    }
    function s() {
      let c;
      try {
        c = e.storage.getItem("debug") || e.storage.getItem("DEBUG");
      } catch {
      }
      return !c && typeof process < "u" && "env" in process && (c = process.env.DEBUG), c;
    }
    function a() {
      try {
        return localStorage;
      } catch {
      }
    }
    t.exports = Cb()(e);
    const { formatters: o } = t.exports;
    o.j = function(c) {
      try {
        return JSON.stringify(c);
      } catch (l) {
        return "[UnexpectedJSONParseError]: " + l.message;
      }
    };
  }(ro, ro.exports)), ro.exports;
}
var so = { exports: {} }, Vl, oh;
function b1() {
  return oh || (oh = 1, Vl = (t, e = process.argv) => {
    const n = t.startsWith("-") ? "" : t.length === 1 ? "-" : "--", i = e.indexOf(n + t), r = e.indexOf("--");
    return i !== -1 && (r === -1 || i < r);
  }), Vl;
}
var Kl, ch;
function y1() {
  if (ch) return Kl;
  ch = 1;
  const t = Qw, e = zg, n = b1(), { env: i } = process;
  let r;
  n("no-color") || n("no-colors") || n("color=false") || n("color=never") ? r = 0 : (n("color") || n("colors") || n("color=true") || n("color=always")) && (r = 1), "FORCE_COLOR" in i && (i.FORCE_COLOR === "true" ? r = 1 : i.FORCE_COLOR === "false" ? r = 0 : r = i.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(i.FORCE_COLOR, 10), 3));
  function s(c) {
    return c === 0 ? !1 : {
      level: c,
      hasBasic: !0,
      has256: c >= 2,
      has16m: c >= 3
    };
  }
  function a(c, l) {
    if (r === 0)
      return 0;
    if (n("color=16m") || n("color=full") || n("color=truecolor"))
      return 3;
    if (n("color=256"))
      return 2;
    if (c && !l && r === void 0)
      return 0;
    const u = r || 0;
    if (i.TERM === "dumb")
      return u;
    if (process.platform === "win32") {
      const p = t.release().split(".");
      return Number(p[0]) >= 10 && Number(p[2]) >= 10586 ? Number(p[2]) >= 14931 ? 3 : 2 : 1;
    }
    if ("CI" in i)
      return ["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((p) => p in i) || i.CI_NAME === "codeship" ? 1 : u;
    if ("TEAMCITY_VERSION" in i)
      return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(i.TEAMCITY_VERSION) ? 1 : 0;
    if (i.COLORTERM === "truecolor")
      return 3;
    if ("TERM_PROGRAM" in i) {
      const p = parseInt((i.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (i.TERM_PROGRAM) {
        case "iTerm.app":
          return p >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    return /-256(color)?$/i.test(i.TERM) ? 2 : /^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(i.TERM) || "COLORTERM" in i ? 1 : u;
  }
  function o(c) {
    const l = a(c, c && c.isTTY);
    return s(l);
  }
  return Kl = {
    supportsColor: o,
    stdout: s(a(!0, e.isatty(1))),
    stderr: s(a(!0, e.isatty(2)))
  }, Kl;
}
var lh;
function v1() {
  return lh || (lh = 1, function(t, e) {
    const n = zg, i = xt;
    e.init = u, e.log = o, e.formatArgs = s, e.save = c, e.load = l, e.useColors = r, e.destroy = i.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    ), e.colors = [6, 2, 3, 4, 5, 1];
    try {
      const d = y1();
      d && (d.stderr || d).level >= 2 && (e.colors = [
        20,
        21,
        26,
        27,
        32,
        33,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        56,
        57,
        62,
        63,
        68,
        69,
        74,
        75,
        76,
        77,
        78,
        79,
        80,
        81,
        92,
        93,
        98,
        99,
        112,
        113,
        128,
        129,
        134,
        135,
        148,
        149,
        160,
        161,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        171,
        172,
        173,
        178,
        179,
        184,
        185,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        203,
        204,
        205,
        206,
        207,
        208,
        209,
        214,
        215,
        220,
        221
      ]);
    } catch {
    }
    e.inspectOpts = Object.keys(process.env).filter((d) => /^debug_/i.test(d)).reduce((d, b) => {
      const x = b.substring(6).toLowerCase().replace(/_([a-z])/g, (y, f) => f.toUpperCase());
      let v = process.env[b];
      return /^(yes|on|true|enabled)$/i.test(v) ? v = !0 : /^(no|off|false|disabled)$/i.test(v) ? v = !1 : v === "null" ? v = null : v = Number(v), d[x] = v, d;
    }, {});
    function r() {
      return "colors" in e.inspectOpts ? !!e.inspectOpts.colors : n.isatty(process.stderr.fd);
    }
    function s(d) {
      const { namespace: b, useColors: x } = this;
      if (x) {
        const v = this.color, y = "\x1B[3" + (v < 8 ? v : "8;5;" + v), f = `  ${y};1m${b} \x1B[0m`;
        d[0] = f + d[0].split(`
`).join(`
` + f), d.push(y + "m+" + t.exports.humanize(this.diff) + "\x1B[0m");
      } else
        d[0] = a() + b + " " + d[0];
    }
    function a() {
      return e.inspectOpts.hideDate ? "" : (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function o(...d) {
      return process.stderr.write(i.formatWithOptions(e.inspectOpts, ...d) + `
`);
    }
    function c(d) {
      d ? process.env.DEBUG = d : delete process.env.DEBUG;
    }
    function l() {
      return process.env.DEBUG;
    }
    function u(d) {
      d.inspectOpts = {};
      const b = Object.keys(e.inspectOpts);
      for (let x = 0; x < b.length; x++)
        d.inspectOpts[b[x]] = e.inspectOpts[b[x]];
    }
    t.exports = Cb()(e);
    const { formatters: p } = t.exports;
    p.o = function(d) {
      return this.inspectOpts.colors = this.useColors, i.inspect(d, this.inspectOpts).split(`
`).map((b) => b.trim()).join(" ");
    }, p.O = function(d) {
      return this.inspectOpts.colors = this.useColors, i.inspect(d, this.inspectOpts);
    };
  }(so, so.exports)), so.exports;
}
typeof process > "u" || process.type === "renderer" || process.browser === !0 || process.__nwjs ? ap.exports = g1() : ap.exports = v1();
var Mc = ap.exports, pf = {};
Object.defineProperty(pf, "__esModule", { value: !0 });
function x1(t) {
  return function(e, n) {
    return new Promise((i, r) => {
      t.call(this, e, n, (s, a) => {
        s ? r(s) : i(a);
      });
    });
  };
}
pf.default = x1;
var kb = We && We.__importDefault || function(t) {
  return t && t.__esModule ? t : { default: t };
};
const w1 = Ii, _1 = kb(Mc), S1 = kb(pf), xs = _1.default("agent-base");
function E1(t) {
  return !!t && typeof t.addRequest == "function";
}
function Yl() {
  const { stack: t } = new Error();
  return typeof t != "string" ? !1 : t.split(`
`).some((e) => e.indexOf("(https.js:") !== -1 || e.indexOf("node:https:") !== -1);
}
function Jo(t, e) {
  return new Jo.Agent(t, e);
}
(function(t) {
  class e extends w1.EventEmitter {
    constructor(i, r) {
      super();
      let s = r;
      typeof i == "function" ? this.callback = i : i && (s = i), this.timeout = null, s && typeof s.timeout == "number" && (this.timeout = s.timeout), this.maxFreeSockets = 1, this.maxSockets = 1, this.maxTotalSockets = 1 / 0, this.sockets = {}, this.freeSockets = {}, this.requests = {}, this.options = {};
    }
    get defaultPort() {
      return typeof this.explicitDefaultPort == "number" ? this.explicitDefaultPort : Yl() ? 443 : 80;
    }
    set defaultPort(i) {
      this.explicitDefaultPort = i;
    }
    get protocol() {
      return typeof this.explicitProtocol == "string" ? this.explicitProtocol : Yl() ? "https:" : "http:";
    }
    set protocol(i) {
      this.explicitProtocol = i;
    }
    callback(i, r, s) {
      throw new Error('"agent-base" has no default implementation, you must subclass and override `callback()`');
    }
    /**
     * Called by node-core's "_http_client.js" module when creating
     * a new HTTP request with this Agent instance.
     *
     * @api public
     */
    addRequest(i, r) {
      const s = Object.assign({}, r);
      typeof s.secureEndpoint != "boolean" && (s.secureEndpoint = Yl()), s.host == null && (s.host = "localhost"), s.port == null && (s.port = s.secureEndpoint ? 443 : 80), s.protocol == null && (s.protocol = s.secureEndpoint ? "https:" : "http:"), s.host && s.path && delete s.path, delete s.agent, delete s.hostname, delete s._defaultAgent, delete s.defaultPort, delete s.createConnection, i._last = !0, i.shouldKeepAlive = !1;
      let a = !1, o = null;
      const c = s.timeout || this.timeout, l = (b) => {
        i._hadError || (i.emit("error", b), i._hadError = !0);
      }, u = () => {
        o = null, a = !0;
        const b = new Error(`A "socket" was not created for HTTP request before ${c}ms`);
        b.code = "ETIMEOUT", l(b);
      }, p = (b) => {
        a || (o !== null && (clearTimeout(o), o = null), l(b));
      }, d = (b) => {
        if (a)
          return;
        if (o != null && (clearTimeout(o), o = null), E1(b)) {
          xs("Callback returned another Agent instance %o", b.constructor.name), b.addRequest(i, s);
          return;
        }
        if (b) {
          b.once("free", () => {
            this.freeSocket(b, s);
          }), i.onSocket(b);
          return;
        }
        const x = new Error(`no Duplex stream was returned to agent-base for \`${i.method} ${i.path}\``);
        l(x);
      };
      if (typeof this.callback != "function") {
        l(new Error("`callback` is not defined"));
        return;
      }
      this.promisifiedCallback || (this.callback.length >= 3 ? (xs("Converting legacy callback function to promise"), this.promisifiedCallback = S1.default(this.callback)) : this.promisifiedCallback = this.callback), typeof c == "number" && c > 0 && (o = setTimeout(u, c)), "port" in s && typeof s.port != "number" && (s.port = Number(s.port));
      try {
        xs("Resolving socket for %o request: %o", s.protocol, `${i.method} ${i.path}`), Promise.resolve(this.promisifiedCallback(i, s)).then(d, p);
      } catch (b) {
        Promise.reject(b).catch(p);
      }
    }
    freeSocket(i, r) {
      xs("Freeing socket %o %o", i.constructor.name, r), i.destroy();
    }
    destroy() {
      xs("Destroying agent %o", this.constructor.name);
    }
  }
  t.Agent = e, t.prototype = t.Agent.prototype;
})(Jo || (Jo = {}));
var A1 = Jo, ff = {}, T1 = We && We.__importDefault || function(t) {
  return t && t.__esModule ? t : { default: t };
};
Object.defineProperty(ff, "__esModule", { value: !0 });
const R1 = T1(Mc), ws = R1.default("https-proxy-agent:parse-proxy-response");
function O1(t) {
  return new Promise((e, n) => {
    let i = 0;
    const r = [];
    function s() {
      const p = t.read();
      p ? u(p) : t.once("readable", s);
    }
    function a() {
      t.removeListener("end", c), t.removeListener("error", l), t.removeListener("close", o), t.removeListener("readable", s);
    }
    function o(p) {
      ws("onclose had error %o", p);
    }
    function c() {
      ws("onend");
    }
    function l(p) {
      a(), ws("onerror %o", p), n(p);
    }
    function u(p) {
      r.push(p), i += p.length;
      const d = Buffer.concat(r, i);
      if (d.indexOf(`\r
\r
`) === -1) {
        ws("have not received end of HTTP headers yet..."), s();
        return;
      }
      const x = d.toString("ascii", 0, d.indexOf(`\r
`)), v = +x.split(" ")[1];
      ws("got proxy server response: %o", x), e({
        statusCode: v,
        buffered: d
      });
    }
    t.on("error", l), t.on("close", o), t.on("end", c), s();
  });
}
ff.default = O1;
var P1 = We && We.__awaiter || function(t, e, n, i) {
  function r(s) {
    return s instanceof n ? s : new n(function(a) {
      a(s);
    });
  }
  return new (n || (n = Promise))(function(s, a) {
    function o(u) {
      try {
        l(i.next(u));
      } catch (p) {
        a(p);
      }
    }
    function c(u) {
      try {
        l(i.throw(u));
      } catch (p) {
        a(p);
      }
    }
    function l(u) {
      u.done ? s(u.value) : r(u.value).then(o, c);
    }
    l((i = i.apply(t, e || [])).next());
  });
}, ls = We && We.__importDefault || function(t) {
  return t && t.__esModule ? t : { default: t };
};
Object.defineProperty(uf, "__esModule", { value: !0 });
const uh = ls(Xw), ph = ls(Jw), C1 = ls(kc), k1 = ls(Jp), I1 = ls(Mc), D1 = A1, j1 = ls(ff), _s = I1.default("https-proxy-agent:agent");
let L1 = class extends D1.Agent {
  constructor(e) {
    let n;
    if (typeof e == "string" ? n = C1.default.parse(e) : n = e, !n)
      throw new Error("an HTTP(S) proxy server `host` and `port` must be specified!");
    _s("creating new HttpsProxyAgent instance: %o", n), super(n);
    const i = Object.assign({}, n);
    this.secureProxy = n.secureProxy || M1(i.protocol), i.host = i.hostname || i.host, typeof i.port == "string" && (i.port = parseInt(i.port, 10)), !i.port && i.host && (i.port = this.secureProxy ? 443 : 80), this.secureProxy && !("ALPNProtocols" in i) && (i.ALPNProtocols = ["http 1.1"]), i.host && i.path && (delete i.path, delete i.pathname), this.proxy = i;
  }
  /**
   * Called when the node-core HTTP client library is creating a
   * new HTTP request.
   *
   * @api protected
   */
  callback(e, n) {
    return P1(this, void 0, void 0, function* () {
      const { proxy: i, secureProxy: r } = this;
      let s;
      r ? (_s("Creating `tls.Socket`: %o", i), s = ph.default.connect(i)) : (_s("Creating `net.Socket`: %o", i), s = uh.default.connect(i));
      const a = Object.assign({}, i.headers);
      let c = `CONNECT ${`${n.host}:${n.port}`} HTTP/1.1\r
`;
      i.auth && (a["Proxy-Authorization"] = `Basic ${Buffer.from(i.auth).toString("base64")}`);
      let { host: l, port: u, secureEndpoint: p } = n;
      F1(u, p) || (l += `:${u}`), a.Host = l, a.Connection = "close";
      for (const y of Object.keys(a))
        c += `${y}: ${a[y]}\r
`;
      const d = j1.default(s);
      s.write(`${c}\r
`);
      const { statusCode: b, buffered: x } = yield d;
      if (b === 200) {
        if (e.once("socket", N1), n.secureEndpoint) {
          _s("Upgrading socket connection to TLS");
          const y = n.servername || n.host;
          return ph.default.connect(Object.assign(Object.assign({}, $1(n, "host", "hostname", "path", "port")), {
            socket: s,
            servername: y
          }));
        }
        return s;
      }
      s.destroy();
      const v = new uh.default.Socket({ writable: !1 });
      return v.readable = !0, e.once("socket", (y) => {
        _s("replaying proxy buffer for failed request"), k1.default(y.listenerCount("data") > 0), y.push(x), y.push(null);
      }), v;
    });
  }
};
uf.default = L1;
function N1(t) {
  t.resume();
}
function F1(t, e) {
  return !!(!e && t === 80 || e && t === 443);
}
function M1(t) {
  return typeof t == "string" ? /^https:?$/i.test(t) : !1;
}
function $1(t, ...e) {
  const n = {};
  let i;
  for (i in t)
    e.includes(i) || (n[i] = t[i]);
  return n;
}
var B1 = We && We.__importDefault || function(t) {
  return t && t.__esModule ? t : { default: t };
};
const op = B1(uf);
function cp(t) {
  return new op.default(t);
}
(function(t) {
  t.HttpsProxyAgent = op.default, t.prototype = op.default.prototype;
})(cp || (cp = {}));
var U1 = cp;
const Ib = /* @__PURE__ */ Dc(U1);
var df = { exports: {} }, Ss, z1 = function() {
  if (!Ss) {
    try {
      Ss = Mc("follow-redirects");
    } catch {
    }
    typeof Ss != "function" && (Ss = function() {
    });
  }
  Ss.apply(null, arguments);
}, Ia = kc, Us = Ia.URL, W1 = ss, q1 = as, hf = nt.Writable, mf = Jp, Db = z1;
(function() {
  var e = typeof process < "u", n = typeof window < "u" && typeof document < "u", i = fr(Error.captureStackTrace);
  !e && (n || !i) && console.warn("The follow-redirects package should be excluded from browser builds.");
})();
var gf = !1;
try {
  mf(new Us(""));
} catch (t) {
  gf = t.code === "ERR_INVALID_URL";
}
var G1 = [
  "Authorization",
  "Proxy-Authorization",
  "Cookie"
], H1 = [
  "auth",
  "host",
  "hostname",
  "href",
  "path",
  "pathname",
  "port",
  "protocol",
  "query",
  "search",
  "hash"
], bf = ["abort", "aborted", "connect", "error", "socket", "timeout"], yf = /* @__PURE__ */ Object.create(null);
bf.forEach(function(t) {
  yf[t] = function(e, n, i) {
    this._redirectable.emit(t, e, n, i);
  };
});
var lp = Da(
  "ERR_INVALID_URL",
  "Invalid URL",
  TypeError
), up = Da(
  "ERR_FR_REDIRECTION_FAILURE",
  "Redirected request failed"
), V1 = Da(
  "ERR_FR_TOO_MANY_REDIRECTS",
  "Maximum number of redirects exceeded",
  up
), K1 = Da(
  "ERR_FR_MAX_BODY_LENGTH_EXCEEDED",
  "Request body larger than maxBodyLength limit"
), Y1 = Da(
  "ERR_STREAM_WRITE_AFTER_END",
  "write after end"
), Z1 = hf.prototype.destroy || Lb;
function Yt(t, e) {
  hf.call(this), this._sanitizeOptions(t), this._options = t, this._ended = !1, this._ending = !1, this._redirectCount = 0, this._redirects = [], this._requestBodyLength = 0, this._requestBodyBuffers = [], e && this.on("response", e);
  var n = this;
  this._onNativeResponse = function(i) {
    try {
      n._processResponse(i);
    } catch (r) {
      n.emit("error", r instanceof up ? r : new up({ cause: r }));
    }
  }, this._headerFilter = new RegExp("^(?:" + G1.concat(t.sensitiveHeaders).map(nA).join("|") + ")$", "i"), this._performRequest();
}
Yt.prototype = Object.create(hf.prototype);
Yt.prototype.abort = function() {
  xf(this._currentRequest), this._currentRequest.abort(), this.emit("abort");
};
Yt.prototype.destroy = function(t) {
  return xf(this._currentRequest, t), Z1.call(this, t), this;
};
Yt.prototype.write = function(t, e, n) {
  if (this._ending)
    throw new Y1();
  if (!sr(t) && !eA(t))
    throw new TypeError("data should be a string, Buffer or Uint8Array");
  if (fr(e) && (n = e, e = null), t.length === 0) {
    n && n();
    return;
  }
  this._requestBodyLength + t.length <= this._options.maxBodyLength ? (this._requestBodyLength += t.length, this._requestBodyBuffers.push({ data: t, encoding: e }), this._currentRequest.write(t, e, n)) : (this.emit("error", new K1()), this.abort());
};
Yt.prototype.end = function(t, e, n) {
  if (fr(t) ? (n = t, t = e = null) : fr(e) && (n = e, e = null), !t)
    this._ended = this._ending = !0, this._currentRequest.end(null, null, n);
  else {
    var i = this, r = this._currentRequest;
    this.write(t, e, function() {
      i._ended = !0, r.end(null, null, n);
    }), this._ending = !0;
  }
};
Yt.prototype.setHeader = function(t, e) {
  this._options.headers[t] = e, this._currentRequest.setHeader(t, e);
};
Yt.prototype.removeHeader = function(t) {
  delete this._options.headers[t], this._currentRequest.removeHeader(t);
};
Yt.prototype.setTimeout = function(t, e) {
  var n = this;
  function i(a) {
    a.setTimeout(t), a.removeListener("timeout", a.destroy), a.addListener("timeout", a.destroy);
  }
  function r(a) {
    n._timeout && clearTimeout(n._timeout), n._timeout = setTimeout(function() {
      n.emit("timeout"), s();
    }, t), i(a);
  }
  function s() {
    n._timeout && (clearTimeout(n._timeout), n._timeout = null), n.removeListener("abort", s), n.removeListener("error", s), n.removeListener("response", s), n.removeListener("close", s), e && n.removeListener("timeout", e), n.socket || n._currentRequest.removeListener("socket", r);
  }
  return e && this.on("timeout", e), this.socket ? r(this.socket) : this._currentRequest.once("socket", r), this.on("socket", i), this.on("abort", s), this.on("error", s), this.on("response", s), this.on("close", s), this;
};
[
  "flushHeaders",
  "getHeader",
  "setNoDelay",
  "setSocketKeepAlive"
].forEach(function(t) {
  Yt.prototype[t] = function(e, n) {
    return this._currentRequest[t](e, n);
  };
});
["aborted", "connection", "socket"].forEach(function(t) {
  Object.defineProperty(Yt.prototype, t, {
    get: function() {
      return this._currentRequest[t];
    }
  });
});
Yt.prototype._sanitizeOptions = function(t) {
  if (t.headers || (t.headers = {}), Q1(t.sensitiveHeaders) || (t.sensitiveHeaders = []), t.host && (t.hostname || (t.hostname = t.host), delete t.host), !t.pathname && t.path) {
    var e = t.path.indexOf("?");
    e < 0 ? t.pathname = t.path : (t.pathname = t.path.substring(0, e), t.search = t.path.substring(e));
  }
};
Yt.prototype._performRequest = function() {
  var t = this._options.protocol, e = this._options.nativeProtocols[t];
  if (!e)
    throw new TypeError("Unsupported protocol " + t);
  if (this._options.agents) {
    var n = t.slice(0, -1);
    this._options.agent = this._options.agents[n];
  }
  var i = this._currentRequest = e.request(this._options, this._onNativeResponse);
  i._redirectable = this;
  for (var r of bf)
    i.on(r, yf[r]);
  if (this._currentUrl = /^\//.test(this._options.path) ? Ia.format(this._options) : (
    // When making a request to a proxy, […]
    // a client MUST send the target URI in absolute-form […].
    this._options.path
  ), this._isRedirect) {
    var s = 0, a = this, o = this._requestBodyBuffers;
    (function c(l) {
      if (i === a._currentRequest)
        if (l)
          a.emit("error", l);
        else if (s < o.length) {
          var u = o[s++];
          i.finished || i.write(u.data, u.encoding, c);
        } else a._ended && i.end();
    })();
  }
};
Yt.prototype._processResponse = function(t) {
  var e = t.statusCode;
  this._options.trackRedirects && this._redirects.push({
    url: this._currentUrl,
    headers: t.headers,
    statusCode: e
  });
  var n = t.headers.location;
  if (!n || this._options.followRedirects === !1 || e < 300 || e >= 400) {
    t.responseUrl = this._currentUrl, t.redirects = this._redirects, this.emit("response", t), this._requestBodyBuffers = [];
    return;
  }
  if (xf(this._currentRequest), t.destroy(), ++this._redirectCount > this._options.maxRedirects)
    throw new V1();
  var i, r = this._options.beforeRedirect;
  r && (i = Object.assign({
    // The Host header was set by nativeProtocol.request
    Host: t.req.getHeader("host")
  }, this._options.headers));
  var s = this._options.method;
  ((e === 301 || e === 302) && this._options.method === "POST" || // RFC7231§6.4.4: The 303 (See Other) status code indicates that
  // the server is redirecting the user agent to a different resource […]
  // A user agent can perform a retrieval request targeting that URI
  // (a GET or HEAD request if using HTTP) […]
  e === 303 && !/^(?:GET|HEAD)$/.test(this._options.method)) && (this._options.method = "GET", this._requestBodyBuffers = [], Zl(/^content-/i, this._options.headers));
  var a = Zl(/^host$/i, this._options.headers), o = vf(this._currentUrl), c = a || o.host, l = /^\w+:/.test(n) ? this._currentUrl : Ia.format(Object.assign(o, { host: c })), u = X1(n, l);
  if (Db("redirecting to", u.href), this._isRedirect = !0, pp(u, this._options), (u.protocol !== o.protocol && u.protocol !== "https:" || u.host !== c && !J1(u.host, c)) && Zl(this._headerFilter, this._options.headers), fr(r)) {
    var p = {
      headers: t.headers,
      statusCode: e
    }, d = {
      url: l,
      method: s,
      headers: i
    };
    r(this._options, p, d), this._sanitizeOptions(this._options);
  }
  this._performRequest();
};
function jb(t) {
  var e = {
    maxRedirects: 21,
    maxBodyLength: 10485760
  }, n = {};
  return Object.keys(t).forEach(function(i) {
    var r = i + ":", s = n[r] = t[i], a = e[i] = Object.create(s);
    function o(l, u, p) {
      return tA(l) ? l = pp(l) : sr(l) ? l = pp(vf(l)) : (p = u, u = Nb(l), l = { protocol: r }), fr(u) && (p = u, u = null), u = Object.assign({
        maxRedirects: e.maxRedirects,
        maxBodyLength: e.maxBodyLength
      }, l, u), u.nativeProtocols = n, !sr(u.host) && !sr(u.hostname) && (u.hostname = "::1"), mf.equal(u.protocol, r, "protocol mismatch"), Db("options", u), new Yt(u, p);
    }
    function c(l, u, p) {
      var d = a.request(l, u, p);
      return d.end(), d;
    }
    Object.defineProperties(a, {
      request: { value: o, configurable: !0, enumerable: !0, writable: !0 },
      get: { value: c, configurable: !0, enumerable: !0, writable: !0 }
    });
  }), e;
}
function Lb() {
}
function vf(t) {
  var e;
  if (gf)
    e = new Us(t);
  else if (e = Nb(Ia.parse(t)), !sr(e.protocol))
    throw new lp({ input: t });
  return e;
}
function X1(t, e) {
  return gf ? new Us(t, e) : vf(Ia.resolve(e, t));
}
function Nb(t) {
  if (/^\[/.test(t.hostname) && !/^\[[:0-9a-f]+\]$/i.test(t.hostname))
    throw new lp({ input: t.href || t });
  if (/^\[/.test(t.host) && !/^\[[:0-9a-f]+\](:\d+)?$/i.test(t.host))
    throw new lp({ input: t.href || t });
  return t;
}
function pp(t, e) {
  var n = e || {};
  for (var i of H1)
    n[i] = t[i];
  return n.hostname.startsWith("[") && (n.hostname = n.hostname.slice(1, -1)), n.port !== "" && (n.port = Number(n.port)), n.path = n.search ? n.pathname + n.search : n.pathname, n;
}
function Zl(t, e) {
  var n;
  for (var i in e)
    t.test(i) && (n = e[i], delete e[i]);
  return n === null || typeof n > "u" ? void 0 : String(n).trim();
}
function Da(t, e, n) {
  function i(r) {
    fr(Error.captureStackTrace) && Error.captureStackTrace(this, this.constructor), Object.assign(this, r || {}), this.code = t, this.message = this.cause ? e + ": " + this.cause.message : e;
  }
  return i.prototype = new (n || Error)(), Object.defineProperties(i.prototype, {
    constructor: {
      value: i,
      enumerable: !1
    },
    name: {
      value: "Error [" + t + "]",
      enumerable: !1
    }
  }), i;
}
function xf(t, e) {
  for (var n of bf)
    t.removeListener(n, yf[n]);
  t.on("error", Lb), t.destroy(e);
}
function J1(t, e) {
  mf(sr(t) && sr(e));
  var n = t.length - e.length - 1;
  return n > 0 && t[n] === "." && t.endsWith(e);
}
function Q1(t) {
  return t instanceof Array;
}
function sr(t) {
  return typeof t == "string" || t instanceof String;
}
function fr(t) {
  return typeof t == "function";
}
function eA(t) {
  return typeof t == "object" && "length" in t;
}
function tA(t) {
  return Us && t instanceof Us;
}
function nA(t) {
  return t.replace(/[\]\\/()*+?.$]/g, "\\$&");
}
df.exports = jb({ http: W1, https: q1 });
df.exports.wrap = jb;
var iA = df.exports;
const rA = /* @__PURE__ */ Dc(iA), zs = "1.19.0";
function Fb(t) {
  const e = /^([-+\w]{1,25}):(?:\/\/)?/.exec(t);
  return e && e[1] || "";
}
const sA = /^([^,;]+\/[^,;]+)?((?:;[^,;=]+=[^,;]+)*)(;base64)?,([\s\S]*)$/;
function aA(t, e, n) {
  const i = n && n.Blob || rt.classes.Blob, r = Fb(t);
  if (e === void 0 && i && (e = !0), r === "data") {
    t = r.length ? t.slice(r.length + 1) : t;
    const s = sA.exec(t);
    if (!s)
      throw new ce("Invalid URL", ce.ERR_INVALID_URL);
    const a = s[1], o = s[2], c = s[3] ? "base64" : "utf8", l = s[4];
    let u = "";
    a ? u = o ? a + o : a : o && (u = "text/plain" + o);
    const p = c === "base64" ? Buffer.from(l, "base64") : Buffer.from(decodeURIComponent(l), c);
    if (e) {
      if (!i)
        throw new ce("Blob is not supported", ce.ERR_NOT_SUPPORT);
      return new i([p], { type: u });
    }
    return p;
  }
  throw new ce("Unsupported protocol " + r, ce.ERR_NOT_SUPPORT);
}
const oA = ["content-type", "content-length"];
function Mb(t, e, n) {
  if (n !== "content-only") {
    t.set(e);
    return;
  }
  Object.entries(e || {}).forEach(([i, r]) => {
    oA.includes(i.toLowerCase()) && t.set(i, r);
  });
}
const Xl = Symbol("internals");
class fh extends nt.Transform {
  constructor(e) {
    e = F.toFlatObject(
      e,
      {
        maxRate: 0,
        chunkSize: 64 * 1024,
        minChunkSize: 100,
        timeWindow: 500,
        ticksRate: 2,
        samplesCount: 15
      },
      null,
      (i, r) => !F.isUndefined(r[i])
    ), super({
      readableHighWaterMark: e.chunkSize
    });
    const n = this[Xl] = {
      timeWindow: e.timeWindow,
      chunkSize: e.chunkSize,
      maxRate: e.maxRate,
      minChunkSize: e.minChunkSize,
      bytesSeen: 0,
      isCaptured: !1,
      notifiedBytesLoaded: 0,
      ts: Date.now(),
      bytes: 0,
      onReadCallback: null
    };
    this.on("newListener", (i) => {
      i === "progress" && (n.isCaptured || (n.isCaptured = !0));
    });
  }
  _read(e) {
    const n = this[Xl];
    return n.onReadCallback && n.onReadCallback(), super._read(e);
  }
  _transform(e, n, i) {
    const r = this[Xl], s = r.maxRate, a = this.readableHighWaterMark, o = r.timeWindow, c = 1e3 / o, l = s / c, u = r.minChunkSize !== !1 ? Math.max(r.minChunkSize, l * 0.01) : 0, p = (b, x) => {
      const v = Buffer.byteLength(b);
      r.bytesSeen += v, r.bytes += v, r.isCaptured && this.emit("progress", r.bytesSeen), this.push(b) ? process.nextTick(x) : r.onReadCallback = () => {
        r.onReadCallback = null, process.nextTick(x);
      };
    }, d = (b, x) => {
      const v = Buffer.byteLength(b);
      let y = null, f = a, h, g = 0;
      if (s) {
        const A = Date.now();
        (!r.ts || (g = A - r.ts) >= o) && (r.ts = A, h = l - r.bytes, r.bytes = h < 0 ? -h : 0, g = 0), h = l - r.bytes;
      }
      if (s) {
        if (h <= 0)
          return setTimeout(() => {
            x(null, b);
          }, o - g);
        h < f && (f = h);
      }
      f && v > f && v - f > u && (y = b.subarray(f), b = b.subarray(0, f)), p(
        b,
        y ? () => {
          process.nextTick(x, null, y);
        } : x
      );
    };
    d(e, function b(x, v) {
      if (x)
        return i(x);
      v ? d(v, b) : i(null);
    });
  }
}
const { asyncIterator: dh } = Symbol, $b = async function* (t) {
  t.stream ? yield* t.stream() : t.arrayBuffer ? yield await t.arrayBuffer() : t[dh] ? yield* t[dh]() : yield t;
}, cA = rt.ALPHABET.ALPHA_DIGIT + "-_", Ws = typeof TextEncoder == "function" ? new TextEncoder() : new xt.TextEncoder(), Yi = `\r
`, lA = Ws.encode(Yi), uA = 2;
class pA {
  constructor(e, n) {
    const { escapeName: i } = this.constructor, r = F.isString(n);
    let s = `Content-Disposition: form-data; name="${i(e)}"${!r && n.name ? `; filename="${i(n.name)}"` : ""}${Yi}`;
    if (r)
      n = Ws.encode(String(n).replace(/\r?\n|\r\n?/g, Yi));
    else {
      const a = String(n.type || "application/octet-stream").replace(/[\r\n]/g, "");
      s += `Content-Type: ${a}${Yi}`;
    }
    this.headers = Ws.encode(s + Yi), this.contentLength = r ? n.byteLength : n.size, this.size = this.headers.byteLength + this.contentLength + uA, this.name = e, this.value = n;
  }
  async *encode() {
    yield this.headers;
    const { value: e } = this;
    F.isTypedArray(e) ? yield e : yield* $b(e), yield lA;
  }
  static escapeName(e) {
    return String(e).replace(
      /[\r\n"]/g,
      (n) => ({
        "\r": "%0D",
        "\n": "%0A",
        '"': "%22"
      })[n]
    );
  }
}
const fA = (t, e, n) => {
  const {
    tag: i = "form-data-boundary",
    size: r = 25,
    boundary: s = i + "-" + rt.generateString(r, cA)
  } = n || {};
  if (!F.isFormData(t))
    throw new TypeError("FormData instance required");
  if (s.length < 1 || s.length > 70)
    throw new Error("boundary must be 1-70 characters long");
  const a = Ws.encode("--" + s + Yi), o = Ws.encode("--" + s + "--" + Yi);
  let c = o.byteLength;
  const l = Array.from(t.entries()).map(([p, d]) => {
    const b = new pA(p, d);
    return c += b.size, b;
  });
  c += a.byteLength * l.length, c = F.toFiniteNumber(c);
  const u = {
    "Content-Type": `multipart/form-data; boundary=${s}`
  };
  return Number.isFinite(c) && (u["Content-Length"] = c), e && e(u), Zw.from(
    async function* () {
      for (const p of l)
        yield a, yield* p.encode();
      yield o;
    }()
  );
};
class dA extends nt.Transform {
  __transform(e, n, i) {
    this.push(e), i();
  }
  _transform(e, n, i) {
    if (e.length !== 0 && (this._transform = this.__transform, e[0] !== 120)) {
      const r = Buffer.alloc(2);
      r[0] = 120, r[1] = 156, this.push(r, n);
    }
    this.__transform(e, n, i);
  }
}
class hA {
  constructor() {
    this.sessions = /* @__PURE__ */ Object.create(null);
  }
  getSession(e, n) {
    n = Object.assign(
      {
        sessionTimeout: 1e3
      },
      n
    );
    let i = this.sessions[e];
    if (i) {
      let p = i.length;
      for (let d = 0; d < p; d++) {
        const [b, x] = i[d];
        if (!b.destroyed && !b.closed && xt.isDeepStrictEqual(x, n))
          return b;
      }
    }
    const r = Wg.connect(e, n);
    let s, a;
    const o = () => {
      if (s)
        return;
      s = !0, a && (clearTimeout(a), a = null);
      let p = i, d = p.length, b = d;
      for (; b--; )
        if (p[b][0] === r) {
          d === 1 ? delete this.sessions[e] : p.splice(b, 1), r.closed || r.close();
          return;
        }
    }, c = r.request, { sessionTimeout: l } = n;
    if (l != null) {
      let p = 0;
      r.request = function() {
        const d = c.apply(this, arguments);
        return p++, a && (clearTimeout(a), a = null), d.once("close", () => {
          --p || (a = setTimeout(() => {
            a = null, o();
          }, l));
        }), d;
      };
    }
    r.once("close", o);
    let u = [r, n];
    return i ? i.push(u) : i = this.sessions[e] = [u], r;
  }
}
const mA = (t, e) => F.isAsyncFn(t) ? function(...n) {
  const i = n.pop();
  t.apply(this, n).then((r) => {
    try {
      e ? i(null, ...e(r)) : i(null, r);
    } catch (s) {
      i(s);
    }
  }, i);
} : t, gA = /* @__PURE__ */ new Set(["localhost", "0.0.0.0"]), Bb = (t) => {
  const e = t.split(".");
  return e.length !== 4 || e[0] !== "127" ? !1 : e.every((n) => /^\d+$/.test(n) && Number(n) >= 0 && Number(n) <= 255);
}, Jl = (t) => {
  if (/^0[xX][0-9a-fA-F]+$/.test(t)) {
    const e = parseInt(t.slice(2), 16);
    return Number.isFinite(e) ? e : null;
  }
  if (t.length > 1 && /^0[0-7]+$/.test(t)) {
    const e = parseInt(t, 8);
    return Number.isFinite(e) ? e : null;
  }
  if (t.length > 1 && /^0[0-9]+$/.test(t))
    return null;
  if (/^[0-9]+$/.test(t)) {
    const e = parseInt(t, 10);
    return Number.isFinite(e) ? e : null;
  }
  return null;
}, bA = (t) => {
  if (typeof t != "string" || !t || t.indexOf(":") !== -1)
    return t;
  let e = t;
  if (e.charAt(0) === "[" && e.charAt(e.length - 1) === "]" && (e = e.slice(1, -1)), e = e.replace(/\.+$/, ""), !/^[0-9.xXa-fA-F]+$/.test(e)) return t;
  const n = e.split(".");
  if (n.some((u) => u === "")) return t;
  if (n.length === 4) {
    const u = n.map(Jl);
    return u.some((p) => p === null || p < 0 || p > 255) ? t : u.join(".");
  }
  if (n.length > 4 || n.length === 1) return t;
  const i = n.slice(0, -1), r = n[n.length - 1], s = 4 - i.length, a = Jl(r);
  if (a === null) return t;
  const o = (1 << 8 * s) - 1;
  if (a < 0 || a > o) return t;
  const c = new Array(s).fill(0);
  for (let u = s - 1, p = a; u >= 0; u--, p >>= 8)
    c[u] = p & 255;
  const l = i.map(Jl);
  return l.some((u) => u === null || u < 0 || u > 255) ? t : [...l, ...c].join(".");
}, Ql = (t) => /^0{1,4}$/.test(t), yA = (t) => {
  if (t === "::") return !0;
  const e = t.indexOf("::");
  if (e !== -1) {
    if (e !== t.lastIndexOf("::")) return !1;
    const i = t.slice(0, e), r = t.slice(e + 2), s = i ? i.split(":") : [], a = r ? r.split(":") : [];
    return s.length + a.length < 8 && s.every(Ql) && a.every(Ql);
  }
  const n = t.split(":");
  return n.length === 8 && n.every(Ql);
}, vA = (t) => {
  if (t === "::1") return !0;
  const e = t.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (e) return Bb(e[1]);
  const n = t.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (n) {
    const r = parseInt(n[1], 16);
    return r >= 32512 && r <= 32767;
  }
  const i = t.split(":");
  if (i.length === 8) {
    for (let r = 0; r < 7; r++)
      if (!/^0+$/.test(i[r])) return !1;
    return /^0*1$/.test(i[7]);
  }
  return !1;
}, hh = (t) => t ? gA.has(t) || Bb(t) || yA(t) ? !0 : vA(t) : !1, xA = {
  http: 80,
  https: 443,
  ws: 80,
  wss: 443,
  ftp: 21
}, wA = (t) => {
  let e = t, n = 0;
  if (e.charAt(0) === "[") {
    const s = e.indexOf("]");
    if (s !== -1) {
      const a = e.slice(1, s), o = e.slice(s + 1);
      return o.charAt(0) === ":" && /^\d+$/.test(o.slice(1)) && (n = Number.parseInt(o.slice(1), 10)), [a, n];
    }
  }
  const i = e.indexOf(":"), r = e.lastIndexOf(":");
  return i !== -1 && i === r && /^\d+$/.test(e.slice(r + 1)) && (n = Number.parseInt(e.slice(r + 1), 10), e = e.slice(0, r)), [e, n];
}, _A = /^(?:::|(?:0{1,4}:){1,4}:|(?:0{1,4}:){5})ffff:(\d+\.\d+\.\d+\.\d+)$/i, SA = /^(?:::|(?:0{1,4}:){1,4}:|(?:0{1,4}:){5})ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i, EA = (t) => {
  if (typeof t != "string" || t.indexOf(":") === -1) return t;
  const e = t.match(_A);
  if (e) return e[1];
  const n = t.match(SA);
  if (n) {
    const i = parseInt(n[1], 16), r = parseInt(n[2], 16);
    return `${i >> 8}.${i & 255}.${r >> 8}.${r & 255}`;
  }
  return t;
}, mh = (t) => {
  if (!t)
    return t;
  t.charAt(0) === "[" && t.charAt(t.length - 1) === "]" && (t = t.slice(1, -1));
  const e = t.replace(/\.+$/, ""), n = bA(e);
  return n !== e ? n : EA(e);
};
function AA(t) {
  let e;
  try {
    e = new URL(t);
  } catch {
    return !1;
  }
  const n = (process.env.no_proxy || process.env.NO_PROXY || "").toLowerCase();
  if (!n)
    return !1;
  if (n === "*")
    return !0;
  const i = Number.parseInt(e.port, 10) || xA[e.protocol.split(":", 1)[0]] || 0, r = mh(e.hostname.toLowerCase());
  return n.split(/[\s,]+/).some((s) => {
    if (!s)
      return !1;
    if (s === "*")
      return !0;
    let [a, o] = wA(s);
    return a = mh(a), !a || o && o !== i ? !1 : (a.charAt(0) === "*" && (a = a.slice(1)), a.charAt(0) === "." ? r.endsWith(a) : r === a || hh(r) && hh(a));
  });
}
function TA(t, e) {
  t = t || 10;
  const n = new Array(t), i = new Array(t);
  let r = 0, s = 0, a;
  return e = e !== void 0 ? e : 1e3, function(c) {
    const l = Date.now(), u = i[s];
    a || (a = l), n[r] = c, i[r] = l;
    let p = s, d = 0;
    for (; p !== r; )
      d += n[p++], p = p % t;
    if (r = (r + 1) % t, r === s && (s = (s + 1) % t), l - a < e)
      return;
    const b = u && l - u;
    return b ? Math.round(d * 1e3 / b) : void 0;
  };
}
function RA(t, e) {
  let n = 0, i = 1e3 / e, r, s;
  const a = (l, u = Date.now()) => {
    n = u, r = null, s && (clearTimeout(s), s = null), t(...l);
  };
  return [(...l) => {
    const u = Date.now(), p = u - n;
    p >= i ? a(l, u) : (r = l, s || (s = setTimeout(() => {
      s = null, a(r);
    }, i - p)));
  }, () => r && a(r)];
}
const Zr = (t, e, n = 3) => {
  let i = 0;
  const r = TA(50, 250);
  return RA((s) => {
    if (!s || typeof s.loaded != "number")
      return;
    const a = s.loaded, o = s.lengthComputable ? s.total : void 0, c = Math.max(0, o != null ? Math.min(a, o) : a), l = Math.max(0, c - i), u = r(l);
    i = Math.max(i, c);
    const p = {
      loaded: c,
      total: o,
      progress: o ? c / o : void 0,
      bytes: l,
      rate: u || void 0,
      estimated: u && o ? (o - c) / u : void 0,
      event: s,
      lengthComputable: o != null,
      [e ? "download" : "upload"]: !0
    };
    t(p);
  }, n);
}, Qo = (t, e) => {
  const n = t != null;
  return [
    (i) => e[0]({
      lengthComputable: n,
      total: t,
      loaded: i
    }),
    e[1]
  ];
}, ec = (t, e = F.asap) => (...n) => e(() => t(...n)), gh = (t) => t >= 48 && t <= 57 || t >= 65 && t <= 70 || t >= 97 && t <= 102, Ub = (t, e, n) => e + 2 < n && gh(t.charCodeAt(e + 1)) && gh(t.charCodeAt(e + 2)), bh = (t) => t <= 57 ? t - 48 : (t & 223) - 55, OA = (t) => t >= 65 && t <= 90 || // A-Z
t >= 97 && t <= 122 || // a-z
t >= 48 && t <= 57 || // 0-9
t === 43 || // +
t === 47 || // /
t === 45 || // - (base64url)
t === 95, PA = (t) => t === 9 || t === 10 || t === 12 || t === 13 || t === 32, CA = (t) => {
  const e = Math.floor(t / 4), n = t % 4;
  return e * 3 + (n === 2 ? 1 : n === 3 ? 2 : 0);
}, zb = (t) => {
  const e = t.length;
  let n = 0;
  return e > 0 && t.charCodeAt(e - 1) === 61 && (n++, e > 1 && t.charCodeAt(e - 2) === 61 && n++), Math.floor((e - n) * 3 / 4);
}, kA = (t) => {
  const e = t.length;
  let n = 0, i = 0, r = !1;
  for (let s = 0; s < e; s++) {
    let a = t.charCodeAt(s);
    if (a === 37 && Ub(t, s, e) && (a = bh(t.charCodeAt(s + 1)) * 16 + bh(t.charCodeAt(s + 2)), s += 2), !PA(a)) {
      if (a === 61) {
        i++;
        continue;
      }
      if (!OA(a) || i > 0) {
        r = !0;
        continue;
      }
      n++;
    }
  }
  return r || i > 2 || i > 0 && (n + i) % 4 !== 0 || n % 4 === 1 ? zb(t) : CA(n);
}, Wb = (t, e) => {
  if (!t || typeof t != "string" || !t.startsWith("data:")) return 0;
  const n = t.indexOf(",");
  if (n < 0) return 0;
  const i = t.slice(5, n), r = t.slice(n + 1);
  if (/;base64/i.test(i))
    return e(r);
  let a = 0;
  for (let o = 0, c = r.length; o < c; o++) {
    const l = r.charCodeAt(o);
    if (l === 37 && Ub(r, o, c))
      a += 1, o += 2;
    else if (l < 128)
      a += 1;
    else if (l < 2048)
      a += 2;
    else if (l >= 55296 && l <= 56319 && o + 1 < c) {
      const u = r.charCodeAt(o + 1);
      u >= 56320 && u <= 57343 ? (a += 4, o++) : a += 3;
    } else
      a += 3;
  }
  return a;
};
function IA(t) {
  const e = typeof t == "string" ? t.indexOf("#") : -1;
  return Wb(
    e === -1 ? t : t.slice(0, e),
    kA
  );
}
function DA(t) {
  return Wb(t, zb);
}
const yh = {
  flush: Ht.constants.Z_SYNC_FLUSH,
  finishFlush: Ht.constants.Z_SYNC_FLUSH
}, jA = {
  flush: Ht.constants.BROTLI_OPERATION_FLUSH,
  finishFlush: Ht.constants.BROTLI_OPERATION_FLUSH
}, LA = {
  flush: Ht.constants.ZSTD_e_flush,
  finishFlush: Ht.constants.ZSTD_e_flush
}, qb = F.isFunction(Ht.createBrotliDecompress), Gb = F.isFunction(Ht.createZstdDecompress), Hb = "gzip, compress, deflate" + (qb ? ", br" : ""), NA = Hb + (Gb ? ", zstd" : ""), vh = typeof process < "u" && process.nextTick ? process.nextTick.bind(process) : F.asap, { http: FA, https: MA } = rA, wf = /https:?/, xh = Symbol("axios.http.socketListener"), ao = Symbol("axios.http.currentReq"), Vb = Symbol("axios.http.installedTunnel"), $A = /* @__PURE__ */ new Map(), wh = /* @__PURE__ */ new WeakMap(), _h = {
  22: 21,
  24: 5
};
function BA(t = process.versions && process.versions.node) {
  if (!t)
    return !1;
  const [e, n] = t.split(".").map((i) => Number(i));
  return !Number.isInteger(e) || !Number.isInteger(n) ? !1 : e > 24 ? !0 : _h[e] != null && n >= _h[e];
}
function UA(t, e = process.versions && process.versions.node) {
  if (!BA(e))
    return !1;
  const n = t && t.options;
  return !!(n && F.hasOwnProp(n, "proxyEnv") && n.proxyEnv != null);
}
function zA(t, e, n) {
  return wf.test(t.protocol) ? n || as.globalAgent : e || ss.globalAgent;
}
function WA(t, e) {
  const n = t.protocol + "//" + t.hostname + ":" + (t.port || "") + "#" + (t.auth || ""), i = e ? wh.get(e) || wh.set(e, /* @__PURE__ */ new Map()).get(e) : $A;
  let r = i.get(n);
  if (r) return r;
  const s = e && e.options ? { ...e.options, ...t } : t;
  if (r = new Ib(s), e && e.options) {
    const a = { ...e.options }, o = r.callback;
    r.callback = function(l, u) {
      return o.call(this, l, { ...a, ...u });
    };
  }
  return r[Vb] = !0, i.set(n, r), r;
}
const Sh = rt.protocols.map((t) => t + ":"), Eh = (t) => {
  if (!F.isString(t))
    return t;
  try {
    return decodeURIComponent(t);
  } catch {
    return t;
  }
}, Ah = (t, [e, n]) => (t.on("end", n).on("error", n), e), qA = new hA();
function GA(t, e, n) {
  t.beforeRedirects.proxy && t.beforeRedirects.proxy(t), t.beforeRedirects.auth && t.beforeRedirects.auth(t), t.beforeRedirects.sensitiveHeaders && t.beforeRedirects.sensitiveHeaders(t, n), t.beforeRedirects.config && t.beforeRedirects.config(t, e, n);
}
function HA(t, e) {
  t && Object.keys(t).forEach((n) => {
    e.has(n.toLowerCase()) && delete t[n];
  });
}
function VA(t, e) {
  if (!e)
    return !1;
  try {
    return new URL(e.url).origin === new URL(t.href).origin;
  } catch {
    return !1;
  }
}
function Kb(t, e, n, i, r, s) {
  let a = e;
  const o = zA(t, s, r);
  if (!a && a !== !1 && !UA(o)) {
    const c = d1(n);
    c && (AA(n) || (a = new URL(c)));
  }
  if (i && t.headers)
    for (const c of Object.keys(t.headers))
      c.toLowerCase() === "proxy-authorization" && delete t.headers[c];
  if (i && t.agent && t.agent[Vb] && (t.agent = void 0), a) {
    const c = a instanceof URL, l = (x) => c || F.hasOwnProp(a, x) ? a[x] : void 0, u = l("username"), p = l("password");
    let d = F.hasOwnProp(a, "auth") ? a.auth : void 0;
    if (u && (d = (u || "") + ":" + (p || "")), d) {
      const x = typeof d == "object", v = x && F.hasOwnProp(d, "username") ? d.username : void 0, y = x && F.hasOwnProp(d, "password") ? d.password : void 0;
      if (!!(v || y))
        d = (v || "") + ":" + (y || "");
      else if (x)
        throw new ce("Invalid proxy authorization", ce.ERR_BAD_OPTION, { proxy: a });
    }
    if (wf.test(t.protocol)) {
      if (!(r instanceof Ib)) {
        const x = l("hostname") || l("host"), v = l("port"), y = l("protocol"), f = y ? y.includes(":") ? y : `${y}:` : "http:", h = x && x.includes(":") && !x.startsWith("[") ? `[${x}]` : x, g = new URL(
          `${f}//${h}${v ? ":" + v : ""}`
        ), A = {
          protocol: g.protocol,
          hostname: g.hostname.replace(/^\[|\]$/g, ""),
          port: g.port,
          auth: d && typeof d == "string" ? d : void 0
        };
        g.protocol === "https:" && (A.ALPNProtocols = ["http/1.1"]);
        const C = WA(A, r);
        t.agent = C, t.agents && (t.agents.https = C);
      }
    } else {
      if (d) {
        const f = Buffer.from(d, "utf8").toString("base64");
        t.headers["Proxy-Authorization"] = "Basic " + f;
      }
      let x = !1;
      for (const f of Object.keys(t.headers))
        if (f.toLowerCase() === "host") {
          x = !0;
          break;
        }
      x || (t.headers.host = t.hostname + (t.port ? ":" + t.port : ""));
      const v = l("hostname") || l("host");
      t.hostname = v, t.host = v, t.port = l("port"), t.path = n;
      const y = l("protocol");
      y && (t.protocol = y.includes(":") ? y : `${y}:`);
    }
  }
  t.beforeRedirects.proxy = function(l) {
    Kb(
      l,
      e,
      l.href,
      !0,
      r,
      s
    );
  };
}
const KA = typeof process < "u" && F.kindOf(process) === "process", YA = (t) => new Promise((e, n) => {
  let i, r;
  const s = (c, l) => {
    r || (r = !0, i && i(c, l));
  }, a = (c) => {
    s(c), e(c);
  }, o = (c) => {
    s(c, !0), n(c);
  };
  t(a, o, (c) => i = c).catch(o);
}), ZA = ({ address: t, family: e }) => {
  if (!F.isString(t))
    throw TypeError("address must be a string");
  return {
    address: t,
    family: e || (t.indexOf(".") < 0 ? 6 : 4)
  };
}, Th = (t, e) => ZA(F.isObject(t) ? t : { address: t, family: e }), XA = {
  request(t, e) {
    const n = t.protocol + "//" + t.hostname + ":" + (t.port || (t.protocol === "https:" ? 443 : 80)), { http2Options: i, headers: r } = t, s = qA.getSession(n, i), { HTTP2_HEADER_SCHEME: a, HTTP2_HEADER_METHOD: o, HTTP2_HEADER_PATH: c, HTTP2_HEADER_STATUS: l } = Wg.constants, u = {
      [a]: t.protocol.replace(":", ""),
      [o]: t.method,
      [c]: t.path
    };
    F.forEach(r, (d, b) => {
      b.charAt(0) !== ":" && (u[b] = d);
    });
    const p = s.request(u);
    return p.once("response", (d) => {
      const b = p;
      d = Object.assign({}, d);
      const x = d[l];
      delete d[l], b.headers = d, b.statusCode = +x, e(b);
    }), p;
  }
}, JA = KA && function(e) {
  return YA(async function(i, r, s) {
    const a = (O) => F.getSafeProp(e, O), o = a("transitional") || Fc;
    let c = a("data"), l = a("lookup"), u = a("family"), p = a("httpVersion");
    p === void 0 && (p = 1);
    let d = a("http2Options");
    const b = a("httpAgent"), x = a("httpsAgent"), v = a("proxy"), y = a("responseType"), f = a("responseEncoding"), h = a("socketPath"), g = a("method").toUpperCase(), A = a("maxRedirects"), C = a("maxBodyLength"), V = a("maxContentLength"), K = a("decompress");
    let L, X = !1, D, B;
    if (p = +p, Number.isNaN(p))
      throw TypeError(`Invalid protocol version: '${e.httpVersion}' is not a number`);
    if (p !== 1 && p !== 2)
      throw TypeError(`Unsupported protocol version '${p}'`);
    const Y = p === 2;
    if (l) {
      const O = mA(l, (w) => F.isArray(w) ? w : [w]);
      l = (w, q, ee) => {
        O(w, q, (G, de, ve) => {
          if (G)
            return ee(G);
          const me = F.isArray(de) ? de.map((Te) => Th(Te)) : [Th(de, ve)];
          q.all ? ee(G, me) : ee(G, me[0].address, me[0].family);
        });
      };
    }
    const U = new e_();
    function ae(O) {
      try {
        U.emit(
          "abort",
          !O || O.type ? new pr(null, e, D) : O
        );
      } catch {
      }
    }
    function le() {
      B && (clearTimeout(B), B = null);
    }
    function pe() {
      const O = a("timeout");
      let w = O ? "timeout of " + O + "ms exceeded" : "timeout exceeded";
      const q = a("timeoutErrorMessage");
      return q && (w = q), new ce(
        w,
        o.clarifyTimeoutError ? ce.ETIMEDOUT : ce.ECONNABORTED,
        e,
        D
      );
    }
    U.once("abort", r);
    const z = () => {
      le(), e.cancelToken && e.cancelToken.unsubscribe(ae), e.signal && e.signal.removeEventListener("abort", ae), U.removeAllListeners();
    };
    (e.cancelToken || e.signal) && (e.cancelToken && e.cancelToken.subscribe(ae), e.signal && (e.signal.aborted ? ae() : e.signal.addEventListener("abort", ae))), s((O, w) => {
      if (L = !0, le(), w) {
        X = !0, z();
        return;
      }
      const { data: q } = O;
      if (q instanceof nt.Readable || q instanceof nt.Duplex) {
        const ee = nt.finished(q, () => {
          ee(), z();
        });
      } else
        z();
    });
    const k = lf(a("baseURL"), a("url"), a("allowAbsoluteUrls"), e), H = h ? "http://localhost" : rt.hasBrowserEnv ? rt.origin : void 0, R = new URL(k, H), Z = R.protocol || Sh[0];
    if (Z === "data:") {
      if (V > -1) {
        const w = String(a("url") || k || "");
        if (DA(w) > V)
          return r(
            new ce(
              "maxContentLength size of " + V + " exceeded",
              ce.ERR_BAD_RESPONSE,
              e
            )
          );
      }
      let O;
      if (g !== "GET")
        return Ir(i, r, {
          status: 405,
          statusText: "method not allowed",
          headers: {},
          config: e
        });
      try {
        O = aA(a("url"), y === "blob", {
          Blob: e.env && e.env.Blob
        });
      } catch (w) {
        throw ce.from(w, ce.ERR_BAD_REQUEST, e);
      }
      return y === "text" ? (O = O.toString(f), (!f || f === "utf8") && (O = F.stripBOM(O))) : y === "stream" && (O = nt.Readable.from(O)), Ir(i, r, {
        data: O,
        status: 200,
        statusText: "OK",
        headers: new vt(),
        config: e
      });
    }
    if (Sh.indexOf(Z) === -1)
      return r(
        new ce("Unsupported protocol " + Z, ce.ERR_BAD_REQUEST, e)
      );
    const se = vt.from(e.headers).normalize();
    se.set("User-Agent", "axios/" + zs, !1);
    const { onUploadProgress: te, onDownloadProgress: he } = e, Se = e.maxRate;
    let ye, T;
    if (F.isSpecCompliantForm(c)) {
      const O = se.getContentType(/boundary=([-_\w\d]{10,70})/i);
      c = fA(
        c,
        (w) => {
          se.set(w);
        },
        {
          tag: `axios-${zs}-boundary`,
          boundary: O && O[1] || void 0
        }
      );
    } else if (F.isFormData(c) && F.isFunction(c.getHeaders) && c.getHeaders !== Object.prototype.getHeaders) {
      if (Mb(se, c.getHeaders(), a("formDataHeaderPolicy")), !se.hasContentLength())
        try {
          const O = await xt.promisify(c.getLength).call(c);
          Number.isFinite(O) && O >= 0 && se.setContentLength(O);
        } catch {
        }
    } else if (F.isBlob(c) || F.isFile(c))
      c.size && se.setContentType(c.type || "application/octet-stream"), se.setContentLength(c.size || 0), c = nt.Readable.from($b(c));
    else if (c && !F.isStream(c)) {
      if (!Buffer.isBuffer(c)) if (F.isArrayBuffer(c))
        c = Buffer.from(new Uint8Array(c));
      else if (F.isString(c))
        c = Buffer.from(c, "utf-8");
      else
        return r(
          new ce(
            "Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream",
            ce.ERR_BAD_REQUEST,
            e
          )
        );
      if (se.setContentLength(c.length, !1), C > -1 && c.length > C)
        return r(
          new ce(
            "Request body larger than maxBodyLength limit",
            ce.ERR_BAD_REQUEST,
            e
          )
        );
    }
    const S = F.toFiniteNumber(se.getContentLength());
    F.isArray(Se) ? (ye = Se[0], T = Se[1]) : ye = T = Se, c && (te || ye) && (F.isStream(c) || (c = nt.Readable.from(c, { objectMode: !1 })), c = nt.pipeline(
      [
        c,
        new fh({
          maxRate: F.toFiniteNumber(ye)
        })
      ],
      F.noop
    ), te && c.on(
      "progress",
      Ah(
        c,
        Qo(
          S,
          Zr(ec(te, vh), !1, 3)
        )
      )
    ));
    let W;
    const J = a("auth");
    if (J) {
      const O = F.getSafeProp(J, "username") || "", w = F.getSafeProp(J, "password") || "";
      W = O + ":" + w;
    }
    if (!W && (R.username || R.password)) {
      const O = Eh(R.username), w = Eh(R.password);
      W = O + ":" + w;
    }
    W && se.delete("authorization");
    let ge;
    try {
      ge = of(
        R.pathname + R.search,
        a("params"),
        a("paramsSerializer")
      ).replace(/^\?/, "");
    } catch (O) {
      return r(
        ce.from(O, ce.ERR_BAD_REQUEST, e, null, null, {
          url: a("url"),
          exists: !0
        })
      );
    }
    se.set(
      "Accept-Encoding",
      F.hasOwnProp(o, "advertiseZstdAcceptEncoding") && o.advertiseZstdAcceptEncoding === !0 ? NA : Hb,
      !1
    );
    const oe = Object.assign(/* @__PURE__ */ Object.create(null), {
      path: ge,
      method: g,
      headers: tf(se),
      agents: { http: b, https: x },
      auth: W,
      protocol: Z,
      family: u,
      beforeRedirect: GA,
      beforeRedirects: /* @__PURE__ */ Object.create(null),
      http2Options: d
    });
    if (!F.isUndefined(l) && (oe.lookup = l), h) {
      if (typeof h != "string")
        return r(
          new ce("socketPath must be a string", ce.ERR_BAD_OPTION_VALUE, e)
        );
      const O = a("allowedSocketPaths");
      if (O != null) {
        const w = Array.isArray(O) ? O : [O], q = _d(h);
        if (!w.some(
          (G) => typeof G == "string" && _d(G) === q
        ))
          return r(
            new ce(
              `socketPath "${h}" is not permitted by allowedSocketPaths`,
              ce.ERR_BAD_OPTION_VALUE,
              e
            )
          );
      }
      oe.socketPath = h;
    } else
      oe.hostname = R.hostname.startsWith("[") ? R.hostname.slice(1, -1) : R.hostname, oe.port = R.port, Kb(
        oe,
        v,
        Z + "//" + R.hostname + (R.port ? ":" + R.port : "") + oe.path,
        !1,
        x,
        b
      );
    let $, j = !1, E = !1;
    const I = wf.test(oe.protocol);
    if (oe.agent == null && (oe.agent = I ? x : b), Y)
      $ = XA;
    else {
      const O = a("transport");
      if (O)
        $ = O;
      else if (A === 0)
        $ = I ? as : ss, j = !0;
      else {
        E = !0, oe.sensitiveHeaders = [], A && (oe.maxRedirects = A);
        const w = a("beforeRedirect");
        if (w && (oe.beforeRedirects.config = w), W) {
          const ee = R.origin, G = W;
          oe.beforeRedirects.auth = function(ve) {
            try {
              new URL(ve.href).origin === ee && (ve.auth = G);
            } catch {
            }
          };
        }
        const q = a("sensitiveHeaders");
        if (q != null) {
          if (!F.isArray(q))
            return r(
              new ce(
                "sensitiveHeaders must be an array of strings",
                ce.ERR_BAD_OPTION_VALUE,
                e
              )
            );
          const ee = /* @__PURE__ */ new Set();
          for (const G of q) {
            if (!F.isString(G))
              return r(
                new ce(
                  "sensitiveHeaders must be an array of strings",
                  ce.ERR_BAD_OPTION_VALUE,
                  e
                )
              );
            ee.add(G.toLowerCase());
          }
          ee.size && (oe.sensitiveHeaders = Array.from(ee), oe.beforeRedirects.sensitiveHeaders = function(de, ve) {
            VA(de, ve) || HA(de.headers, ee);
          });
        }
        $ = I ? MA : FA;
      }
    }
    C > -1 ? oe.maxBodyLength = C : oe.maxBodyLength = 1 / 0, oe.insecureHTTPParser = !!a("insecureHTTPParser"), D = $.request(oe, function(w) {
      if (le(), D.destroyed) return;
      const q = [w], ee = F.toFiniteNumber(w.headers["content-length"]);
      if (he || T) {
        const me = new fh({
          maxRate: F.toFiniteNumber(T)
        });
        he && me.on(
          "progress",
          Ah(
            me,
            Qo(
              ee,
              Zr(ec(he, vh), !0, 3)
            )
          )
        ), q.push(me);
      }
      let G = w;
      const de = w.req || D;
      if (K !== !1 && w.headers["content-encoding"])
        switch ((g === "HEAD" || w.statusCode === 204) && delete w.headers["content-encoding"], (w.headers["content-encoding"] || "").toLowerCase()) {
          case "gzip":
          case "x-gzip":
          case "compress":
          case "x-compress":
            q.push(Ht.createUnzip(yh)), delete w.headers["content-encoding"];
            break;
          case "deflate":
            q.push(new dA()), q.push(Ht.createUnzip(yh)), delete w.headers["content-encoding"];
            break;
          case "br":
            qb && (q.push(Ht.createBrotliDecompress(jA)), delete w.headers["content-encoding"]);
            break;
          case "zstd":
            Gb && (q.push(Ht.createZstdDecompress(LA)), delete w.headers["content-encoding"]);
            break;
        }
      G = q.length > 1 ? nt.pipeline(q, F.noop) : q[0];
      const ve = {
        status: w.statusCode,
        statusText: w.statusMessage,
        headers: new vt(w.headers),
        config: e,
        request: de
      };
      if (y === "stream") {
        if (V > -1) {
          const me = V, Te = G;
          async function* Le() {
            let Fe = 0;
            for await (const Ot of Te) {
              if (Fe += Ot.length, Fe > me)
                throw new ce(
                  "maxContentLength size of " + me + " exceeded",
                  ce.ERR_BAD_RESPONSE,
                  e,
                  de
                );
              yield Ot;
            }
          }
          G = nt.Readable.from(Le(), {
            objectMode: !1
          });
        }
        ve.data = G, Ir(i, r, ve);
      } else {
        const me = [];
        let Te = 0;
        G.on("data", function(Fe) {
          me.push(Fe), Te += Fe.length, V > -1 && Te > V && (X = !0, G.destroy(), ae(
            new ce(
              "maxContentLength size of " + V + " exceeded",
              ce.ERR_BAD_RESPONSE,
              e,
              de
            )
          ));
        }), G.on("aborted", function() {
          if (X)
            return;
          const Fe = new ce(
            "stream has been aborted",
            ce.ERR_BAD_RESPONSE,
            e,
            de,
            ve
          );
          G.destroy(Fe), r(Fe);
        }), G.on("error", function(Fe) {
          X || r(ce.from(Fe, null, e, de, ve));
        }), G.on("end", function() {
          try {
            let Fe = me.length === 1 ? me[0] : Buffer.concat(me);
            y !== "arraybuffer" && (Fe = Fe.toString(f), (!f || f === "utf8") && (Fe = F.stripBOM(Fe))), ve.data = Fe;
          } catch (Fe) {
            return r(ce.from(Fe, null, e, ve.request, ve));
          }
          Ir(i, r, ve);
        });
      }
      U.once("abort", (me) => {
        G.destroyed || (G.emit("error", me), G.destroy());
      });
    }), U.once("abort", (O) => {
      D.close ? D.close() : D.destroy(O);
    }), D.on("error", function(w) {
      r(ce.from(w, null, e, D));
    });
    const M = /* @__PURE__ */ new Set();
    if (D.on("socket", function(w) {
      typeof w.setKeepAlive == "function" && w.setKeepAlive(!0, 1e3 * 60), w[xh] || (w.on("error", function(ee) {
        const G = w[ao];
        G && !G.destroyed && G.destroy(ee);
      }), w[xh] = !0), w[ao] = D, M.add(w);
    }), D.once("close", function() {
      le();
      for (const w of M)
        w[ao] === D && (w[ao] = null);
      M.clear();
    }), a("timeout")) {
      const O = parseInt(a("timeout"), 10);
      if (Number.isNaN(O)) {
        ae(
          new ce(
            "error trying to parse `config.timeout` to int",
            ce.ERR_BAD_OPTION_VALUE,
            e,
            D
          )
        );
        return;
      }
      const w = function() {
        L || ae(pe());
      };
      j && O > 0 && (B = setTimeout(w, O)), D.setTimeout(O, w);
    } else
      D.setTimeout(0);
    if (F.isStream(c)) {
      let O = !1, w = !1;
      c.on("end", () => {
        O = !0;
      }), c.once("error", (ee) => {
        w = !0, D.destroy(ee);
      }), c.on("close", () => {
        !O && !w && ae(new pr("Request stream has been aborted", e, D));
      });
      let q = c;
      if (C > -1 && !E) {
        const ee = C;
        let G = 0;
        q = nt.pipeline(
          [
            c,
            new nt.Transform({
              transform(de, ve, me) {
                if (G += de.length, G > ee)
                  return me(
                    new ce(
                      "Request body larger than maxBodyLength limit",
                      ce.ERR_BAD_REQUEST,
                      e,
                      D
                    )
                  );
                me(null, de);
              }
            })
          ],
          F.noop
        ), q.on("error", (de) => {
          D.destroyed || D.destroy(de);
        });
      }
      q.pipe(D);
    } else
      c && D.write(c), D.end();
  });
}, QA = rt.hasStandardBrowserEnv ? /* @__PURE__ */ ((t, e) => (n) => (n = new URL(n, rt.origin), t.protocol === n.protocol && t.host === n.host && (e || t.port === n.port)))(
  new URL(rt.origin),
  rt.navigator && /(msie|trident)/i.test(rt.navigator.userAgent)
) : () => !0, eT = rt.hasStandardBrowserEnv ? (
  // Standard browser envs support document.cookie
  {
    write(t, e, n, i, r, s, a) {
      if (typeof document > "u") return;
      const o = [`${t}=${encodeURIComponent(e)}`];
      F.isNumber(n) && o.push(`expires=${new Date(n).toUTCString()}`), F.isString(i) && o.push(`path=${i}`), F.isString(r) && o.push(`domain=${r}`), s === !0 && o.push("secure"), F.isString(a) && o.push(`SameSite=${a}`), document.cookie = o.join("; ");
    },
    read(t) {
      if (typeof document > "u") return null;
      const e = document.cookie.split(";");
      for (let n = 0; n < e.length; n++) {
        const i = e[n].replace(/^\s+/, ""), r = i.indexOf("=");
        if (r !== -1 && i.slice(0, r) === t)
          try {
            return decodeURIComponent(i.slice(r + 1));
          } catch {
            return i.slice(r + 1);
          }
      }
      return null;
    },
    remove(t) {
      this.write(t, "", Date.now() - 864e5, "/");
    }
  }
) : (
  // Non-standard browser env (web workers, react-native) lack needed support.
  {
    write() {
    },
    read() {
      return null;
    },
    remove() {
    }
  }
), Rh = (t) => t instanceof vt ? { ...t } : t, tT = (t) => Object.getOwnPropertySymbols && Object.getOwnPropertyDescriptor ? Object.keys(t).concat(
  Object.getOwnPropertySymbols(t).filter(
    (e) => Object.getOwnPropertyDescriptor(t, e).enumerable
  )
) : Object.keys(t);
function dr(t, e) {
  t = t || {}, e = e || {};
  const n = /* @__PURE__ */ Object.create(null);
  Object.defineProperty(n, "hasOwnProperty", {
    // Null-proto descriptor so a polluted Object.prototype.get cannot turn
    // this data descriptor into an accessor descriptor on the way in.
    __proto__: null,
    value: Object.prototype.hasOwnProperty,
    enumerable: !1,
    writable: !0,
    configurable: !0
  });
  function i(u, p, d, b) {
    return F.isPlainObject(u) && F.isPlainObject(p) ? F.merge.call({ caseless: b }, u, p) : F.isPlainObject(p) ? F.merge({}, p) : F.isArray(p) ? p.slice() : p;
  }
  function r(u, p, d, b) {
    if (F.isUndefined(p)) {
      if (!F.isUndefined(u))
        return i(void 0, u, d, b);
    } else return i(u, p, d, b);
  }
  function s(u, p) {
    if (!F.isUndefined(p))
      return i(void 0, p);
  }
  function a(u, p) {
    if (F.isUndefined(p)) {
      if (!F.isUndefined(u))
        return i(void 0, u);
    } else return i(void 0, p);
  }
  function o(u) {
    const p = F.hasOwnProp(e, "transitional") ? e.transitional : void 0;
    if (!F.isUndefined(p))
      if (F.isPlainObject(p)) {
        if (F.hasOwnProp(p, u))
          return p[u];
      } else
        return;
    const d = F.hasOwnProp(t, "transitional") ? t.transitional : void 0;
    if (F.isPlainObject(d) && F.hasOwnProp(d, u))
      return d[u];
  }
  function c(u, p, d) {
    if (F.hasOwnProp(e, d))
      return i(u, p);
    if (F.hasOwnProp(t, d))
      return i(void 0, u);
  }
  const l = {
    url: s,
    method: s,
    data: s,
    baseURL: a,
    transformRequest: a,
    transformResponse: a,
    paramsSerializer: a,
    timeout: a,
    timeoutMessage: a,
    withCredentials: a,
    withXSRFToken: a,
    adapter: a,
    responseType: a,
    xsrfCookieName: a,
    xsrfHeaderName: a,
    onUploadProgress: a,
    onDownloadProgress: a,
    decompress: a,
    maxContentLength: a,
    maxBodyLength: a,
    beforeRedirect: a,
    transport: a,
    httpAgent: a,
    httpsAgent: a,
    cancelToken: a,
    socketPath: a,
    allowedSocketPaths: a,
    responseEncoding: a,
    validateStatus: c,
    headers: (u, p, d) => r(Rh(u), Rh(p), d, !0)
  };
  return F.forEach(tT({ ...t, ...e }), function(p) {
    if (p === "__proto__" || p === "constructor" || p === "prototype") return;
    const d = F.hasOwnProp(l, p) ? l[p] : r, b = F.hasOwnProp(t, p) ? t[p] : void 0, x = F.hasOwnProp(e, p) ? e[p] : void 0, v = d(b, x, p);
    F.isUndefined(v) && d !== c || (n[p] = v);
  }), F.hasOwnProp(e, "validateStatus") && F.isUndefined(e.validateStatus) && o("validateStatusUndefinedResolves") === !1 && (F.hasOwnProp(t, "validateStatus") ? n.validateStatus = i(void 0, t.validateStatus) : delete n.validateStatus), n;
}
const nT = (t) => encodeURIComponent(t).replace(
  /%([0-9A-F]{2})/gi,
  (e, n) => String.fromCharCode(parseInt(n, 16))
);
function Yb(t) {
  const e = dr({}, t), n = (d) => F.hasOwnProp(e, d) ? e[d] : void 0, i = n("data");
  let r = n("withXSRFToken");
  const s = n("xsrfHeaderName"), a = n("xsrfCookieName");
  let o = n("headers");
  const c = n("auth"), l = n("baseURL"), u = n("allowAbsoluteUrls"), p = n("url");
  if (e.headers = o = vt.from(o), e.url = of(
    lf(l, p, u, e),
    n("params"),
    n("paramsSerializer")
  ), c) {
    const d = F.getSafeProp(c, "username") || "", b = F.getSafeProp(c, "password") || "";
    try {
      o.set(
        "Authorization",
        "Basic " + btoa(d + ":" + (b ? nT(b) : ""))
      );
    } catch (x) {
      throw ce.from(x, ce.ERR_BAD_OPTION_VALUE, t);
    }
  }
  if (F.isFormData(i) && (rt.hasStandardBrowserEnv || rt.hasStandardBrowserWebWorkerEnv || F.isReactNative(i) ? o.setContentType(void 0) : F.isFunction(i.getHeaders) && Mb(o, i.getHeaders(), n("formDataHeaderPolicy"))), rt.hasStandardBrowserEnv && (F.isFunction(r) && (r = r(e)), r === !0 || r == null && QA(e.url))) {
    const b = s && a && eT.read(a);
    b && o.set(s, b);
  }
  return e;
}
const iT = typeof XMLHttpRequest < "u", rT = iT && function(t) {
  return new Promise(function(n, i) {
    const r = Yb(t);
    let s = r.data;
    const a = vt.from(r.headers).normalize();
    let { responseType: o, onUploadProgress: c, onDownloadProgress: l } = r, u, p, d, b, x;
    function v() {
      b && b(), x && x(), r.cancelToken && r.cancelToken.unsubscribe(u), r.signal && r.signal.removeEventListener("abort", u);
    }
    let y = new XMLHttpRequest();
    y.open(r.method.toUpperCase(), r.url, !0), y.timeout = r.timeout;
    function f() {
      if (!y)
        return;
      const g = vt.from(
        "getAllResponseHeaders" in y && y.getAllResponseHeaders()
      ), C = {
        data: !o || o === "text" || o === "json" ? y.responseText : y.response,
        status: y.status,
        statusText: y.statusText,
        headers: g,
        config: t,
        request: y
      };
      Ir(
        function(K) {
          n(K), v();
        },
        function(K) {
          i(K), v();
        },
        C
      ), y = null;
    }
    "onloadend" in y ? y.onloadend = f : y.onreadystatechange = function() {
      !y || y.readyState !== 4 || y.status === 0 && !(y.responseURL && y.responseURL.startsWith("file:")) || setTimeout(f);
    }, y.onabort = function() {
      y && (i(new ce("Request aborted", ce.ECONNABORTED, t, y)), v(), y = null);
    }, y.onerror = function(A) {
      const C = A && A.message ? A.message : "Network Error", V = new ce(C, ce.ERR_NETWORK, t, y);
      V.event = A || null, i(V), v(), y = null;
    }, y.ontimeout = function() {
      let A = r.timeout ? "timeout of " + r.timeout + "ms exceeded" : "timeout exceeded";
      const C = r.transitional || Fc;
      r.timeoutErrorMessage && (A = r.timeoutErrorMessage), i(
        new ce(
          A,
          C.clarifyTimeoutError ? ce.ETIMEDOUT : ce.ECONNABORTED,
          t,
          y
        )
      ), v(), y = null;
    }, s === void 0 && a.setContentType(null), "setRequestHeader" in y && F.forEach(tf(a), function(A, C) {
      y.setRequestHeader(C, A);
    }), F.isUndefined(r.withCredentials) || (y.withCredentials = !!r.withCredentials), o && o !== "json" && (y.responseType = r.responseType), l && ([d, x] = Zr(l, !0), y.addEventListener("progress", d)), c && y.upload && ([p, b] = Zr(c), y.upload.addEventListener("progress", p), y.upload.addEventListener("loadend", b)), (r.cancelToken || r.signal) && (u = (g) => {
      y && (i(!g || g.type ? new pr(null, t, y) : g), y.abort(), v(), y = null);
    }, r.cancelToken && r.cancelToken.subscribe(u), r.signal && (r.signal.aborted ? u() : r.signal.addEventListener("abort", u)));
    const h = Fb(r.url);
    if (h && !rt.protocols.includes(h)) {
      i(
        new ce(
          "Unsupported protocol " + h + ":",
          ce.ERR_BAD_REQUEST,
          t
        )
      ), v();
      return;
    }
    y.send(s || null);
  });
}, sT = (t, e) => {
  if (t = t ? t.filter(Boolean) : [], !e && !t.length)
    return;
  const n = new AbortController();
  let i = !1;
  const r = function(c) {
    if (!i) {
      i = !0, a();
      const l = c instanceof Error ? c : this.reason;
      n.abort(
        l instanceof ce ? l : new pr(l instanceof Error ? l.message : l)
      );
    }
  };
  let s = e && setTimeout(() => {
    s = null, r(new ce(`timeout of ${e}ms exceeded`, ce.ETIMEDOUT));
  }, e);
  const a = () => {
    t && (s && clearTimeout(s), s = null, t.forEach((c) => {
      c.unsubscribe ? c.unsubscribe(r) : c.removeEventListener("abort", r);
    }), t = null);
  };
  t.forEach((c) => {
    if (!i) {
      if (c.aborted) {
        r.call(c);
        return;
      }
      c.addEventListener("abort", r, { once: !0 });
    }
  });
  const { signal: o } = n;
  return o.unsubscribe = () => F.asap(a), o;
}, aT = function* (t, e) {
  let n = t.byteLength;
  if (n < e) {
    yield t;
    return;
  }
  let i = 0, r;
  for (; i < n; )
    r = i + e, yield t.slice(i, r), i = r;
}, oT = async function* (t, e) {
  for await (const n of cT(t))
    yield* aT(n, e);
}, cT = async function* (t) {
  if (t[Symbol.asyncIterator]) {
    yield* t;
    return;
  }
  const e = t.getReader();
  try {
    for (; ; ) {
      const { done: n, value: i } = await e.read();
      if (n)
        break;
      yield i;
    }
  } finally {
    await e.cancel();
  }
}, Oh = (t, e, n, i) => {
  const r = oT(t, e);
  let s = 0, a, o = (c) => {
    a || (a = !0, i && i(c));
  };
  return new ReadableStream(
    {
      async pull(c) {
        try {
          const { done: l, value: u } = await r.next();
          if (l) {
            o(), c.close();
            return;
          }
          let p = u.byteLength;
          if (n) {
            let d = s += p;
            n(d);
          }
          c.enqueue(new Uint8Array(u));
        } catch (l) {
          throw o(l), l;
        }
      },
      cancel(c) {
        return o(c), r.return();
      }
    },
    {
      highWaterMark: 2
    }
  );
}, Ph = 64 * 1024, { isFunction: oo } = F, lT = (t) => encodeURIComponent(t).replace(
  /%([0-9A-F]{2})/gi,
  (e, n) => String.fromCharCode(parseInt(n, 16))
), Ch = (t) => {
  if (!F.isString(t))
    return t;
  try {
    return decodeURIComponent(t);
  } catch {
    return t;
  }
}, kh = (t, ...e) => {
  try {
    return !!t(...e);
  } catch {
    return !1;
  }
}, uT = (t) => {
  const e = t.indexOf("://");
  let n = t;
  return e !== -1 && (n = n.slice(e + 3)), n.includes("@") || n.includes(":");
}, pT = (t) => {
  const e = F.global !== void 0 && F.global !== null ? F.global : globalThis, { ReadableStream: n, TextEncoder: i } = e;
  t = F.merge.call(
    {
      skipUndefined: !0
    },
    {
      Request: e.Request,
      Response: e.Response
    },
    t
  );
  const { fetch: r, Request: s, Response: a } = t, o = r ? oo(r) : typeof fetch == "function", c = oo(s), l = oo(a);
  if (!o)
    return !1;
  const u = o && oo(n), p = o && (typeof i == "function" ? /* @__PURE__ */ ((f) => (h) => f.encode(h))(new i()) : async (f) => new Uint8Array(await new s(f).arrayBuffer())), d = c && u && kh(() => {
    let f = !1;
    const h = new s(rt.origin, {
      body: new n(),
      method: "POST",
      get duplex() {
        return f = !0, "half";
      }
    }), g = h.headers.has("Content-Type");
    return h.body != null && h.body.cancel(), f && !g;
  }), b = l && u && kh(() => F.isReadableStream(new a("").body)), x = {
    stream: b && ((f) => f.body)
  };
  o && ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((f) => {
    !x[f] && (x[f] = (h, g) => {
      let A = h && h[f];
      if (A)
        return A.call(h);
      throw new ce(
        `Response type '${f}' is not supported`,
        ce.ERR_NOT_SUPPORT,
        g
      );
    });
  });
  const v = async (f) => {
    if (f == null)
      return 0;
    if (F.isBlob(f))
      return f.size;
    if (F.isSpecCompliantForm(f))
      return (await new s(rt.origin, {
        method: "POST",
        body: f
      }).arrayBuffer()).byteLength;
    if (F.isArrayBufferView(f) || F.isArrayBuffer(f))
      return f.byteLength;
    if (F.isURLSearchParams(f) && (f = f + ""), F.isString(f))
      return (await p(f)).byteLength;
  }, y = async (f, h) => {
    const g = F.toFiniteNumber(f.getContentLength());
    return g ?? v(h);
  };
  return async (f) => {
    let {
      url: h,
      method: g,
      data: A,
      signal: C,
      cancelToken: V,
      timeout: K,
      onDownloadProgress: L,
      onUploadProgress: X,
      responseType: D,
      headers: B,
      withCredentials: Y = "same-origin",
      fetchOptions: U,
      maxContentLength: ae,
      maxBodyLength: le
    } = Yb(f);
    const pe = F.isNumber(ae) && ae > -1, z = F.isNumber(le) && le > -1, k = (ye) => F.hasOwnProp(f, ye) ? f[ye] : void 0;
    let H = r || fetch;
    D = D ? (D + "").toLowerCase() : "text";
    let R = sT(
      [C, V && V.toAbortSignal()],
      K
    ), Z = null;
    const se = R && R.unsubscribe && (() => {
      R.unsubscribe();
    });
    let te, he = null;
    const Se = () => new ce(
      "Request body larger than maxBodyLength limit",
      ce.ERR_BAD_REQUEST,
      f,
      Z
    );
    try {
      let ye;
      const T = k("auth");
      if (T) {
        const I = F.getSafeProp(T, "username") || "", M = F.getSafeProp(T, "password") || "";
        ye = {
          username: I,
          password: M
        };
      }
      if (uT(h)) {
        const I = new URL(h, rt.origin);
        if (!ye && (I.username || I.password)) {
          const M = Ch(I.username), O = Ch(I.password);
          ye = {
            username: M,
            password: O
          };
        }
        (I.username || I.password) && (I.username = "", I.password = "", h = I.href);
      }
      if (ye && (B.delete("authorization"), B.set(
        "Authorization",
        "Basic " + btoa(lT((ye.username || "") + ":" + (ye.password || "")))
      )), pe && typeof h == "string" && h.startsWith("data:") && IA(h) > ae)
        throw new ce(
          "maxContentLength size of " + ae + " exceeded",
          ce.ERR_BAD_RESPONSE,
          f,
          Z
        );
      if (z && g !== "get" && g !== "head") {
        const I = await v(A);
        if (typeof I == "number" && isFinite(I) && (te = I, I > le))
          throw Se();
      }
      const S = z && (F.isReadableStream(A) || F.isStream(A)), W = (I, M, O) => Oh(
        I,
        Ph,
        (w) => {
          if (z && w > le)
            throw he = Se();
          M && M(w);
        },
        O
      );
      if (d && g !== "get" && g !== "head" && (X || S)) {
        if (te = te ?? await y(B, A), te !== 0 || S) {
          let I = new s(h, {
            method: "POST",
            body: A,
            duplex: "half"
          }), M;
          if (F.isFormData(A) && (M = I.headers.get("content-type")) && B.setContentType(M), I.body) {
            const [O, w] = X && Qo(
              te,
              Zr(ec(X))
            ) || [];
            A = W(I.body, O, w);
          }
        }
      } else if (S && !c && u && g !== "get" && g !== "head")
        A = W(A);
      else if (S && c && !d && g !== "get" && g !== "head")
        throw new ce(
          "Stream request bodies are not supported by the current fetch implementation",
          ce.ERR_NOT_SUPPORT,
          f,
          Z
        );
      F.isString(Y) || (Y = Y ? "include" : "omit");
      const J = c && "credentials" in s.prototype;
      if (F.isFormData(A)) {
        const I = B.getContentType();
        I && /^multipart\/form-data/i.test(I) && !/boundary=/i.test(I) && B.delete("content-type");
      }
      B.set("User-Agent", "axios/" + zs, !1);
      const ge = {
        ...U,
        signal: R,
        method: g.toUpperCase(),
        headers: tf(B.normalize()),
        body: A,
        duplex: "half",
        credentials: J ? Y : void 0
      };
      Z = c && new s(h, ge);
      let oe = await (c ? H(Z, U) : H(h, ge));
      const $ = vt.from(oe.headers);
      if (pe) {
        const I = F.toFiniteNumber($.getContentLength());
        if (I != null && I > ae)
          throw new ce(
            "maxContentLength size of " + ae + " exceeded",
            ce.ERR_BAD_RESPONSE,
            f,
            Z
          );
      }
      const j = b && (D === "stream" || D === "response");
      if (b && oe.body && (L || pe || j && se)) {
        const I = {};
        ["status", "statusText", "headers"].forEach((G) => {
          I[G] = oe[G];
        });
        const M = F.toFiniteNumber($.getContentLength()), [O, w] = L && Qo(
          M,
          Zr(ec(L), !0)
        ) || [];
        let q = 0;
        const ee = (G) => {
          if (pe && (q = G, q > ae))
            throw new ce(
              "maxContentLength size of " + ae + " exceeded",
              ce.ERR_BAD_RESPONSE,
              f,
              Z
            );
          O && O(G);
        };
        oe = new a(
          Oh(oe.body, Ph, ee, () => {
            w && w(), se && se();
          }),
          I
        );
      }
      D = D || "text";
      let E = await x[F.findKey(x, D) || "text"](
        oe,
        f
      );
      if (pe && !b && !j) {
        let I;
        if (E != null && (typeof E.byteLength == "number" ? I = E.byteLength : typeof E.size == "number" ? I = E.size : typeof E == "string" && (I = typeof i == "function" ? new i().encode(E).byteLength : E.length)), typeof I == "number" && I > ae)
          throw new ce(
            "maxContentLength size of " + ae + " exceeded",
            ce.ERR_BAD_RESPONSE,
            f,
            Z
          );
      }
      return !j && se && se(), await new Promise((I, M) => {
        Ir(I, M, {
          data: E,
          headers: vt.from(oe.headers),
          status: oe.status,
          statusText: oe.statusText,
          config: f,
          request: Z
        });
      });
    } catch (ye) {
      if (se && se(), R && R.aborted && R.reason instanceof ce) {
        const T = R.reason;
        throw T.config = f, Z && (T.request = Z), ye !== T && Object.defineProperty(T, "cause", {
          __proto__: null,
          value: ye,
          writable: !0,
          enumerable: !1,
          configurable: !0
        }), T;
      }
      if (he)
        throw Z && !he.request && (he.request = Z), he;
      if (ye instanceof ce)
        throw Z && !ye.request && (ye.request = Z), ye;
      if (ye && ye.name === "TypeError" && /Load failed|fetch/i.test(ye.message)) {
        const T = new ce(
          "Network Error",
          ce.ERR_NETWORK,
          f,
          Z,
          ye && ye.response
        );
        throw Object.defineProperty(T, "cause", {
          __proto__: null,
          value: ye.cause || ye,
          writable: !0,
          enumerable: !1,
          configurable: !0
        }), T;
      }
      throw ce.from(ye, ye && ye.code, f, Z, ye && ye.response);
    }
  };
}, fT = /* @__PURE__ */ new Map(), Zb = (t) => {
  let e = t && t.env || {};
  const { fetch: n, Request: i, Response: r } = e, s = [i, r, n];
  let a = s.length, o = a, c, l, u = fT;
  for (; o--; )
    c = s[o], l = u.get(c), l === void 0 && u.set(c, l = o ? /* @__PURE__ */ new Map() : pT(e)), u = l;
  return l;
};
Zb();
const _f = {
  http: JA,
  xhr: rT,
  fetch: {
    get: Zb
  }
};
F.forEach(_f, (t, e) => {
  if (t) {
    try {
      Object.defineProperty(t, "name", { __proto__: null, value: e });
    } catch {
    }
    Object.defineProperty(t, "adapterName", { __proto__: null, value: e });
  }
});
const Ih = (t) => `- ${t}`, dT = (t) => F.isFunction(t) || t === null || t === !1;
function hT(t, e) {
  t = F.isArray(t) ? t : [t];
  const { length: n } = t;
  let i, r;
  const s = {};
  for (let a = 0; a < n; a++) {
    i = t[a];
    let o;
    if (r = i, !dT(i) && (r = _f[(o = String(i)).toLowerCase()], r === void 0))
      throw new ce(`Unknown adapter '${o}'`);
    if (r && (F.isFunction(r) || (r = r.get(e))))
      break;
    s[o || "#" + a] = r;
  }
  if (!r) {
    const a = Object.entries(s).map(
      ([c, l]) => `adapter ${c} ` + (l === !1 ? "is not supported by the environment" : "is not available in the build")
    );
    let o = n ? a.length > 1 ? `since :
` + a.map(Ih).join(`
`) : " " + Ih(a[0]) : "as no adapter specified";
    throw new ce(
      "There is no suitable adapter to dispatch the request " + o,
      ce.ERR_NOT_SUPPORT
    );
  }
  return r;
}
const Xb = {
  /**
   * Resolve an adapter from a list of adapter names or functions.
   * @type {Function}
   */
  getAdapter: hT,
  /**
   * Exposes all known adapters
   * @type {Object<string, Function|Object>}
   */
  adapters: _f
};
function eu(t) {
  if (t.cancelToken && t.cancelToken.throwIfRequested(), t.signal && t.signal.aborted)
    throw new pr(null, t);
}
function tu(t) {
  return eu(t), t.headers = vt.from(t.headers), t.data = ql.call(t, t.transformRequest), ["post", "put", "patch"].indexOf(t.method) !== -1 && t.headers.setContentType("application/x-www-form-urlencoded", !1), Xb.getAdapter(t.adapter || ka.adapter, t)(t).then(
    function(i) {
      eu(t), t.response = i;
      try {
        i.data = ql.call(t, t.transformResponse, i);
      } finally {
        delete t.response;
      }
      return i.headers = vt.from(i.headers), i;
    },
    function(i) {
      if (!Pb(i) && (eu(t), i && i.response)) {
        t.response = i.response;
        try {
          i.response.data = ql.call(
            t,
            t.transformResponse,
            i.response
          );
        } finally {
          delete t.response;
        }
        i.response.headers = vt.from(i.response.headers);
      }
      return Promise.reject(i);
    }
  );
}
const $c = {};
["object", "boolean", "number", "function", "string", "symbol"].forEach((t, e) => {
  $c[t] = function(i) {
    return typeof i === t || "a" + (e < 1 ? "n " : " ") + t;
  };
});
const Dh = {};
$c.transitional = function(e, n, i) {
  function r(s, a) {
    return "[Axios v" + zs + "] Transitional option '" + s + "'" + a + (i ? ". " + i : "");
  }
  return (s, a, o) => {
    if (e === !1)
      throw new ce(
        r(a, " has been removed" + (n ? " in " + n : "")),
        ce.ERR_DEPRECATED
      );
    return n && !Dh[a] && (Dh[a] = !0, console.warn(
      r(
        a,
        " has been deprecated since v" + n + " and will be removed in the near future"
      )
    )), e ? e(s, a, o) : !0;
  };
};
$c.spelling = function(e) {
  return (n, i) => (console.warn(`${i} is likely a misspelling of ${e}`), !0);
};
function mT(t, e, n) {
  if (typeof t != "object" || t === null)
    throw new ce("options must be an object", ce.ERR_BAD_OPTION_VALUE);
  const i = Object.keys(t);
  let r = i.length;
  for (; r-- > 0; ) {
    const s = i[r], a = Object.prototype.hasOwnProperty.call(e, s) ? e[s] : void 0;
    if (a) {
      const o = t[s], c = o === void 0 || a(o, s, t);
      if (c !== !0)
        throw new ce(
          "option " + s + " must be " + c,
          ce.ERR_BAD_OPTION_VALUE
        );
      continue;
    }
    if (n !== !0)
      throw new ce("Unknown option " + s, ce.ERR_BAD_OPTION);
  }
}
const Io = {
  assertOptions: mT,
  validators: $c
}, Lt = Io.validators;
let ar = class {
  constructor(e) {
    this.defaults = e || {}, this.interceptors = {
      request: new eh(),
      response: new eh()
    };
  }
  /**
   * Dispatch a request
   *
   * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
   * @param {?Object} config
   *
   * @returns {Promise} The Promise to be fulfilled
   */
  async request(e, n) {
    try {
      return await this._request(e, n);
    } catch (i) {
      if (i instanceof Error) {
        let r = {};
        Error.captureStackTrace ? Error.captureStackTrace(r) : r = new Error();
        const s = (() => {
          if (!r.stack)
            return "";
          const a = r.stack.indexOf(`
`);
          return a === -1 ? "" : r.stack.slice(a + 1);
        })();
        try {
          if (!i.stack)
            i.stack = s;
          else if (s) {
            const a = s.indexOf(`
`), o = a === -1 ? -1 : s.indexOf(`
`, a + 1), c = o === -1 ? "" : s.slice(o + 1);
            String(i.stack).endsWith(c) || (i.stack += `
` + s);
          }
        } catch {
        }
      }
      throw i;
    }
  }
  _request(e, n) {
    typeof e == "string" ? (n = n || {}, n.url = e) : n = e || {}, n = dr(this.defaults, n);
    const { transitional: i, paramsSerializer: r, headers: s } = n;
    i !== void 0 && Io.assertOptions(
      i,
      {
        silentJSONParsing: Lt.transitional(Lt.boolean),
        forcedJSONParsing: Lt.transitional(Lt.boolean),
        clarifyTimeoutError: Lt.transitional(Lt.boolean),
        legacyInterceptorReqResOrdering: Lt.transitional(Lt.boolean),
        advertiseZstdAcceptEncoding: Lt.transitional(Lt.boolean),
        validateStatusUndefinedResolves: Lt.transitional(Lt.boolean)
      },
      !1
    ), r != null && (F.isFunction(r) ? n.paramsSerializer = {
      serialize: r
    } : Io.assertOptions(
      r,
      {
        encode: Lt.function,
        serialize: Lt.function
      },
      !0
    )), n.allowAbsoluteUrls !== void 0 || (this.defaults.allowAbsoluteUrls !== void 0 ? n.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls : n.allowAbsoluteUrls = !0), Io.assertOptions(
      n,
      {
        baseUrl: Lt.spelling("baseURL"),
        withXsrfToken: Lt.spelling("withXSRFToken")
      },
      !0
    ), n.method = (n.method || this.defaults.method || "get").toLowerCase();
    let a = s && F.merge(s.common, s[n.method]);
    s && F.forEach(["delete", "get", "head", "post", "put", "patch", "query", "common"], (x) => {
      delete s[x];
    }), n.headers = vt.concat(a, s);
    const o = [];
    let c = !0;
    this.interceptors.request.forEach(function(v) {
      if (typeof v.runWhen == "function" && v.runWhen(n) === !1)
        return;
      c = c && v.synchronous;
      const y = n.transitional || Fc;
      y && y.legacyInterceptorReqResOrdering ? o.unshift(v.fulfilled, v.rejected) : o.push(v.fulfilled, v.rejected);
    });
    const l = [];
    this.interceptors.response.forEach(function(v) {
      l.push(v.fulfilled, v.rejected);
    });
    let u, p = 0, d;
    if (!c) {
      const x = [tu.bind(this), void 0];
      for (x.unshift(...o), x.push(...l), d = x.length, u = Promise.resolve(n); p < d; )
        u = u.then(x[p++], x[p++]);
      return u;
    }
    d = o.length;
    let b = n;
    for (; p < d; ) {
      const x = o[p++], v = o[p++];
      try {
        b = x ? x(b) : b;
      } catch (y) {
        if (!v) {
          u = Promise.reject(y);
          break;
        }
        try {
          const f = v.call(this, y);
          F.isThenable(f) && (u = Promise.resolve(f).then(
            () => tu.call(this, b)
          ));
        } catch (f) {
          u = Promise.reject(f);
        }
        break;
      }
    }
    if (!u)
      try {
        u = tu.call(this, b);
      } catch (x) {
        u = Promise.reject(x);
      }
    for (p = 0, d = l.length; p < d; )
      u = u.then(l[p++], l[p++]);
    return u;
  }
  getUri(e) {
    e = dr(this.defaults, e);
    const n = lf(e.baseURL, e.url, e.allowAbsoluteUrls, e);
    return of(n, e.params, e.paramsSerializer);
  }
};
F.forEach(["delete", "get", "head", "options"], function(e) {
  ar.prototype[e] = function(n, i) {
    return this.request(
      dr(i || {}, {
        method: e,
        url: n,
        data: i && F.hasOwnProp(i, "data") ? i.data : void 0
      })
    );
  };
});
F.forEach(["post", "put", "patch", "query"], function(e) {
  function n(i) {
    return function(s, a, o) {
      return this.request(
        dr(o || {}, {
          method: e,
          headers: i ? {
            "Content-Type": "multipart/form-data"
          } : {},
          url: s,
          data: a
        })
      );
    };
  }
  ar.prototype[e] = n(), e !== "query" && (ar.prototype[e + "Form"] = n(!0));
});
let gT = class Jb {
  constructor(e) {
    if (typeof e != "function")
      throw new TypeError("executor must be a function.");
    let n;
    this.promise = new Promise(function(s) {
      n = s;
    });
    const i = this;
    this.promise.then((r) => {
      if (!i._listeners) return;
      let s = i._listeners.length;
      for (; s-- > 0; )
        i._listeners[s](r);
      i._listeners = null;
    }), this.promise.then = (r) => {
      let s;
      const a = new Promise((o) => {
        i.subscribe(o), s = o;
      }).then(r);
      return a.cancel = function() {
        i.unsubscribe(s);
      }, a;
    }, e(function(s, a, o) {
      i.reason || (i.reason = new pr(s, a, o), n(i.reason));
    });
  }
  /**
   * Throws a `CanceledError` if cancellation has been requested.
   */
  throwIfRequested() {
    if (this.reason)
      throw this.reason;
  }
  /**
   * Subscribe to the cancel signal
   */
  subscribe(e) {
    if (this.reason) {
      e(this.reason);
      return;
    }
    this._listeners ? this._listeners.push(e) : this._listeners = [e];
  }
  /**
   * Unsubscribe from the cancel signal
   */
  unsubscribe(e) {
    if (!this._listeners)
      return;
    const n = this._listeners.indexOf(e);
    n !== -1 && this._listeners.splice(n, 1);
  }
  toAbortSignal() {
    const e = new AbortController(), n = (i) => {
      e.abort(i);
    };
    return this.subscribe(n), e.signal.unsubscribe = () => this.unsubscribe(n), e.signal;
  }
  /**
   * Returns an object that contains a new `CancelToken` and a function that, when called,
   * cancels the `CancelToken`.
   */
  static source() {
    let e;
    return {
      token: new Jb(function(r) {
        e = r;
      }),
      cancel: e
    };
  }
};
function bT(t) {
  return function(n) {
    return t.apply(null, n);
  };
}
function yT(t) {
  return F.isObject(t) && t.isAxiosError === !0;
}
const fp = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511,
  WebServerReturnsAnUnknownError: 520,
  WebServerIsDown: 521,
  ConnectionTimedOut: 522,
  OriginIsUnreachable: 523,
  TimeoutOccurred: 524,
  SslHandshakeFailed: 525,
  InvalidSslCertificate: 526
};
Object.entries(fp).forEach(([t, e]) => {
  fp[e] = t;
});
function Qb(t) {
  const e = new ar(t), n = Hg(ar.prototype.request, e);
  return F.extend(n, ar.prototype, e, { allOwnKeys: !0 }), F.extend(n, e, null, { allOwnKeys: !0 }), n.create = function(r) {
    return Qb(dr(t, r));
  }, n;
}
const Qe = Qb(ka);
Qe.Axios = ar;
Qe.CanceledError = pr;
Qe.CancelToken = gT;
Qe.isCancel = Pb;
Qe.VERSION = zs;
Qe.toFormData = Nc;
Qe.AxiosError = ce;
Qe.Cancel = Qe.CanceledError;
Qe.all = function(e) {
  return Promise.all(e);
};
Qe.spread = bT;
Qe.isAxiosError = yT;
Qe.mergeConfig = dr;
Qe.AxiosHeaders = vt;
Qe.formToJSON = (t) => Ob(F.isHTMLForm(t) ? new FormData(t) : t);
Qe.getAdapter = Xb.getAdapter;
Qe.HttpStatusCode = fp;
Qe.default = Qe;
const {
  Axios: V3,
  AxiosError: K3,
  CanceledError: Y3,
  isCancel: Z3,
  CancelToken: X3,
  VERSION: J3,
  all: Q3,
  Cancel: e$,
  isAxiosError: t$,
  spread: n$,
  toFormData: i$,
  AxiosHeaders: r$,
  HttpStatusCode: s$,
  formToJSON: a$,
  getAdapter: o$,
  mergeConfig: c$,
  create: l$
} = Qe, jh = "https://www.picgo.net/api/1/upload";
function Lh() {
  var e, n;
  const t = ((e = Ve.getAppSettings().picgoApiKey) == null ? void 0 : e.trim()) || ((n = process.env.PICGO_API_KEY) == null ? void 0 : n.trim());
  if (!t)
    throw new Error("未配置 PicGo API Key，请先在系统设置的“存储与上传”中配置");
  return t;
}
class vT {
  /**
   * 上传图片到 PicGo
   * @param request - 上传请求（base64 图片 + 选项）
   * @returns 上传结果
   */
  async uploadImage(e) {
    var a;
    const { base64: n, filename: i, mimetype: r, options: s = {} } = e;
    try {
      const o = new Bs(), c = Buffer.from(n, "base64");
      o.append("source", c, {
        filename: i,
        contentType: r
      }), s.title && o.append("title", s.title), s.description && o.append("description", s.description), s.tags && o.append("tags", s.tags), s.albumId && o.append("album_id", s.albumId), s.categoryId && o.append("category_id", s.categoryId), s.width && o.append("width", s.width.toString()), s.expiration && o.append("expiration", s.expiration), s.nsfw !== void 0 && o.append("nsfw", s.nsfw.toString()), o.append("format", "json");
      const u = (await Qe.post(jh, o, {
        headers: {
          ...o.getHeaders(),
          "X-API-Key": Lh()
        },
        maxContentLength: 1 / 0,
        maxBodyLength: 1 / 0
      })).data;
      return u.status_code === 200 ? {
        success: !0,
        url: u.image.url,
        thumbUrl: ((a = u.image.thumb) == null ? void 0 : a.url) || u.image.url,
        deleteUrl: u.image.delete_url,
        name: u.image.name,
        size: u.image.size,
        width: u.image.width,
        height: u.image.height
      } : {
        success: !1,
        error: u.status_txt || "上传失败"
      };
    } catch (o) {
      return console.error("上传失败:", o.message), o.response ? {
        success: !1,
        error: `HTTP ${o.response.status}: ${JSON.stringify(o.response.data).slice(0, 200)}`
      } : {
        success: !1,
        error: o.message || "服务器内部错误"
      };
    }
  }
  /**
   * 从 URL 上传图片到 PicGo
   * @param imageUrl - 图片 URL
   * @param options - 上传选项
   */
  async uploadImageFromUrl(e, n = {}) {
    var i;
    try {
      const r = new Bs();
      r.append("source", e), n.title && r.append("title", n.title), n.description && r.append("description", n.description), n.tags && r.append("tags", n.tags), n.albumId && r.append("album_id", n.albumId), n.categoryId && r.append("category_id", n.categoryId), n.width && r.append("width", n.width.toString()), n.expiration && r.append("expiration", n.expiration), n.nsfw !== void 0 && r.append("nsfw", n.nsfw.toString()), r.append("format", "json");
      const a = (await Qe.post(jh, r, {
        headers: {
          ...r.getHeaders(),
          "X-API-Key": Lh()
        },
        maxContentLength: 1 / 0,
        maxBodyLength: 1 / 0
      })).data;
      return a.status_code === 200 ? {
        success: !0,
        url: a.image.url,
        thumbUrl: ((i = a.image.thumb) == null ? void 0 : i.url) || a.image.url,
        deleteUrl: a.image.delete_url,
        name: a.image.name,
        size: a.image.size,
        width: a.image.width,
        height: a.image.height
      } : {
        success: !1,
        error: a.status_txt || "上传失败"
      };
    } catch (r) {
      return {
        success: !1,
        error: r.message || "上传失败"
      };
    }
  }
}
const Nh = new vT(), xT = typeof process == "object" && process && process.platform === "win32";
var wT = xT ? { sep: "\\" } : { sep: "/" }, _T = ey;
function ey(t, e, n) {
  t instanceof RegExp && (t = Fh(t, n)), e instanceof RegExp && (e = Fh(e, n));
  var i = ty(t, e, n);
  return i && {
    start: i[0],
    end: i[1],
    pre: n.slice(0, i[0]),
    body: n.slice(i[0] + t.length, i[1]),
    post: n.slice(i[1] + e.length)
  };
}
function Fh(t, e) {
  var n = e.match(t);
  return n ? n[0] : null;
}
ey.range = ty;
function ty(t, e, n) {
  var i, r, s, a, o, c = n.indexOf(t), l = n.indexOf(e, c + 1), u = c;
  if (c >= 0 && l > 0) {
    if (t === e)
      return [c, l];
    for (i = [], s = n.length; u >= 0 && !o; )
      u == c ? (i.push(u), c = n.indexOf(t, u + 1)) : i.length == 1 ? o = [i.pop(), l] : (r = i.pop(), r < s && (s = r, a = l), l = n.indexOf(e, u + 1)), u = c < l && c >= 0 ? c : l;
    i.length && (o = [s, a]);
  }
  return o;
}
var ny = _T, iy = AT, ry = "\0SLASH" + Math.random() + "\0", sy = "\0OPEN" + Math.random() + "\0", Sf = "\0CLOSE" + Math.random() + "\0", ay = "\0COMMA" + Math.random() + "\0", oy = "\0PERIOD" + Math.random() + "\0";
function nu(t) {
  return parseInt(t, 10) == t ? parseInt(t, 10) : t.charCodeAt(0);
}
function ST(t) {
  return t.split("\\\\").join(ry).split("\\{").join(sy).split("\\}").join(Sf).split("\\,").join(ay).split("\\.").join(oy);
}
function ET(t) {
  return t.split(ry).join("\\").split(sy).join("{").split(Sf).join("}").split(ay).join(",").split(oy).join(".");
}
function cy(t) {
  if (!t)
    return [""];
  var e = [], n = ny("{", "}", t);
  if (!n)
    return t.split(",");
  var i = n.pre, r = n.body, s = n.post, a = i.split(",");
  a[a.length - 1] += "{" + r + "}";
  var o = cy(s);
  return s.length && (a[a.length - 1] += o.shift(), a.push.apply(a, o)), e.push.apply(e, a), e;
}
function AT(t) {
  return t ? (t.substr(0, 2) === "{}" && (t = "\\{\\}" + t.substr(2)), Rs(ST(t), !0).map(ET)) : [];
}
function TT(t) {
  return "{" + t + "}";
}
function RT(t) {
  return /^-?0\d/.test(t);
}
function OT(t, e) {
  return t <= e;
}
function PT(t, e) {
  return t >= e;
}
function Rs(t, e) {
  var n = [], i = ny("{", "}", t);
  if (!i) return [t];
  var r = i.pre, s = i.post.length ? Rs(i.post, !1) : [""];
  if (/\$$/.test(i.pre))
    for (var a = 0; a < s.length; a++) {
      var o = r + "{" + i.body + "}" + s[a];
      n.push(o);
    }
  else {
    var c = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(i.body), l = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(i.body), u = c || l, p = i.body.indexOf(",") >= 0;
    if (!u && !p)
      return i.post.match(/,(?!,).*\}/) ? (t = i.pre + "{" + i.body + Sf + i.post, Rs(t)) : [t];
    var d;
    if (u)
      d = i.body.split(/\.\./);
    else if (d = cy(i.body), d.length === 1 && (d = Rs(d[0], !1).map(TT), d.length === 1))
      return s.map(function(D) {
        return i.pre + d[0] + D;
      });
    var b;
    if (u) {
      var x = nu(d[0]), v = nu(d[1]), y = Math.max(d[0].length, d[1].length), f = d.length == 3 ? Math.max(Math.abs(nu(d[2])), 1) : 1, h = OT, g = v < x;
      g && (f *= -1, h = PT);
      var A = d.some(RT);
      b = [];
      for (var C = x; h(C, v); C += f) {
        var V;
        if (l)
          V = String.fromCharCode(C), V === "\\" && (V = "");
        else if (V = String(C), A) {
          var K = y - V.length;
          if (K > 0) {
            var L = new Array(K + 1).join("0");
            C < 0 ? V = "-" + L + V.slice(1) : V = L + V;
          }
        }
        b.push(V);
      }
    } else {
      b = [];
      for (var X = 0; X < d.length; X++)
        b.push.apply(b, Rs(d[X], !1));
    }
    for (var X = 0; X < b.length; X++)
      for (var a = 0; a < s.length; a++) {
        var o = r + b[X] + s[a];
        (!e || u || o) && n.push(o);
      }
  }
  return n;
}
const tn = ly = (t, e, n = {}) => (tc(e), !n.nocomment && e.charAt(0) === "#" ? !1 : new Bc(e, n).match(t));
var ly = tn;
const dp = wT;
tn.sep = dp.sep;
const Ft = Symbol("globstar **");
tn.GLOBSTAR = Ft;
const CT = iy, Mh = {
  "!": { open: "(?:(?!(?:", close: "))[^/]*?)" },
  "?": { open: "(?:", close: ")?" },
  "+": { open: "(?:", close: ")+" },
  "*": { open: "(?:", close: ")*" },
  "@": { open: "(?:", close: ")" }
}, hp = "[^/]", iu = hp + "*?", kT = "(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?", IT = "(?:(?!(?:\\/|^)\\.).)*?", uy = (t) => t.split("").reduce((e, n) => (e[n] = !0, e), {}), $h = uy("().*{}+?[]^$\\!"), DT = uy("[.("), Bh = /\/+/;
tn.filter = (t, e = {}) => (n, i, r) => tn(n, t, e);
const ri = (t, e = {}) => {
  const n = {};
  return Object.keys(t).forEach((i) => n[i] = t[i]), Object.keys(e).forEach((i) => n[i] = e[i]), n;
};
tn.defaults = (t) => {
  if (!t || typeof t != "object" || !Object.keys(t).length)
    return tn;
  const e = tn, n = (i, r, s) => e(i, r, ri(t, s));
  return n.Minimatch = class extends e.Minimatch {
    constructor(r, s) {
      super(r, ri(t, s));
    }
  }, n.Minimatch.defaults = (i) => e.defaults(ri(t, i)).Minimatch, n.filter = (i, r) => e.filter(i, ri(t, r)), n.defaults = (i) => e.defaults(ri(t, i)), n.makeRe = (i, r) => e.makeRe(i, ri(t, r)), n.braceExpand = (i, r) => e.braceExpand(i, ri(t, r)), n.match = (i, r, s) => e.match(i, r, ri(t, s)), n;
};
tn.braceExpand = (t, e) => py(t, e);
const py = (t, e = {}) => (tc(t), e.nobrace || !/\{(?:(?!\{).)*\}/.test(t) ? [t] : CT(t)), jT = 1024 * 64, tc = (t) => {
  if (typeof t != "string")
    throw new TypeError("invalid pattern");
  if (t.length > jT)
    throw new TypeError("pattern is too long");
}, ru = Symbol("subparse");
tn.makeRe = (t, e) => new Bc(t, e || {}).makeRe();
tn.match = (t, e, n = {}) => {
  const i = new Bc(e, n);
  return t = t.filter((r) => i.match(r)), i.options.nonull && !t.length && t.push(e), t;
};
const LT = (t) => t.replace(/\\(.)/g, "$1"), NT = (t) => t.replace(/\\([^-\]])/g, "$1"), FT = (t) => t.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), MT = (t) => t.replace(/[[\]\\]/g, "\\$&");
let Bc = class {
  constructor(e, n) {
    tc(e), n || (n = {}), this.options = n, this.maxGlobstarRecursion = n.maxGlobstarRecursion !== void 0 ? n.maxGlobstarRecursion : 200, this.set = [], this.pattern = e, this.windowsPathsNoEscape = !!n.windowsPathsNoEscape || n.allowWindowsEscape === !1, this.windowsPathsNoEscape && (this.pattern = this.pattern.replace(/\\/g, "/")), this.regexp = null, this.negate = !1, this.comment = !1, this.empty = !1, this.partial = !!n.partial, this.make();
  }
  debug() {
  }
  make() {
    const e = this.pattern, n = this.options;
    if (!n.nocomment && e.charAt(0) === "#") {
      this.comment = !0;
      return;
    }
    if (!e) {
      this.empty = !0;
      return;
    }
    this.parseNegate();
    let i = this.globSet = this.braceExpand();
    n.debug && (this.debug = (...r) => console.error(...r)), this.debug(this.pattern, i), i = this.globParts = i.map((r) => r.split(Bh)), this.debug(this.pattern, i), i = i.map((r, s, a) => r.map(this.parse, this)), this.debug(this.pattern, i), i = i.filter((r) => r.indexOf(!1) === -1), this.debug(this.pattern, i), this.set = i;
  }
  parseNegate() {
    if (this.options.nonegate) return;
    const e = this.pattern;
    let n = !1, i = 0;
    for (let r = 0; r < e.length && e.charAt(r) === "!"; r++)
      n = !n, i++;
    i && (this.pattern = e.slice(i)), this.negate = n;
  }
  // set partial to true to test if, for example,
  // "/a/b" matches the start of "/*/b/*/d"
  // Partial means, if you run out of file before you run
  // out of pattern, then that's fine, as long as all
  // the parts match.
  matchOne(e, n, i) {
    return n.indexOf(Ft) !== -1 ? this._matchGlobstar(e, n, i, 0, 0) : this._matchOne(e, n, i, 0, 0);
  }
  _matchGlobstar(e, n, i, r, s) {
    let a = -1;
    for (let h = s; h < n.length; h++)
      if (n[h] === Ft) {
        a = h;
        break;
      }
    let o = -1;
    for (let h = n.length - 1; h >= 0; h--)
      if (n[h] === Ft) {
        o = h;
        break;
      }
    const c = n.slice(s, a), l = i ? n.slice(a + 1) : n.slice(a + 1, o), u = i ? [] : n.slice(o + 1);
    if (c.length) {
      const h = e.slice(r, r + c.length);
      if (!this._matchOne(h, c, i, 0, 0))
        return !1;
      r += c.length;
    }
    let p = 0;
    if (u.length) {
      if (u.length + r > e.length) return !1;
      const h = e.length - u.length;
      if (this._matchOne(e, u, i, h, 0))
        p = u.length;
      else {
        if (e[e.length - 1] !== "" || r + u.length === e.length || !this._matchOne(e, u, i, h - 1, 0))
          return !1;
        p = u.length + 1;
      }
    }
    if (!l.length) {
      let h = !!p;
      for (let g = r; g < e.length - p; g++) {
        const A = String(e[g]);
        if (h = !0, A === "." || A === ".." || !this.options.dot && A.charAt(0) === ".")
          return !1;
      }
      return i || h;
    }
    const d = [[[], 0]];
    let b = d[0], x = 0;
    const v = [0];
    for (const h of l)
      h === Ft ? (v.push(x), b = [[], 0], d.push(b)) : (b[0].push(h), x++);
    let y = d.length - 1;
    const f = e.length - p;
    for (const h of d)
      h[1] = f - (v[y--] + h[0].length);
    return !!this._matchGlobStarBodySections(
      e,
      d,
      r,
      0,
      i,
      0,
      !!p
    );
  }
  // return false for "nope, not matching"
  // return null for "not matching, cannot keep trying"
  _matchGlobStarBodySections(e, n, i, r, s, a, o) {
    const c = n[r];
    if (!c) {
      for (let p = i; p < e.length; p++) {
        o = !0;
        const d = e[p];
        if (d === "." || d === ".." || !this.options.dot && d.charAt(0) === ".")
          return !1;
      }
      return o;
    }
    const [l, u] = c;
    for (; i <= u; ) {
      if (this._matchOne(
        e.slice(0, i + l.length),
        l,
        s,
        i,
        0
      ) && a < this.maxGlobstarRecursion) {
        const b = this._matchGlobStarBodySections(
          e,
          n,
          i + l.length,
          r + 1,
          s,
          a + 1,
          o
        );
        if (b !== !1)
          return b;
      }
      const d = e[i];
      if (d === "." || d === ".." || !this.options.dot && d.charAt(0) === ".")
        return !1;
      i++;
    }
    return s || null;
  }
  _matchOne(e, n, i, r, s) {
    let a, o, c, l;
    for (a = r, o = s, c = e.length, l = n.length; a < c && o < l; a++, o++) {
      this.debug("matchOne loop");
      const u = n[o], p = e[a];
      if (this.debug(n, u, p), u === !1 || u === Ft) return !1;
      let d;
      if (typeof u == "string" ? (d = p === u, this.debug("string match", u, p, d)) : (d = p.match(u), this.debug("pattern match", u, p, d)), !d) return !1;
    }
    if (a === c && o === l)
      return !0;
    if (a === c)
      return i;
    if (o === l)
      return a === c - 1 && e[a] === "";
    throw new Error("wtf?");
  }
  braceExpand() {
    return py(this.pattern, this.options);
  }
  parse(e, n) {
    tc(e);
    const i = this.options;
    if (e === "**")
      if (i.noglobstar)
        e = "*";
      else
        return Ft;
    if (e === "") return "";
    let r = "", s = !1, a = !1;
    const o = [], c = [];
    let l, u = !1, p = -1, d = -1, b, x, v, y = e.charAt(0) === ".", f = i.dot || y;
    const h = () => y ? "" : f ? "(?!(?:^|\\/)\\.{1,2}(?:$|\\/))" : "(?!\\.)", g = (K) => K.charAt(0) === "." ? "" : i.dot ? "(?!(?:^|\\/)\\.{1,2}(?:$|\\/))" : "(?!\\.)", A = () => {
      if (l) {
        switch (l) {
          case "*":
            r += iu, s = !0;
            break;
          case "?":
            r += hp, s = !0;
            break;
          default:
            r += "\\" + l;
            break;
        }
        this.debug("clearStateChar %j %j", l, r), l = !1;
      }
    };
    for (let K = 0, L; K < e.length && (L = e.charAt(K)); K++) {
      if (this.debug("%s	%s %s %j", e, K, r, L), a) {
        if (L === "/")
          return !1;
        $h[L] && (r += "\\"), r += L, a = !1;
        continue;
      }
      switch (L) {
        case "/":
          return !1;
        case "\\":
          if (u && e.charAt(K + 1) === "-") {
            r += L;
            continue;
          }
          A(), a = !0;
          continue;
        case "?":
        case "*":
        case "+":
        case "@":
        case "!":
          if (this.debug("%s	%s %s %j <-- stateChar", e, K, r, L), u) {
            this.debug("  in class"), L === "!" && K === d + 1 && (L = "^"), r += L;
            continue;
          }
          if (L === "*" && l === "*") continue;
          this.debug("call clearStateChar %j", l), A(), l = L, i.noext && A();
          continue;
        case "(": {
          if (u) {
            r += "(";
            continue;
          }
          if (!l) {
            r += "\\(";
            continue;
          }
          const X = {
            type: l,
            start: K - 1,
            reStart: r.length,
            open: Mh[l].open,
            close: Mh[l].close
          };
          this.debug(this.pattern, "	", X), o.push(X), r += X.open, X.start === 0 && X.type !== "!" && (y = !0, r += g(e.slice(K + 1))), this.debug("plType %j %j", l, r), l = !1;
          continue;
        }
        case ")": {
          const X = o[o.length - 1];
          if (u || !X) {
            r += "\\)";
            continue;
          }
          o.pop(), A(), s = !0, x = X, r += x.close, x.type === "!" && c.push(Object.assign(x, { reEnd: r.length }));
          continue;
        }
        case "|": {
          const X = o[o.length - 1];
          if (u || !X) {
            r += "\\|";
            continue;
          }
          A(), r += "|", X.start === 0 && X.type !== "!" && (y = !0, r += g(e.slice(K + 1)));
          continue;
        }
        case "[":
          if (A(), u) {
            r += "\\" + L;
            continue;
          }
          u = !0, d = K, p = r.length, r += L;
          continue;
        case "]":
          if (K === d + 1 || !u) {
            r += "\\" + L;
            continue;
          }
          b = e.substring(d + 1, K);
          try {
            RegExp("[" + MT(NT(b)) + "]"), r += L;
          } catch {
            r = r.substring(0, p) + "(?:$.)";
          }
          s = !0, u = !1;
          continue;
        default:
          A(), $h[L] && !(L === "^" && u) && (r += "\\"), r += L;
          break;
      }
    }
    for (u && (b = e.slice(d + 1), v = this.parse(b, ru), r = r.substring(0, p) + "\\[" + v[0], s = s || v[1]), x = o.pop(); x; x = o.pop()) {
      let K;
      K = r.slice(x.reStart + x.open.length), this.debug("setting tail", r, x), K = K.replace(/((?:\\{2}){0,64})(\\?)\|/g, (X, D, B) => (B || (B = "\\"), D + D + B + "|")), this.debug(`tail=%j
   %s`, K, K, x, r);
      const L = x.type === "*" ? iu : x.type === "?" ? hp : "\\" + x.type;
      s = !0, r = r.slice(0, x.reStart) + L + "\\(" + K;
    }
    A(), a && (r += "\\\\");
    const C = DT[r.charAt(0)];
    for (let K = c.length - 1; K > -1; K--) {
      const L = c[K], X = r.slice(0, L.reStart), D = r.slice(L.reStart, L.reEnd - 8);
      let B = r.slice(L.reEnd);
      const Y = r.slice(L.reEnd - 8, L.reEnd) + B, U = X.split(")").length, ae = X.split("(").length - U;
      let le = B;
      for (let z = 0; z < ae; z++)
        le = le.replace(/\)[+*?]?/, "");
      B = le;
      const pe = B === "" && n !== ru ? "(?:$|\\/)" : "";
      r = X + D + B + pe + Y;
    }
    if (r !== "" && s && (r = "(?=.)" + r), C && (r = h() + r), n === ru)
      return [r, s];
    if (i.nocase && !s && (s = e.toUpperCase() !== e.toLowerCase()), !s)
      return LT(e);
    const V = i.nocase ? "i" : "";
    try {
      return Object.assign(new RegExp("^" + r + "$", V), {
        _glob: e,
        _src: r
      });
    } catch {
      return new RegExp("$.");
    }
  }
  makeRe() {
    if (this.regexp || this.regexp === !1) return this.regexp;
    const e = this.set;
    if (!e.length)
      return this.regexp = !1, this.regexp;
    const n = this.options, i = n.noglobstar ? iu : n.dot ? kT : IT, r = n.nocase ? "i" : "";
    let s = e.map((a) => (a = a.map(
      (o) => typeof o == "string" ? FT(o) : o === Ft ? Ft : o._src
    ).reduce((o, c) => (o[o.length - 1] === Ft && c === Ft || o.push(c), o), []), a.forEach((o, c) => {
      o !== Ft || a[c - 1] === Ft || (c === 0 ? a.length > 1 ? a[c + 1] = "(?:\\/|" + i + "\\/)?" + a[c + 1] : a[c] = i : c === a.length - 1 ? a[c - 1] += "(?:\\/|" + i + ")?" : (a[c - 1] += "(?:\\/|\\/" + i + "\\/)" + a[c + 1], a[c + 1] = Ft));
    }), a.filter((o) => o !== Ft).join("/"))).join("|");
    s = "^(?:" + s + ")$", this.negate && (s = "^(?!" + s + ").*$");
    try {
      this.regexp = new RegExp(s, r);
    } catch {
      this.regexp = !1;
    }
    return this.regexp;
  }
  match(e, n = this.partial) {
    if (this.debug("match", e, this.pattern), this.comment) return !1;
    if (this.empty) return e === "";
    if (e === "/" && n) return !0;
    const i = this.options;
    dp.sep !== "/" && (e = e.split(dp.sep).join("/")), e = e.split(Bh), this.debug(this.pattern, "split", e);
    const r = this.set;
    this.debug(this.pattern, "set", r);
    let s;
    for (let a = e.length - 1; a >= 0 && (s = e[a], !s); a--)
      ;
    for (let a = 0; a < r.length; a++) {
      const o = r[a];
      let c = e;
      if (i.matchBase && o.length === 1 && (c = [s]), this.matchOne(c, o, n))
        return i.flipNegate ? !0 : !this.negate;
    }
    return i.flipNegate ? !1 : this.negate;
  }
  static defaults(e) {
    return tn.defaults(e).Minimatch;
  }
};
tn.Minimatch = Bc;
var $T = my;
const mp = dt, { EventEmitter: BT } = Ii, { Minimatch: su } = ly, { resolve: UT } = Ce;
function zT(t, e) {
  return new Promise((n, i) => {
    mp.readdir(t, { withFileTypes: !0 }, (r, s) => {
      if (r)
        switch (r.code) {
          case "ENOTDIR":
            e ? i(r) : n([]);
            break;
          case "ENOTSUP":
          case "ENOENT":
          case "ENAMETOOLONG":
          case "UNKNOWN":
            n([]);
            break;
          case "ELOOP":
          default:
            i(r);
            break;
        }
      else
        n(s);
    });
  });
}
function fy(t, e) {
  return new Promise((n, i) => {
    (e ? mp.stat : mp.lstat)(t, (s, a) => {
      if (s)
        switch (s.code) {
          case "ENOENT":
            n(e ? fy(t, !1) : null);
            break;
          default:
            n(null);
            break;
        }
      else
        n(a);
    });
  });
}
async function* dy(t, e, n, i, r, s) {
  let a = await zT(e + t, s);
  for (const o of a) {
    let c = o.name;
    c === void 0 && (c = o, i = !0);
    const l = t + "/" + c, u = l.slice(1), p = e + "/" + u;
    let d = null;
    (i || n) && (d = await fy(p, n)), !d && o.name !== void 0 && (d = o), d === null && (d = { isDirectory: () => !1 }), d.isDirectory() ? r(u) || (yield { relative: u, absolute: p, stats: d }, yield* dy(l, e, n, i, r, !1)) : yield { relative: u, absolute: p, stats: d };
  }
}
async function* WT(t, e, n, i) {
  yield* dy("", t, e, n, i, !0);
}
function qT(t) {
  return {
    pattern: t.pattern,
    dot: !!t.dot,
    noglobstar: !!t.noglobstar,
    matchBase: !!t.matchBase,
    nocase: !!t.nocase,
    ignore: t.ignore,
    skip: t.skip,
    follow: !!t.follow,
    stat: !!t.stat,
    nodir: !!t.nodir,
    mark: !!t.mark,
    silent: !!t.silent,
    absolute: !!t.absolute
  };
}
class hy extends BT {
  constructor(e, n, i) {
    if (super(), typeof n == "function" && (i = n, n = null), this.options = qT(n || {}), this.matchers = [], this.options.pattern) {
      const r = Array.isArray(this.options.pattern) ? this.options.pattern : [this.options.pattern];
      this.matchers = r.map(
        (s) => new su(s, {
          dot: this.options.dot,
          noglobstar: this.options.noglobstar,
          matchBase: this.options.matchBase,
          nocase: this.options.nocase
        })
      );
    }
    if (this.ignoreMatchers = [], this.options.ignore) {
      const r = Array.isArray(this.options.ignore) ? this.options.ignore : [this.options.ignore];
      this.ignoreMatchers = r.map(
        (s) => new su(s, { dot: !0 })
      );
    }
    if (this.skipMatchers = [], this.options.skip) {
      const r = Array.isArray(this.options.skip) ? this.options.skip : [this.options.skip];
      this.skipMatchers = r.map(
        (s) => new su(s, { dot: !0 })
      );
    }
    this.iterator = WT(UT(e || "."), this.options.follow, this.options.stat, this._shouldSkipDirectory.bind(this)), this.paused = !1, this.inactive = !1, this.aborted = !1, i && (this._matches = [], this.on("match", (r) => this._matches.push(this.options.absolute ? r.absolute : r.relative)), this.on("error", (r) => i(r)), this.on("end", () => i(null, this._matches))), setTimeout(() => this._next(), 0);
  }
  _shouldSkipDirectory(e) {
    return this.skipMatchers.some((n) => n.match(e));
  }
  _fileMatches(e, n) {
    const i = e + (n ? "/" : "");
    return (this.matchers.length === 0 || this.matchers.some((r) => r.match(i))) && !this.ignoreMatchers.some((r) => r.match(i)) && (!this.options.nodir || !n);
  }
  _next() {
    !this.paused && !this.aborted ? this.iterator.next().then((e) => {
      if (e.done)
        this.emit("end");
      else {
        const n = e.value.stats.isDirectory();
        if (this._fileMatches(e.value.relative, n)) {
          let i = e.value.relative, r = e.value.absolute;
          this.options.mark && n && (i += "/", r += "/"), this.options.stat ? this.emit("match", { relative: i, absolute: r, stat: e.value.stats }) : this.emit("match", { relative: i, absolute: r });
        }
        this._next(this.iterator);
      }
    }).catch((e) => {
      this.abort(), this.emit("error", e), !e.code && !this.options.silent && console.error(e);
    }) : this.inactive = !0;
  }
  abort() {
    this.aborted = !0;
  }
  pause() {
    this.paused = !0;
  }
  resume() {
    this.paused = !1, this.inactive && (this.inactive = !1, this._next());
  }
}
function my(t, e, n) {
  return new hy(t, e, n);
}
my.ReaddirGlob = hy;
function gy(t, ...e) {
  return (...n) => t(...e, ...n);
}
function ja(t) {
  return function(...e) {
    var n = e.pop();
    return t.call(this, e, n);
  };
}
var GT = typeof queueMicrotask == "function" && queueMicrotask, by = typeof setImmediate == "function" && setImmediate, yy = typeof process == "object" && typeof process.nextTick == "function";
function vy(t) {
  setTimeout(t, 0);
}
function xy(t) {
  return (e, ...n) => t(() => e(...n));
}
var Os;
GT ? Os = queueMicrotask : by ? Os = setImmediate : yy ? Os = process.nextTick : Os = vy;
var wi = xy(Os);
function qs(t) {
  return La(t) ? function(...e) {
    const n = e.pop(), i = t.apply(this, e);
    return Uh(i, n);
  } : ja(function(e, n) {
    var i;
    try {
      i = t.apply(this, e);
    } catch (r) {
      return n(r);
    }
    if (i && typeof i.then == "function")
      return Uh(i, n);
    n(null, i);
  });
}
function Uh(t, e) {
  return t.then((n) => {
    zh(e, null, n);
  }, (n) => {
    zh(e, n && (n instanceof Error || n.message) ? n : new Error(n));
  });
}
function zh(t, e, n) {
  try {
    t(e, n);
  } catch (i) {
    wi((r) => {
      throw r;
    }, i);
  }
}
function La(t) {
  return t[Symbol.toStringTag] === "AsyncFunction";
}
function HT(t) {
  return t[Symbol.toStringTag] === "AsyncGenerator";
}
function VT(t) {
  return typeof t[Symbol.asyncIterator] == "function";
}
function Me(t) {
  if (typeof t != "function") throw new Error("expected a function");
  return La(t) ? qs(t) : t;
}
function Ne(t, e) {
  if (e || (e = t.length), !e) throw new Error("arity is undefined");
  function n(...i) {
    return typeof i[e - 1] == "function" ? t.apply(this, i) : new Promise((r, s) => {
      i[e - 1] = (a, ...o) => {
        if (a) return s(a);
        r(o.length > 1 ? o : o[0]);
      }, t.apply(this, i);
    });
  }
  return n;
}
function wy(t) {
  return function(n, ...i) {
    return Ne(function(s) {
      var a = this;
      return t(n, (o, c) => {
        Me(o).apply(a, i.concat(c));
      }, s);
    });
  };
}
function Ef(t, e, n, i) {
  e = e || [];
  var r = [], s = 0, a = Me(n);
  return t(e, (o, c, l) => {
    var u = s++;
    a(o, (p, d) => {
      r[u] = d, l(p);
    });
  }, (o) => {
    i(o, r);
  });
}
function Uc(t) {
  return t && typeof t.length == "number" && t.length >= 0 && t.length % 1 === 0;
}
const zc = {};
function Di(t) {
  function e(...n) {
    if (t !== null) {
      var i = t;
      t = null, i.apply(this, n);
    }
  }
  return Object.assign(e, t), e;
}
function KT(t) {
  return t[Symbol.iterator] && t[Symbol.iterator]();
}
function YT(t) {
  var e = -1, n = t.length;
  return function() {
    return ++e < n ? { value: t[e], key: e } : null;
  };
}
function ZT(t) {
  var e = -1;
  return function() {
    var i = t.next();
    return i.done ? null : (e++, { value: i.value, key: e });
  };
}
function XT(t) {
  var e = t ? Object.keys(t) : [], n = -1, i = e.length;
  return function r() {
    var s = e[++n];
    return s === "__proto__" ? r() : n < i ? { value: t[s], key: s } : null;
  };
}
function JT(t) {
  if (Uc(t))
    return YT(t);
  var e = KT(t);
  return e ? ZT(e) : XT(t);
}
function ji(t) {
  return function(...e) {
    if (t === null) throw new Error("Callback was already called.");
    var n = t;
    t = null, n.apply(this, e);
  };
}
function Wh(t, e, n, i) {
  let r = !1, s = !1, a = !1, o = 0, c = 0;
  function l() {
    o >= e || a || r || (a = !0, t.next().then(({ value: d, done: b }) => {
      if (!(s || r)) {
        if (a = !1, b) {
          r = !0, o <= 0 && i(null);
          return;
        }
        o++, n(d, c, u), c++, l();
      }
    }).catch(p));
  }
  function u(d, b) {
    if (o -= 1, !s) {
      if (d) return p(d);
      if (d === !1) {
        r = !0, s = !0;
        return;
      }
      if (b === zc || r && o <= 0)
        return r = !0, i(null);
      l();
    }
  }
  function p(d) {
    s || (a = !1, r = !0, i(d));
  }
  l();
}
var On = (t) => (e, n, i) => {
  if (i = Di(i), t <= 0)
    throw new RangeError("concurrency limit cannot be less than 1");
  if (!e)
    return i(null);
  if (HT(e))
    return Wh(e, t, n, i);
  if (VT(e))
    return Wh(e[Symbol.asyncIterator](), t, n, i);
  var r = JT(e), s = !1, a = !1, o = 0, c = !1;
  function l(p, d) {
    if (!a)
      if (o -= 1, p)
        s = !0, i(p);
      else if (p === !1)
        s = !0, a = !0;
      else {
        if (d === zc || s && o <= 0)
          return s = !0, i(null);
        c || u();
      }
  }
  function u() {
    for (c = !0; o < t && !s; ) {
      var p = r();
      if (p === null) {
        s = !0, o <= 0 && i(null);
        return;
      }
      o += 1, n(p.value, p.key, ji(l));
    }
    c = !1;
  }
  u();
};
function QT(t, e, n, i) {
  return On(e)(t, Me(n), i);
}
var Xr = Ne(QT, 4);
function eR(t, e, n) {
  n = Di(n);
  var i = 0, r = 0, { length: s } = t, a = !1;
  s === 0 && n(null);
  function o(c, l) {
    c === !1 && (a = !0), a !== !0 && (c ? n(c) : (++r === s || l === zc) && n(null));
  }
  for (; i < s; i++)
    e(t[i], i, ji(o));
}
function tR(t, e, n) {
  return Xr(t, 1 / 0, e, n);
}
function nR(t, e, n) {
  var i = Uc(t) ? eR : tR;
  return i(t, Me(e), n);
}
var nn = Ne(nR, 3);
function iR(t, e, n) {
  return Ef(nn, t, e, n);
}
var Wc = Ne(iR, 3), _y = wy(Wc);
function rR(t, e, n) {
  return Xr(t, 1, e, n);
}
var An = Ne(rR, 3);
function sR(t, e, n) {
  return Ef(An, t, e, n);
}
var Af = Ne(sR, 3), Sy = wy(Af);
const us = Symbol("promiseCallback");
function Jr() {
  let t, e;
  function n(i, ...r) {
    if (i) return e(i);
    t(r.length > 1 ? r : r[0]);
  }
  return n[us] = new Promise((i, r) => {
    t = i, e = r;
  }), n;
}
function Tf(t, e, n) {
  typeof e != "number" && (n = e, e = null), n = Di(n || Jr());
  var i = Object.keys(t).length;
  if (!i)
    return n(null);
  e || (e = i);
  var r = {}, s = 0, a = !1, o = !1, c = /* @__PURE__ */ Object.create(null), l = [], u = [], p = {};
  Object.keys(t).forEach((g) => {
    var A = t[g];
    if (!Array.isArray(A)) {
      d(g, [A]), u.push(g);
      return;
    }
    var C = A.slice(0, A.length - 1), V = C.length;
    if (V === 0) {
      d(g, A), u.push(g);
      return;
    }
    p[g] = V, C.forEach((K) => {
      if (!t[K])
        throw new Error("async.auto task `" + g + "` has a non-existent dependency `" + K + "` in " + C.join(", "));
      x(K, () => {
        V--, V === 0 && d(g, A);
      });
    });
  }), f(), b();
  function d(g, A) {
    l.push(() => y(g, A));
  }
  function b() {
    if (!a) {
      if (l.length === 0 && s === 0)
        return n(null, r);
      for (; l.length && s < e; ) {
        var g = l.shift();
        g();
      }
    }
  }
  function x(g, A) {
    var C = c[g];
    C || (C = c[g] = []), C.push(A);
  }
  function v(g) {
    var A = c[g] || [];
    A.forEach((C) => C()), b();
  }
  function y(g, A) {
    if (!o) {
      var C = ji((K, ...L) => {
        if (s--, K === !1) {
          a = !0;
          return;
        }
        if (L.length < 2 && ([L] = L), K) {
          var X = {};
          if (Object.keys(r).forEach((D) => {
            X[D] = r[D];
          }), X[g] = L, o = !0, c = /* @__PURE__ */ Object.create(null), a) return;
          n(K, X);
        } else
          r[g] = L, v(g);
      });
      s++;
      var V = Me(A[A.length - 1]);
      A.length > 1 ? V(r, C) : V(C);
    }
  }
  function f() {
    for (var g, A = 0; u.length; )
      g = u.pop(), A++, h(g).forEach((C) => {
        --p[C] === 0 && u.push(C);
      });
    if (A !== i)
      throw new Error(
        "async.auto cannot execute tasks due to a recursive dependency"
      );
  }
  function h(g) {
    var A = [];
    return Object.keys(t).forEach((C) => {
      const V = t[C];
      Array.isArray(V) && V.indexOf(g) >= 0 && A.push(C);
    }), A;
  }
  return n[us];
}
var aR = /^(?:async\s)?(?:function)?\s*(?:\w+\s*)?\(([^)]+)\)(?:\s*{)/, oR = /^(?:async\s)?\s*(?:\(\s*)?((?:[^)=\s]\s*)*)(?:\)\s*)?=>/, cR = /,/, lR = /(=.+)?(\s*)$/;
function uR(t) {
  let e = "", n = 0, i = t.indexOf("*/");
  for (; n < t.length; )
    if (t[n] === "/" && t[n + 1] === "/") {
      let r = t.indexOf(`
`, n);
      n = r === -1 ? t.length : r;
    } else if (i !== -1 && t[n] === "/" && t[n + 1] === "*") {
      let r = t.indexOf("*/", n);
      r !== -1 ? (n = r + 2, i = t.indexOf("*/", n)) : (e += t[n], n++);
    } else
      e += t[n], n++;
  return e;
}
function pR(t) {
  const e = uR(t.toString());
  let n = e.match(aR);
  if (n || (n = e.match(oR)), !n) throw new Error(`could not parse args in autoInject
Source:
` + e);
  let [, i] = n;
  return i.replace(/\s/g, "").split(cR).map((r) => r.replace(lR, "").trim());
}
function Ey(t, e) {
  var n = {};
  return Object.keys(t).forEach((i) => {
    var r = t[i], s, a = La(r), o = !a && r.length === 1 || a && r.length === 0;
    if (Array.isArray(r))
      s = [...r], r = s.pop(), n[i] = s.concat(s.length > 0 ? c : r);
    else if (o)
      n[i] = r;
    else {
      if (s = pR(r), r.length === 0 && !a && s.length === 0)
        throw new Error("autoInject task functions require explicit parameters.");
      a || s.pop(), n[i] = s.concat(c);
    }
    function c(l, u) {
      var p = s.map((d) => l[d]);
      p.push(u), Me(r)(...p);
    }
  }), Tf(n, e);
}
class fR {
  constructor() {
    this.head = this.tail = null, this.length = 0;
  }
  removeLink(e) {
    return e.prev ? e.prev.next = e.next : this.head = e.next, e.next ? e.next.prev = e.prev : this.tail = e.prev, e.prev = e.next = null, this.length -= 1, e;
  }
  empty() {
    for (; this.head; ) this.shift();
    return this;
  }
  insertAfter(e, n) {
    n.prev = e, n.next = e.next, e.next ? e.next.prev = n : this.tail = n, e.next = n, this.length += 1;
  }
  insertBefore(e, n) {
    n.prev = e.prev, n.next = e, e.prev ? e.prev.next = n : this.head = n, e.prev = n, this.length += 1;
  }
  unshift(e) {
    this.head ? this.insertBefore(this.head, e) : qh(this, e);
  }
  push(e) {
    this.tail ? this.insertAfter(this.tail, e) : qh(this, e);
  }
  shift() {
    return this.head && this.removeLink(this.head);
  }
  pop() {
    return this.tail && this.removeLink(this.tail);
  }
  toArray() {
    return [...this];
  }
  *[Symbol.iterator]() {
    for (var e = this.head; e; )
      yield e.data, e = e.next;
  }
  remove(e) {
    for (var n = this.head; n; ) {
      var { next: i } = n;
      e(n) && this.removeLink(n), n = i;
    }
    return this;
  }
}
function qh(t, e) {
  t.length = 1, t.head = t.tail = e;
}
function Rf(t, e, n) {
  if (e == null)
    e = 1;
  else if (e === 0)
    throw new RangeError("Concurrency must not be zero");
  var i = Me(t), r = 0, s = [];
  const a = {
    error: [],
    drain: [],
    saturated: [],
    unsaturated: [],
    empty: []
  };
  function o(h, g) {
    a[h].push(g);
  }
  function c(h, g) {
    const A = (...C) => {
      l(h, A), g(...C);
    };
    a[h].push(A);
  }
  function l(h, g) {
    if (!h) return Object.keys(a).forEach((A) => a[A] = []);
    if (!g) return a[h] = [];
    a[h] = a[h].filter((A) => A !== g);
  }
  function u(h, ...g) {
    a[h].forEach((A) => A(...g));
  }
  var p = !1;
  function d(h, g, A, C) {
    if (C != null && typeof C != "function")
      throw new Error("task callback must be a function");
    f.started = !0;
    var V, K;
    function L(D, ...B) {
      if (D) return A ? K(D) : V();
      if (B.length <= 1) return V(B[0]);
      V(B);
    }
    var X = f._createTaskItem(
      h,
      A ? L : C || L
    );
    if (g ? f._tasks.unshift(X) : f._tasks.push(X), p || (p = !0, wi(() => {
      p = !1, f.process();
    })), A || !C)
      return new Promise((D, B) => {
        V = D, K = B;
      });
  }
  function b(h) {
    return function(g, ...A) {
      r -= 1;
      for (var C = 0, V = h.length; C < V; C++) {
        var K = h[C], L = s.indexOf(K);
        L === 0 ? s.shift() : L > 0 && s.splice(L, 1), K.callback(g, ...A), g != null && u("error", g, K.data);
      }
      r <= f.concurrency - f.buffer && u("unsaturated"), f.idle() && u("drain"), f.process();
    };
  }
  function x(h) {
    return h.length === 0 && f.idle() ? (wi(() => u("drain")), !0) : !1;
  }
  const v = (h) => (g) => {
    if (!g)
      return new Promise((A, C) => {
        c(h, (V, K) => {
          if (V) return C(V);
          A(K);
        });
      });
    l(h), o(h, g);
  };
  var y = !1, f = {
    _tasks: new fR(),
    _createTaskItem(h, g) {
      return {
        data: h,
        callback: g
      };
    },
    *[Symbol.iterator]() {
      yield* f._tasks[Symbol.iterator]();
    },
    concurrency: e,
    payload: n,
    buffer: e / 4,
    started: !1,
    paused: !1,
    push(h, g) {
      return Array.isArray(h) ? x(h) ? void 0 : h.map((A) => d(A, !1, !1, g)) : d(h, !1, !1, g);
    },
    pushAsync(h, g) {
      return Array.isArray(h) ? x(h) ? void 0 : h.map((A) => d(A, !1, !0, g)) : d(h, !1, !0, g);
    },
    kill() {
      l(), f._tasks.empty();
    },
    unshift(h, g) {
      return Array.isArray(h) ? x(h) ? void 0 : h.map((A) => d(A, !0, !1, g)) : d(h, !0, !1, g);
    },
    unshiftAsync(h, g) {
      return Array.isArray(h) ? x(h) ? void 0 : h.map((A) => d(A, !0, !0, g)) : d(h, !0, !0, g);
    },
    remove(h) {
      f._tasks.remove(h);
    },
    process() {
      if (!y) {
        for (y = !0; !f.paused && r < f.concurrency && f._tasks.length; ) {
          var h = [], g = [], A = f._tasks.length;
          f.payload && (A = Math.min(A, f.payload));
          for (var C = 0; C < A; C++) {
            var V = f._tasks.shift();
            h.push(V), s.push(V), g.push(V.data);
          }
          r += 1, f._tasks.length === 0 && u("empty"), r === f.concurrency && u("saturated");
          var K = ji(b(h));
          i(g, K);
        }
        y = !1;
      }
    },
    length() {
      return f._tasks.length;
    },
    running() {
      return r;
    },
    workersList() {
      return s;
    },
    idle() {
      return f._tasks.length + r === 0;
    },
    pause() {
      f.paused = !0;
    },
    resume() {
      f.paused !== !1 && (f.paused = !1, wi(f.process));
    }
  };
  return Object.defineProperties(f, {
    saturated: {
      writable: !1,
      value: v("saturated")
    },
    unsaturated: {
      writable: !1,
      value: v("unsaturated")
    },
    empty: {
      writable: !1,
      value: v("empty")
    },
    drain: {
      writable: !1,
      value: v("drain")
    },
    error: {
      writable: !1,
      value: v("error")
    }
  }), f;
}
function Ay(t, e) {
  return Rf(t, 1, e);
}
function Ty(t, e, n) {
  return Rf(t, e, n);
}
function dR(t, e, n, i) {
  i = Di(i);
  var r = Me(n);
  return An(t, (s, a, o) => {
    r(e, s, (c, l) => {
      e = l, o(c);
    });
  }, (s) => i(s, e));
}
var _i = Ne(dR, 4);
function Of(...t) {
  var e = t.map(Me);
  return function(...n) {
    var i = this, r = n[n.length - 1];
    return typeof r == "function" ? n.pop() : r = Jr(), _i(
      e,
      n,
      (s, a, o) => {
        a.apply(i, s.concat((c, ...l) => {
          o(c, l);
        }));
      },
      (s, a) => r(s, ...a)
    ), r[us];
  };
}
function Ry(...t) {
  return Of(...t.reverse());
}
function hR(t, e, n, i) {
  return Ef(On(e), t, n, i);
}
var Na = Ne(hR, 4);
function mR(t, e, n, i) {
  var r = Me(n);
  return Na(t, e, (s, a) => {
    r(s, (o, ...c) => o ? a(o) : a(o, c));
  }, (s, a) => {
    for (var o = [], c = 0; c < a.length; c++)
      a[c] && (o = o.concat(...a[c]));
    return i(s, o);
  });
}
var Qr = Ne(mR, 4);
function gR(t, e, n) {
  return Qr(t, 1 / 0, e, n);
}
var nc = Ne(gR, 3);
function bR(t, e, n) {
  return Qr(t, 1, e, n);
}
var ic = Ne(bR, 3);
function Oy(...t) {
  return function(...e) {
    var n = e.pop();
    return n(null, ...t);
  };
}
function ei(t, e) {
  return (n, i, r, s) => {
    var a = !1, o;
    const c = Me(r);
    n(i, (l, u, p) => {
      c(l, (d, b) => {
        if (d || d === !1) return p(d);
        if (t(b) && !o)
          return a = !0, o = e(!0, l), p(null, zc);
        p();
      });
    }, (l) => {
      if (l) return s(l);
      s(null, a ? o : e(!1));
    });
  };
}
function yR(t, e, n) {
  return ei((i) => i, (i, r) => r)(nn, t, e, n);
}
var rc = Ne(yR, 3);
function vR(t, e, n, i) {
  return ei((r) => r, (r, s) => s)(On(e), t, n, i);
}
var sc = Ne(vR, 4);
function xR(t, e, n) {
  return ei((i) => i, (i, r) => r)(On(1), t, e, n);
}
var ac = Ne(xR, 3);
function Py(t) {
  return (e, ...n) => Me(e)(...n, (i, ...r) => {
    typeof console == "object" && (i ? console.error && console.error(i) : console[t] && r.forEach((s) => console[t](s)));
  });
}
var Cy = Py("dir");
function wR(t, e, n) {
  n = ji(n);
  var i = Me(t), r = Me(e), s;
  function a(c, ...l) {
    if (c) return n(c);
    c !== !1 && (s = l, r(...l, o));
  }
  function o(c, l) {
    if (c) return n(c);
    if (c !== !1) {
      if (!l) return n(null, ...s);
      i(a);
    }
  }
  return o(null, !0);
}
var Gs = Ne(wR, 3);
function ky(t, e, n) {
  const i = Me(e);
  return Gs(t, (...r) => {
    const s = r.pop();
    i(...r, (a, o) => s(a, !o));
  }, n);
}
function Iy(t) {
  return (e, n, i) => t(e, i);
}
function _R(t, e, n) {
  return nn(t, Iy(Me(e)), n);
}
var oc = Ne(_R, 3);
function SR(t, e, n, i) {
  return On(e)(t, Iy(Me(n)), i);
}
var Hs = Ne(SR, 4);
function ER(t, e, n) {
  return Hs(t, 1, e, n);
}
var Vs = Ne(ER, 3);
function Pf(t) {
  return La(t) ? t : function(...e) {
    var n = e.pop(), i = !0;
    e.push((...r) => {
      i ? wi(() => n(...r)) : n(...r);
    }), t.apply(this, e), i = !1;
  };
}
function AR(t, e, n) {
  return ei((i) => !i, (i) => !i)(nn, t, e, n);
}
var cc = Ne(AR, 3);
function TR(t, e, n, i) {
  return ei((r) => !r, (r) => !r)(On(e), t, n, i);
}
var lc = Ne(TR, 4);
function RR(t, e, n) {
  return ei((i) => !i, (i) => !i)(An, t, e, n);
}
var uc = Ne(RR, 3);
function OR(t, e, n, i) {
  var r = new Array(e.length);
  t(e, (s, a, o) => {
    n(s, (c, l) => {
      r[a] = !!l, o(c);
    });
  }, (s) => {
    if (s) return i(s);
    for (var a = [], o = 0; o < e.length; o++)
      r[o] && a.push(e[o]);
    i(null, a);
  });
}
function PR(t, e, n, i) {
  var r = [];
  t(e, (s, a, o) => {
    n(s, (c, l) => {
      if (c) return o(c);
      l && r.push({ index: a, value: s }), o(c);
    });
  }, (s) => {
    if (s) return i(s);
    i(null, r.sort((a, o) => a.index - o.index).map((a) => a.value));
  });
}
function qc(t, e, n, i) {
  var r = Uc(e) ? OR : PR;
  return r(t, e, Me(n), i);
}
function CR(t, e, n) {
  return qc(nn, t, e, n);
}
var pc = Ne(CR, 3);
function kR(t, e, n, i) {
  return qc(On(e), t, n, i);
}
var fc = Ne(kR, 4);
function IR(t, e, n) {
  return qc(An, t, e, n);
}
var dc = Ne(IR, 3);
function DR(t, e) {
  var n = ji(e), i = Me(Pf(t));
  function r(s) {
    if (s) return n(s);
    s !== !1 && i(r);
  }
  return r();
}
var Dy = Ne(DR, 2);
function jR(t, e, n, i) {
  var r = Me(n);
  return Na(t, e, (s, a) => {
    r(s, (o, c) => o ? a(o) : a(o, { key: c, val: s }));
  }, (s, a) => {
    for (var o = {}, { hasOwnProperty: c } = Object.prototype, l = 0; l < a.length; l++)
      if (a[l]) {
        var { key: u } = a[l], { val: p } = a[l];
        c.call(o, u) ? o[u].push(p) : o[u] = [p];
      }
    return i(s, o);
  });
}
var Gc = Ne(jR, 4);
function jy(t, e, n) {
  return Gc(t, 1 / 0, e, n);
}
function Ly(t, e, n) {
  return Gc(t, 1, e, n);
}
var Ny = Py("log");
function LR(t, e, n, i) {
  i = Di(i);
  var r = {}, s = Me(n);
  return On(e)(t, (a, o, c) => {
    s(a, o, (l, u) => {
      if (l) return c(l);
      r[o] = u, c(l);
    });
  }, (a) => i(a, r));
}
var Hc = Ne(LR, 4);
function Fy(t, e, n) {
  return Hc(t, 1 / 0, e, n);
}
function My(t, e, n) {
  return Hc(t, 1, e, n);
}
function $y(t, e = (n) => n) {
  var n = /* @__PURE__ */ Object.create(null), i = /* @__PURE__ */ Object.create(null), r = Me(t), s = ja((a, o) => {
    var c = e(...a);
    c in n ? wi(() => o(null, ...n[c])) : c in i ? i[c].push(o) : (i[c] = [o], r(...a, (l, ...u) => {
      l || (n[c] = u);
      var p = i[c];
      delete i[c];
      for (var d = 0, b = p.length; d < b; d++)
        p[d](l, ...u);
    }));
  });
  return s.memo = n, s.unmemoized = t, s;
}
var Do;
yy ? Do = process.nextTick : by ? Do = setImmediate : Do = vy;
var By = xy(Do), Cf = Ne((t, e, n) => {
  var i = Uc(e) ? [] : {};
  t(e, (r, s, a) => {
    Me(r)((o, ...c) => {
      c.length < 2 && ([c] = c), i[s] = c, a(o);
    });
  }, (r) => n(r, i));
}, 3);
function Uy(t, e) {
  return Cf(nn, t, e);
}
function zy(t, e, n) {
  return Cf(On(e), t, n);
}
function kf(t, e) {
  var n = Me(t);
  return Rf((i, r) => {
    n(i[0], r);
  }, e, 1);
}
class NR {
  constructor() {
    this.heap = [], this.pushCount = Number.MIN_SAFE_INTEGER;
  }
  get length() {
    return this.heap.length;
  }
  empty() {
    return this.heap = [], this;
  }
  percUp(e) {
    let n;
    for (; e > 0 && au(this.heap[e], this.heap[n = Gh(e)]); ) {
      let i = this.heap[e];
      this.heap[e] = this.heap[n], this.heap[n] = i, e = n;
    }
  }
  percDown(e) {
    let n;
    for (; (n = FR(e)) < this.heap.length && (n + 1 < this.heap.length && au(this.heap[n + 1], this.heap[n]) && (n = n + 1), !au(this.heap[e], this.heap[n])); ) {
      let i = this.heap[e];
      this.heap[e] = this.heap[n], this.heap[n] = i, e = n;
    }
  }
  push(e) {
    e.pushCount = ++this.pushCount, this.heap.push(e), this.percUp(this.heap.length - 1);
  }
  unshift(e) {
    return this.heap.push(e);
  }
  shift() {
    let [e] = this.heap;
    return this.heap[0] = this.heap[this.heap.length - 1], this.heap.pop(), this.percDown(0), e;
  }
  toArray() {
    return [...this];
  }
  *[Symbol.iterator]() {
    for (let e = 0; e < this.heap.length; e++)
      yield this.heap[e].data;
  }
  remove(e) {
    let n = 0;
    for (let i = 0; i < this.heap.length; i++)
      e(this.heap[i]) || (this.heap[n] = this.heap[i], n++);
    this.heap.splice(n);
    for (let i = Gh(this.heap.length - 1); i >= 0; i--)
      this.percDown(i);
    return this;
  }
}
function FR(t) {
  return (t << 1) + 1;
}
function Gh(t) {
  return (t + 1 >> 1) - 1;
}
function au(t, e) {
  return t.priority !== e.priority ? t.priority < e.priority : t.pushCount < e.pushCount;
}
function Wy(t, e) {
  var n = kf(t, e), {
    push: i,
    pushAsync: r
  } = n;
  n._tasks = new NR(), n._createTaskItem = ({ data: a, priority: o }, c) => ({
    data: a,
    priority: o,
    callback: c
  });
  function s(a, o) {
    return Array.isArray(a) ? a.map((c) => ({ data: c, priority: o })) : { data: a, priority: o };
  }
  return n.push = function(a, o = 0, c) {
    return i(s(a, o), c);
  }, n.pushAsync = function(a, o = 0, c) {
    return r(s(a, o), c);
  }, delete n.unshift, delete n.unshiftAsync, n;
}
function MR(t, e) {
  if (e = Di(e), !Array.isArray(t)) return e(new TypeError("First argument to race must be an array of functions"));
  if (!t.length) return e();
  for (var n = 0, i = t.length; n < i; n++)
    Me(t[n])(e);
}
var qy = Ne(MR, 2);
function hc(t, e, n, i) {
  var r = [...t].reverse();
  return _i(r, e, n, i);
}
function mc(t) {
  var e = Me(t);
  return ja(function(i, r) {
    return i.push((s, ...a) => {
      let o = {};
      if (s && (o.error = s), a.length > 0) {
        var c = a;
        a.length <= 1 && ([c] = a), o.value = c;
      }
      r(null, o);
    }), e.apply(this, i);
  });
}
function Gy(t) {
  var e;
  return Array.isArray(t) ? e = t.map(mc) : (e = {}, Object.keys(t).forEach((n) => {
    e[n] = mc.call(this, t[n]);
  })), e;
}
function If(t, e, n, i) {
  const r = Me(n);
  return qc(t, e, (s, a) => {
    r(s, (o, c) => {
      a(o, !c);
    });
  }, i);
}
function $R(t, e, n) {
  return If(nn, t, e, n);
}
var Hy = Ne($R, 3);
function BR(t, e, n, i) {
  return If(On(e), t, n, i);
}
var Vy = Ne(BR, 4);
function UR(t, e, n) {
  return If(An, t, e, n);
}
var Ky = Ne(UR, 3);
function Yy(t) {
  return function() {
    return t;
  };
}
const gp = 5, Zy = 0;
function gc(t, e, n) {
  var i = {
    times: gp,
    intervalFunc: Yy(Zy)
  };
  if (arguments.length < 3 && typeof t == "function" ? (n = e || Jr(), e = t) : (zR(i, t), n = n || Jr()), typeof e != "function")
    throw new Error("Invalid arguments for async.retry");
  var r = Me(e), s = 1;
  function a() {
    r((o, ...c) => {
      o !== !1 && (o && s++ < i.times && (typeof i.errorFilter != "function" || i.errorFilter(o)) ? setTimeout(a, i.intervalFunc(s - 1)) : n(o, ...c));
    });
  }
  return a(), n[us];
}
function zR(t, e) {
  if (typeof e == "object")
    t.times = +e.times || gp, t.intervalFunc = typeof e.interval == "function" ? e.interval : Yy(+e.interval || Zy), t.errorFilter = e.errorFilter;
  else if (typeof e == "number" || typeof e == "string")
    t.times = +e || gp;
  else
    throw new Error("Invalid arguments for async.retry");
}
function Xy(t, e) {
  e || (e = t, t = null);
  let n = t && t.arity || e.length;
  La(e) && (n += 1);
  var i = Me(e);
  return ja((r, s) => {
    (r.length < n - 1 || s == null) && (r.push(s), s = Jr());
    function a(o) {
      i(...r, o);
    }
    return t ? gc(t, a, s) : gc(a, s), s[us];
  });
}
function Jy(t, e) {
  return Cf(An, t, e);
}
function WR(t, e, n) {
  return ei(Boolean, (i) => i)(nn, t, e, n);
}
var bc = Ne(WR, 3);
function qR(t, e, n, i) {
  return ei(Boolean, (r) => r)(On(e), t, n, i);
}
var yc = Ne(qR, 4);
function GR(t, e, n) {
  return ei(Boolean, (i) => i)(An, t, e, n);
}
var vc = Ne(GR, 3);
function HR(t, e, n) {
  var i = Me(e);
  return Wc(t, (s, a) => {
    i(s, (o, c) => {
      if (o) return a(o);
      a(o, { value: s, criteria: c });
    });
  }, (s, a) => {
    if (s) return n(s);
    n(null, a.sort(r).map((o) => o.value));
  });
  function r(s, a) {
    var o = s.criteria, c = a.criteria;
    return o < c ? -1 : o > c ? 1 : 0;
  }
}
var Qy = Ne(HR, 3);
function ev(t, e, n) {
  var i = Me(t);
  return ja((r, s) => {
    var a = !1, o;
    function c() {
      var l = t.name || "anonymous", u = new Error('Callback function "' + l + '" timed out.');
      u.code = "ETIMEDOUT", n && (u.info = n), a = !0, s(u);
    }
    r.push((...l) => {
      a || (s(...l), clearTimeout(o));
    }), o = setTimeout(c, e), i(...r);
  });
}
function VR(t) {
  for (var e = Array(t); t--; )
    e[t] = t;
  return e;
}
function Vc(t, e, n, i) {
  var r = Me(n);
  return Na(VR(t), e, r, i);
}
function tv(t, e, n) {
  return Vc(t, 1 / 0, e, n);
}
function nv(t, e, n) {
  return Vc(t, 1, e, n);
}
function iv(t, e, n, i) {
  arguments.length <= 3 && typeof e == "function" && (i = n, n = e, e = Array.isArray(t) ? [] : {}), i = Di(i || Jr());
  var r = Me(n);
  return nn(t, (s, a, o) => {
    r(e, s, a, o);
  }, (s) => i(s, e)), i[us];
}
function KR(t, e) {
  var n = null, i;
  return Vs(t, (r, s) => {
    Me(r)((a, ...o) => {
      if (a === !1) return s(a);
      o.length < 2 ? [i] = o : i = o, n = a, s(a ? null : {});
    });
  }, () => e(n, i));
}
var rv = Ne(KR);
function sv(t) {
  return (...e) => (t.unmemoized || t)(...e);
}
function YR(t, e, n) {
  n = ji(n);
  var i = Me(e), r = Me(t), s = [];
  function a(c, ...l) {
    if (c) return n(c);
    s = l, c !== !1 && r(o);
  }
  function o(c, l) {
    if (c) return n(c);
    if (c !== !1) {
      if (!l) return n(null, ...s);
      i(a);
    }
  }
  return r(o);
}
var Ks = Ne(YR, 3);
function av(t, e, n) {
  const i = Me(t);
  return Ks((r) => i((s, a) => r(s, !a)), e, n);
}
function ZR(t, e) {
  if (e = Di(e), !Array.isArray(t)) return e(new Error("First argument to waterfall must be an array of functions"));
  if (!t.length) return e();
  var n = 0;
  function i(s) {
    var a = Me(t[n++]);
    a(...s, ji(r));
  }
  function r(s, ...a) {
    if (s !== !1) {
      if (s || n === t.length)
        return e(s, ...a);
      i(a);
    }
  }
  i([]);
}
var ov = Ne(ZR), XR = {
  apply: gy,
  applyEach: _y,
  applyEachSeries: Sy,
  asyncify: qs,
  auto: Tf,
  autoInject: Ey,
  cargo: Ay,
  cargoQueue: Ty,
  compose: Ry,
  concat: nc,
  concatLimit: Qr,
  concatSeries: ic,
  constant: Oy,
  detect: rc,
  detectLimit: sc,
  detectSeries: ac,
  dir: Cy,
  doUntil: ky,
  doWhilst: Gs,
  each: oc,
  eachLimit: Hs,
  eachOf: nn,
  eachOfLimit: Xr,
  eachOfSeries: An,
  eachSeries: Vs,
  ensureAsync: Pf,
  every: cc,
  everyLimit: lc,
  everySeries: uc,
  filter: pc,
  filterLimit: fc,
  filterSeries: dc,
  forever: Dy,
  groupBy: jy,
  groupByLimit: Gc,
  groupBySeries: Ly,
  log: Ny,
  map: Wc,
  mapLimit: Na,
  mapSeries: Af,
  mapValues: Fy,
  mapValuesLimit: Hc,
  mapValuesSeries: My,
  memoize: $y,
  nextTick: By,
  parallel: Uy,
  parallelLimit: zy,
  priorityQueue: Wy,
  queue: kf,
  race: qy,
  reduce: _i,
  reduceRight: hc,
  reflect: mc,
  reflectAll: Gy,
  reject: Hy,
  rejectLimit: Vy,
  rejectSeries: Ky,
  retry: gc,
  retryable: Xy,
  seq: Of,
  series: Jy,
  setImmediate: wi,
  some: bc,
  someLimit: yc,
  someSeries: vc,
  sortBy: Qy,
  timeout: ev,
  times: tv,
  timesLimit: Vc,
  timesSeries: nv,
  transform: iv,
  tryEach: rv,
  unmemoize: sv,
  until: av,
  waterfall: ov,
  whilst: Ks,
  // aliases
  all: cc,
  allLimit: lc,
  allSeries: uc,
  any: bc,
  anyLimit: yc,
  anySeries: vc,
  find: rc,
  findLimit: sc,
  findSeries: ac,
  flatMap: nc,
  flatMapLimit: Qr,
  flatMapSeries: ic,
  forEach: oc,
  forEachSeries: Vs,
  forEachLimit: Hs,
  forEachOf: nn,
  forEachOfSeries: An,
  forEachOfLimit: Xr,
  inject: _i,
  foldl: _i,
  foldr: hc,
  select: pc,
  selectLimit: fc,
  selectSeries: dc,
  wrapSync: qs,
  during: Ks,
  doDuring: Gs
};
const JR = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  all: cc,
  allLimit: lc,
  allSeries: uc,
  any: bc,
  anyLimit: yc,
  anySeries: vc,
  apply: gy,
  applyEach: _y,
  applyEachSeries: Sy,
  asyncify: qs,
  auto: Tf,
  autoInject: Ey,
  cargo: Ay,
  cargoQueue: Ty,
  compose: Ry,
  concat: nc,
  concatLimit: Qr,
  concatSeries: ic,
  constant: Oy,
  default: XR,
  detect: rc,
  detectLimit: sc,
  detectSeries: ac,
  dir: Cy,
  doDuring: Gs,
  doUntil: ky,
  doWhilst: Gs,
  during: Ks,
  each: oc,
  eachLimit: Hs,
  eachOf: nn,
  eachOfLimit: Xr,
  eachOfSeries: An,
  eachSeries: Vs,
  ensureAsync: Pf,
  every: cc,
  everyLimit: lc,
  everySeries: uc,
  filter: pc,
  filterLimit: fc,
  filterSeries: dc,
  find: rc,
  findLimit: sc,
  findSeries: ac,
  flatMap: nc,
  flatMapLimit: Qr,
  flatMapSeries: ic,
  foldl: _i,
  foldr: hc,
  forEach: oc,
  forEachLimit: Hs,
  forEachOf: nn,
  forEachOfLimit: Xr,
  forEachOfSeries: An,
  forEachSeries: Vs,
  forever: Dy,
  groupBy: jy,
  groupByLimit: Gc,
  groupBySeries: Ly,
  inject: _i,
  log: Ny,
  map: Wc,
  mapLimit: Na,
  mapSeries: Af,
  mapValues: Fy,
  mapValuesLimit: Hc,
  mapValuesSeries: My,
  memoize: $y,
  nextTick: By,
  parallel: Uy,
  parallelLimit: zy,
  priorityQueue: Wy,
  queue: kf,
  race: qy,
  reduce: _i,
  reduceRight: hc,
  reflect: mc,
  reflectAll: Gy,
  reject: Hy,
  rejectLimit: Vy,
  rejectSeries: Ky,
  retry: gc,
  retryable: Xy,
  select: pc,
  selectLimit: fc,
  selectSeries: dc,
  seq: Of,
  series: Jy,
  setImmediate: wi,
  some: bc,
  someLimit: yc,
  someSeries: vc,
  sortBy: Qy,
  timeout: ev,
  times: tv,
  timesLimit: Vc,
  timesSeries: nv,
  transform: iv,
  tryEach: rv,
  unmemoize: sv,
  until: av,
  waterfall: ov,
  whilst: Ks,
  wrapSync: qs
}, Symbol.toStringTag, { value: "Module" })), QR = /* @__PURE__ */ nb(JR);
var cv = { exports: {} }, si = t_, eO = process.cwd, jo = null, tO = process.env.GRACEFUL_FS_PLATFORM || process.platform;
process.cwd = function() {
  return jo || (jo = eO.call(process)), jo;
};
try {
  process.cwd();
} catch {
}
if (typeof process.chdir == "function") {
  var Hh = process.chdir;
  process.chdir = function(t) {
    jo = null, Hh.call(process, t);
  }, Object.setPrototypeOf && Object.setPrototypeOf(process.chdir, Hh);
}
var nO = iO;
function iO(t) {
  si.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./) && e(t), t.lutimes || n(t), t.chown = s(t.chown), t.fchown = s(t.fchown), t.lchown = s(t.lchown), t.chmod = i(t.chmod), t.fchmod = i(t.fchmod), t.lchmod = i(t.lchmod), t.chownSync = a(t.chownSync), t.fchownSync = a(t.fchownSync), t.lchownSync = a(t.lchownSync), t.chmodSync = r(t.chmodSync), t.fchmodSync = r(t.fchmodSync), t.lchmodSync = r(t.lchmodSync), t.stat = o(t.stat), t.fstat = o(t.fstat), t.lstat = o(t.lstat), t.statSync = c(t.statSync), t.fstatSync = c(t.fstatSync), t.lstatSync = c(t.lstatSync), t.chmod && !t.lchmod && (t.lchmod = function(u, p, d) {
    d && process.nextTick(d);
  }, t.lchmodSync = function() {
  }), t.chown && !t.lchown && (t.lchown = function(u, p, d, b) {
    b && process.nextTick(b);
  }, t.lchownSync = function() {
  }), tO === "win32" && (t.rename = typeof t.rename != "function" ? t.rename : function(u) {
    function p(d, b, x) {
      var v = Date.now(), y = 0;
      u(d, b, function f(h) {
        if (h && (h.code === "EACCES" || h.code === "EPERM" || h.code === "EBUSY") && Date.now() - v < 6e4) {
          setTimeout(function() {
            t.stat(b, function(g, A) {
              g && g.code === "ENOENT" ? u(d, b, f) : x(h);
            });
          }, y), y < 100 && (y += 10);
          return;
        }
        x && x(h);
      });
    }
    return Object.setPrototypeOf && Object.setPrototypeOf(p, u), p;
  }(t.rename)), t.read = typeof t.read != "function" ? t.read : function(u) {
    function p(d, b, x, v, y, f) {
      var h;
      if (f && typeof f == "function") {
        var g = 0;
        h = function(A, C, V) {
          if (A && A.code === "EAGAIN" && g < 10)
            return g++, u.call(t, d, b, x, v, y, h);
          f.apply(this, arguments);
        };
      }
      return u.call(t, d, b, x, v, y, h);
    }
    return Object.setPrototypeOf && Object.setPrototypeOf(p, u), p;
  }(t.read), t.readSync = typeof t.readSync != "function" ? t.readSync : /* @__PURE__ */ function(u) {
    return function(p, d, b, x, v) {
      for (var y = 0; ; )
        try {
          return u.call(t, p, d, b, x, v);
        } catch (f) {
          if (f.code === "EAGAIN" && y < 10) {
            y++;
            continue;
          }
          throw f;
        }
    };
  }(t.readSync);
  function e(u) {
    u.lchmod = function(p, d, b) {
      u.open(
        p,
        si.O_WRONLY | si.O_SYMLINK,
        d,
        function(x, v) {
          if (x) {
            b && b(x);
            return;
          }
          u.fchmod(v, d, function(y) {
            u.close(v, function(f) {
              b && b(y || f);
            });
          });
        }
      );
    }, u.lchmodSync = function(p, d) {
      var b = u.openSync(p, si.O_WRONLY | si.O_SYMLINK, d), x = !0, v;
      try {
        v = u.fchmodSync(b, d), x = !1;
      } finally {
        if (x)
          try {
            u.closeSync(b);
          } catch {
          }
        else
          u.closeSync(b);
      }
      return v;
    };
  }
  function n(u) {
    si.hasOwnProperty("O_SYMLINK") && u.futimes ? (u.lutimes = function(p, d, b, x) {
      u.open(p, si.O_SYMLINK, function(v, y) {
        if (v) {
          x && x(v);
          return;
        }
        u.futimes(y, d, b, function(f) {
          u.close(y, function(h) {
            x && x(f || h);
          });
        });
      });
    }, u.lutimesSync = function(p, d, b) {
      var x = u.openSync(p, si.O_SYMLINK), v, y = !0;
      try {
        v = u.futimesSync(x, d, b), y = !1;
      } finally {
        if (y)
          try {
            u.closeSync(x);
          } catch {
          }
        else
          u.closeSync(x);
      }
      return v;
    }) : u.futimes && (u.lutimes = function(p, d, b, x) {
      x && process.nextTick(x);
    }, u.lutimesSync = function() {
    });
  }
  function i(u) {
    return u && function(p, d, b) {
      return u.call(t, p, d, function(x) {
        l(x) && (x = null), b && b.apply(this, arguments);
      });
    };
  }
  function r(u) {
    return u && function(p, d) {
      try {
        return u.call(t, p, d);
      } catch (b) {
        if (!l(b)) throw b;
      }
    };
  }
  function s(u) {
    return u && function(p, d, b, x) {
      return u.call(t, p, d, b, function(v) {
        l(v) && (v = null), x && x.apply(this, arguments);
      });
    };
  }
  function a(u) {
    return u && function(p, d, b) {
      try {
        return u.call(t, p, d, b);
      } catch (x) {
        if (!l(x)) throw x;
      }
    };
  }
  function o(u) {
    return u && function(p, d, b) {
      typeof d == "function" && (b = d, d = null);
      function x(v, y) {
        y && (y.uid < 0 && (y.uid += 4294967296), y.gid < 0 && (y.gid += 4294967296)), b && b.apply(this, arguments);
      }
      return d ? u.call(t, p, d, x) : u.call(t, p, x);
    };
  }
  function c(u) {
    return u && function(p, d) {
      var b = d ? u.call(t, p, d) : u.call(t, p);
      return b && (b.uid < 0 && (b.uid += 4294967296), b.gid < 0 && (b.gid += 4294967296)), b;
    };
  }
  function l(u) {
    if (!u || u.code === "ENOSYS")
      return !0;
    var p = !process.getuid || process.getuid() !== 0;
    return !!(p && (u.code === "EINVAL" || u.code === "EPERM"));
  }
}
var Vh = nt.Stream, rO = sO;
function sO(t) {
  return {
    ReadStream: e,
    WriteStream: n
  };
  function e(i, r) {
    if (!(this instanceof e)) return new e(i, r);
    Vh.call(this);
    var s = this;
    this.path = i, this.fd = null, this.readable = !0, this.paused = !1, this.flags = "r", this.mode = 438, this.bufferSize = 64 * 1024, r = r || {};
    for (var a = Object.keys(r), o = 0, c = a.length; o < c; o++) {
      var l = a[o];
      this[l] = r[l];
    }
    if (this.encoding && this.setEncoding(this.encoding), this.start !== void 0) {
      if (typeof this.start != "number")
        throw TypeError("start must be a Number");
      if (this.end === void 0)
        this.end = 1 / 0;
      else if (typeof this.end != "number")
        throw TypeError("end must be a Number");
      if (this.start > this.end)
        throw new Error("start must be <= end");
      this.pos = this.start;
    }
    if (this.fd !== null) {
      process.nextTick(function() {
        s._read();
      });
      return;
    }
    t.open(this.path, this.flags, this.mode, function(u, p) {
      if (u) {
        s.emit("error", u), s.readable = !1;
        return;
      }
      s.fd = p, s.emit("open", p), s._read();
    });
  }
  function n(i, r) {
    if (!(this instanceof n)) return new n(i, r);
    Vh.call(this), this.path = i, this.fd = null, this.writable = !0, this.flags = "w", this.encoding = "binary", this.mode = 438, this.bytesWritten = 0, r = r || {};
    for (var s = Object.keys(r), a = 0, o = s.length; a < o; a++) {
      var c = s[a];
      this[c] = r[c];
    }
    if (this.start !== void 0) {
      if (typeof this.start != "number")
        throw TypeError("start must be a Number");
      if (this.start < 0)
        throw new Error("start must be >= zero");
      this.pos = this.start;
    }
    this.busy = !1, this._queue = [], this.fd === null && (this._open = t.open, this._queue.push([this._open, this.path, this.flags, this.mode, void 0]), this.flush());
  }
}
var aO = cO, oO = Object.getPrototypeOf || function(t) {
  return t.__proto__;
};
function cO(t) {
  if (t === null || typeof t != "object")
    return t;
  if (t instanceof Object)
    var e = { __proto__: oO(t) };
  else
    var e = /* @__PURE__ */ Object.create(null);
  return Object.getOwnPropertyNames(t).forEach(function(n) {
    Object.defineProperty(e, n, Object.getOwnPropertyDescriptor(t, n));
  }), e;
}
var it = dt, lO = nO, uO = rO, pO = aO, co = xt, It, xc;
typeof Symbol == "function" && typeof Symbol.for == "function" ? (It = Symbol.for("graceful-fs.queue"), xc = Symbol.for("graceful-fs.previous")) : (It = "___graceful-fs.queue", xc = "___graceful-fs.previous");
function fO() {
}
function lv(t, e) {
  Object.defineProperty(t, It, {
    get: function() {
      return e;
    }
  });
}
var or = fO;
co.debuglog ? or = co.debuglog("gfs4") : /\bgfs4\b/i.test(process.env.NODE_DEBUG || "") && (or = function() {
  var t = co.format.apply(co, arguments);
  t = "GFS4: " + t.split(/\n/).join(`
GFS4: `), console.error(t);
});
if (!it[It]) {
  var dO = We[It] || [];
  lv(it, dO), it.close = function(t) {
    function e(n, i) {
      return t.call(it, n, function(r) {
        r || Kh(), typeof i == "function" && i.apply(this, arguments);
      });
    }
    return Object.defineProperty(e, xc, {
      value: t
    }), e;
  }(it.close), it.closeSync = function(t) {
    function e(n) {
      t.apply(it, arguments), Kh();
    }
    return Object.defineProperty(e, xc, {
      value: t
    }), e;
  }(it.closeSync), /\bgfs4\b/i.test(process.env.NODE_DEBUG || "") && process.on("exit", function() {
    or(it[It]), Jp.equal(it[It].length, 0);
  });
}
We[It] || lv(We, it[It]);
var Df = jf(pO(it));
process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !it.__patched && (Df = jf(it), it.__patched = !0);
function jf(t) {
  lO(t), t.gracefulify = jf, t.createReadStream = C, t.createWriteStream = V;
  var e = t.readFile;
  t.readFile = n;
  function n(X, D, B) {
    return typeof D == "function" && (B = D, D = null), Y(X, D, B);
    function Y(U, ae, le, pe) {
      return e(U, ae, function(z) {
        z && (z.code === "EMFILE" || z.code === "ENFILE") ? Er([Y, [U, ae, le], z, pe || Date.now(), Date.now()]) : typeof le == "function" && le.apply(this, arguments);
      });
    }
  }
  var i = t.writeFile;
  t.writeFile = r;
  function r(X, D, B, Y) {
    return typeof B == "function" && (Y = B, B = null), U(X, D, B, Y);
    function U(ae, le, pe, z, k) {
      return i(ae, le, pe, function(H) {
        H && (H.code === "EMFILE" || H.code === "ENFILE") ? Er([U, [ae, le, pe, z], H, k || Date.now(), Date.now()]) : typeof z == "function" && z.apply(this, arguments);
      });
    }
  }
  var s = t.appendFile;
  s && (t.appendFile = a);
  function a(X, D, B, Y) {
    return typeof B == "function" && (Y = B, B = null), U(X, D, B, Y);
    function U(ae, le, pe, z, k) {
      return s(ae, le, pe, function(H) {
        H && (H.code === "EMFILE" || H.code === "ENFILE") ? Er([U, [ae, le, pe, z], H, k || Date.now(), Date.now()]) : typeof z == "function" && z.apply(this, arguments);
      });
    }
  }
  var o = t.copyFile;
  o && (t.copyFile = c);
  function c(X, D, B, Y) {
    return typeof B == "function" && (Y = B, B = 0), U(X, D, B, Y);
    function U(ae, le, pe, z, k) {
      return o(ae, le, pe, function(H) {
        H && (H.code === "EMFILE" || H.code === "ENFILE") ? Er([U, [ae, le, pe, z], H, k || Date.now(), Date.now()]) : typeof z == "function" && z.apply(this, arguments);
      });
    }
  }
  var l = t.readdir;
  t.readdir = p;
  var u = /^v[0-5]\./;
  function p(X, D, B) {
    typeof D == "function" && (B = D, D = null);
    var Y = u.test(process.version) ? function(le, pe, z, k) {
      return l(le, U(
        le,
        pe,
        z,
        k
      ));
    } : function(le, pe, z, k) {
      return l(le, pe, U(
        le,
        pe,
        z,
        k
      ));
    };
    return Y(X, D, B);
    function U(ae, le, pe, z) {
      return function(k, H) {
        k && (k.code === "EMFILE" || k.code === "ENFILE") ? Er([
          Y,
          [ae, le, pe],
          k,
          z || Date.now(),
          Date.now()
        ]) : (H && H.sort && H.sort(), typeof pe == "function" && pe.call(this, k, H));
      };
    }
  }
  if (process.version.substr(0, 4) === "v0.8") {
    var d = uO(t);
    f = d.ReadStream, g = d.WriteStream;
  }
  var b = t.ReadStream;
  b && (f.prototype = Object.create(b.prototype), f.prototype.open = h);
  var x = t.WriteStream;
  x && (g.prototype = Object.create(x.prototype), g.prototype.open = A), Object.defineProperty(t, "ReadStream", {
    get: function() {
      return f;
    },
    set: function(X) {
      f = X;
    },
    enumerable: !0,
    configurable: !0
  }), Object.defineProperty(t, "WriteStream", {
    get: function() {
      return g;
    },
    set: function(X) {
      g = X;
    },
    enumerable: !0,
    configurable: !0
  });
  var v = f;
  Object.defineProperty(t, "FileReadStream", {
    get: function() {
      return v;
    },
    set: function(X) {
      v = X;
    },
    enumerable: !0,
    configurable: !0
  });
  var y = g;
  Object.defineProperty(t, "FileWriteStream", {
    get: function() {
      return y;
    },
    set: function(X) {
      y = X;
    },
    enumerable: !0,
    configurable: !0
  });
  function f(X, D) {
    return this instanceof f ? (b.apply(this, arguments), this) : f.apply(Object.create(f.prototype), arguments);
  }
  function h() {
    var X = this;
    L(X.path, X.flags, X.mode, function(D, B) {
      D ? (X.autoClose && X.destroy(), X.emit("error", D)) : (X.fd = B, X.emit("open", B), X.read());
    });
  }
  function g(X, D) {
    return this instanceof g ? (x.apply(this, arguments), this) : g.apply(Object.create(g.prototype), arguments);
  }
  function A() {
    var X = this;
    L(X.path, X.flags, X.mode, function(D, B) {
      D ? (X.destroy(), X.emit("error", D)) : (X.fd = B, X.emit("open", B));
    });
  }
  function C(X, D) {
    return new t.ReadStream(X, D);
  }
  function V(X, D) {
    return new t.WriteStream(X, D);
  }
  var K = t.open;
  t.open = L;
  function L(X, D, B, Y) {
    return typeof B == "function" && (Y = B, B = null), U(X, D, B, Y);
    function U(ae, le, pe, z, k) {
      return K(ae, le, pe, function(H, R) {
        H && (H.code === "EMFILE" || H.code === "ENFILE") ? Er([U, [ae, le, pe, z], H, k || Date.now(), Date.now()]) : typeof z == "function" && z.apply(this, arguments);
      });
    }
  }
  return t;
}
function Er(t) {
  or("ENQUEUE", t[0].name, t[1]), it[It].push(t), Lf();
}
var lo;
function Kh() {
  for (var t = Date.now(), e = 0; e < it[It].length; ++e)
    it[It][e].length > 2 && (it[It][e][3] = t, it[It][e][4] = t);
  Lf();
}
function Lf() {
  if (clearTimeout(lo), lo = void 0, it[It].length !== 0) {
    var t = it[It].shift(), e = t[0], n = t[1], i = t[2], r = t[3], s = t[4];
    if (r === void 0)
      or("RETRY", e.name, n), e.apply(null, n);
    else if (Date.now() - r >= 6e4) {
      or("TIMEOUT", e.name, n);
      var a = n.pop();
      typeof a == "function" && a.call(null, i);
    } else {
      var o = Date.now() - s, c = Math.max(s - r, 1), l = Math.min(c * 1.2, 100);
      o >= l ? (or("RETRY", e.name, n), e.apply(null, n.concat([r]))) : it[It].push(t);
    }
    lo === void 0 && (lo = setTimeout(Lf, 0));
  }
}
const Nn = (t) => t !== null && typeof t == "object" && typeof t.pipe == "function";
Nn.writable = (t) => Nn(t) && t.writable !== !1 && typeof t._write == "function" && typeof t._writableState == "object";
Nn.readable = (t) => Nn(t) && t.readable !== !1 && typeof t._read == "function" && typeof t._readableState == "object";
Nn.duplex = (t) => Nn.writable(t) && Nn.readable(t);
Nn.transform = (t) => Nn.duplex(t) && typeof t._transform == "function";
var Nf = Nn, bp = { exports: {} }, uo = { exports: {} }, Yh;
function Kc() {
  if (Yh) return uo.exports;
  Yh = 1, typeof process > "u" || !process.version || process.version.indexOf("v0.") === 0 || process.version.indexOf("v1.") === 0 && process.version.indexOf("v1.8.") !== 0 ? uo.exports = { nextTick: t } : uo.exports = process;
  function t(e, n, i, r) {
    if (typeof e != "function")
      throw new TypeError('"callback" argument must be a function');
    var s = arguments.length, a, o;
    switch (s) {
      case 0:
      case 1:
        return process.nextTick(e);
      case 2:
        return process.nextTick(function() {
          e.call(null, n);
        });
      case 3:
        return process.nextTick(function() {
          e.call(null, n, i);
        });
      case 4:
        return process.nextTick(function() {
          e.call(null, n, i, r);
        });
      default:
        for (a = new Array(s - 1), o = 0; o < a.length; )
          a[o++] = arguments[o];
        return process.nextTick(function() {
          e.apply(null, a);
        });
    }
  }
  return uo.exports;
}
var ou, Zh;
function hO() {
  if (Zh) return ou;
  Zh = 1;
  var t = {}.toString;
  return ou = Array.isArray || function(e) {
    return t.call(e) == "[object Array]";
  }, ou;
}
var cu, Xh;
function uv() {
  return Xh || (Xh = 1, cu = nt), cu;
}
var po = { exports: {} }, Jh;
function Yc() {
  return Jh || (Jh = 1, function(t, e) {
    var n = $n, i = n.Buffer;
    function r(a, o) {
      for (var c in a)
        o[c] = a[c];
    }
    i.from && i.alloc && i.allocUnsafe && i.allocUnsafeSlow ? t.exports = n : (r(n, e), e.Buffer = s);
    function s(a, o, c) {
      return i(a, o, c);
    }
    r(i, s), s.from = function(a, o, c) {
      if (typeof a == "number")
        throw new TypeError("Argument must not be a number");
      return i(a, o, c);
    }, s.alloc = function(a, o, c) {
      if (typeof a != "number")
        throw new TypeError("Argument must be a number");
      var l = i(a);
      return o !== void 0 ? typeof c == "string" ? l.fill(o, c) : l.fill(o) : l.fill(0), l;
    }, s.allocUnsafe = function(a) {
      if (typeof a != "number")
        throw new TypeError("Argument must be a number");
      return i(a);
    }, s.allocUnsafeSlow = function(a) {
      if (typeof a != "number")
        throw new TypeError("Argument must be a number");
      return n.SlowBuffer(a);
    };
  }(po, po.exports)), po.exports;
}
var kt = {}, Qh;
function Fa() {
  if (Qh) return kt;
  Qh = 1;
  function t(v) {
    return Array.isArray ? Array.isArray(v) : x(v) === "[object Array]";
  }
  kt.isArray = t;
  function e(v) {
    return typeof v == "boolean";
  }
  kt.isBoolean = e;
  function n(v) {
    return v === null;
  }
  kt.isNull = n;
  function i(v) {
    return v == null;
  }
  kt.isNullOrUndefined = i;
  function r(v) {
    return typeof v == "number";
  }
  kt.isNumber = r;
  function s(v) {
    return typeof v == "string";
  }
  kt.isString = s;
  function a(v) {
    return typeof v == "symbol";
  }
  kt.isSymbol = a;
  function o(v) {
    return v === void 0;
  }
  kt.isUndefined = o;
  function c(v) {
    return x(v) === "[object RegExp]";
  }
  kt.isRegExp = c;
  function l(v) {
    return typeof v == "object" && v !== null;
  }
  kt.isObject = l;
  function u(v) {
    return x(v) === "[object Date]";
  }
  kt.isDate = u;
  function p(v) {
    return x(v) === "[object Error]" || v instanceof Error;
  }
  kt.isError = p;
  function d(v) {
    return typeof v == "function";
  }
  kt.isFunction = d;
  function b(v) {
    return v === null || typeof v == "boolean" || typeof v == "number" || typeof v == "string" || typeof v == "symbol" || // ES6 symbol
    typeof v > "u";
  }
  kt.isPrimitive = b, kt.isBuffer = $n.Buffer.isBuffer;
  function x(v) {
    return Object.prototype.toString.call(v);
  }
  return kt;
}
var fo = { exports: {} }, ho = { exports: {} }, em;
function mO() {
  return em || (em = 1, typeof Object.create == "function" ? ho.exports = function(e, n) {
    n && (e.super_ = n, e.prototype = Object.create(n.prototype, {
      constructor: {
        value: e,
        enumerable: !1,
        writable: !0,
        configurable: !0
      }
    }));
  } : ho.exports = function(e, n) {
    if (n) {
      e.super_ = n;
      var i = function() {
      };
      i.prototype = n.prototype, e.prototype = new i(), e.prototype.constructor = e;
    }
  }), ho.exports;
}
var tm;
function Ma() {
  if (tm) return fo.exports;
  tm = 1;
  try {
    var t = require("util");
    if (typeof t.inherits != "function") throw "";
    fo.exports = t.inherits;
  } catch {
    fo.exports = mO();
  }
  return fo.exports;
}
var lu = { exports: {} }, nm;
function gO() {
  return nm || (nm = 1, function(t) {
    function e(s, a) {
      if (!(s instanceof a))
        throw new TypeError("Cannot call a class as a function");
    }
    var n = Yc().Buffer, i = xt;
    function r(s, a, o) {
      s.copy(a, o);
    }
    t.exports = function() {
      function s() {
        e(this, s), this.head = null, this.tail = null, this.length = 0;
      }
      return s.prototype.push = function(o) {
        var c = { data: o, next: null };
        this.length > 0 ? this.tail.next = c : this.head = c, this.tail = c, ++this.length;
      }, s.prototype.unshift = function(o) {
        var c = { data: o, next: this.head };
        this.length === 0 && (this.tail = c), this.head = c, ++this.length;
      }, s.prototype.shift = function() {
        if (this.length !== 0) {
          var o = this.head.data;
          return this.length === 1 ? this.head = this.tail = null : this.head = this.head.next, --this.length, o;
        }
      }, s.prototype.clear = function() {
        this.head = this.tail = null, this.length = 0;
      }, s.prototype.join = function(o) {
        if (this.length === 0) return "";
        for (var c = this.head, l = "" + c.data; c = c.next; )
          l += o + c.data;
        return l;
      }, s.prototype.concat = function(o) {
        if (this.length === 0) return n.alloc(0);
        for (var c = n.allocUnsafe(o >>> 0), l = this.head, u = 0; l; )
          r(l.data, c, u), u += l.data.length, l = l.next;
        return c;
      }, s;
    }(), i && i.inspect && i.inspect.custom && (t.exports.prototype[i.inspect.custom] = function() {
      var s = i.inspect({ length: this.length });
      return this.constructor.name + " " + s;
    });
  }(lu)), lu.exports;
}
var uu, im;
function pv() {
  if (im) return uu;
  im = 1;
  var t = Kc();
  function e(r, s) {
    var a = this, o = this._readableState && this._readableState.destroyed, c = this._writableState && this._writableState.destroyed;
    return o || c ? (s ? s(r) : r && (this._writableState ? this._writableState.errorEmitted || (this._writableState.errorEmitted = !0, t.nextTick(i, this, r)) : t.nextTick(i, this, r)), this) : (this._readableState && (this._readableState.destroyed = !0), this._writableState && (this._writableState.destroyed = !0), this._destroy(r || null, function(l) {
      !s && l ? a._writableState ? a._writableState.errorEmitted || (a._writableState.errorEmitted = !0, t.nextTick(i, a, l)) : t.nextTick(i, a, l) : s && s(l);
    }), this);
  }
  function n() {
    this._readableState && (this._readableState.destroyed = !1, this._readableState.reading = !1, this._readableState.ended = !1, this._readableState.endEmitted = !1), this._writableState && (this._writableState.destroyed = !1, this._writableState.ended = !1, this._writableState.ending = !1, this._writableState.finalCalled = !1, this._writableState.prefinished = !1, this._writableState.finished = !1, this._writableState.errorEmitted = !1);
  }
  function i(r, s) {
    r.emit("error", s);
  }
  return uu = {
    destroy: e,
    undestroy: n
  }, uu;
}
var pu, rm;
function bO() {
  return rm || (rm = 1, pu = xt.deprecate), pu;
}
var fu, sm;
function fv() {
  if (sm) return fu;
  sm = 1;
  var t = Kc();
  fu = v;
  function e(z) {
    var k = this;
    this.next = null, this.entry = null, this.finish = function() {
      pe(k, z);
    };
  }
  var n = !process.browser && ["v0.10", "v0.9."].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : t.nextTick, i;
  v.WritableState = b;
  var r = Object.create(Fa());
  r.inherits = Ma();
  var s = {
    deprecate: bO()
  }, a = uv(), o = Yc().Buffer, c = (typeof We < "u" ? We : typeof window < "u" ? window : typeof self < "u" ? self : {}).Uint8Array || function() {
  };
  function l(z) {
    return o.from(z);
  }
  function u(z) {
    return o.isBuffer(z) || z instanceof c;
  }
  var p = pv();
  r.inherits(v, a);
  function d() {
  }
  function b(z, k) {
    i = i || es(), z = z || {};
    var H = k instanceof i;
    this.objectMode = !!z.objectMode, H && (this.objectMode = this.objectMode || !!z.writableObjectMode);
    var R = z.highWaterMark, Z = z.writableHighWaterMark, se = this.objectMode ? 16 : 16 * 1024;
    R || R === 0 ? this.highWaterMark = R : H && (Z || Z === 0) ? this.highWaterMark = Z : this.highWaterMark = se, this.highWaterMark = Math.floor(this.highWaterMark), this.finalCalled = !1, this.needDrain = !1, this.ending = !1, this.ended = !1, this.finished = !1, this.destroyed = !1;
    var te = z.decodeStrings === !1;
    this.decodeStrings = !te, this.defaultEncoding = z.defaultEncoding || "utf8", this.length = 0, this.writing = !1, this.corked = 0, this.sync = !0, this.bufferProcessing = !1, this.onwrite = function(he) {
      K(k, he);
    }, this.writecb = null, this.writelen = 0, this.bufferedRequest = null, this.lastBufferedRequest = null, this.pendingcb = 0, this.prefinished = !1, this.errorEmitted = !1, this.bufferedRequestCount = 0, this.corkedRequestsFree = new e(this);
  }
  b.prototype.getBuffer = function() {
    for (var k = this.bufferedRequest, H = []; k; )
      H.push(k), k = k.next;
    return H;
  }, function() {
    try {
      Object.defineProperty(b.prototype, "buffer", {
        get: s.deprecate(function() {
          return this.getBuffer();
        }, "_writableState.buffer is deprecated. Use _writableState.getBuffer instead.", "DEP0003")
      });
    } catch {
    }
  }();
  var x;
  typeof Symbol == "function" && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] == "function" ? (x = Function.prototype[Symbol.hasInstance], Object.defineProperty(v, Symbol.hasInstance, {
    value: function(z) {
      return x.call(this, z) ? !0 : this !== v ? !1 : z && z._writableState instanceof b;
    }
  })) : x = function(z) {
    return z instanceof this;
  };
  function v(z) {
    if (i = i || es(), !x.call(v, this) && !(this instanceof i))
      return new v(z);
    this._writableState = new b(z, this), this.writable = !0, z && (typeof z.write == "function" && (this._write = z.write), typeof z.writev == "function" && (this._writev = z.writev), typeof z.destroy == "function" && (this._destroy = z.destroy), typeof z.final == "function" && (this._final = z.final)), a.call(this);
  }
  v.prototype.pipe = function() {
    this.emit("error", new Error("Cannot pipe, not readable"));
  };
  function y(z, k) {
    var H = new Error("write after end");
    z.emit("error", H), t.nextTick(k, H);
  }
  function f(z, k, H, R) {
    var Z = !0, se = !1;
    return H === null ? se = new TypeError("May not write null values to stream") : typeof H != "string" && H !== void 0 && !k.objectMode && (se = new TypeError("Invalid non-string/buffer chunk")), se && (z.emit("error", se), t.nextTick(R, se), Z = !1), Z;
  }
  v.prototype.write = function(z, k, H) {
    var R = this._writableState, Z = !1, se = !R.objectMode && u(z);
    return se && !o.isBuffer(z) && (z = l(z)), typeof k == "function" && (H = k, k = null), se ? k = "buffer" : k || (k = R.defaultEncoding), typeof H != "function" && (H = d), R.ended ? y(this, H) : (se || f(this, R, z, H)) && (R.pendingcb++, Z = g(this, R, se, z, k, H)), Z;
  }, v.prototype.cork = function() {
    var z = this._writableState;
    z.corked++;
  }, v.prototype.uncork = function() {
    var z = this._writableState;
    z.corked && (z.corked--, !z.writing && !z.corked && !z.bufferProcessing && z.bufferedRequest && D(this, z));
  }, v.prototype.setDefaultEncoding = function(k) {
    if (typeof k == "string" && (k = k.toLowerCase()), !(["hex", "utf8", "utf-8", "ascii", "binary", "base64", "ucs2", "ucs-2", "utf16le", "utf-16le", "raw"].indexOf((k + "").toLowerCase()) > -1)) throw new TypeError("Unknown encoding: " + k);
    return this._writableState.defaultEncoding = k, this;
  };
  function h(z, k, H) {
    return !z.objectMode && z.decodeStrings !== !1 && typeof k == "string" && (k = o.from(k, H)), k;
  }
  Object.defineProperty(v.prototype, "writableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: function() {
      return this._writableState.highWaterMark;
    }
  });
  function g(z, k, H, R, Z, se) {
    if (!H) {
      var te = h(k, R, Z);
      R !== te && (H = !0, Z = "buffer", R = te);
    }
    var he = k.objectMode ? 1 : R.length;
    k.length += he;
    var Se = k.length < k.highWaterMark;
    if (Se || (k.needDrain = !0), k.writing || k.corked) {
      var ye = k.lastBufferedRequest;
      k.lastBufferedRequest = {
        chunk: R,
        encoding: Z,
        isBuf: H,
        callback: se,
        next: null
      }, ye ? ye.next = k.lastBufferedRequest : k.bufferedRequest = k.lastBufferedRequest, k.bufferedRequestCount += 1;
    } else
      A(z, k, !1, he, R, Z, se);
    return Se;
  }
  function A(z, k, H, R, Z, se, te) {
    k.writelen = R, k.writecb = te, k.writing = !0, k.sync = !0, H ? z._writev(Z, k.onwrite) : z._write(Z, se, k.onwrite), k.sync = !1;
  }
  function C(z, k, H, R, Z) {
    --k.pendingcb, H ? (t.nextTick(Z, R), t.nextTick(ae, z, k), z._writableState.errorEmitted = !0, z.emit("error", R)) : (Z(R), z._writableState.errorEmitted = !0, z.emit("error", R), ae(z, k));
  }
  function V(z) {
    z.writing = !1, z.writecb = null, z.length -= z.writelen, z.writelen = 0;
  }
  function K(z, k) {
    var H = z._writableState, R = H.sync, Z = H.writecb;
    if (V(H), k) C(z, H, R, k, Z);
    else {
      var se = B(H);
      !se && !H.corked && !H.bufferProcessing && H.bufferedRequest && D(z, H), R ? n(L, z, H, se, Z) : L(z, H, se, Z);
    }
  }
  function L(z, k, H, R) {
    H || X(z, k), k.pendingcb--, R(), ae(z, k);
  }
  function X(z, k) {
    k.length === 0 && k.needDrain && (k.needDrain = !1, z.emit("drain"));
  }
  function D(z, k) {
    k.bufferProcessing = !0;
    var H = k.bufferedRequest;
    if (z._writev && H && H.next) {
      var R = k.bufferedRequestCount, Z = new Array(R), se = k.corkedRequestsFree;
      se.entry = H;
      for (var te = 0, he = !0; H; )
        Z[te] = H, H.isBuf || (he = !1), H = H.next, te += 1;
      Z.allBuffers = he, A(z, k, !0, k.length, Z, "", se.finish), k.pendingcb++, k.lastBufferedRequest = null, se.next ? (k.corkedRequestsFree = se.next, se.next = null) : k.corkedRequestsFree = new e(k), k.bufferedRequestCount = 0;
    } else {
      for (; H; ) {
        var Se = H.chunk, ye = H.encoding, T = H.callback, S = k.objectMode ? 1 : Se.length;
        if (A(z, k, !1, S, Se, ye, T), H = H.next, k.bufferedRequestCount--, k.writing)
          break;
      }
      H === null && (k.lastBufferedRequest = null);
    }
    k.bufferedRequest = H, k.bufferProcessing = !1;
  }
  v.prototype._write = function(z, k, H) {
    H(new Error("_write() is not implemented"));
  }, v.prototype._writev = null, v.prototype.end = function(z, k, H) {
    var R = this._writableState;
    typeof z == "function" ? (H = z, z = null, k = null) : typeof k == "function" && (H = k, k = null), z != null && this.write(z, k), R.corked && (R.corked = 1, this.uncork()), R.ending || le(this, R, H);
  };
  function B(z) {
    return z.ending && z.length === 0 && z.bufferedRequest === null && !z.finished && !z.writing;
  }
  function Y(z, k) {
    z._final(function(H) {
      k.pendingcb--, H && z.emit("error", H), k.prefinished = !0, z.emit("prefinish"), ae(z, k);
    });
  }
  function U(z, k) {
    !k.prefinished && !k.finalCalled && (typeof z._final == "function" ? (k.pendingcb++, k.finalCalled = !0, t.nextTick(Y, z, k)) : (k.prefinished = !0, z.emit("prefinish")));
  }
  function ae(z, k) {
    var H = B(k);
    return H && (U(z, k), k.pendingcb === 0 && (k.finished = !0, z.emit("finish"))), H;
  }
  function le(z, k, H) {
    k.ending = !0, ae(z, k), H && (k.finished ? t.nextTick(H) : z.once("finish", H)), k.ended = !0, z.writable = !1;
  }
  function pe(z, k, H) {
    var R = z.entry;
    for (z.entry = null; R; ) {
      var Z = R.callback;
      k.pendingcb--, Z(H), R = R.next;
    }
    k.corkedRequestsFree.next = z;
  }
  return Object.defineProperty(v.prototype, "destroyed", {
    get: function() {
      return this._writableState === void 0 ? !1 : this._writableState.destroyed;
    },
    set: function(z) {
      this._writableState && (this._writableState.destroyed = z);
    }
  }), v.prototype.destroy = p.destroy, v.prototype._undestroy = p.undestroy, v.prototype._destroy = function(z, k) {
    this.end(), k(z);
  }, fu;
}
var du, am;
function es() {
  if (am) return du;
  am = 1;
  var t = Kc(), e = Object.keys || function(p) {
    var d = [];
    for (var b in p)
      d.push(b);
    return d;
  };
  du = c;
  var n = Object.create(Fa());
  n.inherits = Ma();
  var i = dv(), r = fv();
  n.inherits(c, i);
  for (var s = e(r.prototype), a = 0; a < s.length; a++) {
    var o = s[a];
    c.prototype[o] || (c.prototype[o] = r.prototype[o]);
  }
  function c(p) {
    if (!(this instanceof c)) return new c(p);
    i.call(this, p), r.call(this, p), p && p.readable === !1 && (this.readable = !1), p && p.writable === !1 && (this.writable = !1), this.allowHalfOpen = !0, p && p.allowHalfOpen === !1 && (this.allowHalfOpen = !1), this.once("end", l);
  }
  Object.defineProperty(c.prototype, "writableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: function() {
      return this._writableState.highWaterMark;
    }
  });
  function l() {
    this.allowHalfOpen || this._writableState.ended || t.nextTick(u, this);
  }
  function u(p) {
    p.end();
  }
  return Object.defineProperty(c.prototype, "destroyed", {
    get: function() {
      return this._readableState === void 0 || this._writableState === void 0 ? !1 : this._readableState.destroyed && this._writableState.destroyed;
    },
    set: function(p) {
      this._readableState === void 0 || this._writableState === void 0 || (this._readableState.destroyed = p, this._writableState.destroyed = p);
    }
  }), c.prototype._destroy = function(p, d) {
    this.push(null), this.end(), t.nextTick(d, p);
  }, du;
}
var hu = {}, om;
function cm() {
  if (om) return hu;
  om = 1;
  var t = Yc().Buffer, e = t.isEncoding || function(f) {
    switch (f = "" + f, f && f.toLowerCase()) {
      case "hex":
      case "utf8":
      case "utf-8":
      case "ascii":
      case "binary":
      case "base64":
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
      case "raw":
        return !0;
      default:
        return !1;
    }
  };
  function n(f) {
    if (!f) return "utf8";
    for (var h; ; )
      switch (f) {
        case "utf8":
        case "utf-8":
          return "utf8";
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return "utf16le";
        case "latin1":
        case "binary":
          return "latin1";
        case "base64":
        case "ascii":
        case "hex":
          return f;
        default:
          if (h) return;
          f = ("" + f).toLowerCase(), h = !0;
      }
  }
  function i(f) {
    var h = n(f);
    if (typeof h != "string" && (t.isEncoding === e || !e(f))) throw new Error("Unknown encoding: " + f);
    return h || f;
  }
  hu.StringDecoder = r;
  function r(f) {
    this.encoding = i(f);
    var h;
    switch (this.encoding) {
      case "utf16le":
        this.text = p, this.end = d, h = 4;
        break;
      case "utf8":
        this.fillLast = c, h = 4;
        break;
      case "base64":
        this.text = b, this.end = x, h = 3;
        break;
      default:
        this.write = v, this.end = y;
        return;
    }
    this.lastNeed = 0, this.lastTotal = 0, this.lastChar = t.allocUnsafe(h);
  }
  r.prototype.write = function(f) {
    if (f.length === 0) return "";
    var h, g;
    if (this.lastNeed) {
      if (h = this.fillLast(f), h === void 0) return "";
      g = this.lastNeed, this.lastNeed = 0;
    } else
      g = 0;
    return g < f.length ? h ? h + this.text(f, g) : this.text(f, g) : h || "";
  }, r.prototype.end = u, r.prototype.text = l, r.prototype.fillLast = function(f) {
    if (this.lastNeed <= f.length)
      return f.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed), this.lastChar.toString(this.encoding, 0, this.lastTotal);
    f.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, f.length), this.lastNeed -= f.length;
  };
  function s(f) {
    return f <= 127 ? 0 : f >> 5 === 6 ? 2 : f >> 4 === 14 ? 3 : f >> 3 === 30 ? 4 : f >> 6 === 2 ? -1 : -2;
  }
  function a(f, h, g) {
    var A = h.length - 1;
    if (A < g) return 0;
    var C = s(h[A]);
    return C >= 0 ? (C > 0 && (f.lastNeed = C - 1), C) : --A < g || C === -2 ? 0 : (C = s(h[A]), C >= 0 ? (C > 0 && (f.lastNeed = C - 2), C) : --A < g || C === -2 ? 0 : (C = s(h[A]), C >= 0 ? (C > 0 && (C === 2 ? C = 0 : f.lastNeed = C - 3), C) : 0));
  }
  function o(f, h, g) {
    if ((h[0] & 192) !== 128)
      return f.lastNeed = 0, "�";
    if (f.lastNeed > 1 && h.length > 1) {
      if ((h[1] & 192) !== 128)
        return f.lastNeed = 1, "�";
      if (f.lastNeed > 2 && h.length > 2 && (h[2] & 192) !== 128)
        return f.lastNeed = 2, "�";
    }
  }
  function c(f) {
    var h = this.lastTotal - this.lastNeed, g = o(this, f);
    if (g !== void 0) return g;
    if (this.lastNeed <= f.length)
      return f.copy(this.lastChar, h, 0, this.lastNeed), this.lastChar.toString(this.encoding, 0, this.lastTotal);
    f.copy(this.lastChar, h, 0, f.length), this.lastNeed -= f.length;
  }
  function l(f, h) {
    var g = a(this, f, h);
    if (!this.lastNeed) return f.toString("utf8", h);
    this.lastTotal = g;
    var A = f.length - (g - this.lastNeed);
    return f.copy(this.lastChar, 0, A), f.toString("utf8", h, A);
  }
  function u(f) {
    var h = f && f.length ? this.write(f) : "";
    return this.lastNeed ? h + "�" : h;
  }
  function p(f, h) {
    if ((f.length - h) % 2 === 0) {
      var g = f.toString("utf16le", h);
      if (g) {
        var A = g.charCodeAt(g.length - 1);
        if (A >= 55296 && A <= 56319)
          return this.lastNeed = 2, this.lastTotal = 4, this.lastChar[0] = f[f.length - 2], this.lastChar[1] = f[f.length - 1], g.slice(0, -1);
      }
      return g;
    }
    return this.lastNeed = 1, this.lastTotal = 2, this.lastChar[0] = f[f.length - 1], f.toString("utf16le", h, f.length - 1);
  }
  function d(f) {
    var h = f && f.length ? this.write(f) : "";
    if (this.lastNeed) {
      var g = this.lastTotal - this.lastNeed;
      return h + this.lastChar.toString("utf16le", 0, g);
    }
    return h;
  }
  function b(f, h) {
    var g = (f.length - h) % 3;
    return g === 0 ? f.toString("base64", h) : (this.lastNeed = 3 - g, this.lastTotal = 3, g === 1 ? this.lastChar[0] = f[f.length - 1] : (this.lastChar[0] = f[f.length - 2], this.lastChar[1] = f[f.length - 1]), f.toString("base64", h, f.length - g));
  }
  function x(f) {
    var h = f && f.length ? this.write(f) : "";
    return this.lastNeed ? h + this.lastChar.toString("base64", 0, 3 - this.lastNeed) : h;
  }
  function v(f) {
    return f.toString(this.encoding);
  }
  function y(f) {
    return f && f.length ? this.write(f) : "";
  }
  return hu;
}
var mu, lm;
function dv() {
  if (lm) return mu;
  lm = 1;
  var t = Kc();
  mu = h;
  var e = hO(), n;
  h.ReadableState = f, Ii.EventEmitter;
  var i = function(T, S) {
    return T.listeners(S).length;
  }, r = uv(), s = Yc().Buffer, a = (typeof We < "u" ? We : typeof window < "u" ? window : typeof self < "u" ? self : {}).Uint8Array || function() {
  };
  function o(T) {
    return s.from(T);
  }
  function c(T) {
    return s.isBuffer(T) || T instanceof a;
  }
  var l = Object.create(Fa());
  l.inherits = Ma();
  var u = xt, p = void 0;
  u && u.debuglog ? p = u.debuglog("stream") : p = function() {
  };
  var d = gO(), b = pv(), x;
  l.inherits(h, r);
  var v = ["error", "close", "destroy", "pause", "resume"];
  function y(T, S, W) {
    if (typeof T.prependListener == "function") return T.prependListener(S, W);
    !T._events || !T._events[S] ? T.on(S, W) : e(T._events[S]) ? T._events[S].unshift(W) : T._events[S] = [W, T._events[S]];
  }
  function f(T, S) {
    n = n || es(), T = T || {};
    var W = S instanceof n;
    this.objectMode = !!T.objectMode, W && (this.objectMode = this.objectMode || !!T.readableObjectMode);
    var J = T.highWaterMark, ge = T.readableHighWaterMark, oe = this.objectMode ? 16 : 16 * 1024;
    J || J === 0 ? this.highWaterMark = J : W && (ge || ge === 0) ? this.highWaterMark = ge : this.highWaterMark = oe, this.highWaterMark = Math.floor(this.highWaterMark), this.buffer = new d(), this.length = 0, this.pipes = null, this.pipesCount = 0, this.flowing = null, this.ended = !1, this.endEmitted = !1, this.reading = !1, this.sync = !0, this.needReadable = !1, this.emittedReadable = !1, this.readableListening = !1, this.resumeScheduled = !1, this.destroyed = !1, this.defaultEncoding = T.defaultEncoding || "utf8", this.awaitDrain = 0, this.readingMore = !1, this.decoder = null, this.encoding = null, T.encoding && (x || (x = cm().StringDecoder), this.decoder = new x(T.encoding), this.encoding = T.encoding);
  }
  function h(T) {
    if (n = n || es(), !(this instanceof h)) return new h(T);
    this._readableState = new f(T, this), this.readable = !0, T && (typeof T.read == "function" && (this._read = T.read), typeof T.destroy == "function" && (this._destroy = T.destroy)), r.call(this);
  }
  Object.defineProperty(h.prototype, "destroyed", {
    get: function() {
      return this._readableState === void 0 ? !1 : this._readableState.destroyed;
    },
    set: function(T) {
      this._readableState && (this._readableState.destroyed = T);
    }
  }), h.prototype.destroy = b.destroy, h.prototype._undestroy = b.undestroy, h.prototype._destroy = function(T, S) {
    this.push(null), S(T);
  }, h.prototype.push = function(T, S) {
    var W = this._readableState, J;
    return W.objectMode ? J = !0 : typeof T == "string" && (S = S || W.defaultEncoding, S !== W.encoding && (T = s.from(T, S), S = ""), J = !0), g(this, T, S, !1, J);
  }, h.prototype.unshift = function(T) {
    return g(this, T, null, !0, !1);
  };
  function g(T, S, W, J, ge) {
    var oe = T._readableState;
    if (S === null)
      oe.reading = !1, D(T, oe);
    else {
      var $;
      ge || ($ = C(oe, S)), $ ? T.emit("error", $) : oe.objectMode || S && S.length > 0 ? (typeof S != "string" && !oe.objectMode && Object.getPrototypeOf(S) !== s.prototype && (S = o(S)), J ? oe.endEmitted ? T.emit("error", new Error("stream.unshift() after end event")) : A(T, oe, S, !0) : oe.ended ? T.emit("error", new Error("stream.push() after EOF")) : (oe.reading = !1, oe.decoder && !W ? (S = oe.decoder.write(S), oe.objectMode || S.length !== 0 ? A(T, oe, S, !1) : U(T, oe)) : A(T, oe, S, !1))) : J || (oe.reading = !1);
    }
    return V(oe);
  }
  function A(T, S, W, J) {
    S.flowing && S.length === 0 && !S.sync ? (T.emit("data", W), T.read(0)) : (S.length += S.objectMode ? 1 : W.length, J ? S.buffer.unshift(W) : S.buffer.push(W), S.needReadable && B(T)), U(T, S);
  }
  function C(T, S) {
    var W;
    return !c(S) && typeof S != "string" && S !== void 0 && !T.objectMode && (W = new TypeError("Invalid non-string/buffer chunk")), W;
  }
  function V(T) {
    return !T.ended && (T.needReadable || T.length < T.highWaterMark || T.length === 0);
  }
  h.prototype.isPaused = function() {
    return this._readableState.flowing === !1;
  }, h.prototype.setEncoding = function(T) {
    return x || (x = cm().StringDecoder), this._readableState.decoder = new x(T), this._readableState.encoding = T, this;
  };
  var K = 8388608;
  function L(T) {
    return T >= K ? T = K : (T--, T |= T >>> 1, T |= T >>> 2, T |= T >>> 4, T |= T >>> 8, T |= T >>> 16, T++), T;
  }
  function X(T, S) {
    return T <= 0 || S.length === 0 && S.ended ? 0 : S.objectMode ? 1 : T !== T ? S.flowing && S.length ? S.buffer.head.data.length : S.length : (T > S.highWaterMark && (S.highWaterMark = L(T)), T <= S.length ? T : S.ended ? S.length : (S.needReadable = !0, 0));
  }
  h.prototype.read = function(T) {
    p("read", T), T = parseInt(T, 10);
    var S = this._readableState, W = T;
    if (T !== 0 && (S.emittedReadable = !1), T === 0 && S.needReadable && (S.length >= S.highWaterMark || S.ended))
      return p("read: emitReadable", S.length, S.ended), S.length === 0 && S.ended ? he(this) : B(this), null;
    if (T = X(T, S), T === 0 && S.ended)
      return S.length === 0 && he(this), null;
    var J = S.needReadable;
    p("need readable", J), (S.length === 0 || S.length - T < S.highWaterMark) && (J = !0, p("length less than watermark", J)), S.ended || S.reading ? (J = !1, p("reading or ended", J)) : J && (p("do read"), S.reading = !0, S.sync = !0, S.length === 0 && (S.needReadable = !0), this._read(S.highWaterMark), S.sync = !1, S.reading || (T = X(W, S)));
    var ge;
    return T > 0 ? ge = R(T, S) : ge = null, ge === null ? (S.needReadable = !0, T = 0) : S.length -= T, S.length === 0 && (S.ended || (S.needReadable = !0), W !== T && S.ended && he(this)), ge !== null && this.emit("data", ge), ge;
  };
  function D(T, S) {
    if (!S.ended) {
      if (S.decoder) {
        var W = S.decoder.end();
        W && W.length && (S.buffer.push(W), S.length += S.objectMode ? 1 : W.length);
      }
      S.ended = !0, B(T);
    }
  }
  function B(T) {
    var S = T._readableState;
    S.needReadable = !1, S.emittedReadable || (p("emitReadable", S.flowing), S.emittedReadable = !0, S.sync ? t.nextTick(Y, T) : Y(T));
  }
  function Y(T) {
    p("emit readable"), T.emit("readable"), H(T);
  }
  function U(T, S) {
    S.readingMore || (S.readingMore = !0, t.nextTick(ae, T, S));
  }
  function ae(T, S) {
    for (var W = S.length; !S.reading && !S.flowing && !S.ended && S.length < S.highWaterMark && (p("maybeReadMore read 0"), T.read(0), W !== S.length); )
      W = S.length;
    S.readingMore = !1;
  }
  h.prototype._read = function(T) {
    this.emit("error", new Error("_read() is not implemented"));
  }, h.prototype.pipe = function(T, S) {
    var W = this, J = this._readableState;
    switch (J.pipesCount) {
      case 0:
        J.pipes = T;
        break;
      case 1:
        J.pipes = [J.pipes, T];
        break;
      default:
        J.pipes.push(T);
        break;
    }
    J.pipesCount += 1, p("pipe count=%d opts=%j", J.pipesCount, S);
    var ge = (!S || S.end !== !1) && T !== process.stdout && T !== process.stderr, oe = ge ? j : de;
    J.endEmitted ? t.nextTick(oe) : W.once("end", oe), T.on("unpipe", $);
    function $(ve, me) {
      p("onunpipe"), ve === W && me && me.hasUnpiped === !1 && (me.hasUnpiped = !0, M());
    }
    function j() {
      p("onend"), T.end();
    }
    var E = le(W);
    T.on("drain", E);
    var I = !1;
    function M() {
      p("cleanup"), T.removeListener("close", ee), T.removeListener("finish", G), T.removeListener("drain", E), T.removeListener("error", q), T.removeListener("unpipe", $), W.removeListener("end", j), W.removeListener("end", de), W.removeListener("data", w), I = !0, J.awaitDrain && (!T._writableState || T._writableState.needDrain) && E();
    }
    var O = !1;
    W.on("data", w);
    function w(ve) {
      p("ondata"), O = !1;
      var me = T.write(ve);
      me === !1 && !O && ((J.pipesCount === 1 && J.pipes === T || J.pipesCount > 1 && ye(J.pipes, T) !== -1) && !I && (p("false write response, pause", J.awaitDrain), J.awaitDrain++, O = !0), W.pause());
    }
    function q(ve) {
      p("onerror", ve), de(), T.removeListener("error", q), i(T, "error") === 0 && T.emit("error", ve);
    }
    y(T, "error", q);
    function ee() {
      T.removeListener("finish", G), de();
    }
    T.once("close", ee);
    function G() {
      p("onfinish"), T.removeListener("close", ee), de();
    }
    T.once("finish", G);
    function de() {
      p("unpipe"), W.unpipe(T);
    }
    return T.emit("pipe", W), J.flowing || (p("pipe resume"), W.resume()), T;
  };
  function le(T) {
    return function() {
      var S = T._readableState;
      p("pipeOnDrain", S.awaitDrain), S.awaitDrain && S.awaitDrain--, S.awaitDrain === 0 && i(T, "data") && (S.flowing = !0, H(T));
    };
  }
  h.prototype.unpipe = function(T) {
    var S = this._readableState, W = { hasUnpiped: !1 };
    if (S.pipesCount === 0) return this;
    if (S.pipesCount === 1)
      return T && T !== S.pipes ? this : (T || (T = S.pipes), S.pipes = null, S.pipesCount = 0, S.flowing = !1, T && T.emit("unpipe", this, W), this);
    if (!T) {
      var J = S.pipes, ge = S.pipesCount;
      S.pipes = null, S.pipesCount = 0, S.flowing = !1;
      for (var oe = 0; oe < ge; oe++)
        J[oe].emit("unpipe", this, { hasUnpiped: !1 });
      return this;
    }
    var $ = ye(S.pipes, T);
    return $ === -1 ? this : (S.pipes.splice($, 1), S.pipesCount -= 1, S.pipesCount === 1 && (S.pipes = S.pipes[0]), T.emit("unpipe", this, W), this);
  }, h.prototype.on = function(T, S) {
    var W = r.prototype.on.call(this, T, S);
    if (T === "data")
      this._readableState.flowing !== !1 && this.resume();
    else if (T === "readable") {
      var J = this._readableState;
      !J.endEmitted && !J.readableListening && (J.readableListening = J.needReadable = !0, J.emittedReadable = !1, J.reading ? J.length && B(this) : t.nextTick(pe, this));
    }
    return W;
  }, h.prototype.addListener = h.prototype.on;
  function pe(T) {
    p("readable nexttick read 0"), T.read(0);
  }
  h.prototype.resume = function() {
    var T = this._readableState;
    return T.flowing || (p("resume"), T.flowing = !0, z(this, T)), this;
  };
  function z(T, S) {
    S.resumeScheduled || (S.resumeScheduled = !0, t.nextTick(k, T, S));
  }
  function k(T, S) {
    S.reading || (p("resume read 0"), T.read(0)), S.resumeScheduled = !1, S.awaitDrain = 0, T.emit("resume"), H(T), S.flowing && !S.reading && T.read(0);
  }
  h.prototype.pause = function() {
    return p("call pause flowing=%j", this._readableState.flowing), this._readableState.flowing !== !1 && (p("pause"), this._readableState.flowing = !1, this.emit("pause")), this;
  };
  function H(T) {
    var S = T._readableState;
    for (p("flow", S.flowing); S.flowing && T.read() !== null; )
      ;
  }
  h.prototype.wrap = function(T) {
    var S = this, W = this._readableState, J = !1;
    T.on("end", function() {
      if (p("wrapped end"), W.decoder && !W.ended) {
        var $ = W.decoder.end();
        $ && $.length && S.push($);
      }
      S.push(null);
    }), T.on("data", function($) {
      if (p("wrapped data"), W.decoder && ($ = W.decoder.write($)), !(W.objectMode && $ == null) && !(!W.objectMode && (!$ || !$.length))) {
        var j = S.push($);
        j || (J = !0, T.pause());
      }
    });
    for (var ge in T)
      this[ge] === void 0 && typeof T[ge] == "function" && (this[ge] = /* @__PURE__ */ function($) {
        return function() {
          return T[$].apply(T, arguments);
        };
      }(ge));
    for (var oe = 0; oe < v.length; oe++)
      T.on(v[oe], this.emit.bind(this, v[oe]));
    return this._read = function($) {
      p("wrapped _read", $), J && (J = !1, T.resume());
    }, this;
  }, Object.defineProperty(h.prototype, "readableHighWaterMark", {
    // making it explicit this property is not enumerable
    // because otherwise some prototype manipulation in
    // userland will fail
    enumerable: !1,
    get: function() {
      return this._readableState.highWaterMark;
    }
  }), h._fromList = R;
  function R(T, S) {
    if (S.length === 0) return null;
    var W;
    return S.objectMode ? W = S.buffer.shift() : !T || T >= S.length ? (S.decoder ? W = S.buffer.join("") : S.buffer.length === 1 ? W = S.buffer.head.data : W = S.buffer.concat(S.length), S.buffer.clear()) : W = Z(T, S.buffer, S.decoder), W;
  }
  function Z(T, S, W) {
    var J;
    return T < S.head.data.length ? (J = S.head.data.slice(0, T), S.head.data = S.head.data.slice(T)) : T === S.head.data.length ? J = S.shift() : J = W ? se(T, S) : te(T, S), J;
  }
  function se(T, S) {
    var W = S.head, J = 1, ge = W.data;
    for (T -= ge.length; W = W.next; ) {
      var oe = W.data, $ = T > oe.length ? oe.length : T;
      if ($ === oe.length ? ge += oe : ge += oe.slice(0, T), T -= $, T === 0) {
        $ === oe.length ? (++J, W.next ? S.head = W.next : S.head = S.tail = null) : (S.head = W, W.data = oe.slice($));
        break;
      }
      ++J;
    }
    return S.length -= J, ge;
  }
  function te(T, S) {
    var W = s.allocUnsafe(T), J = S.head, ge = 1;
    for (J.data.copy(W), T -= J.data.length; J = J.next; ) {
      var oe = J.data, $ = T > oe.length ? oe.length : T;
      if (oe.copy(W, W.length - T, 0, $), T -= $, T === 0) {
        $ === oe.length ? (++ge, J.next ? S.head = J.next : S.head = S.tail = null) : (S.head = J, J.data = oe.slice($));
        break;
      }
      ++ge;
    }
    return S.length -= ge, W;
  }
  function he(T) {
    var S = T._readableState;
    if (S.length > 0) throw new Error('"endReadable()" called on non-empty stream');
    S.endEmitted || (S.ended = !0, t.nextTick(Se, S, T));
  }
  function Se(T, S) {
    !T.endEmitted && T.length === 0 && (T.endEmitted = !0, S.readable = !1, S.emit("end"));
  }
  function ye(T, S) {
    for (var W = 0, J = T.length; W < J; W++)
      if (T[W] === S) return W;
    return -1;
  }
  return mu;
}
var gu, um;
function hv() {
  if (um) return gu;
  um = 1, gu = i;
  var t = es(), e = Object.create(Fa());
  e.inherits = Ma(), e.inherits(i, t);
  function n(a, o) {
    var c = this._transformState;
    c.transforming = !1;
    var l = c.writecb;
    if (!l)
      return this.emit("error", new Error("write callback called multiple times"));
    c.writechunk = null, c.writecb = null, o != null && this.push(o), l(a);
    var u = this._readableState;
    u.reading = !1, (u.needReadable || u.length < u.highWaterMark) && this._read(u.highWaterMark);
  }
  function i(a) {
    if (!(this instanceof i)) return new i(a);
    t.call(this, a), this._transformState = {
      afterTransform: n.bind(this),
      needTransform: !1,
      transforming: !1,
      writecb: null,
      writechunk: null,
      writeencoding: null
    }, this._readableState.needReadable = !0, this._readableState.sync = !1, a && (typeof a.transform == "function" && (this._transform = a.transform), typeof a.flush == "function" && (this._flush = a.flush)), this.on("prefinish", r);
  }
  function r() {
    var a = this;
    typeof this._flush == "function" ? this._flush(function(o, c) {
      s(a, o, c);
    }) : s(this, null, null);
  }
  i.prototype.push = function(a, o) {
    return this._transformState.needTransform = !1, t.prototype.push.call(this, a, o);
  }, i.prototype._transform = function(a, o, c) {
    throw new Error("_transform() is not implemented");
  }, i.prototype._write = function(a, o, c) {
    var l = this._transformState;
    if (l.writecb = c, l.writechunk = a, l.writeencoding = o, !l.transforming) {
      var u = this._readableState;
      (l.needTransform || u.needReadable || u.length < u.highWaterMark) && this._read(u.highWaterMark);
    }
  }, i.prototype._read = function(a) {
    var o = this._transformState;
    o.writechunk !== null && o.writecb && !o.transforming ? (o.transforming = !0, this._transform(o.writechunk, o.writeencoding, o.afterTransform)) : o.needTransform = !0;
  }, i.prototype._destroy = function(a, o) {
    var c = this;
    t.prototype._destroy.call(this, a, function(l) {
      o(l), c.emit("close");
    });
  };
  function s(a, o, c) {
    if (o) return a.emit("error", o);
    if (c != null && a.push(c), a._writableState.length) throw new Error("Calling transform done when ws.length != 0");
    if (a._transformState.transforming) throw new Error("Calling transform done when still transforming");
    return a.push(null);
  }
  return gu;
}
var bu, pm;
function yO() {
  if (pm) return bu;
  pm = 1, bu = n;
  var t = hv(), e = Object.create(Fa());
  e.inherits = Ma(), e.inherits(n, t);
  function n(i) {
    if (!(this instanceof n)) return new n(i);
    t.call(this, i);
  }
  return n.prototype._transform = function(i, r, s) {
    s(null, i);
  }, bu;
}
(function(t, e) {
  var n = nt;
  process.env.READABLE_STREAM === "disable" && n ? (t.exports = n, e = t.exports = n.Readable, e.Readable = n.Readable, e.Writable = n.Writable, e.Duplex = n.Duplex, e.Transform = n.Transform, e.PassThrough = n.PassThrough, e.Stream = n) : (e = t.exports = dv(), e.Stream = n || e, e.Readable = e, e.Writable = fv(), e.Duplex = es(), e.Transform = hv(), e.PassThrough = yO());
})(bp, bp.exports);
var vO = bp.exports, xO = vO.PassThrough, mv = xt, Zc = xO, wO = {
  Readable: wc
};
mv.inherits(wc, Zc);
mv.inherits(yp, Zc);
function gv(t, e, n) {
  t[e] = function() {
    return delete t[e], n.apply(this, arguments), this[e].apply(this, arguments);
  };
}
function wc(t, e) {
  if (!(this instanceof wc))
    return new wc(t, e);
  Zc.call(this, e), gv(this, "_read", function() {
    var n = t.call(this, e), i = this.emit.bind(this, "error");
    n.on("error", i), n.pipe(this);
  }), this.emit("readable");
}
function yp(t, e) {
  if (!(this instanceof yp))
    return new yp(t, e);
  Zc.call(this, e), gv(this, "_write", function() {
    var n = t.call(this, e), i = this.emit.bind(this, "error");
    n.on("error", i), this.pipe(n);
  }), this.emit("writable");
}
/*!
 * normalize-path <https://github.com/jonschlinkert/normalize-path>
 *
 * Copyright (c) 2014-2018, Jon Schlinkert.
 * Released under the MIT License.
 */
var bv = function(t, e) {
  if (typeof t != "string")
    throw new TypeError("expected path to be a string");
  if (t === "\\" || t === "/") return "/";
  var n = t.length;
  if (n <= 1) return t;
  var i = "";
  if (n > 4 && t[3] === "\\") {
    var r = t[2];
    (r === "?" || r === ".") && t.slice(0, 2) === "\\\\" && (t = t.slice(2), i = "//");
  }
  var s = t.split(/[/\\]+/);
  return e !== !1 && s[s.length - 1] === "" && s.pop(), i + s.join("/");
};
function _O(t) {
  return t;
}
var yv = _O;
function SO(t, e, n) {
  switch (n.length) {
    case 0:
      return t.call(e);
    case 1:
      return t.call(e, n[0]);
    case 2:
      return t.call(e, n[0], n[1]);
    case 3:
      return t.call(e, n[0], n[1], n[2]);
  }
  return t.apply(e, n);
}
var EO = SO, AO = EO, fm = Math.max;
function TO(t, e, n) {
  return e = fm(e === void 0 ? t.length - 1 : e, 0), function() {
    for (var i = arguments, r = -1, s = fm(i.length - e, 0), a = Array(s); ++r < s; )
      a[r] = i[e + r];
    r = -1;
    for (var o = Array(e + 1); ++r < e; )
      o[r] = i[r];
    return o[e] = n(a), AO(t, this, o);
  };
}
var RO = TO;
function OO(t) {
  return function() {
    return t;
  };
}
var PO = OO, CO = typeof We == "object" && We && We.Object === Object && We, vv = CO, kO = vv, IO = typeof self == "object" && self && self.Object === Object && self, DO = kO || IO || Function("return this")(), $a = DO, jO = $a, LO = jO.Symbol, Ff = LO, dm = Ff, xv = Object.prototype, NO = xv.hasOwnProperty, FO = xv.toString, Es = dm ? dm.toStringTag : void 0;
function MO(t) {
  var e = NO.call(t, Es), n = t[Es];
  try {
    t[Es] = void 0;
    var i = !0;
  } catch {
  }
  var r = FO.call(t);
  return i && (e ? t[Es] = n : delete t[Es]), r;
}
var $O = MO, BO = Object.prototype, UO = BO.toString;
function zO(t) {
  return UO.call(t);
}
var WO = zO, hm = Ff, qO = $O, GO = WO, HO = "[object Null]", VO = "[object Undefined]", mm = hm ? hm.toStringTag : void 0;
function KO(t) {
  return t == null ? t === void 0 ? VO : HO : mm && mm in Object(t) ? qO(t) : GO(t);
}
var Xc = KO;
function YO(t) {
  var e = typeof t;
  return t != null && (e == "object" || e == "function");
}
var Jc = YO, ZO = Xc, XO = Jc, JO = "[object AsyncFunction]", QO = "[object Function]", eP = "[object GeneratorFunction]", tP = "[object Proxy]";
function nP(t) {
  if (!XO(t))
    return !1;
  var e = ZO(t);
  return e == QO || e == eP || e == JO || e == tP;
}
var wv = nP, iP = $a, rP = iP["__core-js_shared__"], sP = rP, yu = sP, gm = function() {
  var t = /[^.]+$/.exec(yu && yu.keys && yu.keys.IE_PROTO || "");
  return t ? "Symbol(src)_1." + t : "";
}();
function aP(t) {
  return !!gm && gm in t;
}
var oP = aP, cP = Function.prototype, lP = cP.toString;
function uP(t) {
  if (t != null) {
    try {
      return lP.call(t);
    } catch {
    }
    try {
      return t + "";
    } catch {
    }
  }
  return "";
}
var pP = uP, fP = wv, dP = oP, hP = Jc, mP = pP, gP = /[\\^$.*+?()[\]{}|]/g, bP = /^\[object .+?Constructor\]$/, yP = Function.prototype, vP = Object.prototype, xP = yP.toString, wP = vP.hasOwnProperty, _P = RegExp(
  "^" + xP.call(wP).replace(gP, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
);
function SP(t) {
  if (!hP(t) || dP(t))
    return !1;
  var e = fP(t) ? _P : bP;
  return e.test(mP(t));
}
var EP = SP;
function AP(t, e) {
  return t == null ? void 0 : t[e];
}
var TP = AP, RP = EP, OP = TP;
function PP(t, e) {
  var n = OP(t, e);
  return RP(n) ? n : void 0;
}
var Qc = PP, CP = Qc, kP = function() {
  try {
    var t = CP(Object, "defineProperty");
    return t({}, "", {}), t;
  } catch {
  }
}(), IP = kP, DP = PO, bm = IP, jP = yv, LP = bm ? function(t, e) {
  return bm(t, "toString", {
    configurable: !0,
    enumerable: !1,
    value: DP(e),
    writable: !0
  });
} : jP, NP = LP, FP = 800, MP = 16, $P = Date.now;
function BP(t) {
  var e = 0, n = 0;
  return function() {
    var i = $P(), r = MP - (i - n);
    if (n = i, r > 0) {
      if (++e >= FP)
        return arguments[0];
    } else
      e = 0;
    return t.apply(void 0, arguments);
  };
}
var UP = BP, zP = NP, WP = UP, qP = WP(zP), GP = qP, HP = yv, VP = RO, KP = GP;
function YP(t, e) {
  return KP(VP(t, e, HP), t + "");
}
var Mf = YP;
function ZP(t, e) {
  return t === e || t !== t && e !== e;
}
var $f = ZP, XP = 9007199254740991;
function JP(t) {
  return typeof t == "number" && t > -1 && t % 1 == 0 && t <= XP;
}
var _v = JP, QP = wv, eC = _v;
function tC(t) {
  return t != null && eC(t.length) && !QP(t);
}
var Bf = tC, nC = 9007199254740991, iC = /^(?:0|[1-9]\d*)$/;
function rC(t, e) {
  var n = typeof t;
  return e = e ?? nC, !!e && (n == "number" || n != "symbol" && iC.test(t)) && t > -1 && t % 1 == 0 && t < e;
}
var Sv = rC, sC = $f, aC = Bf, oC = Sv, cC = Jc;
function lC(t, e, n) {
  if (!cC(n))
    return !1;
  var i = typeof e;
  return (i == "number" ? aC(n) && oC(e, n.length) : i == "string" && e in n) ? sC(n[e], t) : !1;
}
var uC = lC;
function pC(t, e) {
  for (var n = -1, i = Array(t); ++n < t; )
    i[n] = e(n);
  return i;
}
var fC = pC;
function dC(t) {
  return t != null && typeof t == "object";
}
var Ba = dC, hC = Xc, mC = Ba, gC = "[object Arguments]";
function bC(t) {
  return mC(t) && hC(t) == gC;
}
var yC = bC, ym = yC, vC = Ba, Ev = Object.prototype, xC = Ev.hasOwnProperty, wC = Ev.propertyIsEnumerable, _C = ym(/* @__PURE__ */ function() {
  return arguments;
}()) ? ym : function(t) {
  return vC(t) && xC.call(t, "callee") && !wC.call(t, "callee");
}, Av = _C, SC = Array.isArray, Tv = SC, _c = { exports: {} };
function EC() {
  return !1;
}
var AC = EC;
_c.exports;
(function(t, e) {
  var n = $a, i = AC, r = e && !e.nodeType && e, s = r && !0 && t && !t.nodeType && t, a = s && s.exports === r, o = a ? n.Buffer : void 0, c = o ? o.isBuffer : void 0, l = c || i;
  t.exports = l;
})(_c, _c.exports);
var TC = _c.exports, RC = Xc, OC = _v, PC = Ba, CC = "[object Arguments]", kC = "[object Array]", IC = "[object Boolean]", DC = "[object Date]", jC = "[object Error]", LC = "[object Function]", NC = "[object Map]", FC = "[object Number]", MC = "[object Object]", $C = "[object RegExp]", BC = "[object Set]", UC = "[object String]", zC = "[object WeakMap]", WC = "[object ArrayBuffer]", qC = "[object DataView]", GC = "[object Float32Array]", HC = "[object Float64Array]", VC = "[object Int8Array]", KC = "[object Int16Array]", YC = "[object Int32Array]", ZC = "[object Uint8Array]", XC = "[object Uint8ClampedArray]", JC = "[object Uint16Array]", QC = "[object Uint32Array]", Je = {};
Je[GC] = Je[HC] = Je[VC] = Je[KC] = Je[YC] = Je[ZC] = Je[XC] = Je[JC] = Je[QC] = !0;
Je[CC] = Je[kC] = Je[WC] = Je[IC] = Je[qC] = Je[DC] = Je[jC] = Je[LC] = Je[NC] = Je[FC] = Je[MC] = Je[$C] = Je[BC] = Je[UC] = Je[zC] = !1;
function ek(t) {
  return PC(t) && OC(t.length) && !!Je[RC(t)];
}
var tk = ek;
function nk(t) {
  return function(e) {
    return t(e);
  };
}
var Rv = nk, Sc = { exports: {} };
Sc.exports;
(function(t, e) {
  var n = vv, i = e && !e.nodeType && e, r = i && !0 && t && !t.nodeType && t, s = r && r.exports === i, a = s && n.process, o = function() {
    try {
      var c = r && r.require && r.require("util").types;
      return c || a && a.binding && a.binding("util");
    } catch {
    }
  }();
  t.exports = o;
})(Sc, Sc.exports);
var ik = Sc.exports, rk = tk, sk = Rv, vm = ik, xm = vm && vm.isTypedArray, ak = xm ? sk(xm) : rk, ok = ak, ck = fC, lk = Av, uk = Tv, pk = TC, fk = Sv, dk = ok, hk = Object.prototype, mk = hk.hasOwnProperty;
function gk(t, e) {
  var n = uk(t), i = !n && lk(t), r = !n && !i && pk(t), s = !n && !i && !r && dk(t), a = n || i || r || s, o = a ? ck(t.length, String) : [], c = o.length;
  for (var l in t)
    (e || mk.call(t, l)) && !(a && // Safari 9 has enumerable `arguments.length` in strict mode.
    (l == "length" || // Node.js 0.10 has enumerable non-index properties on buffers.
    r && (l == "offset" || l == "parent") || // PhantomJS 2 has enumerable non-index properties on typed arrays.
    s && (l == "buffer" || l == "byteLength" || l == "byteOffset") || // Skip index properties.
    fk(l, c))) && o.push(l);
  return o;
}
var bk = gk, yk = Object.prototype;
function vk(t) {
  var e = t && t.constructor, n = typeof e == "function" && e.prototype || yk;
  return t === n;
}
var xk = vk;
function wk(t) {
  var e = [];
  if (t != null)
    for (var n in Object(t))
      e.push(n);
  return e;
}
var _k = wk, Sk = Jc, Ek = xk, Ak = _k, Tk = Object.prototype, Rk = Tk.hasOwnProperty;
function Ok(t) {
  if (!Sk(t))
    return Ak(t);
  var e = Ek(t), n = [];
  for (var i in t)
    i == "constructor" && (e || !Rk.call(t, i)) || n.push(i);
  return n;
}
var Pk = Ok, Ck = bk, kk = Pk, Ik = Bf;
function Dk(t) {
  return Ik(t) ? Ck(t, !0) : kk(t);
}
var jk = Dk, Lk = Mf, Nk = $f, Fk = uC, Mk = jk, Ov = Object.prototype, $k = Ov.hasOwnProperty, Bk = Lk(function(t, e) {
  t = Object(t);
  var n = -1, i = e.length, r = i > 2 ? e[2] : void 0;
  for (r && Fk(e[0], e[1], r) && (i = 1); ++n < i; )
    for (var s = e[n], a = Mk(s), o = -1, c = a.length; ++o < c; ) {
      var l = a[o], u = t[l];
      (u === void 0 || Nk(u, Ov[l]) && !$k.call(t, l)) && (t[l] = s[l]);
    }
  return t;
}), Uk = Bk, Uf = { exports: {} }, vu = { exports: {} }, xu, wm;
function st() {
  if (wm) return xu;
  wm = 1;
  class t extends Error {
    constructor(n) {
      if (!Array.isArray(n))
        throw new TypeError(`Expected input to be an Array, got ${typeof n}`);
      let i = "";
      for (let r = 0; r < n.length; r++)
        i += `    ${n[r].stack}
`;
      super(i), this.name = "AggregateError", this.errors = n;
    }
  }
  return xu = {
    AggregateError: t,
    ArrayIsArray(e) {
      return Array.isArray(e);
    },
    ArrayPrototypeIncludes(e, n) {
      return e.includes(n);
    },
    ArrayPrototypeIndexOf(e, n) {
      return e.indexOf(n);
    },
    ArrayPrototypeJoin(e, n) {
      return e.join(n);
    },
    ArrayPrototypeMap(e, n) {
      return e.map(n);
    },
    ArrayPrototypePop(e, n) {
      return e.pop(n);
    },
    ArrayPrototypePush(e, n) {
      return e.push(n);
    },
    ArrayPrototypeSlice(e, n, i) {
      return e.slice(n, i);
    },
    Error,
    FunctionPrototypeCall(e, n, ...i) {
      return e.call(n, ...i);
    },
    FunctionPrototypeSymbolHasInstance(e, n) {
      return Function.prototype[Symbol.hasInstance].call(e, n);
    },
    MathFloor: Math.floor,
    Number,
    NumberIsInteger: Number.isInteger,
    NumberIsNaN: Number.isNaN,
    NumberMAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
    NumberMIN_SAFE_INTEGER: Number.MIN_SAFE_INTEGER,
    NumberParseInt: Number.parseInt,
    ObjectDefineProperties(e, n) {
      return Object.defineProperties(e, n);
    },
    ObjectDefineProperty(e, n, i) {
      return Object.defineProperty(e, n, i);
    },
    ObjectGetOwnPropertyDescriptor(e, n) {
      return Object.getOwnPropertyDescriptor(e, n);
    },
    ObjectKeys(e) {
      return Object.keys(e);
    },
    ObjectSetPrototypeOf(e, n) {
      return Object.setPrototypeOf(e, n);
    },
    Promise,
    PromisePrototypeCatch(e, n) {
      return e.catch(n);
    },
    PromisePrototypeThen(e, n, i) {
      return e.then(n, i);
    },
    PromiseReject(e) {
      return Promise.reject(e);
    },
    PromiseResolve(e) {
      return Promise.resolve(e);
    },
    ReflectApply: Reflect.apply,
    RegExpPrototypeTest(e, n) {
      return e.test(n);
    },
    SafeSet: Set,
    String,
    StringPrototypeSlice(e, n, i) {
      return e.slice(n, i);
    },
    StringPrototypeToLowerCase(e) {
      return e.toLowerCase();
    },
    StringPrototypeToUpperCase(e) {
      return e.toUpperCase();
    },
    StringPrototypeTrim(e) {
      return e.trim();
    },
    Symbol,
    SymbolFor: Symbol.for,
    SymbolAsyncIterator: Symbol.asyncIterator,
    SymbolHasInstance: Symbol.hasInstance,
    SymbolIterator: Symbol.iterator,
    SymbolDispose: Symbol.dispose || Symbol("Symbol.dispose"),
    SymbolAsyncDispose: Symbol.asyncDispose || Symbol("Symbol.asyncDispose"),
    TypedArrayPrototypeSet(e, n, i) {
      return e.set(n, i);
    },
    Boolean,
    Uint8Array
  }, xu;
}
var wu = { exports: {} }, _u, _m;
function Pv() {
  return _m || (_m = 1, _u = {
    format(t, ...e) {
      return t.replace(/%([sdifj])/g, function(...[n, i]) {
        const r = e.shift();
        return i === "f" ? r.toFixed(6) : i === "j" ? JSON.stringify(r) : i === "s" && typeof r == "object" ? `${r.constructor !== Object ? r.constructor.name : ""} {}`.trim() : r.toString();
      });
    },
    inspect(t) {
      switch (typeof t) {
        case "string":
          if (t.includes("'"))
            if (t.includes('"')) {
              if (!t.includes("`") && !t.includes("${"))
                return `\`${t}\``;
            } else return `"${t}"`;
          return `'${t}'`;
        case "number":
          return isNaN(t) ? "NaN" : Object.is(t, -0) ? String(t) : t;
        case "bigint":
          return `${String(t)}n`;
        case "boolean":
        case "undefined":
          return String(t);
        case "object":
          return "{}";
      }
    }
  }), _u;
}
var Su, Sm;
function Wt() {
  if (Sm) return Su;
  Sm = 1;
  const { format: t, inspect: e } = Pv(), { AggregateError: n } = st(), i = globalThis.AggregateError || n, r = Symbol("kIsNodeError"), s = [
    "string",
    "function",
    "number",
    "object",
    // Accept 'Function' and 'Object' as alternative to the lower cased version.
    "Function",
    "Object",
    "boolean",
    "bigint",
    "symbol"
  ], a = /^([A-Z][a-z0-9]*)+$/, o = "__node_internal_", c = {};
  function l(y, f) {
    if (!y)
      throw new c.ERR_INTERNAL_ASSERTION(f);
  }
  function u(y) {
    let f = "", h = y.length;
    const g = y[0] === "-" ? 1 : 0;
    for (; h >= g + 4; h -= 3)
      f = `_${y.slice(h - 3, h)}${f}`;
    return `${y.slice(0, h)}${f}`;
  }
  function p(y, f, h) {
    if (typeof f == "function")
      return l(
        f.length <= h.length,
        // Default options do not count.
        `Code: ${y}; The provided arguments length (${h.length}) does not match the required ones (${f.length}).`
      ), f(...h);
    const g = (f.match(/%[dfijoOs]/g) || []).length;
    return l(
      g === h.length,
      `Code: ${y}; The provided arguments length (${h.length}) does not match the required ones (${g}).`
    ), h.length === 0 ? f : t(f, ...h);
  }
  function d(y, f, h) {
    h || (h = Error);
    class g extends h {
      constructor(...C) {
        super(p(y, f, C));
      }
      toString() {
        return `${this.name} [${y}]: ${this.message}`;
      }
    }
    Object.defineProperties(g.prototype, {
      name: {
        value: h.name,
        writable: !0,
        enumerable: !1,
        configurable: !0
      },
      toString: {
        value() {
          return `${this.name} [${y}]: ${this.message}`;
        },
        writable: !0,
        enumerable: !1,
        configurable: !0
      }
    }), g.prototype.code = y, g.prototype[r] = !0, c[y] = g;
  }
  function b(y) {
    const f = o + y.name;
    return Object.defineProperty(y, "name", {
      value: f
    }), y;
  }
  function x(y, f) {
    if (y && f && y !== f) {
      if (Array.isArray(f.errors))
        return f.errors.push(y), f;
      const h = new i([f, y], f.message);
      return h.code = f.code, h;
    }
    return y || f;
  }
  class v extends Error {
    constructor(f = "The operation was aborted", h = void 0) {
      if (h !== void 0 && typeof h != "object")
        throw new c.ERR_INVALID_ARG_TYPE("options", "Object", h);
      super(f, h), this.code = "ABORT_ERR", this.name = "AbortError";
    }
  }
  return d("ERR_ASSERTION", "%s", Error), d(
    "ERR_INVALID_ARG_TYPE",
    (y, f, h) => {
      l(typeof y == "string", "'name' must be a string"), Array.isArray(f) || (f = [f]);
      let g = "The ";
      y.endsWith(" argument") ? g += `${y} ` : g += `"${y}" ${y.includes(".") ? "property" : "argument"} `, g += "must be ";
      const A = [], C = [], V = [];
      for (const L of f)
        l(typeof L == "string", "All expected entries have to be of type string"), s.includes(L) ? A.push(L.toLowerCase()) : a.test(L) ? C.push(L) : (l(L !== "object", 'The value "object" should be written as "Object"'), V.push(L));
      if (C.length > 0) {
        const L = A.indexOf("object");
        L !== -1 && (A.splice(A, L, 1), C.push("Object"));
      }
      if (A.length > 0) {
        switch (A.length) {
          case 1:
            g += `of type ${A[0]}`;
            break;
          case 2:
            g += `one of type ${A[0]} or ${A[1]}`;
            break;
          default: {
            const L = A.pop();
            g += `one of type ${A.join(", ")}, or ${L}`;
          }
        }
        (C.length > 0 || V.length > 0) && (g += " or ");
      }
      if (C.length > 0) {
        switch (C.length) {
          case 1:
            g += `an instance of ${C[0]}`;
            break;
          case 2:
            g += `an instance of ${C[0]} or ${C[1]}`;
            break;
          default: {
            const L = C.pop();
            g += `an instance of ${C.join(", ")}, or ${L}`;
          }
        }
        V.length > 0 && (g += " or ");
      }
      switch (V.length) {
        case 0:
          break;
        case 1:
          V[0].toLowerCase() !== V[0] && (g += "an "), g += `${V[0]}`;
          break;
        case 2:
          g += `one of ${V[0]} or ${V[1]}`;
          break;
        default: {
          const L = V.pop();
          g += `one of ${V.join(", ")}, or ${L}`;
        }
      }
      if (h == null)
        g += `. Received ${h}`;
      else if (typeof h == "function" && h.name)
        g += `. Received function ${h.name}`;
      else if (typeof h == "object") {
        var K;
        if ((K = h.constructor) !== null && K !== void 0 && K.name)
          g += `. Received an instance of ${h.constructor.name}`;
        else {
          const L = e(h, {
            depth: -1
          });
          g += `. Received ${L}`;
        }
      } else {
        let L = e(h, {
          colors: !1
        });
        L.length > 25 && (L = `${L.slice(0, 25)}...`), g += `. Received type ${typeof h} (${L})`;
      }
      return g;
    },
    TypeError
  ), d(
    "ERR_INVALID_ARG_VALUE",
    (y, f, h = "is invalid") => {
      let g = e(f);
      return g.length > 128 && (g = g.slice(0, 128) + "..."), `The ${y.includes(".") ? "property" : "argument"} '${y}' ${h}. Received ${g}`;
    },
    TypeError
  ), d(
    "ERR_INVALID_RETURN_VALUE",
    (y, f, h) => {
      var g;
      const A = h != null && (g = h.constructor) !== null && g !== void 0 && g.name ? `instance of ${h.constructor.name}` : `type ${typeof h}`;
      return `Expected ${y} to be returned from the "${f}" function but got ${A}.`;
    },
    TypeError
  ), d(
    "ERR_MISSING_ARGS",
    (...y) => {
      l(y.length > 0, "At least one arg needs to be specified");
      let f;
      const h = y.length;
      switch (y = (Array.isArray(y) ? y : [y]).map((g) => `"${g}"`).join(" or "), h) {
        case 1:
          f += `The ${y[0]} argument`;
          break;
        case 2:
          f += `The ${y[0]} and ${y[1]} arguments`;
          break;
        default:
          {
            const g = y.pop();
            f += `The ${y.join(", ")}, and ${g} arguments`;
          }
          break;
      }
      return `${f} must be specified`;
    },
    TypeError
  ), d(
    "ERR_OUT_OF_RANGE",
    (y, f, h) => {
      l(f, 'Missing "range" argument');
      let g;
      if (Number.isInteger(h) && Math.abs(h) > 2 ** 32)
        g = u(String(h));
      else if (typeof h == "bigint") {
        g = String(h);
        const A = BigInt(2) ** BigInt(32);
        (h > A || h < -A) && (g = u(g)), g += "n";
      } else
        g = e(h);
      return `The value of "${y}" is out of range. It must be ${f}. Received ${g}`;
    },
    RangeError
  ), d("ERR_MULTIPLE_CALLBACK", "Callback called multiple times", Error), d("ERR_METHOD_NOT_IMPLEMENTED", "The %s method is not implemented", Error), d("ERR_STREAM_ALREADY_FINISHED", "Cannot call %s after a stream was finished", Error), d("ERR_STREAM_CANNOT_PIPE", "Cannot pipe, not readable", Error), d("ERR_STREAM_DESTROYED", "Cannot call %s after a stream was destroyed", Error), d("ERR_STREAM_NULL_VALUES", "May not write null values to stream", TypeError), d("ERR_STREAM_PREMATURE_CLOSE", "Premature close", Error), d("ERR_STREAM_PUSH_AFTER_EOF", "stream.push() after EOF", Error), d("ERR_STREAM_UNSHIFT_AFTER_END_EVENT", "stream.unshift() after end event", Error), d("ERR_STREAM_WRITE_AFTER_END", "write after end", Error), d("ERR_UNKNOWN_ENCODING", "Unknown encoding: %s", TypeError), Su = {
    AbortError: v,
    aggregateTwoErrors: b(x),
    hideStackFrames: b,
    codes: c
  }, Su;
}
const Cv = /* @__PURE__ */ new WeakMap(), vp = /* @__PURE__ */ new WeakMap();
function Xe(t) {
  const e = Cv.get(t);
  return console.assert(
    e != null,
    "'this' is expected an Event object, but got",
    t
  ), e;
}
function Em(t) {
  if (t.passiveListener != null) {
    typeof console < "u" && typeof console.error == "function" && console.error(
      "Unable to preventDefault inside passive event listener invocation.",
      t.passiveListener
    );
    return;
  }
  t.event.cancelable && (t.canceled = !0, typeof t.event.preventDefault == "function" && t.event.preventDefault());
}
function ts(t, e) {
  Cv.set(this, {
    eventTarget: t,
    event: e,
    eventPhase: 2,
    currentTarget: t,
    canceled: !1,
    stopped: !1,
    immediateStopped: !1,
    passiveListener: null,
    timeStamp: e.timeStamp || Date.now()
  }), Object.defineProperty(this, "isTrusted", { value: !1, enumerable: !0 });
  const n = Object.keys(e);
  for (let i = 0; i < n.length; ++i) {
    const r = n[i];
    r in this || Object.defineProperty(this, r, kv(r));
  }
}
ts.prototype = {
  /**
   * The type of this event.
   * @type {string}
   */
  get type() {
    return Xe(this).event.type;
  },
  /**
   * The target of this event.
   * @type {EventTarget}
   */
  get target() {
    return Xe(this).eventTarget;
  },
  /**
   * The target of this event.
   * @type {EventTarget}
   */
  get currentTarget() {
    return Xe(this).currentTarget;
  },
  /**
   * @returns {EventTarget[]} The composed path of this event.
   */
  composedPath() {
    const t = Xe(this).currentTarget;
    return t == null ? [] : [t];
  },
  /**
   * Constant of NONE.
   * @type {number}
   */
  get NONE() {
    return 0;
  },
  /**
   * Constant of CAPTURING_PHASE.
   * @type {number}
   */
  get CAPTURING_PHASE() {
    return 1;
  },
  /**
   * Constant of AT_TARGET.
   * @type {number}
   */
  get AT_TARGET() {
    return 2;
  },
  /**
   * Constant of BUBBLING_PHASE.
   * @type {number}
   */
  get BUBBLING_PHASE() {
    return 3;
  },
  /**
   * The target of this event.
   * @type {number}
   */
  get eventPhase() {
    return Xe(this).eventPhase;
  },
  /**
   * Stop event bubbling.
   * @returns {void}
   */
  stopPropagation() {
    const t = Xe(this);
    t.stopped = !0, typeof t.event.stopPropagation == "function" && t.event.stopPropagation();
  },
  /**
   * Stop event bubbling.
   * @returns {void}
   */
  stopImmediatePropagation() {
    const t = Xe(this);
    t.stopped = !0, t.immediateStopped = !0, typeof t.event.stopImmediatePropagation == "function" && t.event.stopImmediatePropagation();
  },
  /**
   * The flag to be bubbling.
   * @type {boolean}
   */
  get bubbles() {
    return !!Xe(this).event.bubbles;
  },
  /**
   * The flag to be cancelable.
   * @type {boolean}
   */
  get cancelable() {
    return !!Xe(this).event.cancelable;
  },
  /**
   * Cancel this event.
   * @returns {void}
   */
  preventDefault() {
    Em(Xe(this));
  },
  /**
   * The flag to indicate cancellation state.
   * @type {boolean}
   */
  get defaultPrevented() {
    return Xe(this).canceled;
  },
  /**
   * The flag to be composed.
   * @type {boolean}
   */
  get composed() {
    return !!Xe(this).event.composed;
  },
  /**
   * The unix time of this event.
   * @type {number}
   */
  get timeStamp() {
    return Xe(this).timeStamp;
  },
  /**
   * The target of this event.
   * @type {EventTarget}
   * @deprecated
   */
  get srcElement() {
    return Xe(this).eventTarget;
  },
  /**
   * The flag to stop event bubbling.
   * @type {boolean}
   * @deprecated
   */
  get cancelBubble() {
    return Xe(this).stopped;
  },
  set cancelBubble(t) {
    if (!t)
      return;
    const e = Xe(this);
    e.stopped = !0, typeof e.event.cancelBubble == "boolean" && (e.event.cancelBubble = !0);
  },
  /**
   * The flag to indicate cancellation state.
   * @type {boolean}
   * @deprecated
   */
  get returnValue() {
    return !Xe(this).canceled;
  },
  set returnValue(t) {
    t || Em(Xe(this));
  },
  /**
   * Initialize this event object. But do nothing under event dispatching.
   * @param {string} type The event type.
   * @param {boolean} [bubbles=false] The flag to be possible to bubble up.
   * @param {boolean} [cancelable=false] The flag to be possible to cancel.
   * @deprecated
   */
  initEvent() {
  }
};
Object.defineProperty(ts.prototype, "constructor", {
  value: ts,
  configurable: !0,
  writable: !0
});
typeof window < "u" && typeof window.Event < "u" && (Object.setPrototypeOf(ts.prototype, window.Event.prototype), vp.set(window.Event.prototype, ts));
function kv(t) {
  return {
    get() {
      return Xe(this).event[t];
    },
    set(e) {
      Xe(this).event[t] = e;
    },
    configurable: !0,
    enumerable: !0
  };
}
function zk(t) {
  return {
    value() {
      const e = Xe(this).event;
      return e[t].apply(e, arguments);
    },
    configurable: !0,
    enumerable: !0
  };
}
function Wk(t, e) {
  const n = Object.keys(e);
  if (n.length === 0)
    return t;
  function i(r, s) {
    t.call(this, r, s);
  }
  i.prototype = Object.create(t.prototype, {
    constructor: { value: i, configurable: !0, writable: !0 }
  });
  for (let r = 0; r < n.length; ++r) {
    const s = n[r];
    if (!(s in t.prototype)) {
      const o = typeof Object.getOwnPropertyDescriptor(e, s).value == "function";
      Object.defineProperty(
        i.prototype,
        s,
        o ? zk(s) : kv(s)
      );
    }
  }
  return i;
}
function Iv(t) {
  if (t == null || t === Object.prototype)
    return ts;
  let e = vp.get(t);
  return e == null && (e = Wk(Iv(Object.getPrototypeOf(t)), t), vp.set(t, e)), e;
}
function qk(t, e) {
  const n = Iv(Object.getPrototypeOf(e));
  return new n(t, e);
}
function Gk(t) {
  return Xe(t).immediateStopped;
}
function Hk(t, e) {
  Xe(t).eventPhase = e;
}
function Vk(t, e) {
  Xe(t).currentTarget = e;
}
function Am(t, e) {
  Xe(t).passiveListener = e;
}
const Dv = /* @__PURE__ */ new WeakMap(), Tm = 1, Rm = 2, Lo = 3;
function No(t) {
  return t !== null && typeof t == "object";
}
function Fs(t) {
  const e = Dv.get(t);
  if (e == null)
    throw new TypeError(
      "'this' is expected an EventTarget object, but got another value."
    );
  return e;
}
function Kk(t) {
  return {
    get() {
      let n = Fs(this).get(t);
      for (; n != null; ) {
        if (n.listenerType === Lo)
          return n.listener;
        n = n.next;
      }
      return null;
    },
    set(e) {
      typeof e != "function" && !No(e) && (e = null);
      const n = Fs(this);
      let i = null, r = n.get(t);
      for (; r != null; )
        r.listenerType === Lo ? i !== null ? i.next = r.next : r.next !== null ? n.set(t, r.next) : n.delete(t) : i = r, r = r.next;
      if (e !== null) {
        const s = {
          listener: e,
          listenerType: Lo,
          passive: !1,
          once: !1,
          next: null
        };
        i === null ? n.set(t, s) : i.next = s;
      }
    },
    configurable: !0,
    enumerable: !0
  };
}
function jv(t, e) {
  Object.defineProperty(
    t,
    `on${e}`,
    Kk(e)
  );
}
function Om(t) {
  function e() {
    Xn.call(this);
  }
  e.prototype = Object.create(Xn.prototype, {
    constructor: {
      value: e,
      configurable: !0,
      writable: !0
    }
  });
  for (let n = 0; n < t.length; ++n)
    jv(e.prototype, t[n]);
  return e;
}
function Xn() {
  if (this instanceof Xn) {
    Dv.set(this, /* @__PURE__ */ new Map());
    return;
  }
  if (arguments.length === 1 && Array.isArray(arguments[0]))
    return Om(arguments[0]);
  if (arguments.length > 0) {
    const t = new Array(arguments.length);
    for (let e = 0; e < arguments.length; ++e)
      t[e] = arguments[e];
    return Om(t);
  }
  throw new TypeError("Cannot call a class as a function");
}
Xn.prototype = {
  /**
   * Add a given listener to this event target.
   * @param {string} eventName The event name to add.
   * @param {Function} listener The listener to add.
   * @param {boolean|{capture?:boolean,passive?:boolean,once?:boolean}} [options] The options for this listener.
   * @returns {void}
   */
  addEventListener(t, e, n) {
    if (e == null)
      return;
    if (typeof e != "function" && !No(e))
      throw new TypeError("'listener' should be a function or an object.");
    const i = Fs(this), r = No(n), a = (r ? !!n.capture : !!n) ? Tm : Rm, o = {
      listener: e,
      listenerType: a,
      passive: r && !!n.passive,
      once: r && !!n.once,
      next: null
    };
    let c = i.get(t);
    if (c === void 0) {
      i.set(t, o);
      return;
    }
    let l = null;
    for (; c != null; ) {
      if (c.listener === e && c.listenerType === a)
        return;
      l = c, c = c.next;
    }
    l.next = o;
  },
  /**
   * Remove a given listener from this event target.
   * @param {string} eventName The event name to remove.
   * @param {Function} listener The listener to remove.
   * @param {boolean|{capture?:boolean,passive?:boolean,once?:boolean}} [options] The options for this listener.
   * @returns {void}
   */
  removeEventListener(t, e, n) {
    if (e == null)
      return;
    const i = Fs(this), s = (No(n) ? !!n.capture : !!n) ? Tm : Rm;
    let a = null, o = i.get(t);
    for (; o != null; ) {
      if (o.listener === e && o.listenerType === s) {
        a !== null ? a.next = o.next : o.next !== null ? i.set(t, o.next) : i.delete(t);
        return;
      }
      a = o, o = o.next;
    }
  },
  /**
   * Dispatch a given event.
   * @param {Event|{type:string}} event The event to dispatch.
   * @returns {boolean} `false` if canceled.
   */
  dispatchEvent(t) {
    if (t == null || typeof t.type != "string")
      throw new TypeError('"event.type" should be a string.');
    const e = Fs(this), n = t.type;
    let i = e.get(n);
    if (i == null)
      return !0;
    const r = qk(this, t);
    let s = null;
    for (; i != null; ) {
      if (i.once ? s !== null ? s.next = i.next : i.next !== null ? e.set(n, i.next) : e.delete(n) : s = i, Am(
        r,
        i.passive ? i.listener : null
      ), typeof i.listener == "function")
        try {
          i.listener.call(this, r);
        } catch (a) {
          typeof console < "u" && typeof console.error == "function" && console.error(a);
        }
      else i.listenerType !== Lo && typeof i.listener.handleEvent == "function" && i.listener.handleEvent(r);
      if (Gk(r))
        break;
      i = i.next;
    }
    return Am(r, null), Hk(r, 0), Vk(r, null), !r.defaultPrevented;
  }
};
Object.defineProperty(Xn.prototype, "constructor", {
  value: Xn,
  configurable: !0,
  writable: !0
});
typeof window < "u" && typeof window.EventTarget < "u" && Object.setPrototypeOf(Xn.prototype, window.EventTarget.prototype);
class Ua extends Xn {
  /**
   * AbortSignal cannot be constructed directly.
   */
  constructor() {
    throw super(), new TypeError("AbortSignal cannot be constructed directly");
  }
  /**
   * Returns `true` if this `AbortSignal`'s `AbortController` has signaled to abort, and `false` otherwise.
   */
  get aborted() {
    const e = Ec.get(this);
    if (typeof e != "boolean")
      throw new TypeError(`Expected 'this' to be an 'AbortSignal' object, but got ${this === null ? "null" : typeof this}`);
    return e;
  }
}
jv(Ua.prototype, "abort");
function Yk() {
  const t = Object.create(Ua.prototype);
  return Xn.call(t), Ec.set(t, !1), t;
}
function Zk(t) {
  Ec.get(t) === !1 && (Ec.set(t, !0), t.dispatchEvent({ type: "abort" }));
}
const Ec = /* @__PURE__ */ new WeakMap();
Object.defineProperties(Ua.prototype, {
  aborted: { enumerable: !0 }
});
typeof Symbol == "function" && typeof Symbol.toStringTag == "symbol" && Object.defineProperty(Ua.prototype, Symbol.toStringTag, {
  configurable: !0,
  value: "AbortSignal"
});
let Ac = class {
  /**
   * Initialize this controller.
   */
  constructor() {
    Lv.set(this, Yk());
  }
  /**
   * Returns the `AbortSignal` object associated with this object.
   */
  get signal() {
    return Pm(this);
  }
  /**
   * Abort and signal to any observers that the associated activity is to be aborted.
   */
  abort() {
    Zk(Pm(this));
  }
};
const Lv = /* @__PURE__ */ new WeakMap();
function Pm(t) {
  const e = Lv.get(t);
  if (e == null)
    throw new TypeError(`Expected 'this' to be an 'AbortController' object, but got ${t === null ? "null" : typeof t}`);
  return e;
}
Object.defineProperties(Ac.prototype, {
  signal: { enumerable: !0 },
  abort: { enumerable: !0 }
});
typeof Symbol == "function" && typeof Symbol.toStringTag == "symbol" && Object.defineProperty(Ac.prototype, Symbol.toStringTag, {
  configurable: !0,
  value: "AbortController"
});
const Xk = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AbortController: Ac,
  AbortSignal: Ua,
  default: Ac
}, Symbol.toStringTag, { value: "Module" })), Ys = /* @__PURE__ */ nb(Xk);
var Cm;
function Kt() {
  return Cm || (Cm = 1, function(t) {
    const e = $n, { format: n, inspect: i } = Pv(), {
      codes: { ERR_INVALID_ARG_TYPE: r }
    } = Wt(), { kResistStopPropagation: s, AggregateError: a, SymbolDispose: o } = st(), c = globalThis.AbortSignal || Ys.AbortSignal, l = globalThis.AbortController || Ys.AbortController, u = Object.getPrototypeOf(async function() {
    }).constructor, p = globalThis.Blob || e.Blob, d = typeof p < "u" ? function(y) {
      return y instanceof p;
    } : function(y) {
      return !1;
    }, b = (v, y) => {
      if (v !== void 0 && (v === null || typeof v != "object" || !("aborted" in v)))
        throw new r(y, "AbortSignal", v);
    }, x = (v, y) => {
      if (typeof v != "function")
        throw new r(y, "Function", v);
    };
    t.exports = {
      AggregateError: a,
      kEmptyObject: Object.freeze({}),
      once(v) {
        let y = !1;
        return function(...f) {
          y || (y = !0, v.apply(this, f));
        };
      },
      createDeferredPromise: function() {
        let v, y;
        return {
          promise: new Promise((h, g) => {
            v = h, y = g;
          }),
          resolve: v,
          reject: y
        };
      },
      promisify(v) {
        return new Promise((y, f) => {
          v((h, ...g) => h ? f(h) : y(...g));
        });
      },
      debuglog() {
        return function() {
        };
      },
      format: n,
      inspect: i,
      types: {
        isAsyncFunction(v) {
          return v instanceof u;
        },
        isArrayBufferView(v) {
          return ArrayBuffer.isView(v);
        }
      },
      isBlob: d,
      deprecate(v, y) {
        return v;
      },
      addAbortListener: Ii.addAbortListener || function(y, f) {
        if (y === void 0)
          throw new r("signal", "AbortSignal", y);
        b(y, "signal"), x(f, "listener");
        let h;
        return y.aborted ? queueMicrotask(() => f()) : (y.addEventListener("abort", f, {
          __proto__: null,
          once: !0,
          [s]: !0
        }), h = () => {
          y.removeEventListener("abort", f);
        }), {
          __proto__: null,
          [o]() {
            var g;
            (g = h) === null || g === void 0 || g();
          }
        };
      },
      AbortSignalAny: c.any || function(y) {
        if (y.length === 1)
          return y[0];
        const f = new l(), h = () => f.abort();
        return y.forEach((g) => {
          b(g, "signals"), g.addEventListener("abort", h, {
            once: !0
          });
        }), f.signal.addEventListener(
          "abort",
          () => {
            y.forEach((g) => g.removeEventListener("abort", h));
          },
          {
            once: !0
          }
        ), f.signal;
      }
    }, t.exports.promisify.custom = Symbol.for("nodejs.util.promisify.custom");
  }(wu)), wu.exports;
}
var mo = {}, Eu, km;
function za() {
  if (km) return Eu;
  km = 1;
  const {
    ArrayIsArray: t,
    ArrayPrototypeIncludes: e,
    ArrayPrototypeJoin: n,
    ArrayPrototypeMap: i,
    NumberIsInteger: r,
    NumberIsNaN: s,
    NumberMAX_SAFE_INTEGER: a,
    NumberMIN_SAFE_INTEGER: o,
    NumberParseInt: c,
    ObjectPrototypeHasOwnProperty: l,
    RegExpPrototypeExec: u,
    String: p,
    StringPrototypeToUpperCase: d,
    StringPrototypeTrim: b
  } = st(), {
    hideStackFrames: x,
    codes: { ERR_SOCKET_BAD_PORT: v, ERR_INVALID_ARG_TYPE: y, ERR_INVALID_ARG_VALUE: f, ERR_OUT_OF_RANGE: h, ERR_UNKNOWN_SIGNAL: g }
  } = Wt(), { normalizeEncoding: A } = Kt(), { isAsyncFunction: C, isArrayBufferView: V } = Kt().types, K = {};
  function L(w) {
    return w === (w | 0);
  }
  function X(w) {
    return w === w >>> 0;
  }
  const D = /^[0-7]+$/, B = "must be a 32-bit unsigned integer or an octal string";
  function Y(w, q, ee) {
    if (typeof w > "u" && (w = ee), typeof w == "string") {
      if (u(D, w) === null)
        throw new f(q, w, B);
      w = c(w, 8);
    }
    return le(w, q), w;
  }
  const U = x((w, q, ee = o, G = a) => {
    if (typeof w != "number") throw new y(q, "number", w);
    if (!r(w)) throw new h(q, "an integer", w);
    if (w < ee || w > G) throw new h(q, `>= ${ee} && <= ${G}`, w);
  }), ae = x((w, q, ee = -2147483648, G = 2147483647) => {
    if (typeof w != "number")
      throw new y(q, "number", w);
    if (!r(w))
      throw new h(q, "an integer", w);
    if (w < ee || w > G)
      throw new h(q, `>= ${ee} && <= ${G}`, w);
  }), le = x((w, q, ee = !1) => {
    if (typeof w != "number")
      throw new y(q, "number", w);
    if (!r(w))
      throw new h(q, "an integer", w);
    const G = ee ? 1 : 0, de = 4294967295;
    if (w < G || w > de)
      throw new h(q, `>= ${G} && <= ${de}`, w);
  });
  function pe(w, q) {
    if (typeof w != "string") throw new y(q, "string", w);
  }
  function z(w, q, ee = void 0, G) {
    if (typeof w != "number") throw new y(q, "number", w);
    if (ee != null && w < ee || G != null && w > G || (ee != null || G != null) && s(w))
      throw new h(
        q,
        `${ee != null ? `>= ${ee}` : ""}${ee != null && G != null ? " && " : ""}${G != null ? `<= ${G}` : ""}`,
        w
      );
  }
  const k = x((w, q, ee) => {
    if (!e(ee, w)) {
      const de = "must be one of: " + n(
        i(ee, (ve) => typeof ve == "string" ? `'${ve}'` : p(ve)),
        ", "
      );
      throw new f(q, w, de);
    }
  });
  function H(w, q) {
    if (typeof w != "boolean") throw new y(q, "boolean", w);
  }
  function R(w, q, ee) {
    return w == null || !l(w, q) ? ee : w[q];
  }
  const Z = x((w, q, ee = null) => {
    const G = R(ee, "allowArray", !1), de = R(ee, "allowFunction", !1);
    if (!R(ee, "nullable", !1) && w === null || !G && t(w) || typeof w != "object" && (!de || typeof w != "function"))
      throw new y(q, "Object", w);
  }), se = x((w, q) => {
    if (w != null && typeof w != "object" && typeof w != "function")
      throw new y(q, "a dictionary", w);
  }), te = x((w, q, ee = 0) => {
    if (!t(w))
      throw new y(q, "Array", w);
    if (w.length < ee) {
      const G = `must be longer than ${ee}`;
      throw new f(q, w, G);
    }
  });
  function he(w, q) {
    te(w, q);
    for (let ee = 0; ee < w.length; ee++)
      pe(w[ee], `${q}[${ee}]`);
  }
  function Se(w, q) {
    te(w, q);
    for (let ee = 0; ee < w.length; ee++)
      H(w[ee], `${q}[${ee}]`);
  }
  function ye(w, q) {
    te(w, q);
    for (let ee = 0; ee < w.length; ee++) {
      const G = w[ee], de = `${q}[${ee}]`;
      if (G == null)
        throw new y(de, "AbortSignal", G);
      ge(G, de);
    }
  }
  function T(w, q = "signal") {
    if (pe(w, q), K[w] === void 0)
      throw K[d(w)] !== void 0 ? new g(w + " (signals must use all capital letters)") : new g(w);
  }
  const S = x((w, q = "buffer") => {
    if (!V(w))
      throw new y(q, ["Buffer", "TypedArray", "DataView"], w);
  });
  function W(w, q) {
    const ee = A(q), G = w.length;
    if (ee === "hex" && G % 2 !== 0)
      throw new f("encoding", q, `is invalid for data of length ${G}`);
  }
  function J(w, q = "Port", ee = !0) {
    if (typeof w != "number" && typeof w != "string" || typeof w == "string" && b(w).length === 0 || +w !== +w >>> 0 || w > 65535 || w === 0 && !ee)
      throw new v(q, w, ee);
    return w | 0;
  }
  const ge = x((w, q) => {
    if (w !== void 0 && (w === null || typeof w != "object" || !("aborted" in w)))
      throw new y(q, "AbortSignal", w);
  }), oe = x((w, q) => {
    if (typeof w != "function") throw new y(q, "Function", w);
  }), $ = x((w, q) => {
    if (typeof w != "function" || C(w)) throw new y(q, "Function", w);
  }), j = x((w, q) => {
    if (w !== void 0) throw new y(q, "undefined", w);
  });
  function E(w, q, ee) {
    if (!e(ee, w))
      throw new y(q, `('${n(ee, "|")}')`, w);
  }
  const I = /^(?:<[^>]*>)(?:\s*;\s*[^;"\s]+(?:=(")?[^;"\s]*\1)?)*$/;
  function M(w, q) {
    if (typeof w > "u" || !u(I, w))
      throw new f(
        q,
        w,
        'must be an array or string of format "</styles.css>; rel=preload; as=style"'
      );
  }
  function O(w) {
    if (typeof w == "string")
      return M(w, "hints"), w;
    if (t(w)) {
      const q = w.length;
      let ee = "";
      if (q === 0)
        return ee;
      for (let G = 0; G < q; G++) {
        const de = w[G];
        M(de, "hints"), ee += de, G !== q - 1 && (ee += ", ");
      }
      return ee;
    }
    throw new f(
      "hints",
      w,
      'must be an array or string of format "</styles.css>; rel=preload; as=style"'
    );
  }
  return Eu = {
    isInt32: L,
    isUint32: X,
    parseFileMode: Y,
    validateArray: te,
    validateStringArray: he,
    validateBooleanArray: Se,
    validateAbortSignalArray: ye,
    validateBoolean: H,
    validateBuffer: S,
    validateDictionary: se,
    validateEncoding: W,
    validateFunction: oe,
    validateInt32: ae,
    validateInteger: U,
    validateNumber: z,
    validateObject: Z,
    validateOneOf: k,
    validatePlainFunction: $,
    validatePort: J,
    validateSignalName: T,
    validateString: pe,
    validateUint32: le,
    validateUndefined: j,
    validateUnion: E,
    validateAbortSignal: ge,
    validateLinkHeaderValue: O
  }, Eu;
}
var go = { exports: {} }, Au, Im;
function yr() {
  return Im || (Im = 1, Au = We.process), Au;
}
var Tu, Dm;
function ti() {
  if (Dm) return Tu;
  Dm = 1;
  const { SymbolAsyncIterator: t, SymbolIterator: e, SymbolFor: n } = st(), i = n("nodejs.stream.destroyed"), r = n("nodejs.stream.errored"), s = n("nodejs.stream.readable"), a = n("nodejs.stream.writable"), o = n("nodejs.stream.disturbed"), c = n("nodejs.webstream.isClosedPromise"), l = n("nodejs.webstream.controllerErrorFunction");
  function u(R, Z = !1) {
    var se;
    return !!(R && typeof R.pipe == "function" && typeof R.on == "function" && (!Z || typeof R.pause == "function" && typeof R.resume == "function") && (!R._writableState || ((se = R._readableState) === null || se === void 0 ? void 0 : se.readable) !== !1) && // Duplex
    (!R._writableState || R._readableState));
  }
  function p(R) {
    var Z;
    return !!(R && typeof R.write == "function" && typeof R.on == "function" && (!R._readableState || ((Z = R._writableState) === null || Z === void 0 ? void 0 : Z.writable) !== !1));
  }
  function d(R) {
    return !!(R && typeof R.pipe == "function" && R._readableState && typeof R.on == "function" && typeof R.write == "function");
  }
  function b(R) {
    return R && (R._readableState || R._writableState || typeof R.write == "function" && typeof R.on == "function" || typeof R.pipe == "function" && typeof R.on == "function");
  }
  function x(R) {
    return !!(R && !b(R) && typeof R.pipeThrough == "function" && typeof R.getReader == "function" && typeof R.cancel == "function");
  }
  function v(R) {
    return !!(R && !b(R) && typeof R.getWriter == "function" && typeof R.abort == "function");
  }
  function y(R) {
    return !!(R && !b(R) && typeof R.readable == "object" && typeof R.writable == "object");
  }
  function f(R) {
    return x(R) || v(R) || y(R);
  }
  function h(R, Z) {
    return R == null ? !1 : Z === !0 ? typeof R[t] == "function" : Z === !1 ? typeof R[e] == "function" : typeof R[t] == "function" || typeof R[e] == "function";
  }
  function g(R) {
    if (!b(R)) return null;
    const Z = R._writableState, se = R._readableState, te = Z || se;
    return !!(R.destroyed || R[i] || te != null && te.destroyed);
  }
  function A(R) {
    if (!p(R)) return null;
    if (R.writableEnded === !0) return !0;
    const Z = R._writableState;
    return Z != null && Z.errored ? !1 : typeof (Z == null ? void 0 : Z.ended) != "boolean" ? null : Z.ended;
  }
  function C(R, Z) {
    if (!p(R)) return null;
    if (R.writableFinished === !0) return !0;
    const se = R._writableState;
    return se != null && se.errored ? !1 : typeof (se == null ? void 0 : se.finished) != "boolean" ? null : !!(se.finished || Z === !1 && se.ended === !0 && se.length === 0);
  }
  function V(R) {
    if (!u(R)) return null;
    if (R.readableEnded === !0) return !0;
    const Z = R._readableState;
    return !Z || Z.errored ? !1 : typeof (Z == null ? void 0 : Z.ended) != "boolean" ? null : Z.ended;
  }
  function K(R, Z) {
    if (!u(R)) return null;
    const se = R._readableState;
    return se != null && se.errored ? !1 : typeof (se == null ? void 0 : se.endEmitted) != "boolean" ? null : !!(se.endEmitted || Z === !1 && se.ended === !0 && se.length === 0);
  }
  function L(R) {
    return R && R[s] != null ? R[s] : typeof (R == null ? void 0 : R.readable) != "boolean" ? null : g(R) ? !1 : u(R) && R.readable && !K(R);
  }
  function X(R) {
    return R && R[a] != null ? R[a] : typeof (R == null ? void 0 : R.writable) != "boolean" ? null : g(R) ? !1 : p(R) && R.writable && !A(R);
  }
  function D(R, Z) {
    return b(R) ? g(R) ? !0 : !((Z == null ? void 0 : Z.readable) !== !1 && L(R) || (Z == null ? void 0 : Z.writable) !== !1 && X(R)) : null;
  }
  function B(R) {
    var Z, se;
    return b(R) ? R.writableErrored ? R.writableErrored : (Z = (se = R._writableState) === null || se === void 0 ? void 0 : se.errored) !== null && Z !== void 0 ? Z : null : null;
  }
  function Y(R) {
    var Z, se;
    return b(R) ? R.readableErrored ? R.readableErrored : (Z = (se = R._readableState) === null || se === void 0 ? void 0 : se.errored) !== null && Z !== void 0 ? Z : null : null;
  }
  function U(R) {
    if (!b(R))
      return null;
    if (typeof R.closed == "boolean")
      return R.closed;
    const Z = R._writableState, se = R._readableState;
    return typeof (Z == null ? void 0 : Z.closed) == "boolean" || typeof (se == null ? void 0 : se.closed) == "boolean" ? (Z == null ? void 0 : Z.closed) || (se == null ? void 0 : se.closed) : typeof R._closed == "boolean" && ae(R) ? R._closed : null;
  }
  function ae(R) {
    return typeof R._closed == "boolean" && typeof R._defaultKeepAlive == "boolean" && typeof R._removedConnection == "boolean" && typeof R._removedContLen == "boolean";
  }
  function le(R) {
    return typeof R._sent100 == "boolean" && ae(R);
  }
  function pe(R) {
    var Z;
    return typeof R._consuming == "boolean" && typeof R._dumped == "boolean" && ((Z = R.req) === null || Z === void 0 ? void 0 : Z.upgradeOrConnect) === void 0;
  }
  function z(R) {
    if (!b(R)) return null;
    const Z = R._writableState, se = R._readableState, te = Z || se;
    return !te && le(R) || !!(te && te.autoDestroy && te.emitClose && te.closed === !1);
  }
  function k(R) {
    var Z;
    return !!(R && ((Z = R[o]) !== null && Z !== void 0 ? Z : R.readableDidRead || R.readableAborted));
  }
  function H(R) {
    var Z, se, te, he, Se, ye, T, S, W, J;
    return !!(R && ((Z = (se = (te = (he = (Se = (ye = R[r]) !== null && ye !== void 0 ? ye : R.readableErrored) !== null && Se !== void 0 ? Se : R.writableErrored) !== null && he !== void 0 ? he : (T = R._readableState) === null || T === void 0 ? void 0 : T.errorEmitted) !== null && te !== void 0 ? te : (S = R._writableState) === null || S === void 0 ? void 0 : S.errorEmitted) !== null && se !== void 0 ? se : (W = R._readableState) === null || W === void 0 ? void 0 : W.errored) !== null && Z !== void 0 ? Z : !((J = R._writableState) === null || J === void 0) && J.errored));
  }
  return Tu = {
    isDestroyed: g,
    kIsDestroyed: i,
    isDisturbed: k,
    kIsDisturbed: o,
    isErrored: H,
    kIsErrored: r,
    isReadable: L,
    kIsReadable: s,
    kIsClosedPromise: c,
    kControllerErrorFunction: l,
    kIsWritable: a,
    isClosed: U,
    isDuplexNodeStream: d,
    isFinished: D,
    isIterable: h,
    isReadableNodeStream: u,
    isReadableStream: x,
    isReadableEnded: V,
    isReadableFinished: K,
    isReadableErrored: Y,
    isNodeStream: b,
    isWebStream: f,
    isWritable: X,
    isWritableNodeStream: p,
    isWritableStream: v,
    isWritableEnded: A,
    isWritableFinished: C,
    isWritableErrored: B,
    isServerRequest: pe,
    isServerResponse: le,
    willEmitClose: z,
    isTransformStream: y
  }, Tu;
}
var jm;
function Li() {
  if (jm) return go.exports;
  jm = 1;
  const t = yr(), { AbortError: e, codes: n } = Wt(), { ERR_INVALID_ARG_TYPE: i, ERR_STREAM_PREMATURE_CLOSE: r } = n, { kEmptyObject: s, once: a } = Kt(), { validateAbortSignal: o, validateFunction: c, validateObject: l, validateBoolean: u } = za(), { Promise: p, PromisePrototypeThen: d, SymbolDispose: b } = st(), {
    isClosed: x,
    isReadable: v,
    isReadableNodeStream: y,
    isReadableStream: f,
    isReadableFinished: h,
    isReadableErrored: g,
    isWritable: A,
    isWritableNodeStream: C,
    isWritableStream: V,
    isWritableFinished: K,
    isWritableErrored: L,
    isNodeStream: X,
    willEmitClose: D,
    kIsClosedPromise: B
  } = ti();
  let Y;
  function U(k) {
    return k.setHeader && typeof k.abort == "function";
  }
  const ae = () => {
  };
  function le(k, H, R) {
    var Z, se;
    if (arguments.length === 2 ? (R = H, H = s) : H == null ? H = s : l(H, "options"), c(R, "callback"), o(H.signal, "options.signal"), R = a(R), f(k) || V(k))
      return pe(k, H, R);
    if (!X(k))
      throw new i("stream", ["ReadableStream", "WritableStream", "Stream"], k);
    const te = (Z = H.readable) !== null && Z !== void 0 ? Z : y(k), he = (se = H.writable) !== null && se !== void 0 ? se : C(k), Se = k._writableState, ye = k._readableState, T = () => {
      k.writable || J();
    };
    let S = D(k) && y(k) === te && C(k) === he, W = K(k, !1);
    const J = () => {
      W = !0, k.destroyed && (S = !1), !(S && (!k.readable || te)) && (!te || ge) && R.call(k);
    };
    let ge = h(k, !1);
    const oe = () => {
      ge = !0, k.destroyed && (S = !1), !(S && (!k.writable || he)) && (!he || W) && R.call(k);
    }, $ = (w) => {
      R.call(k, w);
    };
    let j = x(k);
    const E = () => {
      j = !0;
      const w = L(k) || g(k);
      if (w && typeof w != "boolean")
        return R.call(k, w);
      if (te && !ge && y(k, !0) && !h(k, !1))
        return R.call(k, new r());
      if (he && !W && !K(k, !1))
        return R.call(k, new r());
      R.call(k);
    }, I = () => {
      j = !0;
      const w = L(k) || g(k);
      if (w && typeof w != "boolean")
        return R.call(k, w);
      R.call(k);
    }, M = () => {
      k.req.on("finish", J);
    };
    U(k) ? (k.on("complete", J), S || k.on("abort", E), k.req ? M() : k.on("request", M)) : he && !Se && (k.on("end", T), k.on("close", T)), !S && typeof k.aborted == "boolean" && k.on("aborted", E), k.on("end", oe), k.on("finish", J), H.error !== !1 && k.on("error", $), k.on("close", E), j ? t.nextTick(E) : Se != null && Se.errorEmitted || ye != null && ye.errorEmitted ? S || t.nextTick(I) : (!te && (!S || v(k)) && (W || A(k) === !1) || !he && (!S || A(k)) && (ge || v(k) === !1) || ye && k.req && k.aborted) && t.nextTick(I);
    const O = () => {
      R = ae, k.removeListener("aborted", E), k.removeListener("complete", J), k.removeListener("abort", E), k.removeListener("request", M), k.req && k.req.removeListener("finish", J), k.removeListener("end", T), k.removeListener("close", T), k.removeListener("finish", J), k.removeListener("end", oe), k.removeListener("error", $), k.removeListener("close", E);
    };
    if (H.signal && !j) {
      const w = () => {
        const q = R;
        O(), q.call(
          k,
          new e(void 0, {
            cause: H.signal.reason
          })
        );
      };
      if (H.signal.aborted)
        t.nextTick(w);
      else {
        Y = Y || Kt().addAbortListener;
        const q = Y(H.signal, w), ee = R;
        R = a((...G) => {
          q[b](), ee.apply(k, G);
        });
      }
    }
    return O;
  }
  function pe(k, H, R) {
    let Z = !1, se = ae;
    if (H.signal)
      if (se = () => {
        Z = !0, R.call(
          k,
          new e(void 0, {
            cause: H.signal.reason
          })
        );
      }, H.signal.aborted)
        t.nextTick(se);
      else {
        Y = Y || Kt().addAbortListener;
        const he = Y(H.signal, se), Se = R;
        R = a((...ye) => {
          he[b](), Se.apply(k, ye);
        });
      }
    const te = (...he) => {
      Z || t.nextTick(() => R.apply(k, he));
    };
    return d(k[B].promise, te, te), ae;
  }
  function z(k, H) {
    var R;
    let Z = !1;
    return H === null && (H = s), (R = H) !== null && R !== void 0 && R.cleanup && (u(H.cleanup, "cleanup"), Z = H.cleanup), new p((se, te) => {
      const he = le(k, H, (Se) => {
        Z && he(), Se ? te(Se) : se();
      });
    });
  }
  return go.exports = le, go.exports.finished = z, go.exports;
}
var Ru, Lm;
function ps() {
  if (Lm) return Ru;
  Lm = 1;
  const t = yr(), {
    aggregateTwoErrors: e,
    codes: { ERR_MULTIPLE_CALLBACK: n },
    AbortError: i
  } = Wt(), { Symbol: r } = st(), { kIsDestroyed: s, isDestroyed: a, isFinished: o, isServerRequest: c } = ti(), l = r("kDestroy"), u = r("kConstruct");
  function p(D, B, Y) {
    D && (D.stack, B && !B.errored && (B.errored = D), Y && !Y.errored && (Y.errored = D));
  }
  function d(D, B) {
    const Y = this._readableState, U = this._writableState, ae = U || Y;
    return U != null && U.destroyed || Y != null && Y.destroyed ? (typeof B == "function" && B(), this) : (p(D, U, Y), U && (U.destroyed = !0), Y && (Y.destroyed = !0), ae.constructed ? b(this, D, B) : this.once(l, function(le) {
      b(this, e(le, D), B);
    }), this);
  }
  function b(D, B, Y) {
    let U = !1;
    function ae(le) {
      if (U)
        return;
      U = !0;
      const pe = D._readableState, z = D._writableState;
      p(le, z, pe), z && (z.closed = !0), pe && (pe.closed = !0), typeof Y == "function" && Y(le), le ? t.nextTick(x, D, le) : t.nextTick(v, D);
    }
    try {
      D._destroy(B || null, ae);
    } catch (le) {
      ae(le);
    }
  }
  function x(D, B) {
    y(D, B), v(D);
  }
  function v(D) {
    const B = D._readableState, Y = D._writableState;
    Y && (Y.closeEmitted = !0), B && (B.closeEmitted = !0), (Y != null && Y.emitClose || B != null && B.emitClose) && D.emit("close");
  }
  function y(D, B) {
    const Y = D._readableState, U = D._writableState;
    U != null && U.errorEmitted || Y != null && Y.errorEmitted || (U && (U.errorEmitted = !0), Y && (Y.errorEmitted = !0), D.emit("error", B));
  }
  function f() {
    const D = this._readableState, B = this._writableState;
    D && (D.constructed = !0, D.closed = !1, D.closeEmitted = !1, D.destroyed = !1, D.errored = null, D.errorEmitted = !1, D.reading = !1, D.ended = D.readable === !1, D.endEmitted = D.readable === !1), B && (B.constructed = !0, B.destroyed = !1, B.closed = !1, B.closeEmitted = !1, B.errored = null, B.errorEmitted = !1, B.finalCalled = !1, B.prefinished = !1, B.ended = B.writable === !1, B.ending = B.writable === !1, B.finished = B.writable === !1);
  }
  function h(D, B, Y) {
    const U = D._readableState, ae = D._writableState;
    if (ae != null && ae.destroyed || U != null && U.destroyed)
      return this;
    U != null && U.autoDestroy || ae != null && ae.autoDestroy ? D.destroy(B) : B && (B.stack, ae && !ae.errored && (ae.errored = B), U && !U.errored && (U.errored = B), Y ? t.nextTick(y, D, B) : y(D, B));
  }
  function g(D, B) {
    if (typeof D._construct != "function")
      return;
    const Y = D._readableState, U = D._writableState;
    Y && (Y.constructed = !1), U && (U.constructed = !1), D.once(u, B), !(D.listenerCount(u) > 1) && t.nextTick(A, D);
  }
  function A(D) {
    let B = !1;
    function Y(U) {
      if (B) {
        h(D, U ?? new n());
        return;
      }
      B = !0;
      const ae = D._readableState, le = D._writableState, pe = le || ae;
      ae && (ae.constructed = !0), le && (le.constructed = !0), pe.destroyed ? D.emit(l, U) : U ? h(D, U, !0) : t.nextTick(C, D);
    }
    try {
      D._construct((U) => {
        t.nextTick(Y, U);
      });
    } catch (U) {
      t.nextTick(Y, U);
    }
  }
  function C(D) {
    D.emit(u);
  }
  function V(D) {
    return (D == null ? void 0 : D.setHeader) && typeof D.abort == "function";
  }
  function K(D) {
    D.emit("close");
  }
  function L(D, B) {
    D.emit("error", B), t.nextTick(K, D);
  }
  function X(D, B) {
    !D || a(D) || (!B && !o(D) && (B = new i()), c(D) ? (D.socket = null, D.destroy(B)) : V(D) ? D.abort() : V(D.req) ? D.req.abort() : typeof D.destroy == "function" ? D.destroy(B) : typeof D.close == "function" ? D.close() : B ? t.nextTick(L, D, B) : t.nextTick(K, D), D.destroyed || (D[s] = !0));
  }
  return Ru = {
    construct: g,
    destroyer: X,
    destroy: d,
    undestroy: f,
    errorOrDestroy: h
  }, Ru;
}
var Ou, Nm;
function zf() {
  if (Nm) return Ou;
  Nm = 1;
  const { ArrayIsArray: t, ObjectSetPrototypeOf: e } = st(), { EventEmitter: n } = Ii;
  function i(s) {
    n.call(this, s);
  }
  e(i.prototype, n.prototype), e(i, n), i.prototype.pipe = function(s, a) {
    const o = this;
    function c(v) {
      s.writable && s.write(v) === !1 && o.pause && o.pause();
    }
    o.on("data", c);
    function l() {
      o.readable && o.resume && o.resume();
    }
    s.on("drain", l), !s._isStdio && (!a || a.end !== !1) && (o.on("end", p), o.on("close", d));
    let u = !1;
    function p() {
      u || (u = !0, s.end());
    }
    function d() {
      u || (u = !0, typeof s.destroy == "function" && s.destroy());
    }
    function b(v) {
      x(), n.listenerCount(this, "error") === 0 && this.emit("error", v);
    }
    r(o, "error", b), r(s, "error", b);
    function x() {
      o.removeListener("data", c), s.removeListener("drain", l), o.removeListener("end", p), o.removeListener("close", d), o.removeListener("error", b), s.removeListener("error", b), o.removeListener("end", x), o.removeListener("close", x), s.removeListener("close", x);
    }
    return o.on("end", x), o.on("close", x), s.on("close", x), s.emit("pipe", o), s;
  };
  function r(s, a, o) {
    if (typeof s.prependListener == "function") return s.prependListener(a, o);
    !s._events || !s._events[a] ? s.on(a, o) : t(s._events[a]) ? s._events[a].unshift(o) : s._events[a] = [o, s._events[a]];
  }
  return Ou = {
    Stream: i,
    prependListener: r
  }, Ou;
}
var Pu = { exports: {} }, Fm;
function el() {
  return Fm || (Fm = 1, function(t) {
    const { SymbolDispose: e } = st(), { AbortError: n, codes: i } = Wt(), { isNodeStream: r, isWebStream: s, kControllerErrorFunction: a } = ti(), o = Li(), { ERR_INVALID_ARG_TYPE: c } = i;
    let l;
    const u = (p, d) => {
      if (typeof p != "object" || !("aborted" in p))
        throw new c(d, "AbortSignal", p);
    };
    t.exports.addAbortSignal = function(d, b) {
      if (u(d, "signal"), !r(b) && !s(b))
        throw new c("stream", ["ReadableStream", "WritableStream", "Stream"], b);
      return t.exports.addAbortSignalNoValidate(d, b);
    }, t.exports.addAbortSignalNoValidate = function(p, d) {
      if (typeof p != "object" || !("aborted" in p))
        return d;
      const b = r(d) ? () => {
        d.destroy(
          new n(void 0, {
            cause: p.reason
          })
        );
      } : () => {
        d[a](
          new n(void 0, {
            cause: p.reason
          })
        );
      };
      if (p.aborted)
        b();
      else {
        l = l || Kt().addAbortListener;
        const x = l(p, b);
        o(d, x[e]);
      }
      return d;
    };
  }(Pu)), Pu.exports;
}
var Cu, Mm;
function Jk() {
  if (Mm) return Cu;
  Mm = 1;
  const { StringPrototypeSlice: t, SymbolIterator: e, TypedArrayPrototypeSet: n, Uint8Array: i } = st(), { Buffer: r } = $n, { inspect: s } = Kt();
  return Cu = class {
    constructor() {
      this.head = null, this.tail = null, this.length = 0;
    }
    push(o) {
      const c = {
        data: o,
        next: null
      };
      this.length > 0 ? this.tail.next = c : this.head = c, this.tail = c, ++this.length;
    }
    unshift(o) {
      const c = {
        data: o,
        next: this.head
      };
      this.length === 0 && (this.tail = c), this.head = c, ++this.length;
    }
    shift() {
      if (this.length === 0) return;
      const o = this.head.data;
      return this.length === 1 ? this.head = this.tail = null : this.head = this.head.next, --this.length, o;
    }
    clear() {
      this.head = this.tail = null, this.length = 0;
    }
    join(o) {
      if (this.length === 0) return "";
      let c = this.head, l = "" + c.data;
      for (; (c = c.next) !== null; ) l += o + c.data;
      return l;
    }
    concat(o) {
      if (this.length === 0) return r.alloc(0);
      const c = r.allocUnsafe(o >>> 0);
      let l = this.head, u = 0;
      for (; l; )
        n(c, l.data, u), u += l.data.length, l = l.next;
      return c;
    }
    // Consumes a specified amount of bytes or characters from the buffered data.
    consume(o, c) {
      const l = this.head.data;
      if (o < l.length) {
        const u = l.slice(0, o);
        return this.head.data = l.slice(o), u;
      }
      return o === l.length ? this.shift() : c ? this._getString(o) : this._getBuffer(o);
    }
    first() {
      return this.head.data;
    }
    *[e]() {
      for (let o = this.head; o; o = o.next)
        yield o.data;
    }
    // Consumes a specified amount of characters from the buffered data.
    _getString(o) {
      let c = "", l = this.head, u = 0;
      do {
        const p = l.data;
        if (o > p.length)
          c += p, o -= p.length;
        else {
          o === p.length ? (c += p, ++u, l.next ? this.head = l.next : this.head = this.tail = null) : (c += t(p, 0, o), this.head = l, l.data = t(p, o));
          break;
        }
        ++u;
      } while ((l = l.next) !== null);
      return this.length -= u, c;
    }
    // Consumes a specified amount of bytes from the buffered data.
    _getBuffer(o) {
      const c = r.allocUnsafe(o), l = o;
      let u = this.head, p = 0;
      do {
        const d = u.data;
        if (o > d.length)
          n(c, d, l - o), o -= d.length;
        else {
          o === d.length ? (n(c, d, l - o), ++p, u.next ? this.head = u.next : this.head = this.tail = null) : (n(c, new i(d.buffer, d.byteOffset, o), l - o), this.head = u, u.data = d.slice(o));
          break;
        }
        ++p;
      } while ((u = u.next) !== null);
      return this.length -= p, c;
    }
    // Make sure the linked list only shows the minimal necessary information.
    [Symbol.for("nodejs.util.inspect.custom")](o, c) {
      return s(this, {
        ...c,
        // Only inspect one level.
        depth: 0,
        // It should not recurse.
        customInspect: !1
      });
    }
  }, Cu;
}
var ku, $m;
function tl() {
  if ($m) return ku;
  $m = 1;
  const { MathFloor: t, NumberIsInteger: e } = st(), { validateInteger: n } = za(), { ERR_INVALID_ARG_VALUE: i } = Wt().codes;
  let r = 16 * 1024, s = 16;
  function a(u, p, d) {
    return u.highWaterMark != null ? u.highWaterMark : p ? u[d] : null;
  }
  function o(u) {
    return u ? s : r;
  }
  function c(u, p) {
    n(p, "value", 0), u ? s = p : r = p;
  }
  function l(u, p, d, b) {
    const x = a(p, b, d);
    if (x != null) {
      if (!e(x) || x < 0) {
        const v = b ? `options.${d}` : "options.highWaterMark";
        throw new i(v, x);
      }
      return t(x);
    }
    return o(u.objectMode);
  }
  return ku = {
    getHighWaterMark: l,
    getDefaultHighWaterMark: o,
    setDefaultHighWaterMark: c
  }, ku;
}
var Iu = {}, bo = { exports: {} };
/*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
var Bm;
function Qk() {
  return Bm || (Bm = 1, function(t, e) {
    var n = $n, i = n.Buffer;
    function r(a, o) {
      for (var c in a)
        o[c] = a[c];
    }
    i.from && i.alloc && i.allocUnsafe && i.allocUnsafeSlow ? t.exports = n : (r(n, e), e.Buffer = s);
    function s(a, o, c) {
      return i(a, o, c);
    }
    s.prototype = Object.create(i.prototype), r(i, s), s.from = function(a, o, c) {
      if (typeof a == "number")
        throw new TypeError("Argument must not be a number");
      return i(a, o, c);
    }, s.alloc = function(a, o, c) {
      if (typeof a != "number")
        throw new TypeError("Argument must be a number");
      var l = i(a);
      return o !== void 0 ? typeof c == "string" ? l.fill(o, c) : l.fill(o) : l.fill(0), l;
    }, s.allocUnsafe = function(a) {
      if (typeof a != "number")
        throw new TypeError("Argument must be a number");
      return i(a);
    }, s.allocUnsafeSlow = function(a) {
      if (typeof a != "number")
        throw new TypeError("Argument must be a number");
      return n.SlowBuffer(a);
    };
  }(bo, bo.exports)), bo.exports;
}
var Um;
function eI() {
  if (Um) return Iu;
  Um = 1;
  var t = Qk().Buffer, e = t.isEncoding || function(f) {
    switch (f = "" + f, f && f.toLowerCase()) {
      case "hex":
      case "utf8":
      case "utf-8":
      case "ascii":
      case "binary":
      case "base64":
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
      case "raw":
        return !0;
      default:
        return !1;
    }
  };
  function n(f) {
    if (!f) return "utf8";
    for (var h; ; )
      switch (f) {
        case "utf8":
        case "utf-8":
          return "utf8";
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return "utf16le";
        case "latin1":
        case "binary":
          return "latin1";
        case "base64":
        case "ascii":
        case "hex":
          return f;
        default:
          if (h) return;
          f = ("" + f).toLowerCase(), h = !0;
      }
  }
  function i(f) {
    var h = n(f);
    if (typeof h != "string" && (t.isEncoding === e || !e(f))) throw new Error("Unknown encoding: " + f);
    return h || f;
  }
  Iu.StringDecoder = r;
  function r(f) {
    this.encoding = i(f);
    var h;
    switch (this.encoding) {
      case "utf16le":
        this.text = p, this.end = d, h = 4;
        break;
      case "utf8":
        this.fillLast = c, h = 4;
        break;
      case "base64":
        this.text = b, this.end = x, h = 3;
        break;
      default:
        this.write = v, this.end = y;
        return;
    }
    this.lastNeed = 0, this.lastTotal = 0, this.lastChar = t.allocUnsafe(h);
  }
  r.prototype.write = function(f) {
    if (f.length === 0) return "";
    var h, g;
    if (this.lastNeed) {
      if (h = this.fillLast(f), h === void 0) return "";
      g = this.lastNeed, this.lastNeed = 0;
    } else
      g = 0;
    return g < f.length ? h ? h + this.text(f, g) : this.text(f, g) : h || "";
  }, r.prototype.end = u, r.prototype.text = l, r.prototype.fillLast = function(f) {
    if (this.lastNeed <= f.length)
      return f.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed), this.lastChar.toString(this.encoding, 0, this.lastTotal);
    f.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, f.length), this.lastNeed -= f.length;
  };
  function s(f) {
    return f <= 127 ? 0 : f >> 5 === 6 ? 2 : f >> 4 === 14 ? 3 : f >> 3 === 30 ? 4 : f >> 6 === 2 ? -1 : -2;
  }
  function a(f, h, g) {
    var A = h.length - 1;
    if (A < g) return 0;
    var C = s(h[A]);
    return C >= 0 ? (C > 0 && (f.lastNeed = C - 1), C) : --A < g || C === -2 ? 0 : (C = s(h[A]), C >= 0 ? (C > 0 && (f.lastNeed = C - 2), C) : --A < g || C === -2 ? 0 : (C = s(h[A]), C >= 0 ? (C > 0 && (C === 2 ? C = 0 : f.lastNeed = C - 3), C) : 0));
  }
  function o(f, h, g) {
    if ((h[0] & 192) !== 128)
      return f.lastNeed = 0, "�";
    if (f.lastNeed > 1 && h.length > 1) {
      if ((h[1] & 192) !== 128)
        return f.lastNeed = 1, "�";
      if (f.lastNeed > 2 && h.length > 2 && (h[2] & 192) !== 128)
        return f.lastNeed = 2, "�";
    }
  }
  function c(f) {
    var h = this.lastTotal - this.lastNeed, g = o(this, f);
    if (g !== void 0) return g;
    if (this.lastNeed <= f.length)
      return f.copy(this.lastChar, h, 0, this.lastNeed), this.lastChar.toString(this.encoding, 0, this.lastTotal);
    f.copy(this.lastChar, h, 0, f.length), this.lastNeed -= f.length;
  }
  function l(f, h) {
    var g = a(this, f, h);
    if (!this.lastNeed) return f.toString("utf8", h);
    this.lastTotal = g;
    var A = f.length - (g - this.lastNeed);
    return f.copy(this.lastChar, 0, A), f.toString("utf8", h, A);
  }
  function u(f) {
    var h = f && f.length ? this.write(f) : "";
    return this.lastNeed ? h + "�" : h;
  }
  function p(f, h) {
    if ((f.length - h) % 2 === 0) {
      var g = f.toString("utf16le", h);
      if (g) {
        var A = g.charCodeAt(g.length - 1);
        if (A >= 55296 && A <= 56319)
          return this.lastNeed = 2, this.lastTotal = 4, this.lastChar[0] = f[f.length - 2], this.lastChar[1] = f[f.length - 1], g.slice(0, -1);
      }
      return g;
    }
    return this.lastNeed = 1, this.lastTotal = 2, this.lastChar[0] = f[f.length - 1], f.toString("utf16le", h, f.length - 1);
  }
  function d(f) {
    var h = f && f.length ? this.write(f) : "";
    if (this.lastNeed) {
      var g = this.lastTotal - this.lastNeed;
      return h + this.lastChar.toString("utf16le", 0, g);
    }
    return h;
  }
  function b(f, h) {
    var g = (f.length - h) % 3;
    return g === 0 ? f.toString("base64", h) : (this.lastNeed = 3 - g, this.lastTotal = 3, g === 1 ? this.lastChar[0] = f[f.length - 1] : (this.lastChar[0] = f[f.length - 2], this.lastChar[1] = f[f.length - 1]), f.toString("base64", h, f.length - g));
  }
  function x(f) {
    var h = f && f.length ? this.write(f) : "";
    return this.lastNeed ? h + this.lastChar.toString("base64", 0, 3 - this.lastNeed) : h;
  }
  function v(f) {
    return f.toString(this.encoding);
  }
  function y(f) {
    return f && f.length ? this.write(f) : "";
  }
  return Iu;
}
var Du, zm;
function Nv() {
  if (zm) return Du;
  zm = 1;
  const t = yr(), { PromisePrototypeThen: e, SymbolAsyncIterator: n, SymbolIterator: i } = st(), { Buffer: r } = $n, { ERR_INVALID_ARG_TYPE: s, ERR_STREAM_NULL_VALUES: a } = Wt().codes;
  function o(c, l, u) {
    let p;
    if (typeof l == "string" || l instanceof r)
      return new c({
        objectMode: !0,
        ...u,
        read() {
          this.push(l), this.push(null);
        }
      });
    let d;
    if (l && l[n])
      d = !0, p = l[n]();
    else if (l && l[i])
      d = !1, p = l[i]();
    else
      throw new s("iterable", ["Iterable"], l);
    const b = new c({
      objectMode: !0,
      highWaterMark: 1,
      // TODO(ronag): What options should be allowed?
      ...u
    });
    let x = !1;
    b._read = function() {
      x || (x = !0, y());
    }, b._destroy = function(f, h) {
      e(
        v(f),
        () => t.nextTick(h, f),
        // nextTick is here in case cb throws
        (g) => t.nextTick(h, g || f)
      );
    };
    async function v(f) {
      const h = f != null, g = typeof p.throw == "function";
      if (h && g) {
        const { value: A, done: C } = await p.throw(f);
        if (await A, C)
          return;
      }
      if (typeof p.return == "function") {
        const { value: A } = await p.return();
        await A;
      }
    }
    async function y() {
      for (; ; ) {
        try {
          const { value: f, done: h } = d ? await p.next() : p.next();
          if (h)
            b.push(null);
          else {
            const g = f && typeof f.then == "function" ? await f : f;
            if (g === null)
              throw x = !1, new a();
            if (b.push(g))
              continue;
            x = !1;
          }
        } catch (f) {
          b.destroy(f);
        }
        break;
      }
    }
    return b;
  }
  return Du = o, Du;
}
var ju, Wm;
function nl() {
  if (Wm) return ju;
  Wm = 1;
  const t = yr(), {
    ArrayPrototypeIndexOf: e,
    NumberIsInteger: n,
    NumberIsNaN: i,
    NumberParseInt: r,
    ObjectDefineProperties: s,
    ObjectKeys: a,
    ObjectSetPrototypeOf: o,
    Promise: c,
    SafeSet: l,
    SymbolAsyncDispose: u,
    SymbolAsyncIterator: p,
    Symbol: d
  } = st();
  ju = G, G.ReadableState = ee;
  const { EventEmitter: b } = Ii, { Stream: x, prependListener: v } = zf(), { Buffer: y } = $n, { addAbortSignal: f } = el(), h = Li();
  let g = Kt().debuglog("stream", (P) => {
    g = P;
  });
  const A = Jk(), C = ps(), { getHighWaterMark: V, getDefaultHighWaterMark: K } = tl(), {
    aggregateTwoErrors: L,
    codes: {
      ERR_INVALID_ARG_TYPE: X,
      ERR_METHOD_NOT_IMPLEMENTED: D,
      ERR_OUT_OF_RANGE: B,
      ERR_STREAM_PUSH_AFTER_EOF: Y,
      ERR_STREAM_UNSHIFT_AFTER_END_EVENT: U
    },
    AbortError: ae
  } = Wt(), { validateObject: le } = za(), pe = d("kPaused"), { StringDecoder: z } = eI(), k = Nv();
  o(G.prototype, x.prototype), o(G, x);
  const H = () => {
  }, { errorOrDestroy: R } = C, Z = 1, se = 2, te = 4, he = 8, Se = 16, ye = 32, T = 64, S = 128, W = 256, J = 512, ge = 1024, oe = 2048, $ = 4096, j = 8192, E = 16384, I = 32768, M = 65536, O = 1 << 17, w = 1 << 18;
  function q(P) {
    return {
      enumerable: !1,
      get() {
        return (this.state & P) !== 0;
      },
      set(N) {
        N ? this.state |= P : this.state &= ~P;
      }
    };
  }
  s(ee.prototype, {
    objectMode: q(Z),
    ended: q(se),
    endEmitted: q(te),
    reading: q(he),
    // Stream is still being constructed and cannot be
    // destroyed until construction finished or failed.
    // Async construction is opt in, therefore we start as
    // constructed.
    constructed: q(Se),
    // A flag to be able to tell if the event 'readable'/'data' is emitted
    // immediately, or on a later tick.  We set this to true at first, because
    // any actions that shouldn't happen until "later" should generally also
    // not happen before the first read call.
    sync: q(ye),
    // Whenever we return null, then we set a flag to say
    // that we're awaiting a 'readable' event emission.
    needReadable: q(T),
    emittedReadable: q(S),
    readableListening: q(W),
    resumeScheduled: q(J),
    // True if the error was already emitted and should not be thrown again.
    errorEmitted: q(ge),
    emitClose: q(oe),
    autoDestroy: q($),
    // Has it been destroyed.
    destroyed: q(j),
    // Indicates whether the stream has finished destroying.
    closed: q(E),
    // True if close has been emitted or would have been emitted
    // depending on emitClose.
    closeEmitted: q(I),
    multiAwaitDrain: q(M),
    // If true, a maybeReadMore has been scheduled.
    readingMore: q(O),
    dataEmitted: q(w)
  });
  function ee(P, N, xe) {
    typeof xe != "boolean" && (xe = N instanceof Jn()), this.state = oe | $ | Se | ye, P && P.objectMode && (this.state |= Z), xe && P && P.readableObjectMode && (this.state |= Z), this.highWaterMark = P ? V(this, P, "readableHighWaterMark", xe) : K(!1), this.buffer = new A(), this.length = 0, this.pipes = [], this.flowing = null, this[pe] = null, P && P.emitClose === !1 && (this.state &= ~oe), P && P.autoDestroy === !1 && (this.state &= ~$), this.errored = null, this.defaultEncoding = P && P.defaultEncoding || "utf8", this.awaitDrainWriters = null, this.decoder = null, this.encoding = null, P && P.encoding && (this.decoder = new z(P.encoding), this.encoding = P.encoding);
  }
  function G(P) {
    if (!(this instanceof G)) return new G(P);
    const N = this instanceof Jn();
    this._readableState = new ee(P, this, N), P && (typeof P.read == "function" && (this._read = P.read), typeof P.destroy == "function" && (this._destroy = P.destroy), typeof P.construct == "function" && (this._construct = P.construct), P.signal && !N && f(P.signal, this)), x.call(this, P), C.construct(this, () => {
      this._readableState.needReadable && wt(this, this._readableState);
    });
  }
  G.prototype.destroy = C.destroy, G.prototype._undestroy = C.undestroy, G.prototype._destroy = function(P, N) {
    N(P);
  }, G.prototype[b.captureRejectionSymbol] = function(P) {
    this.destroy(P);
  }, G.prototype[u] = function() {
    let P;
    return this.destroyed || (P = this.readableEnded ? null : new ae(), this.destroy(P)), new c((N, xe) => h(this, (we) => we && we !== P ? xe(we) : N(null)));
  }, G.prototype.push = function(P, N) {
    return de(this, P, N, !1);
  }, G.prototype.unshift = function(P, N) {
    return de(this, P, N, !0);
  };
  function de(P, N, xe, we) {
    g("readableAddChunk", N);
    const Ee = P._readableState;
    let jt;
    if (Ee.state & Z || (typeof N == "string" ? (xe = xe || Ee.defaultEncoding, Ee.encoding !== xe && (we && Ee.encoding ? N = y.from(N, xe).toString(Ee.encoding) : (N = y.from(N, xe), xe = ""))) : N instanceof y ? xe = "" : x._isUint8Array(N) ? (N = x._uint8ArrayToBuffer(N), xe = "") : N != null && (jt = new X("chunk", ["string", "Buffer", "Uint8Array"], N))), jt)
      R(P, jt);
    else if (N === null)
      Ee.state &= ~he, Fe(P, Ee);
    else if (Ee.state & Z || N && N.length > 0)
      if (we)
        if (Ee.state & te) R(P, new U());
        else {
          if (Ee.destroyed || Ee.errored) return !1;
          ve(P, Ee, N, !0);
        }
      else if (Ee.ended)
        R(P, new Y());
      else {
        if (Ee.destroyed || Ee.errored)
          return !1;
        Ee.state &= ~he, Ee.decoder && !xe ? (N = Ee.decoder.write(N), Ee.objectMode || N.length !== 0 ? ve(P, Ee, N, !1) : wt(P, Ee)) : ve(P, Ee, N, !1);
      }
    else we || (Ee.state &= ~he, wt(P, Ee));
    return !Ee.ended && (Ee.length < Ee.highWaterMark || Ee.length === 0);
  }
  function ve(P, N, xe, we) {
    N.flowing && N.length === 0 && !N.sync && P.listenerCount("data") > 0 ? (N.state & M ? N.awaitDrainWriters.clear() : N.awaitDrainWriters = null, N.dataEmitted = !0, P.emit("data", xe)) : (N.length += N.objectMode ? 1 : xe.length, we ? N.buffer.unshift(xe) : N.buffer.push(xe), N.state & T && Ot(P)), wt(P, N);
  }
  G.prototype.isPaused = function() {
    const P = this._readableState;
    return P[pe] === !0 || P.flowing === !1;
  }, G.prototype.setEncoding = function(P) {
    const N = new z(P);
    this._readableState.decoder = N, this._readableState.encoding = this._readableState.decoder.encoding;
    const xe = this._readableState.buffer;
    let we = "";
    for (const Ee of xe)
      we += N.write(Ee);
    return xe.clear(), we !== "" && xe.push(we), this._readableState.length = we.length, this;
  };
  const me = 1073741824;
  function Te(P) {
    if (P > me)
      throw new B("size", "<= 1GiB", P);
    return P--, P |= P >>> 1, P |= P >>> 2, P |= P >>> 4, P |= P >>> 8, P |= P >>> 16, P++, P;
  }
  function Le(P, N) {
    return P <= 0 || N.length === 0 && N.ended ? 0 : N.state & Z ? 1 : i(P) ? N.flowing && N.length ? N.buffer.first().length : N.length : P <= N.length ? P : N.ended ? N.length : 0;
  }
  G.prototype.read = function(P) {
    g("read", P), P === void 0 ? P = NaN : n(P) || (P = r(P, 10));
    const N = this._readableState, xe = P;
    if (P > N.highWaterMark && (N.highWaterMark = Te(P)), P !== 0 && (N.state &= ~S), P === 0 && N.needReadable && ((N.highWaterMark !== 0 ? N.length >= N.highWaterMark : N.length > 0) || N.ended))
      return g("read: emitReadable", N.length, N.ended), N.length === 0 && N.ended ? Bi(this) : Ot(this), null;
    if (P = Le(P, N), P === 0 && N.ended)
      return N.length === 0 && Bi(this), null;
    let we = (N.state & T) !== 0;
    if (g("need readable", we), (N.length === 0 || N.length - P < N.highWaterMark) && (we = !0, g("length less than watermark", we)), N.ended || N.reading || N.destroyed || N.errored || !N.constructed)
      we = !1, g("reading, ended or constructing", we);
    else if (we) {
      g("do read"), N.state |= he | ye, N.length === 0 && (N.state |= T);
      try {
        this._read(N.highWaterMark);
      } catch (jt) {
        R(this, jt);
      }
      N.state &= ~ye, N.reading || (P = Le(xe, N));
    }
    let Ee;
    return P > 0 ? Ee = $i(P, N) : Ee = null, Ee === null ? (N.needReadable = N.length <= N.highWaterMark, P = 0) : (N.length -= P, N.multiAwaitDrain ? N.awaitDrainWriters.clear() : N.awaitDrainWriters = null), N.length === 0 && (N.ended || (N.needReadable = !0), xe !== P && N.ended && Bi(this)), Ee !== null && !N.errorEmitted && !N.closeEmitted && (N.dataEmitted = !0, this.emit("data", Ee)), Ee;
  };
  function Fe(P, N) {
    if (g("onEofChunk"), !N.ended) {
      if (N.decoder) {
        const xe = N.decoder.end();
        xe && xe.length && (N.buffer.push(xe), N.length += N.objectMode ? 1 : xe.length);
      }
      N.ended = !0, N.sync ? Ot(P) : (N.needReadable = !1, N.emittedReadable = !0, Bn(P));
    }
  }
  function Ot(P) {
    const N = P._readableState;
    g("emitReadable", N.needReadable, N.emittedReadable), N.needReadable = !1, N.emittedReadable || (g("emitReadable", N.flowing), N.emittedReadable = !0, t.nextTick(Bn, P));
  }
  function Bn(P) {
    const N = P._readableState;
    g("emitReadable_", N.destroyed, N.length, N.ended), !N.destroyed && !N.errored && (N.length || N.ended) && (P.emit("readable"), N.emittedReadable = !1), N.needReadable = !N.flowing && !N.ended && N.length <= N.highWaterMark, Pt(P);
  }
  function wt(P, N) {
    !N.readingMore && N.constructed && (N.readingMore = !0, t.nextTick(mt, P, N));
  }
  function mt(P, N) {
    for (; !N.reading && !N.ended && (N.length < N.highWaterMark || N.flowing && N.length === 0); ) {
      const xe = N.length;
      if (g("maybeReadMore read 0"), P.read(0), xe === N.length)
        break;
    }
    N.readingMore = !1;
  }
  G.prototype._read = function(P) {
    throw new D("_read()");
  }, G.prototype.pipe = function(P, N) {
    const xe = this, we = this._readableState;
    we.pipes.length === 1 && (we.multiAwaitDrain || (we.multiAwaitDrain = !0, we.awaitDrainWriters = new l(we.awaitDrainWriters ? [we.awaitDrainWriters] : []))), we.pipes.push(P), g("pipe count=%d opts=%j", we.pipes.length, N);
    const jt = (!N || N.end !== !1) && P !== t.stdout && P !== t.stderr ? bd : ys;
    we.endEmitted ? t.nextTick(jt) : xe.once("end", jt), P.on("unpipe", on);
    function on(zi, zn) {
      g("onunpipe"), zi === xe && zn && zn.hasUnpiped === !1 && (zn.hasUnpiped = !0, Mw());
    }
    function bd() {
      g("onend"), P.end();
    }
    let Ui, yd = !1;
    function Mw() {
      g("cleanup"), P.removeListener("close", gl), P.removeListener("finish", bl), Ui && P.removeListener("drain", Ui), P.removeListener("error", ml), P.removeListener("unpipe", on), xe.removeListener("end", bd), xe.removeListener("end", ys), xe.removeListener("data", xd), yd = !0, Ui && we.awaitDrainWriters && (!P._writableState || P._writableState.needDrain) && Ui();
    }
    function vd() {
      yd || (we.pipes.length === 1 && we.pipes[0] === P ? (g("false write response, pause", 0), we.awaitDrainWriters = P, we.multiAwaitDrain = !1) : we.pipes.length > 1 && we.pipes.includes(P) && (g("false write response, pause", we.awaitDrainWriters.size), we.awaitDrainWriters.add(P)), xe.pause()), Ui || (Ui = Ae(xe, P), P.on("drain", Ui));
    }
    xe.on("data", xd);
    function xd(zi) {
      g("ondata");
      const zn = P.write(zi);
      g("dest.write", zn), zn === !1 && vd();
    }
    function ml(zi) {
      if (g("onerror", zi), ys(), P.removeListener("error", ml), P.listenerCount("error") === 0) {
        const zn = P._writableState || P._readableState;
        zn && !zn.errorEmitted ? R(P, zi) : P.emit("error", zi);
      }
    }
    v(P, "error", ml);
    function gl() {
      P.removeListener("finish", bl), ys();
    }
    P.once("close", gl);
    function bl() {
      g("onfinish"), P.removeListener("close", gl), ys();
    }
    P.once("finish", bl);
    function ys() {
      g("unpipe"), xe.unpipe(P);
    }
    return P.emit("pipe", xe), P.writableNeedDrain === !0 ? vd() : we.flowing || (g("pipe resume"), xe.resume()), P;
  };
  function Ae(P, N) {
    return function() {
      const we = P._readableState;
      we.awaitDrainWriters === N ? (g("pipeOnDrain", 1), we.awaitDrainWriters = null) : we.multiAwaitDrain && (g("pipeOnDrain", we.awaitDrainWriters.size), we.awaitDrainWriters.delete(N)), (!we.awaitDrainWriters || we.awaitDrainWriters.size === 0) && P.listenerCount("data") && P.resume();
    };
  }
  G.prototype.unpipe = function(P) {
    const N = this._readableState, xe = {
      hasUnpiped: !1
    };
    if (N.pipes.length === 0) return this;
    if (!P) {
      const Ee = N.pipes;
      N.pipes = [], this.pause();
      for (let jt = 0; jt < Ee.length; jt++)
        Ee[jt].emit("unpipe", this, {
          hasUnpiped: !1
        });
      return this;
    }
    const we = e(N.pipes, P);
    return we === -1 ? this : (N.pipes.splice(we, 1), N.pipes.length === 0 && this.pause(), P.emit("unpipe", this, xe), this);
  }, G.prototype.on = function(P, N) {
    const xe = x.prototype.on.call(this, P, N), we = this._readableState;
    return P === "data" ? (we.readableListening = this.listenerCount("readable") > 0, we.flowing !== !1 && this.resume()) : P === "readable" && !we.endEmitted && !we.readableListening && (we.readableListening = we.needReadable = !0, we.flowing = !1, we.emittedReadable = !1, g("on readable", we.length, we.reading), we.length ? Ot(this) : we.reading || t.nextTick(ie, this)), xe;
  }, G.prototype.addListener = G.prototype.on, G.prototype.removeListener = function(P, N) {
    const xe = x.prototype.removeListener.call(this, P, N);
    return P === "readable" && t.nextTick(qt, this), xe;
  }, G.prototype.off = G.prototype.removeListener, G.prototype.removeAllListeners = function(P) {
    const N = x.prototype.removeAllListeners.apply(this, arguments);
    return (P === "readable" || P === void 0) && t.nextTick(qt, this), N;
  };
  function qt(P) {
    const N = P._readableState;
    N.readableListening = P.listenerCount("readable") > 0, N.resumeScheduled && N[pe] === !1 ? N.flowing = !0 : P.listenerCount("data") > 0 ? P.resume() : N.readableListening || (N.flowing = null);
  }
  function ie(P) {
    g("readable nexttick read 0"), P.read(0);
  }
  G.prototype.resume = function() {
    const P = this._readableState;
    return P.flowing || (g("resume"), P.flowing = !P.readableListening, ue(this, P)), P[pe] = !1, this;
  };
  function ue(P, N) {
    N.resumeScheduled || (N.resumeScheduled = !0, t.nextTick(Re, P, N));
  }
  function Re(P, N) {
    g("resume", N.reading), N.reading || P.read(0), N.resumeScheduled = !1, P.emit("resume"), Pt(P), N.flowing && !N.reading && P.read(0);
  }
  G.prototype.pause = function() {
    return g("call pause flowing=%j", this._readableState.flowing), this._readableState.flowing !== !1 && (g("pause"), this._readableState.flowing = !1, this.emit("pause")), this._readableState[pe] = !0, this;
  };
  function Pt(P) {
    const N = P._readableState;
    for (g("flow", N.flowing); N.flowing && P.read() !== null; ) ;
  }
  G.prototype.wrap = function(P) {
    let N = !1;
    P.on("data", (we) => {
      !this.push(we) && P.pause && (N = !0, P.pause());
    }), P.on("end", () => {
      this.push(null);
    }), P.on("error", (we) => {
      R(this, we);
    }), P.on("close", () => {
      this.destroy();
    }), P.on("destroy", () => {
      this.destroy();
    }), this._read = () => {
      N && P.resume && (N = !1, P.resume());
    };
    const xe = a(P);
    for (let we = 1; we < xe.length; we++) {
      const Ee = xe[we];
      this[Ee] === void 0 && typeof P[Ee] == "function" && (this[Ee] = P[Ee].bind(P));
    }
    return this;
  }, G.prototype[p] = function() {
    return Ct(this);
  }, G.prototype.iterator = function(P) {
    return P !== void 0 && le(P, "options"), Ct(this, P);
  };
  function Ct(P, N) {
    typeof P.read != "function" && (P = G.wrap(P, {
      objectMode: !0
    }));
    const xe = Qa(P, N);
    return xe.stream = P, xe;
  }
  async function* Qa(P, N) {
    let xe = H;
    function we(on) {
      this === P ? (xe(), xe = H) : xe = on;
    }
    P.on("readable", we);
    let Ee;
    const jt = h(
      P,
      {
        writable: !1
      },
      (on) => {
        Ee = on ? L(Ee, on) : null, xe(), xe = H;
      }
    );
    try {
      for (; ; ) {
        const on = P.destroyed ? null : P.read();
        if (on !== null)
          yield on;
        else {
          if (Ee)
            throw Ee;
          if (Ee === null)
            return;
          await new c(we);
        }
      }
    } catch (on) {
      throw Ee = L(Ee, on), Ee;
    } finally {
      (Ee || (N == null ? void 0 : N.destroyOnReturn) !== !1) && (Ee === void 0 || P._readableState.autoDestroy) ? C.destroyer(P, null) : (P.off("readable", we), jt());
    }
  }
  s(G.prototype, {
    readable: {
      __proto__: null,
      get() {
        const P = this._readableState;
        return !!P && P.readable !== !1 && !P.destroyed && !P.errorEmitted && !P.endEmitted;
      },
      set(P) {
        this._readableState && (this._readableState.readable = !!P);
      }
    },
    readableDidRead: {
      __proto__: null,
      enumerable: !1,
      get: function() {
        return this._readableState.dataEmitted;
      }
    },
    readableAborted: {
      __proto__: null,
      enumerable: !1,
      get: function() {
        return !!(this._readableState.readable !== !1 && (this._readableState.destroyed || this._readableState.errored) && !this._readableState.endEmitted);
      }
    },
    readableHighWaterMark: {
      __proto__: null,
      enumerable: !1,
      get: function() {
        return this._readableState.highWaterMark;
      }
    },
    readableBuffer: {
      __proto__: null,
      enumerable: !1,
      get: function() {
        return this._readableState && this._readableState.buffer;
      }
    },
    readableFlowing: {
      __proto__: null,
      enumerable: !1,
      get: function() {
        return this._readableState.flowing;
      },
      set: function(P) {
        this._readableState && (this._readableState.flowing = P);
      }
    },
    readableLength: {
      __proto__: null,
      enumerable: !1,
      get() {
        return this._readableState.length;
      }
    },
    readableObjectMode: {
      __proto__: null,
      enumerable: !1,
      get() {
        return this._readableState ? this._readableState.objectMode : !1;
      }
    },
    readableEncoding: {
      __proto__: null,
      enumerable: !1,
      get() {
        return this._readableState ? this._readableState.encoding : null;
      }
    },
    errored: {
      __proto__: null,
      enumerable: !1,
      get() {
        return this._readableState ? this._readableState.errored : null;
      }
    },
    closed: {
      __proto__: null,
      get() {
        return this._readableState ? this._readableState.closed : !1;
      }
    },
    destroyed: {
      __proto__: null,
      enumerable: !1,
      get() {
        return this._readableState ? this._readableState.destroyed : !1;
      },
      set(P) {
        this._readableState && (this._readableState.destroyed = P);
      }
    },
    readableEnded: {
      __proto__: null,
      enumerable: !1,
      get() {
        return this._readableState ? this._readableState.endEmitted : !1;
      }
    }
  }), s(ee.prototype, {
    // Legacy getter for `pipesCount`.
    pipesCount: {
      __proto__: null,
      get() {
        return this.pipes.length;
      }
    },
    // Legacy property for `paused`.
    paused: {
      __proto__: null,
      get() {
        return this[pe] !== !1;
      },
      set(P) {
        this[pe] = !!P;
      }
    }
  }), G._fromList = $i;
  function $i(P, N) {
    if (N.length === 0) return null;
    let xe;
    return N.objectMode ? xe = N.buffer.shift() : !P || P >= N.length ? (N.decoder ? xe = N.buffer.join("") : N.buffer.length === 1 ? xe = N.buffer.first() : xe = N.buffer.concat(N.length), N.buffer.clear()) : xe = N.buffer.consume(P, N.decoder), xe;
  }
  function Bi(P) {
    const N = P._readableState;
    g("endReadable", N.endEmitted), N.endEmitted || (N.ended = !0, t.nextTick(bs, N, P));
  }
  function bs(P, N) {
    if (g("endReadableNT", P.endEmitted, P.length), !P.errored && !P.closeEmitted && !P.endEmitted && P.length === 0) {
      if (P.endEmitted = !0, N.emit("end"), N.writable && N.allowHalfOpen === !1)
        t.nextTick(xr, N);
      else if (P.autoDestroy) {
        const xe = N._writableState;
        (!xe || xe.autoDestroy && // We don't expect the writable to ever 'finish'
        // if writable is explicitly set to false.
        (xe.finished || xe.writable === !1)) && N.destroy();
      }
    }
  }
  function xr(P) {
    P.writable && !P.writableEnded && !P.destroyed && P.end();
  }
  G.from = function(P, N) {
    return k(G, P, N);
  };
  let Un;
  function eo() {
    return Un === void 0 && (Un = {}), Un;
  }
  return G.fromWeb = function(P, N) {
    return eo().newStreamReadableFromReadableStream(P, N);
  }, G.toWeb = function(P, N) {
    return eo().newReadableStreamFromStreamReadable(P, N);
  }, G.wrap = function(P, N) {
    var xe, we;
    return new G({
      objectMode: (xe = (we = P.readableObjectMode) !== null && we !== void 0 ? we : P.objectMode) !== null && xe !== void 0 ? xe : !0,
      ...N,
      destroy(Ee, jt) {
        C.destroyer(P, Ee), jt(Ee);
      }
    }).wrap(P);
  }, ju;
}
var Lu, qm;
function Wf() {
  if (qm) return Lu;
  qm = 1;
  const t = yr(), {
    ArrayPrototypeSlice: e,
    Error: n,
    FunctionPrototypeSymbolHasInstance: i,
    ObjectDefineProperty: r,
    ObjectDefineProperties: s,
    ObjectSetPrototypeOf: a,
    StringPrototypeToLowerCase: o,
    Symbol: c,
    SymbolHasInstance: l
  } = st();
  Lu = le, le.WritableState = U;
  const { EventEmitter: u } = Ii, p = zf().Stream, { Buffer: d } = $n, b = ps(), { addAbortSignal: x } = el(), { getHighWaterMark: v, getDefaultHighWaterMark: y } = tl(), {
    ERR_INVALID_ARG_TYPE: f,
    ERR_METHOD_NOT_IMPLEMENTED: h,
    ERR_MULTIPLE_CALLBACK: g,
    ERR_STREAM_CANNOT_PIPE: A,
    ERR_STREAM_DESTROYED: C,
    ERR_STREAM_ALREADY_FINISHED: V,
    ERR_STREAM_NULL_VALUES: K,
    ERR_STREAM_WRITE_AFTER_END: L,
    ERR_UNKNOWN_ENCODING: X
  } = Wt().codes, { errorOrDestroy: D } = b;
  a(le.prototype, p.prototype), a(le, p);
  function B() {
  }
  const Y = c("kOnFinished");
  function U($, j, E) {
    typeof E != "boolean" && (E = j instanceof Jn()), this.objectMode = !!($ && $.objectMode), E && (this.objectMode = this.objectMode || !!($ && $.writableObjectMode)), this.highWaterMark = $ ? v(this, $, "writableHighWaterMark", E) : y(!1), this.finalCalled = !1, this.needDrain = !1, this.ending = !1, this.ended = !1, this.finished = !1, this.destroyed = !1;
    const I = !!($ && $.decodeStrings === !1);
    this.decodeStrings = !I, this.defaultEncoding = $ && $.defaultEncoding || "utf8", this.length = 0, this.writing = !1, this.corked = 0, this.sync = !0, this.bufferProcessing = !1, this.onwrite = R.bind(void 0, j), this.writecb = null, this.writelen = 0, this.afterWriteTickInfo = null, ae(this), this.pendingcb = 0, this.constructed = !0, this.prefinished = !1, this.errorEmitted = !1, this.emitClose = !$ || $.emitClose !== !1, this.autoDestroy = !$ || $.autoDestroy !== !1, this.errored = null, this.closed = !1, this.closeEmitted = !1, this[Y] = [];
  }
  function ae($) {
    $.buffered = [], $.bufferedIndex = 0, $.allBuffers = !0, $.allNoop = !0;
  }
  U.prototype.getBuffer = function() {
    return e(this.buffered, this.bufferedIndex);
  }, r(U.prototype, "bufferedRequestCount", {
    __proto__: null,
    get() {
      return this.buffered.length - this.bufferedIndex;
    }
  });
  function le($) {
    const j = this instanceof Jn();
    if (!j && !i(le, this)) return new le($);
    this._writableState = new U($, this, j), $ && (typeof $.write == "function" && (this._write = $.write), typeof $.writev == "function" && (this._writev = $.writev), typeof $.destroy == "function" && (this._destroy = $.destroy), typeof $.final == "function" && (this._final = $.final), typeof $.construct == "function" && (this._construct = $.construct), $.signal && x($.signal, this)), p.call(this, $), b.construct(this, () => {
      const E = this._writableState;
      E.writing || he(this, E), S(this, E);
    });
  }
  r(le, l, {
    __proto__: null,
    value: function($) {
      return i(this, $) ? !0 : this !== le ? !1 : $ && $._writableState instanceof U;
    }
  }), le.prototype.pipe = function() {
    D(this, new A());
  };
  function pe($, j, E, I) {
    const M = $._writableState;
    if (typeof E == "function")
      I = E, E = M.defaultEncoding;
    else {
      if (!E) E = M.defaultEncoding;
      else if (E !== "buffer" && !d.isEncoding(E)) throw new X(E);
      typeof I != "function" && (I = B);
    }
    if (j === null)
      throw new K();
    if (!M.objectMode)
      if (typeof j == "string")
        M.decodeStrings !== !1 && (j = d.from(j, E), E = "buffer");
      else if (j instanceof d)
        E = "buffer";
      else if (p._isUint8Array(j))
        j = p._uint8ArrayToBuffer(j), E = "buffer";
      else
        throw new f("chunk", ["string", "Buffer", "Uint8Array"], j);
    let O;
    return M.ending ? O = new L() : M.destroyed && (O = new C("write")), O ? (t.nextTick(I, O), D($, O, !0), O) : (M.pendingcb++, z($, M, j, E, I));
  }
  le.prototype.write = function($, j, E) {
    return pe(this, $, j, E) === !0;
  }, le.prototype.cork = function() {
    this._writableState.corked++;
  }, le.prototype.uncork = function() {
    const $ = this._writableState;
    $.corked && ($.corked--, $.writing || he(this, $));
  }, le.prototype.setDefaultEncoding = function(j) {
    if (typeof j == "string" && (j = o(j)), !d.isEncoding(j)) throw new X(j);
    return this._writableState.defaultEncoding = j, this;
  };
  function z($, j, E, I, M) {
    const O = j.objectMode ? 1 : E.length;
    j.length += O;
    const w = j.length < j.highWaterMark;
    return w || (j.needDrain = !0), j.writing || j.corked || j.errored || !j.constructed ? (j.buffered.push({
      chunk: E,
      encoding: I,
      callback: M
    }), j.allBuffers && I !== "buffer" && (j.allBuffers = !1), j.allNoop && M !== B && (j.allNoop = !1)) : (j.writelen = O, j.writecb = M, j.writing = !0, j.sync = !0, $._write(E, I, j.onwrite), j.sync = !1), w && !j.errored && !j.destroyed;
  }
  function k($, j, E, I, M, O, w) {
    j.writelen = I, j.writecb = w, j.writing = !0, j.sync = !0, j.destroyed ? j.onwrite(new C("write")) : E ? $._writev(M, j.onwrite) : $._write(M, O, j.onwrite), j.sync = !1;
  }
  function H($, j, E, I) {
    --j.pendingcb, I(E), te(j), D($, E);
  }
  function R($, j) {
    const E = $._writableState, I = E.sync, M = E.writecb;
    if (typeof M != "function") {
      D($, new g());
      return;
    }
    E.writing = !1, E.writecb = null, E.length -= E.writelen, E.writelen = 0, j ? (j.stack, E.errored || (E.errored = j), $._readableState && !$._readableState.errored && ($._readableState.errored = j), I ? t.nextTick(H, $, E, j, M) : H($, E, j, M)) : (E.buffered.length > E.bufferedIndex && he($, E), I ? E.afterWriteTickInfo !== null && E.afterWriteTickInfo.cb === M ? E.afterWriteTickInfo.count++ : (E.afterWriteTickInfo = {
      count: 1,
      cb: M,
      stream: $,
      state: E
    }, t.nextTick(Z, E.afterWriteTickInfo)) : se($, E, 1, M));
  }
  function Z({ stream: $, state: j, count: E, cb: I }) {
    return j.afterWriteTickInfo = null, se($, j, E, I);
  }
  function se($, j, E, I) {
    for (!j.ending && !$.destroyed && j.length === 0 && j.needDrain && (j.needDrain = !1, $.emit("drain")); E-- > 0; )
      j.pendingcb--, I();
    j.destroyed && te(j), S($, j);
  }
  function te($) {
    if ($.writing)
      return;
    for (let M = $.bufferedIndex; M < $.buffered.length; ++M) {
      var j;
      const { chunk: O, callback: w } = $.buffered[M], q = $.objectMode ? 1 : O.length;
      $.length -= q, w(
        (j = $.errored) !== null && j !== void 0 ? j : new C("write")
      );
    }
    const E = $[Y].splice(0);
    for (let M = 0; M < E.length; M++) {
      var I;
      E[M](
        (I = $.errored) !== null && I !== void 0 ? I : new C("end")
      );
    }
    ae($);
  }
  function he($, j) {
    if (j.corked || j.bufferProcessing || j.destroyed || !j.constructed)
      return;
    const { buffered: E, bufferedIndex: I, objectMode: M } = j, O = E.length - I;
    if (!O)
      return;
    let w = I;
    if (j.bufferProcessing = !0, O > 1 && $._writev) {
      j.pendingcb -= O - 1;
      const q = j.allNoop ? B : (G) => {
        for (let de = w; de < E.length; ++de)
          E[de].callback(G);
      }, ee = j.allNoop && w === 0 ? E : e(E, w);
      ee.allBuffers = j.allBuffers, k($, j, !0, j.length, ee, "", q), ae(j);
    } else {
      do {
        const { chunk: q, encoding: ee, callback: G } = E[w];
        E[w++] = null;
        const de = M ? 1 : q.length;
        k($, j, !1, de, q, ee, G);
      } while (w < E.length && !j.writing);
      w === E.length ? ae(j) : w > 256 ? (E.splice(0, w), j.bufferedIndex = 0) : j.bufferedIndex = w;
    }
    j.bufferProcessing = !1;
  }
  le.prototype._write = function($, j, E) {
    if (this._writev)
      this._writev(
        [
          {
            chunk: $,
            encoding: j
          }
        ],
        E
      );
    else
      throw new h("_write()");
  }, le.prototype._writev = null, le.prototype.end = function($, j, E) {
    const I = this._writableState;
    typeof $ == "function" ? (E = $, $ = null, j = null) : typeof j == "function" && (E = j, j = null);
    let M;
    if ($ != null) {
      const O = pe(this, $, j);
      O instanceof n && (M = O);
    }
    return I.corked && (I.corked = 1, this.uncork()), M || (!I.errored && !I.ending ? (I.ending = !0, S(this, I, !0), I.ended = !0) : I.finished ? M = new V("end") : I.destroyed && (M = new C("end"))), typeof E == "function" && (M || I.finished ? t.nextTick(E, M) : I[Y].push(E)), this;
  };
  function Se($) {
    return $.ending && !$.destroyed && $.constructed && $.length === 0 && !$.errored && $.buffered.length === 0 && !$.finished && !$.writing && !$.errorEmitted && !$.closeEmitted;
  }
  function ye($, j) {
    let E = !1;
    function I(M) {
      if (E) {
        D($, M ?? g());
        return;
      }
      if (E = !0, j.pendingcb--, M) {
        const O = j[Y].splice(0);
        for (let w = 0; w < O.length; w++)
          O[w](M);
        D($, M, j.sync);
      } else Se(j) && (j.prefinished = !0, $.emit("prefinish"), j.pendingcb++, t.nextTick(W, $, j));
    }
    j.sync = !0, j.pendingcb++;
    try {
      $._final(I);
    } catch (M) {
      I(M);
    }
    j.sync = !1;
  }
  function T($, j) {
    !j.prefinished && !j.finalCalled && (typeof $._final == "function" && !j.destroyed ? (j.finalCalled = !0, ye($, j)) : (j.prefinished = !0, $.emit("prefinish")));
  }
  function S($, j, E) {
    Se(j) && (T($, j), j.pendingcb === 0 && (E ? (j.pendingcb++, t.nextTick(
      (I, M) => {
        Se(M) ? W(I, M) : M.pendingcb--;
      },
      $,
      j
    )) : Se(j) && (j.pendingcb++, W($, j))));
  }
  function W($, j) {
    j.pendingcb--, j.finished = !0;
    const E = j[Y].splice(0);
    for (let I = 0; I < E.length; I++)
      E[I]();
    if ($.emit("finish"), j.autoDestroy) {
      const I = $._readableState;
      (!I || I.autoDestroy && // We don't expect the readable to ever 'end'
      // if readable is explicitly set to false.
      (I.endEmitted || I.readable === !1)) && $.destroy();
    }
  }
  s(le.prototype, {
    closed: {
      __proto__: null,
      get() {
        return this._writableState ? this._writableState.closed : !1;
      }
    },
    destroyed: {
      __proto__: null,
      get() {
        return this._writableState ? this._writableState.destroyed : !1;
      },
      set($) {
        this._writableState && (this._writableState.destroyed = $);
      }
    },
    writable: {
      __proto__: null,
      get() {
        const $ = this._writableState;
        return !!$ && $.writable !== !1 && !$.destroyed && !$.errored && !$.ending && !$.ended;
      },
      set($) {
        this._writableState && (this._writableState.writable = !!$);
      }
    },
    writableFinished: {
      __proto__: null,
      get() {
        return this._writableState ? this._writableState.finished : !1;
      }
    },
    writableObjectMode: {
      __proto__: null,
      get() {
        return this._writableState ? this._writableState.objectMode : !1;
      }
    },
    writableBuffer: {
      __proto__: null,
      get() {
        return this._writableState && this._writableState.getBuffer();
      }
    },
    writableEnded: {
      __proto__: null,
      get() {
        return this._writableState ? this._writableState.ending : !1;
      }
    },
    writableNeedDrain: {
      __proto__: null,
      get() {
        const $ = this._writableState;
        return $ ? !$.destroyed && !$.ending && $.needDrain : !1;
      }
    },
    writableHighWaterMark: {
      __proto__: null,
      get() {
        return this._writableState && this._writableState.highWaterMark;
      }
    },
    writableCorked: {
      __proto__: null,
      get() {
        return this._writableState ? this._writableState.corked : 0;
      }
    },
    writableLength: {
      __proto__: null,
      get() {
        return this._writableState && this._writableState.length;
      }
    },
    errored: {
      __proto__: null,
      enumerable: !1,
      get() {
        return this._writableState ? this._writableState.errored : null;
      }
    },
    writableAborted: {
      __proto__: null,
      enumerable: !1,
      get: function() {
        return !!(this._writableState.writable !== !1 && (this._writableState.destroyed || this._writableState.errored) && !this._writableState.finished);
      }
    }
  });
  const J = b.destroy;
  le.prototype.destroy = function($, j) {
    const E = this._writableState;
    return !E.destroyed && (E.bufferedIndex < E.buffered.length || E[Y].length) && t.nextTick(te, E), J.call(this, $, j), this;
  }, le.prototype._undestroy = b.undestroy, le.prototype._destroy = function($, j) {
    j($);
  }, le.prototype[u.captureRejectionSymbol] = function($) {
    this.destroy($);
  };
  let ge;
  function oe() {
    return ge === void 0 && (ge = {}), ge;
  }
  return le.fromWeb = function($, j) {
    return oe().newStreamWritableFromWritableStream($, j);
  }, le.toWeb = function($) {
    return oe().newWritableStreamFromStreamWritable($);
  }, Lu;
}
var Nu, Gm;
function tI() {
  if (Gm) return Nu;
  Gm = 1;
  const t = yr(), e = $n, {
    isReadable: n,
    isWritable: i,
    isIterable: r,
    isNodeStream: s,
    isReadableNodeStream: a,
    isWritableNodeStream: o,
    isDuplexNodeStream: c,
    isReadableStream: l,
    isWritableStream: u
  } = ti(), p = Li(), {
    AbortError: d,
    codes: { ERR_INVALID_ARG_TYPE: b, ERR_INVALID_RETURN_VALUE: x }
  } = Wt(), { destroyer: v } = ps(), y = Jn(), f = nl(), h = Wf(), { createDeferredPromise: g } = Kt(), A = Nv(), C = globalThis.Blob || e.Blob, V = typeof C < "u" ? function(U) {
    return U instanceof C;
  } : function(U) {
    return !1;
  }, K = globalThis.AbortController || Ys.AbortController, { FunctionPrototypeCall: L } = st();
  class X extends y {
    constructor(U) {
      super(U), (U == null ? void 0 : U.readable) === !1 && (this._readableState.readable = !1, this._readableState.ended = !0, this._readableState.endEmitted = !0), (U == null ? void 0 : U.writable) === !1 && (this._writableState.writable = !1, this._writableState.ending = !0, this._writableState.ended = !0, this._writableState.finished = !0);
    }
  }
  Nu = function Y(U, ae) {
    if (c(U))
      return U;
    if (a(U))
      return B({
        readable: U
      });
    if (o(U))
      return B({
        writable: U
      });
    if (s(U))
      return B({
        writable: !1,
        readable: !1
      });
    if (l(U))
      return B({
        readable: f.fromWeb(U)
      });
    if (u(U))
      return B({
        writable: h.fromWeb(U)
      });
    if (typeof U == "function") {
      const { value: pe, write: z, final: k, destroy: H } = D(U);
      if (r(pe))
        return A(X, pe, {
          // TODO (ronag): highWaterMark?
          objectMode: !0,
          write: z,
          final: k,
          destroy: H
        });
      const R = pe == null ? void 0 : pe.then;
      if (typeof R == "function") {
        let Z;
        const se = L(
          R,
          pe,
          (te) => {
            if (te != null)
              throw new x("nully", "body", te);
          },
          (te) => {
            v(Z, te);
          }
        );
        return Z = new X({
          // TODO (ronag): highWaterMark?
          objectMode: !0,
          readable: !1,
          write: z,
          final(te) {
            k(async () => {
              try {
                await se, t.nextTick(te, null);
              } catch (he) {
                t.nextTick(te, he);
              }
            });
          },
          destroy: H
        });
      }
      throw new x("Iterable, AsyncIterable or AsyncFunction", ae, pe);
    }
    if (V(U))
      return Y(U.arrayBuffer());
    if (r(U))
      return A(X, U, {
        // TODO (ronag): highWaterMark?
        objectMode: !0,
        writable: !1
      });
    if (l(U == null ? void 0 : U.readable) && u(U == null ? void 0 : U.writable))
      return X.fromWeb(U);
    if (typeof (U == null ? void 0 : U.writable) == "object" || typeof (U == null ? void 0 : U.readable) == "object") {
      const pe = U != null && U.readable ? a(U == null ? void 0 : U.readable) ? U == null ? void 0 : U.readable : Y(U.readable) : void 0, z = U != null && U.writable ? o(U == null ? void 0 : U.writable) ? U == null ? void 0 : U.writable : Y(U.writable) : void 0;
      return B({
        readable: pe,
        writable: z
      });
    }
    const le = U == null ? void 0 : U.then;
    if (typeof le == "function") {
      let pe;
      return L(
        le,
        U,
        (z) => {
          z != null && pe.push(z), pe.push(null);
        },
        (z) => {
          v(pe, z);
        }
      ), pe = new X({
        objectMode: !0,
        writable: !1,
        read() {
        }
      });
    }
    throw new b(
      ae,
      [
        "Blob",
        "ReadableStream",
        "WritableStream",
        "Stream",
        "Iterable",
        "AsyncIterable",
        "Function",
        "{ readable, writable } pair",
        "Promise"
      ],
      U
    );
  };
  function D(Y) {
    let { promise: U, resolve: ae } = g();
    const le = new K(), pe = le.signal;
    return {
      value: Y(
        async function* () {
          for (; ; ) {
            const k = U;
            U = null;
            const { chunk: H, done: R, cb: Z } = await k;
            if (t.nextTick(Z), R) return;
            if (pe.aborted)
              throw new d(void 0, {
                cause: pe.reason
              });
            ({ promise: U, resolve: ae } = g()), yield H;
          }
        }(),
        {
          signal: pe
        }
      ),
      write(k, H, R) {
        const Z = ae;
        ae = null, Z({
          chunk: k,
          done: !1,
          cb: R
        });
      },
      final(k) {
        const H = ae;
        ae = null, H({
          done: !0,
          cb: k
        });
      },
      destroy(k, H) {
        le.abort(), H(k);
      }
    };
  }
  function B(Y) {
    const U = Y.readable && typeof Y.readable.read != "function" ? f.wrap(Y.readable) : Y.readable, ae = Y.writable;
    let le = !!n(U), pe = !!i(ae), z, k, H, R, Z;
    function se(te) {
      const he = R;
      R = null, he ? he(te) : te && Z.destroy(te);
    }
    return Z = new X({
      // TODO (ronag): highWaterMark?
      readableObjectMode: !!(U != null && U.readableObjectMode),
      writableObjectMode: !!(ae != null && ae.writableObjectMode),
      readable: le,
      writable: pe
    }), pe && (p(ae, (te) => {
      pe = !1, te && v(U, te), se(te);
    }), Z._write = function(te, he, Se) {
      ae.write(te, he) ? Se() : z = Se;
    }, Z._final = function(te) {
      ae.end(), k = te;
    }, ae.on("drain", function() {
      if (z) {
        const te = z;
        z = null, te();
      }
    }), ae.on("finish", function() {
      if (k) {
        const te = k;
        k = null, te();
      }
    })), le && (p(U, (te) => {
      le = !1, te && v(U, te), se(te);
    }), U.on("readable", function() {
      if (H) {
        const te = H;
        H = null, te();
      }
    }), U.on("end", function() {
      Z.push(null);
    }), Z._read = function() {
      for (; ; ) {
        const te = U.read();
        if (te === null) {
          H = Z._read;
          return;
        }
        if (!Z.push(te))
          return;
      }
    }), Z._destroy = function(te, he) {
      !te && R !== null && (te = new d()), H = null, z = null, k = null, R === null ? he(te) : (R = he, v(ae, te), v(U, te));
    }, Z;
  }
  return Nu;
}
var Fu, Hm;
function Jn() {
  if (Hm) return Fu;
  Hm = 1;
  const {
    ObjectDefineProperties: t,
    ObjectGetOwnPropertyDescriptor: e,
    ObjectKeys: n,
    ObjectSetPrototypeOf: i
  } = st();
  Fu = a;
  const r = nl(), s = Wf();
  i(a.prototype, r.prototype), i(a, r);
  {
    const u = n(s.prototype);
    for (let p = 0; p < u.length; p++) {
      const d = u[p];
      a.prototype[d] || (a.prototype[d] = s.prototype[d]);
    }
  }
  function a(u) {
    if (!(this instanceof a)) return new a(u);
    r.call(this, u), s.call(this, u), u ? (this.allowHalfOpen = u.allowHalfOpen !== !1, u.readable === !1 && (this._readableState.readable = !1, this._readableState.ended = !0, this._readableState.endEmitted = !0), u.writable === !1 && (this._writableState.writable = !1, this._writableState.ending = !0, this._writableState.ended = !0, this._writableState.finished = !0)) : this.allowHalfOpen = !0;
  }
  t(a.prototype, {
    writable: {
      __proto__: null,
      ...e(s.prototype, "writable")
    },
    writableHighWaterMark: {
      __proto__: null,
      ...e(s.prototype, "writableHighWaterMark")
    },
    writableObjectMode: {
      __proto__: null,
      ...e(s.prototype, "writableObjectMode")
    },
    writableBuffer: {
      __proto__: null,
      ...e(s.prototype, "writableBuffer")
    },
    writableLength: {
      __proto__: null,
      ...e(s.prototype, "writableLength")
    },
    writableFinished: {
      __proto__: null,
      ...e(s.prototype, "writableFinished")
    },
    writableCorked: {
      __proto__: null,
      ...e(s.prototype, "writableCorked")
    },
    writableEnded: {
      __proto__: null,
      ...e(s.prototype, "writableEnded")
    },
    writableNeedDrain: {
      __proto__: null,
      ...e(s.prototype, "writableNeedDrain")
    },
    destroyed: {
      __proto__: null,
      get() {
        return this._readableState === void 0 || this._writableState === void 0 ? !1 : this._readableState.destroyed && this._writableState.destroyed;
      },
      set(u) {
        this._readableState && this._writableState && (this._readableState.destroyed = u, this._writableState.destroyed = u);
      }
    }
  });
  let o;
  function c() {
    return o === void 0 && (o = {}), o;
  }
  a.fromWeb = function(u, p) {
    return c().newStreamDuplexFromReadableWritablePair(u, p);
  }, a.toWeb = function(u) {
    return c().newReadableWritablePairFromDuplex(u);
  };
  let l;
  return a.from = function(u) {
    return l || (l = tI()), l(u, "body");
  }, Fu;
}
var Mu, Vm;
function Fv() {
  if (Vm) return Mu;
  Vm = 1;
  const { ObjectSetPrototypeOf: t, Symbol: e } = st();
  Mu = a;
  const { ERR_METHOD_NOT_IMPLEMENTED: n } = Wt().codes, i = Jn(), { getHighWaterMark: r } = tl();
  t(a.prototype, i.prototype), t(a, i);
  const s = e("kCallback");
  function a(l) {
    if (!(this instanceof a)) return new a(l);
    const u = l ? r(this, l, "readableHighWaterMark", !0) : null;
    u === 0 && (l = {
      ...l,
      highWaterMark: null,
      readableHighWaterMark: u,
      // TODO (ronag): 0 is not optimal since we have
      // a "bug" where we check needDrain before calling _write and not after.
      // Refs: https://github.com/nodejs/node/pull/32887
      // Refs: https://github.com/nodejs/node/pull/35941
      writableHighWaterMark: l.writableHighWaterMark || 0
    }), i.call(this, l), this._readableState.sync = !1, this[s] = null, l && (typeof l.transform == "function" && (this._transform = l.transform), typeof l.flush == "function" && (this._flush = l.flush)), this.on("prefinish", c);
  }
  function o(l) {
    typeof this._flush == "function" && !this.destroyed ? this._flush((u, p) => {
      if (u) {
        l ? l(u) : this.destroy(u);
        return;
      }
      p != null && this.push(p), this.push(null), l && l();
    }) : (this.push(null), l && l());
  }
  function c() {
    this._final !== o && o.call(this);
  }
  return a.prototype._final = o, a.prototype._transform = function(l, u, p) {
    throw new n("_transform()");
  }, a.prototype._write = function(l, u, p) {
    const d = this._readableState, b = this._writableState, x = d.length;
    this._transform(l, u, (v, y) => {
      if (v) {
        p(v);
        return;
      }
      y != null && this.push(y), b.ended || // Backwards compat.
      x === d.length || // Backwards compat.
      d.length < d.highWaterMark ? p() : this[s] = p;
    });
  }, a.prototype._read = function() {
    if (this[s]) {
      const l = this[s];
      this[s] = null, l();
    }
  }, Mu;
}
var $u, Km;
function Mv() {
  if (Km) return $u;
  Km = 1;
  const { ObjectSetPrototypeOf: t } = st();
  $u = n;
  const e = Fv();
  t(n.prototype, e.prototype), t(n, e);
  function n(i) {
    if (!(this instanceof n)) return new n(i);
    e.call(this, i);
  }
  return n.prototype._transform = function(i, r, s) {
    s(null, i);
  }, $u;
}
var Bu, Ym;
function qf() {
  if (Ym) return Bu;
  Ym = 1;
  const t = yr(), { ArrayIsArray: e, Promise: n, SymbolAsyncIterator: i, SymbolDispose: r } = st(), s = Li(), { once: a } = Kt(), o = ps(), c = Jn(), {
    aggregateTwoErrors: l,
    codes: {
      ERR_INVALID_ARG_TYPE: u,
      ERR_INVALID_RETURN_VALUE: p,
      ERR_MISSING_ARGS: d,
      ERR_STREAM_DESTROYED: b,
      ERR_STREAM_PREMATURE_CLOSE: x
    },
    AbortError: v
  } = Wt(), { validateFunction: y, validateAbortSignal: f } = za(), {
    isIterable: h,
    isReadable: g,
    isReadableNodeStream: A,
    isNodeStream: C,
    isTransformStream: V,
    isWebStream: K,
    isReadableStream: L,
    isReadableFinished: X
  } = ti(), D = globalThis.AbortController || Ys.AbortController;
  let B, Y, U;
  function ae(te, he, Se) {
    let ye = !1;
    te.on("close", () => {
      ye = !0;
    });
    const T = s(
      te,
      {
        readable: he,
        writable: Se
      },
      (S) => {
        ye = !S;
      }
    );
    return {
      destroy: (S) => {
        ye || (ye = !0, o.destroyer(te, S || new b("pipe")));
      },
      cleanup: T
    };
  }
  function le(te) {
    return y(te[te.length - 1], "streams[stream.length - 1]"), te.pop();
  }
  function pe(te) {
    if (h(te))
      return te;
    if (A(te))
      return z(te);
    throw new u("val", ["Readable", "Iterable", "AsyncIterable"], te);
  }
  async function* z(te) {
    Y || (Y = nl()), yield* Y.prototype[i].call(te);
  }
  async function k(te, he, Se, { end: ye }) {
    let T, S = null;
    const W = (oe) => {
      if (oe && (T = oe), S) {
        const $ = S;
        S = null, $();
      }
    }, J = () => new n((oe, $) => {
      T ? $(T) : S = () => {
        T ? $(T) : oe();
      };
    });
    he.on("drain", W);
    const ge = s(
      he,
      {
        readable: !1
      },
      W
    );
    try {
      he.writableNeedDrain && await J();
      for await (const oe of te)
        he.write(oe) || await J();
      ye && (he.end(), await J()), Se();
    } catch (oe) {
      Se(T !== oe ? l(T, oe) : oe);
    } finally {
      ge(), he.off("drain", W);
    }
  }
  async function H(te, he, Se, { end: ye }) {
    V(he) && (he = he.writable);
    const T = he.getWriter();
    try {
      for await (const S of te)
        await T.ready, T.write(S).catch(() => {
        });
      await T.ready, ye && await T.close(), Se();
    } catch (S) {
      try {
        await T.abort(S), Se(S);
      } catch (W) {
        Se(W);
      }
    }
  }
  function R(...te) {
    return Z(te, a(le(te)));
  }
  function Z(te, he, Se) {
    if (te.length === 1 && e(te[0]) && (te = te[0]), te.length < 2)
      throw new d("streams");
    const ye = new D(), T = ye.signal, S = Se == null ? void 0 : Se.signal, W = [];
    f(S, "options.signal");
    function J() {
      M(new v());
    }
    U = U || Kt().addAbortListener;
    let ge;
    S && (ge = U(S, J));
    let oe, $;
    const j = [];
    let E = 0;
    function I(ee) {
      M(ee, --E === 0);
    }
    function M(ee, G) {
      var de;
      if (ee && (!oe || oe.code === "ERR_STREAM_PREMATURE_CLOSE") && (oe = ee), !(!oe && !G)) {
        for (; j.length; )
          j.shift()(oe);
        (de = ge) === null || de === void 0 || de[r](), ye.abort(), G && (oe || W.forEach((ve) => ve()), t.nextTick(he, oe, $));
      }
    }
    let O;
    for (let ee = 0; ee < te.length; ee++) {
      const G = te[ee], de = ee < te.length - 1, ve = ee > 0, me = de || (Se == null ? void 0 : Se.end) !== !1, Te = ee === te.length - 1;
      if (C(G)) {
        let Le = function(Fe) {
          Fe && Fe.name !== "AbortError" && Fe.code !== "ERR_STREAM_PREMATURE_CLOSE" && I(Fe);
        };
        if (me) {
          const { destroy: Fe, cleanup: Ot } = ae(G, de, ve);
          j.push(Fe), g(G) && Te && W.push(Ot);
        }
        G.on("error", Le), g(G) && Te && W.push(() => {
          G.removeListener("error", Le);
        });
      }
      if (ee === 0)
        if (typeof G == "function") {
          if (O = G({
            signal: T
          }), !h(O))
            throw new p("Iterable, AsyncIterable or Stream", "source", O);
        } else h(G) || A(G) || V(G) ? O = G : O = c.from(G);
      else if (typeof G == "function") {
        if (V(O)) {
          var w;
          O = pe((w = O) === null || w === void 0 ? void 0 : w.readable);
        } else
          O = pe(O);
        if (O = G(O, {
          signal: T
        }), de) {
          if (!h(O, !0))
            throw new p("AsyncIterable", `transform[${ee - 1}]`, O);
        } else {
          var q;
          B || (B = Mv());
          const Le = new B({
            objectMode: !0
          }), Fe = (q = O) === null || q === void 0 ? void 0 : q.then;
          if (typeof Fe == "function")
            E++, Fe.call(
              O,
              (wt) => {
                $ = wt, wt != null && Le.write(wt), me && Le.end(), t.nextTick(I);
              },
              (wt) => {
                Le.destroy(wt), t.nextTick(I, wt);
              }
            );
          else if (h(O, !0))
            E++, k(O, Le, I, {
              end: me
            });
          else if (L(O) || V(O)) {
            const wt = O.readable || O;
            E++, k(wt, Le, I, {
              end: me
            });
          } else
            throw new p("AsyncIterable or Promise", "destination", O);
          O = Le;
          const { destroy: Ot, cleanup: Bn } = ae(O, !1, !0);
          j.push(Ot), Te && W.push(Bn);
        }
      } else if (C(G)) {
        if (A(O)) {
          E += 2;
          const Le = se(O, G, I, {
            end: me
          });
          g(G) && Te && W.push(Le);
        } else if (V(O) || L(O)) {
          const Le = O.readable || O;
          E++, k(Le, G, I, {
            end: me
          });
        } else if (h(O))
          E++, k(O, G, I, {
            end: me
          });
        else
          throw new u(
            "val",
            ["Readable", "Iterable", "AsyncIterable", "ReadableStream", "TransformStream"],
            O
          );
        O = G;
      } else if (K(G)) {
        if (A(O))
          E++, H(pe(O), G, I, {
            end: me
          });
        else if (L(O) || h(O))
          E++, H(O, G, I, {
            end: me
          });
        else if (V(O))
          E++, H(O.readable, G, I, {
            end: me
          });
        else
          throw new u(
            "val",
            ["Readable", "Iterable", "AsyncIterable", "ReadableStream", "TransformStream"],
            O
          );
        O = G;
      } else
        O = c.from(G);
    }
    return (T != null && T.aborted || S != null && S.aborted) && t.nextTick(J), O;
  }
  function se(te, he, Se, { end: ye }) {
    let T = !1;
    if (he.on("close", () => {
      T || Se(new x());
    }), te.pipe(he, {
      end: !1
    }), ye) {
      let S = function() {
        T = !0, he.end();
      };
      X(te) ? t.nextTick(S) : te.once("end", S);
    } else
      Se();
    return s(
      te,
      {
        readable: !0,
        writable: !1
      },
      (S) => {
        const W = te._readableState;
        S && S.code === "ERR_STREAM_PREMATURE_CLOSE" && W && W.ended && !W.errored && !W.errorEmitted ? te.once("end", Se).once("error", Se) : Se(S);
      }
    ), s(
      he,
      {
        readable: !1,
        writable: !0
      },
      Se
    );
  }
  return Bu = {
    pipelineImpl: Z,
    pipeline: R
  }, Bu;
}
var Uu, Zm;
function $v() {
  if (Zm) return Uu;
  Zm = 1;
  const { pipeline: t } = qf(), e = Jn(), { destroyer: n } = ps(), {
    isNodeStream: i,
    isReadable: r,
    isWritable: s,
    isWebStream: a,
    isTransformStream: o,
    isWritableStream: c,
    isReadableStream: l
  } = ti(), {
    AbortError: u,
    codes: { ERR_INVALID_ARG_VALUE: p, ERR_MISSING_ARGS: d }
  } = Wt(), b = Li();
  return Uu = function(...v) {
    if (v.length === 0)
      throw new d("streams");
    if (v.length === 1)
      return e.from(v[0]);
    const y = [...v];
    if (typeof v[0] == "function" && (v[0] = e.from(v[0])), typeof v[v.length - 1] == "function") {
      const B = v.length - 1;
      v[B] = e.from(v[B]);
    }
    for (let B = 0; B < v.length; ++B)
      if (!(!i(v[B]) && !a(v[B]))) {
        if (B < v.length - 1 && !(r(v[B]) || l(v[B]) || o(v[B])))
          throw new p(`streams[${B}]`, y[B], "must be readable");
        if (B > 0 && !(s(v[B]) || c(v[B]) || o(v[B])))
          throw new p(`streams[${B}]`, y[B], "must be writable");
      }
    let f, h, g, A, C;
    function V(B) {
      const Y = A;
      A = null, Y ? Y(B) : B ? C.destroy(B) : !D && !X && C.destroy();
    }
    const K = v[0], L = t(v, V), X = !!(s(K) || c(K) || o(K)), D = !!(r(L) || l(L) || o(L));
    if (C = new e({
      // TODO (ronag): highWaterMark?
      writableObjectMode: !!(K != null && K.writableObjectMode),
      readableObjectMode: !!(L != null && L.readableObjectMode),
      writable: X,
      readable: D
    }), X) {
      if (i(K))
        C._write = function(Y, U, ae) {
          K.write(Y, U) ? ae() : f = ae;
        }, C._final = function(Y) {
          K.end(), h = Y;
        }, K.on("drain", function() {
          if (f) {
            const Y = f;
            f = null, Y();
          }
        });
      else if (a(K)) {
        const U = (o(K) ? K.writable : K).getWriter();
        C._write = async function(ae, le, pe) {
          try {
            await U.ready, U.write(ae).catch(() => {
            }), pe();
          } catch (z) {
            pe(z);
          }
        }, C._final = async function(ae) {
          try {
            await U.ready, U.close().catch(() => {
            }), h = ae;
          } catch (le) {
            ae(le);
          }
        };
      }
      const B = o(L) ? L.readable : L;
      b(B, () => {
        if (h) {
          const Y = h;
          h = null, Y();
        }
      });
    }
    if (D) {
      if (i(L))
        L.on("readable", function() {
          if (g) {
            const B = g;
            g = null, B();
          }
        }), L.on("end", function() {
          C.push(null);
        }), C._read = function() {
          for (; ; ) {
            const B = L.read();
            if (B === null) {
              g = C._read;
              return;
            }
            if (!C.push(B))
              return;
          }
        };
      else if (a(L)) {
        const Y = (o(L) ? L.readable : L).getReader();
        C._read = async function() {
          for (; ; )
            try {
              const { value: U, done: ae } = await Y.read();
              if (!C.push(U))
                return;
              if (ae) {
                C.push(null);
                return;
              }
            } catch {
              return;
            }
        };
      }
    }
    return C._destroy = function(B, Y) {
      !B && A !== null && (B = new u()), g = null, f = null, h = null, A === null ? Y(B) : (A = Y, i(L) && n(L, B));
    }, C;
  }, Uu;
}
var Xm;
function nI() {
  if (Xm) return mo;
  Xm = 1;
  const t = globalThis.AbortController || Ys.AbortController, {
    codes: { ERR_INVALID_ARG_VALUE: e, ERR_INVALID_ARG_TYPE: n, ERR_MISSING_ARGS: i, ERR_OUT_OF_RANGE: r },
    AbortError: s
  } = Wt(), { validateAbortSignal: a, validateInteger: o, validateObject: c } = za(), l = st().Symbol("kWeak"), u = st().Symbol("kResistStopPropagation"), { finished: p } = Li(), d = $v(), { addAbortSignalNoValidate: b } = el(), { isWritable: x, isNodeStream: v } = ti(), { deprecate: y } = Kt(), {
    ArrayPrototypePush: f,
    Boolean: h,
    MathFloor: g,
    Number: A,
    NumberIsNaN: C,
    Promise: V,
    PromiseReject: K,
    PromiseResolve: L,
    PromisePrototypeThen: X,
    Symbol: D
  } = st(), B = D("kEmpty"), Y = D("kEof");
  function U(S, W) {
    if (W != null && c(W, "options"), (W == null ? void 0 : W.signal) != null && a(W.signal, "options.signal"), v(S) && !x(S))
      throw new e("stream", S, "must be writable");
    const J = d(this, S);
    return W != null && W.signal && b(W.signal, J), J;
  }
  function ae(S, W) {
    if (typeof S != "function")
      throw new n("fn", ["Function", "AsyncFunction"], S);
    W != null && c(W, "options"), (W == null ? void 0 : W.signal) != null && a(W.signal, "options.signal");
    let J = 1;
    (W == null ? void 0 : W.concurrency) != null && (J = g(W.concurrency));
    let ge = J - 1;
    return (W == null ? void 0 : W.highWaterMark) != null && (ge = g(W.highWaterMark)), o(J, "options.concurrency", 1), o(ge, "options.highWaterMark", 0), ge += J, (async function* () {
      const $ = Kt().AbortSignalAny(
        [W == null ? void 0 : W.signal].filter(h)
      ), j = this, E = [], I = {
        signal: $
      };
      let M, O, w = !1, q = 0;
      function ee() {
        w = !0, G();
      }
      function G() {
        q -= 1, de();
      }
      function de() {
        O && !w && q < J && E.length < ge && (O(), O = null);
      }
      async function ve() {
        try {
          for await (let me of j) {
            if (w)
              return;
            if ($.aborted)
              throw new s();
            try {
              if (me = S(me, I), me === B)
                continue;
              me = L(me);
            } catch (Te) {
              me = K(Te);
            }
            q += 1, X(me, G, ee), E.push(me), M && (M(), M = null), !w && (E.length >= ge || q >= J) && await new V((Te) => {
              O = Te;
            });
          }
          E.push(Y);
        } catch (me) {
          const Te = K(me);
          X(Te, G, ee), E.push(Te);
        } finally {
          w = !0, M && (M(), M = null);
        }
      }
      ve();
      try {
        for (; ; ) {
          for (; E.length > 0; ) {
            const me = await E[0];
            if (me === Y)
              return;
            if ($.aborted)
              throw new s();
            me !== B && (yield me), E.shift(), de();
          }
          await new V((me) => {
            M = me;
          });
        }
      } finally {
        w = !0, O && (O(), O = null);
      }
    }).call(this);
  }
  function le(S = void 0) {
    return S != null && c(S, "options"), (S == null ? void 0 : S.signal) != null && a(S.signal, "options.signal"), (async function* () {
      let J = 0;
      for await (const oe of this) {
        var ge;
        if (S != null && (ge = S.signal) !== null && ge !== void 0 && ge.aborted)
          throw new s({
            cause: S.signal.reason
          });
        yield [J++, oe];
      }
    }).call(this);
  }
  async function pe(S, W = void 0) {
    for await (const J of R.call(this, S, W))
      return !0;
    return !1;
  }
  async function z(S, W = void 0) {
    if (typeof S != "function")
      throw new n("fn", ["Function", "AsyncFunction"], S);
    return !await pe.call(
      this,
      async (...J) => !await S(...J),
      W
    );
  }
  async function k(S, W) {
    for await (const J of R.call(this, S, W))
      return J;
  }
  async function H(S, W) {
    if (typeof S != "function")
      throw new n("fn", ["Function", "AsyncFunction"], S);
    async function J(ge, oe) {
      return await S(ge, oe), B;
    }
    for await (const ge of ae.call(this, J, W)) ;
  }
  function R(S, W) {
    if (typeof S != "function")
      throw new n("fn", ["Function", "AsyncFunction"], S);
    async function J(ge, oe) {
      return await S(ge, oe) ? ge : B;
    }
    return ae.call(this, J, W);
  }
  class Z extends i {
    constructor() {
      super("reduce"), this.message = "Reduce of an empty stream requires an initial value";
    }
  }
  async function se(S, W, J) {
    var ge;
    if (typeof S != "function")
      throw new n("reducer", ["Function", "AsyncFunction"], S);
    J != null && c(J, "options"), (J == null ? void 0 : J.signal) != null && a(J.signal, "options.signal");
    let oe = arguments.length > 1;
    if (J != null && (ge = J.signal) !== null && ge !== void 0 && ge.aborted) {
      const M = new s(void 0, {
        cause: J.signal.reason
      });
      throw this.once("error", () => {
      }), await p(this.destroy(M)), M;
    }
    const $ = new t(), j = $.signal;
    if (J != null && J.signal) {
      const M = {
        once: !0,
        [l]: this,
        [u]: !0
      };
      J.signal.addEventListener("abort", () => $.abort(), M);
    }
    let E = !1;
    try {
      for await (const M of this) {
        var I;
        if (E = !0, J != null && (I = J.signal) !== null && I !== void 0 && I.aborted)
          throw new s();
        oe ? W = await S(W, M, {
          signal: j
        }) : (W = M, oe = !0);
      }
      if (!E && !oe)
        throw new Z();
    } finally {
      $.abort();
    }
    return W;
  }
  async function te(S) {
    S != null && c(S, "options"), (S == null ? void 0 : S.signal) != null && a(S.signal, "options.signal");
    const W = [];
    for await (const ge of this) {
      var J;
      if (S != null && (J = S.signal) !== null && J !== void 0 && J.aborted)
        throw new s(void 0, {
          cause: S.signal.reason
        });
      f(W, ge);
    }
    return W;
  }
  function he(S, W) {
    const J = ae.call(this, S, W);
    return (async function* () {
      for await (const oe of J)
        yield* oe;
    }).call(this);
  }
  function Se(S) {
    if (S = A(S), C(S))
      return 0;
    if (S < 0)
      throw new r("number", ">= 0", S);
    return S;
  }
  function ye(S, W = void 0) {
    return W != null && c(W, "options"), (W == null ? void 0 : W.signal) != null && a(W.signal, "options.signal"), S = Se(S), (async function* () {
      var ge;
      if (W != null && (ge = W.signal) !== null && ge !== void 0 && ge.aborted)
        throw new s();
      for await (const $ of this) {
        var oe;
        if (W != null && (oe = W.signal) !== null && oe !== void 0 && oe.aborted)
          throw new s();
        S-- <= 0 && (yield $);
      }
    }).call(this);
  }
  function T(S, W = void 0) {
    return W != null && c(W, "options"), (W == null ? void 0 : W.signal) != null && a(W.signal, "options.signal"), S = Se(S), (async function* () {
      var ge;
      if (W != null && (ge = W.signal) !== null && ge !== void 0 && ge.aborted)
        throw new s();
      for await (const $ of this) {
        var oe;
        if (W != null && (oe = W.signal) !== null && oe !== void 0 && oe.aborted)
          throw new s();
        if (S-- > 0 && (yield $), S <= 0)
          return;
      }
    }).call(this);
  }
  return mo.streamReturningOperators = {
    asIndexedPairs: y(le, "readable.asIndexedPairs will be removed in a future version."),
    drop: ye,
    filter: R,
    flatMap: he,
    map: ae,
    take: T,
    compose: U
  }, mo.promiseReturningOperators = {
    every: z,
    forEach: H,
    reduce: se,
    toArray: te,
    some: pe,
    find: k
  }, mo;
}
var zu, Jm;
function Bv() {
  if (Jm) return zu;
  Jm = 1;
  const { ArrayPrototypePop: t, Promise: e } = st(), { isIterable: n, isNodeStream: i, isWebStream: r } = ti(), { pipelineImpl: s } = qf(), { finished: a } = Li();
  Uv();
  function o(...c) {
    return new e((l, u) => {
      let p, d;
      const b = c[c.length - 1];
      if (b && typeof b == "object" && !i(b) && !n(b) && !r(b)) {
        const x = t(c);
        p = x.signal, d = x.end;
      }
      s(
        c,
        (x, v) => {
          x ? u(x) : l(v);
        },
        {
          signal: p,
          end: d
        }
      );
    });
  }
  return zu = {
    finished: a,
    pipeline: o
  }, zu;
}
var Qm;
function Uv() {
  if (Qm) return vu.exports;
  Qm = 1;
  const { Buffer: t } = $n, { ObjectDefineProperty: e, ObjectKeys: n, ReflectApply: i } = st(), {
    promisify: { custom: r }
  } = Kt(), { streamReturningOperators: s, promiseReturningOperators: a } = nI(), {
    codes: { ERR_ILLEGAL_CONSTRUCTOR: o }
  } = Wt(), c = $v(), { setDefaultHighWaterMark: l, getDefaultHighWaterMark: u } = tl(), { pipeline: p } = qf(), { destroyer: d } = ps(), b = Li(), x = Bv(), v = ti(), y = vu.exports = zf().Stream;
  y.isDestroyed = v.isDestroyed, y.isDisturbed = v.isDisturbed, y.isErrored = v.isErrored, y.isReadable = v.isReadable, y.isWritable = v.isWritable, y.Readable = nl();
  for (const h of n(s)) {
    let A = function(...C) {
      if (new.target)
        throw o();
      return y.Readable.from(i(g, this, C));
    };
    const g = s[h];
    e(A, "name", {
      __proto__: null,
      value: g.name
    }), e(A, "length", {
      __proto__: null,
      value: g.length
    }), e(y.Readable.prototype, h, {
      __proto__: null,
      value: A,
      enumerable: !1,
      configurable: !0,
      writable: !0
    });
  }
  for (const h of n(a)) {
    let A = function(...C) {
      if (new.target)
        throw o();
      return i(g, this, C);
    };
    const g = a[h];
    e(A, "name", {
      __proto__: null,
      value: g.name
    }), e(A, "length", {
      __proto__: null,
      value: g.length
    }), e(y.Readable.prototype, h, {
      __proto__: null,
      value: A,
      enumerable: !1,
      configurable: !0,
      writable: !0
    });
  }
  y.Writable = Wf(), y.Duplex = Jn(), y.Transform = Fv(), y.PassThrough = Mv(), y.pipeline = p;
  const { addAbortSignal: f } = el();
  return y.addAbortSignal = f, y.finished = b, y.destroy = d, y.compose = c, y.setDefaultHighWaterMark = l, y.getDefaultHighWaterMark = u, e(y, "promises", {
    __proto__: null,
    configurable: !0,
    enumerable: !0,
    get() {
      return x;
    }
  }), e(p, r, {
    __proto__: null,
    enumerable: !0,
    get() {
      return x.pipeline;
    }
  }), e(b, r, {
    __proto__: null,
    enumerable: !0,
    get() {
      return x.finished;
    }
  }), y.Stream = y, y._isUint8Array = function(g) {
    return g instanceof Uint8Array;
  }, y._uint8ArrayToBuffer = function(g) {
    return t.from(g.buffer, g.byteOffset, g.byteLength);
  }, vu.exports;
}
Uf.exports;
(function(t) {
  const e = nt;
  if (e && process.env.READABLE_STREAM === "disable") {
    const n = e.promises;
    t.exports._uint8ArrayToBuffer = e._uint8ArrayToBuffer, t.exports._isUint8Array = e._isUint8Array, t.exports.isDisturbed = e.isDisturbed, t.exports.isErrored = e.isErrored, t.exports.isReadable = e.isReadable, t.exports.Readable = e.Readable, t.exports.Writable = e.Writable, t.exports.Duplex = e.Duplex, t.exports.Transform = e.Transform, t.exports.PassThrough = e.PassThrough, t.exports.addAbortSignal = e.addAbortSignal, t.exports.finished = e.finished, t.exports.destroy = e.destroy, t.exports.pipeline = e.pipeline, t.exports.compose = e.compose, Object.defineProperty(e, "promises", {
      configurable: !0,
      enumerable: !0,
      get() {
        return n;
      }
    }), t.exports.Stream = e.Stream;
  } else {
    const n = Uv(), i = Bv(), r = n.Readable.destroy;
    t.exports = n.Readable, t.exports._uint8ArrayToBuffer = n._uint8ArrayToBuffer, t.exports._isUint8Array = n._isUint8Array, t.exports.isDisturbed = n.isDisturbed, t.exports.isErrored = n.isErrored, t.exports.isReadable = n.isReadable, t.exports.Readable = n.Readable, t.exports.Writable = n.Writable, t.exports.Duplex = n.Duplex, t.exports.Transform = n.Transform, t.exports.PassThrough = n.PassThrough, t.exports.addAbortSignal = n.addAbortSignal, t.exports.finished = n.finished, t.exports.destroy = n.destroy, t.exports.destroy = r, t.exports.pipeline = n.pipeline, t.exports.compose = n.compose, Object.defineProperty(n, "promises", {
      configurable: !0,
      enumerable: !0,
      get() {
        return i;
      }
    }), t.exports.Stream = n.Stream;
  }
  t.exports.default = t.exports;
})(Uf);
var fs = Uf.exports, zv = { exports: {} };
function iI(t, e) {
  for (var n = -1, i = e.length, r = t.length; ++n < i; )
    t[r + n] = e[n];
  return t;
}
var rI = iI, eg = Ff, sI = Av, aI = Tv, tg = eg ? eg.isConcatSpreadable : void 0;
function oI(t) {
  return aI(t) || sI(t) || !!(tg && t && t[tg]);
}
var cI = oI, lI = rI, uI = cI;
function Wv(t, e, n, i, r) {
  var s = -1, a = t.length;
  for (n || (n = uI), r || (r = []); ++s < a; ) {
    var o = t[s];
    e > 0 && n(o) ? e > 1 ? Wv(o, e - 1, n, i, r) : lI(r, o) : i || (r[r.length] = o);
  }
  return r;
}
var Gf = Wv, pI = Gf;
function fI(t) {
  var e = t == null ? 0 : t.length;
  return e ? pI(t, 1) : [];
}
var dI = fI, hI = Qc, mI = hI(Object, "create"), il = mI, ng = il;
function gI() {
  this.__data__ = ng ? ng(null) : {}, this.size = 0;
}
var bI = gI;
function yI(t) {
  var e = this.has(t) && delete this.__data__[t];
  return this.size -= e ? 1 : 0, e;
}
var vI = yI, xI = il, wI = "__lodash_hash_undefined__", _I = Object.prototype, SI = _I.hasOwnProperty;
function EI(t) {
  var e = this.__data__;
  if (xI) {
    var n = e[t];
    return n === wI ? void 0 : n;
  }
  return SI.call(e, t) ? e[t] : void 0;
}
var AI = EI, TI = il, RI = Object.prototype, OI = RI.hasOwnProperty;
function PI(t) {
  var e = this.__data__;
  return TI ? e[t] !== void 0 : OI.call(e, t);
}
var CI = PI, kI = il, II = "__lodash_hash_undefined__";
function DI(t, e) {
  var n = this.__data__;
  return this.size += this.has(t) ? 0 : 1, n[t] = kI && e === void 0 ? II : e, this;
}
var jI = DI, LI = bI, NI = vI, FI = AI, MI = CI, $I = jI;
function ds(t) {
  var e = -1, n = t == null ? 0 : t.length;
  for (this.clear(); ++e < n; ) {
    var i = t[e];
    this.set(i[0], i[1]);
  }
}
ds.prototype.clear = LI;
ds.prototype.delete = NI;
ds.prototype.get = FI;
ds.prototype.has = MI;
ds.prototype.set = $I;
var BI = ds;
function UI() {
  this.__data__ = [], this.size = 0;
}
var zI = UI, WI = $f;
function qI(t, e) {
  for (var n = t.length; n--; )
    if (WI(t[n][0], e))
      return n;
  return -1;
}
var rl = qI, GI = rl, HI = Array.prototype, VI = HI.splice;
function KI(t) {
  var e = this.__data__, n = GI(e, t);
  if (n < 0)
    return !1;
  var i = e.length - 1;
  return n == i ? e.pop() : VI.call(e, n, 1), --this.size, !0;
}
var YI = KI, ZI = rl;
function XI(t) {
  var e = this.__data__, n = ZI(e, t);
  return n < 0 ? void 0 : e[n][1];
}
var JI = XI, QI = rl;
function eD(t) {
  return QI(this.__data__, t) > -1;
}
var tD = eD, nD = rl;
function iD(t, e) {
  var n = this.__data__, i = nD(n, t);
  return i < 0 ? (++this.size, n.push([t, e])) : n[i][1] = e, this;
}
var rD = iD, sD = zI, aD = YI, oD = JI, cD = tD, lD = rD;
function hs(t) {
  var e = -1, n = t == null ? 0 : t.length;
  for (this.clear(); ++e < n; ) {
    var i = t[e];
    this.set(i[0], i[1]);
  }
}
hs.prototype.clear = sD;
hs.prototype.delete = aD;
hs.prototype.get = oD;
hs.prototype.has = cD;
hs.prototype.set = lD;
var uD = hs, pD = Qc, fD = $a, dD = pD(fD, "Map"), hD = dD, ig = BI, mD = uD, gD = hD;
function bD() {
  this.size = 0, this.__data__ = {
    hash: new ig(),
    map: new (gD || mD)(),
    string: new ig()
  };
}
var yD = bD;
function vD(t) {
  var e = typeof t;
  return e == "string" || e == "number" || e == "symbol" || e == "boolean" ? t !== "__proto__" : t === null;
}
var xD = vD, wD = xD;
function _D(t, e) {
  var n = t.__data__;
  return wD(e) ? n[typeof e == "string" ? "string" : "hash"] : n.map;
}
var sl = _D, SD = sl;
function ED(t) {
  var e = SD(this, t).delete(t);
  return this.size -= e ? 1 : 0, e;
}
var AD = ED, TD = sl;
function RD(t) {
  return TD(this, t).get(t);
}
var OD = RD, PD = sl;
function CD(t) {
  return PD(this, t).has(t);
}
var kD = CD, ID = sl;
function DD(t, e) {
  var n = ID(this, t), i = n.size;
  return n.set(t, e), this.size += n.size == i ? 0 : 1, this;
}
var jD = DD, LD = yD, ND = AD, FD = OD, MD = kD, $D = jD;
function ms(t) {
  var e = -1, n = t == null ? 0 : t.length;
  for (this.clear(); ++e < n; ) {
    var i = t[e];
    this.set(i[0], i[1]);
  }
}
ms.prototype.clear = LD;
ms.prototype.delete = ND;
ms.prototype.get = FD;
ms.prototype.has = MD;
ms.prototype.set = $D;
var BD = ms, UD = "__lodash_hash_undefined__";
function zD(t) {
  return this.__data__.set(t, UD), this;
}
var WD = zD;
function qD(t) {
  return this.__data__.has(t);
}
var GD = qD, HD = BD, VD = WD, KD = GD;
function Tc(t) {
  var e = -1, n = t == null ? 0 : t.length;
  for (this.__data__ = new HD(); ++e < n; )
    this.add(t[e]);
}
Tc.prototype.add = Tc.prototype.push = VD;
Tc.prototype.has = KD;
var qv = Tc;
function YD(t, e, n, i) {
  for (var r = t.length, s = n + (i ? 1 : -1); i ? s-- : ++s < r; )
    if (e(t[s], s, t))
      return s;
  return -1;
}
var ZD = YD;
function XD(t) {
  return t !== t;
}
var JD = XD;
function QD(t, e, n) {
  for (var i = n - 1, r = t.length; ++i < r; )
    if (t[i] === e)
      return i;
  return -1;
}
var ej = QD, tj = ZD, nj = JD, ij = ej;
function rj(t, e, n) {
  return e === e ? ij(t, e, n) : tj(t, nj, n);
}
var sj = rj, aj = sj;
function oj(t, e) {
  var n = t == null ? 0 : t.length;
  return !!n && aj(t, e, 0) > -1;
}
var Gv = oj;
function cj(t, e, n) {
  for (var i = -1, r = t == null ? 0 : t.length; ++i < r; )
    if (n(e, t[i]))
      return !0;
  return !1;
}
var Hv = cj;
function lj(t, e) {
  for (var n = -1, i = t == null ? 0 : t.length, r = Array(i); ++n < i; )
    r[n] = e(t[n], n, t);
  return r;
}
var uj = lj;
function pj(t, e) {
  return t.has(e);
}
var Vv = pj, fj = qv, dj = Gv, hj = Hv, mj = uj, gj = Rv, bj = Vv, yj = 200;
function vj(t, e, n, i) {
  var r = -1, s = dj, a = !0, o = t.length, c = [], l = e.length;
  if (!o)
    return c;
  n && (e = mj(e, gj(n))), i ? (s = hj, a = !1) : e.length >= yj && (s = bj, a = !1, e = new fj(e));
  e:
    for (; ++r < o; ) {
      var u = t[r], p = n == null ? u : n(u);
      if (u = i || u !== 0 ? u : 0, a && p === p) {
        for (var d = l; d--; )
          if (e[d] === p)
            continue e;
        c.push(u);
      } else s(e, p, i) || c.push(u);
    }
  return c;
}
var xj = vj, wj = Bf, _j = Ba;
function Sj(t) {
  return _j(t) && wj(t);
}
var Kv = Sj, Ej = xj, Aj = Gf, Tj = Mf, rg = Kv, Rj = Tj(function(t, e) {
  return rg(t) ? Ej(t, Aj(e, 1, rg, !0)) : [];
}), Oj = Rj, Pj = Qc, Cj = $a, kj = Pj(Cj, "Set"), Ij = kj;
function Dj() {
}
var jj = Dj;
function Lj(t) {
  var e = -1, n = Array(t.size);
  return t.forEach(function(i) {
    n[++e] = i;
  }), n;
}
var Yv = Lj, Wu = Ij, Nj = jj, Fj = Yv, Mj = 1 / 0, $j = Wu && 1 / Fj(new Wu([, -0]))[1] == Mj ? function(t) {
  return new Wu(t);
} : Nj, Bj = $j, Uj = qv, zj = Gv, Wj = Hv, qj = Vv, Gj = Bj, Hj = Yv, Vj = 200;
function Kj(t, e, n) {
  var i = -1, r = zj, s = t.length, a = !0, o = [], c = o;
  if (n)
    a = !1, r = Wj;
  else if (s >= Vj) {
    var l = e ? null : Gj(t);
    if (l)
      return Hj(l);
    a = !1, r = qj, c = new Uj();
  } else
    c = e ? [] : o;
  e:
    for (; ++i < s; ) {
      var u = t[i], p = e ? e(u) : u;
      if (u = n || u !== 0 ? u : 0, a && p === p) {
        for (var d = c.length; d--; )
          if (c[d] === p)
            continue e;
        e && c.push(p), o.push(u);
      } else r(c, p, n) || (c !== o && c.push(p), o.push(u));
    }
  return o;
}
var Yj = Kj, Zj = Gf, Xj = Mf, Jj = Yj, Qj = Kv, e2 = Xj(function(t) {
  return Jj(Zj(t, 1, Qj, !0));
}), t2 = e2;
function n2(t, e) {
  return function(n) {
    return t(e(n));
  };
}
var i2 = n2, r2 = i2, s2 = r2(Object.getPrototypeOf, Object), a2 = s2, o2 = Xc, c2 = a2, l2 = Ba, u2 = "[object Object]", p2 = Function.prototype, f2 = Object.prototype, Zv = p2.toString, d2 = f2.hasOwnProperty, h2 = Zv.call(Object);
function m2(t) {
  if (!l2(t) || o2(t) != u2)
    return !1;
  var e = c2(t);
  if (e === null)
    return !0;
  var n = d2.call(e, "constructor") && e.constructor;
  return typeof n == "function" && n instanceof n && Zv.call(n) == h2;
}
var g2 = m2, Xv = {}, Pi = {}, al = {};
Object.defineProperty(al, "__esModule", { value: !0 });
al.assertValidPattern = void 0;
const b2 = 1024 * 64, y2 = (t) => {
  if (typeof t != "string")
    throw new TypeError("invalid pattern");
  if (t.length > b2)
    throw new TypeError("pattern is too long");
};
al.assertValidPattern = y2;
var Zs = {}, ol = {};
Object.defineProperty(ol, "__esModule", { value: !0 });
ol.parseClass = void 0;
const v2 = {
  "[:alnum:]": ["\\p{L}\\p{Nl}\\p{Nd}", !0],
  "[:alpha:]": ["\\p{L}\\p{Nl}", !0],
  "[:ascii:]": ["\\x00-\\x7f", !1],
  "[:blank:]": ["\\p{Zs}\\t", !0],
  "[:cntrl:]": ["\\p{Cc}", !0],
  "[:digit:]": ["\\p{Nd}", !0],
  "[:graph:]": ["\\p{Z}\\p{C}", !0, !0],
  "[:lower:]": ["\\p{Ll}", !0],
  "[:print:]": ["\\p{C}", !0],
  "[:punct:]": ["\\p{P}", !0],
  "[:space:]": ["\\p{Z}\\t\\r\\n\\v\\f", !0],
  "[:upper:]": ["\\p{Lu}", !0],
  "[:word:]": ["\\p{L}\\p{Nl}\\p{Nd}\\p{Pc}", !0],
  "[:xdigit:]": ["A-Fa-f0-9", !1]
}, As = (t) => t.replace(/[[\]\\-]/g, "\\$&"), x2 = (t) => t.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), sg = (t) => t.join(""), w2 = (t, e) => {
  const n = e;
  if (t.charAt(n) !== "[")
    throw new Error("not in a brace expression");
  const i = [], r = [];
  let s = n + 1, a = !1, o = !1, c = !1, l = !1, u = n, p = "";
  e: for (; s < t.length; ) {
    const v = t.charAt(s);
    if ((v === "!" || v === "^") && s === n + 1) {
      l = !0, s++;
      continue;
    }
    if (v === "]" && a && !c) {
      u = s + 1;
      break;
    }
    if (a = !0, v === "\\" && !c) {
      c = !0, s++;
      continue;
    }
    if (v === "[" && !c) {
      for (const [y, [f, h, g]] of Object.entries(v2))
        if (t.startsWith(y, s)) {
          if (p)
            return ["$.", !1, t.length - n, !0];
          s += y.length, g ? r.push(f) : i.push(f), o = o || h;
          continue e;
        }
    }
    if (c = !1, p) {
      v > p ? i.push(As(p) + "-" + As(v)) : v === p && i.push(As(v)), p = "", s++;
      continue;
    }
    if (t.startsWith("-]", s + 1)) {
      i.push(As(v + "-")), s += 2;
      continue;
    }
    if (t.startsWith("-", s + 1)) {
      p = v, s += 2;
      continue;
    }
    i.push(As(v)), s++;
  }
  if (u < s)
    return ["", !1, 0, !1];
  if (!i.length && !r.length)
    return ["$.", !1, t.length - n, !0];
  if (r.length === 0 && i.length === 1 && /^\\?.$/.test(i[0]) && !l) {
    const v = i[0].length === 2 ? i[0].slice(-1) : i[0];
    return [x2(v), !1, u - n, !1];
  }
  const d = "[" + (l ? "^" : "") + sg(i) + "]", b = "[" + (l ? "" : "^") + sg(r) + "]";
  return [i.length && r.length ? "(" + d + "|" + b + ")" : i.length ? d : b, o, u - n, !0];
};
ol.parseClass = w2;
var ns = {};
Object.defineProperty(ns, "__esModule", { value: !0 });
ns.unescape = void 0;
const _2 = (t, { windowsPathsNoEscape: e = !1 } = {}) => e ? t.replace(/\[([^\/\\])\]/g, "$1") : t.replace(/((?!\\).|^)\[([^\/\\])\]/g, "$1$2").replace(/\\([^\/])/g, "$1");
ns.unescape = _2;
var Gt;
Object.defineProperty(Zs, "__esModule", { value: !0 });
Zs.AST = void 0;
const S2 = ol, yo = ns, E2 = /* @__PURE__ */ new Set(["!", "?", "+", "*", "@"]), xp = (t) => E2.has(t), ag = (t) => xp(t.type), A2 = /* @__PURE__ */ new Map([
  ["!", ["@"]],
  ["?", ["?", "@"]],
  ["@", ["@"]],
  ["*", ["*", "+", "?", "@"]],
  ["+", ["+", "@"]]
]), T2 = /* @__PURE__ */ new Map([
  ["!", ["?"]],
  ["@", ["?"]],
  ["+", ["?", "*"]]
]), R2 = /* @__PURE__ */ new Map([
  ["!", ["?", "@"]],
  ["?", ["?", "@"]],
  ["@", ["?", "@"]],
  ["*", ["*", "+", "?", "@"]],
  ["+", ["+", "@", "?", "*"]]
]), og = /* @__PURE__ */ new Map([
  ["!", /* @__PURE__ */ new Map([["!", "@"]])],
  ["?", /* @__PURE__ */ new Map([["*", "*"], ["+", "*"]])],
  ["@", /* @__PURE__ */ new Map([["!", "!"], ["?", "?"], ["@", "@"], ["*", "*"], ["+", "+"]])],
  ["+", /* @__PURE__ */ new Map([["?", "*"], ["*", "*"]])]
]), O2 = "(?!(?:^|/)\\.\\.?(?:$|/))", vo = "(?!\\.)", P2 = /* @__PURE__ */ new Set(["[", "."]), C2 = /* @__PURE__ */ new Set(["..", "."]), k2 = new Set("().*{}+?[]^$\\!"), I2 = (t) => t.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), Hf = "[^/]", cg = Hf + "*?", lg = Hf + "+?";
var gt, _t, Wn, De, ot, fi, Zi, di, kn, In, Fr, He, Jv, Ri, Fo, Qv, wp, Mo, ex, _p, tx, nx, ix, $o, Sp, rx;
class Vf {
  constructor(e, n, i = {}) {
    fe(this, He);
    ne(this, "type");
    fe(this, gt);
    fe(this, _t);
    fe(this, Wn, !1);
    fe(this, De, []);
    fe(this, ot);
    fe(this, fi);
    fe(this, Zi);
    fe(this, di, !1);
    fe(this, kn);
    fe(this, In);
    // set to true if it's an extglob with no children
    // (which really means one child of '')
    fe(this, Fr, !1);
    this.type = e, e && Q(this, _t, !0), Q(this, ot, n), Q(this, gt, m(this, ot) ? m(m(this, ot), gt) : this), Q(this, kn, m(this, gt) === this ? i : m(m(this, gt), kn)), Q(this, Zi, m(this, gt) === this ? [] : m(m(this, gt), Zi)), e === "!" && !m(m(this, gt), di) && m(this, Zi).push(this), Q(this, fi, m(this, ot) ? m(m(this, ot), De).length : 0);
  }
  get hasMagic() {
    if (m(this, _t) !== void 0)
      return m(this, _t);
    for (const e of m(this, De))
      if (typeof e != "string" && (e.type || e.hasMagic))
        return Q(this, _t, !0);
    return m(this, _t);
  }
  // reconstructs the pattern
  toString() {
    return m(this, In) !== void 0 ? m(this, In) : this.type ? Q(this, In, this.type + "(" + m(this, De).map((e) => String(e)).join("|") + ")") : Q(this, In, m(this, De).map((e) => String(e)).join(""));
  }
  push(...e) {
    for (const n of e)
      if (n !== "") {
        if (typeof n != "string" && !(n instanceof Gt && m(n, ot) === this))
          throw new Error("invalid part: " + n);
        m(this, De).push(n);
      }
  }
  toJSON() {
    var n;
    const e = this.type === null ? m(this, De).slice().map((i) => typeof i == "string" ? i : i.toJSON()) : [this.type, ...m(this, De).map((i) => i.toJSON())];
    return this.isStart() && !this.type && e.unshift([]), this.isEnd() && (this === m(this, gt) || m(m(this, gt), di) && ((n = m(this, ot)) == null ? void 0 : n.type) === "!") && e.push({}), e;
  }
  isStart() {
    var n;
    if (m(this, gt) === this)
      return !0;
    if (!((n = m(this, ot)) != null && n.isStart()))
      return !1;
    if (m(this, fi) === 0)
      return !0;
    const e = m(this, ot);
    for (let i = 0; i < m(this, fi); i++) {
      const r = m(e, De)[i];
      if (!(r instanceof Gt && r.type === "!"))
        return !1;
    }
    return !0;
  }
  isEnd() {
    var n, i, r;
    if (m(this, gt) === this || ((n = m(this, ot)) == null ? void 0 : n.type) === "!")
      return !0;
    if (!((i = m(this, ot)) != null && i.isEnd()))
      return !1;
    if (!this.type)
      return (r = m(this, ot)) == null ? void 0 : r.isEnd();
    const e = m(this, ot) ? m(m(this, ot), De).length : 0;
    return m(this, fi) === e - 1;
  }
  copyIn(e) {
    typeof e == "string" ? this.push(e) : this.push(e.clone(this));
  }
  clone(e) {
    const n = new Gt(this.type, e);
    for (const i of m(this, De))
      n.copyIn(i);
    return n;
  }
  static fromGlob(e, n = {}) {
    var r;
    const i = new Gt(null, void 0, n);
    return re(r = Gt, Ri, Fo).call(r, e, i, 0, n, 0), i;
  }
  // returns the regular expression if there's magic, or the unescaped
  // string if not.
  toMMPattern() {
    if (this !== m(this, gt))
      return m(this, gt).toMMPattern();
    const e = this.toString(), [n, i, r, s] = this.toRegExpSource();
    if (!(r || m(this, _t) || m(this, kn).nocase && !m(this, kn).nocaseMagicOnly && e.toUpperCase() !== e.toLowerCase()))
      return i;
    const o = (m(this, kn).nocase ? "i" : "") + (s ? "u" : "");
    return Object.assign(new RegExp(`^${n}$`, o), {
      _src: n,
      _glob: e
    });
  }
  get options() {
    return m(this, kn);
  }
  // returns the string match, the regexp source, whether there's magic
  // in the regexp (so a regular expression is required) and whether or
  // not the uflag is needed for the regular expression (for posix classes)
  // TODO: instead of injecting the start/end at this point, just return
  // the BODY of the regexp, along with the start/end portions suitable
  // for binding the start/end in either a joined full-path makeRe context
  // (where we bind to (^|/), or a standalone matchPart context (where
  // we bind to ^, and not /).  Otherwise slashes get duped!
  //
  // In part-matching mode, the start is:
  // - if not isStart: nothing
  // - if traversal possible, but not allowed: ^(?!\.\.?$)
  // - if dots allowed or not possible: ^
  // - if dots possible and not allowed: ^(?!\.)
  // end is:
  // - if not isEnd(): nothing
  // - else: $
  //
  // In full-path matching mode, we put the slash at the START of the
  // pattern, so start is:
  // - if first pattern: same as part-matching mode
  // - if not isStart(): nothing
  // - if traversal possible, but not allowed: /(?!\.\.?(?:$|/))
  // - if dots allowed or not possible: /
  // - if dots possible and not allowed: /(?!\.)
  // end is:
  // - if last pattern, same as part-matching mode
  // - else nothing
  //
  // Always put the (?:$|/) on negated tails, though, because that has to be
  // there to bind the end of the negated pattern portion, and it's easier to
  // just stick it in now rather than try to inject it later in the middle of
  // the pattern.
  //
  // We can just always return the same end, and leave it up to the caller
  // to know whether it's going to be used joined or in parts.
  // And, if the start is adjusted slightly, can do the same there:
  // - if not isStart: nothing
  // - if traversal possible, but not allowed: (?:/|^)(?!\.\.?$)
  // - if dots allowed or not possible: (?:/|^)
  // - if dots possible and not allowed: (?:/|^)(?!\.)
  //
  // But it's better to have a simpler binding without a conditional, for
  // performance, so probably better to return both start options.
  //
  // Then the caller just ignores the end if it's not the first pattern,
  // and the start always gets applied.
  //
  // But that's always going to be $ if it's the ending pattern, or nothing,
  // so the caller can just attach $ at the end of the pattern when building.
  //
  // So the todo is:
  // - better detect what kind of start is needed
  // - return both flavors of starting pattern
  // - attach $ at the end of the pattern when creating the actual RegExp
  //
  // Ah, but wait, no, that all only applies to the root when the first pattern
  // is not an extglob. If the first pattern IS an extglob, then we need all
  // that dot prevention biz to live in the extglob portions, because eg
  // +(*|.x*) can match .xy but not .yx.
  //
  // So, return the two flavors if it's #root and the first child is not an
  // AST, otherwise leave it to the child AST to handle it, and there,
  // use the (?:^|/) style of start binding.
  //
  // Even simplified further:
  // - Since the start for a join is eg /(?!\.) and the start for a part
  // is ^(?!\.), we can just prepend (?!\.) to the pattern (either root
  // or start or whatever) and prepend ^ or / at the Regexp construction.
  toRegExpSource(e) {
    var c;
    const n = e ?? !!m(this, kn).dot;
    if (m(this, gt) === this && (re(this, He, $o).call(this), re(this, He, Jv).call(this)), !ag(this)) {
      const l = this.isStart() && this.isEnd(), u = m(this, De).map((x) => {
        var g;
        const [v, y, f, h] = typeof x == "string" ? re(g = Gt, Ri, rx).call(g, x, m(this, _t), l) : x.toRegExpSource(e);
        return Q(this, _t, m(this, _t) || f), Q(this, Wn, m(this, Wn) || h), v;
      }).join("");
      let p = "";
      if (this.isStart() && typeof m(this, De)[0] == "string" && !(m(this, De).length === 1 && C2.has(m(this, De)[0]))) {
        const v = P2, y = (
          // dots are allowed, and the pattern starts with [ or .
          n && v.has(u.charAt(0)) || // the pattern starts with \., and then [ or .
          u.startsWith("\\.") && v.has(u.charAt(2)) || // the pattern starts with \.\., and then [ or .
          u.startsWith("\\.\\.") && v.has(u.charAt(4))
        ), f = !n && !e && v.has(u.charAt(0));
        p = y ? O2 : f ? vo : "";
      }
      let d = "";
      return this.isEnd() && m(m(this, gt), di) && ((c = m(this, ot)) == null ? void 0 : c.type) === "!" && (d = "(?:$|\\/)"), [
        p + u + d,
        (0, yo.unescape)(u),
        Q(this, _t, !!m(this, _t)),
        m(this, Wn)
      ];
    }
    const i = this.type === "*" || this.type === "+", r = this.type === "!" ? "(?:(?!(?:" : "(?:";
    let s = re(this, He, Sp).call(this, n);
    if (this.isStart() && this.isEnd() && !s && this.type !== "!") {
      const l = this.toString(), u = this;
      return Q(u, De, [l]), u.type = null, Q(u, _t, void 0), [l, (0, yo.unescape)(this.toString()), !1, !1];
    }
    let a = !i || e || n || !vo ? "" : re(this, He, Sp).call(this, !0);
    a === s && (a = ""), a && (s = `(?:${s})(?:${a})*?`);
    let o = "";
    if (this.type === "!" && m(this, Fr))
      o = (this.isStart() && !n ? vo : "") + lg;
    else {
      const l = this.type === "!" ? (
        // !() must match something,but !(x) can match ''
        "))" + (this.isStart() && !n && !e ? vo : "") + cg + ")"
      ) : this.type === "@" ? ")" : this.type === "?" ? ")?" : this.type === "+" && a ? ")" : this.type === "*" && a ? ")?" : `)${this.type}`;
      o = r + s + l;
    }
    return [
      o,
      (0, yo.unescape)(s),
      Q(this, _t, !!m(this, _t)),
      m(this, Wn)
    ];
  }
}
gt = new WeakMap(), _t = new WeakMap(), Wn = new WeakMap(), De = new WeakMap(), ot = new WeakMap(), fi = new WeakMap(), Zi = new WeakMap(), di = new WeakMap(), kn = new WeakMap(), In = new WeakMap(), Fr = new WeakMap(), He = new WeakSet(), Jv = function() {
  if (this !== m(this, gt))
    throw new Error("should only call on root");
  if (m(this, di))
    return this;
  this.toString(), Q(this, di, !0);
  let e;
  for (; e = m(this, Zi).pop(); ) {
    if (e.type !== "!")
      continue;
    let n = e, i = m(n, ot);
    for (; i; ) {
      for (let r = m(n, fi) + 1; !i.type && r < m(i, De).length; r++)
        for (const s of m(e, De)) {
          if (typeof s == "string")
            throw new Error("string part in extglob AST??");
          s.copyIn(m(i, De)[r]);
        }
      n = i, i = m(n, ot);
    }
  }
  return this;
}, Ri = new WeakSet(), Fo = function(e, n, i, r, s) {
  var v, y, f, h;
  const a = r.maxExtglobRecursion ?? 2;
  let o = !1, c = !1, l = -1, u = !1;
  if (n.type === null) {
    let g = i, A = "";
    for (; g < e.length; ) {
      const C = e.charAt(g++);
      if (o || C === "\\") {
        o = !o, A += C;
        continue;
      }
      if (c) {
        g === l + 1 ? (C === "^" || C === "!") && (u = !0) : C === "]" && !(g === l + 2 && u) && (c = !1), A += C;
        continue;
      } else if (C === "[") {
        c = !0, l = g, u = !1, A += C;
        continue;
      }
      if (!r.noext && xp(C) && e.charAt(g) === "(" && s <= a) {
        n.push(A), A = "";
        const K = new Gt(C, n);
        g = re(v = Gt, Ri, Fo).call(v, e, K, g, r, s + 1), n.push(K);
        continue;
      }
      A += C;
    }
    return n.push(A), g;
  }
  let p = i + 1, d = new Gt(null, n);
  const b = [];
  let x = "";
  for (; p < e.length; ) {
    const g = e.charAt(p++);
    if (o || g === "\\") {
      o = !o, x += g;
      continue;
    }
    if (c) {
      p === l + 1 ? (g === "^" || g === "!") && (u = !0) : g === "]" && !(p === l + 2 && u) && (c = !1), x += g;
      continue;
    } else if (g === "[") {
      c = !0, l = p, u = !1, x += g;
      continue;
    }
    if (xp(g) && e.charAt(p) === "(" && /* c8 ignore start - the maxDepth is sufficient here */
    (s <= a || n && re(y = n, He, Mo).call(y, g))) {
      const C = n && re(f = n, He, Mo).call(f, g) ? 0 : 1;
      d.push(x), x = "";
      const V = new Gt(g, d);
      d.push(V), p = re(h = Gt, Ri, Fo).call(h, e, V, p, r, s + C);
      continue;
    }
    if (g === "|") {
      d.push(x), x = "", b.push(d), d = new Gt(null, n);
      continue;
    }
    if (g === ")")
      return x === "" && m(n, De).length === 0 && Q(n, Fr, !0), d.push(x), x = "", n.push(...b, d), p;
    x += g;
  }
  return n.type = null, Q(n, _t, void 0), Q(n, De, [e.substring(i - 1)]), p;
}, Qv = function(e) {
  return re(this, He, wp).call(this, e, T2);
}, wp = function(e, n = A2) {
  if (!e || typeof e != "object" || e.type !== null || m(e, De).length !== 1 || this.type === null)
    return !1;
  const i = m(e, De)[0];
  return !i || typeof i != "object" || i.type === null ? !1 : re(this, He, Mo).call(this, i.type, n);
}, Mo = function(e, n = R2) {
  var i;
  return !!((i = n.get(this.type)) != null && i.includes(e));
}, ex = function(e, n) {
  const i = m(e, De)[0], r = new Gt(null, i, this.options);
  m(r, De).push(""), i.push(r), re(this, He, _p).call(this, e, n);
}, _p = function(e, n) {
  const i = m(e, De)[0];
  m(this, De).splice(n, 1, ...m(i, De));
  for (const r of m(i, De))
    typeof r == "object" && Q(r, ot, this);
  Q(this, In, void 0);
}, tx = function(e) {
  const n = og.get(this.type);
  return !!(n != null && n.has(e));
}, nx = function(e) {
  if (!e || typeof e != "object" || e.type !== null || m(e, De).length !== 1 || this.type === null || m(this, De).length !== 1)
    return !1;
  const n = m(e, De)[0];
  return !n || typeof n != "object" || n.type === null ? !1 : re(this, He, tx).call(this, n.type);
}, ix = function(e) {
  const n = og.get(this.type), i = m(e, De)[0], r = n == null ? void 0 : n.get(i.type);
  if (!r)
    return !1;
  Q(this, De, m(i, De));
  for (const s of m(this, De))
    typeof s == "object" && Q(s, ot, this);
  this.type = r, Q(this, In, void 0), Q(this, Fr, !1);
}, $o = function() {
  var e, n;
  if (ag(this)) {
    let i = 0, r = !1;
    do {
      r = !0;
      for (let s = 0; s < m(this, De).length; s++) {
        const a = m(this, De)[s];
        typeof a == "object" && (re(n = a, He, $o).call(n), re(this, He, wp).call(this, a) ? (r = !1, re(this, He, _p).call(this, a, s)) : re(this, He, Qv).call(this, a) ? (r = !1, re(this, He, ex).call(this, a, s)) : re(this, He, nx).call(this, a) && (r = !1, re(this, He, ix).call(this, a)));
      }
    } while (!r && ++i < 10);
  } else
    for (const i of m(this, De))
      typeof i == "object" && re(e = i, He, $o).call(e);
  Q(this, In, void 0);
}, Sp = function(e) {
  return m(this, De).map((n) => {
    if (typeof n == "string")
      throw new Error("string type in extglob ast??");
    const [i, r, s, a] = n.toRegExpSource(e);
    return Q(this, Wn, m(this, Wn) || a), i;
  }).filter((n) => !(this.isStart() && this.isEnd()) || !!n).join("|");
}, rx = function(e, n, i = !1) {
  let r = !1, s = "", a = !1, o = !1;
  for (let c = 0; c < e.length; c++) {
    const l = e.charAt(c);
    if (r) {
      r = !1, s += (k2.has(l) ? "\\" : "") + l, o = !1;
      continue;
    }
    if (l === "\\") {
      c === e.length - 1 ? s += "\\\\" : r = !0;
      continue;
    }
    if (l === "[") {
      const [u, p, d, b] = (0, S2.parseClass)(e, c);
      if (d) {
        s += u, a = a || p, c += d - 1, n = n || b, o = !1;
        continue;
      }
    }
    if (l === "*") {
      if (o)
        continue;
      o = !0, s += i && /^[*]+$/.test(e) ? lg : cg, n = !0;
      continue;
    } else
      o = !1;
    if (l === "?") {
      s += Hf, n = !0;
      continue;
    }
    s += I2(l);
  }
  return [s, (0, yo.unescape)(e), !!n, a];
}, fe(Vf, Ri);
Zs.AST = Vf;
Gt = Vf;
var Xs = {};
Object.defineProperty(Xs, "__esModule", { value: !0 });
Xs.escape = void 0;
const D2 = (t, { windowsPathsNoEscape: e = !1 } = {}) => e ? t.replace(/[?*()[\]]/g, "[$&]") : t.replace(/[?*()[\]\\]/g, "\\$&");
Xs.escape = D2;
(function(t) {
  var J, sx, Ep, Pr;
  var e = We && We.__importDefault || function(j) {
    return j && j.__esModule ? j : { default: j };
  };
  Object.defineProperty(t, "__esModule", { value: !0 }), t.unescape = t.escape = t.AST = t.Minimatch = t.match = t.makeRe = t.braceExpand = t.defaults = t.filter = t.GLOBSTAR = t.sep = t.minimatch = void 0;
  const n = e(iy), i = al, r = Zs, s = Xs, a = ns, o = (j, E, I = {}) => ((0, i.assertValidPattern)(E), !I.nocomment && E.charAt(0) === "#" ? !1 : new ye(E, I).match(j));
  t.minimatch = o;
  const c = /^\*+([^+@!?\*\[\(]*)$/, l = (j) => (E) => !E.startsWith(".") && E.endsWith(j), u = (j) => (E) => E.endsWith(j), p = (j) => (j = j.toLowerCase(), (E) => !E.startsWith(".") && E.toLowerCase().endsWith(j)), d = (j) => (j = j.toLowerCase(), (E) => E.toLowerCase().endsWith(j)), b = /^\*+\.\*+$/, x = (j) => !j.startsWith(".") && j.includes("."), v = (j) => j !== "." && j !== ".." && j.includes("."), y = /^\.\*+$/, f = (j) => j !== "." && j !== ".." && j.startsWith("."), h = /^\*+$/, g = (j) => j.length !== 0 && !j.startsWith("."), A = (j) => j.length !== 0 && j !== "." && j !== "..", C = /^\?+([^+@!?\*\[\(]*)?$/, V = ([j, E = ""]) => {
    const I = D([j]);
    return E ? (E = E.toLowerCase(), (M) => I(M) && M.toLowerCase().endsWith(E)) : I;
  }, K = ([j, E = ""]) => {
    const I = B([j]);
    return E ? (E = E.toLowerCase(), (M) => I(M) && M.toLowerCase().endsWith(E)) : I;
  }, L = ([j, E = ""]) => {
    const I = B([j]);
    return E ? (M) => I(M) && M.endsWith(E) : I;
  }, X = ([j, E = ""]) => {
    const I = D([j]);
    return E ? (M) => I(M) && M.endsWith(E) : I;
  }, D = ([j]) => {
    const E = j.length;
    return (I) => I.length === E && !I.startsWith(".");
  }, B = ([j]) => {
    const E = j.length;
    return (I) => I.length === E && I !== "." && I !== "..";
  }, Y = typeof process == "object" && process ? typeof process.env == "object" && process.env && process.env.__MINIMATCH_TESTING_PLATFORM__ || process.platform : "posix", U = {
    win32: { sep: "\\" },
    posix: { sep: "/" }
  };
  t.sep = Y === "win32" ? U.win32.sep : U.posix.sep, t.minimatch.sep = t.sep, t.GLOBSTAR = Symbol("globstar **"), t.minimatch.GLOBSTAR = t.GLOBSTAR;
  const le = "[^/]" + "*?", pe = "(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?", z = "(?:(?!(?:\\/|^)\\.).)*?", k = (j, E = {}) => (I) => (0, t.minimatch)(I, j, E);
  t.filter = k, t.minimatch.filter = t.filter;
  const H = (j, E = {}) => Object.assign({}, j, E), R = (j) => {
    if (!j || typeof j != "object" || !Object.keys(j).length)
      return t.minimatch;
    const E = t.minimatch;
    return Object.assign((M, O, w = {}) => E(M, O, H(j, w)), {
      Minimatch: class extends E.Minimatch {
        constructor(O, w = {}) {
          super(O, H(j, w));
        }
        static defaults(O) {
          return E.defaults(H(j, O)).Minimatch;
        }
      },
      AST: class extends E.AST {
        /* c8 ignore start */
        constructor(O, w, q = {}) {
          super(O, w, H(j, q));
        }
        /* c8 ignore stop */
        static fromGlob(O, w = {}) {
          return E.AST.fromGlob(O, H(j, w));
        }
      },
      unescape: (M, O = {}) => E.unescape(M, H(j, O)),
      escape: (M, O = {}) => E.escape(M, H(j, O)),
      filter: (M, O = {}) => E.filter(M, H(j, O)),
      defaults: (M) => E.defaults(H(j, M)),
      makeRe: (M, O = {}) => E.makeRe(M, H(j, O)),
      braceExpand: (M, O = {}) => E.braceExpand(M, H(j, O)),
      match: (M, O, w = {}) => E.match(M, O, H(j, w)),
      sep: E.sep,
      GLOBSTAR: t.GLOBSTAR
    });
  };
  t.defaults = R, t.minimatch.defaults = t.defaults;
  const Z = (j, E = {}) => ((0, i.assertValidPattern)(j), E.nobrace || !/\{(?:(?!\{).)*\}/.test(j) ? [j] : (0, n.default)(j));
  t.braceExpand = Z, t.minimatch.braceExpand = t.braceExpand;
  const se = (j, E = {}) => new ye(j, E).makeRe();
  t.makeRe = se, t.minimatch.makeRe = t.makeRe;
  const te = (j, E, I = {}) => {
    const M = new ye(E, I);
    return j = j.filter((O) => M.match(O)), M.options.nonull && !j.length && j.push(E), j;
  };
  t.match = te, t.minimatch.match = t.match;
  const he = /[?*]|[+@!]\(.*?\)|\[|\]/, Se = (j) => j.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  class ye {
    constructor(E, I = {}) {
      fe(this, J);
      ne(this, "options");
      ne(this, "set");
      ne(this, "pattern");
      ne(this, "windowsPathsNoEscape");
      ne(this, "nonegate");
      ne(this, "negate");
      ne(this, "comment");
      ne(this, "empty");
      ne(this, "preserveMultipleSlashes");
      ne(this, "partial");
      ne(this, "globSet");
      ne(this, "globParts");
      ne(this, "nocase");
      ne(this, "isWindows");
      ne(this, "platform");
      ne(this, "windowsNoMagicRoot");
      ne(this, "maxGlobstarRecursion");
      ne(this, "regexp");
      (0, i.assertValidPattern)(E), I = I || {}, this.options = I, this.maxGlobstarRecursion = I.maxGlobstarRecursion ?? 200, this.pattern = E, this.platform = I.platform || Y, this.isWindows = this.platform === "win32", this.windowsPathsNoEscape = !!I.windowsPathsNoEscape || I.allowWindowsEscape === !1, this.windowsPathsNoEscape && (this.pattern = this.pattern.replace(/\\/g, "/")), this.preserveMultipleSlashes = !!I.preserveMultipleSlashes, this.regexp = null, this.negate = !1, this.nonegate = !!I.nonegate, this.comment = !1, this.empty = !1, this.partial = !!I.partial, this.nocase = !!this.options.nocase, this.windowsNoMagicRoot = I.windowsNoMagicRoot !== void 0 ? I.windowsNoMagicRoot : !!(this.isWindows && this.nocase), this.globSet = [], this.globParts = [], this.set = [], this.make();
    }
    hasMagic() {
      if (this.options.magicalBraces && this.set.length > 1)
        return !0;
      for (const E of this.set)
        for (const I of E)
          if (typeof I != "string")
            return !0;
      return !1;
    }
    debug(...E) {
    }
    make() {
      const E = this.pattern, I = this.options;
      if (!I.nocomment && E.charAt(0) === "#") {
        this.comment = !0;
        return;
      }
      if (!E) {
        this.empty = !0;
        return;
      }
      this.parseNegate(), this.globSet = [...new Set(this.braceExpand())], I.debug && (this.debug = (...w) => console.error(...w)), this.debug(this.pattern, this.globSet);
      const M = this.globSet.map((w) => this.slashSplit(w));
      this.globParts = this.preprocess(M), this.debug(this.pattern, this.globParts);
      let O = this.globParts.map((w, q, ee) => {
        if (this.isWindows && this.windowsNoMagicRoot) {
          const G = w[0] === "" && w[1] === "" && (w[2] === "?" || !he.test(w[2])) && !he.test(w[3]), de = /^[a-z]:/i.test(w[0]);
          if (G)
            return [...w.slice(0, 4), ...w.slice(4).map((ve) => this.parse(ve))];
          if (de)
            return [w[0], ...w.slice(1).map((ve) => this.parse(ve))];
        }
        return w.map((G) => this.parse(G));
      });
      if (this.debug(this.pattern, O), this.set = O.filter((w) => w.indexOf(!1) === -1), this.isWindows)
        for (let w = 0; w < this.set.length; w++) {
          const q = this.set[w];
          q[0] === "" && q[1] === "" && this.globParts[w][2] === "?" && typeof q[3] == "string" && /^[a-z]:$/i.test(q[3]) && (q[2] = "?");
        }
      this.debug(this.pattern, this.set);
    }
    // various transforms to equivalent pattern sets that are
    // faster to process in a filesystem walk.  The goal is to
    // eliminate what we can, and push all ** patterns as far
    // to the right as possible, even if it increases the number
    // of patterns that we have to process.
    preprocess(E) {
      if (this.options.noglobstar)
        for (let M = 0; M < E.length; M++)
          for (let O = 0; O < E[M].length; O++)
            E[M][O] === "**" && (E[M][O] = "*");
      const { optimizationLevel: I = 1 } = this.options;
      return I >= 2 ? (E = this.firstPhasePreProcess(E), E = this.secondPhasePreProcess(E)) : I >= 1 ? E = this.levelOneOptimize(E) : E = this.adjascentGlobstarOptimize(E), E;
    }
    // just get rid of adjascent ** portions
    adjascentGlobstarOptimize(E) {
      return E.map((I) => {
        let M = -1;
        for (; (M = I.indexOf("**", M + 1)) !== -1; ) {
          let O = M;
          for (; I[O + 1] === "**"; )
            O++;
          O !== M && I.splice(M, O - M);
        }
        return I;
      });
    }
    // get rid of adjascent ** and resolve .. portions
    levelOneOptimize(E) {
      return E.map((I) => (I = I.reduce((M, O) => {
        const w = M[M.length - 1];
        return O === "**" && w === "**" ? M : O === ".." && w && w !== ".." && w !== "." && w !== "**" ? (M.pop(), M) : (M.push(O), M);
      }, []), I.length === 0 ? [""] : I));
    }
    levelTwoFileOptimize(E) {
      Array.isArray(E) || (E = this.slashSplit(E));
      let I = !1;
      do {
        if (I = !1, !this.preserveMultipleSlashes) {
          for (let O = 1; O < E.length - 1; O++) {
            const w = E[O];
            O === 1 && w === "" && E[0] === "" || (w === "." || w === "") && (I = !0, E.splice(O, 1), O--);
          }
          E[0] === "." && E.length === 2 && (E[1] === "." || E[1] === "") && (I = !0, E.pop());
        }
        let M = 0;
        for (; (M = E.indexOf("..", M + 1)) !== -1; ) {
          const O = E[M - 1];
          O && O !== "." && O !== ".." && O !== "**" && (I = !0, E.splice(M - 1, 2), M -= 2);
        }
      } while (I);
      return E.length === 0 ? [""] : E;
    }
    // First phase: single-pattern processing
    // <pre> is 1 or more portions
    // <rest> is 1 or more portions
    // <p> is any portion other than ., .., '', or **
    // <e> is . or ''
    //
    // **/.. is *brutal* for filesystem walking performance, because
    // it effectively resets the recursive walk each time it occurs,
    // and ** cannot be reduced out by a .. pattern part like a regexp
    // or most strings (other than .., ., and '') can be.
    //
    // <pre>/**/../<p>/<p>/<rest> -> {<pre>/../<p>/<p>/<rest>,<pre>/**/<p>/<p>/<rest>}
    // <pre>/<e>/<rest> -> <pre>/<rest>
    // <pre>/<p>/../<rest> -> <pre>/<rest>
    // **/**/<rest> -> **/<rest>
    //
    // **/*/<rest> -> */**/<rest> <== not valid because ** doesn't follow
    // this WOULD be allowed if ** did follow symlinks, or * didn't
    firstPhasePreProcess(E) {
      let I = !1;
      do {
        I = !1;
        for (let M of E) {
          let O = -1;
          for (; (O = M.indexOf("**", O + 1)) !== -1; ) {
            let q = O;
            for (; M[q + 1] === "**"; )
              q++;
            q > O && M.splice(O + 1, q - O);
            let ee = M[O + 1];
            const G = M[O + 2], de = M[O + 3];
            if (ee !== ".." || !G || G === "." || G === ".." || !de || de === "." || de === "..")
              continue;
            I = !0, M.splice(O, 1);
            const ve = M.slice(0);
            ve[O] = "**", E.push(ve), O--;
          }
          if (!this.preserveMultipleSlashes) {
            for (let q = 1; q < M.length - 1; q++) {
              const ee = M[q];
              q === 1 && ee === "" && M[0] === "" || (ee === "." || ee === "") && (I = !0, M.splice(q, 1), q--);
            }
            M[0] === "." && M.length === 2 && (M[1] === "." || M[1] === "") && (I = !0, M.pop());
          }
          let w = 0;
          for (; (w = M.indexOf("..", w + 1)) !== -1; ) {
            const q = M[w - 1];
            if (q && q !== "." && q !== ".." && q !== "**") {
              I = !0;
              const G = w === 1 && M[w + 1] === "**" ? ["."] : [];
              M.splice(w - 1, 2, ...G), M.length === 0 && M.push(""), w -= 2;
            }
          }
        }
      } while (I);
      return E;
    }
    // second phase: multi-pattern dedupes
    // {<pre>/*/<rest>,<pre>/<p>/<rest>} -> <pre>/*/<rest>
    // {<pre>/<rest>,<pre>/<rest>} -> <pre>/<rest>
    // {<pre>/**/<rest>,<pre>/<rest>} -> <pre>/**/<rest>
    //
    // {<pre>/**/<rest>,<pre>/**/<p>/<rest>} -> <pre>/**/<rest>
    // ^-- not valid because ** doens't follow symlinks
    secondPhasePreProcess(E) {
      for (let I = 0; I < E.length - 1; I++)
        for (let M = I + 1; M < E.length; M++) {
          const O = this.partsMatch(E[I], E[M], !this.preserveMultipleSlashes);
          if (O) {
            E[I] = [], E[M] = O;
            break;
          }
        }
      return E.filter((I) => I.length);
    }
    partsMatch(E, I, M = !1) {
      let O = 0, w = 0, q = [], ee = "";
      for (; O < E.length && w < I.length; )
        if (E[O] === I[w])
          q.push(ee === "b" ? I[w] : E[O]), O++, w++;
        else if (M && E[O] === "**" && I[w] === E[O + 1])
          q.push(E[O]), O++;
        else if (M && I[w] === "**" && E[O] === I[w + 1])
          q.push(I[w]), w++;
        else if (E[O] === "*" && I[w] && (this.options.dot || !I[w].startsWith(".")) && I[w] !== "**") {
          if (ee === "b")
            return !1;
          ee = "a", q.push(E[O]), O++, w++;
        } else if (I[w] === "*" && E[O] && (this.options.dot || !E[O].startsWith(".")) && E[O] !== "**") {
          if (ee === "a")
            return !1;
          ee = "b", q.push(I[w]), O++, w++;
        } else
          return !1;
      return E.length === I.length && q;
    }
    parseNegate() {
      if (this.nonegate)
        return;
      const E = this.pattern;
      let I = !1, M = 0;
      for (let O = 0; O < E.length && E.charAt(O) === "!"; O++)
        I = !I, M++;
      M && (this.pattern = E.slice(M)), this.negate = I;
    }
    // set partial to true to test if, for example,
    // "/a/b" matches the start of "/*/b/*/d"
    // Partial means, if you run out of file before you run
    // out of pattern, then that's fine, as long as all
    // the parts match.
    matchOne(E, I, M = !1) {
      let O = 0, w = 0;
      if (this.isWindows) {
        const ee = typeof E[0] == "string" && /^[a-z]:$/i.test(E[0]), G = !ee && E[0] === "" && E[1] === "" && E[2] === "?" && /^[a-z]:$/i.test(E[3]), de = typeof I[0] == "string" && /^[a-z]:$/i.test(I[0]), ve = !de && I[0] === "" && I[1] === "" && I[2] === "?" && typeof I[3] == "string" && /^[a-z]:$/i.test(I[3]), me = G ? 3 : ee ? 0 : void 0, Te = ve ? 3 : de ? 0 : void 0;
        if (typeof me == "number" && typeof Te == "number") {
          const [Le, Fe] = [
            E[me],
            I[Te]
          ];
          Le.toLowerCase() === Fe.toLowerCase() && (I[Te] = Le, w = Te, O = me);
        }
      }
      const { optimizationLevel: q = 1 } = this.options;
      return q >= 2 && (E = this.levelTwoFileOptimize(E)), I.includes(t.GLOBSTAR) ? re(this, J, sx).call(this, E, I, M, O, w) : re(this, J, Pr).call(this, E, I, M, O, w);
    }
    braceExpand() {
      return (0, t.braceExpand)(this.pattern, this.options);
    }
    parse(E) {
      (0, i.assertValidPattern)(E);
      const I = this.options;
      if (E === "**")
        return t.GLOBSTAR;
      if (E === "")
        return "";
      let M, O = null;
      (M = E.match(h)) ? O = I.dot ? A : g : (M = E.match(c)) ? O = (I.nocase ? I.dot ? d : p : I.dot ? u : l)(M[1]) : (M = E.match(C)) ? O = (I.nocase ? I.dot ? K : V : I.dot ? L : X)(M) : (M = E.match(b)) ? O = I.dot ? v : x : (M = E.match(y)) && (O = f);
      const w = r.AST.fromGlob(E, this.options).toMMPattern();
      return O && typeof w == "object" && Reflect.defineProperty(w, "test", { value: O }), w;
    }
    makeRe() {
      if (this.regexp || this.regexp === !1)
        return this.regexp;
      const E = this.set;
      if (!E.length)
        return this.regexp = !1, this.regexp;
      const I = this.options, M = I.noglobstar ? le : I.dot ? pe : z, O = new Set(I.nocase ? ["i"] : []);
      let w = E.map((G) => {
        const de = G.map((ve) => {
          if (ve instanceof RegExp)
            for (const me of ve.flags.split(""))
              O.add(me);
          return typeof ve == "string" ? Se(ve) : ve === t.GLOBSTAR ? t.GLOBSTAR : ve._src;
        });
        return de.forEach((ve, me) => {
          const Te = de[me + 1], Le = de[me - 1];
          ve !== t.GLOBSTAR || Le === t.GLOBSTAR || (Le === void 0 ? Te !== void 0 && Te !== t.GLOBSTAR ? de[me + 1] = "(?:\\/|" + M + "\\/)?" + Te : de[me] = M : Te === void 0 ? de[me - 1] = Le + "(?:\\/|" + M + ")?" : Te !== t.GLOBSTAR && (de[me - 1] = Le + "(?:\\/|\\/" + M + "\\/)" + Te, de[me + 1] = t.GLOBSTAR));
        }), de.filter((ve) => ve !== t.GLOBSTAR).join("/");
      }).join("|");
      const [q, ee] = E.length > 1 ? ["(?:", ")"] : ["", ""];
      w = "^" + q + w + ee + "$", this.negate && (w = "^(?!" + w + ").+$");
      try {
        this.regexp = new RegExp(w, [...O].join(""));
      } catch {
        this.regexp = !1;
      }
      return this.regexp;
    }
    slashSplit(E) {
      return this.preserveMultipleSlashes ? E.split("/") : this.isWindows && /^\/\/[^\/]+/.test(E) ? ["", ...E.split(/\/+/)] : E.split(/\/+/);
    }
    match(E, I = this.partial) {
      if (this.debug("match", E, this.pattern), this.comment)
        return !1;
      if (this.empty)
        return E === "";
      if (E === "/" && I)
        return !0;
      const M = this.options;
      this.isWindows && (E = E.split("\\").join("/"));
      const O = this.slashSplit(E);
      this.debug(this.pattern, "split", O);
      const w = this.set;
      this.debug(this.pattern, "set", w);
      let q = O[O.length - 1];
      if (!q)
        for (let ee = O.length - 2; !q && ee >= 0; ee--)
          q = O[ee];
      for (let ee = 0; ee < w.length; ee++) {
        const G = w[ee];
        let de = O;
        if (M.matchBase && G.length === 1 && (de = [q]), this.matchOne(de, G, I))
          return M.flipNegate ? !0 : !this.negate;
      }
      return M.flipNegate ? !1 : this.negate;
    }
    static defaults(E) {
      return t.minimatch.defaults(E).Minimatch;
    }
  }
  J = new WeakSet(), sx = function(E, I, M, O, w) {
    const q = I.indexOf(t.GLOBSTAR, w), ee = I.lastIndexOf(t.GLOBSTAR), [G, de, ve] = M ? [
      I.slice(w, q),
      I.slice(q + 1),
      []
    ] : [
      I.slice(w, q),
      I.slice(q + 1, ee),
      I.slice(ee + 1)
    ];
    if (G.length) {
      const mt = E.slice(O, O + G.length);
      if (!re(this, J, Pr).call(this, mt, G, M, 0, 0))
        return !1;
      O += G.length;
    }
    let me = 0;
    if (ve.length) {
      if (ve.length + O > E.length)
        return !1;
      let mt = E.length - ve.length;
      if (re(this, J, Pr).call(this, E, ve, M, mt, 0))
        me = ve.length;
      else {
        if (E[E.length - 1] !== "" || O + ve.length === E.length || (mt--, !re(this, J, Pr).call(this, E, ve, M, mt, 0)))
          return !1;
        me = ve.length + 1;
      }
    }
    if (!de.length) {
      let mt = !!me;
      for (let Ae = O; Ae < E.length - me; Ae++) {
        const qt = String(E[Ae]);
        if (mt = !0, qt === "." || qt === ".." || !this.options.dot && qt.startsWith("."))
          return !1;
      }
      return M || mt;
    }
    const Te = [[[], 0]];
    let Le = Te[0], Fe = 0;
    const Ot = [0];
    for (const mt of de)
      mt === t.GLOBSTAR ? (Ot.push(Fe), Le = [[], 0], Te.push(Le)) : (Le[0].push(mt), Fe++);
    let Bn = Te.length - 1;
    const wt = E.length - me;
    for (const mt of Te)
      mt[1] = wt - (Ot[Bn--] + mt[0].length);
    return !!re(this, J, Ep).call(this, E, Te, O, 0, M, 0, !!me);
  }, Ep = function(E, I, M, O, w, q, ee) {
    const G = I[O];
    if (!G) {
      for (let me = M; me < E.length; me++) {
        ee = !0;
        const Te = E[me];
        if (Te === "." || Te === ".." || !this.options.dot && Te.startsWith("."))
          return !1;
      }
      return ee;
    }
    const [de, ve] = G;
    for (; M <= ve; ) {
      if (re(this, J, Pr).call(this, E.slice(0, M + de.length), de, w, M, 0) && q < this.maxGlobstarRecursion) {
        const Le = re(this, J, Ep).call(this, E, I, M + de.length, O + 1, w, q + 1, ee);
        if (Le !== !1)
          return Le;
      }
      const Te = E[M];
      if (Te === "." || Te === ".." || !this.options.dot && Te.startsWith("."))
        return !1;
      M++;
    }
    return w || null;
  }, Pr = function(E, I, M, O, w) {
    let q, ee, G, de;
    for (q = O, ee = w, de = E.length, G = I.length; q < de && ee < G; q++, ee++) {
      this.debug("matchOne loop");
      let ve = I[ee], me = E[q];
      if (this.debug(I, ve, me), ve === !1 || ve === t.GLOBSTAR)
        return !1;
      let Te;
      if (typeof ve == "string" ? (Te = me === ve, this.debug("string match", ve, me, Te)) : (Te = ve.test(me), this.debug("pattern match", ve, me, Te)), !Te)
        return !1;
    }
    if (q === de && ee === G)
      return !0;
    if (q === de)
      return M;
    if (ee === G)
      return q === de - 1 && E[q] === "";
    throw new Error("wtf?");
  }, t.Minimatch = ye;
  var T = Zs;
  Object.defineProperty(t, "AST", { enumerable: !0, get: function() {
    return T.AST;
  } });
  var S = Xs;
  Object.defineProperty(t, "escape", { enumerable: !0, get: function() {
    return S.escape;
  } });
  var W = ns;
  Object.defineProperty(t, "unescape", { enumerable: !0, get: function() {
    return W.unescape;
  } }), t.minimatch.AST = r.AST, t.minimatch.Minimatch = ye, t.minimatch.escape = s.escape, t.minimatch.unescape = a.unescape;
})(Pi);
var Js = {}, et = {}, cl = {};
Object.defineProperty(cl, "__esModule", { value: !0 });
cl.LRUCache = void 0;
const Ar = typeof performance == "object" && performance && typeof performance.now == "function" ? performance : Date, ax = /* @__PURE__ */ new Set(), Ap = typeof process == "object" && process ? process : {}, ox = (t, e, n, i) => {
  typeof Ap.emitWarning == "function" ? Ap.emitWarning(t, e, n, i) : console.error(`[${n}] ${e}: ${t}`);
};
let Rc = globalThis.AbortController, ug = globalThis.AbortSignal;
var Lg;
if (typeof Rc > "u") {
  ug = class {
    constructor() {
      ne(this, "onabort");
      ne(this, "_onabort", []);
      ne(this, "reason");
      ne(this, "aborted", !1);
    }
    addEventListener(i, r) {
      this._onabort.push(r);
    }
  }, Rc = class {
    constructor() {
      ne(this, "signal", new ug());
      e();
    }
    abort(i) {
      var r, s;
      if (!this.signal.aborted) {
        this.signal.reason = i, this.signal.aborted = !0;
        for (const a of this.signal._onabort)
          a(i);
        (s = (r = this.signal).onabort) == null || s.call(r, i);
      }
    }
  };
  let t = ((Lg = Ap.env) == null ? void 0 : Lg.LRU_CACHE_IGNORE_AC_WARNING) !== "1";
  const e = () => {
    t && (t = !1, ox("AbortController is not defined. If using lru-cache in node 14, load an AbortController polyfill from the `node-abort-controller` package. A minimal polyfill is provided for use by LRUCache.fetch(), but it should not be relied upon in other contexts (eg, passing it to other APIs that use AbortController/AbortSignal might have undesirable effects). You may disable this with LRU_CACHE_IGNORE_AC_WARNING=1 in the env.", "NO_ABORT_CONTROLLER", "ENOTSUP", e));
  };
}
const j2 = (t) => !ax.has(t), oi = (t) => t && t === Math.floor(t) && t > 0 && isFinite(t), cx = (t) => oi(t) ? t <= Math.pow(2, 8) ? Uint8Array : t <= Math.pow(2, 16) ? Uint16Array : t <= Math.pow(2, 32) ? Uint32Array : t <= Number.MAX_SAFE_INTEGER ? Bo : null : null;
class Bo extends Array {
  constructor(e) {
    super(e), this.fill(0);
  }
}
var Mr;
const Vi = class Vi {
  constructor(e, n) {
    ne(this, "heap");
    ne(this, "length");
    if (!m(Vi, Mr))
      throw new TypeError("instantiate Stack using Stack.create(n)");
    this.heap = new n(e), this.length = 0;
  }
  static create(e) {
    const n = cx(e);
    if (!n)
      return [];
    Q(Vi, Mr, !0);
    const i = new Vi(e, n);
    return Q(Vi, Mr, !1), i;
  }
  push(e) {
    this.heap[this.length++] = e;
  }
  pop() {
    return this.heap[--this.length];
  }
};
Mr = new WeakMap(), // private constructor
fe(Vi, Mr, !1);
let Tp = Vi;
var Ng, Fg, gn, Zt, bn, yn, $r, Br, bt, vn, ft, Ze, Ie, $t, Xt, Nt, St, xn, Et, wn, _n, Jt, Sn, hi, Bt, _e, Op, Xi, qn, ra, Qt, lx, Ji, Ur, sa, ci, li, Pp, Uo, zo, Ye, Cp, Ps, ui, kp;
const md = class md {
  constructor(e) {
    fe(this, _e);
    // options that cannot be changed without disaster
    fe(this, gn);
    fe(this, Zt);
    fe(this, bn);
    fe(this, yn);
    fe(this, $r);
    fe(this, Br);
    /**
     * {@link LRUCache.OptionsBase.ttl}
     */
    ne(this, "ttl");
    /**
     * {@link LRUCache.OptionsBase.ttlResolution}
     */
    ne(this, "ttlResolution");
    /**
     * {@link LRUCache.OptionsBase.ttlAutopurge}
     */
    ne(this, "ttlAutopurge");
    /**
     * {@link LRUCache.OptionsBase.updateAgeOnGet}
     */
    ne(this, "updateAgeOnGet");
    /**
     * {@link LRUCache.OptionsBase.updateAgeOnHas}
     */
    ne(this, "updateAgeOnHas");
    /**
     * {@link LRUCache.OptionsBase.allowStale}
     */
    ne(this, "allowStale");
    /**
     * {@link LRUCache.OptionsBase.noDisposeOnSet}
     */
    ne(this, "noDisposeOnSet");
    /**
     * {@link LRUCache.OptionsBase.noUpdateTTL}
     */
    ne(this, "noUpdateTTL");
    /**
     * {@link LRUCache.OptionsBase.maxEntrySize}
     */
    ne(this, "maxEntrySize");
    /**
     * {@link LRUCache.OptionsBase.sizeCalculation}
     */
    ne(this, "sizeCalculation");
    /**
     * {@link LRUCache.OptionsBase.noDeleteOnFetchRejection}
     */
    ne(this, "noDeleteOnFetchRejection");
    /**
     * {@link LRUCache.OptionsBase.noDeleteOnStaleGet}
     */
    ne(this, "noDeleteOnStaleGet");
    /**
     * {@link LRUCache.OptionsBase.allowStaleOnFetchAbort}
     */
    ne(this, "allowStaleOnFetchAbort");
    /**
     * {@link LRUCache.OptionsBase.allowStaleOnFetchRejection}
     */
    ne(this, "allowStaleOnFetchRejection");
    /**
     * {@link LRUCache.OptionsBase.ignoreFetchAbort}
     */
    ne(this, "ignoreFetchAbort");
    // computed properties
    fe(this, bt);
    fe(this, vn);
    fe(this, ft);
    fe(this, Ze);
    fe(this, Ie);
    fe(this, $t);
    fe(this, Xt);
    fe(this, Nt);
    fe(this, St);
    fe(this, xn);
    fe(this, Et);
    fe(this, wn);
    fe(this, _n);
    fe(this, Jt);
    fe(this, Sn);
    fe(this, hi);
    fe(this, Bt);
    // conditionally set private methods related to TTL
    fe(this, Xi, () => {
    });
    fe(this, qn, () => {
    });
    fe(this, ra, () => {
    });
    /* c8 ignore stop */
    fe(this, Qt, () => !1);
    fe(this, Ji, (e) => {
    });
    fe(this, Ur, (e, n, i) => {
    });
    fe(this, sa, (e, n, i, r) => {
      if (i || r)
        throw new TypeError("cannot set size without setting maxSize or maxEntrySize on cache");
      return 0;
    });
    /**
     * A String value that is used in the creation of the default string
     * description of an object. Called by the built-in method
     * `Object.prototype.toString`.
     */
    ne(this, Ng, "LRUCache");
    const { max: n = 0, ttl: i, ttlResolution: r = 1, ttlAutopurge: s, updateAgeOnGet: a, updateAgeOnHas: o, allowStale: c, dispose: l, disposeAfter: u, noDisposeOnSet: p, noUpdateTTL: d, maxSize: b = 0, maxEntrySize: x = 0, sizeCalculation: v, fetchMethod: y, memoMethod: f, noDeleteOnFetchRejection: h, noDeleteOnStaleGet: g, allowStaleOnFetchRejection: A, allowStaleOnFetchAbort: C, ignoreFetchAbort: V } = e;
    if (n !== 0 && !oi(n))
      throw new TypeError("max option must be a nonnegative integer");
    const K = n ? cx(n) : Array;
    if (!K)
      throw new Error("invalid max value: " + n);
    if (Q(this, gn, n), Q(this, Zt, b), this.maxEntrySize = x || m(this, Zt), this.sizeCalculation = v, this.sizeCalculation) {
      if (!m(this, Zt) && !this.maxEntrySize)
        throw new TypeError("cannot set sizeCalculation without setting maxSize or maxEntrySize");
      if (typeof this.sizeCalculation != "function")
        throw new TypeError("sizeCalculation set to non-function");
    }
    if (f !== void 0 && typeof f != "function")
      throw new TypeError("memoMethod must be a function if defined");
    if (Q(this, Br, f), y !== void 0 && typeof y != "function")
      throw new TypeError("fetchMethod must be a function if specified");
    if (Q(this, $r, y), Q(this, hi, !!y), Q(this, ft, /* @__PURE__ */ new Map()), Q(this, Ze, new Array(n).fill(void 0)), Q(this, Ie, new Array(n).fill(void 0)), Q(this, $t, new K(n)), Q(this, Xt, new K(n)), Q(this, Nt, 0), Q(this, St, 0), Q(this, xn, Tp.create(n)), Q(this, bt, 0), Q(this, vn, 0), typeof l == "function" && Q(this, bn, l), typeof u == "function" ? (Q(this, yn, u), Q(this, Et, [])) : (Q(this, yn, void 0), Q(this, Et, void 0)), Q(this, Sn, !!m(this, bn)), Q(this, Bt, !!m(this, yn)), this.noDisposeOnSet = !!p, this.noUpdateTTL = !!d, this.noDeleteOnFetchRejection = !!h, this.allowStaleOnFetchRejection = !!A, this.allowStaleOnFetchAbort = !!C, this.ignoreFetchAbort = !!V, this.maxEntrySize !== 0) {
      if (m(this, Zt) !== 0 && !oi(m(this, Zt)))
        throw new TypeError("maxSize must be a positive integer if specified");
      if (!oi(this.maxEntrySize))
        throw new TypeError("maxEntrySize must be a positive integer if specified");
      re(this, _e, lx).call(this);
    }
    if (this.allowStale = !!c, this.noDeleteOnStaleGet = !!g, this.updateAgeOnGet = !!a, this.updateAgeOnHas = !!o, this.ttlResolution = oi(r) || r === 0 ? r : 1, this.ttlAutopurge = !!s, this.ttl = i || 0, this.ttl) {
      if (!oi(this.ttl))
        throw new TypeError("ttl must be a positive integer if specified");
      re(this, _e, Op).call(this);
    }
    if (m(this, gn) === 0 && this.ttl === 0 && m(this, Zt) === 0)
      throw new TypeError("At least one of max, maxSize, or ttl is required");
    if (!this.ttlAutopurge && !m(this, gn) && !m(this, Zt)) {
      const L = "LRU_CACHE_UNBOUNDED";
      j2(L) && (ax.add(L), ox("TTL caching without ttlAutopurge, max, or maxSize can result in unbounded memory consumption.", "UnboundedCacheWarning", L, md));
    }
  }
  /**
   * Do not call this method unless you need to inspect the
   * inner workings of the cache.  If anything returned by this
   * object is modified in any way, strange breakage may occur.
   *
   * These fields are private for a reason!
   *
   * @internal
   */
  static unsafeExposeInternals(e) {
    return {
      // properties
      starts: m(e, _n),
      ttls: m(e, Jt),
      sizes: m(e, wn),
      keyMap: m(e, ft),
      keyList: m(e, Ze),
      valList: m(e, Ie),
      next: m(e, $t),
      prev: m(e, Xt),
      get head() {
        return m(e, Nt);
      },
      get tail() {
        return m(e, St);
      },
      free: m(e, xn),
      // methods
      isBackgroundFetch: (n) => {
        var i;
        return re(i = e, _e, Ye).call(i, n);
      },
      backgroundFetch: (n, i, r, s) => {
        var a;
        return re(a = e, _e, zo).call(a, n, i, r, s);
      },
      moveToTail: (n) => {
        var i;
        return re(i = e, _e, Ps).call(i, n);
      },
      indexes: (n) => {
        var i;
        return re(i = e, _e, ci).call(i, n);
      },
      rindexes: (n) => {
        var i;
        return re(i = e, _e, li).call(i, n);
      },
      isStale: (n) => {
        var i;
        return m(i = e, Qt).call(i, n);
      }
    };
  }
  // Protected read-only members
  /**
   * {@link LRUCache.OptionsBase.max} (read-only)
   */
  get max() {
    return m(this, gn);
  }
  /**
   * {@link LRUCache.OptionsBase.maxSize} (read-only)
   */
  get maxSize() {
    return m(this, Zt);
  }
  /**
   * The total computed size of items in the cache (read-only)
   */
  get calculatedSize() {
    return m(this, vn);
  }
  /**
   * The number of items stored in the cache (read-only)
   */
  get size() {
    return m(this, bt);
  }
  /**
   * {@link LRUCache.OptionsBase.fetchMethod} (read-only)
   */
  get fetchMethod() {
    return m(this, $r);
  }
  get memoMethod() {
    return m(this, Br);
  }
  /**
   * {@link LRUCache.OptionsBase.dispose} (read-only)
   */
  get dispose() {
    return m(this, bn);
  }
  /**
   * {@link LRUCache.OptionsBase.disposeAfter} (read-only)
   */
  get disposeAfter() {
    return m(this, yn);
  }
  /**
   * Return the number of ms left in the item's TTL. If item is not in cache,
   * returns `0`. Returns `Infinity` if item is in cache without a defined TTL.
   */
  getRemainingTTL(e) {
    return m(this, ft).has(e) ? 1 / 0 : 0;
  }
  /**
   * Return a generator yielding `[key, value]` pairs,
   * in order from most recently used to least recently used.
   */
  *entries() {
    for (const e of re(this, _e, ci).call(this))
      m(this, Ie)[e] !== void 0 && m(this, Ze)[e] !== void 0 && !re(this, _e, Ye).call(this, m(this, Ie)[e]) && (yield [m(this, Ze)[e], m(this, Ie)[e]]);
  }
  /**
   * Inverse order version of {@link LRUCache.entries}
   *
   * Return a generator yielding `[key, value]` pairs,
   * in order from least recently used to most recently used.
   */
  *rentries() {
    for (const e of re(this, _e, li).call(this))
      m(this, Ie)[e] !== void 0 && m(this, Ze)[e] !== void 0 && !re(this, _e, Ye).call(this, m(this, Ie)[e]) && (yield [m(this, Ze)[e], m(this, Ie)[e]]);
  }
  /**
   * Return a generator yielding the keys in the cache,
   * in order from most recently used to least recently used.
   */
  *keys() {
    for (const e of re(this, _e, ci).call(this)) {
      const n = m(this, Ze)[e];
      n !== void 0 && !re(this, _e, Ye).call(this, m(this, Ie)[e]) && (yield n);
    }
  }
  /**
   * Inverse order version of {@link LRUCache.keys}
   *
   * Return a generator yielding the keys in the cache,
   * in order from least recently used to most recently used.
   */
  *rkeys() {
    for (const e of re(this, _e, li).call(this)) {
      const n = m(this, Ze)[e];
      n !== void 0 && !re(this, _e, Ye).call(this, m(this, Ie)[e]) && (yield n);
    }
  }
  /**
   * Return a generator yielding the values in the cache,
   * in order from most recently used to least recently used.
   */
  *values() {
    for (const e of re(this, _e, ci).call(this))
      m(this, Ie)[e] !== void 0 && !re(this, _e, Ye).call(this, m(this, Ie)[e]) && (yield m(this, Ie)[e]);
  }
  /**
   * Inverse order version of {@link LRUCache.values}
   *
   * Return a generator yielding the values in the cache,
   * in order from least recently used to most recently used.
   */
  *rvalues() {
    for (const e of re(this, _e, li).call(this))
      m(this, Ie)[e] !== void 0 && !re(this, _e, Ye).call(this, m(this, Ie)[e]) && (yield m(this, Ie)[e]);
  }
  /**
   * Iterating over the cache itself yields the same results as
   * {@link LRUCache.entries}
   */
  [(Fg = Symbol.iterator, Ng = Symbol.toStringTag, Fg)]() {
    return this.entries();
  }
  /**
   * Find a value for which the supplied fn method returns a truthy value,
   * similar to `Array.find()`. fn is called as `fn(value, key, cache)`.
   */
  find(e, n = {}) {
    for (const i of re(this, _e, ci).call(this)) {
      const r = m(this, Ie)[i], s = re(this, _e, Ye).call(this, r) ? r.__staleWhileFetching : r;
      if (s !== void 0 && e(s, m(this, Ze)[i], this))
        return this.get(m(this, Ze)[i], n);
    }
  }
  /**
   * Call the supplied function on each item in the cache, in order from most
   * recently used to least recently used.
   *
   * `fn` is called as `fn(value, key, cache)`.
   *
   * If `thisp` is provided, function will be called in the `this`-context of
   * the provided object, or the cache if no `thisp` object is provided.
   *
   * Does not update age or recenty of use, or iterate over stale values.
   */
  forEach(e, n = this) {
    for (const i of re(this, _e, ci).call(this)) {
      const r = m(this, Ie)[i], s = re(this, _e, Ye).call(this, r) ? r.__staleWhileFetching : r;
      s !== void 0 && e.call(n, s, m(this, Ze)[i], this);
    }
  }
  /**
   * The same as {@link LRUCache.forEach} but items are iterated over in
   * reverse order.  (ie, less recently used items are iterated over first.)
   */
  rforEach(e, n = this) {
    for (const i of re(this, _e, li).call(this)) {
      const r = m(this, Ie)[i], s = re(this, _e, Ye).call(this, r) ? r.__staleWhileFetching : r;
      s !== void 0 && e.call(n, s, m(this, Ze)[i], this);
    }
  }
  /**
   * Delete any stale entries. Returns true if anything was removed,
   * false otherwise.
   */
  purgeStale() {
    let e = !1;
    for (const n of re(this, _e, li).call(this, { allowStale: !0 }))
      m(this, Qt).call(this, n) && (re(this, _e, ui).call(this, m(this, Ze)[n], "expire"), e = !0);
    return e;
  }
  /**
   * Get the extended info about a given entry, to get its value, size, and
   * TTL info simultaneously. Returns `undefined` if the key is not present.
   *
   * Unlike {@link LRUCache#dump}, which is designed to be portable and survive
   * serialization, the `start` value is always the current timestamp, and the
   * `ttl` is a calculated remaining time to live (negative if expired).
   *
   * Always returns stale values, if their info is found in the cache, so be
   * sure to check for expirations (ie, a negative {@link LRUCache.Entry#ttl})
   * if relevant.
   */
  info(e) {
    const n = m(this, ft).get(e);
    if (n === void 0)
      return;
    const i = m(this, Ie)[n], r = re(this, _e, Ye).call(this, i) ? i.__staleWhileFetching : i;
    if (r === void 0)
      return;
    const s = { value: r };
    if (m(this, Jt) && m(this, _n)) {
      const a = m(this, Jt)[n], o = m(this, _n)[n];
      if (a && o) {
        const c = a - (Ar.now() - o);
        s.ttl = c, s.start = Date.now();
      }
    }
    return m(this, wn) && (s.size = m(this, wn)[n]), s;
  }
  /**
   * Return an array of [key, {@link LRUCache.Entry}] tuples which can be
   * passed to {@link LRLUCache#load}.
   *
   * The `start` fields are calculated relative to a portable `Date.now()`
   * timestamp, even if `performance.now()` is available.
   *
   * Stale entries are always included in the `dump`, even if
   * {@link LRUCache.OptionsBase.allowStale} is false.
   *
   * Note: this returns an actual array, not a generator, so it can be more
   * easily passed around.
   */
  dump() {
    const e = [];
    for (const n of re(this, _e, ci).call(this, { allowStale: !0 })) {
      const i = m(this, Ze)[n], r = m(this, Ie)[n], s = re(this, _e, Ye).call(this, r) ? r.__staleWhileFetching : r;
      if (s === void 0 || i === void 0)
        continue;
      const a = { value: s };
      if (m(this, Jt) && m(this, _n)) {
        a.ttl = m(this, Jt)[n];
        const o = Ar.now() - m(this, _n)[n];
        a.start = Math.floor(Date.now() - o);
      }
      m(this, wn) && (a.size = m(this, wn)[n]), e.unshift([i, a]);
    }
    return e;
  }
  /**
   * Reset the cache and load in the items in entries in the order listed.
   *
   * The shape of the resulting cache may be different if the same options are
   * not used in both caches.
   *
   * The `start` fields are assumed to be calculated relative to a portable
   * `Date.now()` timestamp, even if `performance.now()` is available.
   */
  load(e) {
    this.clear();
    for (const [n, i] of e) {
      if (i.start) {
        const r = Date.now() - i.start;
        i.start = Ar.now() - r;
      }
      this.set(n, i.value, i);
    }
  }
  /**
   * Add a value to the cache.
   *
   * Note: if `undefined` is specified as a value, this is an alias for
   * {@link LRUCache#delete}
   *
   * Fields on the {@link LRUCache.SetOptions} options param will override
   * their corresponding values in the constructor options for the scope
   * of this single `set()` operation.
   *
   * If `start` is provided, then that will set the effective start
   * time for the TTL calculation. Note that this must be a previous
   * value of `performance.now()` if supported, or a previous value of
   * `Date.now()` if not.
   *
   * Options object may also include `size`, which will prevent
   * calling the `sizeCalculation` function and just use the specified
   * number if it is a positive integer, and `noDisposeOnSet` which
   * will prevent calling a `dispose` function in the case of
   * overwrites.
   *
   * If the `size` (or return value of `sizeCalculation`) for a given
   * entry is greater than `maxEntrySize`, then the item will not be
   * added to the cache.
   *
   * Will update the recency of the entry.
   *
   * If the value is `undefined`, then this is an alias for
   * `cache.delete(key)`. `undefined` is never stored in the cache.
   */
  set(e, n, i = {}) {
    var d, b, x, v, y;
    if (n === void 0)
      return this.delete(e), this;
    const { ttl: r = this.ttl, start: s, noDisposeOnSet: a = this.noDisposeOnSet, sizeCalculation: o = this.sizeCalculation, status: c } = i;
    let { noUpdateTTL: l = this.noUpdateTTL } = i;
    const u = m(this, sa).call(this, e, n, i.size || 0, o);
    if (this.maxEntrySize && u > this.maxEntrySize)
      return c && (c.set = "miss", c.maxEntrySizeExceeded = !0), re(this, _e, ui).call(this, e, "set"), this;
    let p = m(this, bt) === 0 ? void 0 : m(this, ft).get(e);
    if (p === void 0)
      p = m(this, bt) === 0 ? m(this, St) : m(this, xn).length !== 0 ? m(this, xn).pop() : m(this, bt) === m(this, gn) ? re(this, _e, Uo).call(this, !1) : m(this, bt), m(this, Ze)[p] = e, m(this, Ie)[p] = n, m(this, ft).set(e, p), m(this, $t)[m(this, St)] = p, m(this, Xt)[p] = m(this, St), Q(this, St, p), to(this, bt)._++, m(this, Ur).call(this, p, u, c), c && (c.set = "add"), l = !1;
    else {
      re(this, _e, Ps).call(this, p);
      const f = m(this, Ie)[p];
      if (n !== f) {
        if (m(this, hi) && re(this, _e, Ye).call(this, f)) {
          f.__abortController.abort(new Error("replaced"));
          const { __staleWhileFetching: h } = f;
          h !== void 0 && !a && (m(this, Sn) && ((d = m(this, bn)) == null || d.call(this, h, e, "set")), m(this, Bt) && ((b = m(this, Et)) == null || b.push([h, e, "set"])));
        } else a || (m(this, Sn) && ((x = m(this, bn)) == null || x.call(this, f, e, "set")), m(this, Bt) && ((v = m(this, Et)) == null || v.push([f, e, "set"])));
        if (m(this, Ji).call(this, p), m(this, Ur).call(this, p, u, c), m(this, Ie)[p] = n, c) {
          c.set = "replace";
          const h = f && re(this, _e, Ye).call(this, f) ? f.__staleWhileFetching : f;
          h !== void 0 && (c.oldValue = h);
        }
      } else c && (c.set = "update");
    }
    if (r !== 0 && !m(this, Jt) && re(this, _e, Op).call(this), m(this, Jt) && (l || m(this, ra).call(this, p, r, s), c && m(this, qn).call(this, c, p)), !a && m(this, Bt) && m(this, Et)) {
      const f = m(this, Et);
      let h;
      for (; h = f == null ? void 0 : f.shift(); )
        (y = m(this, yn)) == null || y.call(this, ...h);
    }
    return this;
  }
  /**
   * Evict the least recently used item, returning its value or
   * `undefined` if cache is empty.
   */
  pop() {
    var e;
    try {
      for (; m(this, bt); ) {
        const n = m(this, Ie)[m(this, Nt)];
        if (re(this, _e, Uo).call(this, !0), re(this, _e, Ye).call(this, n)) {
          if (n.__staleWhileFetching)
            return n.__staleWhileFetching;
        } else if (n !== void 0)
          return n;
      }
    } finally {
      if (m(this, Bt) && m(this, Et)) {
        const n = m(this, Et);
        let i;
        for (; i = n == null ? void 0 : n.shift(); )
          (e = m(this, yn)) == null || e.call(this, ...i);
      }
    }
  }
  /**
   * Check if a key is in the cache, without updating the recency of use.
   * Will return false if the item is stale, even though it is technically
   * in the cache.
   *
   * Check if a key is in the cache, without updating the recency of
   * use. Age is updated if {@link LRUCache.OptionsBase.updateAgeOnHas} is set
   * to `true` in either the options or the constructor.
   *
   * Will return `false` if the item is stale, even though it is technically in
   * the cache. The difference can be determined (if it matters) by using a
   * `status` argument, and inspecting the `has` field.
   *
   * Will not update item age unless
   * {@link LRUCache.OptionsBase.updateAgeOnHas} is set.
   */
  has(e, n = {}) {
    const { updateAgeOnHas: i = this.updateAgeOnHas, status: r } = n, s = m(this, ft).get(e);
    if (s !== void 0) {
      const a = m(this, Ie)[s];
      if (re(this, _e, Ye).call(this, a) && a.__staleWhileFetching === void 0)
        return !1;
      if (m(this, Qt).call(this, s))
        r && (r.has = "stale", m(this, qn).call(this, r, s));
      else return i && m(this, Xi).call(this, s), r && (r.has = "hit", m(this, qn).call(this, r, s)), !0;
    } else r && (r.has = "miss");
    return !1;
  }
  /**
   * Like {@link LRUCache#get} but doesn't update recency or delete stale
   * items.
   *
   * Returns `undefined` if the item is stale, unless
   * {@link LRUCache.OptionsBase.allowStale} is set.
   */
  peek(e, n = {}) {
    const { allowStale: i = this.allowStale } = n, r = m(this, ft).get(e);
    if (r === void 0 || !i && m(this, Qt).call(this, r))
      return;
    const s = m(this, Ie)[r];
    return re(this, _e, Ye).call(this, s) ? s.__staleWhileFetching : s;
  }
  async fetch(e, n = {}) {
    const {
      // get options
      allowStale: i = this.allowStale,
      updateAgeOnGet: r = this.updateAgeOnGet,
      noDeleteOnStaleGet: s = this.noDeleteOnStaleGet,
      // set options
      ttl: a = this.ttl,
      noDisposeOnSet: o = this.noDisposeOnSet,
      size: c = 0,
      sizeCalculation: l = this.sizeCalculation,
      noUpdateTTL: u = this.noUpdateTTL,
      // fetch exclusive options
      noDeleteOnFetchRejection: p = this.noDeleteOnFetchRejection,
      allowStaleOnFetchRejection: d = this.allowStaleOnFetchRejection,
      ignoreFetchAbort: b = this.ignoreFetchAbort,
      allowStaleOnFetchAbort: x = this.allowStaleOnFetchAbort,
      context: v,
      forceRefresh: y = !1,
      status: f,
      signal: h
    } = n;
    if (!m(this, hi))
      return f && (f.fetch = "get"), this.get(e, {
        allowStale: i,
        updateAgeOnGet: r,
        noDeleteOnStaleGet: s,
        status: f
      });
    const g = {
      allowStale: i,
      updateAgeOnGet: r,
      noDeleteOnStaleGet: s,
      ttl: a,
      noDisposeOnSet: o,
      size: c,
      sizeCalculation: l,
      noUpdateTTL: u,
      noDeleteOnFetchRejection: p,
      allowStaleOnFetchRejection: d,
      allowStaleOnFetchAbort: x,
      ignoreFetchAbort: b,
      status: f,
      signal: h
    };
    let A = m(this, ft).get(e);
    if (A === void 0) {
      f && (f.fetch = "miss");
      const C = re(this, _e, zo).call(this, e, A, g, v);
      return C.__returned = C;
    } else {
      const C = m(this, Ie)[A];
      if (re(this, _e, Ye).call(this, C)) {
        const D = i && C.__staleWhileFetching !== void 0;
        return f && (f.fetch = "inflight", D && (f.returnedStale = !0)), D ? C.__staleWhileFetching : C.__returned = C;
      }
      const V = m(this, Qt).call(this, A);
      if (!y && !V)
        return f && (f.fetch = "hit"), re(this, _e, Ps).call(this, A), r && m(this, Xi).call(this, A), f && m(this, qn).call(this, f, A), C;
      const K = re(this, _e, zo).call(this, e, A, g, v), X = K.__staleWhileFetching !== void 0 && i;
      return f && (f.fetch = V ? "stale" : "refresh", X && V && (f.returnedStale = !0)), X ? K.__staleWhileFetching : K.__returned = K;
    }
  }
  async forceFetch(e, n = {}) {
    const i = await this.fetch(e, n);
    if (i === void 0)
      throw new Error("fetch() returned undefined");
    return i;
  }
  memo(e, n = {}) {
    const i = m(this, Br);
    if (!i)
      throw new Error("no memoMethod provided to constructor");
    const { context: r, forceRefresh: s, ...a } = n, o = this.get(e, a);
    if (!s && o !== void 0)
      return o;
    const c = i(e, o, {
      options: a,
      context: r
    });
    return this.set(e, c, a), c;
  }
  /**
   * Return a value from the cache. Will update the recency of the cache
   * entry found.
   *
   * If the key is not found, get() will return `undefined`.
   */
  get(e, n = {}) {
    const { allowStale: i = this.allowStale, updateAgeOnGet: r = this.updateAgeOnGet, noDeleteOnStaleGet: s = this.noDeleteOnStaleGet, status: a } = n, o = m(this, ft).get(e);
    if (o !== void 0) {
      const c = m(this, Ie)[o], l = re(this, _e, Ye).call(this, c);
      return a && m(this, qn).call(this, a, o), m(this, Qt).call(this, o) ? (a && (a.get = "stale"), l ? (a && i && c.__staleWhileFetching !== void 0 && (a.returnedStale = !0), i ? c.__staleWhileFetching : void 0) : (s || re(this, _e, ui).call(this, e, "expire"), a && i && (a.returnedStale = !0), i ? c : void 0)) : (a && (a.get = "hit"), l ? c.__staleWhileFetching : (re(this, _e, Ps).call(this, o), r && m(this, Xi).call(this, o), c));
    } else a && (a.get = "miss");
  }
  /**
   * Deletes a key out of the cache.
   *
   * Returns true if the key was deleted, false otherwise.
   */
  delete(e) {
    return re(this, _e, ui).call(this, e, "delete");
  }
  /**
   * Clear the cache entirely, throwing away all values.
   */
  clear() {
    return re(this, _e, kp).call(this, "delete");
  }
};
gn = new WeakMap(), Zt = new WeakMap(), bn = new WeakMap(), yn = new WeakMap(), $r = new WeakMap(), Br = new WeakMap(), bt = new WeakMap(), vn = new WeakMap(), ft = new WeakMap(), Ze = new WeakMap(), Ie = new WeakMap(), $t = new WeakMap(), Xt = new WeakMap(), Nt = new WeakMap(), St = new WeakMap(), xn = new WeakMap(), Et = new WeakMap(), wn = new WeakMap(), _n = new WeakMap(), Jt = new WeakMap(), Sn = new WeakMap(), hi = new WeakMap(), Bt = new WeakMap(), _e = new WeakSet(), Op = function() {
  const e = new Bo(m(this, gn)), n = new Bo(m(this, gn));
  Q(this, Jt, e), Q(this, _n, n), Q(this, ra, (s, a, o = Ar.now()) => {
    if (n[s] = a !== 0 ? o : 0, e[s] = a, a !== 0 && this.ttlAutopurge) {
      const c = setTimeout(() => {
        m(this, Qt).call(this, s) && re(this, _e, ui).call(this, m(this, Ze)[s], "expire");
      }, a + 1);
      c.unref && c.unref();
    }
  }), Q(this, Xi, (s) => {
    n[s] = e[s] !== 0 ? Ar.now() : 0;
  }), Q(this, qn, (s, a) => {
    if (e[a]) {
      const o = e[a], c = n[a];
      if (!o || !c)
        return;
      s.ttl = o, s.start = c, s.now = i || r();
      const l = s.now - c;
      s.remainingTTL = o - l;
    }
  });
  let i = 0;
  const r = () => {
    const s = Ar.now();
    if (this.ttlResolution > 0) {
      i = s;
      const a = setTimeout(() => i = 0, this.ttlResolution);
      a.unref && a.unref();
    }
    return s;
  };
  this.getRemainingTTL = (s) => {
    const a = m(this, ft).get(s);
    if (a === void 0)
      return 0;
    const o = e[a], c = n[a];
    if (!o || !c)
      return 1 / 0;
    const l = (i || r()) - c;
    return o - l;
  }, Q(this, Qt, (s) => {
    const a = n[s], o = e[s];
    return !!o && !!a && (i || r()) - a > o;
  });
}, Xi = new WeakMap(), qn = new WeakMap(), ra = new WeakMap(), Qt = new WeakMap(), lx = function() {
  const e = new Bo(m(this, gn));
  Q(this, vn, 0), Q(this, wn, e), Q(this, Ji, (n) => {
    Q(this, vn, m(this, vn) - e[n]), e[n] = 0;
  }), Q(this, sa, (n, i, r, s) => {
    if (re(this, _e, Ye).call(this, i))
      return 0;
    if (!oi(r))
      if (s) {
        if (typeof s != "function")
          throw new TypeError("sizeCalculation must be a function");
        if (r = s(i, n), !oi(r))
          throw new TypeError("sizeCalculation return invalid (expect positive integer)");
      } else
        throw new TypeError("invalid size value (must be positive integer). When maxSize or maxEntrySize is used, sizeCalculation or size must be set.");
    return r;
  }), Q(this, Ur, (n, i, r) => {
    if (e[n] = i, m(this, Zt)) {
      const s = m(this, Zt) - e[n];
      for (; m(this, vn) > s; )
        re(this, _e, Uo).call(this, !0);
    }
    Q(this, vn, m(this, vn) + e[n]), r && (r.entrySize = i, r.totalCalculatedSize = m(this, vn));
  });
}, Ji = new WeakMap(), Ur = new WeakMap(), sa = new WeakMap(), ci = function* ({ allowStale: e = this.allowStale } = {}) {
  if (m(this, bt))
    for (let n = m(this, St); !(!re(this, _e, Pp).call(this, n) || ((e || !m(this, Qt).call(this, n)) && (yield n), n === m(this, Nt))); )
      n = m(this, Xt)[n];
}, li = function* ({ allowStale: e = this.allowStale } = {}) {
  if (m(this, bt))
    for (let n = m(this, Nt); !(!re(this, _e, Pp).call(this, n) || ((e || !m(this, Qt).call(this, n)) && (yield n), n === m(this, St))); )
      n = m(this, $t)[n];
}, Pp = function(e) {
  return e !== void 0 && m(this, ft).get(m(this, Ze)[e]) === e;
}, Uo = function(e) {
  var s, a;
  const n = m(this, Nt), i = m(this, Ze)[n], r = m(this, Ie)[n];
  return m(this, hi) && re(this, _e, Ye).call(this, r) ? r.__abortController.abort(new Error("evicted")) : (m(this, Sn) || m(this, Bt)) && (m(this, Sn) && ((s = m(this, bn)) == null || s.call(this, r, i, "evict")), m(this, Bt) && ((a = m(this, Et)) == null || a.push([r, i, "evict"]))), m(this, Ji).call(this, n), e && (m(this, Ze)[n] = void 0, m(this, Ie)[n] = void 0, m(this, xn).push(n)), m(this, bt) === 1 ? (Q(this, Nt, Q(this, St, 0)), m(this, xn).length = 0) : Q(this, Nt, m(this, $t)[n]), m(this, ft).delete(i), to(this, bt)._--, n;
}, zo = function(e, n, i, r) {
  const s = n === void 0 ? void 0 : m(this, Ie)[n];
  if (re(this, _e, Ye).call(this, s))
    return s;
  const a = new Rc(), { signal: o } = i;
  o == null || o.addEventListener("abort", () => a.abort(o.reason), {
    signal: a.signal
  });
  const c = {
    signal: a.signal,
    options: i,
    context: r
  }, l = (v, y = !1) => {
    const { aborted: f } = a.signal, h = i.ignoreFetchAbort && v !== void 0;
    if (i.status && (f && !y ? (i.status.fetchAborted = !0, i.status.fetchError = a.signal.reason, h && (i.status.fetchAbortIgnored = !0)) : i.status.fetchResolved = !0), f && !h && !y)
      return p(a.signal.reason);
    const g = b;
    return m(this, Ie)[n] === b && (v === void 0 ? g.__staleWhileFetching ? m(this, Ie)[n] = g.__staleWhileFetching : re(this, _e, ui).call(this, e, "fetch") : (i.status && (i.status.fetchUpdated = !0), this.set(e, v, c.options))), v;
  }, u = (v) => (i.status && (i.status.fetchRejected = !0, i.status.fetchError = v), p(v)), p = (v) => {
    const { aborted: y } = a.signal, f = y && i.allowStaleOnFetchAbort, h = f || i.allowStaleOnFetchRejection, g = h || i.noDeleteOnFetchRejection, A = b;
    if (m(this, Ie)[n] === b && (!g || A.__staleWhileFetching === void 0 ? re(this, _e, ui).call(this, e, "fetch") : f || (m(this, Ie)[n] = A.__staleWhileFetching)), h)
      return i.status && A.__staleWhileFetching !== void 0 && (i.status.returnedStale = !0), A.__staleWhileFetching;
    if (A.__returned === A)
      throw v;
  }, d = (v, y) => {
    var h;
    const f = (h = m(this, $r)) == null ? void 0 : h.call(this, e, s, c);
    f && f instanceof Promise && f.then((g) => v(g === void 0 ? void 0 : g), y), a.signal.addEventListener("abort", () => {
      (!i.ignoreFetchAbort || i.allowStaleOnFetchAbort) && (v(void 0), i.allowStaleOnFetchAbort && (v = (g) => l(g, !0)));
    });
  };
  i.status && (i.status.fetchDispatched = !0);
  const b = new Promise(d).then(l, u), x = Object.assign(b, {
    __abortController: a,
    __staleWhileFetching: s,
    __returned: void 0
  });
  return n === void 0 ? (this.set(e, x, { ...c.options, status: void 0 }), n = m(this, ft).get(e)) : m(this, Ie)[n] = x, x;
}, Ye = function(e) {
  if (!m(this, hi))
    return !1;
  const n = e;
  return !!n && n instanceof Promise && n.hasOwnProperty("__staleWhileFetching") && n.__abortController instanceof Rc;
}, Cp = function(e, n) {
  m(this, Xt)[n] = e, m(this, $t)[e] = n;
}, Ps = function(e) {
  e !== m(this, St) && (e === m(this, Nt) ? Q(this, Nt, m(this, $t)[e]) : re(this, _e, Cp).call(this, m(this, Xt)[e], m(this, $t)[e]), re(this, _e, Cp).call(this, m(this, St), e), Q(this, St, e));
}, ui = function(e, n) {
  var r, s, a, o;
  let i = !1;
  if (m(this, bt) !== 0) {
    const c = m(this, ft).get(e);
    if (c !== void 0)
      if (i = !0, m(this, bt) === 1)
        re(this, _e, kp).call(this, n);
      else {
        m(this, Ji).call(this, c);
        const l = m(this, Ie)[c];
        if (re(this, _e, Ye).call(this, l) ? l.__abortController.abort(new Error("deleted")) : (m(this, Sn) || m(this, Bt)) && (m(this, Sn) && ((r = m(this, bn)) == null || r.call(this, l, e, n)), m(this, Bt) && ((s = m(this, Et)) == null || s.push([l, e, n]))), m(this, ft).delete(e), m(this, Ze)[c] = void 0, m(this, Ie)[c] = void 0, c === m(this, St))
          Q(this, St, m(this, Xt)[c]);
        else if (c === m(this, Nt))
          Q(this, Nt, m(this, $t)[c]);
        else {
          const u = m(this, Xt)[c];
          m(this, $t)[u] = m(this, $t)[c];
          const p = m(this, $t)[c];
          m(this, Xt)[p] = m(this, Xt)[c];
        }
        to(this, bt)._--, m(this, xn).push(c);
      }
  }
  if (m(this, Bt) && ((a = m(this, Et)) != null && a.length)) {
    const c = m(this, Et);
    let l;
    for (; l = c == null ? void 0 : c.shift(); )
      (o = m(this, yn)) == null || o.call(this, ...l);
  }
  return i;
}, kp = function(e) {
  var n, i, r;
  for (const s of re(this, _e, li).call(this, { allowStale: !0 })) {
    const a = m(this, Ie)[s];
    if (re(this, _e, Ye).call(this, a))
      a.__abortController.abort(new Error("deleted"));
    else {
      const o = m(this, Ze)[s];
      m(this, Sn) && ((n = m(this, bn)) == null || n.call(this, a, o, e)), m(this, Bt) && ((i = m(this, Et)) == null || i.push([a, o, e]));
    }
  }
  if (m(this, ft).clear(), m(this, Ie).fill(void 0), m(this, Ze).fill(void 0), m(this, Jt) && m(this, _n) && (m(this, Jt).fill(0), m(this, _n).fill(0)), m(this, wn) && m(this, wn).fill(0), Q(this, Nt, 0), Q(this, St, 0), m(this, xn).length = 0, Q(this, vn, 0), Q(this, bt, 0), m(this, Bt) && m(this, Et)) {
    const s = m(this, Et);
    let a;
    for (; a = s == null ? void 0 : s.shift(); )
      (r = m(this, yn)) == null || r.call(this, ...a);
  }
};
let Rp = md;
cl.LRUCache = Rp;
var Kf = {};
(function(t) {
  var j, E, I, M, O, w, q, ee, G, de, ve, me, Te, Le, Fe, Ot, Bn, wt, mt;
  var e = We && We.__importDefault || function(Ae) {
    return Ae && Ae.__esModule ? Ae : { default: Ae };
  };
  Object.defineProperty(t, "__esModule", { value: !0 }), t.Minipass = t.isWritable = t.isReadable = t.isStream = void 0;
  const n = typeof process == "object" && process ? process : {
    stdout: null,
    stderr: null
  }, i = n_, r = e(i_), s = r_, a = (Ae) => !!Ae && typeof Ae == "object" && (Ae instanceof $ || Ae instanceof r.default || (0, t.isReadable)(Ae) || (0, t.isWritable)(Ae));
  t.isStream = a;
  const o = (Ae) => !!Ae && typeof Ae == "object" && Ae instanceof i.EventEmitter && typeof Ae.pipe == "function" && // node core Writable streams have a pipe() method, but it throws
  Ae.pipe !== r.default.Writable.prototype.pipe;
  t.isReadable = o;
  const c = (Ae) => !!Ae && typeof Ae == "object" && Ae instanceof i.EventEmitter && typeof Ae.write == "function" && typeof Ae.end == "function";
  t.isWritable = c;
  const l = Symbol("EOF"), u = Symbol("maybeEmitEnd"), p = Symbol("emittedEnd"), d = Symbol("emittingEnd"), b = Symbol("emittedError"), x = Symbol("closed"), v = Symbol("read"), y = Symbol("flush"), f = Symbol("flushChunk"), h = Symbol("encoding"), g = Symbol("decoder"), A = Symbol("flowing"), C = Symbol("paused"), V = Symbol("resume"), K = Symbol("buffer"), L = Symbol("pipes"), X = Symbol("bufferLength"), D = Symbol("bufferPush"), B = Symbol("bufferShift"), Y = Symbol("objectMode"), U = Symbol("destroyed"), ae = Symbol("error"), le = Symbol("emitData"), pe = Symbol("emitEnd"), z = Symbol("emitEnd2"), k = Symbol("async"), H = Symbol("abort"), R = Symbol("aborted"), Z = Symbol("signal"), se = Symbol("dataListeners"), te = Symbol("discarded"), he = (Ae) => Promise.resolve().then(Ae), Se = (Ae) => Ae(), ye = (Ae) => Ae === "end" || Ae === "finish" || Ae === "prefinish", T = (Ae) => Ae instanceof ArrayBuffer || !!Ae && typeof Ae == "object" && Ae.constructor && Ae.constructor.name === "ArrayBuffer" && Ae.byteLength >= 0, S = (Ae) => !Buffer.isBuffer(Ae) && ArrayBuffer.isView(Ae);
  class W {
    constructor(qt, ie, ue) {
      ne(this, "src");
      ne(this, "dest");
      ne(this, "opts");
      ne(this, "ondrain");
      this.src = qt, this.dest = ie, this.opts = ue, this.ondrain = () => qt[V](), this.dest.on("drain", this.ondrain);
    }
    unpipe() {
      this.dest.removeListener("drain", this.ondrain);
    }
    // only here for the prototype
    /* c8 ignore start */
    proxyErrors(qt) {
    }
    /* c8 ignore stop */
    end() {
      this.unpipe(), this.opts.end && this.dest.end();
    }
  }
  class J extends W {
    unpipe() {
      this.src.removeListener("error", this.proxyErrors), super.unpipe();
    }
    constructor(qt, ie, ue) {
      super(qt, ie, ue), this.proxyErrors = (Re) => this.dest.emit("error", Re), qt.on("error", this.proxyErrors);
    }
  }
  const ge = (Ae) => !!Ae.objectMode, oe = (Ae) => !Ae.objectMode && !!Ae.encoding && Ae.encoding !== "buffer";
  class $ extends i.EventEmitter {
    /**
     * If `RType` is Buffer, then options do not need to be provided.
     * Otherwise, an options object must be provided to specify either
     * {@link Minipass.SharedOptions.objectMode} or
     * {@link Minipass.SharedOptions.encoding}, as appropriate.
     */
    constructor(...ie) {
      const ue = ie[0] || {};
      super();
      ne(this, mt, !1);
      ne(this, wt, !1);
      ne(this, Bn, []);
      ne(this, Ot, []);
      ne(this, Fe);
      ne(this, Le);
      ne(this, Te);
      ne(this, me);
      ne(this, ve, !1);
      ne(this, de, !1);
      ne(this, G, !1);
      ne(this, ee, !1);
      ne(this, q, null);
      ne(this, w, 0);
      ne(this, O, !1);
      ne(this, M);
      ne(this, I, !1);
      ne(this, E, 0);
      ne(this, j, !1);
      /**
       * true if the stream can be written
       */
      ne(this, "writable", !0);
      /**
       * true if the stream can be read
       */
      ne(this, "readable", !0);
      if (ue.objectMode && typeof ue.encoding == "string")
        throw new TypeError("Encoding and objectMode may not be used together");
      ge(ue) ? (this[Y] = !0, this[h] = null) : oe(ue) ? (this[h] = ue.encoding, this[Y] = !1) : (this[Y] = !1, this[h] = null), this[k] = !!ue.async, this[g] = this[h] ? new s.StringDecoder(this[h]) : null, ue && ue.debugExposeBuffer === !0 && Object.defineProperty(this, "buffer", { get: () => this[K] }), ue && ue.debugExposePipes === !0 && Object.defineProperty(this, "pipes", { get: () => this[L] });
      const { signal: Re } = ue;
      Re && (this[Z] = Re, Re.aborted ? this[H]() : Re.addEventListener("abort", () => this[H]()));
    }
    /**
     * The amount of data stored in the buffer waiting to be read.
     *
     * For Buffer strings, this will be the total byte length.
     * For string encoding streams, this will be the string character length,
     * according to JavaScript's `string.length` logic.
     * For objectMode streams, this is a count of the items waiting to be
     * emitted.
     */
    get bufferLength() {
      return this[X];
    }
    /**
     * The `BufferEncoding` currently in use, or `null`
     */
    get encoding() {
      return this[h];
    }
    /**
     * @deprecated - This is a read only property
     */
    set encoding(ie) {
      throw new Error("Encoding must be set at instantiation time");
    }
    /**
     * @deprecated - Encoding may only be set at instantiation time
     */
    setEncoding(ie) {
      throw new Error("Encoding must be set at instantiation time");
    }
    /**
     * True if this is an objectMode stream
     */
    get objectMode() {
      return this[Y];
    }
    /**
     * @deprecated - This is a read-only property
     */
    set objectMode(ie) {
      throw new Error("objectMode must be set at instantiation time");
    }
    /**
     * true if this is an async stream
     */
    get async() {
      return this[k];
    }
    /**
     * Set to true to make this stream async.
     *
     * Once set, it cannot be unset, as this would potentially cause incorrect
     * behavior.  Ie, a sync stream can be made async, but an async stream
     * cannot be safely made sync.
     */
    set async(ie) {
      this[k] = this[k] || !!ie;
    }
    // drop everything and get out of the flow completely
    [(mt = A, wt = C, Bn = L, Ot = K, Fe = Y, Le = h, Te = k, me = g, ve = l, de = p, G = d, ee = x, q = b, w = X, O = U, M = Z, I = R, E = se, j = te, H)]() {
      var ie, ue;
      this[R] = !0, this.emit("abort", (ie = this[Z]) == null ? void 0 : ie.reason), this.destroy((ue = this[Z]) == null ? void 0 : ue.reason);
    }
    /**
     * True if the stream has been aborted.
     */
    get aborted() {
      return this[R];
    }
    /**
     * No-op setter. Stream aborted status is set via the AbortSignal provided
     * in the constructor options.
     */
    set aborted(ie) {
    }
    write(ie, ue, Re) {
      var Ct;
      if (this[R])
        return !1;
      if (this[l])
        throw new Error("write after end");
      if (this[U])
        return this.emit("error", Object.assign(new Error("Cannot call write after a stream was destroyed"), { code: "ERR_STREAM_DESTROYED" })), !0;
      typeof ue == "function" && (Re = ue, ue = "utf8"), ue || (ue = "utf8");
      const Pt = this[k] ? he : Se;
      if (!this[Y] && !Buffer.isBuffer(ie)) {
        if (S(ie))
          ie = Buffer.from(ie.buffer, ie.byteOffset, ie.byteLength);
        else if (T(ie))
          ie = Buffer.from(ie);
        else if (typeof ie != "string")
          throw new Error("Non-contiguous data written to non-objectMode stream");
      }
      return this[Y] ? (this[A] && this[X] !== 0 && this[y](!0), this[A] ? this.emit("data", ie) : this[D](ie), this[X] !== 0 && this.emit("readable"), Re && Pt(Re), this[A]) : ie.length ? (typeof ie == "string" && // unless it is a string already ready for us to use
      !(ue === this[h] && !((Ct = this[g]) != null && Ct.lastNeed)) && (ie = Buffer.from(ie, ue)), Buffer.isBuffer(ie) && this[h] && (ie = this[g].write(ie)), this[A] && this[X] !== 0 && this[y](!0), this[A] ? this.emit("data", ie) : this[D](ie), this[X] !== 0 && this.emit("readable"), Re && Pt(Re), this[A]) : (this[X] !== 0 && this.emit("readable"), Re && Pt(Re), this[A]);
    }
    /**
     * Low-level explicit read method.
     *
     * In objectMode, the argument is ignored, and one item is returned if
     * available.
     *
     * `n` is the number of bytes (or in the case of encoding streams,
     * characters) to consume. If `n` is not provided, then the entire buffer
     * is returned, or `null` is returned if no data is available.
     *
     * If `n` is greater that the amount of data in the internal buffer,
     * then `null` is returned.
     */
    read(ie) {
      if (this[U])
        return null;
      if (this[te] = !1, this[X] === 0 || ie === 0 || ie && ie > this[X])
        return this[u](), null;
      this[Y] && (ie = null), this[K].length > 1 && !this[Y] && (this[K] = [
        this[h] ? this[K].join("") : Buffer.concat(this[K], this[X])
      ]);
      const ue = this[v](ie || null, this[K][0]);
      return this[u](), ue;
    }
    [v](ie, ue) {
      if (this[Y])
        this[B]();
      else {
        const Re = ue;
        ie === Re.length || ie === null ? this[B]() : typeof Re == "string" ? (this[K][0] = Re.slice(ie), ue = Re.slice(0, ie), this[X] -= ie) : (this[K][0] = Re.subarray(ie), ue = Re.subarray(0, ie), this[X] -= ie);
      }
      return this.emit("data", ue), !this[K].length && !this[l] && this.emit("drain"), ue;
    }
    end(ie, ue, Re) {
      return typeof ie == "function" && (Re = ie, ie = void 0), typeof ue == "function" && (Re = ue, ue = "utf8"), ie !== void 0 && this.write(ie, ue), Re && this.once("end", Re), this[l] = !0, this.writable = !1, (this[A] || !this[C]) && this[u](), this;
    }
    // don't let the internal resume be overwritten
    [V]() {
      this[U] || (!this[se] && !this[L].length && (this[te] = !0), this[C] = !1, this[A] = !0, this.emit("resume"), this[K].length ? this[y]() : this[l] ? this[u]() : this.emit("drain"));
    }
    /**
     * Resume the stream if it is currently in a paused state
     *
     * If called when there are no pipe destinations or `data` event listeners,
     * this will place the stream in a "discarded" state, where all data will
     * be thrown away. The discarded state is removed if a pipe destination or
     * data handler is added, if pause() is called, or if any synchronous or
     * asynchronous iteration is started.
     */
    resume() {
      return this[V]();
    }
    /**
     * Pause the stream
     */
    pause() {
      this[A] = !1, this[C] = !0, this[te] = !1;
    }
    /**
     * true if the stream has been forcibly destroyed
     */
    get destroyed() {
      return this[U];
    }
    /**
     * true if the stream is currently in a flowing state, meaning that
     * any writes will be immediately emitted.
     */
    get flowing() {
      return this[A];
    }
    /**
     * true if the stream is currently in a paused state
     */
    get paused() {
      return this[C];
    }
    [D](ie) {
      this[Y] ? this[X] += 1 : this[X] += ie.length, this[K].push(ie);
    }
    [B]() {
      return this[Y] ? this[X] -= 1 : this[X] -= this[K][0].length, this[K].shift();
    }
    [y](ie = !1) {
      do
        ;
      while (this[f](this[B]()) && this[K].length);
      !ie && !this[K].length && !this[l] && this.emit("drain");
    }
    [f](ie) {
      return this.emit("data", ie), this[A];
    }
    /**
     * Pipe all data emitted by this stream into the destination provided.
     *
     * Triggers the flow of data.
     */
    pipe(ie, ue) {
      if (this[U])
        return ie;
      this[te] = !1;
      const Re = this[p];
      return ue = ue || {}, ie === n.stdout || ie === n.stderr ? ue.end = !1 : ue.end = ue.end !== !1, ue.proxyErrors = !!ue.proxyErrors, Re ? ue.end && ie.end() : (this[L].push(ue.proxyErrors ? new J(this, ie, ue) : new W(this, ie, ue)), this[k] ? he(() => this[V]()) : this[V]()), ie;
    }
    /**
     * Fully unhook a piped destination stream.
     *
     * If the destination stream was the only consumer of this stream (ie,
     * there are no other piped destinations or `'data'` event listeners)
     * then the flow of data will stop until there is another consumer or
     * {@link Minipass#resume} is explicitly called.
     */
    unpipe(ie) {
      const ue = this[L].find((Re) => Re.dest === ie);
      ue && (this[L].length === 1 ? (this[A] && this[se] === 0 && (this[A] = !1), this[L] = []) : this[L].splice(this[L].indexOf(ue), 1), ue.unpipe());
    }
    /**
     * Alias for {@link Minipass#on}
     */
    addListener(ie, ue) {
      return this.on(ie, ue);
    }
    /**
     * Mostly identical to `EventEmitter.on`, with the following
     * behavior differences to prevent data loss and unnecessary hangs:
     *
     * - Adding a 'data' event handler will trigger the flow of data
     *
     * - Adding a 'readable' event handler when there is data waiting to be read
     *   will cause 'readable' to be emitted immediately.
     *
     * - Adding an 'endish' event handler ('end', 'finish', etc.) which has
     *   already passed will cause the event to be emitted immediately and all
     *   handlers removed.
     *
     * - Adding an 'error' event handler after an error has been emitted will
     *   cause the event to be re-emitted immediately with the error previously
     *   raised.
     */
    on(ie, ue) {
      const Re = super.on(ie, ue);
      if (ie === "data")
        this[te] = !1, this[se]++, !this[L].length && !this[A] && this[V]();
      else if (ie === "readable" && this[X] !== 0)
        super.emit("readable");
      else if (ye(ie) && this[p])
        super.emit(ie), this.removeAllListeners(ie);
      else if (ie === "error" && this[b]) {
        const Pt = ue;
        this[k] ? he(() => Pt.call(this, this[b])) : Pt.call(this, this[b]);
      }
      return Re;
    }
    /**
     * Alias for {@link Minipass#off}
     */
    removeListener(ie, ue) {
      return this.off(ie, ue);
    }
    /**
     * Mostly identical to `EventEmitter.off`
     *
     * If a 'data' event handler is removed, and it was the last consumer
     * (ie, there are no pipe destinations or other 'data' event listeners),
     * then the flow of data will stop until there is another consumer or
     * {@link Minipass#resume} is explicitly called.
     */
    off(ie, ue) {
      const Re = super.off(ie, ue);
      return ie === "data" && (this[se] = this.listeners("data").length, this[se] === 0 && !this[te] && !this[L].length && (this[A] = !1)), Re;
    }
    /**
     * Mostly identical to `EventEmitter.removeAllListeners`
     *
     * If all 'data' event handlers are removed, and they were the last consumer
     * (ie, there are no pipe destinations), then the flow of data will stop
     * until there is another consumer or {@link Minipass#resume} is explicitly
     * called.
     */
    removeAllListeners(ie) {
      const ue = super.removeAllListeners(ie);
      return (ie === "data" || ie === void 0) && (this[se] = 0, !this[te] && !this[L].length && (this[A] = !1)), ue;
    }
    /**
     * true if the 'end' event has been emitted
     */
    get emittedEnd() {
      return this[p];
    }
    [u]() {
      !this[d] && !this[p] && !this[U] && this[K].length === 0 && this[l] && (this[d] = !0, this.emit("end"), this.emit("prefinish"), this.emit("finish"), this[x] && this.emit("close"), this[d] = !1);
    }
    /**
     * Mostly identical to `EventEmitter.emit`, with the following
     * behavior differences to prevent data loss and unnecessary hangs:
     *
     * If the stream has been destroyed, and the event is something other
     * than 'close' or 'error', then `false` is returned and no handlers
     * are called.
     *
     * If the event is 'end', and has already been emitted, then the event
     * is ignored. If the stream is in a paused or non-flowing state, then
     * the event will be deferred until data flow resumes. If the stream is
     * async, then handlers will be called on the next tick rather than
     * immediately.
     *
     * If the event is 'close', and 'end' has not yet been emitted, then
     * the event will be deferred until after 'end' is emitted.
     *
     * If the event is 'error', and an AbortSignal was provided for the stream,
     * and there are no listeners, then the event is ignored, matching the
     * behavior of node core streams in the presense of an AbortSignal.
     *
     * If the event is 'finish' or 'prefinish', then all listeners will be
     * removed after emitting the event, to prevent double-firing.
     */
    emit(ie, ...ue) {
      const Re = ue[0];
      if (ie !== "error" && ie !== "close" && ie !== U && this[U])
        return !1;
      if (ie === "data")
        return !this[Y] && !Re ? !1 : this[k] ? (he(() => this[le](Re)), !0) : this[le](Re);
      if (ie === "end")
        return this[pe]();
      if (ie === "close") {
        if (this[x] = !0, !this[p] && !this[U])
          return !1;
        const Ct = super.emit("close");
        return this.removeAllListeners("close"), Ct;
      } else if (ie === "error") {
        this[b] = Re, super.emit(ae, Re);
        const Ct = !this[Z] || this.listeners("error").length ? super.emit("error", Re) : !1;
        return this[u](), Ct;
      } else if (ie === "resume") {
        const Ct = super.emit("resume");
        return this[u](), Ct;
      } else if (ie === "finish" || ie === "prefinish") {
        const Ct = super.emit(ie);
        return this.removeAllListeners(ie), Ct;
      }
      const Pt = super.emit(ie, ...ue);
      return this[u](), Pt;
    }
    [le](ie) {
      for (const Re of this[L])
        Re.dest.write(ie) === !1 && this.pause();
      const ue = this[te] ? !1 : super.emit("data", ie);
      return this[u](), ue;
    }
    [pe]() {
      return this[p] ? !1 : (this[p] = !0, this.readable = !1, this[k] ? (he(() => this[z]()), !0) : this[z]());
    }
    [z]() {
      if (this[g]) {
        const ue = this[g].end();
        if (ue) {
          for (const Re of this[L])
            Re.dest.write(ue);
          this[te] || super.emit("data", ue);
        }
      }
      for (const ue of this[L])
        ue.end();
      const ie = super.emit("end");
      return this.removeAllListeners("end"), ie;
    }
    /**
     * Return a Promise that resolves to an array of all emitted data once
     * the stream ends.
     */
    async collect() {
      const ie = Object.assign([], {
        dataLength: 0
      });
      this[Y] || (ie.dataLength = 0);
      const ue = this.promise();
      return this.on("data", (Re) => {
        ie.push(Re), this[Y] || (ie.dataLength += Re.length);
      }), await ue, ie;
    }
    /**
     * Return a Promise that resolves to the concatenation of all emitted data
     * once the stream ends.
     *
     * Not allowed on objectMode streams.
     */
    async concat() {
      if (this[Y])
        throw new Error("cannot concat in objectMode");
      const ie = await this.collect();
      return this[h] ? ie.join("") : Buffer.concat(ie, ie.dataLength);
    }
    /**
     * Return a void Promise that resolves once the stream ends.
     */
    async promise() {
      return new Promise((ie, ue) => {
        this.on(U, () => ue(new Error("stream destroyed"))), this.on("error", (Re) => ue(Re)), this.on("end", () => ie());
      });
    }
    /**
     * Asynchronous `for await of` iteration.
     *
     * This will continue emitting all chunks until the stream terminates.
     */
    [Symbol.asyncIterator]() {
      this[te] = !1;
      let ie = !1;
      const ue = async () => (this.pause(), ie = !0, { value: void 0, done: !0 });
      return {
        next: () => {
          if (ie)
            return ue();
          const Pt = this.read();
          if (Pt !== null)
            return Promise.resolve({ done: !1, value: Pt });
          if (this[l])
            return ue();
          let Ct, Qa;
          const $i = (Un) => {
            this.off("data", Bi), this.off("end", bs), this.off(U, xr), ue(), Qa(Un);
          }, Bi = (Un) => {
            this.off("error", $i), this.off("end", bs), this.off(U, xr), this.pause(), Ct({ value: Un, done: !!this[l] });
          }, bs = () => {
            this.off("error", $i), this.off("data", Bi), this.off(U, xr), ue(), Ct({ done: !0, value: void 0 });
          }, xr = () => $i(new Error("stream destroyed"));
          return new Promise((Un, eo) => {
            Qa = eo, Ct = Un, this.once(U, xr), this.once("error", $i), this.once("end", bs), this.once("data", Bi);
          });
        },
        throw: ue,
        return: ue,
        [Symbol.asyncIterator]() {
          return this;
        },
        [Symbol.asyncDispose]: async () => {
        }
      };
    }
    /**
     * Synchronous `for of` iteration.
     *
     * The iteration will terminate when the internal buffer runs out, even
     * if the stream has not yet terminated.
     */
    [Symbol.iterator]() {
      this[te] = !1;
      let ie = !1;
      const ue = () => (this.pause(), this.off(ae, ue), this.off(U, ue), this.off("end", ue), ie = !0, { done: !0, value: void 0 }), Re = () => {
        if (ie)
          return ue();
        const Pt = this.read();
        return Pt === null ? ue() : { done: !1, value: Pt };
      };
      return this.once("end", ue), this.once(ae, ue), this.once(U, ue), {
        next: Re,
        throw: ue,
        return: ue,
        [Symbol.iterator]() {
          return this;
        },
        [Symbol.dispose]: () => {
        }
      };
    }
    /**
     * Destroy a stream, preventing it from being used for any further purpose.
     *
     * If the stream has a `close()` method, then it will be called on
     * destruction.
     *
     * After destruction, any attempt to write data, read data, or emit most
     * events will be ignored.
     *
     * If an error argument is provided, then it will be emitted in an
     * 'error' event.
     */
    destroy(ie) {
      if (this[U])
        return ie ? this.emit("error", ie) : this.emit(U), this;
      this[U] = !0, this[te] = !0, this[K].length = 0, this[X] = 0;
      const ue = this;
      return typeof ue.close == "function" && !this[x] && ue.close(), ie ? this.emit("error", ie) : this.emit(U), this;
    }
    /**
     * Alias for {@link isStream}
     *
     * Former export location, maintained for backwards compatibility.
     *
     * @deprecated
     */
    static get isStream() {
      return t.isStream;
    }
  }
  t.Minipass = $;
})(Kf);
var L2 = We && We.__createBinding || (Object.create ? function(t, e, n, i) {
  i === void 0 && (i = n);
  var r = Object.getOwnPropertyDescriptor(e, n);
  (!r || ("get" in r ? !e.__esModule : r.writable || r.configurable)) && (r = { enumerable: !0, get: function() {
    return e[n];
  } }), Object.defineProperty(t, i, r);
} : function(t, e, n, i) {
  i === void 0 && (i = n), t[i] = e[n];
}), N2 = We && We.__setModuleDefault || (Object.create ? function(t, e) {
  Object.defineProperty(t, "default", { enumerable: !0, value: e });
} : function(t, e) {
  t.default = e;
}), F2 = We && We.__importStar || function(t) {
  if (t && t.__esModule) return t;
  var e = {};
  if (t != null) for (var n in t) n !== "default" && Object.prototype.hasOwnProperty.call(t, n) && L2(e, t, n);
  return N2(e, t), e;
};
Object.defineProperty(et, "__esModule", { value: !0 });
et.PathScurry = et.Path = et.PathScurryDarwin = et.PathScurryPosix = et.PathScurryWin32 = et.PathScurryBase = et.PathPosix = et.PathWin32 = et.PathBase = et.ChildrenCache = et.ResolveCache = void 0;
const ux = cl, Oc = ht, M2 = Ug, Cs = dt, $2 = F2(ut), B2 = Cs.realpathSync.native, xo = qw, pg = Kf, ks = {
  lstatSync: Cs.lstatSync,
  readdir: Cs.readdir,
  readdirSync: Cs.readdirSync,
  readlinkSync: Cs.readlinkSync,
  realpathSync: B2,
  promises: {
    lstat: xo.lstat,
    readdir: xo.readdir,
    readlink: xo.readlink,
    realpath: xo.realpath
  }
}, px = (t) => !t || t === ks || t === $2 ? ks : {
  ...ks,
  ...t,
  promises: {
    ...ks.promises,
    ...t.promises || {}
  }
}, fx = /^\\\\\?\\([a-z]:)\\?$/i, U2 = (t) => t.replace(/\//g, "\\").replace(fx, "$1\\"), z2 = /[\\\/]/, ln = 0, dx = 1, hx = 2, Cn = 4, mx = 6, gx = 8, qi = 10, bx = 12, cn = 15, Ts = ~cn, qu = 16, fg = 32, Is = 64, mn = 128, wo = 256, Wo = 512, dg = Is | mn | Wo, W2 = 1023, Gu = (t) => t.isFile() ? gx : t.isDirectory() ? Cn : t.isSymbolicLink() ? qi : t.isCharacterDevice() ? hx : t.isBlockDevice() ? mx : t.isSocket() ? bx : t.isFIFO() ? dx : ln, hg = /* @__PURE__ */ new Map(), Ds = (t) => {
  const e = hg.get(t);
  if (e)
    return e;
  const n = t.normalize("NFKD");
  return hg.set(t, n), n;
}, mg = /* @__PURE__ */ new Map(), _o = (t) => {
  const e = mg.get(t);
  if (e)
    return e;
  const n = Ds(t.toLowerCase());
  return mg.set(t, n), n;
};
class Ip extends ux.LRUCache {
  constructor() {
    super({ max: 256 });
  }
}
et.ResolveCache = Ip;
class yx extends ux.LRUCache {
  constructor(e = 16 * 1024) {
    super({
      maxSize: e,
      // parent + children
      sizeCalculation: (n) => n.length + 1
    });
  }
}
et.ChildrenCache = yx;
const vx = Symbol("PathScurry setAsCwd");
var Ut, aa, oa, ca, la, ua, pa, fa, da, ha, ma, ga, ba, ya, va, xa, wa, _a, Sa, mi, Qi, Dn, Gn, Hn, Vn, ke, er, Kn, jn, Pe, Dp, qo, js, jp, Lp, Ls, Go, Np, Fp, Ho, xx, wx, _x, Mp, zr, Wr, Sx, tr;
class Mt {
  /**
   * Do not create new Path objects directly.  They should always be accessed
   * via the PathScurry class or other methods on the Path class.
   *
   * @internal
   */
  constructor(e, n = ln, i, r, s, a, o) {
    fe(this, Pe);
    /**
     * the basename of this path
     *
     * **Important**: *always* test the path name against any test string
     * usingthe {@link isNamed} method, and not by directly comparing this
     * string. Otherwise, unicode path strings that the system sees as identical
     * will not be properly treated as the same path, leading to incorrect
     * behavior and possible security issues.
     */
    ne(this, "name");
    /**
     * the Path entry corresponding to the path root.
     *
     * @internal
     */
    ne(this, "root");
    /**
     * All roots found within the current PathScurry family
     *
     * @internal
     */
    ne(this, "roots");
    /**
     * a reference to the parent path, or undefined in the case of root entries
     *
     * @internal
     */
    ne(this, "parent");
    /**
     * boolean indicating whether paths are compared case-insensitively
     * @internal
     */
    ne(this, "nocase");
    /**
     * boolean indicating that this path is the current working directory
     * of the PathScurry collection that contains it.
     */
    ne(this, "isCWD", !1);
    // potential default fs override
    fe(this, Ut);
    // Stats fields
    fe(this, aa);
    fe(this, oa);
    fe(this, ca);
    fe(this, la);
    fe(this, ua);
    fe(this, pa);
    fe(this, fa);
    fe(this, da);
    fe(this, ha);
    fe(this, ma);
    fe(this, ga);
    fe(this, ba);
    fe(this, ya);
    fe(this, va);
    fe(this, xa);
    fe(this, wa);
    fe(this, _a);
    fe(this, Sa);
    fe(this, mi);
    fe(this, Qi);
    fe(this, Dn);
    fe(this, Gn);
    fe(this, Hn);
    fe(this, Vn);
    fe(this, ke);
    fe(this, er);
    fe(this, Kn);
    fe(this, jn);
    fe(this, zr, []);
    fe(this, Wr, !1);
    fe(this, tr);
    this.name = e, Q(this, mi, s ? _o(e) : Ds(e)), Q(this, ke, n & W2), this.nocase = s, this.roots = r, this.root = i || this, Q(this, er, a), Q(this, Dn, o.fullpath), Q(this, Hn, o.relative), Q(this, Vn, o.relativePosix), this.parent = o.parent, this.parent ? Q(this, Ut, m(this.parent, Ut)) : Q(this, Ut, px(o.fs));
  }
  get dev() {
    return m(this, aa);
  }
  get mode() {
    return m(this, oa);
  }
  get nlink() {
    return m(this, ca);
  }
  get uid() {
    return m(this, la);
  }
  get gid() {
    return m(this, ua);
  }
  get rdev() {
    return m(this, pa);
  }
  get blksize() {
    return m(this, fa);
  }
  get ino() {
    return m(this, da);
  }
  get size() {
    return m(this, ha);
  }
  get blocks() {
    return m(this, ma);
  }
  get atimeMs() {
    return m(this, ga);
  }
  get mtimeMs() {
    return m(this, ba);
  }
  get ctimeMs() {
    return m(this, ya);
  }
  get birthtimeMs() {
    return m(this, va);
  }
  get atime() {
    return m(this, xa);
  }
  get mtime() {
    return m(this, wa);
  }
  get ctime() {
    return m(this, _a);
  }
  get birthtime() {
    return m(this, Sa);
  }
  /**
   * This property is for compatibility with the Dirent class as of
   * Node v20, where Dirent['parentPath'] refers to the path of the
   * directory that was passed to readdir. For root entries, it's the path
   * to the entry itself.
   */
  get parentPath() {
    return (this.parent || this).fullpath();
  }
  /**
   * Deprecated alias for Dirent['parentPath'] Somewhat counterintuitively,
   * this property refers to the *parent* path, not the path object itself.
   */
  get path() {
    return this.parentPath;
  }
  /**
   * Returns the depth of the Path object from its root.
   *
   * For example, a path at `/foo/bar` would have a depth of 2.
   */
  depth() {
    return m(this, Qi) !== void 0 ? m(this, Qi) : this.parent ? Q(this, Qi, this.parent.depth() + 1) : Q(this, Qi, 0);
  }
  /**
   * @internal
   */
  childrenCache() {
    return m(this, er);
  }
  /**
   * Get the Path object referenced by the string path, resolved from this Path
   */
  resolve(e) {
    var a;
    if (!e)
      return this;
    const n = this.getRootString(e), r = e.substring(n.length).split(this.splitSep);
    return n ? re(a = this.getRoot(n), Pe, Dp).call(a, r) : re(this, Pe, Dp).call(this, r);
  }
  /**
   * Returns the cached children Path objects, if still available.  If they
   * have fallen out of the cache, then returns an empty array, and resets the
   * READDIR_CALLED bit, so that future calls to readdir() will require an fs
   * lookup.
   *
   * @internal
   */
  children() {
    const e = m(this, er).get(this);
    if (e)
      return e;
    const n = Object.assign([], { provisional: 0 });
    return m(this, er).set(this, n), Q(this, ke, m(this, ke) & ~qu), n;
  }
  /**
   * Resolves a path portion and returns or creates the child Path.
   *
   * Returns `this` if pathPart is `''` or `'.'`, or `parent` if pathPart is
   * `'..'`.
   *
   * This should not be called directly.  If `pathPart` contains any path
   * separators, it will lead to unsafe undefined behavior.
   *
   * Use `Path.resolve()` instead.
   *
   * @internal
   */
  child(e, n) {
    if (e === "" || e === ".")
      return this;
    if (e === "..")
      return this.parent || this;
    const i = this.children(), r = this.nocase ? _o(e) : Ds(e);
    for (const c of i)
      if (m(c, mi) === r)
        return c;
    const s = this.parent ? this.sep : "", a = m(this, Dn) ? m(this, Dn) + s + e : void 0, o = this.newChild(e, ln, {
      ...n,
      parent: this,
      fullpath: a
    });
    return this.canReaddir() || Q(o, ke, m(o, ke) | mn), i.push(o), o;
  }
  /**
   * The relative path from the cwd. If it does not share an ancestor with
   * the cwd, then this ends up being equivalent to the fullpath()
   */
  relative() {
    if (this.isCWD)
      return "";
    if (m(this, Hn) !== void 0)
      return m(this, Hn);
    const e = this.name, n = this.parent;
    if (!n)
      return Q(this, Hn, this.name);
    const i = n.relative();
    return i + (!i || !n.parent ? "" : this.sep) + e;
  }
  /**
   * The relative path from the cwd, using / as the path separator.
   * If it does not share an ancestor with
   * the cwd, then this ends up being equivalent to the fullpathPosix()
   * On posix systems, this is identical to relative().
   */
  relativePosix() {
    if (this.sep === "/")
      return this.relative();
    if (this.isCWD)
      return "";
    if (m(this, Vn) !== void 0)
      return m(this, Vn);
    const e = this.name, n = this.parent;
    if (!n)
      return Q(this, Vn, this.fullpathPosix());
    const i = n.relativePosix();
    return i + (!i || !n.parent ? "" : "/") + e;
  }
  /**
   * The fully resolved path string for this Path entry
   */
  fullpath() {
    if (m(this, Dn) !== void 0)
      return m(this, Dn);
    const e = this.name, n = this.parent;
    if (!n)
      return Q(this, Dn, this.name);
    const r = n.fullpath() + (n.parent ? this.sep : "") + e;
    return Q(this, Dn, r);
  }
  /**
   * On platforms other than windows, this is identical to fullpath.
   *
   * On windows, this is overridden to return the forward-slash form of the
   * full UNC path.
   */
  fullpathPosix() {
    if (m(this, Gn) !== void 0)
      return m(this, Gn);
    if (this.sep === "/")
      return Q(this, Gn, this.fullpath());
    if (!this.parent) {
      const r = this.fullpath().replace(/\\/g, "/");
      return /^[a-z]:\//i.test(r) ? Q(this, Gn, `//?/${r}`) : Q(this, Gn, r);
    }
    const e = this.parent, n = e.fullpathPosix(), i = n + (!n || !e.parent ? "" : "/") + this.name;
    return Q(this, Gn, i);
  }
  /**
   * Is the Path of an unknown type?
   *
   * Note that we might know *something* about it if there has been a previous
   * filesystem operation, for example that it does not exist, or is not a
   * link, or whether it has child entries.
   */
  isUnknown() {
    return (m(this, ke) & cn) === ln;
  }
  isType(e) {
    return this[`is${e}`]();
  }
  getType() {
    return this.isUnknown() ? "Unknown" : this.isDirectory() ? "Directory" : this.isFile() ? "File" : this.isSymbolicLink() ? "SymbolicLink" : this.isFIFO() ? "FIFO" : this.isCharacterDevice() ? "CharacterDevice" : this.isBlockDevice() ? "BlockDevice" : (
      /* c8 ignore start */
      this.isSocket() ? "Socket" : "Unknown"
    );
  }
  /**
   * Is the Path a regular file?
   */
  isFile() {
    return (m(this, ke) & cn) === gx;
  }
  /**
   * Is the Path a directory?
   */
  isDirectory() {
    return (m(this, ke) & cn) === Cn;
  }
  /**
   * Is the path a character device?
   */
  isCharacterDevice() {
    return (m(this, ke) & cn) === hx;
  }
  /**
   * Is the path a block device?
   */
  isBlockDevice() {
    return (m(this, ke) & cn) === mx;
  }
  /**
   * Is the path a FIFO pipe?
   */
  isFIFO() {
    return (m(this, ke) & cn) === dx;
  }
  /**
   * Is the path a socket?
   */
  isSocket() {
    return (m(this, ke) & cn) === bx;
  }
  /**
   * Is the path a symbolic link?
   */
  isSymbolicLink() {
    return (m(this, ke) & qi) === qi;
  }
  /**
   * Return the entry if it has been subject of a successful lstat, or
   * undefined otherwise.
   *
   * Does not read the filesystem, so an undefined result *could* simply
   * mean that we haven't called lstat on it.
   */
  lstatCached() {
    return m(this, ke) & fg ? this : void 0;
  }
  /**
   * Return the cached link target if the entry has been the subject of a
   * successful readlink, or undefined otherwise.
   *
   * Does not read the filesystem, so an undefined result *could* just mean we
   * don't have any cached data. Only use it if you are very sure that a
   * readlink() has been called at some point.
   */
  readlinkCached() {
    return m(this, Kn);
  }
  /**
   * Returns the cached realpath target if the entry has been the subject
   * of a successful realpath, or undefined otherwise.
   *
   * Does not read the filesystem, so an undefined result *could* just mean we
   * don't have any cached data. Only use it if you are very sure that a
   * realpath() has been called at some point.
   */
  realpathCached() {
    return m(this, jn);
  }
  /**
   * Returns the cached child Path entries array if the entry has been the
   * subject of a successful readdir(), or [] otherwise.
   *
   * Does not read the filesystem, so an empty array *could* just mean we
   * don't have any cached data. Only use it if you are very sure that a
   * readdir() has been called recently enough to still be valid.
   */
  readdirCached() {
    const e = this.children();
    return e.slice(0, e.provisional);
  }
  /**
   * Return true if it's worth trying to readlink.  Ie, we don't (yet) have
   * any indication that readlink will definitely fail.
   *
   * Returns false if the path is known to not be a symlink, if a previous
   * readlink failed, or if the entry does not exist.
   */
  canReadlink() {
    if (m(this, Kn))
      return !0;
    if (!this.parent)
      return !1;
    const e = m(this, ke) & cn;
    return !(e !== ln && e !== qi || m(this, ke) & wo || m(this, ke) & mn);
  }
  /**
   * Return true if readdir has previously been successfully called on this
   * path, indicating that cachedReaddir() is likely valid.
   */
  calledReaddir() {
    return !!(m(this, ke) & qu);
  }
  /**
   * Returns true if the path is known to not exist. That is, a previous lstat
   * or readdir failed to verify its existence when that would have been
   * expected, or a parent entry was marked either enoent or enotdir.
   */
  isENOENT() {
    return !!(m(this, ke) & mn);
  }
  /**
   * Return true if the path is a match for the given path name.  This handles
   * case sensitivity and unicode normalization.
   *
   * Note: even on case-sensitive systems, it is **not** safe to test the
   * equality of the `.name` property to determine whether a given pathname
   * matches, due to unicode normalization mismatches.
   *
   * Always use this method instead of testing the `path.name` property
   * directly.
   */
  isNamed(e) {
    return this.nocase ? m(this, mi) === _o(e) : m(this, mi) === Ds(e);
  }
  /**
   * Return the Path object corresponding to the target of a symbolic link.
   *
   * If the Path is not a symbolic link, or if the readlink call fails for any
   * reason, `undefined` is returned.
   *
   * Result is cached, and thus may be outdated if the filesystem is mutated.
   */
  async readlink() {
    var n;
    const e = m(this, Kn);
    if (e)
      return e;
    if (this.canReadlink() && this.parent)
      try {
        const i = await m(this, Ut).promises.readlink(this.fullpath()), r = (n = await this.parent.realpath()) == null ? void 0 : n.resolve(i);
        if (r)
          return Q(this, Kn, r);
      } catch (i) {
        re(this, Pe, Fp).call(this, i.code);
        return;
      }
  }
  /**
   * Synchronous {@link PathBase.readlink}
   */
  readlinkSync() {
    var n;
    const e = m(this, Kn);
    if (e)
      return e;
    if (this.canReadlink() && this.parent)
      try {
        const i = m(this, Ut).readlinkSync(this.fullpath()), r = (n = this.parent.realpathSync()) == null ? void 0 : n.resolve(i);
        if (r)
          return Q(this, Kn, r);
      } catch (i) {
        re(this, Pe, Fp).call(this, i.code);
        return;
      }
  }
  /**
   * Call lstat() on this Path, and update all known information that can be
   * determined.
   *
   * Note that unlike `fs.lstat()`, the returned value does not contain some
   * information, such as `mode`, `dev`, `nlink`, and `ino`.  If that
   * information is required, you will need to call `fs.lstat` yourself.
   *
   * If the Path refers to a nonexistent file, or if the lstat call fails for
   * any reason, `undefined` is returned.  Otherwise the updated Path object is
   * returned.
   *
   * Results are cached, and thus may be out of date if the filesystem is
   * mutated.
   */
  async lstat() {
    if (!(m(this, ke) & mn))
      try {
        return re(this, Pe, Mp).call(this, await m(this, Ut).promises.lstat(this.fullpath())), this;
      } catch (e) {
        re(this, Pe, Np).call(this, e.code);
      }
  }
  /**
   * synchronous {@link PathBase.lstat}
   */
  lstatSync() {
    if (!(m(this, ke) & mn))
      try {
        return re(this, Pe, Mp).call(this, m(this, Ut).lstatSync(this.fullpath())), this;
      } catch (e) {
        re(this, Pe, Np).call(this, e.code);
      }
  }
  /**
   * Standard node-style callback interface to get list of directory entries.
   *
   * If the Path cannot or does not contain any children, then an empty array
   * is returned.
   *
   * Results are cached, and thus may be out of date if the filesystem is
   * mutated.
   *
   * @param cb The callback called with (er, entries).  Note that the `er`
   * param is somewhat extraneous, as all readdir() errors are handled and
   * simply result in an empty set of entries being returned.
   * @param allowZalgo Boolean indicating that immediately known results should
   * *not* be deferred with `queueMicrotask`. Defaults to `false`. Release
   * zalgo at your peril, the dark pony lord is devious and unforgiving.
   */
  readdirCB(e, n = !1) {
    if (!this.canReaddir()) {
      n ? e(null, []) : queueMicrotask(() => e(null, []));
      return;
    }
    const i = this.children();
    if (this.calledReaddir()) {
      const s = i.slice(0, i.provisional);
      n ? e(null, s) : queueMicrotask(() => e(null, s));
      return;
    }
    if (m(this, zr).push(e), m(this, Wr))
      return;
    Q(this, Wr, !0);
    const r = this.fullpath();
    m(this, Ut).readdir(r, { withFileTypes: !0 }, (s, a) => {
      if (s)
        re(this, Pe, Go).call(this, s.code), i.provisional = 0;
      else {
        for (const o of a)
          re(this, Pe, Ho).call(this, o, i);
        re(this, Pe, qo).call(this, i);
      }
      re(this, Pe, Sx).call(this, i.slice(0, i.provisional));
    });
  }
  /**
   * Return an array of known child entries.
   *
   * If the Path cannot or does not contain any children, then an empty array
   * is returned.
   *
   * Results are cached, and thus may be out of date if the filesystem is
   * mutated.
   */
  async readdir() {
    if (!this.canReaddir())
      return [];
    const e = this.children();
    if (this.calledReaddir())
      return e.slice(0, e.provisional);
    const n = this.fullpath();
    if (m(this, tr))
      await m(this, tr);
    else {
      let i = () => {
      };
      Q(this, tr, new Promise((r) => i = r));
      try {
        for (const r of await m(this, Ut).promises.readdir(n, {
          withFileTypes: !0
        }))
          re(this, Pe, Ho).call(this, r, e);
        re(this, Pe, qo).call(this, e);
      } catch (r) {
        re(this, Pe, Go).call(this, r.code), e.provisional = 0;
      }
      Q(this, tr, void 0), i();
    }
    return e.slice(0, e.provisional);
  }
  /**
   * synchronous {@link PathBase.readdir}
   */
  readdirSync() {
    if (!this.canReaddir())
      return [];
    const e = this.children();
    if (this.calledReaddir())
      return e.slice(0, e.provisional);
    const n = this.fullpath();
    try {
      for (const i of m(this, Ut).readdirSync(n, {
        withFileTypes: !0
      }))
        re(this, Pe, Ho).call(this, i, e);
      re(this, Pe, qo).call(this, e);
    } catch (i) {
      re(this, Pe, Go).call(this, i.code), e.provisional = 0;
    }
    return e.slice(0, e.provisional);
  }
  canReaddir() {
    if (m(this, ke) & dg)
      return !1;
    const e = cn & m(this, ke);
    return e === ln || e === Cn || e === qi;
  }
  shouldWalk(e, n) {
    return (m(this, ke) & Cn) === Cn && !(m(this, ke) & dg) && !e.has(this) && (!n || n(this));
  }
  /**
   * Return the Path object corresponding to path as resolved
   * by realpath(3).
   *
   * If the realpath call fails for any reason, `undefined` is returned.
   *
   * Result is cached, and thus may be outdated if the filesystem is mutated.
   * On success, returns a Path object.
   */
  async realpath() {
    if (m(this, jn))
      return m(this, jn);
    if (!((Wo | wo | mn) & m(this, ke)))
      try {
        const e = await m(this, Ut).promises.realpath(this.fullpath());
        return Q(this, jn, this.resolve(e));
      } catch {
        re(this, Pe, Lp).call(this);
      }
  }
  /**
   * Synchronous {@link realpath}
   */
  realpathSync() {
    if (m(this, jn))
      return m(this, jn);
    if (!((Wo | wo | mn) & m(this, ke)))
      try {
        const e = m(this, Ut).realpathSync(this.fullpath());
        return Q(this, jn, this.resolve(e));
      } catch {
        re(this, Pe, Lp).call(this);
      }
  }
  /**
   * Internal method to mark this Path object as the scurry cwd,
   * called by {@link PathScurry#chdir}
   *
   * @internal
   */
  [vx](e) {
    if (e === this)
      return;
    e.isCWD = !1, this.isCWD = !0;
    const n = /* @__PURE__ */ new Set([]);
    let i = [], r = this;
    for (; r && r.parent; )
      n.add(r), Q(r, Hn, i.join(this.sep)), Q(r, Vn, i.join("/")), r = r.parent, i.push("..");
    for (r = e; r && r.parent && !n.has(r); )
      Q(r, Hn, void 0), Q(r, Vn, void 0), r = r.parent;
  }
}
Ut = new WeakMap(), aa = new WeakMap(), oa = new WeakMap(), ca = new WeakMap(), la = new WeakMap(), ua = new WeakMap(), pa = new WeakMap(), fa = new WeakMap(), da = new WeakMap(), ha = new WeakMap(), ma = new WeakMap(), ga = new WeakMap(), ba = new WeakMap(), ya = new WeakMap(), va = new WeakMap(), xa = new WeakMap(), wa = new WeakMap(), _a = new WeakMap(), Sa = new WeakMap(), mi = new WeakMap(), Qi = new WeakMap(), Dn = new WeakMap(), Gn = new WeakMap(), Hn = new WeakMap(), Vn = new WeakMap(), ke = new WeakMap(), er = new WeakMap(), Kn = new WeakMap(), jn = new WeakMap(), Pe = new WeakSet(), Dp = function(e) {
  let n = this;
  for (const i of e)
    n = n.child(i);
  return n;
}, qo = function(e) {
  var n;
  Q(this, ke, m(this, ke) | qu);
  for (let i = e.provisional; i < e.length; i++) {
    const r = e[i];
    r && re(n = r, Pe, js).call(n);
  }
}, js = function() {
  m(this, ke) & mn || (Q(this, ke, (m(this, ke) | mn) & Ts), re(this, Pe, jp).call(this));
}, jp = function() {
  var n;
  const e = this.children();
  e.provisional = 0;
  for (const i of e)
    re(n = i, Pe, js).call(n);
}, Lp = function() {
  Q(this, ke, m(this, ke) | Wo), re(this, Pe, Ls).call(this);
}, // save the information when we know the entry is not a dir
Ls = function() {
  if (m(this, ke) & Is)
    return;
  let e = m(this, ke);
  (e & cn) === Cn && (e &= Ts), Q(this, ke, e | Is), re(this, Pe, jp).call(this);
}, Go = function(e = "") {
  e === "ENOTDIR" || e === "EPERM" ? re(this, Pe, Ls).call(this) : e === "ENOENT" ? re(this, Pe, js).call(this) : this.children().provisional = 0;
}, Np = function(e = "") {
  var n;
  if (e === "ENOTDIR") {
    const i = this.parent;
    re(n = i, Pe, Ls).call(n);
  } else e === "ENOENT" && re(this, Pe, js).call(this);
}, Fp = function(e = "") {
  var i;
  let n = m(this, ke);
  n |= wo, e === "ENOENT" && (n |= mn), (e === "EINVAL" || e === "UNKNOWN") && (n &= Ts), Q(this, ke, n), e === "ENOTDIR" && this.parent && re(i = this.parent, Pe, Ls).call(i);
}, Ho = function(e, n) {
  return re(this, Pe, wx).call(this, e, n) || re(this, Pe, xx).call(this, e, n);
}, xx = function(e, n) {
  const i = Gu(e), r = this.newChild(e.name, i, { parent: this }), s = m(r, ke) & cn;
  return s !== Cn && s !== qi && s !== ln && Q(r, ke, m(r, ke) | Is), n.unshift(r), n.provisional++, r;
}, wx = function(e, n) {
  for (let i = n.provisional; i < n.length; i++) {
    const r = n[i];
    if ((this.nocase ? _o(e.name) : Ds(e.name)) === m(r, mi))
      return re(this, Pe, _x).call(this, e, r, i, n);
  }
}, _x = function(e, n, i, r) {
  const s = n.name;
  return Q(n, ke, m(n, ke) & Ts | Gu(e)), s !== e.name && (n.name = e.name), i !== r.provisional && (i === r.length - 1 ? r.pop() : r.splice(i, 1), r.unshift(n)), r.provisional++, n;
}, Mp = function(e) {
  const { atime: n, atimeMs: i, birthtime: r, birthtimeMs: s, blksize: a, blocks: o, ctime: c, ctimeMs: l, dev: u, gid: p, ino: d, mode: b, mtime: x, mtimeMs: v, nlink: y, rdev: f, size: h, uid: g } = e;
  Q(this, xa, n), Q(this, ga, i), Q(this, Sa, r), Q(this, va, s), Q(this, fa, a), Q(this, ma, o), Q(this, _a, c), Q(this, ya, l), Q(this, aa, u), Q(this, ua, p), Q(this, da, d), Q(this, oa, b), Q(this, wa, x), Q(this, ba, v), Q(this, ca, y), Q(this, pa, f), Q(this, ha, h), Q(this, la, g);
  const A = Gu(e);
  Q(this, ke, m(this, ke) & Ts | A | fg), A !== ln && A !== Cn && A !== qi && Q(this, ke, m(this, ke) | Is);
}, zr = new WeakMap(), Wr = new WeakMap(), Sx = function(e) {
  Q(this, Wr, !1);
  const n = m(this, zr).slice();
  m(this, zr).length = 0, n.forEach((i) => i(null, e));
}, tr = new WeakMap();
et.PathBase = Mt;
class Wa extends Mt {
  /**
   * Do not create new Path objects directly.  They should always be accessed
   * via the PathScurry class or other methods on the Path class.
   *
   * @internal
   */
  constructor(n, i = ln, r, s, a, o, c) {
    super(n, i, r, s, a, o, c);
    /**
     * Separator for generating path strings.
     */
    ne(this, "sep", "\\");
    /**
     * Separator for parsing path strings.
     */
    ne(this, "splitSep", z2);
  }
  /**
   * @internal
   */
  newChild(n, i = ln, r = {}) {
    return new Wa(n, i, this.root, this.roots, this.nocase, this.childrenCache(), r);
  }
  /**
   * @internal
   */
  getRootString(n) {
    return Oc.win32.parse(n).root;
  }
  /**
   * @internal
   */
  getRoot(n) {
    if (n = U2(n.toUpperCase()), n === this.root.name)
      return this.root;
    for (const [i, r] of Object.entries(this.roots))
      if (this.sameRoot(n, i))
        return this.roots[n] = r;
    return this.roots[n] = new Zf(n, this).root;
  }
  /**
   * @internal
   */
  sameRoot(n, i = this.root.name) {
    return n = n.toUpperCase().replace(/\//g, "\\").replace(fx, "$1\\"), n === i;
  }
}
et.PathWin32 = Wa;
class qa extends Mt {
  /**
   * Do not create new Path objects directly.  They should always be accessed
   * via the PathScurry class or other methods on the Path class.
   *
   * @internal
   */
  constructor(n, i = ln, r, s, a, o, c) {
    super(n, i, r, s, a, o, c);
    /**
     * separator for parsing path strings
     */
    ne(this, "splitSep", "/");
    /**
     * separator for generating path strings
     */
    ne(this, "sep", "/");
  }
  /**
   * @internal
   */
  getRootString(n) {
    return n.startsWith("/") ? "/" : "";
  }
  /**
   * @internal
   */
  getRoot(n) {
    return this.root;
  }
  /**
   * @internal
   */
  newChild(n, i = ln, r = {}) {
    return new qa(n, i, this.root, this.roots, this.nocase, this.childrenCache(), r);
  }
}
et.PathPosix = qa;
var qr, Gr, Ea, Aa;
class Yf {
  /**
   * This class should not be instantiated directly.
   *
   * Use PathScurryWin32, PathScurryDarwin, PathScurryPosix, or PathScurry
   *
   * @internal
   */
  constructor(e = process.cwd(), n, i, { nocase: r, childrenCacheSize: s = 16 * 1024, fs: a = ks } = {}) {
    /**
     * The root Path entry for the current working directory of this Scurry
     */
    ne(this, "root");
    /**
     * The string path for the root of this Scurry's current working directory
     */
    ne(this, "rootPath");
    /**
     * A collection of all roots encountered, referenced by rootPath
     */
    ne(this, "roots");
    /**
     * The Path entry corresponding to this PathScurry's current working directory.
     */
    ne(this, "cwd");
    fe(this, qr);
    fe(this, Gr);
    fe(this, Ea);
    /**
     * Perform path comparisons case-insensitively.
     *
     * Defaults true on Darwin and Windows systems, false elsewhere.
     */
    ne(this, "nocase");
    fe(this, Aa);
    Q(this, Aa, px(a)), (e instanceof URL || e.startsWith("file://")) && (e = (0, M2.fileURLToPath)(e));
    const o = n.resolve(e);
    this.roots = /* @__PURE__ */ Object.create(null), this.rootPath = this.parseRootPath(o), Q(this, qr, new Ip()), Q(this, Gr, new Ip()), Q(this, Ea, new yx(s));
    const c = o.substring(this.rootPath.length).split(i);
    if (c.length === 1 && !c[0] && c.pop(), r === void 0)
      throw new TypeError("must provide nocase setting to PathScurryBase ctor");
    this.nocase = r, this.root = this.newRoot(m(this, Aa)), this.roots[this.rootPath] = this.root;
    let l = this.root, u = c.length - 1;
    const p = n.sep;
    let d = this.rootPath, b = !1;
    for (const x of c) {
      const v = u--;
      l = l.child(x, {
        relative: new Array(v).fill("..").join(p),
        relativePosix: new Array(v).fill("..").join("/"),
        fullpath: d += (b ? "" : p) + x
      }), b = !0;
    }
    this.cwd = l;
  }
  /**
   * Get the depth of a provided path, string, or the cwd
   */
  depth(e = this.cwd) {
    return typeof e == "string" && (e = this.cwd.resolve(e)), e.depth();
  }
  /**
   * Return the cache of child entries.  Exposed so subclasses can create
   * child Path objects in a platform-specific way.
   *
   * @internal
   */
  childrenCache() {
    return m(this, Ea);
  }
  /**
   * Resolve one or more path strings to a resolved string
   *
   * Same interface as require('path').resolve.
   *
   * Much faster than path.resolve() when called multiple times for the same
   * path, because the resolved Path objects are cached.  Much slower
   * otherwise.
   */
  resolve(...e) {
    let n = "";
    for (let s = e.length - 1; s >= 0; s--) {
      const a = e[s];
      if (!(!a || a === ".") && (n = n ? `${a}/${n}` : a, this.isAbsolute(a)))
        break;
    }
    const i = m(this, qr).get(n);
    if (i !== void 0)
      return i;
    const r = this.cwd.resolve(n).fullpath();
    return m(this, qr).set(n, r), r;
  }
  /**
   * Resolve one or more path strings to a resolved string, returning
   * the posix path.  Identical to .resolve() on posix systems, but on
   * windows will return a forward-slash separated UNC path.
   *
   * Same interface as require('path').resolve.
   *
   * Much faster than path.resolve() when called multiple times for the same
   * path, because the resolved Path objects are cached.  Much slower
   * otherwise.
   */
  resolvePosix(...e) {
    let n = "";
    for (let s = e.length - 1; s >= 0; s--) {
      const a = e[s];
      if (!(!a || a === ".") && (n = n ? `${a}/${n}` : a, this.isAbsolute(a)))
        break;
    }
    const i = m(this, Gr).get(n);
    if (i !== void 0)
      return i;
    const r = this.cwd.resolve(n).fullpathPosix();
    return m(this, Gr).set(n, r), r;
  }
  /**
   * find the relative path from the cwd to the supplied path string or entry
   */
  relative(e = this.cwd) {
    return typeof e == "string" && (e = this.cwd.resolve(e)), e.relative();
  }
  /**
   * find the relative path from the cwd to the supplied path string or
   * entry, using / as the path delimiter, even on Windows.
   */
  relativePosix(e = this.cwd) {
    return typeof e == "string" && (e = this.cwd.resolve(e)), e.relativePosix();
  }
  /**
   * Return the basename for the provided string or Path object
   */
  basename(e = this.cwd) {
    return typeof e == "string" && (e = this.cwd.resolve(e)), e.name;
  }
  /**
   * Return the dirname for the provided string or Path object
   */
  dirname(e = this.cwd) {
    return typeof e == "string" && (e = this.cwd.resolve(e)), (e.parent || e).fullpath();
  }
  async readdir(e = this.cwd, n = {
    withFileTypes: !0
  }) {
    typeof e == "string" ? e = this.cwd.resolve(e) : e instanceof Mt || (n = e, e = this.cwd);
    const { withFileTypes: i } = n;
    if (e.canReaddir()) {
      const r = await e.readdir();
      return i ? r : r.map((s) => s.name);
    } else
      return [];
  }
  readdirSync(e = this.cwd, n = {
    withFileTypes: !0
  }) {
    typeof e == "string" ? e = this.cwd.resolve(e) : e instanceof Mt || (n = e, e = this.cwd);
    const { withFileTypes: i = !0 } = n;
    return e.canReaddir() ? i ? e.readdirSync() : e.readdirSync().map((r) => r.name) : [];
  }
  /**
   * Call lstat() on the string or Path object, and update all known
   * information that can be determined.
   *
   * Note that unlike `fs.lstat()`, the returned value does not contain some
   * information, such as `mode`, `dev`, `nlink`, and `ino`.  If that
   * information is required, you will need to call `fs.lstat` yourself.
   *
   * If the Path refers to a nonexistent file, or if the lstat call fails for
   * any reason, `undefined` is returned.  Otherwise the updated Path object is
   * returned.
   *
   * Results are cached, and thus may be out of date if the filesystem is
   * mutated.
   */
  async lstat(e = this.cwd) {
    return typeof e == "string" && (e = this.cwd.resolve(e)), e.lstat();
  }
  /**
   * synchronous {@link PathScurryBase.lstat}
   */
  lstatSync(e = this.cwd) {
    return typeof e == "string" && (e = this.cwd.resolve(e)), e.lstatSync();
  }
  async readlink(e = this.cwd, { withFileTypes: n } = {
    withFileTypes: !1
  }) {
    typeof e == "string" ? e = this.cwd.resolve(e) : e instanceof Mt || (n = e.withFileTypes, e = this.cwd);
    const i = await e.readlink();
    return n ? i : i == null ? void 0 : i.fullpath();
  }
  readlinkSync(e = this.cwd, { withFileTypes: n } = {
    withFileTypes: !1
  }) {
    typeof e == "string" ? e = this.cwd.resolve(e) : e instanceof Mt || (n = e.withFileTypes, e = this.cwd);
    const i = e.readlinkSync();
    return n ? i : i == null ? void 0 : i.fullpath();
  }
  async realpath(e = this.cwd, { withFileTypes: n } = {
    withFileTypes: !1
  }) {
    typeof e == "string" ? e = this.cwd.resolve(e) : e instanceof Mt || (n = e.withFileTypes, e = this.cwd);
    const i = await e.realpath();
    return n ? i : i == null ? void 0 : i.fullpath();
  }
  realpathSync(e = this.cwd, { withFileTypes: n } = {
    withFileTypes: !1
  }) {
    typeof e == "string" ? e = this.cwd.resolve(e) : e instanceof Mt || (n = e.withFileTypes, e = this.cwd);
    const i = e.realpathSync();
    return n ? i : i == null ? void 0 : i.fullpath();
  }
  async walk(e = this.cwd, n = {}) {
    typeof e == "string" ? e = this.cwd.resolve(e) : e instanceof Mt || (n = e, e = this.cwd);
    const { withFileTypes: i = !0, follow: r = !1, filter: s, walkFilter: a } = n, o = [];
    (!s || s(e)) && o.push(i ? e : e.fullpath());
    const c = /* @__PURE__ */ new Set(), l = (p, d) => {
      c.add(p), p.readdirCB((b, x) => {
        if (b)
          return d(b);
        let v = x.length;
        if (!v)
          return d();
        const y = () => {
          --v === 0 && d();
        };
        for (const f of x)
          (!s || s(f)) && o.push(i ? f : f.fullpath()), r && f.isSymbolicLink() ? f.realpath().then((h) => h != null && h.isUnknown() ? h.lstat() : h).then((h) => h != null && h.shouldWalk(c, a) ? l(h, y) : y()) : f.shouldWalk(c, a) ? l(f, y) : y();
      }, !0);
    }, u = e;
    return new Promise((p, d) => {
      l(u, (b) => {
        if (b)
          return d(b);
        p(o);
      });
    });
  }
  walkSync(e = this.cwd, n = {}) {
    typeof e == "string" ? e = this.cwd.resolve(e) : e instanceof Mt || (n = e, e = this.cwd);
    const { withFileTypes: i = !0, follow: r = !1, filter: s, walkFilter: a } = n, o = [];
    (!s || s(e)) && o.push(i ? e : e.fullpath());
    const c = /* @__PURE__ */ new Set([e]);
    for (const l of c) {
      const u = l.readdirSync();
      for (const p of u) {
        (!s || s(p)) && o.push(i ? p : p.fullpath());
        let d = p;
        if (p.isSymbolicLink()) {
          if (!(r && (d = p.realpathSync())))
            continue;
          d.isUnknown() && d.lstatSync();
        }
        d.shouldWalk(c, a) && c.add(d);
      }
    }
    return o;
  }
  /**
   * Support for `for await`
   *
   * Alias for {@link PathScurryBase.iterate}
   *
   * Note: As of Node 19, this is very slow, compared to other methods of
   * walking.  Consider using {@link PathScurryBase.stream} if memory overhead
   * and backpressure are concerns, or {@link PathScurryBase.walk} if not.
   */
  [Symbol.asyncIterator]() {
    return this.iterate();
  }
  iterate(e = this.cwd, n = {}) {
    return typeof e == "string" ? e = this.cwd.resolve(e) : e instanceof Mt || (n = e, e = this.cwd), this.stream(e, n)[Symbol.asyncIterator]();
  }
  /**
   * Iterating over a PathScurry performs a synchronous walk.
   *
   * Alias for {@link PathScurryBase.iterateSync}
   */
  [Symbol.iterator]() {
    return this.iterateSync();
  }
  *iterateSync(e = this.cwd, n = {}) {
    typeof e == "string" ? e = this.cwd.resolve(e) : e instanceof Mt || (n = e, e = this.cwd);
    const { withFileTypes: i = !0, follow: r = !1, filter: s, walkFilter: a } = n;
    (!s || s(e)) && (yield i ? e : e.fullpath());
    const o = /* @__PURE__ */ new Set([e]);
    for (const c of o) {
      const l = c.readdirSync();
      for (const u of l) {
        (!s || s(u)) && (yield i ? u : u.fullpath());
        let p = u;
        if (u.isSymbolicLink()) {
          if (!(r && (p = u.realpathSync())))
            continue;
          p.isUnknown() && p.lstatSync();
        }
        p.shouldWalk(o, a) && o.add(p);
      }
    }
  }
  stream(e = this.cwd, n = {}) {
    typeof e == "string" ? e = this.cwd.resolve(e) : e instanceof Mt || (n = e, e = this.cwd);
    const { withFileTypes: i = !0, follow: r = !1, filter: s, walkFilter: a } = n, o = new pg.Minipass({ objectMode: !0 });
    (!s || s(e)) && o.write(i ? e : e.fullpath());
    const c = /* @__PURE__ */ new Set(), l = [e];
    let u = 0;
    const p = () => {
      let d = !1;
      for (; !d; ) {
        const b = l.shift();
        if (!b) {
          u === 0 && o.end();
          return;
        }
        u++, c.add(b);
        const x = (y, f, h = !1) => {
          if (y)
            return o.emit("error", y);
          if (r && !h) {
            const g = [];
            for (const A of f)
              A.isSymbolicLink() && g.push(A.realpath().then((C) => C != null && C.isUnknown() ? C.lstat() : C));
            if (g.length) {
              Promise.all(g).then(() => x(null, f, !0));
              return;
            }
          }
          for (const g of f)
            g && (!s || s(g)) && (o.write(i ? g : g.fullpath()) || (d = !0));
          u--;
          for (const g of f) {
            const A = g.realpathCached() || g;
            A.shouldWalk(c, a) && l.push(A);
          }
          d && !o.flowing ? o.once("drain", p) : v || p();
        };
        let v = !0;
        b.readdirCB(x, !0), v = !1;
      }
    };
    return p(), o;
  }
  streamSync(e = this.cwd, n = {}) {
    typeof e == "string" ? e = this.cwd.resolve(e) : e instanceof Mt || (n = e, e = this.cwd);
    const { withFileTypes: i = !0, follow: r = !1, filter: s, walkFilter: a } = n, o = new pg.Minipass({ objectMode: !0 }), c = /* @__PURE__ */ new Set();
    (!s || s(e)) && o.write(i ? e : e.fullpath());
    const l = [e];
    let u = 0;
    const p = () => {
      let d = !1;
      for (; !d; ) {
        const b = l.shift();
        if (!b) {
          u === 0 && o.end();
          return;
        }
        u++, c.add(b);
        const x = b.readdirSync();
        for (const v of x)
          (!s || s(v)) && (o.write(i ? v : v.fullpath()) || (d = !0));
        u--;
        for (const v of x) {
          let y = v;
          if (v.isSymbolicLink()) {
            if (!(r && (y = v.realpathSync())))
              continue;
            y.isUnknown() && y.lstatSync();
          }
          y.shouldWalk(c, a) && l.push(y);
        }
      }
      d && !o.flowing && o.once("drain", p);
    };
    return p(), o;
  }
  chdir(e = this.cwd) {
    const n = this.cwd;
    this.cwd = typeof e == "string" ? this.cwd.resolve(e) : e, this.cwd[vx](n);
  }
}
qr = new WeakMap(), Gr = new WeakMap(), Ea = new WeakMap(), Aa = new WeakMap();
et.PathScurryBase = Yf;
class Zf extends Yf {
  constructor(n = process.cwd(), i = {}) {
    const { nocase: r = !0 } = i;
    super(n, Oc.win32, "\\", { ...i, nocase: r });
    /**
     * separator for generating path strings
     */
    ne(this, "sep", "\\");
    this.nocase = r;
    for (let s = this.cwd; s; s = s.parent)
      s.nocase = this.nocase;
  }
  /**
   * @internal
   */
  parseRootPath(n) {
    return Oc.win32.parse(n).root.toUpperCase();
  }
  /**
   * @internal
   */
  newRoot(n) {
    return new Wa(this.rootPath, Cn, void 0, this.roots, this.nocase, this.childrenCache(), { fs: n });
  }
  /**
   * Return true if the provided path string is an absolute path
   */
  isAbsolute(n) {
    return n.startsWith("/") || n.startsWith("\\") || /^[a-z]:(\/|\\)/i.test(n);
  }
}
et.PathScurryWin32 = Zf;
class Xf extends Yf {
  constructor(n = process.cwd(), i = {}) {
    const { nocase: r = !1 } = i;
    super(n, Oc.posix, "/", { ...i, nocase: r });
    /**
     * separator for generating path strings
     */
    ne(this, "sep", "/");
    this.nocase = r;
  }
  /**
   * @internal
   */
  parseRootPath(n) {
    return "/";
  }
  /**
   * @internal
   */
  newRoot(n) {
    return new qa(this.rootPath, Cn, void 0, this.roots, this.nocase, this.childrenCache(), { fs: n });
  }
  /**
   * Return true if the provided path string is an absolute path
   */
  isAbsolute(n) {
    return n.startsWith("/");
  }
}
et.PathScurryPosix = Xf;
class Ex extends Xf {
  constructor(e = process.cwd(), n = {}) {
    const { nocase: i = !0 } = n;
    super(e, { ...n, nocase: i });
  }
}
et.PathScurryDarwin = Ex;
et.Path = process.platform === "win32" ? Wa : qa;
et.PathScurry = process.platform === "win32" ? Zf : process.platform === "darwin" ? Ex : Xf;
var Ga = {};
Object.defineProperty(Ga, "__esModule", { value: !0 });
Ga.Pattern = void 0;
const q2 = Pi, G2 = (t) => t.length >= 1, H2 = (t) => t.length >= 1;
var yt, en, At, nr, En, Ta, gi, bi, yi, Hr;
const gd = class gd {
  constructor(e, n, i, r) {
    fe(this, yt);
    fe(this, en);
    fe(this, At);
    ne(this, "length");
    fe(this, nr);
    fe(this, En);
    fe(this, Ta);
    fe(this, gi);
    fe(this, bi);
    fe(this, yi);
    fe(this, Hr, !0);
    if (!G2(e))
      throw new TypeError("empty pattern list");
    if (!H2(n))
      throw new TypeError("empty glob list");
    if (n.length !== e.length)
      throw new TypeError("mismatched pattern list and glob list lengths");
    if (this.length = e.length, i < 0 || i >= this.length)
      throw new TypeError("index out of range");
    if (Q(this, yt, e), Q(this, en, n), Q(this, At, i), Q(this, nr, r), m(this, At) === 0) {
      if (this.isUNC()) {
        const [s, a, o, c, ...l] = m(this, yt), [u, p, d, b, ...x] = m(this, en);
        l[0] === "" && (l.shift(), x.shift());
        const v = [s, a, o, c, ""].join("/"), y = [u, p, d, b, ""].join("/");
        Q(this, yt, [v, ...l]), Q(this, en, [y, ...x]), this.length = m(this, yt).length;
      } else if (this.isDrive() || this.isAbsolute()) {
        const [s, ...a] = m(this, yt), [o, ...c] = m(this, en);
        a[0] === "" && (a.shift(), c.shift());
        const l = s + "/", u = o + "/";
        Q(this, yt, [l, ...a]), Q(this, en, [u, ...c]), this.length = m(this, yt).length;
      }
    }
  }
  /**
   * The first entry in the parsed list of patterns
   */
  pattern() {
    return m(this, yt)[m(this, At)];
  }
  /**
   * true of if pattern() returns a string
   */
  isString() {
    return typeof m(this, yt)[m(this, At)] == "string";
  }
  /**
   * true of if pattern() returns GLOBSTAR
   */
  isGlobstar() {
    return m(this, yt)[m(this, At)] === q2.GLOBSTAR;
  }
  /**
   * true if pattern() returns a regexp
   */
  isRegExp() {
    return m(this, yt)[m(this, At)] instanceof RegExp;
  }
  /**
   * The /-joined set of glob parts that make up this pattern
   */
  globString() {
    return Q(this, Ta, m(this, Ta) || (m(this, At) === 0 ? this.isAbsolute() ? m(this, en)[0] + m(this, en).slice(1).join("/") : m(this, en).join("/") : m(this, en).slice(m(this, At)).join("/")));
  }
  /**
   * true if there are more pattern parts after this one
   */
  hasMore() {
    return this.length > m(this, At) + 1;
  }
  /**
   * The rest of the pattern after this part, or null if this is the end
   */
  rest() {
    return m(this, En) !== void 0 ? m(this, En) : this.hasMore() ? (Q(this, En, new gd(m(this, yt), m(this, en), m(this, At) + 1, m(this, nr))), Q(m(this, En), yi, m(this, yi)), Q(m(this, En), bi, m(this, bi)), Q(m(this, En), gi, m(this, gi)), m(this, En)) : Q(this, En, null);
  }
  /**
   * true if the pattern represents a //unc/path/ on windows
   */
  isUNC() {
    const e = m(this, yt);
    return m(this, bi) !== void 0 ? m(this, bi) : Q(this, bi, m(this, nr) === "win32" && m(this, At) === 0 && e[0] === "" && e[1] === "" && typeof e[2] == "string" && !!e[2] && typeof e[3] == "string" && !!e[3]);
  }
  // pattern like C:/...
  // split = ['C:', ...]
  // XXX: would be nice to handle patterns like `c:*` to test the cwd
  // in c: for *, but I don't know of a way to even figure out what that
  // cwd is without actually chdir'ing into it?
  /**
   * True if the pattern starts with a drive letter on Windows
   */
  isDrive() {
    const e = m(this, yt);
    return m(this, gi) !== void 0 ? m(this, gi) : Q(this, gi, m(this, nr) === "win32" && m(this, At) === 0 && this.length > 1 && typeof e[0] == "string" && /^[a-z]:$/i.test(e[0]));
  }
  // pattern = '/' or '/...' or '/x/...'
  // split = ['', ''] or ['', ...] or ['', 'x', ...]
  // Drive and UNC both considered absolute on windows
  /**
   * True if the pattern is rooted on an absolute path
   */
  isAbsolute() {
    const e = m(this, yt);
    return m(this, yi) !== void 0 ? m(this, yi) : Q(this, yi, e[0] === "" && e.length > 1 || this.isDrive() || this.isUNC());
  }
  /**
   * consume the root of the pattern, and return it
   */
  root() {
    const e = m(this, yt)[0];
    return typeof e == "string" && this.isAbsolute() && m(this, At) === 0 ? e : "";
  }
  /**
   * Check to see if the current globstar pattern is allowed to follow
   * a symbolic link.
   */
  checkFollowGlobstar() {
    return !(m(this, At) === 0 || !this.isGlobstar() || !m(this, Hr));
  }
  /**
   * Mark that the current globstar pattern is following a symbolic link
   */
  markFollowGlobstar() {
    return m(this, At) === 0 || !this.isGlobstar() || !m(this, Hr) ? !1 : (Q(this, Hr, !1), !0);
  }
};
yt = new WeakMap(), en = new WeakMap(), At = new WeakMap(), nr = new WeakMap(), En = new WeakMap(), Ta = new WeakMap(), gi = new WeakMap(), bi = new WeakMap(), yi = new WeakMap(), Hr = new WeakMap();
let $p = gd;
Ga.Pattern = $p;
var Si = {}, Ha = {};
Object.defineProperty(Ha, "__esModule", { value: !0 });
Ha.Ignore = void 0;
const gg = Pi, V2 = Ga, K2 = typeof process == "object" && process && typeof process.platform == "string" ? process.platform : "linux";
class Y2 {
  constructor(e, { nobrace: n, nocase: i, noext: r, noglobstar: s, platform: a = K2 }) {
    ne(this, "relative");
    ne(this, "relativeChildren");
    ne(this, "absolute");
    ne(this, "absoluteChildren");
    ne(this, "platform");
    ne(this, "mmopts");
    this.relative = [], this.absolute = [], this.relativeChildren = [], this.absoluteChildren = [], this.platform = a, this.mmopts = {
      dot: !0,
      nobrace: n,
      nocase: i,
      noext: r,
      noglobstar: s,
      optimizationLevel: 2,
      platform: a,
      nocomment: !0,
      nonegate: !0
    };
    for (const o of e)
      this.add(o);
  }
  add(e) {
    const n = new gg.Minimatch(e, this.mmopts);
    for (let i = 0; i < n.set.length; i++) {
      const r = n.set[i], s = n.globParts[i];
      if (!r || !s)
        throw new Error("invalid pattern object");
      for (; r[0] === "." && s[0] === "."; )
        r.shift(), s.shift();
      const a = new V2.Pattern(r, s, 0, this.platform), o = new gg.Minimatch(a.globString(), this.mmopts), c = s[s.length - 1] === "**", l = a.isAbsolute();
      l ? this.absolute.push(o) : this.relative.push(o), c && (l ? this.absoluteChildren.push(o) : this.relativeChildren.push(o));
    }
  }
  ignored(e) {
    const n = e.fullpath(), i = `${n}/`, r = e.relative() || ".", s = `${r}/`;
    for (const a of this.relative)
      if (a.match(r) || a.match(s))
        return !0;
    for (const a of this.absolute)
      if (a.match(n) || a.match(i))
        return !0;
    return !1;
  }
  childrenIgnored(e) {
    const n = e.fullpath() + "/", i = (e.relative() || ".") + "/";
    for (const r of this.relativeChildren)
      if (r.match(i))
        return !0;
    for (const r of this.absoluteChildren)
      if (r.match(n))
        return !0;
    return !1;
  }
}
Ha.Ignore = Y2;
var Ln = {};
Object.defineProperty(Ln, "__esModule", { value: !0 });
Ln.Processor = Ln.SubWalks = Ln.MatchRecord = Ln.HasWalkedCache = void 0;
const bg = Pi;
class ll {
  constructor(e = /* @__PURE__ */ new Map()) {
    ne(this, "store");
    this.store = e;
  }
  copy() {
    return new ll(new Map(this.store));
  }
  hasWalked(e, n) {
    var i;
    return (i = this.store.get(e.fullpath())) == null ? void 0 : i.has(n.globString());
  }
  storeWalked(e, n) {
    const i = e.fullpath(), r = this.store.get(i);
    r ? r.add(n.globString()) : this.store.set(i, /* @__PURE__ */ new Set([n.globString()]));
  }
}
Ln.HasWalkedCache = ll;
class Ax {
  constructor() {
    ne(this, "store", /* @__PURE__ */ new Map());
  }
  add(e, n, i) {
    const r = (n ? 2 : 0) | (i ? 1 : 0), s = this.store.get(e);
    this.store.set(e, s === void 0 ? r : r & s);
  }
  // match, absolute, ifdir
  entries() {
    return [...this.store.entries()].map(([e, n]) => [
      e,
      !!(n & 2),
      !!(n & 1)
    ]);
  }
}
Ln.MatchRecord = Ax;
class Tx {
  constructor() {
    ne(this, "store", /* @__PURE__ */ new Map());
  }
  add(e, n) {
    if (!e.canReaddir())
      return;
    const i = this.store.get(e);
    i ? i.find((r) => r.globString() === n.globString()) || i.push(n) : this.store.set(e, [n]);
  }
  get(e) {
    const n = this.store.get(e);
    if (!n)
      throw new Error("attempting to walk unknown path");
    return n;
  }
  entries() {
    return this.keys().map((e) => [e, this.store.get(e)]);
  }
  keys() {
    return [...this.store.keys()].filter((e) => e.canReaddir());
  }
}
Ln.SubWalks = Tx;
class Jf {
  constructor(e, n) {
    ne(this, "hasWalkedCache");
    ne(this, "matches", new Ax());
    ne(this, "subwalks", new Tx());
    ne(this, "patterns");
    ne(this, "follow");
    ne(this, "dot");
    ne(this, "opts");
    this.opts = e, this.follow = !!e.follow, this.dot = !!e.dot, this.hasWalkedCache = n ? n.copy() : new ll();
  }
  processPatterns(e, n) {
    this.patterns = n;
    const i = n.map((r) => [e, r]);
    for (let [r, s] of i) {
      this.hasWalkedCache.storeWalked(r, s);
      const a = s.root(), o = s.isAbsolute() && this.opts.absolute !== !1;
      if (a) {
        r = r.resolve(a === "/" && this.opts.root !== void 0 ? this.opts.root : a);
        const p = s.rest();
        if (p)
          s = p;
        else {
          this.matches.add(r, !0, !1);
          continue;
        }
      }
      if (r.isENOENT())
        continue;
      let c, l, u = !1;
      for (; typeof (c = s.pattern()) == "string" && (l = s.rest()); )
        r = r.resolve(c), s = l, u = !0;
      if (c = s.pattern(), l = s.rest(), u) {
        if (this.hasWalkedCache.hasWalked(r, s))
          continue;
        this.hasWalkedCache.storeWalked(r, s);
      }
      if (typeof c == "string") {
        const p = c === ".." || c === "" || c === ".";
        this.matches.add(r.resolve(c), o, p);
        continue;
      } else if (c === bg.GLOBSTAR) {
        (!r.isSymbolicLink() || this.follow || s.checkFollowGlobstar()) && this.subwalks.add(r, s);
        const p = l == null ? void 0 : l.pattern(), d = l == null ? void 0 : l.rest();
        if (!l || (p === "" || p === ".") && !d)
          this.matches.add(r, o, p === "" || p === ".");
        else if (p === "..") {
          const b = r.parent || r;
          d ? this.hasWalkedCache.hasWalked(b, d) || this.subwalks.add(b, d) : this.matches.add(b, o, !0);
        }
      } else c instanceof RegExp && this.subwalks.add(r, s);
    }
    return this;
  }
  subwalkTargets() {
    return this.subwalks.keys();
  }
  child() {
    return new Jf(this.opts, this.hasWalkedCache);
  }
  // return a new Processor containing the subwalks for each
  // child entry, and a set of matches, and
  // a hasWalkedCache that's a copy of this one
  // then we're going to call
  filterEntries(e, n) {
    const i = this.subwalks.get(e), r = this.child();
    for (const s of n)
      for (const a of i) {
        const o = a.isAbsolute(), c = a.pattern(), l = a.rest();
        c === bg.GLOBSTAR ? r.testGlobstar(s, a, l, o) : c instanceof RegExp ? r.testRegExp(s, c, l, o) : r.testString(s, c, l, o);
      }
    return r;
  }
  testGlobstar(e, n, i, r) {
    if ((this.dot || !e.name.startsWith(".")) && (n.hasMore() || this.matches.add(e, r, !1), e.canReaddir() && (this.follow || !e.isSymbolicLink() ? this.subwalks.add(e, n) : e.isSymbolicLink() && (i && n.checkFollowGlobstar() ? this.subwalks.add(e, i) : n.markFollowGlobstar() && this.subwalks.add(e, n)))), i) {
      const s = i.pattern();
      if (typeof s == "string" && // dots and empty were handled already
      s !== ".." && s !== "" && s !== ".")
        this.testString(e, s, i.rest(), r);
      else if (s === "..") {
        const a = e.parent || e;
        this.subwalks.add(a, i);
      } else s instanceof RegExp && this.testRegExp(e, s, i.rest(), r);
    }
  }
  testRegExp(e, n, i, r) {
    n.test(e.name) && (i ? this.subwalks.add(e, i) : this.matches.add(e, r, !1));
  }
  testString(e, n, i, r) {
    e.isNamed(n) && (i ? this.subwalks.add(e, i) : this.matches.add(e, r, !1));
  }
}
Ln.Processor = Jf;
Object.defineProperty(Si, "__esModule", { value: !0 });
Si.GlobStream = Si.GlobWalker = Si.GlobUtil = void 0;
const Z2 = Kf, yg = Ha, vg = Ln, X2 = (t, e) => typeof t == "string" ? new yg.Ignore([t], e) : Array.isArray(t) ? new yg.Ignore(t, e) : t;
var Vr, Yn, ir, un, Gi, Bp;
class Qf {
  constructor(e, n, i) {
    fe(this, un);
    ne(this, "path");
    ne(this, "patterns");
    ne(this, "opts");
    ne(this, "seen", /* @__PURE__ */ new Set());
    ne(this, "paused", !1);
    ne(this, "aborted", !1);
    fe(this, Vr, []);
    fe(this, Yn);
    fe(this, ir);
    ne(this, "signal");
    ne(this, "maxDepth");
    ne(this, "includeChildMatches");
    if (this.patterns = e, this.path = n, this.opts = i, Q(this, ir, !i.posix && i.platform === "win32" ? "\\" : "/"), this.includeChildMatches = i.includeChildMatches !== !1, (i.ignore || !this.includeChildMatches) && (Q(this, Yn, X2(i.ignore ?? [], i)), !this.includeChildMatches && typeof m(this, Yn).add != "function")) {
      const r = "cannot ignore child matches, ignore lacks add() method.";
      throw new Error(r);
    }
    this.maxDepth = i.maxDepth || 1 / 0, i.signal && (this.signal = i.signal, this.signal.addEventListener("abort", () => {
      m(this, Vr).length = 0;
    }));
  }
  // backpressure mechanism
  pause() {
    this.paused = !0;
  }
  resume() {
    var n;
    if ((n = this.signal) != null && n.aborted)
      return;
    this.paused = !1;
    let e;
    for (; !this.paused && (e = m(this, Vr).shift()); )
      e();
  }
  onResume(e) {
    var n;
    (n = this.signal) != null && n.aborted || (this.paused ? m(this, Vr).push(e) : e());
  }
  // do the requisite realpath/stat checking, and return the path
  // to add or undefined to filter it out.
  async matchCheck(e, n) {
    if (n && this.opts.nodir)
      return;
    let i;
    if (this.opts.realpath) {
      if (i = e.realpathCached() || await e.realpath(), !i)
        return;
      e = i;
    }
    const s = e.isUnknown() || this.opts.stat ? await e.lstat() : e;
    if (this.opts.follow && this.opts.nodir && (s != null && s.isSymbolicLink())) {
      const a = await s.realpath();
      a && (a.isUnknown() || this.opts.stat) && await a.lstat();
    }
    return this.matchCheckTest(s, n);
  }
  matchCheckTest(e, n) {
    var i;
    return e && (this.maxDepth === 1 / 0 || e.depth() <= this.maxDepth) && (!n || e.canReaddir()) && (!this.opts.nodir || !e.isDirectory()) && (!this.opts.nodir || !this.opts.follow || !e.isSymbolicLink() || !((i = e.realpathCached()) != null && i.isDirectory())) && !re(this, un, Gi).call(this, e) ? e : void 0;
  }
  matchCheckSync(e, n) {
    if (n && this.opts.nodir)
      return;
    let i;
    if (this.opts.realpath) {
      if (i = e.realpathCached() || e.realpathSync(), !i)
        return;
      e = i;
    }
    const s = e.isUnknown() || this.opts.stat ? e.lstatSync() : e;
    if (this.opts.follow && this.opts.nodir && (s != null && s.isSymbolicLink())) {
      const a = s.realpathSync();
      a && (a != null && a.isUnknown() || this.opts.stat) && a.lstatSync();
    }
    return this.matchCheckTest(s, n);
  }
  matchFinish(e, n) {
    var s;
    if (re(this, un, Gi).call(this, e))
      return;
    if (!this.includeChildMatches && ((s = m(this, Yn)) != null && s.add)) {
      const a = `${e.relativePosix()}/**`;
      m(this, Yn).add(a);
    }
    const i = this.opts.absolute === void 0 ? n : this.opts.absolute;
    this.seen.add(e);
    const r = this.opts.mark && e.isDirectory() ? m(this, ir) : "";
    if (this.opts.withFileTypes)
      this.matchEmit(e);
    else if (i) {
      const a = this.opts.posix ? e.fullpathPosix() : e.fullpath();
      this.matchEmit(a + r);
    } else {
      const a = this.opts.posix ? e.relativePosix() : e.relative(), o = this.opts.dotRelative && !a.startsWith(".." + m(this, ir)) ? "." + m(this, ir) : "";
      this.matchEmit(a ? o + a + r : "." + r);
    }
  }
  async match(e, n, i) {
    const r = await this.matchCheck(e, i);
    r && this.matchFinish(r, n);
  }
  matchSync(e, n, i) {
    const r = this.matchCheckSync(e, i);
    r && this.matchFinish(r, n);
  }
  walkCB(e, n, i) {
    var r;
    (r = this.signal) != null && r.aborted && i(), this.walkCB2(e, n, new vg.Processor(this.opts), i);
  }
  walkCB2(e, n, i, r) {
    var o;
    if (re(this, un, Bp).call(this, e))
      return r();
    if ((o = this.signal) != null && o.aborted && r(), this.paused) {
      this.onResume(() => this.walkCB2(e, n, i, r));
      return;
    }
    i.processPatterns(e, n);
    let s = 1;
    const a = () => {
      --s === 0 && r();
    };
    for (const [c, l, u] of i.matches.entries())
      re(this, un, Gi).call(this, c) || (s++, this.match(c, l, u).then(() => a()));
    for (const c of i.subwalkTargets()) {
      if (this.maxDepth !== 1 / 0 && c.depth() >= this.maxDepth)
        continue;
      s++;
      const l = c.readdirCached();
      c.calledReaddir() ? this.walkCB3(c, l, i, a) : c.readdirCB((u, p) => this.walkCB3(c, p, i, a), !0);
    }
    a();
  }
  walkCB3(e, n, i, r) {
    i = i.filterEntries(e, n);
    let s = 1;
    const a = () => {
      --s === 0 && r();
    };
    for (const [o, c, l] of i.matches.entries())
      re(this, un, Gi).call(this, o) || (s++, this.match(o, c, l).then(() => a()));
    for (const [o, c] of i.subwalks.entries())
      s++, this.walkCB2(o, c, i.child(), a);
    a();
  }
  walkCBSync(e, n, i) {
    var r;
    (r = this.signal) != null && r.aborted && i(), this.walkCB2Sync(e, n, new vg.Processor(this.opts), i);
  }
  walkCB2Sync(e, n, i, r) {
    var o;
    if (re(this, un, Bp).call(this, e))
      return r();
    if ((o = this.signal) != null && o.aborted && r(), this.paused) {
      this.onResume(() => this.walkCB2Sync(e, n, i, r));
      return;
    }
    i.processPatterns(e, n);
    let s = 1;
    const a = () => {
      --s === 0 && r();
    };
    for (const [c, l, u] of i.matches.entries())
      re(this, un, Gi).call(this, c) || this.matchSync(c, l, u);
    for (const c of i.subwalkTargets()) {
      if (this.maxDepth !== 1 / 0 && c.depth() >= this.maxDepth)
        continue;
      s++;
      const l = c.readdirSync();
      this.walkCB3Sync(c, l, i, a);
    }
    a();
  }
  walkCB3Sync(e, n, i, r) {
    i = i.filterEntries(e, n);
    let s = 1;
    const a = () => {
      --s === 0 && r();
    };
    for (const [o, c, l] of i.matches.entries())
      re(this, un, Gi).call(this, o) || this.matchSync(o, c, l);
    for (const [o, c] of i.subwalks.entries())
      s++, this.walkCB2Sync(o, c, i.child(), a);
    a();
  }
}
Vr = new WeakMap(), Yn = new WeakMap(), ir = new WeakMap(), un = new WeakSet(), Gi = function(e) {
  var n, i;
  return this.seen.has(e) || !!((i = (n = m(this, Yn)) == null ? void 0 : n.ignored) != null && i.call(n, e));
}, Bp = function(e) {
  var n, i;
  return !!((i = (n = m(this, Yn)) == null ? void 0 : n.childrenIgnored) != null && i.call(n, e));
};
Si.GlobUtil = Qf;
class J2 extends Qf {
  constructor(n, i, r) {
    super(n, i, r);
    ne(this, "matches", /* @__PURE__ */ new Set());
  }
  matchEmit(n) {
    this.matches.add(n);
  }
  async walk() {
    var n;
    if ((n = this.signal) != null && n.aborted)
      throw this.signal.reason;
    return this.path.isUnknown() && await this.path.lstat(), await new Promise((i, r) => {
      this.walkCB(this.path, this.patterns, () => {
        var s;
        (s = this.signal) != null && s.aborted ? r(this.signal.reason) : i(this.matches);
      });
    }), this.matches;
  }
  walkSync() {
    var n;
    if ((n = this.signal) != null && n.aborted)
      throw this.signal.reason;
    return this.path.isUnknown() && this.path.lstatSync(), this.walkCBSync(this.path, this.patterns, () => {
      var i;
      if ((i = this.signal) != null && i.aborted)
        throw this.signal.reason;
    }), this.matches;
  }
}
Si.GlobWalker = J2;
class Q2 extends Qf {
  constructor(n, i, r) {
    super(n, i, r);
    ne(this, "results");
    this.results = new Z2.Minipass({
      signal: this.signal,
      objectMode: !0
    }), this.results.on("drain", () => this.resume()), this.results.on("resume", () => this.resume());
  }
  matchEmit(n) {
    this.results.write(n), this.results.flowing || this.pause();
  }
  stream() {
    const n = this.path;
    return n.isUnknown() ? n.lstat().then(() => {
      this.walkCB(n, this.patterns, () => this.results.end());
    }) : this.walkCB(n, this.patterns, () => this.results.end()), this.results;
  }
  streamSync() {
    return this.path.isUnknown() && this.path.lstatSync(), this.walkCBSync(this.path, this.patterns, () => this.results.end()), this.results;
  }
}
Si.GlobStream = Q2;
Object.defineProperty(Js, "__esModule", { value: !0 });
Js.Glob = void 0;
const eL = Pi, tL = Ug, So = et, nL = Ga, Eo = Si, iL = typeof process == "object" && process && typeof process.platform == "string" ? process.platform : "linux";
class rL {
  /**
   * All options are stored as properties on the `Glob` object.
   *
   * See {@link GlobOptions} for full options descriptions.
   *
   * Note that a previous `Glob` object can be passed as the
   * `GlobOptions` to another `Glob` instantiation to re-use settings
   * and caches with a new pattern.
   *
   * Traversal functions can be called multiple times to run the walk
   * again.
   */
  constructor(e, n) {
    ne(this, "absolute");
    ne(this, "cwd");
    ne(this, "root");
    ne(this, "dot");
    ne(this, "dotRelative");
    ne(this, "follow");
    ne(this, "ignore");
    ne(this, "magicalBraces");
    ne(this, "mark");
    ne(this, "matchBase");
    ne(this, "maxDepth");
    ne(this, "nobrace");
    ne(this, "nocase");
    ne(this, "nodir");
    ne(this, "noext");
    ne(this, "noglobstar");
    ne(this, "pattern");
    ne(this, "platform");
    ne(this, "realpath");
    ne(this, "scurry");
    ne(this, "stat");
    ne(this, "signal");
    ne(this, "windowsPathsNoEscape");
    ne(this, "withFileTypes");
    ne(this, "includeChildMatches");
    /**
     * The options provided to the constructor.
     */
    ne(this, "opts");
    /**
     * An array of parsed immutable {@link Pattern} objects.
     */
    ne(this, "patterns");
    if (!n)
      throw new TypeError("glob options required");
    if (this.withFileTypes = !!n.withFileTypes, this.signal = n.signal, this.follow = !!n.follow, this.dot = !!n.dot, this.dotRelative = !!n.dotRelative, this.nodir = !!n.nodir, this.mark = !!n.mark, n.cwd ? (n.cwd instanceof URL || n.cwd.startsWith("file://")) && (n.cwd = (0, tL.fileURLToPath)(n.cwd)) : this.cwd = "", this.cwd = n.cwd || "", this.root = n.root, this.magicalBraces = !!n.magicalBraces, this.nobrace = !!n.nobrace, this.noext = !!n.noext, this.realpath = !!n.realpath, this.absolute = n.absolute, this.includeChildMatches = n.includeChildMatches !== !1, this.noglobstar = !!n.noglobstar, this.matchBase = !!n.matchBase, this.maxDepth = typeof n.maxDepth == "number" ? n.maxDepth : 1 / 0, this.stat = !!n.stat, this.ignore = n.ignore, this.withFileTypes && this.absolute !== void 0)
      throw new Error("cannot set absolute and withFileTypes:true");
    if (typeof e == "string" && (e = [e]), this.windowsPathsNoEscape = !!n.windowsPathsNoEscape || n.allowWindowsEscape === !1, this.windowsPathsNoEscape && (e = e.map((c) => c.replace(/\\/g, "/"))), this.matchBase) {
      if (n.noglobstar)
        throw new TypeError("base matching requires globstar");
      e = e.map((c) => c.includes("/") ? c : `./**/${c}`);
    }
    if (this.pattern = e, this.platform = n.platform || iL, this.opts = { ...n, platform: this.platform }, n.scurry) {
      if (this.scurry = n.scurry, n.nocase !== void 0 && n.nocase !== n.scurry.nocase)
        throw new Error("nocase option contradicts provided scurry option");
    } else {
      const c = n.platform === "win32" ? So.PathScurryWin32 : n.platform === "darwin" ? So.PathScurryDarwin : n.platform ? So.PathScurryPosix : So.PathScurry;
      this.scurry = new c(this.cwd, {
        nocase: n.nocase,
        fs: n.fs
      });
    }
    this.nocase = this.scurry.nocase;
    const i = this.platform === "darwin" || this.platform === "win32", r = {
      // default nocase based on platform
      ...n,
      dot: this.dot,
      matchBase: this.matchBase,
      nobrace: this.nobrace,
      nocase: this.nocase,
      nocaseMagicOnly: i,
      nocomment: !0,
      noext: this.noext,
      nonegate: !0,
      optimizationLevel: 2,
      platform: this.platform,
      windowsPathsNoEscape: this.windowsPathsNoEscape,
      debug: !!this.opts.debug
    }, s = this.pattern.map((c) => new eL.Minimatch(c, r)), [a, o] = s.reduce((c, l) => (c[0].push(...l.set), c[1].push(...l.globParts), c), [[], []]);
    this.patterns = a.map((c, l) => {
      const u = o[l];
      if (!u)
        throw new Error("invalid pattern object");
      return new nL.Pattern(c, u, 0, this.platform);
    });
  }
  async walk() {
    return [
      ...await new Eo.GlobWalker(this.patterns, this.scurry.cwd, {
        ...this.opts,
        maxDepth: this.maxDepth !== 1 / 0 ? this.maxDepth + this.scurry.cwd.depth() : 1 / 0,
        platform: this.platform,
        nocase: this.nocase,
        includeChildMatches: this.includeChildMatches
      }).walk()
    ];
  }
  walkSync() {
    return [
      ...new Eo.GlobWalker(this.patterns, this.scurry.cwd, {
        ...this.opts,
        maxDepth: this.maxDepth !== 1 / 0 ? this.maxDepth + this.scurry.cwd.depth() : 1 / 0,
        platform: this.platform,
        nocase: this.nocase,
        includeChildMatches: this.includeChildMatches
      }).walkSync()
    ];
  }
  stream() {
    return new Eo.GlobStream(this.patterns, this.scurry.cwd, {
      ...this.opts,
      maxDepth: this.maxDepth !== 1 / 0 ? this.maxDepth + this.scurry.cwd.depth() : 1 / 0,
      platform: this.platform,
      nocase: this.nocase,
      includeChildMatches: this.includeChildMatches
    }).stream();
  }
  streamSync() {
    return new Eo.GlobStream(this.patterns, this.scurry.cwd, {
      ...this.opts,
      maxDepth: this.maxDepth !== 1 / 0 ? this.maxDepth + this.scurry.cwd.depth() : 1 / 0,
      platform: this.platform,
      nocase: this.nocase,
      includeChildMatches: this.includeChildMatches
    }).streamSync();
  }
  /**
   * Default sync iteration function. Returns a Generator that
   * iterates over the results.
   */
  iterateSync() {
    return this.streamSync()[Symbol.iterator]();
  }
  [Symbol.iterator]() {
    return this.iterateSync();
  }
  /**
   * Default async iteration function. Returns an AsyncGenerator that
   * iterates over the results.
   */
  iterate() {
    return this.stream()[Symbol.asyncIterator]();
  }
  [Symbol.asyncIterator]() {
    return this.iterate();
  }
}
Js.Glob = rL;
var Qs = {};
Object.defineProperty(Qs, "__esModule", { value: !0 });
Qs.hasMagic = void 0;
const sL = Pi, aL = (t, e = {}) => {
  Array.isArray(t) || (t = [t]);
  for (const n of t)
    if (new sL.Minimatch(n, e).hasMagic())
      return !0;
  return !1;
};
Qs.hasMagic = aL;
(function(t) {
  Object.defineProperty(t, "__esModule", { value: !0 }), t.glob = t.sync = t.iterate = t.iterateSync = t.stream = t.streamSync = t.Ignore = t.hasMagic = t.Glob = t.unescape = t.escape = void 0, t.globStreamSync = c, t.globStream = l, t.globSync = u, t.globIterateSync = d, t.globIterate = b;
  const e = Pi, n = Js, i = Qs;
  var r = Pi;
  Object.defineProperty(t, "escape", { enumerable: !0, get: function() {
    return r.escape;
  } }), Object.defineProperty(t, "unescape", { enumerable: !0, get: function() {
    return r.unescape;
  } });
  var s = Js;
  Object.defineProperty(t, "Glob", { enumerable: !0, get: function() {
    return s.Glob;
  } });
  var a = Qs;
  Object.defineProperty(t, "hasMagic", { enumerable: !0, get: function() {
    return a.hasMagic;
  } });
  var o = Ha;
  Object.defineProperty(t, "Ignore", { enumerable: !0, get: function() {
    return o.Ignore;
  } });
  function c(x, v = {}) {
    return new n.Glob(x, v).streamSync();
  }
  function l(x, v = {}) {
    return new n.Glob(x, v).stream();
  }
  function u(x, v = {}) {
    return new n.Glob(x, v).walkSync();
  }
  async function p(x, v = {}) {
    return new n.Glob(x, v).walk();
  }
  function d(x, v = {}) {
    return new n.Glob(x, v).iterateSync();
  }
  function b(x, v = {}) {
    return new n.Glob(x, v).iterate();
  }
  t.streamSync = c, t.stream = Object.assign(l, { sync: c }), t.iterateSync = d, t.iterate = Object.assign(b, {
    sync: d
  }), t.sync = Object.assign(u, {
    stream: c,
    iterate: d
  }), t.glob = Object.assign(p, {
    glob: p,
    globSync: u,
    sync: t.sync,
    globStream: l,
    stream: t.stream,
    globStreamSync: c,
    streamSync: t.streamSync,
    globIterate: b,
    iterate: t.iterate,
    globIterateSync: d,
    iterateSync: t.iterateSync,
    Glob: n.Glob,
    hasMagic: i.hasMagic,
    escape: e.escape,
    unescape: e.unescape
  }), t.glob.glob = t.glob;
})(Xv);
var Rx = Df, jr = Ce, Up = dI, oL = Oj, cL = t2, lL = g2, uL = Xv, cr = zv.exports = {}, xg = /[\/\\]/g, pL = function(t, e) {
  var n = [];
  return Up(t).forEach(function(i) {
    var r = i.indexOf("!") === 0;
    r && (i = i.slice(1));
    var s = e(i);
    r ? n = oL(n, s) : n = cL(n, s);
  }), n;
};
cr.exists = function() {
  var t = jr.join.apply(jr, arguments);
  return Rx.existsSync(t);
};
cr.expand = function(...t) {
  var e = lL(t[0]) ? t.shift() : {}, n = Array.isArray(t[0]) ? t[0] : t;
  if (n.length === 0)
    return [];
  var i = pL(n, function(r) {
    return uL.sync(r, e);
  });
  return e.filter && (i = i.filter(function(r) {
    r = jr.join(e.cwd || "", r);
    try {
      return typeof e.filter == "function" ? e.filter(r) : Rx.statSync(r)[e.filter]();
    } catch {
      return !1;
    }
  })), i;
};
cr.expandMapping = function(t, e, n) {
  n = Object.assign({
    rename: function(s, a) {
      return jr.join(s || "", a);
    }
  }, n);
  var i = [], r = {};
  return cr.expand(n, t).forEach(function(s) {
    var a = s;
    n.flatten && (a = jr.basename(a)), n.ext && (a = a.replace(/(\.[^\/]*)?$/, n.ext));
    var o = n.rename(e, a, n);
    n.cwd && (s = jr.join(n.cwd, s)), o = o.replace(xg, "/"), s = s.replace(xg, "/"), r[o] ? r[o].src.push(s) : (i.push({
      src: [s],
      dest: o
    }), r[o] = i[i.length - 1]);
  }), i;
};
cr.normalizeFilesArray = function(t) {
  var e = [];
  return t.forEach(function(n) {
    ("src" in n || "dest" in n) && e.push(n);
  }), e.length === 0 ? [] : (e = _(e).chain().forEach(function(n) {
    !("src" in n) || !n.src || (Array.isArray(n.src) ? n.src = Up(n.src) : n.src = [n.src]);
  }).map(function(n) {
    var i = Object.assign({}, n);
    if (delete i.src, delete i.dest, n.expand)
      return cr.expandMapping(n.src, n.dest, i).map(function(s) {
        var a = Object.assign({}, n);
        return a.orig = Object.assign({}, n), a.src = s.src, a.dest = s.dest, ["expand", "cwd", "flatten", "rename", "ext"].forEach(function(o) {
          delete a[o];
        }), a;
      });
    var r = Object.assign({}, n);
    return r.orig = Object.assign({}, n), "src" in r && Object.defineProperty(r, "src", {
      enumerable: !0,
      get: function s() {
        var a;
        return "result" in s || (a = n.src, a = Array.isArray(a) ? Up(a) : [a], s.result = cr.expand(i, a)), s.result;
      }
    }), "dest" in r && (r.dest = n.dest), r;
  }).flatten().value(), e);
};
var fL = zv.exports, zp = Df, wg = Ce, dL = Nf, hL = wO, Ox = bv, mL = Uk;
nt.Stream;
var gL = fs.PassThrough, rn = cv.exports = {};
rn.file = fL;
rn.collectStream = function(t, e) {
  var n = [], i = 0;
  t.on("error", e), t.on("data", function(r) {
    n.push(r), i += r.length;
  }), t.on("end", function() {
    var r = Buffer.alloc(i), s = 0;
    n.forEach(function(a) {
      a.copy(r, s), s += a.length;
    }), e(null, r);
  });
};
rn.dateify = function(t) {
  return t = t || /* @__PURE__ */ new Date(), t instanceof Date ? t = t : typeof t == "string" ? t = new Date(t) : t = /* @__PURE__ */ new Date(), t;
};
rn.defaults = function(t, e, n) {
  var i = arguments;
  return i[0] = i[0] || {}, mL(...i);
};
rn.isStream = function(t) {
  return dL(t);
};
rn.lazyReadStream = function(t) {
  return new hL.Readable(function() {
    return zp.createReadStream(t);
  });
};
rn.normalizeInputSource = function(t) {
  return t === null ? Buffer.alloc(0) : typeof t == "string" ? Buffer.from(t) : rn.isStream(t) ? t.pipe(new gL()) : t;
};
rn.sanitizePath = function(t) {
  return Ox(t, !1).replace(/^\w+:/, "").replace(/^(\.\.\/|\/)+/, "");
};
rn.trailingSlashIt = function(t) {
  return t.slice(-1) !== "/" ? t + "/" : t;
};
rn.unixifyPath = function(t) {
  return Ox(t, !1).replace(/^\w+:/, "");
};
rn.walkdir = function(t, e, n) {
  var i = [];
  typeof e == "function" && (n = e, e = t), zp.readdir(t, function(r, s) {
    var a = 0, o, c;
    if (r)
      return n(r);
    (function l() {
      if (o = s[a++], !o)
        return n(null, i);
      c = wg.join(t, o), zp.stat(c, function(u, p) {
        i.push({
          path: c,
          relative: wg.relative(e, c).replace(/\\/g, "/"),
          stats: p
        }), p && p.isDirectory() ? rn.walkdir(c, e, function(d, b) {
          if (d)
            return n(d);
          b.forEach(function(x) {
            i.push(x);
          }), l();
        }) : l();
      });
    })();
  });
};
var Va = cv.exports, Px = { exports: {} };
/**
 * Archiver Core
 *
 * @ignore
 * @license [MIT]{@link https://github.com/archiverjs/node-archiver/blob/master/LICENSE}
 * @copyright (c) 2012-2014 Chris Talkington, contributors.
 */
(function(t, e) {
  var n = xt;
  const i = {
    ABORTED: "archive was aborted",
    DIRECTORYDIRPATHREQUIRED: "diretory dirpath argument must be a non-empty string value",
    DIRECTORYFUNCTIONINVALIDDATA: "invalid data returned by directory custom data function",
    ENTRYNAMEREQUIRED: "entry name must be a non-empty string value",
    FILEFILEPATHREQUIRED: "file filepath argument must be a non-empty string value",
    FINALIZING: "archive already finalizing",
    QUEUECLOSED: "queue closed",
    NOENDMETHOD: "no suitable finalize/end method defined by module",
    DIRECTORYNOTSUPPORTED: "support for directory entries not defined by module",
    FORMATSET: "archive format already set",
    INPUTSTEAMBUFFERREQUIRED: "input source must be valid Stream or Buffer instance",
    MODULESET: "module already set",
    SYMLINKNOTSUPPORTED: "support for symlink entries not defined by module",
    SYMLINKFILEPATHREQUIRED: "symlink filepath argument must be a non-empty string value",
    SYMLINKTARGETREQUIRED: "symlink target argument must be a non-empty string value",
    ENTRYNOTSUPPORTED: "entry not supported"
  };
  function r(s, a) {
    Error.captureStackTrace(this, this.constructor), this.message = i[s] || s, this.code = s, this.data = a;
  }
  n.inherits(r, Error), t.exports = r;
})(Px);
var bL = Px.exports;
/**
 * Archiver Core
 *
 * @ignore
 * @license [MIT]{@link https://github.com/archiverjs/node-archiver/blob/master/LICENSE}
 * @copyright (c) 2012-2014 Chris Talkington, contributors.
 */
var ed = dt, Cx = $T, _g = QR, Hu = Ce, Fn = Va, yL = xt.inherits, ct = bL, kx = fs.Transform, Vu = process.platform === "win32", Ge = function(t, e) {
  if (!(this instanceof Ge))
    return new Ge(t, e);
  typeof t != "string" && (e = t, t = "zip"), e = this.options = Fn.defaults(e, {
    highWaterMark: 1024 * 1024,
    statConcurrency: 4
  }), kx.call(this, e), this._format = !1, this._module = !1, this._pending = 0, this._pointer = 0, this._entriesCount = 0, this._entriesProcessedCount = 0, this._fsEntriesTotalBytes = 0, this._fsEntriesProcessedBytes = 0, this._queue = _g.queue(this._onQueueTask.bind(this), 1), this._queue.drain(this._onQueueDrain.bind(this)), this._statQueue = _g.queue(this._onStatQueueTask.bind(this), e.statConcurrency), this._statQueue.drain(this._onQueueDrain.bind(this)), this._state = {
    aborted: !1,
    finalize: !1,
    finalizing: !1,
    finalized: !1,
    modulePiped: !1
  }, this._streams = [];
};
yL(Ge, kx);
Ge.prototype._abort = function() {
  this._state.aborted = !0, this._queue.kill(), this._statQueue.kill(), this._queue.idle() && this._shutdown();
};
Ge.prototype._append = function(t, e) {
  e = e || {};
  var n = {
    source: null,
    filepath: t
  };
  e.name || (e.name = t), e.sourcePath = t, n.data = e, this._entriesCount++, e.stats && e.stats instanceof ed.Stats ? (n = this._updateQueueTaskWithStats(n, e.stats), n && (e.stats.size && (this._fsEntriesTotalBytes += e.stats.size), this._queue.push(n))) : this._statQueue.push(n);
};
Ge.prototype._finalize = function() {
  this._state.finalizing || this._state.finalized || this._state.aborted || (this._state.finalizing = !0, this._moduleFinalize(), this._state.finalizing = !1, this._state.finalized = !0);
};
Ge.prototype._maybeFinalize = function() {
  return this._state.finalizing || this._state.finalized || this._state.aborted ? !1 : this._state.finalize && this._pending === 0 && this._queue.idle() && this._statQueue.idle() ? (this._finalize(), !0) : !1;
};
Ge.prototype._moduleAppend = function(t, e, n) {
  if (this._state.aborted) {
    n();
    return;
  }
  this._module.append(t, e, (function(i) {
    if (this._task = null, this._state.aborted) {
      this._shutdown();
      return;
    }
    if (i) {
      this.emit("error", i), setImmediate(n);
      return;
    }
    this.emit("entry", e), this._entriesProcessedCount++, e.stats && e.stats.size && (this._fsEntriesProcessedBytes += e.stats.size), this.emit("progress", {
      entries: {
        total: this._entriesCount,
        processed: this._entriesProcessedCount
      },
      fs: {
        totalBytes: this._fsEntriesTotalBytes,
        processedBytes: this._fsEntriesProcessedBytes
      }
    }), setImmediate(n);
  }).bind(this));
};
Ge.prototype._moduleFinalize = function() {
  typeof this._module.finalize == "function" ? this._module.finalize() : typeof this._module.end == "function" ? this._module.end() : this.emit("error", new ct("NOENDMETHOD"));
};
Ge.prototype._modulePipe = function() {
  this._module.on("error", this._onModuleError.bind(this)), this._module.pipe(this), this._state.modulePiped = !0;
};
Ge.prototype._moduleSupports = function(t) {
  return !this._module.supports || !this._module.supports[t] ? !1 : this._module.supports[t];
};
Ge.prototype._moduleUnpipe = function() {
  this._module.unpipe(this), this._state.modulePiped = !1;
};
Ge.prototype._normalizeEntryData = function(t, e) {
  t = Fn.defaults(t, {
    type: "file",
    name: null,
    date: null,
    mode: null,
    prefix: null,
    sourcePath: null,
    stats: !1
  }), e && t.stats === !1 && (t.stats = e);
  var n = t.type === "directory";
  return t.name && (typeof t.prefix == "string" && t.prefix !== "" && (t.name = t.prefix + "/" + t.name, t.prefix = null), t.name = Fn.sanitizePath(t.name), t.type !== "symlink" && t.name.slice(-1) === "/" ? (n = !0, t.type = "directory") : n && (t.name += "/")), typeof t.mode == "number" ? Vu ? t.mode &= 511 : t.mode &= 4095 : t.stats && t.mode === null ? (Vu ? t.mode = t.stats.mode & 511 : t.mode = t.stats.mode & 4095, Vu && n && (t.mode = 493)) : t.mode === null && (t.mode = n ? 493 : 420), t.stats && t.date === null ? t.date = t.stats.mtime : t.date = Fn.dateify(t.date), t;
};
Ge.prototype._onModuleError = function(t) {
  this.emit("error", t);
};
Ge.prototype._onQueueDrain = function() {
  this._state.finalizing || this._state.finalized || this._state.aborted || this._state.finalize && this._pending === 0 && this._queue.idle() && this._statQueue.idle() && this._finalize();
};
Ge.prototype._onQueueTask = function(t, e) {
  var n = () => {
    t.data.callback && t.data.callback(), e();
  };
  if (this._state.finalizing || this._state.finalized || this._state.aborted) {
    n();
    return;
  }
  this._task = t, this._moduleAppend(t.source, t.data, n);
};
Ge.prototype._onStatQueueTask = function(t, e) {
  if (this._state.finalizing || this._state.finalized || this._state.aborted) {
    e();
    return;
  }
  ed.lstat(t.filepath, (function(n, i) {
    if (this._state.aborted) {
      setImmediate(e);
      return;
    }
    if (n) {
      this._entriesCount--, this.emit("warning", n), setImmediate(e);
      return;
    }
    t = this._updateQueueTaskWithStats(t, i), t && (i.size && (this._fsEntriesTotalBytes += i.size), this._queue.push(t)), setImmediate(e);
  }).bind(this));
};
Ge.prototype._shutdown = function() {
  this._moduleUnpipe(), this.end();
};
Ge.prototype._transform = function(t, e, n) {
  t && (this._pointer += t.length), n(null, t);
};
Ge.prototype._updateQueueTaskWithStats = function(t, e) {
  if (e.isFile())
    t.data.type = "file", t.data.sourceType = "stream", t.source = Fn.lazyReadStream(t.filepath);
  else if (e.isDirectory() && this._moduleSupports("directory"))
    t.data.name = Fn.trailingSlashIt(t.data.name), t.data.type = "directory", t.data.sourcePath = Fn.trailingSlashIt(t.filepath), t.data.sourceType = "buffer", t.source = Buffer.concat([]);
  else if (e.isSymbolicLink() && this._moduleSupports("symlink")) {
    var n = ed.readlinkSync(t.filepath), i = Hu.dirname(t.filepath);
    t.data.type = "symlink", t.data.linkname = Hu.relative(i, Hu.resolve(i, n)), t.data.sourceType = "buffer", t.source = Buffer.concat([]);
  } else
    return e.isDirectory() ? this.emit("warning", new ct("DIRECTORYNOTSUPPORTED", t.data)) : e.isSymbolicLink() ? this.emit("warning", new ct("SYMLINKNOTSUPPORTED", t.data)) : this.emit("warning", new ct("ENTRYNOTSUPPORTED", t.data)), null;
  return t.data = this._normalizeEntryData(t.data, e), t;
};
Ge.prototype.abort = function() {
  return this._state.aborted || this._state.finalized ? this : (this._abort(), this);
};
Ge.prototype.append = function(t, e) {
  if (this._state.finalize || this._state.aborted)
    return this.emit("error", new ct("QUEUECLOSED")), this;
  if (e = this._normalizeEntryData(e), typeof e.name != "string" || e.name.length === 0)
    return this.emit("error", new ct("ENTRYNAMEREQUIRED")), this;
  if (e.type === "directory" && !this._moduleSupports("directory"))
    return this.emit("error", new ct("DIRECTORYNOTSUPPORTED", { name: e.name })), this;
  if (t = Fn.normalizeInputSource(t), Buffer.isBuffer(t))
    e.sourceType = "buffer";
  else if (Fn.isStream(t))
    e.sourceType = "stream";
  else
    return this.emit("error", new ct("INPUTSTEAMBUFFERREQUIRED", { name: e.name })), this;
  return this._entriesCount++, this._queue.push({
    data: e,
    source: t
  }), this;
};
Ge.prototype.directory = function(t, e, n) {
  if (this._state.finalize || this._state.aborted)
    return this.emit("error", new ct("QUEUECLOSED")), this;
  if (typeof t != "string" || t.length === 0)
    return this.emit("error", new ct("DIRECTORYDIRPATHREQUIRED")), this;
  this._pending++, e === !1 ? e = "" : typeof e != "string" && (e = t);
  var i = !1;
  typeof n == "function" ? (i = n, n = {}) : typeof n != "object" && (n = {});
  var r = {
    stat: !0,
    dot: !0
  };
  function s() {
    this._pending--, this._maybeFinalize();
  }
  function a(l) {
    this.emit("error", l);
  }
  function o(l) {
    c.pause();
    var u = !1, p = Object.assign({}, n);
    p.name = l.relative, p.prefix = e, p.stats = l.stat, p.callback = c.resume.bind(c);
    try {
      if (i) {
        if (p = i(p), p === !1)
          u = !0;
        else if (typeof p != "object")
          throw new ct("DIRECTORYFUNCTIONINVALIDDATA", { dirpath: t });
      }
    } catch (d) {
      this.emit("error", d);
      return;
    }
    if (u) {
      c.resume();
      return;
    }
    this._append(l.absolute, p);
  }
  var c = Cx(t, r);
  return c.on("error", a.bind(this)), c.on("match", o.bind(this)), c.on("end", s.bind(this)), this;
};
Ge.prototype.file = function(t, e) {
  return this._state.finalize || this._state.aborted ? (this.emit("error", new ct("QUEUECLOSED")), this) : typeof t != "string" || t.length === 0 ? (this.emit("error", new ct("FILEFILEPATHREQUIRED")), this) : (this._append(t, e), this);
};
Ge.prototype.glob = function(t, e, n) {
  this._pending++, e = Fn.defaults(e, {
    stat: !0,
    pattern: t
  });
  function i() {
    this._pending--, this._maybeFinalize();
  }
  function r(o) {
    this.emit("error", o);
  }
  function s(o) {
    a.pause();
    var c = Object.assign({}, n);
    c.callback = a.resume.bind(a), c.stats = o.stat, c.name = o.relative, this._append(o.absolute, c);
  }
  var a = Cx(e.cwd || ".", e);
  return a.on("error", r.bind(this)), a.on("match", s.bind(this)), a.on("end", i.bind(this)), this;
};
Ge.prototype.finalize = function() {
  if (this._state.aborted) {
    var t = new ct("ABORTED");
    return this.emit("error", t), Promise.reject(t);
  }
  if (this._state.finalize) {
    var e = new ct("FINALIZING");
    return this.emit("error", e), Promise.reject(e);
  }
  this._state.finalize = !0, this._pending === 0 && this._queue.idle() && this._statQueue.idle() && this._finalize();
  var n = this;
  return new Promise(function(i, r) {
    var s;
    n._module.on("end", function() {
      s || i();
    }), n._module.on("error", function(a) {
      s = !0, r(a);
    });
  });
};
Ge.prototype.setFormat = function(t) {
  return this._format ? (this.emit("error", new ct("FORMATSET")), this) : (this._format = t, this);
};
Ge.prototype.setModule = function(t) {
  return this._state.aborted ? (this.emit("error", new ct("ABORTED")), this) : this._state.module ? (this.emit("error", new ct("MODULESET")), this) : (this._module = t, this._modulePipe(), this);
};
Ge.prototype.symlink = function(t, e, n) {
  if (this._state.finalize || this._state.aborted)
    return this.emit("error", new ct("QUEUECLOSED")), this;
  if (typeof t != "string" || t.length === 0)
    return this.emit("error", new ct("SYMLINKFILEPATHREQUIRED")), this;
  if (typeof e != "string" || e.length === 0)
    return this.emit("error", new ct("SYMLINKTARGETREQUIRED", { filepath: t })), this;
  if (!this._moduleSupports("symlink"))
    return this.emit("error", new ct("SYMLINKNOTSUPPORTED", { filepath: t })), this;
  var i = {};
  return i.type = "symlink", i.name = t.replace(/\\/g, "/"), i.linkname = e.replace(/\\/g, "/"), i.sourceType = "buffer", typeof n == "number" && (i.mode = n), this._entriesCount++, this._queue.push({
    data: i,
    source: Buffer.concat([])
  }), this;
};
Ge.prototype.pointer = function() {
  return this._pointer;
};
Ge.prototype.use = function(t) {
  return this._streams.push(t), this;
};
var vL = Ge, Ix = { exports: {} }, Dx = { exports: {} }, ul = Dx.exports = function() {
};
ul.prototype.getName = function() {
};
ul.prototype.getSize = function() {
};
ul.prototype.getLastModifiedDate = function() {
};
ul.prototype.isDirectory = function() {
};
var jx = Dx.exports, Lx = { exports: {} }, Nx = { exports: {} }, Fx = { exports: {} }, fn = Fx.exports = {};
fn.dateToDos = function(t, e) {
  e = e || !1;
  var n = e ? t.getFullYear() : t.getUTCFullYear();
  if (n < 1980)
    return 2162688;
  if (n >= 2044)
    return 2141175677;
  var i = {
    year: n,
    month: e ? t.getMonth() : t.getUTCMonth(),
    date: e ? t.getDate() : t.getUTCDate(),
    hours: e ? t.getHours() : t.getUTCHours(),
    minutes: e ? t.getMinutes() : t.getUTCMinutes(),
    seconds: e ? t.getSeconds() : t.getUTCSeconds()
  };
  return i.year - 1980 << 25 | i.month + 1 << 21 | i.date << 16 | i.hours << 11 | i.minutes << 5 | i.seconds / 2;
};
fn.dosToDate = function(t) {
  return new Date((t >> 25 & 127) + 1980, (t >> 21 & 15) - 1, t >> 16 & 31, t >> 11 & 31, t >> 5 & 63, (t & 31) << 1);
};
fn.fromDosTime = function(t) {
  return fn.dosToDate(t.readUInt32LE(0));
};
fn.getEightBytes = function(t) {
  var e = Buffer.alloc(8);
  return e.writeUInt32LE(t % 4294967296, 0), e.writeUInt32LE(t / 4294967296 | 0, 4), e;
};
fn.getShortBytes = function(t) {
  var e = Buffer.alloc(2);
  return e.writeUInt16LE((t & 65535) >>> 0, 0), e;
};
fn.getShortBytesValue = function(t, e) {
  return t.readUInt16LE(e);
};
fn.getLongBytes = function(t) {
  var e = Buffer.alloc(4);
  return e.writeUInt32LE((t & 4294967295) >>> 0, 0), e;
};
fn.getLongBytesValue = function(t, e) {
  return t.readUInt32LE(e);
};
fn.toDosTime = function(t) {
  return fn.getLongBytes(fn.dateToDos(t));
};
var td = Fx.exports, Mx = td, $x = 8, Bx = 1, xL = 4, wL = 2, Ux = 64, zx = 2048, Dt = Nx.exports = function() {
  return this instanceof Dt ? (this.descriptor = !1, this.encryption = !1, this.utf8 = !1, this.numberOfShannonFanoTrees = 0, this.strongEncryption = !1, this.slidingDictionarySize = 0, this) : new Dt();
};
Dt.prototype.encode = function() {
  return Mx.getShortBytes(
    (this.descriptor ? $x : 0) | (this.utf8 ? zx : 0) | (this.encryption ? Bx : 0) | (this.strongEncryption ? Ux : 0)
  );
};
Dt.prototype.parse = function(t, e) {
  var n = Mx.getShortBytesValue(t, e), i = new Dt();
  return i.useDataDescriptor((n & $x) !== 0), i.useUTF8ForNames((n & zx) !== 0), i.useStrongEncryption((n & Ux) !== 0), i.useEncryption((n & Bx) !== 0), i.setSlidingDictionarySize(n & wL ? 8192 : 4096), i.setNumberOfShannonFanoTrees(n & xL ? 3 : 2), i;
};
Dt.prototype.setNumberOfShannonFanoTrees = function(t) {
  this.numberOfShannonFanoTrees = t;
};
Dt.prototype.getNumberOfShannonFanoTrees = function() {
  return this.numberOfShannonFanoTrees;
};
Dt.prototype.setSlidingDictionarySize = function(t) {
  this.slidingDictionarySize = t;
};
Dt.prototype.getSlidingDictionarySize = function() {
  return this.slidingDictionarySize;
};
Dt.prototype.useDataDescriptor = function(t) {
  this.descriptor = t;
};
Dt.prototype.usesDataDescriptor = function() {
  return this.descriptor;
};
Dt.prototype.useEncryption = function(t) {
  this.encryption = t;
};
Dt.prototype.usesEncryption = function() {
  return this.encryption;
};
Dt.prototype.useStrongEncryption = function(t) {
  this.strongEncryption = t;
};
Dt.prototype.usesStrongEncryption = function() {
  return this.strongEncryption;
};
Dt.prototype.useUTF8ForNames = function(t) {
  this.utf8 = t;
};
Dt.prototype.usesUTF8ForNames = function() {
  return this.utf8;
};
var _L = Nx.exports, SL = {
  /**
   * Bits used to indicate the filesystem object type.
   */
  FILE_TYPE_FLAG: 61440,
  // 0170000
  /**
   * Indicates symbolic links.
   */
  LINK_FLAG: 40960
}, Wx = {
  EMPTY: Buffer.alloc(0),
  SHORT_MASK: 65535,
  SHORT_SHIFT: 16,
  SHORT_ZERO: Buffer.from(Array(2)),
  LONG_ZERO: Buffer.from(Array(4)),
  MIN_VERSION_INITIAL: 10,
  MIN_VERSION_DATA_DESCRIPTOR: 20,
  MIN_VERSION_ZIP64: 45,
  VERSION_MADEBY: 45,
  METHOD_STORED: 0,
  METHOD_DEFLATED: 8,
  PLATFORM_UNIX: 3,
  PLATFORM_FAT: 0,
  SIG_LFH: 67324752,
  SIG_DD: 134695760,
  SIG_CFH: 33639248,
  SIG_EOCD: 101010256,
  SIG_ZIP64_EOCD: 101075792,
  SIG_ZIP64_EOCD_LOC: 117853008,
  ZIP64_MAGIC_SHORT: 65535,
  ZIP64_MAGIC: 4294967295,
  ZIP64_EXTRA_ID: 1,
  ZLIB_BEST_SPEED: 1,
  MODE_MASK: 4095,
  S_IFDIR: 16384,
  // 040000 directory
  S_IFREG: 32768,
  // 0100000 regular
  // DOS file type flags
  S_DOS_A: 32,
  // 040 Archive
  S_DOS_D: 16
}, EL = xt.inherits, AL = bv, qx = jx, Gx = _L, Sg = SL, zt = Wx, Hx = td, $e = Lx.exports = function(t) {
  if (!(this instanceof $e))
    return new $e(t);
  qx.call(this), this.platform = zt.PLATFORM_FAT, this.method = -1, this.name = null, this.size = 0, this.csize = 0, this.gpb = new Gx(), this.crc = 0, this.time = -1, this.minver = zt.MIN_VERSION_INITIAL, this.mode = -1, this.extra = null, this.exattr = 0, this.inattr = 0, this.comment = null, t && this.setName(t);
};
EL($e, qx);
$e.prototype.getCentralDirectoryExtra = function() {
  return this.getExtra();
};
$e.prototype.getComment = function() {
  return this.comment !== null ? this.comment : "";
};
$e.prototype.getCompressedSize = function() {
  return this.csize;
};
$e.prototype.getCrc = function() {
  return this.crc;
};
$e.prototype.getExternalAttributes = function() {
  return this.exattr;
};
$e.prototype.getExtra = function() {
  return this.extra !== null ? this.extra : zt.EMPTY;
};
$e.prototype.getGeneralPurposeBit = function() {
  return this.gpb;
};
$e.prototype.getInternalAttributes = function() {
  return this.inattr;
};
$e.prototype.getLastModifiedDate = function() {
  return this.getTime();
};
$e.prototype.getLocalFileDataExtra = function() {
  return this.getExtra();
};
$e.prototype.getMethod = function() {
  return this.method;
};
$e.prototype.getName = function() {
  return this.name;
};
$e.prototype.getPlatform = function() {
  return this.platform;
};
$e.prototype.getSize = function() {
  return this.size;
};
$e.prototype.getTime = function() {
  return this.time !== -1 ? Hx.dosToDate(this.time) : -1;
};
$e.prototype.getTimeDos = function() {
  return this.time !== -1 ? this.time : 0;
};
$e.prototype.getUnixMode = function() {
  return this.platform !== zt.PLATFORM_UNIX ? 0 : this.getExternalAttributes() >> zt.SHORT_SHIFT & zt.SHORT_MASK;
};
$e.prototype.getVersionNeededToExtract = function() {
  return this.minver;
};
$e.prototype.setComment = function(t) {
  Buffer.byteLength(t) !== t.length && this.getGeneralPurposeBit().useUTF8ForNames(!0), this.comment = t;
};
$e.prototype.setCompressedSize = function(t) {
  if (t < 0)
    throw new Error("invalid entry compressed size");
  this.csize = t;
};
$e.prototype.setCrc = function(t) {
  if (t < 0)
    throw new Error("invalid entry crc32");
  this.crc = t;
};
$e.prototype.setExternalAttributes = function(t) {
  this.exattr = t >>> 0;
};
$e.prototype.setExtra = function(t) {
  this.extra = t;
};
$e.prototype.setGeneralPurposeBit = function(t) {
  if (!(t instanceof Gx))
    throw new Error("invalid entry GeneralPurposeBit");
  this.gpb = t;
};
$e.prototype.setInternalAttributes = function(t) {
  this.inattr = t;
};
$e.prototype.setMethod = function(t) {
  if (t < 0)
    throw new Error("invalid entry compression method");
  this.method = t;
};
$e.prototype.setName = function(t, e = !1) {
  t = AL(t, !1).replace(/^\w+:/, "").replace(/^(\.\.\/|\/)+/, ""), e && (t = `/${t}`), Buffer.byteLength(t) !== t.length && this.getGeneralPurposeBit().useUTF8ForNames(!0), this.name = t;
};
$e.prototype.setPlatform = function(t) {
  this.platform = t;
};
$e.prototype.setSize = function(t) {
  if (t < 0)
    throw new Error("invalid entry size");
  this.size = t;
};
$e.prototype.setTime = function(t, e) {
  if (!(t instanceof Date))
    throw new Error("invalid entry time");
  this.time = Hx.dateToDos(t, e);
};
$e.prototype.setUnixMode = function(t) {
  t |= this.isDirectory() ? zt.S_IFDIR : zt.S_IFREG;
  var e = 0;
  e |= t << zt.SHORT_SHIFT | (this.isDirectory() ? zt.S_DOS_D : zt.S_DOS_A), this.setExternalAttributes(e), this.mode = t & zt.MODE_MASK, this.platform = zt.PLATFORM_UNIX;
};
$e.prototype.setVersionNeededToExtract = function(t) {
  this.minver = t;
};
$e.prototype.isDirectory = function() {
  return this.getName().slice(-1) === "/";
};
$e.prototype.isUnixSymlink = function() {
  return (this.getUnixMode() & Sg.FILE_TYPE_FLAG) === Sg.LINK_FLAG;
};
$e.prototype.isZip64 = function() {
  return this.csize > zt.ZIP64_MAGIC || this.size > zt.ZIP64_MAGIC;
};
var TL = Lx.exports, Vx = { exports: {} }, Kx = { exports: {} };
nt.Stream;
var RL = fs.PassThrough, OL = Nf, PL = Kx.exports = {};
PL.normalizeInputSource = function(t) {
  if (t === null)
    return Buffer.alloc(0);
  if (typeof t == "string")
    return Buffer.from(t);
  if (OL(t) && !t._readableState) {
    var e = new RL();
    return t.pipe(e), e;
  }
  return t;
};
var CL = Kx.exports, kL = xt.inherits, IL = Nf, nd = fs.Transform, DL = jx, jL = CL, sn = Vx.exports = function(t) {
  if (!(this instanceof sn))
    return new sn(t);
  nd.call(this, t), this.offset = 0, this._archive = {
    finish: !1,
    finished: !1,
    processing: !1
  };
};
kL(sn, nd);
sn.prototype._appendBuffer = function(t, e, n) {
};
sn.prototype._appendStream = function(t, e, n) {
};
sn.prototype._emitErrorCallback = function(t) {
  t && this.emit("error", t);
};
sn.prototype._finish = function(t) {
};
sn.prototype._normalizeEntry = function(t) {
};
sn.prototype._transform = function(t, e, n) {
  n(null, t);
};
sn.prototype.entry = function(t, e, n) {
  if (e = e || null, typeof n != "function" && (n = this._emitErrorCallback.bind(this)), !(t instanceof DL)) {
    n(new Error("not a valid instance of ArchiveEntry"));
    return;
  }
  if (this._archive.finish || this._archive.finished) {
    n(new Error("unacceptable entry after finish"));
    return;
  }
  if (this._archive.processing) {
    n(new Error("already processing an entry"));
    return;
  }
  if (this._archive.processing = !0, this._normalizeEntry(t), this._entry = t, e = jL.normalizeInputSource(e), Buffer.isBuffer(e))
    this._appendBuffer(t, e, n);
  else if (IL(e))
    this._appendStream(t, e, n);
  else {
    this._archive.processing = !1, n(new Error("input source must be valid Stream or Buffer instance"));
    return;
  }
  return this;
};
sn.prototype.finish = function() {
  if (this._archive.processing) {
    this._archive.finish = !0;
    return;
  }
  this._finish();
};
sn.prototype.getBytesWritten = function() {
  return this.offset;
};
sn.prototype.write = function(t, e) {
  return t && (this.offset += t.length), nd.prototype.write.call(this, t, e);
};
var LL = Vx.exports, Yx = { exports: {} }, pl = {};
/*! crc32.js (C) 2014-present SheetJS -- http://sheetjs.com */
(function(t) {
  (function(e) {
    e(typeof DO_NOT_EXPORT_CRC > "u" ? t : {});
  })(function(e) {
    e.version = "1.2.2";
    function n() {
      for (var L = 0, X = new Array(256), D = 0; D != 256; ++D)
        L = D, L = L & 1 ? -306674912 ^ L >>> 1 : L >>> 1, L = L & 1 ? -306674912 ^ L >>> 1 : L >>> 1, L = L & 1 ? -306674912 ^ L >>> 1 : L >>> 1, L = L & 1 ? -306674912 ^ L >>> 1 : L >>> 1, L = L & 1 ? -306674912 ^ L >>> 1 : L >>> 1, L = L & 1 ? -306674912 ^ L >>> 1 : L >>> 1, L = L & 1 ? -306674912 ^ L >>> 1 : L >>> 1, L = L & 1 ? -306674912 ^ L >>> 1 : L >>> 1, X[D] = L;
      return typeof Int32Array < "u" ? new Int32Array(X) : X;
    }
    var i = n();
    function r(L) {
      var X = 0, D = 0, B = 0, Y = typeof Int32Array < "u" ? new Int32Array(4096) : new Array(4096);
      for (B = 0; B != 256; ++B) Y[B] = L[B];
      for (B = 0; B != 256; ++B)
        for (D = L[B], X = 256 + B; X < 4096; X += 256) D = Y[X] = D >>> 8 ^ L[D & 255];
      var U = [];
      for (B = 1; B != 16; ++B) U[B - 1] = typeof Int32Array < "u" ? Y.subarray(B * 256, B * 256 + 256) : Y.slice(B * 256, B * 256 + 256);
      return U;
    }
    var s = r(i), a = s[0], o = s[1], c = s[2], l = s[3], u = s[4], p = s[5], d = s[6], b = s[7], x = s[8], v = s[9], y = s[10], f = s[11], h = s[12], g = s[13], A = s[14];
    function C(L, X) {
      for (var D = X ^ -1, B = 0, Y = L.length; B < Y; ) D = D >>> 8 ^ i[(D ^ L.charCodeAt(B++)) & 255];
      return ~D;
    }
    function V(L, X) {
      for (var D = X ^ -1, B = L.length - 15, Y = 0; Y < B; ) D = A[L[Y++] ^ D & 255] ^ g[L[Y++] ^ D >> 8 & 255] ^ h[L[Y++] ^ D >> 16 & 255] ^ f[L[Y++] ^ D >>> 24] ^ y[L[Y++]] ^ v[L[Y++]] ^ x[L[Y++]] ^ b[L[Y++]] ^ d[L[Y++]] ^ p[L[Y++]] ^ u[L[Y++]] ^ l[L[Y++]] ^ c[L[Y++]] ^ o[L[Y++]] ^ a[L[Y++]] ^ i[L[Y++]];
      for (B += 15; Y < B; ) D = D >>> 8 ^ i[(D ^ L[Y++]) & 255];
      return ~D;
    }
    function K(L, X) {
      for (var D = X ^ -1, B = 0, Y = L.length, U = 0, ae = 0; B < Y; )
        U = L.charCodeAt(B++), U < 128 ? D = D >>> 8 ^ i[(D ^ U) & 255] : U < 2048 ? (D = D >>> 8 ^ i[(D ^ (192 | U >> 6 & 31)) & 255], D = D >>> 8 ^ i[(D ^ (128 | U & 63)) & 255]) : U >= 55296 && U < 57344 ? (U = (U & 1023) + 64, ae = L.charCodeAt(B++) & 1023, D = D >>> 8 ^ i[(D ^ (240 | U >> 8 & 7)) & 255], D = D >>> 8 ^ i[(D ^ (128 | U >> 2 & 63)) & 255], D = D >>> 8 ^ i[(D ^ (128 | ae >> 6 & 15 | (U & 3) << 4)) & 255], D = D >>> 8 ^ i[(D ^ (128 | ae & 63)) & 255]) : (D = D >>> 8 ^ i[(D ^ (224 | U >> 12 & 15)) & 255], D = D >>> 8 ^ i[(D ^ (128 | U >> 6 & 63)) & 255], D = D >>> 8 ^ i[(D ^ (128 | U & 63)) & 255]);
      return ~D;
    }
    e.table = i, e.bstr = C, e.buf = V, e.str = K;
  });
})(pl);
const { Transform: NL } = fs, FL = pl;
let ML = class extends NL {
  constructor(e) {
    super(e), this.checksum = Buffer.allocUnsafe(4), this.checksum.writeInt32BE(0, 0), this.rawSize = 0;
  }
  _transform(e, n, i) {
    e && (this.checksum = FL.buf(e, this.checksum) >>> 0, this.rawSize += e.length), i(null, e);
  }
  digest(e) {
    const n = Buffer.allocUnsafe(4);
    return n.writeUInt32BE(this.checksum >>> 0, 0), e ? n.toString(e) : n;
  }
  hex() {
    return this.digest("hex").toUpperCase();
  }
  size() {
    return this.rawSize;
  }
};
var $L = ML;
const { DeflateRaw: BL } = Ht, UL = pl;
let zL = class extends BL {
  constructor(e) {
    super(e), this.checksum = Buffer.allocUnsafe(4), this.checksum.writeInt32BE(0, 0), this.rawSize = 0, this.compressedSize = 0;
  }
  push(e, n) {
    return e && (this.compressedSize += e.length), super.push(e, n);
  }
  _transform(e, n, i) {
    e && (this.checksum = UL.buf(e, this.checksum) >>> 0, this.rawSize += e.length), super._transform(e, n, i);
  }
  digest(e) {
    const n = Buffer.allocUnsafe(4);
    return n.writeUInt32BE(this.checksum >>> 0, 0), e ? n.toString(e) : n;
  }
  hex() {
    return this.digest("hex").toUpperCase();
  }
  size(e = !1) {
    return e ? this.compressedSize : this.rawSize;
  }
};
var WL = zL, Zx = {
  CRC32Stream: $L,
  DeflateCRC32Stream: WL
}, qL = xt.inherits, GL = pl, { CRC32Stream: HL } = Zx, { DeflateCRC32Stream: VL } = Zx, Xx = LL, je = Wx, Oe = td, Rt = Yx.exports = function(t) {
  if (!(this instanceof Rt))
    return new Rt(t);
  t = this.options = this._defaults(t), Xx.call(this, t), this._entry = null, this._entries = [], this._archive = {
    centralLength: 0,
    centralOffset: 0,
    comment: "",
    finish: !1,
    finished: !1,
    processing: !1,
    forceZip64: t.forceZip64,
    forceLocalTime: t.forceLocalTime
  };
};
qL(Rt, Xx);
Rt.prototype._afterAppend = function(t) {
  this._entries.push(t), t.getGeneralPurposeBit().usesDataDescriptor() && this._writeDataDescriptor(t), this._archive.processing = !1, this._entry = null, this._archive.finish && !this._archive.finished && this._finish();
};
Rt.prototype._appendBuffer = function(t, e, n) {
  e.length === 0 && t.setMethod(je.METHOD_STORED);
  var i = t.getMethod();
  if (i === je.METHOD_STORED && (t.setSize(e.length), t.setCompressedSize(e.length), t.setCrc(GL.buf(e) >>> 0)), this._writeLocalFileHeader(t), i === je.METHOD_STORED) {
    this.write(e), this._afterAppend(t), n(null, t);
    return;
  } else if (i === je.METHOD_DEFLATED) {
    this._smartStream(t, n).end(e);
    return;
  } else {
    n(new Error("compression method " + i + " not implemented"));
    return;
  }
};
Rt.prototype._appendStream = function(t, e, n) {
  t.getGeneralPurposeBit().useDataDescriptor(!0), t.setVersionNeededToExtract(je.MIN_VERSION_DATA_DESCRIPTOR), this._writeLocalFileHeader(t);
  var i = this._smartStream(t, n);
  e.once("error", function(r) {
    i.emit("error", r), i.end();
  }), e.pipe(i);
};
Rt.prototype._defaults = function(t) {
  return typeof t != "object" && (t = {}), typeof t.zlib != "object" && (t.zlib = {}), typeof t.zlib.level != "number" && (t.zlib.level = je.ZLIB_BEST_SPEED), t.forceZip64 = !!t.forceZip64, t.forceLocalTime = !!t.forceLocalTime, t;
};
Rt.prototype._finish = function() {
  this._archive.centralOffset = this.offset, this._entries.forEach((function(t) {
    this._writeCentralFileHeader(t);
  }).bind(this)), this._archive.centralLength = this.offset - this._archive.centralOffset, this.isZip64() && this._writeCentralDirectoryZip64(), this._writeCentralDirectoryEnd(), this._archive.processing = !1, this._archive.finish = !0, this._archive.finished = !0, this.end();
};
Rt.prototype._normalizeEntry = function(t) {
  t.getMethod() === -1 && t.setMethod(je.METHOD_DEFLATED), t.getMethod() === je.METHOD_DEFLATED && (t.getGeneralPurposeBit().useDataDescriptor(!0), t.setVersionNeededToExtract(je.MIN_VERSION_DATA_DESCRIPTOR)), t.getTime() === -1 && t.setTime(/* @__PURE__ */ new Date(), this._archive.forceLocalTime), t._offsets = {
    file: 0,
    data: 0,
    contents: 0
  };
};
Rt.prototype._smartStream = function(t, e) {
  var n = t.getMethod() === je.METHOD_DEFLATED, i = n ? new VL(this.options.zlib) : new HL(), r = null;
  function s() {
    var a = i.digest().readUInt32BE(0);
    t.setCrc(a), t.setSize(i.size()), t.setCompressedSize(i.size(!0)), this._afterAppend(t), e(r, t);
  }
  return i.once("end", s.bind(this)), i.once("error", function(a) {
    r = a;
  }), i.pipe(this, { end: !1 }), i;
};
Rt.prototype._writeCentralDirectoryEnd = function() {
  var t = this._entries.length, e = this._archive.centralLength, n = this._archive.centralOffset;
  this.isZip64() && (t = je.ZIP64_MAGIC_SHORT, e = je.ZIP64_MAGIC, n = je.ZIP64_MAGIC), this.write(Oe.getLongBytes(je.SIG_EOCD)), this.write(je.SHORT_ZERO), this.write(je.SHORT_ZERO), this.write(Oe.getShortBytes(t)), this.write(Oe.getShortBytes(t)), this.write(Oe.getLongBytes(e)), this.write(Oe.getLongBytes(n));
  var i = this.getComment(), r = Buffer.byteLength(i);
  this.write(Oe.getShortBytes(r)), this.write(i);
};
Rt.prototype._writeCentralDirectoryZip64 = function() {
  this.write(Oe.getLongBytes(je.SIG_ZIP64_EOCD)), this.write(Oe.getEightBytes(44)), this.write(Oe.getShortBytes(je.MIN_VERSION_ZIP64)), this.write(Oe.getShortBytes(je.MIN_VERSION_ZIP64)), this.write(je.LONG_ZERO), this.write(je.LONG_ZERO), this.write(Oe.getEightBytes(this._entries.length)), this.write(Oe.getEightBytes(this._entries.length)), this.write(Oe.getEightBytes(this._archive.centralLength)), this.write(Oe.getEightBytes(this._archive.centralOffset)), this.write(Oe.getLongBytes(je.SIG_ZIP64_EOCD_LOC)), this.write(je.LONG_ZERO), this.write(Oe.getEightBytes(this._archive.centralOffset + this._archive.centralLength)), this.write(Oe.getLongBytes(1));
};
Rt.prototype._writeCentralFileHeader = function(t) {
  var e = t.getGeneralPurposeBit(), n = t.getMethod(), i = t._offsets.file, r = t.getSize(), s = t.getCompressedSize();
  if (t.isZip64() || i > je.ZIP64_MAGIC) {
    r = je.ZIP64_MAGIC, s = je.ZIP64_MAGIC, i = je.ZIP64_MAGIC, t.setVersionNeededToExtract(je.MIN_VERSION_ZIP64);
    var a = Buffer.concat([
      Oe.getShortBytes(je.ZIP64_EXTRA_ID),
      Oe.getShortBytes(24),
      Oe.getEightBytes(t.getSize()),
      Oe.getEightBytes(t.getCompressedSize()),
      Oe.getEightBytes(t._offsets.file)
    ], 28);
    t.setExtra(a);
  }
  this.write(Oe.getLongBytes(je.SIG_CFH)), this.write(Oe.getShortBytes(t.getPlatform() << 8 | je.VERSION_MADEBY)), this.write(Oe.getShortBytes(t.getVersionNeededToExtract())), this.write(e.encode()), this.write(Oe.getShortBytes(n)), this.write(Oe.getLongBytes(t.getTimeDos())), this.write(Oe.getLongBytes(t.getCrc())), this.write(Oe.getLongBytes(s)), this.write(Oe.getLongBytes(r));
  var o = t.getName(), c = t.getComment(), l = t.getCentralDirectoryExtra();
  e.usesUTF8ForNames() && (o = Buffer.from(o), c = Buffer.from(c)), this.write(Oe.getShortBytes(o.length)), this.write(Oe.getShortBytes(l.length)), this.write(Oe.getShortBytes(c.length)), this.write(je.SHORT_ZERO), this.write(Oe.getShortBytes(t.getInternalAttributes())), this.write(Oe.getLongBytes(t.getExternalAttributes())), this.write(Oe.getLongBytes(i)), this.write(o), this.write(l), this.write(c);
};
Rt.prototype._writeDataDescriptor = function(t) {
  this.write(Oe.getLongBytes(je.SIG_DD)), this.write(Oe.getLongBytes(t.getCrc())), t.isZip64() ? (this.write(Oe.getEightBytes(t.getCompressedSize())), this.write(Oe.getEightBytes(t.getSize()))) : (this.write(Oe.getLongBytes(t.getCompressedSize())), this.write(Oe.getLongBytes(t.getSize())));
};
Rt.prototype._writeLocalFileHeader = function(t) {
  var e = t.getGeneralPurposeBit(), n = t.getMethod(), i = t.getName(), r = t.getLocalFileDataExtra();
  t.isZip64() && (e.useDataDescriptor(!0), t.setVersionNeededToExtract(je.MIN_VERSION_ZIP64)), e.usesUTF8ForNames() && (i = Buffer.from(i)), t._offsets.file = this.offset, this.write(Oe.getLongBytes(je.SIG_LFH)), this.write(Oe.getShortBytes(t.getVersionNeededToExtract())), this.write(e.encode()), this.write(Oe.getShortBytes(n)), this.write(Oe.getLongBytes(t.getTimeDos())), t._offsets.data = this.offset, e.usesDataDescriptor() ? (this.write(je.LONG_ZERO), this.write(je.LONG_ZERO), this.write(je.LONG_ZERO)) : (this.write(Oe.getLongBytes(t.getCrc())), this.write(Oe.getLongBytes(t.getCompressedSize())), this.write(Oe.getLongBytes(t.getSize()))), this.write(Oe.getShortBytes(i.length)), this.write(Oe.getShortBytes(r.length)), this.write(i), this.write(r), t._offsets.contents = this.offset;
};
Rt.prototype.getComment = function(t) {
  return this._archive.comment !== null ? this._archive.comment : "";
};
Rt.prototype.isZip64 = function() {
  return this._archive.forceZip64 || this._entries.length > je.ZIP64_MAGIC_SHORT || this._archive.centralLength > je.ZIP64_MAGIC || this._archive.centralOffset > je.ZIP64_MAGIC;
};
Rt.prototype.setComment = function(t) {
  this._archive.comment = t;
};
var KL = Yx.exports, Jx = {
  ZipArchiveEntry: TL,
  ZipArchiveOutputStream: KL
};
/**
 * ZipStream
 *
 * @ignore
 * @license [MIT]{@link https://github.com/archiverjs/node-zip-stream/blob/master/LICENSE}
 * @copyright (c) 2014 Chris Talkington, contributors.
 */
var YL = xt.inherits, id = Jx.ZipArchiveOutputStream, ZL = Jx.ZipArchiveEntry, Ku = Va, is = Ix.exports = function(t) {
  if (!(this instanceof is))
    return new is(t);
  t = this.options = t || {}, t.zlib = t.zlib || {}, id.call(this, t), typeof t.level == "number" && t.level >= 0 && (t.zlib.level = t.level, delete t.level), !t.forceZip64 && typeof t.zlib.level == "number" && t.zlib.level === 0 && (t.store = !0), t.namePrependSlash = t.namePrependSlash || !1, t.comment && t.comment.length > 0 && this.setComment(t.comment);
};
YL(is, id);
is.prototype._normalizeFileData = function(t) {
  t = Ku.defaults(t, {
    type: "file",
    name: null,
    namePrependSlash: this.options.namePrependSlash,
    linkname: null,
    date: null,
    mode: null,
    store: this.options.store,
    comment: ""
  });
  var e = t.type === "directory", n = t.type === "symlink";
  return t.name && (t.name = Ku.sanitizePath(t.name), !n && t.name.slice(-1) === "/" ? (e = !0, t.type = "directory") : e && (t.name += "/")), (e || n) && (t.store = !0), t.date = Ku.dateify(t.date), t;
};
is.prototype.entry = function(t, e, n) {
  if (typeof n != "function" && (n = this._emitErrorCallback.bind(this)), e = this._normalizeFileData(e), e.type !== "file" && e.type !== "directory" && e.type !== "symlink") {
    n(new Error(e.type + " entries not currently supported"));
    return;
  }
  if (typeof e.name != "string" || e.name.length === 0) {
    n(new Error("entry name must be a non-empty string value"));
    return;
  }
  if (e.type === "symlink" && typeof e.linkname != "string") {
    n(new Error("entry linkname must be a non-empty string value when type equals symlink"));
    return;
  }
  var i = new ZL(e.name);
  return i.setTime(e.date, this.options.forceLocalTime), e.namePrependSlash && i.setName(e.name, !0), e.store && i.setMethod(0), e.comment.length > 0 && i.setComment(e.comment), e.type === "symlink" && typeof e.mode != "number" && (e.mode = 40960), typeof e.mode == "number" && (e.type === "symlink" && (e.mode |= 40960), i.setUnixMode(e.mode)), e.type === "symlink" && typeof e.linkname == "string" && (t = Buffer.from(e.linkname)), id.prototype.entry.call(this, i, t, n);
};
is.prototype.finalize = function() {
  this.finish();
};
var XL = Ix.exports;
/**
 * ZIP Format Plugin
 *
 * @module plugins/zip
 * @license [MIT]{@link https://github.com/archiverjs/node-archiver/blob/master/LICENSE}
 * @copyright (c) 2012-2014 Chris Talkington, contributors.
 */
var JL = XL, QL = Va, Ci = function(t) {
  if (!(this instanceof Ci))
    return new Ci(t);
  t = this.options = QL.defaults(t, {
    comment: "",
    forceUTC: !1,
    namePrependSlash: !1,
    store: !1
  }), this.supports = {
    directory: !0,
    symlink: !0
  }, this.engine = new JL(t);
};
Ci.prototype.append = function(t, e, n) {
  this.engine.entry(t, e, n);
};
Ci.prototype.finalize = function() {
  this.engine.finalize();
};
Ci.prototype.on = function() {
  return this.engine.on.apply(this.engine, arguments);
};
Ci.prototype.pipe = function() {
  return this.engine.pipe.apply(this.engine, arguments);
};
Ci.prototype.unpipe = function() {
  return this.engine.unpipe.apply(this.engine, arguments);
};
var eN = Ci, rd = {}, tN = Ii, nN = class {
  constructor(e) {
    if (!(e > 0) || e - 1 & e) throw new Error("Max size for a FixedFIFO should be a power of two");
    this.buffer = new Array(e), this.mask = e - 1, this.top = 0, this.btm = 0, this.next = null;
  }
  clear() {
    this.top = this.btm = 0, this.next = null, this.buffer.fill(void 0);
  }
  push(e) {
    return this.buffer[this.top] !== void 0 ? !1 : (this.buffer[this.top] = e, this.top = this.top + 1 & this.mask, !0);
  }
  shift() {
    const e = this.buffer[this.btm];
    if (e !== void 0)
      return this.buffer[this.btm] = void 0, this.btm = this.btm + 1 & this.mask, e;
  }
  peek() {
    return this.buffer[this.btm];
  }
  isEmpty() {
    return this.buffer[this.btm] === void 0;
  }
};
const Eg = nN;
var Qx = class {
  constructor(e) {
    this.hwm = e || 16, this.head = new Eg(this.hwm), this.tail = this.head, this.length = 0;
  }
  clear() {
    this.head = this.tail, this.head.clear(), this.length = 0;
  }
  push(e) {
    if (this.length++, !this.head.push(e)) {
      const n = this.head;
      this.head = n.next = new Eg(2 * this.head.buffer.length), this.head.push(e);
    }
  }
  shift() {
    this.length !== 0 && this.length--;
    const e = this.tail.shift();
    if (e === void 0 && this.tail.next) {
      const n = this.tail.next;
      return this.tail.next = null, this.tail = n, this.tail.shift();
    }
    return e;
  }
  peek() {
    const e = this.tail.peek();
    return e === void 0 && this.tail.next ? this.tail.next.peek() : e;
  }
  isEmpty() {
    return this.length === 0;
  }
};
function iN(t) {
  return Buffer.isBuffer(t) || t instanceof Uint8Array;
}
function rN(t) {
  return Buffer.isEncoding(t);
}
function sN(t, e, n) {
  return Buffer.alloc(t, e, n);
}
function aN(t) {
  return Buffer.allocUnsafe(t);
}
function oN(t) {
  return Buffer.allocUnsafeSlow(t);
}
function cN(t, e) {
  return Buffer.byteLength(t, e);
}
function lN(t, e) {
  return Buffer.compare(t, e);
}
function uN(t, e) {
  return Buffer.concat(t, e);
}
function pN(t, e, n, i, r) {
  return Ke(t).copy(e, n, i, r);
}
function fN(t, e) {
  return Ke(t).equals(e);
}
function dN(t, e, n, i, r) {
  return Ke(t).fill(e, n, i, r);
}
function hN(t, e, n) {
  return Buffer.from(t, e, n);
}
function mN(t, e, n, i) {
  return Ke(t).includes(e, n, i);
}
function gN(t, e, n, i) {
  return Ke(t).indexOf(e, n, i);
}
function bN(t, e, n, i) {
  return Ke(t).lastIndexOf(e, n, i);
}
function yN(t) {
  return Ke(t).swap16();
}
function vN(t) {
  return Ke(t).swap32();
}
function xN(t) {
  return Ke(t).swap64();
}
function Ke(t) {
  return Buffer.isBuffer(t) ? t : Buffer.from(t.buffer, t.byteOffset, t.byteLength);
}
function wN(t, e, n, i) {
  return Ke(t).toString(e, n, i);
}
function _N(t, e, n, i, r) {
  return Ke(t).write(e, n, i, r);
}
function SN(t, e) {
  return Ke(t).readDoubleBE(e);
}
function EN(t, e) {
  return Ke(t).readDoubleLE(e);
}
function AN(t, e) {
  return Ke(t).readFloatBE(e);
}
function TN(t, e) {
  return Ke(t).readFloatLE(e);
}
function RN(t, e) {
  return Ke(t).readInt32BE(e);
}
function ON(t, e) {
  return Ke(t).readInt32LE(e);
}
function PN(t, e) {
  return Ke(t).readUInt32BE(e);
}
function CN(t, e) {
  return Ke(t).readUInt32LE(e);
}
function kN(t, e, n) {
  return Ke(t).writeDoubleBE(e, n);
}
function IN(t, e, n) {
  return Ke(t).writeDoubleLE(e, n);
}
function DN(t, e, n) {
  return Ke(t).writeFloatBE(e, n);
}
function jN(t, e, n) {
  return Ke(t).writeFloatLE(e, n);
}
function LN(t, e, n) {
  return Ke(t).writeInt32BE(e, n);
}
function NN(t, e, n) {
  return Ke(t).writeInt32LE(e, n);
}
function FN(t, e, n) {
  return Ke(t).writeUInt32BE(e, n);
}
function MN(t, e, n) {
  return Ke(t).writeUInt32LE(e, n);
}
var Ka = {
  isBuffer: iN,
  isEncoding: rN,
  alloc: sN,
  allocUnsafe: aN,
  allocUnsafeSlow: oN,
  byteLength: cN,
  compare: lN,
  concat: uN,
  copy: pN,
  equals: fN,
  fill: dN,
  from: hN,
  includes: mN,
  indexOf: gN,
  lastIndexOf: bN,
  swap16: yN,
  swap32: vN,
  swap64: xN,
  toBuffer: Ke,
  toString: wN,
  write: _N,
  readDoubleBE: SN,
  readDoubleLE: EN,
  readFloatBE: AN,
  readFloatLE: TN,
  readInt32BE: RN,
  readInt32LE: ON,
  readUInt32BE: PN,
  readUInt32LE: CN,
  writeDoubleBE: kN,
  writeDoubleLE: IN,
  writeFloatBE: DN,
  writeFloatLE: jN,
  writeInt32BE: LN,
  writeInt32LE: NN,
  writeUInt32BE: FN,
  writeUInt32LE: MN
};
const $N = Ka;
var BN = class {
  constructor(e) {
    this.encoding = e;
  }
  get remaining() {
    return 0;
  }
  decode(e) {
    return $N.toString(e, this.encoding);
  }
  flush() {
    return "";
  }
};
const Ag = Ka;
var UN = class {
  constructor() {
    this._reset();
  }
  get remaining() {
    return this.bytesSeen;
  }
  decode(e) {
    if (e.byteLength === 0) return "";
    if (this.bytesNeeded === 0 && Tg(e, 0) === 0)
      return this.bytesSeen = zN(e), Ag.toString(e, "utf8");
    let n = "", i = 0;
    if (this.bytesNeeded > 0) {
      for (; i < e.byteLength; ) {
        const a = e[i];
        if (a < this.lowerBoundary || a > this.upperBoundary) {
          n += "�", this._reset();
          break;
        }
        if (this.lowerBoundary = 128, this.upperBoundary = 191, this.codePoint = this.codePoint << 6 | a & 63, this.bytesSeen++, i++, this.bytesSeen === this.bytesNeeded) {
          n += String.fromCodePoint(this.codePoint), this._reset();
          break;
        }
      }
      if (this.bytesNeeded > 0) return n;
    }
    const r = Tg(e, i), s = e.byteLength - r;
    s > i && (n += Ag.toString(e, "utf8", i, s));
    for (let a = s; a < e.byteLength; a++) {
      const o = e[a];
      if (this.bytesNeeded === 0) {
        o <= 127 ? (this.bytesSeen = 0, n += String.fromCharCode(o)) : o >= 194 && o <= 223 ? (this.bytesNeeded = 2, this.bytesSeen = 1, this.codePoint = o & 31) : o >= 224 && o <= 239 ? (o === 224 ? this.lowerBoundary = 160 : o === 237 && (this.upperBoundary = 159), this.bytesNeeded = 3, this.bytesSeen = 1, this.codePoint = o & 15) : o >= 240 && o <= 244 ? (o === 240 ? this.lowerBoundary = 144 : o === 244 && (this.upperBoundary = 143), this.bytesNeeded = 4, this.bytesSeen = 1, this.codePoint = o & 7) : (this.bytesSeen = 1, n += "�");
        continue;
      }
      if (o < this.lowerBoundary || o > this.upperBoundary) {
        n += "�", a--, this._reset();
        continue;
      }
      this.lowerBoundary = 128, this.upperBoundary = 191, this.codePoint = this.codePoint << 6 | o & 63, this.bytesSeen++, this.bytesSeen === this.bytesNeeded && (n += String.fromCodePoint(this.codePoint), this._reset());
    }
    return n;
  }
  flush() {
    const e = this.bytesNeeded > 0 ? "�" : "";
    return this._reset(), e;
  }
  _reset() {
    this.codePoint = 0, this.bytesNeeded = 0, this.bytesSeen = 0, this.lowerBoundary = 128, this.upperBoundary = 191;
  }
};
function Tg(t, e) {
  const n = t.byteLength;
  if (n <= e) return 0;
  const i = Math.max(e, n - 4);
  let r = n - 1;
  for (; r > i && (t[r] & 192) === 128; ) r--;
  if (r < e) return 0;
  const s = t[r];
  let a;
  if (s <= 127) return 0;
  if (s >= 194 && s <= 223) a = 2;
  else if (s >= 224 && s <= 239) a = 3;
  else if (s >= 240 && s <= 244) a = 4;
  else return 0;
  const o = n - r;
  return o < a ? o : 0;
}
function zN(t) {
  const e = t.byteLength;
  if (e === 0) return 0;
  const n = t[e - 1];
  if (n <= 127) return 0;
  if ((n & 192) !== 128) return 1;
  const i = Math.max(0, e - 4);
  let r = e - 2;
  for (; r >= i && (t[r] & 192) === 128; ) r--;
  if (r < 0) return 1;
  const s = t[r];
  let a;
  if (s >= 194 && s <= 223) a = 2;
  else if (s >= 224 && s <= 239) a = 3;
  else if (s >= 240 && s <= 244) a = 4;
  else return 1;
  if (e - r !== a) return 1;
  if (a >= 3) {
    const o = t[r + 1];
    if (s === 224 && o < 160 || s === 237 && o > 159 || s === 240 && o < 144 || s === 244 && o > 143) return 1;
  }
  return 0;
}
const WN = BN, qN = UN;
var GN = class {
  constructor(e = "utf8") {
    switch (this.encoding = HN(e), this.encoding) {
      case "utf8":
        this.decoder = new qN();
        break;
      case "utf16le":
      case "base64":
        throw new Error("Unsupported encoding: " + this.encoding);
      default:
        this.decoder = new WN(this.encoding);
    }
  }
  get remaining() {
    return this.decoder.remaining;
  }
  push(e) {
    return typeof e == "string" ? e : this.decoder.decode(e);
  }
  // For Node.js compatibility
  write(e) {
    return this.push(e);
  }
  end(e) {
    let n = "";
    return e && (n = this.push(e)), n += this.decoder.flush(), n;
  }
};
function HN(t) {
  switch (t = t.toLowerCase(), t) {
    case "utf8":
    case "utf-8":
      return "utf8";
    case "ucs2":
    case "ucs-2":
    case "utf16le":
    case "utf-16le":
      return "utf16le";
    case "latin1":
    case "binary":
      return "latin1";
    case "base64":
    case "ascii":
    case "hex":
      return t;
    default:
      throw new Error("Unknown encoding: " + t);
  }
}
var VN = class Pn extends Error {
  constructor(e, n, i = Pn) {
    super(e), this.code = n, Error.captureStackTrace && Error.captureStackTrace(this, i);
  }
  static isStreamDestroyed(e) {
    return e && e.code === "STREAM_DESTROYED";
  }
  static isPrematureClose(e) {
    return e && e.code === "PREMATURE_CLOSE";
  }
  static isAborted(e) {
    return e && e.code === "ABORTED";
  }
  static isBadArgument(e) {
    return e && e.code === "BAD_ARGUMENT";
  }
  get name() {
    return "StreamError";
  }
  static STREAM_DESTROYED() {
    return new Pn("Stream was destroyed", "STREAM_DESTROYED", Pn.STREAM_DESTROYED);
  }
  static PREMATURE_CLOSE(e = "Premature close") {
    return new Pn(e, "PREMATURE_CLOSE", Pn.PREMATURE_CLOSE);
  }
  static ABORTED() {
    return new Pn("Stream aborted", "ABORTED", Pn.ABORTED);
  }
  static BAD_ARGUMENT(e = "Bad argument") {
    return new Pn(e, "BAD_ARGUMENT", Pn.BAD_ARGUMENT);
  }
};
const { EventEmitter: KN } = tN, ew = Qx, YN = GN, pn = VN, Wp = typeof queueMicrotask > "u" ? (t) => We.process.nextTick(t) : queueMicrotask, at = (1 << 29) - 1, Ni = 1, sd = 2, hr = 4, ea = 8, tw = at ^ Ni, ZN = at ^ sd, Ya = 16, Lr = 32, gs = 64, Ei = 128, Za = 256, ad = 512, Ai = 1024, qp = 2048, od = 4096, cd = 8192, Tn = 16384, vi = 32768, fl = 65536, mr = 131072, nw = Za | ad, XN = Ya | fl, JN = gs | Ya, QN = od | Ei, ld = Za | mr, eF = at ^ Ya, tF = at ^ gs, nF = at ^ (gs | fl), Rg = at ^ fl, iF = at ^ Za, rF = at ^ (Ei | cd), sF = at ^ Ai, Og = at ^ nw, iw = at ^ vi, aF = at ^ Lr, rw = at ^ mr, oF = at ^ ld, ni = 1 << 18, rs = 2 << 18, Xa = 4 << 18, gr = 8 << 18, Ja = 16 << 18, Fi = 32 << 18, Gp = 64 << 18, Nr = 128 << 18, ud = 256 << 18, Ti = 512 << 18, dl = 1024 << 18, cF = at ^ (ni | ud), sw = at ^ Xa, lF = at ^ (ni | Ti), uF = at ^ Ja, pF = at ^ gr, aw = at ^ Nr, fF = at ^ rs, ow = at ^ dl, ta = Ya | ni, cw = at ^ ta, pd = Tn | Fi, Mn = hr | ea | sd, an = Mn | Ni, lw = Mn | pd, dF = sw & tF, fd = Nr | vi, hF = fd & cw, uw = an | hF, mF = an | Ai | Tn, Pg = an | Tn | Ei, gF = an | Ai | Ei, bF = an | od | Ei | cd, yF = an | Ya | Ai | Tn | fl | mr, vF = Mn | Ai | Tn, xF = Lr | an | vi | gs, wF = vi | Ni, _F = an | Ti | Fi, SF = gr | Ja, pw = gr | ni, EF = gr | Ja | an | ni, Cg = an | ni | gr | dl, AF = Xa | ni, TF = ni | ud, RF = an | Ti | pw | Fi, OF = Ja | Mn | Ti | Fi, PF = rs | an | Nr | Xa, CF = Ti | Fi | Mn, Ao = Symbol.asyncIterator || Symbol("asyncIterator");
class fw {
  constructor(e, { highWaterMark: n = 16384, map: i = null, mapWritable: r, byteLength: s, byteLengthWritable: a } = {}) {
    this.stream = e, this.queue = new ew(), this.highWaterMark = n, this.buffered = 0, this.error = null, this.pipeline = null, this.drains = null, this.byteLength = a || s || vw, this.map = r || i, this.afterWrite = NF.bind(this), this.afterUpdateNextTick = $F.bind(this);
  }
  get ending() {
    return (this.stream._duplexState & Ti) !== 0;
  }
  get ended() {
    return (this.stream._duplexState & Fi) !== 0;
  }
  push(e) {
    return this.stream._duplexState & CF ? !1 : (this.map !== null && (e = this.map(e)), this.buffered += this.byteLength(e), this.queue.push(e), this.buffered < this.highWaterMark ? (this.stream._duplexState |= gr, !0) : (this.stream._duplexState |= SF, !1));
  }
  shift() {
    const e = this.queue.shift();
    return this.buffered -= this.byteLength(e), this.buffered === 0 && (this.stream._duplexState &= pF), e;
  }
  end(e) {
    typeof e == "function" ? this.stream.once("finish", e) : e != null && this.push(e), this.stream._duplexState = (this.stream._duplexState | Ti) & sw;
  }
  autoBatch(e, n) {
    const i = [], r = this.stream;
    for (i.push(e); (r._duplexState & Cg) === pw; )
      i.push(r._writableState.shift());
    if (r._duplexState & an) return n(null);
    r._writev(i, n);
  }
  update() {
    const e = this.stream;
    e._duplexState |= rs;
    do {
      for (; (e._duplexState & Cg) === gr; ) {
        const n = this.shift();
        e._duplexState |= TF, e._write(n, this.afterWrite);
      }
      e._duplexState & AF || this.updateNonPrimary();
    } while (this.continueUpdate() === !0);
    e._duplexState &= fF;
  }
  updateNonPrimary() {
    const e = this.stream;
    if ((e._duplexState & RF) === Ti) {
      e._duplexState = e._duplexState | ni, e._final(LF.bind(this));
      return;
    }
    if ((e._duplexState & Mn) === hr) {
      e._duplexState & fd || (e._duplexState |= ta, e._destroy(dw.bind(this)));
      return;
    }
    (e._duplexState & uw) === Ni && (e._duplexState = (e._duplexState | ta) & tw, e._open(hw.bind(this)));
  }
  continueUpdate() {
    return this.stream._duplexState & Nr ? (this.stream._duplexState &= aw, !0) : !1;
  }
  updateCallback() {
    (this.stream._duplexState & PF) === Xa ? this.update() : this.updateNextTick();
  }
  updateNextTick() {
    this.stream._duplexState & Nr || (this.stream._duplexState |= Nr, this.stream._duplexState & rs || Wp(this.afterUpdateNextTick));
  }
}
class kF {
  constructor(e, { highWaterMark: n = 16384, map: i = null, mapReadable: r, byteLength: s, byteLengthReadable: a } = {}) {
    this.stream = e, this.queue = new ew(), this.highWaterMark = n === 0 ? 1 : n, this.buffered = 0, this.readAhead = n > 0, this.error = null, this.pipeline = null, this.byteLength = a || s || vw, this.map = r || i, this.pipeTo = null, this.afterRead = FF.bind(this), this.afterUpdateNextTick = MF.bind(this);
  }
  get ending() {
    return (this.stream._duplexState & Ai) !== 0;
  }
  get ended() {
    return (this.stream._duplexState & Tn) !== 0;
  }
  pipe(e, n) {
    if (this.pipeTo !== null) throw pn.BAD_ARGUMENT("Can only pipe to one destination");
    if (typeof n != "function" && (n = null), this.stream._duplexState |= ad, this.pipeTo = e, this.pipeline = new DF(this.stream, e, n), n && this.stream.on("error", Vp), Pc(e))
      e._writableState.pipeline = this.pipeline, n && e.on("error", Vp), e.on("finish", this.pipeline.finished.bind(this.pipeline));
    else {
      const i = this.pipeline.done.bind(this.pipeline, e), r = this.pipeline.done.bind(this.pipeline, e, null);
      e.on("error", i), e.on("close", r), e.on("finish", this.pipeline.finished.bind(this.pipeline));
    }
    e.on("drain", jF.bind(this)), this.stream.emit("piping", e), e.emit("pipe", this.stream);
  }
  push(e) {
    const n = this.stream;
    return e === null ? (this.highWaterMark = 0, n._duplexState = (n._duplexState | Ai) & nF, !1) : this.map !== null && (e = this.map(e), e === null) ? (n._duplexState &= Rg, this.buffered < this.highWaterMark) : (this.buffered += this.byteLength(e), this.queue.push(e), n._duplexState = (n._duplexState | Ei) & Rg, this.buffered < this.highWaterMark);
  }
  shift() {
    const e = this.queue.shift();
    return this.buffered -= this.byteLength(e), this.buffered === 0 && (this.stream._duplexState &= rF), e;
  }
  unshift(e) {
    const n = [this.map !== null ? this.map(e) : e];
    for (; this.buffered > 0; ) n.push(this.shift());
    for (let i = 0; i < n.length - 1; i++) {
      const r = n[i];
      this.buffered += this.byteLength(r), this.queue.push(r);
    }
    this.push(n[n.length - 1]);
  }
  read() {
    const e = this.stream;
    if ((e._duplexState & Pg) === Ei) {
      const n = this.shift();
      return this.pipeTo !== null && this.pipeTo.write(n) === !1 && (e._duplexState &= Og), e._duplexState & qp && e.emit("data", n), n;
    }
    return this.readAhead === !1 && (e._duplexState |= mr, this.updateNextTick()), null;
  }
  drain() {
    const e = this.stream;
    for (; (e._duplexState & Pg) === Ei && e._duplexState & nw; ) {
      const n = this.shift();
      this.pipeTo !== null && this.pipeTo.write(n) === !1 && (e._duplexState &= Og), e._duplexState & qp && e.emit("data", n);
    }
  }
  update() {
    const e = this.stream;
    e._duplexState |= Lr;
    do {
      for (this.drain(); this.buffered < this.highWaterMark && (e._duplexState & yF) === mr; )
        e._duplexState |= XN, e._read(this.afterRead), this.drain();
      (e._duplexState & bF) === QN && (e._duplexState |= cd, e.emit("readable")), e._duplexState & JN || this.updateNonPrimary();
    } while (this.continueUpdate() === !0);
    e._duplexState &= aF;
  }
  updateNonPrimary() {
    const e = this.stream;
    if ((e._duplexState & gF) === Ai && (e._duplexState = (e._duplexState | Tn) & sF, e.emit("end"), (e._duplexState & lw) === pd && (e._duplexState |= hr), this.pipeTo !== null && this.pipeTo.end()), (e._duplexState & Mn) === hr) {
      e._duplexState & fd || (e._duplexState |= ta, e._destroy(dw.bind(this)));
      return;
    }
    (e._duplexState & uw) === Ni && (e._duplexState = (e._duplexState | ta) & tw, e._open(hw.bind(this)));
  }
  continueUpdate() {
    return this.stream._duplexState & vi ? (this.stream._duplexState &= iw, !0) : !1;
  }
  updateCallback() {
    (this.stream._duplexState & xF) === gs ? this.update() : this.updateNextTick();
  }
  updateNextTickIfOpen() {
    this.stream._duplexState & wF || (this.stream._duplexState |= vi, this.stream._duplexState & Lr || Wp(this.afterUpdateNextTick));
  }
  updateNextTick() {
    this.stream._duplexState & vi || (this.stream._duplexState |= vi, this.stream._duplexState & Lr || Wp(this.afterUpdateNextTick));
  }
}
class IF {
  constructor(e) {
    this.data = null, this.afterTransform = UF.bind(e), this.afterFinal = null;
  }
}
class DF {
  constructor(e, n, i) {
    this.from = e, this.to = n, this.afterPipe = i, this.error = null, this.pipeToFinished = !1;
  }
  finished() {
    this.pipeToFinished = !0;
  }
  done(e, n) {
    if (n && (this.error = n), e === this.to && (this.to = null, this.from !== null)) {
      (!(this.from._duplexState & Tn) || !this.pipeToFinished) && this.from.destroy(this.error || pn.PREMATURE_CLOSE("Writable stream closed"));
      return;
    }
    if (e === this.from && (this.from = null, this.to !== null)) {
      e._duplexState & Tn || this.to.destroy(this.error || pn.PREMATURE_CLOSE("Readable stream closed"));
      return;
    }
    this.afterPipe !== null && this.afterPipe(this.error), this.to = this.from = this.afterPipe = null;
  }
}
function jF() {
  this.stream._duplexState |= ad, this.updateCallback();
}
function LF(t) {
  const e = this.stream;
  t && e.destroy(t), e._duplexState & Mn || (e._duplexState |= Fi, e.emit("finish")), (e._duplexState & lw) === pd && (e._duplexState |= hr), e._duplexState &= lF, e._duplexState & rs ? this.updateNextTick() : this.update();
}
function dw(t) {
  const e = this.stream;
  !t && !pn.isStreamDestroyed(this.error) && (t = this.error), t && e.emit("error", t), e._duplexState |= ea, e.emit("close");
  const n = e._readableState, i = e._writableState;
  if (n !== null && n.pipeline !== null && n.pipeline.done(e, t), i !== null) {
    for (; i.drains !== null && i.drains.length > 0; )
      i.drains.shift().resolve(!1);
    i.pipeline !== null && i.pipeline.done(e, t);
  }
}
function NF(t) {
  const e = this.stream;
  t && e.destroy(t), e._duplexState &= cF, this.drains !== null && BF(this.drains), (e._duplexState & EF) === Ja && (e._duplexState &= uF, (e._duplexState & Gp) === Gp && e.emit("drain")), this.updateCallback();
}
function FF(t) {
  t && this.stream.destroy(t), this.stream._duplexState &= eF, this.readAhead === !1 && !(this.stream._duplexState & Za) && (this.stream._duplexState &= rw), this.updateCallback();
}
function MF() {
  this.stream._duplexState & Lr || (this.stream._duplexState &= iw, this.update());
}
function $F() {
  this.stream._duplexState & rs || (this.stream._duplexState &= aw, this.update());
}
function BF(t) {
  for (let e = 0; e < t.length; e++)
    --t[e].writes === 0 && (t.shift().resolve(!0), e--);
}
function hw(t) {
  const e = this.stream;
  t && e.destroy(t), e._duplexState & hr || (e._duplexState & mF || (e._duplexState |= gs), e._duplexState & _F || (e._duplexState |= Xa), e.emit("open")), e._duplexState &= cw, e._writableState !== null && e._writableState.updateCallback(), e._readableState !== null && e._readableState.updateCallback();
}
function UF(t, e) {
  e != null && this.push(e), this._writableState.afterWrite(t);
}
function zF(t) {
  this._readableState !== null && (t === "data" && (this._duplexState |= qp | ld, this._readableState.updateNextTick()), t === "readable" && (this._duplexState |= od, this._readableState.updateNextTick())), this._writableState !== null && t === "drain" && (this._duplexState |= Gp, this._writableState.updateNextTick());
}
class mw extends KN {
  constructor(e) {
    super(), this._duplexState = 0, this._readableState = null, this._writableState = null, e && (e.open && (this._open = e.open), e.destroy && (this._destroy = e.destroy), e.predestroy && (this._predestroy = e.predestroy), e.signal && e.signal.addEventListener("abort", JF.bind(this))), this.on("newListener", zF);
  }
  _open(e) {
    e(null);
  }
  _destroy(e) {
    e(null);
  }
  _predestroy() {
  }
  get readable() {
    return this._readableState !== null ? !0 : void 0;
  }
  get writable() {
    return this._writableState !== null ? !0 : void 0;
  }
  get destroyed() {
    return (this._duplexState & ea) !== 0;
  }
  get destroying() {
    return (this._duplexState & Mn) !== 0;
  }
  destroy(e) {
    this._duplexState & Mn || (e || (e = pn.STREAM_DESTROYED()), this._duplexState = (this._duplexState | hr) & dF, this._readableState !== null && (this._readableState.highWaterMark = 0, this._readableState.error = e), this._writableState !== null && (this._writableState.highWaterMark = 0, this._writableState.error = e), this._duplexState |= sd, this._predestroy(), this._duplexState &= ZN, this._readableState !== null && this._readableState.updateNextTick(), this._writableState !== null && this._writableState.updateNextTick());
  }
}
let gw = class Hp extends mw {
  constructor(e) {
    super(e), this._duplexState |= Ni | Fi | mr, this._readableState = new kF(this, e), e && (this._readableState.readAhead === !1 && (this._duplexState &= rw), e.read && (this._read = e.read), e.eagerOpen && this._readableState.updateNextTick(), e.encoding && this.setEncoding(e.encoding));
  }
  static deferred(e, n) {
    const i = new qF(n);
    return e().then((r) => {
      if (r === null) return i.end();
      i.destroying || HF(r, i, Vp);
    }).catch((r) => i.destroy(r)), i;
  }
  setEncoding(e) {
    const n = new YN(e), i = this._readableState.map || VF;
    return this._readableState.map = r, this;
    function r(s) {
      const a = n.push(s);
      return a === "" && (s.byteLength !== 0 || n.remaining > 0) ? null : i(a);
    }
  }
  _read(e) {
    e(null);
  }
  pipe(e, n) {
    return this._readableState.updateNextTick(), this._readableState.pipe(e, n), e;
  }
  read() {
    return this._readableState.updateNextTick(), this._readableState.read();
  }
  push(e) {
    return this._readableState.updateNextTickIfOpen(), this._readableState.push(e);
  }
  unshift(e) {
    return this._readableState.updateNextTickIfOpen(), this._readableState.unshift(e);
  }
  resume() {
    return this._duplexState |= ld, this._readableState.updateNextTick(), this;
  }
  pause() {
    return this._duplexState &= this._readableState.readAhead === !1 ? oF : iF, this;
  }
  static _fromAsyncIterator(e, n) {
    let i;
    const r = new Hp({
      ...n,
      read(a) {
        e.next().then(s).then(a.bind(null, null)).catch(a);
      },
      predestroy() {
        i = e.return();
      },
      destroy(a) {
        if (!i) return a(null);
        i.then(a.bind(null, null)).catch(a);
      }
    });
    return r;
    function s(a) {
      a.done ? r.push(null) : r.push(a.value);
    }
  }
  static from(e, n) {
    if (ZF(e)) return e;
    if (e[Ao]) return this._fromAsyncIterator(e[Ao](), n);
    Array.isArray(e) || (e = e === void 0 ? [] : [e]);
    let i = 0;
    return new Hp({
      ...n,
      read(r) {
        this.push(i === e.length ? null : e[i++]), r(null);
      }
    });
  }
  static isBackpressured(e) {
    return (e._duplexState & vF) !== 0 || e._readableState.buffered >= e._readableState.highWaterMark;
  }
  static isPaused(e) {
    return (e._duplexState & Za) === 0;
  }
  [Ao]() {
    const e = this;
    let n = null, i = null, r = null;
    return this.on("error", (l) => {
      n = l;
    }), this.on("readable", s), this.on("close", a), {
      [Ao]() {
        return this;
      },
      next() {
        return new Promise(function(l, u) {
          i = l, r = u;
          const p = e.read();
          p !== null ? o(p) : e._duplexState & ea && o(null);
        });
      },
      return() {
        return c(null);
      },
      throw(l) {
        return c(l);
      }
    };
    function s() {
      i !== null && o(e.read());
    }
    function a() {
      i !== null && o(null);
    }
    function o(l) {
      r !== null && (n ? r(n) : l === null && !(e._duplexState & Tn) ? r(pn.STREAM_DESTROYED()) : i({ value: l, done: l === null }), r = i = null);
    }
    function c(l) {
      return e.destroy(l), new Promise((u, p) => {
        if (e._duplexState & ea) return u({ value: void 0, done: !0 });
        e.once("close", function() {
          l ? p(l) : u({ value: void 0, done: !0 });
        });
      });
    }
  }
}, bw = class extends mw {
  constructor(e) {
    super(e), this._duplexState |= Ni | Tn, this._writableState = new fw(this, e), e && (e.writev && (this._writev = e.writev), e.write && (this._write = e.write), e.final && (this._final = e.final), e.eagerOpen && this._writableState.updateNextTick());
  }
  cork() {
    this._duplexState |= dl;
  }
  uncork() {
    this._duplexState &= ow, this._writableState.updateNextTick();
  }
  _writev(e, n) {
    n(null);
  }
  _write(e, n) {
    this._writableState.autoBatch(e, n);
  }
  _final(e) {
    e(null);
  }
  static isBackpressured(e) {
    return (e._duplexState & OF) !== 0;
  }
  static drained(e) {
    if (e.destroyed) return Promise.resolve(!1);
    const n = e._writableState, r = (QF(e) ? Math.min(1, n.queue.length) : n.queue.length) + (e._duplexState & ud ? 1 : 0);
    return r === 0 ? Promise.resolve(!0) : (n.drains === null && (n.drains = []), new Promise((s) => {
      n.drains.push({ writes: r, resolve: s });
    }));
  }
  write(e) {
    return this._writableState.updateNextTick(), this._writableState.push(e);
  }
  end(e) {
    return this._writableState.updateNextTick(), this._writableState.end(e), this;
  }
};
class yw extends gw {
  // and Writable
  constructor(e) {
    super(e), this._duplexState = Ni | this._duplexState & mr, this._writableState = new fw(this, e), e && (e.writev && (this._writev = e.writev), e.write && (this._write = e.write), e.final && (this._final = e.final));
  }
  cork() {
    this._duplexState |= dl;
  }
  uncork() {
    this._duplexState &= ow, this._writableState.updateNextTick();
  }
  _writev(e, n) {
    n(null);
  }
  _write(e, n) {
    this._writableState.autoBatch(e, n);
  }
  _final(e) {
    e(null);
  }
  write(e) {
    return this._writableState.updateNextTick(), this._writableState.push(e);
  }
  end(e) {
    return this._writableState.updateNextTick(), this._writableState.end(e), this;
  }
}
let WF = class extends yw {
  constructor(e) {
    super(e), this._transformState = new IF(this), e && (e.transform && (this._transform = e.transform), e.flush && (this._flush = e.flush));
  }
  _write(e, n) {
    this._readableState.buffered >= this._readableState.highWaterMark ? this._transformState.data = e : this._transform(e, this._transformState.afterTransform);
  }
  _read(e) {
    if (this._transformState.data !== null) {
      const n = this._transformState.data;
      this._transformState.data = null, e(null), this._transform(n, this._transformState.afterTransform);
    } else
      e(null);
  }
  destroy(e) {
    super.destroy(e), this._transformState.data !== null && (this._transformState.data = null, this._transformState.afterTransform());
  }
  _transform(e, n) {
    n(null, e);
  }
  _flush(e) {
    e(null);
  }
  _final(e) {
    this._transformState.afterFinal = e, this._flush(GF.bind(this));
  }
};
class qF extends WF {
}
function GF(t, e) {
  const n = this._transformState.afterFinal;
  if (t) return n(t);
  e != null && this.push(e), this.push(null), n(null);
}
function HF(t, ...e) {
  const n = Array.isArray(t) ? [...t, ...e] : [t, ...e], i = n.length && typeof n[n.length - 1] == "function" ? n.pop() : null;
  if (n.length < 2) throw pn.BAD_ARGUMENT("Pipeline requires at least 2 streams");
  let r = n[0], s = null, a = null;
  for (let l = 1; l < n.length; l++)
    s = n[l], Pc(r) ? r.pipe(s, c) : (o(r, !0, l > 1, c), r.pipe(s)), r = s;
  if (i) {
    let l = !1;
    const u = Pc(s) || !!(s._writableState && s._writableState.autoDestroy);
    s.on("error", (p) => {
      a === null && (a = p);
    }), s.on("finish", () => {
      l = !0, u || i(a);
    }), u && s.on("close", () => i(a || (l ? null : pn.PREMATURE_CLOSE())));
  }
  return s;
  function o(l, u, p, d) {
    l.on("error", d), l.on("close", b);
    function b() {
      if (l._readableState && !l._readableState.ended || p && l._writableState && !l._writableState.ended)
        return d(pn.PREMATURE_CLOSE());
    }
  }
  function c(l) {
    if (!(!l || a)) {
      a = l;
      for (const u of n)
        u.destroy(l);
    }
  }
}
function VF(t) {
  return t;
}
function KF(t) {
  return !!t._readableState || !!t._writableState;
}
function Pc(t) {
  return typeof t._duplexState == "number" && KF(t);
}
function YF(t, e = {}) {
  const n = t._readableState && t._readableState.error || t._writableState && t._writableState.error;
  return !e.all && pn.isStreamDestroyed(n) ? null : n;
}
function ZF(t) {
  return Pc(t) && t.readable;
}
function XF(t) {
  return typeof t == "object" && t !== null && typeof t.byteLength == "number";
}
function vw(t) {
  return XF(t) ? t.byteLength : 1024;
}
function Vp() {
}
function JF() {
  this.destroy(pn.ABORTED());
}
function QF(t) {
  return t._writev !== bw.prototype._writev && t._writev !== yw.prototype._writev;
}
var xw = {
  getStreamError: YF,
  Writable: bw,
  Readable: gw
}, vr = {};
const Ue = Ka, eM = "0000000000000000000", tM = "7777777777777777777", Cc = 48, ww = Ue.from([117, 115, 116, 97, 114, 0]), nM = Ue.from([Cc, Cc]), iM = Ue.from([117, 115, 116, 97, 114, 32]), rM = Ue.from([32, 0]), sM = 4095, na = 257, Kp = 263;
vr.decodeLongPath = function(e, n) {
  return Cr(e, 0, e.length, n);
};
vr.encodePax = function(e) {
  let n = "";
  e.name && (n += Yu(" path=" + e.name + `
`)), e.linkname && (n += Yu(" linkpath=" + e.linkname + `
`));
  const i = e.pax;
  if (i)
    for (const r in i)
      n += Yu(" " + r + "=" + i[r] + `
`);
  return Ue.from(n);
};
vr.decodePax = function(e) {
  const n = {};
  for (; e.length; ) {
    let i = 0;
    for (; i < e.length && e[i] !== 32; ) i++;
    const r = parseInt(Ue.toString(e.subarray(0, i)), 10);
    if (!r) return n;
    const s = Ue.toString(e.subarray(i + 1, r - 1)), a = s.indexOf("=");
    if (a === -1) return n;
    n[s.slice(0, a)] = s.slice(a + 1), e = e.subarray(r);
  }
  return n;
};
vr.encode = function(e) {
  const n = Ue.alloc(512);
  let i = e.name, r = "";
  if (e.typeflag === 5 && i[i.length - 1] !== "/" && (i += "/"), Ue.byteLength(i) !== i.length) return null;
  for (; Ue.byteLength(i) > 100; ) {
    const s = i.indexOf("/");
    if (s === -1) return null;
    r += r ? "/" + i.slice(0, s) : i.slice(0, s), i = i.slice(s + 1);
  }
  return Ue.byteLength(i) > 100 || Ue.byteLength(r) > 155 || e.linkname && Ue.byteLength(e.linkname) > 100 ? null : (Ue.write(n, i), Ue.write(n, pi(e.mode & sM, 6), 100), Ue.write(n, pi(e.uid, 6), 108), Ue.write(n, pi(e.gid, 6), 116), fM(e.size, n, 124), Ue.write(n, pi(e.mtime.getTime() / 1e3 | 0, 11), 136), n[156] = Cc + uM(e.type), e.linkname && Ue.write(n, e.linkname, 157), Ue.copy(ww, n, na), Ue.copy(nM, n, Kp), e.uname && Ue.write(n, e.uname, 265), e.gname && Ue.write(n, e.gname, 297), Ue.write(n, pi(e.devmajor || 0, 6), 329), Ue.write(n, pi(e.devminor || 0, 6), 337), r && Ue.write(n, r, 345), Ue.write(n, pi(Sw(n), 6), 148), n);
};
vr.decode = function(e, n, i) {
  let r = e[156] === 0 ? 0 : e[156] - Cc, s = Cr(e, 0, 100, n);
  const a = ai(e, 100, 8), o = ai(e, 108, 8), c = ai(e, 116, 8), l = ai(e, 124, 12), u = ai(e, 136, 12), p = lM(r), d = e[157] === 0 ? null : Cr(e, 157, 100, n), b = Cr(e, 265, 32), x = Cr(e, 297, 32), v = ai(e, 329, 8), y = ai(e, 337, 8), f = Sw(e);
  if (f === 8 * 32) return null;
  if (f !== ai(e, 148, 8)) throw new Error("Invalid tar header. Maybe the tar is corrupted or it needs to be gunzipped?");
  if (aM(e))
    e[345] && (s = Cr(e, 345, 155, n) + "/" + s);
  else if (!oM(e)) {
    if (!i)
      throw new Error("Invalid tar header: unknown format.");
  }
  return r === 0 && s && s[s.length - 1] === "/" && (r = 5), {
    name: s,
    mode: a,
    uid: o,
    gid: c,
    size: l,
    byteOffset: 0,
    mtime: new Date(1e3 * u),
    type: p,
    linkname: d,
    uname: b,
    gname: x,
    devmajor: v,
    devminor: y,
    pax: null
  };
};
function aM(t) {
  return Ue.equals(ww, t.subarray(na, na + 6));
}
function oM(t) {
  return Ue.equals(iM, t.subarray(na, na + 6)) && Ue.equals(rM, t.subarray(Kp, Kp + 2));
}
function cM(t, e, n) {
  return typeof t != "number" ? n : (t = ~~t, t >= e ? e : t >= 0 || (t += e, t >= 0) ? t : 0);
}
function lM(t) {
  switch (t) {
    case 0:
      return "file";
    case 1:
      return "link";
    case 2:
      return "symlink";
    case 3:
      return "character-device";
    case 4:
      return "block-device";
    case 5:
      return "directory";
    case 6:
      return "fifo";
    case 7:
      return "contiguous-file";
    case 72:
      return "pax-header";
    case 55:
      return "pax-global-header";
    case 27:
      return "gnu-long-link-path";
    case 28:
    case 30:
      return "gnu-long-path";
  }
  return null;
}
function uM(t) {
  switch (t) {
    case "file":
      return 0;
    case "link":
      return 1;
    case "symlink":
      return 2;
    case "character-device":
      return 3;
    case "block-device":
      return 4;
    case "directory":
      return 5;
    case "fifo":
      return 6;
    case "contiguous-file":
      return 7;
    case "pax-header":
      return 72;
  }
  return 0;
}
function _w(t, e, n, i) {
  for (; n < i; n++)
    if (t[n] === e) return n;
  return i;
}
function Sw(t) {
  let e = 256;
  for (let n = 0; n < 148; n++) e += t[n];
  for (let n = 156; n < 512; n++) e += t[n];
  return e;
}
function pi(t, e) {
  return t = t.toString(8), t.length > e ? tM.slice(0, e) + " " : eM.slice(0, e - t.length) + t + " ";
}
function pM(t, e, n) {
  e[n] = 128;
  for (let i = 11; i > 0; i--)
    e[n + i] = t & 255, t = Math.floor(t / 256);
}
function fM(t, e, n) {
  t.toString(8).length > 11 ? pM(t, e, n) : Ue.write(e, pi(t, 11), n);
}
function dM(t) {
  let e;
  if (t[0] === 128) e = !0;
  else if (t[0] === 255) e = !1;
  else return null;
  const n = [];
  let i;
  for (i = t.length - 1; i > 0; i--) {
    const a = t[i];
    e ? n.push(a) : n.push(255 - a);
  }
  let r = 0;
  const s = n.length;
  for (i = 0; i < s; i++)
    r += n[i] * Math.pow(256, i);
  return e ? r : -1 * r;
}
function ai(t, e, n) {
  if (t = t.subarray(e, e + n), e = 0, t[e] & 128)
    return dM(t);
  {
    for (; e < t.length && t[e] === 32; ) e++;
    const i = cM(_w(t, 32, e, t.length), t.length, t.length);
    for (; e < i && t[e] === 0; ) e++;
    return i === e ? 0 : parseInt(Ue.toString(t.subarray(e, i)), 8);
  }
}
function Cr(t, e, n, i) {
  return Ue.toString(t.subarray(e, _w(t, 0, e, e + n)), i);
}
function Yu(t) {
  const e = Ue.byteLength(t);
  let n = Math.floor(Math.log(e) / Math.log(10)) + 1;
  return e + n >= Math.pow(10, n) && n++, e + n + t;
}
const { Writable: hM, Readable: mM, getStreamError: Ew } = xw, gM = Qx, Aw = Ka, Tr = vr, bM = Aw.alloc(0), yM = 4 * 1024 * 1024;
class vM {
  constructor() {
    this.buffered = 0, this.shifted = 0, this.queue = new gM(), this._offset = 0;
  }
  push(e) {
    this.buffered += e.byteLength, this.queue.push(e);
  }
  shiftFirst(e) {
    return this.buffered === 0 ? null : this._next(e);
  }
  shift(e) {
    if (e > this.buffered) return null;
    if (e === 0) return bM;
    let n = this._next(e);
    if (e === n.byteLength) return n;
    const i = [n];
    for (; (e -= n.byteLength) > 0; )
      n = this._next(e), i.push(n);
    return Aw.concat(i);
  }
  _next(e) {
    const n = this.queue.peek(), i = n.byteLength - this._offset;
    if (e >= i) {
      const r = this._offset ? n.subarray(this._offset, n.byteLength) : n;
      return this.queue.shift(), this._offset = 0, this.buffered -= i, this.shifted += i, r;
    }
    return this.buffered -= e, this.shifted += e, n.subarray(this._offset, this._offset += e);
  }
}
class xM extends mM {
  constructor(e, n, i) {
    super(), this.header = n, this.offset = i, this._parent = e;
  }
  _read(e) {
    this.header.size === 0 && this.push(null), this._parent._stream === this && this._parent._update(), e(null);
  }
  _predestroy() {
    this._parent.destroy(Ew(this));
  }
  _detach() {
    this._parent._stream === this && (this._parent._stream = null, this._parent._missing = Tw(this.header.size), this._parent._update());
  }
  _destroy(e) {
    this._detach(), e(null);
  }
}
class wM extends hM {
  constructor(e) {
    super(e), e || (e = {}), this._buffer = new vM(), this._offset = 0, this._header = null, this._stream = null, this._missing = 0, this._longHeader = !1, this._callback = Zu, this._locked = !1, this._finished = !1, this._pax = null, this._paxGlobal = null, this._gnuLongPath = null, this._gnuLongLinkPath = null, this._filenameEncoding = e.filenameEncoding || "utf-8", this._allowUnknownFormat = !!e.allowUnknownFormat, this._unlockBound = this._unlock.bind(this);
  }
  _unlock(e) {
    if (this._locked = !1, e) {
      this.destroy(e), this._continueWrite(e);
      return;
    }
    this._update();
  }
  _consumeHeader() {
    if (this._locked) return !1;
    this._offset = this._buffer.shifted;
    try {
      this._header = Tr.decode(this._buffer.shift(512), this._filenameEncoding, this._allowUnknownFormat);
    } catch (e) {
      return this._continueWrite(e), !1;
    }
    if (!this._header) return !0;
    switch (this._header.byteOffset = this._buffer.shifted, this._header.type) {
      case "gnu-long-path":
      case "gnu-long-link-path":
      case "pax-global-header":
      case "pax-header":
        return this._longHeader = !0, this._missing = this._header.size, this._missing > yM ? (this._continueWrite(new Error("Header exceeds max size")), !1) : !0;
    }
    return this._locked = !0, this._applyLongHeaders(), this._header.size >= 0 ? this._header.size === 0 || this._header.type === "directory" ? (this.emit("entry", this._header, this._createStream(), this._unlockBound), !0) : (this._stream = this._createStream(), this._missing = this._header.size, this.emit("entry", this._header, this._stream, this._unlockBound), !0) : (this._continueWrite(new Error("Invalid header")), !1);
  }
  _applyLongHeaders() {
    this._gnuLongPath && (this._header.name = this._gnuLongPath, this._gnuLongPath = null), this._gnuLongLinkPath && (this._header.linkname = this._gnuLongLinkPath, this._gnuLongLinkPath = null), this._pax && (this._pax.path && (this._header.name = this._pax.path), this._pax.linkpath && (this._header.linkname = this._pax.linkpath), this._pax.size && (this._header.size = parseInt(this._pax.size, 10)), this._header.pax = this._pax, this._pax = null);
  }
  _decodeLongHeader(e) {
    switch (this._header.type) {
      case "gnu-long-path":
        this._gnuLongPath = Tr.decodeLongPath(e, this._filenameEncoding);
        break;
      case "gnu-long-link-path":
        this._gnuLongLinkPath = Tr.decodeLongPath(e, this._filenameEncoding);
        break;
      case "pax-global-header":
        this._paxGlobal = Tr.decodePax(e);
        break;
      case "pax-header":
        this._pax = this._paxGlobal === null ? Tr.decodePax(e) : Object.assign({}, this._paxGlobal, Tr.decodePax(e));
        break;
    }
  }
  _consumeLongHeader() {
    this._longHeader = !1, this._missing = Tw(this._header.size);
    const e = this._buffer.shift(this._header.size);
    try {
      this._decodeLongHeader(e);
    } catch (n) {
      return this._continueWrite(n), !1;
    }
    return !0;
  }
  _consumeStream() {
    const e = this._buffer.shiftFirst(this._missing);
    if (e === null) return !1;
    this._missing -= e.byteLength;
    const n = this._stream.push(e);
    return this._missing === 0 ? (this._stream.push(null), n && this._stream._detach(), n && this._locked === !1) : n;
  }
  _createStream() {
    return new xM(this, this._header, this._offset);
  }
  _update() {
    for (; this._buffer.buffered > 0 && !this.destroying; ) {
      if (this._missing > 0) {
        if (this._stream !== null) {
          if (this._consumeStream() === !1) return;
          continue;
        }
        if (this._longHeader === !0) {
          if (this._missing > this._buffer.buffered) break;
          if (this._consumeLongHeader() === !1) return !1;
          continue;
        }
        const e = this._buffer.shiftFirst(this._missing);
        e !== null && (this._missing -= e.byteLength);
        continue;
      }
      if (this._buffer.buffered < 512) break;
      if (this._stream !== null || this._consumeHeader() === !1) return;
    }
    this._continueWrite(null);
  }
  _continueWrite(e) {
    const n = this._callback;
    this._callback = Zu, n(e);
  }
  _write(e, n) {
    this._callback = n, this._buffer.push(e), this._update();
  }
  _final(e) {
    this._finished = this._missing === 0 && this._buffer.buffered === 0, e(this._finished ? null : new Error("Unexpected end of data"));
  }
  _predestroy() {
    this._continueWrite(null);
  }
  _destroy(e) {
    this._stream && this._stream.destroy(Ew(this)), e(null);
  }
  [Symbol.asyncIterator]() {
    let e = null, n = null, i = null, r = null, s = null;
    const a = this;
    return this.on("entry", l), this.on("error", (d) => {
      e = d;
    }), this.on("close", u), {
      [Symbol.asyncIterator]() {
        return this;
      },
      next() {
        return new Promise(c);
      },
      return() {
        return p(null);
      },
      throw(d) {
        return p(d);
      }
    };
    function o(d) {
      if (!s) return;
      const b = s;
      s = null, b(d);
    }
    function c(d, b) {
      if (e)
        return b(e);
      if (r) {
        d({ value: r, done: !1 }), r = null;
        return;
      }
      n = d, i = b, o(null), a._finished && n && (n({ value: void 0, done: !0 }), n = i = null);
    }
    function l(d, b, x) {
      s = x, b.on("error", Zu), n ? (n({ value: b, done: !1 }), n = i = null) : r = b;
    }
    function u() {
      o(e), n && (e ? i(e) : n({ value: void 0, done: !0 }), n = i = null);
    }
    function p(d) {
      return a.destroy(d), o(d), new Promise((b, x) => {
        if (a.destroyed) return b({ value: void 0, done: !0 });
        a.once("close", function() {
          d ? x(d) : b({ value: void 0, done: !0 });
        });
      });
    }
  }
}
var _M = function(e) {
  return new wM(e);
};
function Zu() {
}
function Tw(t) {
  return t &= 511, t && 512 - t;
}
var Yp = { exports: {} };
const kg = {
  // just for envs without fs
  S_IFMT: 61440,
  S_IFDIR: 16384,
  S_IFCHR: 8192,
  S_IFBLK: 24576,
  S_IFIFO: 4096,
  S_IFLNK: 40960
};
try {
  Yp.exports = require("fs").constants || kg;
} catch {
  Yp.exports = kg;
}
var SM = Yp.exports;
const { Readable: EM, Writable: AM, getStreamError: Rw } = xw, br = Ka, Rr = SM, To = vr, TM = 493, RM = 420, Ow = br.alloc(1024);
class OM extends AM {
  constructor(e, n, i) {
    super({ mapWritable: IM, eagerOpen: !0 }), this.written = 0, this.header = n, this._callback = i, this._linkname = null, this._isLinkname = n.type === "symlink" && !n.linkname, this._isVoid = n.type !== "file" && n.type !== "contiguous-file", this._finished = !1, this._pack = e, this._openCallback = null, this._pack._stream === null ? this._pack._stream = this : this._pack._pending.push(this);
  }
  _open(e) {
    this._openCallback = e, this._pack._stream === this && this._continueOpen();
  }
  _continuePack(e) {
    if (this._callback === null) return;
    const n = this._callback;
    this._callback = null, n(e);
  }
  _continueOpen() {
    this._pack._stream === null && (this._pack._stream = this);
    const e = this._openCallback;
    if (this._openCallback = null, e !== null) {
      if (this._pack.destroying) return e(new Error("pack stream destroyed"));
      if (this._pack._finalized) return e(new Error("pack stream is already finalized"));
      this._pack._stream = this, this._isLinkname || this._pack._encode(this.header), this._isVoid && (this._finish(), this._continuePack(null)), e(null);
    }
  }
  _write(e, n) {
    if (this._isLinkname)
      return this._linkname = this._linkname ? br.concat([this._linkname, e]) : e, n(null);
    if (this._isVoid)
      return e.byteLength > 0 ? n(new Error("No body allowed for this entry")) : n();
    if (this.written += e.byteLength, this._pack.push(e)) return n();
    this._pack._drain = n;
  }
  _finish() {
    this._finished || (this._finished = !0, this._isLinkname && (this.header.linkname = this._linkname ? br.toString(this._linkname, "utf-8") : "", this._pack._encode(this.header)), Pw(this._pack, this.header.size), this._pack._done(this));
  }
  _final(e) {
    if (this.written !== this.header.size)
      return e(new Error("Size mismatch"));
    this._finish(), e(null);
  }
  _getError() {
    return Rw(this) || new Error("tar entry destroyed");
  }
  _predestroy() {
    this._pack.destroy(this._getError());
  }
  _destroy(e) {
    this._pack._done(this), this._continuePack(this._finished ? null : this._getError()), e();
  }
}
class PM extends EM {
  constructor(e) {
    super(e), this._drain = Xu, this._finalized = !1, this._finalizing = !1, this._pending = [], this._stream = null;
  }
  entry(e, n, i) {
    if (this._finalized || this.destroying) throw new Error("already finalized or destroyed");
    typeof n == "function" && (i = n, n = null), i || (i = Xu), (!e.size || e.type === "symlink") && (e.size = 0), e.type || (e.type = kM(e.mode)), e.mode || (e.mode = e.type === "directory" ? TM : RM), e.uid || (e.uid = 0), e.gid || (e.gid = 0), e.mtime || (e.mtime = /* @__PURE__ */ new Date()), typeof n == "string" && (n = br.from(n));
    const r = new OM(this, e, i);
    return br.isBuffer(n) ? (e.size = n.byteLength, r.write(n), r.end(), r) : (r._isVoid, r);
  }
  finalize() {
    if (this._stream || this._pending.length > 0) {
      this._finalizing = !0;
      return;
    }
    this._finalized || (this._finalized = !0, this.push(Ow), this.push(null));
  }
  _done(e) {
    e === this._stream && (this._stream = null, this._finalizing && this.finalize(), this._pending.length && this._pending.shift()._continueOpen());
  }
  _encode(e) {
    if (!e.pax) {
      const n = To.encode(e);
      if (n) {
        this.push(n);
        return;
      }
    }
    this._encodePax(e);
  }
  _encodePax(e) {
    const n = To.encodePax({
      name: e.name,
      linkname: e.linkname,
      pax: e.pax
    }), i = {
      name: "PaxHeader",
      mode: e.mode,
      uid: e.uid,
      gid: e.gid,
      size: n.byteLength,
      mtime: e.mtime,
      type: "pax-header",
      linkname: e.linkname && "PaxHeader",
      uname: e.uname,
      gname: e.gname,
      devmajor: e.devmajor,
      devminor: e.devminor
    };
    this.push(To.encode(i)), this.push(n), Pw(this, n.byteLength), i.size = e.size, i.type = e.type, this.push(To.encode(i));
  }
  _doDrain() {
    const e = this._drain;
    this._drain = Xu, e();
  }
  _predestroy() {
    const e = Rw(this);
    for (this._stream && this._stream.destroy(e); this._pending.length; ) {
      const n = this._pending.shift();
      n.destroy(e), n._continueOpen();
    }
    this._doDrain();
  }
  _read(e) {
    this._doDrain(), e();
  }
}
var CM = function(e) {
  return new PM(e);
};
function kM(t) {
  switch (t & Rr.S_IFMT) {
    case Rr.S_IFBLK:
      return "block-device";
    case Rr.S_IFCHR:
      return "character-device";
    case Rr.S_IFDIR:
      return "directory";
    case Rr.S_IFIFO:
      return "fifo";
    case Rr.S_IFLNK:
      return "symlink";
  }
  return "file";
}
function Xu() {
}
function Pw(t, e) {
  e &= 511, e && t.push(Ow.subarray(0, 512 - e));
}
function IM(t) {
  return br.isBuffer(t) ? t : br.from(t);
}
rd.extract = _M;
rd.pack = CM;
/**
 * TAR Format Plugin
 *
 * @module plugins/tar
 * @license [MIT]{@link https://github.com/archiverjs/node-archiver/blob/master/LICENSE}
 * @copyright (c) 2012-2014 Chris Talkington, contributors.
 */
var DM = Ht, jM = rd, Cw = Va, Qn = function(t) {
  if (!(this instanceof Qn))
    return new Qn(t);
  t = this.options = Cw.defaults(t, {
    gzip: !1
  }), typeof t.gzipOptions != "object" && (t.gzipOptions = {}), this.supports = {
    directory: !0,
    symlink: !0
  }, this.engine = jM.pack(t), this.compressor = !1, t.gzip && (this.compressor = DM.createGzip(t.gzipOptions), this.compressor.on("error", this._onCompressorError.bind(this)));
};
Qn.prototype._onCompressorError = function(t) {
  this.engine.emit("error", t);
};
Qn.prototype.append = function(t, e, n) {
  var i = this;
  e.mtime = e.date;
  function r(a, o) {
    if (a) {
      n(a);
      return;
    }
    i.engine.entry(e, o, function(c) {
      n(c, e);
    });
  }
  if (e.sourceType === "buffer")
    r(null, t);
  else if (e.sourceType === "stream" && e.stats) {
    e.size = e.stats.size;
    var s = i.engine.entry(e, function(a) {
      n(a, e);
    });
    t.pipe(s);
  } else e.sourceType === "stream" && Cw.collectStream(t, r);
};
Qn.prototype.finalize = function() {
  this.engine.finalize();
};
Qn.prototype.on = function() {
  return this.engine.on.apply(this.engine, arguments);
};
Qn.prototype.pipe = function(t, e) {
  return this.compressor ? this.engine.pipe.apply(this.engine, [this.compressor]).pipe(t, e) : this.engine.pipe.apply(this.engine, arguments);
};
Qn.prototype.unpipe = function() {
  return this.compressor ? this.compressor.unpipe.apply(this.compressor, arguments) : this.engine.unpipe.apply(this.engine, arguments);
};
var LM = Qn;
function NM(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
const FM = new Int32Array([
  0,
  1996959894,
  3993919788,
  2567524794,
  124634137,
  1886057615,
  3915621685,
  2657392035,
  249268274,
  2044508324,
  3772115230,
  2547177864,
  162941995,
  2125561021,
  3887607047,
  2428444049,
  498536548,
  1789927666,
  4089016648,
  2227061214,
  450548861,
  1843258603,
  4107580753,
  2211677639,
  325883990,
  1684777152,
  4251122042,
  2321926636,
  335633487,
  1661365465,
  4195302755,
  2366115317,
  997073096,
  1281953886,
  3579855332,
  2724688242,
  1006888145,
  1258607687,
  3524101629,
  2768942443,
  901097722,
  1119000684,
  3686517206,
  2898065728,
  853044451,
  1172266101,
  3705015759,
  2882616665,
  651767980,
  1373503546,
  3369554304,
  3218104598,
  565507253,
  1454621731,
  3485111705,
  3099436303,
  671266974,
  1594198024,
  3322730930,
  2970347812,
  795835527,
  1483230225,
  3244367275,
  3060149565,
  1994146192,
  31158534,
  2563907772,
  4023717930,
  1907459465,
  112637215,
  2680153253,
  3904427059,
  2013776290,
  251722036,
  2517215374,
  3775830040,
  2137656763,
  141376813,
  2439277719,
  3865271297,
  1802195444,
  476864866,
  2238001368,
  4066508878,
  1812370925,
  453092731,
  2181625025,
  4111451223,
  1706088902,
  314042704,
  2344532202,
  4240017532,
  1658658271,
  366619977,
  2362670323,
  4224994405,
  1303535960,
  984961486,
  2747007092,
  3569037538,
  1256170817,
  1037604311,
  2765210733,
  3554079995,
  1131014506,
  879679996,
  2909243462,
  3663771856,
  1141124467,
  855842277,
  2852801631,
  3708648649,
  1342533948,
  654459306,
  3188396048,
  3373015174,
  1466479909,
  544179635,
  3110523913,
  3462522015,
  1591671054,
  702138776,
  2966460450,
  3352799412,
  1504918807,
  783551873,
  3082640443,
  3233442989,
  3988292384,
  2596254646,
  62317068,
  1957810842,
  3939845945,
  2647816111,
  81470997,
  1943803523,
  3814918930,
  2489596804,
  225274430,
  2053790376,
  3826175755,
  2466906013,
  167816743,
  2097651377,
  4027552580,
  2265490386,
  503444072,
  1762050814,
  4150417245,
  2154129355,
  426522225,
  1852507879,
  4275313526,
  2312317920,
  282753626,
  1742555852,
  4189708143,
  2394877945,
  397917763,
  1622183637,
  3604390888,
  2714866558,
  953729732,
  1340076626,
  3518719985,
  2797360999,
  1068828381,
  1219638859,
  3624741850,
  2936675148,
  906185462,
  1090812512,
  3747672003,
  2825379669,
  829329135,
  1181335161,
  3412177804,
  3160834842,
  628085408,
  1382605366,
  3423369109,
  3138078467,
  570562233,
  1426400815,
  3317316542,
  2998733608,
  733239954,
  1555261956,
  3268935591,
  3050360625,
  752459403,
  1541320221,
  2607071920,
  3965973030,
  1969922972,
  40735498,
  2617837225,
  3943577151,
  1913087877,
  83908371,
  2512341634,
  3803740692,
  2075208622,
  213261112,
  2463272603,
  3855990285,
  2094854071,
  198958881,
  2262029012,
  4057260610,
  1759359992,
  534414190,
  2176718541,
  4139329115,
  1873836001,
  414664567,
  2282248934,
  4279200368,
  1711684554,
  285281116,
  2405801727,
  4167216745,
  1634467795,
  376229701,
  2685067896,
  3608007406,
  1308918612,
  956543938,
  2808555105,
  3495958263,
  1231636301,
  1047427035,
  2932959818,
  3654703836,
  1088359270,
  936918e3,
  2847714899,
  3736837829,
  1202900863,
  817233897,
  3183342108,
  3401237130,
  1404277552,
  615818150,
  3134207493,
  3453421203,
  1423857449,
  601450431,
  3009837614,
  3294710456,
  1567103746,
  711928724,
  3020668471,
  3272380065,
  1510334235,
  755167117
]);
function kw(t) {
  if (Buffer.isBuffer(t))
    return t;
  if (typeof t == "number")
    return Buffer.alloc(t);
  if (typeof t == "string")
    return Buffer.from(t);
  throw new Error("input must be buffer, number, or string, received " + typeof t);
}
function MM(t) {
  const e = kw(4);
  return e.writeInt32BE(t, 0), e;
}
function dd(t, e) {
  t = kw(t), Buffer.isBuffer(e) && (e = e.readUInt32BE(0));
  let n = ~~e ^ -1;
  for (var i = 0; i < t.length; i++)
    n = FM[(n ^ t[i]) & 255] ^ n >>> 8;
  return n ^ -1;
}
function hd() {
  return MM(dd.apply(null, arguments));
}
hd.signed = function() {
  return dd.apply(null, arguments);
};
hd.unsigned = function() {
  return dd.apply(null, arguments) >>> 0;
};
var $M = hd;
const BM = /* @__PURE__ */ NM($M);
var UM = BM;
/**
 * JSON Format Plugin
 *
 * @module plugins/json
 * @license [MIT]{@link https://github.com/archiverjs/node-archiver/blob/master/LICENSE}
 * @copyright (c) 2012-2014 Chris Talkington, contributors.
 */
var zM = xt.inherits, Iw = fs.Transform, WM = UM, Dw = Va, ki = function(t) {
  if (!(this instanceof ki))
    return new ki(t);
  t = this.options = Dw.defaults(t, {}), Iw.call(this, t), this.supports = {
    directory: !0,
    symlink: !0
  }, this.files = [];
};
zM(ki, Iw);
ki.prototype._transform = function(t, e, n) {
  n(null, t);
};
ki.prototype._writeStringified = function() {
  var t = JSON.stringify(this.files);
  this.write(t);
};
ki.prototype.append = function(t, e, n) {
  var i = this;
  e.crc32 = 0;
  function r(s, a) {
    if (s) {
      n(s);
      return;
    }
    e.size = a.length || 0, e.crc32 = WM.unsigned(a), i.files.push(e), n(null, e);
  }
  e.sourceType === "buffer" ? r(null, t) : e.sourceType === "stream" && Dw.collectStream(t, r);
};
ki.prototype.finalize = function() {
  this._writeStringified(), this.end();
};
var qM = ki;
/**
 * Archiver Vending
 *
 * @ignore
 * @license [MIT]{@link https://github.com/archiverjs/node-archiver/blob/master/LICENSE}
 * @copyright (c) 2012-2014 Chris Talkington, contributors.
 */
var GM = vL, ia = {}, Mi = function(t, e) {
  return Mi.create(t, e);
};
Mi.create = function(t, e) {
  if (ia[t]) {
    var n = new GM(t, e);
    return n.setFormat(t), n.setModule(new ia[t](e)), n;
  } else
    throw new Error("create(" + t + "): format not registered");
};
Mi.registerFormat = function(t, e) {
  if (ia[t])
    throw new Error("register(" + t + "): format already registered");
  if (typeof e != "function")
    throw new Error("register(" + t + "): format module invalid");
  if (typeof e.prototype.append != "function" || typeof e.prototype.finalize != "function")
    throw new Error("register(" + t + "): format module missing methods");
  ia[t] = e;
};
Mi.isRegisteredFormat = function(t) {
  return !!ia[t];
};
Mi.registerFormat("zip", eN);
Mi.registerFormat("tar", LM);
Mi.registerFormat("json", qM);
var HM = Mi;
const VM = /* @__PURE__ */ Dc(HM), Ig = {
  none: {
    enabled: !1,
    preset: "none",
    medianSize: 0,
    blurSigma: 0,
    blurPrecision: "float",
    sharpenSigma: 0,
    sharpenM1: 1,
    sharpenM2: 3,
    sharpenX1: 2,
    sharpenY2: 10,
    sharpenY3: 20,
    brightness: 1,
    saturation: 1,
    contrast: 1,
    hue: 0,
    tintEnabled: !1,
    tintRGB: { r: 255, g: 255, b: 255 },
    normalise: !1,
    normaliseLower: 1,
    normaliseUpper: 99,
    threshold: void 0,
    flip: !1,
    flop: !1
  },
  natural: {
    enabled: !0,
    preset: "natural",
    medianSize: 3,
    blurSigma: 0.6,
    blurPrecision: "float",
    sharpenSigma: 1,
    sharpenM1: 1,
    sharpenM2: 2.5,
    sharpenX1: 2,
    sharpenY2: 8,
    sharpenY3: 16,
    brightness: 1.05,
    saturation: 0.95,
    contrast: 1,
    hue: 0,
    tintEnabled: !1,
    tintRGB: { r: 255, g: 255, b: 255 },
    normalise: !0,
    normaliseLower: 1,
    normaliseUpper: 99,
    threshold: void 0,
    flip: !1,
    flop: !1
  },
  clean: {
    enabled: !0,
    preset: "clean",
    medianSize: 3,
    blurSigma: 0.4,
    blurPrecision: "float",
    sharpenSigma: 1.5,
    sharpenM1: 1.2,
    sharpenM2: 3,
    sharpenX1: 2,
    sharpenY2: 10,
    sharpenY3: 20,
    brightness: 1.08,
    saturation: 0.9,
    contrast: 1.02,
    hue: 0,
    tintEnabled: !1,
    tintRGB: { r: 255, g: 255, b: 255 },
    normalise: !0,
    normaliseLower: 0.5,
    normaliseUpper: 99.5,
    threshold: void 0,
    flip: !1,
    flop: !1
  },
  film: {
    enabled: !0,
    preset: "film",
    medianSize: 0,
    blurSigma: 0.8,
    blurPrecision: "float",
    sharpenSigma: 0.8,
    sharpenM1: 0.8,
    sharpenM2: 2,
    sharpenX1: 3,
    sharpenY2: 12,
    sharpenY3: 24,
    brightness: 1.02,
    saturation: 0.85,
    contrast: 1.05,
    hue: 0,
    tintEnabled: !0,
    tintRGB: { r: 255, g: 245, b: 230 },
    normalise: !1,
    normaliseLower: 1,
    normaliseUpper: 99,
    threshold: void 0,
    flip: !1,
    flop: !1
  },
  ios: {
    enabled: !0,
    preset: "ios",
    medianSize: 3,
    blurSigma: 0.3,
    blurPrecision: "float",
    sharpenSigma: 2,
    sharpenM1: 1.5,
    sharpenM2: 4,
    sharpenX1: 1.5,
    sharpenY2: 8,
    sharpenY3: 16,
    brightness: 1.1,
    saturation: 0.88,
    contrast: 1.03,
    hue: 0,
    tintEnabled: !0,
    tintRGB: { r: 245, g: 248, b: 255 },
    normalise: !0,
    normaliseLower: 1,
    normaliseUpper: 99,
    threshold: void 0,
    flip: !1,
    flop: !1
  },
  android: {
    enabled: !0,
    preset: "android",
    medianSize: 3,
    blurSigma: 0.5,
    blurPrecision: "float",
    sharpenSigma: 1.3,
    sharpenM1: 1,
    sharpenM2: 3,
    sharpenX1: 2,
    sharpenY2: 10,
    sharpenY3: 20,
    brightness: 1.06,
    saturation: 1.05,
    contrast: 1.08,
    hue: 0,
    tintEnabled: !0,
    tintRGB: { r: 255, g: 250, b: 240 },
    normalise: !0,
    normaliseLower: 1,
    normaliseUpper: 99,
    threshold: void 0,
    flip: !1,
    flop: !1
  }
};
async function KM(t, e, n = {}) {
  var D;
  const i = {
    // 保持原始尺寸，不缩放
    targetWidth: void 0,
    // 不旋转
    rotationRange: 0,
    // 低噪声强度，破坏AI特征但不明显
    grainIntensity: 0.8,
    // 中等JPEG质量，有压缩但可接受
    jpegQuality: 95,
    // 低非均匀程度
    nonUniformFactor: 0.15,
    adaptiveNoise: !0,
    // 低频域噪声
    freqNoiseStrength: 0.3,
    // 轻微模糊（sharp要求最小0.3）
    blurRadius: 0.3,
    // 禁用所有可见物理特征
    lensDistortion: 0,
    chromaticAberration: 0,
    vignetteStrength: 0,
    microBlurVariance: 0,
    chromaSubsampling: "4:2:0",
    // 禁用热像素
    addHotPixels: !1,
    simulateBayer: !1,
    // 默认网感滤镜：自然风格
    vibeBlur: {
      enabled: !0,
      preset: "natural"
    },
    ...n
  }, r = (D = i.vibeBlur) != null && D.preset ? { ...Ig[i.vibeBlur.preset], ...i.vibeBlur } : { ...Ig.none, ...i.vibeBlur };
  console.log(`🔒 开始处理: ${Ce.basename(t)}`), r.enabled && console.log(`🎨 网感滤镜: ${r.preset}`);
  let s = Zn(t, {
    failOnError: !1,
    limitInputPixels: 268402689
  });
  const a = await s.metadata(), o = a.width, c = a.height, l = i.targetWidth || o, u = Math.round(l), p = Math.round(c * (l / o)), d = (Math.random() - 0.5) * 2 * i.rotationRange;
  console.log(`🔄 旋转角度: ${d.toFixed(3)}°`), s = s.rotate(d, {
    background: { r: 255, g: 255, b: 255 }
  }).resize(u, p, {
    kernel: Zn.kernel.lanczos3,
    fit: "cover",
    withoutEnlargement: !1
  }), i.blurRadius > 0 && (s = s.blur(i.blurRadius)), console.log(`📐 处理后尺寸: ${u}x${p}`);
  const { data: b, info: x } = await s.raw().toBuffer({
    resolveWithObject: !0
  }), v = x.width, y = x.height, f = x.channels;
  console.log(`📊 原始像素数据大小: ${b.length} bytes`);
  const h = await YM(b, {
    width: v,
    height: y,
    channels: f,
    grainIntensity: i.grainIntensity,
    nonUniformFactor: i.nonUniformFactor,
    adaptiveNoise: i.adaptiveNoise,
    freqNoiseStrength: i.freqNoiseStrength,
    lensDistortion: i.lensDistortion,
    chromaticAberration: i.chromaticAberration,
    vignetteStrength: i.vignetteStrength,
    microBlurVariance: i.microBlurVariance,
    addHotPixels: i.addHotPixels,
    simulateBayer: i.simulateBayer
  });
  console.log(`📊 处理后像素数据大小: ${h.length} bytes`);
  let g = h;
  r.enabled && (console.log(`🎨 应用网感滤镜: ${r.preset}`), g = await ZM(h, v, y, f, r));
  let A = Zn(g, {
    raw: { width: v, height: y, channels: f }
  });
  r.enabled && r.tintEnabled && (A = A.tint(r.tintRGB)), r.enabled && r.threshold !== void 0 && (A = A.threshold(r.threshold)), r.enabled && r.flip && (A = A.flip()), r.enabled && r.flop && (A = A.flop()), await A.jpeg({
    quality: i.jpegQuality,
    chromaSubsampling: i.chromaSubsampling,
    mozjpeg: !1,
    trellisQuantisation: !1,
    overshootDeringing: !1,
    optimizeScans: !1,
    progressive: !1
  }).toFile(e);
  const C = dt.statSync(e);
  console.log(`📦 输出文件大小: ${C.size} bytes`);
  const V = await Zn(e).metadata(), K = {
    exif: !!V.exif,
    icc: !!V.icc,
    iptc: !!V.iptc,
    xmp: !!V.xmp,
    width: V.width,
    height: V.height
  }, L = !K.exif && !K.icc && !K.iptc && !K.xmp, X = {
    success: !0,
    inputPath: t,
    outputPath: e,
    originalDimensions: { width: o, height: c },
    outputDimensions: { width: v, height: y },
    rotationAngle: parseFloat(d.toFixed(4)),
    securityCheck: {
      metadataClean: L,
      residualMeta: K,
      quantizationTableReset: !0
    },
    defenseLevels: {
      L1_MetadataStripping: !0,
      L2_NonUniformNoise: !0,
      L3_FrequencyDisruption: !0,
      L4_PhysicalSimulation: !0
    },
    vibeApplied: r.enabled,
    vibePreset: r.preset
  };
  return console.log(`✅ 处理完成: ${Ce.basename(e)}`), console.log(
    `   尺寸: ${o}x${c} → ${v}x${y}`
  ), console.log(`   旋转: ${d.toFixed(2)}°`), console.log(`   元数据: ${L ? "✅ 已清除" : "⚠️ 有残留"}`), console.log("   防御: L1✓ L2✓ L3✓ L4✓"), r.enabled && console.log(`   网感滤镜: ${r.preset} ✓`), X;
}
async function YM(t, e) {
  let n = new Uint8Array(t);
  return e.lensDistortion > 0 && (n = QM(
    n,
    e.width,
    e.height,
    e.channels,
    e.lensDistortion
  )), e.chromaticAberration > 0 && (n = e3(
    n,
    e.width,
    e.height,
    e.channels,
    e.chromaticAberration
  )), e.vignetteStrength > 0 && (n = t3(
    n,
    e.width,
    e.height,
    e.channels,
    e.vignetteStrength
  )), e.microBlurVariance > 0 && (n = n3(
    n,
    e.width,
    e.height,
    e.channels,
    e.microBlurVariance
  )), n = XM(n, e.width, e.height, e.channels, {
    intensity: e.grainIntensity,
    factor: e.nonUniformFactor,
    adaptive: e.adaptiveNoise,
    addHotPixels: e.addHotPixels,
    simulateBayer: e.simulateBayer
  }), e.freqNoiseStrength > 0 && (n = JM(
    n,
    e.width,
    e.height,
    e.channels,
    e.freqNoiseStrength
  )), n;
}
async function ZM(t, e, n, i, r) {
  let s = Zn(t, {
    raw: { width: e, height: n, channels: i }
  });
  r.medianSize >= 3 && r.medianSize % 2 === 1 && (s = s.median(r.medianSize)), r.blurSigma > 0 && (s = s.blur({
    sigma: r.blurSigma,
    precision: r.blurPrecision
  })), r.sharpenSigma > 0 && (s = s.sharpen({
    sigma: r.sharpenSigma,
    m1: r.sharpenM1,
    m2: r.sharpenM2,
    x1: r.sharpenX1,
    y2: r.sharpenY2,
    y3: r.sharpenY3
  }));
  const a = {};
  if (r.brightness !== 1 && (a.brightness = r.brightness), r.saturation !== 1 && (a.saturation = r.saturation), r.hue !== 0 && (a.hue = r.hue), Object.keys(a).length > 0 && (s = s.modulate(a)), r.contrast !== 1) {
    const c = r.contrast > 1 ? 2 : 1.5;
    s = s.gamma(c);
  }
  r.normalise && (r.normaliseLower !== 1 || r.normaliseUpper !== 99 ? s = s.normalise({
    lower: r.normaliseLower,
    upper: r.normaliseUpper
  }) : s = s.normalise());
  const o = await s.raw().toBuffer();
  return new Uint8Array(o);
}
function XM(t, e, n, i, r) {
  const { intensity: s, factor: a, adaptive: o, addHotPixels: c, simulateBayer: l } = r, u = new Uint8Array(t.length);
  for (let p = 0; p < n; p++)
    for (let d = 0; d < e; d++) {
      const b = (p * e + d) * i;
      let x = 128;
      if (o) {
        x = 0;
        for (let y = 0; y < Math.min(i, 3); y++)
          x += t[b + y];
        x /= Math.min(i, 3);
      }
      const v = o ? s * (1 + (255 - x) / 255 * a * 3) : s;
      for (let y = 0; y < Math.min(i, 3); y++) {
        let f = jw() * v * 2.55;
        l && (y === 0 || y === 2) && (f *= 1.414), c && Math.random() < 5e-4 && (f += (Math.random() > 0.5 ? 1 : -1) * s * 8);
        const h = t[b + y] + f;
        u[b + y] = hl(h);
      }
      i === 4 && (u[b + 3] = t[b + 3]);
    }
  return u;
}
function JM(t, e, n, i, r) {
  const s = new Uint8Array(t);
  for (let a = 0; a < n; a++)
    for (let o = 0; o < e; o++) {
      const c = (a * e + o) * i, l = o / e - 0.5, u = a / n - 0.5, p = Math.sqrt(l * l + u * u) + 1e-3, d = r * 2.55 / (p * 8 + 1);
      for (let b = 0; b < Math.min(i, 3); b++) {
        const x = b * 0.15, v = jw() * d * (1 + x), y = s[c + b] + v;
        s[c + b] = hl(y);
      }
    }
  return s;
}
function QM(t, e, n, i, r) {
  const s = new Uint8Array(t.length), a = e / 2, o = n / 2;
  for (let c = 0; c < n; c++)
    for (let l = 0; l < e; l++) {
      const u = (l - a) / a, p = (c - o) / o, d = u * u + p * p, b = 1 + r * d, x = a + (l - a) * b, v = o + (c - o) * b;
      i3(t, s, e, n, i, l, c, x, v);
    }
  return s;
}
function e3(t, e, n, i, r) {
  if (i < 3) return t;
  const s = new Uint8Array(t.length), a = e / 2, o = n / 2, c = Math.sqrt(a * a + o * o);
  for (let l = 0; l < n; l++)
    for (let u = 0; u < e; u++) {
      const p = (l * e + u) * i, d = u - a, b = l - o, v = Math.sqrt(d * d + b * b) / c, y = r * v * 2, f = Math.atan2(b, d), h = Math.cos(f) * y, g = Math.sin(f) * y, A = Ro(u + h, e), C = Ro(l + g, n), V = (Math.floor(C) * e + Math.floor(A)) * i, K = Ro(u - h * 0.7, e), L = Ro(l - g * 0.7, n), X = (Math.floor(L) * e + Math.floor(K)) * i;
      s[p] = t[V], s[p + 1] = t[p + 1], s[p + 2] = t[X + 2], i === 4 && (s[p + 3] = t[p + 3]);
    }
  return s;
}
function t3(t, e, n, i, r) {
  const s = new Uint8Array(t.length), a = e / 2, o = n / 2, c = Math.sqrt(a * a + o * o);
  for (let l = 0; l < n; l++)
    for (let u = 0; u < e; u++) {
      const p = (l * e + u) * i, d = Math.sqrt((u - a) ** 2 + (l - o) ** 2), b = Math.pow(Math.cos(d / c * Math.PI / 2), 4), x = 1 - r * (1 - b);
      for (let v = 0; v < Math.min(i, 3); v++)
        s[p + v] = hl(t[p + v] * x);
      i === 4 && (s[p + 3] = t[p + 3]);
    }
  return s;
}
function n3(t, e, n, i, r) {
  const s = new Uint8Array(t.length), a = r3(e, n, r);
  s.set(t);
  for (let o = 1; o < n - 1; o++)
    for (let c = 1; c < e - 1; c++) {
      const l = (o * e + c) * i;
      if (a[o * e + c] > 0.6)
        for (let u = 0; u < Math.min(i, 3); u++) {
          let p = 0;
          for (let d = -1; d <= 1; d++)
            for (let b = -1; b <= 1; b++)
              p += t[((o + d) * e + (c + b)) * i + u];
          s[l + u] = Math.round(p / 9);
        }
    }
  return s;
}
function jw() {
  let t = 0, e = 0;
  for (; t === 0; ) t = Math.random();
  for (; e === 0; ) e = Math.random();
  return Math.sqrt(-2 * Math.log(t)) * Math.cos(2 * Math.PI * e);
}
function hl(t) {
  return Math.max(0, Math.min(255, Math.round(t)));
}
function Ro(t, e) {
  return Math.max(0, Math.min(e - 1, t));
}
function i3(t, e, n, i, r, s, a, o, c) {
  const l = Math.floor(o), u = Math.floor(c), p = Math.min(l + 1, n - 1), d = Math.min(u + 1, i - 1), b = o - l, x = c - u, v = (a * n + s) * r;
  for (let y = 0; y < r; y++) {
    const f = t[(u * n + l) * r + y], h = t[(u * n + p) * r + y], g = t[(d * n + l) * r + y], A = t[(d * n + p) * r + y], C = f * (1 - b) * (1 - x) + h * b * (1 - x) + g * (1 - b) * x + A * b * x;
    e[v + y] = hl(C);
  }
}
function r3(t, e, n) {
  const i = new Float32Array(t * e);
  for (let r = 0; r < e; r++)
    for (let s = 0; s < t; s++) {
      const a = s / t * Math.PI * 3, o = r / e * Math.PI * 2.5;
      i[r * t + s] = (Math.sin(a) * Math.cos(o) * 0.5 + Math.sin(a * 0.7 + o * 1.3) * 0.3 + 0.5) * n;
    }
  return i;
}
const s3 = new Yw.Agent({
  rejectUnauthorized: !1
});
async function Dg(t, e = 3, n = 1e3) {
  let i = null;
  for (let r = 0; r < e; r++)
    try {
      const s = await Qe.get(t, {
        responseType: "arraybuffer",
        timeout: 3e4,
        httpsAgent: s3
      });
      return Buffer.from(s.data);
    } catch (s) {
      i = s instanceof Error ? s : new Error(String(s)), console.log(`   ⚠️ 第 ${r + 1} 次尝试失败，等待 ${n}ms 后重试...`), r < e - 1 && await new Promise((a) => setTimeout(a, n));
    }
  throw i;
}
class a3 {
  /**
   * 下载目录：优先读应用设置中的自定义导出路径，
   * 未配置时回退到系统「下载」目录下的 comic-downloads 子目录。
   * 每次访问都确保目录存在（自定义路径可能尚未创建）。
   */
  get downloadsDir() {
    const e = Ve.getAppSettings().exportDir, n = e && e.trim() ? e : Ce.join(Oi.getPath("downloads"), "comic-downloads");
    return dt.existsSync(n) || dt.mkdirSync(n, { recursive: !0 }), n;
  }
  constructor() {
    dt.existsSync(this.downloadsDir) || dt.mkdirSync(this.downloadsDir, { recursive: !0 });
  }
  /**
   * 下载单个图片
   * @param url - 图片 URL
   * @param filename - 可选的文件名
   * @param showInFolder - 是否在完成后打开文件夹
   */
  async downloadSingle(e, n, i = !1) {
    if (!e)
      return { success: !1, error: "缺少 url 参数" };
    try {
      const r = await Dg(e), s = Ce.extname(new URL(e).pathname) || ".jpg", a = n ? `${n.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_")}${s}` : `image_${Date.now()}${s}`, o = Ce.join(this.downloadsDir, a);
      return dt.writeFileSync(o, r), i && Ju.showItemInFolder(o), {
        success: !0,
        filename: a,
        filePath: o
      };
    } catch (r) {
      return {
        success: !1,
        error: r instanceof Error ? r.message : "下载失败"
      };
    }
  }
  /**
   * 批量下载图片并打包成 ZIP
   * 支持对指定索引的图片进行脱敏处理
   */
  async downloadBatch(e) {
    const { urls: n, folderName: i, secureIndices: r, vibePreset: s, vibeOptions: a, showInFolder: o = !0 } = e;
    if (!n || !Array.isArray(n) || n.length === 0)
      return { success: !1, error: "缺少 urls 参数或 urls 为空" };
    try {
      const c = Date.now(), l = i ? i.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_") : `images_${c}`, u = Ce.join(this.downloadsDir, `${l}.zip`), p = dt.createWriteStream(u), d = VM("zip", { zlib: { level: 9 } });
      p.on("close", () => {
        console.log(`ZIP 文件创建完成：${u}`);
      }), d.on("error", (y) => {
        throw console.error("ZIP 创建失败:", y), y;
      }), d.pipe(p);
      const b = new Set(r || []), x = Ce.join(this.downloadsDir, `temp_${c}`), v = n.map(async (y, f) => {
        try {
          let h;
          const g = await Dg(y);
          if (b.has(f))
            try {
              dt.existsSync(x) || dt.mkdirSync(x, { recursive: !0 });
              const V = Ce.join(x, `input_${f}.jpg`), K = Ce.join(x, `secure_${f}.jpg`);
              dt.writeFileSync(V, g);
              const L = {};
              (s || a) && (L.vibeBlur = {
                preset: s || "natural",
                enabled: !0,
                ...a
              }), await KM(V, K, L), h = dt.readFileSync(K), dt.unlinkSync(V), dt.unlinkSync(K);
            } catch (V) {
              console.error(`   ⚠️ 图片 ${f + 1} 脱敏失败，使用原图:`, V), h = g;
            }
          else
            h = g;
          const A = Ce.extname(new URL(y).pathname) || ".jpg", C = `image_${String(f + 1).padStart(3, "0")}${A}`;
          return d.append(h, { name: C }), { success: !0, filename: C };
        } catch (h) {
          return console.error(`   ❌ 下载失败 ${y}:`, h), { success: !1, url: y, error: h instanceof Error ? h.message : "下载失败" };
        }
      });
      return await Promise.all(v), await d.finalize(), dt.existsSync(x) && dt.rmSync(x, { recursive: !0, force: !0 }), await new Promise((y, f) => {
        p.on("close", y), p.on("error", f);
      }), o && Ju.showItemInFolder(u), {
        success: !0,
        filename: `${l}.zip`,
        filePath: u,
        securedCount: b.size
      };
    } catch (c) {
      return {
        success: !1,
        error: c instanceof Error ? c.message : "批量下载失败"
      };
    }
  }
}
const jg = new a3();
class o3 {
  /**
   * 转发请求到目标 OpenAI 兼容服务
   * 支持两种模式：
   * 1. JSON body：直接转发
   * 2. multipart/form-data：重建 FormData（含文件）后转发
   */
  async proxy(e) {
    const { method: n, targetUrl: i, headers: r, body: s, formData: a } = e;
    if (!i)
      return { status: 400, data: null, error: "缺少目标 URL" };
    try {
      let o;
      if (a) {
        const c = new Bs();
        for (const [u, p] of Object.entries(a.fields))
          c.append(u, p);
        for (const u of a.files) {
          const p = Buffer.from(u.base64, "base64");
          c.append(u.field, p, {
            filename: u.filename,
            contentType: u.mimetype
          });
        }
        const l = {
          ...c.getHeaders()
        };
        r.Authorization && (l.Authorization = r.Authorization), o = await Qe.post(i, c, {
          headers: l,
          maxBodyLength: 1 / 0,
          maxContentLength: 1 / 0,
          validateStatus: () => !0
        });
      } else {
        const c = { ...r };
        s && (c["Content-Type"] = "application/json"), o = await Qe({
          method: n.toLowerCase(),
          url: i,
          data: s || void 0,
          headers: c,
          maxBodyLength: 1 / 0,
          maxContentLength: 1 / 0,
          validateStatus: () => !0
        });
      }
      return {
        status: o.status,
        data: o.data
      };
    } catch (o) {
      return console.error("OpenAI 代理请求失败:", o.message), {
        status: 500,
        data: null,
        error: o.message || "代理请求失败"
      };
    }
  }
}
const c3 = new o3();
function l3() {
  be.handle("comic:db:getAppSettings", () => Ve.getAppSettings()), be.handle("comic:db:saveAppSettings", (t, e) => (Ve.saveAppSettings(e), { success: !0 })), be.handle("comic:db:getAllProjects", () => Ve.getAllProjects()), be.handle("comic:db:getProject", (t, e) => Ve.getProject(e)), be.handle("comic:db:saveProject", (t, e) => (Ve.saveProject(e), { success: !0 })), be.handle("comic:db:deleteProject", (t, e) => (Ve.deleteProjectCascade(e), { success: !0 })), be.handle("comic:db:getAllModelConfigs", () => Ve.getAllModelConfigs()), be.handle("comic:db:saveModelConfig", (t, e) => (Ve.saveModelConfig(e), { success: !0 })), be.handle("comic:db:deleteModelConfig", (t, e) => (Ve.deleteModelConfig(e), { success: !0 })), be.handle("comic:db:getAllPromptTemplates", () => Ve.getAllPromptTemplates()), be.handle("comic:db:savePromptTemplate", (t, e) => (Ve.savePromptTemplate(e), { success: !0 })), be.handle("comic:db:deletePromptTemplate", (t, e) => (Ve.deletePromptTemplate(e), { success: !0 })), be.handle("comic:db:getProjectAssetsByProjectId", (t, e) => Ve.getProjectAssetsByProjectId(e)), be.handle("comic:db:getAllProjectAssets", () => Ve.getAllProjectAssets()), be.handle("comic:db:saveProjectAsset", (t, e) => (Ve.saveProjectAsset(e), { success: !0 })), be.handle("comic:db:deleteProjectAsset", (t, e) => (Ve.deleteProjectAsset(e), { success: !0 })), be.handle("comic:db:deleteProjectAssetsByProjectId", (t, e) => (Ve.deleteProjectAssetsByProjectId(e), { success: !0 })), be.handle("comic:db:getAllMaterials", () => Ve.getAllMaterials()), be.handle("comic:db:getMaterialsByProjectId", (t, e) => Ve.getMaterialsByProjectId(e)), be.handle("comic:db:saveMaterial", (t, e) => (Ve.saveMaterial(e), { success: !0 })), be.handle("comic:db:deleteMaterial", (t, e) => (Ve.deleteMaterial(e), { success: !0 })), be.handle("comic:db:getGenerationTasksByProjectId", (t, e) => Ve.getGenerationTasksByProjectId(e)), be.handle("comic:db:saveGenerationTask", (t, e) => (Ve.saveGenerationTask(e), { success: !0 })), be.handle("comic:db:deleteGenerationTask", (t, e) => (Ve.deleteGenerationTask(e), { success: !0 })), be.handle("comic:db:deleteGenerationTasksByProjectId", (t, e) => (Ve.deleteGenerationTasksByProjectId(e), { success: !0 })), be.handle("comic:upload", (t, e) => Nh.uploadImage(e)), be.handle("comic:uploadFromUrl", (t, e, n) => Nh.uploadImageFromUrl(e, n)), be.handle("comic:downloadSingle", (t, e, n, i) => jg.downloadSingle(e, n, i)), be.handle("comic:downloadBatch", (t, e) => jg.downloadBatch(e)), be.handle("comic:openaiProxy", (t, e) => c3.proxy(e)), be.handle("comic:showInFolder", (t, e) => (Ju.showItemInFolder(e), { success: !0 }));
}
const Lw = ht.dirname(zw(import.meta.url));
process.env.APP_ROOT = ht.join(Lw, "..");
const Zp = process.env.VITE_DEV_SERVER_URL, R$ = ht.join(process.env.APP_ROOT, "dist-electron"), Nw = ht.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = Zp ? ht.join(process.env.APP_ROOT, "public") : Nw;
let Vo;
Bg.registerSchemesAsPrivileged([{
  scheme: "app-image",
  privileges: {
    secure: !0,
    standard: !0,
    supportFetchAPI: !0,
    corsEnabled: !0
  }
}]);
const u3 = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;
function p3() {
  Bg.handle("app-image", async (t) => {
    try {
      const e = new URL(t.url), n = decodeURIComponent(e.pathname.slice(1)), i = e.hostname === "history" ? Qu.resolveImagePath(n) : e.hostname === "local" && ht.isAbsolute(n) ? ht.normalize(n) : null;
      return !i || !u3.test(i) ? new Response("Not found", { status: 404 }) : $g.fetch(Ww(i).toString());
    } catch {
      return new Response("Not found", { status: 404 });
    }
  });
}
function Fw() {
  Vo = new Hi({
    width: 1400,
    height: 900,
    icon: ht.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: ht.join(Lw, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1,
      webSecurity: !0
    }
  }), Zp ? Vo.loadURL(Zp) : Vo.loadFile(ht.join(Nw, "index.html"));
}
Oi.on("window-all-closed", () => {
  process.platform !== "darwin" && (Oi.quit(), Vo = null);
});
Oi.on("activate", () => {
  Hi.getAllWindows().length === 0 && Fw();
});
Oi.whenReady().then(async () => {
  p3(), await Promise.all([tt.init(), Ve.init()]), Fw(), a_(), m_(), x_(), T_(), P_(), l3();
});
export {
  R$ as MAIN_DIST,
  Nw as RENDERER_DIST,
  Zp as VITE_DEV_SERVER_URL
};

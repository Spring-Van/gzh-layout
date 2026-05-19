var V = Object.defineProperty;
var q = (r, e, t) => e in r ? V(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t;
var k = (r, e, t) => q(r, typeof e != "symbol" ? e + "" : e, t);
import { dialog as G, ipcMain as o, app as D, BrowserWindow as U } from "electron";
import { fileURLToPath as J } from "node:url";
import _ from "node:path";
import p from "fs-extra";
import h from "path";
import z from "crypto";
import { Buffer as $ } from "node:buffer";
import S from "sharp";
import { webcrypto as B } from "node:crypto";
import x from "fs";
class v {
  static async selectFolder() {
    const e = await G.showOpenDialog({
      properties: ["openDirectory"]
    });
    return e.canceled || e.filePaths.length === 0 ? null : e.filePaths[0];
  }
  static async backupFolder(e) {
    const t = h.basename(e), n = h.join(h.dirname(e), `${t}-备份`);
    return await p.pathExists(n) && await p.remove(n), await p.copy(e, n), n;
  }
  static async calculateMD5(e) {
    return new Promise((t, n) => {
      const a = z.createHash("md5"), s = p.createReadStream(e);
      s.on("error", n), s.on("data", (c) => a.update(c)), s.on("end", () => t(a.digest("hex")));
    });
  }
  static async splitIntoFolders(e, t, n, a) {
    const s = h.basename(e), c = h.join(h.dirname(e), `${s}-备份`);
    await p.pathExists(c) && await p.remove(c), await p.ensureDir(c);
    const d = [], u = [];
    for (let i = 0; i < t.length; i += n)
      u.push(t.slice(i, i + n));
    for (let i = 0; i < u.length; i++) {
      const l = i + 1, m = `${a} - 第${l}组`, w = h.join(c, m);
      await p.ensureDir(w), d.push(w);
      for (const T of u[i]) {
        const F = h.join(w, T.name);
        await p.copy(T.path, F);
      }
    }
    return d;
  }
  static async saveBase64Image(e, t) {
    const n = h.join(process.env.APPDATA || process.env.HOME || "", "gzh-layout", "temp");
    await p.ensureDir(n);
    const a = h.join(n, t), s = e.match(/^data:image\/(png|jpeg|jpg);base64,(.*)$/);
    if (!s || s.length !== 3)
      throw new Error("无效的 base64 图片格式");
    const c = $.from(s[2], "base64");
    return await p.writeFile(a, c), a;
  }
  static async createCoverFolder(e) {
    const t = h.join(e, "封面");
    return await p.ensureDir(t), t;
  }
  static async saveCoverImage(e, t, n) {
    await p.ensureDir(e);
    const a = h.join(e, n), s = t.match(/^data:image\/(png|jpeg|jpg);base64,(.*)$/);
    if (!s || s.length !== 3)
      throw new Error("无效的 base64 图片格式");
    const c = $.from(s[2], "base64");
    return await p.writeFile(a, c), a;
  }
  static async deleteCoverFolder(e) {
    await p.pathExists(e) && await p.remove(e);
  }
  static async deleteCoverImage(e) {
    await p.pathExists(e) && await p.remove(e);
  }
  /**
   * 将 WebP 图片转换为 PNG 格式
   * 备份模式: 保存到 {原文件夹名-备份}/webp-converted
   * 非备份模式: 保存到 {原文件夹名}/webp-converted
   */
  static async convertWebpImages(e, t, n) {
    const a = h.basename(e), s = h.dirname(e), c = n ? h.join(s, `${a}-备份`) : e, d = h.join(c, "webp-converted");
    await p.ensureDir(d);
    const u = {};
    for (const i of t) {
      const l = h.parse(i.name).name + ".png", m = h.join(d, l);
      await S(i.path).png().toFile(m), u[i.path] = m;
    }
    return u;
  }
}
function X() {
  o.handle("file:selectFolder", async () => v.selectFolder()), o.handle("file:backupFolder", async (r, e) => v.backupFolder(e)), o.handle("file:calculateMD5", async (r, e) => v.calculateMD5(e)), o.handle("file:splitIntoFolders", async (r, e, t, n, a) => v.splitIntoFolders(e, t, n, a)), o.handle("file:saveBase64Image", async (r, e, t) => v.saveBase64Image(e, t)), o.handle("file:createCoverFolder", async (r, e) => v.createCoverFolder(e)), o.handle("file:saveCoverImage", async (r, e, t, n) => v.saveCoverImage(e, t, n)), o.handle("file:deleteCoverFolder", async (r, e) => v.deleteCoverFolder(e)), o.handle("file:deleteCoverImage", async (r, e) => v.deleteCoverImage(e)), o.handle("file:convertWebpImages", async (r, e, t, n) => v.convertWebpImages(e, t, n));
}
let K = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
const Y = 128;
let C, j;
function Z(r) {
  !C || C.length < r ? (C = Buffer.allocUnsafe(r * Y), B.getRandomValues(C), j = 0) : j + r > C.length && (B.getRandomValues(C), j = 0), j += r;
}
function Q(r = 21) {
  Z(r |= 0);
  let e = "";
  for (let t = j - r; t < j; t++)
    e += K[C[t] & 63];
  return e;
}
const ee = [".jpg", ".jpeg", ".png", ".webp", ".gif"], te = Buffer.from([82, 73, 70, 70]), ae = 0, ne = Buffer.from([87, 69, 66, 80]);
class re {
  /**
   * 通过 Magic Number 检测文件是否为 WebP 格式
   */
  static async isWebpByMagicNumber(e) {
    try {
      const t = await p.open(e, "r"), n = Buffer.alloc(12);
      return await t.read(n, 0, 12, 0), await t.close(), n.compare(te, 0, 4, ae, 4) === 0 && n.compare(ne, 0, 4, 8, 12) === 0;
    } catch {
      return !1;
    }
  }
  /**
   * 使用 sharp 检测图片的实际格式
   */
  static async detectActualFormat(e) {
    try {
      return (await S(e).metadata()).format || "unknown";
    } catch {
      return await this.isWebpByMagicNumber(e) ? "webp" : "unknown";
    }
  }
  static async scanImagesInFolder(e) {
    const t = await p.readdir(e), n = [];
    let a = 0;
    for (const s of t) {
      const c = h.join(e, s), d = await p.stat(c);
      if (!d.isFile()) continue;
      const u = h.extname(s).toLowerCase();
      if (ee.includes(u))
        try {
          const i = await S(c).metadata();
          let l = i.format || u.replace(".", "");
          const m = i.width || 1920, w = i.height || 1080;
          l !== "webp" && await this.isWebpByMagicNumber(c) && (l = "webp"), n.push({
            id: Q(),
            name: s,
            path: c,
            size: d.size,
            width: m,
            height: w,
            format: l,
            enabled: !0,
            isCover: !1,
            order: a++
          });
        } catch (i) {
          console.error("图片解析失败:", c, i);
        }
    }
    return n;
  }
}
function se() {
  o.handle("image:scanFolder", async (r, e) => e ? re.scanImagesInFolder(e) : []);
}
class ce {
  constructor() {
    k(this, "dbPath");
    k(this, "data");
    const e = D.getPath("userData");
    this.dbPath = h.join(e, "gzh-layout.json"), this.data = this.loadFromFile();
  }
  loadFromFile() {
    if (x.existsSync(this.dbPath))
      try {
        const e = x.readFileSync(this.dbPath, "utf-8"), t = JSON.parse(e);
        return {
          projects: t.projects || [],
          templates: t.templates || [],
          coverTemplates: t.coverTemplates || [],
          wechatAccounts: t.wechatAccounts || [],
          draftRecords: t.draftRecords || []
        };
      } catch (e) {
        console.error("读取数据库文件失败:", e);
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
      x.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      console.error("保存数据库文件失败:", e);
    }
  }
  async init() {
  }
  // ========== Projects ==========
  getAllProjects() {
    return [...this.data.projects].sort(
      (e, t) => new Date(t.updatedAt).getTime() - new Date(e.updatedAt).getTime()
    );
  }
  getProject(e) {
    return this.data.projects.find((t) => t.projectId === e) || null;
  }
  saveProject(e) {
    const t = this.data.projects.findIndex((n) => n.projectId === e.projectId);
    t !== -1 ? this.data.projects[t] = e : this.data.projects.push(e), this.saveToFile();
  }
  deleteProject(e) {
    this.data.projects = this.data.projects.filter((t) => t.projectId !== e), this.saveToFile();
  }
  // ========== Templates ==========
  getAllTemplates() {
    return [...this.data.templates].sort(
      (e, t) => new Date(t.updatedAt).getTime() - new Date(e.updatedAt).getTime()
    );
  }
  saveTemplate(e) {
    const t = this.data.templates.findIndex((n) => n.id === e.id);
    t !== -1 ? this.data.templates[t] = e : this.data.templates.push(e), this.saveToFile();
  }
  deleteTemplate(e) {
    this.data.templates = this.data.templates.filter((t) => t.id !== e), this.saveToFile();
  }
  // ========== Cover Templates ==========
  getAllCoverTemplates() {
    return [...this.data.coverTemplates].sort(
      (e, t) => new Date(t.updatedAt).getTime() - new Date(e.updatedAt).getTime()
    );
  }
  saveCoverTemplate(e) {
    const t = this.data.coverTemplates.findIndex((n) => n.id === e.id);
    t !== -1 ? this.data.coverTemplates[t] = e : this.data.coverTemplates.push(e), this.saveToFile();
  }
  deleteCoverTemplate(e) {
    this.data.coverTemplates = this.data.coverTemplates.filter((t) => t.id !== e), this.saveToFile();
  }
  // ========== Wechat Accounts ==========
  getAllWechatAccounts() {
    return [...this.data.wechatAccounts];
  }
  getWechatAccount(e) {
    return this.data.wechatAccounts.find((t) => t.id === e) || null;
  }
  getActiveWechatAccount() {
    return this.data.wechatAccounts.find((e) => e.isActive) || null;
  }
  getDefaultSyncWechatAccount() {
    return this.data.wechatAccounts.find((e) => e.isDefaultSync) || null;
  }
  saveWechatAccount(e) {
    const t = this.data.wechatAccounts.findIndex((n) => n.id === e.id);
    t !== -1 ? this.data.wechatAccounts[t] = e : this.data.wechatAccounts.push(e), this.saveToFile();
  }
  setActiveWechatAccount(e) {
    this.data.wechatAccounts.forEach((t) => {
      t.isActive = t.id === e;
    }), this.saveToFile();
  }
  setDefaultSyncWechatAccount(e) {
    this.data.wechatAccounts.forEach((t) => {
      t.isDefaultSync = t.id === e;
    }), this.saveToFile();
  }
  deleteWechatAccount(e) {
    this.data.wechatAccounts = this.data.wechatAccounts.filter((t) => t.id !== e), this.saveToFile();
  }
}
const f = new ce();
function oe() {
  o.handle("db:init", async () => (await f.init(), { success: !0 })), o.handle("db:getAllProjects", () => f.getAllProjects()), o.handle("db:getProject", (r, e) => f.getProject(e)), o.handle("db:saveProject", (r, e) => (f.saveProject(e), { success: !0 })), o.handle("db:deleteProject", (r, e) => (f.deleteProject(e), { success: !0 })), o.handle("db:getAllTemplates", () => f.getAllTemplates()), o.handle("db:saveTemplate", (r, e) => (f.saveTemplate(e), { success: !0 })), o.handle("db:deleteTemplate", (r, e) => (f.deleteTemplate(e), { success: !0 })), o.handle("db:getAllCoverTemplates", () => f.getAllCoverTemplates()), o.handle("db:saveCoverTemplate", (r, e) => (f.saveCoverTemplate(e), { success: !0 })), o.handle("db:deleteCoverTemplate", (r, e) => (f.deleteCoverTemplate(e), { success: !0 })), o.handle("db:getAllWechatAccounts", () => f.getAllWechatAccounts()), o.handle("db:getWechatAccount", (r, e) => f.getWechatAccount(e)), o.handle("db:getActiveWechatAccount", () => f.getActiveWechatAccount()), o.handle("db:getDefaultSyncWechatAccount", () => f.getDefaultSyncWechatAccount()), o.handle("db:saveWechatAccount", (r, e) => (f.saveWechatAccount(e), { success: !0 })), o.handle("db:setActiveWechatAccount", (r, e) => (f.setActiveWechatAccount(e), { success: !0 })), o.handle("db:setDefaultSyncWechatAccount", (r, e) => (f.setDefaultSyncWechatAccount(e), { success: !0 })), o.handle("db:deleteWechatAccount", (r, e) => (f.deleteWechatAccount(e), { success: !0 }));
}
const A = "https://api.weixin.qq.com", ie = 300, le = "----WechatFormBoundary";
function de() {
  return `${le}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
function O(r, e, t, n) {
  const a = de(), s = $.from(
    `--${a}\r
Content-Disposition: form-data; name="${r}"; filename="${e}"\r
Content-Type: ${n}\r
\r
`,
    "utf-8"
  ), c = $.from(`\r
--${a}--\r
`, "utf-8");
  return {
    body: $.concat([s, t, c]),
    contentType: `multipart/form-data; boundary=${a}`,
    boundary: a
  };
}
class ue {
  constructor() {
    k(this, "tokenCache", null);
  }
  async getAccessToken(e, t) {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now())
      return this.tokenCache.accessToken;
    const n = `${A}/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(e)}&secret=${encodeURIComponent(t)}`, s = await (await fetch(n)).json();
    if (s.errcode)
      throw new Error(`获取AccessToken失败 [${s.errcode}]: ${s.errmsg}`);
    return this.tokenCache = {
      accessToken: s.access_token,
      expiresAt: Date.now() + (s.expires_in - ie) * 1e3
    }, s.access_token;
  }
  clearTokenCache() {
    this.tokenCache = null;
  }
  getTokenCacheInfo() {
    return this.tokenCache;
  }
  async getAccountInfo(e) {
    const t = `${A}/cgi-bin/getcallbackip?access_token=${e}`, a = await (await fetch(t)).json();
    if (a.errcode)
      throw new Error(`Token 校验失败 [${a.errcode}]: ${a.errmsg}`);
    const s = `${A}/cgi-bin/account/getaccountbasicinfo?access_token=${e}`, d = await (await fetch(s, { method: "POST" })).json();
    return d.errcode ? {
      nickname: "",
      headImg: "",
      serviceType: -1,
      verifyType: -1,
      userName: "",
      alias: "",
      qrcodeUrl: ""
    } : {
      nickname: d.nickname || "",
      headImg: d.head_img || "",
      serviceType: d.service_type ?? -1,
      verifyType: d.verify_type ?? -1,
      userName: d.user_name || "",
      alias: d.alias || "",
      qrcodeUrl: d.qrcode_url || ""
    };
  }
  async authenticate(e, t) {
    const n = await this.getAccessToken(e, t), a = this.tokenCache, s = Math.floor((a.expiresAt - Date.now()) / 1e3), c = await this.getAccountInfo(n);
    return {
      success: !0,
      accessToken: n,
      expiresIn: s,
      accountInfo: c
    };
  }
  async verifyToken(e) {
    const t = `${A}/cgi-bin/getcallbackip?access_token=${e}`;
    return !(await (await fetch(t)).json()).errcode;
  }
  async uploadCoverImage(e, t) {
    const n = await p.readFile(t), a = h.basename(t), s = h.extname(a).toLowerCase(), c = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif" };
    if (s === ".webp")
      throw new Error(`微信不支持 WebP 格式，请先将 ${a} 转换为 PNG 或 JPG`);
    const d = c[s] || "image/jpeg", { body: u, contentType: i } = O("media", a, n, d), l = `${A}/cgi-bin/material/add_material?access_token=${e}&type=image`, w = await (await fetch(l, {
      method: "POST",
      headers: { "Content-Type": i },
      body: new Uint8Array(u)
    })).json();
    if (w.errcode)
      throw new Error(`上传封面图失败 [${w.errcode}]: ${w.errmsg}`);
    return { mediaId: w.media_id, url: w.url };
  }
  async uploadContentImage(e, t) {
    const n = await p.readFile(t), a = h.basename(t), s = h.extname(a).toLowerCase(), c = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif" };
    if (s === ".webp")
      throw new Error(`微信不支持 WebP 格式，请先将 ${a} 转换为 PNG 或 JPG`);
    const d = c[s] || "image/jpeg", { body: u, contentType: i } = O("media", a, n, d), l = `${A}/cgi-bin/media/uploadimg?access_token=${e}`, w = await (await fetch(l, {
      method: "POST",
      headers: { "Content-Type": i },
      body: new Uint8Array(u)
    })).json();
    if (w.errcode)
      throw new Error(`上传正文图片失败 (${a}) [${w.errcode}]: ${w.errmsg}`);
    return { originalPath: t, url: w.url };
  }
  async batchUploadContentImages(e, t, n, a, s) {
    const c = [];
    for (let d = 0; d < t.length; d++) {
      n == null || n({
        currentArticleIndex: a ?? 0,
        totalArticles: s ?? 1,
        step: "images",
        message: `正在上传正文图片 ${d + 1}/${t.length}...`
      });
      const u = await this.uploadContentImage(e, t[d]);
      c.push(u), d < t.length - 1 && await this.delay(300);
    }
    return c;
  }
  async createDraft(e, t) {
    const n = {
      articles: [
        {
          title: t.title,
          thumb_media_id: t.thumbMediaId,
          author: t.author ?? "",
          digest: t.digest ?? t.title,
          content: t.content,
          content_source_url: t.contentSourceUrl ?? "",
          need_open_comment: t.needOpenComment ?? 1,
          only_fans_can_comment: t.onlyFansCanComment ?? 0,
          pic_crop_235_1: t.picCrop2351 ?? "0_0_1_1",
          pic_crop_1_1: t.picCrop11 ?? "0.287234_0_0.712766_1"
        }
      ]
    }, a = `${A}/cgi-bin/draft/add?access_token=${e}`, c = await (await fetch(a, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n)
    })).json();
    if (c.errcode)
      throw new Error(`创建草稿失败 [${c.errcode}]: ${c.errmsg}`);
    return c.media_id;
  }
  async publishDraft(e, t) {
    const n = { media_id: t }, a = `${A}/cgi-bin/freepublish/submit?access_token=${e}`, c = await (await fetch(a, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n)
    })).json();
    if (c.errcode)
      throw new Error(`发布草稿失败 [${c.errcode}]: ${c.errmsg}`);
    return c.publish_id;
  }
  buildArticleHtml(e, t) {
    const n = `<section style="text-align:center;color:#000;font-size:16px;padding-bottom:20px;font-weight:bold;">${this.escapeHtml(e)}</section>`, a = t.map((s) => `<p><img src="${s}" data-src="${s}" style="max-width:100%;display:block;margin:0 auto;"></p>`).join(`
`);
    return n + a;
  }
  calculateCropParams(e = 2.35) {
    const t = "0_0_1_1", a = (1 - 1 / e) / 2, s = a.toFixed(6), c = (1 - a).toFixed(6), d = `${s}_0_${c}_1`;
    return { pic_crop_235_1: t, pic_crop_1_1: d };
  }
  delay(e) {
    return new Promise((t) => setTimeout(t, e));
  }
  escapeHtml(e) {
    return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
}
const g = new ue();
function he(r) {
  return r.replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();
}
function pe() {
  o.handle("wechat:getAccessToken", async (r, e, t) => g.getAccessToken(e, t)), o.handle("wechat:clearTokenCache", async () => {
    g.clearTokenCache();
  }), o.handle("wechat:getAccountInfo", async (r, e) => g.getAccountInfo(e)), o.handle("wechat:authenticate", async (r, e, t) => g.authenticate(e, t)), o.handle("wechat:verifyToken", async (r, e) => g.verifyToken(e)), o.handle("wechat:getTokenCacheInfo", async () => g.getTokenCacheInfo()), o.handle("wechat:uploadCoverImage", async (r, e, t) => g.uploadCoverImage(e, t)), o.handle("wechat:uploadContentImage", async (r, e, t) => g.uploadContentImage(e, t)), o.handle("wechat:batchUploadContentImages", async (r, e, t) => g.batchUploadContentImages(e, t)), o.handle("wechat:createDraft", async (r, e, t) => g.createDraft(e, t)), o.handle("wechat:publishDraft", async (r, e, t) => g.publishDraft(e, t)), o.handle("wechat:buildArticleHtml", async (r, e, t) => g.buildArticleHtml(e, t)), o.handle("wechat:calculateCropParams", async (r, e) => g.calculateCropParams(e)), o.handle("wechat:batchUpload", async (r, e) => {
    const { appId: t, appSecret: n, articles: a, publish: s = !1 } = e, c = [], d = r.sender, u = (i) => {
      try {
        d.isDestroyed() || d.send("wechat:uploadProgress", i);
      } catch {
      }
    };
    try {
      u({
        currentArticleIndex: 0,
        totalArticles: a.length,
        step: "token",
        message: "正在获取 AccessToken..."
      });
      let i;
      if (n)
        i = await g.getAccessToken(t, n);
      else {
        const l = g.getTokenCacheInfo();
        if (l && l.expiresAt > Date.now())
          i = l.accessToken;
        else
          throw new Error("AccessToken 已过期，请重新鉴权");
      }
      for (let l = 0; l < a.length; l++) {
        const m = a[l];
        u({
          currentArticleIndex: l,
          totalArticles: a.length,
          step: "cover",
          message: `[${l + 1}/${a.length}] 正在上传封面图...`
        });
        const w = await g.uploadCoverImage(i, m.coverImagePath);
        u({
          currentArticleIndex: l,
          totalArticles: a.length,
          step: "images",
          message: `[${l + 1}/${a.length}] 正在上传正文图片 (${m.contentImagePaths.length} 张)...`
        });
        const T = await g.batchUploadContentImages(
          i,
          m.contentImagePaths,
          (y) => u({ ...y, currentArticleIndex: l, totalArticles: a.length }),
          l,
          a.length
        );
        u({
          currentArticleIndex: l,
          totalArticles: a.length,
          step: "draft",
          message: `[${l + 1}/${a.length}] 正在创建草稿...`
        });
        const F = T.map((y) => y.url);
        let I;
        if (m.contentHtml) {
          I = m.contentHtml;
          for (let y = 0; y < T.length; y++) {
            const P = T[y].originalPath, H = T[y].url;
            I = I.split(P).join(H);
          }
        } else
          I = g.buildArticleHtml(m.title, F);
        I = he(I);
        const R = await g.createDraft(i, {
          title: m.title,
          thumbMediaId: w.mediaId,
          author: m.author,
          digest: m.digest,
          content: I,
          picCrop2351: m.picCrop2351,
          picCrop11: m.picCrop11
        }), E = {
          title: m.title,
          draftMediaId: R,
          coverUrl: w.url
        };
        if (s) {
          u({
            currentArticleIndex: l,
            totalArticles: a.length,
            step: "publish",
            message: `[${l + 1}/${a.length}] 正在发布草稿...`
          });
          try {
            E.publishId = await g.publishDraft(i, R);
          } catch (y) {
            const P = y instanceof Error ? y.message : String(y);
            E.publishError = P, u({
              currentArticleIndex: l,
              totalArticles: a.length,
              step: "done",
              message: `[${l + 1}/${a.length}] 草稿已创建，但发布失败：${P}`
            });
          }
        }
        c.push(E), l < a.length - 1 && await new Promise((y) => setTimeout(y, 500));
      }
      return u({
        currentArticleIndex: a.length,
        totalArticles: a.length,
        step: "done",
        message: `全部完成！共处理 ${a.length} 篇文章。`
      }), { success: !0, results: c };
    } catch (i) {
      const l = i instanceof Error ? i.message : String(i);
      return u({
        currentArticleIndex: c.length,
        totalArticles: a.length,
        step: "done",
        message: `上传失败: ${l}`
      }), { success: !1, error: l, results: c };
    }
  });
}
const N = _.dirname(J(import.meta.url));
process.env.APP_ROOT = _.join(N, "..");
const W = process.env.VITE_DEV_SERVER_URL, Ce = _.join(process.env.APP_ROOT, "dist-electron"), M = _.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = W ? _.join(process.env.APP_ROOT, "public") : M;
let b;
function L() {
  b = new U({
    width: 1400,
    height: 900,
    icon: _.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: _.join(N, "preload.mjs"),
      webSecurity: !1
    }
  }), b.webContents.on("did-finish-load", () => {
    b == null || b.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), W ? b.loadURL(W) : b.loadFile(_.join(M, "index.html"));
}
D.on("window-all-closed", () => {
  process.platform !== "darwin" && (D.quit(), b = null);
});
D.on("activate", () => {
  U.getAllWindows().length === 0 && L();
});
D.whenReady().then(async () => {
  await f.init(), L(), X(), se(), oe(), pe();
});
export {
  Ce as MAIN_DIST,
  M as RENDERER_DIST,
  W as VITE_DEV_SERVER_URL
};

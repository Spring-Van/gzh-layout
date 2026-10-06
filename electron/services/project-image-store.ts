/**
 * 长篇项目图片外置存储。
 *
 * 长篇项目数据里 99.9% 的体积是内联 base64 图片（实测 291.7MB / 503MB 主库），
 * 任何一次写库都要把整份数据序列化一遍，于是「删一张图」「改一句提示词」都要卡几秒。
 * 这里把图片从项目数据里搬出去，字段值只保留一条短引用：
 *
 *   data:image/png;base64,iVBORw0KGgo...   （3~11MB）
 *        ↓
 *   app-image://comic/<项目目录>/<分类>/<sha1>.png   （约 60 字节）
 *
 * 磁盘布局（userData/comic-images/）：
 *
 *   comic-images/
 *     咖啡店日常__8f3a2b/                 ← <项目名>__<项目 id 前 6 位>
 *       generated/  <sha1>.png            ← AI 生成图
 *       uploaded/   <sha1>.png            ← 用户上传的成品图
 *       reference/  <sha1>.png            ← 用户上传的参考图 / 共用属性图
 *
 * 命名为「内容寻址」：文件名就是图片内容的 sha1，同一张图重复落盘会直接命中已有文件。
 * 去重范围是**项目内**（跨项目各存一份）—— 换来的是「删项目 = 删目录」，孤儿回收不需要扫引用。
 */

import { app } from 'electron';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** 图片语义分类，对应磁盘上的三个子目录。 */
export type ProjectImageKind = 'generated' | 'uploaded' | 'reference';

const PROJECT_IMAGE_KINDS: readonly ProjectImageKind[] = ['generated', 'uploaded', 'reference'];

/** 允许落盘的扩展名（与协议侧的校验白名单保持一致）。 */
const ALLOWED_EXTENSION_RE = /^(?:png|jpe?g|webp|gif|avif)$/;
/** 内容寻址的文件名主体：40 位 sha1 十六进制。 */
const HASH_RE = /^[a-f0-9]{40}$/;
/**
 * 项目目录名里不允许出现的字符：Windows 保留字符、路径分隔符、URL 里会截断的 `#`、控制字符。
 *
 * 用字符串源构造两个正则：替换必须带 `g`（否则只换掉第一个匹配字符），
 * 而 `test()` 不能用带 `g` 的实例（`lastIndex` 会跨调用残留，导致结果随机）。
 */
const UNSAFE_DIR_CHARS_SOURCE = '[\\\\/:*?"<>|#\\u0000-\\u001f]';
const UNSAFE_DIR_CHARS_RE = new RegExp(UNSAFE_DIR_CHARS_SOURCE);
const UNSAFE_DIR_CHARS_GLOBAL_RE = new RegExp(UNSAFE_DIR_CHARS_SOURCE, 'g');
/** `app-image://comic/` 前缀，外置引用与已外置引用都靠它识别。 */
export const COMIC_IMAGE_URL_PREFIX = 'app-image://comic/';

export interface ParsedComicImageUrl {
  /** 磁盘上的项目目录名（已解码）。 */
  dirName: string;
  kind: ProjectImageKind;
  filename: string;
  /** 文件名主体，即图片内容的 sha1。 */
  hash: string;
}

export function isProjectImageKind(value: string): value is ProjectImageKind {
  return (PROJECT_IMAGE_KINDS as readonly string[]).includes(value);
}

/**
 * 由项目名与项目 id 拼出磁盘目录名：`<项目名>__<id 前6位>`。
 * 用 id 后缀兜底重名；不用纯 uuid 是因为翻目录时认不出是哪个项目。
 */
export function buildProjectDirName(name: string | undefined, id: string): string {
  const safeName = sanitizeProjectName(name);
  const suffix = (id ?? '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6) || 'noid';
  return `${safeName}__${suffix}`;
}

/** 项目名 → 可安全用作目录名的形式（保留中文，去掉路径与 URL 危险字符）。 */
function sanitizeProjectName(name: string | undefined): string {
  const cleaned = (name ?? '')
    .replace(UNSAFE_DIR_CHARS_GLOBAL_RE, ' ')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 40)
    .trim();
  return cleaned || 'project';
}

/** 目录名是否可用于拼接路径（协议侧校验：库数据可能被手工编辑过）。 */
export function isSafeProjectDirName(value: string): boolean {
  if (!value || value.length > 120) return false;
  if (UNSAFE_DIR_CHARS_RE.test(value)) return false;
  if (value.includes('..')) return false;
  return value !== '.' && value !== '..';
}

/** 解析一条外置引用；格式不符返回 null。 */
export function parseComicImageUrl(url: string): ParsedComicImageUrl | null {
  if (!url.startsWith(COMIC_IMAGE_URL_PREFIX)) return null;
  const segments = url.slice(COMIC_IMAGE_URL_PREFIX.length).split('/');
  if (segments.length !== 3) return null;
  const [rawDirName, kind, filename] = segments;
  if (!isProjectImageKind(kind)) return null;
  const dot = filename.lastIndexOf('.');
  if (dot <= 0) return null;
  const hash = filename.slice(0, dot);
  const extension = filename.slice(dot + 1).toLowerCase();
  if (!HASH_RE.test(hash) || !ALLOWED_EXTENSION_RE.test(extension)) return null;
  let dirName: string;
  try {
    dirName = decodeURIComponent(rawDirName);
  } catch {
    return null;
  }
  if (!isSafeProjectDirName(dirName)) return null;
  return { dirName, kind, filename, hash };
}

interface ParsedDataUrl {
  extension: string;
  /** base64 载荷（不含 header），用于算 hash 与落盘。 */
  payload: string;
}

/**
 * 拆一条内联图片 dataURL。
 * 用手工切分而不是正则捕获载荷：图片有 3~11MB，`(.+)` 这种捕获会在超长字符串上产生额外开销。
 */
export function parseImageDataUrl(value: string): ParsedDataUrl | null {
  if (!value.startsWith('data:image/')) return null;
  const comma = value.indexOf(',');
  if (comma < 0) return null;
  const header = value.slice(0, comma);
  const BASE64_SUFFIX = ';base64';
  if (!header.toLowerCase().endsWith(BASE64_SUFFIX)) return null;
  const mime = /^data:image\/([a-z0-9.+-]+)$/i.exec(header.slice(0, header.length - BASE64_SUFFIX.length));
  if (!mime) return null;
  const extension = mime[1].toLowerCase().replace(/^jpeg$/, 'jpg');
  if (!ALLOWED_EXTENSION_RE.test(extension)) return null;
  return { extension, payload: value.slice(comma + 1) };
}

/** 计算一条内联图片 dataURL 的内容 hash（非图片 dataURL 返回 null）。 */
export function hashImageDataUrl(value: string): string | null {
  const parsed = parseImageDataUrl(value);
  if (!parsed) return null;
  return createHash('sha1').update(parsed.payload, 'base64').digest('hex');
}

export class ProjectImageStore {
  private readonly createdDirs = new Set<string>();

  constructor(
    private readonly rootProvider: () => string = () => path.join(app.getPath('userData'), 'comic-images'),
  ) {}

  get root(): string {
    return this.rootProvider();
  }

  projectDirPath(dirName: string): string {
    return path.join(this.root, dirName);
  }

  kindDirPath(dirName: string, kind: ProjectImageKind): string {
    return path.join(this.root, dirName, kind);
  }

  /** 建出项目的三个分类子目录（有图落盘前调用一次，之后走缓存）。 */
  ensureProjectDir(dirName: string): void {
    if (this.createdDirs.has(dirName)) return;
    for (const kind of PROJECT_IMAGE_KINDS) {
      mkdirSync(this.kindDirPath(dirName, kind), { recursive: true });
    }
    this.createdDirs.add(dirName);
  }

  /**
   * 把内联 dataURL 落盘，返回 `app-image://comic/<目录>/<分类>/<sha1>.<ext>`。
   * 内容寻址：目标文件已存在时直接返回引用，不重复写盘。
   * 非图片 dataURL 返回 null，由调用方保持原值。
   */
  async persistProjectImage(
    dataUrl: string,
    dirName: string,
    kind: ProjectImageKind,
  ): Promise<string | null> {
    const parsed = parseImageDataUrl(dataUrl);
    if (!parsed) return null;
    const hash = createHash('sha1').update(parsed.payload, 'base64').digest('hex');
    const filename = `${hash}.${parsed.extension}`;
    const url = `${COMIC_IMAGE_URL_PREFIX}${encodeURIComponent(dirName)}/${kind}/${filename}`;

    this.ensureProjectDir(dirName);
    const target = path.join(this.kindDirPath(dirName, kind), filename);
    if (existsSync(target)) return url;

    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(parsed.payload, 'base64'));
    return url;
  }

  /**
   * 解析 `app-image://comic/` 之后的相对路径（`<目录>/<分类>/<文件名>`）。
   * 三段都要过白名单，且最终路径必须落在根目录内 —— 库数据可能被手工编辑后再导入，
   * 这里必须当作不可信输入。
   */
  resolveImagePath(relativePath: string): string | null {
    const segments = relativePath.split(/[\\/]/);
    if (segments.length !== 3) return null;
    const [dirName, kind, filename] = segments;
    if (!isSafeProjectDirName(dirName)) return null;
    if (!isProjectImageKind(kind)) return null;
    const dot = filename.lastIndexOf('.');
    if (dot <= 0) return null;
    if (!HASH_RE.test(filename.slice(0, dot))) return null;
    if (!ALLOWED_EXTENSION_RE.test(filename.slice(dot + 1).toLowerCase())) return null;

    const root = this.root;
    const resolved = path.normalize(path.join(root, dirName, kind, filename));
    return resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
  }

  /**
   * 项目改名时跟随迁移目录。目标已存在或源不存在时返回 false，
   * 调用方据此决定是否替换引用前缀（宁可用旧目录名，也不能改出断链）。
   */
  renameProjectDir(from: string, to: string): boolean {
    if (from === to) return true;
    if (!isSafeProjectDirName(from) || !isSafeProjectDirName(to)) return false;
    const source = this.projectDirPath(from);
    const target = this.projectDirPath(to);
    if (!existsSync(source) || existsSync(target)) return false;
    try {
      renameSync(source, target);
      this.createdDirs.delete(from);
      return true;
    } catch (error) {
      console.warn('[project-images] 目录改名失败，保持旧目录名', error);
      return false;
    }
  }

  /**
   * 删除项目时整目录回收。
   * 按 id 后缀匹配而不是用算出来的目录名：项目改名若曾失败，磁盘上留的仍是旧名。
   */
  removeProjectDirByProjectId(projectId: string): boolean {
    // 与 buildProjectDirName 用同一套后缀规则（不能借道 buildProjectDirName：
    // 它会用项目名占位，长度不定，取尾串会算错）
    const suffix = (projectId ?? '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6);
    const root = this.root;
    if (!suffix || !existsSync(root)) return false;
    let removed = false;
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.endsWith(`__${suffix}`)) continue;
      try {
        rmSync(path.join(root, entry.name), { recursive: true, force: true });
        this.createdDirs.delete(entry.name);
        removed = true;
      } catch (error) {
        console.warn('[project-images] 项目图片目录清理失败（残留文件不影响数据）', error);
      }
    }
    return removed;
  }
}

export const projectImageStore = new ProjectImageStore();

/** 一条字符串是否是本模块产出的外置图片引用（`app-image://comic/...`）。 */
export function isComicImageUrl(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(COMIC_IMAGE_URL_PREFIX);
}

/**
 * 把外置引用解析成**磁盘绝对路径**；不是外置引用（dataURL / 本地路径 / http）返回 null。
 *
 * 给主进程里那些「必须拿到真实文件」的消费方用 —— 目前是微信上传（`fs.readFile`）。
 * 安全校验全部复用 `resolveImagePath`（三段白名单 + 根目录兜底），不在这里另开一套。
 */
export function resolveComicImageToFsPath(value: unknown): string | null {
  if (!isComicImageUrl(value)) return null;
  const parsed = parseComicImageUrl(value);
  if (!parsed) return null;
  return projectImageStore.resolveImagePath(`${parsed.dirName}/${parsed.kind}/${parsed.filename}`);
}

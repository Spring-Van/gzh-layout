/**
 * Comic 模块数据库服务
 * 采用 JSON 文件存储（与现有 DatabaseService 同构），替代原 Dexie/IndexedDB
 *
 * 存储按「体积 / 写入频率」拆成两个文件：
 * - userData/comic-gen.json      项目数据（projects / projectAssets / materials / generationTasks）。
 *                                含 base64 图片，可达数百 MB，写一次要序列化整库。
 * - userData/comic-settings.json 设置数据（modelConfigs / promptTemplates / appSettings）。
 *                                只有几 KB，却在系统设置里被高频保存。
 *
 * 拆分动机：单文件时代，保存一个几 KB 的提示词模板要把整个库重写一遍。
 * 实测 494MB 库单次保存 ≈ 序列化 2.3s + 写盘并 fsync 0.5s + 回读校验 1.5s，
 * 全程同步阻塞主进程，界面直接冻结；回读校验还额外推高约 1.5GB 内存峰值。
 * 拆分后设置类保存只序列化几 KB。
 */

import fs from 'fs';
import path from 'path';
import { app, safeStorage } from 'electron';
import { JsonFileStore } from './json-file-store';
import { SecretStorage } from './secret-storage';
import {
  COMIC_IMAGE_URL_PREFIX,
  buildProjectDirName,
  hashImageDataUrl,
  parseComicImageUrl,
  projectImageStore,
  ProjectImageStore,
  type ProjectImageKind,
} from './project-image-store';
import type {
  ComicProject,
  ModelConfig,
  PromptTemplate,
  ProjectAsset,
  MaterialItem,
  GenerationTask,
} from '../../src/modules/comic/types';

/** 应用设置（导出路径等，可扩展） */
export interface AppSettings {
  /** 导出路径，未配置时使用系统下载目录 */
  exportDir?: string;
  picgoApiKey?: string;
}

/** 项目数据分区：体积大、写入频率低 */
interface ComicProjectData {
  schemaVersion: number;
  projects: ComicProject[];
  projectAssets: ProjectAsset[];
  materials: MaterialItem[];
  generationTasks: GenerationTask[];
}

/** 设置分区：体积小、系统设置页高频写入，且独占全部密钥字段 */
interface ComicSettingsData {
  schemaVersion: number;
  modelConfigs: ModelConfig[];
  promptTemplates: PromptTemplate[];
  appSettings: AppSettings;
}

/** 旧版单文件布局里混在项目库中的设置分区（仅作一次性迁移来源） */
interface LegacySettingsPartition {
  fromVersion: number;
  settings: ComicSettingsData;
}

export class ComicDatabaseService {
  private store: JsonFileStore<ComicProjectData>;
  private settingsStore: JsonFileStore<ComicSettingsData>;
  private readonly secretStorage = new SecretStorage(safeStorage);
  private data: ComicProjectData;
  private settings: ComicSettingsData;
  /** comic-settings.json 的落盘版本；低于 2 表示密钥尚未保护 */
  private settingsVersion = 2;
  /** 设置分区是否需要首次写入独立文件（读写分离迁移） */
  private needsInitialSettingsWrite = false;
  /** 读取主库时暂存的旧布局设置分区，取出即清空 */
  private pendingLegacySettings: LegacySettingsPartition | null = null;
  private initialized = false;

  constructor(private readonly imageStore: ProjectImageStore = projectImageStore) {
    const userDataPath = app.getPath('userData');

    this.store = new JsonFileStore<ComicProjectData>({
      filePath: path.join(userDataPath, 'comic-gen.json'),
      currentVersion: 2,
      createDefault: createDefaultProjectData,
      migrate: (raw, fromVersion) => {
        this.pendingLegacySettings = readLegacySettingsPartition(raw, fromVersion);
        return normalizeProjectData(raw);
      },
      logger: console,
    });
    this.settingsStore = new JsonFileStore<ComicSettingsData>({
      filePath: path.join(userDataPath, 'comic-settings.json'),
      currentVersion: 2,
      createDefault: createDefaultSettingsData,
      migrate: (raw, fromVersion) => {
        this.settingsVersion = fromVersion;
        return normalizeSettingsData(raw);
      },
      logger: console,
    });

    const hasSettingsFile = fs.existsSync(this.settingsStore.filePath);
    this.data = this.store.load();
    const legacy = this.takeLegacySettings();
    if (hasSettingsFile) {
      this.settings = this.settingsStore.load();
    } else {
      // 首次运行新布局：设置从旧主库里迁出（旧库没有就是全新安装）
      this.settings = legacy?.settings ?? createDefaultSettingsData();
      this.settingsVersion = legacy?.fromVersion ?? 2;
      this.needsInitialSettingsWrite = true;
    }
  }

  /** 取出并清空读取主库时暂存的旧设置分区（独立方法是为了拿到确定的联合类型） */
  private takeLegacySettings(): LegacySettingsPartition | null {
    const legacy = this.pendingLegacySettings;
    this.pendingLegacySettings = null;
    return legacy;
  }

  /** 设置分区落盘（项目数据不受影响） */
  private saveSettingsToFile(options?: { backupMode: 'previous' | 'current' | 'none' }): void {
    this.settingsStore.save(this.protectCredentials(this.settings), options);
    this.needsInitialSettingsWrite = false;
    this.settingsVersion = 2;
  }

  /** 项目数据落盘（设置分区不受影响，也不再携带设置字段） */
  private saveProjectDataToFile(): void {
    this.store.save(this.data);
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    const persisted = this.settings;
    const needsMigration = this.needsInitialSettingsWrite
      || this.settingsVersion < 2
      || persisted.modelConfigs.some((config) => this.secretStorage.hasUnprotectedFields(config, ['apiKey']))
      || this.secretStorage.hasUnprotectedFields(persisted.appSettings, ['picgoApiKey']);
    this.settings = this.revealCredentials(persisted);
    if (needsMigration) {
      // 迁移后立刻把备份也刷成已保护版本，避免旧备份里留明文密钥
      this.saveSettingsToFile({ backupMode: 'current' });
    }
    this.initialized = true;
    // 数据已在构造函数中加载
    await this.migrateInlineImages();
  }

  /**
   * 一次性迁移：把历史遗留的内联图片搬出库外，库文件从此只留引用。
   *
   * 幂等 —— 库里已无 `data:image/` 时立刻返回（只遍历对象结构，不序列化大字符串），
   * 所以每次启动调用它都没有代价。迁移前把原库另存一份作为回滚锚点。
   */
  private async migrateInlineImages(): Promise<void> {
    if (!hasInlineImagesInData(this.data)) return;

    const startedAt = Date.now();
    this.backupBeforeImageMigration();
    await this.externalizeAllImages();
    this.saveProjectDataToFile();
    console.log(`[project-images] 内联图片迁移完成，耗时 ${Date.now() - startedAt}ms`);
  }

  /**
   * 把整库内联图片外置（幂等）。
   *
   * 全部已是引用时只剩一遍对象结构遍历（不序列化大字符串），代价可以忽略 ——
   * 所以每个会改动项目库的写入口都可以安全地先过一遍它。
   * 素材 / 资产按各自的 `projectId` 归入对应项目目录；找不到项目时用 id 兜底目录名。
   */
  private async externalizeAllImages(): Promise<void> {
    const dirByProjectId = new Map<string, string>();
    const dirNameOf = (projectId: string): string => {
      const cached = dirByProjectId.get(projectId);
      if (cached) return cached;
      const project = this.data.projects.find((p) => p.id === projectId);
      const dirName = buildProjectDirName(project?.name, projectId);
      dirByProjectId.set(projectId, dirName);
      return dirName;
    };

    for (const project of this.data.projects) {
      await externalizeProjectImages(project, this.imageStore);
    }
    for (const asset of this.data.projectAssets) {
      await externalizeAssetImages(asset, dirNameOf(asset.projectId), this.imageStore);
    }
    for (const material of this.data.materials) {
      await externalizeMaterialImage(material, dirNameOf(material.projectId), this.imageStore);
    }
  }

  /** 写盘前统一外置，再落库。**项目库的每个写入口都要走这里**。 */
  private async persistProjectData(): Promise<void> {
    await this.externalizeAllImages();
    this.saveProjectDataToFile();
  }

  /**
   * 迁移前落一份原库备份。
   * 已存在则不覆盖 —— 多轮迁移时保留最早那份纯内联的原始数据，回滚锚点更可靠。
   */
  private backupBeforeImageMigration(): void {
    const sourcePath = this.store.filePath;
    if (!fs.existsSync(sourcePath)) return;
    const backupPath = `${sourcePath}.premigration.json`;
    if (fs.existsSync(backupPath)) return;
    try {
      fs.copyFileSync(sourcePath, backupPath);
      console.log(`[project-images] 迁移前备份：${backupPath}`);
    } catch (error) {
      // 备份失败就不迁移：没有回滚锚点比不优化危险得多
      throw new Error(`图片外置迁移前备份失败，已中止迁移：${String(error)}`);
    }
  }

  // ========== AppSettings ==========

  getAppSettings(): AppSettings {
    return { ...this.settings.appSettings };
  }

  saveAppSettings(settings: AppSettings): void {
    this.settings.appSettings = { ...this.settings.appSettings, ...settings };
    this.saveSettingsToFile();
  }

  // ========== Projects ==========

  getAllProjects(): ComicProject[] {
    return [...this.data.projects].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getProject(id: string): ComicProject | null {
    return this.data.projects.find((p) => p.id === id) || null;
  }

  /**
   * 保存项目。写盘前把内联图片外置到 `comic-images/`，并**返回外置后的 project**。
   *
   * 返回值这一步不可省：只在主进程写盘时替换是不够的 —— 渲染层内存里仍是全量 base64，
   * 下一次操作照样要搬运几百 MB。渲染层拿到返回值整体替换后，内存也跟着瘦身。
   */
  async saveProject(project: ComicProject): Promise<ComicProject> {
    await externalizeProjectImages(project, this.imageStore);
    const index = this.data.projects.findIndex((p) => p.id === project.id);
    if (index !== -1) {
      this.data.projects[index] = project;
    } else {
      this.data.projects.push(project);
    }
    await this.persistProjectData();
    return project;
  }

  deleteProject(id: string): void {
    this.data.projects = this.data.projects.filter((p) => p.id !== id);
    this.saveProjectDataToFile();
  }

  // ========== ModelConfigs ==========

  getAllModelConfigs(): ModelConfig[] {
    return [...this.settings.modelConfigs].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  saveModelConfig(config: ModelConfig): void {
    const index = this.settings.modelConfigs.findIndex((m) => m.id === config.id);
    if (index !== -1) {
      this.settings.modelConfigs[index] = config;
    } else {
      this.settings.modelConfigs.push(config);
    }
    this.saveSettingsToFile();
  }

  deleteModelConfig(id: string): void {
    this.settings.modelConfigs = this.settings.modelConfigs.filter((m) => m.id !== id);
    this.saveSettingsToFile();
  }

  // ========== PromptTemplates ==========

  getAllPromptTemplates(): PromptTemplate[] {
    return [...this.settings.promptTemplates].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  savePromptTemplate(template: PromptTemplate): void {
    const index = this.settings.promptTemplates.findIndex((t) => t.id === template.id);
    if (index !== -1) {
      this.settings.promptTemplates[index] = template;
    } else {
      this.settings.promptTemplates.push(template);
    }
    this.saveSettingsToFile();
  }

  deletePromptTemplate(id: string): void {
    this.settings.promptTemplates = this.settings.promptTemplates.filter((t) => t.id !== id);
    this.saveSettingsToFile();
  }

  // ========== ProjectAssets ==========

  getAllProjectAssets(): ProjectAsset[] {
    return this.data.projectAssets;
  }

  getProjectAssetsByProjectId(projectId: string): ProjectAsset[] {
    return this.data.projectAssets.filter((a) => a.projectId === projectId);
  }

  async saveProjectAsset(asset: ProjectAsset): Promise<void> {
    const index = this.data.projectAssets.findIndex((a) => a.id === asset.id);
    if (index !== -1) {
      this.data.projectAssets[index] = asset;
    } else {
      this.data.projectAssets.push(asset);
    }
    await this.persistProjectData();
  }

  async deleteProjectAsset(id: string): Promise<void> {
    this.data.projectAssets = this.data.projectAssets.filter((a) => a.id !== id);
    await this.persistProjectData();
  }

  async deleteProjectAssetsByProjectId(projectId: string): Promise<void> {
    this.data.projectAssets = this.data.projectAssets.filter((a) => a.projectId !== projectId);
    await this.persistProjectData();
  }

  // ========== Materials ==========

  getAllMaterials(): MaterialItem[] {
    return this.data.materials;
  }

  getMaterialsByProjectId(projectId: string): MaterialItem[] {
    return this.data.materials.filter((m) => m.projectId === projectId);
  }

  async saveMaterial(material: MaterialItem): Promise<void> {
    const index = this.data.materials.findIndex((m) => m.id === material.id);
    if (index !== -1) {
      this.data.materials[index] = material;
    } else {
      this.data.materials.push(material);
    }
    await this.persistProjectData();
  }

  async deleteMaterial(id: string): Promise<void> {
    this.data.materials = this.data.materials.filter((m) => m.id !== id);
    await this.persistProjectData();
  }

  async deleteMaterialsByProjectId(projectId: string): Promise<void> {
    this.data.materials = this.data.materials.filter((m) => m.projectId !== projectId);
    await this.persistProjectData();
  }

  // ========== GenerationTasks ==========

  getAllGenerationTasks(): GenerationTask[] {
    return this.data.generationTasks;
  }

  getGenerationTasksByProjectId(projectId: string): GenerationTask[] {
    return this.data.generationTasks.filter((t) => t.projectId === projectId);
  }

  saveGenerationTask(task: GenerationTask): void {
    const index = this.data.generationTasks.findIndex((t) => t.id === task.id);
    if (index !== -1) {
      this.data.generationTasks[index] = task;
    } else {
      this.data.generationTasks.push(task);
    }
    this.saveProjectDataToFile();
  }

  deleteGenerationTask(id: string): void {
    this.data.generationTasks = this.data.generationTasks.filter((t) => t.id !== id);
    this.saveProjectDataToFile();
  }

  deleteGenerationTasksByProjectId(projectId: string): void {
    this.data.generationTasks = this.data.generationTasks.filter((t) => t.projectId !== projectId);
    this.saveProjectDataToFile();
  }

  /**
   * 删除项目及其所有关联数据
   * 对应原 Dexie 的级联删除逻辑
   */
  async deleteProjectCascade(projectId: string): Promise<void> {
    this.data.generationTasks = this.data.generationTasks.filter((task) => task.projectId !== projectId);
    this.data.projectAssets = this.data.projectAssets.filter((asset) => asset.projectId !== projectId);
    this.data.materials = this.data.materials.filter((material) => material.projectId !== projectId);
    this.data.projects = this.data.projects.filter((project) => project.id !== projectId);
    this.saveProjectDataToFile();
    // 库记录删成功之后才回收图片目录：顺序反了，一旦写盘失败就是「项目还在、图全没了」。
    // 清理失败只留日志，残留文件不影响正确性。
    this.imageStore.removeProjectDirByProjectId(projectId);
  }

  // ========== 密钥保护（只作用于设置分区） ==========

  private protectCredentials(data: ComicSettingsData): ComicSettingsData {
    return {
      ...data,
      modelConfigs: data.modelConfigs.map((config) =>
        this.secretStorage.protectFields(config, ['apiKey']),
      ),
      appSettings: this.secretStorage.protectFields(data.appSettings, ['picgoApiKey']),
    };
  }

  private revealCredentials(data: ComicSettingsData): ComicSettingsData {
    return {
      ...data,
      modelConfigs: data.modelConfigs.map((config) =>
        this.secretStorage.revealFields(config, ['apiKey']),
      ),
      appSettings: this.secretStorage.revealFields(data.appSettings, ['picgoApiKey']),
    };
  }
}

function createDefaultProjectData(): ComicProjectData {
  return {
    schemaVersion: 2,
    projects: [],
    projectAssets: [],
    materials: [],
    generationTasks: [],
  };
}

function createDefaultSettingsData(): ComicSettingsData {
  return {
    schemaVersion: 2,
    modelConfigs: [],
    promptTemplates: [],
    appSettings: {},
  };
}

function normalizeProjectData(raw: unknown): ComicProjectData {
  const data = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return {
    schemaVersion: 2,
    projects: Array.isArray(data.projects) ? data.projects as ComicProject[] : [],
    projectAssets: Array.isArray(data.projectAssets) ? data.projectAssets as ProjectAsset[] : [],
    materials: Array.isArray(data.materials) ? data.materials as MaterialItem[] : [],
    generationTasks: Array.isArray(data.generationTasks) ? data.generationTasks as GenerationTask[] : [],
  };
}

function normalizeSettingsData(raw: unknown): ComicSettingsData {
  const data = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return {
    schemaVersion: 2,
    modelConfigs: Array.isArray(data.modelConfigs) ? data.modelConfigs as ModelConfig[] : [],
    promptTemplates: Array.isArray(data.promptTemplates) ? data.promptTemplates as PromptTemplate[] : [],
    appSettings: data.appSettings && typeof data.appSettings === 'object'
      ? data.appSettings as AppSettings
      : {},
  };
}

/**
 * 从旧版单文件主库里读出设置分区。
 * 新布局的主库已经不含这些字段，此时返回 null。
 */
function readLegacySettingsPartition(raw: unknown, fromVersion: number): LegacySettingsPartition | null {
  const data = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const hasPartition = Array.isArray(data.modelConfigs)
    || Array.isArray(data.promptTemplates)
    || (data.appSettings !== null && typeof data.appSettings === 'object');
  if (!hasPartition) return null;
  return { fromVersion, settings: normalizeSettingsData(data) };
}

export const comicDbService = new ComicDatabaseService();

// ========== 内联图片外置 ==========

/**
 * 图片字段名 → 磁盘分类。
 *
 * 字段名与来源一一对应（`generatedImageIds` 一定是生成图、`uploadedImageIds` 一定是上传图、
 * `referenceImageIds` 一定是发给模型的参考图），所以按 key 归类就够了，不需要额外元数据。
 */
const IMAGE_FIELD_KINDS: Record<string, ProjectImageKind> = {
  // 长篇项目
  generatedImageIds: 'generated',
  selectedImageId: 'generated',
  selectedImageIds: 'generated',
  uploadedImageIds: 'uploaded',
  referenceImageIds: 'reference',
  referenceImages: 'reference',
  // 公众号 / 短篇项目（`ComicProject.generatedImages` 是 Record<页索引, dataURL>）
  generatedImages: 'generated',
  generatedCoverImage: 'generated',
  // 资产（`ProjectAsset.outfits[].referenceImage` 是单张字符串，不是数组）
  referenceImage: 'reference',
};

/**
 * 页面参考图的三个分类字段（`pageRefImages` 的值对象固定是这三个）。
 *
 * 刻意**不**放进 `IMAGE_FIELD_KINDS`：`scene` / `prop` 这两个名字太通用，
 * 在别的结构里出现就会被误判成图片字段。
 */
const PAGE_REF_IMAGE_BUCKETS = ['character', 'scene', 'prop'] as const;

/** 一处图片字段的位置：`parent[key]` 里存着外置引用或内联 base64。 */
interface ProjectImageRef {
  /** 需要同时容纳数组索引与对象键，且值会被原地改写 */
  parent: any;
  key: string | number;
  kind: ProjectImageKind;
}

/** 递归收集项目里所有图片字段的位置（只记位置，不改值）。 */
function collectProjectImageRefs(
  node: unknown,
  refs: ProjectImageRef[],
  seen: Set<unknown> = new Set(),
): void {
  if (!node || typeof node !== 'object') return;
  if (seen.has(node)) return; // 防御循环引用
  seen.add(node);

  if (Array.isArray(node)) {
    for (const item of node) collectProjectImageRefs(item, refs, seen);
    return;
  }

  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    // 页面参考图比别的多嵌一层（页索引 → { character, scene, prop }），单独走一条路
    if (key === 'pageRefImages' && value && typeof value === 'object') {
      collectPageRefImageRefs(value, refs);
      continue;
    }
    const kind = IMAGE_FIELD_KINDS[key];
    if (kind) {
      collectImageFieldValue(node, key, value, kind, refs);
      // 命中图片字段就不再往里递归：图片只可能是字符串 / 字符串数组 / 字符串字典
      continue;
    }
    if (value && typeof value === 'object') collectProjectImageRefs(value, refs, seen);
  }
}

/**
 * 字段名命中图片语义后，按值的三种形态登记位置：
 * 单个字符串、字符串数组、以及字符串字典
 * （`ComicProject.generatedImages` 是 `{ "0": dataURL, ... }`，不是数组）。
 */
function collectImageFieldValue(
  owner: object,
  key: string,
  value: unknown,
  kind: ProjectImageKind,
  refs: ProjectImageRef[],
): void {
  if (typeof value === 'string') {
    if (value) refs.push({ parent: owner, key, kind });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (typeof item === 'string' && item) refs.push({ parent: value, key: index, kind });
    });
    return;
  }
  if (value && typeof value === 'object') {
    for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
      if (typeof subValue === 'string' && subValue) {
        refs.push({ parent: value, key: subKey, kind });
      }
    }
  }
}

/** `Record<页索引, { character: string[]; scene: string[]; prop: string[] }>` → 全是参考图。 */
function collectPageRefImageRefs(node: object, refs: ProjectImageRef[]): void {
  for (const bucket of Object.values(node as Record<string, unknown>)) {
    if (!bucket || typeof bucket !== 'object') continue;
    for (const field of PAGE_REF_IMAGE_BUCKETS) {
      const list = (bucket as Record<string, unknown>)[field];
      if (!Array.isArray(list)) continue;
      list.forEach((item, index) => {
        if (typeof item === 'string' && item) {
          refs.push({ parent: list, key: index, kind: 'reference' });
        }
      });
    }
  }
}

/** 给定结构里是否还有未外置的内联图片（只看对象结构，不序列化大字符串）。 */
function hasInlineImagesIn(node: unknown): boolean {
  const refs: ProjectImageRef[] = [];
  collectProjectImageRefs(node, refs);
  return refs.some(
    (ref) => typeof ref.parent[ref.key] === 'string'
      && (ref.parent[ref.key] as string).startsWith('data:image/'),
  );
}

/**
 * 项目里是否还有未外置的内联图片。
 *
 * 覆盖整个 project（不再只限 `longProjectData`）—— 公众号 / 短篇项目的图片挂在
 * `generatedImages` / `pageRefImages` / `syncData.cover.generatedCoverImage` 上。
 */
export function hasInlineProjectImages(project: ComicProject): boolean {
  return hasInlineImagesIn(project);
}

/** 整库里是否还有未外置的内联图片（projects + projectAssets + materials）。 */
export function hasInlineImagesInData(data: ComicProjectData): boolean {
  if (data.projects.some(hasInlineProjectImages)) return true;
  if (data.projectAssets.some((asset) => hasInlineImagesIn(asset))) return true;
  return data.materials.some(
    (material) => typeof material.url === 'string' && material.url.startsWith('data:image/'),
  );
}

/**
 * 把一批「图片位置」里内联的 base64 搬出到 `comic-images/`，原地替换成 `app-image://` 引用。
 *
 * 四步：
 *   ① 扫已外置的引用，收集现存目录名（判断目录是否要跟随项目改名）
 *   ② 需要改名就 `rename` 目录 —— **先 rename 成功再改引用前缀**，失败则保持旧名（不断链优先）
 *   ③ 已外置引用：替换目录前缀，并把 `hash → url` 灌进去重映射
 *   ④ 内联 base64：按内容 sha1 落盘；同 hash 已在映射里就直接复用（项目内去重）
 */
async function externalizeRefs(
  refs: ProjectImageRef[],
  desiredDir: string,
  store: ProjectImageStore,
): Promise<void> {
  if (!refs.length) return;

  // ① 现存目录名（正常只有一个；改名失败等边缘情况可能残留旧目录）
  const existingDirs = new Set<string>();
  for (const ref of refs) {
    const value = ref.parent[ref.key];
    if (typeof value !== 'string') continue;
    const parsed = parseComicImageUrl(value);
    if (parsed) existingDirs.add(parsed.dirName);
  }

  // ② 目录跟随项目改名
  const renamedDirs = new Map<string, string>();
  for (const dirName of existingDirs) {
    if (dirName === desiredDir) continue;
    if (store.renameProjectDir(dirName, desiredDir)) renamedDirs.set(dirName, desiredDir);
  }

  // ③ 已外置引用：换目录前缀 + 建去重映射
  const urlByHash = new Map<string, string>();
  for (const ref of refs) {
    const value = ref.parent[ref.key];
    if (typeof value !== 'string') continue;
    const parsed = parseComicImageUrl(value);
    if (!parsed) continue;
    const nextDir = renamedDirs.get(parsed.dirName) ?? parsed.dirName;
    const nextUrl = `${COMIC_IMAGE_URL_PREFIX}${encodeURIComponent(nextDir)}/${parsed.kind}/${parsed.filename}`;
    if (nextUrl !== value) ref.parent[ref.key] = nextUrl;
    urlByHash.set(parsed.hash, nextUrl);
  }

  // ④ 内联 base64 落盘
  for (const ref of refs) {
    const value = ref.parent[ref.key];
    if (typeof value !== 'string' || !value.startsWith('data:image/')) continue;
    const hash = hashImageDataUrl(value);
    if (!hash) continue;
    const cached = urlByHash.get(hash);
    if (cached) {
      ref.parent[ref.key] = cached;
      continue;
    }
    const url = await store.persistProjectImage(value, desiredDir, ref.kind);
    if (!url) continue;
    urlByHash.set(hash, url);
    ref.parent[ref.key] = url;
  }
}

/**
 * 外置一个项目自身的图片。
 * 遍历整个 project 而不是挑字段 —— 长篇在 `longProjectData`，公众号 / 短篇在
 * `generatedImages` / `pageRefImages` / `syncData`，靠 `IMAGE_FIELD_KINDS` 统一识别。
 * **原地修改**并返回同一个对象。
 */
export async function externalizeProjectImages(
  project: ComicProject,
  store: ProjectImageStore = projectImageStore,
): Promise<ComicProject> {
  if (!project || typeof project !== 'object') return project;
  const refs: ProjectImageRef[] = [];
  collectProjectImageRefs(project, refs);
  await externalizeRefs(refs, buildProjectDirName(project.name, project.id), store);
  refreshSyncImageSignature(project);
  return project;
}

/**
 * 复现渲染层 `useComicSyncStore.init` 的图片签名算法（`stores/sync.ts`）：
 * `generatedImages` 按页索引升序取所有非空值，用 `|` 拼起来。
 */
function computeSyncImageSignature(generatedImages: unknown): string | null {
  if (!generatedImages || typeof generatedImages !== 'object') return null;
  const entries = Object.entries(generatedImages as Record<string, unknown>)
    .map(([key, value]) => [Number(key), value] as [number, unknown])
    .filter(([, value]) => typeof value === 'string' && value.length > 0)
    .sort((a, b) => a[0] - b[0]);
  if (!entries.length) return null;
  return entries.map(([, value]) => value as string).join('|');
}

/**
 * 外置后把 `syncData.imageSignature` 刷成与渲染层一致的结果。
 *
 * ⚠️ 这一步不能省：签名对不上时 PageSync 会判定「图片已变化」，进而**清空用户编辑的
 * 正文 contentBlocks、容器样式与整份封面配置**（见 `stores/sync.ts` 的 changed 分支）。
 * 外置把路径从 base64 换成 `app-image://`，签名必然变 —— 不刷新就等于拿用户的同步成果
 * 去换性能。
 *
 * 只在签名原本就存在（用户确实用过同步页）时才写，不给没同步过的项目凭空造字段。
 */
function refreshSyncImageSignature(project: ComicProject): void {
  const syncData = project.syncData;
  if (!syncData || typeof syncData.imageSignature !== 'string') return;
  const signature = computeSyncImageSignature(project.generatedImages);
  if (signature) syncData.imageSignature = signature;
}

/** 外置一个资产的图片（`referenceImages` / `generatedImages` / `outfits[].referenceImage`）。 */
export async function externalizeAssetImages(
  asset: ProjectAsset,
  dirName: string,
  store: ProjectImageStore = projectImageStore,
): Promise<void> {
  if (!asset || typeof asset !== 'object') return;
  const refs: ProjectImageRef[] = [];
  collectProjectImageRefs(asset, refs);
  await externalizeRefs(refs, dirName, store);
}

/**
 * 外置一条素材的图片。
 *
 * `MaterialItem.url` 这个字段名太通用，不能进 `IMAGE_FIELD_KINDS`（别的结构里也有 `url`），
 * 所以只针对这一条记录单独处理。素材是从资产参考图同步来的，归 `reference`。
 */
export async function externalizeMaterialImage(
  material: MaterialItem,
  dirName: string,
  store: ProjectImageStore = projectImageStore,
): Promise<void> {
  if (!material || typeof material !== 'object') return;
  if (typeof material.url !== 'string') return;
  await externalizeRefs([{ parent: material, key: 'url', kind: 'reference' }], dirName, store);
}

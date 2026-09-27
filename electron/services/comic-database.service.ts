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

  constructor() {
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

  saveProject(project: ComicProject): void {
    const index = this.data.projects.findIndex((p) => p.id === project.id);
    if (index !== -1) {
      this.data.projects[index] = project;
    } else {
      this.data.projects.push(project);
    }
    this.saveProjectDataToFile();
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

  saveProjectAsset(asset: ProjectAsset): void {
    const index = this.data.projectAssets.findIndex((a) => a.id === asset.id);
    if (index !== -1) {
      this.data.projectAssets[index] = asset;
    } else {
      this.data.projectAssets.push(asset);
    }
    this.saveProjectDataToFile();
  }

  deleteProjectAsset(id: string): void {
    this.data.projectAssets = this.data.projectAssets.filter((a) => a.id !== id);
    this.saveProjectDataToFile();
  }

  deleteProjectAssetsByProjectId(projectId: string): void {
    this.data.projectAssets = this.data.projectAssets.filter((a) => a.projectId !== projectId);
    this.saveProjectDataToFile();
  }

  // ========== Materials ==========

  getAllMaterials(): MaterialItem[] {
    return this.data.materials;
  }

  getMaterialsByProjectId(projectId: string): MaterialItem[] {
    return this.data.materials.filter((m) => m.projectId === projectId);
  }

  saveMaterial(material: MaterialItem): void {
    const index = this.data.materials.findIndex((m) => m.id === material.id);
    if (index !== -1) {
      this.data.materials[index] = material;
    } else {
      this.data.materials.push(material);
    }
    this.saveProjectDataToFile();
  }

  deleteMaterial(id: string): void {
    this.data.materials = this.data.materials.filter((m) => m.id !== id);
    this.saveProjectDataToFile();
  }

  deleteMaterialsByProjectId(projectId: string): void {
    this.data.materials = this.data.materials.filter((m) => m.projectId !== projectId);
    this.saveProjectDataToFile();
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
  deleteProjectCascade(projectId: string): void {
    this.data.generationTasks = this.data.generationTasks.filter((task) => task.projectId !== projectId);
    this.data.projectAssets = this.data.projectAssets.filter((asset) => asset.projectId !== projectId);
    this.data.materials = this.data.materials.filter((material) => material.projectId !== projectId);
    this.data.projects = this.data.projects.filter((project) => project.id !== projectId);
    this.saveProjectDataToFile();
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

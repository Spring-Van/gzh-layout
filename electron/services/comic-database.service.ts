/**
 * Comic 模块数据库服务
 * 采用 JSON 文件存储（与现有 DatabaseService 同构），替代原 Dexie/IndexedDB
 * 存储路径：userData/comic-gen.json
 */

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

interface ComicDatabaseData {
  schemaVersion: number;
  projects: ComicProject[];
  modelConfigs: ModelConfig[];
  promptTemplates: PromptTemplate[];
  projectAssets: ProjectAsset[];
  materials: MaterialItem[];
  generationTasks: GenerationTask[];
  appSettings: AppSettings;
}

export class ComicDatabaseService {
  private store: JsonFileStore<ComicDatabaseData>;
  private data: ComicDatabaseData;
  private readonly secretStorage = new SecretStorage(safeStorage);
  private loadedVersion = 2;
  private initialized = false;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.store = new JsonFileStore({
      filePath: path.join(userDataPath, 'comic-gen.json'),
      currentVersion: 2,
      createDefault: createDefaultComicDatabaseData,
      migrate: (raw, fromVersion) => {
        this.loadedVersion = fromVersion;
        return normalizeComicDatabaseData(raw);
      },
      logger: console,
    });
    this.data = this.store.load();
  }

  private saveToFile(): void {
    this.store.save(this.protectCredentials(this.data));
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    const persisted = this.data;
    const needsMigration = this.loadedVersion < 2
      || persisted.modelConfigs.some((config) => this.secretStorage.hasUnprotectedFields(config, ['apiKey']))
      || this.secretStorage.hasUnprotectedFields(persisted.appSettings, ['picgoApiKey']);
    this.data = this.revealCredentials(persisted);
    if (needsMigration) {
      this.store.save(this.protectCredentials(this.data), { backupMode: 'current' });
      this.loadedVersion = 2;
    }
    this.initialized = true;
    // 数据已在构造函数中加载
  }

  // ========== AppSettings ==========

  getAppSettings(): AppSettings {
    return { ...this.data.appSettings };
  }

  saveAppSettings(settings: AppSettings): void {
    this.data.appSettings = { ...this.data.appSettings, ...settings };
    this.saveToFile();
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
    this.saveToFile();
  }

  deleteProject(id: string): void {
    this.data.projects = this.data.projects.filter((p) => p.id !== id);
    this.saveToFile();
  }

  // ========== ModelConfigs ==========

  getAllModelConfigs(): ModelConfig[] {
    return [...this.data.modelConfigs].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  saveModelConfig(config: ModelConfig): void {
    const index = this.data.modelConfigs.findIndex((m) => m.id === config.id);
    if (index !== -1) {
      this.data.modelConfigs[index] = config;
    } else {
      this.data.modelConfigs.push(config);
    }
    this.saveToFile();
  }

  deleteModelConfig(id: string): void {
    this.data.modelConfigs = this.data.modelConfigs.filter((m) => m.id !== id);
    this.saveToFile();
  }

  // ========== PromptTemplates ==========

  getAllPromptTemplates(): PromptTemplate[] {
    return [...this.data.promptTemplates].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  savePromptTemplate(template: PromptTemplate): void {
    const index = this.data.promptTemplates.findIndex((t) => t.id === template.id);
    if (index !== -1) {
      this.data.promptTemplates[index] = template;
    } else {
      this.data.promptTemplates.push(template);
    }
    this.saveToFile();
  }

  deletePromptTemplate(id: string): void {
    this.data.promptTemplates = this.data.promptTemplates.filter((t) => t.id !== id);
    this.saveToFile();
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
    this.saveToFile();
  }

  deleteProjectAsset(id: string): void {
    this.data.projectAssets = this.data.projectAssets.filter((a) => a.id !== id);
    this.saveToFile();
  }

  deleteProjectAssetsByProjectId(projectId: string): void {
    this.data.projectAssets = this.data.projectAssets.filter((a) => a.projectId !== projectId);
    this.saveToFile();
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
    this.saveToFile();
  }

  deleteMaterial(id: string): void {
    this.data.materials = this.data.materials.filter((m) => m.id !== id);
    this.saveToFile();
  }

  deleteMaterialsByProjectId(projectId: string): void {
    this.data.materials = this.data.materials.filter((m) => m.projectId !== projectId);
    this.saveToFile();
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
    this.saveToFile();
  }

  deleteGenerationTask(id: string): void {
    this.data.generationTasks = this.data.generationTasks.filter((t) => t.id !== id);
    this.saveToFile();
  }

  deleteGenerationTasksByProjectId(projectId: string): void {
    this.data.generationTasks = this.data.generationTasks.filter((t) => t.projectId !== projectId);
    this.saveToFile();
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
    this.saveToFile();
  }

  private protectCredentials(data: ComicDatabaseData): ComicDatabaseData {
    return {
      ...data,
      modelConfigs: data.modelConfigs.map((config) =>
        this.secretStorage.protectFields(config, ['apiKey']),
      ),
      appSettings: this.secretStorage.protectFields(data.appSettings, ['picgoApiKey']),
    };
  }

  private revealCredentials(data: ComicDatabaseData): ComicDatabaseData {
    return {
      ...data,
      modelConfigs: data.modelConfigs.map((config) =>
        this.secretStorage.revealFields(config, ['apiKey']),
      ),
      appSettings: this.secretStorage.revealFields(data.appSettings, ['picgoApiKey']),
    };
  }
}

function createDefaultComicDatabaseData(): ComicDatabaseData {
  return {
    schemaVersion: 2,
    projects: [],
    modelConfigs: [],
    promptTemplates: [],
    projectAssets: [],
    materials: [],
    generationTasks: [],
    appSettings: {},
  };
}

function normalizeComicDatabaseData(raw: unknown): ComicDatabaseData {
  const data = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return {
    schemaVersion: 2,
    projects: Array.isArray(data.projects) ? data.projects as ComicProject[] : [],
    modelConfigs: Array.isArray(data.modelConfigs) ? data.modelConfigs as ModelConfig[] : [],
    promptTemplates: Array.isArray(data.promptTemplates) ? data.promptTemplates as PromptTemplate[] : [],
    projectAssets: Array.isArray(data.projectAssets) ? data.projectAssets as ProjectAsset[] : [],
    materials: Array.isArray(data.materials) ? data.materials as MaterialItem[] : [],
    generationTasks: Array.isArray(data.generationTasks) ? data.generationTasks as GenerationTask[] : [],
    appSettings: data.appSettings && typeof data.appSettings === 'object'
      ? data.appSettings as AppSettings
      : {},
  };
}

export const comicDbService = new ComicDatabaseService();

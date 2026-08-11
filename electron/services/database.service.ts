import path from 'path';
import { app, safeStorage } from 'electron';
import type { ProjectConfig, CustomTemplate, CoverTemplate, WechatAccount, DraftRecord, StyleTemplate } from '../../src/types';
import { JsonFileStore } from './json-file-store';
import { SecretStorage } from './secret-storage';

const WECHAT_SECRET_FIELDS = ['appSecret', 'accessToken'] as const;

interface DatabaseData {
    schemaVersion: number;
    projects: ProjectConfig[];
    templates: CustomTemplate[];
    coverTemplates: CoverTemplate[];
    styleTemplates: StyleTemplate[];
    wechatAccounts: WechatAccount[];
    draftRecords: DraftRecord[];
}

export class DatabaseService {
    private store: JsonFileStore<DatabaseData>;
    private data: DatabaseData;
    private readonly secretStorage = new SecretStorage(safeStorage);
    private loadedVersion = 2;
    private initialized = false;

    constructor() {
        const userDataPath = app.getPath('userData');
        this.store = new JsonFileStore({
            filePath: path.join(userDataPath, 'gzh-layout.json'),
            currentVersion: 2,
            createDefault: createDefaultDatabaseData,
            migrate: (raw, fromVersion) => {
                this.loadedVersion = fromVersion;
                return normalizeDatabaseData(raw);
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
        const needsMigration = this.loadedVersion < 2 || persisted.wechatAccounts.some((account) =>
            this.secretStorage.hasUnprotectedFields(account, WECHAT_SECRET_FIELDS),
        );
        this.data = this.revealCredentials(persisted);
        if (needsMigration) {
            this.store.save(this.protectCredentials(this.data), { backupMode: 'current' });
            this.loadedVersion = 2;
        }
        this.initialized = true;
        // 数据已在构造函数中加载
    }

    private protectCredentials(data: DatabaseData): DatabaseData {
        return {
            ...data,
            wechatAccounts: data.wechatAccounts.map((account) =>
                this.secretStorage.protectFields(account, WECHAT_SECRET_FIELDS),
            ),
        };
    }

    private revealCredentials(data: DatabaseData): DatabaseData {
        return {
            ...data,
            wechatAccounts: data.wechatAccounts.map((account) =>
                this.secretStorage.revealFields(account, WECHAT_SECRET_FIELDS),
            ),
        };
    }

    // ========== Projects ==========

    getAllProjects(): ProjectConfig[] {
        return [...this.data.projects].sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }

    getProject(projectId: string): ProjectConfig | null {
        return this.data.projects.find(p => p.projectId === projectId) || null;
    }

    saveProject(project: ProjectConfig): void {
        const index = this.data.projects.findIndex(p => p.projectId === project.projectId);
        if (index !== -1) {
            this.data.projects[index] = project;
        } else {
            this.data.projects.push(project);
        }
        this.saveToFile();
    }

    deleteProject(projectId: string): void {
        this.data.projects = this.data.projects.filter(p => p.projectId !== projectId);
        this.saveToFile();
    }

    // ========== Templates ==========

    getAllTemplates(): CustomTemplate[] {
        return [...this.data.templates].sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }

    saveTemplate(template: CustomTemplate): void {
        const index = this.data.templates.findIndex(t => t.id === template.id);
        if (index !== -1) {
            this.data.templates[index] = template;
        } else {
            this.data.templates.push(template);
        }
        this.saveToFile();
    }

    deleteTemplate(templateId: string): void {
        this.data.templates = this.data.templates.filter(t => t.id !== templateId);
        this.saveToFile();
    }

    // ========== Cover Templates ==========

    getAllCoverTemplates(): CoverTemplate[] {
        return [...this.data.coverTemplates].sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }

    saveCoverTemplate(template: CoverTemplate): void {
        const index = this.data.coverTemplates.findIndex(t => t.id === template.id);
        if (index !== -1) {
            this.data.coverTemplates[index] = template;
        } else {
            this.data.coverTemplates.push(template);
        }
        this.saveToFile();
    }

    deleteCoverTemplate(templateId: string): void {
        this.data.coverTemplates = this.data.coverTemplates.filter(t => t.id !== templateId);
        this.saveToFile();
    }

    // ========== Style Templates ==========

    getAllStyleTemplates(): StyleTemplate[] {
        return [...this.data.styleTemplates].sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }

    saveStyleTemplate(template: StyleTemplate): void {
        const index = this.data.styleTemplates.findIndex(t => t.id === template.id);
        if (index !== -1) {
            this.data.styleTemplates[index] = template;
        } else {
            this.data.styleTemplates.push(template);
        }
        this.saveToFile();
    }

    deleteStyleTemplate(templateId: string): void {
        this.data.styleTemplates = this.data.styleTemplates.filter(t => t.id !== templateId);
        this.saveToFile();
    }

    // ========== Wechat Accounts ==========

    getAllWechatAccounts(): WechatAccount[] {
        return [...this.data.wechatAccounts];
    }

    getWechatAccount(accountId: string): WechatAccount | null {
        return this.data.wechatAccounts.find(a => a.id === accountId) || null;
    }

    getActiveWechatAccount(): WechatAccount | null {
        return this.data.wechatAccounts.find(a => a.isActive) || null;
    }

    getDefaultSyncWechatAccount(): WechatAccount | null {
        return this.data.wechatAccounts.find(a => a.isDefaultSync) || null;
    }

    saveWechatAccount(account: WechatAccount): void {
        const index = this.data.wechatAccounts.findIndex(a => a.id === account.id);
        if (index !== -1) {
            this.data.wechatAccounts[index] = account;
        } else {
            this.data.wechatAccounts.push(account);
        }
        this.saveToFile();
    }

    setActiveWechatAccount(accountId: string): void {
        this.data.wechatAccounts.forEach(a => {
            a.isActive = a.id === accountId;
        });
        this.saveToFile();
    }

    setDefaultSyncWechatAccount(accountId: string): void {
        const target = this.data.wechatAccounts.find(a => a.id === accountId);
        // toggle 模式：如果该账号已是默认同步，则取消（允许全部取消）
        if (target && target.isDefaultSync) {
            this.data.wechatAccounts.forEach(a => {
                a.isDefaultSync = false;
            });
        } else {
            this.data.wechatAccounts.forEach(a => {
                a.isDefaultSync = a.id === accountId;
            });
        }
        this.saveToFile();
    }

    deleteWechatAccount(accountId: string): void {
        this.data.wechatAccounts = this.data.wechatAccounts.filter(a => a.id !== accountId);
        this.saveToFile();
    }
}

function createDefaultDatabaseData(): DatabaseData {
    return {
        schemaVersion: 2,
        projects: [],
        templates: [],
        coverTemplates: [],
        styleTemplates: [],
        wechatAccounts: [],
        draftRecords: [],
    };
}

function normalizeDatabaseData(raw: unknown): DatabaseData {
    const data = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    return {
        schemaVersion: 2,
        projects: Array.isArray(data.projects) ? data.projects as ProjectConfig[] : [],
        templates: Array.isArray(data.templates) ? data.templates as CustomTemplate[] : [],
        coverTemplates: Array.isArray(data.coverTemplates) ? data.coverTemplates as CoverTemplate[] : [],
        styleTemplates: Array.isArray(data.styleTemplates) ? data.styleTemplates as StyleTemplate[] : [],
        wechatAccounts: Array.isArray(data.wechatAccounts) ? data.wechatAccounts as WechatAccount[] : [],
        draftRecords: Array.isArray(data.draftRecords) ? data.draftRecords as DraftRecord[] : [],
    };
}

export const dbService = new DatabaseService();

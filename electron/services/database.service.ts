import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import type { ProjectConfig, CustomTemplate, CoverTemplate, WechatAccount, DraftRecord } from '../../src/types';

interface DatabaseData {
    projects: ProjectConfig[];
    templates: CustomTemplate[];
    coverTemplates: CoverTemplate[];
    wechatAccounts: WechatAccount[];
    draftRecords: DraftRecord[];
}

export class DatabaseService {
    private dbPath: string;
    private data: DatabaseData;

    constructor() {
        const userDataPath = app.getPath('userData');
        this.dbPath = path.join(userDataPath, 'gzh-layout.json');
        this.data = this.loadFromFile();
    }

    private loadFromFile(): DatabaseData {
        if (fs.existsSync(this.dbPath)) {
            try {
                const content = fs.readFileSync(this.dbPath, 'utf-8');
                const data = JSON.parse(content);
                return {
                    projects: data.projects || [],
                    templates: data.templates || [],
                    coverTemplates: data.coverTemplates || [],
                    wechatAccounts: data.wechatAccounts || [],
                    draftRecords: data.draftRecords || [],
                };
            } catch (error) {
                console.error('读取数据库文件失败:', error);
            }
        }
        return {
            projects: [],
            templates: [],
            coverTemplates: [],
            wechatAccounts: [],
            draftRecords: [],
        };
    }

    private saveToFile(): void {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
        } catch (error) {
            console.error('保存数据库文件失败:', error);
        }
    }

    async init(): Promise<void> {
        // 数据已在构造函数中加载
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
        this.data.wechatAccounts.forEach(a => {
            a.isDefaultSync = a.id === accountId;
        });
        this.saveToFile();
    }

    deleteWechatAccount(accountId: string): void {
        this.data.wechatAccounts = this.data.wechatAccounts.filter(a => a.id !== accountId);
        this.saveToFile();
    }
}

export const dbService = new DatabaseService();

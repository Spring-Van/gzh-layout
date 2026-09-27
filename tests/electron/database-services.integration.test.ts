import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const electronState = vi.hoisted(() => ({ userDataPath: '' }));

vi.mock('electron', () => ({
  app: { getPath: () => electronState.userDataPath },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (value: string) => Buffer.from(`encrypted:${value}`),
    decryptString: (value: Buffer) => value.toString().replace(/^encrypted:/, ''),
  },
}));

let temporaryDirectory = '';
const extraTemporaryDirectories: string[] = [];
let DatabaseService: typeof import('../../electron/services/database.service').DatabaseService;
let ComicDatabaseService: typeof import('../../electron/services/comic-database.service').ComicDatabaseService;

beforeAll(async () => {
  temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'gzh-database-'));
  electronState.userDataPath = temporaryDirectory;
  ({ DatabaseService } = await import('../../electron/services/database.service'));
  ({ ComicDatabaseService } = await import('../../electron/services/comic-database.service'));
});

afterAll(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
  for (const directory of extraTemporaryDirectories.splice(0)) {
    await rm(directory, { recursive: true, force: true });
  }
});

describe('database service integration', () => {
  it('persists projects and protects WeChat credentials across instances', async () => {
    const first = new DatabaseService();
    await first.init();
    first.saveProject({ projectId: 'project-1', name: 'Project', updatedAt: '2026-08-10' } as never);
    first.saveWechatAccount({
      id: 'account-1',
      name: 'Account',
      appId: 'app-id',
      appSecret: 'secret',
      accessToken: 'token',
    } as never);

    const persisted = await readFile(path.join(temporaryDirectory, 'gzh-layout.json'), 'utf8');
    expect(persisted).not.toContain('"appSecret": "secret"');
    expect(persisted).not.toContain('"accessToken": "token"');

    const second = new DatabaseService();
    await second.init();
    expect(second.getProject('project-1')?.name).toBe('Project');
    expect(second.getWechatAccount('account-1')).toMatchObject({
      appSecret: 'secret',
      accessToken: 'token',
    });
  });

  it('persists comic projects, models, and app settings across instances', async () => {
    const first = new ComicDatabaseService();
    await first.init();
    first.saveProject({ id: 'comic-1', name: 'Comic', createdAt: 1, updatedAt: 2 } as never);
    first.saveModelConfig({
      id: 'model-1',
      name: 'Model',
      category: 'image',
      apiKey: 'model-secret',
      sortOrder: 0,
    } as never);
    first.saveAppSettings({ exportDir: 'D:/exports', picgoApiKey: 'picgo-secret' });

    // 设置分区独立落盘，且密钥不以明文出现
    const settingsPersisted = await readFile(path.join(temporaryDirectory, 'comic-settings.json'), 'utf8');
    expect(settingsPersisted).not.toContain('model-secret');
    expect(settingsPersisted).not.toContain('picgo-secret');
    expect(JSON.parse(settingsPersisted).promptTemplates).toEqual([]);

    // 项目主库不再携带设置分区，保存设置无需重写数百 MB 的项目数据
    const projectPersisted = await readFile(path.join(temporaryDirectory, 'comic-gen.json'), 'utf8');
    expect(projectPersisted).not.toContain('model-secret');
    expect(projectPersisted).not.toContain('picgo-secret');
    expect(projectPersisted).not.toContain('"modelConfigs"');
    expect(projectPersisted).not.toContain('"promptTemplates"');
    expect(projectPersisted).not.toContain('"appSettings"');

    const second = new ComicDatabaseService();
    await second.init();
    expect(second.getProject('comic-1')?.name).toBe('Comic');
    expect(second.getAllModelConfigs()[0].apiKey).toBe('model-secret');
    expect(second.getAppSettings()).toEqual({
      exportDir: 'D:/exports',
      picgoApiKey: 'picgo-secret',
    });
  });

  it('migrates the settings partition out of a legacy single-file database', async () => {
    const legacyDirectory = await mkdtemp(path.join(os.tmpdir(), 'gzh-database-legacy-'));
    extraTemporaryDirectories.push(legacyDirectory);
    const previousUserDataPath = electronState.userDataPath;
    electronState.userDataPath = legacyDirectory;

    try {
      // 旧布局：设置分区混在项目主库里（密钥为明文，需要保护后迁出）
      await writeFile(
        path.join(legacyDirectory, 'comic-gen.json'),
        JSON.stringify({
          schemaVersion: 2,
          projects: [{ id: 'legacy-project', name: 'Legacy', createdAt: 1, updatedAt: 2 }],
          projectAssets: [],
          materials: [],
          generationTasks: [],
          modelConfigs: [{ id: 'legacy-model', name: 'Legacy Model', category: 'llm', apiKey: 'legacy-secret', sortOrder: 0 }],
          promptTemplates: [{ id: 'legacy-template', name: 'T', type: 'extract', content: 'x', sortOrder: 0, createdAt: 1, updatedAt: 2 }],
          appSettings: { exportDir: 'D:/legacy' },
        }),
        'utf8',
      );

      const service = new ComicDatabaseService();
      await service.init();

      expect(service.getProject('legacy-project')?.name).toBe('Legacy');
      expect(service.getAllModelConfigs()[0].apiKey).toBe('legacy-secret');
      expect(service.getAllPromptTemplates()).toHaveLength(1);
      expect(service.getAppSettings().exportDir).toBe('D:/legacy');

      // 迁出后的设置文件里不应有明文密钥，重启也读得到
      const migratedSettings = await readFile(path.join(legacyDirectory, 'comic-settings.json'), 'utf8');
      expect(migratedSettings).not.toContain('legacy-secret');

      const restarted = new ComicDatabaseService();
      await restarted.init();
      expect(restarted.getAllModelConfigs()[0].apiKey).toBe('legacy-secret');
      expect(restarted.getProject('legacy-project')?.name).toBe('Legacy');
    } finally {
      electronState.userDataPath = previousUserDataPath;
    }
  });
});

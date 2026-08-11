import { mkdtemp, readFile, rm } from 'node:fs/promises';
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

    const persisted = await readFile(path.join(temporaryDirectory, 'comic-gen.json'), 'utf8');
    expect(persisted).not.toContain('model-secret');
    expect(persisted).not.toContain('picgo-secret');

    const second = new ComicDatabaseService();
    await second.init();
    expect(second.getProject('comic-1')?.name).toBe('Comic');
    expect(second.getAllModelConfigs()[0].apiKey).toBe('model-secret');
    expect(second.getAppSettings()).toEqual({
      exportDir: 'D:/exports',
      picgoApiKey: 'picgo-secret',
    });
  });
});

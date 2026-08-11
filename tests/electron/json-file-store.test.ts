import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JsonFileStore, UnsupportedSchemaVersionError } from '../../electron/services/json-file-store';

interface TestData {
  schemaVersion: number;
  items: string[];
}

const tempDirectories: string[] = [];

function createStore() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gzh-json-store-'));
  tempDirectories.push(directory);
  const filePath = path.join(directory, 'data.json');
  const migrate = vi.fn((raw: unknown, _fromVersion: number): TestData => {
    const data = raw as Partial<TestData>;
    return { schemaVersion: 1, items: Array.isArray(data.items) ? data.items : [] };
  });
  return {
    filePath,
    migrate,
    store: new JsonFileStore<TestData>({
      filePath,
      currentVersion: 1,
      createDefault: () => ({ schemaVersion: 1, items: [] }),
      migrate,
      logger: { warn: vi.fn(), error: vi.fn() },
    }),
  };
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('JsonFileStore', () => {
  it('migrates legacy data without a schema version', () => {
    const { filePath, migrate, store } = createStore();
    fs.writeFileSync(filePath, JSON.stringify({ items: ['legacy'] }));

    expect(store.load()).toEqual({ schemaVersion: 1, items: ['legacy'] });
    expect(migrate).toHaveBeenCalledWith({ items: ['legacy'] }, 0);
  });

  it('writes valid versioned JSON and removes the temporary file', () => {
    const { filePath, store } = createStore();
    store.save({ schemaVersion: 0, items: ['first'] });

    expect(JSON.parse(fs.readFileSync(filePath, 'utf8'))).toEqual({ schemaVersion: 1, items: ['first'] });
    expect(fs.existsSync(`${filePath}.tmp`)).toBe(false);
  });

  it('backs up the previous valid primary before replacing it', () => {
    const { filePath, store } = createStore();
    store.save({ schemaVersion: 1, items: ['first'] });
    store.save({ schemaVersion: 1, items: ['second'] });

    expect(JSON.parse(fs.readFileSync(`${filePath}.bak`, 'utf8')).items).toEqual(['first']);
    expect(JSON.parse(fs.readFileSync(filePath, 'utf8')).items).toEqual(['second']);
  });

  it('can replace a legacy backup with the newly written current data', () => {
    const { filePath, store } = createStore();
    fs.writeFileSync(filePath, JSON.stringify({ items: ['plaintext-legacy'] }));

    store.save({ schemaVersion: 1, items: ['protected-current'] }, { backupMode: 'current' });

    expect(JSON.parse(fs.readFileSync(filePath, 'utf8')).items).toEqual(['protected-current']);
    expect(JSON.parse(fs.readFileSync(`${filePath}.bak`, 'utf8')).items).toEqual(['protected-current']);
  });

  it('loads the backup when the primary file is corrupt', () => {
    const { filePath, store } = createStore();
    store.save({ schemaVersion: 1, items: ['backup'] });
    store.save({ schemaVersion: 1, items: ['current'] });
    fs.writeFileSync(filePath, '{broken');

    expect(store.load().items).toEqual(['backup']);
    store.save({ schemaVersion: 1, items: ['recovered'] });
    expect(JSON.parse(fs.readFileSync(`${filePath}.bak`, 'utf8')).items).toEqual(['backup']);
  });

  it('rejects data created by a newer schema', () => {
    const { filePath, store } = createStore();
    fs.writeFileSync(filePath, JSON.stringify({ schemaVersion: 2, items: [] }));

    expect(() => store.load()).toThrow(UnsupportedSchemaVersionError);
  });
});

import fs from 'node:fs';
import path from 'node:path';

export interface VersionedJsonData {
  schemaVersion: number;
}

interface JsonFileStoreOptions<T extends VersionedJsonData> {
  filePath: string;
  currentVersion: number;
  createDefault: () => T;
  migrate: (raw: unknown, fromVersion: number) => T;
  logger?: Pick<Console, 'warn' | 'error'>;
}

interface JsonFileSaveOptions {
  backupMode?: 'previous' | 'current' | 'none';
}

export class UnsupportedSchemaVersionError extends Error {}

/** Versioned JSON storage with atomic writes, backups, and recovery. */
export class JsonFileStore<T extends VersionedJsonData> {
  readonly filePath: string;
  readonly backupPath: string;
  readonly tempPath: string;

  private readonly options: JsonFileStoreOptions<T>;
  private skipNextBackup = false;

  constructor(options: JsonFileStoreOptions<T>) {
    this.options = options;
    this.filePath = options.filePath;
    this.backupPath = `${options.filePath}.bak`;
    this.tempPath = `${options.filePath}.tmp`;
  }

  load(): T {
    const primary = this.tryLoad(this.filePath, 'primary file');
    if (primary) return primary;

    const backup = this.tryLoad(this.backupPath, 'backup file');
    if (backup) {
      this.skipNextBackup = true;
      this.options.logger?.warn(`Recovered JSON data from backup: ${this.backupPath}`);
      return backup;
    }

    return this.withCurrentVersion(this.options.createDefault());
  }

  save(data: T, options: JsonFileSaveOptions = {}): void {
    const serialized = JSON.stringify(this.withCurrentVersion(data), null, 2);
    const backupMode = options.backupMode ?? 'previous';
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

    try {
      this.writeAndSyncTempFile(serialized);
      JSON.parse(fs.readFileSync(this.tempPath, 'utf8'));

      if (backupMode === 'previous' && !this.skipNextBackup && fs.existsSync(this.filePath)) {
        fs.copyFileSync(this.filePath, this.backupPath);
      }

      this.replacePrimaryWithTemp();
      if (backupMode === 'current') {
        fs.copyFileSync(this.filePath, this.backupPath);
      }
      this.skipNextBackup = false;
    } catch (error) {
      this.removeIfExists(this.tempPath);
      this.options.logger?.error(`Failed to save JSON data: ${this.filePath}`, error);
      throw error;
    }
  }

  private tryLoad(candidatePath: string, label: string): T | null {
    if (!fs.existsSync(candidatePath)) return null;

    try {
      const raw = JSON.parse(fs.readFileSync(candidatePath, 'utf8')) as unknown;
      const version = this.readSchemaVersion(raw);
      if (version > this.options.currentVersion) {
        throw new UnsupportedSchemaVersionError(
          `Data schema version ${version} is newer than supported version ${this.options.currentVersion}`,
        );
      }
      return this.withCurrentVersion(this.options.migrate(raw, version));
    } catch (error) {
      if (error instanceof UnsupportedSchemaVersionError) throw error;
      this.options.logger?.warn(`Failed to read JSON ${label}: ${candidatePath}`, error);
      return null;
    }
  }

  private readSchemaVersion(raw: unknown): number {
    if (!raw || typeof raw !== 'object') return 0;
    const value = (raw as Record<string, unknown>).schemaVersion;
    return typeof value === 'number' && Number.isInteger(value) ? value : 0;
  }

  private withCurrentVersion(data: T): T {
    return { ...data, schemaVersion: this.options.currentVersion };
  }

  private writeAndSyncTempFile(serialized: string): void {
    this.removeIfExists(this.tempPath);
    const descriptor = fs.openSync(this.tempPath, 'w');
    try {
      fs.writeFileSync(descriptor, serialized, 'utf8');
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
  }

  private replacePrimaryWithTemp(): void {
    try {
      fs.renameSync(this.tempPath, this.filePath);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (!fs.existsSync(this.filePath) || !['EEXIST', 'EPERM', 'ENOTEMPTY'].includes(code || '')) throw error;
    }

    const displacedPath = `${this.filePath}.replacing`;
    this.removeIfExists(displacedPath);
    fs.renameSync(this.filePath, displacedPath);
    try {
      fs.renameSync(this.tempPath, this.filePath);
      this.removeIfExists(displacedPath);
    } catch (error) {
      if (!fs.existsSync(this.filePath) && fs.existsSync(displacedPath)) fs.renameSync(displacedPath, this.filePath);
      throw error;
    }
  }

  private removeIfExists(targetPath: string): void {
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
  }
}

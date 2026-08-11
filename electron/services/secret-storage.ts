const PROTECTED_SECRET_PREFIX = 'safe-storage:v1:';

export interface SafeStorageAdapter {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(value: Buffer): string;
}

export class SecretStorageUnavailableError extends Error {}

export class SecretStorage {
  constructor(private readonly adapter: SafeStorageAdapter) {}

  isProtected(value: string | undefined): boolean {
    return Boolean(value?.startsWith(PROTECTED_SECRET_PREFIX));
  }

  protect(value: string | undefined): string | undefined {
    if (!value || this.isProtected(value)) return value;
    this.ensureAvailable();
    const encrypted = this.adapter.encryptString(value).toString('base64');
    return `${PROTECTED_SECRET_PREFIX}${encrypted}`;
  }

  reveal(value: string | undefined): string | undefined {
    if (!value || !this.isProtected(value)) return value;
    this.ensureAvailable();
    const encoded = value.slice(PROTECTED_SECRET_PREFIX.length);
    return this.adapter.decryptString(Buffer.from(encoded, 'base64'));
  }

  protectFields<T extends object, K extends keyof T>(record: T, fields: readonly K[]): T {
    const result = { ...record };
    for (const field of fields) {
      const value = result[field];
      if (typeof value === 'string') result[field] = this.protect(value) as T[K];
    }
    return result;
  }

  revealFields<T extends object, K extends keyof T>(record: T, fields: readonly K[]): T {
    const result = { ...record };
    for (const field of fields) {
      const value = result[field];
      if (typeof value === 'string') result[field] = this.reveal(value) as T[K];
    }
    return result;
  }

  hasUnprotectedFields<T extends object, K extends keyof T>(record: T, fields: readonly K[]): boolean {
    return fields.some((field) => {
      const value = record[field];
      return typeof value === 'string' && value.length > 0 && !this.isProtected(value);
    });
  }

  private ensureAvailable(): void {
    if (!this.adapter.isEncryptionAvailable()) {
      throw new SecretStorageUnavailableError('Operating system credential encryption is unavailable');
    }
  }
}

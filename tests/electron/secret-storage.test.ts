import { describe, expect, it } from 'vitest';
import {
  SecretStorage,
  SecretStorageUnavailableError,
  type SafeStorageAdapter,
} from '../../electron/services/secret-storage';

function createAdapter(available = true): SafeStorageAdapter {
  return {
    isEncryptionAvailable: () => available,
    encryptString: (value) => Buffer.from([...value].reverse().join(''), 'utf8'),
    decryptString: (value) => [...value.toString('utf8')].reverse().join(''),
  };
}

describe('SecretStorage', () => {
  it('protects and reveals a secret without storing plaintext', () => {
    const storage = new SecretStorage(createAdapter());
    const protectedValue = storage.protect('top-secret');

    expect(protectedValue).toMatch(/^safe-storage:v1:/);
    expect(protectedValue).not.toContain('top-secret');
    expect(storage.reveal(protectedValue)).toBe('top-secret');
  });

  it('does not double-encrypt protected values', () => {
    const storage = new SecretStorage(createAdapter());
    const protectedValue = storage.protect('key');
    expect(storage.protect(protectedValue)).toBe(protectedValue);
  });

  it('protects selected fields without mutating the in-memory object', () => {
    const storage = new SecretStorage(createAdapter());
    const account = { id: '1', appSecret: 'secret', accessToken: 'token', nickname: 'name' };
    const protectedAccount = storage.protectFields(account, ['appSecret', 'accessToken']);

    expect(account.appSecret).toBe('secret');
    expect(protectedAccount.nickname).toBe('name');
    expect(storage.revealFields(protectedAccount, ['appSecret', 'accessToken']))
      .toEqual(account);
  });

  it('detects legacy plaintext fields for migration', () => {
    const storage = new SecretStorage(createAdapter());
    expect(storage.hasUnprotectedFields({ apiKey: 'legacy-key' }, ['apiKey'])).toBe(true);
    expect(storage.hasUnprotectedFields({ apiKey: storage.protect('key')! }, ['apiKey'])).toBe(false);
    expect(storage.hasUnprotectedFields({ apiKey: '' }, ['apiKey'])).toBe(false);
  });

  it('refuses to silently persist plaintext when encryption is unavailable', () => {
    const storage = new SecretStorage(createAdapter(false));
    expect(() => storage.protect('secret')).toThrow(SecretStorageUnavailableError);
  });
});

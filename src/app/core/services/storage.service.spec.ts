import { afterEach, describe, expect, it } from 'vitest';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'chrome');
    globalThis.localStorage?.clear?.();
  });

  it('saves, loads, and clears credentials through chrome storage', async () => {
    const values = new Map<string, unknown>();
    Reflect.set(globalThis, 'chrome', {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: values.get(key) }),
          set: async (items: Record<string, unknown>) => {
            for (const [key, value] of Object.entries(items)) {
              values.set(key, value);
            }
          },
          remove: async (key: string) => {
            values.delete(key);
          },
        },
      },
    });

    const service = new StorageService();
    const saved = await service.saveCredential({ type: 'apiKey', token: ' secret ' });

    expect(saved.token).toBe('secret');
    await expect(service.getCredential()).resolves.toMatchObject({
      type: 'apiKey',
      token: 'secret',
    });

    await service.clearCredential();
    await expect(service.getCredential()).resolves.toBeNull();
  });
});

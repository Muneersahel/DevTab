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

  it('persists and validates ui preferences', async () => {
    const values = new Map<string, unknown>();
    Reflect.set(globalThis, 'chrome', {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: values.get(key) }),
          set: async (items: Record<string, unknown>) => {
            for (const [k, v] of Object.entries(items)) values.set(k, v);
          },
          remove: async (key: string) => {
            values.delete(key);
          },
        },
      },
    });
    const service = new StorageService();

    await service.saveUiPreferences({
      codingDetailsExpanded: true,
      searchUrlTemplate: 'https://duckduckgo.com/?q=%s',
      autoRefreshIntervalMs: 300_000,
    });

    await expect(service.getUiPreferences()).resolves.toMatchObject({
      codingDetailsExpanded: true,
      searchUrlTemplate: 'https://duckduckgo.com/?q=%s',
      autoRefreshIntervalMs: 300_000,
    });

    // invalid interval and missing %s should fall back to defaults
    values.set('devtab.uiPreferences', {
      codingDetailsExpanded: true,
      searchUrlTemplate: 'https://example.com/search',
      autoRefreshIntervalMs: 12345,
    });
    await expect(service.getUiPreferences()).resolves.toMatchObject({
      codingDetailsExpanded: true,
      searchUrlTemplate: 'https://www.google.com/search?q=%s',
      autoRefreshIntervalMs: 120000,
    });
  });
});

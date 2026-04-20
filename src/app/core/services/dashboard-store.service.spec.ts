import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StoredWakaTimeCredential } from '../models/credential.model';
import { createStatsResponse, createSummariesResponse } from '../testing/wakatime.fixtures';
import { DashboardStoreService } from './dashboard-store.service';
import { StorageService } from './storage.service';
import { WakaTimeApiError, WakaTimeApiService } from './wakatime-api.service';

const credential: StoredWakaTimeCredential = {
  type: 'apiKey',
  token: 'abc123',
  savedAt: '2026-04-17T00:00:00Z',
};

describe('DashboardStoreService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('enters missing auth when no credential is saved', async () => {
    const store = createStore({ credential: null });

    await store.initialize();

    expect(store.state()).toEqual({ kind: 'missing_auth' });
  });

  it('loads dashboard data and tolerates summaries failure', async () => {
    const store = createStore({
      credential,
      summariesError: new Error('summaries unavailable'),
    });

    await store.initialize();

    expect(store.state()).toMatchObject({
      kind: 'ready',
      data: {
        totalTime: '18 hrs',
        activityUnavailable: true,
      },
    });
  });

  it('maps invalid credentials into reconnect state', async () => {
    const store = createStore({
      credential,
      statsError: new WakaTimeApiError('invalid_auth', 'Unauthorized'),
    });

    await store.initialize();

    expect(store.state()).toMatchObject({
      kind: 'invalid_auth',
    });
  });

  it('marks stale stats as updating', async () => {
    const store = createStore({
      credential,
      stats: createStatsResponse({
        is_cached: true,
        is_up_to_date: false,
        percent_calculated: 80,
      }),
    });

    await store.initialize();

    expect(store.state().kind).toBe('updating');
  });

  it('refreshes on an interval while credential exists', async () => {
    vi.useFakeTimers();
    const api = {
      statsCalls: 0,
      summariesCalls: 0,
    };
    const store = createStore({
      credential,
      onFetchStats: () => {
        api.statsCalls += 1;
      },
      onFetchSummaries: () => {
        api.summariesCalls += 1;
      },
    });

    await store.initialize();
    expect(api.statsCalls).toBe(1);
    expect(api.summariesCalls).toBe(1);

    await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
    expect(api.statsCalls).toBe(2);
    expect(api.summariesCalls).toBe(2);
  });

  it('uses configured auto-refresh interval', async () => {
    vi.useFakeTimers();
    const api = { statsCalls: 0 };
    const store = createStore({
      credential,
      onFetchStats: () => {
        api.statsCalls += 1;
      },
    });
    store.setAutoRefreshIntervalMs(5 * 60 * 1000);

    await store.initialize();
    expect(api.statsCalls).toBe(1);

    await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
    expect(api.statsCalls).toBe(1);

    await vi.advanceTimersByTimeAsync(3 * 60 * 1000);
    expect(api.statsCalls).toBe(2);
  });

  it('stops interval refresh after credential is cleared', async () => {
    vi.useFakeTimers();
    const api = {
      statsCalls: 0,
    };
    const store = createStore({
      credential,
      onFetchStats: () => {
        api.statsCalls += 1;
      },
    });

    await store.initialize();
    expect(api.statsCalls).toBe(1);

    await store.clearCredential();
    await vi.advanceTimersByTimeAsync(2 * 60 * 1000);

    expect(api.statsCalls).toBe(1);
  });
});

function createStore(config: {
  credential: StoredWakaTimeCredential | null;
  stats?: ReturnType<typeof createStatsResponse>;
  summariesError?: unknown;
  statsError?: unknown;
  onFetchStats?: () => void;
  onFetchSummaries?: () => void;
}) {
  const storage = {
    getCredential: () => Promise.resolve(config.credential),
    saveCredential: () => Promise.resolve(credential),
    clearCredential: () => Promise.resolve(),
    getCachedDashboard: () => Promise.resolve(null),
    saveCachedDashboard: () => Promise.resolve(),
    clearCachedDashboard: () => Promise.resolve(),
  };
  const api = {
    fetchStats: () => {
      config.onFetchStats?.();
      return config.statsError
        ? Promise.reject(config.statsError)
        : Promise.resolve(config.stats ?? createStatsResponse());
    },
    fetchSummaries: () => {
      config.onFetchSummaries?.();
      return config.summariesError
        ? Promise.reject(config.summariesError)
        : Promise.resolve(createSummariesResponse());
    },
  };

  TestBed.configureTestingModule({
    providers: [
      { provide: StorageService, useValue: storage },
      { provide: WakaTimeApiService, useValue: api },
    ],
  });

  return TestBed.inject(DashboardStoreService);
}

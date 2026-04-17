import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
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
});

function createStore(config: {
  credential: StoredWakaTimeCredential | null;
  stats?: ReturnType<typeof createStatsResponse>;
  summariesError?: unknown;
  statsError?: unknown;
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
    fetchStats: () =>
      config.statsError
        ? Promise.reject(config.statsError)
        : Promise.resolve(config.stats ?? createStatsResponse()),
    fetchSummaries: () =>
      config.summariesError
        ? Promise.reject(config.summariesError)
        : Promise.resolve(createSummariesResponse()),
  };

  TestBed.configureTestingModule({
    providers: [
      { provide: StorageService, useValue: storage },
      { provide: WakaTimeApiService, useValue: api },
    ],
  });

  return TestBed.inject(DashboardStoreService);
}

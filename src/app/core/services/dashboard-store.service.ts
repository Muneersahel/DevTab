import { Injectable, inject, signal } from '@angular/core';
import { StoredWakaTimeCredential, WakaTimeCredentialInput } from '../models/credential.model';
import { DashboardState, DashboardViewModel } from '../models/dashboard.model';
import { normalizeDashboard, shouldShowUpdating } from '../utils/wakatime-normalizer';
import { StorageService } from './storage.service';
import { WakaTimeApiError, WakaTimeApiService } from './wakatime-api.service';

@Injectable({ providedIn: 'root' })
export class DashboardStoreService {
  private readonly storage = inject(StorageService);
  private readonly api = inject(WakaTimeApiService);

  readonly credential = signal<StoredWakaTimeCredential | null>(null);
  readonly state = signal<DashboardState>({ kind: 'loading' });
  /**
   * True while a network refresh is actually in flight. Distinct from the
   * `updating` state — WakaTime marks many successful responses as
   * "still calculating", so we can't use `state.kind === 'updating'` to
   * drive a progress indicator without it running forever.
   */
  readonly fetching = signal(false);

  async initialize(): Promise<void> {
    const [credential, cached] = await Promise.all([
      this.storage.getCredential(),
      this.storage.getCachedDashboard(),
    ]);
    this.credential.set(credential);

    if (!credential) {
      // No credential means we can't trust or refresh whatever was cached —
      // discard it so a new sign-in doesn't flash stale data from a previous
      // account.
      if (cached) {
        void this.storage.clearCachedDashboard();
      }
      this.state.set({ kind: 'missing_auth' });
      return;
    }

    if (cached) {
      // Paint the UI with cached data immediately and flag it as updating
      // while we re-fetch in the background. This keeps the new-tab page
      // feeling instant even on cold starts.
      this.state.set({ kind: 'updating', data: cached.data });
    }

    await this.refresh();
  }

  async refresh(): Promise<void> {
    const credential = this.credential();

    if (!credential) {
      this.state.set({ kind: 'missing_auth' });
      return;
    }

    // If we already have data on screen, keep it mounted and just flip to
    // `updating` — the skeleton is only for true cold starts.
    const current = this.state();
    const previousData = currentData(current);

    if (previousData) {
      this.state.set({ kind: 'updating', data: previousData });
    } else {
      this.state.set({ kind: 'loading' });
    }

    this.fetching.set(true);
    // Stamp the fetch time *before* awaiting the network so the timestamp
    // reflects when the user actually asked for fresh data, not when the
    // slowest response happened to resolve.
    const fetchedAt = new Date();

    try {
      const stats = await this.api.fetchStats(credential);
      let summaries = null;

      try {
        summaries = await this.api.fetchSummaries(credential);
      } catch {
        summaries = null;
      }

      const data = normalizeDashboard(stats, summaries, { fetchedAt });
      const nextState: DashboardState = shouldShowUpdating(stats)
        ? { kind: 'updating', data }
        : { kind: 'ready', data };

      this.state.set(nextState);
      void this.storage.saveCachedDashboard(data);
    } catch (error) {
      const next = mapError(error);

      // Invalid auth means our cached view is no longer trustworthy; wipe it
      // so the next launch doesn't paint data from a rejected credential.
      if (next.kind === 'invalid_auth') {
        void this.storage.clearCachedDashboard();
      }

      this.state.set(next);
    } finally {
      this.fetching.set(false);
    }
  }

  async saveCredential(input: WakaTimeCredentialInput): Promise<void> {
    // A credential change likely means a new WakaTime account — drop the
    // cache before fetching so we don't momentarily show the previous user's
    // stats during the background refresh.
    await this.storage.clearCachedDashboard();
    const credential = await this.storage.saveCredential(input);
    this.credential.set(credential);
    await this.refresh();
  }

  async clearCredential(): Promise<void> {
    await Promise.all([this.storage.clearCredential(), this.storage.clearCachedDashboard()]);
    this.credential.set(null);
    this.state.set({ kind: 'missing_auth' });
  }
}

function currentData(state: DashboardState): DashboardViewModel | null {
  return state.kind === 'ready' || state.kind === 'updating' ? state.data : null;
}

function mapError(error: unknown): DashboardState {
  if (error instanceof WakaTimeApiError) {
    if (error.code === 'invalid_auth') {
      return {
        kind: 'invalid_auth',
        message: 'Your WakaTime credential is missing or no longer works.',
      };
    }

    return {
      kind: 'error',
      message: error.message,
      debug: error.debug,
    };
  }

  return {
    kind: 'error',
    message: 'DevTab could not load your WakaTime stats.',
    debug: error instanceof Error ? error.message : String(error),
  };
}

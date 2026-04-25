import { Injectable } from '@angular/core';
import { StoredWakaTimeCredential } from '../models/credential.model';
import { WakaTimeErrorResponse, WakaTimeStatsResponse } from '../models/wakatime-stats.model';
import { WakaTimeSummariesResponse } from '../models/wakatime-summaries.model';

const WAKATIME_API_BASE = 'https://api.wakatime.com/api/v1';
const LOCAL_DEV_API_BASE = '/wakatime-api/api/v1';
const SUMMARIES_DAY_SPAN = 7;

export type WakaTimeApiErrorCode = 'invalid_auth' | 'network' | 'api_down' | 'malformed';

export class WakaTimeApiError extends Error {
  constructor(
    readonly code: WakaTimeApiErrorCode,
    message: string,
    readonly debug?: string,
  ) {
    super(message);
    this.name = 'WakaTimeApiError';
  }
}

/**
 * Optional overrides for the WakaTime summaries endpoint. Defaults align with
 * the dashboard: a rolling last-7-days window in the user's local timezone so
 * the per-day buckets line up with what the activity chart renders.
 *
 * See https://wakatime.com/developers#summaries
 */
export interface WakaTimeSummariesOptions {
  /** YYYY-MM-DD start date (inclusive). Defaults to 6 days before `end`. */
  start?: string;
  /** YYYY-MM-DD end date (inclusive). Defaults to today in `timezone`. */
  end?: string;
  /** IANA timezone name. Defaults to the browser's resolved timezone. */
  timezone?: string;
  /** Filter to a single project. */
  project?: string;
  /** Comma-separated branch filter; only meaningful with `project`. */
  branches?: string;
  /** Override the user's keystroke timeout (minutes). */
  timeout?: number;
  /** Restrict to writes-only heartbeats. */
  writes_only?: boolean;
}

@Injectable({ providedIn: 'root' })
export class WakaTimeApiService {
  fetchStats(credential: StoredWakaTimeCredential): Promise<WakaTimeStatsResponse> {
    return this.request('/users/current/stats/last_7_days', credential, isStatsResponse);
  }

  fetchSummaries(
    credential: StoredWakaTimeCredential,
    options: WakaTimeSummariesOptions = {},
  ): Promise<WakaTimeSummariesResponse> {
    const timezone = options.timezone ?? resolveBrowserTimezone();
    const end = options.end ?? todayInTimezone(timezone);
    const start = options.start ?? shiftIsoDate(end, -(SUMMARIES_DAY_SPAN - 1));

    const params = new URLSearchParams({ start, end });

    if (timezone) {
      params.set('timezone', timezone);
    }

    if (options.project !== undefined) {
      params.set('project', options.project);
    }

    if (options.branches !== undefined) {
      params.set('branches', options.branches);
    }

    if (options.timeout !== undefined) {
      params.set('timeout', String(options.timeout));
    }

    if (options.writes_only !== undefined) {
      params.set('writes_only', String(options.writes_only));
    }

    return this.request(
      `/users/current/summaries?${params.toString()}`,
      credential,
      isSummariesResponse,
    );
  }

  createAuthorizationHeader(credential: Pick<StoredWakaTimeCredential, 'type' | 'token'>): string {
    if (credential.type === 'bearerToken') {
      return `Bearer ${credential.token}`;
    }

    return `Basic ${globalThis.btoa(credential.token)}`;
  }

  private async request<T>(
    path: string,
    credential: StoredWakaTimeCredential,
    guard: (body: unknown) => body is T,
  ): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${resolveApiBase()}${path}`, {
        headers: {
          Accept: 'application/json',
          Authorization: this.createAuthorizationHeader(credential),
        },
      });
    } catch (error) {
      throw new WakaTimeApiError(
        'network',
        'Could not reach WakaTime right now.',
        debugMessage(error),
      );
    }

    const body = await readJson(response);

    if (isUnauthorized(response.status, body)) {
      throw new WakaTimeApiError(
        'invalid_auth',
        'Your WakaTime credential needs to be reconnected.',
      );
    }

    if (!response.ok) {
      throw new WakaTimeApiError(
        'api_down',
        'WakaTime is not responding as expected.',
        `HTTP ${response.status}: ${JSON.stringify(body)}`,
      );
    }

    if (!guard(body)) {
      throw new WakaTimeApiError(
        'malformed',
        'WakaTime returned data DevTab could not read.',
        JSON.stringify(body),
      );
    }

    return body;
  }
}

function resolveApiBase(): string {
  const location = globalThis.location;

  if (
    location?.protocol === 'http:' &&
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1') &&
    location.port === '4200'
  ) {
    return LOCAL_DEV_API_BASE;
  }

  return WAKATIME_API_BASE;
}

function isUnauthorized(status: number, body: unknown): boolean {
  if (status === 401) {
    return true;
  }

  if (!isErrorResponse(body)) {
    return false;
  }

  return body.errors.some((error) => error.toLowerCase() === 'unauthorized.');
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isStatsResponse(value: unknown): value is WakaTimeStatsResponse {
  if (!isRecord(value) || !isRecord(value['data'])) {
    return false;
  }

  const data = value['data'];

  return (
    typeof data['human_readable_total'] === 'string' &&
    typeof data['human_readable_daily_average'] === 'string' &&
    typeof data['total_seconds'] === 'number' &&
    typeof data['percent_calculated'] === 'number' &&
    Array.isArray(data['languages']) &&
    Array.isArray(data['projects']) &&
    Array.isArray(data['categories']) &&
    Array.isArray(data['editors']) &&
    Array.isArray(data['operating_systems'])
  );
}

function isSummariesResponse(value: unknown): value is WakaTimeSummariesResponse {
  if (!isRecord(value) || !Array.isArray(value['data'])) {
    return false;
  }

  return value['data'].every(
    (day) => isRecord(day) && isRecord(day['range']) && typeof day['range']['date'] === 'string',
  );
}

function isErrorResponse(value: unknown): value is Required<WakaTimeErrorResponse> {
  return (
    isRecord(value) &&
    Array.isArray(value['errors']) &&
    value['errors'].every((error) => typeof error === 'string')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function debugMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function resolveBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function todayInTimezone(timezone: string): string {
  // `en-CA` formats as `YYYY-MM-DD`, which is exactly what the WakaTime
  // summaries endpoint expects for `start` / `end` dates.
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function shiftIsoDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  // Build the date in UTC and shift in UTC to avoid DST surprises — we only
  // care about the calendar date, not the wall-clock instant.
  const reference = new Date(Date.UTC(year, month - 1, day));
  reference.setUTCDate(reference.getUTCDate() + days);
  return reference.toISOString().slice(0, 10);
}

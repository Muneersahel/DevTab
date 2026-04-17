import { Injectable } from '@angular/core';
import { StoredWakaTimeCredential } from '../models/credential.model';
import { WakaTimeErrorResponse, WakaTimeStatsResponse } from '../models/wakatime-stats.model';
import { WakaTimeSummariesResponse } from '../models/wakatime-summaries.model';

const API_BASE = 'https://api.wakatime.com/api/v1';

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

@Injectable({ providedIn: 'root' })
export class WakaTimeApiService {
  fetchStats(credential: StoredWakaTimeCredential): Promise<WakaTimeStatsResponse> {
    return this.request('/users/current/stats/last_7_days', credential, isStatsResponse);
  }

  fetchSummaries(credential: StoredWakaTimeCredential): Promise<WakaTimeSummariesResponse> {
    return this.request(
      '/users/current/summaries?range=Last%207%20Days',
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
      response = await fetch(`${API_BASE}${path}`, {
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
  return isRecord(value) && Array.isArray(value['data']);
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

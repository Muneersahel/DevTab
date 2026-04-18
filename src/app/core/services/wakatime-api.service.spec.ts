import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStatsResponse, createSummariesResponse } from '../testing/wakatime.fixtures';
import { StoredWakaTimeCredential } from '../models/credential.model';
import { WakaTimeApiService } from './wakatime-api.service';

const credential: StoredWakaTimeCredential = {
  type: 'apiKey',
  token: 'abc123',
  savedAt: '2026-04-17T00:00:00Z',
};

describe('WakaTimeApiService', () => {
  const service = new WakaTimeApiService();

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates authorization headers for API keys and bearer tokens', () => {
    expect(service.createAuthorizationHeader(credential)).toBe('Basic YWJjMTIz');
    expect(
      service.createAuthorizationHeader({
        type: 'bearerToken',
        token: 'oauth-token',
      }),
    ).toBe('Bearer oauth-token');
  });

  it('fetches stats with the configured authorization header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(createStatsResponse()));
    vi.stubGlobal('fetch', fetchMock);

    await expect(service.fetchStats(credential)).resolves.toEqual(createStatsResponse());
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.wakatime.com/api/v1/users/current/stats/last_7_days',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Basic YWJjMTIz',
        }),
      }),
    );
  });

  it('maps unauthorized bodies into invalid auth errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ errors: ['Unauthorized.'] })));

    await expect(service.fetchStats(credential)).rejects.toMatchObject({
      code: 'invalid_auth',
    });
  });

  it('maps malformed stats responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ data: {} })));

    await expect(service.fetchStats(credential)).rejects.toMatchObject({
      code: 'malformed',
    });
  });

  it('accepts summaries responses for the activity widget', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(createSummariesResponse()));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      service.fetchSummaries(credential, {
        start: '2026-04-11',
        end: '2026-04-17',
        timezone: 'Africa/Dar_es_Salaam',
      }),
    ).resolves.toEqual(createSummariesResponse());

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe('/api/v1/users/current/summaries');
    expect(url.searchParams.get('start')).toBe('2026-04-11');
    expect(url.searchParams.get('end')).toBe('2026-04-17');
    expect(url.searchParams.get('timezone')).toBe('Africa/Dar_es_Salaam');
  });

  it('defaults summaries to a 7-day window in the browser timezone', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-17T12:34:56Z'));
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(createSummariesResponse()));
    vi.stubGlobal('fetch', fetchMock);

    try {
      await service.fetchSummaries(credential, { timezone: 'UTC' });
    } finally {
      vi.useRealTimers();
    }

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get('start')).toBe('2026-04-11');
    expect(url.searchParams.get('end')).toBe('2026-04-17');
    expect(url.searchParams.get('timezone')).toBe('UTC');
  });

  it('forwards optional summaries filters when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(createSummariesResponse()));
    vi.stubGlobal('fetch', fetchMock);

    await service.fetchSummaries(credential, {
      start: '2026-04-11',
      end: '2026-04-17',
      timezone: 'UTC',
      project: 'DevTab',
      branches: 'main,dev',
      timeout: 10,
      writes_only: true,
    });

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get('project')).toBe('DevTab');
    expect(url.searchParams.get('branches')).toBe('main,dev');
    expect(url.searchParams.get('timeout')).toBe('10');
    expect(url.searchParams.get('writes_only')).toBe('true');
  });

  it('rejects malformed summaries responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ data: [{}] })));

    await expect(service.fetchSummaries(credential)).rejects.toMatchObject({
      code: 'malformed',
    });
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

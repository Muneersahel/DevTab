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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(createSummariesResponse())));

    await expect(service.fetchSummaries(credential)).resolves.toEqual(createSummariesResponse());
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

import { describe, expect, it } from 'vitest';
import { createStatsResponse, createSummariesResponse } from '../testing/wakatime.fixtures';
import { normalizeDashboard, shouldShowUpdating } from './wakatime-normalizer';

describe('normalizeDashboard', () => {
  it('maps WakaTime stats and summaries into dashboard data', () => {
    const dashboard = normalizeDashboard(createStatsResponse(), createSummariesResponse());

    expect(dashboard.totalTime).toBe('18 hrs');
    expect(dashboard.dailyAverage).toBe('2 hrs 34 mins');
    expect(dashboard.topLanguage?.name).toBe('TypeScript');
    expect(dashboard.topProject?.name).toBe('DevTab');
    expect(dashboard.activity).toHaveLength(7);
    expect(dashboard.activity[4].percentOfMax).toBe(100);
    expect(dashboard.activityUnavailable).toBe(false);
    expect(dashboard.status.label).toBe('Synced');
  });

  it('marks activity unavailable when summaries are missing', () => {
    const dashboard = normalizeDashboard(createStatsResponse(), null);

    expect(dashboard.activity).toEqual([]);
    expect(dashboard.activityUnavailable).toBe(true);
  });

  it('detects WakaTime updating states', () => {
    const stats = createStatsResponse({
      is_up_to_date: false,
      percent_calculated: 42,
      status: 'pending',
    });

    expect(shouldShowUpdating(stats)).toBe(true);
    expect(normalizeDashboard(stats, null).status.label).toBe('Updating');
  });
});

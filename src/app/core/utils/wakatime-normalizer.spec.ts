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

  it('summarises AI vs human contributions when the payload has activity', () => {
    const dashboard = normalizeDashboard(
      createStatsResponse({
        ai_additions: 60,
        human_additions: 40,
        ai_deletions: 5,
        human_deletions: 10,
        ai_input_tokens: 1000,
        ai_output_tokens: 200,
      }),
      null,
    );

    expect(dashboard.aiVsHuman).not.toBeNull();
    expect(dashboard.aiVsHuman?.aiSharePercent).toBe(60);
    expect(dashboard.aiVsHuman?.aiInputTokens).toBe(1000);
  });

  it('returns null aiVsHuman when no AI or human signal is present', () => {
    const dashboard = normalizeDashboard(
      createStatsResponse({
        ai_additions: 0,
        ai_deletions: 0,
        human_additions: 0,
        human_deletions: 0,
      }),
      null,
    );

    expect(dashboard.aiVsHuman).toBeNull();
  });

  it('exposes the "including other language" total only when meaningfully higher', () => {
    const same = normalizeDashboard(createStatsResponse(), null);
    expect(same.totalTimeIncludingOther).toBeNull();

    const higher = normalizeDashboard(
      createStatsResponse({
        total_seconds: 64800,
        total_seconds_including_other_language: 78000,
        human_readable_total_including_other_language: '21 hrs 40 mins',
      }),
      null,
    );
    expect(higher.totalTimeIncludingOther).toBe('21 hrs 40 mins');
  });

  it('marks WakaTime profile visibility flags', () => {
    const dashboard = normalizeDashboard(
      createStatsResponse({
        is_language_usage_visible: false,
        is_editor_usage_visible: false,
        is_os_usage_visible: false,
        is_category_usage_visible: false,
        is_coding_activity_visible: false,
      }),
      null,
    );

    expect(dashboard.visibility).toEqual({
      languages: false,
      editors: false,
      operatingSystems: false,
      categories: false,
      codingActivity: false,
    });
  });
});

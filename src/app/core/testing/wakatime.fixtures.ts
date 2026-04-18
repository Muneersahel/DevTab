import { WakaTimeStatsResponse } from '../models/wakatime-stats.model';
import { WakaTimeSummariesResponse } from '../models/wakatime-summaries.model';

export function createStatsResponse(
  overrides: Partial<WakaTimeStatsResponse['data']> = {},
): WakaTimeStatsResponse {
  return {
    data: {
      ai_additions: 2,
      ai_deletions: 1,
      best_day: {
        date: '2026-04-15',
        text: '4 hrs 12 mins',
        total_seconds: 15120,
      },
      categories: [
        {
          decimal: '18.00',
          digital: '18:00',
          hours: 18,
          minutes: 0,
          name: 'Coding',
          percent: 100,
          text: '18 hrs',
          total_seconds: 64800,
        },
      ],
      created_at: '2026-04-17T08:00:00Z',
      daily_average: 9257,
      daily_average_including_other_language: 9257,
      days_including_holidays: 7,
      days_minus_holidays: 7,
      dependencies: [],
      editors: [
        {
          decimal: '18.00',
          digital: '18:00',
          hours: 18,
          minutes: 0,
          name: 'VS Code',
          percent: 100,
          text: '18 hrs',
          total_seconds: 64800,
        },
      ],
      end: '2026-04-17T23:59:59Z',
      holidays: 0,
      human_additions: 20,
      human_deletions: 5,
      human_readable_daily_average: '2 hrs 34 mins',
      human_readable_daily_average_including_other_language: '2 hrs 34 mins',
      human_readable_range: 'last 7 days',
      human_readable_total: '18 hrs',
      human_readable_total_including_other_language: '18 hrs',
      id: 'stats-id',
      is_already_updating: false,
      is_cached: false,
      is_category_usage_visible: true,
      is_coding_activity_visible: true,
      is_editor_usage_visible: true,
      is_including_today: true,
      is_language_usage_visible: true,
      is_os_usage_visible: true,
      is_stuck: false,
      is_up_to_date: true,
      is_up_to_date_pending_future: false,
      languages: [
        {
          decimal: '10.00',
          digital: '10:00',
          hours: 10,
          minutes: 0,
          name: 'TypeScript',
          percent: 55.5,
          text: '10 hrs',
          total_seconds: 36000,
        },
        {
          decimal: '8.00',
          digital: '08:00',
          hours: 8,
          minutes: 0,
          name: 'CSS',
          percent: 44.5,
          text: '8 hrs',
          total_seconds: 28800,
        },
      ],
      machines: [],
      modified_at: '2026-04-17T10:00:00Z',
      operating_systems: [
        {
          decimal: '18.00',
          digital: '18:00',
          hours: 18,
          minutes: 0,
          name: 'macOS',
          percent: 100,
          text: '18 hrs',
          total_seconds: 64800,
        },
      ],
      percent_calculated: 100,
      projects: [
        {
          ai_additions: 2,
          ai_deletions: 1,
          decimal: '12.00',
          digital: '12:00',
          hours: 12,
          human_additions: 15,
          human_deletions: 4,
          minutes: 0,
          name: 'DevTab',
          percent: 66.7,
          text: '12 hrs',
          total_seconds: 43200,
        },
      ],
      range: 'last_7_days',
      start: '2026-04-11T00:00:00Z',
      status: 'ok',
      timeout: 15,
      timezone: 'Africa/Dar_es_Salaam',
      total_seconds: 64800,
      total_seconds_including_other_language: 64800,
      user_id: 'user-id',
      username: null,
      writes_only: false,
      ...overrides,
    },
  };
}

export function createSummariesResponse(): WakaTimeSummariesResponse {
  return {
    data: [
      summaryDay('2026-04-11', 3600, '1 hr'),
      summaryDay('2026-04-12', 7200, '2 hrs'),
      summaryDay('2026-04-13', 0, '0 secs'),
      summaryDay('2026-04-14', 10800, '3 hrs'),
      summaryDay(
        '2026-04-15',
        15120,
        '4 hrs 12 mins',
        // Rich breakdown on the peak day so aggregation picks TypeScript /
        // DevTab as the top items without needing to repeat data on every day.
        {
          languages: [
            { name: 'TypeScript', total_seconds: 9072, percent: 60, text: '2 hrs 31 mins' },
            { name: 'CSS', total_seconds: 6048, percent: 40, text: '1 hr 41 mins' },
          ],
          projects: [{ name: 'DevTab', total_seconds: 15120, percent: 100, text: '4 hrs 12 mins' }],
          categories: [
            { name: 'Coding', total_seconds: 15120, percent: 100, text: '4 hrs 12 mins' },
          ],
          editors: [{ name: 'VS Code', total_seconds: 15120, percent: 100, text: '4 hrs 12 mins' }],
          operating_systems: [
            { name: 'macOS', total_seconds: 15120, percent: 100, text: '4 hrs 12 mins' },
          ],
        },
      ),
      summaryDay('2026-04-16', 14400, '4 hrs'),
      summaryDay('2026-04-17', 13680, '3 hrs 48 mins'),
    ],
    cumulative_total: {
      seconds: 64800,
      text: '18 hrs',
      decimal: '18.00',
      digital: '18:00',
    },
    daily_average: {
      seconds: 9257,
      text: '2 hrs 34 mins',
      days_including_holidays: 7,
      days_minus_holidays: 7,
      holidays: 0,
    },
    start: '2026-04-11T00:00:00Z',
    end: '2026-04-17T23:59:59Z',
  };
}

interface DayBreakdown {
  languages?: { name: string; total_seconds: number; percent: number; text: string }[];
  projects?: { name: string; total_seconds: number; percent: number; text: string }[];
  categories?: { name: string; total_seconds: number; percent: number; text: string }[];
  editors?: { name: string; total_seconds: number; percent: number; text: string }[];
  operating_systems?: {
    name: string;
    total_seconds: number;
    percent: number;
    text: string;
  }[];
}

function summaryDay(
  date: string,
  totalSeconds: number,
  text: string,
  breakdown: DayBreakdown = {},
) {
  const stub = {
    decimal: '0.00',
    digital: '00:00',
    hours: 0,
    minutes: 0,
  };

  const withStub = <
    T extends { name: string; total_seconds: number; percent: number; text: string },
  >(
    items: T[] | undefined,
  ) => items?.map((item) => ({ ...stub, ...item })) ?? [];

  return {
    grand_total: {
      decimal: '0.00',
      digital: '00:00',
      hours: Math.floor(totalSeconds / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      text,
      total_seconds: totalSeconds,
    },
    range: {
      date,
      start: `${date}T00:00:00Z`,
      end: `${date}T23:59:59Z`,
      text: date,
      timezone: 'Africa/Dar_es_Salaam',
    },
    languages: withStub(breakdown.languages),
    projects: withStub(breakdown.projects),
    categories: withStub(breakdown.categories),
    editors: withStub(breakdown.editors),
    operating_systems: withStub(breakdown.operating_systems),
  };
}

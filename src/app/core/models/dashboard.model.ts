import { BestDay } from './wakatime-stats.model';

export type DashboardState =
  | { kind: 'missing_auth' }
  | { kind: 'loading' }
  | { kind: 'ready'; data: DashboardViewModel }
  | { kind: 'updating'; data: DashboardViewModel }
  | { kind: 'invalid_auth'; message: string }
  | { kind: 'error'; message: string; debug?: string };

export interface DashboardViewModel {
  totalTime: string;
  totalTimeIncludingOther: string | null;
  dailyAverage: string;
  /** Daily average in seconds; 0 when unknown. Drives the activity average line. */
  dailyAverageSeconds: number;
  rangeLabel: string;
  bestDay: BestDay | null;
  topLanguage: UsageItem | null;
  topProject: UsageItem | null;
  languages: UsageItem[];
  languagesAll: UsageItem[];
  projects: UsageItem[];
  projectsAll: UsageItem[];
  categories: UsageItem[];
  categoriesAll: UsageItem[];
  editors: UsageItem[];
  editorsAll: UsageItem[];
  operatingSystems: UsageItem[];
  operatingSystemsAll: UsageItem[];
  machines: UsageItem[];
  machinesAll: UsageItem[];
  aiVsHuman: AiVsHumanStats | null;
  /** Latest day in the summaries range (today when the data is fresh). */
  today: TodaySummary | null;
  /** Days with tracked time out of the days in the summaries range. */
  activeDays: { active: number; total: number } | null;
  activity: ActivityDay[];
  /**
   * The range's top projects (at most three), in the order used for
   * `ActivityDay.projectSeconds`, so each project keeps one colour everywhere.
   */
  activityProjects: string[];
  activityUnavailable: boolean;
  /**
   * Wall-clock time at which DevTab actually ran the refresh. This is the
   * timestamp users care about — "when was this data pulled from WakaTime?"
   */
  fetchedAt: Date;
  /**
   * Server-side `modified_at` from `/stats` — reflects when WakaTime last
   * rebuilt its stats cache, which lags heartbeats by hours. Shown as a
   * secondary signal when available.
   */
  cacheUpdatedAt: Date | null;
  status: DashboardStatus;
}

export interface AiVsHumanStats {
  aiAdditions: number;
  aiDeletions: number;
  humanAdditions: number;
  humanDeletions: number;
  aiInputTokens: number;
  aiOutputTokens: number;
  /** AI share of total additions (0–100). */
  aiSharePercent: number;
  /** True when there is enough data to render a meaningful breakdown. */
  hasData: boolean;
}

export interface TodaySummary {
  date: string;
  time: string;
  /** Today's time as a percentage of the daily average, or null without an average. */
  percentOfAverage: number | null;
  /** Time left to reach the daily average; null once it is reached. */
  remainingToAverage: string | null;
  topProject: string | null;
  topLanguage: string | null;
}

export interface UsageItem {
  name: string;
  percent: number;
  time: string;
  totalSeconds: number;
}

export interface ActivityDay {
  date: string;
  label: string;
  time: string;
  totalSeconds: number;
  percentOfMax: number;
  /** Seconds per `activityProjects` entry, followed by everything else ("Other"). */
  projectSeconds: number[];
}

export interface DashboardStatus {
  label: string;
  detail: string;
  tone: 'ok' | 'updating' | 'warning';
}

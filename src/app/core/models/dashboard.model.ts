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
  activity: ActivityDay[];
  activityUnavailable: boolean;
  visibility: VisibilityFlags;
  lastUpdated: Date | null;
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

export interface VisibilityFlags {
  languages: boolean;
  editors: boolean;
  operatingSystems: boolean;
  categories: boolean;
  codingActivity: boolean;
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
}

export interface DashboardStatus {
  label: string;
  detail: string;
  tone: 'ok' | 'updating' | 'warning';
}

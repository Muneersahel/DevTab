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
  dailyAverage: string;
  rangeLabel: string;
  bestDay: BestDay | null;
  topLanguage: UsageItem | null;
  topProject: UsageItem | null;
  languages: UsageItem[];
  projects: UsageItem[];
  categories: UsageItem[];
  editors: UsageItem[];
  operatingSystems: UsageItem[];
  activity: ActivityDay[];
  activityUnavailable: boolean;
  lastUpdated: Date | null;
  status: DashboardStatus;
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

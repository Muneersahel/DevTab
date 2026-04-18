import { TimedUsage } from './wakatime-stats.model';

export interface WakaTimeSummariesResponse {
  data: WakaTimeSummaryDay[];
  cumulative_total?: WakaTimeCumulativeTotal;
  daily_average?: WakaTimeSummariesDailyAverage;
  start?: string;
  end?: string;
}

export interface WakaTimeCumulativeTotal {
  seconds: number;
  text: string;
  decimal: string;
  digital: string;
}

export interface WakaTimeSummariesDailyAverage {
  holidays: number;
  days_including_holidays: number;
  days_minus_holidays: number;
  seconds: number;
  text: string;
  seconds_including_other_language?: number;
  text_including_other_language?: string;
}

export interface WakaTimeSummaryDay {
  categories?: TimedUsage[];
  dependencies?: TimedUsage[];
  editors?: TimedUsage[];
  grand_total?: WakaTimeGrandTotal;
  languages?: TimedUsage[];
  machines?: TimedUsage[];
  operating_systems?: TimedUsage[];
  projects?: TimedUsage[];
  range: WakaTimeSummaryRange;
}

export interface WakaTimeGrandTotal {
  decimal: string;
  digital: string;
  hours: number;
  minutes: number;
  text: string;
  total_seconds: number;
  // WakaTime started returning AI vs human activity on summary days; we
  // treat them as optional because older plans / API versions omit them.
  ai_additions?: number;
  ai_deletions?: number;
  human_additions?: number;
  human_deletions?: number;
  ai_input_tokens?: number;
  ai_output_tokens?: number;
}

export interface WakaTimeSummaryRange {
  date: string;
  end: string;
  start: string;
  text: string;
  timezone: string;
}

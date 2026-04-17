import { TimedUsage } from './wakatime-stats.model';

export interface WakaTimeSummariesResponse {
  data: WakaTimeSummaryDay[];
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
}

export interface WakaTimeSummaryRange {
  date: string;
  end: string;
  start: string;
  text: string;
  timezone: string;
}

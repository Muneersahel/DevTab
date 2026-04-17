import { DashboardViewModel, UsageItem } from '../models/dashboard.model';
import { WakaTimeStatsResponse, TimedUsage } from '../models/wakatime-stats.model';
import { WakaTimeSummariesResponse } from '../models/wakatime-summaries.model';

export function normalizeDashboard(
  stats: WakaTimeStatsResponse,
  summaries: WakaTimeSummariesResponse | null,
): DashboardViewModel {
  const data = stats.data;
  const activity = normalizeActivity(summaries);

  return {
    totalTime: data.human_readable_total || formatSeconds(data.total_seconds),
    dailyAverage: data.human_readable_daily_average || formatSeconds(data.daily_average),
    rangeLabel: data.human_readable_range || 'Last 7 days',
    bestDay: data.best_day ?? null,
    topLanguage: toUsageItems(data.languages, 1)[0] ?? null,
    topProject: toUsageItems(data.projects, 1)[0] ?? null,
    languages: toUsageItems(data.languages, 5),
    projects: toUsageItems(data.projects, 5),
    categories: toUsageItems(data.categories, 4),
    editors: toUsageItems(data.editors, 4),
    operatingSystems: toUsageItems(data.operating_systems, 4),
    activity,
    activityUnavailable: summaries === null,
    lastUpdated: toDate(data.modified_at || data.created_at),
    status: normalizeStatus(stats),
  };
}

export function shouldShowUpdating(stats: WakaTimeStatsResponse): boolean {
  const data = stats.data;

  return (
    data.is_cached ||
    data.is_already_updating ||
    data.is_stuck ||
    data.is_up_to_date_pending_future ||
    !data.is_up_to_date ||
    data.percent_calculated < 100 ||
    data.status.toLowerCase() !== 'ok'
  );
}

function normalizeStatus(stats: WakaTimeStatsResponse): DashboardViewModel['status'] {
  const data = stats.data;

  if (data.is_stuck) {
    return {
      label: 'Stats delayed',
      detail: 'WakaTime is still calculating this range.',
      tone: 'warning',
    };
  }

  if (shouldShowUpdating(stats)) {
    return {
      label: 'Updating',
      detail: `${Math.round(data.percent_calculated)}% calculated`,
      tone: 'updating',
    };
  }

  return {
    label: 'Synced',
    detail: data.is_cached ? 'Using cached stats' : 'Latest stats loaded',
    tone: 'ok',
  };
}

function normalizeActivity(summaries: WakaTimeSummariesResponse | null) {
  if (!summaries) {
    return [];
  }

  const max = Math.max(1, ...summaries.data.map((day) => day.grand_total?.total_seconds ?? 0));

  return summaries.data.map((day) => {
    const totalSeconds = day.grand_total?.total_seconds ?? 0;

    return {
      date: day.range.date,
      label: formatDayLabel(day.range.date),
      time: day.grand_total?.text || formatSeconds(totalSeconds),
      totalSeconds,
      percentOfMax: Math.round((totalSeconds / max) * 100),
    };
  });
}

function toUsageItems(items: TimedUsage[] | undefined, limit: number): UsageItem[] {
  return (items ?? []).slice(0, limit).map((item) => ({
    name: item.name,
    percent: item.percent,
    time: item.text,
    totalSeconds: item.total_seconds,
  }));
}

function formatSeconds(value: number): string {
  const totalMinutes = Math.round(value / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function formatDayLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(parsed);
}

function toDate(value: string): Date | null {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

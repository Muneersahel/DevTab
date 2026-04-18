import { AiVsHumanStats, DashboardViewModel, UsageItem } from '../models/dashboard.model';
import { TimedUsage, WakaTimeStatsResponse } from '../models/wakatime-stats.model';
import { WakaTimeSummariesResponse } from '../models/wakatime-summaries.model';

export function normalizeDashboard(
  stats: WakaTimeStatsResponse,
  summaries: WakaTimeSummariesResponse | null,
): DashboardViewModel {
  const data = stats.data;
  const activity = normalizeActivity(summaries);

  const totalTime = data.human_readable_total || formatSeconds(data.total_seconds);
  const totalIncludingOtherSeconds = data.total_seconds_including_other_language ?? 0;
  const otherLanguageDelta = totalIncludingOtherSeconds - (data.total_seconds ?? 0);
  // Only surface the "including other" total when it's materially higher
  // (WakaTime often returns the same value when there's no "Other" bucket).
  const totalTimeIncludingOther =
    otherLanguageDelta > 60
      ? data.human_readable_total_including_other_language ||
        formatSeconds(totalIncludingOtherSeconds)
      : null;

  return {
    totalTime,
    totalTimeIncludingOther,
    dailyAverage: data.human_readable_daily_average || formatSeconds(data.daily_average),
    rangeLabel: data.human_readable_range || 'Last 7 days',
    bestDay: data.best_day ?? null,
    topLanguage: toUsageItems(data.languages, 1)[0] ?? null,
    topProject: toUsageItems(data.projects, 1)[0] ?? null,
    languages: toUsageItems(data.languages, 5),
    languagesAll: toUsageItems(data.languages),
    projects: toUsageItems(data.projects, 5),
    projectsAll: toUsageItems(data.projects),
    categories: toUsageItems(data.categories, 4),
    categoriesAll: toUsageItems(data.categories),
    editors: toUsageItems(data.editors, 4),
    editorsAll: toUsageItems(data.editors),
    operatingSystems: toUsageItems(data.operating_systems, 4),
    operatingSystemsAll: toUsageItems(data.operating_systems),
    machines: toUsageItems(data.machines, 4),
    machinesAll: toUsageItems(data.machines),
    aiVsHuman: normalizeAiVsHuman(stats),
    activity,
    activityUnavailable: summaries === null,
    visibility: {
      languages: data.is_language_usage_visible !== false,
      editors: data.is_editor_usage_visible !== false,
      operatingSystems: data.is_os_usage_visible !== false,
      categories: data.is_category_usage_visible !== false,
      codingActivity: data.is_coding_activity_visible !== false,
    },
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

function normalizeAiVsHuman(stats: WakaTimeStatsResponse): AiVsHumanStats | null {
  const data = stats.data;
  const aiAdditions = data.ai_additions ?? 0;
  const aiDeletions = data.ai_deletions ?? 0;
  const humanAdditions = data.human_additions ?? 0;
  const humanDeletions = data.human_deletions ?? 0;
  const aiInputTokens = data.ai_input_tokens ?? 0;
  const aiOutputTokens = data.ai_output_tokens ?? 0;

  const totalAdditions = aiAdditions + humanAdditions;
  const totalSignal =
    totalAdditions + aiDeletions + humanDeletions + aiInputTokens + aiOutputTokens;

  if (totalSignal === 0) {
    return null;
  }

  const aiSharePercent = totalAdditions > 0 ? Math.round((aiAdditions / totalAdditions) * 100) : 0;

  return {
    aiAdditions,
    aiDeletions,
    humanAdditions,
    humanDeletions,
    aiInputTokens,
    aiOutputTokens,
    aiSharePercent,
    hasData: true,
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

function toUsageItems(items: TimedUsage[] | undefined, limit?: number): UsageItem[] {
  const source = items ?? [];
  const sliced = limit === undefined ? source : source.slice(0, limit);
  return sliced.map((item) => ({
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

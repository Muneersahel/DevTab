import {
  ActivityDay,
  AiVsHumanStats,
  DashboardViewModel,
  UsageItem,
} from '../models/dashboard.model';
import { TimedUsage, WakaTimeStatsResponse } from '../models/wakatime-stats.model';
import { WakaTimeSummariesResponse, WakaTimeSummaryDay } from '../models/wakatime-summaries.model';

/**
 * Builds the dashboard view model. Summaries are the authoritative source for
 * the numbers a developer sees first — they're recomputed from heartbeats per
 * day and tend to be hours fresher than the heavily-cached `/stats` endpoint.
 *
 * Stats only contributes things summaries cannot express: profile visibility
 * flags and the cache-freshness indicator (`is_cached`, `is_up_to_date`,
 * `percent_calculated`, `modified_at`).
 *
 * When summaries are unavailable we gracefully fall back to stats so the
 * dashboard still renders something useful.
 */
export function normalizeDashboard(
  stats: WakaTimeStatsResponse | null,
  summaries: WakaTimeSummariesResponse | null,
  options: { fetchedAt?: Date } = {},
): DashboardViewModel {
  const aggregated = summaries ? aggregateSummaries(summaries) : null;
  const statsData = stats?.data ?? null;

  const totalSeconds = aggregated?.totalSeconds ?? statsData?.total_seconds ?? 0;

  const totalTime =
    summaries?.cumulative_total?.text ||
    (aggregated ? formatSeconds(aggregated.totalSeconds) : null) ||
    statsData?.human_readable_total ||
    formatSeconds(statsData?.total_seconds ?? 0);

  const dailyAverage =
    summaries?.daily_average?.text ||
    (aggregated && aggregated.codingDays > 0
      ? formatSeconds(aggregated.totalSeconds / aggregated.codingDays)
      : null) ||
    statsData?.human_readable_daily_average ||
    formatSeconds(statsData?.daily_average ?? 0);

  const languages = aggregated?.languages ?? toUsageItems(statsData?.languages);
  const projects = aggregated?.projects ?? toUsageItems(statsData?.projects);
  const categories = aggregated?.categories ?? toUsageItems(statsData?.categories);
  const editors = aggregated?.editors ?? toUsageItems(statsData?.editors);
  const operatingSystems =
    aggregated?.operatingSystems ?? toUsageItems(statsData?.operating_systems);
  const machines = aggregated?.machines ?? toUsageItems(statsData?.machines);

  const totalIncludingOtherSeconds = statsData?.total_seconds_including_other_language ?? 0;
  const otherLanguageDelta = totalIncludingOtherSeconds - (statsData?.total_seconds ?? 0);
  // Only surface the "including other" total when it's materially higher
  // (WakaTime often returns the same value when there's no "Other" bucket).
  const totalTimeIncludingOther =
    statsData && otherLanguageDelta > 60
      ? statsData.human_readable_total_including_other_language ||
        formatSeconds(totalIncludingOtherSeconds)
      : null;

  const bestDay = aggregated?.bestDay ?? statsData?.best_day ?? null;
  const aiVsHuman =
    aggregated?.aiVsHuman ?? (statsData ? normalizeAiVsHumanFromStats(statsData) : null);

  const fetchedAt = options.fetchedAt ?? new Date();
  const cacheUpdatedAt = statsData ? toDate(statsData.modified_at || statsData.created_at) : null;

  return {
    totalTime,
    totalTimeIncludingOther,
    dailyAverage,
    rangeLabel: statsData?.human_readable_range || deriveRangeLabel(summaries) || 'Last 7 days',
    bestDay,
    topLanguage: languages[0] ?? null,
    topProject: projects[0] ?? null,
    languages: languages.slice(0, 5),
    languagesAll: languages,
    projects: projects.slice(0, 5),
    projectsAll: projects,
    categories: categories.slice(0, 4),
    categoriesAll: categories,
    editors: editors.slice(0, 4),
    editorsAll: editors,
    operatingSystems: operatingSystems.slice(0, 4),
    operatingSystemsAll: operatingSystems,
    machines: machines.slice(0, 4),
    machinesAll: machines,
    aiVsHuman,
    activity: aggregated?.activity ?? [],
    activityUnavailable: summaries === null,
    visibility: {
      languages: statsData?.is_language_usage_visible !== false,
      editors: statsData?.is_editor_usage_visible !== false,
      operatingSystems: statsData?.is_os_usage_visible !== false,
      categories: statsData?.is_category_usage_visible !== false,
      codingActivity: statsData?.is_coding_activity_visible !== false,
    },
    fetchedAt,
    cacheUpdatedAt,
    status: normalizeStatus(stats, summaries, totalSeconds),
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

function normalizeStatus(
  stats: WakaTimeStatsResponse | null,
  summaries: WakaTimeSummariesResponse | null,
  totalSeconds: number,
): DashboardViewModel['status'] {
  if (!stats) {
    // No stats means we couldn't reach the cache-status endpoint. If summaries
    // gave us numbers we still call that "synced" — they're the freshest data
    // we have.
    if (summaries && totalSeconds > 0) {
      return { label: 'Synced', detail: 'Latest summaries loaded', tone: 'ok' };
    }
    return { label: 'Pending', detail: 'Waiting for WakaTime', tone: 'updating' };
  }

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

interface AggregatedSummaries {
  totalSeconds: number;
  codingDays: number;
  languages: UsageItem[];
  projects: UsageItem[];
  categories: UsageItem[];
  editors: UsageItem[];
  operatingSystems: UsageItem[];
  machines: UsageItem[];
  bestDay: { date: string; text: string; total_seconds: number } | null;
  aiVsHuman: AiVsHumanStats | null;
  activity: ActivityDay[];
}

function aggregateSummaries(summaries: WakaTimeSummariesResponse): AggregatedSummaries {
  const days = summaries.data;
  const totalSeconds =
    summaries.cumulative_total?.seconds ??
    days.reduce((acc, day) => acc + (day.grand_total?.total_seconds ?? 0), 0);

  return {
    totalSeconds,
    codingDays: countCodingDays(days),
    languages: aggregateBucket(days, (day) => day.languages, totalSeconds),
    projects: aggregateBucket(days, (day) => day.projects, totalSeconds),
    categories: aggregateBucket(days, (day) => day.categories, totalSeconds),
    editors: aggregateBucket(days, (day) => day.editors, totalSeconds),
    operatingSystems: aggregateBucket(days, (day) => day.operating_systems, totalSeconds),
    machines: aggregateBucket(days, (day) => day.machines, totalSeconds),
    bestDay: pickBestDay(days),
    aiVsHuman: aggregateAiVsHuman(days),
    activity: buildActivity(days),
  };
}

function aggregateBucket(
  days: WakaTimeSummaryDay[],
  pick: (day: WakaTimeSummaryDay) => TimedUsage[] | undefined,
  totalSeconds: number,
): UsageItem[] {
  const totals = new Map<string, number>();

  for (const day of days) {
    const items = pick(day) ?? [];
    for (const item of items) {
      totals.set(item.name, (totals.get(item.name) ?? 0) + (item.total_seconds ?? 0));
    }
  }

  const items: UsageItem[] = [];
  for (const [name, seconds] of totals) {
    if (seconds <= 0) {
      continue;
    }
    items.push({
      name,
      totalSeconds: seconds,
      percent: totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0,
      time: formatSeconds(seconds),
    });
  }

  items.sort((a, b) => b.totalSeconds - a.totalSeconds);
  return items;
}

function countCodingDays(days: WakaTimeSummaryDay[]): number {
  return days.reduce((acc, day) => ((day.grand_total?.total_seconds ?? 0) > 0 ? acc + 1 : acc), 0);
}

function pickBestDay(
  days: WakaTimeSummaryDay[],
): { date: string; text: string; total_seconds: number } | null {
  let best: { date: string; text: string; total_seconds: number } | null = null;

  for (const day of days) {
    const seconds = day.grand_total?.total_seconds ?? 0;
    if (seconds <= 0) {
      continue;
    }
    if (!best || seconds > best.total_seconds) {
      best = {
        date: day.range.date,
        text: day.grand_total?.text || formatSeconds(seconds),
        total_seconds: seconds,
      };
    }
  }

  return best;
}

function aggregateAiVsHuman(days: WakaTimeSummaryDay[]): AiVsHumanStats | null {
  let aiAdditions = 0;
  let aiDeletions = 0;
  let humanAdditions = 0;
  let humanDeletions = 0;
  let aiInputTokens = 0;
  let aiOutputTokens = 0;

  for (const day of days) {
    const total = day.grand_total;
    if (!total) continue;
    aiAdditions += total.ai_additions ?? 0;
    aiDeletions += total.ai_deletions ?? 0;
    humanAdditions += total.human_additions ?? 0;
    humanDeletions += total.human_deletions ?? 0;
    aiInputTokens += total.ai_input_tokens ?? 0;
    aiOutputTokens += total.ai_output_tokens ?? 0;
  }

  const totalAdditions = aiAdditions + humanAdditions;
  const totalSignal =
    totalAdditions + aiDeletions + humanDeletions + aiInputTokens + aiOutputTokens;

  if (totalSignal === 0) {
    return null;
  }

  return {
    aiAdditions,
    aiDeletions,
    humanAdditions,
    humanDeletions,
    aiInputTokens,
    aiOutputTokens,
    aiSharePercent: totalAdditions > 0 ? Math.round((aiAdditions / totalAdditions) * 100) : 0,
    hasData: true,
  };
}

function buildActivity(days: WakaTimeSummaryDay[]): ActivityDay[] {
  if (days.length === 0) {
    return [];
  }

  const max = Math.max(1, ...days.map((day) => day.grand_total?.total_seconds ?? 0));

  return days.map((day) => {
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

function normalizeAiVsHumanFromStats(data: WakaTimeStatsResponse['data']): AiVsHumanStats | null {
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

  return {
    aiAdditions,
    aiDeletions,
    humanAdditions,
    humanDeletions,
    aiInputTokens,
    aiOutputTokens,
    aiSharePercent: totalAdditions > 0 ? Math.round((aiAdditions / totalAdditions) * 100) : 0,
    hasData: true,
  };
}

function deriveRangeLabel(summaries: WakaTimeSummariesResponse | null): string | null {
  if (!summaries || summaries.data.length === 0) {
    return null;
  }
  const days = summaries.data.length;
  return days === 1 ? 'Today' : `Last ${days} days`;
}

function toUsageItems(items: TimedUsage[] | undefined): UsageItem[] {
  return (items ?? []).map((item) => ({
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

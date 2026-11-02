import {
  ActivityDay,
  AiVsHumanStats,
  DashboardViewModel,
  TodaySummary,
  UsageItem,
} from '../models/dashboard.model';
import { TimedUsage, WakaTimeStatsResponse } from '../models/wakatime-stats.model';
import { WakaTimeSummariesResponse, WakaTimeSummaryDay } from '../models/wakatime-summaries.model';
import { formatSeconds } from './duration';

const ACTIVITY_PROJECT_COUNT = 3;

/**
 * Builds the dashboard view model. Summaries are the authoritative source for
 * the numbers a developer sees first — they're recomputed from heartbeats per
 * day and tend to be hours fresher than the heavily-cached `/stats` endpoint.
 *
 * Stats only contributes things summaries cannot express: the cache-freshness
 * indicator (`is_cached`, `is_up_to_date`, `percent_calculated`,
 * `modified_at`). Its `is_*_visible` flags describe the public profile only,
 * not what the API returns to the token owner, so they are deliberately unused.
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

  // Durations are formatted from seconds ("4h 34m") rather than WakaTime's
  // long-form text ("4 hrs 34 mins") so every number reads the same way.
  const totalTime = formatSeconds(totalSeconds);

  const dailyAverageSeconds =
    summaries?.daily_average?.seconds ??
    (aggregated && aggregated.codingDays > 0
      ? aggregated.totalSeconds / aggregated.codingDays
      : (statsData?.daily_average ?? 0));

  const dailyAverage = formatSeconds(dailyAverageSeconds);

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
    statsData && otherLanguageDelta > 60 ? formatSeconds(totalIncludingOtherSeconds) : null;

  const statsBestDay = statsData?.best_day;
  const bestDay =
    aggregated?.bestDay ??
    (statsBestDay ? { ...statsBestDay, text: formatSeconds(statsBestDay.total_seconds) } : null);
  const aiVsHuman =
    aggregated?.aiVsHuman ?? (statsData ? normalizeAiVsHumanFromStats(statsData) : null);

  const fetchedAt = options.fetchedAt ?? new Date();
  const cacheUpdatedAt = statsData ? toDate(statsData.modified_at || statsData.created_at) : null;

  return {
    totalTime,
    totalTimeIncludingOther,
    dailyAverage,
    dailyAverageSeconds,
    // Summaries define the rolling range every number is computed from; stats'
    // `human_readable_range` ("last week") doesn't match it.
    rangeLabel: deriveRangeLabel(summaries) || statsData?.human_readable_range || 'Last 7 days',
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
    today: summaries ? summarizeToday(summaries.data, dailyAverageSeconds) : null,
    activeDays:
      aggregated && summaries && summaries.data.length > 0
        ? { active: aggregated.codingDays, total: summaries.data.length }
        : null,
    activity: aggregated?.activity ?? [],
    activityProjects: aggregated?.activityProjects ?? [],
    activityUnavailable: summaries === null,
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
  activityProjects: string[];
}

function aggregateSummaries(summaries: WakaTimeSummariesResponse): AggregatedSummaries {
  const days = summaries.data;
  const totalSeconds =
    summaries.cumulative_total?.seconds ??
    days.reduce((acc, day) => acc + (day.grand_total?.total_seconds ?? 0), 0);
  const projects = aggregateBucket(days, (day) => day.projects, totalSeconds);
  const activityProjects = projects.slice(0, ACTIVITY_PROJECT_COUNT).map((p) => p.name);

  return {
    totalSeconds,
    codingDays: countCodingDays(days),
    languages: aggregateBucket(days, (day) => day.languages, totalSeconds),
    projects,
    categories: aggregateBucket(days, (day) => day.categories, totalSeconds),
    editors: aggregateBucket(days, (day) => day.editors, totalSeconds),
    operatingSystems: aggregateBucket(days, (day) => day.operating_systems, totalSeconds),
    machines: aggregateBucket(days, (day) => day.machines, totalSeconds),
    bestDay: pickBestDay(days),
    aiVsHuman: aggregateAiVsHuman(days),
    activity: buildActivity(days, activityProjects),
    activityProjects,
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
        text: formatSeconds(seconds),
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

function buildActivity(days: WakaTimeSummaryDay[], projectNames: string[]): ActivityDay[] {
  if (days.length === 0) {
    return [];
  }

  const max = Math.max(1, ...days.map((day) => day.grand_total?.total_seconds ?? 0));

  return days.map((day) => {
    const totalSeconds = day.grand_total?.total_seconds ?? 0;
    const topSeconds = projectNames.map(
      (name) => day.projects?.find((p) => p.name === name)?.total_seconds ?? 0,
    );
    const otherSeconds = Math.max(0, totalSeconds - topSeconds.reduce((a, b) => a + b, 0));

    return {
      date: day.range.date,
      label: formatDayLabel(day.range.date),
      time: formatSeconds(totalSeconds),
      totalSeconds,
      percentOfMax: Math.round((totalSeconds / max) * 100),
      projectSeconds: [...topSeconds, otherSeconds],
    };
  });
}

function summarizeToday(
  days: WakaTimeSummaryDay[],
  dailyAverageSeconds: number,
): TodaySummary | null {
  const day = days.at(-1);
  if (!day) {
    return null;
  }

  const seconds = day.grand_total?.total_seconds ?? 0;
  const hasAverage = dailyAverageSeconds > 0;

  return {
    date: day.range.date,
    time: formatSeconds(seconds),
    percentOfAverage: hasAverage ? Math.round((seconds / dailyAverageSeconds) * 100) : null,
    remainingToAverage:
      hasAverage && seconds < dailyAverageSeconds
        ? formatSeconds(dailyAverageSeconds - seconds)
        : null,
    topProject: topByTime(day.projects),
    topLanguage: topByTime(day.languages),
  };
}

function topByTime(items: TimedUsage[] | undefined): string | null {
  let top: TimedUsage | null = null;
  for (const item of items ?? []) {
    if (item.total_seconds > 0 && (!top || item.total_seconds > top.total_seconds)) {
      top = item;
    }
  }
  return top?.name ?? null;
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
    time: formatSeconds(item.total_seconds),
    totalSeconds: item.total_seconds,
  }));
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

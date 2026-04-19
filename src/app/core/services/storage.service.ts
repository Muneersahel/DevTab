import { Injectable } from '@angular/core';
import { StoredWakaTimeCredential, WakaTimeCredentialInput } from '../models/credential.model';
import {
  ActivityDay,
  AiVsHumanStats,
  DashboardStatus,
  DashboardViewModel,
  UsageItem,
  VisibilityFlags,
} from '../models/dashboard.model';
import type { KanbanColumnId, Task, TaskKind, TaskStatus } from '../models/task.model';
import { DEFAULT_UI_PREFERENCES, type DevTabUiPreferences } from '../models/ui-prefs.model';
import { BestDay } from '../models/wakatime-stats.model';

const CREDENTIAL_KEY = 'devtab.wakatimeCredential';
const DASHBOARD_CACHE_KEY = 'devtab.dashboardCache';
const PRODUCTIVITY_KEY = 'devtab.productivity';
const UI_PREFS_KEY = 'devtab.uiPreferences';
const PRODUCTIVITY_ENVELOPE_VERSION = 1;
const DASHBOARD_CACHE_VERSION = 3;
// v2 persisted a single `lastUpdated` timestamp. We still read those entries
// so a user upgrading DevTab doesn't see an empty splash.
const DASHBOARD_CACHE_COMPATIBLE_VERSIONS = new Set([2, 3]);

interface CachedDashboardEnvelope {
  version: number;
  cachedAt: string;
  data: SerializedDashboard;
}

interface SerializedDashboard extends Omit<DashboardViewModel, 'fetchedAt' | 'cacheUpdatedAt'> {
  fetchedAt: string;
  cacheUpdatedAt: string | null;
}

export interface CachedDashboard {
  cachedAt: Date;
  data: DashboardViewModel;
}

interface ChromeStorageArea {
  get(keys: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

interface ChromeLike {
  storage?: {
    local?: ChromeStorageArea;
  };
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  async getCredential(): Promise<StoredWakaTimeCredential | null> {
    const storage = this.chromeStorage();

    if (storage) {
      const result = await storage.get(CREDENTIAL_KEY);
      return parseCredential(result[CREDENTIAL_KEY]);
    }

    return parseCredential(this.localStorage()?.getItem(CREDENTIAL_KEY));
  }

  async saveCredential(input: WakaTimeCredentialInput): Promise<StoredWakaTimeCredential> {
    const credential: StoredWakaTimeCredential = {
      type: input.type,
      token: input.token.trim(),
      savedAt: new Date().toISOString(),
    };
    const storage = this.chromeStorage();

    if (storage) {
      await storage.set({ [CREDENTIAL_KEY]: credential });
      return credential;
    }

    this.localStorage()?.setItem(CREDENTIAL_KEY, JSON.stringify(credential));
    return credential;
  }

  async clearCredential(): Promise<void> {
    const storage = this.chromeStorage();

    if (storage) {
      await storage.remove(CREDENTIAL_KEY);
      return;
    }

    this.localStorage()?.removeItem(CREDENTIAL_KEY);
  }

  async getCachedDashboard(): Promise<CachedDashboard | null> {
    const storage = this.chromeStorage();

    if (storage) {
      const result = await storage.get(DASHBOARD_CACHE_KEY);
      return parseCachedDashboard(result[DASHBOARD_CACHE_KEY]);
    }

    return parseCachedDashboard(this.localStorage()?.getItem(DASHBOARD_CACHE_KEY));
  }

  async saveCachedDashboard(data: DashboardViewModel): Promise<CachedDashboard> {
    const cachedAt = new Date();
    const envelope: CachedDashboardEnvelope = {
      version: DASHBOARD_CACHE_VERSION,
      cachedAt: cachedAt.toISOString(),
      data: serializeDashboard(data),
    };
    const storage = this.chromeStorage();

    if (storage) {
      await storage.set({ [DASHBOARD_CACHE_KEY]: envelope });
    } else {
      this.localStorage()?.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(envelope));
    }

    return { cachedAt, data };
  }

  async clearCachedDashboard(): Promise<void> {
    const storage = this.chromeStorage();

    if (storage) {
      await storage.remove(DASHBOARD_CACHE_KEY);
      return;
    }

    this.localStorage()?.removeItem(DASHBOARD_CACHE_KEY);
  }

  async getUiPreferences(): Promise<DevTabUiPreferences> {
    const storage = this.chromeStorage();
    let raw: unknown;

    if (storage) {
      const result = await storage.get(UI_PREFS_KEY);
      raw = result[UI_PREFS_KEY];
    } else {
      const item = this.localStorage()?.getItem(UI_PREFS_KEY);
      raw = item ? safeParse(item) : null;
    }

    return parseUiPreferences(raw);
  }

  async saveUiPreferences(prefs: DevTabUiPreferences): Promise<void> {
    const storage = this.chromeStorage();

    if (storage) {
      await storage.set({ [UI_PREFS_KEY]: prefs });
      return;
    }

    this.localStorage()?.setItem(UI_PREFS_KEY, JSON.stringify(prefs));
  }

  async getProductivityTasks(): Promise<Task[]> {
    const storage = this.chromeStorage();
    let raw: unknown;

    if (storage) {
      const result = await storage.get(PRODUCTIVITY_KEY);
      raw = result[PRODUCTIVITY_KEY];
    } else {
      const item = this.localStorage()?.getItem(PRODUCTIVITY_KEY);
      raw = item ? safeParse(item) : null;
    }

    return parseProductivityTasks(raw);
  }

  async saveProductivityTasks(tasks: Task[]): Promise<void> {
    const envelope = {
      version: PRODUCTIVITY_ENVELOPE_VERSION,
      tasks,
    };
    const storage = this.chromeStorage();

    if (storage) {
      await storage.set({ [PRODUCTIVITY_KEY]: envelope });
      return;
    }

    this.localStorage()?.setItem(PRODUCTIVITY_KEY, JSON.stringify(envelope));
  }

  private chromeStorage(): ChromeStorageArea | null {
    const chromeLike = (globalThis as typeof globalThis & { chrome?: ChromeLike }).chrome;
    return chromeLike?.storage?.local ?? null;
  }

  private localStorage(): Storage | null {
    const storage = globalThis.localStorage;

    if (
      typeof storage?.getItem === 'function' &&
      typeof storage.setItem === 'function' &&
      typeof storage.removeItem === 'function'
    ) {
      return storage;
    }

    return null;
  }
}

function parseCredential(value: unknown): StoredWakaTimeCredential | null {
  const parsed = typeof value === 'string' ? safeParse(value) : value;

  if (!isRecord(parsed)) {
    return null;
  }

  if (
    (parsed['type'] === 'apiKey' || parsed['type'] === 'bearerToken') &&
    typeof parsed['token'] === 'string' &&
    typeof parsed['savedAt'] === 'string'
  ) {
    return {
      type: parsed['type'],
      token: parsed['token'],
      savedAt: parsed['savedAt'],
    };
  }

  return null;
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function serializeDashboard(data: DashboardViewModel): SerializedDashboard {
  return {
    ...data,
    fetchedAt: data.fetchedAt.toISOString(),
    cacheUpdatedAt: data.cacheUpdatedAt ? data.cacheUpdatedAt.toISOString() : null,
  };
}

function parseCachedDashboard(value: unknown): CachedDashboard | null {
  const parsed = typeof value === 'string' ? safeParse(value) : value;

  if (!isRecord(parsed)) {
    return null;
  }

  if (
    typeof parsed['version'] !== 'number' ||
    !DASHBOARD_CACHE_COMPATIBLE_VERSIONS.has(parsed['version'])
  ) {
    return null;
  }

  if (typeof parsed['cachedAt'] !== 'string' || !isRecord(parsed['data'])) {
    return null;
  }

  const cachedAt = new Date(parsed['cachedAt']);
  if (Number.isNaN(cachedAt.getTime())) {
    return null;
  }

  const data = deserializeDashboard(parsed['data'], cachedAt);
  if (!data) {
    return null;
  }

  return { cachedAt, data };
}

function deserializeDashboard(
  value: Record<string, unknown>,
  cachedAt: Date,
): DashboardViewModel | null {
  const languages = parseUsageItems(value['languages']);
  const projects = parseUsageItems(value['projects']);
  const categories = parseUsageItems(value['categories']);
  const editors = parseUsageItems(value['editors']);
  const operatingSystems = parseUsageItems(value['operatingSystems']);
  const machines = parseUsageItems(value['machines']);
  // Older cache entries may not include the *All companions; fall back to
  // the truncated previews so we degrade gracefully without re-fetching.
  const languagesAll = parseUsageItems(value['languagesAll']);
  const projectsAll = parseUsageItems(value['projectsAll']);
  const categoriesAll = parseUsageItems(value['categoriesAll']);
  const editorsAll = parseUsageItems(value['editorsAll']);
  const operatingSystemsAll = parseUsageItems(value['operatingSystemsAll']);
  const machinesAll = parseUsageItems(value['machinesAll']);
  const activity = parseActivity(value['activity']);
  const status = parseStatus(value['status']);
  const visibility = parseVisibility(value['visibility']);
  const aiVsHuman = parseAiVsHuman(value['aiVsHuman']);

  if (
    typeof value['totalTime'] !== 'string' ||
    typeof value['dailyAverage'] !== 'string' ||
    typeof value['rangeLabel'] !== 'string' ||
    typeof value['activityUnavailable'] !== 'boolean' ||
    !status
  ) {
    return null;
  }

  // v3 fields
  const rawFetchedAt = typeof value['fetchedAt'] === 'string' ? new Date(value['fetchedAt']) : null;
  const rawCacheUpdatedAt =
    typeof value['cacheUpdatedAt'] === 'string' ? new Date(value['cacheUpdatedAt']) : null;
  // v2 fallback — `lastUpdated` used to conflate fetch time with server cache
  // time. Treat it as the WakaTime cache timestamp and use the envelope's
  // `cachedAt` as our best guess for when DevTab actually fetched.
  const legacyLastUpdated =
    typeof value['lastUpdated'] === 'string' ? new Date(value['lastUpdated']) : null;

  const fetchedAt = rawFetchedAt && !Number.isNaN(rawFetchedAt.getTime()) ? rawFetchedAt : cachedAt;
  const cacheUpdatedAt =
    rawCacheUpdatedAt && !Number.isNaN(rawCacheUpdatedAt.getTime())
      ? rawCacheUpdatedAt
      : legacyLastUpdated && !Number.isNaN(legacyLastUpdated.getTime())
        ? legacyLastUpdated
        : null;

  const totalTimeIncludingOther =
    typeof value['totalTimeIncludingOther'] === 'string' ? value['totalTimeIncludingOther'] : null;

  return {
    totalTime: value['totalTime'],
    totalTimeIncludingOther,
    dailyAverage: value['dailyAverage'],
    rangeLabel: value['rangeLabel'],
    bestDay: parseBestDay(value['bestDay']),
    topLanguage: parseUsageItem(value['topLanguage']),
    topProject: parseUsageItem(value['topProject']),
    languages,
    languagesAll: languagesAll.length ? languagesAll : languages,
    projects,
    projectsAll: projectsAll.length ? projectsAll : projects,
    categories,
    categoriesAll: categoriesAll.length ? categoriesAll : categories,
    editors,
    editorsAll: editorsAll.length ? editorsAll : editors,
    operatingSystems,
    operatingSystemsAll: operatingSystemsAll.length ? operatingSystemsAll : operatingSystems,
    machines,
    machinesAll: machinesAll.length ? machinesAll : machines,
    aiVsHuman,
    activity,
    activityUnavailable: value['activityUnavailable'],
    visibility,
    fetchedAt,
    cacheUpdatedAt,
    status,
  };
}

function parseUsageItems(value: unknown): UsageItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => parseUsageItem(entry))
    .filter((item): item is UsageItem => item !== null);
}

function parseUsageItem(value: unknown): UsageItem | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value['name'] === 'string' &&
    typeof value['percent'] === 'number' &&
    typeof value['time'] === 'string' &&
    typeof value['totalSeconds'] === 'number'
  ) {
    return {
      name: value['name'],
      percent: value['percent'],
      time: value['time'],
      totalSeconds: value['totalSeconds'],
    };
  }

  return null;
}

function parseActivity(value: unknown): ActivityDay[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<ActivityDay[]>((acc, entry) => {
    if (!isRecord(entry)) {
      return acc;
    }

    if (
      typeof entry['date'] === 'string' &&
      typeof entry['label'] === 'string' &&
      typeof entry['time'] === 'string' &&
      typeof entry['totalSeconds'] === 'number' &&
      typeof entry['percentOfMax'] === 'number'
    ) {
      acc.push({
        date: entry['date'],
        label: entry['label'],
        time: entry['time'],
        totalSeconds: entry['totalSeconds'],
        percentOfMax: entry['percentOfMax'],
      });
    }

    return acc;
  }, []);
}

function parseStatus(value: unknown): DashboardStatus | null {
  if (!isRecord(value)) {
    return null;
  }

  const tone = value['tone'];
  if (tone !== 'ok' && tone !== 'updating' && tone !== 'warning') {
    return null;
  }

  if (typeof value['label'] !== 'string' || typeof value['detail'] !== 'string') {
    return null;
  }

  return { label: value['label'], detail: value['detail'], tone };
}

function parseBestDay(value: unknown): BestDay | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value['date'] === 'string' &&
    typeof value['text'] === 'string' &&
    typeof value['total_seconds'] === 'number'
  ) {
    return {
      date: value['date'],
      text: value['text'],
      total_seconds: value['total_seconds'],
    };
  }

  return null;
}

function parseVisibility(value: unknown): VisibilityFlags {
  if (!isRecord(value)) {
    return {
      languages: true,
      editors: true,
      operatingSystems: true,
      categories: true,
      codingActivity: true,
    };
  }

  return {
    languages: readFlag(value['languages']),
    editors: readFlag(value['editors']),
    operatingSystems: readFlag(value['operatingSystems']),
    categories: readFlag(value['categories']),
    codingActivity: readFlag(value['codingActivity']),
  };
}

function readFlag(value: unknown): boolean {
  return typeof value === 'boolean' ? value : true;
}

function parseAiVsHuman(value: unknown): AiVsHumanStats | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value['aiAdditions'] === 'number' &&
    typeof value['aiDeletions'] === 'number' &&
    typeof value['humanAdditions'] === 'number' &&
    typeof value['humanDeletions'] === 'number' &&
    typeof value['aiInputTokens'] === 'number' &&
    typeof value['aiOutputTokens'] === 'number' &&
    typeof value['aiSharePercent'] === 'number' &&
    typeof value['hasData'] === 'boolean'
  ) {
    return {
      aiAdditions: value['aiAdditions'],
      aiDeletions: value['aiDeletions'],
      humanAdditions: value['humanAdditions'],
      humanDeletions: value['humanDeletions'],
      aiInputTokens: value['aiInputTokens'],
      aiOutputTokens: value['aiOutputTokens'],
      aiSharePercent: value['aiSharePercent'],
      hasData: value['hasData'],
    };
  }

  return null;
}

function parseUiPreferences(value: unknown): DevTabUiPreferences {
  const merged: DevTabUiPreferences = { ...DEFAULT_UI_PREFERENCES };
  if (!isRecord(value)) {
    return merged;
  }

  if (typeof value['codingDetailsExpanded'] === 'boolean') {
    merged.codingDetailsExpanded = value['codingDetailsExpanded'];
  }

  if (typeof value['searchUrlTemplate'] === 'string') {
    const t = value['searchUrlTemplate'].trim();
    if (t.includes('%s')) {
      merged.searchUrlTemplate = t;
    }
  }

  return merged;
}

function parseProductivityTasks(value: unknown): Task[] {
  const parsed = typeof value === 'string' ? safeParse(value) : value;

  if (!isRecord(parsed)) {
    return [];
  }

  if (
    typeof parsed['version'] !== 'number' ||
    parsed['version'] !== PRODUCTIVITY_ENVELOPE_VERSION
  ) {
    return [];
  }

  const rawTasks = parsed['tasks'];
  if (!Array.isArray(rawTasks)) {
    return [];
  }

  return rawTasks
    .map((entry) => parseStoredTask(entry))
    .filter((task): task is Task => task !== null);
}

function parseStoredTask(value: unknown): Task | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = value['id'];
  const title = value['title'];
  const kind = value['kind'];
  const status = value['status'];
  const createdAt = value['createdAt'];
  const updatedAt = value['updatedAt'];
  const sortOrder = value['sortOrder'];

  if (
    typeof id !== 'string' ||
    typeof title !== 'string' ||
    !title.trim() ||
    (kind !== 'quick' && kind !== 'project') ||
    (status !== 'todo' && status !== 'done') ||
    typeof createdAt !== 'string' ||
    typeof updatedAt !== 'string' ||
    typeof sortOrder !== 'number' ||
    !Number.isFinite(sortOrder)
  ) {
    return null;
  }

  const dueRaw = value['dueAt'];
  const dueAt =
    dueRaw === null || dueRaw === undefined
      ? null
      : typeof dueRaw === 'string' && dueRaw.trim()
        ? dueRaw
        : null;

  let columnId: KanbanColumnId | null = null;
  const col = value['columnId'];
  if (col === 'backlog' || col === 'doing' || col === 'done') {
    columnId = col;
  }

  if (kind === 'quick') {
    columnId = null;
  } else if (kind === 'project' && !columnId) {
    columnId = 'backlog';
  }

  let nextStatus: TaskStatus = status;
  if (kind === 'project' && columnId) {
    nextStatus = columnId === 'done' ? 'done' : 'todo';
  }

  return {
    id,
    kind: kind as TaskKind,
    title: title.trim(),
    status: nextStatus,
    dueAt,
    createdAt,
    updatedAt,
    sortOrder,
    columnId: kind === 'project' ? columnId : null,
  };
}

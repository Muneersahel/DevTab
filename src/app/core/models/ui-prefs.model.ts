export interface DevTabUiPreferences {
  /** When true, WakaTime charts and long breakdown sections are visible. */
  codingDetailsExpanded: boolean;
  /**
   * Used when `chrome.search` is unavailable. Must contain literal `%s`
   * where the query string is inserted (URL-encoded).
   */
  searchUrlTemplate: string;
  /**
   * Interval used by dashboard auto-refresh. `0` disables periodic refresh
   * while still allowing manual refresh.
   */
  autoRefreshIntervalMs: number;
}

export const DEFAULT_SEARCH_URL_TEMPLATE = 'https://www.google.com/search?q=%s';
export const AUTO_REFRESH_INTERVAL_OPTIONS_MS = [
  0,
  60_000,
  2 * 60_000,
  5 * 60_000,
  10 * 60_000,
] as const;
export const DEFAULT_AUTO_REFRESH_INTERVAL_MS = 2 * 60_000;

export const DEFAULT_UI_PREFERENCES: DevTabUiPreferences = {
  codingDetailsExpanded: false,
  searchUrlTemplate: DEFAULT_SEARCH_URL_TEMPLATE,
  autoRefreshIntervalMs: DEFAULT_AUTO_REFRESH_INTERVAL_MS,
};

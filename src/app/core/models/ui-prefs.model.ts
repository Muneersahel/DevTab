export interface DevTabUiPreferences {
  /** When true, WakaTime charts and long breakdown sections are visible. */
  codingDetailsExpanded: boolean;
  /**
   * Used when `chrome.search` is unavailable. Must contain literal `%s`
   * where the query string is inserted (URL-encoded).
   */
  searchUrlTemplate: string;
}

export const DEFAULT_SEARCH_URL_TEMPLATE = 'https://www.google.com/search?q=%s';

export const DEFAULT_UI_PREFERENCES: DevTabUiPreferences = {
  codingDetailsExpanded: false,
  searchUrlTemplate: DEFAULT_SEARCH_URL_TEMPLATE,
};

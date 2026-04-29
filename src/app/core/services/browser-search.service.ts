import { Injectable } from '@angular/core';

interface ChromeSearch {
  query?(details: { text: string; disposition?: 'CURRENT_TAB' | 'NEW_TAB' | 'NEW_WINDOW' }): void;
}

interface ChromeWithSearch {
  search?: ChromeSearch;
}

@Injectable({ providedIn: 'root' })
export class BrowserSearchService {
  /**
   * Runs a search in the browser default engine when `chrome.search` exists;
   * otherwise opens `fallbackTemplate` with `%s` replaced by the encoded query.
   */
  runSearch(query: string, fallbackTemplate: string): void {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    const chromeLike = (globalThis as typeof globalThis & { chrome?: ChromeWithSearch }).chrome;
    const searchApi = chromeLike?.search;
    if (typeof searchApi?.query === 'function') {
      searchApi.query({ text: trimmed, disposition: 'CURRENT_TAB' });
      return;
    }

    const template = fallbackTemplate.includes('%s')
      ? fallbackTemplate
      : 'https://www.google.com/search?q=%s';
    const url = template.split('%s').join(encodeURIComponent(trimmed));
    globalThis.location.assign(url);
  }
}

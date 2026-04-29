import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { BrowserSearchService } from './browser-search.service';

describe('BrowserSearchService', () => {
  it('navigates in the same tab when chrome.search is unavailable', () => {
    const assignSpy = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      assign: assignSpy,
    } as Location);

    TestBed.configureTestingModule({
      providers: [BrowserSearchService],
    });
    const service = TestBed.inject(BrowserSearchService);

    service.runSearch('hello world', 'https://example.com/?q=%s');

    expect(assignSpy).toHaveBeenCalledWith('https://example.com/?q=hello%20world');
  });
});

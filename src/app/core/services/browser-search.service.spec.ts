import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { BrowserSearchService } from './browser-search.service';

describe('BrowserSearchService', () => {
  it('opens a URL when chrome.search is unavailable', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    TestBed.configureTestingModule({
      providers: [BrowserSearchService],
    });
    const service = TestBed.inject(BrowserSearchService);

    service.runSearch('hello world', 'https://example.com/?q=%s');

    expect(openSpy).toHaveBeenCalledWith(
      'https://example.com/?q=hello%20world',
      '_blank',
      'noopener,noreferrer',
    );

    openSpy.mockRestore();
  });
});

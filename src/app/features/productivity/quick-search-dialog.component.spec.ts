import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { QuickSearchDialogComponent } from './quick-search-dialog.component';

describe('QuickSearchDialogComponent', () => {
  it.each([
    { query: 'github.com', arrowDowns: 0, expected: { url: 'https://github.com/' } },
    {
      query: 'https://angular.dev/guide',
      arrowDowns: 0,
      expected: { url: 'https://angular.dev/guide' },
    },
    { query: 'localhost:4200/app', arrowDowns: 0, expected: { url: 'http://localhost:4200/app' } },
    { query: 'node.js', arrowDowns: 0, expected: { search: 'node.js' } },
    { query: 'node.js', arrowDowns: 1, expected: { url: 'https://node.js/' } },
    { query: 'angular signals', arrowDowns: 0, expected: { search: 'angular signals' } },
    { query: 'angular signals', arrowDowns: 1, expected: { search: 'angular signals' } },
  ])(
    'runs the right action for "$query" after $arrowDowns arrow-down',
    async ({ query, arrowDowns, expected }) => {
      await TestBed.configureTestingModule({
        imports: [QuickSearchDialogComponent],
      }).compileComponents();
      const fixture = TestBed.createComponent(QuickSearchDialogComponent);
      const urls: string[] = [];
      const searches: string[] = [];
      fixture.componentInstance.urlRequested.subscribe((url) => urls.push(url));
      fixture.componentInstance.searchRequested.subscribe((text) => searches.push(text));
      fixture.componentRef.setInput('open', true);
      fixture.detectChanges();
      // ngModel registers its control with the form asynchronously.
      await fixture.whenStable();

      const input = fixture.nativeElement.querySelector('#quick-search-input') as HTMLInputElement;
      input.value = query;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      for (let i = 0; i < arrowDowns; i++) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        fixture.detectChanges();
      }
      fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

      expect({ urls, searches }).toEqual({
        urls: 'url' in expected ? [expected.url] : [],
        searches: 'search' in expected ? [expected.search] : [],
      });
    },
  );
});

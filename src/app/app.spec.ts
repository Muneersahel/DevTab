import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { DashboardStoreService } from './core/services/dashboard-store.service';

describe('App', () => {
  it('creates the app shell', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: DashboardStoreService, useValue: fakeStore() }],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('DevTab');
  });
});

function fakeStore(): Partial<DashboardStoreService> {
  return {
    state: signal({ kind: 'missing_auth' }),
    credential: signal(null),
    initialize: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    saveCredential: vi.fn().mockResolvedValue(undefined),
    clearCredential: vi.fn().mockResolvedValue(undefined),
  };
}

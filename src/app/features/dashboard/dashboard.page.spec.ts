import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { DashboardState } from '../../core/models/dashboard.model';
import { createStatsResponse, createSummariesResponse } from '../../core/testing/wakatime.fixtures';
import { normalizeDashboard } from '../../core/utils/wakatime-normalizer';
import { DashboardPageComponent } from './dashboard.page';

describe('DashboardPageComponent', () => {
  it('renders setup state when auth is missing', async () => {
    const { fixture } = await render({ kind: 'missing_auth' });

    expect(fixture.nativeElement.textContent).toContain('Connect WakaTime');
  });

  it('renders dashboard data from normalized stats', async () => {
    const data = normalizeDashboard(createStatsResponse(), createSummariesResponse());
    const { fixture } = await render({ kind: 'ready', data });

    expect(fixture.nativeElement.textContent).toContain('18 hrs');
    expect(fixture.nativeElement.textContent).toContain('TypeScript');
    expect(fixture.nativeElement.textContent).toContain('DevTab');
  });

  it('keeps debug details hidden until opened', async () => {
    const { fixture } = await render({
      kind: 'error',
      message: 'Could not load',
      debug: 'HTTP 500',
    });

    expect(fixture.nativeElement.textContent).not.toContain('HTTP 500');
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    buttons.find((button) => button.textContent?.includes('Debug'))?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('HTTP 500');
  });
});

async function render(state: DashboardState): Promise<{
  fixture: ComponentFixture<DashboardPageComponent>;
  componentRef: ComponentRef<DashboardPageComponent>;
}> {
  await TestBed.configureTestingModule({
    imports: [DashboardPageComponent],
  }).compileComponents();

  const fixture = TestBed.createComponent(DashboardPageComponent);
  const componentRef = fixture.componentRef;
  componentRef.setInput('state', state);
  fixture.detectChanges();
  await fixture.whenStable();

  return { fixture, componentRef };
}

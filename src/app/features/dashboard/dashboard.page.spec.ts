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

    expect(fixture.nativeElement.textContent).toContain('18h');
    expect(fixture.nativeElement.textContent).toContain('DevTab');
    expect(fixture.nativeElement.querySelector('#today-heading').textContent).toContain('Today');
    expect(fixture.nativeElement.textContent).toContain('3h 48m');
    expect(fixture.nativeElement.textContent).toContain('148%');
    expect(fixture.nativeElement.textContent).toContain('VS Code');
  });

  it('shows editor, OS and category usage even when they are private on the public profile', async () => {
    const data = normalizeDashboard(
      createStatsResponse({
        is_editor_usage_visible: false,
        is_os_usage_visible: false,
        is_category_usage_visible: false,
      }),
      createSummariesResponse(),
    );
    const { fixture } = await render({ kind: 'ready', data });
    const setup = fixture.nativeElement.querySelector('[aria-labelledby="setup-heading"]')
      .textContent as string;

    expect(setup).toContain('VS Code');
    expect(setup).toContain('macOS');
    expect(setup).toContain('Coding');
    expect(setup).not.toContain('Hidden');
  });

  it('stacks activity by project with a legend when "by project" is chosen', async () => {
    const data = normalizeDashboard(createStatsResponse(), createSummariesResponse());
    const { fixture } = await render({ kind: 'ready', data });
    const element = fixture.nativeElement as HTMLElement;
    const legend = () => element.querySelector('dt-activity-chart [aria-label="Legend"]');

    expect(element.querySelector('#week-heading')?.textContent?.trim()).toBe('Last 7 days');
    expect(legend()).toBeNull();

    const byProject = Array.from(
      element.querySelectorAll('[aria-label="Activity view"] button'),
    ).find((button) => button.textContent?.trim() === 'by project') as HTMLButtonElement;
    byProject.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(byProject.getAttribute('aria-pressed')).toBe('true');
    expect(
      Array.from(legend()?.querySelectorAll('li') ?? []).map((li) => li.textContent?.trim()),
    ).toEqual(['DevTab', 'Other']);
  });

  it('switches the focus card between projects and languages', async () => {
    const data = normalizeDashboard(createStatsResponse(), createSummariesResponse());
    const { fixture } = await render({ kind: 'ready', data });
    const focusCard = () =>
      (fixture.nativeElement.querySelector('[aria-label="Breakdown"]') as HTMLElement).closest(
        'article',
      ) as HTMLElement;

    expect(focusCard().textContent).toContain('DevTab');
    expect(focusCard().textContent).not.toContain('TypeScript');

    const languagesButton = Array.from(focusCard().querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'languages',
    ) as HTMLButtonElement;
    languagesButton.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(languagesButton.getAttribute('aria-pressed')).toBe('true');
    expect(focusCard().textContent).toContain('TypeScript');
  });

  it('submits a pasted OAuth token from the reconnect screen', async () => {
    const { fixture, componentRef } = await render({
      kind: 'invalid_auth',
      message: 'Unauthorized',
    });
    const submitted: string[] = [];
    componentRef.instance.credentialSubmitted.subscribe((token) => submitted.push(token));

    const input = fixture.nativeElement.querySelector('#connect-token') as HTMLInputElement;
    input.value = '  oauth-token-123  ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(fixture.nativeElement.textContent).toContain('Reconnect WakaTime');
    expect(submitted).toEqual(['oauth-token-123']);
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

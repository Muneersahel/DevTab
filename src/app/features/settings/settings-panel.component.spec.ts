import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import type { StoredWakaTimeCredential } from '../../core/models/credential.model';
import { DEFAULT_UI_PREFERENCES } from '../../core/models/ui-prefs.model';
import { SettingsPanelComponent } from './settings-panel.component';

const savedCredential: StoredWakaTimeCredential = {
  token: 'waka-secret',
  savedAt: '2026-11-02T08:00:00Z',
};

describe('SettingsPanelComponent', () => {
  it('emits a saved credential from the form', async () => {
    const { fixture } = await render(null);
    const save = vi.fn();
    fixture.componentInstance.saveRequested.subscribe(save);

    fixture.componentInstance['form'].setValue({
      token: 'oauth-secret',
    });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(save).toHaveBeenCalledWith({
      token: 'oauth-secret',
    });
  });

  it('hides the token field when connected until the token is replaced', async () => {
    const { fixture, element } = await render(savedCredential);

    expect(element.textContent).toContain('Connected');
    expect(element.querySelector('#settings-token')).toBeNull();

    button(element, 'Replace token').click();
    fixture.detectChanges();

    expect(element.querySelector('#settings-token')).not.toBeNull();
  });

  it('asks for confirmation before disconnecting', async () => {
    const { fixture, element } = await render(savedCredential);
    const clear = vi.fn();
    fixture.componentInstance.clearRequested.subscribe(clear);

    button(element, 'Disconnect').click();
    fixture.detectChanges();
    expect(clear).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Remove the token from this browser?');

    const buttons = Array.from(element.querySelectorAll('button')).filter(
      (b) => b.textContent?.trim() === 'Disconnect',
    );
    buttons[buttons.length - 1].click();
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('saves the auto-refresh interval as soon as an option is picked', async () => {
    const { fixture, element } = await render(savedCredential);
    const saved = vi.fn();
    fixture.componentInstance.preferencesSaved.subscribe(saved);

    const fiveMinutes = Array.from(element.querySelectorAll('label')).find(
      (label) => label.textContent?.trim() === '5 min',
    ) as HTMLLabelElement;
    fiveMinutes.querySelector('input')?.click();
    fixture.detectChanges();

    expect(saved).toHaveBeenCalledWith({
      ...DEFAULT_UI_PREFERENCES,
      autoRefreshIntervalMs: 300_000,
    });
    expect(element.textContent).toContain('Saved');
  });

  it('does not save a fallback search URL without %s', async () => {
    const { fixture, element } = await render(savedCredential);
    const saved = vi.fn();
    fixture.componentInstance.preferencesSaved.subscribe(saved);

    const input = element.querySelector('#settings-search-url') as HTMLInputElement;
    input.value = 'https://example.com/search';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(saved).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Include %s where the search text should go.');
  });
});

async function render(credential: StoredWakaTimeCredential | null) {
  await TestBed.configureTestingModule({
    imports: [SettingsPanelComponent],
  }).compileComponents();
  const fixture = TestBed.createComponent(SettingsPanelComponent);
  fixture.componentRef.setInput('credential', credential);
  fixture.componentRef.setInput('uiPreferences', DEFAULT_UI_PREFERENCES);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, element: fixture.nativeElement as HTMLElement };
}

function button(element: HTMLElement, text: string): HTMLButtonElement {
  return Array.from(element.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === text,
  ) as HTMLButtonElement;
}

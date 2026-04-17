import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { SettingsPanelComponent } from './settings-panel.component';

describe('SettingsPanelComponent', () => {
  it('emits a saved credential from the form', async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsPanelComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(SettingsPanelComponent);
    const save = vi.fn();
    fixture.componentInstance.saveRequested.subscribe(save);
    fixture.detectChanges();

    fixture.componentInstance['form'].setValue({
      type: 'bearerToken',
      token: 'oauth-secret',
    });
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(save).toHaveBeenCalledWith({
      type: 'bearerToken',
      token: 'oauth-secret',
    });
  });
});

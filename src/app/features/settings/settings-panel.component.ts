import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  StoredWakaTimeCredential,
  WakaTimeCredentialInput,
  WakaTimeCredentialType,
} from '../../core/models/credential.model';
import {
  AUTO_REFRESH_INTERVAL_OPTIONS_MS,
  DEFAULT_UI_PREFERENCES,
  type DevTabUiPreferences,
} from '../../core/models/ui-prefs.model';
import {
  lockDocumentBodyScroll,
  unlockDocumentBodyScroll,
} from '../../core/utils/document-scroll-lock';

const fieldClass =
  'mt-2 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/15';

@Component({
  selector: 'dt-settings-panel',
  imports: [ReactiveFormsModule],
  template: `
    <dialog
      #dialog
      class="dt-dialog m-auto flex max-h-[min(85vh,800px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/8 bg-zinc-950/95 p-0 text-zinc-100 shadow-[0_30px_120px_-30px_rgba(16,185,129,0.35)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      aria-modal="true"
      aria-labelledby="settings-title"
      aria-describedby="settings-desc"
      (close)="closed.emit()"
    >
      <div class="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header
          class="relative z-10 flex shrink-0 items-start justify-between gap-4 border-b border-white/6 bg-zinc-950/95 px-6 py-5"
        >
          <div class="min-w-0">
            <p class="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-400/85">
              / workspace
            </p>
            <h2
              id="settings-title"
              class="mt-2 text-base font-semibold tracking-tight text-zinc-50"
            >
              Settings
            </h2>
            <p id="settings-desc" class="mt-1 text-[13px] leading-relaxed text-zinc-500">
              Credentials stay in this browser only.
            </p>
          </div>
          <button
            type="button"
            class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/4 text-zinc-300 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
            (click)="close()"
            aria-label="Close settings"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <div
          class="relative z-10 min-h-0 flex-1 scroll-pb-28 overflow-y-auto overscroll-contain px-6 pt-6"
        >
          <form class="space-y-5" [formGroup]="form" (ngSubmit)="submit()">
            <div>
              <p class="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                / wakatime
              </p>
              <h3 class="mt-2 text-sm font-medium text-zinc-200">Connection</h3>
              <p class="mt-1 text-[12px] leading-relaxed text-zinc-500">
                Use an API key or OAuth bearer token from your WakaTime account.
              </p>
            </div>

            <label class="block">
              <span class="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500"
                >Credential type</span
              >
              <select class="${fieldClass}" formControlName="type">
                <option value="apiKey">API key</option>
                <option value="bearerToken">OAuth bearer token</option>
              </select>
            </label>

            <label class="block">
              <span class="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500"
                >Token</span
              >
              <input
                class="${fieldClass} font-mono"
                formControlName="token"
                type="password"
                autocomplete="off"
                placeholder="Paste your WakaTime credential"
              />
            </label>

            @if (credential()) {
              <p
                class="rounded-md border border-white/8 bg-white/[0.03] px-3 py-2.5 text-[13px] text-zinc-400"
                role="status"
              >
                A credential is saved. Saving replaces it.
              </p>
            }

            <div
              class="flex flex-wrap items-center justify-between gap-3 border-t border-white/6 pt-5"
            >
              <button
                class="rounded-md border border-red-900/60 px-3 py-2 text-sm text-red-200/95 transition hover:bg-red-950/45 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                [disabled]="!credential()"
                (click)="clearRequested.emit()"
              >
                Clear token
              </button>
              <div class="flex flex-wrap gap-2">
                <button
                  class="rounded-md border border-white/10 px-3 py-2 text-sm text-zinc-200 transition hover:border-white/18 hover:bg-white/[0.06]"
                  type="button"
                  (click)="close()"
                >
                  Cancel
                </button>
                <button
                  class="rounded-md bg-emerald-400 px-3 py-2 text-sm font-medium text-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                  type="submit"
                  [disabled]="form.invalid"
                >
                  Save and refresh
                </button>
              </div>
            </div>
          </form>

          <form
            class="mt-8 space-y-5 border-t border-white/6 pt-8"
            [formGroup]="prefsForm"
            (ngSubmit)="savePrefs()"
          >
            <div>
              <p class="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                / preferences
              </p>
              <h3 class="mt-2 text-sm font-medium text-zinc-200">Dashboard</h3>
            </div>

            <label class="block">
              <span class="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500"
                >Auto-refresh interval</span
              >
              <select class="${fieldClass}" formControlName="autoRefreshIntervalMs">
                @for (opt of refreshOptions; track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
            </label>
            <p class="text-[12px] leading-relaxed text-zinc-500">
              Controls how often analytics refresh in the background.
            </p>

            <div class="border-t border-white/6 pt-6">
              <p class="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                / quick search
              </p>
              <h3 class="mt-2 text-sm font-medium text-zinc-200">Fallback search URL</h3>
              <p class="mt-1 text-[12px] leading-relaxed text-zinc-500">
                Used when
                <code
                  class="rounded border border-white/10 bg-black/30 px-1 py-0.5 font-mono text-[11px] text-zinc-400"
                  >chrome.search</code
                >
                is unavailable. Include
                <code
                  class="rounded border border-white/10 bg-black/30 px-1 py-0.5 font-mono text-[11px] text-zinc-400"
                  >%s</code
                >
                for the query.
              </p>
            </div>

            <label class="block">
              <span class="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500"
                >Search URL template</span
              >
              <input
                class="${fieldClass} font-mono text-[13px]"
                formControlName="searchUrlTemplate"
                type="url"
                autocomplete="off"
                placeholder="https://www.google.com/search?q=%s"
              />
            </label>

            <div
              class="sticky bottom-0 z-10 -mx-6 mt-2 flex justify-end border-t border-white/8 bg-zinc-950/95 px-6 py-4 shadow-[0_-16px_40px_-12px_rgba(0,0,0,0.65)] backdrop-blur-sm supports-[backdrop-filter]:bg-zinc-950/90"
            >
              <button
                class="rounded-md border border-white/10 px-3 py-2 text-sm text-zinc-200 transition hover:border-white/18 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                type="submit"
                [disabled]="prefsForm.invalid"
              >
                Save search preferences
              </button>
            </div>
          </form>
        </div>
      </div>
    </dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPanelComponent {
  readonly credential = input<StoredWakaTimeCredential | null>(null);
  readonly uiPreferences = input<DevTabUiPreferences>(DEFAULT_UI_PREFERENCES);
  readonly closed = output<void>();
  readonly saveRequested = output<WakaTimeCredentialInput>();
  readonly clearRequested = output<void>();
  readonly preferencesSaved = output<DevTabUiPreferences>();

  protected readonly form = new FormGroup({
    type: new FormControl<WakaTimeCredentialType>('apiKey', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    token: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
  });

  protected readonly prefsForm = new FormGroup({
    autoRefreshIntervalMs: new FormControl(DEFAULT_UI_PREFERENCES.autoRefreshIntervalMs, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    searchUrlTemplate: new FormControl(DEFAULT_UI_PREFERENCES.searchUrlTemplate, {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/.*%s.*/)],
    }),
  });
  protected readonly refreshOptions = [
    { value: AUTO_REFRESH_INTERVAL_OPTIONS_MS[0], label: 'Off (manual only)' },
    { value: AUTO_REFRESH_INTERVAL_OPTIONS_MS[1], label: 'Every 1 minute' },
    { value: AUTO_REFRESH_INTERVAL_OPTIONS_MS[2], label: 'Every 2 minutes (recommended)' },
    { value: AUTO_REFRESH_INTERVAL_OPTIONS_MS[3], label: 'Every 5 minutes' },
    { value: AUTO_REFRESH_INTERVAL_OPTIONS_MS[4], label: 'Every 10 minutes' },
  ] as const;

  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly document = inject(DOCUMENT);

  constructor() {
    effect((onCleanup) => {
      const dialog = this.dialogRef()?.nativeElement;
      if (!dialog) return;

      if (!dialog.open) {
        dialog.showModal?.();
      }
      lockDocumentBodyScroll(this.document);

      onCleanup(() => {
        unlockDocumentBodyScroll(this.document);
        if (dialog.open) {
          dialog.close?.();
        }
      });
    });

    effect(() => {
      const credential = this.credential();
      this.form.controls.type.setValue(credential?.type ?? 'apiKey', { emitEvent: false });
      this.form.controls.token.setValue('', { emitEvent: false });
    });

    effect(() => {
      const prefs = this.uiPreferences();
      this.prefsForm.controls.autoRefreshIntervalMs.setValue(prefs.autoRefreshIntervalMs, {
        emitEvent: false,
      });
      this.prefsForm.controls.searchUrlTemplate.setValue(prefs.searchUrlTemplate, {
        emitEvent: false,
      });
    });
  }

  protected close(): void {
    this.dialogRef()?.nativeElement.close?.();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saveRequested.emit({
      type: this.form.controls.type.value,
      token: this.form.controls.token.value,
    });
  }

  protected savePrefs(): void {
    if (this.prefsForm.invalid) {
      this.prefsForm.markAllAsTouched();
      return;
    }
    const template = this.prefsForm.controls.searchUrlTemplate.value.trim();
    this.preferencesSaved.emit({
      ...this.uiPreferences(),
      autoRefreshIntervalMs: this.prefsForm.controls.autoRefreshIntervalMs.value,
      searchUrlTemplate: template,
    });
  }
}

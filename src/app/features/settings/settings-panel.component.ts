import { DatePipe, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  StoredWakaTimeCredential,
  WakaTimeCredentialInput,
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
  'min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-zinc-100 outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-400/50';

const sectionTitleClass = 'text-[13px] font-semibold text-zinc-100';

@Component({
  selector: 'dt-settings-panel',
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <dialog
      #dialog
      class="dt-dialog m-auto flex max-h-[min(85vh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-900/95 p-0 text-zinc-100 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      aria-modal="true"
      aria-labelledby="settings-title"
      (close)="closed.emit()"
    >
      <header class="flex shrink-0 items-center justify-between gap-4 px-5 pt-5 pb-4">
        <h2 id="settings-title" class="text-[16px] font-semibold tracking-tight text-zinc-50">
          Settings
        </h2>
        <button
          type="button"
          class="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-white/8 hover:text-zinc-100"
          (click)="close()"
          aria-label="Close settings"
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </header>

      <div class="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 pb-5">
        <section aria-labelledby="settings-wakatime">
          <h3 id="settings-wakatime" class="${sectionTitleClass}">WakaTime</h3>
          <p class="mt-1 text-[12px] leading-relaxed text-zinc-400">
            DevTab reads your stats with a WakaTime OAuth token. It is stored only in this browser.
          </p>

          @if (credential(); as saved) {
            <div class="mt-3 rounded-lg border border-white/8 bg-white/3 p-3">
              <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span
                  class="h-2 w-2 shrink-0 rounded-full bg-emerald-400"
                  aria-hidden="true"
                ></span>
                <p class="min-w-0 flex-1 text-[13px] text-zinc-200">
                  Connected
                  <span class="text-zinc-400">· saved {{ saved.savedAt | date: 'd MMM' }}</span>
                </p>
                @if (!replacing() && !confirmingDisconnect()) {
                  <div class="flex gap-1.5">
                    <button
                      type="button"
                      class="rounded-md border border-white/10 px-2.5 py-1 text-[12px] text-zinc-200 transition-colors hover:bg-white/8"
                      (click)="startReplace()"
                    >
                      Replace token
                    </button>
                    <button
                      type="button"
                      class="rounded-md px-2.5 py-1 text-[12px] text-red-300 transition-colors hover:bg-red-400/10"
                      (click)="confirmingDisconnect.set(true)"
                    >
                      Disconnect
                    </button>
                  </div>
                }
              </div>

              @if (confirmingDisconnect()) {
                <div
                  class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-3"
                  role="alert"
                >
                  <p class="text-[12px] text-zinc-300">Remove the token from this browser?</p>
                  <div class="flex gap-1.5">
                    <button
                      type="button"
                      class="rounded-md px-2.5 py-1 text-[12px] text-zinc-300 transition-colors hover:bg-white/8"
                      (click)="confirmingDisconnect.set(false)"
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      class="rounded-md bg-red-600 px-2.5 py-1 text-[12px] font-medium text-white transition-colors hover:bg-red-500"
                      (click)="clearRequested.emit()"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              }
            </div>
          }

          @if (showTokenForm()) {
            <form class="mt-3" [formGroup]="form" (ngSubmit)="submit()">
              <label class="text-[12px] text-zinc-300" for="settings-token">
                {{ credential() ? 'New OAuth token' : 'OAuth token' }}
              </label>
              <div class="mt-1.5 flex gap-2">
                <input
                  #tokenInput
                  id="settings-token"
                  class="${fieldClass} font-mono"
                  formControlName="token"
                  type="password"
                  autocomplete="off"
                  placeholder="Paste your OAuth token"
                />
                <button
                  class="shrink-0 rounded-lg bg-emerald-400 px-3.5 py-2 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                  type="submit"
                  [disabled]="form.invalid"
                >
                  {{ credential() ? 'Save' : 'Connect' }}
                </button>
              </div>
              <div class="mt-2 flex items-center justify-between gap-3 text-[12px]">
                <a
                  class="text-emerald-300 underline-offset-2 hover:underline"
                  href="https://wakatime.com/oauth"
                  target="_blank"
                  rel="noopener noreferrer"
                  >Get a token<span class="sr-only"> (opens in a new tab)</span> ↗</a
                >
                @if (replacing()) {
                  <button
                    type="button"
                    class="text-zinc-400 hover:text-zinc-100"
                    (click)="replacing.set(false)"
                  >
                    Cancel
                  </button>
                }
              </div>
            </form>
          }
        </section>

        <section class="border-t border-white/6 pt-5" aria-labelledby="settings-dashboard">
          <div class="flex items-baseline justify-between gap-3">
            <h3 id="settings-dashboard" class="${sectionTitleClass}">Dashboard</h3>
            @if (prefsSaved()) {
              <p class="text-[12px] text-emerald-300" role="status">Saved</p>
            }
          </div>

          <fieldset class="mt-3" [formGroup]="prefsForm">
            <legend class="text-[12px] text-zinc-300">Auto-refresh</legend>
            <div
              class="mt-1.5 grid grid-cols-5 gap-1 rounded-lg border border-white/8 bg-black/30 p-1"
            >
              @for (opt of refreshOptions; track opt.value) {
                <label
                  class="cursor-pointer rounded-md px-2 py-1.5 text-center text-[12px] text-zinc-300 transition-colors hover:text-zinc-50 has-checked:bg-white/10 has-checked:text-zinc-50 has-focus-visible:outline has-focus-visible:outline-emerald-400"
                >
                  <input
                    class="sr-only"
                    type="radio"
                    name="autoRefreshIntervalMs"
                    formControlName="autoRefreshIntervalMs"
                    [value]="opt.value"
                    (change)="saveInterval(opt.value)"
                  />
                  {{ opt.label }}
                </label>
              }
            </div>
            <p class="mt-1.5 text-[12px] text-zinc-400">
              How often stats refresh in the background. 2 min is recommended.
            </p>
          </fieldset>

          <details class="group mt-4" [formGroup]="prefsForm">
            <summary
              class="flex cursor-pointer list-none items-center gap-1.5 text-[12px] text-zinc-400 hover:text-zinc-100"
            >
              <svg
                class="h-3 w-3 transition-transform group-open:rotate-90"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
              Advanced
            </summary>
            <div class="mt-3">
              <label class="text-[12px] text-zinc-300" for="settings-search-url">
                Fallback search URL
              </label>
              <input
                id="settings-search-url"
                class="${fieldClass} mt-1.5 w-full font-mono"
                formControlName="searchUrlTemplate"
                type="url"
                autocomplete="off"
                placeholder="https://www.google.com/search?q=%s"
                aria-describedby="settings-search-url-hint"
                [attr.aria-invalid]="prefsForm.controls.searchUrlTemplate.invalid"
                (change)="saveSearchUrl()"
              />
              @if (prefsForm.controls.searchUrlTemplate.invalid) {
                <p id="settings-search-url-hint" class="mt-1.5 text-[12px] text-red-300">
                  Include %s where the search text should go.
                </p>
              } @else {
                <p id="settings-search-url-hint" class="mt-1.5 text-[12px] text-zinc-400">
                  Used only when the browser's default search isn't available. %s is replaced with
                  your query.
                </p>
              }
            </div>
          </details>
        </section>
      </div>

      <footer
        class="flex shrink-0 items-center justify-between gap-3 border-t border-white/6 bg-black/20 px-5 py-3"
      >
        <p class="text-[12px] text-zinc-400">Changes save automatically.</p>
        <button
          type="button"
          class="rounded-lg border border-white/10 px-3.5 py-1.5 text-[13px] text-zinc-100 transition-colors hover:bg-white/8"
          (click)="close()"
        >
          Done
        </button>
      </footer>
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

  protected readonly replacing = signal(false);
  protected readonly confirmingDisconnect = signal(false);
  protected readonly prefsSaved = signal(false);
  protected readonly showTokenForm = computed(() => !this.credential() || this.replacing());

  protected readonly form = new FormGroup({
    token: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
  });

  protected readonly prefsForm = new FormGroup({
    autoRefreshIntervalMs: new FormControl(DEFAULT_UI_PREFERENCES.autoRefreshIntervalMs, {
      nonNullable: true,
    }),
    searchUrlTemplate: new FormControl(DEFAULT_UI_PREFERENCES.searchUrlTemplate, {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/.*%s.*/)],
    }),
  });

  protected readonly refreshOptions = [
    { value: AUTO_REFRESH_INTERVAL_OPTIONS_MS[0], label: 'Off' },
    { value: AUTO_REFRESH_INTERVAL_OPTIONS_MS[1], label: '1 min' },
    { value: AUTO_REFRESH_INTERVAL_OPTIONS_MS[2], label: '2 min' },
    { value: AUTO_REFRESH_INTERVAL_OPTIONS_MS[3], label: '5 min' },
    { value: AUTO_REFRESH_INTERVAL_OPTIONS_MS[4], label: '10 min' },
  ] as const;

  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly tokenInput = viewChild<ElementRef<HTMLInputElement>>('tokenInput');
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
      // Reset the token flow whenever the saved credential changes.
      this.credential();
      this.form.controls.token.setValue('', { emitEvent: false });
      this.replacing.set(false);
      this.confirmingDisconnect.set(false);
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

  protected startReplace(): void {
    this.replacing.set(true);
    queueMicrotask(() => this.tokenInput()?.nativeElement.focus());
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saveRequested.emit({
      token: this.form.controls.token.value,
    });
  }

  protected saveInterval(autoRefreshIntervalMs: number): void {
    this.emitPreferences({ ...this.uiPreferences(), autoRefreshIntervalMs });
  }

  protected saveSearchUrl(): void {
    const control = this.prefsForm.controls.searchUrlTemplate;
    const searchUrlTemplate = control.value.trim();
    if (control.invalid || searchUrlTemplate === this.uiPreferences().searchUrlTemplate) return;
    this.emitPreferences({ ...this.uiPreferences(), searchUrlTemplate });
  }

  private emitPreferences(prefs: DevTabUiPreferences): void {
    this.preferencesSaved.emit(prefs);
    this.prefsSaved.set(true);
  }
}

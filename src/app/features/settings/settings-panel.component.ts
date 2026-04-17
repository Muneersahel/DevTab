import { ChangeDetectionStrategy, Component, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  StoredWakaTimeCredential,
  WakaTimeCredentialInput,
  WakaTimeCredentialType,
} from '../../core/models/credential.model';

@Component({
  selector: 'dt-settings-panel',
  imports: [ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4" role="presentation">
      <section
        class="w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-950 p-5 text-zinc-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 id="settings-title" class="text-lg font-semibold">WakaTime settings</h2>
            <p class="mt-1 text-sm text-zinc-500">Credentials stay on this browser.</p>
          </div>
          <button
            class="rounded-md px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-900"
            type="button"
            (click)="closed.emit()"
          >
            Close
          </button>
        </div>

        <form class="mt-5 space-y-4" [formGroup]="form" (ngSubmit)="submit()">
          <label class="block text-sm">
            <span class="text-zinc-300">Credential type</span>
            <select
              class="mt-2 w-full rounded-md border border-zinc-800 bg-neutral-950 px-3 py-2 text-zinc-100"
              formControlName="type"
            >
              <option value="apiKey">API key</option>
              <option value="bearerToken">OAuth bearer token</option>
            </select>
          </label>

          <label class="block text-sm">
            <span class="text-zinc-300">Token</span>
            <input
              class="mt-2 w-full rounded-md border border-zinc-800 bg-neutral-950 px-3 py-2 text-zinc-100 placeholder:text-zinc-600"
              formControlName="token"
              type="password"
              autocomplete="off"
              placeholder="Paste your WakaTime credential"
            />
          </label>

          @if (credential()) {
            <p class="rounded-md border border-zinc-800 bg-neutral-950 p-3 text-sm text-zinc-400">
              A credential is saved. Saving a new value will replace it.
            </p>
          }

          <div
            class="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4"
          >
            <button
              class="rounded-md border border-red-900/70 px-3 py-2 text-sm text-red-200 hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              [disabled]="!credential()"
              (click)="clearRequested.emit()"
            >
              Clear token
            </button>
            <div class="flex gap-2">
              <button
                class="rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
                type="button"
                (click)="closed.emit()"
              >
                Cancel
              </button>
              <button
                class="rounded-md bg-emerald-400 px-3 py-2 text-sm font-medium text-neutral-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                type="submit"
                [disabled]="form.invalid"
              >
                Save and refresh
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPanelComponent {
  readonly credential = input<StoredWakaTimeCredential | null>(null);
  readonly closed = output<void>();
  readonly saveRequested = output<WakaTimeCredentialInput>();
  readonly clearRequested = output<void>();

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

  constructor() {
    effect(() => {
      const credential = this.credential();
      this.form.controls.type.setValue(credential?.type ?? 'apiKey', { emitEvent: false });
      this.form.controls.token.setValue('', { emitEvent: false });
    });
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
}

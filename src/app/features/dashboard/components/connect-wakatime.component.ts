import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

/** Inline first-run / reconnect form for pasting a WakaTime OAuth token. */
@Component({
  selector: 'dt-connect-wakatime',
  imports: [ReactiveFormsModule],
  template: `
    <section
      class="w-full max-w-md rounded-md border bg-surface p-8"
      [class.border-white/8]="mode() === 'connect'"
      [class.border-amber-400/25]="mode() === 'reconnect'"
      aria-labelledby="connect-heading"
    >
      <p
        class="font-mono text-[11px] uppercase tracking-[0.18em]"
        [class.text-emerald-300]="mode() === 'connect'"
        [class.text-amber-300]="mode() === 'reconnect'"
      >
        {{ mode() === 'connect' ? '/ first run' : '/ credential' }}
      </p>
      <h2 id="connect-heading" class="mt-1 text-xl font-semibold tracking-tight text-zinc-50">
        {{ mode() === 'connect' ? 'Connect WakaTime' : 'Reconnect WakaTime' }}
      </h2>
      <p class="mt-2 text-[13px] leading-6 text-zinc-400">
        @if (mode() === 'connect') {
          See your coding stats every time you open a new tab.
        } @else {
          WakaTime rejected the saved credential. API keys now only work for editor plugins, so
          paste an OAuth token instead.
        }
      </p>

      <ol class="mt-5 space-y-3 text-[13px] leading-5 text-zinc-300">
        <li class="flex gap-3">
          <span
            class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-400/50 font-mono text-[11px] text-emerald-300"
            aria-hidden="true"
            >1</span
          >
          <span>
            Get an OAuth token from WakaTime. Personal use doesn't need a published app.
            <a
              class="text-emerald-300 underline-offset-2 hover:underline"
              href="https://wakatime.com/oauth"
              target="_blank"
              rel="noopener noreferrer"
              >Get a token<span class="sr-only"> (opens in a new tab)</span> ↗</a
            >
          </span>
        </li>
        <li class="flex gap-3">
          <span
            class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-400/50 font-mono text-[11px] text-emerald-300"
            aria-hidden="true"
            >2</span
          >
          <span>Paste it below. It is stored only in this browser.</span>
        </li>
      </ol>

      <form class="mt-5" [formGroup]="form" (ngSubmit)="submit()">
        <label
          class="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400"
          for="connect-token"
          >OAuth token</label
        >
        <div class="mt-2 flex gap-2">
          <input
            id="connect-token"
            class="min-w-0 flex-1 rounded-md border border-white/10 bg-white/3 px-3 py-2 font-mono text-[13px] text-zinc-100 placeholder:text-zinc-400 focus:border-emerald-400/50"
            formControlName="token"
            type="password"
            autocomplete="off"
            placeholder="Paste your OAuth token"
          />
          <button
            class="shrink-0 rounded-md bg-emerald-400 px-4 py-2 text-[13px] font-semibold text-neutral-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            [disabled]="form.invalid"
          >
            {{ mode() === 'connect' ? 'Connect' : 'Reconnect' }}
          </button>
        </div>
      </form>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectWakatimeComponent {
  readonly mode = input<'connect' | 'reconnect'>('connect');
  readonly tokenSubmitted = output<string>();

  protected readonly form = new FormGroup({
    token: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
  });

  protected submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.tokenSubmitted.emit(this.form.controls.token.value.trim());
  }
}

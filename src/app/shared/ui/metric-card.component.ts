import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type MetricTone = 'default' | 'accent';

@Component({
  selector: 'dt-metric-card',
  template: `
    <article
      class="relative flex h-full flex-col overflow-hidden rounded-md border bg-neutral-950 p-4"
      [class.border-white/8]="tone() !== 'accent'"
      [class.border-emerald-400/25]="tone() === 'accent'"
    >
      @if (tone() === 'accent') {
        <div
          class="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/60 to-transparent"
          aria-hidden="true"
        ></div>
      }

      <header class="flex items-center justify-between gap-2">
        <p
          class="font-mono text-[10px] uppercase tracking-[0.18em]"
          [class.text-emerald-400/80]="tone() === 'accent'"
          [class.text-zinc-500]="tone() !== 'accent'"
        >
          {{ label() }}
        </p>
        @if (tone() === 'accent') {
          <span
            class="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
            aria-hidden="true"
          ></span>
        }
      </header>

      <div class="mt-4 min-w-0 flex-1">
        <p
          class="truncate font-mono text-[30px] font-semibold leading-none tracking-tight tabular-nums text-zinc-50"
          [title]="value()"
        >
          {{ value() }}
        </p>
        @if (detail()) {
          <p class="mt-3 truncate text-[13px] leading-snug text-zinc-400" [title]="detail()">
            {{ detail() }}
          </p>
        }
      </div>

      @if (caption()) {
        <footer class="mt-3 flex items-center gap-2 border-t border-white/5 pt-2">
          <span class="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
            {{ caption() }}
          </span>
        </footer>
      }
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly detail = input<string>('');
  readonly caption = input<string>('');
  readonly tone = input<MetricTone>('default');
}

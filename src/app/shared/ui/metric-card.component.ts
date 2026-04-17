import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type MetricTone = 'default' | 'accent';

@Component({
  selector: 'dt-metric-card',
  template: `
    <article
      class="group relative flex h-full flex-col justify-between overflow-hidden rounded-xl border border-white/6 bg-zinc-950/80 p-5 ring-1 ring-inset ring-white/2 transition-colors hover:border-white/10"
      [class.bg-gradient-to-br]="tone() === 'accent'"
      [class.to-transparent]="tone() === 'accent'"
      [class]="tone() === 'accent' ? 'from-emerald-500/10' : ''"
      [class]="tone() === 'accent' ? 'border-emerald-400/20' : ''"
    >
      <header class="flex items-start justify-between gap-2">
        <p class="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
          {{ label() }}
        </p>
        @if (tone() === 'accent') {
          <span
            class="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]"
            aria-hidden="true"
          ></span>
        }
      </header>

      <div class="mt-4 min-w-0">
        <p
          class="truncate text-[28px] font-semibold leading-none tracking-tight tabular-nums text-zinc-50"
          [title]="value()"
        >
          {{ value() }}
        </p>
        @if (detail()) {
          <p class="mt-2 truncate text-[13px] text-zinc-400" [title]="detail()">{{ detail() }}</p>
        }
      </div>

      @if (caption()) {
        <footer class="mt-4 flex items-center gap-2 text-[11px] text-zinc-500">
          <span class="h-px flex-1 bg-white/4"></span>
          <span class="truncate">{{ caption() }}</span>
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

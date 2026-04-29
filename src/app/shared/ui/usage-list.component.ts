import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UsageItem } from '../../core/models/dashboard.model';
import { CHART_PALETTE } from './chart-registry';

@Component({
  selector: 'dt-usage-list',
  template: `
    <ul class="space-y-4">
      @for (item of items(); track item.name; let i = $index) {
        <li class="min-w-0">
          <div class="flex items-start justify-between gap-3 sm:gap-4">
            <div class="flex min-w-0 flex-1 items-start gap-2">
              @if (showSwatch()) {
                <span
                  class="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  [style.background]="colorAt(i)"
                  aria-hidden="true"
                ></span>
              }
              <span
                class="line-clamp-2 min-w-0 break-words text-[13px] font-medium leading-snug text-zinc-100"
                [attr.title]="item.name"
                >{{ item.name }}</span
              >
            </div>
            <span
              class="shrink-0 whitespace-nowrap pt-0.5 text-right font-mono text-[11px] leading-tight tabular-nums text-zinc-400"
            >
              {{ item.time }}
              <span class="text-zinc-600" aria-hidden="true"> · </span>
              {{ item.percent | number: '1.0-0' }}%
            </span>
          </div>
          <div class="mt-2 h-2 min-w-0 overflow-hidden rounded-full bg-white/6">
            <div
              class="h-full min-w-0 rounded-full transition-[width] duration-150"
              [style.width.%]="item.percent"
              [style.background]="colorAt(i)"
            ></div>
          </div>
        </li>
      } @empty {
        <li class="text-sm text-zinc-500">{{ emptyMessage() }}</li>
      }
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
})
export class UsageListComponent {
  readonly items = input.required<UsageItem[]>();
  readonly emptyMessage = input<string>('No data yet.');
  readonly showSwatch = input<boolean>(true);
  readonly accent = input<string>('#34d399');

  protected colorAt(index: number): string {
    if (!this.showSwatch()) {
      return this.accent();
    }
    return CHART_PALETTE[index % CHART_PALETTE.length];
  }
}

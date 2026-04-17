import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UsageItem } from '../../core/models/dashboard.model';
import { CHART_PALETTE } from './chart-registry';

@Component({
  selector: 'dt-usage-list',
  template: `
    <ul class="space-y-3.5">
      @for (item of items(); track item.name; let i = $index) {
        <li>
          <div class="flex items-baseline justify-between gap-3 text-sm">
            <div class="flex min-w-0 items-center gap-2.5">
              @if (showSwatch()) {
                <span
                  class="h-2 w-2 shrink-0 rounded-full"
                  [style.background]="colorAt(i)"
                  aria-hidden="true"
                ></span>
              }
              <span class="truncate font-medium text-zinc-100">{{ item.name }}</span>
            </div>
            <span class="shrink-0 text-xs tabular-nums text-zinc-400">{{ item.time }}</span>
          </div>
          <div class="mt-2 flex items-center gap-2.5">
            <div class="h-1 flex-1 overflow-hidden rounded-full bg-white/4">
              <div
                class="h-full rounded-full"
                [style.width.%]="item.percent"
                [style.background]="colorAt(i)"
              ></div>
            </div>
            <span class="w-10 shrink-0 text-right text-[11px] tabular-nums text-zinc-500">
              {{ item.percent | number: '1.0-0' }}%
            </span>
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

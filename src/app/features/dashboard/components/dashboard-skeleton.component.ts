import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Structural loading placeholder that mirrors the real dashboard layout so
 * the page doesn't visually jump when data resolves. Kept as a dumb, stateless
 * component on purpose — no inputs, no outputs.
 */
@Component({
  selector: 'dt-dashboard-skeleton',
  template: `
    <div role="status" aria-live="polite" aria-label="Loading WakaTime stats">
      <span class="sr-only">Loading WakaTime stats…</span>

      <div
        class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_min(100%,20rem)] lg:items-start xl:gap-10"
        aria-hidden="true"
      >
        <div class="min-w-0">
          <div class="mb-3 flex items-center justify-between gap-3">
            <div class="h-2.5 w-28 animate-pulse rounded bg-white/6"></div>
            <div class="h-2.5 w-40 animate-pulse rounded bg-white/5"></div>
          </div>

          <!-- Today hero -->
          <div class="rounded-md border border-white/8 bg-surface p-5">
            <div class="h-2.5 w-32 animate-pulse rounded bg-white/6"></div>
            <div class="mt-3 h-10 w-40 animate-pulse rounded bg-white/8"></div>
            <div class="mt-4 h-1.5 max-w-md animate-pulse rounded-full bg-white/6"></div>
            <div class="mt-3 h-3 w-64 animate-pulse rounded bg-white/5"></div>
          </div>

          <!-- Summary strip -->
          <div
            class="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-white/8 bg-white/6 sm:grid-cols-4"
          >
            @for (_ of metrics; track $index) {
              <div class="space-y-2 bg-surface px-4 py-3">
                <div class="h-2.5 w-16 animate-pulse rounded bg-white/6"></div>
                <div class="h-5 w-20 animate-pulse rounded bg-white/8"></div>
              </div>
            }
          </div>

          <!-- Activity + focus -->
          <div class="mt-4 grid gap-3 lg:grid-cols-5">
            <div class="rounded-md border border-white/8 bg-surface p-5 lg:col-span-3">
              <div class="h-2.5 w-20 animate-pulse rounded bg-white/6"></div>
              <div class="mt-2 h-4 w-40 animate-pulse rounded bg-white/8"></div>
              <div class="mt-6 flex h-52 items-end gap-3">
                @for (bar of bars; track $index) {
                  <div
                    class="flex-1 animate-pulse rounded-t bg-white/5"
                    [style.height.%]="bar"
                  ></div>
                }
              </div>
            </div>
            <div class="rounded-md border border-white/8 bg-surface p-5 lg:col-span-2">
              <div class="h-2.5 w-16 animate-pulse rounded bg-white/6"></div>
              <div class="mt-2 h-4 w-32 animate-pulse rounded bg-white/8"></div>
              <ul class="mt-6 space-y-4">
                @for (row of focusRows; track $index) {
                  <li class="space-y-2">
                    <div class="flex justify-between gap-3">
                      <span
                        class="h-3 animate-pulse rounded bg-white/6"
                        [style.width.px]="row.name"
                      ></span>
                      <span class="h-3 w-16 animate-pulse rounded bg-white/5"></span>
                    </div>
                    <div class="h-2 overflow-hidden rounded-full bg-white/4">
                      <div
                        class="h-full animate-pulse rounded-full bg-white/8"
                        [style.width.%]="row.bar"
                      ></div>
                    </div>
                  </li>
                }
              </ul>
            </div>
          </div>

          <!-- Setup -->
          <div class="mt-4 space-y-3 rounded-md border border-white/8 bg-surface px-5 py-4">
            <div class="h-2.5 w-14 animate-pulse rounded bg-white/6"></div>
            @for (_ of setupRows; track $index) {
              <div class="flex items-center gap-3">
                <span class="h-3 w-20 animate-pulse rounded bg-white/5"></span>
                <span class="h-6 w-24 animate-pulse rounded-full bg-white/5"></span>
                <span class="h-6 w-20 animate-pulse rounded-full bg-white/5"></span>
              </div>
            }
          </div>
        </div>

        <!-- Tasks column -->
        <div class="h-80 animate-pulse rounded-md border border-white/8 bg-surface"></div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardSkeletonComponent {
  // Fixed shapes so tests render deterministically and to avoid layout shift
  // from random heights on each CD pass.
  protected readonly metrics = [0, 1, 2, 3];
  protected readonly bars = [38, 62, 45, 78, 54, 88, 32];
  protected readonly focusRows = [
    { name: 140, bar: 82 },
    { name: 110, bar: 64 },
    { name: 160, bar: 48 },
    { name: 96, bar: 32 },
  ];
  protected readonly setupRows = [0, 1, 2];
}

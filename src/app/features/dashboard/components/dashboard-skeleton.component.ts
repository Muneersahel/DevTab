import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Structural loading placeholder that mirrors the real dashboard layout so
 * the page doesn't visually jump when data resolves. Kept as a dumb, stateless
 * component on purpose — no inputs, no outputs.
 */
@Component({
  selector: 'dt-dashboard-skeleton',
  template: `
    <div
      class="flex flex-col gap-6"
      role="status"
      aria-live="polite"
      aria-label="Loading WakaTime stats"
    >
      <span class="sr-only">Loading WakaTime stats…</span>

      <!-- Metric cards -->
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
        @for (_ of metrics; track $index) {
          <article
            class="flex h-full flex-col justify-between rounded-xl border border-white/6 bg-zinc-950/80 p-5 ring-1 ring-inset ring-white/2"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="h-2.5 w-20 animate-pulse rounded bg-white/6"></div>
              <div class="h-2 w-2 animate-pulse rounded-full bg-white/6"></div>
            </div>
            <div class="mt-4 space-y-2">
              <div class="h-7 w-28 animate-pulse rounded bg-white/8"></div>
              <div class="h-3 w-36 animate-pulse rounded bg-white/5"></div>
            </div>
            <div class="mt-4 flex items-center gap-2">
              <span class="h-px flex-1 bg-white/4"></span>
              <span class="h-2 w-16 animate-pulse rounded bg-white/5"></span>
            </div>
          </article>
        }
      </section>

      <!-- Activity chart + language breakdown -->
      <section class="grid gap-4 lg:grid-cols-3" aria-hidden="true">
        <article
          class="rounded-xl border border-white/6 bg-zinc-950/80 p-5 ring-1 ring-inset ring-white/2 lg:col-span-2"
        >
          <header class="flex items-start justify-between gap-3">
            <div class="space-y-2">
              <div class="h-2.5 w-24 animate-pulse rounded bg-white/6"></div>
              <div class="h-4 w-40 animate-pulse rounded bg-white/8"></div>
            </div>
            <div class="space-y-2 text-right">
              <div class="ml-auto h-2.5 w-10 animate-pulse rounded bg-white/6"></div>
              <div class="ml-auto h-3 w-20 animate-pulse rounded bg-white/5"></div>
            </div>
          </header>

          <!-- Fake bar chart rail -->
          <div class="mt-6 flex h-55 items-end gap-3">
            @for (bar of bars; track $index) {
              <div class="flex-1 animate-pulse rounded-t bg-white/5" [style.height.%]="bar"></div>
            }
          </div>
        </article>

        <article
          class="rounded-xl border border-white/6 bg-zinc-950/80 p-5 ring-1 ring-inset ring-white/2"
        >
          <header class="space-y-2">
            <div class="h-2.5 w-20 animate-pulse rounded bg-white/6"></div>
            <div class="h-4 w-24 animate-pulse rounded bg-white/8"></div>
          </header>

          <div class="mt-5 flex items-center gap-5">
            <div class="relative h-35 w-35 shrink-0 animate-pulse rounded-full bg-white/5">
              <div
                class="absolute inset-4.5 rounded-full bg-zinc-950/80 ring-1 ring-inset ring-white/4"
              ></div>
            </div>
            <ul class="flex-1 space-y-3">
              @for (_ of legend; track $index) {
                <li class="flex items-center justify-between gap-2">
                  <div class="flex min-w-0 items-center gap-2">
                    <span class="h-2 w-2 shrink-0 animate-pulse rounded-full bg-white/8"></span>
                    <span class="h-2.5 w-24 animate-pulse rounded bg-white/6"></span>
                  </div>
                  <span class="h-2.5 w-8 animate-pulse rounded bg-white/5"></span>
                </li>
              }
            </ul>
          </div>
        </article>
      </section>

      <!-- Projects + environment -->
      <section class="grid gap-4 lg:grid-cols-3" aria-hidden="true">
        <article
          class="rounded-xl border border-white/6 bg-zinc-950/80 p-5 ring-1 ring-inset ring-white/2 lg:col-span-2"
        >
          <header class="space-y-2">
            <div class="h-2.5 w-20 animate-pulse rounded bg-white/6"></div>
            <div class="h-4 w-48 animate-pulse rounded bg-white/8"></div>
          </header>
          <ul class="mt-5 space-y-3">
            @for (row of projectRows; track $index) {
              <li class="space-y-2">
                <div class="flex items-center justify-between gap-3">
                  <div class="flex min-w-0 items-center gap-2">
                    <span class="h-2 w-2 shrink-0 animate-pulse rounded-full bg-white/8"></span>
                    <span
                      class="h-3 animate-pulse rounded bg-white/6"
                      [style.width.px]="row.name"
                    ></span>
                  </div>
                  <span class="h-3 w-16 animate-pulse rounded bg-white/5"></span>
                </div>
                <div class="h-1.5 overflow-hidden rounded-full bg-white/4">
                  <div
                    class="h-full animate-pulse rounded-full bg-white/8"
                    [style.width.%]="row.bar"
                  ></div>
                </div>
              </li>
            }
          </ul>
        </article>

        <article
          class="rounded-xl border border-white/6 bg-zinc-950/80 p-5 ring-1 ring-inset ring-white/2"
        >
          <header class="space-y-2">
            <div class="h-2.5 w-24 animate-pulse rounded bg-white/6"></div>
            <div class="h-4 w-36 animate-pulse rounded bg-white/8"></div>
          </header>
          <div class="mt-5 space-y-5">
            @for (group of envGroups; track $index; let first = $first) {
              <section [class]="first ? '' : 'border-t border-white/4 pt-5'">
                <div class="mb-3 h-2.5 w-20 animate-pulse rounded bg-white/6"></div>
                <ul class="space-y-3">
                  @for (row of group; track $index) {
                    <li class="flex items-center justify-between gap-3">
                      <span
                        class="h-3 animate-pulse rounded bg-white/6"
                        [style.width.px]="row"
                      ></span>
                      <span class="h-3 w-10 animate-pulse rounded bg-white/5"></span>
                    </li>
                  }
                </ul>
              </section>
            }
          </div>
        </article>
      </section>

      <!-- Footer -->
      <div
        class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/4 bg-white/1 px-4 py-3"
        aria-hidden="true"
      >
        <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span class="h-2.5 w-28 animate-pulse rounded bg-white/6"></span>
          <span class="h-2.5 w-24 animate-pulse rounded bg-white/5"></span>
          <span class="h-2.5 w-36 animate-pulse rounded bg-white/5"></span>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardSkeletonComponent {
  // Fixed shapes so SSR / tests render deterministically and to avoid
  // layout shift from random heights on each CD pass.
  protected readonly metrics = [0, 1, 2, 3];
  protected readonly bars = [38, 62, 45, 78, 54, 88, 32];
  protected readonly legend = [0, 1, 2, 3, 4];
  protected readonly projectRows = [
    { name: 140, bar: 82 },
    { name: 110, bar: 64 },
    { name: 160, bar: 48 },
    { name: 96, bar: 32 },
    { name: 128, bar: 22 },
  ];
  protected readonly envGroups: readonly number[][] = [
    [90, 120, 72],
    [110, 80],
    [96, 130, 72],
  ];
}

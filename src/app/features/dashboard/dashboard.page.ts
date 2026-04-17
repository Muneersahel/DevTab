import { DatePipe, DecimalPipe, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { DashboardState, DashboardViewModel } from '../../core/models/dashboard.model';
import { ActivityChartComponent } from '../../shared/ui/activity-chart.component';
import { CHART_PALETTE } from '../../shared/ui/chart-registry';
import { LanguageDonutComponent } from '../../shared/ui/language-donut.component';
import { MetricCardComponent } from '../../shared/ui/metric-card.component';
import { UsageListComponent } from '../../shared/ui/usage-list.component';
import { DashboardSkeletonComponent } from './components/dashboard-skeleton.component';

@Component({
  selector: 'dt-dashboard-page',
  imports: [
    DatePipe,
    DecimalPipe,
    NgOptimizedImage,
    MetricCardComponent,
    ActivityChartComponent,
    LanguageDonutComponent,
    UsageListComponent,
    DashboardSkeletonComponent,
  ],
  templateUrl: './dashboard.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent {
  readonly state = input.required<DashboardState>();
  readonly fetching = input(false);
  readonly refreshRequested = output<void>();
  readonly settingsRequested = output<void>();

  protected readonly debugOpen = signal(false);

  protected readonly dashboard = computed((): DashboardViewModel | null => {
    const state = this.state();
    return state.kind === 'ready' || state.kind === 'updating' ? state.data : null;
  });

  protected readonly errorDebug = computed(() => {
    const state = this.state();
    return state.kind === 'error' ? state.debug : '';
  });

  protected readonly errorMessage = computed(() => {
    const state = this.state();
    return state.kind === 'error' ? state.message : '';
  });

  protected readonly isUpdating = computed(() => this.state().kind === 'updating');
  protected readonly isLoading = computed(() => this.state().kind === 'loading');
  protected readonly isSyncing = computed(() => this.fetching() || this.isLoading());

  /**
   * Flips to `true` for ~900ms whenever a fresh payload lands, to power a
   * subtle "live" pulse on the status chip. Tracked via the data identity
   * (`lastUpdated` timestamp) so a stable render doesn't re-trigger it.
   */
  protected readonly justRefreshed = signal(false);
  private lastSignature: string | null = null;
  private freshnessTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const state = this.state();
      if (state.kind !== 'ready' && state.kind !== 'updating') {
        return;
      }

      const signature = `${state.kind}:${state.data.lastUpdated?.toISOString() ?? ''}:${
        state.data.totalTime
      }`;

      if (signature === this.lastSignature) {
        return;
      }

      const isFirstPaint = this.lastSignature === null;
      this.lastSignature = signature;

      if (isFirstPaint) {
        return;
      }

      if (this.freshnessTimer) {
        clearTimeout(this.freshnessTimer);
      }
      this.justRefreshed.set(true);
      this.freshnessTimer = setTimeout(() => {
        this.justRefreshed.set(false);
        this.freshnessTimer = null;
      }, 900);
    });
  }

  protected legendColor(index: number): string {
    return CHART_PALETTE[index % CHART_PALETTE.length];
  }
}

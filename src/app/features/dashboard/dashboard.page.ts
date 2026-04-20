import { DatePipe, DecimalPipe, LowerCasePipe, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DashboardState, DashboardViewModel, UsageItem } from '../../core/models/dashboard.model';
import { BrowserSearchService } from '../../core/services/browser-search.service';
import { StorageService } from '../../core/services/storage.service';
import { TaskStoreService } from '../../core/services/task-store.service';
import { ActivityChartComponent } from '../../shared/ui/activity-chart.component';
import { CHART_PALETTE } from '../../shared/ui/chart-registry';
import { DataDialogComponent } from '../../shared/ui/data-dialog.component';
import { LanguageDonutComponent } from '../../shared/ui/language-donut.component';
import { MetricCardComponent } from '../../shared/ui/metric-card.component';
import { UsageListComponent } from '../../shared/ui/usage-list.component';
import { QuickSearchDialogComponent } from '../productivity/quick-search-dialog.component';
import { TasksDialogComponent } from '../productivity/tasks-dialog.component';
import { DashboardSkeletonComponent } from './components/dashboard-skeleton.component';

@Component({
  selector: 'dt-dashboard-page',
  imports: [
    DatePipe,
    DecimalPipe,
    LowerCasePipe,
    NgOptimizedImage,
    MetricCardComponent,
    ActivityChartComponent,
    LanguageDonutComponent,
    UsageListComponent,
    DataDialogComponent,
    DashboardSkeletonComponent,
    TasksDialogComponent,
    QuickSearchDialogComponent,
  ],
  templateUrl: './dashboard.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
})
export class DashboardPageComponent {
  readonly state = input.required<DashboardState>();
  readonly fetching = input(false);
  readonly autoRefreshIntervalMs = input(2 * 60 * 1000);
  readonly refreshRequested = output<void>();
  readonly settingsRequested = output<void>();

  private readonly storage = inject(StorageService);
  protected readonly store = inject(TaskStoreService);
  private readonly browserSearch = inject(BrowserSearchService);

  protected readonly debugOpen = signal(false);
  protected readonly searchOpen = signal(false);
  protected readonly tasksOpen = signal(false);

  protected readonly activeDialog = signal<DialogKey | null>(null);

  protected readonly activeDialogConfig = computed(() => {
    const key = this.activeDialog();
    return key ? this.dialogConfigs[key] : null;
  });

  protected readonly activeDialogItems = computed((): UsageItem[] => {
    const key = this.activeDialog();
    const data = this.dashboard();
    if (!key || !data) return [];
    return this.dialogItemsFor(key, data);
  });

  protected readonly dialogConfigs: Record<
    DialogKey,
    { title: string; eyebrow: string; accent: string; showSwatch: boolean }
  > = {
    languages: {
      title: 'All languages',
      eyebrow: 'Language breakdown',
      accent: '#34d399',
      showSwatch: true,
    },
    projects: {
      title: 'All projects',
      eyebrow: 'Project breakdown',
      accent: '#34d399',
      showSwatch: false,
    },
    editors: {
      title: 'All editors',
      eyebrow: 'Editor usage',
      accent: '#60a5fa',
      showSwatch: false,
    },
    operatingSystems: {
      title: 'All operating systems',
      eyebrow: 'OS usage',
      accent: '#c084fc',
      showSwatch: false,
    },
    categories: {
      title: 'All categories',
      eyebrow: 'Activity categories',
      accent: '#34d399',
      showSwatch: false,
    },
    machines: {
      title: 'All machines',
      eyebrow: 'Machine usage',
      accent: '#fbbf24',
      showSwatch: false,
    },
  };

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

  protected readonly isLoading = computed(() => this.state().kind === 'loading');
  protected readonly isSyncing = computed(() => this.fetching() || this.isLoading());
  protected readonly autoRefreshLabel = computed(() => {
    const ms = this.autoRefreshIntervalMs();
    if (ms <= 0) return 'Off';
    if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60_000)}m`;
  });

  constructor() {
    void this.store.load();
  }

  protected legendColor(index: number): string {
    return CHART_PALETTE[index % CHART_PALETTE.length];
  }

  protected openDialog(key: DialogKey): void {
    this.activeDialog.set(key);
  }

  protected closeDialog(): void {
    this.activeDialog.set(null);
  }

  protected async runSearch(query: string): Promise<void> {
    const prefs = await this.storage.getUiPreferences();
    this.browserSearch.runSearch(query, prefs.searchUrlTemplate);
  }

  /**
   * Global keyboard shortcuts for dashboard-level surfaces:
   *   - Escape closes whichever drawer/dialog is open
   *   - Cmd/Ctrl+K toggles search
   *   - "/" opens search (when not typing in a field)
   *   - "t" toggles the tasks drawer (when not typing in a field)
   */
  protected onDocumentKeydown(ev: KeyboardEvent): void {
    if (ev.defaultPrevented) return;

    if (ev.key === 'Escape') {
      if (this.searchOpen()) {
        ev.preventDefault();
        this.searchOpen.set(false);
        return;
      }
      if (this.tasksOpen()) {
        ev.preventDefault();
        this.tasksOpen.set(false);
        return;
      }
    }

    const target = ev.target as HTMLElement | null;
    const tag = target?.tagName;
    const editable =
      Boolean(target?.isContentEditable) ||
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT';

    const meta = ev.metaKey || ev.ctrlKey;
    if (meta && ev.key.toLowerCase() === 'k') {
      ev.preventDefault();
      this.searchOpen.update((open) => !open);
      return;
    }

    if (ev.key === '/' && !editable) {
      ev.preventDefault();
      this.searchOpen.set(true);
      return;
    }

    if (ev.key.toLowerCase() === 't' && !editable && !meta && !ev.altKey) {
      ev.preventDefault();
      this.tasksOpen.update((open) => !open);
    }
  }

  protected dialogItemsFor(key: DialogKey, data: DashboardViewModel): UsageItem[] {
    switch (key) {
      case 'languages':
        return data.languagesAll;
      case 'projects':
        return data.projectsAll;
      case 'editors':
        return data.editorsAll;
      case 'operatingSystems':
        return data.operatingSystemsAll;
      case 'categories':
        return data.categoriesAll;
      case 'machines':
        return data.machinesAll;
    }
  }
}

type DialogKey =
  | 'languages'
  | 'projects'
  | 'editors'
  | 'operatingSystems'
  | 'categories'
  | 'machines';

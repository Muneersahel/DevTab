import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  input,
  viewChild,
} from '@angular/core';
import type { Chart, ChartConfiguration, ChartDataset } from 'chart.js';
import { ActivityDay } from '../../core/models/dashboard.model';
import { formatSeconds } from '../../core/utils/duration';
import { OTHER_PROJECT_COLOR, PROJECT_COLORS, registerCharts } from './chart-registry';

export type ActivityChartMode = 'total' | 'projects';

const PAST_DAY_COLOR = 'rgba(52, 211, 153, 0.32)';
const LATEST_DAY_COLOR = 'rgba(52, 211, 153, 0.9)';
const AVERAGE_LINE_COLOR = 'rgba(244, 244, 245, 0.45)';
// Matches the card surface so stacked segments read as separate blocks.
const SEGMENT_GAP_COLOR = '#111114';
const TICK_COLOR = 'rgba(161, 161, 170, 0.9)';
const LATEST_TICK_COLOR = '#f4f4f5';

/**
 * Daily coding bars with a dashed daily-average line. In `total` mode the
 * latest day (today, when the data is fresh) is drawn in full emerald; in
 * `projects` mode each bar is stacked by the range's top projects plus
 * "Other", and the latest day is marked by its bold axis label instead.
 */
@Component({
  selector: 'dt-activity-chart',
  host: {
    class: 'flex min-h-0 h-full w-full flex-col',
  },
  template: `
    @if (mode() === 'projects') {
      <ul class="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-zinc-300" aria-label="Legend">
        @for (item of legend(); track item.name) {
          <li class="flex min-w-0 items-center gap-1.5">
            <span
              class="h-2 w-2 shrink-0 rounded-[2px]"
              [style.background]="item.color"
              aria-hidden="true"
            ></span>
            <span class="max-w-48 truncate" [title]="item.name">{{ item.name }}</span>
          </li>
        }
      </ul>
    }
    <div class="relative min-h-0 w-full flex-1">
      <canvas #canvas aria-hidden="true"></canvas>
    </div>
    <ul class="sr-only" aria-label="Coding time per day">
      @for (day of data(); track day.date) {
        <li>
          {{ day.label }} {{ day.date }}: {{ day.time }}
          @if (mode() === 'projects') {
            @for (item of legend(); track item.name; let i = $index) {
              @if (day.projectSeconds[i]) {
                , {{ item.name }} {{ format(day.projectSeconds[i]) }}
              }
            }
          }
        </li>
      }
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityChartComponent {
  readonly data = input.required<ActivityDay[]>();
  /** Daily average in seconds; the average line is hidden when 0. */
  readonly averageSeconds = input(0);
  /** Top project names, aligned with `ActivityDay.projectSeconds` (which adds "Other"). */
  readonly projects = input<string[]>([]);
  readonly mode = input<ActivityChartMode>('total');

  protected readonly legend = computed(() => [
    ...this.projects().map((name, i) => ({ name, color: PROJECT_COLORS[i] })),
    { name: 'Other', color: OTHER_PROJECT_COLOR },
  ]);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart<'bar' | 'line'> | null = null;

  constructor() {
    afterNextRender(() => {
      this.createChart();
    });

    effect(() => {
      this.data();
      this.averageSeconds();
      this.projects();
      this.mode();
      if (this.chart) {
        this.chart.data.labels = this.labels();
        this.chart.data.datasets = this.datasets();
        this.chart.update('none');
      }
    });
  }

  protected format(seconds: number): string {
    return formatSeconds(seconds);
  }

  private createChart(): void {
    const ctx = this.canvasRef().nativeElement.getContext('2d');
    if (!ctx) {
      return;
    }

    registerCharts();

    const isLatest = (index: number) => index === this.data().length - 1;

    const config: ChartConfiguration<'bar' | 'line'> = {
      type: 'bar',
      data: { labels: this.labels(), datasets: this.datasets() },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 8, right: 4, left: 4, bottom: 0 } },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            filter: (item) => item.dataset.stack === 'bars' && (item.parsed.y ?? 0) > 0,
            callbacks: {
              title: (items) => {
                const day = this.data()[items[0]?.dataIndex ?? 0];
                return day ? `${day.label} ${day.date} · ${day.time}` : '';
              },
              label: (item) => {
                const day = this.data()[item.dataIndex];
                if (!day) return '';
                if (this.mode() === 'total') return day.time;
                const name = this.legend()[item.datasetIndex]?.name ?? '';
                return `${name} ${formatSeconds(day.projectSeconds[item.datasetIndex] ?? 0)}`;
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: (c) => (isLatest(c.index) ? LATEST_TICK_COLOR : TICK_COLOR),
              font: (c) => ({ size: 11, weight: isLatest(c.index) ? 700 : 500 }),
            },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            border: { display: false },
            ticks: {
              color: TICK_COLOR,
              font: { size: 11 },
              maxTicksLimit: 4,
              callback: (value) => {
                const n = Number(value);
                if (n >= 60) {
                  return `${(n / 60).toFixed(n % 60 === 0 ? 0 : 1)}h`;
                }
                return `${n}m`;
              },
            },
          },
        },
      },
    };

    // Lazy import avoids pulling Chart into server/test bundles unnecessarily.
    import('chart.js').then(({ Chart }) => {
      registerCharts();
      this.chart = new Chart(ctx, config);
    });
  }

  private labels(): string[] {
    return this.data().map((d) => d.label);
  }

  private datasets(): ChartDataset<'bar' | 'line'>[] {
    const days = this.data();
    const bars: ChartDataset<'bar' | 'line'>[] =
      this.mode() === 'projects'
        ? this.legend().map((item, i) => ({
            type: 'bar',
            label: item.name,
            stack: 'bars',
            data: days.map((d) => toMinutes(d.projectSeconds[i] ?? 0)),
            backgroundColor: item.color,
            borderColor: SEGMENT_GAP_COLOR,
            borderWidth: { top: 2 },
            borderSkipped: false,
            borderRadius: 3,
            maxBarThickness: 36,
          }))
        : [
            {
              type: 'bar',
              label: 'Coding time',
              stack: 'bars',
              data: days.map((d) => toMinutes(d.totalSeconds)),
              backgroundColor: days.map((_, i) =>
                i === days.length - 1 ? LATEST_DAY_COLOR : PAST_DAY_COLOR,
              ),
              borderRadius: 6,
              borderSkipped: false,
              maxBarThickness: 36,
            },
          ];

    const average = this.averageSeconds();
    const averageLine: ChartDataset<'bar' | 'line'> = {
      type: 'line',
      label: 'Daily average',
      stack: 'average',
      data: days.map(() => (average > 0 ? toMinutes(average) : null)),
      borderColor: AVERAGE_LINE_COLOR,
      borderWidth: 1,
      borderDash: [4, 4],
      pointRadius: 0,
      pointHoverRadius: 0,
    };

    return [...bars, averageLine];
  }
}

function toMinutes(seconds: number): number {
  return Math.round((seconds / 60) * 10) / 10;
}

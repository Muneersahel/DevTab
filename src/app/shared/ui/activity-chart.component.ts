import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  effect,
  input,
  viewChild,
} from '@angular/core';
import type { Chart, ChartConfiguration, ScriptableContext } from 'chart.js';
import { ActivityDay } from '../../core/models/dashboard.model';
import { registerCharts } from './chart-registry';

const PAST_DAY_COLOR = 'rgba(52, 211, 153, 0.32)';
const AVERAGE_LINE_COLOR = 'rgba(244, 244, 245, 0.45)';

/**
 * Daily coding bars. The latest day (today, when the data is fresh) is drawn
 * in full emerald, and a dashed line marks the daily average.
 */
@Component({
  selector: 'dt-activity-chart',
  host: {
    class: 'block min-h-0 h-full w-full',
  },
  template: `
    <div class="relative h-full min-h-0 w-full">
      <canvas #canvas aria-hidden="true"></canvas>
    </div>
    <ul class="sr-only" aria-label="Coding time per day">
      @for (day of data(); track day.date) {
        <li>{{ day.label }} {{ day.date }}: {{ day.time }}</li>
      }
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityChartComponent {
  readonly data = input.required<ActivityDay[]>();
  /** Daily average in seconds; the average line is hidden when 0. */
  readonly averageSeconds = input(0);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart<'bar' | 'line'> | null = null;

  constructor() {
    afterNextRender(() => {
      this.createChart();
    });

    effect(() => {
      this.data();
      this.averageSeconds();
      if (this.chart) {
        this.updateChart();
      }
    });
  }

  private createChart(): void {
    const canvas = this.canvasRef().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    registerCharts();

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight || 220);
    gradient.addColorStop(0, 'rgba(52, 211, 153, 0.95)');
    gradient.addColorStop(1, 'rgba(52, 211, 153, 0.45)');

    const config: ChartConfiguration<'bar' | 'line'> = {
      type: 'bar',
      data: {
        labels: this.labels(),
        datasets: [
          {
            type: 'bar',
            label: 'Coding time',
            data: this.minutes(),
            backgroundColor: (context: ScriptableContext<'bar'>) =>
              context.dataIndex === this.data().length - 1 ? gradient : PAST_DAY_COLOR,
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 36,
          },
          {
            type: 'line',
            label: 'Daily average',
            data: this.averageLine(),
            borderColor: AVERAGE_LINE_COLOR,
            borderWidth: 1,
            borderDash: [4, 4],
            pointRadius: 0,
            pointHoverRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 8, right: 4, left: 4, bottom: 0 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            filter: (item) => item.datasetIndex === 0,
            callbacks: {
              label: (ctx) => {
                const day = this.data()[ctx.dataIndex];
                return day ? day.time : `${ctx.parsed.y}m`;
              },
              title: (items) => {
                const day = this.data()[items[0]?.dataIndex ?? 0];
                return day?.date ?? '';
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: 'rgba(161, 161, 170, 0.9)', font: { size: 11, weight: 500 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            border: { display: false },
            ticks: {
              color: 'rgba(161, 161, 170, 0.9)',
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

  private updateChart(): void {
    if (!this.chart) {
      return;
    }
    this.chart.data.labels = this.labels();
    this.chart.data.datasets[0].data = this.minutes();
    this.chart.data.datasets[1].data = this.averageLine();
    this.chart.update('none');
  }

  private labels(): string[] {
    return this.data().map((d) => d.label);
  }

  private minutes(): number[] {
    return this.data().map((d) => Math.round((d.totalSeconds / 60) * 10) / 10);
  }

  private averageLine(): (number | null)[] {
    const average = this.averageSeconds();
    const value = average > 0 ? Math.round((average / 60) * 10) / 10 : null;
    return this.data().map(() => value);
  }
}

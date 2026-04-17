import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  effect,
  input,
  viewChild,
} from '@angular/core';
import type { Chart, ChartConfiguration } from 'chart.js';
import { ActivityDay } from '../../core/models/dashboard.model';
import { registerCharts } from './chart-registry';

@Component({
  selector: 'dt-activity-chart',
  template: `
    <div class="relative h-full w-full">
      <canvas #canvas aria-hidden="true"></canvas>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityChartComponent {
  readonly data = input.required<ActivityDay[]>();

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart | null = null;

  constructor() {
    afterNextRender(() => {
      this.createChart();
    });

    effect(() => {
      this.data();
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
    gradient.addColorStop(1, 'rgba(52, 211, 153, 0.25)');

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: this.data().map((d) => d.label),
        datasets: [
          {
            label: 'Coding time',
            data: this.data().map((d) => Math.round((d.totalSeconds / 60) * 10) / 10),
            backgroundColor: gradient,
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 36,
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
              color: 'rgba(113, 113, 122, 0.9)',
              font: { size: 10 },
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
    const days = this.data();
    this.chart.data.labels = days.map((d) => d.label);
    this.chart.data.datasets[0].data = days.map((d) => Math.round((d.totalSeconds / 60) * 10) / 10);
    this.chart.update('none');
  }
}

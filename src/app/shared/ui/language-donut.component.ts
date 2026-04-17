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
import { UsageItem } from '../../core/models/dashboard.model';
import { CHART_PALETTE, registerCharts } from './chart-registry';

@Component({
  selector: 'dt-language-donut',
  template: `
    <div class="relative h-full w-full">
      <canvas #canvas aria-hidden="true"></canvas>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageDonutComponent {
  readonly data = input.required<UsageItem[]>();

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart | null = null;

  constructor() {
    afterNextRender(() => this.createChart());

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

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: this.data().map((d) => d.name),
        datasets: [
          {
            data: this.data().map((d) => d.percent),
            backgroundColor: this.data().map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]),
            borderColor: 'rgba(9, 9, 11, 1)',
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const item = this.data()[ctx.dataIndex];
                return item ? `${item.name} · ${item.time} (${item.percent.toFixed(1)}%)` : '';
              },
            },
          },
        },
      },
    };

    import('chart.js').then(({ Chart }) => {
      registerCharts();
      this.chart = new Chart(ctx, config);
    });
  }

  private updateChart(): void {
    if (!this.chart) {
      return;
    }
    const items = this.data();
    this.chart.data.labels = items.map((d) => d.name);
    this.chart.data.datasets[0].data = items.map((d) => d.percent);
    this.chart.data.datasets[0].backgroundColor = items.map(
      (_, i) => CHART_PALETTE[i % CHART_PALETTE.length],
    );
    this.chart.update('none');
  }
}

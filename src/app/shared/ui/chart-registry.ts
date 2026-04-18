import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

let registered = false;

export function registerCharts(): void {
  if (registered) {
    return;
  }

  Chart.register(
    BarController,
    BarElement,
    LineController,
    LineElement,
    PointElement,
    DoughnutController,
    ArcElement,
    CategoryScale,
    LinearScale,
    Filler,
    Tooltip,
  );

  Chart.defaults.font.family =
    "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.color = 'rgba(228, 228, 231, 0.72)';
  Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.04)';
  // Mutate the existing defaults instead of replacing the object — Chart.js
  // walks internal `_fallback` fields on this scope to resolve per-property
  // animation configs (e.g. doughnut's `numbers`). Reassigning the whole
  // object strips those, which causes `Animator.tick` to crash with
  // "this._fn is not a function" when an animation can't resolve its easing.
  const animationDefaults = Chart.defaults.animation as { duration: number; easing: string };
  animationDefaults.duration = 420;
  animationDefaults.easing = 'easeOutQuart';
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(9, 9, 11, 0.96)';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.08)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.plugins.tooltip.titleColor = 'rgba(244, 244, 245, 0.95)';
  Chart.defaults.plugins.tooltip.bodyColor = 'rgba(228, 228, 231, 0.85)';
  Chart.defaults.plugins.tooltip.displayColors = false;

  registered = true;
}

export const CHART_PALETTE = [
  '#34d399',
  '#60a5fa',
  '#c084fc',
  '#f59e0b',
  '#f472b6',
  '#22d3ee',
  '#a3e635',
  '#fb7185',
] as const;

export function paletteFor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}

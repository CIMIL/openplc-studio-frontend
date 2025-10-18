import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../shared/services/theme.service';
import { AnalysisService } from '../analysis.service';
import { ChartData, ChartOptions } from 'chart.js';
import { DARK_COLORS, LIGHT_COLORS } from '../utils';
import { SkeletonModule } from 'primeng/skeleton';
import { ChartModule } from 'primeng/chart';
import { tap } from 'rxjs';

const TD_METRICS = ['MSECalculator', 'MAECalculator'];

@Component({
  selector: 'plc-metrics',
  imports: [CommonModule, FormsModule, SkeletonModule, ChartModule],
  templateUrl: './metrics.component.html',
  //   styleUrls: ['./metrics.component.scss'],
})
export class MetricsComponent {
  public chartsReady: boolean = false;

  public chartData: any[] = [];

  public chartOptions: any[] = [];

  public chartTypes: Array<'line' | 'bar'> = [];

  constructor(
    public readonly analysisService: AnalysisService,
    private readonly themeService: ThemeService,
  ) {}

  public ngOnInit() {
    this.analysisService.metrics
      .asObservable()
      .pipe(
        tap((metrics: any[]) => {
          console.log(metrics);

          metrics.forEach((metric) => {
            const { data, options, type } = this.buildChart(metric);
            this.chartData.push(data);
            this.chartOptions.push(options);
            this.chartTypes.push(type);
          });
          this.chartsReady = true;
        }),
      )
      .subscribe();
  }

  private buildChart(metric: any): any {
    const metricModule = metric.name.split('-')[0];

    if (TD_METRICS.includes(metricModule)) {
      return this.initTDChart(metric);
      // } else if (FD_METRICS.includes(metricModule)) {
      //   this.initFDChart(metric);
    } else if (metricModule === 'PEAQCalculator') {
      return this.initPEAQChart(metric);
    }
  }

  private initTDChart(metric: any): any {
    const colorPalette = this.themeService.isDarkMode.value ? DARK_COLORS : LIGHT_COLORS;
    const data: ChartData = {
      labels: Array.from({ length: metric.json[0].length }, (_, i) => i.toString()),
      datasets: metric.json.map((c: any, i: number) => ({
        label: ['Left', 'Right'][i % 2],
        data: c,
        tension: 0.25,
        borderColor: colorPalette[i % colorPalette.length],
        backgroundColor: `${colorPalette[i % colorPalette.length]}26`,
        pointRadius: 2,
        fill: true,
      })),
    };

    const options: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: { ticks: { autoSkip: true, maxTicksLimit: 8 } },
        y: { beginAtZero: true },
      },
      plugins: {
        legend: { display: true },
        tooltip: { intersect: false, mode: 'index' as const },
      },
    };
    return { data, options, type: 'line' as const };
  }

  private initFDChart(metric: any): void {
    console.log('FD', metric);
  }

  private initPEAQChart(metric: any): any {
    const data = { labels: ['DI', 'ODG'], datasets: [{ data: metric.json }] };
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: { ticks: { autoSkip: true, maxTicksLimit: 8 } },
        y: {
          beginAtZero: true,
          min: -4, // Clip at -4 on the y axis
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: { intersect: false, mode: 'index' as const },
      },
    };
    return { data, options, type: 'bar' as const };
  }
}

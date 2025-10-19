import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../shared/services/theme.service';
import { AnalysisService, MetricRaw } from '../analysis.service';
import { Chart, ChartData, ChartOptions } from 'chart.js';
import { DARK_COLORS, LIGHT_COLORS } from '../utils';
import { SkeletonModule } from 'primeng/skeleton';
import { ChartModule } from 'primeng/chart';
import { debounceTime, filter, map, of, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { SelectModule } from 'primeng/select';

const TD_METRICS = ['MSECalculator', 'MAECalculator'];

@Component({
  selector: 'plc-metrics',
  imports: [CommonModule, FormsModule, SkeletonModule, ChartModule],
  templateUrl: './metrics.component.html',
  //   styleUrls: ['./metrics.component.scss'],
})
export class MetricsComponent {
  public chartsReady: boolean = false;

  public chartData: ChartData[] = [];

  public chartOptions: ChartOptions[] = [];

  public chartTypes: Array<'line' | 'bar'> = [];

  private destroy$ = new Subject<void>();

  @ViewChild('chartContainer', { static: false })
  public chartContainer!: ElementRef;

  constructor(
    public readonly analysisService: AnalysisService,
    private readonly themeService: ThemeService,
  ) {}

  public ngOnInit() {
    this.themeService.isDarkMode.asObservable().pipe(takeUntil(this.destroy$)).subscribe();

    this.analysisService.wsZoomBounds
      .asObservable()
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        tap((bounds) => {
          const chartElements = this.chartContainer?.nativeElement?.querySelectorAll('canvas');
          chartElements?.forEach((canvas: HTMLCanvasElement, index: number) => {
            const chart = Chart.getChart(canvas);

            const windowLength = this.analysisService.outputAnalyserParameters[index]['N'];
            const hopSize = this.analysisService.outputAnalyserParameters[index]['hop'] ?? windowLength / 2;

            const [leftBound, rightBound] = bounds.map((b) =>
              Math.round((b * this.analysisService.selectedTrackPlaybackSampleRate.value - windowLength) / hopSize + 1),
            );

            if (chart && chart.options?.scales?.['x']) {
              chart.options.scales['x'].min = leftBound;
              chart.options.scales['x'].max = rightBound;
              chart.update('none');
            }
          });
        }),
      )
      .subscribe();

    this.analysisService.selectedTrackPlayback
      .asObservable()
      .pipe(
        takeUntil(this.destroy$),
        filter((track): track is { name: string } => !!track && !!track.name),
        switchMap((track: { name: string }) =>
          of(this.analysisService.playbaleTrackToMetricsMap.value[track.name.split('.')[0]]),
        ),
        filter((metrics: MetricRaw[]) => Array.isArray(metrics) && metrics.length > 0),
        tap((metrics: MetricRaw[]) => this.destroyCharts()),
        tap((metrics: MetricRaw[]) => {
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

  private buildChart(metric: MetricRaw): any {
    const metricModule = metric.name.split('/').pop()!.split('-')[0];

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

    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--p-text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--p-text-muted-color');
    const surfaceBorder = documentStyle.getPropertyValue('--p-content-border-color');

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
        x: { ticks: { autoSkip: true, maxTicksLimit: 8, color: textColorSecondary }, grid: { color: surfaceBorder } },
        y: { beginAtZero: true, ticks: { color: textColorSecondary }, grid: { color: surfaceBorder } },
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: textColor,
          },
        },
        zoom: {
          zoom: { mode: 'x', wheel: { enabled: true } },
        },
        tooltip: { intersect: false, mode: 'index' as const },
      },
    };
    return { data, options, type: 'line' as const };
  }

  private initFDChart(metric: any): void {
    console.log('FD', metric);
  }

  private initPEAQChart(metric: any): any {
    const colorPalette = this.themeService.isDarkMode.value ? DARK_COLORS : LIGHT_COLORS;

    const documentStyle = getComputedStyle(document.documentElement);
    const textColorSecondary = documentStyle.getPropertyValue('--p-text-muted-color');
    const surfaceBorder = documentStyle.getPropertyValue('--p-content-border-color');

    const data: ChartData = {
      labels: ['DI', 'ODG'],
      datasets: [
        {
          data: metric.json,
          tension: 0.25,
          borderColor: [colorPalette[0], colorPalette[1]],
          backgroundColor: [`${colorPalette[0]}26`, `${colorPalette[1]}26`],
          borderWidth: 1,
          fill: true,
        },
      ],
    };
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: { ticks: { autoSkip: true, maxTicksLimit: 8, color: textColorSecondary }, grid: { color: surfaceBorder } },
        y: {
          beginAtZero: true,
          min: -4, // Clip at -4 on the y axis
          ticks: { color: textColorSecondary },
          grid: { color: surfaceBorder },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: { intersect: false, mode: 'index' as const },
      },
    };
    return { data, options, type: 'bar' as const };
  }

  public destroyCharts(): void {
    this.chartData = [];
    this.chartOptions = [];
    this.chartTypes = [];
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

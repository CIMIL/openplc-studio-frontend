import { Component, ElementRef, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { WavesurferWrapperComponent } from './wavesurfer-wrapper/wavesurfer-wrapper.component';
import { RunsClient } from '../shared/clients/runs.client';
import { debounce, debounceTime, from, of, switchMap, take, tap } from 'rxjs';
import { FileDescription, parseTar } from 'tarparser';
import { AnalysisService } from '../shared/services/analysis.service';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { CascadeSelectModule } from 'primeng/cascadeselect';
import { ActivatedRoute } from '@angular/router';
import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';
import { BaseIcon } from 'primeng/icons/baseicon';

Chart.register(zoomPlugin);

const TD_METRICS = ['MSECalculator', 'MAECalculator'];
const FD_METRICS = ['SpectralEnergyCalculator', 'PerceptualCalculator'];
// const SCALAR_METRICS = ['PEAQCalculator', 'WindowedPEAQCalculator'];
const SCALAR_METRICS = ['PEAQCalculator'];

const colors = ['#3b82f6', '#a7ef6e'];

@Component({
  selector: 'plc-analyser',
  imports: [
    WavesurferWrapperComponent,
    DropdownModule,
    FormsModule,
    CascadeSelectModule,
    CommonModule,
    SkeletonModule,
    BaseIcon,
  ],
  templateUrl: './analyser.component.html',
})
export class AnalyserComponent {
  public runId?: string;

  public originalTracks: FileDescription[] = [];

  public trackGroups: { originalTrack: string; reconstructedTracks: { name: string }[] }[] = [];

  public trackMaps: Record<string, Uint8Array> = {};

  public reconstructedTracks: FileDescription[] = [];

  public selectedTrack?: { name: string } | null = null;

  public metrics: any = [];

  @ViewChildren('analysisCharts')
  private chartRefs?: QueryList<ElementRef<HTMLCanvasElement>>;

  public charts: Chart[] = [];

  constructor(
    private readonly runsClient: RunsClient,
    public readonly analysisService: AnalysisService,
    private readonly route: ActivatedRoute
  ) {}

  public ngOnInit(): void {
    const runId = this.route.snapshot.paramMap.get('id') || '';

    this.runsClient
      .getRunAssets(runId, 0)
      .pipe(
        take(1),
        switchMap((buf: ArrayBuffer) => from(parseTar(buf))),
        switchMap((files: FileDescription[]) => of(files.filter((f) => f.name !== '././@PaxHeader'))),
        tap((files: FileDescription[]) => {
          this.originalTracks = files;
          this.originalTracks.forEach((t) => (this.trackMaps[t.name] = t.data));

          // load default track
          if (files[0]) {
            this.onTrackChange(files[0]);
          } else {
            this.analysisService.setAudioBlob(null);
          }
        }),
        tap(() => this.loadReconstructedTracks(runId))
      )
      .subscribe();

    this.runsClient
      .getRunAssets(runId, 3)
      .pipe(
        take(1),
        switchMap((buf: ArrayBuffer) => from(parseTar(buf))),
        switchMap((files: FileDescription[]) => of(files.filter((f) => f.name !== '././@PaxHeader'))),
        tap((files: FileDescription[]) => {
          const parsedFiles = files.map((file) => {
            let json = null;
            try {
              const decoder = new TextDecoder('utf-8');
              const text = decoder.decode(file.data);
              json = JSON.parse(text);
            } catch (e) {
              console.error('Failed to parse file as JSON:', file.name, e);
            }
            return { ...file, json };
          });
          this.metrics = parsedFiles.map(({ data, text, ...rest }) => rest);
        }),
        tap(() => this.ngAfterViewInit())
      )
      .subscribe();
  }

  private loadReconstructedTracks(runId: string): void {
    this.runsClient
      .getRunAssets(runId, 2)
      .pipe(
        take(1),
        switchMap((buf: ArrayBuffer) => from(parseTar(buf))),
        switchMap((files: FileDescription[]) => of(files.filter((f) => f.name !== '././@PaxHeader'))),
        tap((files: FileDescription[]) => {
          this.reconstructedTracks = files;
          this.reconstructedTracks.forEach((t) => (this.trackMaps[t.name] = t.data));

          const tracks = this.originalTracks.reduce((acc, { name }) => {
            acc[name.split('.')[0]] = { reconstructedTracks: [{ name }] };
            return acc;
          }, {} as Record<string, { reconstructedTracks: { name: string }[] }>);

          this.reconstructedTracks.forEach((t: FileDescription) => {
            const originalTrackStem = t.name.split('/')[0];
            if (Object.keys(tracks).includes(originalTrackStem)) {
              tracks[originalTrackStem].reconstructedTracks.push({ name: t.name });
            }
          });

          this.trackGroups = Object.keys(tracks).map((key) => ({
            originalTrack: key,
            reconstructedTracks: tracks[key].reconstructedTracks,
          }));
        })
      )
      .subscribe();
  }

  public onTrackChange(track: { name: string } | null): void {
    if (!track || !track.name) {
      return;
    }
    const audioBuffer = new Uint8Array(this.trackMaps[track.name]);
    const blob = new Blob([audioBuffer], { type: 'audio/wave' });
    this.analysisService.setAudioBlob(blob);
  }

  ngAfterViewInit(): void {
    this.chartRefs?.changes.subscribe((refs: QueryList<ElementRef<HTMLCanvasElement>>) => {
      const refsArray = refs.toArray();
      if (!refsArray.length) {
        return;
      }

      refsArray.forEach((chartRef: ElementRef<HTMLCanvasElement>, i: number) => {
        const metric = this.metrics[i];
        this.initChart(chartRef, metric);
      });
    });
  }

  private initChart(chartRef: ElementRef<HTMLCanvasElement>, metric: any): void {
    if (!chartRef) return;

    const metricModule = metric.name.split('-')[0];

    if (TD_METRICS.includes(metricModule)) {
      this.initTDChart(chartRef, metric);
      // } else if (FD_METRICS.includes(metricModule)) {
      //   this.initFDChart(chartRef, metric);
    } else if (SCALAR_METRICS.includes(metricModule)) {
      this.initScalarChart(chartRef, metric);
    }
  }

  private initTDChart(chartRef: ElementRef<HTMLCanvasElement>, metric: any): void {
    this.charts.push(
      new Chart(chartRef.nativeElement, {
        type: 'line',
        data: {
          labels: Array.from({ length: metric.json[0].length }, (_, i) => i.toString()),
          datasets: metric.json.map((c: any, i: number) => ({
            label: ['Left', 'Right'][i % 2],
            data: c,
            tension: 0.25,
            borderColor: colors[i % colors.length],
            backgroundColor: `${colors[i % colors.length]}26`,
            pointRadius: 2,
            fill: true,
          })),
        },
        options: {
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
            zoom: {
              zoom: {
                wheel: { enabled: true },
                pinch: { enabled: true },
                mode: 'x',
              },
              // pan: {
              //   enabled: true,
              //   mode: 'x',
              //   modifierKey: 'shift',
              // },
            },
          },
        },
      })
    );
  }

  private initFDChart(chartRef: ElementRef<HTMLCanvasElement>, metric: any): void {
    console.log('FD', metric);
  }

  private initScalarChart(chartRef: ElementRef<HTMLCanvasElement>, metric: any): void {
    this.charts.push(
      new Chart(chartRef.nativeElement, {
        type: 'bar',
        data: { labels: ['Left', 'Right'], datasets: [{ data: metric.json }] },
        options: {
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
        },
      })
    );
  }
}

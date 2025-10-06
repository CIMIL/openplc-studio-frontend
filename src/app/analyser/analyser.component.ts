import { Component, ElementRef, ViewChild } from '@angular/core';
import { WavesurferWrapperComponent } from './wavesurfer-wrapper/wavesurfer-wrapper.component';
import { RunsClient } from '../shared/clients/runs.client';
import { from, of, switchMap, take, tap } from 'rxjs';
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

Chart.register(zoomPlugin);

const TD_METRICS = ['MSECalculator', 'MAECalculator'];
const FD_METRICS = ['SpectralEnergyCalculator', 'PerceptualCalculator'];
const SCALAR_METRICS = ['PEAQCalculator', 'WindowedPEAQCalculator'];

@Component({
  selector: 'plc-analyser',
  imports: [WavesurferWrapperComponent, DropdownModule, FormsModule, CascadeSelectModule, CommonModule, SkeletonModule],
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

  @ViewChild('analysisChart', { static: false })
  private chartRef?: ElementRef<HTMLCanvasElement>;

  private chart?: Chart;

  constructor(
    private readonly runsClient: RunsClient,
    private readonly analysisService: AnalysisService,
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
          this.originalTracks.forEach((t) => (this.trackMaps[t.name] = t.data));
          this.originalTracks = files;

          // load default track
          if (files[0]) {
            this.onTrackChange(files[0]);
          } else {
            this.analysisService.setAudioBlob(null);
          }
        })
      )
      .subscribe();

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
        tap(() => this.initChart())
      )
      .subscribe();
  }

  private initChart(): void {
    if (!this.chartRef) return;
    if (this.chart) {
      this.chart.destroy();
    }

    const channelLabels = ['Left', 'Right'];
    const colors = ['#3b82f6', '#a7ef6e'];
    const labels = Array.from({ length: this.metrics[0].json[0].length }, (_, i) => i.toString());

    console.log(this.metrics);

    // this.chart = new Chart(this.chartRef.nativeElement, {
    //   type: 'bar',
    //   data: { labels: channelLabels, datasets: [{ data: this.metrics[0].json }] },
    //   options: {
    //     responsive: true,
    //     maintainAspectRatio: false,
    //     animation: false,
    //     scales: {
    //       x: { ticks: { autoSkip: true, maxTicksLimit: 8 } },
    //       y: {
    //         beginAtZero: true,
    //         min: -4, // Clip at -4 on the y axis
    //       },
    //     },
    //     plugins: {
    //       legend: { display: false },
    //       tooltip: { intersect: false, mode: 'index' as const },
    //     },
    //   },
    // });

    this.chart = new Chart(this.chartRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: this.metrics[1].json.map((c: any, i: number) => ({
          label: channelLabels[i % channelLabels.length],
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
    });
  }

  public onTrackChange(track: { name: string } | null): void {
    if (!track || !track.name) {
      this.analysisService.setAudioBlob(null);
      return;
    }
    const audioBuffer = new Uint8Array(this.trackMaps[track.name]);
    const blob = new Blob([audioBuffer], { type: 'audio/wave' });
    this.analysisService.setAudioBlob(blob);
  }
}

import { Component } from '@angular/core';
import { WavesurferWrapperComponent } from './wavesurfer-wrapper/wavesurfer-wrapper.component';
import { RunsClient } from '../shared/clients/runs.client';
import { combineLatest, filter, from, map, of, ReplaySubject, Subject, switchMap, take, takeUntil, tap } from 'rxjs';
import { FileDescription, parseTar } from 'tarparser';
import { AnalysisService, FileDescriptionWithJson } from './analysis.service';
import { FormsModule } from '@angular/forms';
import { CascadeSelectModule } from 'primeng/cascadeselect';
import { ActivatedRoute } from '@angular/router';
import Chart, { ChartData, ChartOptions } from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';
import { ChartModule } from 'primeng/chart';
import { ModuleType } from '../shared/enums/module-type.enum';
import { Module } from '../shared/interfaces/module.interface';
import { ModuleParameter } from '../shared/interfaces/module-parameters.interface';
import { extractSampleRateFromWavHeader } from './wavUtils';
import { DARK_COLORS, decodeJson, LIGHT_COLORS } from './utils';
import { ZoomLensComponent } from './zoom-lens/zoom-lens.component';
import { ThemeService } from '../shared/services/theme.service';

Chart.register(zoomPlugin);

const TD_METRICS = ['MSECalculator', 'MAECalculator'];

@Component({
  selector: 'plc-analyser',
  imports: [
    WavesurferWrapperComponent,
    ZoomLensComponent,
    FormsModule,
    CascadeSelectModule,
    CommonModule,
    SkeletonModule,
    ChartModule,
  ],
  templateUrl: './analyser.component.html',
})
export class AnalyserComponent {
  public runId?: string;

  public originalTracks: FileDescription[] = [];

  public reconstructedTracks: FileDescription[] = [];

  public sampleMask: FileDescriptionWithJson[] = [];

  // START METRICS SECTION
  public metrics: any[] = [];

  public chartsReady: boolean = false;

  public chartData: any[] = [];

  public chartOptions: any[] = [];

  public chartTypes: Array<'line' | 'bar'> = [];
  // END METRICS SECTION

  public runFetchDone = new ReplaySubject<void>();

  public originalTracksFetchDone = new ReplaySubject<void>();

  private destroy$ = new Subject<void>();

  constructor(
    private readonly runsClient: RunsClient,
    public readonly analysisService: AnalysisService,
    private readonly themeService: ThemeService,
    private readonly route: ActivatedRoute,
  ) {}

  get sampleMaskPacketSizes(): any[] {
    return (
      this.analysisService.run.value?.modules[ModuleType.PacketLossSimulator].map(
        (m: Module) => m.settings.filter((mp: ModuleParameter) => mp.name === 'packet_size')[0].value,
      ) ?? []
    );
  }

  public ngOnInit(): void {
    const runId = this.route.snapshot.paramMap.get('id') || '';

    this.runsClient
      .getRun(runId)
      .pipe(
        tap((run) => this.analysisService.run.next(run)),
        tap(() => this.runFetchDone.next()),
      )
      .subscribe();

    // FETCH ORIGINAL TRACKS
    this.runsClient
      .getRunAssets(runId, 0)
      .pipe(
        take(1),
        switchMap((buf: ArrayBuffer) => from(parseTar(buf))),
        switchMap((files: FileDescription[]) => of(files.filter((f) => f.name !== '././@PaxHeader'))),
        tap((files: FileDescription[]) => {
          this.originalTracks = files;
          this.originalTracks.forEach((t) => {
            const currentMaps = this.analysisService.trackMaps.value;
            this.analysisService.trackMaps.next({ ...currentMaps, [t.name]: t.data });
          });

          this.analysisService.originalTrackSampleRates.next(
            this.originalTracks.map((t) => extractSampleRateFromWavHeader(t.data)),
          );
          // load default track
          if (files[0]) {
            this.analysisService.selectedTrackPlaybackSampleRate.next(extractSampleRateFromWavHeader(files[0].data));
            this.analysisService.selectedTrackPlayback.next({ name: files[0].name });
          } else {
            this.analysisService.setAudioBlob(null);
          }
        }),
        tap(() => this.originalTracksFetchDone.next()),
      )
      .subscribe();

    // FETCH SAMPLE MASKS
    combineLatest([
      this.runsClient.getRunAssets(runId, 1).pipe(
        take(1),
        switchMap((buf) => from(parseTar(buf))),
        switchMap((files: FileDescription[]) => of(files.filter((f) => f.name !== '././@PaxHeader'))),
        map((files: FileDescription[]) => files.map(decodeJson)),
      ),
      this.originalTracksFetchDone.asObservable(),
    ])
      .pipe(
        map(([files, blank]: [FileDescriptionWithJson[], any]) =>
          files.map(({ json, ...rest }, index: number) => ({
            json: json.filter(
              (value: any) =>
                value % this.sampleMaskPacketSizes[index % (this.analysisService.run.value?.tracks.length ?? 0)] === 0,
            ),
            ...rest,
          })),
        ),
        tap((files: FileDescriptionWithJson[]) => (this.sampleMask = files)),
        tap((files: FileDescriptionWithJson[]) => {
          const sampleMaskMaps: Record<string, number[]> = {};
          files.forEach((m: FileDescriptionWithJson) => {
            sampleMaskMaps[m.name.split('.')[0]] = m.json;
          });
          this.analysisService.sampleMaskMaps.next(sampleMaskMaps);
        }),
        tap(() => console.log()),
        tap(() => {
          const leftBoundsArr: number[][] = [];
          const rightBoundsArr: number[][] = [];

          this.sampleMask.forEach((maskPacket, i) => {
            const json = maskPacket?.json;
            const packetSize = this.sampleMaskPacketSizes[i];
            const [left, right] = this.analysisService.calculatePacketBurstBounds(json, packetSize);
            leftBoundsArr.push(left);
            rightBoundsArr.push(right);
          });

          this.analysisService.packetBurstsLeftBounds.next(leftBoundsArr);
          this.analysisService.packetBurstsRightBounds.next(rightBoundsArr);
        }),
      )
      .subscribe();

    // FETCH RECONSTRUCTED TRACKS
    combineLatest([
      this.runsClient.getRunAssets(runId, 2).pipe(
        take(1),
        switchMap((buf: ArrayBuffer) => from(parseTar(buf))),
        switchMap((files: FileDescription[]) => of(files.filter((f) => f.name !== '././@PaxHeader'))),
      ),
      this.originalTracksFetchDone.asObservable(),
    ])
      .pipe(
        tap(([files, blank]: [FileDescription[], any]) => {
          this.reconstructedTracks = files;
          this.reconstructedTracks.forEach((t) => {
            const currentMaps = this.analysisService.trackMaps.value;
            this.analysisService.trackMaps.next({ ...currentMaps, [t.name]: t.data });
          });

          const tracks = this.originalTracks.reduce(
            (acc, { name }) => {
              acc[name.split('.')[0]] = { reconstructedTracks: [{ name }] };
              return acc;
            },
            {} as Record<string, { reconstructedTracks: { name: string }[] }>,
          );

          this.reconstructedTracks.forEach((t: FileDescription) => {
            const originalTrackStem = t.name.split('/')[0];
            if (Object.keys(tracks).includes(originalTrackStem)) {
              tracks[originalTrackStem].reconstructedTracks.push({ name: t.name });
            }
          });

          this.analysisService.trackGroups.next(
            Object.keys(tracks).map((key) => ({
              originalTrack: key,
              reconstructedTracks: tracks[key].reconstructedTracks,
            })),
          );
        }),
      )
      .subscribe();

    // FETCH METRICS
    this.runsClient
      .getRunAssets(runId, 3)
      .pipe(
        take(1),
        switchMap((buf) => from(parseTar(buf))),
        switchMap((files: FileDescription[]) => of(files.filter((f) => f.name !== '././@PaxHeader'))),
        map((files: FileDescription[]) => files.map(decodeJson)),
        tap((parsedFiles: FileDescriptionWithJson[]) => (this.metrics = parsedFiles)),
        tap(() => {
          this.metrics.forEach((metric) => {
            const { data, options, type } = this.buildChart(metric);
            this.chartData.push(data);
            this.chartOptions.push(options);
            this.chartTypes.push(type);
          });
          this.chartsReady = true;
        }),
      )
      .subscribe();

    this.analysisService.selectedTrackPlayback
      .asObservable()
      .pipe(
        takeUntil(this.destroy$),
        filter((track): track is { name: string } => !!track && !!track.name),
        tap((track) => this.onTrackChange(track)),
      )
      .subscribe();
  }

  public onTrackChange(track: { name: string } | null): void {
    if (!track || !track.name) {
      return;
    }
    const trackNameSplit = track.name.split('.')[0].split('/');
    const trackNameStem = trackNameSplit[0];
    this.analysisService.selectedOriginalTrack.next(trackNameStem);
    const audioBuffer = new Uint8Array(this.analysisService.trackMaps.value[track.name]);
    const blob = new Blob([audioBuffer], { type: 'audio/wave' });
    this.analysisService.setAudioBlob(blob);

    if (trackNameSplit.length > 1) {
      const sampleMaskName = trackNameSplit[1];
      const sampleMaskIndex = Object.keys(this.analysisService.sampleMaskMaps.value ?? {}).indexOf(sampleMaskName);
      this.analysisService.selectedSampleMaskIndex.next(sampleMaskIndex);
    }
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

  public ngOnDestroy(): void {
    this.analysisService.resetAnalyzerData();
    this.destroy$.next();
    this.destroy$.complete();
  }
}

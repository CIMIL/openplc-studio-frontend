import { Component } from '@angular/core';
import { WavesurferWrapperComponent } from './wavesurfer-wrapper/wavesurfer-wrapper.component';
import { RunsClient } from '../shared/clients/runs.client';
import { combineLatest, debounceTime, filter, from, map, of, ReplaySubject, Subject, switchMap, take, tap } from 'rxjs';
import { FileDescription, parseTar } from 'tarparser';
import { AnalysisService } from '../shared/services/analysis.service';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { CascadeSelectModule } from 'primeng/cascadeselect';
import { ActivatedRoute } from '@angular/router';
import Chart, { ChartData, ChartOptions } from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';
import { ChartModule } from 'primeng/chart';
import { ListboxModule } from 'primeng/listbox';
import { Run } from '../shared/interfaces/run.interface';
import { ModuleType } from '../shared/enums/module-type.enum';
import { Module } from '../shared/interfaces/module.interface';
import { ModuleParameter } from '../shared/interfaces/module-parameters.interface';
import { SelectModule } from 'primeng/select';
import {
  extractBitDepthFromWavHeader,
  extractChannelNumberFromWavHeader,
  extractSampleRateFromWavHeader,
  normalizePcmSegment,
  stripWavBinarySegment,
  stripWavHeader,
} from './wavUtils';
import { ToggleButtonModule } from 'primeng/togglebutton';

Chart.register(zoomPlugin);

const TD_METRICS = ['MSECalculator', 'MAECalculator'];
const FD_METRICS = ['SpectralEnergyCalculator', 'PerceptualCalculator'];
// const SCALAR_METRICS = ['PEAQCalculator', 'WindowedPEAQCalculator'];
const SCALAR_METRICS = ['PEAQCalculator'];

// Color palette from Tailwind CSS + Extra
const colors = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Emerald
  '#f59e42', // Orange
  '#a78bfa', // Violet
  '#f43f5e', // Rose
  '#eab308', // Amber
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#84cc16', // Lime
  '#d946ef', // Fuchsia
  '#38bdf8', // Sky blue
  '#f87171', // Light red
  '#34d399', // Light green
  '#facc15', // Yellow
];

type FileDescriptionWithJson = FileDescription & { json: any[] };

type TrackGroup = { originalTrack: string; reconstructedTracks: { name: string }[] };

@Component({
  selector: 'plc-analyser',
  imports: [
    WavesurferWrapperComponent,
    DropdownModule,
    FormsModule,
    CascadeSelectModule,
    CommonModule,
    SkeletonModule,
    ListboxModule,
    SelectModule,
    ChartModule,
    ToggleButtonModule,
  ],
  templateUrl: './analyser.component.html',
})
export class AnalyserComponent {
  public runId?: string;

  public run?: Run;

  public originalTracks: FileDescription[] = [];

  public trackGroups: TrackGroup[] = [];

  public trackMaps: Record<string, Uint8Array> = {};

  public reconstructedTracks: FileDescription[] = [];

  public selectedTrack?: { name: string } | null = null;

  public sampleMaskPackets: any[] = [];

  public sampleMaskSelectedChannel: boolean = false;

  public selectedOriginalTrack: string = '';

  public selectedPacket: any;

  // START METRICS SECTION
  public metrics: any[] = [];

  public chartsReady: boolean = false;

  public chartData: any[] = [];

  public chartOptions: any[] = [];

  public chartTypes: Array<'line' | 'bar'> = [];
  // END METRICS SECTION

  public zoomSegmentData?: ChartData | null = null;

  public zoomSegmentOptions?: ChartOptions | null = null;

  private normalizedSegmentsCache: any[] = [];

  private allTracksCache: string[] = [];

  public runFetchDone: Subject<void> = new ReplaySubject<void>();

  public originalTracksFetchDone: Subject<void> = new ReplaySubject<void>();

  constructor(
    private readonly runsClient: RunsClient,
    public readonly analysisService: AnalysisService,
    private readonly route: ActivatedRoute
  ) {}

  get originalTrackNames() {
    if (this.run === undefined) {
      return [];
    }
    return this.run?.tracks;
  }

  get sampleMaskPacketSizes(): any[] {
    return (
      this.run?.modules[ModuleType.PacketLossSimulator].map(
        (m: Module) => m.settings.filter((mp: ModuleParameter) => mp.name === 'packet_size')[0].value
      ) ?? []
    );
  }

  get sampleMaskNames(): { label: string; value: number }[] {
    return (
      this.run?.modules[ModuleType.PacketLossSimulator].map((m: Module, index: number) => ({
        label: m.name,
        value: index,
      })) ?? []
    );
  }

  get indexOfSelectedOriginalTrack(): number {
    return this.run?.tracks.indexOf(`${this.selectedOriginalTrack}.wav`) ?? 0;
  }

  public ngOnInit(): void {
    const runId = this.route.snapshot.paramMap.get('id') || '';

    this.runsClient
      .getRun(runId)
      .pipe(
        tap((run) => (this.run = run)),
        tap(() => this.runFetchDone.next())
      )
      .subscribe();

    this.runsClient
      .getRunAssets(runId, 0)
      .pipe(
        take(1),
        switchMap((buf: ArrayBuffer) => from(parseTar(buf))),
        switchMap((files: FileDescription[]) => of(files.filter((f) => f.name !== '././@PaxHeader'))),
        tap((files: FileDescription[]) => {
          this.originalTracks = files;
          this.originalTracks.forEach((t) => (this.trackMaps[t.name] = t.data));

          this.analysisService.originalTrackSampleRates.next(
            this.originalTracks.map((t) => extractSampleRateFromWavHeader(t.data))
          );
          // load default track
          if (files[0]) {
            this.onTrackChange(files[0]);
          } else {
            this.analysisService.setAudioBlob(null);
          }
        }),
        tap(() => this.originalTracksFetchDone.next())
      )
      .subscribe();

    // FETCH SAMPLE MASKS
    combineLatest([
      this.runsClient.getRunAssets(runId, 1).pipe(
        take(1),
        switchMap((buf) => from(parseTar(buf))),
        switchMap((files: FileDescription[]) => of(files.filter((f) => f.name !== '././@PaxHeader'))),
        map((files: FileDescription[]) => files.map(this.decodeJson))
      ),
      this.originalTracksFetchDone.asObservable(),
    ])
      .pipe(
        map(([files, blank]: [FileDescriptionWithJson[], any]) =>
          files.map(({ json, ...rest }, index: number) => ({
            json: json.filter(
              (value: any) => value % this.sampleMaskPacketSizes[index % (this.run?.tracks.length ?? 0)] === 0
            ),
            ...rest,
          }))
        ),
        tap((files: FileDescriptionWithJson[]) => (this.sampleMaskPackets = files)),
        tap(() => {
          const leftBoundsArr: number[][] = [];
          const rightBoundsArr: number[][] = [];

          this.sampleMaskPackets.forEach((maskPacket, i) => {
            const json = maskPacket?.json;
            const packetSize = this.sampleMaskPacketSizes[i];
            const [left, right] = this.analysisService.calculatePacketBurstBounds(json, packetSize);
            leftBoundsArr.push(left);
            rightBoundsArr.push(right);
          });

          this.analysisService.packetBurstsLeftBounds.next(leftBoundsArr);
          this.analysisService.packetBurstsRightBounds.next(rightBoundsArr);
        })
      )
      .subscribe();

    combineLatest([
      this.runsClient.getRunAssets(runId, 2).pipe(
        take(1),
        switchMap((buf: ArrayBuffer) => from(parseTar(buf))),
        switchMap((files: FileDescription[]) => of(files.filter((f) => f.name !== '././@PaxHeader')))
      ),
      this.originalTracksFetchDone.asObservable(),
    ])
      .pipe(
        tap(([files, blank]: [FileDescription[], any]) => {
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
        switchMap((buf) => from(parseTar(buf))),
        switchMap((files: FileDescription[]) => of(files.filter((f) => f.name !== '././@PaxHeader'))),
        map((files: FileDescription[]) => files.map(this.decodeJson)),
        tap(
          (parsedFiles: FileDescriptionWithJson[]) =>
            (this.metrics = parsedFiles.map(({ data, text, ...rest }) => rest))
        ),
        tap(() => {
          this.metrics.forEach((metric) => {
            const { data, options, type } = this.buildChart(metric);
            this.chartData.push(data);
            this.chartOptions.push(options);
            this.chartTypes.push(type);
          });
          this.chartsReady = true;
        })
      )
      .subscribe();

    this.analysisService.selectedPacketBounds
      .asObservable()
      .pipe(
        debounceTime(150),
        filter((bounds: number[]) => Array.isArray(bounds) && bounds.length === 2),
        tap(([lb, rb, ...blank]) => this.giantMess(lb, rb))
      )
      .subscribe();
  }

  public onTrackChange(track: { name: string } | null): void {
    if (!track || !track.name) {
      return;
    }
    const trackNameStem = track.name.split('.')[0].split('/')[0];
    this.selectedOriginalTrack = trackNameStem;

    const audioBuffer = new Uint8Array(this.trackMaps[track.name]);
    const blob = new Blob([audioBuffer], { type: 'audio/wave' });
    this.analysisService.setAudioBlob(blob);
  }

  private buildChart(metric: any): any {
    const metricModule = metric.name.split('-')[0];

    if (TD_METRICS.includes(metricModule)) {
      return this.initTDChart(metric);
      // } else if (FD_METRICS.includes(metricModule)) {
      //   this.initFDChart(metric);
    } else if (SCALAR_METRICS.includes(metricModule)) {
      return this.initScalarChart(metric);
    }
  }

  private initTDChart(metric: any): any {
    const data: ChartData = {
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

  private initScalarChart(metric: any): any {
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

  private decodeJson(file: FileDescription): FileDescriptionWithJson {
    let json = null;
    try {
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(file.data);
      json = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse file as JSON:', file.name, e);
    }
    return { ...file, json };
  }

  public giantMess(leftBound: number, rightBound: number) {
    const selectedOriginalTrack: string = this.selectedOriginalTrack;

    const foundTrackGroup = this.trackGroups.find((t) => t.originalTrack === selectedOriginalTrack);

    const allTracks = foundTrackGroup ? [...foundTrackGroup.reconstructedTracks.map((r) => r.name)] : [];

    const trackBinaryData = allTracks.map((t) => this.trackMaps[t]);

    const maskPacketSize = this.sampleMaskPacketSizes[this.analysisService.selectedSampleMaskIndex.value];

    const bitDepth = extractBitDepthFromWavHeader(trackBinaryData[0]);

    const channelNumber = extractChannelNumberFromWavHeader(trackBinaryData[0]);

    const segments = trackBinaryData
      .map(stripWavHeader)
      .map((data) =>
        stripWavBinarySegment(data, leftBound, rightBound, bitDepth, channelNumber, Math.min(maskPacketSize, 100))
      );

    let normalizedSegments = segments.map((seg) => normalizePcmSegment(seg, bitDepth, channelNumber));

    const maxAbsoluteValue = Math.max(
      ...normalizedSegments.flatMap((segment) => segment[0].map((value) => Math.abs(value)))
    );

    this.normalizedSegmentsCache = normalizedSegments;

    this.allTracksCache = allTracks;

    this.zoomSegmentData = {
      labels: Array.from({ length: normalizedSegments[0][0].length }, (_, i) => i.toString()),
      datasets: normalizedSegments.map((t: any, i: number) => ({
        label: allTracks.map((tn) => tn.split('/')[allTracks.length - 1] ?? tn)[i % normalizedSegments.length],
        data: t[Number(this.sampleMaskSelectedChannel)],
        tension: 0.25,
        borderColor: colors[i % colors.length],
        pointRadius: 2,
        fill: false,
      })),
    };

    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--p-text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--p-text-muted-color');
    const surfaceBorder = documentStyle.getPropertyValue('--p-content-border-color');

    this.zoomSegmentOptions = {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        x: { ticks: { autoSkip: true, maxTicksLimit: 8, color: textColorSecondary } },
        y: {
          beginAtZero: true,
          min: -maxAbsoluteValue,
          max: maxAbsoluteValue,
          ticks: { color: textColorSecondary },
          grid: { color: surfaceBorder },
        },
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: textColor,
          },
        },
        tooltip: { intersect: false, mode: 'index' as const },
      },
    };
  }

  public onChannelToggle(): void {
    this.buildZoomSegmentData();
  }

  private buildZoomSegmentData(): void {
    if (!this.normalizedSegmentsCache.length) return;

    this.zoomSegmentData = {
      labels: Array.from({ length: this.normalizedSegmentsCache[0][0].length }, (_, i) => i.toString()),
      datasets: this.normalizedSegmentsCache.map((t: any, i: number) => ({
        label: this.allTracksCache.map((tn) => tn.split('/')[this.allTracksCache.length - 1] ?? tn)[
          i % this.normalizedSegmentsCache.length
        ],
        data: t[Number(this.sampleMaskSelectedChannel)],
        tension: 0.25,
        borderColor: colors[i % colors.length],
        pointRadius: 2,
        fill: false,
      })),
    };
  }
}

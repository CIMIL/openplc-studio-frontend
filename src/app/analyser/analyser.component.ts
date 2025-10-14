import { Component, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { WavesurferWrapperComponent } from './wavesurfer-wrapper/wavesurfer-wrapper.component';
import { RunsClient } from '../shared/clients/runs.client';
import { BehaviorSubject, combineLatest, from, map, of, ReplaySubject, Subject, switchMap, take, tap } from 'rxjs';
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
import { ChartModule } from 'primeng/chart';
import { ListboxModule } from 'primeng/listbox';
import { Run } from '../shared/interfaces/run.interface';
import { ModuleType } from '../shared/enums/module-type.enum';
import { Module } from '../shared/interfaces/module.interface';
import { ModuleParameter } from '../shared/interfaces/module-parameters.interface';
import { SelectModule } from 'primeng/select';

Chart.register(zoomPlugin);

const TD_METRICS = ['MSECalculator', 'MAECalculator'];
const FD_METRICS = ['SpectralEnergyCalculator', 'PerceptualCalculator'];
// const SCALAR_METRICS = ['PEAQCalculator', 'WindowedPEAQCalculator'];
const SCALAR_METRICS = ['PEAQCalculator'];

const colors = ['#3b82f6', '#a7ef6e'];

type FileDescriptionWithJson = FileDescription & { json: any[] };

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
  ],
  templateUrl: './analyser.component.html',
})
export class AnalyserComponent {
  public runId?: string;

  public run?: Run;

  public originalTracks: FileDescription[] = [];

  public originalTrackSampleRates: number[] = [];

  public trackGroups: { originalTrack: string; reconstructedTracks: { name: string }[] }[] = [];

  public trackMaps: Record<string, Uint8Array> = {};

  public reconstructedTracks: FileDescription[] = [];

  public selectedTrack?: { name: string } | null = null;

  public sampleMasks: any[] = [];

  public selectedSampleMaskIndex: number = 0;

  public selectedOriginalTrack?: string;

  public selectedPacket: any;

  public metrics: any[] = [];

  public chartsReady = false;

  public lostPacketsfirstSampleTs: any = [];

  @ViewChildren('analysisCharts')
  private chartRefs?: QueryList<ElementRef<HTMLCanvasElement>>;

  public charts: Chart[] = [];

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

          this.originalTracks.forEach((t) => {
            const u8 = t.data as Uint8Array<ArrayBufferLike>;
            const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
            const sampleRate = dv.getUint32(24, true);
            this.originalTrackSampleRates.push(sampleRate);
          });

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
              (_: any, idx: number) => idx % this.sampleMaskPacketSizes[index % (this.run?.tracks.length ?? 0)] === 0
            ),
            ...rest,
          }))
        ),
        map((files: FileDescriptionWithJson[]) =>
          files.map(({ json, ...rest }, index) => ({
            json: json.map((v: number) => v / this.originalTrackSampleRates[index % (this.run?.tracks.length ?? 0)]),
            ...rest,
          }))
        ),
        tap((a) => console.log(a)),
        tap((files: FileDescriptionWithJson[]) => (this.sampleMasks = files))
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
          this.chartRefs?.changes.subscribe((refs: QueryList<ElementRef<HTMLCanvasElement>>) => {
            const refsArray = refs.toArray();
            if (!refsArray.length) {
              return;
            }

            refsArray.forEach((chartRef: ElementRef<HTMLCanvasElement>, i: number) => {
              if (this.charts[i]) {
                this.charts[i].destroy();
              }
              const metric = this.metrics[i];
              this.initChart(chartRef, metric);
            });
          });
          this.chartsReady = true;
        })
      )
      .subscribe();
  }

  public onTrackChange(track: { name: string } | null): void {
    if (!track || !track.name) {
      return;
    }
    const trackNameStem = track.name.split('.')[0].split('/')[0];
    this.selectedOriginalTrack = trackNameStem;

    console.log(
      this.sampleMasks[this.selectedSampleMaskIndex * this.indexOfSelectedOriginalTrack],
      this.selectedSampleMaskIndex + (this.run?.tracks.length ?? 1) * this.indexOfSelectedOriginalTrack
    );

    const audioBuffer = new Uint8Array(this.trackMaps[track.name]);
    const blob = new Blob([audioBuffer], { type: 'audio/wave' });
    this.analysisService.setAudioBlob(blob);
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
        data: { labels: ['DI', 'ODG'], datasets: [{ data: metric.json }] },
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
}

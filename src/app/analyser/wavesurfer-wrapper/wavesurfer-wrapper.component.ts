import { Component, ElementRef, Input, ViewChild, OnDestroy, ChangeDetectorRef } from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  filter,
  fromEvent,
  fromEventPattern,
  Subject,
  Subscription,
  takeUntil,
  tap,
} from 'rxjs';
import WaveSurfer from 'wavesurfer.js';
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom';
import Spectrogram from 'wavesurfer.js/dist/plugins/spectrogram';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import { CommonModule } from '@angular/common';
import { AnalysisService } from '../../shared/services/analysis.service';
import { SkeletonModule } from 'primeng/skeleton';
import SpectrogramPlugin from 'wavesurfer.js/dist/plugins/spectrogram';

@Component({
  selector: 'plc-wavesurfer-wrapper',
  imports: [CommonModule, SkeletonModule],
  templateUrl: './wavesurfer-wrapper.component.html',
  styleUrl: './wavesurfer-wrapper.component.scss',
})
export class WavesurferWrapperComponent implements OnDestroy {
  private _waveformRef?: ElementRef;

  @ViewChild('waveform')
  set waveformRef(ref: ElementRef | undefined) {
    this._waveformRef = ref;
    if (ref && this.analysisService.currentAudioBlob) {
      this.initializeWaveSurfer();
    }
  }

  get waveformRef() {
    return this._waveformRef;
  }

  public isSpectrogramReady: boolean = false;

  private _spectrogramRef?: ElementRef;

  @ViewChild('spectrogram', { static: false })
  set spectrogramRef(ref: ElementRef | undefined) {
    this._spectrogramRef = ref;
  }

  private wavesurfer!: WaveSurfer;

  private destroy$ = new Subject<void>();

  private spacebarSubscription?: Subscription;

  constructor(public readonly analysisService: AnalysisService) {}

  public ngAfterViewInit() {
    this.analysisService.audioBlob$
      .pipe(
        takeUntil(this.destroy$),
        filter((blob) => !!blob),
        tap((blob: Blob | null) => {
          if (this.wavesurfer) {
            this.destroyWavesurfer();
          }
          this.initializeWaveSurfer();
        })
      )
      .subscribe();
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.wavesurfer) {
      this.destroyWavesurfer();
    }
  }

  private initializeWaveSurfer(): void {
    if (!this.waveformRef) {
      return;
    }

    this.wavesurfer = WaveSurfer.create({
      container: this.waveformRef.nativeElement,
      backend: 'WebAudio',
      waveColor: 'violet',
      progressColor: 'purple',
      height: 500,
      barWidth: 3,
      barHeight: 1,
      barRadius: 10,
      barGap: 2,
      minPxPerSec: 50,
      sampleRate: 44100,
    });

    // define wavesurfer events

    // play with spacebar
    if (!this.spacebarSubscription) {
      this.spacebarSubscription = fromEvent<KeyboardEvent>(document, 'keydown')
        .pipe(
          filter((event) => event.code === 'Space' && !!this.wavesurfer),
          // debounceTime( 200),
          tap((event) => {
            event.preventDefault();
            this.wavesurfer.playPause();
          })
        )
        .subscribe();
    }

    const audio = this.analysisService.currentAudioBlob;

    if (audio) {
      this.wavesurfer.loadBlob(audio);
    }

    // const spectrogramPlugin: SpectrogramPlugin = this.wavesurfer.registerPlugin(
    //   Spectrogram.create({
    //     labels: true,
    //     height: 400,
    //     splitChannels: false,
    //     scale: 'mel',
    //     frequencyMax: 0,
    //     frequencyMin: 0,
    //     fftSamples: 2048,
    //   })
    // );

    // spectrogramPlugin.once('ready', () => {
    //   this.isSpectrogramReady = true;
    //   const wrapper = (spectrogramPlugin as any).wrapper as HTMLElement; // plugin's root element
    //   this.spectrogramRef?.nativeElement.appendChild(wrapper);
    // });

    this.wavesurfer.registerPlugin(
      ZoomPlugin.create({
        scale: 1,
        maxZoom: 20000,
        exponentialZooming: true,
      })
    );

    const lens: RegionsPlugin = RegionsPlugin.create();

    this.wavesurfer.registerPlugin(lens);

    // Add region click event listener
    lens.on('region-clicked', (region, event) => {
      event.stopPropagation(); // Prevent click from propagating to other elements
      console.log('Region clicked:', region);
      this.onRegionClick(region);
    });

    const decodeObservable = fromEventPattern(
      (handler) => this.wavesurfer.on('decode', handler),
      (handler) => this.wavesurfer.un('decode', handler)
    );

    combineLatest([
      decodeObservable,
      this.analysisService.packetBurstsLeftBounds.asObservable(),
      this.analysisService.packetBurstsRightBounds.asObservable(),
      this.analysisService.selectedSampleMaskIndex.asObservable(),
    ])
      .pipe(
        tap(([blank, leftBounds, rightBounds, sampleMaskIndex]) => {
          const sampleRate = this.analysisService.originalTrackSampleRates.value[0];

          lens.clearRegions();

          leftBounds[sampleMaskIndex].forEach((lb: number, idx: number) => {
            const rb: number = rightBounds[sampleMaskIndex][idx];
            lens.addRegion({
              start: lb / sampleRate,
              end: rb / sampleRate,
              drag: false,
              resize: false,
            });
          });
        })
      )
      .subscribe();
  }

  private onRegionClick(region: any): void {
    // Handle region click
    console.log('Region clicked:', {
      start: region.start,
      end: region.end,
      duration: region.end - region.start,
    });

    // You can add more functionality here, such as:
    // - Playing the audio segment: this.wavesurfer.play(region.start, region.end);
    // - Highlighting the region
    // - Showing region details
    // - Emitting an event to parent component
  }

  private destroyWavesurfer() {
    this.wavesurfer.stop();
    this.wavesurfer.destroy();
  }
}

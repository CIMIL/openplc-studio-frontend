import { Component, ElementRef, Input, ViewChild, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { combineLatest, filter, fromEvent, fromEventPattern, Subject, Subscription, takeUntil, tap } from 'rxjs';
import WaveSurfer from 'wavesurfer.js';
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom';
import Spectrogram from 'wavesurfer.js/dist/plugins/spectrogram';
import RegionsPlugin, { Region } from 'wavesurfer.js/dist/plugins/regions';
import { CommonModule } from '@angular/common';
import { AnalysisService } from '../analysis.service';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'plc-wavesurfer-wrapper',
  imports: [CommonModule, SkeletonModule],
  templateUrl: './wavesurfer-wrapper.component.html',
  styleUrls: ['./wavesurfer-wrapper.component.scss'],
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

  private regionsSubscription?: Subscription;

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
      height: 300,
      minPxPerSec: 50,
      sampleRate: this.analysisService.selectedTrackPlaybackSampleRate.value,
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
    lens.on('region-clicked', (region: Region, event) => {
      event.stopPropagation();
      this.onRegionClick(region);
    });

    const decodeObservable = fromEventPattern(
      (handler) => this.wavesurfer.on('decode', handler),
      (handler) => this.wavesurfer.un('decode', handler)
    );

    this.regionsSubscription = combineLatest([
      decodeObservable,
      this.analysisService.packetBurstsLeftBounds.asObservable(),
      this.analysisService.packetBurstsRightBounds.asObservable(),
      this.analysisService.selectedSampleMaskIndex.asObservable(),
    ])
      .pipe(
        tap(([blank, leftBounds, rightBounds, sampleMaskIndex]) => {
          const sampleRate = this.analysisService.originalTrackSampleRates.value[0];

          lens.clearRegions();

          const left = leftBounds?.[sampleMaskIndex] || [];
          const right = rightBounds?.[sampleMaskIndex] || [];

          left.forEach((lb: number, idx: number) => {
            const rb: number = right[idx];
            const region = lens.addRegion({
              start: lb / sampleRate,
              end: rb / sampleRate,
              drag: false,
              resize: false,
              color: '#ffffff20',
              content: `${lb}|${rb}`,
            });
            const regionElement = region.element as HTMLElement;
            regionElement.style.cursor = 'pointer';
            regionElement.addEventListener('mouseenter', () => {
              regionElement.style.backgroundColor = '#ffffff60';
            });
            regionElement.addEventListener('mouseleave', () => {
              regionElement.style.backgroundColor = '#ffffff20'; // Reset to original
            });

            const contentEl = regionElement.querySelector('[part="region-content"]') as HTMLElement | null;
            if (contentEl) {
              contentEl.style.visibility = 'hidden';
            }

            region.on('content-changed', () => {
              const c = region.element?.querySelector('[part="region-content"]') as HTMLElement | null;
              if (c) c.style.visibility = 'hidden';
            });
          });
        })
      )
      .subscribe();
  }

  private onRegionClick(region: Region): void {
    const sampleRate = this.analysisService.originalTrackSampleRates.value[0];
    const content = region.content as HTMLElement;
    const [lb, rb, ...blank] = content
      .getHTML()
      .split('|')
      .map((b) => Number(b));
    this.analysisService.selectedPacketBounds.next([lb, rb]);
  }

  private destroyWavesurfer() {
    if (this.regionsSubscription) {
      this.regionsSubscription.unsubscribe();
      this.regionsSubscription = undefined;
    }
    this.wavesurfer.stop();
    this.wavesurfer.destroy();
  }
}

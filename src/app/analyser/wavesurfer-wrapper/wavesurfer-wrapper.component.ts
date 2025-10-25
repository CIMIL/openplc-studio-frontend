import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { combineLatest, filter, fromEvent, fromEventPattern, Subject, Subscription, takeUntil, tap } from 'rxjs';
import WaveSurfer from 'wavesurfer.js';
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom';
import RegionsPlugin, { Region } from 'wavesurfer.js/dist/plugins/regions';
import { CommonModule } from '@angular/common';
import { AnalysisService } from '../analysis.service';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { SliderModule } from 'primeng/slider';
import { ThemeService } from '../../shared/services/theme.service';
import SpectrogramPlugin from 'wavesurfer.js/dist/plugins/spectrogram';

import SpectrogramPatch from './ws-spectrogram-patch.class';

import Hover from 'wavesurfer.js/dist/plugins/hover';
import HoverPlugin from 'wavesurfer.js/dist/plugins/hover';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';

const WAVESURFER_COLOR_PALETTE = {
  waveColor: ['#a78bfa', '#c084fc'],
  progressColor: ['#d946ef', '#e879f9'],
  regionsColor: ['#00000030', '#ffffff30'],
  regionsColorHover: ['#00000060', '#ffffff80'],
  hoverLineColor: ['#178a42', '#4cd07d'],
  hoverLabelBackground: ['#1f2937', '#374151'],
  hoverLabelColor: ['#f9fafb', '#f3f4f6'],
};

@Component({
  selector: 'plc-wavesurfer-wrapper',
  imports: [CommonModule, SkeletonModule, ButtonModule, SliderModule, FormsModule],
  templateUrl: './wavesurfer-wrapper.component.html',
  styleUrls: ['./wavesurfer-wrapper.component.scss'],
})
export class WavesurferWrapperComponent implements OnDestroy {
  private regionsPlugin?: RegionsPlugin;

  private hoverPlugin?: HoverPlugin;

  private _waveformRef?: ElementRef;

  public isPlaying = false;

  public volume = 1.0;

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

  public wavesurfer!: WaveSurfer;

  private destroy$ = new Subject<void>();

  private spacebarSubscription?: Subscription;

  private regionsSubscription?: Subscription;

  constructor(
    public readonly analysisService: AnalysisService,
    private readonly themeService: ThemeService,
    private readonly messageService: MessageService,
  ) {}

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
        }),
      )
      .subscribe();

    this.themeService.isDarkMode
      .pipe(
        takeUntil(this.destroy$),
        tap(() => this.updateWavesurferTheme()),
      )
      .subscribe();
  }

  private initializeWaveSurfer(): void {
    if (!this.waveformRef) {
      return;
    }

    const isDarkMode = this.themeService.isDarkMode.value;
    const sampleRate = this.analysisService.selectedTrackPlaybackSampleRate.value;

    this.wavesurfer = WaveSurfer.create({
      container: this.waveformRef.nativeElement,
      backend: 'WebAudio',
      waveColor: WAVESURFER_COLOR_PALETTE['waveColor'][Number(isDarkMode)],
      progressColor: WAVESURFER_COLOR_PALETTE['progressColor'][Number(isDarkMode)],
      height: 300,
      minPxPerSec: 0,
      sampleRate: sampleRate,
    });

    this.wavesurfer.setVolume(this.volume);

    // EVENTS BINDINGS

    this.wavesurfer.on('play', () => {
      this.isPlaying = true;
    });

    this.wavesurfer.on('pause', () => {
      this.isPlaying = false;
    });

    this.wavesurfer.on('finish', () => {
      this.isPlaying = false;
    });
    this.wavesurfer.on(
      'scroll',
      (visibleStartTime: number, visibleEndTime: number, scrollLeft: number, scrollRight: number) => {
        this.analysisService.wsZoomBounds.next([visibleStartTime, visibleEndTime]);
      },
    );

    // play with spacebar
    if (!this.spacebarSubscription) {
      this.spacebarSubscription = fromEvent<KeyboardEvent>(document, 'keydown')
        .pipe(
          filter((event) => event.code === 'Space' && !!this.wavesurfer),
          tap((event) => {
            event.preventDefault();
            this.playPause();
          }),
        )
        .subscribe();
    }

    const audio = this.analysisService.currentAudioBlob;

    if (audio) {
      this.wavesurfer.loadBlob(audio);
    }

    const spectrogramPlugin: SpectrogramPlugin = this.wavesurfer.registerPlugin(
      SpectrogramPatch.create({
        labels: true,
        height: 400,
        splitChannels: false,
        scale: 'mel',
        frequencyMax: 0,
        frequencyMin: 0,
        fftSamples: 2048,
        useWebWorker: true,
      }),
    );

    spectrogramPlugin.once('ready', () => {
      const wrapper = (spectrogramPlugin as any).wrapper as HTMLElement;
      console.log(this.wavesurfer.getWrapper().offsetWidth);
      (spectrogramPlugin as any).setWidth(this.wavesurfer.getWrapper().offsetWidth);
      this.analysisService.spectrogramWrapper.next(wrapper);

      this.messageService.add({ summary: 'Spectrogram is ready' });
    });

    this.wavesurfer.registerPlugin(
      ZoomPlugin.create({
        scale: 1,
        maxZoom: 20000,
        exponentialZooming: true,
      }),
    );

    this.hoverPlugin = this.getHoverPlugin(isDarkMode);
    this.wavesurfer.registerPlugin(this.hoverPlugin);

    const lens: RegionsPlugin = RegionsPlugin.create();
    this.regionsPlugin = lens;
    this.wavesurfer.registerPlugin(lens);

    // Add region click event listener
    lens.on('region-clicked', (region: Region, event) => {
      event.stopPropagation();
      this.onRegionClick(region);
    });

    const decodeObservable = fromEventPattern(
      (handler) => this.wavesurfer.on('decode', handler),
      (handler) => this.wavesurfer.un('decode', handler),
    );

    this.regionsSubscription = combineLatest([
      decodeObservable,
      this.analysisService.packetBurstsLeftBounds.asObservable(),
      this.analysisService.packetBurstsRightBounds.asObservable(),
      this.analysisService.selectedSampleMaskIndex.asObservable(),
    ])
      .pipe(
        tap(([blank, leftBounds, rightBounds, sampleMaskIndex]) => {
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
              color: WAVESURFER_COLOR_PALETTE['regionsColor'][Number(isDarkMode)],
              content: `${lb}|${rb}`,
            });

            const regionElement = region.element as HTMLElement;
            regionElement.style.cursor = 'pointer';
            regionElement.addEventListener('mouseenter', () => {
              regionElement.style.backgroundColor = WAVESURFER_COLOR_PALETTE['regionsColorHover'][Number(isDarkMode)];
            });
            regionElement.addEventListener('mouseleave', () => {
              regionElement.style.backgroundColor = WAVESURFER_COLOR_PALETTE['regionsColor'][Number(isDarkMode)]; // Reset to original
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
        }),
      )
      .subscribe();
  }

  public playPause(): void {
    if (this.wavesurfer) {
      this.wavesurfer.playPause();
    }
  }

  public seekToStart(): void {
    if (this.wavesurfer) {
      this.wavesurfer.pause();
      this.wavesurfer.seekTo(0);
      this.isPlaying = false;
    }
  }

  public seekToEnd(): void {
    if (this.wavesurfer) {
      this.wavesurfer.pause();
      const duration = this.wavesurfer.getDuration();
      this.wavesurfer.seekTo(duration);
      this.isPlaying = false;
    }
  }

  public onVolumeChange(event: any): void {
    this.volume = event.value;
    if (this.wavesurfer) {
      this.wavesurfer.setVolume(this.volume);
    }
  }

  private onRegionClick(region: Region): void {
    const content = region.content as HTMLElement;
    const [lb, rb, ...blank] = content
      .getHTML()
      .split('|')
      .map((b) => Number(b));
    this.analysisService.selectedPacketBounds.next([lb, rb]);
  }

  private updateWavesurferTheme() {
    if (!this.wavesurfer) return;

    const isDarkMode = this.themeService.isDarkMode.value;

    this.wavesurfer.setOptions({
      waveColor: WAVESURFER_COLOR_PALETTE['waveColor'][Number(isDarkMode)],
      progressColor: WAVESURFER_COLOR_PALETTE['progressColor'][Number(isDarkMode)],
    });

    this.hoverPlugin?.destroy();
    this.hoverPlugin = this.getHoverPlugin(isDarkMode);
    this.wavesurfer.registerPlugin(this.hoverPlugin);

    if (this.regionsPlugin) {
      const regions = this.regionsPlugin.getRegions();

      regions.forEach((region) => {
        const regionElement = region.element as HTMLElement;
        if (regionElement) {
          regionElement.style.backgroundColor = WAVESURFER_COLOR_PALETTE['regionsColor'][Number(isDarkMode)];

          // Update the existing hover styles
          regionElement.addEventListener('mouseenter', () => {
            regionElement.style.backgroundColor = WAVESURFER_COLOR_PALETTE['regionsColorHover'][Number(isDarkMode)];
          });
          regionElement.addEventListener('mouseleave', () => {
            regionElement.style.backgroundColor = WAVESURFER_COLOR_PALETTE['regionsColor'][Number(isDarkMode)];
          });
        }
      });
    }
  }

  private getHoverPlugin(isDarkMode: boolean): HoverPlugin {
    return Hover.create({
      lineColor: WAVESURFER_COLOR_PALETTE['hoverLineColor'][Number(isDarkMode)],
      lineWidth: 2,
      labelBackground: WAVESURFER_COLOR_PALETTE['hoverLabelBackground'][Number(isDarkMode)],
      labelColor: WAVESURFER_COLOR_PALETTE['hoverLabelColor'][Number(isDarkMode)],
      labelSize: '11px',
      labelPreferLeft: false,
      formatTimeCallback: (time: number) => {
        const ms = Math.round(time * 1000);
        return `${time.toFixed(2)}s (${ms} ms)`;
      },
    });
  }

  private destroyWavesurfer() {
    if (this.regionsSubscription) {
      this.regionsSubscription.unsubscribe();
      this.regionsSubscription = undefined;
    }
    this.wavesurfer.stop();
    this.wavesurfer.destroy();
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.wavesurfer) {
      this.destroyWavesurfer();
    }
  }
}

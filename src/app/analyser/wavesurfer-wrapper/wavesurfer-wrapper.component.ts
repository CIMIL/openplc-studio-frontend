import { Component, ElementRef, Input, ViewChild, OnDestroy } from '@angular/core';
import { BehaviorSubject, debounceTime, filter, fromEvent, Subject, Subscription, takeUntil, tap } from 'rxjs';
import WaveSurfer from 'wavesurfer.js';
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom';
import Spectrogram from 'wavesurfer.js/dist/plugins/spectrogram';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import { CommonModule } from '@angular/common';
import { AnalysisService } from '../../shared/services/analysis.service';
// import { Chart } from 'chart.js/auto';

@Component({
  selector: 'plc-wavesurfer-wrapper',
  imports: [CommonModule],
  templateUrl: './wavesurfer-wrapper.component.html',
  styleUrl: './wavesurfer-wrapper.component.scss',
})
export class WavesurferWrapperComponent implements OnDestroy {
  @ViewChild('waveform', { static: true })
  private waveformRef!: ElementRef;

  private wavesurfer!: WaveSurfer;

  private destroy$ = new Subject<void>();

  private spacebarSubscription?: Subscription;

  constructor(private readonly audioService: AnalysisService) {}

  public ngOnInit() {
    this.audioService.audioBlob$
      .pipe(
        takeUntil(this.destroy$),
        tap((blob: Blob | null) => {
          if (blob) {
            if (this.wavesurfer) {
              this.destroyWavesurfer();
            }
            this.initializeWaveSurfer();
          } else if (this.wavesurfer) {
            this.destroyWavesurfer();
          }
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
    });

    // define wavesurfer events

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

    // Optionally, keep click to play
    this.wavesurfer.on('click', () => {
      this.wavesurfer.play();
    });

    const audio = this.audioService.currentAudioBlob;

    if (audio) {
      this.wavesurfer.loadBlob(audio);
    }

    // this.wavesurfer.registerPlugin(
    //   Spectrogram.create({
    //     labels: true,
    //     height: 1000,
    //     splitChannels: true,
    //     scale: 'mel', // or 'linear', 'logarithmic', 'bark', 'erb'
    //     frequencyMax: 16000,
    //     frequencyMin: 0,
    //     fftSamples: 2048,
    //     labelsBackground: 'rgba(0, 0, 0, 0.1)',
    //   })
    // );

    this.wavesurfer.registerPlugin(
      ZoomPlugin.create({
        scale: 1,
        maxZoom: 20000,
        exponentialZooming: true,
      })
    );

    const lens = RegionsPlugin.create();

    this.wavesurfer.registerPlugin(lens);

    this.wavesurfer.on('decode', () => {
      lens.addRegion({
        start: 1,
        end: 5,
        drag: true,
        resize: true,
      });
    });
  }

  private destroyWavesurfer() {
    this.wavesurfer.stop();
    this.wavesurfer.destroy();
  }
}

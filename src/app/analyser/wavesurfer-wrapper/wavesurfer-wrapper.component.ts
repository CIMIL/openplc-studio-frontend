import { Component, ElementRef, Input, ViewChild, HostListener } from '@angular/core';
import WaveSurfer from 'wavesurfer.js';
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom';
import Spectrogram from 'wavesurfer.js/dist/plugins/spectrogram';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';

@Component({
  selector: 'plc-wavesurfer-wrapper',
  imports: [],
  templateUrl: './wavesurfer-wrapper.component.html',
  styleUrl: './wavesurfer-wrapper.component.scss',
})
export class WavesurferWrapperComponent {
  @ViewChild('waveform', { static: false })
  private waveformRef!: ElementRef;

  @Input()
  public audioUrl!: string;

  private wavesurfer!: WaveSurfer;

  public ngOnInit(): void {}

  public ngAfterViewInit(): void {
    this.initializeWaveSurfer();
  }

  public ngOnDestroy(): void {
    if (this.wavesurfer) {
      this.wavesurfer.destroy();
    }
  }

  private initializeWaveSurfer(): void {
    this.wavesurfer = WaveSurfer.create({
      container: this.waveformRef.nativeElement,
      backend: 'WebAudio',
      waveColor: 'violet',
      progressColor: 'purple',
      height: 500,
      // barWidth: 3,
      // barHeight: 1,
      // barRadius: 10,
      // barGap: 2,
      minPxPerSec: 50,
    });

    if (this.audioUrl) {
      this.loadAudio(this.audioUrl);
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
        content: 'aaa',
        drag: true,
        resize: true,
      });
    });
  }

  public loadAudio(url: string): void {
    this.wavesurfer.load(url);
  }
}

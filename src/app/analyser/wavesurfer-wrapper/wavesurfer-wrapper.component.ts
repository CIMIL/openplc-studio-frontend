import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import WaveSurfer from 'wavesurfer.js';

@Component({
  selector: 'plc-wavesurfer-wrapper',
  standalone: true,
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

  public ngOnInit(): void {
  }

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
      height: 200,
      barWidth: 3,
      barHeight: 1,
      barGap: 2,
    });

    if (this.audioUrl) {
      this.loadAudio(this.audioUrl);
    }
  }

  public loadAudio(url: string): void {
    this.wavesurfer.load(url);
  }

  public togglePlayPause(): void {
    this.wavesurfer.playPause();
  }

  public seekTo(position: number): void {
    this.wavesurfer.seekTo(position);
  }

  public getCurrentTime(): number {
    return this.wavesurfer.getCurrentTime();
  }

  public getDuration(): number {
    return this.wavesurfer.getDuration();
  }

  public zoom(event: Event): void {
    const factor = Number((event.target as HTMLInputElement).value);
    this.wavesurfer.zoom(factor);
  }
}

import { Component } from '@angular/core';
import { WavesurferWrapperComponent } from './wavesurfer-wrapper/wavesurfer-wrapper.component';

@Component({
  selector: 'plc-analyser',
  standalone: true,
  imports: [WavesurferWrapperComponent],
  templateUrl: './analyser.component.html',
  //   styleUrl: './analyser.component.scss',
})
export class AnalyserComponent {}

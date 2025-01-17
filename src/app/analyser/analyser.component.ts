import { Component } from '@angular/core';
import { WavesurferWrapperComponent } from './wavesurfer-wrapper/wavesurfer-wrapper.component';

@Component({
    selector: 'plc-analyser',
    imports: [WavesurferWrapperComponent],
    templateUrl: './analyser.component.html'
})
export class AnalyserComponent {}

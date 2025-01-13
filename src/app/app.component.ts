import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WavesurferWrapperComponent } from './analyser/wavesurfer-wrapper/wavesurfer-wrapper.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, WavesurferWrapperComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'plc-platform-frontend';
}

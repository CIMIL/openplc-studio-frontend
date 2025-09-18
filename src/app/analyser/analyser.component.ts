import { Component } from '@angular/core';
import { WavesurferWrapperComponent } from './wavesurfer-wrapper/wavesurfer-wrapper.component';
import { RunsClient } from '../shared/clients/runs.client';
import { from, of, switchMap, take, tap } from 'rxjs';
import { FileDescription, parseTar } from 'tarparser';
import { AnalysisService } from '../shared/services/analysis.service';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'plc-analyser',
  imports: [WavesurferWrapperComponent, DropdownModule, FormsModule],
  templateUrl: './analyser.component.html',
})
export class AnalyserComponent {
  public originalTracks: FileDescription[] = [];
  public selectedOriginalTrack: FileDescription | null = null;

  constructor(private readonly runsClient: RunsClient, private readonly analysisService: AnalysisService) {}

  public ngOnInit(): void {
    const runId = '68cbc39f6d2bc953f26fa1c4';

    this.runsClient
      .getRunAssets(runId, 0)
      .pipe(
        take(1),
        switchMap((buf: ArrayBuffer) => from(parseTar(buf))),
        switchMap((files: FileDescription[]) => of(files.filter((f) => f.name !== '././@PaxHeader'))),
        tap((files: FileDescription[]) => {
          this.originalTracks = files;
          this.selectedOriginalTrack = files[0] ?? null;
          if (this.selectedOriginalTrack) {
            this.onTrackChange(this.selectedOriginalTrack);
          } else {
            this.analysisService.setAudioBlob(null);
          }
        })
      )
      .subscribe();

    // this.runsClient
    //   .getRunAssets(runId, 2)
    //   .pipe(
    //     take(1),
    //     switchMap((buf: ArrayBuffer) => from(parseTar(buf))),
    //     switchMap((files: FileDescription[]) => of(files.filter((f) => f.name !== '././@PaxHeader'))),
    //     tap((files: FileDescription[]) => {
    //       this.originalTracks = files;
    //       this.selectedOriginalTrack = files[0] ?? null;
    //       if (this.selectedOriginalTrack) {
    //         this.onTrackChange(this.selectedOriginalTrack);
    //       } else {
    //         this.analysisService.setAudioBlob(null);
    //       }
    //     })
    //   )
    //   .subscribe();
  }

  public onTrackChange(track: FileDescription | null): void {
    if (!track || !track.data) {
      this.analysisService.setAudioBlob(null);
      return;
    }
    const audioBuffer = new Uint8Array(track.data);
    const blob = new Blob([audioBuffer], { type: 'audio/wave' });
    this.analysisService.setAudioBlob(blob);
  }
}

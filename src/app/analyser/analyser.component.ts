import { Component } from '@angular/core';
import { WavesurferWrapperComponent } from './wavesurfer-wrapper/wavesurfer-wrapper.component';
import { RunsClient } from '../shared/clients/runs.client';
import { from, of, switchMap, take, tap } from 'rxjs';
import { FileDescription, parseTar } from 'tarparser';
import { AnalysisService } from '../shared/services/analysis.service';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { CascadeSelectModule } from 'primeng/cascadeselect';

@Component({
  selector: 'plc-analyser',
  imports: [WavesurferWrapperComponent, DropdownModule, FormsModule, CascadeSelectModule],
  templateUrl: './analyser.component.html',
})
export class AnalyserComponent {
  public originalTracks: FileDescription[] = [];

  public tracks: any = [];

  public reconstructedTracks: FileDescription[] = [];

  public selectedTrack: FileDescription | null = null;

  constructor(private readonly runsClient: RunsClient, private readonly analysisService: AnalysisService) {}

  public ngOnInit(): void {
    const runId = '68cc15a3d680f029a3b48ac7';

    this.runsClient
      .getRunAssets(runId, 0)
      .pipe(
        take(1),
        switchMap((buf: ArrayBuffer) => from(parseTar(buf))),
        switchMap((files: FileDescription[]) => of(files.filter((f) => f.name !== '././@PaxHeader'))),
        tap((files: FileDescription[]) => {
          this.originalTracks = files;
          this.selectedTrack = files[0] ?? null;
          if (this.selectedTrack) {
            this.onTrackChange(this.selectedTrack);
          } else {
            this.analysisService.setAudioBlob(null);
          }
        })
      )
      .subscribe();

    this.runsClient
      .getRunAssets(runId, 2)
      .pipe(
        take(1),
        switchMap((buf: ArrayBuffer) => from(parseTar(buf))),
        switchMap((files: FileDescription[]) => of(files.filter((f) => f.name !== '././@PaxHeader'))),
        tap((files: FileDescription[]) => {
          this.reconstructedTracks = files;
          const t = this.originalTracks.map(({ name, data }) => ({ name, data }));
          console.log(this.reconstructedTracks);

          this.tracks;
        })
      )
      .subscribe();
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

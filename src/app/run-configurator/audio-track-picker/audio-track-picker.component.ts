import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, EventEmitter, OnInit, Output, OnDestroy } from '@angular/core';
import { MessageService } from 'primeng/api';
import { FileUploadEvent, FileUploadModule } from 'primeng/fileupload';
import { FilesClient } from '../../shared/clients/files.client';
import { ToastModule } from 'primeng/toast';
import { PickListModule } from 'primeng/picklist';
import { SplitterModule } from 'primeng/splitter';
import { of, switchMap, tap } from 'rxjs';

@Component({
  selector: 'plc-audio-track-picker',
  templateUrl: './audio-track-picker.component.html',
  styleUrls: ['./audio-track-picker.component.scss'],
  imports: [CommonModule, FileUploadModule, ToastModule, SplitterModule, PickListModule],
  providers: [MessageService, FilesClient],
})
export class AudioTrackPickerComponent implements OnInit, OnDestroy {
  @Input()
  public audioTracksSelection!: string[];

  @Output()
  public audioTracksSelectionChange = new EventEmitter<string[]>();

  public uploadedFiles: any[] = [];

  public sourceFilenames: string[] = [];

  constructor(
    private readonly messageService: MessageService,
    public readonly filesClient: FilesClient,
    private cdr: ChangeDetectorRef
  ) {}

  public ngOnInit(): void {
    this.filesClient
      .getFilenames()
      .pipe(
        switchMap((filenames: string[]) => of(filenames.filter((f) => !(this.audioTracksSelection ?? []).includes(f)))),
        tap((filenames: string[]) => (this.sourceFilenames = filenames)),
        tap(() => this.cdr.markForCheck())
      )
      .subscribe();
  }

  public onUpload(event: FileUploadEvent) {
    for (let file of event.files) {
      this.sourceFilenames.push(file.name);
    }

    this.messageService.add({ severity: 'info', summary: `File(s) uploaded with success`, detail: '' });
  }

  ngOnDestroy(): void {
    this.audioTracksSelectionChange.emit(this.audioTracksSelection);
  }
}

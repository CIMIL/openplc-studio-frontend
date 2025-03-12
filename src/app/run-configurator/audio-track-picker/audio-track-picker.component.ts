import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { FileUploadEvent, FileUploadModule } from 'primeng/fileupload';
import { FilesClient } from '../../shared/clients/files.client';
import { ToastModule } from 'primeng/toast';
import { PickListModule } from 'primeng/picklist';
import { SplitterModule } from 'primeng/splitter';
import { tap } from 'rxjs';

@Component({
  selector: 'plc-audio-track-picker',
  templateUrl: './audio-track-picker.component.html',
  //   styleUrls: ['./audio-track-picker.component.scss'],
  imports: [CommonModule, FileUploadModule, ToastModule, SplitterModule, PickListModule],
  providers: [MessageService, FilesClient],
})
export class AudioTrackPickerComponent implements OnInit {
  public uploadedFiles: any[] = [];

  public sourceFilenames: string[] = [];

  public targetFilenames: string[] = [];

  constructor(private readonly messageService: MessageService, public readonly filesClient: FilesClient) {}

  public ngOnInit(): void {
    this.filesClient
      .getFilenames()
      .pipe(tap((filenames: string[]) => (this.sourceFilenames = filenames)))
      .subscribe();
  }

  public onUpload(event: FileUploadEvent) {
    console.log(event);

    for (let file of event.files) {
      this.uploadedFiles.push(file);
    }

    this.messageService.add({ severity: 'info', summary: `File(s) uploaded with success`, detail: '' });
  }
}

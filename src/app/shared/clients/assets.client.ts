import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { AudioTrackMetadata, AudioTrackMetadataDto } from '../interfaces/audio-track-metadata.interface';

@Injectable({ providedIn: 'root' })
export class AssetsClient {
  public api = '/api/assets';
  private headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  constructor(private http: HttpClient) {}

  public uploadFiles(files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    return this.http.post(`${this.api}`, formData);
  }

  public getFilenames(): Observable<string[]> {
    return this.http.get<string[]>(`${this.api}/original-tracks`, { headers: this.headers });
  }

  public getTrackMetadata(): Observable<AudioTrackMetadata[]> {
    return this.http
      .get<AudioTrackMetadataDto[]>(`${this.api}/original-tracks/metadata`, { headers: this.headers })
      .pipe(
        map((dtos: AudioTrackMetadataDto[]) =>
          dtos.map((dto: AudioTrackMetadataDto) => ({
            name: dto.name,
            sizeBytes: dto.size_bytes,
            durationSeconds: dto.duration_seconds,
            sampleRate: dto.sample_rate,
            channels: dto.channels,
            bitDepth: dto.bit_depth,
          })),
        ),
      );
  }
}

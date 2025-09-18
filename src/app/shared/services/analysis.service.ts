import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AnalysisService {
  private currentAudioBlobSubject = new BehaviorSubject<Blob | null>(null);

  public get audioBlob$(): Observable<Blob | null> {
    return this.currentAudioBlobSubject.asObservable();
  }

  public get currentAudioBlob(): Blob | null {
    return this.currentAudioBlobSubject.value;
  }

  public setAudioBlob(blob: Blob | null): void {
    this.currentAudioBlobSubject.next(blob);
  }

  public clearAudioBlob(): void {
    this.currentAudioBlobSubject.next(null);
  }
}

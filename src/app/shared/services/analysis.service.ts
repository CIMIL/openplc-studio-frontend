import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AnalysisService {
  private currentAudioBlobSubject = new BehaviorSubject<Blob | null>(null);

  public packetBurstsLeftBounds = new BehaviorSubject<number[][]>([]);

  public packetBurstsRightBounds = new BehaviorSubject<number[][]>([]);

  public originalTrackSampleRates = new BehaviorSubject<number[]>([]);

  public selectedSampleMaskIndex = new BehaviorSubject<number>(0);

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

  public calculatePacketBurstBounds(sampleMask: number[], packetSize: number): number[][] {
    if (!sampleMask || sampleMask.length === 0) {
      return [[], []];
    }

    const leftBounds: number[] = [];
    const rightBounds: number[] = [];

    sampleMask.forEach((packetPosition: number, index: number) => {
      const isFirstPacket = index === 0;
      const isLastPacket = index === sampleMask.length - 1;
      const previousPacket = sampleMask[index - 1];
      const nextPacket = sampleMask[index + 1];

      if (isFirstPacket) {
        leftBounds.push(packetPosition);
      }

      if (isLastPacket) {
        rightBounds.push(packetPosition + packetSize);
      }

      if (!isFirstPacket && this.isPacketGap(packetPosition, previousPacket, packetSize)) {
        leftBounds.push(packetPosition);
      }

      if (!isLastPacket && this.isPacketGap(packetPosition, nextPacket, packetSize)) {
        rightBounds.push(packetPosition + packetSize);
      }
    });

    return [leftBounds, rightBounds];
  }

  private isPacketGap(currentPacket: number, otherPacket: number, packetSize: number): boolean {
    return Math.abs(currentPacket - otherPacket) > packetSize;
  }
}

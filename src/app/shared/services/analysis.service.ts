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

  public selectedPacketBounds = new BehaviorSubject<number[]>([]);

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

  public getLeftBound(selectedPacket: number, sampleMask: number[], packetSize: number) {
    const selectedPacketIndex = sampleMask.indexOf(selectedPacket);

    let getBoundRec = (currentLeftIndex: number) => {
      if (currentLeftIndex == 0) {
        return currentLeftIndex;
      }
      let currentLeft = sampleMask[currentLeftIndex];
      let nextLeft = sampleMask[currentLeftIndex - 1];
      if (Math.abs(currentLeft - nextLeft) > packetSize) {
        return currentLeftIndex;
      }
      return getBoundRec(currentLeftIndex - 1);
    };

    return sampleMask[getBoundRec(selectedPacketIndex)];
  }

  public getRightBound(selectedPacket: number, sampleMask: number[], packetSize: number) {
    const selectedPacketIndex = sampleMask.indexOf(selectedPacket);

    if (selectedPacketIndex === sampleMask.length - 1) {
      return selectedPacket;
    }

    let getBoundRec = (currentRightIndex: number) => {
      if (currentRightIndex === sampleMask.length - 1) {
        return currentRightIndex;
      }
      let currentRight = sampleMask[currentRightIndex];
      let nextRight = sampleMask[currentRightIndex + 1];
      if (Math.abs(currentRight - nextRight) > packetSize) {
        return currentRightIndex;
      }
      return getBoundRec(currentRightIndex + 1);
    };

    return sampleMask[getBoundRec(selectedPacketIndex)];
  }
}

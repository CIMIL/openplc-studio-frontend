import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { Run } from '../shared/interfaces/run.interface';
import { FileDescription } from 'tarparser';
import { Module } from '../shared/interfaces/module.interface';
import { ModuleParameter } from '../shared/interfaces/module-parameters.interface';
import { ModuleType } from '../shared/enums/module-type.enum';

export type FileDescriptionWithJson = Omit<FileDescription, 'data' | 'text'> & { json: any[] };

export type MetricRaw = FileDescriptionWithJson & { index: number };

export type ReconstructedTrackRaw = FileDescription & { index: number };

export type TrackGroup = { originalTrack: string; reconstructedTracks: { name: string }[] };

@Injectable({
  providedIn: 'root',
})
export class AnalysisService {
  public run = new BehaviorSubject<Run | null>(null);

  public metrics = new BehaviorSubject<MetricRaw[]>([]);

  public selectedOriginalTrack = new BehaviorSubject<string>('');

  public trackGroups = new BehaviorSubject<TrackGroup[]>([]);

  public trackMaps = new BehaviorSubject<Record<string, Uint8Array>>({});

  public playbaleTrackToMetricsMap = new BehaviorSubject<Record<string, MetricRaw[]>>({});

  private currentAudioBlobSubject = new BehaviorSubject<Blob | null>(null);

  public packetBurstsLeftBounds = new BehaviorSubject<number[][]>([]);

  public packetBurstsRightBounds = new BehaviorSubject<number[][]>([]);

  public originalTrackSampleRates = new BehaviorSubject<number[]>([]);

  public selectedSampleMaskIndex = new BehaviorSubject<number>(0);

  public selectedPacketBounds = new BehaviorSubject<number[]>([]);

  public selectedTrackPlayback = new BehaviorSubject<{ name: string } | null>(null);

  public selectedTrackPlaybackSampleRate = new BehaviorSubject<number>(-1);

  public sampleMaskMaps = new BehaviorSubject<Record<string, number[]> | null>(null);

  public wsZoomBounds = new BehaviorSubject<number[]>([]);

  public spectrogramWrapper = new BehaviorSubject<HTMLElement | null>(null);

  public sampleMaskParameters = new BehaviorSubject<Record<string, any>[]>([]);

  public plcAlgorithmParameters = new BehaviorSubject<Record<string, any>[]>([]);

  public outputAnalyserParameters = new BehaviorSubject<Record<string, any>[]>([]);

  public get audioBlob$(): Observable<Blob | null> {
    return this.currentAudioBlobSubject.asObservable();
  }

  public get currentAudioBlob(): Blob | null {
    return this.currentAudioBlobSubject.value;
  }

  public updateParametersFromRun(run: Run | null): void {
    this.sampleMaskParameters.next(this.getSampleMaskParameters(run));
    this.plcAlgorithmParameters.next(this.getPlcAlgorithmParameters(run));
    this.outputAnalyserParameters.next(this.getOutputAnalyserParameters(run));
  }

  public getSampleMaskParameters(run: Run | null): Record<string, any>[] {
    if (
      !run ||
      !run.modules ||
      !run.modules[ModuleType.PacketLossSimulator] ||
      !Array.isArray(run.modules[ModuleType.PacketLossSimulator])
    ) {
      return [];
    }
    return run.modules[ModuleType.PacketLossSimulator].map((module: Module) => {
      if (!Array.isArray(module.settings)) return {};
      const paramsObj: Record<string, any> = {};
      module.settings.forEach((param: any) => {
        paramsObj[param.name] = param.value;
      });
      return paramsObj;
    });
  }

  public getPlcAlgorithmParameters(run: Run | null): Record<string, any>[] {
    if (
      !run ||
      !run.modules ||
      !run.modules[ModuleType.PLCAlgorithm] ||
      !Array.isArray(run.modules[ModuleType.PLCAlgorithm])
    ) {
      return [];
    }
    return run.modules[ModuleType.PLCAlgorithm].map((module: Module) => {
      if (!Array.isArray(module.settings)) return {};
      const paramsObj: Record<string, any> = {};
      module.settings.forEach((param: any) => {
        if (['crossfade', 'fade_in'].includes(param.name)) {
          return;
        }
        paramsObj[param.name] = param.value;
      });
      return paramsObj;
    });
  }

  public getOutputAnalyserParameters(run: Run | null): Record<string, any>[] {
    if (
      !run ||
      !run.modules ||
      !run.modules[ModuleType.OutputAnalyser] ||
      !Array.isArray(run.modules[ModuleType.OutputAnalyser])
    ) {
      return [];
    }
    return run.modules[ModuleType.OutputAnalyser].map((module: Module) => {
      if (!Array.isArray(module.settings)) return {};
      const paramsObj: Record<string, any> = {};
      module.settings.forEach((param: any) => {
        paramsObj[param.name] = param.value;
      });
      return paramsObj;
    });
  }

  public setAudioBlob(blob: Blob | null): void {
    this.currentAudioBlobSubject.next(blob);
  }

  public clearAudioBlob(): void {
    this.currentAudioBlobSubject.next(null);
  }

  get sampleMaskPacketSizes(): number[] {
    return (
      this.run.value?.modules[ModuleType.PacketLossSimulator].map(
        (m: Module) => m.settings.filter((mp: ModuleParameter) => mp.name === 'packet_size')[0].value,
      ) ?? []
    );
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

  public resetAnalyzerData() {
    this.run.next(null);
    this.selectedOriginalTrack.next('');
    this.trackGroups.next([]);
    this.trackMaps.next({});
    this.packetBurstsLeftBounds.next([]);
    this.packetBurstsRightBounds.next([]);
    this.originalTrackSampleRates.next([]);
    this.selectedSampleMaskIndex.next(0);
    this.selectedPacketBounds.next([]);
    this.selectedTrackPlayback.next(null);
    this.selectedTrackPlaybackSampleRate.next(-1);
    this.sampleMaskMaps.next(null);
    this.metrics.next([]);
    this.wsZoomBounds.next([]);
    this.playbaleTrackToMetricsMap.next({});
    this.spectrogramWrapper.next(null);
    this.setAudioBlob(null);
    this.sampleMaskParameters.next([]);
    this.plcAlgorithmParameters.next([]);
    this.outputAnalyserParameters.next([]);
  }
}

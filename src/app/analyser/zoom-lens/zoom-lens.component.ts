import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ChartData, ChartOptions } from 'chart.js';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { AnalysisService } from '../analysis.service';
import { DARK_COLORS, LIGHT_COLORS } from '../utils';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { debounceTime, filter, Subject, takeUntil, tap } from 'rxjs';
import {
  extractBitDepthFromWavHeader,
  extractChannelNumberFromWavHeader,
  normalizePcmSegment,
  stripWavBinarySegment,
  stripWavHeader,
} from '../wavUtils';
import { ModuleType } from '../../shared/enums/module-type.enum';
import { ModuleParameter } from '../../shared/interfaces/module-parameters.interface';
import { Module } from '../../shared/interfaces/module.interface';
import { ThemeService } from '../../shared/services/theme.service';

@Component({
  selector: 'plc-zoom-lens',
  imports: [CommonModule, FormsModule, SkeletonModule, ChartModule, SelectModule, ToggleButtonModule],
  templateUrl: './zoom-lens.component.html',
  //   styleUrls: ['./zoom-lens.component.scss'],
})
export class ZoomLensComponent {
  public zoomLensSelectedChannel: boolean = false;

  public zoomSegmentData?: ChartData | null = null;

  public zoomSegmentOptions?: ChartOptions | null = null;

  private normalizedSegmentsCache: any[] = [];

  private allTracksCache: string[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    public analysisService: AnalysisService,
    private themeService: ThemeService,
  ) {}

  get sampleMaskPacketSizes(): any[] {
    return (
      this.analysisService.run.value?.modules[ModuleType.PacketLossSimulator].map(
        (m: Module) => m.settings.filter((mp: ModuleParameter) => mp.name === 'packet_size')[0].value,
      ) ?? []
    );
  }

  get sampleMaskNames(): { label: string; value: number }[] {
    return (
      Object.keys(this.analysisService.sampleMaskMaps.value ?? {}).map((name: string, index: number) => ({
        label: name.split('.')[0],
        value: index,
      })) ?? []
    );
  }

  public ngOnInit(): void {
    this.analysisService.selectedPacketBounds
      .asObservable()
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(150),
        filter((bounds: number[]) => Array.isArray(bounds) && bounds.length === 2),
        tap(([lb, rb, ...blank]) => this.buildSampleLens(lb, rb)),
      )
      .subscribe();

    this.themeService.isDarkMode
      .pipe(
        takeUntil(this.destroy$),
        filter(() => !!this.zoomSegmentData),
        tap(() => this.buildZoomSegmentData()),
      )
      .subscribe();

    this.analysisService.selectedTrackPlayback
      .asObservable()
      .pipe(
        takeUntil(this.destroy$),
        filter((track): track is { name: string } => !!track && !!track.name),
        tap(() => this.destroyZoomLens()),
      )
      .subscribe();
  }

  public onChannelToggle(): void {
    this.buildZoomSegmentData();
  }

  public buildSampleLens(leftBound: number, rightBound: number) {
    const selectedOriginalTrack: string = this.analysisService.selectedOriginalTrack.value;

    const foundTrackGroup = this.analysisService.trackGroups.value.find(
      (t) => t.originalTrack === selectedOriginalTrack,
    );

    const allTracks = foundTrackGroup
      ? [
          ...foundTrackGroup.reconstructedTracks
            .map((r) => r.name)
            .filter((name: string) => {
              const split = name.split('/');
              if (split.length === 1) {
                return true;
              }
              if (
                Object.keys(this.analysisService.sampleMaskMaps.value ?? {}).indexOf(split[1]) ===
                this.analysisService.selectedSampleMaskIndex.value
              ) {
                return true;
              }
              return false;
            }),
        ]
      : [];

    const trackBinaryData = allTracks.map((t) => this.analysisService.trackMaps.value[t]);

    const maskPacketSize = this.sampleMaskPacketSizes[this.analysisService.selectedSampleMaskIndex.value];

    const bitDepth = extractBitDepthFromWavHeader(trackBinaryData[0]);

    const channelNumber = extractChannelNumberFromWavHeader(trackBinaryData[0]);

    const segments = trackBinaryData
      .map(stripWavHeader)
      .map((data) =>
        stripWavBinarySegment(data, leftBound, rightBound, bitDepth, channelNumber, Math.round(maskPacketSize * 1.5)),
      );

    let normalizedSegments = segments.map((seg) => normalizePcmSegment(seg, bitDepth, channelNumber));

    this.normalizedSegmentsCache = normalizedSegments;

    this.allTracksCache = allTracks;

    this.buildZoomSegmentData();
  }

  private buildZoomSegmentData(): void {
    if (!this.normalizedSegmentsCache.length) return;

    const maxAbsoluteValue = Math.max(
      ...this.normalizedSegmentsCache.flatMap((segment) =>
        segment[Number(this.zoomLensSelectedChannel)].map((value: number) => Math.abs(value)),
      ),
    );

    const colorPalette = this.themeService.isDarkMode.value ? DARK_COLORS : LIGHT_COLORS;

    this.zoomSegmentData = {
      labels: Array.from({ length: this.normalizedSegmentsCache[0][0].length }, (_, i) => i.toString()),
      datasets: this.normalizedSegmentsCache.map((t: any, i: number) => ({
        label: this.allTracksCache.map((tn) => tn.split('/')[tn.split('/').length - 1] ?? tn)[
          i % this.normalizedSegmentsCache.length
        ],
        data: t[Number(this.zoomLensSelectedChannel)],
        tension: 0.25,
        borderColor: colorPalette[i % colorPalette.length],
        pointRadius: 2,
        fill: false,
      })),
    };

    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--p-text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--p-text-muted-color');
    const surfaceBorder = documentStyle.getPropertyValue('--p-content-border-color');

    this.zoomSegmentOptions = {
      responsive: true,
      maintainAspectRatio: true,
      animation: false,
      scales: {
        x: { ticks: { autoSkip: true, maxTicksLimit: 8, color: textColorSecondary }, grid: { display: false } },
        y: {
          beginAtZero: true,
          min: -maxAbsoluteValue,
          max: maxAbsoluteValue,
          ticks: { color: textColorSecondary },
          grid: { color: surfaceBorder },
        },
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: textColor,
          },
        },
        zoom: {
          zoom: { mode: 'x', wheel: { enabled: true } },
        },
        tooltip: { intersect: false, mode: 'index' as const },
      },
    };
  }

  private destroyZoomLens() {
    this.zoomSegmentData = null;
    this.zoomSegmentOptions = null;
  }

  public ngOnDestroy(): void {
    this.destroyZoomLens();
    this.destroy$.next();
    this.destroy$.complete();
  }
}

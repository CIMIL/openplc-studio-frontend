import { BehaviorSubject } from 'rxjs';
import { FileDescription } from 'tarparser';
import { AnalysisService } from '../analysis.service';
import { buildTrackSelectionTree } from '../track-selection';
import { ModuleType } from '../../shared/enums/module-type.enum';
import { Module } from '../../shared/interfaces/module.interface';
import { ThemeService } from '../../shared/services/theme.service';
import { ZoomLensComponent } from './zoom-lens.component';

describe('ZoomLensComponent labels', () => {
  it('plots mono data without offering a channel switch, even if Right was previously selected', () => {
    const component = new ZoomLensComponent(
      {} as AnalysisService,
      { isDarkMode: new BehaviorSubject(false) } as ThemeService,
    );
    component.zoomLensSelectedChannel = 'Right';
    (component as any).allTracksCache = ['song.wav'];
    (component as any).normalizedSegmentsCache = [[[0, 0.5]]];

    component.onChannelToggle();

    expect(component.hasMultipleChannels).toBeFalse();
    expect(component.zoomSegmentData?.datasets[0].data).toEqual([0, 0.5]);
  });

  it('uses the track selection discriminators instead of hashed reconstructed filenames', () => {
    const original = file('song.wav');
    const first = file('song/PLS-mask/PLC-first.wav');
    const second = file('song/PLS-mask/PLC-second.wav');
    const plcModules = [module('PLC', 4), module('PLC', 8)];
    const component = new ZoomLensComponent(
      {} as AnalysisService,
      { isDarkMode: new BehaviorSubject(false) } as ThemeService,
    );
    component.trackSelectionTree = buildTrackSelectionTree([original], [first, second], {
      [ModuleType.PacketLossSimulator]: [module('PLS', 1)],
      [ModuleType.PLCAlgorithm]: plcModules,
    });
    (component as any).allTracksCache = [original.name, first.name, second.name];
    (component as any).normalizedSegmentsCache = [[[0, 1]], [[0, 1]], [[0, 1]]];

    component.onChannelToggle();

    expect(component.hasMultipleChannels).toBeFalse();
    expect(component.zoomSegmentData?.datasets.map((dataset) => dataset.label)).toEqual([
      'song.wav',
      'PLC · fade_in=4',
      'PLC · fade_in=8',
    ]);
  });
});

function file(name: string): FileDescription {
  return {
    name,
    type: 'file',
    size: 0,
    data: new Uint8Array(),
    text: '',
    attrs: { mode: '', uid: 0, gid: 0, mtime: 0, user: '', group: '' },
  };
}

function module(name: string, fadeIn: number): Module {
  return { name, settings: [{ name: 'fade_in', value: fadeIn }] } as Module;
}

import { Module } from '../../shared/interfaces/module.interface';
import { packetSizeCompatibilityErrors } from './packet-size-compatibility';

function module(name: string, settings: Record<string, unknown> = {}, supportedPacketSizes?: number[]): Module {
  return {
    name,
    supported_packet_sizes: supportedPacketSizes,
    settings: Object.entries(settings).map(([settingName, value]) => ({ name: settingName, value })),
  };
}

describe('packetSizeCompatibilityErrors', () => {
  it('reports incompatible top-level algorithms with an actionable correction', () => {
    const errors = packetSizeCompatibilityErrors(
      [module('BinomialPLS', { packet_size: 32 })],
      [module('VermaPLC', {}, [128])],
    );

    expect(errors.length).toBe(1);
    expect(errors[0].message).toContain('VermaPLC supports packet size 128');
    expect(errors[0].message).toContain('BinomialPLS uses 32');
    expect(errors[0].message).toContain('Set BinomialPLS packet_size');
  });

  it('accepts supported packet sizes and unrestricted algorithms', () => {
    const errors = packetSizeCompatibilityErrors(
      [module('BinomialPLS', { packet_size: 128 })],
      [module('VermaPLC', {}, [128]), module('ZerosPLC')],
    );

    expect(errors).toEqual([]);
  });

  it('checks algorithms nested in AdvancedPLC band settings', () => {
    const nestedParcnet = module('PARCnetPLC', {}, [512]);
    const advanced = module('AdvancedPLC', { band_settings: { left: [nestedParcnet] } });

    const errors = packetSizeCompatibilityErrors([module('BinomialPLS', { packet_size: 128 })], [advanced]);

    expect(errors.length).toBe(1);
    expect(errors[0].algorithmLocation).toBe('AdvancedPLC.band_settings.left[0].PARCnetPLC');
  });

  it('checks every selected loss simulator', () => {
    const errors = packetSizeCompatibilityErrors(
      [module('CompatiblePLS', { packet_size: 128 }), module('IncompatiblePLS', { packet_size: 64 })],
      [module('VermaPLC', {}, [128])],
    );

    expect(errors.map((error) => error.simulatorName)).toEqual(['IncompatiblePLS']);
  });
});

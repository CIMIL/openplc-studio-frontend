import { Module } from '../../shared/interfaces/module.interface';
import { SettingValue } from '../../shared/interfaces/module-parameters.interface';

export interface PacketSizeCompatibilityError {
  algorithmLocation: string;
  algorithmName: string;
  simulatorName: string;
  packetSize: number;
  supportedPacketSizes: number[];
  message: string;
}

function settingValue(module: Module, settingName: string): SettingValue | undefined {
  return module.settings.find((setting) => setting.name === settingName)?.value as SettingValue | undefined;
}

function constrainedAlgorithms(
  module: Module,
  location: string,
  depth = 0,
): Array<{ location: string; name: string; supportedPacketSizes: number[] }> {
  if (depth > 3) return [];

  const algorithms = module.supported_packet_sizes?.length
    ? [{ location, name: module.name, supportedPacketSizes: module.supported_packet_sizes }]
    : [];
  const bandSettings = settingValue(module, 'band_settings');
  if (!bandSettings || typeof bandSettings !== 'object' || Array.isArray(bandSettings)) return algorithms;

  for (const [channel, nestedModules] of Object.entries(bandSettings)) {
    if (!Array.isArray(nestedModules)) continue;
    nestedModules.forEach((nestedModule, index) => {
      if (!nestedModule || typeof nestedModule !== 'object' || !('name' in nestedModule)) return;
      // SAFETY: serialized nested PLC settings use the same {name, settings, metadata} contract as Module.
      const plc = nestedModule as unknown as Module;
      algorithms.push(
        ...constrainedAlgorithms(plc, `${location}.band_settings.${channel}[${index}].${plc.name}`, depth + 1),
      );
    });
  }
  return algorithms;
}

export function packetSizeCompatibilityErrors(
  packetLossSimulators: Module[],
  plcAlgorithms: Module[],
): PacketSizeCompatibilityError[] {
  const simulators = packetLossSimulators.flatMap((simulator) => {
    const packetSize = settingValue(simulator, 'packet_size');
    return typeof packetSize === 'number' && Number.isInteger(packetSize) ? [{ name: simulator.name, packetSize }] : [];
  });
  const algorithms = plcAlgorithms.flatMap((algorithm) => constrainedAlgorithms(algorithm, algorithm.name));
  const seen = new Set<string>();

  return algorithms.flatMap((algorithm) =>
    simulators.flatMap((simulator) => {
      if (algorithm.supportedPacketSizes.includes(simulator.packetSize)) return [];
      const key = `${algorithm.location}\u0000${simulator.name}\u0000${simulator.packetSize}`;
      if (seen.has(key)) return [];
      seen.add(key);

      const supportedLabel = algorithm.supportedPacketSizes.join(', ');
      const requirement =
        algorithm.supportedPacketSizes.length === 1
          ? `packet size ${supportedLabel}`
          : `one of packet sizes ${supportedLabel}`;
      return [
        {
          algorithmLocation: algorithm.location,
          algorithmName: algorithm.name,
          simulatorName: simulator.name,
          packetSize: simulator.packetSize,
          supportedPacketSizes: algorithm.supportedPacketSizes,
          message: `${algorithm.location} supports ${requirement}, but ${simulator.name} uses ${simulator.packetSize}. Set ${simulator.name} packet_size to a supported value or remove ${algorithm.name}.`,
        },
      ];
    }),
  );
}

import { ModuleType } from '../enums/module-type.enum';

export interface ModuleDocumentationTarget {
  path: string;
  fragment: string;
}

const referencePageByModuleType: Record<ModuleType, string> = {
  [ModuleType.PacketLossSimulator]: 'loss_simulator',
  [ModuleType.PLCAlgorithm]: 'plc_algorithm',
  [ModuleType.OutputAnalyser]: 'output_analyser',
  [ModuleType.CrossfadeSettings]: 'settings',
};

export function moduleDocumentationTarget(moduleType: ModuleType, moduleName: string): ModuleDocumentationTarget {
  const referencePage = referencePageByModuleType[moduleType];
  return {
    path: `reference/${referencePage}/`,
    fragment: `plctestbench.${referencePage}.${moduleName}`,
  };
}

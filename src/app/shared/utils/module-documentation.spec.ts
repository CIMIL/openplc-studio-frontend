import { ModuleType } from '../enums/module-type.enum';
import { moduleDocumentationTarget } from './module-documentation';

describe('moduleDocumentationTarget', () => {
  it('targets the selected PLC algorithm section', () => {
    expect(moduleDocumentationTarget(ModuleType.PLCAlgorithm, 'BurgPLC')).toEqual({
      path: 'reference/plc_algorithm/',
      fragment: 'plctestbench.plc_algorithm.BurgPLC',
    });
  });

  it('maps each configurable module type to its package reference page', () => {
    expect(moduleDocumentationTarget(ModuleType.PacketLossSimulator, 'BinomialPLS').path).toBe(
      'reference/loss_simulator/',
    );
    expect(moduleDocumentationTarget(ModuleType.OutputAnalyser, 'PEAQCalculator').path).toBe(
      'reference/output_analyser/',
    );
    expect(moduleDocumentationTarget(ModuleType.CrossfadeSettings, 'LinearCrossfadeSettings').path).toBe(
      'reference/settings/',
    );
  });
});

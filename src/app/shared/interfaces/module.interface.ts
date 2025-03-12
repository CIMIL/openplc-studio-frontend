import { ModuleParameter, ModuleParameterSpec } from './module-parameters.interface';

export interface Module {
  name: string;
  testbench_node_id: string;
  settings: (ModuleParameter | ModuleParameterSpec)[];
}

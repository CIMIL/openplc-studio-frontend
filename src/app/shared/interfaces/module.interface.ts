import { ModuleParameter, ModuleParameterSpec } from './module-parameters.interface';

export interface Module {
  name: string;
  settings: (ModuleParameter | ModuleParameterSpec)[];
}

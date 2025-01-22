import { ModuleParameters } from './module-parameters.interface';

export interface Module {
  name: string;
  settings: ModuleParameters[];
}

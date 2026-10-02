import { ModuleConstraint, ModuleParameter, ModuleParameterSpec } from './module-parameters.interface';

export interface Module {
  name: string;
  is_plugin?: boolean;
  node_ids?: string[];
  settings: (ModuleParameter | ModuleParameterSpec)[];
  constraints?: ModuleConstraint[];
  supported_packet_sizes?: number[] | null;
}

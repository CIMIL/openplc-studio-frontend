export interface ModuleParameterSpec {
  name: string;
  type: string;
  default: any;
  value?: any;
  availableValues?: any[];
}
export interface ModuleParameter {
  name: string;
  value?: any;
}

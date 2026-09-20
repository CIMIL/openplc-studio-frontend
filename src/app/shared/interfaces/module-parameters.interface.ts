export interface ParameterValidation {
  min?: number | null;
  max?: number | null;
  step?: number | null;
  exclusive_min?: boolean;
  exclusive_max?: boolean;
  min_length?: number | null;
  max_length?: number | null;
  pattern?: string | null;
  min_items?: number | null;
  max_items?: number | null;
  unique?: boolean;
  sorted?: 'ascending' | 'descending' | null;
  item?: ParameterValidation | null;
}

export interface ModuleConstraint {
  type: 'less_than' | 'length_relation' | 'keys_match' | 'per_key_length_relation';
  setting: string;
  related_setting?: string | null;
  offset?: number | null;
  allowed_key_sets?: string[][] | null;
  message?: string | null;
}

export type SettingValue = string | number | boolean | null | SettingValue[] | { [key: string]: SettingValue };

export type ModuleValues = { [key: string]: SettingValue };

export interface ModuleParameterSpec {
  name: string;
  type: string;
  default: any;
  value?: any;
  availableValues?: any[];
  validation?: ParameterValidation;
}

export interface ModuleParameter {
  name: string;
  value?: any;
}

export type PluginStatus = 'available' | 'invalid';

export interface PluginSetting {
  name: string;
  type: string;
  default: unknown;
  values: unknown[] | null;
}

export interface PluginConstraint {
  type: string;
  setting: string;
  relatedSetting: string | null;
  message: string | null;
}

export interface PluginSpec {
  name: string;
  settings: PluginSetting[];
  constraints: PluginConstraint[];
}

export interface PluginInventoryItem {
  filename: string;
  status: PluginStatus;
  moduleType: string;
  spec: PluginSpec | null;
  error: string | null;
}

export interface PluginInventory {
  scannedAt: string;
  items: PluginInventoryItem[];
}

export interface PluginInventoryDto {
  scanned_at: string;
  items: Array<{
    filename: string;
    status: PluginStatus;
    module_type: string;
    spec: {
      name: string;
      settings: Array<{ name: string; type: string; default: unknown; values: unknown[] | null }>;
      constraints: Array<{
        type: string;
        setting: string;
        related_setting: string | null;
        message: string | null;
      }>;
    } | null;
    error: string | null;
  }>;
}

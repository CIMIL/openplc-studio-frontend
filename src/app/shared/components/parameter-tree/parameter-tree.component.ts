import { NgTemplateOutlet } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ModuleParameter, ModuleParameterSpec } from '../../interfaces/module-parameters.interface';

type SettingLike = ModuleParameter | ModuleParameterSpec;

@Component({
  selector: 'plc-parameter-tree',
  imports: [NgTemplateOutlet],
  templateUrl: './parameter-tree.component.html',
  styleUrl: './parameter-tree.component.scss',
})
export class ParameterTreeComponent {
  @Input() public settings: SettingLike[] | null = null;

  public displayValue(setting: SettingLike | null | undefined): any {
    if (!setting) {
      return null;
    }
    if (Object.prototype.hasOwnProperty.call(setting, 'value')) {
      return (setting as ModuleParameter).value;
    }
    return (setting as ModuleParameterSpec).default;
  }

  public isArray(value: any): boolean {
    return Array.isArray(value);
  }

  public isModuleLike(value: any): boolean {
    return (
      !!value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof value.name === 'string' &&
      Array.isArray(value.settings)
    );
  }

  public isPlainObject(value: any): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value) && !this.isModuleLike(value);
  }

  public isScalarArray(value: any): boolean {
    return Array.isArray(value) && value.every((item) => item === null || typeof item !== 'object');
  }

  public entries(value: any): { key: string; value: any }[] {
    if (!value || typeof value !== 'object') {
      return [];
    }
    return Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => ({
      key,
      value: entryValue as any,
    }));
  }

  public formatScalar(value: any): string {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { PluginInventory, PluginInventoryDto } from '../interfaces/plugin.interface';

@Injectable({ providedIn: 'root' })
export class PluginsClient {
  private readonly api = '/api/plugins';

  constructor(private readonly http: HttpClient) {}

  public getPlugins(): Observable<PluginInventory> {
    return this.http.get<PluginInventoryDto>(this.api).pipe(
      map((dto) => ({
        scannedAt: dto.scanned_at,
        items: dto.items.map((item) => ({
          filename: item.filename,
          status: item.status,
          moduleType: item.module_type,
          error: item.error,
          spec: item.spec
            ? {
                name: item.spec.name,
                settings: item.spec.settings,
                constraints: item.spec.constraints.map((constraint) => ({
                  type: constraint.type,
                  setting: constraint.setting,
                  relatedSetting: constraint.related_setting,
                  message: constraint.message,
                })),
              }
            : null,
        })),
      })),
    );
  }
}

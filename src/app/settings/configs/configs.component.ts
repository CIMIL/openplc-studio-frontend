import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TABLE_PAGE_SIZES, TablePageSize, ThemeMode } from '../../shared/interfaces/app-preferences.interface';
import { AppPreferencesService } from '../../shared/services/app-preferences.service';

@Component({
  selector: 'plc-configs',
  standalone: true,
  imports: [FormsModule, SelectModule, ToggleSwitchModule],
  templateUrl: './configs.component.html',
  styleUrl: './configs.component.scss',
})
export class ConfigsComponent {
  public readonly themeOptions: Array<{ label: string; value: ThemeMode }> = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'System', value: 'system' },
  ];
  public readonly pageSizeOptions = TABLE_PAGE_SIZES.map((value) => ({ label: `${value} rows`, value }));

  constructor(public readonly preferencesService: AppPreferencesService) {}

  public get themeMode(): ThemeMode {
    return this.preferencesService.value.themeMode;
  }

  public set themeMode(themeMode: ThemeMode) {
    this.preferencesService.update({ themeMode });
  }

  public get historyPageSize(): TablePageSize {
    return this.preferencesService.value.historyPageSize;
  }

  public set historyPageSize(historyPageSize: TablePageSize) {
    this.preferencesService.update({ historyPageSize });
  }

  public get assetsPageSize(): TablePageSize {
    return this.preferencesService.value.assetsPageSize;
  }

  public set assetsPageSize(assetsPageSize: TablePageSize) {
    this.preferencesService.update({ assetsPageSize });
  }

  public get runCompletionNotifications(): boolean {
    return this.preferencesService.value.runCompletionNotifications;
  }

  public set runCompletionNotifications(runCompletionNotifications: boolean) {
    this.preferencesService.update({ runCompletionNotifications });
  }
}

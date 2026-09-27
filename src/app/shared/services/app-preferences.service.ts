import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppPreferences, TABLE_PAGE_SIZES, TablePageSize, ThemeMode } from '../interfaces/app-preferences.interface';
import { LocalStorageService } from './local-storage.service';

interface StoredPreferences {
  version: 1;
  preferences: Partial<AppPreferences>;
}

const STORAGE_KEY = 'appPreferences';
const LEGACY_THEME_KEY = 'isDarkMode';

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  themeMode: 'light',
  historyPageSize: 10,
  assetsPageSize: 25,
  runCompletionNotifications: true,
};

@Injectable({ providedIn: 'root' })
export class AppPreferencesService {
  private readonly subject: BehaviorSubject<AppPreferences>;
  public readonly preferences$;

  constructor(private readonly localStorageService: LocalStorageService) {
    const preferences = this.loadPreferences();
    this.subject = new BehaviorSubject(preferences);
    this.preferences$ = this.subject.asObservable();
    this.persist(preferences);
  }

  public get value(): AppPreferences {
    return this.subject.value;
  }

  public update(patch: Partial<AppPreferences>): void {
    const preferences = this.normalize({ ...this.value, ...patch });
    this.persist(preferences);
    this.subject.next(preferences);
  }

  private loadPreferences(): AppPreferences {
    const stored = this.localStorageService.get<StoredPreferences>(STORAGE_KEY);
    if (stored?.version === 1 && stored.preferences && typeof stored.preferences === 'object') {
      return this.normalize(stored.preferences);
    }

    const legacyDarkMode = this.localStorageService.get<boolean>(LEGACY_THEME_KEY);
    this.localStorageService.remove(LEGACY_THEME_KEY);
    let themeMode = DEFAULT_APP_PREFERENCES.themeMode;
    if (legacyDarkMode !== null) themeMode = legacyDarkMode ? 'dark' : 'light';
    return this.normalize({ themeMode });
  }

  private normalize(value: Partial<AppPreferences>): AppPreferences {
    return {
      themeMode: this.isThemeMode(value.themeMode) ? value.themeMode : DEFAULT_APP_PREFERENCES.themeMode,
      historyPageSize: this.isPageSize(value.historyPageSize)
        ? value.historyPageSize
        : DEFAULT_APP_PREFERENCES.historyPageSize,
      assetsPageSize: this.isPageSize(value.assetsPageSize)
        ? value.assetsPageSize
        : DEFAULT_APP_PREFERENCES.assetsPageSize,
      runCompletionNotifications:
        typeof value.runCompletionNotifications === 'boolean'
          ? value.runCompletionNotifications
          : DEFAULT_APP_PREFERENCES.runCompletionNotifications,
    };
  }

  private persist(preferences: AppPreferences): void {
    this.localStorageService.put<StoredPreferences>(STORAGE_KEY, { version: 1, preferences });
  }

  private isThemeMode(value: unknown): value is ThemeMode {
    return value === 'light' || value === 'dark' || value === 'system';
  }

  private isPageSize(value: unknown): value is TablePageSize {
    return TABLE_PAGE_SIZES.includes(value as TablePageSize);
  }
}

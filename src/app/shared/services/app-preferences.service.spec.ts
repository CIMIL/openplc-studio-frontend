import { AppPreferencesService, DEFAULT_APP_PREFERENCES } from './app-preferences.service';
import { LocalStorageService } from './local-storage.service';

describe('AppPreferencesService', () => {
  let values: Record<string, unknown>;
  let storage: jasmine.SpyObj<LocalStorageService>;

  beforeEach(() => {
    values = {};
    storage = jasmine.createSpyObj<LocalStorageService>('LocalStorageService', ['get', 'put', 'remove']);
    storage.get.and.callFake((key: string) => (key in values ? values[key] : null) as never);
    storage.put.and.callFake((key: string, value: unknown) => {
      values[key] = value;
    });
    storage.remove.and.callFake((key: string) => {
      delete values[key];
    });
  });

  it('uses and persists current defaults', () => {
    const service = new AppPreferencesService(storage);

    expect(service.value).toEqual(DEFAULT_APP_PREFERENCES);
    expect(values['appPreferences']).toEqual({ version: 1, preferences: DEFAULT_APP_PREFERENCES });
  });

  it('migrates the legacy dark mode preference', () => {
    values['isDarkMode'] = true;

    const service = new AppPreferencesService(storage);

    expect(service.value.themeMode).toBe('dark');
    expect(storage.remove).toHaveBeenCalledWith('isDarkMode');
  });

  it('falls back field-by-field for unsupported stored values', () => {
    values['appPreferences'] = {
      version: 1,
      preferences: {
        themeMode: 'sepia',
        historyPageSize: 100,
        assetsPageSize: 50,
        runCompletionNotifications: false,
      },
    };

    const service = new AppPreferencesService(storage);

    expect(service.value).toEqual({
      themeMode: 'light',
      historyPageSize: 10,
      assetsPageSize: 50,
      runCompletionNotifications: false,
    });
  });

  it('publishes and persists updates immediately', () => {
    const service = new AppPreferencesService(storage);
    const observed: number[] = [];
    service.preferences$.subscribe((preferences) => observed.push(preferences.historyPageSize));

    service.update({ historyPageSize: 25 });

    expect(service.value.historyPageSize).toBe(25);
    expect(observed).toEqual([10, 25]);
    expect(values['appPreferences']).toEqual({ version: 1, preferences: service.value });
  });
});

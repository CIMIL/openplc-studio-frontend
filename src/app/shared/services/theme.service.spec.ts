import { BehaviorSubject } from 'rxjs';
import { AppPreferences } from '../interfaces/app-preferences.interface';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let preferencesSubject: BehaviorSubject<AppPreferences>;
  let preferencesService: any;
  let mediaQuery: { matches: boolean; addEventListener: jasmine.Spy };
  let mediaListener: () => void = () => undefined;

  beforeEach(() => {
    document.documentElement.classList.remove('my-app-dark');
    preferencesSubject = new BehaviorSubject<AppPreferences>({
      themeMode: 'light',
      historyPageSize: 10,
      assetsPageSize: 25,
      runCompletionNotifications: true,
    });
    preferencesService = {
      preferences$: preferencesSubject.asObservable(),
      get value() {
        return preferencesSubject.value;
      },
      update: jasmine.createSpy('update').and.callFake((patch: Partial<AppPreferences>) => {
        preferencesSubject.next({ ...preferencesSubject.value, ...patch });
      }),
    };
    mediaQuery = {
      matches: false,
      addEventListener: jasmine.createSpy('addEventListener').and.callFake((_event: string, listener: () => void) => {
        mediaListener = listener;
      }),
    };
    spyOn(window, 'matchMedia').and.returnValue(mediaQuery as any);
  });

  it('applies explicit dark and light themes', () => {
    const service = new ThemeService(preferencesService);

    service.setMode('dark');
    expect(document.documentElement.classList.contains('my-app-dark')).toBeTrue();
    expect(service.isDarkMode.value).toBeTrue();

    service.setMode('light');
    expect(document.documentElement.classList.contains('my-app-dark')).toBeFalse();
  });

  it('follows system theme changes in system mode', () => {
    const service = new ThemeService(preferencesService);
    service.setMode('system');

    mediaQuery.matches = true;
    mediaListener();

    expect(service.isDarkMode.value).toBeTrue();
    expect(document.documentElement.classList.contains('my-app-dark')).toBeTrue();
  });

  it('exits system mode when toggled', () => {
    mediaQuery.matches = true;
    preferencesSubject.next({ ...preferencesSubject.value, themeMode: 'system' });
    const service = new ThemeService(preferencesService);

    service.toggle();

    expect(preferencesService.update).toHaveBeenCalledWith({ themeMode: 'light' });
  });
});

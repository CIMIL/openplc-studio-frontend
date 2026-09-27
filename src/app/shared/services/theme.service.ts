import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ThemeMode } from '../interfaces/app-preferences.interface';
import { AppPreferencesService } from './app-preferences.service';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  public readonly isDarkMode = new BehaviorSubject<boolean>(false);

  private readonly mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  constructor(private readonly preferencesService: AppPreferencesService) {
    this.preferencesService.preferences$.subscribe(({ themeMode }) => this.applyMode(themeMode));
    this.mediaQuery.addEventListener('change', () => {
      if (this.preferencesService.value.themeMode === 'system') this.applyMode('system');
    });
  }

  public setMode(mode: ThemeMode): void {
    this.preferencesService.update({ themeMode: mode });
  }

  public toggle(): void {
    this.setMode(this.isDarkMode.value ? 'light' : 'dark');
  }

  private applyMode(mode: ThemeMode): void {
    const isDark = mode === 'dark' || (mode === 'system' && this.mediaQuery.matches);
    document.documentElement.classList.toggle('my-app-dark', isDark);
    if (this.isDarkMode.value !== isDark) this.isDarkMode.next(isDark);
  }
}

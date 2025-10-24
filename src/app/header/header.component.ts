import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { LocalStorageService } from '../shared/services/local-storage.service';
import { Toolbar } from 'primeng/toolbar';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ThemeService } from '../shared/services/theme.service';
import { MenubarModule } from 'primeng/menubar';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'plc-header',
  imports: [CommonModule, ButtonModule, ToggleButtonModule, FormsModule, Toolbar],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  private _isDarkMode = false;

  public items: MenuItem[] | undefined;

  constructor(
    private readonly localStorageService: LocalStorageService,
    public readonly router: Router,
    private readonly themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    this.isDarkMode = this.localStorageService.get<boolean>('isDarkMode') ?? false;
  }

  public get isDarkMode(): boolean {
    return this._isDarkMode;
  }

  public set isDarkMode(value: boolean) {
    this._isDarkMode = value;
    this.localStorageService.put('isDarkMode', value);
    this.setDarkMode(value);
    this.themeService.isDarkMode.next(value);
  }

  public toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
  }

  public setDarkMode(value: boolean): void {
    const element: HTMLHtmlElement | null = document.querySelector('html');
    if (value) {
      element?.classList.add('my-app-dark');
    } else {
      element?.classList.remove('my-app-dark');
    }
  }
}

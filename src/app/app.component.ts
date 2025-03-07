import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { LocalStorageService } from './shared/services/local-storage.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonModule, ToggleButtonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  public title = 'PLC Testbench Platform';
  private _isDarkMode = false;

  constructor(private readonly localStorageService: LocalStorageService) {}

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

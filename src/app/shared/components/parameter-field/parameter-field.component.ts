import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ModuleParameterSpec } from '../../interfaces/module-parameters.interface';
import { parameterError } from '../../utils/parameter-validation';

@Component({
  selector: 'plc-parameter-field',
  imports: [
    CommonModule,
    FormsModule,
    InputNumberModule,
    InputTextModule,
    CheckboxModule,
    SelectModule,
    AutoCompleteModule,
  ],
  templateUrl: './parameter-field.component.html',
  styleUrl: './parameter-field.component.scss',
})
export class ParameterFieldComponent {
  @Input() public param!: ModuleParameterSpec;

  @Output() public valueChanged = new EventEmitter<void>();

  private _suggestions: number[] = [];

  public filteredSuggestions: number[] = [];

  @Input()
  public set suggestions(value: number[]) {
    this._suggestions = value;
    this.filteredSuggestions = value;
  }

  public get suggestions(): number[] {
    return this._suggestions;
  }

  public get error(): string | null {
    return parameterError(this.param);
  }

  public onSearch(event: AutoCompleteCompleteEvent): void {
    this.filteredSuggestions = this.suggestions.filter((suggestion) => suggestion.toString().includes(event.query));
  }

  public notifyValueChanged(): void {
    this.valueChanged.emit();
  }

  public coerceListIntegers(value: unknown): void {
    if (Array.isArray(value)) {
      this.param.value = value.map((item) => (typeof item === 'number' ? item : Number(item)));
    }
    this.notifyValueChanged();
  }
}

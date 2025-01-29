import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ModulesService } from '../../shared/clients/modules.service';
import { BehaviorSubject, map, Subject, takeUntil, tap } from 'rxjs';
import { StepperModule } from 'primeng/stepper';
import { SplitterModule } from 'primeng/splitter';
import { ListboxModule } from 'primeng/listbox';
import { CommonModule } from '@angular/common';
import { MultiSelectModule } from 'primeng/multiselect';
import { ChipModule } from 'primeng/chip';
import { FormsModule } from '@angular/forms';
import { ModuleParameters } from '../../shared/interfaces/module-parameters.interface';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { KeyFilterModule } from 'primeng/keyfilter';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { Module } from '../../shared/interfaces/module.interface';
import { ModuleType } from '../../shared/enums/module-type.enum';
import { SelectModule } from 'primeng/select';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';

const suggestedBands: number[] = [200, 1000, 2000];

@Component({
  selector: 'plc-module-configurator',
  templateUrl: './module-configurator.component.html',
  styleUrls: ['./module-configurator.component.scss'],
  imports: [
    CommonModule,
    ButtonModule,
    StepperModule,
    SplitterModule,
    ListboxModule,
    MultiSelectModule,
    ChipModule,
    FormsModule,
    InputGroupModule,
    InputGroupAddonModule,
    KeyFilterModule,
    InputNumberModule,
    CheckboxModule,
    SelectModule,
    AutoCompleteModule,
  ],
})
export class ModuleConfiguratorComponent implements OnInit {
  @Input()
  public moduleType!: ModuleType;

  @Input()
  public modulesSelection!: Module[];

  @Output()
  public modulesSelectionChange = new EventEmitter<Module[]>();

  public modules: BehaviorSubject<Module[]> = new BehaviorSubject<Module[]>([]);

  public moduleFocus!: Module;

  public suggestedBands: string[] = [];
  private readonly unsubAll$ = new Subject<void>();

  constructor(private readonly modulesService: ModulesService) {}

  get availableModules(): Module[] {
    return this.modules.value;
  }

  ngOnInit(): void {
    this.modulesService
      .getModuleTypes(this.moduleType)
      .pipe(
        takeUntil(this.unsubAll$),
        map((modules: Module[]) =>
          modules.map((module: Module) => ({
            ...module,
            settings: module.settings.map((setting: any) => ({
              ...setting,
              value: setting.default,
              availableValues: setting.available_values,
            })),
          }))
        ),
        tap((modules: Module[]) => this.modules.next(modules))
      )
      .subscribe();
  }

  public resetDefault(param: ModuleParameters): void {
    param.value = param.default;
  }

  public search(event: AutoCompleteCompleteEvent) {
    this.suggestedBands = suggestedBands.map((b) => b.toString()).filter((band) => band.includes(event.query));
  }

  ngOnDestroy(): void {
    this.modulesSelectionChange.emit(this.modulesSelection);

    this.unsubAll$.next();
    this.unsubAll$.complete();
  }
}

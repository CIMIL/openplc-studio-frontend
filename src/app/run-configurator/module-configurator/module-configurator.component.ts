import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ModulesClient } from '../../shared/clients/modules.client';
import { BehaviorSubject, filter, map, Subject, takeUntil, tap } from 'rxjs';
import { StepperModule } from 'primeng/stepper';
import { SplitterModule } from 'primeng/splitter';
import { ListboxModule } from 'primeng/listbox';
import { CommonModule } from '@angular/common';
import { MultiSelectModule } from 'primeng/multiselect';
import { ChipModule } from 'primeng/chip';
import { FormsModule } from '@angular/forms';
import { ModuleParameter, ModuleParameterSpec } from '../../shared/interfaces/module-parameters.interface';
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

const crossfadeNameParameters: string[] = ['crossfade', 'fade_in'];

export type ModuleWithCount = Module & {
  id?: number;
};

type GroupedModules = { label: string; items: Module[] };

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
  public modulesSelection!: ModuleWithCount[];

  public crossfadeModulesSelection!: ModuleWithCount[];

  @Output()
  public modulesSelectionChange = new EventEmitter<Module[]>();

  public modules: BehaviorSubject<ModuleWithCount[]> = new BehaviorSubject<ModuleWithCount[]>([]);

  public moduleFocus: ModuleWithCount | null = null;

  public suggestedBands: string[] = [];

  public selectedModuleProxy: ModuleWithCount | null = null;

  public selectedModuleCounter: number = 0;

  public availableModulesFilter: ModuleWithCount[] = [];

  public crossfadeModules: BehaviorSubject<ModuleWithCount[]> = new BehaviorSubject<ModuleWithCount[]>([]);

  public crossfadeModuleFocus!: ModuleWithCount | null;

  public selectedCrossfadeModuleProxy: ModuleWithCount | null = null;

  public selectedCrossfadeModuleCounter: number = 0;

  public availableCrossfadeModulesFilter: ModuleWithCount[] = [];

  private readonly unsubAll$ = new Subject<void>();

  constructor(private readonly modulesService: ModulesClient) {}

  get availableModules(): ModuleWithCount[] {
    return this.modules.value;
  }

  get availableCrossfadeModules(): ModuleWithCount[] {
    return this.crossfadeModules.value;
  }

  get groupedCrossfadeModulesOfSelectedModule(): GroupedModules[] {
    const groupedCrossfadeModules = this.moduleFocus?.settings
      .filter((setting) => crossfadeNameParameters.includes(setting.name))
      .map((setting) => ({ label: setting.name, items: (setting.value ?? []) as Module[] }));
    return groupedCrossfadeModules ?? [];
  }

  get isAnyCrossfadeModuleSelected(): boolean {
    return !!this.moduleFocus?.settings.some(
      (setting) =>
        crossfadeNameParameters.includes(setting.name) &&
        (Array.isArray(setting.value) ? setting.value.length > 0 : false)
    );
  }

  ngOnInit(): void {
    const transformModules = (modules: ModuleWithCount[]) =>
      modules.map((module: ModuleWithCount) => ({
        ...module,
        settings: module.settings.map((setting: any) => ({
          ...setting,
          value: setting.default,
          availableValues: setting.values,
        })),
      }));

    this.modulesService
      .getModuleTypes(this.moduleType)
      .pipe(
        takeUntil(this.unsubAll$),
        map(transformModules),
        tap((modules: ModuleWithCount[]) => this.modules.next(modules))
      )
      .subscribe();

    if (this.moduleType === ModuleType.PLCAlgorithm) {
      this.modulesService
        .getModuleTypes(ModuleType.CrossfadeSettings)
        .pipe(
          takeUntil(this.unsubAll$),
          map(transformModules),
          tap((modules: ModuleWithCount[]) => this.crossfadeModules.next(modules))
        )
        .subscribe();
    }
  }

  public resetDefault(param: ModuleParameterSpec): void {
    param.value = param?.default;
  }

  public searchBands(event: AutoCompleteCompleteEvent) {
    this.suggestedBands = suggestedBands.map((b) => b.toString()).filter((band) => band.includes(event.query));
  }

  public searchModules(event: AutoCompleteCompleteEvent) {
    this.availableModulesFilter = this.availableModules.filter((m) => m.name.toLocaleLowerCase().includes(event.query));
  }

  public addModule(module: ModuleWithCount | null): void {
    if (!module) {
      return;
    }

    this.modulesSelection.push({
      ...module,
      settings: module.settings.map((param) => ({ ...param })),
      id: this.selectedModuleCounter++,
    });

    this.selectedModuleProxy = null;
  }

  public removeFromModulesSelection(moduleIndex: number): void {
    if (this.modulesSelection[moduleIndex]?.id === this.moduleFocus?.id) {
      this.moduleFocus = null;
    }
    this.modulesSelection.splice(moduleIndex, 1);
  }

  public searchCrossfadeModules(event: AutoCompleteCompleteEvent) {
    this.availableCrossfadeModulesFilter = this.availableCrossfadeModules.filter((m) =>
      m.name.toLocaleLowerCase().includes(event.query)
    );
  }

  public addCrossfadeModule(crossfadeModule: ModuleWithCount | null, paramName: string): void {
    if (!crossfadeModule) {
      return;
    }

    const parentModuleSetting = this.moduleFocus?.settings.find((setting) => setting.name === paramName);
    if (parentModuleSetting) {
      parentModuleSetting.value = parentModuleSetting.value || [];
      parentModuleSetting.value.push({
        ...crossfadeModule,
        settings: crossfadeModule.settings.map((param) => ({ ...param })),
        id: this.selectedCrossfadeModuleCounter++,
      });
    }

    this.selectedCrossfadeModuleProxy = null;
  }

  public removeFromCrossfadeModulesSelection(moduleId: number): void {
    const crossfadeModuleParentList: ModuleWithCount[][] =
      this.moduleFocus?.settings
        .filter((s) => crossfadeNameParameters.includes(s.name) && s.value !== null)
        .map((s) => s.value ?? []) ?? [];

    const crossfadeModuleList = crossfadeModuleParentList.find((s) => s.some((module) => module.id === moduleId)) ?? [];

    const moduleToRemoveIndex: number = crossfadeModuleList.findIndex((module) => module.id === moduleId) ?? -1;

    if (moduleToRemoveIndex === -1 || crossfadeModuleList.length === 0) {
      return;
    }

    if (crossfadeModuleList[moduleToRemoveIndex]?.id === this.crossfadeModuleFocus?.id) {
      this.crossfadeModuleFocus = null;
    }
    crossfadeModuleList.splice(moduleToRemoveIndex, 1);
  }

  ngOnDestroy(): void {
    this.modulesSelectionChange.emit(this.modulesSelection);

    this.unsubAll$.next();
    this.unsubAll$.complete();
  }
}

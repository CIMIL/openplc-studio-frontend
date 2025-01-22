import { Component, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ModulesService } from '../shared/clients/modules.service';
import { BehaviorSubject, switchMap, tap } from 'rxjs';
import { ModuleType } from '../shared/enums/module-type.enum';
import { StepperModule } from 'primeng/stepper';
import { SplitterModule } from 'primeng/splitter';
import { ListboxModule } from 'primeng/listbox';
import { CommonModule } from '@angular/common';
import { MultiSelectModule } from 'primeng/multiselect';
import { ChipModule } from 'primeng/chip';
import { FormsModule } from '@angular/forms';
import { Module } from '../shared/interfaces/module.interface';

@Component({
  selector: 'plc-run-configurator',
  templateUrl: './run-configurator.component.html',
  styleUrls: ['./run-configurator.component.scss'],
  imports: [
    CommonModule,
    ButtonModule,
    StepperModule,
    SplitterModule,
    ListboxModule,
    MultiSelectModule,
    ChipModule,
    FormsModule,
  ],
})
export class RunConfiguratorComponent implements OnInit {
  public modules: BehaviorSubject<Module[]> = new BehaviorSubject<Module[]>([]);

  public modulesSelection: Module[] = [];

  public moduleFocus!: Module;

  constructor(private readonly modulesService: ModulesService) {}

  get availableModules(): Module[] {
    return this.modules.value;
  }

  ngOnInit(): void {
    this.modulesService
      .getModuleTypes(ModuleType.PacketLossSimulator)
      .pipe(tap((types: Module[]) => this.modules.next(types)))
      .subscribe();
  }
}

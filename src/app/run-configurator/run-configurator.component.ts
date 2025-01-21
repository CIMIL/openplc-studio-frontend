import { Component, OnInit } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ModulesService } from '../shared/clients/modules.service';
import { BehaviorSubject } from 'rxjs';
import { ModuleType } from '../shared/enums/module-type.enum';
import { StepperModule } from 'primeng/stepper';
import { SplitterModule } from 'primeng/splitter';

interface RunConfiguration {
  name: string;
  description: string;
  parameters: any; // Define specific parameter type based on your needs
}

@Component({
  selector: 'app-run-configurator',
  templateUrl: './run-configurator.component.html',
  styleUrls: ['./run-configurator.component.scss'],
  imports: [
    ButtonModule,
    InputTextModule,
    TextareaModule,
    AccordionModule,
    DropdownModule,
    StepperModule,
    SplitterModule,
  ],
})
export class RunConfiguratorComponent implements OnInit {
  public moduleTypes$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);

  constructor(private readonly modulesService: ModulesService) {}

  get packetLossSimulators(): string[] {
    return this.moduleTypes$.value;
  }

  ngOnInit(): void {
    this.modulesService
      .getModuleTypes(ModuleType.PacketLossSimulator)
      .subscribe((types: string[]) => this.moduleTypes$.next(types));
  }
}

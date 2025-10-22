import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ModuleWithCount } from './module-configurator/module-configurator.component';
import { ModuleType } from '../shared/enums/module-type.enum';

@Injectable({ providedIn: 'root' })
export class RunConfiguratorService {
  public modulesSelection = new BehaviorSubject<Record<ModuleType, ModuleWithCount[]>>({
    [ModuleType.PacketLossSimulator]: [],
    [ModuleType.PLCAlgorithm]: [],
    [ModuleType.OutputAnalyser]: [],
    [ModuleType.CrossfadeSettings]: [],
  });
  public dioporco = new BehaviorSubject<ModuleWithCount[]>([]);
}

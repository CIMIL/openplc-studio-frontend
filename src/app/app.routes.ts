import { Routes } from '@angular/router';
import { AnalyserComponent } from './analyser/analyser.component';
import { RunConfiguratorComponent } from './run-configurator/run-configurator.component';

export const routes: Routes = [
  {
    path: 'analyser',
    component: AnalyserComponent,
  },
  {
    path: 'run-configurator',
    component: RunConfiguratorComponent,
  },
];

import { Routes } from '@angular/router';
import { AnalyserComponent } from './analyser/analyser.component';
import { RunConfiguratorComponent } from './run-configurator/run-configurator.component';
import { BacklogComponent } from './backlog/backlog.component';

export const routes: Routes = [
  {
    path: 'analyzer/:id',
    component: AnalyserComponent,
  },
  {
    path: 'run-configurator',
    component: RunConfiguratorComponent,
  },
  {
    path: 'backlog',
    component: BacklogComponent,
  },
];

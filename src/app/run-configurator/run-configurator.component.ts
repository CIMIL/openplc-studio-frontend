import { Component, OnInit } from '@angular/core';
import { ModuleConfiguratorComponent } from './module-configurator/module-configurator.component';

@Component({
  selector: 'plc-run-configurator',
  templateUrl: './run-configurator.component.html',
  styleUrls: ['./run-configurator.component.scss'],
  imports: [ModuleConfiguratorComponent],
})
export class RunConfiguratorComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}

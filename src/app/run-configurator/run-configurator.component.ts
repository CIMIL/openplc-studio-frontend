import { Component, OnInit } from '@angular/core';
import { ModuleConfiguratorComponent } from './module-configurator/module-configurator.component';
import { ModuleType } from '../shared/enums/module-type.enum';
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { Module } from '../shared/interfaces/module.interface';
import { RunStatus } from '../shared/enums/run-status.enum';
import { Run } from '../shared/interfaces/run.interface';
import { RunsClient } from '../shared/clients/runs.service';

@Component({
  selector: 'plc-run-configurator',
  templateUrl: './run-configurator.component.html',
  styleUrls: ['./run-configurator.component.scss'],
  imports: [ModuleConfiguratorComponent, CommonModule, StepperModule, ButtonModule],
})
export class RunConfiguratorComponent implements OnInit {
  public ModuleType: typeof ModuleType = ModuleType;

  private _packetLossSimulatorsConfig: Module[] = [];

  private _PLCAlgorithmsConfig: Module[] = [];

  private _outputAnalysersConfig: Module[] = [];

  constructor(private readonly runsClient: RunsClient) {}

  public get packetLossSimulatorsConfig(): Module[] {
    return this._packetLossSimulatorsConfig;
  }

  public set packetLossSimulatorsConfig(value: Module[]) {
    this._packetLossSimulatorsConfig = value;
  }

  public get PLCAlgorithmsConfig(): Module[] {
    return this._PLCAlgorithmsConfig;
  }

  public set PLCAlgorithmsConfig(value: Module[]) {
    this._PLCAlgorithmsConfig = value;
  }

  public get outputAnalysersConfig(): Module[] {
    return this._outputAnalysersConfig;
  }

  public set outputAnalysersConfig(value: Module[]) {
    this._outputAnalysersConfig = value;
  }

  public updatePacketLossSimulatorsConfig(modules: Module[]): void {
    this.packetLossSimulatorsConfig = modules;
  }

  public updatePLCAlgorithmsConfig(modules: Module[]): void {
    this.PLCAlgorithmsConfig = modules;
  }

  public updateOutputAnalysersConfig(modules: Module[]): void {
    this.outputAnalysersConfig = modules;
  }

  get isConfigurationValid(): boolean {
    if (
      this.packetLossSimulatorsConfig.length < 1 ||
      this.PLCAlgorithmsConfig.length < 1 ||
      this.outputAnalysersConfig.length < 1
    ) {
      return false;
    }

    return true;
  }

  ngOnInit(): void {}

  public createRun(): void {
    const run: Run = {
      author: 'default',
      name: 'default',
      status: RunStatus.CREATED,
      modules: {
        [ModuleType.PacketLossSimulator]: this.packetLossSimulatorsConfig,
        [ModuleType.PLCAlgorithm]: this.PLCAlgorithmsConfig,
        [ModuleType.OutputAnalyser]: this.outputAnalysersConfig,
      },
    };

    this.runsClient.createRun(run).subscribe((createdRun) => {
      console.log('Run created:', createdRun);
    });
  }
}

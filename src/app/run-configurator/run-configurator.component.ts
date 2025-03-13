import { Component, OnInit } from '@angular/core';
import { ModuleConfiguratorComponent } from './module-configurator/module-configurator.component';
import { ModuleType } from '../shared/enums/module-type.enum';
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { Module } from '../shared/interfaces/module.interface';
import { RunStatus } from '../shared/enums/run-status.enum';
import { Run } from '../shared/interfaces/run.interface';
import { RunsClient } from '../shared/clients/runs.client';
import { InputTextModule } from 'primeng/inputtext';
import { LEFT, RIGHT } from './run-names-blueprint';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { tap } from 'rxjs';
import { AudioTrackPickerComponent } from './audio-track-picker/audio-track-picker.component';

@Component({
  selector: 'plc-run-configurator',
  templateUrl: './run-configurator.component.html',
  styleUrls: ['./run-configurator.component.scss'],
  imports: [
    ModuleConfiguratorComponent,
    CommonModule,
    FormsModule,
    StepperModule,
    ButtonModule,
    InputTextModule,
    ToastModule,
    AudioTrackPickerComponent,
  ],
  providers: [MessageService],
})
export class RunConfiguratorComponent implements OnInit {
  public ModuleType: typeof ModuleType = ModuleType;

  public runName: string = this.generateRandomRunName();

  private _packetLossSimulatorsConfig: Module[] = [];

  private _PLCAlgorithmsConfig: Module[] = [];

  private _outputAnalysersConfig: Module[] = [];

  constructor(private readonly runsClient: RunsClient, private readonly messageService: MessageService) {}

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

  private mapSpecToConfig(modules: Module[]): Module[] {
    return modules.map((m) => ({
      ...m,
      settings: m.settings.map((s) => ({ name: s.name, value: s.value })),
    }));
  }

  public createRun(): void {
    const run: Run = {
      author: 'default',
      name: this.runName,
      status: RunStatus.CREATED,
      modules: {
        [ModuleType.PacketLossSimulator]: this.mapSpecToConfig(this.packetLossSimulatorsConfig),
        [ModuleType.PLCAlgorithm]: this.mapSpecToConfig(this.PLCAlgorithmsConfig),
        [ModuleType.OutputAnalyser]: this.mapSpecToConfig(this.outputAnalysersConfig),
      },
    };

    this.runsClient
      .createRun(run)
      .pipe(
        tap((createdRun: Run) =>
          this.messageService.add({
            severity: 'info',
            summary: 'Created',
            detail: `Run ${createdRun.name} was created`,
          })
        )
      )
      .subscribe();
  }

  public generateRandomRunName(): string {
    return `${LEFT[Math.floor(Math.random() * LEFT.length)]} ${RIGHT[Math.floor(Math.random() * RIGHT.length)]}`;
  }
}

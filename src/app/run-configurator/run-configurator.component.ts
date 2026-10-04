import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ModuleConfiguratorComponent, ModuleWithCount } from './module-configurator/module-configurator.component';
import { ModuleType } from '../shared/enums/module-type.enum';
import { RunStatus } from '../shared/enums/run-status.enum';
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { Module } from '../shared/interfaces/module.interface';
import { Run } from '../shared/interfaces/run.interface';
import { RunsClient } from '../shared/clients/runs.client';
import { InputTextModule } from 'primeng/inputtext';
import { LEFT, RIGHT } from './run-names-blueprint';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { catchError, finalize, forkJoin, of, switchMap, tap } from 'rxjs';
import { AudioTrackPickerComponent } from './audio-track-picker/audio-track-picker.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ModuleParameter, ModuleParameterSpec } from '../shared/interfaces/module-parameters.interface';
import { InputGroupModule } from 'primeng/inputgroup';
import { RunConfiguratorService } from './run-configurator.service';
import { ModulesClient } from '../shared/clients/modules.client';
import {
  packetSizeCompatibilityErrors,
  PacketSizeCompatibilityError,
} from './module-configurator/packet-size-compatibility';

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
    AudioTrackPickerComponent,
    InputGroupModule,
  ],
  providers: [],
})
export class RunConfiguratorComponent implements OnInit {
  public ModuleType: typeof ModuleType = ModuleType;

  public runName: string = this.generateRandomRunName();
  public submitting = false;
  public retrySourceLoading = false;

  private _audioTracksConfig: string[] = [];

  constructor(
    private readonly runsClient: RunsClient,
    private readonly modulesClient: ModulesClient,
    private readonly messageService: MessageService,
    private readonly router: Router,
    public runConfigService: RunConfiguratorService,
    private readonly route?: ActivatedRoute,
  ) {}

  get packetLossSimulatorConfig(): ModuleWithCount[] {
    return this.runConfigService.modulesSelection.value[ModuleType.PacketLossSimulator];
  }

  get PLCAlgorithmConfig(): ModuleWithCount[] {
    return this.runConfigService.modulesSelection.value[ModuleType.PLCAlgorithm];
  }

  get outputAnalyserConfig(): ModuleWithCount[] {
    return this.runConfigService.modulesSelection.value[ModuleType.OutputAnalyser];
  }

  public get audioTracksConfig(): string[] {
    return this._audioTracksConfig;
  }

  public set audioTracksConfig(value: string[]) {
    this._audioTracksConfig = value;
  }

  public updateAudioTracksConfig(tracks: string[]): void {
    this.audioTracksConfig = tracks;
  }

  get packetSizeCompatibilityErrors(): PacketSizeCompatibilityError[] {
    return packetSizeCompatibilityErrors(this.packetLossSimulatorConfig, this.PLCAlgorithmConfig);
  }

  get isConfigurationValid(): boolean {
    if (
      this.audioTracksConfig.length < 1 ||
      this.packetLossSimulatorConfig.length < 1 ||
      this.PLCAlgorithmConfig.length < 1 ||
      this.outputAnalyserConfig.length < 1
    ) {
      return false;
    }

    return this.packetSizeCompatibilityErrors.length === 0;
  }

  ngOnInit(): void {
    const retryRunId = this.route?.snapshot.queryParamMap?.get('retryRunId');
    if (!retryRunId) return;

    this.retrySourceLoading = true;
    this.runConfigService.resetModuleSelection();
    this.audioTracksConfig = [];
    this.runsClient
      .getRun(retryRunId)
      .pipe(finalize(() => (this.retrySourceLoading = false)))
      .subscribe({
        next: (run) => {
          if (run.status !== RunStatus.FAILED) {
            this.showRetryLoadError('Only failed runs can be adjusted and retried.');
            return;
          }
          this.preloadConfiguration(
            {
              name: `${run.name} (retry)`,
              tracks: [...run.tracks],
              modules: Object.fromEntries(
                Object.entries(run.modules).map(([type, modules]) => [
                  type,
                  modules.map((module) => ({
                    name: module.name,
                    settings: module.settings.map((setting) => ({ ...setting })),
                  })),
                ]),
              ),
            },
            'Retry configuration loaded',
            'Could not load retry',
          );
        },
        error: () => this.showRetryLoadError('The failed run could not be loaded.'),
      });
  }

  private isModuleArray(val: unknown): val is Module[] {
    return Array.isArray(val) && val.every((v) => v && typeof v === 'object' && 'name' in v && 'settings' in v);
  }

  private isSpecArray(val: unknown): val is ModuleParameterSpec[] {
    return (
      Array.isArray(val) &&
      val.every((v) => v && typeof v === 'object' && 'name' in v && ('default' in v || 'value' in v))
    );
  }

  private toParameter = (s: ModuleParameterSpec | ModuleParameter): ModuleParameter => ({
    name: s.name,
    value: (s as ModuleParameter).value ?? (s as ModuleParameterSpec).default,
  });

  private mapSpecToConfig(modules: Module[]): Module[] {
    return modules.map((m: Module) => ({
      ...m,
      settings: m.settings.map((s: ModuleParameter | ModuleParameterSpec) => {
        const val = (s as any).value;
        if (this.isModuleArray(val)) {
          return {
            name: s.name,
            value: val.map((xf: Module) => ({
              name: xf.name,
              settings: xf.settings.map(this.toParameter),
            })),
          };
        }
        if (this.isSpecArray(val)) {
          return {
            name: s.name,
            value: val.map(this.toParameter),
          };
        }
        return this.toParameter(s);
      }),
    }));
  }

  private validationErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse) || error.status !== 422) {
      return 'The run could not be created. Please try again.';
    }

    if (typeof error.error?.detail === 'string') return error.error.detail;
    if (!Array.isArray(error.error?.detail)) return 'The run configuration is invalid.';

    const messages = error.error.detail
      .map((detail: { module_name?: string; setting?: string | null; error?: string }) => {
        const location = [detail.module_name, detail.setting].filter(Boolean).join('.');
        return detail.error ? `${location}: ${detail.error}` : null;
      })
      .filter((message: string | null): message is string => message !== null);

    return messages.length ? messages.join(' ') : 'The run configuration is invalid.';
  }

  public createRun(execute: boolean): void {
    if (this.submitting) return;

    const run = {
      author: 'default',
      name: this.runName,
      tracks: this.audioTracksConfig,
      modules: {
        [ModuleType.PacketLossSimulator]: this.mapSpecToConfig(this.packetLossSimulatorConfig),
        [ModuleType.PLCAlgorithm]: this.mapSpecToConfig(this.PLCAlgorithmConfig),
        [ModuleType.OutputAnalyser]: this.mapSpecToConfig(this.outputAnalyserConfig),
      },
    };

    this.submitting = true;
    this.runsClient
      .createRun(run)
      .pipe(
        tap((createdRun: Run) => {
          this.messageService.add({
            severity: 'info',
            summary: 'Created',
            detail: `Run ${createdRun.name} was created`,
          });
          this.runConfigService.resetModuleSelection();
        }),
        switchMap((createdRun: Run) => {
          if (!execute) return of(createdRun);

          return this.runsClient.executeRun(createdRun.id).pipe(
            tap(() =>
              this.messageService.add({
                severity: 'success',
                summary: 'Queued',
                detail: `Run ${createdRun.name} was queued for execution`,
              }),
            ),
            catchError(() => {
              this.messageService.add({
                severity: 'warn',
                summary: 'Run saved',
                detail: 'The run was saved but could not be queued. You can execute it from the progress page.',
              });
              return of(createdRun);
            }),
          );
        }),
        tap((createdRun: Run) => this.router.navigate(['/run-progress', createdRun.id])),
        finalize(() => (this.submitting = false)),
      )
      .subscribe({
        error: (error: unknown) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Invalid run configuration',
            detail: this.validationErrorMessage(error),
          });
        },
      });
  }

  public generateRandomRunName(): string {
    return `${LEFT[Math.floor(Math.random() * LEFT.length)]} ${RIGHT[Math.floor(Math.random() * RIGHT.length)]}`;
  }

  //sends config file to the backend for validation,
  //if valid, preloads the config into the configurator

  public onUploadConfig(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const config = JSON.parse(reader.result as string);
        this.preloadConfiguration(config, `Configuration "${config.name}" loaded successfully`);
      } catch {
        this.messageService.add({
          severity: 'error',
          summary: 'Invalid file',
          detail: 'The file is not a valid JSON',
        });
      }
    };
    reader.readAsText(file);
  }

  private preloadConfiguration(
    config: { name: string; tracks: string[]; modules: Record<string, Module[]> },
    successDetail: string,
    errorSummary = 'Invalid config',
  ): void {
    this.runsClient
      .validateRunConfig(config)
      .pipe(
        switchMap((validatedConfig: any) =>
          forkJoin({
            [ModuleType.PacketLossSimulator]: this.modulesClient.getModuleTypes(ModuleType.PacketLossSimulator),
            [ModuleType.PLCAlgorithm]: this.modulesClient.getModuleTypes(ModuleType.PLCAlgorithm),
            [ModuleType.OutputAnalyser]: this.modulesClient.getModuleTypes(ModuleType.OutputAnalyser),
            [ModuleType.CrossfadeSettings]: this.modulesClient.getModuleTypes(ModuleType.CrossfadeSettings),
          }).pipe(
            tap((specs: any) => {
              const hydrateModule = (module: any, moduleType: ModuleType): any => {
                const spec = (specs[moduleType] ?? []).find((candidate: any) => candidate.name === module.name);
                if (!spec) return module;
                return {
                  ...spec,
                  settings: spec.settings.map((specParam: any) => {
                    const configParam = module.settings.find((parameter: any) => parameter.name === specParam.name);
                    let value = configParam?.value ?? specParam.default;
                    if (
                      specParam.type === 'dict_str_list_PLCSettings' &&
                      value &&
                      typeof value === 'object' &&
                      !Array.isArray(value)
                    ) {
                      value = Object.fromEntries(
                        Object.entries(value).map(([channel, modules]) => [
                          channel,
                          Array.isArray(modules)
                            ? modules.map((nestedModule) => hydrateModule(nestedModule, ModuleType.PLCAlgorithm))
                            : modules,
                        ]),
                      );
                    } else if (specParam.type === 'list_CrossfadeSettings' && Array.isArray(value)) {
                      value = value.map((nestedModule) => hydrateModule(nestedModule, ModuleType.CrossfadeSettings));
                    }
                    return { ...specParam, value, availableValues: specParam.values };
                  }),
                };
              };

              const enriched: any = {};
              for (const moduleType of Object.values(ModuleType)) {
                const configModules = validatedConfig.modules[moduleType] ?? [];
                enriched[moduleType] = configModules.map((module: any) => hydrateModule(module, moduleType));
              }
              this.runName = validatedConfig.name;
              this.audioTracksConfig = validatedConfig.tracks;
              this.runConfigService.preloadConfig({ ...validatedConfig, modules: enriched });
              this.messageService.add({ severity: 'success', summary: 'Config loaded', detail: successDetail });
            }),
          ),
        ),
      )
      .subscribe({
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: errorSummary,
            detail: 'The configuration is invalid or contains unknown modules.',
          }),
      });
  }

  private showRetryLoadError(detail: string): void {
    this.runConfigService.resetModuleSelection();
    this.audioTracksConfig = [];
    this.messageService.add({ severity: 'error', summary: 'Could not load retry', detail });
  }
}

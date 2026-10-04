import { of, throwError } from 'rxjs';
import { ModuleType } from '../shared/enums/module-type.enum';
import { RunStatus } from '../shared/enums/run-status.enum';
import { RunConfiguratorComponent } from './run-configurator.component';
import { RunConfiguratorService } from './run-configurator.service';

const createdRun = {
  id: 'run-1',
  created: '2026-01-01T12:00:00Z',
  updated: '2026-01-01T12:00:00Z',
  author: 'default',
  name: 'Deferred run',
  testbenchInternalId: 'internal-1',
  status: RunStatus.CREATED,
  tracks: ['track.wav'],
  modules: {
    [ModuleType.PacketLossSimulator]: [{ name: 'PLS', node_ids: ['pls-1'], settings: [] }],
    [ModuleType.PLCAlgorithm]: [{ name: 'PLC', node_ids: ['plc-1'], settings: [] }],
    [ModuleType.OutputAnalyser]: [{ name: 'Output', node_ids: ['out-1'], settings: [] }],
  },
};

describe('RunConfiguratorComponent submission', () => {
  let component: RunConfiguratorComponent;
  let runsClient: jasmine.SpyObj<any>;
  let messageService: jasmine.SpyObj<any>;
  let router: jasmine.SpyObj<any>;
  let modulesClient: jasmine.SpyObj<any>;
  let runConfigService: RunConfiguratorService;

  beforeEach(() => {
    runsClient = jasmine.createSpyObj('RunsClient', ['createRun', 'executeRun', 'getRun', 'validateRunConfig']);
    messageService = jasmine.createSpyObj('MessageService', ['add']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    modulesClient = jasmine.createSpyObj('ModulesClient', ['getModuleTypes']);
    runConfigService = new RunConfiguratorService();
    runConfigService.modulesSelection.next({
      [ModuleType.PacketLossSimulator]: [{ id: 0, name: 'PLS', settings: [] }],
      [ModuleType.PLCAlgorithm]: [{ id: 0, name: 'PLC', settings: [] }],
      [ModuleType.OutputAnalyser]: [{ id: 0, name: 'Output', settings: [] }],
      [ModuleType.CrossfadeSettings]: [],
    });

    component = new RunConfiguratorComponent(runsClient, modulesClient, messageService, router, runConfigService);
    component.runName = createdRun.name;
    component.audioTracksConfig = createdRun.tracks;
  });

  it('loads a failed run into the configurator for adjustment without generated node IDs', () => {
    const failedRun = { ...createdRun, status: RunStatus.FAILED };
    runsClient.getRun.and.returnValue(of(failedRun));
    runsClient.validateRunConfig.and.callFake((config: unknown) => of(config));
    modulesClient.getModuleTypes.and.callFake((type: ModuleType) =>
      of(
        type === ModuleType.CrossfadeSettings
          ? []
          : failedRun.modules[type].map((module) => ({ ...module, node_ids: [], settings: [] })),
      ),
    );
    component = new RunConfiguratorComponent(runsClient, modulesClient, messageService, router, runConfigService, {
      snapshot: { queryParamMap: { get: () => failedRun.id } },
    } as any);

    component.ngOnInit();

    expect(component.runName).toBe(`${failedRun.name} (retry)`);
    expect(component.audioTracksConfig).toEqual(failedRun.tracks);
    expect(runConfigService.modulesSelection.value[ModuleType.PacketLossSimulator][0].node_ids).toEqual([]);
  });

  it('disables creation when a PLC algorithm does not support the simulator packet size', () => {
    runConfigService.modulesSelection.next({
      ...runConfigService.modulesSelection.value,
      [ModuleType.PacketLossSimulator]: [
        { id: 0, name: 'BinomialPLS', settings: [{ name: 'packet_size', value: 32 }] },
      ],
      [ModuleType.PLCAlgorithm]: [{ id: 0, name: 'VermaPLC', settings: [], supported_packet_sizes: [128] }],
    });

    expect(component.isConfigurationValid).toBeFalse();
    expect(component.packetSizeCompatibilityErrors[0].message).toContain('Set BinomialPLS packet_size');
  });

  it('enables creation after the packet size is corrected', () => {
    runConfigService.modulesSelection.next({
      ...runConfigService.modulesSelection.value,
      [ModuleType.PacketLossSimulator]: [
        { id: 0, name: 'BinomialPLS', settings: [{ name: 'packet_size', value: 128 }] },
      ],
      [ModuleType.PLCAlgorithm]: [{ id: 0, name: 'VermaPLC', settings: [], supported_packet_sizes: [128] }],
    });

    expect(component.isConfigurationValid).toBeTrue();
  });

  it('saves without executing', () => {
    runsClient.createRun.and.returnValue(of(createdRun));

    component.runActions[0].command!({ originalEvent: new Event('click'), item: component.runActions[0] });

    expect(runsClient.createRun).toHaveBeenCalledTimes(1);
    expect(runsClient.executeRun).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledOnceWith(['/run-progress', createdRun.id]);
  });

  it('saves and then executes', () => {
    runsClient.createRun.and.returnValue(of(createdRun));
    runsClient.executeRun.and.returnValue(of({ ...createdRun, status: RunStatus.QUEUED }));

    component.createRun(true);

    expect(runsClient.executeRun).toHaveBeenCalledOnceWith(createdRun.id);
    expect(router.navigate).toHaveBeenCalledOnceWith(['/run-progress', createdRun.id]);
  });

  it('navigates to the saved run when queueing fails', () => {
    runsClient.createRun.and.returnValue(of(createdRun));
    runsClient.executeRun.and.returnValue(throwError(() => new Error('broker unavailable')));

    component.createRun(true);

    expect(router.navigate).toHaveBeenCalledOnceWith(['/run-progress', createdRun.id]);
    expect(messageService.add).toHaveBeenCalledWith(
      jasmine.objectContaining({ summary: 'Run saved', severity: 'warn' }),
    );
  });
});

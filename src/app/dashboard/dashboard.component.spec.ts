import { fakeAsync, tick } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ModuleType } from '../shared/enums/module-type.enum';
import { RunStatus } from '../shared/enums/run-status.enum';
import { Run, RunDashboardSummary } from '../shared/interfaces/run.interface';
import { DashboardComponent } from './dashboard.component';

function makeRun(status: RunStatus = RunStatus.RUNNING): Run {
  return {
    id: `run-${status}`,
    created: '2026-01-08T10:00:00Z',
    updated: '2026-01-08T11:00:00Z',
    author: 'tester',
    name: `${status} run`,
    testbenchInternalId: 'internal-id',
    status,
    tracks: ['one.wav', 'two.wav'],
    modules: {
      [ModuleType.PacketLossSimulator]: [{ name: 'BinomialPLS', settings: [] }],
      [ModuleType.PLCAlgorithm]: [
        { name: 'ZerosPLC', settings: [] },
        { name: 'BurgPLC', settings: [] },
      ],
      [ModuleType.OutputAnalyser]: [{ name: 'PEAQ', settings: [] }],
    },
  };
}

const dashboardSummary: RunDashboardSummary = {
  generatedAt: '2026-01-08T12:00:00Z',
  recentWindowDays: 7,
  counts: { running: 1, queued: 2, completedRecent: 3, failedRecent: 1 },
  activeRuns: [makeRun()],
  recentRuns: [makeRun(RunStatus.COMPLETED)],
  failedRuns: [makeRun(RunStatus.FAILED)],
};

describe('DashboardComponent', () => {
  let runsClient: jasmine.SpyObj<any>;
  let router: jasmine.SpyObj<any>;
  let stateChanges$: Subject<any>;
  let component: DashboardComponent;

  beforeEach(() => {
    runsClient = jasmine.createSpyObj('RunsClient', ['getDashboardSummary']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    stateChanges$ = new Subject();
    runsClient.getDashboardSummary.and.returnValue(of(dashboardSummary));
    component = new DashboardComponent(
      runsClient,
      { getStateChangeMessages: () => stateChanges$.asObservable() } as any,
      router,
    );
  });

  it('loads the dashboard snapshot and exposes configuration counts', () => {
    component.ngOnInit();

    expect(component.summary).toEqual(dashboardSummary);
    expect(component.loading).toBeFalse();
    expect(component.moduleCount(dashboardSummary.activeRuns[0], ModuleType.PLCAlgorithm)).toBe(2);
  });

  it('opens completed runs in analysis and other runs in progress', () => {
    component.openRecentRun(makeRun(RunStatus.COMPLETED));
    expect(router.navigate).toHaveBeenCalledWith(['/analyzer', 'run-completed']);

    component.openRecentRun(makeRun(RunStatus.FAILED));
    expect(router.navigate).toHaveBeenCalledWith(['/run-progress', 'run-failed']);
  });

  it('shows an initial error and retries successfully', () => {
    runsClient.getDashboardSummary.and.returnValue(throwError(() => new Error('offline')));
    component.ngOnInit();

    expect(component.loadError).toBeTrue();
    expect(component.summary).toBeNull();

    runsClient.getDashboardSummary.and.returnValue(of(dashboardSummary));
    component.retry();

    expect(component.loadError).toBeFalse();
    expect(component.summary).toEqual(dashboardSummary);
  });

  it('keeps the last snapshot when a refresh fails', fakeAsync(() => {
    component.ngOnInit();
    runsClient.getDashboardSummary.and.returnValue(throwError(() => new Error('offline')));

    stateChanges$.next({ run_id: 'run-1', new_status: RunStatus.RUNNING });
    tick(101);

    expect(component.summary).toEqual(dashboardSummary);
    expect(component.stale).toBeTrue();
  }));

  it('refreshes on state changes and unsubscribes on destroy', fakeAsync(() => {
    component.ngOnInit();
    expect(runsClient.getDashboardSummary).toHaveBeenCalledTimes(1);

    stateChanges$.next({ run_id: 'run-1', new_status: RunStatus.COMPLETED });
    tick(101);
    expect(runsClient.getDashboardSummary).toHaveBeenCalledTimes(2);

    component.ngOnDestroy();
    stateChanges$.next({ run_id: 'run-2', new_status: RunStatus.FAILED });
    tick(101);
    expect(runsClient.getDashboardSummary).toHaveBeenCalledTimes(2);
  }));
});

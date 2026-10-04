import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ModuleType } from '../enums/module-type.enum';
import { RunStatus } from '../enums/run-status.enum';
import { RunsClient } from './runs.client';

const runDto = {
  id: 'run-1',
  created: '2026-01-08T10:00:00Z',
  updated: '2026-01-08T11:00:00Z',
  author: 'tester',
  name: 'Dashboard run',
  testbench_internal_id: 'internal-1',
  status: RunStatus.RUNNING,
  tracks: ['track.wav'],
  modules: {
    [ModuleType.PacketLossSimulator]: [],
    [ModuleType.PLCAlgorithm]: [],
    [ModuleType.OutputAnalyser]: [],
  },
};

describe('RunsClient dashboard summary', () => {
  let client: RunsClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    client = TestBed.inject(RunsClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts a retry request and maps the new run', () => {
    let result: any;
    client.retryRun('failed-run').subscribe((run) => (result = run));

    const request = http.expectOne('/api/runs/failed-run/retry');
    expect(request.request.method).toBe('POST');
    request.flush({ ...runDto, id: 'retry-run', status: RunStatus.QUEUED });

    expect(result.id).toBe('retry-run');
    expect(result.status).toBe(RunStatus.QUEUED);
  });

  it('loads and maps the dashboard snapshot', () => {
    let result: any;
    client.getDashboardSummary().subscribe((summary) => (result = summary));

    const request = http.expectOne('/api/runs/dashboard/summary');
    expect(request.request.method).toBe('GET');
    request.flush({
      generated_at: '2026-01-08T12:00:00Z',
      recent_window_days: 7,
      counts: { running: 1, queued: 0, completed_recent: 4, failed_recent: 0 },
      active_runs: [runDto],
      recent_runs: [runDto],
      failed_runs: [],
    });

    expect(result.generatedAt).toBe('2026-01-08T12:00:00Z');
    expect(result.recentWindowDays).toBe(7);
    expect(result.counts.completedRecent).toBe(4);
    expect(result.activeRuns[0].testbenchInternalId).toBe('internal-1');
    expect(result.failedRuns).toEqual([]);
  });
});

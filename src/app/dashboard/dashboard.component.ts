import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { catchError, debounceTime, map, merge, of, Subject, switchMap, takeUntil } from 'rxjs';
import { RunsClient } from '../shared/clients/runs.client';
import { RunStatusBadgeComponent } from '../shared/components/run-status-badge/run-status-badge.component';
import { ModuleType } from '../shared/enums/module-type.enum';
import { RunStatus } from '../shared/enums/run-status.enum';
import { Run, RunDashboardSummary } from '../shared/interfaces/run.interface';
import { WsService } from '../shared/services/ws.service';

type DashboardModuleType = Exclude<ModuleType, ModuleType.CrossfadeSettings>;

@Component({
  selector: 'plc-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule, TooltipModule, RunStatusBadgeComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  public summary: RunDashboardSummary | null = null;
  public loading = true;
  public loadError = false;
  public stale = false;

  public readonly ModuleType = ModuleType;
  public readonly RunStatus = RunStatus;

  private readonly refreshRequests$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly runsClient: RunsClient,
    private readonly wsService: WsService,
    private readonly router: Router,
  ) {}

  public ngOnInit(): void {
    const stateChanges$ = this.wsService.getStateChangeMessages().pipe(
      debounceTime(100),
      map(() => undefined),
    );

    merge(of(undefined), this.refreshRequests$, stateChanges$)
      .pipe(
        switchMap(() =>
          this.runsClient.getDashboardSummary().pipe(
            map((summary) => ({ summary, failed: false as const })),
            catchError(() => of({ summary: null, failed: true as const })),
          ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe((result) => {
        this.loading = false;
        if (!result.failed && result.summary) {
          this.summary = result.summary;
          this.loadError = false;
          this.stale = false;
          return;
        }

        if (this.summary) {
          this.stale = true;
        } else {
          this.loadError = true;
        }
      });
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public retry(): void {
    if (!this.summary) this.loading = true;
    this.loadError = false;
    this.stale = false;
    this.refreshRequests$.next();
  }

  public moduleCount(run: Run, type: DashboardModuleType): number {
    return run.modules[type]?.length ?? 0;
  }

  public openProgress(run: Run): void {
    this.router.navigate(['/run-progress', run.id]);
  }

  public openRecentRun(run: Run): void {
    if (run.status === RunStatus.COMPLETED) {
      this.router.navigate(['/analyzer', run.id]);
      return;
    }
    this.openProgress(run);
  }
}

import { Component, OnInit } from '@angular/core';
import { RunsClient } from '../shared/clients/runs.client';
import { Run, RunPage } from '../shared/interfaces/run.interface';
import { tap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { RunStatusBadgeComponent } from '../shared/components/run-status-badge/run-status-badge.component';
import { Router } from '@angular/router';

@Component({
  selector: 'plc-backlog',
  imports: [TableModule, ButtonModule, TagModule, CommonModule, RunStatusBadgeComponent, TooltipModule],
  standalone: true,
  templateUrl: './backlog.component.html',
  styleUrl: './backlog.component.scss',
})
export class BacklogComponent implements OnInit {
  public runs: Run[] = [];
  public totalRecords = 0;
  public rows = 10;
  public first = 0;
  public loading = false;
  public loaded = false;

  constructor(
    private runsClient: RunsClient,
    public router: Router,
  ) {}

  ngOnInit(): void {
    // The lazy p-table emits its initial `onLazyLoad` when it renders, which
    // triggers the first fetch. Fetching here as well would duplicate it.
  }

  public loadRuns(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.rows;
    const first = event.first ?? 0;
    const page = Math.floor(first / rows) + 1;

    this.loading = true;
    this.runsClient.getRunsPage(page, rows).subscribe({
      next: (pageResult: RunPage) => {
        this.runs = pageResult.items;
        this.totalRecords = pageResult.total;
        this.rows = rows;
        this.first = first;
        this.loaded = true;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  public onAnalyse(run: Run): void {
    this.router.navigate(['analyzer', run.id]);
  }

  public onViewProgress(run: Run): void {
    this.router.navigate(['run-progress', run.id]);
  }

  // Download the run configuration as a JSON file
  public onDownloadConfig(run: Run): void {
    this.runsClient
      .exportRunConfig(run.id)
      .pipe(
        tap((blob: Blob) => {
          const url = URL.createObjectURL(blob); // Create a temporary URL for the blob
          const a = document.createElement('a');
          a.href = url;
          a.download = `${run.name}_config.json`;
          a.click();
          URL.revokeObjectURL(url);
        }),
      )
      .subscribe();
  }
}

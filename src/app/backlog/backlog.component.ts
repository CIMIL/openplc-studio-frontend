import { Component, OnInit } from '@angular/core';
import { RunsClient } from '../shared/clients/runs.client';
import { Run } from '../shared/interfaces/run.interface';
import { tap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { RunStatusBadgeComponent } from '../shared/components/run-status-badge/run-status-badge.component';

@Component({
  selector: 'plc-backlog',
  imports: [TableModule, ButtonModule, TagModule, CommonModule, RunStatusBadgeComponent],
  templateUrl: './backlog.component.html',
  styleUrl: './backlog.component.scss',
})
export class BacklogComponent implements OnInit {
  public runs!: Run[];

  constructor(private runsClient: RunsClient) {}

  ngOnInit() {
    this.getAllRuns();
  }

  public getAllRuns(): void {
    this.runsClient
      .getAllRuns()
      .pipe(
        tap((runs) => {
          this.runs = runs;
        })
      )
      .subscribe();
  }
}

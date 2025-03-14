import { Component, Input } from '@angular/core';
import { RunStatus } from '../../enums/run-status.enum';
import { TagModule } from 'primeng/tag';
import { CommonModule } from '@angular/common';
import { RunStatusBadgeSeverityPipe } from './run-status-badge-severity.pipe';

@Component({
  selector: 'plc-run-status-badge',
  imports: [TagModule, CommonModule, RunStatusBadgeSeverityPipe],
  templateUrl: './run-status-badge.component.html',
  styleUrl: './run-status-badge.component.scss',
})
export class RunStatusBadgeComponent {
  @Input()
  public runStatus: RunStatus = RunStatus.CREATED;

  public RunStatus: typeof RunStatus = RunStatus;
}

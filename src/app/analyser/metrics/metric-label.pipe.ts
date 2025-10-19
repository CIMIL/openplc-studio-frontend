import { Pipe, PipeTransform } from '@angular/core';
import { MetricRaw } from '../analysis.service';

export function metricLabelTransform(metric: MetricRaw) {
  return metric.name.split('.')[0].split('/').pop() ?? '';
}

@Pipe({ name: 'metricLabel' })
export class MetricLabelPipe implements PipeTransform {
  transform(metric: MetricRaw): string {
    return metricLabelTransform(metric);
  }
}

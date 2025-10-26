import { Pipe, PipeTransform } from '@angular/core';
import { FileDescription } from 'tarparser';

export function reconstructedTrackLabelTransform(name: string) {
  return name.split('.')[0].split('/').pop() ?? '';
}

@Pipe({ name: 'reconstructedTrackLabel' })
export class reconstructedTrackLabelPipe implements PipeTransform {
  transform(reconstructedTrack: { name: string } | null): string {
    if (!reconstructedTrack) return '';
    return reconstructedTrackLabelTransform(reconstructedTrack.name);
  }
}

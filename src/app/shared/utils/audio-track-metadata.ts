import { AudioTrackMetadata } from '../interfaces/audio-track-metadata.interface';

export interface AudioTrackMetadataView extends AudioTrackMetadata {
  available: boolean;
  durationLabel: string;
  sampleRateLabel: string;
  channelLabel: string;
  bitDepthLabel: string;
  sizeLabel: string;
}

export const toAudioTrackMetadataView = (track: AudioTrackMetadata): AudioTrackMetadataView => {
  const available =
    track.durationSeconds !== null || track.sampleRate !== null || track.channels !== null || track.bitDepth !== null;

  return {
    ...track,
    available,
    durationLabel: formatDuration(track.durationSeconds),
    sampleRateLabel: formatSampleRate(track.sampleRate),
    channelLabel: formatChannels(track.channels),
    bitDepthLabel: track.bitDepth !== null ? `${track.bitDepth}-bit` : '—',
    sizeLabel: track.sizeBytes > 0 ? formatSize(track.sizeBytes) : '—',
  };
};

export const formatDuration = (seconds: number | null): string => {
  if (seconds === null || Number.isNaN(seconds)) return '—';
  const totalSeconds = Math.round(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
};

export const formatSampleRate = (sampleRate: number | null): string => {
  if (sampleRate === null) return '—';
  const kHz = sampleRate / 1000;
  return `${Number.isInteger(kHz) ? kHz : kHz.toFixed(1)} kHz`;
};

export const formatChannels = (channels: number | null): string => {
  if (channels === null) return '—';
  if (channels === 1) return 'Mono';
  if (channels === 2) return 'Stereo';
  return `${channels} ch`;
};

export const formatSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

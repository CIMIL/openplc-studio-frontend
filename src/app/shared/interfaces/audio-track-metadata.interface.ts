export interface AudioTrackMetadata {
  name: string;
  sizeBytes: number;
  durationSeconds: number | null;
  sampleRate: number | null;
  channels: number | null;
  bitDepth: number | null;
}

export interface AudioTrackMetadataDto {
  name: string;
  size_bytes: number;
  duration_seconds: number | null;
  sample_rate: number | null;
  channels: number | null;
  bit_depth: number | null;
}

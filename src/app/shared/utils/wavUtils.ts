export interface WavInfo {
  sampleRate: number;
  channels: number;
  bitDepth: number;
  byteRate: number;
  dataSize: number;
}

/**
 * Robustly parses a RIFF/WAVE header, walking the chunk list instead of assuming
 * the canonical 44-byte layout, and returns the information needed to derive a
 * track's duration. Returns null when the buffer is not a valid WAV header.
 */
export function parseWavInfo(data: Uint8Array): WavInfo | null {
  if (data.length < 44) {
    return null;
  }

  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const riff = String.fromCharCode(data[0], data[1], data[2], data[3]);
  const wave = String.fromCharCode(data[8], data[9], data[10], data[11]);
  if (riff !== 'RIFF' || wave !== 'WAVE') {
    return null;
  }

  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitDepth = 0;
  let byteRate = 0;
  let dataSize = 0;
  let foundFormat = false;

  while (offset + 8 <= data.length) {
    const chunkId = String.fromCharCode(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);
    const chunkSize = dv.getUint32(offset + 4, true);

    if (chunkId === 'fmt ') {
      if (offset + 24 > data.length) {
        break;
      }
      channels = dv.getUint16(offset + 10, true);
      sampleRate = dv.getUint32(offset + 12, true);
      byteRate = dv.getUint32(offset + 16, true);
      bitDepth = dv.getUint16(offset + 22, true);
      foundFormat = true;
    } else if (chunkId === 'data') {
      dataSize = chunkSize;
      break;
    }

    offset += 8 + chunkSize + (chunkSize % 2);
  }

  if (!foundFormat || sampleRate === 0 || channels === 0 || bitDepth === 0) {
    return null;
  }

  return { sampleRate, channels, bitDepth, byteRate, dataSize };
}

export function extractSampleRateFromWavHeader(data: Uint8Array): number {
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const sampleRate = dv.getUint32(24, true);
  return sampleRate;
}

export function extractBitDepthFromWavHeader(data: Uint8Array): number {
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const bitDepth = dv.getUint16(34, true);
  return bitDepth;
}

export function extractChannelNumberFromWavHeader(data: Uint8Array): number {
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const channelNumber = dv.getUint16(22, true);
  return channelNumber;
}

export function stripWavHeader(data: Uint8Array): Uint8Array {
  let dataStart = 44;
  for (let i = 12; i < data.length - 4; i++) {
    if (data[i] === 0x64 && data[i + 1] === 0x61 && data[i + 2] === 0x74 && data[i + 3] === 0x61) {
      // Found "data" marker
      dataStart = i + 8; // Skip "data" marker and chunk size
      break;
    }
  }
  return new Uint8Array(data.subarray(dataStart));
}

export function stripWavBinarySegment(
  data: Uint8Array,
  left: number,
  right: number,
  bitDepth: number,
  channelNumber: number,
  padding: number = 10,
): Uint8Array {
  // Convert left and right from sample indexes to byte indexes
  const bytesPerSample = bitDepth / 8;
  const frameSize = bytesPerSample * channelNumber;
  const leftByte = Math.max(left - padding, 0) * frameSize;

  const rightByte = Math.min(right * frameSize + padding * frameSize, data.length);
  return new Uint8Array(data.subarray(leftByte, rightByte));
}

export function normalizePcmSegment(segment: Uint8Array, bitDepth: number, channels: number = 1): number[][] {
  if (bitDepth !== 16 && bitDepth !== 24) {
    throw new Error(`Unsupported PCM bit depth: ${bitDepth}`);
  }
  if (channels !== 1 && channels !== 2) {
    throw new Error(`Unsupported channel count: ${channels}`);
  }

  const bytesPerSample = bitDepth / 8;
  const frameSize = bytesPerSample * channels;
  const frameCount = Math.floor(segment.length / frameSize);

  const outs: Float32Array[] = Array.from({ length: channels }, () => new Float32Array(frameCount));

  if (bitDepth === 16) {
    const dv = new DataView(segment.buffer, segment.byteOffset, segment.byteLength);
    const SCALE16 = 32768; // 2^15
    for (let f = 0; f < frameCount; f += 1) {
      const base = f * frameSize;
      for (let c = 0; c < channels; c += 1) {
        const val = dv.getInt16(base + c * 2, true); // little-endian
        outs[c][f] = Math.max(-1, Math.min(1, val / SCALE16));
      }
    }
    return outs.map((ch) => Array.from(ch));
  }

  // 24-bit
  const SCALE24 = 8388608; // 2^23
  for (let f = 0; f < frameCount; f += 1) {
    const base = f * frameSize;
    for (let c = 0; c < channels; c += 1) {
      const i = base + c * 3;
      const b0 = segment[i];
      const b1 = segment[i + 1];
      const b2 = segment[i + 2];

      // assemble and sign-extend
      let val = b0 | (b1 << 8) | (b2 << 16) | 0;
      if (b2 & 0x80) {
        val |= 0xff000000;
      }

      let f32 = val / SCALE24;
      if (f32 > 1) f32 = 1;
      if (f32 < -1) f32 = -1;
      if (Math.abs(f32) < 1e-4) f32 = 0;
      outs[c][f] = f32;
    }
  }
  return outs.map((ch) => Array.from(ch));
}

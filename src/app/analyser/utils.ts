import { FileDescription } from 'tarparser';
import { FileDescriptionWithJson } from './analysis.service';

export const LIGHT_COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Emerald
  '#f59e42', // Orange
  '#a78bfa', // Violet
  '#f43f5e', // Rose
  '#eab308', // Amber
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#84cc16', // Lime
  '#d946ef', // Fuchsia
  '#38bdf8', // Sky blue
  '#f87171', // Light red
  '#34d399', // Light green
  '#facc15', // Yellow
];

export const DARK_COLORS = [
  '#60a5fa', // Light blue
  '#f87171', // Light red
  '#34d399', // Light emerald
  '#fb923c', // Light orange
  '#c084fc', // Light violet
  '#fb7185', // Light rose
  '#fde047', // Light amber
  '#22d3ee', // Light cyan
  '#818cf8', // Light indigo
  '#a3e635', // Light lime
  '#e879f9', // Light fuchsia
  '#7dd3fc', // Light sky blue
  '#fca5a5', // Very light red
  '#6ee7b7', // Very light green
  '#fef08a', // Very light yellow
];

export function decodeJson(file: FileDescription): FileDescriptionWithJson {
  let json = null;
  try {
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(file.data);
    json = JSON.parse(text);
  } catch (e) {
    console.error('Failed to parse file as JSON:', file.name, e);
  }
  const { data, text, ...rest } = file;
  return { ...file, json };
}

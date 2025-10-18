import { FileDescription } from 'tarparser';
import { FileDescriptionWithJson } from './analyser.component';

// Color palette from Tailwind CSS + Extra
export const COLORS = [
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

export function decodeJson(file: FileDescription): FileDescriptionWithJson {
  let json = null;
  try {
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(file.data);
    json = JSON.parse(text);
  } catch (e) {
    console.error('Failed to parse file as JSON:', file.name, e);
  }
  return { ...file, json };
}

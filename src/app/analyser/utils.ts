import { FileDescription } from 'tarparser';
import { FileDescriptionWithJson } from './analyser.component';

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

import type { FileParseResult } from '../../types/parse';
export type FileStatus = 'ok' | 'warn' | 'error';

export function fileStatus(r: FileParseResult): FileStatus {
  if (r.error) return 'error';
  if (r.expected !== undefined && r.words.length !== r.expected) return 'warn';
  return 'ok';
}

export function totalWords(results: FileParseResult[]): number {
  return results.reduce((n, r) => n + r.words.length, 0);
}

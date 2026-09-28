import type { FileParseResult } from '../../types/parse';
import { WORDS_PER_FILE } from './parseSiwonToeflPdf';

export type FileStatus = 'ok' | 'warn' | 'error';

export function fileStatus(r: FileParseResult): FileStatus {
  if (r.error) return 'error';
  if (r.words.length !== WORDS_PER_FILE) return 'warn';
  return 'ok';
}

export function totalWords(results: FileParseResult[]): number {
  return results.reduce((n, r) => n + r.words.length, 0);
}

import type { Vocabulary } from './vocabulary';

export interface ParseWarning {
  file: string;
  page: number;
  expected: number;
  actual: number;
}

export interface FileParseResult {
  file: string;
  /** 파싱 자체가 실패한 경우 (PDF 손상 등) */
  error?: string;
  words: Vocabulary[];
  warnings: ParseWarning[];
}

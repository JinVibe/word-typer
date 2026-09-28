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
  /** 기대 단어 수. PDF는 20, CSV는 행 수. 없으면 검증하지 않는다. */
  expected?: number;
  words: Vocabulary[];
  warnings: ParseWarning[];
}

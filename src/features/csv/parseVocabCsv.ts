import type { FileParseResult } from '../../types/parse';
import type { Vocabulary } from '../../types/vocabulary';

/** CSV 한 "페이지"로 묶는 단어 수. PDF 한 장 = 20단어 와 맞춘다. */
const WORDS_PER_PAGE = 20;

const HEADER_WORDS = new Set(['english', 'word', 'vocab', 'vocabulary', '영어', '어휘', '단어']);
const HANGUL_RE = /[ㄱ-ㆎ가-힣]/;

/** RFC 4180 스타일 CSV 파서. 따옴표 안의 쉼표/줄바꿈/이중따옴표("")를 처리한다. */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

/** 첫 행이 헤더인지: 첫 열이 알려진 헤더 이름이거나, 두 열 모두 한글이 없는 경우 */
function isHeader(row: string[]): boolean {
  const a = (row[0] ?? '').trim().toLowerCase();
  const b = (row[1] ?? '').trim();
  return HEADER_WORDS.has(a) || (!HANGUL_RE.test(b) && !HANGUL_RE.test(a) && b !== '');
}

/**
 * `english,korean` 두 열짜리 CSV → Vocabulary[].
 * - 첫 행이 헤더면 건너뛴다.
 * - 열이 셋 이상이면 첫 열을 단어, 마지막 한글 열을 뜻으로 본다.
 * - 20개씩 sourcePage로 묶어 PDF 한 장과 같은 단위로 보이게 한다.
 */
export async function parseVocabCsv(file: File, deckId: string): Promise<FileParseResult> {
  const result: FileParseResult = { file: file.name, words: [], warnings: [] };
  let text: string;
  try {
    text = (await file.text()).replace(/^﻿/, '');
  } catch (e) {
    result.error = e instanceof Error ? e.message : 'CSV를 읽을 수 없습니다.';
    return result;
  }

  const rows = parseCsvText(text);
  if (rows.length === 0) {
    result.error = '비어 있는 파일입니다.';
    return result;
  }
  const body = isHeader(rows[0]) ? rows.slice(1) : rows;
  const stem = file.name.replace(/\.csv$/i, '');
  const words: Vocabulary[] = [];
  let skipped = 0;

  for (const r of body) {
    const word = (r[0] ?? '').trim();
    let meaning = (r[1] ?? '').trim();
    if (r.length > 2) {
      const hangul = r.slice(1).map((s) => s.trim()).filter((s) => HANGUL_RE.test(s));
      meaning = hangul[hangul.length - 1] ?? meaning;
    }
    if (!word || !meaning) {
      skipped++;
      continue;
    }
    const order = words.length + 1;
    words.push({
      id: `${stem}-csv-${order}`,
      deckId,
      sourceFile: file.name,
      sourcePage: Math.ceil(order / WORDS_PER_PAGE),
      order,
      word,
      meaning,
      typedCount: 0,
      typoCount: 0,
    });
  }

  result.words = words;
  result.expected = words.length + skipped;
  if (skipped > 0) {
    result.warnings = [{ file: file.name, page: 1, expected: words.length + skipped, actual: words.length }];
  }
  return result;
}

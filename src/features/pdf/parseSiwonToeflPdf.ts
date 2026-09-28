import type { FileParseResult, ParseWarning } from '../../types/parse';
import { extractPdfText, type PageText, type TextItem } from './extractPdfText';

export const WORDS_PER_FILE = 20;

const WORD_RE = /^[A-Za-z][A-Za-z'’-]*$/;
const ORDER_RE = /^(\d{1,2})\.?$/;
const ORDER_WITH_WORD_RE = /^(\d{1,2})\.?\s+([A-Za-z][A-Za-z'’ -]*)$/;
const HANGUL_RE = /[ㄱ-ㆎ가-힣]/;
// IPA / 발음 표기에 자주 나오는 문자들
const PRON_RE = /[[\]ˈˌəɪʊɔːæθðʃʒŋɑɛɜʌ]/;

interface Row {
  y: number;
  items: TextItem[];
}

interface Columns {
  word: number;
  pron: number;
  meaning: number;
}

/** y 좌표가 비슷한 item을 한 행으로 묶고, 행 안에서는 x 순으로 정렬한다. 행은 위→아래 순서. */
function groupRows(items: TextItem[]): Row[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: Row[] = [];
  for (const it of sorted) {
    const tol = Math.max(3, it.height * 0.5);
    const last = rows[rows.length - 1];
    if (last && Math.abs(last.y - it.y) <= tol) {
      last.items.push(it);
    } else {
      rows.push({ y: it.y, items: [it] });
    }
  }
  for (const r of rows) r.items.sort((a, b) => a.x - b.x);
  return rows;
}

/** 헤더 행(# | 어휘 | 발음 | 뜻)을 찾아 column x 경계를 얻는다. 없으면 null. */
function findColumns(rows: Row[]): Columns | null {
  for (const row of rows) {
    const word = row.items.find((i) => i.str === '어휘' || i.str === '단어');
    const pron = row.items.find((i) => i.str === '발음');
    const meaning = row.items.find((i) => i.str === '뜻' || i.str === '의미');
    if (word && pron && meaning && word.x < pron.x && pron.x < meaning.x) {
      return { word: word.x, pron: pron.x, meaning: meaning.x };
    }
  }
  return null;
}

interface ParsedRow {
  order: number;
  word: string;
  meaning: string;
}

function readOrder(first: string): { order: number; inlineWord: string } | null {
  const m1 = ORDER_RE.exec(first);
  if (m1) return { order: Number(m1[1]), inlineWord: '' };
  const m2 = ORDER_WITH_WORD_RE.exec(first);
  if (m2) return { order: Number(m2[1]), inlineWord: m2[2].trim() };
  return null;
}

/** 좌표 기반: 헤더 column 경계로 word / meaning을 나눈다. 발음 column은 버린다. */
function parseRowByColumns(row: Row, cols: Columns): ParsedRow | null {
  const first = row.items[0];
  if (!first) return null;
  const head = readOrder(first.str);
  if (!head) return null;

  const rest = row.items.slice(1);
  const gap = (cols.pron - cols.word) * 0.15;
  const wordItems = rest.filter((i) => i.x >= cols.word - gap && i.x < cols.pron - gap);
  const meaningItems = rest.filter((i) => i.x >= cols.meaning - gap);

  const word = [head.inlineWord, ...wordItems.map((i) => i.str)]
    .filter(Boolean)
    .join(' ')
    .trim();
  const meaning = meaningItems.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();
  if (!word || !meaning) return null;
  return { order: head.order, word, meaning };
}

/** 헤더를 못 찾았을 때: 숫자 → 알파벳 단어 → (발음 무시) → 한글 뜻 순서로 추정한다. */
function parseRowHeuristic(row: Row): ParsedRow | null {
  const strs = row.items.map((i) => i.str);
  if (!strs[0]) return null;
  const head = readOrder(strs[0]);
  if (!head) return null;

  const wordParts: string[] = head.inlineWord ? [head.inlineWord] : [];
  let idx = 1;

  // 단어: 알파벳 토큰이 연속되는 구간 (발음/한글을 만나면 종료)
  while (idx < strs.length && WORD_RE.test(strs[idx]) && !PRON_RE.test(strs[idx])) {
    wordParts.push(strs[idx]);
    idx++;
  }
  if (wordParts.length === 0) return null;

  // 뜻: 한글이 포함된 첫 item부터 끝까지 (사이에 낀 발음 item은 버림)
  const firstHangul = strs.findIndex((s, i) => i >= idx && HANGUL_RE.test(s));
  if (firstHangul < 0) return null;
  const meaning = strs
    .slice(firstHangul)
    .filter((s) => HANGUL_RE.test(s) || !PRON_RE.test(s))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { order: head.order, word: wordParts.join(' '), meaning };
}

/** 번호가 없는 행이 직전 행 뜻의 줄바꿈인지 판별한다. */
function isMeaningContinuation(row: Row, prev: Row, cols: Columns | null): boolean {
  const yGap = prev.y - row.y;
  const lineH = Math.max(...prev.items.map((i) => i.height), 8);
  if (yGap <= 0 || yGap > lineH * 1.8) return false;
  if (cols) {
    const gap = (cols.pron - cols.word) * 0.15;
    return row.items.every((i) => i.x >= cols.meaning - gap);
  }
  return row.items.every((i) => HANGUL_RE.test(i.str) || /^[~(),.·/]/.test(i.str));
}

function parsePage(page: PageText, startOrder: number): ParsedRow[] {
  const rows = groupRows(page.items);
  const cols = findColumns(rows);
  const out: ParsedRow[] = [];
  let expected = startOrder;
  let prevRow: Row | null = null;

  for (const row of rows) {
    const parsed = cols ? parseRowByColumns(row, cols) : parseRowHeuristic(row);

    if (parsed && parsed.order === expected && expected <= WORDS_PER_FILE) {
      out.push(parsed);
      expected++;
      prevRow = row;
      continue;
    }

    // 번호 없는 행 → 직전 뜻의 줄바꿈일 수 있음
    if (!parsed && prevRow && out.length && isMeaningContinuation(row, prevRow, cols)) {
      const extra = row.items.map((i) => i.str).join(' ').trim();
      const last = out[out.length - 1];
      if (extra) last.meaning = `${last.meaning} ${extra}`.replace(/\s+/g, ' ').trim();
      prevRow = row;
      continue;
    }

    if (out.length >= WORDS_PER_FILE) break;
  }
  return out;
}

function fileStem(name: string): string {
  return name.replace(/\.pdf$/i, '');
}

export async function parseSiwonToeflPdf(file: File, deckId: string): Promise<FileParseResult> {
  const result: FileParseResult = { file: file.name, words: [], warnings: [] };

  let pages: PageText[];
  try {
    pages = await extractPdfText(file);
  } catch (e) {
    result.error = e instanceof Error ? e.message : 'PDF를 읽을 수 없습니다.';
    return result;
  }

  const stem = fileStem(file.name);
  let nextOrder = 1;

  for (const page of pages) {
    const rows = parsePage(page, nextOrder);
    if (rows.length === 0) continue;

    for (const r of rows) {
      result.words.push({
        id: `${stem}-p${page.page}-${r.order}`,
        deckId,
        sourceFile: file.name,
        sourcePage: page.page,
        order: r.order,
        word: r.word,
        meaning: r.meaning,
        typedCount: 0,
        typoCount: 0,
      });
    }
    nextOrder += rows.length;
    if (nextOrder > WORDS_PER_FILE) break;
  }

  if (result.words.length !== WORDS_PER_FILE) {
    const warning: ParseWarning = {
      file: file.name,
      page: result.words[0]?.sourcePage ?? 1,
      expected: WORDS_PER_FILE,
      actual: result.words.length,
    };
    result.warnings = [warning];
  }
  return result;
}

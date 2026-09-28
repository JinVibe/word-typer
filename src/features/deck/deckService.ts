import { progressKey, type Deck, type StudyFilter, type StudyProgress } from '../../types/deck';
import type { Vocabulary, VocabStatus } from '../../types/vocabulary';
import type { FileParseResult } from '../../types/parse';
import { deckRepository } from '../../db/repositories/deckRepository';
import { vocabularyRepository } from '../../db/repositories/vocabularyRepository';
import { db } from '../../db/db';
import { naturalCompare } from '../../utils/naturalSort';

export const MAIN_DECK_ID = 'toefl-main';
export const MAIN_DECK_NAME = 'TOEFL Vocabulary';

function now() {
  return new Date().toISOString();
}

function collectWords(results: FileParseResult[]): Vocabulary[] {
  return results
    .filter((r) => !r.error)
    .flatMap((r) => r.words)
    .map((w) => ({ ...w, status: w.status ?? 'normal' }));
}

export function emptyProgress(deckId: string, filter: StudyFilter, cycle = 1, totalTyped = 0): StudyProgress {
  return {
    key: progressKey(deckId, filter),
    deckId,
    filter,
    currentIndex: 0,
    cycle,
    totalTyped,
    lastStudiedAt: now(),
  };
}

/** 기존 단어장을 새 파싱 결과로 교체한다. 진행 상황도 초기화된다. */
export async function replaceDeck(results: FileParseResult[]): Promise<Deck> {
  const words = collectWords(results);
  const files = results.filter((r) => !r.error && r.words.length).map((r) => r.file);
  const ts = now();
  const deck: Deck = {
    id: MAIN_DECK_ID,
    name: MAIN_DECK_NAME,
    sourceFiles: files.sort(naturalCompare),
    wordCount: words.length,
    createdAt: ts,
    updatedAt: ts,
  };

  await db.transaction('rw', db.vocabularies, db.decks, db.studyProgress, async () => {
    await vocabularyRepository.removeByDeck(MAIN_DECK_ID);
    await vocabularyRepository.bulkPut(words);
    await deckRepository.put(deck);
    await deckRepository.removeAllProgress(MAIN_DECK_ID);
    await deckRepository.putProgress(emptyProgress(MAIN_DECK_ID, 'all'));
  });
  return deck;
}

/** 기존 단어장에 파일을 추가한다. 같은 파일명은 덮어쓴다. 진행 위치는 유지. */
export async function appendToDeck(results: FileParseResult[]): Promise<Deck> {
  const existing = await deckRepository.get(MAIN_DECK_ID);
  if (!existing) return replaceDeck(results);

  const words = collectWords(results);
  const newFiles = results.filter((r) => !r.error && r.words.length).map((r) => r.file);
  const ts = now();

  await db.transaction('rw', db.vocabularies, db.decks, async () => {
    for (const f of newFiles) {
      await db.vocabularies.where({ deckId: MAIN_DECK_ID, sourceFile: f }).delete();
    }
    await vocabularyRepository.bulkPut(words);
    const total = await db.vocabularies.where('deckId').equals(MAIN_DECK_ID).count();
    const deck: Deck = {
      ...existing,
      sourceFiles: Array.from(new Set([...existing.sourceFiles, ...newFiles])).sort(naturalCompare),
      wordCount: total,
      updatedAt: ts,
    };
    await deckRepository.put(deck);
  });
  return (await deckRepository.get(MAIN_DECK_ID))!;
}

export async function getOrCreateProgress(deckId: string, filter: StudyFilter): Promise<StudyProgress> {
  return (await deckRepository.getProgress(deckId, filter)) ?? emptyProgress(deckId, filter);
}

/** 해당 모드의 진행 위치를 0으로. 바퀴 수는 +1. */
export async function resetProgress(deckId: string, filter: StudyFilter): Promise<void> {
  const prev = await deckRepository.getProgress(deckId, filter);
  await deckRepository.putProgress(
    emptyProgress(deckId, filter, prev ? prev.cycle + 1 : 1, prev?.totalTyped ?? 0),
  );
}

export async function saveProgress(p: StudyProgress): Promise<void> {
  await deckRepository.putProgress(p);
}

export async function recordTyped(vocabId: string, typos: number): Promise<void> {
  const v = await db.vocabularies.get(vocabId);
  if (!v) return;
  await vocabularyRepository.update(vocabId, {
    typedCount: v.typedCount + 1,
    typoCount: v.typoCount + typos,
    lastStudiedAt: now(),
  });
}

export async function setVocabStatus(id: string, status: VocabStatus): Promise<void> {
  await vocabularyRepository.setStatus(id, status);
}

export async function updateVocabulary(
  id: string,
  patch: Partial<Pick<Vocabulary, 'word' | 'meaning'>>,
): Promise<void> {
  await vocabularyRepository.update(id, patch);
}

export async function deleteVocabulary(id: string): Promise<void> {
  const v = await db.vocabularies.get(id);
  if (!v) return;
  await db.transaction('rw', db.vocabularies, db.decks, async () => {
    await vocabularyRepository.remove(id);
    const deck = await deckRepository.get(v.deckId);
    if (deck) {
      const total = await db.vocabularies.where('deckId').equals(v.deckId).count();
      await deckRepository.put({ ...deck, wordCount: total, updatedAt: now() });
    }
  });
}

export interface AddBuiltinResult {
  added: number;
  skipped: number;
}

/**
 * 내장 단어셋을 단어장에 추가한다. 이미 있는 영어 단어(대소문자 무시)는 건너뛴다.
 * 단어장이 없으면 새로 만든다. 진행 위치는 유지.
 */
export async function addBuiltinWords(
  list: ReadonlyArray<readonly [string, string]>,
  sourceFile: string,
): Promise<AddBuiltinResult> {
  const ts = now();
  let added = 0;
  let skipped = 0;

  await db.transaction('rw', db.vocabularies, db.decks, db.studyProgress, async () => {
    const existing = await db.vocabularies.where('deckId').equals(MAIN_DECK_ID).toArray();
    const have = new Set(existing.map((v) => v.word.trim().toLowerCase()));
    const prevFromSource = existing.filter((v) => v.sourceFile === sourceFile);
    let order = prevFromSource.reduce((m, v) => Math.max(m, v.order), 0);

    const rows: Vocabulary[] = [];
    for (const [word, meaning] of list) {
      const key = word.trim().toLowerCase();
      if (have.has(key)) {
        skipped++;
        continue;
      }
      have.add(key);
      order++;
      rows.push({
        id: `${sourceFile}-${order}`,
        deckId: MAIN_DECK_ID,
        sourceFile,
        sourcePage: Math.ceil(order / 20),
        order,
        word: word.trim(),
        meaning: meaning.trim(),
        status: 'normal',
        typedCount: 0,
        typoCount: 0,
      });
      added++;
    }
    if (rows.length) await vocabularyRepository.bulkPut(rows);

    const total = await db.vocabularies.where('deckId').equals(MAIN_DECK_ID).count();
    const deck = await deckRepository.get(MAIN_DECK_ID);
    if (deck) {
      await deckRepository.put({
        ...deck,
        sourceFiles: Array.from(new Set([...deck.sourceFiles, sourceFile])).sort(naturalCompare),
        wordCount: total,
        updatedAt: ts,
      });
    } else {
      await deckRepository.put({
        id: MAIN_DECK_ID,
        name: MAIN_DECK_NAME,
        sourceFiles: [sourceFile],
        wordCount: total,
        createdAt: ts,
        updatedAt: ts,
      });
      await deckRepository.putProgress(emptyProgress(MAIN_DECK_ID, 'all'));
    }
  });

  return { added, skipped };
}

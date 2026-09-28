import type { Deck, StudyProgress } from '../../types/deck';
import type { Vocabulary } from '../../types/vocabulary';
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
  return results.filter((r) => !r.error).flatMap((r) => r.words);
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

  await db.transaction('rw', db.vocabularies, db.decks, db.progress, async () => {
    await vocabularyRepository.removeByDeck(MAIN_DECK_ID);
    await vocabularyRepository.bulkPut(words);
    await deckRepository.put(deck);
    await deckRepository.putProgress({
      deckId: MAIN_DECK_ID,
      currentIndex: 0,
      cycle: 1,
      totalTyped: 0,
      lastStudiedAt: ts,
    });
  });
  return deck;
}

/** 기존 단어장에 PDF를 추가한다. 같은 파일명은 덮어쓴다. 진행 위치는 유지. */
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

export async function resetProgress(deckId: string): Promise<void> {
  const prev = await deckRepository.getProgress(deckId);
  await deckRepository.putProgress({
    deckId,
    currentIndex: 0,
    cycle: prev ? prev.cycle + 1 : 1,
    totalTyped: prev?.totalTyped ?? 0,
    lastStudiedAt: now(),
  });
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

export async function updateVocabulary(id: string, patch: Partial<Pick<Vocabulary, 'word' | 'meaning'>>) {
  await vocabularyRepository.update(id, patch);
}

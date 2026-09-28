import { db } from '../db';
import type { Vocabulary, VocabStatus } from '../../types/vocabulary';
import type { StudyFilter } from '../../types/deck';
import { naturalCompare } from '../../utils/naturalSort';

export function sortVocab(rows: Vocabulary[]): Vocabulary[] {
  return rows.sort(
    (a, b) =>
      naturalCompare(a.sourceFile, b.sourceFile) ||
      a.sourcePage - b.sourcePage ||
      a.order - b.order,
  );
}

export function statusOf(v: Vocabulary): VocabStatus {
  return v.status ?? 'normal';
}

/** 학습 필터에 해당하는 단어인지. all = 아는 단어 제외, hard = 어려운 단어만 */
export function matchesFilter(v: Vocabulary, filter: StudyFilter): boolean {
  const s = statusOf(v);
  return filter === 'hard' ? s === 'hard' : s !== 'known';
}

export const vocabularyRepository = {
  /** 파일 natural sort → 페이지 → order 순으로 정렬해 반환한다. */
  async byDeck(deckId: string): Promise<Vocabulary[]> {
    const rows = await db.vocabularies.where('deckId').equals(deckId).toArray();
    return sortVocab(rows);
  },
  async byDeckFiltered(deckId: string, filter: StudyFilter): Promise<Vocabulary[]> {
    const rows = await db.vocabularies.where('deckId').equals(deckId).toArray();
    return sortVocab(rows.filter((v) => matchesFilter(v, filter)));
  },
  bulkPut: (rows: Vocabulary[]) => db.vocabularies.bulkPut(rows),
  update: (id: string, patch: Partial<Vocabulary>) => db.vocabularies.update(id, patch),
  setStatus: (id: string, status: VocabStatus) => db.vocabularies.update(id, { status }),
  removeByDeck: (deckId: string) => db.vocabularies.where('deckId').equals(deckId).delete(),
  remove: (id: string) => db.vocabularies.delete(id),
};

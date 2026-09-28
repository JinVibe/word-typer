import { db } from '../db';
import type { Vocabulary } from '../../types/vocabulary';
import { naturalCompare } from '../../utils/naturalSort';

export const vocabularyRepository = {
  /** 파일 natural sort → 페이지 → order 순으로 정렬해 반환한다. */
  async byDeck(deckId: string): Promise<Vocabulary[]> {
    const rows = await db.vocabularies.where('deckId').equals(deckId).toArray();
    return rows.sort(
      (a, b) =>
        naturalCompare(a.sourceFile, b.sourceFile) ||
        a.sourcePage - b.sourcePage ||
        a.order - b.order,
    );
  },
  bulkPut: (rows: Vocabulary[]) => db.vocabularies.bulkPut(rows),
  update: (id: string, patch: Partial<Vocabulary>) => db.vocabularies.update(id, patch),
  removeByDeck: (deckId: string) => db.vocabularies.where('deckId').equals(deckId).delete(),
};

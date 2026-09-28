import Dexie, { type EntityTable } from 'dexie';
import type { Vocabulary } from '../types/vocabulary';
import type { Deck, StudyProgress } from '../types/deck';

interface LegacyProgress {
  deckId: string;
  currentIndex: number;
  cycle: number;
  totalTyped: number;
  lastStudiedAt: string;
}

export class TypeVocaDB extends Dexie {
  vocabularies!: EntityTable<Vocabulary, 'id'>;
  decks!: EntityTable<Deck, 'id'>;
  studyProgress!: EntityTable<StudyProgress, 'key'>;

  constructor() {
    super('typevoca');

    this.version(1).stores({
      vocabularies: 'id, deckId, [deckId+sourceFile+order]',
      decks: 'id',
      progress: 'deckId',
    });

    // v2: 단어 status 추가, 진행 위치를 (deck, filter) 별로 분리
    this.version(2)
      .stores({
        vocabularies: 'id, deckId, status, [deckId+status]',
        decks: 'id',
        studyProgress: 'key, deckId',
        progress: null,
      })
      .upgrade(async (tx) => {
        await tx
          .table('vocabularies')
          .toCollection()
          .modify((v: Vocabulary) => {
            if (!v.status) v.status = 'normal';
          });
        const legacy = (await tx.table('progress').toArray()) as LegacyProgress[];
        for (const p of legacy) {
          await tx.table('studyProgress').put({
            key: `${p.deckId}:all`,
            deckId: p.deckId,
            filter: 'all',
            currentIndex: p.currentIndex,
            cycle: p.cycle,
            totalTyped: p.totalTyped,
            lastStudiedAt: p.lastStudiedAt,
          } satisfies StudyProgress);
        }
      });
  }
}

export const db = new TypeVocaDB();

import Dexie, { type EntityTable } from 'dexie';
import type { Vocabulary } from '../types/vocabulary';
import type { Deck, StudyProgress } from '../types/deck';

export class TypeVocaDB extends Dexie {
  vocabularies!: EntityTable<Vocabulary, 'id'>;
  decks!: EntityTable<Deck, 'id'>;
  progress!: EntityTable<StudyProgress, 'deckId'>;

  constructor() {
    super('typevoca');
    this.version(1).stores({
      vocabularies: 'id, deckId, [deckId+sourceFile+order]',
      decks: 'id',
      progress: 'deckId',
    });
  }
}

export const db = new TypeVocaDB();

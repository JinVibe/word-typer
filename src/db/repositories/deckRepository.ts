import { db } from '../db';
import type { Deck, StudyProgress } from '../../types/deck';

export const deckRepository = {
  get: (id: string) => db.decks.get(id),
  put: (deck: Deck) => db.decks.put(deck),
  all: () => db.decks.toArray(),
  remove: (id: string) => db.decks.delete(id),

  getProgress: (deckId: string) => db.progress.get(deckId),
  putProgress: (p: StudyProgress) => db.progress.put(p),
  removeProgress: (deckId: string) => db.progress.delete(deckId),
};

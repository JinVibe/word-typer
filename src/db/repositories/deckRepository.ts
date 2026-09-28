import { db } from '../db';
import { progressKey, type Deck, type StudyFilter, type StudyProgress } from '../../types/deck';

export const deckRepository = {
  get: (id: string) => db.decks.get(id),
  put: (deck: Deck) => db.decks.put(deck),
  all: () => db.decks.toArray(),
  remove: (id: string) => db.decks.delete(id),

  getProgress: (deckId: string, filter: StudyFilter) =>
    db.studyProgress.get(progressKey(deckId, filter)),
  putProgress: (p: StudyProgress) => db.studyProgress.put(p),
  removeAllProgress: (deckId: string) => db.studyProgress.where('deckId').equals(deckId).delete(),
};

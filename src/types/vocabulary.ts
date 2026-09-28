export interface Vocabulary {
  id: string;
  deckId: string;

  sourceFile: string;
  sourcePage: number;
  order: number;

  word: string;
  meaning: string;

  typedCount: number;
  typoCount: number;

  lastStudiedAt?: string;
}

export interface Deck {
  id: string;
  name: string;

  sourceFiles: string[];
  wordCount: number;

  createdAt: string;
  updatedAt: string;
}

export interface StudyProgress {
  deckId: string;
  currentIndex: number;
  cycle: number;
  totalTyped: number;
  lastStudiedAt: string;
}

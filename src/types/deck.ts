export interface Deck {
  id: string;
  name: string;

  sourceFiles: string[];
  wordCount: number;

  createdAt: string;
  updatedAt: string;
}

/** all: 아는 단어를 뺀 전체 / hard: 어려운 단어만 */
export type StudyFilter = 'all' | 'hard';

export function progressKey(deckId: string, filter: StudyFilter): string {
  return `${deckId}:${filter}`;
}

export interface StudyProgress {
  /** `${deckId}:${filter}` */
  key: string;
  deckId: string;
  filter: StudyFilter;
  currentIndex: number;
  cycle: number;
  totalTyped: number;
  lastStudiedAt: string;
}

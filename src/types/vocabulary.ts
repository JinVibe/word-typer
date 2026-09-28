/** normal: 기본 / known: 아는 단어(학습에서 제외) / hard: 어려운 단어(전용 학습 가능) */
export type VocabStatus = 'normal' | 'known' | 'hard';

export interface Vocabulary {
  id: string;
  deckId: string;

  sourceFile: string;
  sourcePage: number;
  order: number;

  word: string;
  meaning: string;

  status?: VocabStatus;

  typedCount: number;
  typoCount: number;

  lastStudiedAt?: string;
}

export type StudyMode = 'sequential' | 'random';

const KEYS = {
  studyMode: 'typevoca.studyMode',
  lastDeckId: 'typevoca.lastDeckId',
} as const;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export const settings = {
  getStudyMode(): StudyMode {
    return read(KEYS.studyMode) === 'random' ? 'random' : 'sequential';
  },
  setStudyMode(mode: StudyMode) {
    write(KEYS.studyMode, mode);
  },
  getLastDeckId(): string | null {
    return read(KEYS.lastDeckId);
  },
  setLastDeckId(id: string) {
    write(KEYS.lastDeckId, id);
  },
};

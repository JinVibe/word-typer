export type CharState = 'correct' | 'wrong' | 'pending';

export interface CharView {
  char: string;
  state: CharState;
}

/** target 각 글자에 대해 현재 입력 상태를 계산한다. */
export function diffChars(target: string, typed: string): CharView[] {
  return Array.from(target).map((char, i) => {
    if (i >= typed.length) return { char, state: 'pending' as const };
    return { char, state: typed[i] === char ? ('correct' as const) : ('wrong' as const) };
  });
}

export function isComplete(target: string, typed: string): boolean {
  return typed === target;
}

/** 단어 입력에 허용되는 키인지. 알파벳, 공백, 하이픈, 아포스트로피. */
export function isTypableKey(key: string): boolean {
  return key.length === 1 && /[A-Za-z '\-]/.test(key);
}

/** Fisher-Yates shuffle. 원본을 바꾸지 않는다. */
export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

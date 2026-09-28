import { useCallback, useEffect, useRef, useState } from 'react';
import { isComplete, isTypableKey } from './typingUtils';

export const ADVANCE_DELAY_MS = 150;

interface Options {
  target: string;
  enabled: boolean;
  /** 정확히 입력 완료 → 짧은 대기 후 호출. typos = 이 단어에서 잘못 친 키 수 */
  onComplete: (typos: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onEscape: () => void;
}

/**
 * 전역 keydown listener. input box 없이 페이지 진입 즉시 타이핑할 수 있다.
 * 완료 후 다음 단어로 넘어가면 부모가 target을 바꾸고, 그때 typed는 초기화된다.
 */
export function useTyping({ target, enabled, onComplete, onPrev, onNext, onEscape }: Options) {
  const [typed, setTyped] = useState('');
  const typosRef = useRef(0);
  const doneRef = useRef(false);

  // target이 바뀌면 입력 상태 리셋
  useEffect(() => {
    setTyped('');
    typosRef.current = 0;
    doneRef.current = false;
  }, [target]);

  // 완료 감지 → 대기 후 다음
  useEffect(() => {
    if (!target || doneRef.current) return;
    if (!isComplete(target, typed)) return;
    doneRef.current = true;
    const t = setTimeout(() => onComplete(typosRef.current), ADVANCE_DELAY_MS);
    return () => clearTimeout(t);
  }, [typed, target, onComplete]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || doneRef.current) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // 다른 input 요소에 포커스가 있으면 무시 (modal 안의 편집 등)
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;

      switch (e.key) {
        case 'Backspace':
          e.preventDefault();
          setTyped((t) => t.slice(0, -1));
          return;
        case 'ArrowLeft':
          e.preventDefault();
          onPrev();
          return;
        case 'ArrowRight':
          e.preventDefault();
          onNext();
          return;
        case 'Escape':
          e.preventDefault();
          onEscape();
          return;
        case 'Process': // 한글 IME 조합 중
          return;
      }

      if (!isTypableKey(e.key)) return;
      e.preventDefault();
      setTyped((t) => {
        if (t.length >= target.length) return t;
        if (e.key !== target[t.length]) typosRef.current += 1;
        return t + e.key;
      });
    },
    [enabled, target, onPrev, onNext, onEscape],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return { typed };
}

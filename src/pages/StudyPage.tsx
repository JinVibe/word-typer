import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TypingWord } from '../components/TypingWord';
import { Progress } from '../components/Progress';
import { useTyping } from '../features/typing/useTyping';
import { shuffle } from '../features/typing/typingUtils';
import { recordTyped, saveProgress } from '../features/deck/deckService';
import { deckRepository } from '../db/repositories/deckRepository';
import { vocabularyRepository } from '../db/repositories/vocabularyRepository';
import { settings, type StudyMode } from '../utils/settings';
import type { Vocabulary } from '../types/vocabulary';
import type { StudyProgress } from '../types/deck';

export function StudyPage() {
  const { deckId = '' } = useParams();
  const navigate = useNavigate();

  const [words, setWords] = useState<Vocabulary[] | null>(null);
  const [progress, setProgress] = useState<StudyProgress | null>(null);
  const [mode, setMode] = useState<StudyMode>(() => settings.getStudyMode());
  const [order, setOrder] = useState<number[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  // 초기 로드: 단어 + 진행 위치
  useEffect(() => {
    let alive = true;
    (async () => {
      const [ws, p] = await Promise.all([
        vocabularyRepository.byDeck(deckId),
        deckRepository.getProgress(deckId),
      ]);
      if (!alive) return;
      if (ws.length === 0) {
        navigate('/', { replace: true });
        return;
      }
      setWords(ws);
      setProgress(
        p ?? {
          deckId,
          currentIndex: 0,
          cycle: 1,
          totalTyped: 0,
          lastStudiedAt: new Date().toISOString(),
        },
      );
      settings.setLastDeckId(deckId);
    })();
    return () => {
      alive = false;
    };
  }, [deckId, navigate]);

  // 학습 순서: 순서대로 = 그대로, 랜덤 = 세션 시작 시 Fisher-Yates
  useEffect(() => {
    if (!words) return;
    const base = words.map((_, i) => i);
    setOrder(mode === 'random' ? shuffle(base) : base);
  }, [words, mode]);

  const total = words?.length ?? 0;
  const index = progress?.currentIndex ?? 0;
  const finished = total > 0 && index >= total;
  const current = useMemo(
    () => (words && order.length && !finished ? words[order[index]] : null),
    [words, order, index, finished],
  );

  const persist = useCallback(
    (patch: Partial<StudyProgress>) => {
      setProgress((p) => {
        if (!p) return p;
        const next = { ...p, ...patch, lastStudiedAt: new Date().toISOString() };
        void saveProgress(next);
        return next;
      });
    },
    [],
  );

  const onComplete = useCallback(
    (typos: number) => {
      if (!current || !progress) return;
      void recordTyped(current.id, typos);
      persist({ currentIndex: progress.currentIndex + 1, totalTyped: progress.totalTyped + 1 });
    },
    [current, progress, persist],
  );

  const onPrev = useCallback(() => {
    if (!progress || progress.currentIndex === 0) return;
    persist({ currentIndex: progress.currentIndex - 1 });
  }, [progress, persist]);

  const onNext = useCallback(() => {
    if (!progress || progress.currentIndex >= total) return;
    persist({ currentIndex: progress.currentIndex + 1 });
  }, [progress, total, persist]);

  const onEscape = useCallback(() => setMenuOpen((o) => !o), []);

  const { typed } = useTyping({
    target: current?.word ?? '',
    enabled: !!current && !menuOpen && !finished,
    onComplete,
    onPrev,
    onNext,
    onEscape,
  });

  const restartCycle = useCallback(() => {
    if (!progress) return;
    if (mode === 'random' && words) setOrder(shuffle(words.map((_, i) => i)));
    persist({ currentIndex: 0, cycle: progress.cycle + 1 });
    setMenuOpen(false);
  }, [progress, mode, words, persist]);

  // 한 바퀴 끝 화면: Enter로 바로 다시
  useEffect(() => {
    if (!finished) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter') restartCycle();
      if (e.key === 'Escape') navigate('/');
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [finished, restartCycle, navigate]);

  const changeMode = (m: StudyMode) => {
    settings.setStudyMode(m);
    setMode(m);
  };

  if (!words || !progress) return null;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 select-none">
      <Progress current={Math.min(index, total)} total={total} />

      {finished ? (
        <div className="flex flex-col items-center gap-8 text-center">
          <p className="text-2xl">한 바퀴 끝.</p>
          <p className="text-[#8A8A8A]">{total}개의 단어를 쳤어요.</p>
          <button onClick={restartCycle} className="btn-primary" autoFocus>
            그냥 한 번 더
          </button>
          <p className="text-xs text-[#5a5a5a]">Enter · 다시 시작 / Esc · 홈</p>
        </div>
      ) : current ? (
        <TypingWord word={current.word} meaning={current.meaning} typed={typed} />
      ) : null}

      <p className="fixed bottom-6 left-0 right-0 text-center text-xs text-[#3a3a3a]">
        ← → 이동 · Esc 메뉴
      </p>

      {menuOpen && (
        <div
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/60"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="w-72 rounded-lg border border-[#2a2a2a] bg-[#161616] p-6 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-4 text-xs text-[#5a5a5a]">학습 순서</p>
            <div className="mb-6 flex gap-2">
              {(['sequential', 'random'] as StudyMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => changeMode(m)}
                  className={[
                    'flex-1 rounded border px-3 py-2',
                    mode === m
                      ? 'border-[#F2F2F2] text-[#F2F2F2]'
                      : 'border-[#2a2a2a] text-[#8A8A8A] hover:border-[#5a5a5a]',
                  ].join(' ')}
                >
                  {m === 'sequential' ? '순서대로' : '랜덤'}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={restartCycle} className="btn-ghost text-left">
                처음부터
              </button>
              <Link to="/import?append=1" className="btn-ghost text-left">
                PDF 추가
              </Link>
              <Link to="/" className="btn-ghost text-left">
                홈으로
              </Link>
            </div>

            <p className="mt-6 text-xs text-[#3a3a3a]">
              {progress.cycle}바퀴째 · 지금까지 {progress.totalTyped}개 입력
            </p>
            <p className="mt-2 text-xs text-[#3a3a3a]">Esc · 닫기</p>
          </div>
        </div>
      )}
    </main>
  );
}

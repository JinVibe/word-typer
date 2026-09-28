import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import { TypingWord } from '../components/TypingWord';
import { Progress } from '../components/Progress';
import { useTyping } from '../features/typing/useTyping';
import { shuffle } from '../features/typing/typingUtils';
import {
  getOrCreateProgress,
  recordTyped,
  saveProgress,
  setVocabStatus,
} from '../features/deck/deckService';
import { statusOf, vocabularyRepository } from '../db/repositories/vocabularyRepository';
import { settings, type StudyMode } from '../utils/settings';
import type { Vocabulary, VocabStatus } from '../types/vocabulary';
import type { StudyFilter, StudyProgress } from '../types/deck';

const FILTER_LABEL: Record<StudyFilter, string> = { all: '전체 학습', hard: '어려운 단어' };

export function StudyPage() {
  const { deckId = '' } = useParams();
  const [params] = useSearchParams();
  const filter: StudyFilter = params.get('filter') === 'hard' ? 'hard' : 'all';
  const navigate = useNavigate();

  const [words, setWords] = useState<Vocabulary[] | null>(null);
  const [progress, setProgress] = useState<StudyProgress | null>(null);
  const [mode, setMode] = useState<StudyMode>(() => settings.getStudyMode());
  const [order, setOrder] = useState<number[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // 초기 로드: 필터에 맞는 단어 + 해당 모드의 진행 위치
  useEffect(() => {
    let alive = true;
    setWords(null);
    setProgress(null);
    (async () => {
      const [ws, p] = await Promise.all([
        vocabularyRepository.byDeckFiltered(deckId, filter),
        getOrCreateProgress(deckId, filter),
      ]);
      if (!alive) return;
      setWords(ws);
      const base = ws.map((_, i) => i);
      setOrder(settings.getStudyMode() === 'random' ? shuffle(base) : base);
      setProgress(p);
      settings.setLastDeckId(deckId);
    })();
    return () => {
      alive = false;
    };
  }, [deckId, filter]);

  const total = words?.length ?? 0;
  const index = progress?.currentIndex ?? 0;
  const empty = words !== null && total === 0;
  const finished = total > 0 && index >= total;
  const current = useMemo(
    () => (words && order.length === total && !finished ? words[order[index]] : null),
    [words, order, total, index, finished],
  );

  const persist = useCallback((patch: Partial<StudyProgress>) => {
    setProgress((p) => {
      if (!p) return p;
      const next = { ...p, ...patch, lastStudiedAt: new Date().toISOString() };
      void saveProgress(next);
      return next;
    });
  }, []);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 900);
  }, []);

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

  /** 현재 단어를 목록에서 빼고(index는 그대로 → 다음 단어가 올라옴) 상태를 저장한다 */
  const removeCurrent = useCallback(
    (status: VocabStatus) => {
      if (!current || !words) return;
      void setVocabStatus(current.id, status);
      const pos = order[index];
      setWords(words.filter((_, i) => i !== pos));
      setOrder(order.filter((i) => i !== pos).map((i) => (i > pos ? i - 1 : i)));
    },
    [current, words, order, index],
  );

  // 1: 아는 단어 → 이 목록에서 제외
  const onMarkKnown = useCallback(() => {
    if (!current) return;
    removeCurrent('known');
    flash('알아요 · 목록에서 제외');
  }, [current, removeCurrent, flash]);

  // 2: 어려운 단어 토글
  const onToggleHard = useCallback(() => {
    if (!current || !words) return;
    if (statusOf(current) === 'hard') {
      if (filter === 'hard') {
        removeCurrent('normal');
        flash('어려움 해제 · 목록에서 제외');
      } else {
        void setVocabStatus(current.id, 'normal');
        setWords(words.map((w) => (w.id === current.id ? { ...w, status: 'normal' } : w)));
        flash('어려움 해제');
      }
    } else {
      void setVocabStatus(current.id, 'hard');
      setWords(words.map((w) => (w.id === current.id ? { ...w, status: 'hard' } : w)));
      flash('어려워요 표시');
    }
  }, [current, words, filter, removeCurrent, flash]);

  const { typed } = useTyping({
    target: current?.word ?? '',
    enabled: !!current && !menuOpen && !finished,
    onComplete,
    onPrev,
    onNext,
    onEscape,
    onMarkKnown,
    onToggleHard,
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
    if (words) setOrder(m === 'random' ? shuffle(words.map((_, i) => i)) : words.map((_, i) => i));
  };

  if (!words || !progress) return <NavBar quiet />;

  return (
    <>
      <NavBar quiet />
      <main className="flex min-h-screen items-center justify-center px-6 pt-12 select-none">
        {!empty && <Progress current={Math.min(index, total)} total={total} label={FILTER_LABEL[filter]} />}

        {empty ? (
          <div className="flex flex-col items-center gap-6 text-center">
            <p className="text-xl">
              {filter === 'hard' ? '어렵다고 표시한 단어가 없어요.' : '학습할 단어가 없어요.'}
            </p>
            <p className="text-sm text-[#8A8A8A]">
              {filter === 'hard'
                ? '전체 학습 중 2를 누르면 여기에 쌓입니다.'
                : '단어 목록에서 "알아요" 표시를 풀거나 파일을 추가하세요.'}
            </p>
            <div className="flex gap-4 text-sm">
              <Link to={`/study/${deckId}`} className="btn-ghost">
                전체 학습
              </Link>
              <Link to="/words" className="btn-ghost">
                단어 목록
              </Link>
            </div>
          </div>
        ) : finished ? (
          <div className="flex flex-col items-center gap-8 text-center">
            <p className="text-2xl">한 바퀴 끝.</p>
            <p className="text-[#8A8A8A]">
              {FILTER_LABEL[filter]} {total}개의 단어를 쳤어요.
            </p>
            <button onClick={restartCycle} className="btn-primary" autoFocus>
              그냥 한 번 더
            </button>
            <p className="text-xs text-[#5a5a5a]">Enter · 다시 시작 / Esc · 홈</p>
          </div>
        ) : current ? (
          <div className="relative">
            {statusOf(current) === 'hard' && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-[#D9A441]">어려워요</span>
            )}
            <TypingWord word={current.word} meaning={current.meaning} typed={typed} />
          </div>
        ) : null}

        {toast && (
          <p className="fixed bottom-16 left-0 right-0 text-center text-sm text-[#8A8A8A]">{toast}</p>
        )}

        <p className="fixed bottom-6 left-0 right-0 text-center text-xs text-[#3a3a3a]">
          1 알아요 · 2 어려워요 · ← → 이동 · Esc 메뉴
        </p>

        {menuOpen && (
          <div
            className="fixed inset-0 z-30 flex items-center justify-center bg-black/60"
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
                  이 모드 처음부터
                </button>
                <Link
                  to={filter === 'hard' ? `/study/${deckId}` : `/study/${deckId}?filter=hard`}
                  className="btn-ghost text-left"
                  onClick={() => setMenuOpen(false)}
                >
                  {filter === 'hard' ? '전체 학습으로' : '어려운 단어만'}
                </Link>
                <Link to="/words" className="btn-ghost text-left">
                  단어 목록
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
    </>
  );
}

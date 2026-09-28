import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { NavBar } from '../components/NavBar';
import { MAIN_DECK_ID, resetProgress } from '../features/deck/deckService';
import { statusOf } from '../db/repositories/vocabularyRepository';

export function HomePage() {
  const navigate = useNavigate();
  // get()은 없을 때 undefined를 돌려주므로, 로딩 중과 구분하기 위해 null로 바꾸고 기본값은 'loading'으로 둔다.
  const deck = useLiveQuery(() => db.decks.get(MAIN_DECK_ID).then((d) => d ?? null), [], 'loading' as const);
  const words = useLiveQuery(() => db.vocabularies.where('deckId').equals(MAIN_DECK_ID).toArray(), [], []);
  const progressAll = useLiveQuery(() => db.studyProgress.get(`${MAIN_DECK_ID}:all`));
  const progressHard = useLiveQuery(() => db.studyProgress.get(`${MAIN_DECK_ID}:hard`));

  const counts = words.reduce(
    (acc, w) => {
      acc[statusOf(w)]++;
      return acc;
    },
    { normal: 0, known: 0, hard: 0 },
  );
  const studyTotal = counts.normal + counts.hard;

  const onRestart = async () => {
    if (!confirm('전체 학습 진행 위치를 처음으로 되돌릴까요? 단어장과 표시는 그대로 유지됩니다.')) return;
    await resetProgress(MAIN_DECK_ID, 'all');
    navigate(`/study/${MAIN_DECK_ID}`);
  };

  return (
    <>
      <NavBar />
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-12 px-6 pt-12 pb-16">
        {deck === 'loading' ? null : !deck ? (
          <div className="flex flex-col items-center gap-8 text-center">
            <h1 className="font-mono text-4xl tracking-tight">TypeVoca</h1>
            <p className="text-lg text-[#8A8A8A]">외우지 말고 그냥 쳐보세요.</p>
            <Link to="/import" className="btn-primary">
              PDF / CSV 넣기
            </Link>
            <p className="text-xs text-[#5a5a5a]">파일은 브라우저 안에서만 처리됩니다.</p>
          </div>
        ) : (
          <>
            <header>
              <p className="text-sm text-[#8A8A8A]">{deck.name}</p>
              <h1 className="mt-1 font-mono text-3xl">{deck.wordCount} words</h1>
            </header>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link
                to={`/study/${MAIN_DECK_ID}`}
                className="card group"
                autoFocus
              >
                <p className="text-sm text-[#8A8A8A]">전체 학습</p>
                <p className="mt-2 font-mono text-2xl tabular-nums">
                  {Math.min(progressAll?.currentIndex ?? 0, studyTotal)}{' '}
                  <span className="text-[#5a5a5a]">/ {studyTotal}</span>
                </p>
                <p className="mt-3 text-xs text-[#5a5a5a]">아는 단어 {counts.known}개 제외</p>
                <p className="mt-4 text-sm text-[#F2F2F2] group-hover:underline">이어서 치기 →</p>
              </Link>

              <Link
                to={`/study/${MAIN_DECK_ID}?filter=hard`}
                className={`card group ${counts.hard === 0 ? 'pointer-events-none opacity-50' : ''}`}
              >
                <p className="text-sm text-[#8A8A8A]">어려운 단어</p>
                <p className="mt-2 font-mono text-2xl tabular-nums">
                  {Math.min(progressHard?.currentIndex ?? 0, counts.hard)}{' '}
                  <span className="text-[#5a5a5a]">/ {counts.hard}</span>
                </p>
                <p className="mt-3 text-xs text-[#5a5a5a]">
                  {counts.hard === 0 ? '학습 중 2를 눌러 표시하세요' : '어렵다고 표시한 단어만'}
                </p>
                <p className="mt-4 text-sm text-[#F2F2F2] group-hover:underline">어려운 것만 치기 →</p>
              </Link>
            </section>

            <section className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Link to="/words" className="btn-ghost">
                단어 목록 ({counts.known}개 알아요 · {counts.hard}개 어려워요)
              </Link>
              <Link to="/import?append=1" className="btn-ghost">
                파일 추가
              </Link>
              <button onClick={onRestart} className="btn-ghost">
                전체 학습 처음부터
              </button>
            </section>

            <p className="text-xs text-[#3a3a3a]">
              학습 중 <kbd>1</kbd> 알아요(제외) · <kbd>2</kbd> 어려워요(토글) · <kbd>←</kbd> <kbd>→</kbd> 이동 ·{' '}
              <kbd>Esc</kbd> 메뉴
            </p>
          </>
        )}
      </main>
    </>
  );
}

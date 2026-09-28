import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { MAIN_DECK_ID, resetProgress } from '../features/deck/deckService';

export function HomePage() {
  const navigate = useNavigate();
  // get()은 없을 때 undefined를 돌려주므로, 로딩 중과 구분하기 위해 null로 바꾸고 기본값은 'loading'으로 둔다.
  const deck = useLiveQuery(() => db.decks.get(MAIN_DECK_ID).then((d) => d ?? null), [], 'loading' as const);
  const progress = useLiveQuery(() => db.progress.get(MAIN_DECK_ID));
  const loading = deck === 'loading';

  const onRestart = async () => {
    if (!confirm('진행 위치를 처음으로 되돌릴까요? 단어장은 그대로 유지됩니다.')) return;
    await resetProgress(MAIN_DECK_ID);
    navigate(`/study/${MAIN_DECK_ID}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-6">
      <h1 className="font-mono text-4xl tracking-tight">TypeVoca</h1>

      {loading ? null : !deck ? (
        <>
          <p className="text-lg text-[#8A8A8A]">외우지 말고 그냥 쳐보세요.</p>
          <Link to="/import" className="btn-primary">
            PDF 넣기
          </Link>
          <p className="text-xs text-[#5a5a5a]">PDF는 브라우저 안에서만 처리됩니다.</p>
        </>
      ) : (
        <>
          <div className="text-center">
            <p className="text-lg text-[#8A8A8A]">{deck.name}</p>
            <p className="mt-2 font-mono text-3xl tabular-nums">
              {progress?.currentIndex ?? 0} / {deck.wordCount}
            </p>
          </div>
          <Link to={`/study/${deck.id}`} className="btn-primary" autoFocus>
            이어서 치기
          </Link>
          <div className="flex gap-6 text-sm">
            <Link to="/import?append=1" className="btn-ghost">
              PDF 추가
            </Link>
            <button onClick={onRestart} className="btn-ghost">
              처음부터
            </button>
          </div>
        </>
      )}
    </main>
  );
}

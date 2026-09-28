import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { NavBar } from '../components/NavBar';
import { MAIN_DECK_ID, deleteVocabulary, setVocabStatus, updateVocabulary } from '../features/deck/deckService';
import { sortVocab, statusOf } from '../db/repositories/vocabularyRepository';
import type { Vocabulary, VocabStatus } from '../types/vocabulary';

type Tab = 'all' | 'normal' | 'hard' | 'known';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'normal', label: '학습 중' },
  { key: 'hard', label: '어려워요' },
  { key: 'known', label: '알아요' },
];

export function WordsPage() {
  const words = useLiveQuery(
    () => db.vocabularies.where('deckId').equals(MAIN_DECK_ID).toArray().then(sortVocab),
    [],
    [] as Vocabulary[],
  );
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = { all: words.length, normal: 0, hard: 0, known: 0 };
    for (const w of words) c[statusOf(w)]++;
    return c;
  }, [words]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return words.filter((w) => {
      if (tab !== 'all' && statusOf(w) !== tab) return false;
      if (!needle) return true;
      return w.word.toLowerCase().includes(needle) || w.meaning.includes(needle);
    });
  }, [words, tab, q]);

  const toggle = (w: Vocabulary, s: VocabStatus) => {
    void setVocabStatus(w.id, statusOf(w) === s ? 'normal' : s);
  };

  const bulk = async (from: VocabStatus, to: VocabStatus) => {
    const targets = visible.filter((w) => statusOf(w) === from);
    if (!targets.length) return;
    if (!confirm(`${targets.length}개 단어의 표시를 바꿀까요?`)) return;
    await db.vocabularies.bulkUpdate(targets.map((w) => ({ key: w.id, changes: { status: to } })));
  };

  return (
    <>
      <NavBar />
      <main className="mx-auto w-full max-w-3xl px-6 pt-20 pb-24">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl">단어 목록</h1>
            <p className="mt-1 text-xs text-[#5a5a5a]">
              알아요 = 전체 학습에서 제외 · 어려워요 = 어려운 단어 학습에 포함
            </p>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="검색 (영어 / 한글)"
            className="w-56 rounded border border-[#2a2a2a] bg-[#161616] px-3 py-1.5 text-sm outline-none focus:border-[#5a5a5a]"
          />
        </header>

        <div className="mb-4 flex items-center gap-1 border-b border-[#1e1e1e] text-sm">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                '-mb-px border-b-2 px-3 py-2 transition-colors',
                tab === t.key
                  ? 'border-[#F2F2F2] text-[#F2F2F2]'
                  : 'border-transparent text-[#8A8A8A] hover:text-[#F2F2F2]',
              ].join(' ')}
            >
              {t.label} <span className="ml-1 text-xs text-[#5a5a5a] tabular-nums">{counts[t.key]}</span>
            </button>
          ))}
          <span className="flex-1" />
          {tab === 'known' && visible.length > 0 && (
            <button onClick={() => bulk('known', 'normal')} className="btn-ghost text-xs">
              모두 학습으로 되돌리기
            </button>
          )}
          {tab === 'hard' && visible.length > 0 && (
            <button onClick={() => bulk('hard', 'normal')} className="btn-ghost text-xs">
              모두 해제
            </button>
          )}
        </div>

        {words.length === 0 ? (
          <p className="py-16 text-center text-sm text-[#5a5a5a]">
            단어장이 비어 있어요.{' '}
            <Link to="/import" className="underline">
              파일 넣기
            </Link>
          </p>
        ) : visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-[#5a5a5a]">해당하는 단어가 없어요.</p>
        ) : (
          <ul>
            {visible.map((w) => (
              <WordRow
                key={w.id}
                w={w}
                editing={editing === w.id}
                onEdit={() => setEditing(w.id)}
                onDoneEdit={() => setEditing(null)}
                onToggle={toggle}
              />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

interface RowProps {
  w: Vocabulary;
  editing: boolean;
  onEdit: () => void;
  onDoneEdit: () => void;
  onToggle: (w: Vocabulary, s: VocabStatus) => void;
}

function WordRow({ w, editing, onEdit, onDoneEdit, onToggle }: RowProps) {
  const s = statusOf(w);
  const [word, setWord] = useState(w.word);
  const [meaning, setMeaning] = useState(w.meaning);

  const commit = async () => {
    const nw = word.trim();
    const nm = meaning.trim();
    if (nw && nm && (nw !== w.word || nm !== w.meaning)) await updateVocabulary(w.id, { word: nw, meaning: nm });
    onDoneEdit();
  };

  const onDelete = async () => {
    if (confirm(`"${w.word}" 단어를 삭제할까요?`)) await deleteVocabulary(w.id);
  };

  return (
    <li className="group flex items-center gap-3 border-b border-[#1a1a1a] py-2 text-sm">
      <span className="w-20 shrink-0 truncate font-mono text-[10px] text-[#3a3a3a]" title={w.sourceFile}>
        {w.sourceFile.replace(/\.(pdf|csv)$/i, '')} · {w.order}
      </span>

      {editing ? (
        <>
          <input
            autoFocus
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void commit();
              if (e.key === 'Escape') onDoneEdit();
            }}
            className="w-44 rounded border border-[#333] bg-[#1a1a1a] px-2 py-1 font-mono outline-none focus:border-[#666]"
          />
          <input
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void commit();
              if (e.key === 'Escape') onDoneEdit();
            }}
            className="flex-1 rounded border border-[#333] bg-[#1a1a1a] px-2 py-1 outline-none focus:border-[#666]"
          />
          <button onClick={commit} className="btn-ghost text-xs">
            저장
          </button>
        </>
      ) : (
        <>
          <span className={`w-44 shrink-0 font-mono ${s === 'known' ? 'text-[#5a5a5a] line-through' : ''}`}>
            {w.word}
          </span>
          <span className={`flex-1 truncate ${s === 'known' ? 'text-[#5a5a5a]' : 'text-[#bdbdbd]'}`}>
            {w.meaning}
          </span>
          <span className="w-12 shrink-0 text-right text-[10px] text-[#3a3a3a] tabular-nums" title="입력 횟수 / 오타">
            {w.typedCount}·{w.typoCount}
          </span>
          <button
            onClick={() => onToggle(w, 'hard')}
            className={[
              'rounded border px-2 py-0.5 text-xs transition-colors',
              s === 'hard'
                ? 'border-[#D9A441] text-[#D9A441]'
                : 'border-[#2a2a2a] text-[#5a5a5a] hover:border-[#5a5a5a] hover:text-[#F2F2F2]',
            ].join(' ')}
          >
            어려워요
          </button>
          <button
            onClick={() => onToggle(w, 'known')}
            className={[
              'rounded border px-2 py-0.5 text-xs transition-colors',
              s === 'known'
                ? 'border-[#8A8A8A] text-[#F2F2F2]'
                : 'border-[#2a2a2a] text-[#5a5a5a] hover:border-[#5a5a5a] hover:text-[#F2F2F2]',
            ].join(' ')}
          >
            알아요
          </button>
          <button
            onClick={onEdit}
            className="text-xs text-[#3a3a3a] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[#F2F2F2]"
          >
            수정
          </button>
          <button
            onClick={onDelete}
            className="text-xs text-[#3a3a3a] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[#C0605A]"
          >
            삭제
          </button>
        </>
      )}
    </li>
  );
}

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import { PdfDropzone } from '../components/PdfDropzone';
import { ParseResult } from '../components/ParseResult';
import { parseSiwonToeflPdf } from '../features/pdf/parseSiwonToeflPdf';
import { parseVocabCsv } from '../features/csv/parseVocabCsv';
import { totalWords } from '../features/pdf/validateParseResult';
import { MAIN_DECK_ID, addBuiltinWords, appendToDeck, replaceDeck, type AddBuiltinResult } from '../features/deck/deckService';
import { TOEFL_CORE, TOEFL_CORE_SOURCE } from '../data/toeflCore';
import { sortFilesNaturally } from '../utils/naturalSort';
import { settings } from '../utils/settings';
import type { FileParseResult } from '../types/parse';
import type { Vocabulary } from '../types/vocabulary';

type Phase = 'idle' | 'parsing' | 'preview' | 'saving';

export function ImportPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const append = params.get('append') === '1';

  const [phase, setPhase] = useState<Phase>('idle');
  const [progressText, setProgressText] = useState('');
  const [results, setResults] = useState<FileParseResult[]>([]);
  const [builtin, setBuiltin] = useState<'idle' | 'adding' | AddBuiltinResult>('idle');

  const onAddBuiltin = async () => {
    setBuiltin('adding');
    const r = await addBuiltinWords(TOEFL_CORE, TOEFL_CORE_SOURCE);
    setBuiltin(r);
  };

  const onFiles = async (picked: File[]) => {
    const files = sortFilesNaturally(picked);
    setPhase('parsing');
    const out: FileParseResult[] = [];
    for (let i = 0; i < files.length; i++) {
      setProgressText(`${files[i].name} 읽는 중… (${i + 1}/${files.length})`);
      const f = files[i];
      out.push(
        /\.csv$/i.test(f.name)
          ? await parseVocabCsv(f, MAIN_DECK_ID)
          : await parseSiwonToeflPdf(f, MAIN_DECK_ID),
      );
    }
    setResults(out);
    setPhase('preview');
  };

  const onChangeWord = (id: string, patch: Partial<Pick<Vocabulary, 'word' | 'meaning'>>) => {
    setResults((rs) =>
      rs.map((r) => ({ ...r, words: r.words.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
    );
  };

  const onDeleteWord = (id: string) => {
    setResults((rs) => rs.map((r) => ({ ...r, words: r.words.filter((w) => w.id !== id) })));
  };

  const onStart = async () => {
    setPhase('saving');
    const deck = append ? await appendToDeck(results) : await replaceDeck(results);
    settings.setLastDeckId(deck.id);
    navigate(`/study/${deck.id}`, { replace: true });
  };

  const total = totalWords(results);

  return (
    <>
    <NavBar />
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-6 pt-20 pb-16">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl">가져오기</h1>
        <span className="text-xs text-[#8A8A8A]">
          {append ? '기존 단어장에 추가 (같은 파일명은 덮어씀)' : '새 단어장으로 교체 (진행 위치 초기화)'}
        </span>
      </header>

      {phase === 'idle' && (
        <>
          <p className="text-lg text-[#8A8A8A]">PDF 또는 CSV 파일을 넣어주세요.</p>
          <PdfDropzone onFiles={onFiles} />
          <p className="text-xs text-[#5a5a5a]">
            파일은 서버로 전송되지 않고 브라우저 안에서만 읽습니다. PDF는 상단 표의 1~20번 단어와 뜻만,
            CSV는 <code>english,korean</code> 두 열을 읽습니다.
          </p>

          <section className="mt-6 rounded-lg border border-[#222] bg-[#151515] p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm">내장 TOEFL 핵심 단어 {TOEFL_CORE.length}개</p>
                <p className="mt-1 text-xs text-[#5a5a5a]">
                  AWL과 주요 TOEFL 대비 목록에 공통으로 나오는 고빈도 어휘. 이미 있는 영어 단어는 건너뜁니다.
                </p>
              </div>
              <button
                onClick={onAddBuiltin}
                disabled={builtin === 'adding'}
                className="btn-primary px-4 py-2 text-sm disabled:opacity-40"
              >
                {builtin === 'adding' ? '추가 중…' : '단어장에 추가'}
              </button>
            </div>
            {typeof builtin === 'object' && (
              <p className="mt-4 text-sm text-[#8A8A8A]">
                {builtin.added}개 추가됨
                {builtin.skipped > 0 && <> · 이미 있어서 건너뛴 단어 {builtin.skipped}개</>}
                {builtin.added > 0 && (
                  <>
                    {' · '}
                    <button onClick={() => navigate(`/study/${MAIN_DECK_ID}`)} className="underline hover:text-[#F2F2F2]">
                      이어서 치기
                    </button>
                  </>
                )}
              </p>
            )}
          </section>
        </>
      )}

      {phase === 'parsing' && <p className="text-[#8A8A8A]">{progressText}</p>}

      {(phase === 'preview' || phase === 'saving') && (
        <>
          <ParseResult results={results} onChangeWord={onChangeWord} onDeleteWord={onDeleteWord} />
          <div className="sticky bottom-0 -mx-6 flex items-center justify-between border-t border-[#222] bg-[#111111]/95 px-6 py-4 backdrop-blur">
            <button
              onClick={() => {
                setResults([]);
                setPhase('idle');
              }}
              className="btn-ghost text-sm"
            >
              다시 선택
            </button>
            <button
              onClick={onStart}
              disabled={total === 0 || phase === 'saving'}
              className="btn-primary disabled:opacity-40"
              autoFocus
            >
              {phase === 'saving' ? '저장 중…' : `이대로 시작하기 (${total} words)`}
            </button>
          </div>
        </>
      )}
    </main>
    </>
  );
}

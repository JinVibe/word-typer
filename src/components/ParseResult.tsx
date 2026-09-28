import type { FileParseResult } from '../types/parse';
import type { Vocabulary } from '../types/vocabulary';
import { fileStatus, totalWords } from '../features/pdf/validateParseResult';
import { VocabularyRow } from './VocabularyRow';

interface Props {
  results: FileParseResult[];
  onChangeWord: (id: string, patch: Partial<Pick<Vocabulary, 'word' | 'meaning'>>) => void;
  onDeleteWord: (id: string) => void;
}

const STATUS_ICON = { ok: '✓', warn: '⚠', error: '✕' } as const;
const STATUS_CLASS = { ok: 'text-[#8A8A8A]', warn: 'text-[#D9A441]', error: 'text-[#C0605A]' } as const;

export function ParseResult({ results, onChangeWord, onDeleteWord }: Props) {
  const total = totalWords(results);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="mb-1 text-lg">{results.length}개의 PDF를 읽었습니다.</p>
        <p className="mb-4 text-sm text-[#8A8A8A]">총 {total}개 단어</p>
        <ul className="divide-y divide-[#222] text-sm">
          {results.map((r) => {
            const s = fileStatus(r);
            return (
              <li key={r.file} className="flex items-center justify-between py-1.5">
                <span className="font-mono text-[#F2F2F2]">{r.file}</span>
                <span className={`flex items-center gap-2 ${STATUS_CLASS[s]}`}>
                  {s === 'error' ? (
                    <span className="text-xs">parsing failed</span>
                  ) : (
                    <span className="tabular-nums">{r.words.length}</span>
                  )}
                  <span>{STATUS_ICON[s]}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <p className="mb-2 text-xs text-[#5a5a5a]">행 위에 마우스를 올리면 수정 / 삭제할 수 있습니다.</p>
        {results.map((r) =>
          r.words.length ? (
            <div key={r.file} className="mb-6">
              <p className="mb-1 font-mono text-xs text-[#5a5a5a]">{r.file}</p>
              {r.words.map((v) => (
                <VocabularyRow key={v.id} vocab={v} onChange={onChangeWord} onDelete={onDeleteWord} />
              ))}
            </div>
          ) : null,
        )}
      </section>
    </div>
  );
}

import { useState } from 'react';
import type { Vocabulary } from '../types/vocabulary';

interface Props {
  vocab: Vocabulary;
  onChange: (id: string, patch: Partial<Pick<Vocabulary, 'word' | 'meaning'>>) => void;
  onDelete: (id: string) => void;
}

/** Preview에서 단어 / 뜻 수정, 행 삭제만 지원한다. */
export function VocabularyRow({ vocab, onChange, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [word, setWord] = useState(vocab.word);
  const [meaning, setMeaning] = useState(vocab.meaning);

  const commit = () => {
    const w = word.trim();
    const m = meaning.trim();
    if (w && m && (w !== vocab.word || m !== vocab.meaning)) {
      onChange(vocab.id, { word: w, meaning: m });
    } else {
      setWord(vocab.word);
      setMeaning(vocab.meaning);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 border-b border-[#222] py-2">
        <span className="w-8 shrink-0 text-right text-xs text-[#5a5a5a]">{vocab.order}</span>
        <input
          autoFocus
          value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-44 rounded border border-[#333] bg-[#1a1a1a] px-2 py-1 font-mono text-sm text-[#F2F2F2] outline-none focus:border-[#666]"
        />
        <input
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="flex-1 rounded border border-[#333] bg-[#1a1a1a] px-2 py-1 text-sm text-[#F2F2F2] outline-none focus:border-[#666]"
        />
        <button onClick={commit} className="text-xs text-[#8A8A8A] hover:text-[#F2F2F2]">
          저장
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2 border-b border-[#222] py-2">
      <span className="w-8 shrink-0 text-right text-xs text-[#5a5a5a]">{vocab.order}</span>
      <span className="w-44 shrink-0 font-mono text-sm text-[#F2F2F2]">{vocab.word}</span>
      <span className="flex-1 truncate text-sm text-[#bdbdbd]">{vocab.meaning}</span>
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-[#5a5a5a] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[#F2F2F2]"
      >
        수정
      </button>
      <button
        onClick={() => onDelete(vocab.id)}
        className="text-xs text-[#5a5a5a] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[#C0605A]"
      >
        삭제
      </button>
    </div>
  );
}

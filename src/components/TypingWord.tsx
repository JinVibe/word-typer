import { diffChars } from '../features/typing/typingUtils';

interface Props {
  word: string;
  meaning: string;
  typed: string;
}

/**
 * 영어 단어 + 한글 뜻 + 현재 입력 상태.
 * input box처럼 보이지 않게, 타깃 단어 위에 입력 진행을 겹쳐 보여준다.
 */
export function TypingWord({ word, meaning, typed }: Props) {
  const chars = diffChars(word, typed);

  return (
    <div className="flex flex-col items-center gap-10">
      <p className="font-mono text-5xl tracking-wide text-[#F2F2F2]">{word}</p>
      <p className="text-2xl text-[#8A8A8A]">{meaning}</p>

      <p className="font-mono text-4xl tracking-wide" aria-live="off">
        {chars.map((c, i) => (
          <span
            key={i}
            className={
              c.state === 'correct'
                ? 'text-[#F2F2F2]'
                : c.state === 'wrong'
                  ? 'text-[#C0605A]'
                  : 'text-[#3a3a3a]'
            }
          >
            {c.state === 'wrong' ? typed[i] : c.char}
            {i === typed.length - 1 && <span className="caret" />}
          </span>
        ))}
        {typed.length === 0 && <span className="caret caret-start" />}
      </p>
    </div>
  );
}

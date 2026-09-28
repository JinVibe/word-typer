import { NavLink, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { MAIN_DECK_ID } from '../features/deck/deckService';

interface Tab {
  to: string;
  label: string;
  /** 활성 판정: 현재 pathname + search 로 직접 계산한다 (같은 /study 경로를 filter로 구분하기 때문) */
  isActive: (pathname: string, search: string) => boolean;
}

const STUDY = `/study/${MAIN_DECK_ID}`;

const TABS: Tab[] = [
  { to: '/', label: '홈', isActive: (p) => p === '/' },
  { to: STUDY, label: '전체 학습', isActive: (p, s) => p.startsWith('/study') && !s.includes('filter=hard') },
  {
    to: `${STUDY}?filter=hard`,
    label: '어려운 단어',
    isActive: (p, s) => p.startsWith('/study') && s.includes('filter=hard'),
  },
  { to: '/words', label: '단어 목록', isActive: (p) => p.startsWith('/words') },
  { to: '/import', label: '가져오기', isActive: (p) => p.startsWith('/import') },
];

interface Props {
  /** Study 화면에서는 더 조용하게 */
  quiet?: boolean;
}

export function NavBar({ quiet }: Props) {
  const { pathname, search } = useLocation();
  const hardCount = useLiveQuery(
    () => db.vocabularies.where({ deckId: MAIN_DECK_ID, status: 'hard' }).count(),
    [],
    0,
  );

  return (
    <nav
      className={[
        'fixed top-0 left-0 right-0 z-20 flex h-12 items-center gap-1 border-b px-4 text-sm backdrop-blur select-none',
        quiet ? 'border-transparent bg-[#111111]/70' : 'border-[#1e1e1e] bg-[#111111]/95',
      ].join(' ')}
    >
      <NavLink to="/" className="mr-4 font-mono text-base text-[#F2F2F2]">
        TypeVoca
      </NavLink>
      {TABS.map((t) => {
        const active = t.isActive(pathname, search);
        return (
          <NavLink
            key={t.to}
            to={t.to}
            className={[
              'rounded px-3 py-1.5 transition-colors',
              active ? 'bg-[#1e1e1e] text-[#F2F2F2]' : 'text-[#8A8A8A] hover:text-[#F2F2F2]',
              quiet && !active ? 'opacity-60 hover:opacity-100' : '',
            ].join(' ')}
          >
            {t.label}
            {t.label === '어려운 단어' && hardCount > 0 && (
              <span className="ml-1.5 text-xs text-[#5a5a5a] tabular-nums">{hardCount}</span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

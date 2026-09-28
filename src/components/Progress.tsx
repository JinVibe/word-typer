interface Props {
  current: number;
  total: number;
  label?: string;
}

/** 우상단 진행 위치. 숫자 하나면 충분하다. */
export function Progress({ current, total, label }: Props) {
  return (
    <div className="fixed top-16 right-8 flex items-baseline gap-3 text-sm text-[#8A8A8A] tabular-nums select-none">
      {label && <span className="text-xs text-[#5a5a5a]">{label}</span>}
      <span>
        {current} / {total}
      </span>
    </div>
  );
}

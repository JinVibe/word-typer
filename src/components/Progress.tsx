interface Props {
  current: number;
  total: number;
}

/** 우상단 진행 위치. 숫자 하나면 충분하다. */
export function Progress({ current, total }: Props) {
  return (
    <div className="fixed top-6 right-8 text-sm text-[#8A8A8A] tabular-nums select-none">
      {current} / {total}
    </div>
  );
}

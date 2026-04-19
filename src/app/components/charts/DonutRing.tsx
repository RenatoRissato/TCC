interface DonutRingProps {
  going: number;
  absent: number;
  pending: number;
  total: number;
  size?: number;
}

export function DonutRing({ going, absent, pending, total, size = 160 }: DonutRingProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.37;
  const sw = size * 0.105;
  const C = 2 * Math.PI * r;
  const gap = 5;
  const gA = total > 0 ? Math.max((going   / total) * C - gap, 0) : 0;
  const aA = total > 0 ? Math.max((absent  / total) * C - gap, 0) : 0;
  const pA = total > 0 ? Math.max((pending / total) * C - gap, 0) : 0;
  const aO = -((going / total) * C);
  const pO = -(((going + absent) / total) * C);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={sw} />
        {gA > 0 && (
          <circle
            cx={cx} cy={cy} r={r} fill="none"
            strokeWidth={sw} strokeLinecap="round"
            className="stroke-success"
            strokeDasharray={`${gA} ${C}`}
            strokeDashoffset={0}
          />
        )}
        {aA > 0 && (
          <circle
            cx={cx} cy={cy} r={r} fill="none"
            strokeWidth={sw} strokeLinecap="round"
            className="stroke-danger"
            strokeDasharray={`${aA} ${C}`}
            strokeDashoffset={aO}
          />
        )}
        {pA > 0 && (
          <circle
            cx={cx} cy={cy} r={r} fill="none"
            strokeWidth={sw} strokeLinecap="round"
            className="stroke-warning"
            strokeDasharray={`${pA} ${C}`}
            strokeDashoffset={pO}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-black text-white leading-none"
          style={{ fontSize: size * 0.2 }}
        >
          {total}
        </span>
        <span
          className="font-bold text-white/40 tracking-[0.08em] mt-0.5"
          style={{ fontSize: size * 0.065 }}
        >
          TOTAL
        </span>
      </div>
    </div>
  );
}

interface SegmentoDonut {
  /** Valor absoluto da fatia (não percentual). */
  valor: number;
  /** Cor sólida da fatia em hex/rgb. */
  cor: string;
}

interface DonutRingProps {
  /** Fatias coloridas na ordem em que devem aparecer no anel. */
  segmentos?: SegmentoDonut[];
  total: number;
  size?: number;
  /** Texto exibido em destaque no centro do donut (default: "TOTAL"). */
  labelCentral?: string;
  // Props legadas — quando passadas (sem `segmentos`), o componente cai no
  // comportamento anterior de 3 fatias (going / absent / pending).
  going?: number;
  absent?: number;
  pending?: number;
}

export function DonutRing({
  segmentos, total, size = 160, labelCentral = 'TOTAL',
  going, absent, pending,
}: DonutRingProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.37;
  const sw = size * 0.105;
  const C = 2 * Math.PI * r;
  const gap = 5;

  // Compat: monta segmentos legados se o caller não passou `segmentos`.
  const segs: SegmentoDonut[] = segmentos ?? [
    { valor: going ?? 0,   cor: '#198754' },
    { valor: absent ?? 0,  cor: '#DC3545' },
    { valor: pending ?? 0, cor: '#FD7E14' },
  ];

  // Pré-calcula dashArray/dashOffset acumulado para cada segmento.
  let acumulado = 0;
  const segsRender = segs.map((s) => {
    const arco = total > 0 ? Math.max((s.valor / total) * C - gap, 0) : 0;
    const offset = -((acumulado / Math.max(total, 1)) * C);
    acumulado += s.valor;
    return { ...s, arco, offset };
  });

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={sw} />
        {segsRender.map((s, i) => (
          s.arco > 0 ? (
            <circle
              key={i}
              cx={cx} cy={cy} r={r} fill="none"
              strokeWidth={sw} strokeLinecap="round"
              stroke={s.cor}
              strokeDasharray={`${s.arco} ${C}`}
              strokeDashoffset={s.offset}
            />
          ) : null
        ))}
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
          {labelCentral}
        </span>
      </div>
    </div>
  );
}

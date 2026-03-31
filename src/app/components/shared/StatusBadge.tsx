import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { StudentStatus } from '../../data/mockData';

const CONFIG = {
  going:   { bg: '#198754', label: 'VAI',      Icon: CheckCircle2 },
  absent:  { bg: '#DC3545', label: 'NÃO VAI',  Icon: XCircle },
  pending: { bg: '#FD7E14', label: 'PENDENTE', Icon: Clock },
} as const;

export function StatusBadge({ status, size = 'md' }: { status: StudentStatus; size?: 'sm' | 'md' | 'lg' }) {
  const c = CONFIG[status];
  const sizes = {
    sm:  { fontSize: 10, px: 8,  py: 4,  iconSize: 12, gap: 4,  radius: 8  },
    md:  { fontSize: 12, px: 10, py: 6,  iconSize: 14, gap: 5,  radius: 10 },
    lg:  { fontSize: 13, px: 14, py: 8,  iconSize: 16, gap: 6,  radius: 12 },
  };
  const s = sizes[size];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        background: c.bg,
        color: '#fff',
        borderRadius: s.radius,
        padding: `${s.py}px ${s.px}px`,
        fontSize: s.fontSize,
        fontWeight: 800,
        letterSpacing: 0.4,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      <c.Icon size={s.iconSize} strokeWidth={2.5} />
      {c.label}
    </div>
  );
}

/** Dot-only version for compact spaces */
export function StatusDot({ status }: { status: StudentStatus }) {
  const colors = { going: '#198754', absent: '#DC3545', pending: '#FD7E14' };
  return (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: colors[status],
        flexShrink: 0,
      }}
    />
  );
}

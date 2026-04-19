import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { StudentStatus } from '../../types';

const CONFIG = {
  going:   { bg: 'bg-success', label: 'VAI',      Icon: CheckCircle2 },
  absent:  { bg: 'bg-danger',  label: 'NÃO VAI',  Icon: XCircle },
  pending: { bg: 'bg-warning', label: 'PENDENTE', Icon: Clock },
} as const;

const SIZE = {
  sm: { text: 'text-[10px]', pad: 'px-2 py-1',        gap: 'gap-1',     radius: 'rounded-lg',  icon: 12 },
  md: { text: 'text-xs',     pad: 'px-2.5 py-1.5',    gap: 'gap-[5px]', radius: 'rounded-[10px]', icon: 14 },
  lg: { text: 'text-[13px]', pad: 'px-3.5 py-2',      gap: 'gap-1.5',   radius: 'rounded-xl',  icon: 16 },
} as const;

interface Props {
  status: StudentStatus;
  size?: keyof typeof SIZE;
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const c = CONFIG[status];
  const s = SIZE[size];
  return (
    <div className={`inline-flex items-center text-white font-extrabold tracking-wider whitespace-nowrap shrink-0 ${c.bg} ${s.radius} ${s.pad} ${s.text} ${s.gap}`}>
      <c.Icon size={s.icon} strokeWidth={2.5} />
      {c.label}
    </div>
  );
}

const DOT_CLASS: Record<StudentStatus, string> = {
  going: 'bg-success',
  absent: 'bg-danger',
  pending: 'bg-warning',
};

export function StatusDot({ status }: { status: StudentStatus }) {
  return <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${DOT_CLASS[status]}`} />;
}

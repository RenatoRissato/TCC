import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { WeeklyBarChart } from '../charts/WeeklyBarChart';
import type { Summary } from '../../types';

const WEEKLY = [
  { day: 'Seg', going: 9,  absent: 2, pending: 1 },
  { day: 'Ter', going: 10, absent: 1, pending: 1 },
  { day: 'Qua', going: 8,  absent: 3, pending: 1 },
  { day: 'Qui', going: 11, absent: 1, pending: 0 },
  { day: 'Sex', going: 7,  absent: 2, pending: 3 },
];

interface PieTipPayload {
  dataKey: string;
  value: number;
  fill: string;
}

function ChartTip({ active, payload, label }: { active?: boolean; payload?: PieTipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-panel border border-app-border rounded-xl px-3.5 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.5)] font-sans">
      {label && <p className="text-xs font-bold text-ink m-0 mb-1.5">{label}</p>}
      {payload.map((e) => (
        <p key={e.dataKey} className="text-xs font-semibold m-0" style={{ color: e.fill }}>
          {e.dataKey}: <strong>{e.value}</strong>
        </p>
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-extrabold text-ink-soft tracking-[0.1em] uppercase m-0 mb-3">
      {children}
    </p>
  );
}

export function StatsSection({ summary }: { summary: Summary }) {
  const pieData = [
    { name: 'Vai',      value: summary.going,   color: '#198754' },
    { name: 'Não Vai',  value: summary.absent,  color: '#DC3545' },
    { name: 'Pendente', value: summary.pending, color: '#FD7E14' },
  ];
  const monthlyPct = 91;

  return (
    <>
      <SectionLabel>STATUS DE HOJE</SectionLabel>
      <div className="flex items-center gap-3.5">
        <div className="w-[140px] h-[140px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={56} paddingAngle={3} dataKey="value">
                {pieData.map((e) => <Cell key={e.name} fill={e.color} strokeWidth={0} />)}
              </Pie>
              <Tooltip content={<ChartTip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 flex flex-col gap-[9px]">
          {pieData.map((e) => (
            <div key={e.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: e.color }} />
              <p className="flex-1 text-[13px] font-semibold text-ink m-0">{e.name}</p>
              <span className="text-base font-black" style={{ color: e.color }}>{e.value}</span>
              <span className="text-[11px] text-ink-soft font-medium min-w-8">
                {summary.total > 0 ? Math.round((e.value / summary.total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-divider my-[18px]" />
      <SectionLabel>CONFIRMAÇÕES DA SEMANA</SectionLabel>
      <WeeklyBarChart data={WEEKLY} />

      <div className="h-px bg-divider my-[18px]" />
      <SectionLabel>TAXA DE PRESENÇA MENSAL</SectionLabel>
      <div className="flex items-center gap-[18px] bg-success/[0.08] border-[1.5px] border-success/20 rounded-[18px] px-5 py-[18px]">
        <div>
          <p className="text-[52px] font-black text-success leading-none m-0">
            {monthlyPct}<span className="text-2xl">%</span>
          </p>
          <p className="text-[11px] text-ink-soft m-0 mt-1">Março 2026</p>
        </div>
        <div>
          <div className="flex items-center gap-[5px] mb-1.5">
            <span className="text-base">📈</span>
            <span className="text-[13px] font-bold text-success">+3% vs. mês anterior</span>
          </div>
          <p className="text-xs text-ink-soft m-0 leading-normal">
            Excelente desempenho!<br />Meta mensal atingida.
          </p>
        </div>
      </div>
    </>
  );
}

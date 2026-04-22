import { CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react';
import { DonutRing } from '../charts/DonutRing';
import type { Summary } from '../../types';

interface OccupancySummaryProps {
  summary: Summary;
}

const STATS = [
  { key: 'going',   color: '#4ADE80', border: 'rgba(25,135,84,0.3)',  bg: 'rgba(25,135,84,0.18)',  label: 'VAI',      Icon: CheckCircle2 },
  { key: 'absent',  color: '#FF6B7A', border: 'rgba(220,53,69,0.3)',  bg: 'rgba(220,53,69,0.18)',  label: 'NÃO VAI',  Icon: XCircle },
  { key: 'pending', color: '#FD7E14', border: 'rgba(253,126,20,0.3)', bg: 'rgba(253,126,20,0.18)', label: 'PENDENTE', Icon: Clock },
] as const;

export function OccupancySummary({ summary }: OccupancySummaryProps) {
  const pct = summary.total > 0 ? Math.round(((summary.going + summary.absent) / summary.total) * 100) : 0;

  return (
    <div className="rounded-3xl overflow-hidden mb-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)] bg-[linear-gradient(145deg,#1C2128,#2C3440)] dark:bg-[linear-gradient(145deg,#161B22,#1C2128)]">
      <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-white/[0.06]">
        <div>
          <p className="text-[10px] font-extrabold text-white/40 tracking-[0.12em] uppercase mb-0.5 m-0">RESUMO DO DIA</p>
          <p className="text-sm font-bold text-white m-0">Todas as Rotas</p>
        </div>
        <div className="flex items-center gap-[5px] bg-[rgba(74,222,128,0.12)] rounded-[20px] px-2.5 py-[5px]">
          <span className="pulse-dot inline-block w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
          <span className="text-[11px] font-bold text-[#4ADE80]">AO VIVO</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 px-3.5 py-4">
        <DonutRing {...summary} size={152} />
        <div className="flex-1 flex flex-col gap-[7px]">
          {STATS.map(({ key, color, border, bg, label, Icon }) => (
            <div
              key={key}
              className="flex items-center gap-[9px] rounded-[13px] px-[11px] py-[9px]"
              style={{ background: bg, border: `1.5px solid ${border}` }}
            >
              <Icon size={17} color={color} strokeWidth={2.5} />
              <div>
                <p className="text-[22px] font-black m-0 leading-none" style={{ color }}>
                  {summary[key]}
                </p>
                <p className="text-[9px] font-bold text-white/50 m-0 tracking-[0.04em]">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-[18px] pb-4">
        <div className="flex justify-between mb-[5px]">
          <span className="text-[11px] text-white/40 font-medium flex items-center gap-1">
            <TrendingUp size={10} />
            Respostas recebidas
          </span>
          <span className="text-[11px] font-bold text-pending">{pct}%</span>
        </div>
        <div className="h-1.5 bg-white/[0.08] rounded-md overflow-hidden">
          <div
            className="h-full bg-[linear-gradient(90deg,#198754,#4ADE80)] rounded-md transition-[width] duration-600"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

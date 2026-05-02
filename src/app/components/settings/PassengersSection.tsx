import { ChevronRight, MapPin } from 'lucide-react';
import type { Passenger, Summary } from '../../types';

const STATUS_COLOR = {
  going: '#198754',
  absent: '#DC3545',
  pending: '#FD7E14',
} as const;

function MiniPassengerCard({ p, onNavigate }: { p: Passenger; onNavigate: () => void }) {
  return (
    <button
      onClick={onNavigate}
      className="flex items-center gap-3 w-full bg-surface border-[1.5px] border-app-border rounded-[14px] px-3.5 py-[11px] cursor-pointer text-left font-sans transition-colors hover:border-pending"
    >
      <div className="w-9 h-9 rounded-[11px] flex items-center justify-center text-xs font-extrabold text-pending shrink-0 bg-[linear-gradient(135deg,rgba(255,193,7,0.2),rgba(255,193,7,0.08))]">
        {p.initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-ink m-0 truncate">{p.name}</p>
        <p className="text-[11px] text-ink-soft m-0">{[p.grade, p.addressBairro].filter(Boolean).join(' · ')}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-[7px] h-[7px] rounded-full" style={{ background: STATUS_COLOR[p.status] }} />
        <ChevronRight size={14} className="text-ink-muted" strokeWidth={2} />
      </div>
    </button>
  );
}

interface PassengersSectionProps {
  passengers: Passenger[];
  pending: Passenger[];
  summary: Summary;
  onNavigate: () => void;
}

export function PassengersSection({ pending, summary, onNavigate }: PassengersSectionProps) {
  const stats = [
    { n: summary.going,   label: 'Vão',       color: '#198754', bg: 'rgba(25,135,84,0.1)'  },
    { n: summary.absent,  label: 'Ausentes',  color: '#DC3545', bg: 'rgba(220,53,69,0.1)'  },
    { n: summary.pending, label: 'Pendentes', color: '#FD7E14', bg: 'rgba(253,126,20,0.1)' },
  ];

  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {stats.map((x) => (
          <div key={x.label} className="rounded-xl px-2 py-2.5 text-center" style={{ background: x.bg }}>
            <p className="text-[22px] font-black m-0" style={{ color: x.color }}>{x.n}</p>
            <p className="text-[10px] font-bold m-0 opacity-80" style={{ color: x.color }}>{x.label}</p>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <>
          <p className="text-[11px] font-extrabold text-warning tracking-[0.09em] uppercase m-0 mb-2.5 flex items-center gap-1.5">
            <span className="pulse-dot inline-block w-[7px] h-[7px] rounded-full bg-warning" />
            AGUARDANDO RESPOSTA
          </p>
          <div className="flex flex-col gap-2 mb-3.5">
            {pending.slice(0, 4).map((p) => (
              <MiniPassengerCard key={p.id} p={p} onNavigate={onNavigate} />
            ))}
          </div>
        </>
      )}

      <button
        onClick={onNavigate}
        className="w-full flex items-center justify-center gap-2 bg-[#0EA5E9] border-0 rounded-[14px] py-3 px-6 text-sm font-bold text-white cursor-pointer min-h-[50px] font-sans shadow-[0_4px_16px_rgba(14,165,233,0.35)]"
      >
        <MapPin size={17} strokeWidth={2.5} /> Ver Lista Completa de Passageiros
      </button>
    </>
  );
}

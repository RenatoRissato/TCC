import type { PassengerFilter, PassengerPeriod } from '../../hooks/usePassengers';
import type { RotaRow, TurnoRota } from '../../types/database';

const TURNO_EMOJI: Record<TurnoRota, string> = {
  morning:   '☀️',
  afternoon: '🌤️',
  night:     '🌙',
};

const CHIPS: { key: PassengerFilter; label: string; color: string }[] = [
  { key: 'all',     label: 'Todos',        color: '#6C757D' },
  { key: 'going',   label: '✓ Vai',        color: '#198754' },
  { key: 'absent',  label: '✗ Não Vai',    color: '#DC3545' },
  { key: 'pending', label: '⏳ Pendente',  color: '#FD7E14' },
];

interface PassengerFiltersProps {
  period: PassengerPeriod;
  filter: PassengerFilter;
  counts: Record<PassengerFilter, number>;
  paddingX: number;
  rotas: RotaRow[];
  onPeriodChange: (p: PassengerPeriod) => void;
  onFilterChange: (f: PassengerFilter) => void;
}

export function PassengerFilters({
  period, filter, counts, paddingX, rotas, onPeriodChange, onFilterChange,
}: PassengerFiltersProps) {
  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-3" style={{ paddingLeft: paddingX, paddingRight: paddingX }}>
        <button
          onClick={() => onPeriodChange('all')}
          className={`flex items-center gap-[5px] shrink-0 border-0 rounded-[10px] px-3.5 py-2 text-xs font-bold min-h-[38px] font-sans cursor-pointer ${
            period === 'all' ? 'bg-pending text-[#212529]' : 'bg-white/[0.08] text-white/55'
          }`}
        >
          <span>📋</span> Todas
        </button>

        {rotas.map((r) => {
          const active = period === r.id;
          const emoji = TURNO_EMOJI[r.turno] ?? '🚌';
          return (
            <button
              key={r.id}
              onClick={() => onPeriodChange(r.id)}
              className={`flex items-center gap-[5px] shrink-0 border-0 rounded-[10px] px-3.5 py-2 text-xs font-bold min-h-[38px] font-sans cursor-pointer ${
                active ? 'bg-pending text-[#212529]' : 'bg-white/[0.08] text-white/55'
              }`}
            >
              <span>{emoji}</span>
              {r.nome}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto" style={{ paddingLeft: paddingX, paddingRight: paddingX }}>
        {CHIPS.map((chip) => {
          const active = filter === chip.key;
          return (
            <button
              key={chip.key}
              onClick={() => onFilterChange(chip.key)}
              className="flex items-center gap-1.5 shrink-0 rounded-full px-3.5 py-2 text-xs font-bold min-h-[40px] font-sans cursor-pointer"
              style={{
                background: active ? chip.color : 'rgba(255,255,255,0.1)',
                border: `2px solid ${active ? chip.color : 'transparent'}`,
                color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                boxShadow: active ? `0 4px 14px ${chip.color}48` : 'none',
              }}
            >
              {chip.label}
              <span
                className="min-w-5 h-5 px-[5px] rounded-[10px] text-[10px] font-extrabold flex items-center justify-center"
                style={{
                  background: active ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.1)',
                  color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                }}
              >
                {counts[chip.key]}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

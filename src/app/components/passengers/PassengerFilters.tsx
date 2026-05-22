import { CheckCircle2, XCircle, Clock, LayoutGrid, type LucideIcon } from 'lucide-react';
import type { PassengerFilter, PassengerPeriod } from '../../hooks/usePassengers';
import type { RotaRow, TurnoRota } from '../../types/database';

const TURNO_EMOJI: Record<TurnoRota, string> = {
  morning:   '☀️',
  afternoon: '🌤️',
  night:     '🌙',
};

interface ChipConfig {
  key: PassengerFilter;
  label: string;
  color: string;
  Icon: LucideIcon | null;
}

// Icones Lucide substituem emojis (✓ ✗ ⏳) — visual mais profissional e
// consistente com o resto do app (que ja usa Lucide em todos os botoes).
const CHIPS: ChipConfig[] = [
  { key: 'all',     label: 'Todos',     color: '#ADB5BD', Icon: null },
  { key: 'going',   label: 'Vai',       color: '#198754', Icon: CheckCircle2 },
  { key: 'absent',  label: 'Não Vai',   color: '#DC3545', Icon: XCircle },
  { key: 'pending', label: 'Pendente',  color: '#FD7E14', Icon: Clock },
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
      {/* Grupo 1 — Rotas (período). Carrossel horizontal sem scrollbar
          visivel. Pill ativo ganha gradient amarelo + glow; inativo fica
          com background sutil que sugere "clicavel" sem competir com o
          ativo. */}
      <div
        className="flex gap-2 overflow-x-auto pb-3 sr-no-scrollbar"
        style={{ paddingLeft: paddingX, paddingRight: paddingX }}
      >
        <button
          onClick={() => onPeriodChange('all')}
          aria-pressed={period === 'all'}
          className={`flex items-center gap-1.5 shrink-0 border-0 rounded-[12px] px-3.5 py-2 text-xs font-bold min-h-[38px] font-sans cursor-pointer transition-all sr-press ${
            period === 'all'
              ? 'text-[#212529] shadow-[0_4px_14px_rgba(255,193,7,0.35)]'
              : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.10] hover:text-white/85 border-[1.5px] border-white/[0.06]'
          }`}
          style={
            period === 'all'
              ? { background: 'linear-gradient(135deg, #FFD54F, #FFC107)' }
              : undefined
          }
        >
          <LayoutGrid size={13} strokeWidth={2.5} /> Todas
        </button>

        {rotas.map((r) => {
          const active = period === r.id;
          const emoji = TURNO_EMOJI[r.turno] ?? '🚌';
          return (
            <button
              key={r.id}
              onClick={() => onPeriodChange(r.id)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 shrink-0 border-0 rounded-[12px] px-3.5 py-2 text-xs font-bold min-h-[38px] font-sans cursor-pointer transition-all sr-press ${
                active
                  ? 'text-[#212529] shadow-[0_4px_14px_rgba(255,193,7,0.35)]'
                  : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.10] hover:text-white/85 border-[1.5px] border-white/[0.06]'
              }`}
              style={active ? { background: 'linear-gradient(135deg, #FFD54F, #FFC107)' } : undefined}
            >
              <span className="text-[13px] leading-none">{emoji}</span>
              {r.nome}
            </button>
          );
        })}
      </div>

      {/* Grupo 2 — Status. Pills com tint da cor do status quando inativos
          (sutil mas reconhecivel) e cor solida + glow quando ativos.
          Contador integrado, sem moldura extra. */}
      <div
        className="flex gap-2 overflow-x-auto sr-no-scrollbar"
        style={{ paddingLeft: paddingX, paddingRight: paddingX }}
      >
        {CHIPS.map((chip) => {
          const active = filter === chip.key;
          const tintBg = active ? chip.color : `${chip.color}1A`;
          const tintBorder = active ? chip.color : `${chip.color}33`;
          const labelColor = active ? '#fff' : chip.color;
          return (
            <button
              key={chip.key}
              onClick={() => onFilterChange(chip.key)}
              aria-pressed={active}
              className="flex items-center gap-1.5 shrink-0 rounded-full px-3 py-2 text-xs font-bold min-h-[38px] font-sans cursor-pointer transition-all sr-press"
              style={{
                background: tintBg,
                border: `1.5px solid ${tintBorder}`,
                color: labelColor,
                boxShadow: active ? `0 6px 18px ${chip.color}45` : 'none',
              }}
            >
              {chip.Icon && <chip.Icon size={13} strokeWidth={2.5} />}
              {chip.label}
              <span
                className="min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-extrabold flex items-center justify-center leading-none"
                style={{
                  background: active ? 'rgba(255,255,255,0.25)' : `${chip.color}22`,
                  color: active ? '#fff' : chip.color,
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

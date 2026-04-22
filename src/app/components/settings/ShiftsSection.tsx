import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Toggle } from '../shared/Toggle';

interface Shift {
  id: string;
  emoji: string;
  label: string;
  enabled: boolean;
  time: string;
  color: string;
}

interface ShiftCardProps {
  shift: Shift;
  onToggle: (v: boolean) => void;
  onTime: (v: string) => void;
}

function ShiftCard({ shift, onToggle, onTime }: ShiftCardProps) {
  const { emoji, label, enabled, time, color } = shift;
  return (
    <div
      className="rounded-[18px] overflow-hidden bg-surface transition-all duration-[250ms]"
      style={{
        border: `2px solid ${enabled ? color + '50' : 'var(--app-border)'}`,
        opacity: enabled ? 1 : 0.65,
      }}
    >
      <div
        className="flex items-center gap-3 p-4 border-b border-divider"
        style={{ background: enabled ? `${color}10` : 'transparent' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: enabled ? `${color}22` : 'var(--field)' }}
        >
          {emoji}
        </div>
        <div className="flex-1">
          <p className="text-[15px] font-extrabold text-ink m-0">{label}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: enabled ? '#4ADE80' : '#CED4DA' }}
            />
            <span
              className="text-[11px] font-semibold"
              style={{ color: enabled ? 'var(--success)' : 'var(--ink-muted)' }}
            >
              {enabled ? 'Turno Ativo' : 'Turno Inativo'}
            </span>
          </div>
        </div>
        <Toggle
          value={enabled}
          onChange={onToggle}
          color={color === '#FFC107' ? 'pending' : color === '#FD7E14' ? 'warning' : 'night'}
        />
      </div>
      <div className="p-4">
        <label className="block text-[11px] font-bold text-ink-soft mb-2 uppercase tracking-[0.06em]">
          Horário de Saída
        </label>
        <input
          type="time"
          value={time}
          onChange={(e) => onTime(e.target.value)}
          disabled={!enabled}
          className="w-full box-border rounded-xl px-3.5 py-2.5 text-xl font-extrabold outline-none font-sans min-h-[52px] transition-all tracking-[2px]"
          style={{
            background: enabled ? 'var(--field)' : 'var(--divider)',
            border: `2px solid ${enabled ? color + '50' : 'var(--field-border)'}`,
            color: enabled ? color : 'var(--ink-muted)',
            cursor: enabled ? 'pointer' : 'not-allowed',
          }}
        />
      </div>
    </div>
  );
}

interface ShiftsSectionProps {
  isDesktop: boolean;
}

export function ShiftsSection({ isDesktop }: ShiftsSectionProps) {
  const [shifts, setShifts] = useState<Shift[]>([
    { id: 'morning',   emoji: '☀️',  label: 'Rota Manhã',  enabled: true, time: '07:15', color: '#FFC107' },
    { id: 'afternoon', emoji: '🌤️', label: 'Rota Tarde',  enabled: true, time: '12:30', color: '#FD7E14' },
    { id: 'night',     emoji: '🌙',  label: 'Rota Noite',  enabled: true, time: '19:00', color: '#6C5CE7' },
  ]);
  const [saved, setSaved] = useState(false);

  const update = (id: string, ch: Partial<Shift>) =>
    setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, ...ch } : s)));

  const handleSave = async () => {
    await new Promise((r) => setTimeout(r, 500));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <div className={`grid gap-3.5 mb-4 ${isDesktop ? 'grid-cols-3' : 'grid-cols-1'}`}>
        {shifts.map((sh) => (
          <ShiftCard
            key={sh.id}
            shift={sh}
            onToggle={(v) => update(sh.id, { enabled: v })}
            onTime={(v) => update(sh.id, { time: v })}
          />
        ))}
      </div>
      <button
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-2 border-0 rounded-[14px] py-3 px-6 text-sm font-bold cursor-pointer min-h-[50px] font-sans transition-colors"
        style={{
          background: saved ? 'var(--success)' : 'var(--pending)',
          color: saved ? '#fff' : '#212529',
        }}
      >
        {saved ? (<><CheckCircle2 size={17} strokeWidth={2.5} />Salvo!</>) : 'Salvar Configurações'}
      </button>
    </>
  );
}

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { Toggle } from '../shared/Toggle';
import { Spinner } from '../whatsapp/Spinner';
import { supabase } from '../../../lib/supabase';
import type { RotaRow, TurnoRota } from '../../types/database';

interface ShiftUI {
  id: TurnoRota;
  emoji: string;
  label: string;
  enabled: boolean;
  time: string;       // HH:MM
  color: string;
  rotaId: string | null;
}

const TURNOS_DEFAULT: ShiftUI[] = [
  { id: 'morning',   emoji: '☀️',  label: 'Rota Manhã', enabled: true,  time: '07:00', color: '#FFC107', rotaId: null },
  { id: 'afternoon', emoji: '🌤️', label: 'Rota Tarde', enabled: true,  time: '12:00', color: '#FD7E14', rotaId: null },
  { id: 'night',     emoji: '🌙',  label: 'Rota Noite', enabled: true,  time: '17:30', color: '#6C5CE7', rotaId: null },
];

interface ShiftCardProps {
  shift: ShiftUI;
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
  const [shifts, setShifts] = useState<ShiftUI[]>(TURNOS_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      // Inclui rotas inativas — o motorista pode ter desativado um turno antes.
      const { data, error } = await supabase
        .from('rotas')
        .select('*')
        .order('horario_saida', { ascending: true });
      if (!ativo) return;
      if (error) {
        console.error('ShiftsSection load:', error);
        toast.error('Não foi possível carregar os turnos.');
        setLoading(false);
        return;
      }
      const rotas = (data ?? []) as RotaRow[];
      const proxima = TURNOS_DEFAULT.map((t) => {
        const rota = rotas.find((r) => r.turno === t.id);
        if (!rota) return t;
        return {
          ...t,
          enabled: rota.status === 'ativa',
          time: (rota.horario_saida ?? t.time).slice(0, 5),
          rotaId: rota.id,
        };
      });
      setShifts(proxima);
      setLoading(false);
    })();
    return () => { ativo = false; };
  }, []);

  const update = (id: TurnoRota, ch: Partial<ShiftUI>) =>
    setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, ...ch } : s)));

  const handleSave = async () => {
    const turnosComRota = shifts.filter((s) => s.rotaId);
    if (turnosComRota.length === 0) {
      toast.error('Nenhuma rota encontrada para salvar.');
      return;
    }
    setSalvando(true);
    let falhas = 0;
    for (const sh of turnosComRota) {
      // Update das rotas existentes — ativando/desativando via status e
      // ajustando horario_saida. Não criamos rotas novas aqui (isso é feito
      // pela Edge Function criar-perfil-motorista).
      const { error } = await supabase
        .from('rotas')
        .update({
          status: sh.enabled ? 'ativa' : 'inativa',
          horario_saida: sh.time,
        })
        .eq('id', sh.rotaId!);
      if (error) {
        console.error('ShiftsSection save', sh.id, error);
        falhas++;
      }
    }
    setSalvando(false);
    if (falhas === 0) {
      toast.success('Configurações de turnos salvas.');
    } else {
      toast.error(`Falha ao salvar ${falhas} turno(s). Tente novamente.`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-ink-soft text-sm gap-2">
        <Spinner size={18} /> Carregando turnos...
      </div>
    );
  }

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
        disabled={salvando}
        className="w-full flex items-center justify-center gap-2 border-0 rounded-[14px] py-3 px-6 text-sm font-bold cursor-pointer min-h-[50px] font-sans transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        style={{
          background: 'var(--pending)',
          color: '#212529',
        }}
      >
        {salvando
          ? <><Spinner size={17} />Salvando...</>
          : <><Save size={17} strokeWidth={2.5} />Salvar Configurações</>}
      </button>
    </>
  );
}

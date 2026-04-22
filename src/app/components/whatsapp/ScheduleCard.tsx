import { ComponentType } from 'react';
import { Clock, Sunrise, Sun, Moon, Save, CheckCircle2 } from 'lucide-react';
import { SLabel } from './SLabel';

interface TimeRowProps {
  Icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  sub: string;
  color: string;
  value: string;
  onChange: (v: string) => void;
}

function TimeRow({ Icon, label, sub, color, value, onChange }: TimeRowProps) {
  return (
    <div className="flex items-center gap-3.5 px-4 py-3">
      <div
        className="w-10 h-10 rounded-[13px] flex items-center justify-center shrink-0"
        style={{ background: `${color}20` }}
      >
        <Icon size={20} color={color} strokeWidth={2} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-ink m-0 mb-px">{label}</p>
        <p className="text-xs text-ink-soft m-0">{sub}</p>
      </div>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-field border-2 border-field-border rounded-xl px-3 py-2 text-sm font-bold text-ink outline-none font-sans cursor-pointer min-h-[44px] shrink-0 focus:border-whatsapp"
      />
    </div>
  );
}

interface ScheduleCardProps {
  morning: string;
  afternoon: string;
  night: string;
  onMorning: (v: string) => void;
  onAfternoon: (v: string) => void;
  onNight: (v: string) => void;
  saved: boolean;
  onSave: () => void;
}

export function ScheduleCard({
  morning, afternoon, night,
  onMorning, onAfternoon, onNight,
  saved, onSave,
}: ScheduleCardProps) {
  return (
    <section>
      <SLabel>Horário de Envio Automático</SLabel>
      <div className="bg-panel rounded-3xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.5)] border-[1.5px] border-panel-border transition-colors duration-300">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-pending/[0.08] border-b border-divider">
          <Clock size={15} color="#FFC107" strokeWidth={2.5} />
          <p className="text-xs m-0 font-medium leading-[1.4] text-[#856404] dark:text-[rgba(255,193,7,0.9)]">
            Mensagens enviadas <strong>1 dia antes</strong> da rota, no horário configurado.
          </p>
        </div>
        <TimeRow Icon={Sunrise} label="Rota Manhã" sub="Aviso enviado na véspera" color="#FFC107" value={morning}   onChange={onMorning} />
        <div className="h-px bg-divider mx-4" />
        <TimeRow Icon={Sun}     label="Rota Tarde" sub="Aviso enviado de manhã"  color="#FD7E14" value={afternoon} onChange={onAfternoon} />
        <div className="h-px bg-divider mx-4" />
        <TimeRow Icon={Moon}    label="Rota Noite" sub="Aviso enviado à tarde"   color="#6C5CE7" value={night}     onChange={onNight} />
        <div className="px-4 pt-3 pb-4">
          <button
            onClick={onSave}
            className="touch-scale w-full flex items-center justify-center gap-2 border-0 rounded-[14px] py-3 px-6 text-sm font-bold cursor-pointer min-h-[48px] font-sans transition-colors"
            style={{
              background: saved ? 'var(--success)' : 'var(--pending)',
              color: saved ? '#fff' : '#212529',
            }}
          >
            {saved
              ? <><CheckCircle2 size={17} strokeWidth={2.5} />Horários Salvos!</>
              : <><Save size={17} strokeWidth={2.5} />Salvar Horários</>}
          </button>
        </div>
      </div>
    </section>
  );
}

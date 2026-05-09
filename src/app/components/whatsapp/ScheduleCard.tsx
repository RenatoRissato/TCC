import { Clock, Send, Hourglass, Save, CheckCircle2 } from 'lucide-react';
import { SLabel } from './SLabel';
import { Spinner } from './Spinner';
import { Toggle } from '../shared/Toggle';

interface ScheduleCardProps {
  envioAutomaticoAtivo: boolean;
  horarioEnvioAuto: string;
  horarioLimiteResp: string;
  onEnvioAutomaticoChange: (v: boolean) => void;
  onHorarioEnvioChange: (v: string) => void;
  onHorarioLimiteChange: (v: string) => void;
  salvando: boolean;
  onSalvar: () => void;
  desabilitado?: boolean;
}

export function ScheduleCard({
  envioAutomaticoAtivo,
  horarioEnvioAuto,
  horarioLimiteResp,
  onEnvioAutomaticoChange,
  onHorarioEnvioChange,
  onHorarioLimiteChange,
  salvando,
  onSalvar,
  desabilitado,
}: ScheduleCardProps) {
  return (
    <section>
      <SLabel>Envio Automático</SLabel>
      <div className="bg-panel rounded-3xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.5)] border-[1.5px] border-panel-border transition-colors duration-300">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-pending/[0.08] border-b border-divider">
          <Clock size={15} color="#FFC107" strokeWidth={2.5} />
          <p className="text-xs m-0 font-medium leading-[1.4] text-[#856404] dark:text-[rgba(255,193,7,0.9)]">
            Mensagens enviadas <strong>1 dia antes</strong> da rota, no horário configurado.
          </p>
        </div>

        <div className="flex items-center gap-3.5 px-4 py-3.5 border-b border-divider">
          <div
            className="w-10 h-10 rounded-[13px] flex items-center justify-center shrink-0"
            style={{ background: 'rgba(37,211,102,0.18)' }}
          >
            <Send size={18} color="#25D366" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink m-0">Envio automático</p>
            <p className="text-[11px] text-ink-soft m-0">
              {envioAutomaticoAtivo ? 'Cron diário ativo' : 'Cron desativado'}
            </p>
          </div>
          <Toggle
            value={envioAutomaticoAtivo}
            onChange={onEnvioAutomaticoChange}
            color="success"
          />
        </div>

        <div className="flex items-center gap-3.5 px-4 py-3 border-b border-divider">
          <div
            className="w-10 h-10 rounded-[13px] flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,193,7,0.18)' }}
          >
            <Clock size={18} color="#FFC107" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink m-0">Horário de envio</p>
            <p className="text-[11px] text-ink-soft m-0">Hora em que as mensagens disparam</p>
          </div>
          <input
            type="time"
            value={horarioEnvioAuto}
            onChange={(e) => onHorarioEnvioChange(e.target.value)}
            disabled={!envioAutomaticoAtivo}
            className="bg-field border-2 border-field-border rounded-xl px-3 py-2 text-sm font-bold text-ink outline-none font-sans cursor-pointer min-h-[44px] shrink-0 focus:border-whatsapp disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="flex items-center gap-3.5 px-4 py-3">
          <div
            className="w-10 h-10 rounded-[13px] flex items-center justify-center shrink-0"
            style={{ background: 'rgba(253,126,20,0.18)' }}
          >
            <Hourglass size={18} color="#FD7E14" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink m-0">Limite de resposta</p>
            <p className="text-[11px] text-ink-soft m-0">Após esse horário pendentes viram ausentes</p>
          </div>
          <input
            type="time"
            value={horarioLimiteResp}
            onChange={(e) => onHorarioLimiteChange(e.target.value)}
            className="bg-field border-2 border-field-border rounded-xl px-3 py-2 text-sm font-bold text-ink outline-none font-sans cursor-pointer min-h-[44px] shrink-0 focus:border-whatsapp"
          />
        </div>

        <div className="px-4 pt-3 pb-4">
          <button
            onClick={onSalvar}
            disabled={salvando || desabilitado}
            className="touch-scale w-full flex items-center justify-center gap-2 border-0 rounded-[14px] py-3 px-6 text-sm font-bold cursor-pointer min-h-[48px] font-sans transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: 'var(--pending)',
              color: '#212529',
            }}
          >
            {salvando
              ? <><Spinner size={17} />Salvando...</>
              : <><Save size={17} strokeWidth={2.5} />Salvar Configurações</>}
          </button>
          {desabilitado && (
            <p className="text-[11px] text-ink-muted text-center mt-2 m-0">
              Salvar fica disponível assim que a instância WhatsApp estiver carregada.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

// Re-export para retrocompatibilidade nominal — alguns lugares importavam o ícone direto.
export { CheckCircle2 };

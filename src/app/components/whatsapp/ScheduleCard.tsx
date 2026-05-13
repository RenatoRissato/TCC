import { Clock, Send, Save, CheckCircle2, Route } from 'lucide-react';
import { SLabel } from './SLabel';
import { Spinner } from './Spinner';
import { Toggle } from '../shared/Toggle';
import type { RotaRow } from '../../types/database';

interface ScheduleCardProps {
  envioAutomaticoAtivo: boolean;
  horarioEnvioAuto: string;
  routeMode: 'all' | 'specific';
  routeId: string;
  rotas: RotaRow[];
  onEnvioAutomaticoChange: (v: boolean) => void;
  onHorarioEnvioChange: (v: string) => void;
  onRouteModeChange: (v: 'all' | 'specific') => void;
  onRouteIdChange: (v: string) => void;
  salvando: boolean;
  onSalvar: () => void;
  desabilitado?: boolean;
}

export function ScheduleCard({
  envioAutomaticoAtivo,
  horarioEnvioAuto,
  routeMode,
  routeId,
  rotas,
  onEnvioAutomaticoChange,
  onHorarioEnvioChange,
  onRouteModeChange,
  onRouteIdChange,
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
            Mensagens enviadas no horário configurado. As confirmações valem só para o dia atual e recomeçam como pendentes no dia seguinte.
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

        <div className="px-4 py-3.5 border-b border-divider">
          <div className="flex items-start gap-3.5">
            <div
              className="w-10 h-10 rounded-[13px] flex items-center justify-center shrink-0"
              style={{ background: 'rgba(41,121,255,0.14)' }}
            >
              <Route size={18} color="#2979FF" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink m-0">Rotas do envio</p>
              <p className="text-[11px] text-ink-soft m-0">Escolha o alcance do cron automatico</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              type="button"
              disabled={!envioAutomaticoAtivo}
              onClick={() => onRouteModeChange('all')}
              className={[
                'min-h-[44px] rounded-xl border-2 px-3 text-xs font-bold transition-colors',
                routeMode === 'all'
                  ? 'border-whatsapp bg-whatsapp/10 text-whatsapp'
                  : 'border-field-border bg-field text-ink-soft',
                !envioAutomaticoAtivo ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              Todas as rotas
            </button>
            <button
              type="button"
              disabled={!envioAutomaticoAtivo}
              onClick={() => onRouteModeChange('specific')}
              className={[
                'min-h-[44px] rounded-xl border-2 px-3 text-xs font-bold transition-colors',
                routeMode === 'specific'
                  ? 'border-whatsapp bg-whatsapp/10 text-whatsapp'
                  : 'border-field-border bg-field text-ink-soft',
                !envioAutomaticoAtivo ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              Rota especifica
            </button>
          </div>

          {routeMode === 'specific' && (
            <div className="mt-3">
              <select
                value={routeId}
                onChange={(e) => onRouteIdChange(e.target.value)}
                disabled={!envioAutomaticoAtivo || rotas.length === 0}
                className="w-full bg-field border-2 border-field-border rounded-xl px-3 py-3 text-sm font-semibold text-ink outline-none font-sans min-h-[46px] focus:border-whatsapp disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Selecione uma rota</option>
                {rotas.map((rota) => (
                  <option key={rota.id} value={rota.id}>
                    {rota.nome}{rota.horario_saida ? ` - ${rota.horario_saida.slice(0, 5)}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-ink-muted mt-2 m-0">
                O cron enviara mensagens apenas para passageiros vinculados a esta rota.
              </p>
            </div>
          )}
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

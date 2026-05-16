import { Clock, Send, Save, CheckCircle2, Route } from 'lucide-react';
import { SLabel } from './SLabel';
import { Spinner } from './Spinner';
import { Toggle } from '../shared/Toggle';
import type { RotaAutomacaoState } from '../../hooks/useWhatsApp';

interface ScheduleCardProps {
  envioAutomaticoAtivo: boolean;
  conectado: boolean;
  rotasEnvioAuto: RotaAutomacaoState[];
  onEnvioAutomaticoChange: (v: boolean) => void;
  onRotaAutomacaoChange: (
    rotaId: string,
    patch: Partial<Pick<RotaAutomacaoState, 'envioAutomaticoAtivo' | 'horarioEnvio'>>,
  ) => void;
  onAtivacaoBloqueada: () => void;
  salvando: boolean;
  onSalvar: () => void;
  desabilitado?: boolean;
}

const CORES_TURNO: Record<RotaAutomacaoState['turno'], string> = {
  morning: '#FFC107',
  afternoon: '#FD7E14',
  night: '#6C5CE7',
};

function RouteScheduleRow({
  rota,
  conectado,
  disabled,
  onChange,
  onBlocked,
}: {
  rota: RotaAutomacaoState;
  conectado: boolean;
  disabled: boolean;
  onChange: ScheduleCardProps['onRotaAutomacaoChange'];
  onBlocked: () => void;
}) {
  const color = CORES_TURNO[rota.turno] ?? '#25D366';
  const rowDisabled = disabled || !rota.ativa;
  const toggleVisualValue = conectado ? rota.envioAutomaticoAtivo : false;

  return (
    <div
      className="rounded-2xl border-[1.5px] border-field-border bg-field px-3 py-3 transition-colors"
      style={{ opacity: rowDisabled ? 0.65 : 1 }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-[13px] flex items-center justify-center shrink-0"
          style={{ background: `${color}22` }}
        >
          <Route size={18} color={color} strokeWidth={2.3} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-ink m-0 truncate">{rota.nome}</p>
          <p className="text-[11px] text-ink-soft m-0">
            {rota.ativa ? 'Rota ativa' : 'Rota inativa'}
            {rota.horarioSaida ? ` - saida ${rota.horarioSaida.slice(0, 5)}` : ''}
          </p>
        </div>
        <Toggle
          value={toggleVisualValue}
          onChange={(v) => {
            if (!conectado) {
              onBlocked();
              return;
            }
            if (!rowDisabled) onChange(rota.rotaId, { envioAutomaticoAtivo: v });
          }}
          color={rota.turno === 'morning' ? 'pending' : rota.turno === 'afternoon' ? 'warning' : 'night'}
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1 text-[11px] font-semibold text-ink-soft">
          <Clock size={14} color={color} strokeWidth={2.4} />
          Horario do disparo
        </div>
        <input
          type="time"
          value={rota.horarioEnvio}
          onChange={(e) => onChange(rota.rotaId, { horarioEnvio: e.target.value })}
          disabled={rowDisabled || !rota.envioAutomaticoAtivo}
          className="bg-panel border-2 border-field-border rounded-xl px-3 py-2 text-sm font-bold text-ink outline-none font-sans cursor-pointer min-h-[42px] shrink-0 focus:border-whatsapp disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}

export function ScheduleCard({
  envioAutomaticoAtivo,
  conectado,
  rotasEnvioAuto,
  onEnvioAutomaticoChange,
  onRotaAutomacaoChange,
  onAtivacaoBloqueada,
  salvando,
  onSalvar,
  desabilitado,
}: ScheduleCardProps) {
  const envioAutomaticoVisual = conectado ? envioAutomaticoAtivo : false;

  return (
    <section>
      <SLabel>Envio Automatico</SLabel>
      <div className="bg-panel rounded-3xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.5)] border-[1.5px] border-panel-border transition-colors duration-300">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-pending/[0.08] border-b border-divider">
          <Clock size={15} color="#FFC107" strokeWidth={2.5} />
          <p className="text-xs m-0 font-medium leading-[1.4] text-[#856404] dark:text-[rgba(255,193,7,0.9)]">
            Cada rota pode ter seu proprio horario de disparo. As confirmacoes valem so para o dia atual.
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
            <p className="text-sm font-semibold text-ink m-0">Envio automatico</p>
            <p className="text-[11px] text-ink-soft m-0">
              {envioAutomaticoVisual ? 'Cron diario ativo' : 'Cron desativado'}
            </p>
          </div>
          <Toggle
            value={envioAutomaticoVisual}
            onChange={(v) => {
              if (!conectado && v) {
                onAtivacaoBloqueada();
                return;
              }
              onEnvioAutomaticoChange(v);
            }}
            color="success"
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
              <p className="text-[11px] text-ink-soft m-0">
                Configure todas as rotas de uma vez
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2.5">
            {rotasEnvioAuto.length === 0 ? (
              <div className="rounded-2xl border-[1.5px] border-field-border bg-field px-4 py-4 text-sm font-semibold text-ink-soft text-center">
                Nenhuma rota encontrada para configurar.
              </div>
            ) : (
              rotasEnvioAuto.map((rota) => (
                <RouteScheduleRow
                  key={rota.rotaId}
                  rota={rota}
                  conectado={conectado}
                  disabled={!envioAutomaticoVisual}
                  onChange={onRotaAutomacaoChange}
                  onBlocked={onAtivacaoBloqueada}
                />
              ))
            )}
          </div>
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
              : <><Save size={17} strokeWidth={2.5} />Salvar Configuracoes</>}
          </button>
          {desabilitado && (
            <p className="text-[11px] text-ink-muted text-center mt-2 m-0">
              Salvar fica disponivel depois que o WhatsApp estiver conectado.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

// Re-export para retrocompatibilidade nominal.
export { CheckCircle2 };

import { Sunrise, Sun, Moon, Loader2, Shuffle, Users, Clock } from 'lucide-react';
import type { RouteConfig } from '../../types';

const ICON_MAP = { morning: Sunrise, afternoon: Sun, night: Moon };

interface RouteButtonProps extends RouteConfig {
  onClick: () => void;
  onOtimizarSequencia?: (rotaId: string) => void;
  otimizandoSequencia?: boolean;
}

/**
 * Card visual de cada rota no Dashboard. Cores:
 *  - Manha/Tarde: fundo cheio na cor do turno (amarelo/laranja)
 *  - Noite: fundo dark roxo escuro com acentos lilas
 *
 * Hierarquia tipografica refeita pra refletir importancia real:
 *  HORA (dado primario, motorista olha pra saber quando sair) >
 *  NOME (contexto da rota) >
 *  PASSAGEIROS (contagem secundaria)
 */
export function RouteButton({
  label, time, passengerCount, color, darkBg, type, rotaId,
  onClick, onOtimizarSequencia, otimizandoSequencia,
}: RouteButtonProps) {
  const Icon = ICON_MAP[type];
  const podeOtimizar = !!rotaId && !!onOtimizarSequencia;
  // Tom de texto principal pelo fundo do card. Em cards claros (manha/tarde)
  // texto preto pra contraste; em card noite (dark) texto branco.
  const textoPri = darkBg ? '#fff' : '#212529';
  const textoSec = darkBg ? `${color}CC` : 'rgba(33,37,41,0.7)';
  const tileBg = darkBg ? `${color}26` : 'rgba(33,37,41,0.12)';

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className="sr-card-lift touch-scale group relative overflow-hidden flex flex-col items-start flex-1 min-h-[124px] rounded-[20px] px-4 py-4 font-sans cursor-pointer"
      style={{
        background: darkBg ? '#1E1B3A' : color,
        border: darkBg ? `2px solid ${color}40` : '2px solid transparent',
        boxShadow: darkBg ? `0 6px 26px ${color}30` : `0 6px 26px ${color}55`,
      }}
    >
      {/* Blob radial decorativo no canto superior direito — gradient sutil
          que da volume sem chocar com a cor do card. Substitui o circulo
          chapado anterior. */}
      <div
        aria-hidden="true"
        className="absolute -top-12 -right-12 w-[140px] h-[140px] rounded-full pointer-events-none"
        style={{
          background: darkBg
            ? `radial-gradient(circle, ${color}28 0%, transparent 65%)`
            : 'radial-gradient(circle, rgba(255,255,255,0.30) 0%, transparent 60%)',
        }}
      />

      {/* Linha do topo: icone turno + (se aplicavel) botao shuffle no canto */}
      <div className="relative w-full flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-[11px] flex items-center justify-center"
          style={{
            background: darkBg ? `${color}22` : 'rgba(255,255,255,0.32)',
            border: darkBg ? `1px solid ${color}3A` : '1px solid rgba(255,255,255,0.35)',
          }}
        >
          <Icon size={18} color={darkBg ? color : '#212529'} strokeWidth={2.4} />
        </div>

        {podeOtimizar && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (rotaId) onOtimizarSequencia!(rotaId); }}
            disabled={otimizandoSequencia}
            aria-label={`Otimizar sequência de passageiros da ${label}`}
            title="Otimizar sequência dos passageiros"
            className="sr-press w-9 h-9 rounded-[11px] flex items-center justify-center cursor-pointer border-0 transition-transform hover:scale-105 disabled:opacity-70"
            style={{
              background: darkBg ? 'rgba(255,255,255,0.95)' : 'rgba(33,37,41,0.92)',
              color: darkBg ? '#6C5CE7' : '#FFC107',
              boxShadow: '0 2px 10px rgba(0,0,0,0.28)',
            }}
          >
            {otimizandoSequencia
              ? <Loader2 size={15} strokeWidth={2.5} style={{ animation: 'spin 0.8s linear infinite' }} />
              : <Shuffle size={14} strokeWidth={2.8} />}
          </button>
        )}
      </div>

      {/* Bloco do dado principal: NOME (12px font-extrabold) + HORA grande
          (22px font-black) com icone Clock pra contexto rapido. */}
      <div className="relative mt-2.5 flex flex-col items-start gap-1">
        <p
          className="text-[12px] font-extrabold leading-none m-0 uppercase tracking-[0.04em]"
          style={{ color: textoPri }}
        >
          {label}
        </p>
        <div className="flex items-center gap-1.5">
          <Clock size={13} strokeWidth={2.6} style={{ color: textoSec }} />
          <span
            className="text-[20px] font-black leading-none tabular-nums tracking-tight"
            style={{ color: textoPri, letterSpacing: '-0.02em' }}
          >
            {time}
          </span>
        </div>
      </div>

      {/* Badge passageiros — emoji 👤 substituido por icone Users (Lucide)
          pra consistencia com o resto do app, e tile com border sutil. */}
      <div
        className="relative ml-auto mt-auto flex items-center gap-1.5 rounded-full px-2.5 py-1"
        style={{
          background: tileBg,
          border: darkBg ? `1px solid ${color}3A` : '1px solid rgba(33,37,41,0.08)',
        }}
      >
        <Users size={11} strokeWidth={2.6} style={{ color: darkBg ? color : '#212529' }} />
        <span
          className="text-[11px] font-extrabold leading-none tabular-nums"
          style={{ color: darkBg ? color : '#212529' }}
        >
          {passengerCount}
        </span>
      </div>
    </div>
  );
}

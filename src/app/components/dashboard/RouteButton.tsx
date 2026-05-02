import { Sunrise, Sun, Moon, Play, Loader2, Shuffle } from 'lucide-react';
import type { RouteConfig } from '../../types';

const ICON_MAP = { morning: Sunrise, afternoon: Sun, night: Moon };

interface RouteButtonProps extends RouteConfig {
  onClick: () => void;
  onIniciarViagem?: (rotaId: string) => void;
  iniciandoViagem?: boolean;
  onOtimizarSequencia?: (rotaId: string) => void;
  otimizandoSequencia?: boolean;
}

export function RouteButton({
  label, time, passengerCount, color, darkBg, type, rotaId,
  onClick, onIniciarViagem, iniciandoViagem, onOtimizarSequencia, otimizandoSequencia,
}: RouteButtonProps) {
  const Icon = ICON_MAP[type];
  const podeIniciar = !!rotaId && !!onIniciarViagem;
  const podeOtimizar = !!rotaId && !!onOtimizarSequencia;
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className="touch-scale relative overflow-hidden flex flex-col items-start flex-1 min-h-[108px] rounded-[20px] px-3.5 py-4 font-sans cursor-pointer"
      style={{
        background: darkBg ? '#1E1B3A' : color,
        border: darkBg ? `2px solid ${color}40` : '2px solid transparent',
        boxShadow: darkBg ? `0 4px 24px ${color}28` : `0 4px 24px ${color}48`,
      }}
    >
      <div
        className="absolute -top-[18px] -right-[18px] w-[72px] h-[72px] rounded-full pointer-events-none"
        style={{ background: darkBg ? `${color}18` : 'rgba(255,255,255,0.2)' }}
      />

      {(podeIniciar || podeOtimizar) && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
          {podeOtimizar && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (rotaId) onOtimizarSequencia!(rotaId); }}
              disabled={otimizandoSequencia}
              aria-label={`Otimizar sequência de passageiros da ${label}`}
              title="Otimizar sequência dos passageiros"
              className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-0 transition-transform"
              style={{
                background: darkBg ? 'rgba(255,255,255,0.92)' : 'rgba(33,37,41,0.9)',
                color: darkBg ? '#6C5CE7' : '#FFC107',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                opacity: otimizandoSequencia ? 0.7 : 1,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            >
              {otimizandoSequencia
                ? <Loader2 size={16} strokeWidth={2.5} style={{ animation: 'spin 0.8s linear infinite' }} />
                : <Shuffle size={15} strokeWidth={2.8} />}
            </button>
          )}

          {podeIniciar && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (rotaId) onIniciarViagem!(rotaId); }}
              disabled={iniciandoViagem}
              aria-label={`Iniciar viagem da ${label}`}
              className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-0 transition-transform"
              style={{
                background: darkBg ? color : 'rgba(33,37,41,0.9)',
                color: darkBg ? '#212529' : '#FFC107',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                opacity: iniciandoViagem ? 0.7 : 1,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            >
              {iniciandoViagem
                ? <Loader2 size={16} strokeWidth={2.5} style={{ animation: 'spin 0.8s linear infinite' }} />
                : <Play size={15} strokeWidth={2.8} fill="currentColor" />}
            </button>
          )}
        </div>
      )}

      <Icon size={22} color={darkBg ? color : '#212529'} strokeWidth={2} />
      <span
        className="text-[13px] font-extrabold leading-tight mt-2.5 mb-[3px]"
        style={{ color: darkBg ? '#fff' : '#212529' }}
      >
        {label}
      </span>
      <span
        className="text-[11px] font-medium"
        style={{ color: darkBg ? `${color}CC` : 'rgba(33,37,41,0.65)' }}
      >
        {time}
      </span>
      <div
        className="absolute bottom-2.5 right-2.5 flex items-center gap-[3px] rounded-[20px] px-2 py-[3px]"
        style={{ background: darkBg ? `${color}28` : 'rgba(33,37,41,0.1)' }}
      >
        <span className="text-[10px]">👤</span>
        <span
          className="text-[11px] font-bold"
          style={{ color: darkBg ? color : '#212529' }}
        >
          {passengerCount}
        </span>
      </div>
    </div>
  );
}

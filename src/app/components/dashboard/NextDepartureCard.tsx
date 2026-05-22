import { useEffect, useState } from 'react';
import { ArrowRight, Clock, Users } from 'lucide-react';
import type { RouteConfig } from '../../types';

interface NextDepartureCardProps {
  routes: RouteConfig[];
  onClick?: (route: RouteConfig) => void;
}

/**
 * Card destacado mostrando qual rota e a proxima a sair no dia. Util pra
 * motorista que abre o dashboard de manha — bate o olho e sabe ja qual e
 * o proximo movimento + quanto tempo falta.
 *
 * Logica: parse do RouteConfig.time (formato "HH:MM"), comparacao com
 * minuto atual, seleciona a rota futura mais proxima. Quando nao ha mais
 * saidas hoje, o card devolve null — chamador renderiza algo no lugar
 * ou apenas omite.
 *
 * Atualiza a cada 30s pra o countdown nao ficar defasado sem ser
 * desnecessariamente agressivo no setInterval.
 */
export function NextDepartureCard({ routes, onClick }: NextDepartureCardProps) {
  // Trigger pro re-render a cada 30s — o conteudo do componente le `now`
  // direto via new Date(), entao basta forcar o ciclo.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const proxima = calcularProximaSaida(routes);
  if (!proxima) return null;

  const { route, minutosRestantes } = proxima;
  const horas = Math.floor(minutosRestantes / 60);
  const minutos = minutosRestantes % 60;
  // Quando faltam menos de 10min, vira "urgente": muda cor pra danger
  // sutilmente. Default segue na cor da rota (turno).
  const urgente = minutosRestantes <= 10;
  const countdownLabel = minutosRestantes === 0
    ? 'Sai agora'
    : horas > 0
      ? `Sai em ${horas}h ${minutos.toString().padStart(2, '0')}min`
      : `Sai em ${minutos}min`;

  return (
    <button
      type="button"
      onClick={() => onClick?.(route)}
      className="sr-card-lift group relative w-full overflow-hidden rounded-[20px] border-[1.5px] border-app-border bg-panel px-5 py-4 text-left cursor-pointer mb-3 flex items-center gap-4 shadow-[0_2px_12px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.45)]"
      aria-label={`Próxima saída: ${route.label} às ${route.time}, ${countdownLabel}`}
    >
      {/* Faixa lateral colorida pela cor da rota — ancora visual que liga
          o card ao card de rota correspondente abaixo. */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: route.color }}
      />

      {/* Halo sutil da cor da rota — atmosfera, nao dominante. */}
      <span
        aria-hidden="true"
        className="absolute -top-12 -right-12 w-40 h-40 pointer-events-none rounded-full"
        style={{ background: `radial-gradient(circle, ${route.color}1F 0%, transparent 65%)` }}
      />

      {/* Bloco icone — emoji do turno num quadrado tinted */}
      <div
        className="relative shrink-0 w-14 h-14 rounded-[16px] flex items-center justify-center text-[26px]"
        style={{
          background: `${route.color}1A`,
          border: `1px solid ${route.color}33`,
        }}
      >
        {route.emoji}
      </div>

      <div className="relative flex-1 min-w-0">
        <p
          className="text-[10px] font-extrabold uppercase tracking-[0.12em] m-0 mb-1"
          style={{ color: urgente ? '#DC3545' : route.color }}
        >
          Próxima saída
        </p>
        <p className="text-[16px] font-extrabold text-ink m-0 leading-tight truncate">
          {route.label}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
          <span className="inline-flex items-center gap-1 text-[12px] text-ink-soft font-semibold">
            <Clock size={12} strokeWidth={2.5} />
            {route.time}
          </span>
          <span className="inline-flex items-center gap-1 text-[12px] text-ink-soft font-semibold">
            <Users size={12} strokeWidth={2.5} />
            {route.passengerCount} {route.passengerCount === 1 ? 'passageiro' : 'passageiros'}
          </span>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold tracking-tight"
            style={{
              background: urgente ? 'rgba(220,53,69,0.12)' : `${route.color}1F`,
              color: urgente ? '#DC3545' : route.color,
              border: `1px solid ${urgente ? 'rgba(220,53,69,0.30)' : `${route.color}33`}`,
            }}
          >
            {countdownLabel}
          </span>
        </div>
      </div>

      <ArrowRight
        size={18}
        className="text-ink-muted shrink-0 transition-transform group-hover:translate-x-0.5"
        strokeWidth={2.2}
      />
    </button>
  );
}

interface ProximaSaida {
  route: RouteConfig;
  minutosRestantes: number;
}

/**
 * Acha a rota futura mais proxima (no mesmo dia) baseado em RouteConfig.time
 * comparado com o horario atual. Retorna null se nao ha mais saidas hoje.
 */
function calcularProximaSaida(routes: RouteConfig[]): ProximaSaida | null {
  const agora = new Date();
  const agoraMin = agora.getHours() * 60 + agora.getMinutes();

  const candidatos: ProximaSaida[] = [];
  for (const r of routes) {
    if (!r.time) continue;
    const match = r.time.match(/^(\d{1,2}):(\d{2})/);
    if (!match) continue;
    const h = Number.parseInt(match[1], 10);
    const m = Number.parseInt(match[2], 10);
    if (Number.isNaN(h) || Number.isNaN(m)) continue;
    const totalMin = h * 60 + m;
    const diff = totalMin - agoraMin;
    if (diff >= 0) {
      candidatos.push({ route: r, minutosRestantes: diff });
    }
  }

  candidatos.sort((a, b) => a.minutosRestantes - b.minutosRestantes);
  return candidatos[0] ?? null;
}

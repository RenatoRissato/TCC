import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, Send, CheckCheck, XOctagon, Inbox,
  Loader2, AlertCircle, RefreshCw,
} from 'lucide-react';
import { WeeklyBarChart } from '../charts/WeeklyBarChart';
import { useEstatisticas } from '../../hooks/useEstatisticas';
import {
  STATUS_UI_DETALHADO_META,
  STATUS_UI_DETALHADO_ORDEM,
} from '../../utils/confirmacaoStatusMeta';
import type { StatusUIDetalhado } from '../../utils/confirmacaoStatus';
import type {
  ConfirmacoesDetalhadas, EstatisticaRota, EstatisticasMensagensSemana, TaxaMensal,
} from '../../services/estatisticasService';

// ─────────────────────────────────────────────────────────────────────────
// Tooltip compartilhado (Pie + Bar)
// ─────────────────────────────────────────────────────────────────────────
interface PieTipPayload { name?: string; dataKey?: string; value: number; payload?: { color?: string }; fill?: string }
function ChartTip({ active, payload, label }: { active?: boolean; payload?: PieTipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-panel border border-app-border rounded-xl px-3.5 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.5)] font-sans">
      {label && <p className="text-xs font-bold text-ink m-0 mb-1.5">{label}</p>}
      {payload.map((e, i) => (
        <p key={(e.dataKey ?? e.name ?? i).toString()} className="text-xs font-semibold m-0" style={{ color: e.payload?.color ?? e.fill ?? '#888' }}>
          {e.name ?? e.dataKey}: <strong>{e.value}</strong>
        </p>
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-extrabold text-ink-soft tracking-[0.1em] uppercase m-0 mb-3">
      {children}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-seções
// ─────────────────────────────────────────────────────────────────────────
function StatusHojeBlock({ total, detalhado }: { total: number; detalhado: ConfirmacoesDetalhadas }) {
  const pieData = STATUS_UI_DETALHADO_ORDEM.map((status) => ({
    name: STATUS_UI_DETALHADO_META[status].label,
    value: detalhado[status],
    color: STATUS_UI_DETALHADO_META[status].color,
  })).filter((d) => d.value > 0);

  return (
    <>
      <SectionLabel>STATUS DE HOJE</SectionLabel>
      {total === 0 ? (
        <div className="rounded-[14px] border-[1.5px] border-dashed border-app-border px-4 py-6 text-center">
          <p className="text-[13px] font-bold text-ink m-0 mb-1">Sem dados de hoje</p>
          <p className="text-xs text-ink-soft m-0">As confirmações aparecem aqui assim que a mensagem do dia for enviada.</p>
        </div>
      ) : (
        <div className="flex items-center gap-3.5 flex-wrap">
          <div className="w-[150px] h-[150px] shrink-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={2} dataKey="value">
                  {pieData.map((e) => <Cell key={e.name} fill={e.color} strokeWidth={0} />)}
                </Pie>
                <Tooltip content={<ChartTip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-ink leading-none">{total}</span>
              <span className="text-[9px] font-bold text-ink-soft tracking-[0.08em] mt-0.5">TOTAL</span>
            </div>
          </div>
          <div className="flex-1 min-w-[180px] flex flex-col gap-[6px]">
            {STATUS_UI_DETALHADO_ORDEM.map((status) => {
              const meta = STATUS_UI_DETALHADO_META[status];
              const valor = detalhado[status];
              const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
              return (
                <div key={status} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: meta.color }} />
                  <p className="flex-1 text-[12px] font-semibold text-ink m-0 truncate" title={meta.label}>{meta.label}</p>
                  <span className="text-sm font-black" style={{ color: meta.color }}>{valor}</span>
                  <span className="text-[11px] text-ink-soft font-medium min-w-9 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function MensagensWhatsAppBlock({ stats }: { stats: EstatisticasMensagensSemana }) {
  const items: Array<{
    label: string; valor: number; cor: string; bg: string; Icon: typeof Send;
  }> = [
    { label: 'Enviadas',  valor: stats.enviadas,  cor: '#FFC107', bg: 'rgba(255,193,7,0.10)',  Icon: Send },
    { label: 'Entregues', valor: stats.entregues, cor: '#198754', bg: 'rgba(25,135,84,0.10)',  Icon: CheckCheck },
    { label: 'Falhas',    valor: stats.falhas,    cor: '#DC3545', bg: 'rgba(220,53,69,0.10)',  Icon: XOctagon },
    { label: 'Recebidas', valor: stats.recebidas, cor: '#2979FF', bg: 'rgba(41,121,255,0.10)', Icon: Inbox },
  ];
  return (
    <>
      <SectionLabel>WHATSAPP — ÚLTIMOS 7 DIAS</SectionLabel>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {items.map(({ label, valor, cor, bg, Icon }) => (
          <div key={label} className="rounded-[14px] p-3 flex items-center gap-2.5" style={{ background: bg }}>
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: `${cor}25` }}>
              <Icon size={16} style={{ color: cor }} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="m-0 text-lg font-black leading-none" style={{ color: cor }}>{valor}</p>
              <p className="m-0 text-[10px] font-bold text-ink-soft tracking-[0.04em] uppercase">{label}</p>
            </div>
          </div>
        ))}
      </div>
      {stats.total === 0 && (
        <p className="text-[11px] text-ink-muted mt-2 m-0 text-center">
          Sem mensagens nos últimos 7 dias.
        </p>
      )}
    </>
  );
}

function PorRotaBlock({ porRota }: { porRota: EstatisticaRota[] }) {
  if (porRota.length === 0) {
    return (
      <>
        <SectionLabel>DISTRIBUIÇÃO POR ROTA (HOJE)</SectionLabel>
        <p className="text-[12px] text-ink-soft m-0">Nenhuma rota ativa cadastrada.</p>
      </>
    );
  }
  return (
    <>
      <SectionLabel>DISTRIBUIÇÃO POR ROTA (HOJE)</SectionLabel>
      <div className="flex flex-col gap-2.5">
        {porRota.map((r) => {
          const max = Math.max(r.total, 1);
          const wGoing = (r.going / max) * 100;
          const wAbsent = (r.absent / max) * 100;
          const wPending = (r.pending / max) * 100;
          return (
            <div key={r.rotaId} className="rounded-[12px] bg-field border border-app-border px-3 py-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="m-0 text-[13px] font-bold text-ink truncate">{r.nome}</p>
                <span className="text-[11px] text-ink-soft font-medium">
                  {r.total} {r.total === 1 ? 'passageiro' : 'passageiros'}
                </span>
              </div>
              {r.total === 0 ? (
                <p className="m-0 text-[11px] text-ink-muted">Sem confirmações hoje.</p>
              ) : (
                <>
                  <div className="h-2 w-full rounded-full overflow-hidden bg-app-border flex">
                    <div style={{ width: `${wGoing}%`,   background: '#198754' }} />
                    <div style={{ width: `${wAbsent}%`,  background: '#DC3545' }} />
                    <div style={{ width: `${wPending}%`, background: '#FD7E14' }} />
                  </div>
                  <div className="flex gap-2 mt-1.5 text-[10px] font-bold">
                    <span style={{ color: '#198754' }}>{r.going} vão</span>
                    <span className="text-ink-muted">·</span>
                    <span style={{ color: '#DC3545' }}>{r.absent} não vão</span>
                    <span className="text-ink-muted">·</span>
                    <span style={{ color: '#FD7E14' }}>{r.pending} pend.</span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function TaxaMensalBlock({ mensal }: { mensal: TaxaMensal }) {
  const positivo = mensal.deltaPctVsMesAnterior !== null && mensal.deltaPctVsMesAnterior > 0;
  const negativo = mensal.deltaPctVsMesAnterior !== null && mensal.deltaPctVsMesAnterior < 0;
  const neutro = mensal.deltaPctVsMesAnterior !== null && mensal.deltaPctVsMesAnterior === 0;
  const semHistorico = mensal.deltaPctVsMesAnterior === null;

  const TrendIcon = positivo ? TrendingUp : negativo ? TrendingDown : Minus;
  const corTrend = positivo ? '#198754' : negativo ? '#DC3545' : '#FD7E14';
  const corPrincipal = mensal.presencaPct >= 80
    ? '#198754' : mensal.presencaPct >= 60 ? '#FD7E14' : '#DC3545';

  const fraseDelta = semHistorico
    ? 'Primeiro mês com dados registrados.'
    : neutro
      ? 'Sem variação em relação ao mês anterior.'
      : positivo
        ? `+${mensal.deltaPctVsMesAnterior} ponto${Math.abs(mensal.deltaPctVsMesAnterior ?? 0) === 1 ? '' : 's'} vs. mês anterior`
        : `${mensal.deltaPctVsMesAnterior} ponto${Math.abs(mensal.deltaPctVsMesAnterior ?? 0) === 1 ? '' : 's'} vs. mês anterior`;

  return (
    <>
      <SectionLabel>TAXA DE PRESENÇA MENSAL</SectionLabel>
      <div
        className="flex items-center gap-[18px] flex-wrap rounded-[18px] px-5 py-[18px]"
        style={{
          background: `${corPrincipal}14`,
          border: `1.5px solid ${corPrincipal}30`,
        }}
      >
        <div>
          <p className="text-[52px] font-black leading-none m-0" style={{ color: corPrincipal }}>
            {mensal.presencaPct}<span className="text-2xl">%</span>
          </p>
          <p className="text-[11px] text-ink-soft m-0 mt-1">{mensal.rotuloMes}</p>
        </div>
        <div className="flex-1 min-w-[160px]">
          <div className="flex items-center gap-[5px] mb-1.5">
            <TrendIcon size={16} style={{ color: corTrend }} strokeWidth={2.5} />
            <span className="text-[13px] font-bold" style={{ color: corTrend }}>{fraseDelta}</span>
          </div>
          <p className="text-xs text-ink-soft m-0 leading-normal">
            <strong>{mensal.totalCompareceram}</strong> de <strong>{mensal.totalRespostas}</strong> alunos que responderam compareceram este mês.
          </p>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────
interface StatsSectionProps {
  motoristaId: string | null;
  /** Quando false, o hook não busca — usado em accordion fechado. */
  ativo?: boolean;
}

export function StatsSection({ motoristaId, ativo = true }: StatsSectionProps) {
  const { estatisticas, loading, erro, recarregar } = useEstatisticas(motoristaId, { ativo });

  const semanaParaGrafico = useMemo(() => {
    if (!estatisticas) return [];
    return estatisticas.semana.map((d) => ({
      day: d.rotulo,
      going: d.going,
      absent: d.absent,
      pending: d.pending,
    }));
  }, [estatisticas]);

  // Estados especiais
  if (!motoristaId) {
    return (
      <div className="rounded-[14px] border-[1.5px] border-dashed border-app-border px-4 py-6 text-center">
        <p className="text-[13px] font-bold text-ink m-0 mb-1">Estatísticas indisponíveis</p>
        <p className="text-xs text-ink-soft m-0">Faça login para ver os dados do motorista.</p>
      </div>
    );
  }

  if (loading && !estatisticas) {
    return (
      <div className="flex items-center justify-center py-10 text-ink-soft text-sm">
        <Loader2 size={18} className="mr-2" style={{ animation: 'spin 0.8s linear infinite' }} />
        Carregando estatísticas...
      </div>
    );
  }

  if (erro && !estatisticas) {
    return (
      <div className="rounded-[14px] border-[1.5px] border-danger/30 bg-danger/[0.06] px-4 py-4">
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-danger" strokeWidth={2.4} />
          <div className="flex-1">
            <p className="m-0 text-[13px] font-bold text-danger">Falha ao carregar</p>
            <p className="m-0 text-[12px] text-ink-soft mt-1">{erro}</p>
          </div>
        </div>
        <button
          onClick={() => void recarregar()}
          className="mt-3 inline-flex items-center gap-1.5 rounded-[10px] border border-danger/30 bg-danger/10 px-3 py-1.5 text-[12px] font-bold text-danger cursor-pointer"
        >
          <RefreshCw size={12} strokeWidth={2.5} />
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!estatisticas) return null;

  return (
    <>
      <StatusHojeBlock total={estatisticas.hoje.total} detalhado={estatisticas.hoje.detalhado} />

      <div className="h-px bg-divider my-[18px]" />
      <SectionLabel>CONFIRMAÇÕES DOS ÚLTIMOS 7 DIAS</SectionLabel>
      <WeeklyBarChart data={semanaParaGrafico} />

      <div className="h-px bg-divider my-[18px]" />
      <PorRotaBlock porRota={estatisticas.porRota} />

      <div className="h-px bg-divider my-[18px]" />
      <MensagensWhatsAppBlock stats={estatisticas.mensagensSemana} />

      <div className="h-px bg-divider my-[18px]" />
      <TaxaMensalBlock mensal={estatisticas.mensal} />

      {/* Botão discreto de refresh manual no final */}
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => void recarregar()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-app-border bg-transparent px-3 py-1.5 text-[11px] font-bold text-ink-soft cursor-pointer disabled:opacity-60"
          title="Atualizar estatísticas"
        >
          {loading
            ? <Loader2 size={11} style={{ animation: 'spin 0.8s linear infinite' }} />
            : <RefreshCw size={11} strokeWidth={2.5} />}
          Atualizar
        </button>
      </div>
    </>
  );
}

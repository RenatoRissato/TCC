import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft, CheckCircle2, RotateCcw, Send, Flag,
  ChevronDown, Loader2, Menu,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBreakpoints } from '../hooks/useWindowSize';
import { useNavDrawer } from '../context/NavDrawerContext';
import { useConfirmacoesRealtime } from '../hooks/useConfirmacoesRealtime';
import { useFinalizarViagem, useReenviarConfirmacao } from '../hooks/useViagem';
import { buscarViagem, marcarConfirmacaoManual } from '../services/viagemService';
import { BottomSheetModal } from '../components/shared/BottomSheetModal';
import {
  statusUIDetalhadoDaConfirmacao,
  type StatusUIDetalhado,
} from '../utils/confirmacaoStatus';
import {
  STATUS_UI_DETALHADO_META,
  STATUS_UI_DETALHADO_ORDEM,
} from '../utils/confirmacaoStatusMeta';
import type { ConfirmacaoComPassageiro } from '../hooks/useConfirmacoesRealtime';
import type { RotaRow, StatusConfirmacao, TipoConfirmacao, ViagemRow } from '../types/database';

function iniciais(nome: string): string {
  return nome.trim().split(/\s+/).filter(Boolean).map(p => p[0]?.toUpperCase() ?? '').slice(0, 2).join('');
}

interface PassageiroRowProps {
  c: ConfirmacaoComPassageiro;
  onReenviar: (id: string) => void;
  onAbrirManual: (c: ConfirmacaoComPassageiro) => void;
  reenviando: boolean;
}

function ConfirmacaoRowItem({ c, onReenviar, onAbrirManual, reenviando }: PassageiroRowProps) {
  const statusDetalhado = statusUIDetalhadoDaConfirmacao(c.status, c.tipo_confirmacao);
  const meta = STATUS_UI_DETALHADO_META[statusDetalhado];
  const nome = c.passageiros?.nome_completo ?? '—';

  return (
    <div className="flex items-center gap-3 bg-panel border-[1.5px] border-app-border rounded-[16px] px-3.5 py-3 transition-colors">
      <div
        className="w-11 h-11 rounded-[14px] flex items-center justify-center text-sm font-extrabold shrink-0"
        style={{ background: meta.bg, color: meta.color }}
      >
        {iniciais(nome)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-ink m-0 truncate">{nome}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.06em] rounded-full px-2 py-[2px]"
            style={{ background: meta.bg, color: meta.color }}
          >
            <meta.Icon size={10} strokeWidth={2.8} />
            {meta.label}
          </span>
          {c.origem && (
            <span className="text-[10px] text-ink-muted">· {c.origem}</span>
          )}
        </div>
      </div>

      {c.status === 'pendente' && (
        <button
          onClick={() => onReenviar(c.id)}
          disabled={reenviando}
          aria-label="Reenviar confirmação"
          className="shrink-0 flex items-center gap-1 bg-pending/15 border border-pending/30 rounded-[10px] px-2.5 py-2 text-[11px] font-bold text-pending cursor-pointer min-h-[36px]"
        >
          {reenviando
            ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
            : <RotateCcw size={13} strokeWidth={2.5} />}
          Reenviar
        </button>
      )}

      <button
        onClick={() => onAbrirManual(c)}
        aria-label="Marcar manualmente"
        className="shrink-0 w-9 h-9 rounded-[10px] bg-field border border-app-border cursor-pointer flex items-center justify-center"
      >
        <ChevronDown size={16} className="text-ink-soft" strokeWidth={2.5} />
      </button>
    </div>
  );
}

interface MarcacaoManualProps {
  alvo: ConfirmacaoComPassageiro | null;
  onClose: () => void;
  onConfirmar: (status: StatusConfirmacao, tipo: TipoConfirmacao | null) => void;
  salvando: boolean;
}

function MarcacaoManualSheet({ alvo, onClose, onConfirmar, salvando }: MarcacaoManualProps) {
  if (!alvo) return null;
  const opcoes: { label: string; status: StatusConfirmacao; tipo: TipoConfirmacao | null; color: string }[] = [
    { label: 'Confirmar — ida e volta', status: 'confirmado', tipo: 'ida_e_volta',   color: '#198754' },
    { label: 'Confirmar — somente ida', status: 'confirmado', tipo: 'somente_ida',   color: '#198754' },
    { label: 'Confirmar — somente volta', status: 'confirmado', tipo: 'somente_volta', color: '#198754' },
    { label: 'Não vai hoje',              status: 'confirmado', tipo: 'nao_vai',       color: '#DC3545' },
    { label: 'Marcar como ausente',       status: 'ausente',    tipo: null,            color: '#DC3545' },
    { label: 'Voltar para pendente',      status: 'pendente',   tipo: null,            color: '#FD7E14' },
  ];

  return (
    <div className="p-5 font-sans">
      <p className="text-base font-extrabold text-ink m-0 mb-1">
        {alvo.passageiros?.nome_completo}
      </p>
      <p className="text-xs text-ink-soft m-0 mb-4">
        Marcar manualmente sobrescreve a resposta atual e registra origem = manual.
      </p>
      <div className="flex flex-col gap-2">
        {opcoes.map((o) => (
          <button
            key={o.label}
            onClick={() => onConfirmar(o.status, o.tipo)}
            disabled={salvando}
            className="flex items-center gap-2.5 bg-field border-2 rounded-[12px] px-3.5 py-3 text-sm font-bold cursor-pointer min-h-[48px] text-left"
            style={{ borderColor: o.color + '55', color: o.color }}
          >
            {salvando ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle2 size={16} strokeWidth={2.5} />}
            {o.label}
          </button>
        ))}
        <button
          onClick={onClose}
          className="bg-transparent border-2 border-app-border rounded-[12px] px-3.5 py-3 text-sm font-bold text-ink-soft cursor-pointer min-h-[48px] mt-1"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function LiveTripScreen() {
  const { viagemId } = useParams<{ viagemId: string }>();
  const navigate = useNavigate();
  const { isLg, isDesktop, isMd } = useBreakpoints();
  const { openDrawer } = useNavDrawer();

  const [viagem, setViagem] = useState<ViagemRow | null>(null);
  const [rota, setRota] = useState<RotaRow | null>(null);
  const [carregandoMeta, setCarregandoMeta] = useState(true);

  const { confirmacoes, loading } = useConfirmacoesRealtime(viagemId ?? null);
  const { reenviarConfirmacao, loading: reenviando } = useReenviarConfirmacao();
  const { finalizarViagem, loading: finalizando } = useFinalizarViagem();

  const [reenviandoId, setReenviandoId] = useState<string | null>(null);
  const [alvoManual, setAlvoManual] = useState<ConfirmacaoComPassageiro | null>(null);
  const [salvandoManual, setSalvandoManual] = useState(false);
  const [confirmFinalizar, setConfirmFinalizar] = useState(false);

  useEffect(() => {
    if (!viagemId) return;
    let ativo = true;
    setCarregandoMeta(true);
    buscarViagem(viagemId).then((res) => {
      if (!ativo) return;
      if (res) {
        setViagem(res.viagem);
        setRota(res.rota);
      }
      setCarregandoMeta(false);
    });
    return () => { ativo = false; };
  }, [viagemId]);

  const ordenadas = useMemo(
    () => [...confirmacoes].sort((a, b) => {
      const oa = a.passageiros?.ordem_na_rota ?? 999;
      const ob = b.passageiros?.ordem_na_rota ?? 999;
      return oa - ob;
    }),
    [confirmacoes],
  );

  // Contagem detalhada — uma entrada para cada um dos 5 status de UI.
  // O cálculo de "pendentes" para o modal de finalizar usa essa mesma fonte.
  const contagemDetalhada = useMemo(() => {
    const base: Record<StatusUIDetalhado, number> = {
      ida_e_volta: 0,
      somente_ida: 0,
      somente_volta: 0,
      nao_vai: 0,
      pendente: 0,
    };
    for (const c of confirmacoes) {
      const ui = statusUIDetalhadoDaConfirmacao(c.status, c.tipo_confirmacao);
      base[ui]++;
    }
    return base;
  }, [confirmacoes]);

  const totalConfirmacoes = confirmacoes.length;
  const totalPendentes = contagemDetalhada.pendente;

  const handleReenviar = async (id: string) => {
    setReenviandoId(id);
    await reenviarConfirmacao(id);
    setReenviandoId(null);
  };

  const handleManual = async (status: StatusConfirmacao, tipo: TipoConfirmacao | null) => {
    if (!alvoManual) return;
    setSalvandoManual(true);
    const ok = await marcarConfirmacaoManual(alvoManual.id, status, tipo);
    setSalvandoManual(false);
    if (ok) {
      toast.success('Status atualizado manualmente');
      setAlvoManual(null);
    } else {
      toast.error('Não foi possível atualizar');
    }
  };

  const handleFinalizar = async () => {
    if (!viagemId) return;
    const r = await finalizarViagem(viagemId);
    setConfirmFinalizar(false);
    if (r) navigate('/home');
  };

  const px = isDesktop ? 36 : isMd ? 24 : 16;
  const finalizada = viagem?.status === 'finalizada';

  return (
    <div className="bg-surface min-h-full transition-colors">
      <header className="bg-[#212529] pt-4 pb-4" style={{ paddingLeft: px, paddingRight: px }}>
        <div className="flex items-center gap-2.5 mb-3">
          {!isLg && (
            <button onClick={openDrawer} className="touch-scale shrink-0 w-10 h-10 rounded-xl bg-white/[0.08] border-[1.5px] border-white/10 flex items-center justify-center cursor-pointer" aria-label="Abrir menu">
              <Menu size={18} color="rgba(255,255,255,0.8)" strokeWidth={2} />
            </button>
          )}
          <button
            onClick={() => navigate('/home')}
            className="touch-scale shrink-0 w-10 h-10 rounded-xl bg-white/[0.08] border-[1.5px] border-white/10 flex items-center justify-center cursor-pointer"
            aria-label="Voltar para a dashboard"
          >
            <ArrowLeft size={18} color="rgba(255,255,255,0.8)" strokeWidth={2} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-pending tracking-[0.12em] uppercase m-0">
              {finalizada ? 'Viagem finalizada' : 'Viagem em andamento'}
            </p>
            <h1 className="text-lg font-extrabold text-white m-0 leading-tight truncate">
              {carregandoMeta ? 'Carregando...' : (rota?.nome ?? 'Viagem')}
            </h1>
            <p className="text-[11px] text-white/40 m-0">
              {viagem?.data} · iniciada {viagem?.iniciada_em ? new Date(viagem.iniciada_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--'}
            </p>
          </div>
          {!finalizada && (
            <button
              onClick={() => setConfirmFinalizar(true)}
              disabled={finalizando}
              className="flex items-center gap-1.5 bg-danger border-0 rounded-xl px-3 py-2 text-xs font-bold text-white cursor-pointer min-h-[38px]"
            >
              <Flag size={13} strokeWidth={2.5} />
              Finalizar
            </button>
          )}
        </div>

        {/* Contadores detalhados — 5 status + total.
            Desktop: 6 colunas em linha única.
            Mobile/tablet: 3 colunas × 2 linhas (6 células). */}
        <div className={`grid gap-2 ${isMd ? 'grid-cols-6' : 'grid-cols-3'}`}>
          {STATUS_UI_DETALHADO_ORDEM.map((status) => {
            const meta = STATUS_UI_DETALHADO_META[status];
            const valor = contagemDetalhada[status];
            return (
              <div
                key={status}
                className="flex flex-col items-center bg-white/[0.05] rounded-[14px] py-2.5 px-1"
                title={meta.label}
              >
                <span
                  className="text-2xl font-black leading-none"
                  style={{ color: meta.color }}
                >
                  {valor}
                </span>
                <div className="flex items-center gap-1 mt-1">
                  <meta.Icon size={9} strokeWidth={2.8} style={{ color: meta.color }} />
                  <span className="text-[9px] font-bold text-white/55 tracking-[0.04em] uppercase truncate">
                    {meta.labelCompacto}
                  </span>
                </div>
              </div>
            );
          })}
          <div
            className="flex flex-col items-center bg-white/[0.05] rounded-[14px] py-2.5 px-1"
            title="Total de passageiros"
          >
            <span className="text-2xl font-black leading-none text-pending">{totalConfirmacoes}</span>
            <span className="text-[9px] font-bold text-white/55 tracking-[0.04em] uppercase mt-1">
              Total
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-3">
          <span className="pulse-dot inline-block w-[7px] h-[7px] rounded-full bg-[#4ADE80]" />
          <span className="text-[11px] text-white/45 font-medium">
            {finalizada ? 'Encerrada — somente leitura' : 'Atualizando em tempo real via WhatsApp'}
          </span>
        </div>
      </header>

      <div style={{ padding: `${isDesktop ? 24 : 16}px ${px}px ${isDesktop ? 36 : 96}px` }}>
        {loading && confirmacoes.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-ink-soft text-sm">
            <Loader2 size={18} className="mr-2" style={{ animation: 'spin 0.8s linear infinite' }} />
            Carregando confirmações...
          </div>
        ) : ordenadas.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center px-6">
            <Send size={36} className="text-ink-muted mb-3" strokeWidth={1.5} />
            <p className="text-base font-bold text-ink m-0 mb-1">Nenhuma confirmação ainda</p>
            <p className="text-[13px] text-ink-soft m-0">As mensagens estão sendo enviadas. Aguarde as respostas.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {ordenadas.map((c) => (
              <ConfirmacaoRowItem
                key={c.id}
                c={c}
                onReenviar={handleReenviar}
                onAbrirManual={setAlvoManual}
                reenviando={reenviando && reenviandoId === c.id}
              />
            ))}
          </div>
        )}
      </div>

      <BottomSheetModal
        open={alvoManual !== null}
        onOpenChange={(open) => { if (!open) setAlvoManual(null); }}
        title="Marcar manualmente"
        hideHandle
        forceCenter
        maxWidth={420}
      >
        <MarcacaoManualSheet
          alvo={alvoManual}
          onClose={() => setAlvoManual(null)}
          onConfirmar={handleManual}
          salvando={salvandoManual}
        />
      </BottomSheetModal>

      <BottomSheetModal
        open={confirmFinalizar}
        onOpenChange={setConfirmFinalizar}
        title="Finalizar Viagem"
        hideHandle
        forceCenter
        maxWidth={360}
      >
        <div className="p-6 font-sans">
          <div className="w-14 h-14 bg-danger/[0.12] rounded-[18px] flex items-center justify-center mx-auto mb-4">
            <Flag size={26} className="text-danger" strokeWidth={2} />
          </div>
          <p className="text-lg font-extrabold text-ink m-0 mb-2 text-center">Finalizar viagem?</p>
          <p className="text-[13px] text-ink-soft m-0 mb-6 text-center leading-normal">
            {totalPendentes > 0
              ? <>Os {totalPendentes} passageiro{totalPendentes > 1 ? 's' : ''} pendentes continuarao como <strong>pendentes</strong> ate responderem ou serem alterados manualmente.</>
              : 'Esta acao encerra a viagem e gera o historico do dia.'}
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={() => setConfirmFinalizar(false)}
              className="flex-1 bg-transparent border-2 border-app-border rounded-[13px] py-3 text-sm font-bold text-ink-soft cursor-pointer min-h-12"
            >
              Cancelar
            </button>
            <button
              onClick={handleFinalizar}
              disabled={finalizando}
              className="flex-1 bg-danger border-0 rounded-[13px] py-3 text-sm font-bold text-white cursor-pointer min-h-12 flex items-center justify-center gap-2"
            >
              {finalizando
                ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
                : <Flag size={15} strokeWidth={2.5} />}
              Finalizar
            </button>
          </div>
        </div>
      </BottomSheetModal>
    </div>
  );
}


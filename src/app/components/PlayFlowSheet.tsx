import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, ArrowRight, Loader2, Sunrise, Sun, Moon,
  AlertCircle, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { BottomSheetModal } from './shared/BottomSheetModal';
import { useViagemAtiva } from '../context/ViagemAtivaContext';
import { useIniciarViagem } from '../hooks/useViagem';
import {
  listarRotasComContagem,
  obterRota,
  validarRotaParaInicio,
} from '../services/rotaService';
import {
  listarPassageirosDaRota,
  otimizarSequenciaPassageirosDaRota,
} from '../services/passageiroService';
import {
  montarUrlGoogleMaps,
  abrirEmNovaAba,
  deveAbrirMapsNoMesmoContexto,
  formatarEnderecoCompleto,
} from '../utils/maps';
import type { RouteConfig, RouteType } from '../types';
import type { DirecaoViagem } from '../types/database';

type Etapa = 1 | 2 | 3;

const ROUTE_TYPE_ICON: Record<RouteType, typeof Sunrise> = {
  morning: Sunrise,
  afternoon: Sun,
  night: Moon,
};

// Etapa 1 — Card de rota selecionável
function CardRota({ rota, onSelect }: { rota: RouteConfig; onSelect: () => void }) {
  const Icon = ROUTE_TYPE_ICON[rota.type];
  return (
    <button
      onClick={onSelect}
      type="button"
      className="touch-scale group relative flex w-full items-center gap-3 rounded-[16px] border-2 border-app-border bg-field p-3.5 text-left cursor-pointer transition-colors hover:border-pending/40"
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
        style={{ background: `${rota.color}22` }}
      >
        <Icon size={20} strokeWidth={2.4} style={{ color: rota.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="m-0 text-sm font-extrabold text-ink truncate">{rota.label}</p>
        <p className="m-0 text-[11px] text-ink-soft font-medium">
          {rota.time} · {rota.passengerCount} passageiro{rota.passengerCount === 1 ? '' : 's'}
        </p>
      </div>
      <ArrowRight size={16} className="text-ink-muted transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
    </button>
  );
}

// Etapas 2 e 3 — Card grande de opção
interface CardOpcaoProps {
  emoji: string;
  titulo: string;
  descricao: string;
  cor: string;
  desabilitado?: boolean;
  motivoDesabilitado?: string;
  onClick: () => void;
}
function CardOpcao({
  emoji, titulo, descricao, cor, desabilitado, motivoDesabilitado, onClick,
}: CardOpcaoProps) {
  return (
    <button
      onClick={onClick}
      disabled={desabilitado}
      type="button"
      className={`group relative flex w-full items-stretch gap-3 rounded-[18px] border-2 p-4 text-left transition-all touch-scale ${
        desabilitado
          ? 'cursor-not-allowed opacity-55 border-app-border bg-field'
          : 'cursor-pointer'
      }`}
      style={!desabilitado ? {
        borderColor: `${cor}55`,
        background: `${cor}0F`,
      } : undefined}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
        style={{ background: `${cor}22` }}
      >
        <span>{emoji}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <p className="m-0 text-sm font-extrabold text-ink truncate">{titulo}</p>
        <p className="m-0 text-[12px] leading-snug text-ink-soft">{descricao}</p>
        {desabilitado && motivoDesabilitado && (
          <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-danger/8 px-2 py-1.5">
            <AlertCircle size={12} className="mt-[1px] shrink-0 text-danger" strokeWidth={2.4} />
            <p className="m-0 text-[11px] font-semibold leading-tight text-danger">{motivoDesabilitado}</p>
          </div>
        )}
      </div>
      {!desabilitado && (
        <ArrowRight size={18} className="self-center shrink-0 text-ink-muted transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
      )}
    </button>
  );
}

// Indicador de progresso 1/3 → 2/3 → 3/3
function ProgressDots({ etapa }: { etapa: Etapa }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className="block h-1.5 rounded-full transition-all"
          style={{
            width: n === etapa ? 24 : 6,
            background: n <= etapa ? '#FFC107' : 'rgba(255,255,255,0.18)',
          }}
        />
      ))}
    </div>
  );
}

export function PlayFlowSheet() {
  const navigate = useNavigate();
  const { playFlowAberto, fecharPlayFlow } = useViagemAtiva();
  const { iniciarViagem } = useIniciarViagem();

  const [etapa, setEtapa] = useState<Etapa>(1);
  const [rotas, setRotas] = useState<RouteConfig[]>([]);
  const [carregandoRotas, setCarregandoRotas] = useState(false);
  const [rotaSelecionada, setRotaSelecionada] = useState<RouteConfig | null>(null);
  const [otimizar, setOtimizar] = useState<boolean | null>(null);
  const [executando, setExecutando] = useState(false);

  // Hidrata rotas quando o sheet abre. Se houver só uma, pula direto pra etapa 2.
  useEffect(() => {
    if (!playFlowAberto) return;
    let ativo = true;
    setCarregandoRotas(true);
    listarRotasComContagem().then((rs) => {
      if (!ativo) return;
      setRotas(rs);
      setCarregandoRotas(false);
      if (rs.length === 1 && rs[0].rotaId) {
        setRotaSelecionada(rs[0]);
        setEtapa(2);
      }
    });
    return () => { ativo = false; };
  }, [playFlowAberto]);

  // Reset quando o sheet fecha — próxima abertura começa do zero.
  useEffect(() => {
    if (playFlowAberto) return;
    setEtapa(1);
    setRotaSelecionada(null);
    setOtimizar(null);
    setExecutando(false);
  }, [playFlowAberto]);

  const tituloPorEtapa: Record<Etapa, string> = {
    1: 'Qual rota deseja iniciar?',
    2: 'Como deseja organizar as paradas?',
    3: 'Qual é o trajeto agora?',
  };

  const podeVoltar = etapa > 1 && !(rotas.length === 1 && etapa === 2);

  const handleVoltar = () => {
    if (etapa === 3) setEtapa(2);
    else if (etapa === 2) setEtapa(1);
  };

  const handleSelecionarRota = (rota: RouteConfig) => {
    setRotaSelecionada(rota);
    setEtapa(2);
  };

  const handleEscolherOtimizacao = async (otimizarEscolhido: boolean) => {
    if (!rotaSelecionada?.rotaId) return;
    setOtimizar(otimizarEscolhido);

    // Se o motorista escolheu "otimizar automaticamente", rodamos o
    // reordenador via API do Google antes de avançar. Isso reescreve
    // `ordem_na_rota` no banco — a etapa 3 monta a URL do Maps a partir
    // dessa ordem já otimizada. Não usamos `optimize:true` na URL do
    // Maps Web porque ele insere waypoint fantasma em algumas contas.
    if (otimizarEscolhido) {
      setExecutando(true);
      try {
        const r = await otimizarSequenciaPassageirosDaRota({ rotaId: rotaSelecionada.rotaId });
        if (r.status === 'otimizada') {
          toast.success(`Sequência otimizada para ${r.total} passageiros.`);
        } else if (r.total < 2) {
          toast.info('Pelo menos 2 passageiros são necessários para otimizar. Seguindo com a ordem atual.');
        } else {
          toast.success('A sequência atual já está otimizada.');
        }
      } catch (err) {
        const msg = err instanceof Error
          ? err.message
          : (err && typeof err === 'object' && 'erro' in err && typeof (err as { erro?: unknown }).erro === 'string')
              ? (err as { erro: string }).erro
              : 'Não foi possível otimizar.';
        toast.error(msg);
        // Mesmo com falha, deixa o motorista seguir — pode iniciar com a
        // ordem manual atual.
      } finally {
        setExecutando(false);
      }
    }
    setEtapa(3);
  };

  const handleEscolherDirecao = async (direcao: DirecaoViagem) => {
    if (!rotaSelecionada?.rotaId) return;
    const rotaId = rotaSelecionada.rotaId;

    // Abre a aba do Maps AGORA (gesto síncrono do clique), populada depois.
    const janelaMaps = deveAbrirMapsNoMesmoContexto() ? null : window.open('', '_blank');
    if (janelaMaps) {
      try {
        janelaMaps.opener = null;
        janelaMaps.document.title = 'Abrindo trajeto...';
      } catch { /* navegador pode restringir */ }
    }

    setExecutando(true);
    try {
      const validacao = await validarRotaParaInicio(rotaId);
      if (!validacao.valido) {
        janelaMaps?.close();
        if (validacao.codigo === 'todos_nao_vao') {
          toast(validacao.erro ?? 'Nenhum aluno embarca hoje nesta rota.', {
            description: 'Todos os responsáveis disseram que não vão. Não é necessário iniciar.',
            duration: 6000,
          });
        } else {
          toast.error(validacao.erro ?? 'Rota inválida para iniciar viagem.');
        }
        return;
      }

      const [rota, enderecosPassageiros] = await Promise.all([
        obterRota(rotaId),
        listarPassageirosDaRota(rotaId, direcao),
      ]);

      if (enderecosPassageiros.length === 0) {
        janelaMaps?.close();
        toast('Nenhum aluno confirmou presença para este trajeto.', {
          description: direcao === 'buscar'
            ? 'Os passageiros que responderam optaram só pela volta ou disseram que não vão.'
            : 'Os passageiros que responderam optaram só pela ida ou disseram que não vão.',
          duration: 6000,
        });
        return;
      }

      const enderecoPontoSaida = rota
        ? formatarEnderecoCompleto({
            rua: rota.ponto_saida_rua,
            numero: rota.ponto_saida_numero,
            bairro: rota.ponto_saida_bairro,
            cep: rota.ponto_saida_cep,
          })
        : '';
      const enderecosDestinos = (rota?.destinos ?? [])
        .map((d) => formatarEnderecoCompleto({
          rua: d.rua, numero: d.numero, bairro: d.bairro, cep: d.cep,
        }))
        .filter(Boolean);

      let origem: string;
      let paradas: string[];
      if (direcao === 'retorno') {
        const destinoFinalEnd = enderecosDestinos[enderecosDestinos.length - 1] ?? '';
        const destinosIntermediarios = enderecosDestinos.slice(0, -1);
        origem = destinoFinalEnd;
        paradas = [
          ...destinosIntermediarios,
          ...[...enderecosPassageiros].reverse(),
          enderecoPontoSaida,
        ].filter(Boolean);
      } else {
        origem = enderecoPontoSaida;
        paradas = [...enderecosPassageiros, ...enderecosDestinos];
      }

      const url = montarUrlGoogleMaps(origem, paradas);
      if (url) {
        abrirEmNovaAba(janelaMaps, url);
      } else {
        janelaMaps?.close();
        toast.error('Não foi possível montar o trajeto. Verifique os endereços cadastrados.');
        return;
      }

      const r = await iniciarViagem(rotaId, direcao);
      if (r) {
        fecharPlayFlow();
        navigate(`/viagem/${r.viagem_id}`);
      }
    } finally {
      setExecutando(false);
    }
  };

  const rotasValidas = useMemo(() => rotas.filter((r) => r.rotaId), [rotas]);

  return (
    <BottomSheetModal
      open={playFlowAberto}
      onOpenChange={(o) => { if (!o) fecharPlayFlow(); }}
      title="Iniciar trajeto"
      hideHandle
      forceCenter
      maxWidth={460}
    >
      <div className="p-5 font-sans">
        {/* Header com progress dots + título + cancelar */}
        <div className="flex items-center justify-between mb-1">
          <ProgressDots etapa={etapa} />
          <button
            onClick={fecharPlayFlow}
            type="button"
            aria-label="Cancelar"
            className="w-8 h-8 rounded-full bg-field border border-app-border flex items-center justify-center cursor-pointer"
          >
            <X size={14} className="text-ink-soft" strokeWidth={2.5} />
          </button>
        </div>
        <p className="m-0 mt-3 mb-4 text-base font-extrabold text-ink">
          {tituloPorEtapa[etapa]}
        </p>

        {/* Conteúdo da etapa */}
        {etapa === 1 && (
          <div className="flex flex-col gap-2.5">
            {carregandoRotas && (
              <div className="flex items-center justify-center py-6 text-ink-soft text-sm">
                <Loader2 size={16} className="mr-2" style={{ animation: 'spin 0.8s linear infinite' }} />
                Carregando rotas...
              </div>
            )}
            {!carregandoRotas && rotasValidas.length === 0 && (
              <div className="rounded-[14px] border-[1.5px] border-dashed border-app-border px-4 py-6 text-center">
                <p className="text-[13px] font-bold text-ink m-0 mb-1">Nenhuma rota cadastrada</p>
                <p className="text-xs text-ink-soft m-0">Cadastre uma rota antes de iniciar.</p>
              </div>
            )}
            {!carregandoRotas && rotasValidas.map((r) => (
              <CardRota key={r.rotaId} rota={r} onSelect={() => handleSelecionarRota(r)} />
            ))}
          </div>
        )}

        {etapa === 2 && (
          <div className="flex flex-col gap-2.5">
            <CardOpcao
              emoji="🗺️"
              titulo="Otimizar automaticamente"
              descricao="O Google Maps calcula a melhor ordem das paradas."
              cor="#2979FF"
              onClick={() => handleEscolherOtimizacao(true)}
            />
            <CardOpcao
              emoji="✅"
              titulo="Já organizei manualmente"
              descricao="Usar a ordem atual dos passageiros sem mudar nada."
              cor="#198754"
              onClick={() => handleEscolherOtimizacao(false)}
            />
            {executando && (
              <div className="flex items-center justify-center py-2 text-ink-soft text-[12px]">
                <Loader2 size={14} className="mr-2" style={{ animation: 'spin 0.8s linear infinite' }} />
                Otimizando sequência...
              </div>
            )}
          </div>
        )}

        {etapa === 3 && (
          <div className="flex flex-col gap-2.5">
            <CardOpcao
              emoji="🏫"
              titulo="Buscar alunos"
              descricao="Sai do ponto de partida, passa pelos passageiros e termina na escola."
              cor="#198754"
              onClick={() => handleEscolherDirecao('buscar')}
            />
            <CardOpcao
              emoji="🏠"
              titulo="Levar para casa"
              descricao="Sai da escola, passa pelos passageiros em ordem inversa e volta para o ponto de partida."
              cor="#6C5CE7"
              desabilitado={!rotaSelecionada?.temDestinoFinal}
              motivoDesabilitado="Cadastre um destino final na rota para usar o retorno."
              onClick={() => handleEscolherDirecao('retorno')}
            />
            {executando && (
              <div className="flex items-center justify-center py-2 text-ink-soft text-[12px]">
                <Loader2 size={14} className="mr-2" style={{ animation: 'spin 0.8s linear infinite' }} />
                Preparando trajeto...
              </div>
            )}
          </div>
        )}

        {/* Voltar — só aparece nas etapas 2/3 (e quando há mais de uma rota) */}
        {podeVoltar && !executando && (
          <button
            onClick={handleVoltar}
            type="button"
            className="mt-4 inline-flex items-center gap-1.5 rounded-[10px] bg-transparent border border-app-border px-3 py-2 text-[12px] font-bold text-ink-soft cursor-pointer min-h-9"
          >
            <ArrowLeft size={13} strokeWidth={2.5} />
            Voltar
          </button>
        )}
      </div>
    </BottomSheetModal>
  );
}

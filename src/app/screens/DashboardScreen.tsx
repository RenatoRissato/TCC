import { useCallback, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  Bell, ChevronRight, Wifi, Moon, SunMedium, ArrowRight, Menu, Settings, Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useBreakpoints } from '../hooks/useWindowSize';
import { usePassengers } from '../hooks/usePassengers';
import { useIniciarViagem } from '../hooks/useViagem';
import { getRecentUpdates, getRouteConfigs } from '../services/dashboardService';
import { criarRotasPadrao, obterRota, validarRotaParaInicio } from '../services/rotaService';
import { listarPassageirosDaRota, otimizarSequenciaPassageirosDaRota } from '../services/passageiroService';
import { useNavDrawer } from '../context/NavDrawerContext';
import {
  montarUrlGoogleMaps,
  abrirEmNovaAba,
  deveAbrirMapsNoMesmoContexto,
  formatarEnderecoCompleto,
} from '../utils/maps';
import type { RouteConfig, WhatsAppUpdate } from '../types';
import { RouteButton } from '../components/dashboard/RouteButton';
import { UpdateRow } from '../components/dashboard/UpdateRow';
import { OccupancySummary } from '../components/dashboard/OccupancySummary';
import { GerenciarRotasModal } from '../components/dashboard/GerenciarRotasModal';
import { NotificacoesPanel } from '../components/notificacoes/NotificacoesPanel';
import { useNotificacoes } from '../hooks/useNotificacoes';
import { cacheKeys, readJsonCache, writeJsonCache } from '../utils/localCache';
import { supabase } from '../../lib/supabase';

const ETAPAS_OTIMIZACAO = [
  'Localizando endereços...',
  'Calculando melhor ordem...',
  'Salvando nova sequência...',
] as const;

function SectionHead({
  label, actionLabel, onAction, ActionIcon = ChevronRight,
}: {
  label: string;
  actionLabel: string;
  onAction: () => void;
  ActionIcon?: typeof ChevronRight;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-[7px]">
        <div className="w-[3px] h-[13px] bg-pending rounded-sm" />
        <p className="text-[10px] font-extrabold text-ink-soft tracking-[0.11em] uppercase m-0">{label}</p>
      </div>
      <button
        onClick={onAction}
        className="flex items-center gap-[5px] text-pending text-xs font-bold bg-transparent border-0 cursor-pointer px-0 py-1 min-h-8"
      >
        {actionLabel} <ActionIcon size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export function DashboardScreen() {
  const navigate = useNavigate();
  const { user, motoristaId } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { isDesktop, isLg, isMd } = useBreakpoints();
  const { openDrawer } = useNavDrawer();
  const [time, setTime] = useState(new Date());
  // Uma única chamada a listarPassageiros() — periodSummary já fornece o Summary
  // que antes vinha do useDailyList, evitando query duplicada no mount.
  const { list: passengers, periodSummary: s, loading: loadingPassengers } = usePassengers();
  const [recentUpdates, setRecentUpdates] = useState<WhatsAppUpdate[]>([]);
  const [routeConfigs, setRouteConfigs] = useState<RouteConfig[]>([]);
  const { iniciarViagem, loading: iniciandoViagem } = useIniciarViagem();
  const [rotaIniciandoId, setRotaIniciandoId] = useState<string | null>(null);
  const [rotaOtimizandoId, setRotaOtimizandoId] = useState<string | null>(null);
  const [etapaOtimizacaoIndex, setEtapaOtimizacaoIndex] = useState(0);
  const [gerenciarAberto, setGerenciarAberto] = useState(false);
  const [notificacoesAberto, setNotificacoesAberto] = useState(false);
  const {
    lista: notificacoes,
    naoLidas: notificacoesNaoLidas,
    marcarComoLida: marcarNotificacaoComoLida,
    marcarTodasComoLidas: marcarTodasNotificacoesComoLidas,
  } = useNotificacoes(motoristaId);

  const recarregarRotas = useCallback(() => {
    let cancelado = false;
    getRouteConfigs()
      .then(rc => {
        if (cancelado) return;
        const arr = Array.isArray(rc) ? rc : [];
        setRouteConfigs(arr);
        const cacheKey = motoristaId ?? user?.id ?? null;
        if (cacheKey) {
          writeJsonCache(cacheKeys.rotas(cacheKey), arr);
        }
      })
      .catch(err => { console.error('getRouteConfigs:', err); if (!cancelado) setRouteConfigs([]); });
    return () => { cancelado = true; };
  }, [motoristaId, user?.id]);

  const handleIniciarViagem = async (rotaId: string) => {
    setRotaIniciandoId(rotaId);
    try {
      // 1) Validação de pré-requisitos: ponto de saída, destinos e passageiros
      // ativos. Falha → toast e abortamos antes de abrir qualquer aba.
      const validacao = await validarRotaParaInicio(rotaId);
      if (!validacao.valido) {
        toast.error(validacao.erro ?? 'Rota inválida para iniciar viagem.');
        return;
      }

      // 2) Pop-up blocker: abrimos uma aba vazia AGORA (ainda dentro do mesmo
      // turno do clique) para reservar a permissão; populamos a URL depois.
      // A validação acima é uma única query rápida, então a janela permanece
      // dentro da janela de tolerância dos browsers.
      const janelaMaps = deveAbrirMapsNoMesmoContexto() ? null : window.open('', '_blank');
      if (janelaMaps) {
        try {
          janelaMaps.opener = null;
          janelaMaps.document.title = 'Abrindo trajeto...';
        } catch {
          // Alguns navegadores podem restringir ajustes na janela recém-aberta.
        }
      }

      // 3) Busca rota completa (com destinos) e passageiros em paralelo
      const [rota, enderecosPassageiros] = await Promise.all([
        obterRota(rotaId),
        listarPassageirosDaRota(rotaId),
      ]);

      const origem = rota
        ? formatarEnderecoCompleto({
            rua: rota.ponto_saida_rua,
            numero: rota.ponto_saida_numero,
            bairro: rota.ponto_saida_bairro,
            cep: rota.ponto_saida_cep,
          })
        : '';

      const enderecosDestinos = (rota?.destinos ?? [])
        .map(d => formatarEnderecoCompleto({
          rua: d.rua, numero: d.numero, bairro: d.bairro, cep: d.cep,
        }))
        .filter(Boolean);

      const paradas = [...enderecosPassageiros, ...enderecosDestinos];

      // Mantemos a ordem definida pela aplicação. O prefixo "optimize:true|"
      // em URLs do Maps Web pode virar uma parada fantasma ("Optimize ..."),
      // então a URL segue sempre com waypoints explícitos e ordenados.
      const url = montarUrlGoogleMaps(origem, paradas);

      if (url) {
        abrirEmNovaAba(janelaMaps, url);
      } else {
        // Cenário inesperado pós-validação — não deveria ocorrer, mas é
        // melhor falhar graciosamente do que abrir Maps com URL quebrada.
        janelaMaps?.close();
        toast.error('Não foi possível montar o trajeto. Verifique os endereços cadastrados.');
        return;
      }

      // 4) Inicia a viagem no backend
      const r = await iniciarViagem(rotaId);
      if (r) navigate(`/viagem/${r.viagem_id}`);
    } finally {
      setRotaIniciandoId(null);
    }
  };

  const handleOtimizarSequencia = async (rotaId: string) => {
    const rota = routeConfigsVisiveis.find((rc) => rc.rotaId === rotaId);
    const totalPassageiros = rota?.passengerCount ?? 0;

    if (totalPassageiros === 0) {
      toast.info('Esta rota ainda não tem passageiros para serem otimizados.');
      return;
    }

    if (totalPassageiros === 1) {
      toast.info('Adicione pelo menos mais 1 passageiro nesta rota para otimizar a sequência.');
      return;
    }

    setRotaOtimizandoId(rotaId);
    try {
      const resultado = await otimizarSequenciaPassageirosDaRota({
        rotaId,
      });

      if (resultado.total < 2) {
        toast.info('É preciso ter pelo menos 2 passageiros ativos para otimizar a sequência.');
        return;
      }

      if (resultado.status === 'sem_alteracao') {
        toast.success(
          resultado.provedor === 'google'
            ? 'A sequência atual dos passageiros já está otimizada.'
            : 'A sequência atual dos passageiros já está otimizada pelo fallback automático.',
        );
        return;
      }

      toast.success(
        resultado.provedor === 'google'
          ? `Sequência otimizada com sucesso para ${resultado.total} passageiros. Nova ordem: ${resultado.ordemDepois.join(' -> ')}`
          : `Sequência otimizada com sucesso para ${resultado.total} passageiros usando o fallback automático. Nova ordem: ${resultado.ordemDepois.join(' -> ')}`,
      );
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : (err && typeof err === 'object' && 'erro' in err && typeof (err as { erro?: unknown }).erro === 'string')
            ? (err as { erro: string }).erro
            : 'Não foi possível otimizar a sequência.';
      toast.error(msg);
    } finally {
      setRotaOtimizandoId(null);
    }
  };

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!rotaOtimizandoId) {
      setEtapaOtimizacaoIndex(0);
      return undefined;
    }

    setEtapaOtimizacaoIndex(0);
    const interval = window.setInterval(() => {
      setEtapaOtimizacaoIndex((atual) => (
        atual < ETAPAS_OTIMIZACAO.length - 1 ? atual + 1 : atual
      ));
    }, 1700);

    return () => window.clearInterval(interval);
  }, [rotaOtimizandoId]);

  // Carrega rotas e respostas recentes assim que a sessão estiver pronta
  // (motoristaId muda de null para o id real). Dependência de motoristaId
  // garante que, em registro novo / login, a query refaz quando o auth
  // termina — sem isso, a primeira execução pode rodar antes do JWT estar
  // disponível e voltar lista vazia.
  useEffect(() => {
    if (!user?.id) return;
    let ativo = true;
    const cacheKey = motoristaId ?? user.id;

    // Hidratação otimista: mostra rotas em cache imediatamente para o
    // usuário não ver "Nenhuma rota cadastrada" durante o cold start
    // do free tier (5-15s). Query abaixo revalida e sobrescreve.
    try {
      const cached = readJsonCache<RouteConfig[]>(cacheKeys.rotas(cacheKey));
      if (Array.isArray(cached)) setRouteConfigs(cached);
    } catch { /* cache corrompido — ignora e segue para a query */ }

    getRouteConfigs()
      .then(async rc => {
        if (!ativo) return;
        let arr = Array.isArray(rc) ? rc : [];
        if (arr.length === 0 && motoristaId) {
          const reparo = await criarRotasPadrao(motoristaId);
          if (reparo.status === 'criadas' || reparo.status === 'ja_existiam') {
            const recarregadas = await getRouteConfigs();
            arr = Array.isArray(recarregadas) ? recarregadas : [];
          }
        }
        if (arr.length === 0 && !motoristaId) {
          const { data: sessionData } = await supabase.auth.getSession();
          const sessionUser = sessionData.session?.user;
          const meta = (sessionUser?.user_metadata ?? {}) as Record<string, unknown>;
          const textoMeta = (campo: string) => {
            const valor = meta[campo];
            return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
          };
          const anoMetaBruto = meta.ano_van;
          const anoMeta = typeof anoMetaBruto === 'number'
            ? anoMetaBruto
            : typeof anoMetaBruto === 'string' && anoMetaBruto.trim()
              ? Number.parseInt(anoMetaBruto.trim(), 10)
              : null;

          const payload = {
            nome: textoMeta('nome') ?? user.name,
            telefone: textoMeta('telefone') ?? user.phone ?? null,
            cnh: textoMeta('cnh'),
            placa_van: textoMeta('placa_van'),
            marca_van: textoMeta('marca_van'),
            modelo_van: textoMeta('modelo_van'),
            ano_van: Number.isFinite(anoMeta) ? anoMeta : null,
          };

          const { data: fnData, error: fnError } = await supabase.functions.invoke('criar-perfil-motorista', {
            body: payload,
          });

          if (!fnError) {
            const motoristaIdRetornado =
              (fnData as { motorista?: { id?: string } } | null)?.motorista?.id ?? null;
            if (motoristaIdRetornado) {
              await criarRotasPadrao(motoristaIdRetornado);
            }
            const recarregadas = await getRouteConfigs();
            arr = Array.isArray(recarregadas) ? recarregadas : [];
          } else {
            console.error('Dashboard autorepair criar-perfil-motorista:', fnError);
          }
        }
        setRouteConfigs(arr);
        writeJsonCache(cacheKeys.rotas(cacheKey), arr);
      })
      .catch(err => { console.error('getRouteConfigs:', err); /* mantém cache na tela */ });
    getRecentUpdates()
      .then(u => { if (ativo) setRecentUpdates(Array.isArray(u) ? u : []); })
      .catch(err => { console.error('getRecentUpdates:', err); if (ativo) setRecentUpdates([]); });
    return () => { ativo = false; };
  }, [motoristaId, user?.id, user?.name, user?.phone]);

  const firstName = user?.name?.split(' ').slice(0, 2).join(' ') ?? 'Motorista';
  const dateStr = time.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const dateCap = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  const pad = isDesktop ? 36 : isMd ? 24 : 16;

  const routeConfigsVisiveis = useMemo(() => {
    if (loadingPassengers && passengers.length === 0) return routeConfigs;

    const counts = new Map<string, number>();
    passengers.forEach((p) => {
      counts.set(p.rotaId, (counts.get(p.rotaId) ?? 0) + 1);
    });

    return routeConfigs.map((rc) => ({
      ...rc,
      passengerCount: rc.rotaId ? (counts.get(rc.rotaId) ?? 0) : rc.passengerCount,
    }));
  }, [loadingPassengers, passengers, routeConfigs]);

  const rotaOtimizandoLabel = useMemo(
    () => routeConfigsVisiveis.find((rc) => rc.rotaId === rotaOtimizandoId)?.label ?? 'rota',
    [routeConfigsVisiveis, rotaOtimizandoId],
  );
  const etapaOtimizacao = ETAPAS_OTIMIZACAO[etapaOtimizacaoIndex] ?? ETAPAS_OTIMIZACAO[0];

  const desktopStats = [
    { n: s.going,   l: 'INDO',      c: '#4ADE80', bg: 'rgba(25,135,84,0.22)' },
    { n: s.absent,  l: 'AUSENTES',  c: '#FF6B7A', bg: 'rgba(220,53,69,0.22)' },
    { n: s.pending, l: 'PENDENTES', c: '#FD7E14', bg: 'rgba(253,126,20,0.22)' },
    { n: s.total,   l: 'TOTAL',     c: '#FFC107', bg: 'rgba(255,193,7,0.15)'  },
  ];

  return (
    <div className="bg-surface min-h-full transition-colors">
      {rotaOtimizandoId && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[140] px-4">
          <div className="overflow-hidden rounded-[18px] border border-pending/35 bg-[#212529]/95 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-md">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pending/15">
                <Loader2 size={18} color="#FFC107" strokeWidth={2.5} className="animate-spin" />
              </div>
              <div className="min-w-[220px]">
                <p className="m-0 text-sm font-extrabold text-white">Otimizando sequência da {rotaOtimizandoLabel}...</p>
                <p className="m-0 text-xs text-white/70">{etapaOtimizacao}</p>
              </div>
            </div>
            <div className="h-1.5 w-full bg-white/8">
              <div className="h-full w-1/3 rounded-r-full bg-[linear-gradient(90deg,#FFC107_0%,#FFD95A_100%)] animate-[pulse_1.2s_ease-in-out_infinite]" />
            </div>
          </div>
        </div>
      )}

      <header
        className={`relative overflow-hidden ${isDark ? 'bg-[linear-gradient(160deg,#0A0D12_0%,#161B22_100%)]' : 'bg-[linear-gradient(160deg,#161B22_0%,#212529_100%)]'}`}
        style={{ padding: `${isDesktop ? 28 : 20}px ${pad}px ${isDesktop ? 36 : 32}px` }}
      >
        <div className="absolute -top-[50px] -right-[50px] w-[200px] h-[200px] rounded-full bg-pending/5 pointer-events-none" />

        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-2.5">
            {!isLg && (
              <button onClick={openDrawer} className="touch-scale w-11 h-11 rounded-[14px] bg-white/[0.08] border-[1.5px] border-white/10 flex items-center justify-center cursor-pointer shrink-0" aria-label="Abrir menu de navegação">
                <Menu size={20} color="rgba(255,255,255,0.8)" strokeWidth={2} />
              </button>
            )}
            {!isDesktop ? (
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-pending rounded-[11px] flex items-center justify-center">
                  <span className="text-lg">🚌</span>
                </div>
                <div>
                  <p className="text-[13px] font-extrabold text-pending m-0">SmartRoutes</p>
                  <p className="text-[11px] text-white/35 m-0">{time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[11px] font-bold text-white/35 m-0 tracking-[0.08em] uppercase">Dashboard</p>
                <p className="text-sm font-semibold text-white/65 m-0">{dateCap}</p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {!isLg && (
              <button onClick={toggleTheme} className={`touch-scale w-11 h-11 rounded-[14px] flex items-center justify-center cursor-pointer ${isDark ? 'bg-pending/15 border-[1.5px] border-pending/30' : 'bg-white/10 border-[1.5px] border-white/[0.08]'}`} aria-label="Alternar tema">
                {isDark ? <SunMedium size={20} color="#FFC107" strokeWidth={2} /> : <Moon size={20} color="rgba(255,255,255,0.75)" strokeWidth={2} />}
              </button>
            )}
            <button
              onClick={() => setNotificacoesAberto(true)}
              className="touch-scale relative w-11 h-11 rounded-[14px] bg-white/[0.08] border-0 flex items-center justify-center cursor-pointer"
              aria-label={notificacoesNaoLidas > 0 ? `Notificações (${notificacoesNaoLidas} não lidas)` : 'Notificações'}
            >
              <Bell size={20} color="rgba(255,255,255,0.75)" strokeWidth={2} />
              {notificacoesNaoLidas > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center text-[10px] font-bold text-[#212529] bg-pending rounded-full border-[1.5px] border-[#212529]">
                  {notificacoesNaoLidas > 9 ? '9+' : notificacoesNaoLidas}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className={`font-black text-white m-0 mb-1 leading-[1.1] ${isDesktop ? 'text-[34px]' : 'text-[26px]'}`}>
            Olá, <span className="text-pending">{firstName}!</span> 👋
          </h1>
          {!isDesktop && <p className="text-[13px] text-white/50 m-0">{dateCap}</p>}
        </div>

        <div className="flex items-center gap-1.5 mt-2.5 relative z-10">
          <span className="pulse-dot inline-block w-[7px] h-[7px] rounded-full bg-[#4ADE80]" />
          <Wifi size={12} color="rgba(255,255,255,0.3)" />
          <span className="text-[11px] text-white/40 font-medium">Sincronizando respostas em tempo real</span>
        </div>

        {isDesktop && (
          <div className="flex gap-4 mt-6 relative z-10">
            {desktopStats.map(({ n, l, c, bg }) => (
              <div key={l} className="flex flex-col items-center rounded-2xl px-5 py-3.5 min-w-[86px]" style={{ background: bg }}>
                <span className="text-[32px] font-black leading-none" style={{ color: c }}>{n}</span>
                <span className="text-[10px] font-bold text-white/45 tracking-[0.08em] mt-[3px]">{l}</span>
              </div>
            ))}
          </div>
        )}
      </header>

      <div style={{ padding: `${isDesktop ? 28 : 20}px ${pad}px ${isDesktop ? 40 : 0}px` }}>
        <div className={isDesktop ? 'grid grid-cols-[1fr_380px] gap-7 items-start' : ''}>
          <div>
            {!isDesktop && <OccupancySummary summary={s} />}

            <SectionHead
              label="ROTAS DE HOJE"
              actionLabel="Gerenciar Rotas"
              onAction={() => setGerenciarAberto(true)}
              ActionIcon={Settings}
            />

            {routeConfigsVisiveis.length === 0 ? (
              <div className="bg-panel border-[1.5px] border-dashed border-app-border rounded-[18px] px-4 py-6 text-center mb-5">
                <p className="text-[13px] font-bold text-ink m-0 mb-1">Nenhuma rota cadastrada</p>
                <p className="text-xs text-ink-soft m-0 mb-3">Crie sua primeira rota para começar.</p>
                <button
                  onClick={() => setGerenciarAberto(true)}
                  className="inline-flex items-center gap-1.5 bg-pending text-[#212529] border-0 rounded-[12px] px-4 py-2 text-xs font-bold cursor-pointer min-h-[40px]"
                >
                  <Settings size={14} strokeWidth={2.5} /> Gerenciar Rotas
                </button>
              </div>
            ) : (
              <div
                className="grid gap-2.5 mb-5"
                style={{
                  gridTemplateColumns: isDesktop
                    ? `repeat(${Math.min(routeConfigsVisiveis.length, 3)}, 1fr)`
                    : routeConfigsVisiveis.length === 1
                        ? '1fr'
                        : 'repeat(2, 1fr)',
                }}
              >
                {routeConfigsVisiveis.map((rc, idx) => {
                  const isUltimoImparNoMobile = !isDesktop
                    && routeConfigsVisiveis.length > 1
                    && routeConfigsVisiveis.length % 2 === 1
                    && idx === routeConfigsVisiveis.length - 1;

                  return (
                    <div
                      key={rc.rotaId ?? rc.type}
                      style={isUltimoImparNoMobile ? { gridColumn: '1 / -1' } : undefined}
                    >
                      <RouteButton
                        {...rc}
                        onClick={() => navigate(rc.rotaId ? `/routes?rota=${rc.rotaId}` : '/routes')}
                        onIniciarViagem={handleIniciarViagem}
                        iniciandoViagem={iniciandoViagem && rotaIniciandoId === rc.rotaId}
                        onOtimizarSequencia={handleOtimizarSequencia}
                        otimizandoSequencia={rotaOtimizandoId === rc.rotaId}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {isDesktop && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { emoji: '📨', label: 'Enviar Mensagens', desc: `${s.pending} aguardando resposta`, to: '/whatsapp' },
                  { emoji: '📋', label: 'Lista Completa',  desc: `${passengers.length} passageiros`,  to: '/routes'   },
                ].map(btn => (
                  <button key={btn.label} onClick={() => navigate(btn.to)} className="touch-scale flex items-center gap-3.5 bg-panel border-[1.5px] border-app-border rounded-[18px] px-[18px] py-4 cursor-pointer font-sans shadow-[0_2px_12px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.5)] text-left">
                    <div className="w-11 h-11 bg-pending/10 rounded-[13px] flex items-center justify-center text-[22px] shrink-0">{btn.emoji}</div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-ink m-0">{btn.label}</p>
                      <p className="text-xs text-ink-soft m-0">{btn.desc}</p>
                    </div>
                    <ArrowRight size={18} className="text-ink-muted" strokeWidth={2} />
                  </button>
                ))}
              </div>
            )}

            {!isDesktop && s.pending > 0 && (
              <div className="flex items-center gap-3 bg-pending/10 border-[1.5px] border-pending/30 rounded-2xl px-4 py-3.5 mb-6">
                <span className="text-xl">💡</span>
                <p className={`text-[13px] font-medium m-0 leading-normal ${isDark ? 'text-pending/90' : 'text-[#5D4E00]'}`}>
                  <strong>{s.pending} passageiro{s.pending > 1 ? 's' : ''}</strong> sem resposta. Acesse <strong>WhatsApp</strong> para enviar lembretes.
                </p>
              </div>
            )}
          </div>

          <div>
            <SectionHead label="RESPOSTAS RECENTES" actionLabel="WhatsApp" onAction={() => navigate('/whatsapp')} />
            <div className={`bg-panel rounded-[20px] px-4 pt-1 pb-2 shadow-[0_2px_12px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.5)] border-[1.5px] border-app-border transition-colors ${isDesktop ? '' : 'mb-4'}`}>
              <div className="flex items-center gap-1.5 pt-2.5 pb-2 border-b border-divider">
                <span className="text-[15px]">💬</span>
                <span className="text-[11px] font-bold text-[#128C7E] tracking-[0.04em]">WhatsApp Bot · Ao vivo</span>
                <span className="pulse-dot inline-block w-1.5 h-1.5 rounded-full bg-[#128C7E] ml-1" />
              </div>
              {recentUpdates.length === 0 ? (
                <div className="py-7 text-center">
                  <p className="text-[12px] text-ink-muted m-0 mb-1">Nenhuma resposta recebida ainda.</p>
                  <p className="text-[11px] text-ink-muted/70 m-0">As confirmações dos responsáveis aparecerão aqui.</p>
                </div>
              ) : (
                recentUpdates.map(u => <UpdateRow key={u.id} update={u} />)
              )}
              <button onClick={() => navigate('/whatsapp')} className="flex items-center justify-center gap-1.5 w-full bg-transparent border-0 cursor-pointer pt-2.5 pb-1 text-xs font-bold text-[#128C7E] font-sans">
                Ver todas <ChevronRight size={13} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <GerenciarRotasModal
        open={gerenciarAberto}
        onOpenChange={setGerenciarAberto}
        onChanged={recarregarRotas}
      />

      <NotificacoesPanel
        open={notificacoesAberto}
        onOpenChange={setNotificacoesAberto}
        lista={notificacoes}
        naoLidas={notificacoesNaoLidas}
        onMarcarComoLida={marcarNotificacaoComoLida}
        onMarcarTodasComoLidas={marcarTodasNotificacoesComoLidas}
      />
    </div>
  );
}

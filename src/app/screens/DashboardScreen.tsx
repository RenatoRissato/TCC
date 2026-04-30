import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell, ChevronRight, Wifi, Moon, SunMedium, ArrowRight, Menu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useBreakpoints } from '../hooks/useWindowSize';
import { useDailyList } from '../hooks/useDailyList';
import { usePassengers } from '../hooks/usePassengers';
import { useIniciarViagem } from '../hooks/useViagem';
import { getRecentUpdates, getRouteConfigs } from '../services/dashboardService';
import { useNavDrawer } from '../context/NavDrawerContext';
import type { RouteConfig, WhatsAppUpdate } from '../types';
import { RouteButton } from '../components/dashboard/RouteButton';
import { UpdateRow } from '../components/dashboard/UpdateRow';
import { OccupancySummary } from '../components/dashboard/OccupancySummary';

function SectionHead({ label, actionLabel, onAction }: { label: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-[7px]">
        <div className="w-[3px] h-[13px] bg-pending rounded-sm" />
        <p className="text-[10px] font-extrabold text-ink-soft tracking-[0.11em] uppercase m-0">{label}</p>
      </div>
      <button
        onClick={onAction}
        className="flex items-center gap-[3px] text-pending text-xs font-bold bg-transparent border-0 cursor-pointer px-0 py-1 min-h-8"
      >
        {actionLabel} <ChevronRight size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export function DashboardScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { isDesktop, isLg, isMd } = useBreakpoints();
  const { openDrawer } = useNavDrawer();
  const [time, setTime] = useState(new Date());
  const { summary: s } = useDailyList();
  const { list: passengers } = usePassengers();
  const [recentUpdates, setRecentUpdates] = useState<WhatsAppUpdate[]>([]);
  const [routeConfigs, setRouteConfigs] = useState<RouteConfig[]>([]);
  const { iniciarViagem, loading: iniciandoViagem } = useIniciarViagem();
  const [rotaIniciandoId, setRotaIniciandoId] = useState<string | null>(null);

  const handleIniciarViagem = async (rotaId: string) => {
    setRotaIniciandoId(rotaId);
    const r = await iniciarViagem(rotaId);
    setRotaIniciandoId(null);
    if (r) navigate(`/viagem/${r.viagem_id}`);
  };

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let ativo = true;
    getRouteConfigs()
      .then(rc => { if (ativo) setRouteConfigs(Array.isArray(rc) ? rc : []); })
      .catch(err => { console.error('getRouteConfigs:', err); if (ativo) setRouteConfigs([]); });
    getRecentUpdates()
      .then(u => { if (ativo) setRecentUpdates(Array.isArray(u) ? u : []); })
      .catch(err => { console.error('getRecentUpdates:', err); if (ativo) setRecentUpdates([]); });
    return () => { ativo = false; };
  }, []);

  const firstName = user?.name?.split(' ').slice(0, 2).join(' ') ?? 'Motorista';
  const dateStr = time.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const dateCap = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  const pad = isDesktop ? 36 : isMd ? 24 : 16;

  const desktopStats = [
    { n: s.going,   l: 'INDO',      c: '#4ADE80', bg: 'rgba(25,135,84,0.22)' },
    { n: s.absent,  l: 'AUSENTES',  c: '#FF6B7A', bg: 'rgba(220,53,69,0.22)' },
    { n: s.pending, l: 'PENDENTES', c: '#FD7E14', bg: 'rgba(253,126,20,0.22)' },
    { n: s.total,   l: 'TOTAL',     c: '#FFC107', bg: 'rgba(255,193,7,0.15)'  },
  ];

  return (
    <div className="bg-surface min-h-full transition-colors">
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
            <button className="touch-scale relative w-11 h-11 rounded-[14px] bg-white/[0.08] border-0 flex items-center justify-center cursor-pointer" aria-label="Notificações">
              <Bell size={20} color="rgba(255,255,255,0.75)" strokeWidth={2} />
              {s.pending > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-warning rounded-full border-[1.5px] border-[#212529]" />}
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

            <SectionHead label="ROTAS DE HOJE" actionLabel="Ver todas" onAction={() => navigate('/routes')} />

            {isDesktop ? (
              <div className="flex gap-3.5 mb-6">
                {routeConfigs.map(rc => <RouteButton
                    key={rc.rotaId ?? rc.type}
                    {...rc}
                    onClick={() => navigate(`/routes?turno=${rc.type}`)}
                    onIniciarViagem={handleIniciarViagem}
                    iniciandoViagem={iniciandoViagem && rotaIniciandoId === rc.rotaId}
                  />)}
              </div>
            ) : (
              <>
                <div className="flex gap-2.5 mb-2.5">
                  {routeConfigs.slice(0, 2).map(rc => <RouteButton
                    key={rc.rotaId ?? rc.type}
                    {...rc}
                    onClick={() => navigate(`/routes?turno=${rc.type}`)}
                    onIniciarViagem={handleIniciarViagem}
                    iniciandoViagem={iniciandoViagem && rotaIniciandoId === rc.rotaId}
                  />)}
                </div>
                {routeConfigs[2] && (
                  <div className="flex mb-5">
                    <RouteButton
                      {...routeConfigs[2]}
                      onClick={() => navigate(`/routes?turno=${routeConfigs[2].type}`)}
                      onIniciarViagem={handleIniciarViagem}
                      iniciandoViagem={iniciandoViagem && rotaIniciandoId === routeConfigs[2].rotaId}
                    />
                  </div>
                )}
              </>
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
    </div>
  );
}

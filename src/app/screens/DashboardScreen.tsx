import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell, ChevronRight, Wifi, CheckCircle2, XCircle, Clock,
  Sunrise, Sun, Moon, TrendingUp, SunMedium, ArrowRight,
  Menu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme, useColors } from '../context/ThemeContext';
import { useBreakpoints } from '../hooks/useWindowSize';
import { passengers, recentUpdates, routeConfigs, getSummary } from '../data/mockData';
import { Avatar } from '../components/shared/Avatar';
import { useNavDrawer } from '../context/NavDrawerContext';

// ─── Donut ring ──────────────────────────────────────────────────────
function DonutRing({ going, absent, pending, total, size = 160 }: {
  going: number; absent: number; pending: number; total: number; size?: number;
}) {
  const cx = size / 2, cy = size / 2;
  const r  = size * 0.37, sw = size * 0.105;
  const C  = 2 * Math.PI * r;
  const gap = 5;
  const gA = total > 0 ? Math.max(going   / total * C - gap, 0) : 0;
  const aA = total > 0 ? Math.max(absent  / total * C - gap, 0) : 0;
  const pA = total > 0 ? Math.max(pending / total * C - gap, 0) : 0;
  const gO = 0;
  const aO = -(going   / total * C);
  const pO = -((going + absent) / total * C);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={sw} />
        {gA > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#198754" strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${gA} ${C}`} strokeDashoffset={gO} />}
        {aA > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#DC3545" strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${aA} ${C}`} strokeDashoffset={aO} />}
        {pA > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#FD7E14" strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${pA} ${C}`} strokeDashoffset={pO} />}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.2, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{total}</span>
        <span style={{ fontSize: size * 0.065, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.8, marginTop: 2 }}>TOTAL</span>
      </div>
    </div>
  );
}

// ─── Route button ─────────────────────────────────────────────────────
function RouteButton({ label, time, emoji, passengerCount, color, darkBg, type, onClick }: typeof routeConfigs[0] & { onClick: () => void }) {
  const RI = type === 'morning' ? Sunrise : type === 'afternoon' ? Sun : Moon;
  return (
    <button onClick={onClick} className="touch-scale"
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        background: darkBg ? '#1E1B3A' : color,
        border: darkBg ? `2px solid ${color}40` : '2px solid transparent',
        borderRadius: 20, padding: '16px 14px',
        cursor: 'pointer', minHeight: 108,
        position: 'relative', overflow: 'hidden',
        boxShadow: darkBg ? `0 4px 24px ${color}28` : `0 4px 24px ${color}48`,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ position: 'absolute', top: -18, right: -18, width: 72, height: 72, borderRadius: '50%', background: darkBg ? `${color}18` : 'rgba(255,255,255,0.2)', pointerEvents: 'none' }} />
      <RI size={22} color={darkBg ? color : '#212529'} strokeWidth={2} />
      <span style={{ fontSize: 13, fontWeight: 800, color: darkBg ? '#fff' : '#212529', lineHeight: 1.2, marginTop: 10, marginBottom: 3 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 500, color: darkBg ? `${color}CC` : 'rgba(33,37,41,0.65)' }}>{time}</span>
      <div style={{ position: 'absolute', bottom: 10, right: 10, background: darkBg ? `${color}28` : 'rgba(33,37,41,0.1)', borderRadius: 20, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 3 }}>
        <span style={{ fontSize: 10 }}>👤</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: darkBg ? color : '#212529' }}>{passengerCount}</span>
      </div>
    </button>
  );
}

// ─── Update row ───────────────────────────────────────────────────────
function UpdateRow({ update, c }: { update: typeof recentUpdates[0]; c: ReturnType<typeof useColors> }) {
  const going = update.status === 'going';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: `1px solid ${c.updateBorder}` }}>
      <Avatar initials={update.initials} status={update.status} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{update.name}</span>
          <span style={{ fontSize: 11, color: c.textMuted, fontWeight: 500, flexShrink: 0 }}>{update.time}</span>
        </div>
        <p style={{ fontSize: 12, color: c.textSec, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{update.message}</p>
      </div>
      <div style={{ flexShrink: 0, padding: '4px 9px', background: going ? c.badgeGoing : c.badgeAbsent, borderRadius: 8, fontSize: 10, fontWeight: 800, color: going ? '#198754' : '#DC3545' }}>
        {going ? 'VAI' : 'NÃO'}
      </div>
    </div>
  );
}

function SectionHead({ label, actionLabel, onAction, c }: { label: string; actionLabel: string; onAction: () => void; c: ReturnType<typeof useColors> }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{ width: 3, height: 13, background: '#FFC107', borderRadius: 2 }} />
        <p style={{ fontSize: 10, fontWeight: 800, color: c.sectionTitle, letterSpacing: 1.1, textTransform: 'uppercase', margin: 0 }}>{label}</p>
      </div>
      <button onClick={onAction} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, color: '#FFC107', fontSize: 12, fontWeight: 700, padding: '4px 0', minHeight: 32 }}>
        {actionLabel} <ChevronRight size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────
export function DashboardScreen() {
  const navigate       = useNavigate();
  const { user }       = useAuth();
  const c              = useColors();
  const { isDark, toggleTheme } = useTheme();
  const { isDesktop, isLg, isMd }  = useBreakpoints();
  const { openDrawer } = useNavDrawer();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const s          = getSummary(passengers);
  const firstName  = user?.name?.split(' ')[0] ?? 'Motorista';
  const dateStr    = time.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const pct        = s.total > 0 ? Math.round(((s.going + s.absent) / s.total) * 100) : 0;
  const pad        = isDesktop ? 36 : isMd ? 24 : 16;

  return (
    <div style={{ background: c.bg, minHeight: '100%', transition: 'background 0.3s' }}>

      {/* ── Dark header — scrolls naturally with page content ───────── */}
      <header style={{
        background: isDark ? 'linear-gradient(160deg,#0A0D12 0%,#161B22 100%)' : 'linear-gradient(160deg,#161B22 0%,#212529 100%)',
        padding: `${isDesktop ? 28 : 20}px ${pad}px ${isDesktop ? 36 : 32}px`,
        overflow: 'hidden', transition: 'background 0.3s',
      }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,193,7,0.05)', pointerEvents: 'none' }} />

        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Hamburger — only when sidebar is hidden (< 992 px) */}
            {!isLg && (
              <button onClick={openDrawer} className="touch-scale"
                aria-label="Abrir menu de navegação"
                style={{ width: 44, height: 44, borderRadius: 14,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1.5px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0 }}>
                <Menu size={20} color="rgba(255,255,255,0.8)" strokeWidth={2} />
              </button>
            )}
            {!isDesktop && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 36, height: 36, background: '#FFC107', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 18 }}>🚌</span>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#FFC107', margin: 0 }}>SmartRoutes</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            )}
            {isDesktop && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', margin: 0, letterSpacing: 1, textTransform: 'uppercase' }}>Dashboard</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.65)', margin: 0 }}>{dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}</p>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Theme toggle (hidden when sidebar is visible — sidebar handles it) */}
            {!isLg && (
              <button onClick={toggleTheme} className="touch-scale"
                style={{ width: 44, height: 44, borderRadius: 14, background: isDark ? 'rgba(255,193,7,0.15)' : 'rgba(255,255,255,0.1)', border: isDark ? '1.5px solid rgba(255,193,7,0.3)' : '1.5px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                aria-label="Alternar tema"
              >
                {isDark ? <SunMedium size={20} color="#FFC107" strokeWidth={2} /> : <Moon size={20} color="rgba(255,255,255,0.75)" strokeWidth={2} />}
              </button>
            )}
            <button className="touch-scale"
              style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
              aria-label="Notificações"
            >
              <Bell size={20} color="rgba(255,255,255,0.75)" strokeWidth={2} />
              {s.pending > 0 && <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, background: '#FD7E14', borderRadius: '50%', border: '1.5px solid #212529' }} />}
            </button>
          </div>
        </div>

        {/* Greeting */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: isDesktop ? 34 : 26, fontWeight: 900, color: '#fff', margin: '0 0 4px', lineHeight: 1.1 }}>
            Olá, <span style={{ color: '#FFC107' }}>{firstName}!</span> 👋
          </h1>
          {!isDesktop && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}</p>}
        </div>

        {/* Live badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, position: 'relative', zIndex: 1 }}>
          <span className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} />
          <Wifi size={12} color="rgba(255,255,255,0.3)" />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Sincronizando respostas em tempo real</span>
        </div>

        {/* Desktop top-stat pills */}
        {isDesktop && (
          <div style={{ display: 'flex', gap: 16, marginTop: 24, position: 'relative', zIndex: 1 }}>
            {[
              { n: s.going,   l: 'INDO',      c2: '#4ADE80', bg: 'rgba(25,135,84,0.22)' },
              { n: s.absent,  l: 'AUSENTES',  c2: '#FF6B7A', bg: 'rgba(220,53,69,0.22)' },
              { n: s.pending, l: 'PENDENTES', c2: '#FD7E14', bg: 'rgba(253,126,20,0.22)' },
              { n: s.total,   l: 'TOTAL',     c2: '#FFC107', bg: 'rgba(255,193,7,0.15)'  },
            ].map(({ n, l, c2, bg }) => (
              <div key={l} style={{ background: bg, borderRadius: 16, padding: '14px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 86 }}>
                <span style={{ fontSize: 32, fontWeight: 900, color: c2, lineHeight: 1 }}>{n}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.8, marginTop: 3 }}>{l}</span>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* ── Content ───────────────────────────────── */}
      <div style={{ padding: `${isDesktop ? 28 : 20}px ${pad}px ${isDesktop ? 40 : 0}px` }}>
        <div style={isDesktop ? { display: 'grid', gridTemplateColumns: '1fr 380px', gap: 28, alignItems: 'start' } : {}}>

          {/* Left / main column */}
          <div>
            {/* Widget A — Stats (mobile only; desktop shows stats in header) */}
            {!isDesktop && (
              <div style={{ background: isDark ? 'linear-gradient(145deg,#161B22,#1C2128)' : 'linear-gradient(145deg,#1C2128,#2C3440)', borderRadius: 24, overflow: 'hidden', marginBottom: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.2, textTransform: 'uppercase', margin: '0 0 2px' }}>RESUMO DO DIA</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>Todas as Rotas</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(74,222,128,0.12)', borderRadius: 20, padding: '5px 10px' }}>
                    <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#4ADE80' }}>AO VIVO</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 14px' }}>
                  <DonutRing {...s} size={152} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {[
                      { n: s.going,   l: 'VAI',      color: '#4ADE80', border: 'rgba(25,135,84,0.3)',  bg: 'rgba(25,135,84,0.18)',  I: CheckCircle2 },
                      { n: s.absent,  l: 'NÃO VAI',  color: '#FF6B7A', border: 'rgba(220,53,69,0.3)',  bg: 'rgba(220,53,69,0.18)',  I: XCircle },
                      { n: s.pending, l: 'PENDENTE', color: '#FD7E14', border: 'rgba(253,126,20,0.3)', bg: 'rgba(253,126,20,0.18)', I: Clock },
                    ].map(({ n, l, color, border, bg, I }) => (
                      <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 9, background: bg, border: `1.5px solid ${border}`, borderRadius: 13, padding: '9px 11px' }}>
                        <I size={17} color={color} strokeWidth={2.5} />
                        <div>
                          <p style={{ fontSize: 22, fontWeight: 900, color, margin: 0, lineHeight: 1 }}>{n}</p>
                          <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', margin: 0, letterSpacing: 0.5 }}>{l}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ padding: '0 18px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                      <TrendingUp size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                      Respostas recebidas
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#FFC107' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#198754,#4ADE80)', borderRadius: 6, transition: 'width 0.6s' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Widget B — Route buttons */}
            <SectionHead label="ROTAS DE HOJE" actionLabel="Ver todas" onAction={() => navigate('/routes')} c={c} />

            {isDesktop ? (
              <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
                {routeConfigs.map(rc => <RouteButton key={rc.type} {...rc} onClick={() => navigate('/routes')} />)}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  {routeConfigs.slice(0, 2).map(rc => <RouteButton key={rc.type} {...rc} onClick={() => navigate('/routes')} />)}
                </div>
                <div style={{ marginBottom: 20 }}>
                  <RouteButton {...routeConfigs[2]} onClick={() => navigate('/routes')} />
                </div>
              </>
            )}

            {/* Desktop quick-action cards */}
            {isDesktop && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 0 }}>
                {[
                  { emoji: '📨', label: 'Enviar Mensagens', desc: `${s.pending} aguardando resposta`, to: '/whatsapp' },
                  { emoji: '📋', label: 'Lista Completa', desc: `${passengers.length} passageiros`, to: '/routes' },
                ].map(btn => (
                  <button key={btn.label} onClick={() => navigate(btn.to)} className="touch-scale"
                    style={{ display: 'flex', alignItems: 'center', gap: 14, background: c.card, border: `1.5px solid ${c.cardBorder}`, borderRadius: 18, padding: '16px 18px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: c.cardShadow, textAlign: 'left' }}
                  >
                    <div style={{ width: 44, height: 44, background: 'rgba(255,193,7,0.12)', borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{btn.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: c.text, margin: 0 }}>{btn.label}</p>
                      <p style={{ fontSize: 12, color: c.textSec, margin: 0 }}>{btn.desc}</p>
                    </div>
                    <ArrowRight size={18} color={c.textMuted} strokeWidth={2} />
                  </button>
                ))}
              </div>
            )}

            {/* Tip card — mobile only */}
            {!isDesktop && s.pending > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,193,7,0.1)', border: '1.5px solid rgba(255,193,7,0.3)', borderRadius: 16, padding: '14px 16px', marginBottom: 24 }}>
                <span style={{ fontSize: 20 }}>💡</span>
                <p style={{ fontSize: 13, color: isDark ? 'rgba(255,193,7,0.9)' : '#5D4E00', fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
                  <strong>{s.pending} passageiro{s.pending > 1 ? 's' : ''}</strong> sem resposta. Acesse <strong>WhatsApp</strong> para enviar lembretes.
                </p>
              </div>
            )}
          </div>

          {/* Right / Activity feed */}
          <div>
            <SectionHead label="RESPOSTAS RECENTES" actionLabel="WhatsApp" onAction={() => navigate('/whatsapp')} c={c} />
            <div style={{ background: c.card, borderRadius: 20, padding: '4px 16px 8px', marginBottom: isDesktop ? 0 : 16, boxShadow: c.cardShadow, border: `1.5px solid ${c.cardBorder}`, transition: 'background 0.3s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 0 8px', borderBottom: `1px solid ${c.updateBorder}` }}>
                <span style={{ fontSize: 15 }}>💬</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#128C7E', letterSpacing: 0.5 }}>WhatsApp Bot · Ao vivo</span>
                <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#128C7E', display: 'inline-block', marginLeft: 4 }} />
              </div>
              {recentUpdates.map(u => <UpdateRow key={u.id} update={u} c={c} />)}
              <button onClick={() => navigate('/whatsapp')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0 4px', fontSize: 12, fontWeight: 700, color: '#128C7E', fontFamily: 'Inter, sans-serif' }}>
                Ver todas <ChevronRight size={13} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
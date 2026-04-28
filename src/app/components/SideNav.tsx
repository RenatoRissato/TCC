import { useLocation, useNavigate } from 'react-router';
import { Home, MapPin, MessageCircle, Settings, LogOut, SunMedium, Moon, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePassengers } from '../hooks/usePassengers';

const SIDEBAR_BG   = '#0D1117';
const BORDER_COLOR = 'rgba(255,255,255,0.07)';

export function SideNav({ onClose }: { onClose?: () => void } = {}) {
  const navigate            = useNavigate();
  const { pathname }        = useLocation();
  const { user, logout }    = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { counts } = usePassengers();
  const summary = { going: counts.going, absent: counts.absent, pending: counts.pending };

  const NAV_ITEMS = [
    { path: '/home',     label: 'Início',      sub: 'Visão geral',          Icon: Home,          badge: 0 },
    { path: '/routes',   label: 'Rotas',        sub: 'Lista de passageiros', Icon: MapPin,        badge: counts.pending },
    { path: '/whatsapp', label: 'WhatsApp',     sub: 'Integração & Bot',     Icon: MessageCircle, badge: 0 },
    { path: '/settings', label: 'Config.',      sub: 'Perfil & dashboards',  Icon: Settings,      badge: 0 },
  ] as const;

  const isDrawer = Boolean(onClose);

  return (
    <aside style={{
      width: isDrawer ? '100%' : 264, flexShrink: 0,
      height: '100dvh',
      background: SIDEBAR_BG,
      borderRight: `1px solid ${BORDER_COLOR}`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'Inter, sans-serif',
      position: 'relative',
      zIndex: 10,
    }}>

      {/* ── Brand ────────────────────────────────── */}
      <div style={{ padding: '20px 18px 16px', borderBottom: `1px solid ${BORDER_COLOR}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 42, height: 42, background: '#FFC107', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(255,193,7,0.4)', flexShrink: 0,
          }}>
            <span style={{ fontSize: 22 }}>🚌</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 17, fontWeight: 900, color: '#FFC107', margin: 0, letterSpacing: -0.3 }}>SmartRoutes</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Gestão Escolar</p>
          </div>
          {/* Close button — drawer mode only */}
          {isDrawer && (
            <button
              onClick={onClose}
              aria-label="Fechar menu"
              style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} color="rgba(255,255,255,0.6)" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* ── Live stats mini-widget ────────────────── */}
      <div style={{ padding: '12px 12px 6px' }}>
        <div style={{
          background: 'rgba(255,193,7,0.07)',
          border: '1px solid rgba(255,193,7,0.15)',
          borderRadius: 16, padding: '10px 12px',
        }}>
          <p style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,193,7,0.6)', margin: '0 0 8px', letterSpacing: 1.1, textTransform: 'uppercase' }}>
            Status Hoje · Ao Vivo
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { v: summary.going,   l: 'VAI',   c: '#4ADE80' },
              { v: summary.absent,  l: 'NÃO',   c: '#FF6B7A' },
              { v: summary.pending, l: 'PEND.',  c: '#FD7E14' },
            ].map(({ v, l, c }) => (
              <div key={l} style={{
                flex: 1, background: 'rgba(255,255,255,0.04)',
                borderRadius: 10, padding: '7px 0',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: c, lineHeight: 1 }}>{v}</span>
                <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5 }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Nav label ────────────────────────────── */}
      <p style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.2)', letterSpacing: 1.4, textTransform: 'uppercase', margin: '10px 28px 6px' }}>
        Menu
      </p>

      {/* ── Nav Items ────────────────────────────── */}
      <nav style={{ flex: 1, overflow: 'auto', padding: '0 10px' }}>
        {NAV_ITEMS.map(({ path, label, sub, Icon, badge }) => {
          const active = pathname === path || (path !== '/home' && pathname.startsWith(path));
          return (
            <button key={path} onClick={() => { navigate(path); onClose?.(); }}
              aria-current={active ? 'page' : undefined}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px',
                background: active ? 'rgba(255,193,7,0.12)' : 'transparent',
                border: 'none', borderRadius: 14, cursor: 'pointer',
                marginBottom: 4, position: 'relative',
                fontFamily: 'Inter, sans-serif', textAlign: 'left',
                minHeight: 54, transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {/* Active accent */}
              {active && (
                <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 22, background: '#FFC107', borderRadius: '0 3px 3px 0' }} />
              )}

              {/* Icon box */}
              <div style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                background: active ? 'rgba(255,193,7,0.18)' : 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={18} color={active ? '#FFC107' : 'rgba(255,255,255,0.42)'} strokeWidth={active ? 2.3 : 1.7} />
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: active ? 700 : 500, color: active ? '#fff' : 'rgba(255,255,255,0.48)', margin: 0, lineHeight: 1.2 }}>{label}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</p>
              </div>

              {/* Badge */}
              {badge > 0 && (
                <span style={{ background: '#FD7E14', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 10, flexShrink: 0 }}>
                  {badge}
                </span>
              )}

              {active && <ChevronRight size={14} color="rgba(255,193,7,0.5)" strokeWidth={2.5} />}
            </button>
          );
        })}
      </nav>

      {/* ── Bottom: theme + user ─────────────────── */}
      <div style={{ padding: '10px 10px 14px', borderTop: `1px solid ${BORDER_COLOR}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Theme toggle */}
        <button onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER_COLOR}`,
            borderRadius: 12, padding: '9px 12px', cursor: 'pointer',
            width: '100%', fontFamily: 'Inter, sans-serif', transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
        >
          {isDark
            ? <SunMedium size={16} color="#FFC107" strokeWidth={2} />
            : <Moon size={16} color="rgba(255,255,255,0.45)" strokeWidth={2} />
          }
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 500, flex: 1 }}>
            {isDark ? 'Modo Claro' : 'Modo Escuro'}
          </span>
          {/* pill */}
          <div style={{ width: 34, height: 19, background: isDark ? '#198754' : 'rgba(255,255,255,0.15)', borderRadius: 10, position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: 2, left: isDark ? 17 : 2, width: 15, height: 15, background: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </div>
        </button>

        {/* User card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER_COLOR}`, borderRadius: 12, padding: '9px 10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg,#FFC107,#E6A800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#212529', flexShrink: 0 }}>
            {(user?.name ?? 'CA').split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name ?? 'Motorista'}</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email ?? ''}</p>
          </div>
          <button onClick={logout} title="Sair"
            style={{ width: 30, height: 30, background: 'rgba(220,53,69,0.12)', border: '1px solid rgba(220,53,69,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            aria-label="Sair da conta"
          >
            <LogOut size={14} color="#DC3545" strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}
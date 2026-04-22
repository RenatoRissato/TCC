import { useLocation, useNavigate } from 'react-router';
import { Home, MapPin, MessageCircle, Settings } from 'lucide-react';
import { getPassengers } from '../services/passengerService';

const passengers = getPassengers();
import { useTheme } from '../context/ThemeContext';

const PENDING = passengers.filter(p => p.status === 'pending').length;

const NAV = [
  { path: '/home',      label: 'Home',      Icon: Home },
  { path: '/routes',    label: 'Rotas',     Icon: MapPin,         badge: PENDING },
  { path: '/whatsapp',  label: 'WhatsApp',  Icon: MessageCircle },
  { path: '/settings',  label: 'Settings',  Icon: Settings },
];

export function BottomNav() {
  const navigate          = useNavigate();
  const { pathname }      = useLocation();
  const { isDark }        = useTheme();

  const navBg     = isDark ? '#0A0D12' : '#212529';
  const navBorder = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)';

  return (
    <nav
      role="navigation"
      aria-label="Navegação principal"
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'stretch',
        background: navBg,
        borderTop: `1px solid ${navBorder}`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        transition: 'background 0.3s ease',
      }}
    >
      {NAV.map(({ path, label, Icon, badge }) => {
        const active = pathname === path || (path !== '/home' && pathname.startsWith(path));
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              paddingTop: 10,
              paddingBottom: 10,
              minHeight: 62,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: active ? '#FFC107' : 'rgba(255,255,255,0.38)',
              position: 'relative',
              transition: 'color 0.2s',
              fontFamily: 'Inter, sans-serif',
            }}
            onTouchStart={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)'; }}
            onTouchEnd={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          >
            {/* Active indicator bar */}
            {active && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 32,
                  height: 3,
                  background: '#FFC107',
                  borderRadius: '0 0 6px 6px',
                }}
              />
            )}

            {/* Active background pill */}
            {active && (
              <span
                style={{
                  position: 'absolute',
                  top: 8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 44,
                  height: 32,
                  background: 'rgba(255,193,7,0.1)',
                  borderRadius: 10,
                }}
              />
            )}

            {/* Icon + badge */}
            <span style={{ position: 'relative', display: 'flex', zIndex: 1 }}>
              <Icon size={22} strokeWidth={active ? 2.3 : 1.8} />
              {badge && badge > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -8,
                    minWidth: 17,
                    height: 17,
                    background: '#FD7E14',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 800,
                    borderRadius: 9,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    border: `2px solid ${navBg}`,
                  }}
                >
                  {badge}
                </span>
              )}
            </span>

            <span
              style={{
                fontSize: 9,
                fontWeight: active ? 700 : 500,
                letterSpacing: 0.3,
                zIndex: 1,
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
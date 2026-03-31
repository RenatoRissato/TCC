import { useState, useCallback, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { BottomNav } from './BottomNav';
import { SideNav } from './SideNav';
import { useColors } from '../context/ThemeContext';
import { useBreakpoints } from '../hooks/useWindowSize';
import { NavDrawerContext } from '../context/NavDrawerContext';

/**
 * Authenticated shell — fully responsive (Bootstrap 5 breakpoints):
 *
 *  ≥ 992 px (lg+)  →  Fixed SideNav (264 px) + fluid scrollable <main>
 *  < 992 px         →  Full-width layout + BottomNav + offcanvas drawer
 *
 * SCROLL ARCHITECTURE
 * ─────────────────────────────────────────────────────────────────────────────
 * <main> is a plain block container (no display:flex) with overflow-y:auto.
 * Screen headers are standard block elements — no position:sticky/fixed.
 * The entire screen (header + cards) scrolls together as one unit.
 *
 * Sidebar never scrolls (height:100dvh on the <aside>).
 * BottomNav never scrolls (flexShrink:0 at the bottom of the column).
 * ────────────────────────────────────────────────────────────────────────────
 */
export function AppLayout() {
  const c                    = useColors();
  const { isLg }             = useBreakpoints();
  const { pathname }         = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer  = useCallback(() => setDrawerOpen(true),  []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Close drawer automatically on route change
  useEffect(() => { closeDrawer(); }, [pathname, closeDrawer]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (!isLg && drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen, isLg]);

  return (
    <NavDrawerContext.Provider value={{ openDrawer }}>
      {/*
        Root flex-row: SideNav (fixed width) + column (main + BottomNav)
        height:100dvh + overflow:hidden keeps everything inside the viewport.
      */}
      <div style={{
        display: 'flex',
        width: '100%',
        height: '100dvh',
        minHeight: '100vh',
        overflow: 'hidden',
        background: c.bg,
        fontFamily: 'Inter, -apple-system, sans-serif',
        transition: 'background 0.3s',
      }}>

        {/* ── Persistent sidebar (≥ 992 px) ─────────────────────────── */}
        {isLg && <SideNav />}

        {/* ── Offcanvas drawer (< 992 px) ────────────────────────────── */}
        {!isLg && (
          <>
            {/* Backdrop */}
            <div
              onClick={closeDrawer}
              aria-hidden="true"
              style={{
                position: 'fixed', inset: 0, zIndex: 100,
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(3px)',
                WebkitBackdropFilter: 'blur(3px)',
                opacity: drawerOpen ? 1 : 0,
                pointerEvents: drawerOpen ? 'auto' : 'none',
                transition: 'opacity 0.25s ease',
              }}
            />

            {/* Drawer panel — slides in from the left */}
            <div
              role="dialog"
              aria-label="Menu de navegação"
              aria-modal="true"
              style={{
                position: 'fixed',
                top: 0, bottom: 0, left: 0,
                width: 280,
                zIndex: 101,
                overflowY: 'auto',
                overflowX: 'hidden',
                WebkitOverflowScrolling: 'touch',
                transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: drawerOpen ? '8px 0 32px rgba(0,0,0,0.5)' : 'none',
              }}
            >
              <SideNav onClose={closeDrawer} />
            </div>
          </>
        )}

        {/* ── Right column: scrollable content + bottom nav ──────────── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}>
          {/*
            <main> is a plain block with overflow-y:auto.
            NO display:flex here — that would break natural block flow.
          */}
          <main style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
          }}>
            <Outlet />
          </main>

          {/* Bottom nav — only below lg breakpoint */}
          {!isLg && <BottomNav />}
        </div>

      </div>
    </NavDrawerContext.Provider>
  );
}
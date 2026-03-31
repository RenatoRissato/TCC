import { CSSProperties, ReactNode } from 'react';

/**
 * Full-screen phone-frame container.
 * Used by auth screens (Login, Register) that don't share AppLayout.
 */
export function PageShell({
  children,
  bg = '#F0F2F5',
  style,
}: {
  children: ReactNode;
  bg?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 480,
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: bg,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 0 80px rgba(0,0,0,0.45)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Scrollable inner area — flex-grows to fill remaining PageShell height */
export function ScrollArea({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

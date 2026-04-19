import { ReactNode } from 'react';

type AccentColor = 'pending' | 'whatsapp' | 'success' | 'warning' | 'danger' | 'info' | 'night';

interface SectionCardProps {
  title?: string;
  accent?: AccentColor;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

const ACCENT_CLASS: Record<AccentColor, string> = {
  pending: 'bg-pending',
  whatsapp: 'bg-whatsapp',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  night: 'bg-night',
};

export function SectionCard({ title, accent = 'pending', action, children, className = '' }: SectionCardProps) {
  return (
    <section className={`bg-panel border border-panel-border rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.5)] ${className}`}>
      {title && (
        <header className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-1 h-4 rounded-sm ${ACCENT_CLASS[accent]}`} />
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">{title}</h2>
          </div>
          {action}
        </header>
      )}
      <div className="p-4 pt-2">{children}</div>
    </section>
  );
}

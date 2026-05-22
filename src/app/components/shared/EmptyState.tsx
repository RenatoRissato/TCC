import { ComponentType, ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ComponentType<{ size?: number; className?: string; strokeWidth?: number; style?: React.CSSProperties }>;
  /** Cor de destaque do icone — default e o amarelo do sistema (#FFC107). */
  iconColor?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Empty state padrao do app. Em vez de um icone cinza solto, embrulha o
 * icone num "halo" colorido com glow radial — comunica "vazio mas vivo".
 *
 * - role="status" + aria-live="polite": leitores de tela anunciam o estado
 *   quando a lista vira de "tem itens" para "vazia".
 * - sr-fade-up: entra suave em vez de aparecer estatico.
 * - Respeita prefers-reduced-motion via regra global.
 */
export function EmptyState({
  icon: Icon,
  iconColor = '#FFC107',
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`sr-fade-up flex flex-col items-center justify-center text-center py-10 px-6 ${className}`}
    >
      {Icon && (
        <div
          className="relative flex items-center justify-center w-20 h-20 rounded-full mb-5"
          style={{ background: `${iconColor}14`, border: `1.5px solid ${iconColor}33` }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full"
            style={{ background: `radial-gradient(circle, ${iconColor}22 0%, transparent 70%)` }}
          />
          <Icon size={30} strokeWidth={1.8} style={{ color: iconColor, position: 'relative' }} />
        </div>
      )}
      <h3 className="text-base font-bold text-ink m-0 mb-1.5 tracking-tight">{title}</h3>
      {description && (
        <p className="text-[13px] text-ink-soft m-0 leading-relaxed max-w-xs">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

import { ComponentType, ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6 gap-3">
      {Icon && <Icon size={48} className="text-ink-muted" />}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="text-sm text-ink-soft max-w-xs">{description}</p>}
      {action}
    </div>
  );
}

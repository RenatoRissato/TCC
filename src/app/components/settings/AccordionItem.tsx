import { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionItemProps {
  id: string;
  open: boolean;
  onToggle: (id: string) => void;
  icon: ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  accent?: string;
  badge?: string;
  children: ReactNode;
}

export function AccordionItem({
  id, open, onToggle, icon, iconBg, title, subtitle,
  accent = '#FFC107', badge, children,
}: AccordionItemProps) {
  return (
    <div
      className="bg-panel rounded-[20px] overflow-hidden transition-[border-color,box-shadow] duration-200"
      style={{
        border: open ? `2px solid ${accent}38` : '1.5px solid var(--app-border)',
        boxShadow: open ? `0 4px 24px ${accent}18` : '0 2px 12px rgba(0,0,0,0.07)',
      }}
    >
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-3.5 px-[18px] py-4 bg-transparent border-0 cursor-pointer min-h-[68px] font-sans text-left"
      >
        <div
          className="relative w-[46px] h-[46px] rounded-[15px] flex items-center justify-center shrink-0 transition-colors"
          style={{ background: open ? `${accent}22` : iconBg }}
        >
          {icon}
          {badge && (
            <span className="absolute -top-1 -right-1 bg-danger text-white text-[9px] font-extrabold px-[5px] py-[2px] rounded-lg leading-none">
              {badge}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-ink m-0 leading-tight">{title}</p>
          <p className="text-xs text-ink-soft m-0 mt-0.5 font-normal">{subtitle}</p>
        </div>
        {open && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: accent }} />}
        <ChevronDown
          size={20}
          strokeWidth={2.2}
          className="shrink-0 transition-transform duration-[250ms]"
          style={{ color: open ? accent : 'var(--ink-muted)', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      {open && <div className="h-px bg-divider mx-[18px]" />}
      {open && <div className="slide-up px-[18px] pt-5 pb-[22px]">{children}</div>}
    </div>
  );
}

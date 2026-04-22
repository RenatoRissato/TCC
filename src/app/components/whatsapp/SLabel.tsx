import { ReactNode } from 'react';

export function SLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-extrabold tracking-[0.11em] uppercase m-0 mb-2.5 flex items-center gap-2 text-ink-soft">
      <span className="w-[3px] h-[13px] bg-whatsapp rounded-sm inline-block" />
      {children}
    </p>
  );
}

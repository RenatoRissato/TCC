import React, { ReactNode } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '../ui/sheet';
import { useBreakpoints } from '../../hooks/useWindowSize';

interface BottomSheetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  hideHandle?: boolean;
  maxWidth?: number;
  children: ReactNode;
}

export function BottomSheetModal({
  open, onOpenChange, title, description,
  hideHandle, maxWidth = 560, children,
}: BottomSheetModalProps) {
  const { isMd } = useBreakpoints();

  const desktopStyle: React.CSSProperties = isMd ? {
    maxWidth,
    maxHeight: '90dvh',
    top: '50%',
    bottom: 'auto',
    left: '50%',
    right: 'auto',
    transform: 'translate(-50%, -50%)',
    borderRadius: 28,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  } : { maxWidth };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={[
          'p-0 border-0 bg-panel text-ink',
          isMd
            ? 'shadow-[0_8px_48px_rgba(0,0,0,0.35)]'
            : 'rounded-t-[28px] shadow-[0_-12px_40px_rgba(0,0,0,0.25)] max-h-[92dvh] overflow-hidden flex flex-col',
          '[&>button]:hidden',
        ].join(' ')}
        style={desktopStyle}
      >
        {title ? (
          <SheetTitle className="sr-only">{title}</SheetTitle>
        ) : (
          <SheetTitle className="sr-only">Modal</SheetTitle>
        )}
        {description && <SheetDescription className="sr-only">{description}</SheetDescription>}
        {!hideHandle && !isMd && (
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <span className="w-10 h-1 rounded-full bg-app-border" />
          </div>
        )}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

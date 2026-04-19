import { ReactNode } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '../ui/sheet';

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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={[
          'p-0 border-0 bg-panel text-ink',
          'rounded-t-[28px] shadow-[0_-12px_40px_rgba(0,0,0,0.25)]',
          'max-h-[92dvh] overflow-hidden mx-auto',
          'sm:rounded-[28px] sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:inset-x-auto',
          '[&>button]:hidden',
        ].join(' ')}
        style={{ maxWidth }}
      >
        {title ? (
          <SheetTitle className="sr-only">{title}</SheetTitle>
        ) : (
          <SheetTitle className="sr-only">Modal</SheetTitle>
        )}
        {description && <SheetDescription className="sr-only">{description}</SheetDescription>}
        {!hideHandle && (
          <div className="flex justify-center pt-3 pb-1">
            <span className="w-10 h-1 rounded-full bg-app-border" />
          </div>
        )}
        <div className="overflow-y-auto max-h-[88dvh]">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

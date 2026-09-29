import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface DialogProps {
  isOpen: boolean;
  /** Called when the user presses Escape. Omit to make the dialog non-dismissible. */
  onDismiss?: () => void;
  labelledBy: string;
  children: ReactNode;
  className?: string;
}

/** Accessible modal built on the native <dialog> element (focus trap + Escape handling). */
export function Dialog({ isOpen, onDismiss, labelledBy, children, className }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss?.();
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line-strong bg-surface p-0 text-ink shadow-2xl',
        'open:animate-slide-up',
        className,
      )}
    >
      {isOpen && children}
    </dialog>
  );
}

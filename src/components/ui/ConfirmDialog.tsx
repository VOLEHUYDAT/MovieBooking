import type { LucideIcon } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { Dialog } from './Dialog';

interface ConfirmDialogProps {
  isOpen: boolean;
  icon: LucideIcon;
  tone?: 'brand' | 'danger' | 'warning';
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

const TONE_STYLES = {
  brand: 'bg-brand-soft text-brand',
  danger: 'bg-red-500/15 text-red-400',
  warning: 'bg-amber-500/15 text-amber-400',
};

export function ConfirmDialog({
  isOpen,
  icon: Icon,
  tone = 'brand',
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();

  return (
    <Dialog isOpen={isOpen} onDismiss={onCancel} labelledBy={titleId}>
      <div className="p-6 text-center">
        <div className={cn('mx-auto mb-4 grid size-14 place-items-center rounded-full', TONE_STYLES[tone])}>
          <Icon className="size-7" aria-hidden />
        </div>
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        <div className="mt-2 text-sm leading-relaxed text-ink-muted">{description}</div>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-line p-4 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel ?? 'Đóng'}
          </Button>
        )}
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} autoFocus>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}

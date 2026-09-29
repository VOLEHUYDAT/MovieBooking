import { Timer } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatCountdown } from '@/lib/format';

const WARNING_THRESHOLD_MS = 2 * 60_000;

export function HoldTimer({ remainingMs, className }: { remainingMs: number; className?: string }) {
  const isUrgent = remainingMs <= WARNING_THRESHOLD_MS;

  return (
    <div
      role="timer"
      aria-live={isUrgent ? 'polite' : 'off'}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1',
        isUrgent ? 'animate-pulse bg-red-500/10 text-red-300 ring-red-500/30' : 'bg-amber-500/10 text-amber-200 ring-amber-500/25',
        className,
      )}
    >
      <Timer className="size-4 shrink-0" aria-hidden />
      <span>Giữ ghế trong</span>
      <span className="font-mono font-bold tabular-nums">{formatCountdown(remainingMs)}</span>
    </div>
  );
}

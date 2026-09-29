import { cn } from '@/lib/cn';
import { getPasswordStrength, PASSWORD_STRENGTH_LABELS } from '@/lib/auth';

const BAR_COLORS = ['', 'bg-red-500', 'bg-amber-500', 'bg-sky-500', 'bg-emerald-500'];

export function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  if (strength === 0) return null;

  return (
    <div className="mt-2 flex items-center gap-3" aria-live="polite">
      <div className="flex flex-1 gap-1" aria-hidden>
        {[1, 2, 3, 4].map((level) => (
          <span key={level} className={cn('h-1 flex-1 rounded-full', level <= strength ? BAR_COLORS[strength] : 'bg-white/10')} />
        ))}
      </div>
      <span className="w-20 text-right text-xs text-ink-muted">Độ mạnh: {PASSWORD_STRENGTH_LABELS[strength]}</span>
    </div>
  );
}

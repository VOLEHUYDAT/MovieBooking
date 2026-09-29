import { Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> {
  name: string;
  label: string;
  icon?: LucideIcon;
  error?: string;
  hint?: ReactNode;
  isRequired?: boolean;
  /** Renders a show/hide toggle for password inputs. */
  revealable?: boolean;
}

export function TextField({
  name,
  label,
  icon: Icon,
  error,
  hint,
  isRequired = true,
  revealable = false,
  className,
  type = 'text',
  ...inputProps
}: TextFieldProps) {
  const inputId = useId();
  const descriptionId = `${inputId}-description`;
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold">
        {label} {isRequired && <span className="text-brand">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-ink-subtle" aria-hidden />
        )}
        <input
          id={inputId}
          name={name}
          type={revealable && isRevealed ? 'text' : type}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? descriptionId : undefined}
          className={cn(
            'h-12 w-full rounded-xl border bg-surface-raised text-sm transition-colors placeholder:text-ink-subtle focus:outline-none disabled:cursor-not-allowed disabled:opacity-60',
            Icon ? 'pl-10' : 'pl-4',
            revealable ? 'pr-12' : 'pr-4',
            error ? 'border-red-500/70 focus:border-red-400' : 'border-line-strong focus:border-brand',
          )}
          {...inputProps}
        />
        {revealable && (
          <button
            type="button"
            onClick={() => setIsRevealed((value) => !value)}
            aria-label={isRevealed ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-pressed={isRevealed}
            className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-ink-subtle hover:bg-white/5 hover:text-ink"
          >
            {isRevealed ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
          </button>
        )}
      </div>
      {(error || hint) && (
        <div id={descriptionId} className={cn('mt-1.5 text-xs', error ? 'text-red-400' : 'text-ink-subtle')}>
          {error ?? hint}
        </div>
      )}
    </div>
  );
}

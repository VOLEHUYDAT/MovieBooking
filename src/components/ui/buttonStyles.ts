import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-brand text-white shadow-glow hover:brightness-110 active:brightness-95 disabled:shadow-none',
  secondary: 'bg-surface-raised text-ink ring-1 ring-line-strong hover:bg-surface-hover',
  ghost: 'text-ink-muted hover:bg-white/5 hover:text-ink',
  danger: 'bg-red-500/10 text-red-300 ring-1 ring-red-500/30 hover:bg-red-500/20',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 rounded-lg px-3 text-sm',
  md: 'h-11 gap-2 rounded-xl px-5 text-sm',
  lg: 'h-12 gap-2 rounded-xl px-6 text-base',
};

export function getButtonClassName(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(
    'inline-flex shrink-0 select-none items-center justify-center font-semibold transition-all duration-200',
    'disabled:cursor-not-allowed disabled:opacity-45 disabled:saturate-50',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  );
}

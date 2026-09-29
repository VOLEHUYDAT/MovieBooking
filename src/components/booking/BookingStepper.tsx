import { Check } from 'lucide-react';
import { Fragment } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';

export interface StepperItem {
  label: string;
  /** Link for completed steps the user may return to. */
  href?: string;
}

interface BookingStepperProps {
  steps: StepperItem[];
  currentIndex: number;
}

export function BookingStepper({ steps, currentIndex }: BookingStepperProps) {
  return (
    <nav aria-label="Tiến trình đặt vé">
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;
          const indicator = (
            <span
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ring-1 transition-colors',
                isDone && 'bg-brand text-white ring-brand',
                isCurrent && 'bg-brand-soft text-brand ring-brand',
                !isDone && !isCurrent && 'bg-surface text-ink-subtle ring-line-strong',
              )}
            >
              {isDone ? <Check className="size-4" aria-hidden /> : index + 1}
            </span>
          );
          const label = (
            <span
              className={cn(
                'hidden text-sm font-semibold md:inline',
                isCurrent ? 'text-ink' : isDone ? 'text-ink-muted' : 'text-ink-subtle',
              )}
            >
              {step.label}
            </span>
          );

          return (
            <Fragment key={step.label}>
              <li aria-current={isCurrent ? 'step' : undefined} className="flex items-center">
                {isDone && step.href ? (
                  <Link to={step.href} className="flex items-center gap-2 rounded-full hover:opacity-80" title={`Quay lại: ${step.label}`}>
                    {indicator}
                    {label}
                  </Link>
                ) : (
                  <span className="flex items-center gap-2">
                    {indicator}
                    {label}
                  </span>
                )}
                <span className="sr-only">{isDone ? '(đã xong)' : isCurrent ? '(hiện tại)' : ''}</span>
              </li>
              {index < steps.length - 1 && (
                <li aria-hidden className={cn('mx-2 h-px min-w-4 flex-1 md:mx-3', index < currentIndex ? 'bg-brand' : 'bg-line-strong')} />
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

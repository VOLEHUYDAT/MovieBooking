import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatCurrency } from '@/lib/format';
import { useBookingFlow } from '@/pages/booking/bookingFlowContext';
import { Button } from '../ui/Button';
import { BookingSummary } from './BookingSummary';

export interface StepAction {
  label: string;
  onClick?: () => void;
  /** Associates the button with a form so it submits that form. */
  formId?: string;
  disabled?: boolean;
  isLoading?: boolean;
  /** Short explanation shown when the action is disabled. */
  hint?: string;
}

interface BookingStepShellProps {
  title: string;
  description?: string;
  headerAside?: ReactNode;
  action: StepAction;
  children: ReactNode;
}

function ActionButton({ action, size }: { action: StepAction; size: 'md' | 'lg' }) {
  return (
    <Button
      type={action.formId ? 'submit' : 'button'}
      form={action.formId}
      onClick={action.onClick}
      disabled={action.disabled}
      isLoading={action.isLoading}
      size={size}
      fullWidth
    >
      {action.label}
      {!action.isLoading && <ArrowRight className="size-4.5" aria-hidden />}
    </Button>
  );
}

/** Two-column booking step: content on the left, sticky order summary + CTA on the right (bottom bar on mobile). */
export function BookingStepShell({ title, description, headerAside, action, children }: BookingStepShellProps) {
  const flow = useBookingFlow();

  return (
    <div className="grid gap-8 pb-32 lg:grid-cols-[1fr_360px] lg:pb-0">
      <section className="min-w-0 animate-fade-in" aria-labelledby="booking-step-title">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 id="booking-step-title" className="text-2xl font-extrabold tracking-tight">
              {title}
            </h1>
            {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
          </div>
          {headerAside}
        </div>
        {children}
      </section>

      <aside className="hidden lg:block" aria-label="Tóm tắt đơn hàng">
        <div className="sticky top-24 rounded-2xl border border-line bg-surface p-5 shadow-xl">
          <BookingSummary {...flow} />
          <div className="mt-5">
            <ActionButton action={action} size="lg" />
            {action.disabled && action.hint && <p className="mt-2 text-center text-xs text-ink-subtle">{action.hint}</p>}
          </div>
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-ink-muted">
              {flow.selectedSeats.length > 0
                ? `Ghế: ${flow.selectedSeats.map((seat) => seat.label).join(', ')}`
                : (action.hint ?? 'Chưa chọn ghế')}
            </p>
            <p className="text-lg font-black tabular-nums">{formatCurrency(flow.priceBreakdown.total)}</p>
          </div>
          <div className="w-44 shrink-0">
            <ActionButton action={action} size="md" />
          </div>
        </div>
      </div>
    </div>
  );
}

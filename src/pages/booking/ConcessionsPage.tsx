import { CupSoda, GlassWater, Popcorn, Sandwich, Sparkles, type LucideIcon } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router';
import { BookingStepShell } from '@/components/booking/BookingStepShell';
import { QuantityStepper } from '@/components/booking/QuantityStepper';
import { CONCESSIONS, MAX_CONCESSION_QUANTITY } from '@/data/concessions';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { useBookingDraftStore } from '@/store/bookingDraftStore';
import type { ConcessionCategory, ConcessionIcon } from '@/types/domain';
import { useBookingFlow } from './bookingFlowContext';

const CATEGORY_SECTIONS: { category: ConcessionCategory; title: string }[] = [
  { category: 'combo', title: 'Combo tiết kiệm' },
  { category: 'snack', title: 'Bắp & đồ ăn nhẹ' },
  { category: 'drink', title: 'Nước uống' },
];

const ICONS: Record<ConcessionIcon, { icon: LucideIcon; className: string }> = {
  combo: { icon: Sparkles, className: 'from-rose-500/30 to-orange-500/20 text-rose-300' },
  popcorn: { icon: Popcorn, className: 'from-amber-500/30 to-yellow-500/10 text-amber-300' },
  snack: { icon: Sandwich, className: 'from-orange-500/30 to-red-500/10 text-orange-300' },
  drink: { icon: CupSoda, className: 'from-sky-500/30 to-indigo-500/10 text-sky-300' },
  water: { icon: GlassWater, className: 'from-cyan-500/30 to-teal-500/10 text-cyan-300' },
};

export function ConcessionsPage() {
  const { selectedSeats, concessionQuantities, holdRemainingMs, basePath } = useBookingFlow();
  const navigate = useNavigate();
  const setConcessionQuantity = useBookingDraftStore((state) => state.setConcessionQuantity);

  if (selectedSeats.length === 0 || holdRemainingMs === null) {
    return <Navigate to={`${basePath}/seats`} replace />;
  }

  const hasItems = Object.keys(concessionQuantities).length > 0;

  return (
    <BookingStepShell
      title="Thêm bắp nước"
      description="Đặt trước để nhận tại quầy, không cần xếp hàng. Bạn có thể bỏ qua bước này."
      action={{ label: hasItems ? 'Tiếp tục' : 'Bỏ qua', onClick: () => navigate(`${basePath}/checkout`) }}
    >
      <div className="space-y-8">
        {CATEGORY_SECTIONS.map(({ category, title }) => (
          <section key={category} aria-labelledby={`concession-${category}`}>
            <h2 id={`concession-${category}`} className="mb-3 text-sm font-bold tracking-wide text-ink-muted uppercase">
              {title}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {CONCESSIONS.filter((item) => item.category === category).map((item) => {
                const quantity = concessionQuantities[item.id] ?? 0;
                const { icon: Icon, className } = ICONS[item.icon];
                return (
                  <article
                    key={item.id}
                    className={cn(
                      'flex items-center gap-4 rounded-2xl border bg-surface p-4 transition-colors',
                      quantity > 0 ? 'border-brand/50 bg-brand-soft/40' : 'border-line',
                    )}
                  >
                    <div className={cn('grid size-16 shrink-0 place-items-center rounded-xl bg-gradient-to-br', className)}>
                      <Icon className="size-8" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold">{item.name}</h3>
                        {item.badge && (
                          <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{item.description}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="font-bold text-brand tabular-nums">{formatCurrency(item.price)}</span>
                        <QuantityStepper
                          value={quantity}
                          max={MAX_CONCESSION_QUANTITY}
                          itemName={item.name}
                          onChange={(value) => setConcessionQuantity(item.id, value)}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </BookingStepShell>
  );
}

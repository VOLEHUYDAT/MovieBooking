import { X } from 'lucide-react';
import { memo, useEffect, useRef, type CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { getSeatPrice } from '@/services/pricingService';
import type { Seat, SeatMap as SeatMapModel, SeatType, Showtime } from '@/types/domain';

const SEAT_TYPE_LABELS: Record<SeatType, string> = {
  standard: 'Thường',
  vip: 'VIP',
  couple: 'Đôi',
};

const AVAILABLE_SEAT_STYLES: Record<SeatType, string> = {
  standard: 'bg-seat-standard text-ink-muted ring-white/10 hover:bg-white/20 hover:text-ink',
  vip: 'bg-seat-vip text-amber-200 ring-amber-400/40 hover:bg-amber-500/35',
  couple: 'bg-seat-couple text-pink-200 ring-pink-400/40 hover:bg-pink-500/35',
};

interface SeatMapProps {
  seatMap: SeatMapModel;
  showtime: Pick<Showtime, 'format' | 'startsAt'>;
  selectedSeatIds: ReadonlySet<string>;
  highlightedSeatIds: ReadonlySet<string>;
  onToggleSeat: (seat: Seat) => void;
}

function SeatMapComponent({ seatMap, showtime, selectedSeatIds, highlightedSeatIds, onToggleSeat }: SeatMapProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // On narrow screens the map scrolls horizontally: start centered on the middle block.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
  }, []);

  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${seatMap.columnCount}, var(--seat-size))`,
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
      <div className="mx-auto mb-10 max-w-lg" aria-hidden>
        <div className="h-2 rounded-[50%] bg-gradient-to-r from-transparent via-brand to-transparent shadow-[0_12px_40px_4px_rgb(244_63_94/0.45)]" />
        <p className="mt-3 text-center text-[11px] font-semibold tracking-[0.4em] text-ink-subtle">MÀN HÌNH</p>
      </div>

      <div ref={scrollContainerRef} className="scrollbar-thin overflow-x-auto pb-2">
        <div
          role="group"
          aria-label="Sơ đồ ghế"
          className="mx-auto flex w-fit flex-col gap-2 [--seat-size:1.625rem] sm:[--seat-size:2rem]"
        >
          {seatMap.rows.map((row) => (
            <div key={row.label} role="group" aria-label={`Hàng ${row.label}`} className="flex items-center gap-2 sm:gap-3">
              <span className="w-4 text-center text-xs font-bold text-ink-subtle" aria-hidden>
                {row.label}
              </span>
              <div className="grid gap-1 sm:gap-1.5" style={gridStyle}>
                {row.seats.map((seat) => {
                  const isOccupied = seatMap.occupiedSeatIds.has(seat.id);
                  const isSelected = selectedSeatIds.has(seat.id);
                  const isHighlighted = highlightedSeatIds.has(seat.id);
                  const price = getSeatPrice(seat.type, showtime);
                  const stateLabel = isOccupied ? 'đã có người đặt' : isSelected ? 'đang chọn' : 'còn trống';

                  return (
                    <button
                      key={seat.id}
                      type="button"
                      disabled={isOccupied}
                      aria-pressed={isSelected}
                      aria-label={`Ghế ${seat.label}, ${SEAT_TYPE_LABELS[seat.type]}, ${formatCurrency(price)}, ${stateLabel}`}
                      title={isOccupied ? `${seat.label} · Đã đặt` : `${seat.label} · ${SEAT_TYPE_LABELS[seat.type]} · ${formatCurrency(price)}`}
                      onClick={() => onToggleSeat(seat)}
                      style={{ gridColumn: `${seat.gridColumn} / span ${seat.gridSpan}` }}
                      className={cn(
                        'relative grid h-(--seat-size) place-items-center rounded-t-lg rounded-b-sm text-[10px] font-bold ring-1 transition-all duration-150 sm:text-[11px]',
                        isOccupied && 'cursor-not-allowed bg-white/[0.04] text-white/20 ring-white/5',
                        !isOccupied && !isSelected && AVAILABLE_SEAT_STYLES[seat.type],
                        isSelected && 'animate-pop bg-gradient-brand text-white shadow-glow ring-transparent',
                        isHighlighted && 'ring-2 ring-amber-400 ring-offset-2 ring-offset-surface',
                      )}
                    >
                      {isOccupied ? <X className="size-3" aria-hidden /> : seat.number}
                    </button>
                  );
                })}
              </div>
              <span className="w-4 text-center text-xs font-bold text-ink-subtle" aria-hidden>
                {row.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <SeatLegend showtime={showtime} />
    </div>
  );
}

function SeatLegend({ showtime }: { showtime: Pick<Showtime, 'format' | 'startsAt'> }) {
  const seatTypes: SeatType[] = ['standard', 'vip', 'couple'];

  return (
    <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 border-t border-line pt-5 text-xs text-ink-muted">
      {seatTypes.map((type) => (
        <li key={type} className="flex items-center gap-2">
          <span className={cn('h-5 rounded-t-md rounded-b-sm ring-1', type === 'couple' ? 'w-9' : 'w-5', AVAILABLE_SEAT_STYLES[type])} />
          <span>
            {SEAT_TYPE_LABELS[type]} <span className="font-semibold text-ink">{formatCurrency(getSeatPrice(type, showtime))}</span>
          </span>
        </li>
      ))}
      <li className="flex items-center gap-2">
        <span className="h-5 w-5 rounded-t-md rounded-b-sm bg-gradient-brand" />
        Đang chọn
      </li>
      <li className="flex items-center gap-2">
        <span className="grid h-5 w-5 place-items-center rounded-t-md rounded-b-sm bg-white/[0.04] text-white/25 ring-1 ring-white/5">
          <X className="size-3" aria-hidden />
        </span>
        Đã đặt
      </li>
    </ul>
  );
}

export const SeatMap = memo(SeatMapComponent);

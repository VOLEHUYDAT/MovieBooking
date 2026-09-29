import { Info, RotateCcw, TriangleAlert } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { BookingStepShell } from '@/components/booking/BookingStepShell';
import { SeatMap } from '@/components/booking/SeatMap';
import { Button } from '@/components/ui/Button';
import { findStrandedSeats, MAX_SEATS_PER_BOOKING } from '@/services/seatSelectionRules';
import { useBookingDraftStore } from '@/store/bookingDraftStore';
import type { Seat } from '@/types/domain';
import { useBookingFlow } from './bookingFlowContext';

export function SeatSelectionPage() {
  const { seatMap, showtime, selectedSeats, basePath } = useBookingFlow();
  const navigate = useNavigate();
  const toggleSeat = useBookingDraftStore((state) => state.toggleSeat);
  const clearSeats = useBookingDraftStore((state) => state.clearSeats);
  const startHold = useBookingDraftStore((state) => state.startHold);

  const selectedSeatIds = useMemo(() => new Set(selectedSeats.map((seat) => seat.id)), [selectedSeats]);
  const strandedSeats = useMemo(() => findStrandedSeats(seatMap, selectedSeatIds), [seatMap, selectedSeatIds]);
  const strandedSeatIds = useMemo(() => new Set(strandedSeats.map((seat) => seat.id)), [strandedSeats]);
  const availableSeatCount = seatMap.rows.reduce(
    (count, row) => count + row.seats.filter((seat) => !seatMap.occupiedSeatIds.has(seat.id)).length,
    0,
  );

  const handleToggleSeat = useCallback(
    (seat: Seat) => {
      if (!selectedSeatIds.has(seat.id) && selectedSeatIds.size >= MAX_SEATS_PER_BOOKING) {
        toast.error(`Bạn chỉ có thể chọn tối đa ${MAX_SEATS_PER_BOOKING} ghế cho mỗi lần đặt.`);
        return;
      }
      toggleSeat(seat.id);
    },
    [selectedSeatIds, toggleSeat],
  );

  const hint =
    selectedSeats.length === 0
      ? 'Vui lòng chọn ít nhất 1 ghế'
      : strandedSeats.length > 0
        ? 'Không được để trống ghế lẻ'
        : undefined;

  return (
    <BookingStepShell
      title="Chọn ghế ngồi"
      description={`Còn ${availableSeatCount} ghế trống · Tối đa ${MAX_SEATS_PER_BOOKING} ghế mỗi lần đặt`}
      headerAside={
        selectedSeats.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearSeats}>
            <RotateCcw className="size-4" aria-hidden /> Bỏ chọn tất cả
          </Button>
        )
      }
      action={{
        label: 'Tiếp tục',
        disabled: Boolean(hint),
        hint,
        onClick: () => {
          startHold();
          navigate(`${basePath}/concessions`);
        },
      }}
    >
      <SeatMap
        seatMap={seatMap}
        showtime={showtime}
        selectedSeatIds={selectedSeatIds}
        highlightedSeatIds={strandedSeatIds}
        onToggleSeat={handleToggleSeat}
      />

      {strandedSeats.length > 0 && (
        <div role="alert" className="mt-4 flex animate-fade-in gap-3 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-200 ring-1 ring-amber-500/30">
          <TriangleAlert className="size-5 shrink-0" aria-hidden />
          <p>
            Vui lòng không để trống 1 ghế lẻ ở giữa hoặc sát lối đi:{' '}
            <strong>{strandedSeats.map((seat) => seat.label).join(', ')}</strong>. Hãy chọn thêm hoặc đổi vị trí ghế.
          </p>
        </div>
      )}

      <div className="mt-4 flex gap-3 rounded-xl bg-white/[0.03] p-4 text-xs leading-relaxed text-ink-muted ring-1 ring-line">
        <Info className="size-4 shrink-0 text-sky-300" aria-hidden />
        <p>
          Ghế đôi dành cho 2 người và được tính giá theo cặp. Sau khi bấm <strong className="text-ink">Tiếp tục</strong>, ghế
          sẽ được giữ cho bạn trong 10 phút để hoàn tất thanh toán.
        </p>
      </div>
    </BookingStepShell>
  );
}

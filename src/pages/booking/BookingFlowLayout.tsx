import { ArrowLeft, CalendarX2, TimerOff } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router';
import { BookingStepper, type StepperItem } from '@/components/booking/BookingStepper';
import { ButtonLink } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { getCinemaById } from '@/data/cinemas';
import { getMovieById } from '@/data/movies';
import { findPromotion } from '@/data/promotions';
import { useCountdown } from '@/hooks/useCountdown';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNow } from '@/hooks/useNow';
import { toDateKey } from '@/lib/date';
import { formatTime } from '@/lib/format';
import { calculateConcessionSubtotal, calculateTicketSubtotal, calculatePriceBreakdown, evaluatePromotion } from '@/services/pricingService';
import { buildSeatMap, getSeatById } from '@/services/seatMapService';
import { getShowtimeById, isShowtimeBookable } from '@/services/showtimeService';
import { useBookingDraftStore } from '@/store/bookingDraftStore';
import { selectBookedSeatIds, useBookingHistoryStore } from '@/store/bookingHistoryStore';
import type { Seat } from '@/types/domain';
import { NotFoundPage } from '../NotFoundPage';
import type { BookingFlowContext, BookingStep } from './bookingFlowContext';

const STEP_ORDER: BookingStep[] = ['seats', 'concessions', 'checkout'];

function getCurrentStep(pathname: string): BookingStep {
  return STEP_ORDER.find((step) => pathname.endsWith(`/${step}`)) ?? 'seats';
}

/**
 * Parent route for the booking wizard. Resolves the showtime, owns the seat hold timer and
 * exposes derived booking data to each step through the outlet context.
 */
export function BookingFlowLayout() {
  const { showtimeId = '' } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const now = useNow(15_000);

  const showtime = useMemo(() => getShowtimeById(showtimeId), [showtimeId]);
  const movie = showtime ? getMovieById(showtime.movieId) : undefined;
  const cinema = showtime ? getCinemaById(showtime.cinemaId) : undefined;
  useDocumentTitle(movie ? `Đặt vé ${movie.title}` : 'Đặt vé');

  const draftShowtimeId = useBookingDraftStore((state) => state.showtimeId);
  const selectedSeatIds = useBookingDraftStore((state) => state.selectedSeatIds);
  const concessionQuantities = useBookingDraftStore((state) => state.concessionQuantities);
  const promoCode = useBookingDraftStore((state) => state.promoCode);
  const holdExpiresAt = useBookingDraftStore((state) => state.holdExpiresAt);
  const completedBookingId = useBookingDraftStore((state) => state.completedBookingId);
  const startDraft = useBookingDraftStore((state) => state.startDraft);
  const clearSeats = useBookingDraftStore((state) => state.clearSeats);
  const bookings = useBookingHistoryStore((state) => state.bookings);

  const holdCountdown = useCountdown(holdExpiresAt);
  const isHoldExpired = Boolean(holdCountdown?.isExpired) && selectedSeatIds.length > 0;

  useEffect(() => {
    if (showtime && completedBookingId === null && draftShowtimeId !== showtime.id) {
      startDraft(showtime.id);
    }
  }, [showtime, completedBookingId, draftShowtimeId, startDraft]);

  const bookedSeatIds = useMemo(() => selectBookedSeatIds(bookings, showtimeId), [bookings, showtimeId]);
  const seatMap = useMemo(() => buildSeatMap(showtimeId, bookedSeatIds), [showtimeId, bookedSeatIds]);

  const selectedSeats = useMemo(
    () =>
      selectedSeatIds
        .map(getSeatById)
        .filter((seat): seat is Seat => seat !== undefined && !seatMap.occupiedSeatIds.has(seat.id)),
    [selectedSeatIds, seatMap],
  );

  const promotion = promoCode ? (findPromotion(promoCode) ?? null) : null;

  const flowContext = useMemo<BookingFlowContext | null>(() => {
    if (!showtime || !movie || !cinema) return null;
    const ticketSubtotal = calculateTicketSubtotal(selectedSeats, showtime);
    const concessionSubtotal = calculateConcessionSubtotal(concessionQuantities);
    return {
      movie,
      cinema,
      showtime,
      seatMap,
      selectedSeats,
      concessionQuantities,
      promotion,
      promotionEvaluation: promotion ? evaluatePromotion(promotion, { ticketSubtotal, concessionSubtotal }) : null,
      priceBreakdown: calculatePriceBreakdown({ seats: selectedSeats, showtime, concessionQuantities, promotion }),
      holdRemainingMs: holdCountdown && selectedSeats.length > 0 ? holdCountdown.remainingMs : null,
      basePath: `/booking/${showtime.id}`,
    };
  }, [showtime, movie, cinema, seatMap, selectedSeats, concessionQuantities, promotion, holdCountdown]);

  if (completedBookingId) {
    return <Navigate to={`/tickets/${completedBookingId}`} replace state={{ justBooked: true }} />;
  }

  if (!flowContext || !showtime || !movie) {
    return <NotFoundPage title="Không tìm thấy suất chiếu" description="Suất chiếu không tồn tại hoặc đã bị hủy." />;
  }

  const movieSchedulePath = `/movies/${movie.id}?date=${toDateKey(new Date(showtime.startsAt))}#showtimes`;

  if (!isShowtimeBookable(showtime, now)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <EmptyState
          icon={CalendarX2}
          title="Suất chiếu đã đóng bán vé"
          description={`Suất ${formatTime(showtime.startsAt)} đã ngừng bán vé trực tuyến. Vui lòng chọn suất chiếu khác.`}
          action={<ButtonLink to={movieSchedulePath}>Chọn suất khác</ButtonLink>}
        />
      </div>
    );
  }

  // Wait for the effect above to align the draft with this showtime.
  if (draftShowtimeId !== showtime.id) return null;

  const currentStep = getCurrentStep(pathname);
  const steps: StepperItem[] = [
    { label: 'Chọn suất', href: movieSchedulePath },
    { label: 'Chọn ghế', href: `${flowContext.basePath}/seats` },
    { label: 'Bắp nước', href: `${flowContext.basePath}/concessions` },
    { label: 'Thanh toán' },
    { label: 'Hoàn tất' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-5">
        <Link
          to={movieSchedulePath}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden /> {movie.title}
        </Link>
        <BookingStepper steps={steps} currentIndex={STEP_ORDER.indexOf(currentStep) + 1} />
      </div>

      <Outlet context={flowContext} />

      <ConfirmDialog
        isOpen={isHoldExpired}
        icon={TimerOff}
        tone="warning"
        title="Hết thời gian giữ ghế"
        description="Ghế bạn chọn đã được mở lại cho khách khác. Vui lòng chọn lại ghế để tiếp tục đặt vé."
        confirmLabel="Chọn lại ghế"
        onConfirm={() => {
          clearSeats();
          navigate(`${flowContext.basePath}/seats`, { replace: true });
        }}
      />
    </div>
  );
}

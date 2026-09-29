import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarX2, TimerOff } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router';
import { getCinemaById } from '@shared/data/cinemas';
import { getMovieById } from '@shared/data/movies';
import { findPromotion } from '@shared/data/promotions';
import { toDateKey } from '@shared/lib/date';
import { calculateConcessionSubtotal, calculatePriceBreakdown, calculateTicketSubtotal, evaluatePromotion } from '@shared/services/pricingService';
import { buildSeatMap, getSeatById } from '@shared/services/seatMapService';
import { getShowtimeById, isShowtimeBookable } from '@shared/services/showtimeService';
import type { Seat, SeatMap } from '@shared/types/domain';
import { bookingApi, queryKeys } from '@/api/endpoints';
import { BookingStepper, type StepperItem } from '@/components/booking/BookingStepper';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/PageLoader';
import { useCountdown } from '@/hooks/useCountdown';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNow } from '@/hooks/useNow';
import { formatTime } from '@/lib/format';
import { useBookingDraftStore } from '@/store/bookingDraftStore';
import { NotFoundPage } from '../NotFoundPage';
import type { BookingFlowContext, BookingStep } from './bookingFlowContext';

const STEP_ORDER: BookingStep[] = ['seats', 'concessions', 'checkout'];
const SEAT_REFRESH_INTERVAL_MS = 15_000;

function getCurrentStep(pathname: string): BookingStep {
  return STEP_ORDER.find((step) => pathname.endsWith(`/${step}`)) ?? 'seats';
}

/**
 * Parent route for the booking wizard. Resolves the showtime, keeps seat availability in sync
 * with the server, owns the seat-hold countdown and exposes derived data to each step.
 */
export function BookingFlowLayout() {
  const { showtimeId = '' } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const now = useNow(15_000);

  const showtime = useMemo(() => getShowtimeById(showtimeId), [showtimeId]);
  const movie = showtime ? getMovieById(showtime.movieId) : undefined;
  const cinema = showtime ? getCinemaById(showtime.cinemaId) : undefined;
  useDocumentTitle(movie ? `Đặt vé ${movie.title}` : 'Đặt vé');

  const draftShowtimeId = useBookingDraftStore((state) => state.showtimeId);
  const selectedSeatIds = useBookingDraftStore((state) => state.selectedSeatIds);
  const concessionQuantities = useBookingDraftStore((state) => state.concessionQuantities);
  const promoCode = useBookingDraftStore((state) => state.promoCode);
  const hold = useBookingDraftStore((state) => state.hold);
  const completedBookingId = useBookingDraftStore((state) => state.completedBookingId);
  const startDraft = useBookingDraftStore((state) => state.startDraft);
  const setHold = useBookingDraftStore((state) => state.setHold);
  const setSelectedSeats = useBookingDraftStore((state) => state.setSelectedSeats);
  const clearSeats = useBookingDraftStore((state) => state.clearSeats);

  const availabilityQuery = useQuery({
    queryKey: queryKeys.seatAvailability(showtimeId),
    queryFn: ({ signal }) => bookingApi.seatAvailability(showtimeId, signal),
    enabled: Boolean(showtime),
    refetchInterval: SEAT_REFRESH_INTERVAL_MS,
  });
  const availability = availabilityQuery.data;

  const holdCountdown = useCountdown(hold ? Date.parse(hold.expiresAt) : null);
  const isHoldExpired = hold !== null && Boolean(holdCountdown?.isExpired);

  useEffect(() => {
    if (showtime && completedBookingId === null && draftShowtimeId !== showtime.id) {
      startDraft(showtime.id);
    }
  }, [showtime, completedBookingId, draftShowtimeId, startDraft]);

  // Resume a hold that is still active on the server (e.g. after reopening the tab).
  useEffect(() => {
    const serverHold = availability?.myHold;
    if (serverHold && draftShowtimeId === serverHold.showtimeId && hold === null && selectedSeatIds.length === 0) {
      setHold(serverHold);
      setSelectedSeats(serverHold.seatIds);
    }
  }, [availability?.myHold, draftShowtimeId, hold, selectedSeatIds.length, setHold, setSelectedSeats]);

  const seatMap = useMemo<SeatMap>(
    () => ({ ...buildSeatMap(showtimeId), occupiedSeatIds: new Set(availability?.unavailableSeatIds ?? []) }),
    [showtimeId, availability?.unavailableSeatIds],
  );

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
      hold: hold && hold.showtimeId === showtime.id ? hold : null,
      holdRemainingMs: hold && holdCountdown ? holdCountdown.remainingMs : null,
      basePath: `/booking/${showtime.id}`,
    };
  }, [showtime, movie, cinema, seatMap, selectedSeats, concessionQuantities, promotion, hold, holdCountdown]);

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

  // Wait for the draft to align with this showtime and for the first availability snapshot.
  if (draftShowtimeId !== showtime.id || availabilityQuery.isPending) return <PageLoader label="Đang tải sơ đồ ghế..." />;

  if (availabilityQuery.isError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <EmptyState
          icon={CalendarX2}
          title="Không tải được sơ đồ ghế"
          description="Kết nối tới máy chủ gặp sự cố. Vui lòng thử lại."
          action={<Button onClick={() => void availabilityQuery.refetch()}>Thử lại</Button>}
        />
      </div>
    );
  }

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
        <Link to={movieSchedulePath} className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
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
          void queryClient.invalidateQueries({ queryKey: queryKeys.seatAvailability(showtime.id) });
          navigate(`${flowContext.basePath}/seats`, { replace: true });
        }}
      />
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarPlus, CircleCheck, Printer, Ticket, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { toast } from 'sonner';
import { hasPermission } from '@shared/lib/permissions';
import { canCancelBooking, CANCELLATION_WINDOW_HOURS, getBookingTimelineStatus } from '@shared/services/bookingPolicy';
import { bookingApi, queryKeys } from '@/api/endpoints';
import { getErrorMessage, isApiError } from '@/api/httpClient';
import { TicketCard } from '@/components/ticket/TicketCard';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageLoader } from '@/components/ui/PageLoader';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNow } from '@/hooks/useNow';
import { buildCalendarEvent } from '@/lib/calendar';
import { formatCurrency } from '@/lib/format';
import { useBookingDraftStore } from '@/store/bookingDraftStore';
import { NotFoundPage } from './NotFoundPage';

function downloadTextFile(fileName: string, content: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function TicketDetailPage() {
  const { bookingId = '' } = useParams();
  const location = useLocation();
  const justBooked = (location.state as { justBooked?: boolean } | null)?.justBooked === true;
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const now = useNow();
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const completedBookingId = useBookingDraftStore((state) => state.completedBookingId);
  const resetDraft = useBookingDraftStore((state) => state.resetDraft);

  const bookingQuery = useQuery({
    queryKey: queryKeys.booking(bookingId),
    queryFn: async ({ signal }) => (await bookingApi.get(bookingId, signal)).booking,
  });
  const booking = bookingQuery.data;

  const cancelMutation = useMutation({
    mutationFn: () => bookingApi.cancel(bookingId),
    onSuccess: ({ booking: cancelled }) => {
      queryClient.setQueryData(queryKeys.booking(cancelled.id), cancelled);
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookings });
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast.success(`Đã hủy vé ${cancelled.code}. Tiền sẽ được hoàn trong 3-5 ngày làm việc.`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: () => setIsCancelDialogOpen(false),
  });

  useDocumentTitle(booking ? `Vé ${booking.code}` : 'Chi tiết vé');

  // The booking wizard hands off here after payment; clear the finished draft.
  useEffect(() => {
    if (completedBookingId !== null) resetDraft();
  }, [completedBookingId, resetDraft]);

  if (bookingQuery.isPending) return <PageLoader label="Đang tải vé..." />;

  if (!booking) {
    const isNotFound = isApiError(bookingQuery.error) && bookingQuery.error.status === 404;
    return (
      <NotFoundPage
        title={isNotFound ? 'Không tìm thấy vé' : 'Không tải được vé'}
        description={isNotFound ? 'Vé không tồn tại hoặc bạn không có quyền xem vé này.' : getErrorMessage(bookingQuery.error)}
      />
    );
  }

  const status = getBookingTimelineStatus(booking, now);
  const isOwner = booking.userId === user?.id;
  const isAdmin = !!user && hasPermission(user.role, 'booking:cancel-any');
  const isCancellable = (isOwner || isAdmin) && canCancelBooking(booking, now, { isAdmin });
  const backLink =
    user?.role === 'admin'
      ? { to: '/admin/bookings', label: 'Quản lý đặt vé' }
      : user?.role === 'staff'
        ? { to: '/staff/check-in', label: 'Soát vé' }
        : { to: '/tickets', label: 'Vé của tôi' };

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Link to={backLink.to} className="print-hidden inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> {backLink.label}
      </Link>

      {justBooked && status === 'upcoming' && (
        <div className="print-hidden mt-6 animate-slide-up text-center">
          <div className="mx-auto grid size-16 animate-pop place-items-center rounded-full bg-emerald-500/15 ring-8 ring-emerald-500/5">
            <CircleCheck className="size-9 text-emerald-400" aria-hidden />
          </div>
          <h1 className="mt-4 text-2xl font-black">Đặt vé thành công!</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Vé điện tử đã được lưu trong mục <strong className="text-ink">Vé của tôi</strong> và gửi tới{' '}
            <strong className="text-ink">{booking.customer.email}</strong>.
          </p>
        </div>
      )}
      {!justBooked && <h1 className="sr-only">Chi tiết vé {booking.code}</h1>}

      <div className="mt-6 animate-slide-up">
        <TicketCard booking={booking} status={status} />
      </div>

      <div className="print-hidden mt-6 grid gap-3 sm:grid-cols-2">
        {status === 'upcoming' && isOwner && (
          <Button
            variant="secondary"
            onClick={() => {
              downloadTextFile(`lumina-${booking.code}.ics`, buildCalendarEvent(booking), 'text/calendar;charset=utf-8');
              toast.success('Đã tải file lịch (.ics). Mở file để thêm vào lịch của bạn.');
            }}
          >
            <CalendarPlus className="size-4.5" aria-hidden /> Thêm vào lịch
          </Button>
        )}
        {status !== 'cancelled' && (
          <Button variant="secondary" onClick={() => window.print()} className={isOwner && status === 'upcoming' ? undefined : 'sm:col-span-2'}>
            <Printer className="size-4.5" aria-hidden /> In vé
          </Button>
        )}
        {isOwner && (
          <ButtonLink to="/" variant={status === 'upcoming' ? 'ghost' : 'primary'} className="sm:col-span-2">
            <Ticket className="size-4.5" aria-hidden /> Đặt thêm vé
          </ButtonLink>
        )}
      </div>

      {status === 'upcoming' && booking.checkedInAt === null && (isOwner || isAdmin) && (
        <div className="print-hidden mt-8 rounded-2xl border border-line p-4 text-sm">
          {isCancellable ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-ink-muted">
                {isAdmin && !isOwner
                  ? 'Quản trị viên có thể hủy vé này đến trước giờ chiếu.'
                  : `Có thể hủy vé và hoàn tiền trước giờ chiếu ${CANCELLATION_WINDOW_HOURS} tiếng.`}
              </p>
              <Button variant="danger" size="sm" onClick={() => setIsCancelDialogOpen(true)}>
                <XCircle className="size-4" aria-hidden /> Hủy vé
              </Button>
            </div>
          ) : (
            <p className="text-ink-muted">
              Đã quá thời hạn hủy vé trực tuyến ({CANCELLATION_WINDOW_HOURS} tiếng trước giờ chiếu). Vui lòng liên hệ quầy vé
              nếu cần hỗ trợ.
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={isCancelDialogOpen}
        icon={XCircle}
        tone="danger"
        title="Hủy vé này?"
        description={
          <>
            Vé <strong className="text-ink">{booking.code}</strong> sẽ bị hủy và{' '}
            <strong className="text-ink">{formatCurrency(booking.pricing.total)}</strong> được hoàn về phương thức thanh
            toán ban đầu trong 3-5 ngày làm việc. Thao tác này không thể hoàn tác.
          </>
        }
        confirmLabel={cancelMutation.isPending ? 'Đang hủy...' : 'Xác nhận hủy vé'}
        cancelLabel="Giữ vé"
        onCancel={() => setIsCancelDialogOpen(false)}
        onConfirm={() => {
          if (!cancelMutation.isPending) cancelMutation.mutate();
        }}
      />
    </div>
  );
}

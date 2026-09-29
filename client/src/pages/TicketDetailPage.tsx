import { ArrowLeft, CalendarPlus, CircleCheck, Printer, Ticket, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { toast } from 'sonner';
import { TicketCard } from '@/components/ticket/TicketCard';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNow } from '@/hooks/useNow';
import { formatCurrency } from '@/lib/format';
import {
  buildCalendarEvent,
  canCancelBooking,
  CANCELLATION_WINDOW_HOURS,
  getBookingTimelineStatus,
} from '@/services/bookingService';
import { useBookingDraftStore } from '@/store/bookingDraftStore';
import { useBookingHistoryStore } from '@/store/bookingHistoryStore';
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
  const booking = useBookingHistoryStore((state) => state.bookings.find((item) => item.id === bookingId));
  const cancelBooking = useBookingHistoryStore((state) => state.cancelBooking);
  const completedBookingId = useBookingDraftStore((state) => state.completedBookingId);
  const resetDraft = useBookingDraftStore((state) => state.resetDraft);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const now = useNow();
  useDocumentTitle(booking ? `Vé ${booking.code}` : 'Không tìm thấy vé');

  // The booking wizard hands off here after payment; clear the finished draft.
  useEffect(() => {
    if (completedBookingId !== null) resetDraft();
  }, [completedBookingId, resetDraft]);

  if (!booking) {
    return <NotFoundPage title="Không tìm thấy vé" description="Vé không tồn tại hoặc đã bị xóa khỏi thiết bị này." />;
  }

  const status = getBookingTimelineStatus(booking, now);
  const isCancellable = canCancelBooking(booking, now);

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Link to="/tickets" className="print-hidden inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Vé của tôi
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
        {status === 'upcoming' && (
          <>
            <Button
              variant="secondary"
              onClick={() => {
                downloadTextFile(`lumina-${booking.code}.ics`, buildCalendarEvent(booking), 'text/calendar;charset=utf-8');
                toast.success('Đã tải file lịch (.ics). Mở file để thêm vào lịch của bạn.');
              }}
            >
              <CalendarPlus className="size-4.5" aria-hidden /> Thêm vào lịch
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="size-4.5" aria-hidden /> In vé
            </Button>
          </>
        )}
        <ButtonLink to="/" variant={status === 'upcoming' ? 'ghost' : 'primary'} className="sm:col-span-2">
          <Ticket className="size-4.5" aria-hidden /> Đặt thêm vé
        </ButtonLink>
      </div>

      {status === 'upcoming' && (
        <div className="print-hidden mt-8 rounded-2xl border border-line p-4 text-sm">
          {isCancellable ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-ink-muted">
                Có thể hủy vé và hoàn tiền trước giờ chiếu {CANCELLATION_WINDOW_HOURS} tiếng.
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
        confirmLabel="Xác nhận hủy vé"
        cancelLabel="Giữ vé"
        onCancel={() => setIsCancelDialogOpen(false)}
        onConfirm={() => {
          if (!canCancelBooking(booking)) {
            toast.error('Đã quá thời hạn hủy vé trực tuyến.');
          } else {
            cancelBooking(booking.id);
            toast.success(`Đã hủy vé ${booking.code}. Tiền sẽ được hoàn trong 3-5 ngày làm việc.`);
          }
          setIsCancelDialogOpen(false);
        }}
      />
    </div>
  );
}

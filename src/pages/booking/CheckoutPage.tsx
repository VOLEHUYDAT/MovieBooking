import { CreditCard, LoaderCircle, Mail, Phone, QrCode, ShieldCheck, Tag, TriangleAlert, User, Wallet, X, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react';
import { Navigate } from 'react-router';
import { toast } from 'sonner';
import { BookingStepShell } from '@/components/booking/BookingStepShell';
import { AgeRatingBadge } from '@/components/ui/Badges';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { AGE_RATING_DESCRIPTIONS } from '@/data/ageRatings';
import { PAYMENT_METHODS } from '@/data/paymentMethods';
import { findPromotion, PROMOTIONS } from '@/data/promotions';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { validateCustomerInfo, type CustomerInfoErrors } from '@/lib/validation';
import { createBooking } from '@/services/bookingService';
import { evaluatePromotion } from '@/services/pricingService';
import { isShowtimeBookable } from '@/services/showtimeService';
import { useBookingDraftStore } from '@/store/bookingDraftStore';
import { useBookingHistoryStore } from '@/store/bookingHistoryStore';
import type { CustomerInfo, PaymentMethod } from '@/types/domain';
import { useBookingFlow } from './bookingFlowContext';

const CHECKOUT_FORM_ID = 'checkout-form';
const PAYMENT_PROCESSING_DELAY_MS = 1_800;
const CUSTOMER_FIELDS: (keyof CustomerInfo)[] = ['fullName', 'phone', 'email'];

const PAYMENT_ICONS: Record<PaymentMethod, LucideIcon> = {
  card: CreditCard,
  'e-wallet': Wallet,
  'bank-transfer': QrCode,
};

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  name: keyof CustomerInfo;
  label: string;
  icon: LucideIcon;
  error?: string;
}

function TextField({ name, label, icon: Icon, error, className, ...inputProps }: TextFieldProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold">
        {label} <span className="text-brand">*</span>
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-ink-subtle" aria-hidden />
        <input
          id={inputId}
          name={name}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'h-12 w-full rounded-xl border bg-surface-raised pr-4 pl-10 text-sm transition-colors placeholder:text-ink-subtle focus:outline-none',
            error ? 'border-red-500/70 focus:border-red-400' : 'border-line-strong focus:border-brand',
          )}
          {...inputProps}
        />
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function CheckoutPage() {
  const flow = useBookingFlow();
  const { movie, cinema, showtime, selectedSeats, concessionQuantities, priceBreakdown, promotion, promotionEvaluation, holdRemainingMs, basePath } = flow;

  const lastCustomer = useBookingHistoryStore((state) => state.lastCustomer);
  const addBooking = useBookingHistoryStore((state) => state.addBooking);
  const setPromoCode = useBookingDraftStore((state) => state.setPromoCode);
  const completeDraft = useBookingDraftStore((state) => state.completeDraft);

  const [customer, setCustomer] = useState<CustomerInfo>(() => lastCustomer ?? { fullName: '', phone: '', email: '' });
  const [touchedFields, setTouchedFields] = useState<Partial<Record<keyof CustomerInfo, boolean>>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('e-wallet');
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const paymentTimerRef = useRef<number | undefined>(undefined);
  const processingTitleId = useId();

  useEffect(() => () => window.clearTimeout(paymentTimerRef.current), []);

  if (selectedSeats.length === 0 || holdRemainingMs === null) {
    return <Navigate to={`${basePath}/seats`} replace />;
  }

  const errors = validateCustomerInfo(customer);
  const visibleErrors: CustomerInfoErrors = Object.fromEntries(
    CUSTOMER_FIELDS.filter((field) => (isSubmitted || touchedFields[field]) && errors[field]).map((field) => [field, errors[field]]),
  );
  const isAgeRestricted = movie.ageRating === 'T13' || movie.ageRating === 'T16' || movie.ageRating === 'T18';

  const updateCustomer = (field: keyof CustomerInfo, value: string) => setCustomer((current) => ({ ...current, [field]: value }));
  const markTouched = (field: keyof CustomerInfo) => setTouchedFields((current) => ({ ...current, [field]: true }));

  const applyPromoCode = (code: string) => {
    const candidate = findPromotion(code);
    if (!candidate) {
      setPromoError('Mã khuyến mãi không tồn tại hoặc đã hết hạn');
      return;
    }
    const evaluation = evaluatePromotion(candidate, {
      ticketSubtotal: priceBreakdown.ticketSubtotal,
      concessionSubtotal: priceBreakdown.concessionSubtotal,
    });
    if (!evaluation.isValid) {
      setPromoError(evaluation.reason);
      return;
    }
    setPromoCode(candidate.code);
    setPromoInput('');
    setPromoError(null);
    toast.success(`Đã áp dụng mã ${candidate.code}: giảm ${formatCurrency(evaluation.discount)}`);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isProcessing) return;
    setIsSubmitted(true);

    const firstInvalidField = CUSTOMER_FIELDS.find((field) => errors[field]);
    if (firstInvalidField) {
      event.currentTarget.querySelector<HTMLInputElement>(`[name="${firstInvalidField}"]`)?.focus();
      toast.error('Vui lòng kiểm tra lại thông tin liên hệ');
      return;
    }
    if (!hasAcceptedTerms) {
      toast.error('Vui lòng đồng ý với điều khoản đặt vé');
      return;
    }
    if (!isShowtimeBookable(showtime)) {
      toast.error('Suất chiếu đã đóng bán vé trực tuyến');
      return;
    }

    setIsProcessing(true);
    paymentTimerRef.current = window.setTimeout(() => {
      const booking = createBooking({
        movie,
        cinema,
        showtime,
        seats: selectedSeats,
        concessionQuantities,
        customer,
        paymentMethod,
        promotion,
      });
      addBooking(booking);
      completeDraft(booking.id);
      toast.success('Thanh toán thành công! Chúc bạn xem phim vui vẻ 🎬');
    }, PAYMENT_PROCESSING_DELAY_MS);
  };

  return (
    <BookingStepShell
      title="Thanh toán"
      description="Kiểm tra thông tin và chọn phương thức thanh toán."
      action={{
        label: `Thanh toán ${formatCurrency(priceBreakdown.total)}`,
        formId: CHECKOUT_FORM_ID,
        isLoading: isProcessing,
      }}
    >
      <form id={CHECKOUT_FORM_ID} noValidate onSubmit={handleSubmit} className="space-y-6">
        <fieldset className="rounded-2xl border border-line bg-surface p-5">
          <legend className="sr-only">Thông tin liên hệ</legend>
          <h2 className="font-bold">Thông tin liên hệ</h2>
          <p className="mt-1 text-sm text-ink-muted">Thông tin vé sẽ được gửi tới email và số điện thoại này.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <TextField
              name="fullName"
              label="Họ và tên"
              icon={User}
              autoComplete="name"
              placeholder="Nguyễn Văn A"
              value={customer.fullName}
              onChange={(event) => updateCustomer('fullName', event.target.value)}
              onBlur={() => markTouched('fullName')}
              error={visibleErrors.fullName}
              className="sm:col-span-2"
            />
            <TextField
              name="phone"
              label="Số điện thoại"
              icon={Phone}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0912 345 678"
              value={customer.phone}
              onChange={(event) => updateCustomer('phone', event.target.value)}
              onBlur={() => markTouched('phone')}
              error={visibleErrors.phone}
            />
            <TextField
              name="email"
              label="Email"
              icon={Mail}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="ban@example.com"
              value={customer.email}
              onChange={(event) => updateCustomer('email', event.target.value)}
              onBlur={() => markTouched('email')}
              error={visibleErrors.email}
            />
          </div>
        </fieldset>

        <section className="rounded-2xl border border-line bg-surface p-5" aria-labelledby="promo-heading">
          <h2 id="promo-heading" className="flex items-center gap-2 font-bold">
            <Tag className="size-4.5 text-brand" aria-hidden /> Mã khuyến mãi
          </h2>

          {promotion ? (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
              <div>
                <p className="font-mono font-bold text-emerald-300">{promotion.code}</p>
                {promotionEvaluation?.isValid ? (
                  <p className="text-xs text-emerald-200/80">
                    {promotion.title} · −{formatCurrency(promotionEvaluation.discount)}
                  </p>
                ) : (
                  <p className="flex items-center gap-1 text-xs text-amber-300">
                    <TriangleAlert className="size-3.5" aria-hidden />
                    {promotionEvaluation?.reason ?? 'Mã không còn áp dụng'}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPromoCode(null)} aria-label="Gỡ mã khuyến mãi">
                <X className="size-4" /> Gỡ mã
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-4 flex gap-2">
                <label className="sr-only" htmlFor="promo-code-input">
                  Nhập mã khuyến mãi
                </label>
                <input
                  id="promo-code-input"
                  value={promoInput}
                  onChange={(event) => {
                    setPromoInput(event.target.value.toUpperCase());
                    setPromoError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      if (promoInput.trim()) applyPromoCode(promoInput);
                    }
                  }}
                  placeholder="Nhập mã khuyến mãi"
                  aria-invalid={Boolean(promoError)}
                  className={cn(
                    'h-11 min-w-0 flex-1 rounded-xl border bg-surface-raised px-4 font-mono text-sm tracking-wider uppercase placeholder:font-sans placeholder:tracking-normal placeholder:normal-case placeholder:text-ink-subtle focus:outline-none',
                    promoError ? 'border-red-500/70' : 'border-line-strong focus:border-brand',
                  )}
                />
                <Button variant="secondary" disabled={!promoInput.trim()} onClick={() => applyPromoCode(promoInput)}>
                  Áp dụng
                </Button>
              </div>
              {promoError && <p className="mt-2 text-xs text-red-400">{promoError}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-subtle">
                Gợi ý:
                {PROMOTIONS.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => applyPromoCode(item.code)}
                    title={item.description}
                    className="rounded-md border border-dashed border-line-strong px-2 py-1 font-mono font-semibold text-ink-muted transition-colors hover:border-brand hover:text-brand"
                  >
                    {item.code}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        <fieldset className="rounded-2xl border border-line bg-surface p-5">
          <legend className="sr-only">Phương thức thanh toán</legend>
          <h2 className="font-bold">Phương thức thanh toán</h2>
          <div className="mt-4 grid gap-3">
            {PAYMENT_METHODS.map((option) => {
              const Icon = PAYMENT_ICONS[option.value];
              const isSelected = paymentMethod === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand',
                    isSelected ? 'border-brand/60 bg-brand-soft/50' : 'border-line-strong hover:bg-white/[0.03]',
                  )}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => setPaymentMethod(option.value)}
                    className="sr-only"
                  />
                  <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', isSelected ? 'bg-gradient-brand text-white' : 'bg-surface-raised text-ink-muted')}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{option.label}</span>
                    <span className="block text-xs text-ink-muted">{option.description}</span>
                  </span>
                  <span
                    aria-hidden
                    className={cn('grid size-5 shrink-0 place-items-center rounded-full border-2', isSelected ? 'border-brand' : 'border-line-strong')}
                  >
                    {isSelected && <span className="size-2.5 rounded-full bg-brand" />}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs text-ink-subtle">
            <ShieldCheck className="size-4 shrink-0 text-emerald-400" aria-hidden />
            Bản demo: thanh toán được mô phỏng, không phát sinh giao dịch thật và không thu thập thông tin thẻ.
          </p>
        </fieldset>

        {isAgeRestricted && (
          <div className="flex gap-3 rounded-2xl bg-amber-500/10 p-4 text-sm text-amber-100 ring-1 ring-amber-500/30">
            <AgeRatingBadge rating={movie.ageRating} className="shrink-0" />
            <p>
              {AGE_RATING_DESCRIPTIONS[movie.ageRating]}. Vui lòng mang theo giấy tờ tùy thân có ảnh; rạp có quyền từ chối
              phục vụ nếu khán giả không đủ tuổi và không hoàn tiền trong trường hợp này.
            </p>
          </div>
        )}

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-sm">
          <input
            type="checkbox"
            checked={hasAcceptedTerms}
            onChange={(event) => setHasAcceptedTerms(event.target.checked)}
            className="mt-0.5 size-4.5 shrink-0 accent-brand"
            aria-invalid={isSubmitted && !hasAcceptedTerms}
          />
          <span className={cn(isSubmitted && !hasAcceptedTerms ? 'text-red-300' : 'text-ink-muted')}>
            Tôi đồng ý với điều khoản đặt vé: vé đã mua có thể hủy trực tuyến trước giờ chiếu 2 tiếng
            {isAgeRestricted && ', và xác nhận người xem đáp ứng độ tuổi quy định của phim'}.
          </span>
        </label>
      </form>

      <Dialog isOpen={isProcessing} labelledBy={processingTitleId} className="max-w-sm">
        <div className="flex flex-col items-center p-8 text-center">
          <LoaderCircle className="size-12 animate-spin text-brand" aria-hidden />
          <h2 id={processingTitleId} className="mt-5 text-lg font-bold">
            Đang xử lý thanh toán
          </h2>
          <p className="mt-1 text-sm text-ink-muted">Vui lòng không đóng hoặc tải lại trang...</p>
          <p className="mt-4 text-2xl font-black text-gradient-brand tabular-nums">{formatCurrency(priceBreakdown.total)}</p>
        </div>
      </Dialog>
    </BookingStepShell>
  );
}

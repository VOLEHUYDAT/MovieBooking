import type { Booking, CustomerInfo, PaymentMethod, User, UserRole } from './domain';

/** Error envelope returned by every failing API call. */
export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    /** Field-level validation messages keyed by field name. */
    fields?: Record<string, string>;
  };
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'SEATS_UNAVAILABLE'
  | 'HOLD_EXPIRED'
  | 'SHOWTIME_CLOSED'
  | 'PROMOTION_INVALID'
  | 'ACCOUNT_LOCKED'
  | 'TOO_MANY_ATTEMPTS'
  | 'INTERNAL_ERROR';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface RegisterRequest {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface UpdateProfileRequest {
  fullName: string;
  phone: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserResponse {
  user: User;
}

// ---------------------------------------------------------------------------
// Seats & bookings
// ---------------------------------------------------------------------------

export interface SeatHold {
  id: string;
  showtimeId: string;
  seatIds: string[];
  expiresAt: string;
}

export interface SeatAvailabilityResponse {
  showtimeId: string;
  /** Seats that are booked or held by someone else. */
  unavailableSeatIds: string[];
  /** The caller's own active hold for this showtime, if any. */
  myHold: SeatHold | null;
}

export interface CreateHoldRequest {
  showtimeId: string;
  seatIds: string[];
}

export interface HoldResponse {
  hold: SeatHold;
}

export interface CreateBookingRequest {
  holdId: string;
  concessions: Record<string, number>;
  promoCode: string | null;
  customer: CustomerInfo;
  paymentMethod: PaymentMethod;
}

export interface BookingResponse {
  booking: Booking;
}

export interface BookingListResponse {
  bookings: Booking[];
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UpdateUserRequest {
  role?: UserRole;
  isLocked?: boolean;
}

export interface RevenuePoint {
  label: string;
  revenue: number;
  tickets: number;
}

export interface AdminStatsResponse {
  totals: {
    revenue: number;
    ticketsSold: number;
    confirmedBookings: number;
    cancelledBookings: number;
    checkedInBookings: number;
    customers: number;
  };
  revenueByDay: (RevenuePoint & { date: string })[];
  revenueByMovie: (RevenuePoint & { movieId: string })[];
  recentBookings: Booking[];
}

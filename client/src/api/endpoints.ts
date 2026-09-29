import type {
  AdminStatsResponse,
  BookingListResponse,
  BookingResponse,
  ChangePasswordRequest,
  CreateBookingRequest,
  CreateHoldRequest,
  HoldResponse,
  LoginRequest,
  PaginatedResponse,
  RegisterRequest,
  SeatAvailabilityResponse,
  UpdateProfileRequest,
  UpdateUserRequest,
  UserResponse,
} from '@shared/types/api';
import type { Booking, User, UserRole } from '@shared/types/domain';
import { apiRequest } from './httpClient';

export const authApi = {
  me: (signal?: AbortSignal) => apiRequest<UserResponse>('/auth/me', { signal }),
  login: (body: LoginRequest) => apiRequest<UserResponse>('/auth/login', { method: 'POST', body }),
  register: (body: RegisterRequest) => apiRequest<UserResponse>('/auth/register', { method: 'POST', body }),
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST' }),
  updateProfile: (body: UpdateProfileRequest) => apiRequest<UserResponse>('/auth/me', { method: 'PATCH', body }),
  changePassword: (body: ChangePasswordRequest) => apiRequest<void>('/auth/change-password', { method: 'POST', body }),
};

export const bookingApi = {
  seatAvailability: (showtimeId: string, signal?: AbortSignal) =>
    apiRequest<SeatAvailabilityResponse>(`/showtimes/${encodeURIComponent(showtimeId)}/seats`, { signal }),
  createHold: (body: CreateHoldRequest) => apiRequest<HoldResponse>('/holds', { method: 'POST', body }),
  releaseHold: (holdId: string) => apiRequest<void>(`/holds/${holdId}`, { method: 'DELETE' }),
  create: (body: CreateBookingRequest) => apiRequest<BookingResponse>('/bookings', { method: 'POST', body }),
  mine: (signal?: AbortSignal) => apiRequest<BookingListResponse>('/bookings/mine', { signal }),
  get: (bookingId: string, signal?: AbortSignal) => apiRequest<BookingResponse>(`/bookings/${bookingId}`, { signal }),
  cancel: (bookingId: string) => apiRequest<BookingResponse>(`/bookings/${bookingId}/cancel`, { method: 'POST' }),
};

export const staffApi = {
  lookup: (code: string) => apiRequest<BookingResponse>('/staff/bookings/lookup', { query: { code } }),
  checkIn: (bookingId: string) => apiRequest<BookingResponse>(`/staff/bookings/${bookingId}/check-in`, { method: 'POST' }),
};

export type AdminBookingFilter = 'all' | 'confirmed' | 'cancelled' | 'checked-in';

export const adminApi = {
  stats: (signal?: AbortSignal) => apiRequest<AdminStatsResponse>('/admin/stats', { signal }),
  bookings: (query: { search?: string; filter: AdminBookingFilter; page: number; pageSize: number }, signal?: AbortSignal) =>
    apiRequest<PaginatedResponse<Booking>>('/admin/bookings', { query, signal }),
  users: (query: { search?: string; role?: UserRole; page: number; pageSize: number }, signal?: AbortSignal) =>
    apiRequest<PaginatedResponse<User>>('/admin/users', { query, signal }),
  updateUser: (userId: string, body: UpdateUserRequest) =>
    apiRequest<UserResponse>(`/admin/users/${userId}`, { method: 'PATCH', body }),
};

/** Central query-key factory so invalidation stays consistent. */
export const queryKeys = {
  currentUser: ['auth', 'me'] as const,
  seatAvailability: (showtimeId: string) => ['showtimes', showtimeId, 'seats'] as const,
  myBookings: ['bookings', 'mine'] as const,
  booking: (bookingId: string) => ['bookings', 'detail', bookingId] as const,
  bookings: ['bookings'] as const,
  adminStats: ['admin', 'stats'] as const,
  adminBookings: (query: object) => ['admin', 'bookings', query] as const,
  adminUsers: (query: object) => ['admin', 'users', query] as const,
};

export type Genre =
  | 'Hành động'
  | 'Phiêu lưu'
  | 'Khoa học viễn tưởng'
  | 'Giật gân'
  | 'Tình cảm'
  | 'Chính kịch'
  | 'Kinh dị'
  | 'Hoạt hình'
  | 'Gia đình'
  | 'Hài'
  | 'Giả tưởng';

/** Vietnamese film classification (Thông tư 12/2015/TT-BVHTTDL, updated 2023). */
export type AgeRating = 'P' | 'K' | 'T13' | 'T16' | 'T18';

export type ScreenFormat = '2D' | '3D' | 'IMAX';

export type MovieStatus = 'now-showing' | 'coming-soon';

export type PosterMotif = 'sun' | 'orbit' | 'waves' | 'grid' | 'shards' | 'moon' | 'bubbles' | 'city';

export interface PosterTheme {
  /** Gradient stops, top to bottom. */
  colors: [string, string, string];
  accent: string;
  motif: PosterMotif;
}

export interface Movie {
  id: string;
  title: string;
  englishTitle: string;
  tagline: string;
  synopsis: string;
  genres: Genre[];
  durationMinutes: number;
  ageRating: AgeRating;
  /** Audience score on a 10-point scale. */
  score: number;
  /** ISO date (yyyy-MM-dd). */
  releaseDate: string;
  director: string;
  cast: string[];
  language: string;
  status: MovieStatus;
  formats: ScreenFormat[];
  poster: PosterTheme;
}

export type City = 'TP. Hồ Chí Minh' | 'Hà Nội' | 'Đà Nẵng';

export interface Cinema {
  id: string;
  name: string;
  address: string;
  city: City;
  hotline: string;
  auditoriumCount: number;
  hasImax: boolean;
}

export interface Showtime {
  id: string;
  movieId: string;
  cinemaId: string;
  auditorium: string;
  format: ScreenFormat;
  /** ISO datetime string. */
  startsAt: string;
  /** ISO datetime string. */
  endsAt: string;
}

export type SeatType = 'standard' | 'vip' | 'couple';

export interface Seat {
  id: string;
  row: string;
  number: number;
  label: string;
  type: SeatType;
  /** 1-based column in the auditorium grid (aisles are empty columns). */
  gridColumn: number;
  /** Couple seats span two grid columns. */
  gridSpan: 1 | 2;
  /** Seats are adjacent only inside the same block (blocks are separated by aisles). */
  blockIndex: number;
}

export interface SeatRow {
  label: string;
  seats: Seat[];
}

export interface SeatMap {
  columnCount: number;
  rows: SeatRow[];
  occupiedSeatIds: ReadonlySet<string>;
}

export type ConcessionCategory = 'combo' | 'snack' | 'drink';

export type ConcessionIcon = 'popcorn' | 'drink' | 'water' | 'snack' | 'combo';

export interface ConcessionItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ConcessionCategory;
  icon: ConcessionIcon;
  badge?: string;
}

export type PromotionKind = 'percent-order' | 'fixed-order' | 'percent-concessions';

export interface Promotion {
  code: string;
  title: string;
  description: string;
  kind: PromotionKind;
  value: number;
  maxDiscount?: number;
  minOrderAmount?: number;
}

export type PaymentMethod = 'card' | 'e-wallet' | 'bank-transfer';

export interface CustomerInfo {
  fullName: string;
  email: string;
  phone: string;
}

export interface PriceBreakdown {
  ticketSubtotal: number;
  concessionSubtotal: number;
  discount: number;
  total: number;
}

export interface BookedSeat {
  id: string;
  label: string;
  type: SeatType;
  price: number;
}

export interface BookedConcession {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export type BookingStatus = 'confirmed' | 'cancelled';

export interface Booking {
  id: string;
  code: string;
  showtimeId: string;
  movieId: string;
  cinemaId: string;
  /** Snapshot so tickets stay readable even if catalog data changes. */
  movieTitle: string;
  cinemaName: string;
  cinemaAddress: string;
  auditorium: string;
  format: ScreenFormat;
  startsAt: string;
  endsAt: string;
  seats: BookedSeat[];
  concessions: BookedConcession[];
  customer: CustomerInfo;
  paymentMethod: PaymentMethod;
  promoCode: string | null;
  pricing: PriceBreakdown;
  status: BookingStatus;
  createdAt: string;
  cancelledAt: string | null;
}

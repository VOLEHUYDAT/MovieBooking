-- Lumina Cinema: initial schema
-- Applied automatically by the API on startup (see server/src/db/migrator.ts) and compatible
-- with `supabase db push`.
--
-- Security: every table has Row Level Security enabled WITHOUT policies. Supabase exposes the
-- public schema through its Data API (PostgREST); with RLS on and no policies, the anon and
-- authenticated keys can read or write nothing. Only the API server, connecting as the table
-- owner, can access the data.

-- ---------------------------------------------------------------------------
-- Accounts & sessions
-- ---------------------------------------------------------------------------
create table if not exists public.app_users (
  id uuid primary key,
  full_name text not null check (char_length(full_name) between 2 and 80),
  email text not null unique check (email = lower(email)),
  phone text not null,
  role text not null default 'customer' check (role in ('customer', 'staff', 'admin')),
  password_hash text not null,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_sessions (
  -- SHA-256 of the opaque session token; the raw token only ever lives in the httpOnly cookie.
  id text primary key,
  user_id uuid not null references public.app_users (id) on delete cascade,
  expires_at timestamptz not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists ix_user_sessions_user_id on public.user_sessions (user_id);
create index if not exists ix_user_sessions_expires_at on public.user_sessions (expires_at);

-- ---------------------------------------------------------------------------
-- Seat holds (temporary reservations while a customer checks out)
-- ---------------------------------------------------------------------------
create table if not exists public.seat_holds (
  id uuid primary key,
  user_id uuid not null references public.app_users (id) on delete cascade,
  showtime_id text not null,
  seat_ids jsonb not null check (jsonb_typeof(seat_ids) = 'array'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint ux_seat_holds_user_showtime unique (user_id, showtime_id)
);

create index if not exists ix_seat_holds_showtime on public.seat_holds (showtime_id, expires_at);

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key,
  code text not null unique,
  user_id uuid references public.app_users (id) on delete set null,
  showtime_id text not null,
  movie_id text not null,
  cinema_id text not null,
  movie_title text not null,
  cinema_name text not null,
  cinema_address text not null,
  auditorium text not null,
  format text not null check (format in ('2D', '3D', 'IMAX')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  payment_method text not null check (payment_method in ('card', 'e-wallet', 'bank-transfer')),
  promo_code text,
  ticket_subtotal integer not null check (ticket_subtotal >= 0),
  concession_subtotal integer not null check (concession_subtotal >= 0),
  discount integer not null default 0 check (discount >= 0),
  total integer not null check (total >= 0),
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references public.app_users (id) on delete set null,
  checked_in_at timestamptz,
  checked_in_by uuid references public.app_users (id) on delete set null
);

create index if not exists ix_bookings_user_id on public.bookings (user_id, starts_at desc);
create index if not exists ix_bookings_showtime_id on public.bookings (showtime_id);
create index if not exists ix_bookings_created_at on public.bookings (created_at desc);

create table if not exists public.booking_seats (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  showtime_id text not null,
  seat_id text not null,
  seat_label text not null,
  seat_type text not null check (seat_type in ('standard', 'vip', 'couple')),
  price integer not null check (price >= 0),
  -- Cleared when the booking is cancelled so the seat can be sold again.
  is_active boolean not null default true,
  primary key (booking_id, seat_id)
);

-- Guarantees a seat can never be sold twice for the same showtime, even under concurrency.
create unique index if not exists ux_booking_seats_active_seat
  on public.booking_seats (showtime_id, seat_id)
  where is_active;

create table if not exists public.booking_concessions (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  item_id text not null,
  item_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0),
  primary key (booking_id, item_id)
);

-- ---------------------------------------------------------------------------
-- Lock down the Supabase Data API
-- ---------------------------------------------------------------------------
alter table public.app_users enable row level security;
alter table public.user_sessions enable row level security;
alter table public.seat_holds enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_seats enable row level security;
alter table public.booking_concessions enable row level security;

# 🎬 Lumina Cinema — Full-stack Movie Ticket Booking

A production-style cinema booking platform: browse movies, pick a showtime, choose seats on a live
seat map, add concessions, pay, and receive an e-ticket with a QR code — with **customer, staff and
admin roles**, a **REST API** and **Supabase (PostgreSQL)** storage.

> Demo project — all movies, people, cinemas and artwork are fictional. Payments are simulated.

## ✨ Features by role

Each role works in its own area and only sees the pages it needs (menus live in
`client/src/app/navigation.ts`; the API enforces the same rules).

| Role | Menu | Capabilities |
| --- | --- | --- |
| **Guest** | Phim · Rạp chiếu · Đăng nhập | Browse movies & cinemas, search, filter, view schedules. Booking redirects to login and returns to the chosen showtime. |
| **Customer** | Phim · Rạp chiếu · Vé của tôi | Register / login, book tickets with a server-side 10-minute seat hold, promo codes, e-ticket with QR, `.ics` export, cancel up to 2 h before showtime, profile & password. |
| **Staff** | Soát vé | Check-in desk: look up a booking code and admit guests (from 2 h before start until the screening ends). |
| **Admin** | Tổng quan · Đặt vé · Người dùng · Soát vé | Revenue dashboard, booking search & cancellation, user roles and account locking, check-in. |

Staff and admins are operational accounts: they land on their workspace after login and are
redirected away from storefront pages (they cannot buy tickets). Account settings and individual
ticket pages are available to every signed-in role.

## 🏗️ Architecture

```
┌──────────────┐   /api (Vite proxy / same origin)   ┌──────────────────┐        ┌──────────────────────┐
│ client/      │ ──────────────────────────────────▶ │ server/          │ ─────▶ │ Supabase PostgreSQL  │
│ React 19     │   httpOnly session cookie + CSRF    │ Express 5 API    │  pg    │ (RLS on, no policies)│
│ React Query  │ ◀────────────────────────────────── │ zod · scrypt     │        └──────────────────────┘
└──────┬───────┘                                     └────────┬─────────┘         PGlite (embedded) when
       │               shared/  (domain types, catalog,       │                    DATABASE_URL is empty
       └──────────────  pricing, seat rules, policies)  ──────┘
```

- **`shared/`** is imported by both apps, so the UI and the API enforce *identical* rules
  (pricing, promotions, stranded-seat rule, cancellation & check-in windows, validation messages).
- **The server is authoritative**: it recomputes prices, validates promotions and owns seat inventory.
- **No double booking**: seat holds and bookings are serialized per showtime with a Postgres
  advisory lock, and a partial unique index on `booking_seats (showtime_id, seat_id) where is_active`
  is the final guarantee.
- **Time zone safe**: schedules are pinned to `Asia/Ho_Chi_Minh`, so a server in UTC and a browser
  anywhere agree on "19:00".

## 🧱 Tech stack

| Layer | Stack |
| --- | --- |
| Client | React 19, TypeScript, Vite, Tailwind CSS v4, React Router 7, TanStack Query, Zustand, Sonner, lucide-react, qrcode.react |
| Server | Node.js 22, Express 5, zod, `pg`, PGlite, helmet, express-rate-limit, cookie-parser, tsup |
| Database | Supabase PostgreSQL (SQL migrations in `supabase/migrations`) |
| Quality | Vitest, Supertest, ESLint (typescript-eslint, react-hooks), strict TypeScript |

## 🚀 Getting started

```bash
npm install
npm run dev
```

- Web app: http://localhost:5173 · API: http://localhost:4000/api/health
- With no `DATABASE_URL`, the API uses an **embedded PGlite** database in `server/.pglite`, runs
  migrations and seeds demo data automatically — zero setup.

### Demo accounts (seeded in development)

| Role | Email | Password |
| --- | --- | --- |
| Customer | `member@lumina.example` | `Member@123` |
| Staff | `staff@lumina.example` | `Staff@123` |
| Admin | `admin@lumina.example` | `Admin@123` |

The login page also has one-click demo buttons (development builds only).
**Never enable `SEED_DEMO_DATA` on a real deployment.**

### Connect Supabase

1. Supabase Dashboard → your project → **Connect** → copy the **Session pooler** connection string.
2. Create `server/.env` from the template and paste it, replacing `[YOUR-PASSWORD]`:

   ```bash
   cp server/.env.example server/.env
   ```

   ```env
   DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```

3. `npm run db:migrate` (optional — the API also migrates on startup), then `npm run dev`.
4. Optional demo data: `npm run db:seed` (only runs when the database has no users).

Every table has **Row Level Security enabled with no policies**, so Supabase's public Data API
(anon/authenticated keys) cannot read or write anything — only the API server can.

## 📜 Scripts (run from the repository root)

| Script | Description |
| --- | --- |
| `npm run dev` | API + web app with hot reload |
| `npm run build` | Build the web app (Vite) and the API (tsup) |
| `npm start` | Start the built API; in production it also serves `client/dist` |
| `npm test` | Shared unit tests, client tests and API integration tests |
| `npm run typecheck` | TypeScript across all workspaces |
| `npm run lint` | ESLint across the monorepo |
| `npm run db:migrate` / `db:seed` | Apply migrations / seed demo data |

## 🔌 REST API

All endpoints are under `/api`. State-changing requests require the header
`X-Requested-With: lumina-web`. Errors use `{ "error": { "code", "message", "fields?" } }`.

| Method & path | Access | Purpose |
| --- | --- | --- |
| `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` | Public | Account & session |
| `GET /auth/me` | Public | Current session (`user: null` for guests) |
| `PATCH /auth/me` · `POST /auth/change-password` | Signed in | Profile & password |
| `GET /showtimes/:id/seats` | Public | Unavailable seats + caller's own hold |
| `POST /holds` · `DELETE /holds/:id` | Customer | Hold / release seats (10 min) |
| `POST /bookings` · `GET /bookings/mine` | Customer | Confirm a hold into a booking · own tickets |
| `GET /bookings/:id` | Owner, staff, admin | Ticket detail |
| `POST /bookings/:id/cancel` | Owner (policy window), admin | Cancel a booking |
| `GET /staff/bookings/lookup?code=` · `POST /staff/bookings/:id/check-in` | Staff, Admin | Check-in |
| `GET /admin/stats` · `GET /admin/bookings` | Admin (bookings: staff too) | Reports & search |
| `GET /admin/users` · `PATCH /admin/users/:id` | Admin | Roles & account locking |

## 🔐 Security

- Passwords hashed with **scrypt** (per-user salt, versioned format); constant-time comparison.
- Opaque session tokens in **httpOnly, SameSite=Lax** cookies; only their SHA-256 digest is stored,
  so sessions can be revoked (logout, password change, account lock) instantly.
- **CSRF** guard via a required custom header; CORS restricted to `CLIENT_ORIGIN`.
- Login brute-force protection per account + rate limiting per IP; `helmet` security headers.
- Role-based **permissions** (`shared/lib/permissions.ts`) checked by the API and mirrored in the UI.
- Other customers' bookings return **404** (not 403) so IDs cannot be probed.
- Admins cannot change their own role/lock state, and the last active admin cannot be removed.

## 🗂️ Project structure

```
client/                 React web app
  src/api/              HTTP client, endpoints, React Query setup
  src/components/       UI, layout, booking, ticket, auth, admin components
  src/pages/            Routes: public, booking wizard, tickets, account, staff, admin
  src/store/            Booking draft (sessionStorage)
server/                 Express API
  src/config/           Environment validation (zod)
  src/db/               pg / PGlite adapters, migrator, demo seed
  src/http/             Errors, validation, auth/CSRF/CORS middleware
  src/modules/          auth · users · bookings (holds, check-in) · admin
  tests/                API integration tests (Supertest + in-memory PGlite)
shared/                 Domain types, catalog data, pricing, seat rules, policies, permissions
supabase/migrations/    SQL schema (Supabase CLI compatible)
```

## 💰 Pricing rules

| Seat | 2D | 3D | IMAX |
| --- | --- | --- | --- |
| Standard | 75.000 ₫ | +25.000 ₫ | +50.000 ₫ |
| VIP | 95.000 ₫ | +25.000 ₫ | +50.000 ₫ |
| Couple (2 guests) | 170.000 ₫ | +50.000 ₫ | +100.000 ₫ |

Weekend screenings add 10.000 ₫ per guest. Promo codes: `LUMINA10`, `HELLO50K`, `COMBO30`.

## ☁️ Deployment

One deployable service: `npm run build`, then run `npm start` with
`NODE_ENV=production`, `DATABASE_URL`, `COOKIE_SECURE=true` and `TRUST_PROXY=true` (behind a proxy).
The API serves the built web app from `client/dist`.

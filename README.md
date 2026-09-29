# 🎬 Lumina Cinema — Movie Ticket Booking

A modern, responsive web app for browsing movies and booking cinema tickets end to end:
pick a showtime, choose seats, add concessions, pay, and receive an e-ticket with a QR code.

> Demo project — all movies, people, cinemas and artwork are fictional. Payments are simulated.

## ✨ Features

| Flow | What you get |
| --- | --- |
| **Discover** | Featured carousel, now showing / coming soon tabs, accent-insensitive search, genre filters, promo codes |
| **Movie detail** | Synopsis, cast, age rating, 7-day schedule filtered by city |
| **Cinemas** | Every location with its own daily schedule |
| **Seat selection** | Interactive auditorium map (standard / VIP / couple), live pricing, max 8 seats, *no stranded single seat* rule |
| **Seat hold** | 10-minute hold with countdown and expiry recovery |
| **Concessions** | Combos, snacks and drinks with quantity steppers |
| **Checkout** | Contact form with Vietnamese phone validation, promo codes, payment method, terms & age confirmation |
| **E-ticket** | QR code, price breakdown, add to calendar (`.ics`), print |
| **My tickets** | Upcoming / watched / cancelled, cancellation up to 2 hours before showtime |

## 🧱 Tech stack

- **React 19** + **TypeScript** (strict) + **Vite**
- **Tailwind CSS v4** — dark cinematic design system
- **React Router 7** (data router) · **Zustand** (persisted state) · **Sonner** (toasts)
- **lucide-react** icons · **qrcode.react**
- **Vitest** + **ESLint** (typescript-eslint, react-hooks)

## 🚀 Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | TypeScript project check |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |

## 🗂️ Project structure

```
src/
├── app/            # Router configuration
├── components/
│   ├── booking/    # Seat map, stepper, summary, date & showtime pickers
│   ├── layout/     # Header, footer, app shell
│   ├── movie/      # Generative posters, cards, hero carousel
│   ├── ticket/     # E-ticket card, status badge
│   └── ui/         # Buttons, badges, dialogs, empty states
├── data/           # Demo catalog: movies, cinemas, concessions, promotions
├── hooks/          # useNow, useCountdown, useDocumentTitle
├── lib/            # Date/format helpers, validation, seeded random
├── pages/          # Route pages (booking wizard under pages/booking)
├── services/       # Business logic: showtimes, seat map, pricing, bookings
├── store/          # Zustand stores (booking draft, booking history)
├── styles/         # Tailwind theme tokens
└── types/          # Domain model
```

## 🔄 Booking workflow

```
Home / Cinemas ─▶ Movie detail ─▶ Seats ─▶ Concessions ─▶ Checkout ─▶ E-ticket ─▶ My tickets
                  (date, city,     (hold     (optional)     (validate,    (QR, .ics,   (cancel ≥ 2h
                   showtime)        10 min)                  promo, pay)   print)       before start)
```

- Showtimes are generated deterministically from `movie + cinema + date`, so IDs are stable and shareable.
- The in-progress booking lives in `sessionStorage`; confirmed bookings live in `localStorage`.
- Online sales close 15 minutes before each screening.

## 💰 Pricing rules

| Seat | 2D | 3D | IMAX |
| --- | --- | --- | --- |
| Standard | 75.000 ₫ | +25.000 ₫ | +50.000 ₫ |
| VIP | 95.000 ₫ | +25.000 ₫ | +50.000 ₫ |
| Couple (2 guests) | 170.000 ₫ | +50.000 ₫ | +100.000 ₫ |

Weekend screenings add 10.000 ₫ per guest. Demo promo codes: `LUMINA10`, `HELLO50K`, `COMBO30`.

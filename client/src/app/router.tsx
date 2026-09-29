import { createBrowserRouter, Navigate } from 'react-router';
import { GuestOnly, RequireAuth } from '@/components/auth/RequireAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { AccountPage } from '@/pages/AccountPage';
import { AdminBookingsPage } from '@/pages/admin/AdminBookingsPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminLayout } from '@/pages/admin/AdminLayout';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { BookingFlowLayout } from '@/pages/booking/BookingFlowLayout';
import { CheckoutPage } from '@/pages/booking/CheckoutPage';
import { ConcessionsPage } from '@/pages/booking/ConcessionsPage';
import { SeatSelectionPage } from '@/pages/booking/SeatSelectionPage';
import { CinemasPage } from '@/pages/CinemasPage';
import { HomePage } from '@/pages/HomePage';
import { MovieDetailPage } from '@/pages/MovieDetailPage';
import { MyTicketsPage } from '@/pages/MyTicketsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { CheckInPage } from '@/pages/staff/CheckInPage';
import { TicketDetailPage } from '@/pages/TicketDetailPage';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      // Public
      { index: true, element: <HomePage /> },
      { path: 'movies/:movieId', element: <MovieDetailPage /> },
      { path: 'cinemas', element: <CinemasPage /> },
      { path: 'login', element: <GuestOnly><LoginPage /></GuestOnly> },
      { path: 'register', element: <GuestOnly><RegisterPage /></GuestOnly> },

      // Signed-in users
      {
        path: 'booking/:showtimeId',
        element: <RequireAuth permission="booking:create"><BookingFlowLayout /></RequireAuth>,
        children: [
          { index: true, element: <Navigate to="seats" replace /> },
          { path: 'seats', element: <SeatSelectionPage /> },
          { path: 'concessions', element: <ConcessionsPage /> },
          { path: 'checkout', element: <CheckoutPage /> },
        ],
      },
      { path: 'tickets', element: <RequireAuth><MyTicketsPage /></RequireAuth> },
      { path: 'tickets/:bookingId', element: <RequireAuth><TicketDetailPage /></RequireAuth> },
      { path: 'account', element: <RequireAuth><AccountPage /></RequireAuth> },

      // Staff
      { path: 'staff/check-in', element: <RequireAuth permission="ticket:check-in"><CheckInPage /></RequireAuth> },

      // Admin
      {
        path: 'admin',
        element: <RequireAuth permission="report:view"><AdminLayout /></RequireAuth>,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'bookings', element: <AdminBookingsPage /> },
          { path: 'users', element: <RequireAuth permission="user:manage"><AdminUsersPage /></RequireAuth> },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

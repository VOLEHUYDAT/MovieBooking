import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { BookingFlowLayout } from '@/pages/booking/BookingFlowLayout';
import { CheckoutPage } from '@/pages/booking/CheckoutPage';
import { ConcessionsPage } from '@/pages/booking/ConcessionsPage';
import { SeatSelectionPage } from '@/pages/booking/SeatSelectionPage';
import { CinemasPage } from '@/pages/CinemasPage';
import { HomePage } from '@/pages/HomePage';
import { MovieDetailPage } from '@/pages/MovieDetailPage';
import { MyTicketsPage } from '@/pages/MyTicketsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { TicketDetailPage } from '@/pages/TicketDetailPage';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'movies/:movieId', element: <MovieDetailPage /> },
      { path: 'cinemas', element: <CinemasPage /> },
      {
        path: 'booking/:showtimeId',
        element: <BookingFlowLayout />,
        children: [
          { index: true, element: <Navigate to="seats" replace /> },
          { path: 'seats', element: <SeatSelectionPage /> },
          { path: 'concessions', element: <ConcessionsPage /> },
          { path: 'checkout', element: <CheckoutPage /> },
        ],
      },
      { path: 'tickets', element: <MyTicketsPage /> },
      { path: 'tickets/:bookingId', element: <TicketDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

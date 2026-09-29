import { useQuery } from '@tanstack/react-query';
import { bookingApi, queryKeys } from '@/api/endpoints';
import { useCurrentUser } from './useCurrentUser';

/** The signed-in customer's bookings (disabled for guests and operational roles). */
export function useMyBookings() {
  const { can } = useCurrentUser();
  return useQuery({
    queryKey: queryKeys.myBookings,
    queryFn: async ({ signal }) => (await bookingApi.mine(signal)).bookings,
    enabled: can('booking:create'),
  });
}

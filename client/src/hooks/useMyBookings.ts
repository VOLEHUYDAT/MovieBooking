import { useQuery } from '@tanstack/react-query';
import { bookingApi, queryKeys } from '@/api/endpoints';
import { useCurrentUser } from './useCurrentUser';

/** The signed-in user's bookings (disabled for guests). */
export function useMyBookings() {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: queryKeys.myBookings,
    queryFn: async ({ signal }) => (await bookingApi.mine(signal)).bookings,
    enabled: user !== null,
  });
}

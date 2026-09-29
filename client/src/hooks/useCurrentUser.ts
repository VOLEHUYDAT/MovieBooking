import { useQuery } from '@tanstack/react-query';
import { hasPermission, type Permission } from '@shared/lib/permissions';
import type { User } from '@shared/types/domain';
import { authApi, queryKeys } from '@/api/endpoints';
import { isApiError } from '@/api/httpClient';

/**
 * The signed-in user, or null for guests. `isLoading` is true only while the initial session
 * check is in flight, so route guards can wait instead of redirecting prematurely.
 */
export function useCurrentUser() {
  const query = useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: async ({ signal }): Promise<User | null> => {
      try {
        return (await authApi.me(signal)).user;
      } catch (error) {
        if (isApiError(error) && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60_000,
  });

  const user = query.data ?? null;
  return {
    user,
    isLoading: query.isPending,
    isError: query.isError,
    can: (permission: Permission) => (user ? hasPermission(user.role, permission) : false),
  };
}

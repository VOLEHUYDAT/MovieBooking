import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { User } from '@shared/types/domain';
import { authApi, queryKeys } from '@/api/endpoints';
import { useBookingDraftStore } from '@/store/bookingDraftStore';

/** Drops every cached query that belongs to the previous user. */
function resetUserScopedCache(queryClient: QueryClient, user: User | null) {
  queryClient.removeQueries({ queryKey: queryKeys.bookings });
  queryClient.removeQueries({ queryKey: ['admin'] });
  queryClient.removeQueries({ queryKey: ['showtimes'] });
  queryClient.setQueryData(queryKeys.currentUser, user);
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ user }) => resetUserScopedCache(queryClient, user),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: ({ user }) => resetUserScopedCache(queryClient, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const resetDraft = useBookingDraftStore((state) => state.resetDraft);
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      resetDraft();
      resetUserScopedCache(queryClient, null);
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: ({ user }) => queryClient.setQueryData(queryKeys.currentUser, user),
  });
}

export function useChangePassword() {
  return useMutation({ mutationFn: authApi.changePassword });
}

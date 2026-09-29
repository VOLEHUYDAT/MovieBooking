import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { queryKeys } from './endpoints';
import { isApiError } from './httpClient';

/** A 401 anywhere means the session ended (expired, logged out elsewhere, or account locked). */
function handleUnauthenticated(error: unknown) {
  if (isApiError(error) && error.status === 401) {
    queryClient.setQueryData(queryKeys.currentUser, null);
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleUnauthenticated }),
  mutationCache: new MutationCache({ onError: handleUnauthenticated }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => !(isApiError(error) && error.status >= 400 && error.status < 500) && failureCount < 2,
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});

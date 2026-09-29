import type { ApiErrorBody, ApiErrorCode } from '@shared/types/api';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

/** Error thrown for any non-2xx API response (or network failure). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode | 'NETWORK_ERROR',
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isApiError(error: unknown, code?: ApiError['code']): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}

export function getErrorMessage(error: unknown, fallback = 'Đã có lỗi xảy ra, vui lòng thử lại'): string {
  return error instanceof ApiError ? error.message : fallback;
}

type QueryValue = string | number | boolean | undefined | null;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, { method = 'GET', body, query, signal }: RequestOptions = {}): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        // Required by the API's CSRF guard on state-changing requests.
        'X-Requested-With': 'lumina-web',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại');
  }

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (payload as ApiErrorBody | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'INTERNAL_ERROR',
      error?.message ?? `Yêu cầu thất bại (${response.status})`,
      error?.fields ?? {},
    );
  }
  return payload as T;
}

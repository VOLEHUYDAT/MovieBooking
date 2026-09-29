import { useNow } from './useNow';

export interface Countdown {
  remainingMs: number;
  isExpired: boolean;
}

/** Remaining time until `targetEpochMs`; returns null when there is no target. */
export function useCountdown(targetEpochMs: number | null): Countdown | null {
  const now = useNow(1_000);
  if (targetEpochMs === null) return null;
  const remainingMs = Math.max(0, targetEpochMs - now.getTime());
  return { remainingMs, isExpired: remainingMs === 0 };
}

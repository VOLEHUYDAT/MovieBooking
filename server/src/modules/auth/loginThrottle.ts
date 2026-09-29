export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 60_000;

/**
 * Per-account brute-force protection (complements the per-IP rate limiter).
 * In-memory: sufficient for a single API instance; use Redis when scaling horizontally.
 */
export function createLoginThrottle(now: () => number = Date.now) {
  const attempts = new Map<string, { failures: number; lockedUntil: number }>();

  return {
    getLockRemainingMs(key: string): number {
      const entry = attempts.get(key);
      return entry ? Math.max(0, entry.lockedUntil - now()) : 0;
    },

    recordFailure(key: string): void {
      const current = attempts.get(key);
      const failures = current && current.lockedUntil <= now() ? current.failures + 1 : 1;
      if (failures >= MAX_FAILED_ATTEMPTS) {
        attempts.set(key, { failures: 0, lockedUntil: now() + LOCKOUT_DURATION_MS });
      } else {
        attempts.set(key, { failures, lockedUntil: 0 });
      }
    },

    reset(key: string): void {
      attempts.delete(key);
    },
  };
}

export type LoginThrottle = ReturnType<typeof createLoginThrottle>;

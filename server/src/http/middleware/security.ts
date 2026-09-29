import type { RequestHandler } from 'express';
import { HttpError } from '../httpError';

/** Header the web client sends on every state-changing request. */
export const CSRF_HEADER = 'x-requested-with';
export const CSRF_HEADER_VALUE = 'lumina-web';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for cookie-based sessions: cross-site HTML forms cannot set custom headers, and
 * cross-origin `fetch` calls with custom headers trigger a CORS preflight that we reject.
 * Combined with SameSite=Lax cookies this blocks cross-site request forgery.
 */
export const requireCsrfHeader: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method) || req.get(CSRF_HEADER) === CSRF_HEADER_VALUE) {
    next();
    return;
  }
  next(HttpError.forbidden('Yêu cầu không hợp lệ (thiếu CSRF header)'));
};

/** Allows credentialed requests from the configured web origin only. */
export function corsForOrigin(allowedOrigin: string): RequestHandler {
  return (req, res, next) => {
    const origin = req.get('origin');
    if (origin && origin === allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', `Content-Type, ${CSRF_HEADER}`);
        res.setHeader('Access-Control-Max-Age', '600');
        res.sendStatus(204);
        return;
      }
    }
    next();
  };
}

export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = performance.now();
  res.on('finish', () => {
    const duration = (performance.now() - startedAt).toFixed(1);
    console.log(`[api] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
};

import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ApiErrorBody } from '@shared/types/api';
import { HttpError } from '../httpError';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(HttpError.notFound('Endpoint không tồn tại'));
};

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    const body: ApiErrorBody = { error: { code: error.code, message: error.message, fields: error.fields } };
    res.status(error.status).json(body);
    return;
  }

  // Malformed JSON bodies from express.json()
  if (error instanceof SyntaxError && 'body' in error) {
    const body: ApiErrorBody = { error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu gửi lên không phải JSON hợp lệ' } };
    res.status(400).json(body);
    return;
  }

  console.error(`[api] ${req.method} ${req.originalUrl} failed`, error);
  const body: ApiErrorBody = { error: { code: 'INTERNAL_ERROR', message: 'Đã có lỗi xảy ra, vui lòng thử lại sau' } };
  res.status(500).json(body);
};

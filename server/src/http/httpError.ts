import type { ApiErrorCode } from '@shared/types/api';

/** An error that maps directly to an HTTP response with a stable machine-readable code. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static badRequest(message: string, fields?: Record<string, string>) {
    return new HttpError(422, 'VALIDATION_ERROR', message, fields);
  }

  static unauthenticated(message = 'Vui lòng đăng nhập để tiếp tục') {
    return new HttpError(401, 'UNAUTHENTICATED', message);
  }

  static forbidden(message = 'Bạn không có quyền thực hiện thao tác này') {
    return new HttpError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Không tìm thấy dữ liệu') {
    return new HttpError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string, code: ApiErrorCode = 'CONFLICT') {
    return new HttpError(409, code, message);
  }
}

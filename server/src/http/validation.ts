import { z } from 'zod';
import { HttpError } from './httpError';

/** Parses `data` with `schema`, converting failures into a 422 with per-field messages. */
export function parseWith<Schema extends z.ZodType>(schema: Schema, data: unknown): z.infer<Schema> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    fields[key] ??= issue.message;
  }
  throw HttpError.badRequest(Object.values(fields)[0] ?? 'Dữ liệu không hợp lệ', fields);
}

/** A string field validated by one of the shared validators (keeps UI and API messages identical). */
export function validatedString(validator: (value: string) => string | null) {
  return z.string({ error: 'Trường này là bắt buộc' }).superRefine((value, ctx) => {
    const message = validator(value);
    if (message) ctx.addIssue({ code: 'custom', message });
  });
}

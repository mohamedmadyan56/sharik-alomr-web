import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from './errors';

type Meta = Record<string, unknown>;

export function requestMeta(res: Response, extra?: Meta): Meta {
  return {
    requestId: res.locals.requestId as string,
    serverTime: new Date().toISOString(),
    ...extra,
  };
}

/** رد نجاح موحّد: { data, meta } */
export function ok(res: Response, payload: unknown, meta?: Meta, status = 200): Response {
  return res.status(status).json({ data: payload ?? null, meta: requestMeta(res, meta) });
}

/** يلتقط الأخطاء غير المتوقّعة في المسارات async تلقائياً */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void Promise.resolve(fn(req as T, res, next)).catch(next);
  };
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `المسار غير موجود: ${req.method} ${req.originalUrl}` },
    meta: requestMeta(res),
  });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'بيانات غير مكتملة أو غير صالحة',
        details: err.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
      meta: requestMeta(res),
    });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
      meta: requestMeta(res),
    });
    return;
  }

  // Prisma: سجل مطلوب غير موجود / قيد فريد مكسور
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code: unknown }).code;
    if (code === 'P2025') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'العنصر غير موجود' }, meta: requestMeta(res) });
      return;
    }
    if (code === 'P2002') {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'تعارض في البيانات' }, meta: requestMeta(res) });
      return;
    }
  }

  console.error('[bff] unhandled error', err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'خطأ في الخادم — حاول مرة أخرى' },
    meta: requestMeta(res),
  });
}

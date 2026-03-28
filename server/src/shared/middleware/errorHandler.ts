import { ZodError } from 'zod';
import type { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  console.error(err);

  const status =
    err instanceof Error && 'status' in err
      ? (err as Error & { status: number }).status
      : err instanceof Error && 'statusCode' in err
        ? (err as Error & { statusCode: number }).statusCode
        : 500;

  const message =
    status >= 500
      ? 'Error interno del servidor'
      : err instanceof Error
        ? err.message
        : 'Error interno del servidor';

  res.status(status).json({ error: message });
}

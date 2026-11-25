import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger.ts';

export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        requestId: req.requestId,
        details: err.details,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Some input fields were invalid.',
        requestId: req.requestId,
        details: err.issues,
      },
    });
    return;
  }

  logger.error({ err, requestId: req.requestId }, 'Unhandled server error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something unexpected happened on our end. Please try again.',
      requestId: req.requestId,
    },
  });
}

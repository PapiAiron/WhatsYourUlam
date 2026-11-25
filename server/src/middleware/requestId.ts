import type { NextFunction, Request, Response } from 'express';
import { nanoid } from 'nanoid';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      authUid?: string;
      authEmail?: string;
      isAdmin?: boolean;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string | undefined) || nanoid(12);
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

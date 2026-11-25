import type { NextFunction, Request, Response } from 'express';
import { adminAuth } from '../config/firebase.ts';
import { env } from '../config/env.ts';
import { logger } from '../config/logger.ts';

const ADMIN_EMAILS = new Set(['mcantal22@gmail.com', 'cantal2227@gmail.com']);

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Sign in required to access this resource.',
        requestId: req.requestId,
      },
    });
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const decoded = await adminAuth.verifyIdToken(token);

    // Email verification is only enforced in production.
    // In development it is skipped so you can test without verifying.
    if (env.NODE_ENV === 'production' && !decoded.email_verified) {
      res.status(403).json({
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email address before continuing.',
          requestId: req.requestId,
        },
      });
      return;
    }

    req.authUid = decoded.uid;
    req.authEmail = decoded.email;
    req.isAdmin = Boolean(
      decoded.admin === true || (decoded.email && ADMIN_EMAILS.has(decoded.email.toLowerCase()))
    );
    next();
  } catch (err) {
    logger.warn({ err, requestId: req.requestId }, 'ID token verification failed');
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Your session has expired. Please sign in again.',
        requestId: req.requestId,
      },
    });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAdmin) {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Administrator privileges required.',
        requestId: req.requestId,
      },
    });
    return;
  }
  next();
}
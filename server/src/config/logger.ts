import pino from 'pino';
import { env } from './env.ts';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'email', 'password'],
    censor: '[REDACTED]',
  },
});

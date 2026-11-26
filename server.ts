import path from 'path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { env } from './server/src/config/env.ts';
import { logger } from './server/src/config/logger.ts';
import { requestIdMiddleware } from './server/src/middleware/requestId.ts';
import { apiLimiter } from './server/src/middleware/rateLimit.ts';
import { errorHandler } from './server/src/middleware/error.ts';
import { healthRouter } from './server/src/routes/health.ts';
import { plansRouter } from './server/src/routes/plans.ts';
import { aiRouter } from './server/src/routes/ai.ts';
import { publicRouter } from './server/src/routes/public.ts';

async function createServer() {
  const app = express();
  app.set('trust proxy', 1);

  const allowedOrigins = env.CLIENT_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const isDev = env.NODE_ENV !== 'production';

  app.use(requestIdMiddleware);
  app.use(
    helmet({
      xFrameOptions: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: {
        reportOnly: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://apis.google.com',
            'https://www.google.com',
            'https://www.gstatic.com',
            ...(isDev ? ["'unsafe-eval'"] : []),
          ],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://*.googleusercontent.com', 'https://firebasestorage.googleapis.com'],
          connectSrc: [
            "'self'",
            'https://*.googleapis.com',
            'https://*.firebaseio.com',
            'https://firestore.googleapis.com',
            'https://identitytoolkit.googleapis.com',
            'https://securetoken.googleapis.com',
            'https://formspree.io',
            ...(isDev ? ['ws://localhost:24678'] : []),
          ],
          frameSrc: ["'self'", 'https://*.firebaseapp.com', 'https://accounts.google.com'],
          frameAncestors: [
            "'self'",
            'https://aistudio.google.com',
            'https://*.google.com',
            'https://*.googleusercontent.com',
          ],
          upgradeInsecureRequests: isDev ? null : [],
        },
      },
    })
  );

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV === 'development') {
          cb(null, true);
        } else {
          cb(null, true);
        }
      },
      credentials: true,
    })
  );

  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/healthz',
      },
    })
  );

  app.use(healthRouter);
  app.use('/v1', apiLimiter);
  app.use('/v1/plans', plansRouter);
  app.use('/v1/ai', aiRouter);
  app.use('/v1/public', publicRouter);

  if (env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(
      '/assets',
      express.static(path.join(distDir, 'assets'), { maxAge: '1y', immutable: true })
    );
    app.use(express.static(distDir, { index: false }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use(errorHandler);



  const host = env.NODE_ENV === 'production'
  ? '0.0.0.0'
  : '127.0.0.1';

  const server = app.listen(env.PORT, host, () => {
    logger.info(
      { port: env.PORT, host, env: env.NODE_ENV },
      'Smart Meal Planner server listening'
    );
  });

  

  const shutdown = () => {
    logger.info('SIGTERM received, shutting down cleanly');
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
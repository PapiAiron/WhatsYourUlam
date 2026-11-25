import { Router } from 'express';
import { firebaseProjectId } from '../config/firebase.ts';
import { geminiProvider } from '../services/ai/geminiProvider.ts';
import { getAiSpendSnapshot } from '../services/ai/spendGuard.ts';

export const healthRouter = Router();

healthRouter.get('/healthz', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

healthRouter.get('/readyz', (_req, res) => {
  res.json({
    ok: true,
    firebaseConfigured: Boolean(firebaseProjectId),
    aiConfigured: geminiProvider.isConfigured(),
    aiSpend: getAiSpendSnapshot(),
  });
});

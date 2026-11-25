import { Router } from 'express';
import { z } from 'zod';
import {
  countryCodeSchema,
  mealTypeSchema,
  SEED_RECIPES_PH,
} from '../../../shared/src/index.ts';
import { requireAuth } from '../middleware/auth.ts';
import { geminiProvider } from '../services/ai/geminiProvider.ts';
import { getAiSpendSnapshot } from '../services/ai/spendGuard.ts';

export const aiRouter = Router();

aiRouter.post('/recipes/generate', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      country: countryCodeSchema.default('PH'),
      mealType: mealTypeSchema.default('dinner'),
      diet: z.string().max(40).default('none'),
      excludedText: z.string().max(120).optional(),
      existingNames: z.array(z.string().max(80)).max(60).optional(),
    });
    const body = schema.parse(req.body);

    if (!geminiProvider.isConfigured()) {
      res.status(503).json({
        error: {
          code: 'AI_UNAVAILABLE',
          message:
            'Recipe generation requires a server GEMINI_API_KEY. Your library recipes remain available.',
          requestId: req.requestId,
        },
      });
      return;
    }

    const recipe = await geminiProvider.generateGapRecipe({
      country: body.country,
      mealType: body.mealType,
      diet: body.diet,
      excludedText: body.excludedText,
      existingNames:
        body.existingNames ?? SEED_RECIPES_PH.map((r) => r.name),
    });

    if (!recipe) {
      res.status(502).json({
        error: {
          code: 'AI_GENERATION_FAILED',
          message: 'Could not validate a new recipe right now. Please try again.',
          requestId: req.requestId,
        },
      });
      return;
    }

    res.status(201).json({ recipe, spend: getAiSpendSnapshot() });
  } catch (err) {
    next(err);
  }
});

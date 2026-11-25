import { Router } from 'express';
import { z } from 'zod';
import {
  planInputSchema,
  SEED_RECIPES_PH,
  type PlanDocument,
  type PlannedMeal,
  type Recipe,
} from '../../../shared/src/index.ts';
import { requireAuth } from '../middleware/auth.ts';
import {
  applyMealSwapOrRecost,
  estimatePlan,
  findSwapAlternatives,
  generatePlan,
} from '../services/planEngine/index.ts';
import { filterCandidateRecipes } from '../services/planEngine/candidates.ts';
import { geminiProvider } from '../services/ai/geminiProvider.ts';

export const plansRouter = Router();

const estimateBodySchema = z.object({
  input: planInputSchema,
  overrides: z.record(z.string(), z.number().int().positive()).optional(),
});

const createPlanBodySchema = z.object({
  input: planInputSchema,
  name: z.string().trim().min(1).max(100).optional(),
  overrides: z.record(z.string(), z.number().int().positive()).optional(),
  extraRecipes: z.array(z.custom<Recipe>()).optional(),
});

const idempotencyCache = new Map<
  string,
  { expiresAt: number; payload: unknown }
>();

function toOverrideMap(record?: Record<string, number>): Map<string, number> {
  const map = new Map<string, number>();
  if (!record) return map;
  for (const [k, v] of Object.entries(record)) {
    if (Number.isInteger(v) && v > 0) map.set(k, v);
  }
  return map;
}

// Public or authenticated budget-fit estimate (zero AI, fast)
plansRouter.post('/estimate', (req, res, next) => {
  try {
    const body = estimateBodySchema.parse(req.body);
    const result = estimatePlan(
      body.input,
      SEED_RECIPES_PH,
      toOverrideMap(body.overrides)
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Generate full meal plan (requires verified Firebase user)
plansRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    if (idempotencyKey) {
      const cached = idempotencyCache.get(`${req.authUid}:${idempotencyKey}`);
      if (cached && cached.expiresAt > Date.now()) {
        res.status(200).json(cached.payload);
        return;
      }
    }

    const body = createPlanBodySchema.parse(req.body);
    const overrides = toOverrideMap(body.overrides);

    // Combine seed recipes with any extra approved/unreviewed recipes passed
    const library: Recipe[] = [...SEED_RECIPES_PH, ...(body.extraRecipes ?? [])];

    // Gap check: if candidate pool is thin for any requested meal type, try Gemini fill
    const candidates = filterCandidateRecipes(body.input, library);
    const minNeeded = Math.ceil(body.input.days * 0.6);
    if (geminiProvider.isConfigured()) {
      for (const mt of body.input.mealTypes) {
        if ((candidates[mt]?.length ?? 0) < Math.min(4, minNeeded)) {
          const generated = await geminiProvider.generateGapRecipe({
            country: body.input.country,
            mealType: mt,
            diet: body.input.diet,
            excludedText: body.input.excludedIngredients.join(', '),
            existingNames: library.map((r) => r.name),
          });
          if (generated) {
            library.push(generated);
          }
        }
      }
    }

    const generated = generatePlan(req.authUid!, body.input, {
      name: body.name,
      library,
      overrides,
    });

    if (!generated.ok) {
      res.status(422).json({
        error: {
          code: 'INFEASIBLE_BUDGET',
          message:
            'Your budget cannot cover the minimum local market cost for those settings.',
          requestId: req.requestId,
          details: generated.estimate,
        },
      });
      return;
    }

    const payload = generated.result;
    if (idempotencyKey) {
      idempotencyCache.set(`${req.authUid}:${idempotencyKey}`, {
        expiresAt: Date.now() + 5 * 60 * 1000,
        payload,
      });
    }

    res.status(201).json(payload);
  } catch (err) {
    next(err);
  }
});

// Get swap alternatives for a specific meal
plansRouter.post('/swap-options', requireAuth, (req, res, next) => {
  try {
    const schema = z.object({
      plan: z.custom<PlanDocument>(),
      meals: z.array(z.custom<PlannedMeal>()),
      mealId: z.string().min(1),
      overrides: z.record(z.string(), z.number().int().positive()).optional(),
      extraRecipes: z.array(z.custom<Recipe>()).optional(),
    });
    const body = schema.parse(req.body);
    const library = [...SEED_RECIPES_PH, ...(body.extraRecipes ?? [])];
    const alternatives = findSwapAlternatives(
      body.plan,
      body.meals,
      body.mealId,
      library,
      toOverrideMap(body.overrides)
    );
    res.json({ alternatives });
  } catch (err) {
    next(err);
  }
});

// Apply meal swap or recost after price override
plansRouter.post('/recost', requireAuth, (req, res, next) => {
  try {
    const schema = z.object({
      plan: z.custom<PlanDocument>(),
      meals: z.array(z.custom<PlannedMeal>()),
      mealId: z.string().nullable().default(null),
      newRecipeId: z.string().nullable().default(null),
      overrides: z.record(z.string(), z.number().int().positive()).optional(),
      extraRecipes: z.array(z.custom<Recipe>()).optional(),
    });
    const body = schema.parse(req.body);
    const library = [...SEED_RECIPES_PH, ...(body.extraRecipes ?? [])];
    const result = applyMealSwapOrRecost(
      body.plan,
      body.meals,
      body.mealId,
      body.newRecipeId,
      library,
      toOverrideMap(body.overrides)
    );
    if (!result.ok) {
      res.status(422).json({
        error: {
          code: 'SWAP_EXCEEDS_BUDGET',
          message: result.message,
          requestId: req.requestId,
        },
      });
      return;
    }
    res.json({
      plan: result.plan,
      meals: result.meals,
      grocery: result.grocery,
    });
  } catch (err) {
    next(err);
  }
});

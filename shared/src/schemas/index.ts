import { z } from 'zod';

export const canonicalUnitSchema = z.enum(['g', 'ml', 'pc']);

export const allergenSchema = z.enum([
  'shrimp',
  'fish',
  'egg',
  'soy',
  'peanut',
  'milk',
  'wheat',
]);

export const dietFlagSchema = z.enum([
  'none',
  'vegetarian',
  'pescatarian',
  'halal',
  'no_pork',
]);

export const equipmentIdSchema = z.enum([
  'gas_stove',
  'electric_stove',
  'induction',
  'rice_cooker',
  'microwave',
  'oven',
  'air_fryer',
  'pressure_cooker',
  'refrigerator',
  'freezer',
]);

export const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);

export const shoppingFrequencySchema = z.enum([
  'once',
  'weekly',
  'twice_weekly',
  'every_2_3_days',
]);

export const countryCodeSchema = z.enum(['PH', 'MY', 'JP', 'US']);
export const currencyCodeSchema = z.enum(['PHP', 'MYR', 'JPY', 'USD']);

export const planInputSchema = z.object({
  country: countryCodeSchema.default('PH'),
  region: z.string().min(1).max(60).default('NCR'),
  currency: currencyCodeSchema.default('PHP'),
  budgetMinor: z.number().int().min(10000).max(100000000),
  people: z.number().int().min(1).max(20),
  days: z.number().int().min(1).max(31),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealsPerDay: z.union([z.literal(2), z.literal(3)]),
  includeSnacks: z.boolean().default(false),
  mealTypes: z.array(mealTypeSchema).min(2).max(4),
  preferences: z.array(z.string().max(40)).max(12),
  allergens: z.array(allergenSchema).max(10),
  excludedIngredients: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(40)
        .transform((s) => s.replace(/[\u0000-\u001F\u007F<>`]/g, ''))
    )
    .max(25),
  diet: dietFlagSchema.default('none'),
  equipment: z.array(equipmentIdSchema).min(1).max(12),
  pantryItems: z.array(z.string().max(60)).max(30),
  shoppingFrequency: shoppingFrequencySchema.default('weekly'),
  seed: z.number().int().optional(),
});

export const aiRecipeGeneratedSchema = z.object({
  name: z.string().min(3).max(80),
  localName: z.string().min(2).max(80),
  description: z.string().min(10).max(240),
  mealTypes: z.array(mealTypeSchema).min(1).max(3),
  proteinTags: z.array(z.string().max(30)).max(5),
  equipmentRequired: z
    .array(
      z.enum([
        'stovetop',
        'gas_stove',
        'electric_stove',
        'induction',
        'rice_cooker',
        'microwave',
        'oven',
        'air_fryer',
        'pressure_cooker',
        'refrigerator',
        'freezer',
      ])
    )
    .min(1)
    .max(5),
  prepMin: z.number().int().min(2).max(90),
  cookMin: z.number().int().min(2).max(180),
  difficulty: z.enum(['easy', 'medium']),
  ingredients: z
    .array(
      z.object({
        ingredientId: z.string().min(2).max(60),
        qty: z.number().positive().max(3000),
        unit: canonicalUnitSchema,
        optional: z.boolean().optional(),
        note: z.string().max(60).optional(),
      })
    )
    .min(2)
    .max(16),
  steps: z.array(z.string().min(8).max(260)).min(3).max(12),
  tips: z.string().min(5).max(200),
  imagePrompt: z.string().min(10).max(300),
});

export const priceOverrideSchema = z.object({
  packPriceMinor: z.number().int().min(1).max(5000000),
});

export const feedbackSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(120),
  topic: z.enum(['pricing', 'recipe', 'bug', 'feature', 'general']),
  message: z.string().trim().min(10).max(1200),
});

export const waitlistSchema = z.object({
  email: z.string().trim().email().max(120),
  country: countryCodeSchema,
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
    details: z.unknown().optional(),
  }),
});

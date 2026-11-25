import { nanoid } from 'nanoid';
import {
  aiRecipeGeneratedSchema,
  INGREDIENT_MAP,
  type AllergenId,
  type CountryCode,
  type DietFlag,
  type Recipe,
} from '../../../../shared/src/index.ts';

export function sanitizeUserPromptText(input: string, maxLen = 120): string {
  return input
    .replace(/[\u0000-\u001F\u007F<>`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export function validateAndBuildGeneratedRecipe(
  raw: unknown,
  country: CountryCode,
  existingNames: string[]
): { ok: true; recipe: Recipe } | { ok: false; errors: string[] } {
  const parsed = aiRecipeGeneratedSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    };
  }

  const data = parsed.data;
  const errors: string[] = [];

  // Duplicate name check
  const lowerName = data.name.toLowerCase();
  if (existingNames.some((n) => n.toLowerCase() === lowerName)) {
    errors.push(`Recipe name "${data.name}" already exists in the library.`);
  }

  // Ingredient catalog & mass sanity checks (for 4 base servings)
  let totalGrams = 0;
  const allergens = new Set<AllergenId>();
  let totalKcal = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  for (const item of data.ingredients) {
    const ing = INGREDIENT_MAP.get(item.ingredientId);
    if (!ing) {
      errors.push(`Unknown ingredientId "${item.ingredientId}". Use catalog IDs only.`);
      continue;
    }
    if (ing.canonicalUnit !== item.unit) {
      errors.push(
        `Unit mismatch for "${item.ingredientId}": expected "${ing.canonicalUnit}", got "${item.unit}".`
      );
    }
    for (const a of ing.allergens) {
      allergens.add(a);
    }
    const grams =
      ing.canonicalUnit === 'pc'
        ? item.qty * (ing.gramsPerPiece ?? 50)
        : item.qty;
    totalGrams += grams;
    const factor = grams / 100;
    totalKcal += ing.nutritionPer100.kcal * factor;
    totalProtein += ing.nutritionPer100.proteinG * factor;
    totalCarbs += ing.nutritionPer100.carbsG * factor;
    totalFat += ing.nutritionPer100.fatG * factor;
  }

  const perServingGrams = totalGrams / 4;
  if (perServingGrams < 120 || perServingGrams > 950) {
    errors.push(
      `Per-serving total mass (${Math.round(perServingGrams)}g) is outside realistic 120g-950g range.`
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const hasPork = data.proteinTags.some((t) => t.toLowerCase() === 'pork');
  const hasMeat = data.proteinTags.some((t) =>
    ['pork', 'chicken', 'beef'].includes(t.toLowerCase())
  );
  const hasFish = data.proteinTags.some((t) =>
    ['fish', 'seafood'].includes(t.toLowerCase())
  );

  const dietFlags: DietFlag[] = ['none'];
  if (!hasPork) {
    dietFlags.push('no_pork', 'halal');
  }
  if (!hasMeat) {
    dietFlags.push('pescatarian');
  }
  if (!hasMeat && !hasFish) {
    dietFlags.push('vegetarian');
  }

  const id = `ai_${data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)}_${nanoid(5)}`;

  const recipe: Recipe = {
    id,
    slug: id,
    name: data.name,
    localName: data.localName,
    description: data.description,
    country,
    cuisineTags: ['filipino', 'ai-assisted'],
    mealTypes: data.mealTypes,
    proteinTags: data.proteinTags,
    equipmentRequired: data.equipmentRequired,
    allergens: Array.from(allergens),
    dietFlags,
    baseServings: 4,
    prepMin: data.prepMin,
    cookMin: data.cookMin,
    difficulty: data.difficulty,
    ingredients: data.ingredients,
    steps: data.steps,
    tips: data.tips,
    nutritionPerServing: {
      kcal: Math.round(totalKcal / 4),
      proteinG: Math.round(totalProtein / 4),
      carbsG: Math.round(totalCarbs / 4),
      fatG: Math.round(totalFat / 4),
    },
    image: {
      status: 'ready',
      promptVersion: 'svg-fallback',
    },
    status: 'unreviewed',
    source: 'ai',
    qualityScore: 80,
    version: 1,
    accentTone: 'clay',
  };

  return { ok: true, recipe };
}

import {
  hasRequiredEquipment,
  INGREDIENT_MAP,
  SEED_RECIPES_PH,
  type MealType,
  type PlanInput,
  type Recipe,
} from '../../../../shared/src/index.ts';

export function filterCandidateRecipes(
  input: PlanInput,
  library: Recipe[] = SEED_RECIPES_PH
): Record<MealType, Recipe[]> {
  const excludedTokens = input.excludedIngredients
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const bannedAllergens = new Set(input.allergens);

  const valid = library.filter((recipe) => {
    if (recipe.country !== input.country) return false;
    if (recipe.status === 'rejected') return false;
    if (!hasRequiredEquipment(input.equipment, recipe.equipmentRequired)) {
      return false;
    }

    // Hard allergen check from catalog + recipe
    for (const allergen of recipe.allergens) {
      if (bannedAllergens.has(allergen)) return false;
    }
    for (const ri of recipe.ingredients) {
      const ing = INGREDIENT_MAP.get(ri.ingredientId);
      if (!ing) continue;
      if (ing.allergens.some((a) => bannedAllergens.has(a))) return false;
      if (excludedTokens.length > 0) {
        const hay = `${ing.id} ${ing.names.en} ${ing.names.local}`.toLowerCase();
        if (excludedTokens.some((tok) => hay.includes(tok))) return false;
      }
    }

    // Hard diet check
    if (input.diet !== 'none' && !recipe.dietFlags.includes(input.diet)) {
      return false;
    }

    return true;
  });

  const byType: Record<MealType, Recipe[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };

  for (const r of valid) {
    for (const mt of r.mealTypes) {
      byType[mt].push(r);
    }
  }

  return byType;
}

export function scoreRecipePreferences(recipe: Recipe, input: PlanInput): number {
  if (input.preferences.length === 0) return 1;
  const prefs = new Set(input.preferences.map((p) => p.toLowerCase()));
  let hits = 0;
  for (const tag of recipe.proteinTags) {
    if (prefs.has(tag.toLowerCase())) hits += 1;
  }
  return 1 + hits * 2;
}

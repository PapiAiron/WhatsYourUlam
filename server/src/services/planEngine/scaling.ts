import {
  INGREDIENT_MAP,
  roundPracticalQty,
  type CanonicalUnit,
  type Recipe,
} from '../../../../shared/src/index.ts';

export interface ScaledIngredient {
  ingredientId: string;
  name: string;
  qty: number;
  unit: CanonicalUnit;
}

const SEASONING_IDS = new Set(['salt', 'black-pepper', 'bay-leaf']);

export function scaleRecipeIngredients(
  recipe: Recipe,
  people: number
): ScaledIngredient[] {
  const factor = people / (recipe.baseServings || 4);

  return recipe.ingredients.map((item) => {
    const ing = INGREDIENT_MAP.get(item.ingredientId);
    let scaled = roundPracticalQty(item.qty * factor, item.unit);
    if (SEASONING_IDS.has(item.ingredientId) && scaled < 1) {
      scaled = 1;
    }
    return {
      ingredientId: item.ingredientId,
      name: ing?.names.en ?? item.ingredientId,
      qty: scaled,
      unit: item.unit,
    };
  });
}

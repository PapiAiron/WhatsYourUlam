import { nanoid } from 'nanoid';
import {
  ENGINE_VERSION,
  SEED_RECIPES_PH,
  type EstimateResult,
  type GroceryItem,
  type PlanDocument,
  type PlannedMeal,
  type PlanInput,
  type Recipe,
} from '../../../../shared/src/index.ts';
import { filterCandidateRecipes } from './candidates.ts';
import { computeDailyNutritionAverage } from './nutrition.ts';
import { computeCostedPlan, type SelectedSlot } from './packing.ts';
import { estimateRecipeRawCostMinor, solveMealSlots } from './solver.ts';
import { buildTripWindows, isRecipeFreshForDayOffset } from './trips.ts';

export interface GeneratedPlanResult {
  plan: PlanDocument;
  meals: PlannedMeal[];
  grocery: GroceryItem[];
}

export function estimatePlan(
  input: PlanInput,
  library: Recipe[] = SEED_RECIPES_PH,
  overrides: Map<string, number> = new Map()
): EstimateResult {
  const solved = solveMealSlots(input, library, overrides);

  let fit: EstimateResult['fit'] = 'infeasible';
  if (solved.feasible) {
    if (input.budgetMinor >= solved.generousBudgetMinor) {
      fit = 'generous';
    } else if (input.budgetMinor >= solved.typicalBudgetMinor) {
      fit = 'comfortable';
    } else {
      fit = 'tight';
    }
  }

  return {
    feasible: solved.feasible,
    minimumBudgetMinor: solved.minimumBudgetMinor,
    typicalBudgetMinor: solved.typicalBudgetMinor,
    generousBudgetMinor: solved.generousBudgetMinor,
    fit,
    warnings: solved.warnings,
    adjustments: solved.adjustments,
  };
}

export function generatePlan(
  uid: string,
  input: PlanInput,
  options?: {
    planId?: string;
    name?: string;
    library?: Recipe[];
    overrides?: Map<string, number>;
  }
): {
  ok: true;
  result: GeneratedPlanResult;
} | {
  ok: false;
  estimate: EstimateResult;
} {
  const library = options?.library ?? SEED_RECIPES_PH;
  const overrides = options?.overrides ?? new Map<string, number>();

  const solved = solveMealSlots(input, library, overrides);
  if (!solved.feasible) {
    return {
      ok: false,
      estimate: {
        feasible: false,
        minimumBudgetMinor: solved.minimumBudgetMinor,
        typicalBudgetMinor: solved.typicalBudgetMinor,
        generousBudgetMinor: solved.generousBudgetMinor,
        fit: 'infeasible',
        warnings: solved.warnings,
        adjustments: solved.adjustments,
      },
    };
  }

  const { trips } = buildTripWindows(input);
  const costed = computeCostedPlan(solved.slots, input, trips, overrides);

  const meals: PlannedMeal[] = solved.slots.map((slot) => {
    const slotKey = `${slot.day}_${slot.mealType}`;
    const breakdown = costed.mealBreakdowns.get(slotKey)!;
    return {
      id: `d${slot.day}_${slot.mealType}`,
      day: slot.day,
      mealType: slot.mealType,
      recipeId: slot.recipe.id,
      recipeSnapshot: {
        name: slot.recipe.name,
        localName: slot.recipe.localName,
        thumbUrl: slot.recipe.image.thumbUrl,
        imageUrl: slot.recipe.image.url,
        lqip: slot.recipe.image.lqip,
        prepMin: slot.recipe.prepMin,
        cookMin: slot.recipe.cookMin,
        equipment: slot.recipe.equipmentRequired,
        accentTone: slot.recipe.accentTone,
      },
      servings: input.people,
      ingredients: breakdown.ingredients,
      costMinor: breakdown.costMinor,
      kcalPerPerson: slot.recipe.nutritionPerServing.kcal,
      proteinGPerPerson: slot.recipe.nutritionPerServing.proteinG,
      swapped: false,
      cooked: false,
    };
  });

  const { nutritionAvg, lowCalorieWarning } = computeDailyNutritionAverage(
    meals,
    input.days
  );
  const warnings = [...solved.warnings];
  if (lowCalorieWarning) {
    warnings.push(
      'This budget is tight; we prioritized filling, nutritious staples. Nutrition estimates are approximate and not medical advice.'
    );
  }

  const shoppingTotalMinor = costed.shoppingTotalMinor;
  const consumedMinor = costed.consumedMinor;
  const leftoverValueMinor = Math.max(0, shoppingTotalMinor - consumedMinor);
  const remainingMinor = input.budgetMinor - shoppingTotalMinor;
  const utilizationPct = Math.min(
    100,
    Math.round((shoppingTotalMinor / Math.max(1, input.budgetMinor)) * 100)
  );
  const avgMealMinor =
    meals.length > 0 ? Math.round(consumedMinor / meals.length) : 0;

  const now = new Date().toISOString();
  const planId = options?.planId ?? `plan_${nanoid(10)}`;
  const defaultName = `${input.days}-Day ${input.region} Plan (${input.people} ${input.people === 1 ? 'person' : 'people'})`;

  const plan: PlanDocument = {
    id: planId,
    uid,
    name: options?.name ?? defaultName,
    status: 'ready',
    progress: { stage: 'Done', pct: 100 },
    input,
    summary: {
      budgetMinor: input.budgetMinor,
      shoppingTotalMinor,
      consumedMinor,
      leftoverValueMinor,
      remainingMinor,
      utilizationPct,
      perDayMinor: costed.perDayMinor,
      avgMealMinor,
      nutritionAvg,
      tripCount: trips.length,
    },
    warnings,
    isSaved: true,
    shareId: null,
    createdAt: now,
    updatedAt: now,
    engineVersion: ENGINE_VERSION,
  };

  return {
    ok: true,
    result: {
      plan,
      meals,
      grocery: costed.grocery,
    },
  };
}

export interface SwapAlternative {
  recipe: Recipe;
  estimatedMealCostMinor: number;
  deltaMinor: number;
  projectedShoppingTotalMinor: number;
  fitsBudget: boolean;
}

export function findSwapAlternatives(
  plan: PlanDocument,
  currentMeals: PlannedMeal[],
  targetMealId: string,
  library: Recipe[] = SEED_RECIPES_PH,
  overrides: Map<string, number> = new Map()
): SwapAlternative[] {
  const targetMeal = currentMeals.find((m) => m.id === targetMealId);
  if (!targetMeal) return [];

  const candidates = filterCandidateRecipes(plan.input, library)[targetMeal.mealType];
  const { trips } = buildTripWindows(plan.input);
  const trip = trips.find(
    (t) => targetMeal.day >= t.dayStart && targetMeal.day <= t.dayEnd
  ) ?? trips[0];
  const dayOffset = targetMeal.day - trip.dayStart;

  const recipeMap = new Map(library.map((r) => [r.id, r]));
  const baseSlots: SelectedSlot[] = currentMeals.map((m) => ({
    day: m.day,
    mealType: m.mealType,
    recipe: recipeMap.get(m.recipeId) ?? library[0],
  }));

  const alternatives: SwapAlternative[] = [];
  for (const cand of candidates) {
    if (cand.id === targetMeal.recipeId) continue;
    if (!isRecipeFreshForDayOffset(cand, dayOffset, plan.input)) continue;

    const trialSlots = baseSlots.map((s) =>
      s.day === targetMeal.day && s.mealType === targetMeal.mealType
        ? { ...s, recipe: cand }
        : s
    );
    const trialCosted = computeCostedPlan(trialSlots, plan.input, trips, overrides);
    const estCost = estimateRecipeRawCostMinor(cand, plan.input, overrides);
    const fitsBudget = trialCosted.shoppingTotalMinor <= plan.input.budgetMinor;

    alternatives.push({
      recipe: cand,
      estimatedMealCostMinor: estCost,
      deltaMinor: estCost - targetMeal.costMinor,
      projectedShoppingTotalMinor: trialCosted.shoppingTotalMinor,
      fitsBudget,
    });
  }

  // Sort: fits budget first, then closest to +/-10% cost delta
  alternatives.sort((a, b) => {
    if (a.fitsBudget !== b.fitsBudget) return a.fitsBudget ? -1 : 1;
    return Math.abs(a.deltaMinor) - Math.abs(b.deltaMinor);
  });

  return alternatives.slice(0, 5);
}

export function applyMealSwapOrRecost(
  plan: PlanDocument,
  currentMeals: PlannedMeal[],
  targetMealId: string | null,
  newRecipeId: string | null,
  library: Recipe[] = SEED_RECIPES_PH,
  overrides: Map<string, number> = new Map()
): {
  ok: true;
  plan: PlanDocument;
  meals: PlannedMeal[];
  grocery: GroceryItem[];
} | {
  ok: false;
  message: string;
} {
  const recipeMap = new Map(library.map((r) => [r.id, r]));
  const { trips } = buildTripWindows(plan.input);

  const slots: SelectedSlot[] = currentMeals.map((m) => {
    const rid =
      targetMealId && newRecipeId && m.id === targetMealId ? newRecipeId : m.recipeId;
    const recipe = recipeMap.get(rid) ?? library[0];
    return { day: m.day, mealType: m.mealType, recipe };
  });

  const costed = computeCostedPlan(slots, plan.input, trips, overrides);
  if (
    targetMealId &&
    newRecipeId &&
    costed.shoppingTotalMinor > plan.input.budgetMinor
  ) {
    return {
      ok: false,
      message: 'That swap would push your shopping total over budget.',
    };
  }

  const meals: PlannedMeal[] = currentMeals.map((m) => {
    const isSwappedTarget = Boolean(targetMealId && newRecipeId && m.id === targetMealId);
    const rid = isSwappedTarget ? newRecipeId! : m.recipeId;
    const recipe = recipeMap.get(rid) ?? library[0];
    const slotKey = `${m.day}_${m.mealType}`;
    const breakdown = costed.mealBreakdowns.get(slotKey)!;

    return {
      ...m,
      recipeId: recipe.id,
      recipeSnapshot: {
        name: recipe.name,
        localName: recipe.localName,
        thumbUrl: recipe.image.thumbUrl,
        imageUrl: recipe.image.url,
        lqip: recipe.image.lqip,
        prepMin: recipe.prepMin,
        cookMin: recipe.cookMin,
        equipment: recipe.equipmentRequired,
        accentTone: recipe.accentTone,
      },
      ingredients: breakdown.ingredients,
      costMinor: breakdown.costMinor,
      kcalPerPerson: recipe.nutritionPerServing.kcal,
      proteinGPerPerson: recipe.nutritionPerServing.proteinG,
      swapped: isSwappedTarget ? true : m.swapped,
    };
  });

  const { nutritionAvg } = computeDailyNutritionAverage(meals, plan.input.days);
  const shoppingTotalMinor = costed.shoppingTotalMinor;
  const consumedMinor = costed.consumedMinor;

  const updatedPlan: PlanDocument = {
    ...plan,
    summary: {
      ...plan.summary,
      shoppingTotalMinor,
      consumedMinor,
      leftoverValueMinor: Math.max(0, shoppingTotalMinor - consumedMinor),
      remainingMinor: plan.input.budgetMinor - shoppingTotalMinor,
      utilizationPct: Math.min(
        100,
        Math.round((shoppingTotalMinor / Math.max(1, plan.input.budgetMinor)) * 100)
      ),
      perDayMinor: costed.perDayMinor,
      avgMealMinor: meals.length > 0 ? Math.round(consumedMinor / meals.length) : 0,
      nutritionAvg,
      tripCount: trips.length,
    },
    updatedAt: new Date().toISOString(),
  };

  return {
    ok: true,
    plan: updatedPlan,
    meals,
    grocery: costed.grocery,
  };
}

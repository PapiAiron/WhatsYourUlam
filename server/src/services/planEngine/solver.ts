import {
  getSeedPriceBookForRegion,
  prorateMinor,
  type FeasibilityAdjustment,
  type MealType,
  type PlanInput,
  type Recipe,
} from '../../../../shared/src/index.ts';
import { filterCandidateRecipes, scoreRecipePreferences } from './candidates.ts';
import {
  computeShoppingTotalFast,
  resolveIngredientPacks,
  type SelectedSlot,
} from './packing.ts';
import { scaleRecipeIngredients } from './scaling.ts';
import { buildTripWindows, isRecipeFreshForDayOffset } from './trips.ts';

export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function estimateRecipeRawCostMinor(
  recipe: Recipe,
  input: PlanInput,
  overrides: Map<string, number>
): number {
  const priceBook = getSeedPriceBookForRegion(input.region);
  const pantrySet = new Set(input.pantryItems);
  const scaled = scaleRecipeIngredients(recipe, input.people);
  let total = 0;
  for (const item of scaled) {
    if (pantrySet.has(item.ingredientId)) continue;
    const { packs } = resolveIngredientPacks(item.ingredientId, priceBook, overrides);
    total += prorateMinor(item.qty, packs[0].size, packs[0].priceMinor);
  }
  return total;
}

export function getSlotTypesForInput(input: PlanInput): MealType[] {
  const base: MealType[] =
    input.mealsPerDay === 2
      ? input.mealTypes.filter((m) => m !== 'snack').slice(0, 2)
      : ['breakfast', 'lunch', 'dinner'];

  const slots = base.length >= 2 ? base : (['lunch', 'dinner'] as MealType[]);
  if (input.includeSnacks && !slots.includes('snack')) {
    return [...slots, 'snack'];
  }
  return slots;
}

export function solveMealSlots(
  input: PlanInput,
  library: Recipe[],
  overrides: Map<string, number> = new Map()
): {
  feasible: boolean;
  slots: SelectedSlot[];
  minimumBudgetMinor: number;
  typicalBudgetMinor: number;
  generousBudgetMinor: number;
  warnings: string[];
  adjustments: FeasibilityAdjustment[];
} {
  const candidatesByType = filterCandidateRecipes(input, library);
  const slotTypes = getSlotTypesForInput(input);
  const { trips, noFridgeAdjusted } = buildTripWindows(input);
  const rng = createSeededRng(input.seed ?? 20261126);

  const warnings: string[] = [];
  if (noFridgeAdjusted) {
    warnings.push(
      'No refrigerator selected: shopping trips are spaced every 2 days so fresh meat and fish stay safe.'
    );
  }

  // Verify every required meal type has at least 1 candidate
  for (const mt of slotTypes) {
    const pool = candidatesByType[mt];
    if (!pool || pool.length === 0) {
      return {
        feasible: false,
        slots: [],
        minimumBudgetMinor: input.budgetMinor + 100000,
        typicalBudgetMinor: input.budgetMinor + 200000,
        generousBudgetMinor: input.budgetMinor + 300000,
        warnings: [
          `No recipes match all your filters for ${mt}. Try relaxing an allergen, equipment, or diet restriction.`,
        ],
        adjustments: [
          {
            id: 'relax-diet',
            label: 'Remove strict diet filter',
            description: 'Include all protein and vegetable dishes.',
            patch: { diet: 'none' },
          },
          {
            id: 'fewer-meals',
            label: 'Switch to 2 meals per day',
            description: 'Plan lunch and dinner only.',
            patch: { mealsPerDay: 2, includeSnacks: false, mealTypes: ['lunch', 'dinner'] },
          },
        ],
      };
    }
  }

  // Precompute estimated costs & preference scores
  const costCache = new Map<string, number>();
  const scoreCache = new Map<string, number>();
  for (const mt of slotTypes) {
    for (const r of candidatesByType[mt]) {
      costCache.set(r.id, estimateRecipeRawCostMinor(r, input, overrides));
      scoreCache.set(r.id, scoreRecipePreferences(r, input));
    }
  }

  const sortedByCheapest: Record<MealType, Recipe[]> = {
    breakfast: [...candidatesByType.breakfast].sort(
      (a, b) => (costCache.get(a.id) ?? 0) - (costCache.get(b.id) ?? 0)
    ),
    lunch: [...candidatesByType.lunch].sort(
      (a, b) => (costCache.get(a.id) ?? 0) - (costCache.get(b.id) ?? 0)
    ),
    dinner: [...candidatesByType.dinner].sort(
      (a, b) => (costCache.get(a.id) ?? 0) - (costCache.get(b.id) ?? 0)
    ),
    snack: [...candidatesByType.snack].sort(
      (a, b) => (costCache.get(a.id) ?? 0) - (costCache.get(b.id) ?? 0)
    ),
  };

  // Map day -> trip startDay for freshness checks
  const dayStartMap = new Map<number, number>();
  for (const t of trips) {
    for (let d = t.dayStart; d <= t.dayEnd; d += 1) {
      dayStartMap.set(d, t.dayStart);
    }
  }

  // Helper: pick valid candidate avoiding 3-day repeats where possible
  function pickInitialCheapest(
    mt: MealType,
    day: number,
    recentByType: Map<string, number>
  ): Recipe {
    const pool = sortedByCheapest[mt];
    const dayOffset = day - (dayStartMap.get(day) ?? day);
    const freshPool = pool.filter((r) => isRecipeFreshForDayOffset(r, dayOffset, input));
    const usable = freshPool.length > 0 ? freshPool : pool;

    // Pick cheapest recipe not used in last 3 days (if pool allows)
    const nonRepeat = usable.filter((r) => {
      const lastDay = recentByType.get(r.id);
      return lastDay === undefined || day - lastDay >= 3;
    });
    const candidates = nonRepeat.length > 0 ? nonRepeat : usable;
    // Pick cheapest (with tiny tie-break variety among top 2 cheapest if cost within 8%)
    return candidates[0];
  }

  // Build cheapest feasible baseline
  const slots: SelectedSlot[] = [];
  const lastUsed = new Map<string, number>();

  for (let day = 1; day <= input.days; day += 1) {
    for (const mt of slotTypes) {
      const chosen = pickInitialCheapest(mt, day, lastUsed);
      lastUsed.set(chosen.id, day);
      slots.push({ day, mealType: mt, recipe: chosen });
    }
  }

  const priceBook = getSeedPriceBookForRegion(input.region);
  const pantrySet = new Set(input.pantryItems);
  const scaledCache = new Map<string, ReturnType<typeof scaleRecipeIngredients>>();

  let currentShoppingTotal = computeShoppingTotalFast(
    slots,
    input,
    trips,
    priceBook,
    pantrySet,
    scaledCache,
    overrides
  );
  let minimumBudgetMinor = currentShoppingTotal;

  // If even the cheapest varied assignment exceeds budget, try absolute minimum (ignoring 3-day repeat)
  if (minimumBudgetMinor > input.budgetMinor) {
    const ultraCheapSlots: SelectedSlot[] = [];
    for (let day = 1; day <= input.days; day += 1) {
      const dayOffset = day - (dayStartMap.get(day) ?? day);
      for (const mt of slotTypes) {
        const pool = sortedByCheapest[mt];
        const fresh = pool.filter((r) => isRecipeFreshForDayOffset(r, dayOffset, input));
        const r = fresh[0] ?? pool[0];
        ultraCheapSlots.push({ day, mealType: mt, recipe: r });
      }
    }
    const ultraTotal = computeShoppingTotalFast(
      ultraCheapSlots,
      input,
      trips,
      priceBook,
      pantrySet,
      scaledCache,
      overrides
    );
    minimumBudgetMinor = Math.min(minimumBudgetMinor, ultraTotal);

    if (ultraTotal <= input.budgetMinor) {
      slots.splice(0, slots.length, ...ultraCheapSlots);
      currentShoppingTotal = ultraTotal;
    } else {
      const adjustments: FeasibilityAdjustment[] = [];
      if (input.days > 3) {
        const ratio = input.budgetMinor / Math.max(1, minimumBudgetMinor);
        const suggestedDays = Math.max(1, Math.floor(input.days * ratio * 0.92));
        adjustments.push({
          id: 'reduce-days',
          label: `Plan ${suggestedDays} days instead of ${input.days}`,
          description: `Fits your current budget without raising your spend.`,
          patch: { days: suggestedDays },
        });
      }
      if (input.mealsPerDay === 3) {
        adjustments.push({
          id: 'two-meals',
          label: 'Switch to 2 meals per day',
          description: 'Plan lunch and dinner while covering breakfast at home.',
          patch: { mealsPerDay: 2, includeSnacks: false, mealTypes: ['lunch', 'dinner'] },
        });
      }
      adjustments.push({
        id: 'raise-budget',
        label: `Increase budget to minimum`,
        description: `Set budget to cover ${input.days} days for ${input.people} ${input.people === 1 ? 'person' : 'people'}.`,
        patch: { budgetMinor: Math.ceil(minimumBudgetMinor / 5000) * 5000 },
      });

      const typicalBudgetMinor = Math.round(minimumBudgetMinor * 1.35);
      const generousBudgetMinor = Math.round(minimumBudgetMinor * 1.75);

      return {
        feasible: false,
        slots: [],
        minimumBudgetMinor,
        typicalBudgetMinor,
        generousBudgetMinor,
        warnings,
        adjustments,
      };
    }
  }

  // Compute typical & generous benchmarks using median & upper quartile candidates
  const medianSlots: SelectedSlot[] = slots.map((s) => {
    const pool = sortedByCheapest[s.mealType];
    const mid = pool[Math.floor(pool.length * 0.5)] ?? s.recipe;
    return { ...s, recipe: mid };
  });
  const medianCost = computeShoppingTotalFast(
    medianSlots,
    input,
    trips,
    priceBook,
    pantrySet,
    scaledCache,
    overrides
  );
  const typicalBudgetMinor = Math.max(Math.round(minimumBudgetMinor * 1.25), medianCost);
  const generousBudgetMinor = Math.round(typicalBudgetMinor * 1.35);

  // Upgrade & variety local search pass (fast cached search, targeting 92-100% budget utilization)
  const targetMin = Math.round(input.budgetMinor * 0.92);
  let bestSlots = [...slots];
  let bestShoppingTotal = currentShoppingTotal;
  let bestFitness = computePlanFitness(bestSlots, bestShoppingTotal, input, scoreCache);

  const iterations = Math.min(420, Math.max(180, slots.length * 10));
  let staleIters = 0;
  for (let iter = 0; iter < iterations; iter += 1) {
    const idx = Math.floor(rng() * bestSlots.length);
    const currentSlot = bestSlots[idx];
    const pool = candidatesByType[currentSlot.mealType];
    if (pool.length <= 1) continue;

    const dayOffset = currentSlot.day - (dayStartMap.get(currentSlot.day) ?? currentSlot.day);
    const freshPool = pool.filter((r) => isRecipeFreshForDayOffset(r, dayOffset, input));
    const usable = freshPool.length > 0 ? freshPool : pool;

    // Bias slightly toward richer dishes when well under target utilization
    const underTarget = bestShoppingTotal < targetMin;
    const candidate =
      underTarget && rng() < 0.45
        ? usable[Math.floor((0.4 + 0.6 * rng()) * usable.length)] ?? usable[0]
        : usable[Math.floor(rng() * usable.length)];
    if (candidate.id === currentSlot.recipe.id) continue;

    // Enforce 3-day no-repeat window when pool has >= 3 options
    if (usable.length >= 3) {
      const hasNearbyRepeat = bestSlots.some(
        (other, j) =>
          j !== idx &&
          other.recipe.id === candidate.id &&
          Math.abs(other.day - currentSlot.day) < 3
      );
      if (hasNearbyRepeat) continue;
    }

    const trialSlots = [...bestSlots];
    trialSlots[idx] = { ...currentSlot, recipe: candidate };
    const trialShoppingTotal = computeShoppingTotalFast(
      trialSlots,
      input,
      trips,
      priceBook,
      pantrySet,
      scaledCache,
      overrides
    );

    if (trialShoppingTotal > input.budgetMinor) {
      staleIters += 1;
      continue;
    }

    const trialFitness = computePlanFitness(
      trialSlots,
      trialShoppingTotal,
      input,
      scoreCache
    );

    if (trialFitness > bestFitness) {
      bestSlots = trialSlots;
      bestShoppingTotal = trialShoppingTotal;
      bestFitness = trialFitness;
      staleIters = 0;
    } else {
      staleIters += 1;
    }

    if (bestShoppingTotal >= targetMin && staleIters >= 80 && iter >= 160) {
      break;
    }
  }

  return {
    feasible: true,
    slots: bestSlots,
    minimumBudgetMinor,
    typicalBudgetMinor,
    generousBudgetMinor,
    warnings,
    adjustments: [],
  };
}

function computePlanFitness(
  slots: SelectedSlot[],
  shoppingTotalMinor: number,
  input: PlanInput,
  scoreCache: Map<string, number>
): number {
  let prefScore = 0;
  const uniqueIds = new Set<string>();
  const dinnerProteins = new Map<string, number>();
  let dinnerCount = 0;
  const vegDays = new Set<number>();

  for (const s of slots) {
    prefScore += scoreCache.get(s.recipe.id) ?? 1;
    uniqueIds.add(s.recipe.id);
    if (s.recipe.proteinTags.includes('vegetables') || s.recipe.proteinTags.includes('vegetarian')) {
      vegDays.add(s.day);
    }
    if (s.mealType === 'dinner') {
      dinnerCount += 1;
      for (const p of s.recipe.proteinTags) {
        dinnerProteins.set(p, (dinnerProteins.get(p) ?? 0) + 1);
      }
    }
  }

  // Penalize dinner protein dominance > 40% if user has multiple preferences
  let proteinBalanceBonus = 0;
  if (input.preferences.length !== 1 && dinnerCount >= 3) {
    const maxProteinShare = Math.max(0, ...dinnerProteins.values()) / dinnerCount;
    if (maxProteinShare <= 0.45) proteinBalanceBonus += 15;
  }

  const utilizationRatio = shoppingTotalMinor / Math.max(1, input.budgetMinor);
  const utilizationBonus = utilizationRatio * 35;
  const varietyBonus = uniqueIds.size * 4;
  const vegBonus = vegDays.size * 2;

  return prefScore + varietyBonus + vegBonus + proteinBalanceBonus + utilizationBonus;
}

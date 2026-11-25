import { describe, expect, it } from 'vitest';
import {
  formatMoney,
  SEED_RECIPES_PH,
  type PlanInput,
} from '../../shared/src/index.ts';
import {
  applyMealSwapOrRecost,
  estimatePlan,
  findSwapAlternatives,
  generatePlan,
} from '../src/services/planEngine/index.ts';

function makeBaseInput(overrides?: Partial<PlanInput>): PlanInput {
  return {
    country: 'PH',
    region: 'NCR',
    currency: 'PHP',
    budgetMinor: 500000, // ₱5,000
    people: 4,
    days: 14,
    startDate: '2026-11-26',
    mealsPerDay: 3,
    includeSnacks: false,
    mealTypes: ['breakfast', 'lunch', 'dinner'],
    preferences: ['chicken', 'vegetables', 'fish'],
    allergens: [],
    excludedIngredients: [],
    diet: 'none',
    equipment: ['gas_stove', 'rice_cooker', 'refrigerator'],
    pantryItems: ['salt', 'cooking-oil'],
    shoppingFrequency: 'weekly',
    seed: 42,
    ...overrides,
  };
}

describe('formatMoney', () => {
  it('formats PHP minor units with peso symbol and 2 decimal digits', () => {
    expect(formatMoney(500000, 'PHP', 'en-PH')).toContain('5,000.00');
  });

  it('respects zero decimal currencies like JPY', () => {
    const out = formatMoney(2500, 'JPY', 'ja-JP');
    expect(out).not.toContain('.00');
  });
});

describe('Meal Plan Engine', () => {
  it('generates a deterministic 14-day ₱5,000 plan strictly within budget', () => {
    const input = makeBaseInput();
    const res1 = generatePlan('u_test', input);
    const res2 = generatePlan('u_test', input);

    expect(res1.ok).toBe(true);
    expect(res2.ok).toBe(true);
    if (!res1.ok || !res2.ok) return;

    expect(res1.result.plan.summary.shoppingTotalMinor).toBeLessThanOrEqual(
      input.budgetMinor
    );
    expect(res1.result.meals.length).toBe(14 * 3);
    expect(
      res1.result.plan.summary.shoppingTotalMinor
    ).toEqual(res2.result.plan.summary.shoppingTotalMinor);
    expect(
      res1.result.plan.summary.consumedMinor +
        res1.result.plan.summary.leftoverValueMinor
    ).toBeGreaterThanOrEqual(res1.result.plan.summary.shoppingTotalMinor);
  });

  it('never exceeds budget across 120 randomized feasible scenarios', () => {
    for (let i = 0; i < 120; i += 1) {
      const days = [3, 7, 10, 14][i % 4];
      const people = [1, 2, 4, 6][i % 4];
      const mealsPerDay = i % 3 === 0 ? 2 : 3;
      const mealTypes =
        mealsPerDay === 2
          ? (['lunch', 'dinner'] as const)
          : (['breakfast', 'lunch', 'dinner'] as const);
      const budgetMinor = days * people * (mealsPerDay === 2 ? 12000 : 16500);
      const input = makeBaseInput({
        days,
        people,
        mealsPerDay,
        mealTypes: [...mealTypes],
        budgetMinor,
        seed: 100 + i,
      });

      const res = generatePlan('u_rand', input);
      if (res.ok) {
        expect(res.result.plan.summary.shoppingTotalMinor).toBeLessThanOrEqual(
          budgetMinor
        );
        expect(Number.isInteger(res.result.plan.summary.shoppingTotalMinor)).toBe(
          true
        );
      }
    }
  });

  it('detects infeasible tight budgets and returns actionable adjustments', () => {
    const input = makeBaseInput({
      budgetMinor: 35000, // ₱350 for 4 people × 14 days
      days: 14,
      people: 4,
    });
    const est = estimatePlan(input, SEED_RECIPES_PH);
    expect(est.feasible).toBe(false);
    expect(est.fit).toBe('infeasible');
    expect(est.minimumBudgetMinor).toBeGreaterThan(35000);
    expect(est.adjustments.length).toBeGreaterThan(0);

    const gen = generatePlan('u_tight', input);
    expect(gen.ok).toBe(false);
  });

  it('enforces no-refrigerator trip splitting and freshness rules', () => {
    const input = makeBaseInput({
      days: 7,
      equipment: ['gas_stove', 'rice_cooker'], // NO refrigerator or freezer
      shoppingFrequency: 'once',
    });
    const res = generatePlan('u_nofridge', input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.result.plan.summary.tripCount).toBeGreaterThanOrEqual(3);
    expect(
      res.result.plan.warnings.some((w) =>
        w.toLowerCase().includes('no refrigerator')
      )
    ).toBe(true);
  });

  it('enforces hard allergen and no-pork diet filters', () => {
    const input = makeBaseInput({
      days: 5,
      allergens: ['shrimp', 'fish'],
      diet: 'no_pork',
    });
    const res = generatePlan('u_allergy', input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const recipeMap = new Map(SEED_RECIPES_PH.map((r) => [r.id, r]));
    for (const m of res.result.meals) {
      const r = recipeMap.get(m.recipeId)!;
      expect(r.allergens).not.toContain('shrimp');
      expect(r.allergens).not.toContain('fish');
      expect(r.dietFlags).toContain('no_pork');
    }
  });

  it('keeps total shopping cost within budget after swapping a meal', () => {
    const input = makeBaseInput({ days: 5, budgetMinor: 250000 });
    const res = generatePlan('u_swap', input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const target = res.result.meals[1];
    const alts = findSwapAlternatives(res.result.plan, res.result.meals, target.id);
    const validAlt = alts.find((a) => a.fitsBudget);
    expect(validAlt).toBeDefined();

    if (validAlt) {
      const swapped = applyMealSwapOrRecost(
        res.result.plan,
        res.result.meals,
        target.id,
        validAlt.recipe.id
      );
      expect(swapped.ok).toBe(true);
      if (swapped.ok) {
        expect(swapped.plan.summary.shoppingTotalMinor).toBeLessThanOrEqual(
          input.budgetMinor
        );
      }
    }
  });
});

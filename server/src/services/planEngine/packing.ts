import {
  getSeedPriceBookForRegion,
  INGREDIENT_MAP,
  prorateMinor,
  type AisleCategory,
  type GroceryItem,
  type MealIngredientCost,
  type PlanInput,
  type PriceBookEntry,
  type PricePack,
  type PriceSource,
  type Recipe,
} from '../../../../shared/src/index.ts';
import { scaleRecipeIngredients } from './scaling.ts';
import type { ShoppingTripWindow } from './trips.ts';

export interface SelectedSlot {
  day: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe: Recipe;
}

interface PackSelection {
  pack: PricePack;
  packsToBuy: number;
  totalQtyBought: number;
  lineTotalMinor: number;
  effectiveUnitPriceMinor: number;
  source: PriceSource;
}

export function resolveIngredientPacks(
  ingredientId: string,
  priceBook: Map<string, PriceBookEntry>,
  overrides: Map<string, number>
): { packs: PricePack[]; source: PriceSource } {
  const entry = priceBook.get(ingredientId);
  const overridePrice = overrides.get(ingredientId);

  if (!entry || entry.packs.length === 0) {
    const fallbackSize = 250;
    const fallbackPrice = overridePrice ?? 3500;
    return {
      packs: [{ label: '250 g est.', size: fallbackSize, unit: 'g', priceMinor: fallbackPrice }],
      source: overridePrice !== undefined ? 'user' : 'estimate',
    };
  }

  if (overridePrice !== undefined) {
    // Override applies to the primary pack (first pack) and scales others proportionally
    const basePack = entry.packs[0];
    const ratio = overridePrice / Math.max(1, basePack.priceMinor);
    return {
      packs: entry.packs.map((p, idx) => ({
        ...p,
        priceMinor: idx === 0 ? overridePrice : Math.round(p.priceMinor * ratio),
      })),
      source: 'user',
    };
  }

  return {
    packs: entry.packs,
    source: entry.source,
  };
}

export function chooseCheapestPackPlan(
  neededQty: number,
  packs: PricePack[],
  source: PriceSource
): PackSelection {
  if (neededQty <= 0) {
    const p = packs[0];
    return {
      pack: p,
      packsToBuy: 0,
      totalQtyBought: 0,
      lineTotalMinor: 0,
      effectiveUnitPriceMinor: p.priceMinor,
      source,
    };
  }

  let best: PackSelection | null = null;
  for (const pack of packs) {
    const count = Math.ceil(neededQty / pack.size);
    const lineTotalMinor = count * pack.priceMinor;
    if (
      !best ||
      lineTotalMinor < best.lineTotalMinor ||
      (lineTotalMinor === best.lineTotalMinor && count * pack.size < best.totalQtyBought)
    ) {
      best = {
        pack,
        packsToBuy: count,
        totalQtyBought: count * pack.size,
        lineTotalMinor,
        effectiveUnitPriceMinor: pack.priceMinor,
        source,
      };
    }
  }
  return best!;
}

export function computeShoppingTotalFast(
  slots: SelectedSlot[],
  input: PlanInput,
  trips: ShoppingTripWindow[],
  priceBook: Map<string, PriceBookEntry>,
  pantrySet: Set<string>,
  scaledSlotMap: Map<string, ReturnType<typeof scaleRecipeIngredients>>,
  overrides: Map<string, number> = new Map()
): number {
  const dayToTrip = new Map<number, number>();
  for (const t of trips) {
    for (let d = t.dayStart; d <= t.dayEnd; d += 1) {
      dayToTrip.set(d, t.trip);
    }
  }

  const tripNeedsMap = new Map<number, Map<string, number>>();
  for (const t of trips) {
    tripNeedsMap.set(t.trip, new Map());
  }

  for (const slot of slots) {
    let scaled = scaledSlotMap.get(slot.recipe.id);
    if (!scaled) {
      scaled = scaleRecipeIngredients(slot.recipe, input.people);
      scaledSlotMap.set(slot.recipe.id, scaled);
    }
    const tripId = dayToTrip.get(slot.day) ?? trips[0].trip;
    const ingMap = tripNeedsMap.get(tripId)!;
    for (const item of scaled) {
      if (pantrySet.has(item.ingredientId)) continue;
      ingMap.set(item.ingredientId, (ingMap.get(item.ingredientId) ?? 0) + item.qty);
    }
  }

  const carryOverQty = new Map<string, number>();
  let totalMinor = 0;

  for (const t of trips) {
    const ingMap = tripNeedsMap.get(t.trip)!;
    for (const [ingredientId, neededQty] of ingMap.entries()) {
      const ing = INGREDIENT_MAP.get(ingredientId);
      const { packs, source } = resolveIngredientPacks(ingredientId, priceBook, overrides);
      const priorCarry = carryOverQty.get(ingredientId) ?? 0;
      const netNeeded = Math.max(0, neededQty - priorCarry);
      const selection = chooseCheapestPackPlan(netNeeded, packs, source);

      totalMinor += selection.lineTotalMinor;
      const totalAvailable = priorCarry + selection.totalQtyBought;
      const leftover = Math.max(0, Math.round((totalAvailable - neededQty) * 10) / 10);

      if (ing && ing.shelfLifeDays.room >= 14) {
        carryOverQty.set(ingredientId, leftover);
      } else {
        carryOverQty.set(ingredientId, 0);
      }
    }
  }

  return totalMinor;
}

export function computeCostedPlan(
  slots: SelectedSlot[],
  input: PlanInput,
  trips: ShoppingTripWindow[],
  overrides: Map<string, number> = new Map()
): {
  grocery: GroceryItem[];
  mealBreakdowns: Map<
    string,
    {
      ingredients: MealIngredientCost[];
      costMinor: number;
    }
  >;
  shoppingTotalMinor: number;
  consumedMinor: number;
  perDayMinor: number[];
} {
  const priceBook = getSeedPriceBookForRegion(input.region);
  const pantrySet = new Set(input.pantryItems);

  // Map day -> trip
  const dayToTrip = new Map<number, ShoppingTripWindow>();
  for (const t of trips) {
    for (let d = t.dayStart; d <= t.dayEnd; d += 1) {
      dayToTrip.set(d, t);
    }
  }

  // Track carry-over leftovers across trips for shelf-stable items (room >= 14 days)
  const carryOverQty = new Map<string, number>();

  // First aggregate needed qty per (trip, ingredientId)
  type TripNeed = {
    trip: ShoppingTripWindow;
    ingredientId: string;
    neededQty: number;
    usedIn: Set<string>;
  };

  const tripNeedsMap = new Map<number, Map<string, TripNeed>>();
  for (const t of trips) {
    tripNeedsMap.set(t.trip, new Map());
  }

  const scaledSlotMap = new Map<string, ReturnType<typeof scaleRecipeIngredients>>();

  for (const slot of slots) {
    const slotKey = `${slot.day}_${slot.mealType}`;
    const scaled = scaleRecipeIngredients(slot.recipe, input.people);
    scaledSlotMap.set(slotKey, scaled);

    const trip = dayToTrip.get(slot.day) ?? trips[0];
    const ingMap = tripNeedsMap.get(trip.trip)!;

    for (const item of scaled) {
      if (pantrySet.has(item.ingredientId)) continue;
      let existing = ingMap.get(item.ingredientId);
      if (!existing) {
        existing = {
          trip,
          ingredientId: item.ingredientId,
          neededQty: 0,
          usedIn: new Set<string>(),
        };
        ingMap.set(item.ingredientId, existing);
      }
      existing.neededQty += item.qty;
      existing.usedIn.add(slot.recipe.name);
    }
  }

  const grocery: GroceryItem[] = [];
  // Keep reference to chosen pack per (trip, ingredientId) for meal prorated cost
  const packLookup = new Map<string, { pack: PricePack; source: PriceSource }>();

  for (const t of trips) {
    const ingMap = tripNeedsMap.get(t.trip)!;
    for (const need of ingMap.values()) {
      const ing = INGREDIENT_MAP.get(need.ingredientId);
      const { packs, source } = resolveIngredientPacks(
        need.ingredientId,
        priceBook,
        overrides
      );

      const priorCarry = carryOverQty.get(need.ingredientId) ?? 0;
      const netNeeded = Math.max(0, need.neededQty - priorCarry);
      const selection = chooseCheapestPackPlan(netNeeded, packs, source);

      const totalAvailable = priorCarry + selection.totalQtyBought;
      const leftover = Math.max(0, Math.round((totalAvailable - need.neededQty) * 10) / 10);

      // Carry forward across trips only if shelf-stable at room temp >= 14 days
      if (ing && ing.shelfLifeDays.room >= 14) {
        carryOverQty.set(need.ingredientId, leftover);
      } else {
        carryOverQty.set(need.ingredientId, 0);
      }

      packLookup.set(`${t.trip}_${need.ingredientId}`, {
        pack: selection.pack,
        source,
      });

      if (selection.packsToBuy > 0) {
        grocery.push({
          id: `t${t.trip}_${need.ingredientId}`,
          ingredientId: need.ingredientId,
          name: ing?.names.en ?? need.ingredientId,
          category: (ing?.category ?? 'pantry') as AisleCategory,
          trip: t.trip,
          tripDayStart: t.dayStart,
          tripDayEnd: t.dayEnd,
          neededQty: Math.round(need.neededQty * 10) / 10,
          unit: ing?.canonicalUnit ?? selection.pack.unit,
          packLabel: selection.pack.label,
          packSize: selection.pack.size,
          packsToBuy: selection.packsToBuy,
          packPriceMinor: selection.pack.priceMinor,
          lineTotalMinor: selection.lineTotalMinor,
          leftoverQty: leftover,
          purchased: false,
          purchasedAt: null,
          actualPaidMinor: null,
          priceSource: source,
          usedIn: Array.from(need.usedIn).slice(0, 12),
        });
      }
    }
  }

  // Compute prorated meal costs
  const mealBreakdowns = new Map<
    string,
    {
      ingredients: MealIngredientCost[];
      costMinor: number;
    }
  >();

  const perDayMinor = new Array<number>(input.days).fill(0);
  let consumedMinor = 0;

  for (const slot of slots) {
    const slotKey = `${slot.day}_${slot.mealType}`;
    const scaled = scaledSlotMap.get(slotKey) ?? [];
    const trip = dayToTrip.get(slot.day) ?? trips[0];

    let mealCostMinor = 0;
    const ingCosts: MealIngredientCost[] = [];

    for (const item of scaled) {
      const isPantry = pantrySet.has(item.ingredientId);
      const lookup = packLookup.get(`${trip.trip}_${item.ingredientId}`);
      const fallbackResolved = resolveIngredientPacks(
        item.ingredientId,
        priceBook,
        overrides
      );
      const pack = lookup?.pack ?? fallbackResolved.packs[0];
      const source = lookup?.source ?? fallbackResolved.source;

      const costMinor = isPantry
        ? 0
        : prorateMinor(item.qty, pack.size, pack.priceMinor);
      mealCostMinor += costMinor;

      const leftoverFromSinglePack =
        !isPantry && pack.size > item.qty
          ? `${Math.round((pack.size - item.qty) * 10) / 10} ${item.unit} shared across plan`
          : undefined;

      ingCosts.push({
        ingredientId: item.ingredientId,
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        unitPriceMinor: Math.round((pack.priceMinor * 1000) / Math.max(1, pack.size)),
        packLabel: pack.label,
        packSize: pack.size,
        packPriceMinor: pack.priceMinor,
        costMinor,
        priceSource: isPantry ? 'user' : source,
        fromPackNote: isPantry
          ? 'Already in pantry (₱0)'
          : leftoverFromSinglePack,
        isPantry,
      });
    }

    mealBreakdowns.set(slotKey, {
      ingredients: ingCosts,
      costMinor: mealCostMinor,
    });
    perDayMinor[slot.day - 1] += mealCostMinor;
    consumedMinor += mealCostMinor;
  }

  const shoppingTotalMinor = grocery.reduce((sum, g) => sum + g.lineTotalMinor, 0);

  return {
    grocery,
    mealBreakdowns,
    shoppingTotalMinor,
    consumedMinor,
    perDayMinor,
  };
}

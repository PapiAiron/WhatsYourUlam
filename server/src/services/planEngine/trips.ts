import {
  INGREDIENT_MAP,
  SHOPPING_FREQUENCY_OPTIONS,
  type PlanInput,
  type Recipe,
} from '../../../../shared/src/index.ts';

export interface ShoppingTripWindow {
  trip: number;
  dayStart: number;
  dayEnd: number;
}

export function buildTripWindows(input: PlanInput): {
  trips: ShoppingTripWindow[];
  noFridgeAdjusted: boolean;
} {
  const hasFridge = input.equipment.includes('refrigerator');
  const hasFreezer = input.equipment.includes('freezer');

  const freqSpec =
    SHOPPING_FREQUENCY_OPTIONS.find((f) => f.id === input.shoppingFrequency) ??
    SHOPPING_FREQUENCY_OPTIONS[1];

  let maxTripDays = freqSpec.maxTripDays;
  let noFridgeAdjusted = false;

  if (!hasFridge && !hasFreezer && maxTripDays > 2 && input.days > 2) {
    maxTripDays = 2;
    noFridgeAdjusted = true;
  }

  const trips: ShoppingTripWindow[] = [];
  let cursor = 1;
  let tripIndex = 1;
  while (cursor <= input.days) {
    const dayEnd = Math.min(input.days, cursor + maxTripDays - 1);
    trips.push({ trip: tripIndex, dayStart: cursor, dayEnd });
    cursor = dayEnd + 1;
    tripIndex += 1;
  }

  return { trips, noFridgeAdjusted };
}

export function getStorageMode(
  input: PlanInput
): 'room' | 'fridge' | 'freezer' {
  if (input.equipment.includes('freezer')) return 'freezer';
  if (input.equipment.includes('refrigerator')) return 'fridge';
  return 'room';
}

export function isRecipeFreshForDayOffset(
  recipe: Recipe,
  dayOffsetInTrip: number,
  input: PlanInput
): boolean {
  const storage = getStorageMode(input);
  if (storage !== 'room') return true;
  // Without refrigerator/freezer, fresh meat/fish/leafy greens must be cooked within shelfLifeDays.room
  for (const ri of recipe.ingredients) {
    const ing = INGREDIENT_MAP.get(ri.ingredientId);
    if (!ing) continue;
    if (ing.pantryStaple) continue;
    if (ing.shelfLifeDays.room <= 1 && dayOffsetInTrip > 1) {
      return false;
    }
    if (dayOffsetInTrip > ing.shelfLifeDays.room) {
      return false;
    }
  }
  return true;
}

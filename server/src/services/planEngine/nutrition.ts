import type { NutritionInfo, PlannedMeal } from '../../../../shared/src/index.ts';

export function computeDailyNutritionAverage(
  meals: PlannedMeal[],
  days: number
): {
  nutritionAvg: NutritionInfo;
  lowCalorieWarning: boolean;
} {
  if (days <= 0 || meals.length === 0) {
    return {
      nutritionAvg: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      lowCalorieWarning: false,
    };
  }

  let totalKcal = 0;
  let totalProtein = 0;

  for (const m of meals) {
    totalKcal += m.kcalPerPerson;
    totalProtein += m.proteinGPerPerson;
  }

  const avgKcal = Math.round(totalKcal / days);
  const avgProtein = Math.round(totalProtein / days);

  return {
    nutritionAvg: {
      kcal: avgKcal,
      proteinG: avgProtein,
      carbsG: Math.round((avgKcal * 0.55) / 4),
      fatG: Math.round((avgKcal * 0.25) / 9),
    },
    lowCalorieWarning: avgKcal > 0 && avgKcal < 1500,
  };
}

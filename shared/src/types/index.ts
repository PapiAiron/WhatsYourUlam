export type CanonicalUnit = 'g' | 'ml' | 'pc';

export type AisleCategory =
  | 'grains'
  | 'meat'
  | 'fish'
  | 'seafood'
  | 'produce'
  | 'dairy-eggs'
  | 'dry-goods'
  | 'pantry'
  | 'bakery';

export type AllergenId =
  | 'shrimp'
  | 'fish'
  | 'egg'
  | 'soy'
  | 'peanut'
  | 'milk'
  | 'wheat';

export type DietFlag = 'none' | 'vegetarian' | 'pescatarian' | 'halal' | 'no_pork';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type EquipmentId =
  | 'gas_stove'
  | 'electric_stove'
  | 'induction'
  | 'rice_cooker'
  | 'microwave'
  | 'oven'
  | 'air_fryer'
  | 'pressure_cooker'
  | 'refrigerator'
  | 'freezer';

export type EquipmentRequirement = EquipmentId | 'stovetop';

export type ShoppingFrequency =
  | 'once'
  | 'weekly'
  | 'twice_weekly'
  | 'every_2_3_days';

export type CountryCode = 'PH' | 'MY' | 'JP' | 'US';

export type CurrencyCode = 'PHP' | 'MYR' | 'JPY' | 'USD';

export type PriceSource = 'seed' | 'admin' | 'user' | 'ai-estimate' | 'estimate';

export interface NutritionInfo {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface ShelfLifeDays {
  room: number;
  fridge: number;
  freezer: number;
}

export interface Ingredient {
  id: string;
  slug: string;
  names: {
    en: string;
    local: string;
  };
  category: AisleCategory;
  canonicalUnit: CanonicalUnit;
  gramsPerPiece?: number;
  allergens: AllergenId[];
  nutritionPer100: NutritionInfo;
  shelfLifeDays: ShelfLifeDays;
  pantryStaple: boolean;
  defaultPackLabel: string;
}

export interface PricePack {
  label: string;
  size: number;
  unit: CanonicalUnit;
  priceMinor: number;
}

export interface PriceBookEntry {
  id: string;
  country: CountryCode;
  region: string;
  ingredientId: string;
  packs: PricePack[];
  source: 'seed' | 'admin' | 'ai-estimate';
  confidence: number;
  updatedAt?: string;
}

export interface RecipeIngredient {
  ingredientId: string;
  qty: number;
  unit: CanonicalUnit;
  optional?: boolean;
  note?: string;
}

export interface RecipeImage {
  status: 'pending' | 'ready' | 'failed';
  url?: string;
  thumbUrl?: string;
  lqip?: string;
  w?: number;
  h?: number;
  promptVersion?: string;
}

export interface Recipe {
  id: string;
  slug: string;
  name: string;
  localName: string;
  description: string;
  country: CountryCode;
  cuisineTags: string[];
  mealTypes: MealType[];
  proteinTags: string[];
  equipmentRequired: EquipmentRequirement[];
  allergens: AllergenId[];
  dietFlags: DietFlag[];
  baseServings: number;
  prepMin: number;
  cookMin: number;
  difficulty: 'easy' | 'medium';
  ingredients: RecipeIngredient[];
  steps: string[];
  tips: string;
  nutritionPerServing: NutritionInfo;
  image: RecipeImage;
  status: 'approved' | 'unreviewed' | 'rejected';
  source: 'seed' | 'ai';
  qualityScore: number;
  version: number;
  accentTone?: 'clay' | 'moss' | 'turmeric' | 'tamarind';
}

export interface PlanInput {
  country: CountryCode;
  region: string;
  currency: CurrencyCode;
  budgetMinor: number;
  people: number;
  days: number;
  startDate: string;
  mealsPerDay: 2 | 3;
  includeSnacks: boolean;
  mealTypes: MealType[];
  preferences: string[];
  allergens: AllergenId[];
  excludedIngredients: string[];
  diet: DietFlag;
  equipment: EquipmentId[];
  pantryItems: string[];
  shoppingFrequency: ShoppingFrequency;
  seed?: number;
}

export interface MealIngredientCost {
  ingredientId: string;
  name: string;
  qty: number;
  unit: CanonicalUnit;
  unitPriceMinor: number;
  packLabel: string;
  packSize: number;
  packPriceMinor: number;
  costMinor: number;
  priceSource: PriceSource;
  fromPackNote?: string;
  isPantry: boolean;
}

export interface PlannedMeal {
  id: string;
  day: number;
  mealType: MealType;
  recipeId: string;
  recipeSnapshot: {
    name: string;
    localName: string;
    thumbUrl?: string;
    imageUrl?: string;
    lqip?: string;
    prepMin: number;
    cookMin: number;
    equipment: EquipmentRequirement[];
    accentTone?: string;
  };
  servings: number;
  ingredients: MealIngredientCost[];
  costMinor: number;
  kcalPerPerson: number;
  proteinGPerPerson: number;
  swapped: boolean;
  cooked: boolean;
}

export interface GroceryItem {
  id: string;
  ingredientId: string;
  name: string;
  category: AisleCategory;
  trip: number;
  tripDayStart: number;
  tripDayEnd: number;
  neededQty: number;
  unit: CanonicalUnit;
  packLabel: string;
  packSize: number;
  packsToBuy: number;
  packPriceMinor: number;
  lineTotalMinor: number;
  leftoverQty: number;
  purchased: boolean;
  purchasedAt?: string | null;
  actualPaidMinor?: number | null;
  priceSource: PriceSource;
  usedIn: string[];
}

export interface PlanSummary {
  budgetMinor: number;
  shoppingTotalMinor: number;
  consumedMinor: number;
  leftoverValueMinor: number;
  remainingMinor: number;
  utilizationPct: number;
  perDayMinor: number[];
  avgMealMinor: number;
  nutritionAvg: NutritionInfo;
  tripCount: number;
}

export interface PlanDocument {
  id: string;
  uid: string;
  name: string;
  status: 'queued' | 'generating' | 'ready' | 'failed';
  progress: {
    stage: string;
    pct: number;
  };
  input: PlanInput;
  summary: PlanSummary;
  warnings: string[];
  isSaved: boolean;
  shareId?: string | null;
  createdAt: string;
  updatedAt: string;
  engineVersion: string;
}

export interface FeasibilityAdjustment {
  id: string;
  label: string;
  description: string;
  patch: Partial<PlanInput>;
}

export interface EstimateResult {
  feasible: boolean;
  minimumBudgetMinor: number;
  typicalBudgetMinor: number;
  generousBudgetMinor: number;
  fit: 'infeasible' | 'tight' | 'comfortable' | 'generous';
  warnings: string[];
  adjustments: FeasibilityAdjustment[];
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  country: CountryCode;
  region: string;
  currency: CurrencyCode;
  locale: 'en' | 'fil';
  unitSystem: 'metric' | 'imperial';
  onboardingComplete: boolean;
  defaults: {
    people: number;
    equipment: EquipmentId[];
    prefs: string[];
    pantry: string[];
    shoppingFrequency: ShoppingFrequency;
  };
  quota: {
    periodKey: string;
    plansUsed: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

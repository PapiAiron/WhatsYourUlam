import type {
  AisleCategory,
  AllergenId,
  CountryCode,
  CurrencyCode,
  DietFlag,
  EquipmentId,
  EquipmentRequirement,
  ShoppingFrequency,
} from '../types/index.ts';

export const ENGINE_VERSION = '1.0.0';

export interface CountryConfig {
  code: CountryCode;
  name: string;
  currency: CurrencyCode;
  locale: string;
  live: boolean;
  regions: { id: string; name: string; multiplier: number }[];
  defaultBudgetMinor: number;
  sampleDishes: string[];
}

export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  PH: {
    code: 'PH',
    name: 'Philippines',
    currency: 'PHP',
    locale: 'en-PH',
    live: true,
    regions: [
      { id: 'NCR', name: 'Metro Manila (NCR)', multiplier: 1.0 },
      { id: 'CALABARZON', name: 'CALABARZON', multiplier: 0.96 },
      { id: 'CENTRAL_LUZON', name: 'Central Luzon', multiplier: 0.94 },
      { id: 'CEBU', name: 'Metro Cebu', multiplier: 1.03 },
      { id: 'DAVAO', name: 'Davao Region', multiplier: 0.98 },
    ],
    defaultBudgetMinor: 500000, // ₱5,000
    sampleDishes: ['Chicken Adobo', 'Pork Sinigang', 'Tortang Talong', 'Ginisang Munggo'],
  },
  MY: {
    code: 'MY',
    name: 'Malaysia',
    currency: 'MYR',
    locale: 'en-MY',
    live: false,
    regions: [{ id: 'KL', name: 'Kuala Lumpur', multiplier: 1.0 }],
    defaultBudgetMinor: 42000,
    sampleDishes: ['Nasi Lemak', 'Ayam Masak Merah', 'Sayur Lodeh'],
  },
  JP: {
    code: 'JP',
    name: 'Japan',
    currency: 'JPY',
    locale: 'ja-JP',
    live: false,
    regions: [{ id: 'TOKYO', name: 'Tokyo', multiplier: 1.0 }],
    defaultBudgetMinor: 25000,
    sampleDishes: ['Oyakodon', 'Miso Soup', 'Nikujaga'],
  },
  US: {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    locale: 'en-US',
    live: false,
    regions: [{ id: 'NAT', name: 'National Average', multiplier: 1.0 }],
    defaultBudgetMinor: 16000,
    sampleDishes: ['Sheet-Pan Chicken', 'Bean & Rice Bowls', 'Vegetable Frittata'],
  },
};

export const CURRENCY_FRACTION_DIGITS: Record<CurrencyCode, number> = {
  PHP: 2,
  MYR: 2,
  JPY: 0,
  USD: 2,
};

export const EQUIPMENT_OPTIONS: {
  id: EquipmentId;
  label: string;
  group?: 'stovetop' | 'cold';
}[] = [
  { id: 'gas_stove', label: 'Gas stove', group: 'stovetop' },
  { id: 'electric_stove', label: 'Electric stove', group: 'stovetop' },
  { id: 'induction', label: 'Induction cooker', group: 'stovetop' },
  { id: 'rice_cooker', label: 'Rice cooker' },
  { id: 'microwave', label: 'Microwave' },
  { id: 'oven', label: 'Oven' },
  { id: 'air_fryer', label: 'Air fryer' },
  { id: 'pressure_cooker', label: 'Pressure cooker' },
  { id: 'refrigerator', label: 'Refrigerator', group: 'cold' },
  { id: 'freezer', label: 'Freezer', group: 'cold' },
];

export const STOVETOP_IDS: EquipmentId[] = [
  'gas_stove',
  'electric_stove',
  'induction',
];

export function hasRequiredEquipment(
  userEquipment: EquipmentId[],
  required: EquipmentRequirement[]
): boolean {
  const set = new Set<EquipmentId>(userEquipment);
  return required.every((req) => {
    if (req === 'stovetop') {
      return STOVETOP_IDS.some((id) => set.has(id));
    }
    return set.has(req);
  });
}

export const PREFERENCE_OPTIONS = [
  { id: 'pork', label: 'Pork' },
  { id: 'chicken', label: 'Chicken' },
  { id: 'beef', label: 'Beef' },
  { id: 'fish', label: 'Fish' },
  { id: 'seafood', label: 'Seafood' },
  { id: 'vegetables', label: 'Vegetables' },
  { id: 'eggs', label: 'Eggs' },
  { id: 'vegetarian', label: 'Vegetarian' },
] as const;

export const ALLERGEN_OPTIONS: { id: AllergenId; label: string }[] = [
  { id: 'shrimp', label: 'Shrimp / Shellfish' },
  { id: 'fish', label: 'Fish' },
  { id: 'egg', label: 'Egg' },
  { id: 'soy', label: 'Soy' },
  { id: 'peanut', label: 'Peanut' },
  { id: 'milk', label: 'Milk / Dairy' },
  { id: 'wheat', label: 'Wheat / Gluten' },
];

export const DIET_OPTIONS: { id: DietFlag; label: string }[] = [
  { id: 'none', label: 'No strict diet' },
  { id: 'no_pork', label: 'No pork' },
  { id: 'halal', label: 'Halal-friendly' },
  { id: 'pescatarian', label: 'Pescatarian' },
  { id: 'vegetarian', label: 'Vegetarian' },
];

export const SHOPPING_FREQUENCY_OPTIONS: {
  id: ShoppingFrequency;
  label: string;
  maxTripDays: number;
}[] = [
  { id: 'once', label: 'One big trip', maxTripDays: 31 },
  { id: 'weekly', label: 'Once a week', maxTripDays: 7 },
  { id: 'twice_weekly', label: 'Twice a week', maxTripDays: 4 },
  { id: 'every_2_3_days', label: 'Every 2 to 3 days', maxTripDays: 2 },
];

export const PANTRY_STAPLE_OPTIONS: { id: string; label: string }[] = [
  { id: 'rice-well-milled', label: 'Well-milled rice' },
  { id: 'cooking-oil', label: 'Cooking oil' },
  { id: 'soy-sauce', label: 'Soy sauce' },
  { id: 'vinegar', label: 'Vinegar' },
  { id: 'fish-sauce', label: 'Fish sauce (patis)' },
  { id: 'salt', label: 'Salt' },
  { id: 'sugar-white', label: 'White sugar' },
  { id: 'black-pepper', label: 'Black pepper' },
  { id: 'garlic', label: 'Garlic' },
  { id: 'onion-red', label: 'Red onion' },
];

export const AISLE_LABELS: Record<AisleCategory, string> = {
  produce: 'Fresh Produce',
  meat: 'Meat & Poultry',
  fish: 'Fresh Fish',
  seafood: 'Seafood',
  'dairy-eggs': 'Eggs & Dairy',
  grains: 'Rice & Grains',
  'dry-goods': 'Dry Goods & Tofu',
  pantry: 'Pantry & Condiments',
  bakery: 'Bakery',
};

export const AISLE_ORDER: AisleCategory[] = [
  'produce',
  'meat',
  'fish',
  'seafood',
  'dairy-eggs',
  'grains',
  'dry-goods',
  'pantry',
  'bakery',
];

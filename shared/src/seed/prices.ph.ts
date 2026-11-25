import type { PriceBookEntry, PricePack } from '../types/index.ts';
import { COUNTRIES } from '../constants/index.ts';

interface SeedPriceSpec {
  ingredientId: string;
  packs: PricePack[];
}

const NCR_SPECS: SeedPriceSpec[] = [
  {
    ingredientId: 'rice-well-milled',
    packs: [
      { label: '1 kg bag', size: 1000, unit: 'g', priceMinor: 5500 },
      { label: '2 kg bag', size: 2000, unit: 'g', priceMinor: 10800 },
      { label: '5 kg sack', size: 5000, unit: 'g', priceMinor: 26500 },
    ],
  },
  {
    ingredientId: 'chicken-whole',
    packs: [{ label: '500 g pack', size: 500, unit: 'g', priceMinor: 10000 }],
  },
  {
    ingredientId: 'chicken-breast',
    packs: [{ label: '500 g pack', size: 500, unit: 'g', priceMinor: 12000 }],
  },
  {
    ingredientId: 'chicken-thigh',
    packs: [{ label: '500 g pack', size: 500, unit: 'g', priceMinor: 10500 }],
  },
  {
    ingredientId: 'pork-liempo',
    packs: [{ label: '500 g pack', size: 500, unit: 'g', priceMinor: 19000 }],
  },
  {
    ingredientId: 'pork-kasim',
    packs: [{ label: '500 g pack', size: 500, unit: 'g', priceMinor: 16500 }],
  },
  {
    ingredientId: 'pork-ground',
    packs: [{ label: '500 g pack', size: 500, unit: 'g', priceMinor: 15000 }],
  },
  {
    ingredientId: 'beef-kasim',
    packs: [{ label: '500 g pack', size: 500, unit: 'g', priceMinor: 26000 }],
  },
  {
    ingredientId: 'beef-ground',
    packs: [{ label: '500 g pack', size: 500, unit: 'g', priceMinor: 22500 }],
  },
  {
    ingredientId: 'corned-beef-canned',
    packs: [{ label: '150 g can', size: 150, unit: 'g', priceMinor: 3800 }],
  },
  {
    ingredientId: 'bangus',
    packs: [{ label: '500 g fish', size: 500, unit: 'g', priceMinor: 10000 }],
  },
  {
    ingredientId: 'tilapia',
    packs: [{ label: '500 g pack', size: 500, unit: 'g', priceMinor: 7500 }],
  },
  {
    ingredientId: 'galunggong',
    packs: [{ label: '500 g pack', size: 500, unit: 'g', priceMinor: 11000 }],
  },
  {
    ingredientId: 'tinapa-flaked',
    packs: [{ label: '250 g pack', size: 250, unit: 'g', priceMinor: 7500 }],
  },
  {
    ingredientId: 'squid',
    packs: [{ label: '500 g pack', size: 500, unit: 'g', priceMinor: 18000 }],
  },
  {
    ingredientId: 'shrimp',
    packs: [{ label: '500 g pack', size: 500, unit: 'g', priceMinor: 23000 }],
  },
  {
    ingredientId: 'sardines-canned',
    packs: [{ label: '155 g can', size: 155, unit: 'g', priceMinor: 2400 }],
  },
  {
    ingredientId: 'tuna-canned',
    packs: [{ label: '155 g can', size: 155, unit: 'g', priceMinor: 3500 }],
  },
  {
    ingredientId: 'egg',
    packs: [
      { label: '1 pc', size: 1, unit: 'pc', priceMinor: 1000 },
      { label: '6 pcs tray', size: 6, unit: 'pc', priceMinor: 5800 },
      { label: '12 pcs tray', size: 12, unit: 'pc', priceMinor: 11200 },
    ],
  },
  {
    ingredientId: 'evaporated-milk',
    packs: [{ label: '370 ml can', size: 370, unit: 'ml', priceMinor: 3200 }],
  },
  {
    ingredientId: 'coconut-milk',
    packs: [
      { label: '200 ml pack', size: 200, unit: 'ml', priceMinor: 2800 },
      { label: '400 ml can', size: 400, unit: 'ml', priceMinor: 5200 },
    ],
  },
  {
    ingredientId: 'kangkong',
    packs: [{ label: '250 g bundle', size: 250, unit: 'g', priceMinor: 2000 }],
  },
  {
    ingredientId: 'pechay',
    packs: [{ label: '250 g bundle', size: 250, unit: 'g', priceMinor: 2000 }],
  },
  {
    ingredientId: 'cabbage',
    packs: [{ label: '500 g head', size: 500, unit: 'g', priceMinor: 4000 }],
  },
  {
    ingredientId: 'string-beans',
    packs: [{ label: '250 g bundle', size: 250, unit: 'g', priceMinor: 2500 }],
  },
  {
    ingredientId: 'eggplant',
    packs: [{ label: '250 g pack', size: 250, unit: 'g', priceMinor: 2200 }],
  },
  {
    ingredientId: 'squash-kalabasa',
    packs: [{ label: '500 g wedge', size: 500, unit: 'g', priceMinor: 3000 }],
  },
  {
    ingredientId: 'bitter-gourd',
    packs: [{ label: '250 g pack', size: 250, unit: 'g', priceMinor: 2800 }],
  },
  {
    ingredientId: 'carrot',
    packs: [{ label: '250 g pack', size: 250, unit: 'g', priceMinor: 2200 }],
  },
  {
    ingredientId: 'potato',
    packs: [{ label: '500 g bag', size: 500, unit: 'g', priceMinor: 5500 }],
  },
  {
    ingredientId: 'tomato',
    packs: [{ label: '250 g pack', size: 250, unit: 'g', priceMinor: 2000 }],
  },
  {
    ingredientId: 'onion-red',
    packs: [{ label: '250 g net', size: 250, unit: 'g', priceMinor: 3200 }],
  },
  {
    ingredientId: 'garlic',
    packs: [{ label: '100 g net', size: 100, unit: 'g', priceMinor: 2200 }],
  },
  {
    ingredientId: 'ginger',
    packs: [{ label: '100 g pack', size: 100, unit: 'g', priceMinor: 1400 }],
  },
  {
    ingredientId: 'sayote',
    packs: [{ label: '500 g pack', size: 500, unit: 'g', priceMinor: 2800 }],
  },
  {
    ingredientId: 'okra',
    packs: [{ label: '250 g pack', size: 250, unit: 'g', priceMinor: 1800 }],
  },
  {
    ingredientId: 'radish',
    packs: [{ label: '250 g pack', size: 250, unit: 'g', priceMinor: 1500 }],
  },
  {
    ingredientId: 'malunggay',
    packs: [{ label: '50 g bunch', size: 50, unit: 'g', priceMinor: 1000 }],
  },
  {
    ingredientId: 'green-chili',
    packs: [{ label: '50 g pack', size: 50, unit: 'g', priceMinor: 1500 }],
  },
  {
    ingredientId: 'calamansi',
    packs: [{ label: '100 g pack', size: 100, unit: 'g', priceMinor: 1800 }],
  },
  {
    ingredientId: 'saba-banana',
    packs: [{ label: '500 g hand', size: 500, unit: 'g', priceMinor: 3500 }],
  },
  {
    ingredientId: 'mung-beans',
    packs: [{ label: '250 g pack', size: 250, unit: 'g', priceMinor: 3300 }],
  },
  {
    ingredientId: 'tofu-block',
    packs: [{ label: '300 g pack', size: 300, unit: 'g', priceMinor: 2800 }],
  },
  {
    ingredientId: 'bihon-noodles',
    packs: [{ label: '227 g pack', size: 227, unit: 'g', priceMinor: 3200 }],
  },
  {
    ingredientId: 'misua-noodles',
    packs: [{ label: '150 g pack', size: 150, unit: 'g', priceMinor: 1800 }],
  },
  {
    ingredientId: 'rolled-oats',
    packs: [{ label: '400 g pack', size: 400, unit: 'g', priceMinor: 6800 }],
  },
  {
    ingredientId: 'glutinous-rice',
    packs: [{ label: '500 g pack', size: 500, unit: 'g', priceMinor: 4800 }],
  },
  {
    ingredientId: 'cocoa-powder',
    packs: [{ label: '100 g pack', size: 100, unit: 'g', priceMinor: 4200 }],
  },
  {
    ingredientId: 'cooking-oil',
    packs: [
      { label: '250 ml pouch', size: 250, unit: 'ml', priceMinor: 2800 },
      { label: '1 L bottle', size: 1000, unit: 'ml', priceMinor: 9500 },
    ],
  },
  {
    ingredientId: 'soy-sauce',
    packs: [
      { label: '350 ml pouch', size: 350, unit: 'ml', priceMinor: 2200 },
      { label: '1 L bottle', size: 1000, unit: 'ml', priceMinor: 5500 },
    ],
  },
  {
    ingredientId: 'vinegar',
    packs: [
      { label: '350 ml pouch', size: 350, unit: 'ml', priceMinor: 1600 },
      { label: '1 L bottle', size: 1000, unit: 'ml', priceMinor: 3500 },
    ],
  },
  {
    ingredientId: 'fish-sauce',
    packs: [
      { label: '350 ml bottle', size: 350, unit: 'ml', priceMinor: 2500 },
      { label: '750 ml bottle', size: 750, unit: 'ml', priceMinor: 4500 },
    ],
  },
  {
    ingredientId: 'salt',
    packs: [{ label: '1 kg bag', size: 1000, unit: 'g', priceMinor: 2200 }],
  },
  {
    ingredientId: 'sugar-white',
    packs: [
      { label: '500 g bag', size: 500, unit: 'g', priceMinor: 4600 },
      { label: '1 kg bag', size: 1000, unit: 'g', priceMinor: 8800 },
    ],
  },
  {
    ingredientId: 'black-pepper',
    packs: [{ label: '25 g pack', size: 25, unit: 'g', priceMinor: 1500 }],
  },
  {
    ingredientId: 'bay-leaf',
    packs: [{ label: '5 g pack', size: 5, unit: 'g', priceMinor: 800 }],
  },
  {
    ingredientId: 'tomato-sauce',
    packs: [{ label: '200 g pouch', size: 200, unit: 'g', priceMinor: 2000 }],
  },
  {
    ingredientId: 'sinigang-mix',
    packs: [{ label: '44 g pouch', size: 44, unit: 'g', priceMinor: 1900 }],
  },
  {
    ingredientId: 'peanut-butter',
    packs: [{ label: '225 g jar', size: 225, unit: 'g', priceMinor: 6500 }],
  },
  {
    ingredientId: 'pandesal',
    packs: [
      { label: '1 pc', size: 1, unit: 'pc', priceMinor: 500 },
      { label: '10 pcs bag', size: 10, unit: 'pc', priceMinor: 4800 },
    ],
  },
  {
    ingredientId: 'margarine',
    packs: [{ label: '100 g tub', size: 100, unit: 'g', priceMinor: 3400 }],
  },
];

export const SEED_PRICES_PH: PriceBookEntry[] = NCR_SPECS.map((spec) => ({
  id: `PH_NCR_${spec.ingredientId}`,
  country: 'PH',
  region: 'NCR',
  ingredientId: spec.ingredientId,
  packs: spec.packs,
  source: 'seed',
  confidence: 0.75,
}));

export function getSeedPriceBookForRegion(region: string): Map<string, PriceBookEntry> {
  const phConfig = COUNTRIES.PH;
  const reg = phConfig.regions.find((r) => r.id === region) ?? phConfig.regions[0];
  const multiplier = reg?.multiplier ?? 1.0;

  const map = new Map<string, PriceBookEntry>();
  for (const entry of SEED_PRICES_PH) {
    map.set(entry.ingredientId, {
      ...entry,
      id: `PH_${reg.id}_${entry.ingredientId}`,
      region: reg.id,
      packs: entry.packs.map((pack) => ({
        ...pack,
        priceMinor: Math.round(pack.priceMinor * multiplier),
      })),
    });
  }
  return map;
}

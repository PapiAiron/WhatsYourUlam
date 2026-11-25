import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type {
  AllergenId,
  CountryCode,
  CurrencyCode,
  DietFlag,
  EquipmentId,
  MealType,
  PlanInput,
  ShoppingFrequency,
} from '@shared/index';

const memoryStorage = new Map<string, string>();

const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return memoryStorage.get(name) ?? null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      memoryStorage.set(name, value);
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      memoryStorage.delete(name);
    }
  },
};

export interface WizardDraftState {
  step: number;
  planName: string;
  country: CountryCode;
  region: string;
  currency: CurrencyCode;
  budgetMajor: number;
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
  setStep: (step: number) => void;
  patchDraft: (patch: Partial<Omit<WizardDraftState, 'setStep' | 'patchDraft' | 'resetDraft' | 'toPlanInput'>>) => void;
  resetDraft: () => void;
  toPlanInput: () => PlanInput;
}

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_DRAFT = {
  step: 0,
  planName: '',
  country: 'PH' as CountryCode,
  region: 'NCR',
  currency: 'PHP' as CurrencyCode,
  budgetMajor: 5000,
  people: 4,
  days: 14,
  startDate: getTodayIso(),
  mealsPerDay: 3 as const,
  includeSnacks: false,
  mealTypes: ['breakfast', 'lunch', 'dinner'] as MealType[],
  preferences: ['chicken', 'vegetables', 'fish'],
  allergens: [] as AllergenId[],
  excludedIngredients: [] as string[],
  diet: 'none' as DietFlag,
  equipment: ['gas_stove', 'rice_cooker', 'refrigerator'] as EquipmentId[],
  pantryItems: ['salt', 'cooking-oil', 'soy-sauce', 'vinegar'],
  shoppingFrequency: 'weekly' as ShoppingFrequency,
};

export const useWizardDraft = create<WizardDraftState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_DRAFT,
      setStep: (step) => set({ step: Math.max(0, Math.min(6, step)) }),
      patchDraft: (patch) => set((state) => ({ ...state, ...patch })),
      resetDraft: () => set({ ...DEFAULT_DRAFT, startDate: getTodayIso() }),
      toPlanInput: () => {
        const s = get();
        const factor = s.currency === 'JPY' ? 1 : 100;
        return {
          country: s.country,
          region: s.region,
          currency: s.currency,
          budgetMinor: Math.max(10000, Math.round(s.budgetMajor * factor)),
          people: s.people,
          days: s.days,
          startDate: s.startDate || getTodayIso(),
          mealsPerDay: s.mealsPerDay,
          includeSnacks: s.includeSnacks,
          mealTypes:
            s.mealsPerDay === 2
              ? (['lunch', 'dinner', ...(s.includeSnacks ? ['snack'] : [])] as MealType[])
              : (['breakfast', 'lunch', 'dinner', ...(s.includeSnacks ? ['snack'] : [])] as MealType[]),
          preferences: s.preferences,
          allergens: s.allergens,
          excludedIngredients: s.excludedIngredients,
          diet: s.diet,
          equipment: s.equipment,
          pantryItems: s.pantryItems,
          shoppingFrequency: s.shoppingFrequency,
        };
      },
    }),
    {
      name: 'smp_wizard_draft_v1',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);

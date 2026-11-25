import type {
  CountryCode,
  EstimateResult,
  GroceryItem,
  MealType,
  PlanDocument,
  PlanInput,
  PlannedMeal,
  Recipe,
} from '@shared/index';
import { auth } from './firebase';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function requestJson<T>(
  url: string,
  options: RequestInit & { requireAuth?: boolean } = {}
): Promise<T> {
  const { requireAuth = false, headers: extraHeaders, ...rest } = options;
  const authHeaders = requireAuth ? await getAuthHeaders() : {};
  const res = await fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(extraHeaders as Record<string, string> | undefined),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errObj = (data as { error?: { code?: string; message?: string; details?: unknown } })
      ?.error;
    throw new ApiError(
      res.status,
      errObj?.code ?? 'API_ERROR',
      errObj?.message ?? `Request failed (${res.status})`,
      errObj?.details
    );
  }
  return data as T;
}

export interface SwapAlternative {
  recipe: Recipe;
  estimatedMealCostMinor: number;
  projectedShoppingTotalMinor: number;
  deltaMinor: number;
  fitsBudget: boolean;
}

export const apiClient = {
  estimatePlan(input: PlanInput, overrides?: Record<string, number>): Promise<EstimateResult> {
    return requestJson<EstimateResult>('/v1/plans/estimate', {
      method: 'POST',
      body: JSON.stringify({ input, overrides }),
    });
  },

  generatePlan(params: {
    input: PlanInput;
    name?: string;
    overrides?: Record<string, number>;
    extraRecipes?: Recipe[];
    idempotencyKey?: string;
  }): Promise<{ plan: PlanDocument; meals: PlannedMeal[]; grocery: GroceryItem[] }> {
    return requestJson('/v1/plans', {
      method: 'POST',
      requireAuth: true,
      headers: params.idempotencyKey
        ? { 'Idempotency-Key': params.idempotencyKey }
        : undefined,
      body: JSON.stringify({
        input: params.input,
        name: params.name,
        overrides: params.overrides,
        extraRecipes: params.extraRecipes,
      }),
    });
  },

  getSwapOptions(params: {
    plan: PlanDocument;
    meals: PlannedMeal[];
    mealId: string;
    overrides?: Record<string, number>;
    extraRecipes?: Recipe[];
  }): Promise<{ alternatives: SwapAlternative[] }> {
    return requestJson('/v1/plans/swap-options', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify(params),
    });
  },

  recostPlan(params: {
    plan: PlanDocument;
    meals: PlannedMeal[];
    mealId: string | null;
    newRecipeId: string | null;
    overrides?: Record<string, number>;
    extraRecipes?: Recipe[];
  }): Promise<{ plan: PlanDocument; meals: PlannedMeal[]; grocery: GroceryItem[] }> {
    return requestJson('/v1/plans/recost', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify(params),
    });
  },

  generateAiRecipe(params: {
    country: CountryCode;
    mealType: MealType;
    diet: string;
    excludedText?: string;
    existingNames?: string[];
  }): Promise<{ recipe: Recipe }> {
    return requestJson('/v1/ai/recipes/generate', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify(params),
    });
  },

  submitFeedback(payload: {
    name: string;
    email: string;
    topic: 'pricing' | 'recipe' | 'bug' | 'feature' | 'general';
    message: string;
  }): Promise<{ accepted: boolean }> {
    return requestJson('/v1/public/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  submitWaitlist(payload: {
    email: string;
    country: CountryCode;
  }): Promise<{ accepted: boolean }> {
    return requestJson('/v1/public/waitlist', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

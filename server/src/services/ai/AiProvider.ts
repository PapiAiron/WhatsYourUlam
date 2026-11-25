import type { z } from 'zod';
import type { CountryCode, MealType, Recipe } from '../../../../shared/src/index.ts';

export interface StructuredRequest {
  systemInstruction: string;
  prompt: string;
  responseSchema: Record<string, unknown>;
  useStrongModel?: boolean;
}

export interface AiProvider {
  isConfigured(): boolean;
  generateStructured<T>(schema: z.ZodType<T>, request: StructuredRequest): Promise<T>;
  generateGapRecipe(params: {
    country: CountryCode;
    mealType: MealType;
    diet: string;
    excludedText?: string;
    existingNames: string[];
  }): Promise<Recipe | null>;
}

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CLIENT_ORIGIN: z.string().default('http://localhost:3000'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL_TEXT: z.string().default('gemini-4-hydrogen'),
  GEMINI_MODEL_TEXT_STRONG: z.string().default('gemini-4-neon'),
  GEMINI_RPM: z.coerce.number().int().min(1).default(30),
  AI_DAILY_SPEND_CAP_USD: z.coerce.number().min(0).default(5.0),
  ENABLE_PRICE_ESTIMATION: z
    .string()
    .optional()
    .transform((v) => v !== 'false')
    .default(true),
  FREE_PLANS_PER_MONTH: z.coerce.number().int().min(1).default(10),
  SWAPS_PER_DAY: z.coerce.number().int().min(1).default(40),
  APP_CHECK_ENFORCE: z
    .string()
    .optional()
    .transform((v) => v === 'true')
    .default(false),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'silent']).default('info'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid server environment configuration:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

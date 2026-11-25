import { env } from '../../config/env.ts';

interface DailyUsage {
  dateKey: string;
  estimatedUsd: number;
  calls: number;
}

const usage: DailyUsage = {
  dateKey: new Date().toISOString().slice(0, 10),
  estimatedUsd: 0,
  calls: 0,
};

function resetIfNewDay(): void {
  const today = new Date().toISOString().slice(0, 10);
  if (usage.dateKey !== today) {
    usage.dateKey = today;
    usage.estimatedUsd = 0;
    usage.calls = 0;
  }
}

export function canSpendAi(): boolean {
  resetIfNewDay();
  return usage.estimatedUsd < env.AI_DAILY_SPEND_CAP_USD;
}

export function recordAiSpend(inputTokens: number, outputTokens: number): void {
  resetIfNewDay();
  const cost = (inputTokens / 1_000_000) * 0.3 + (outputTokens / 1_000_000) * 2.5;
  usage.estimatedUsd += cost;
  usage.calls += 1;
}

export function getAiSpendSnapshot(): DailyUsage & { capUsd: number } {
  resetIfNewDay();
  return { ...usage, capUsd: env.AI_DAILY_SPEND_CAP_USD };
}

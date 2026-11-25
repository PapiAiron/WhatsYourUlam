import { useEffect, useState } from 'react';
import { Swap } from '@phosphor-icons/react';
import { formatMoney, type PlanDocument, type PlannedMeal } from '@shared/index';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiClient, type SwapAlternative } from '@/lib/apiClient';
import styles from './PlanShared.module.css';

interface SwapMealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanDocument;
  meals: PlannedMeal[];
  targetMeal: PlannedMeal | null;
  overrides: Record<string, number>;
  onSelectRecipe: (newRecipeId: string) => Promise<void>;
}

export function SwapMealDialog({
  open,
  onOpenChange,
  plan,
  meals,
  targetMeal,
  overrides,
  onSelectRecipe,
}: SwapMealDialogProps) {
  const [loading, setLoading] = useState(false);
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [options, setOptions] = useState<SwapAlternative[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !targetMeal) return;
    let active = true;
    setLoading(true);
    setError('');
    void apiClient
      .getSwapOptions({
        plan,
        meals,
        mealId: targetMeal.id,
        overrides,
      })
      .then((res) => {
        if (active) setOptions(res.alternatives);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load swap options.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, targetMeal, plan, meals, overrides]);

  async function handleChoose(recipeId: string) {
    setSwappingId(recipeId);
    try {
      await onSelectRecipe(recipeId);
      onOpenChange(false);
    } finally {
      setSwappingId(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Swap ${targetMeal?.recipeSnapshot.name ?? 'meal'}`}
      description="Replacements keep your total shopping list within your budget cap."
    >
      {loading ? (
        <div className={styles.swapList}>
          <Skeleton variant="line" />
          <Skeleton variant="line" />
          <Skeleton variant="line" />
        </div>
      ) : error ? (
        <p className={styles.errorText}>{error}</p>
      ) : options.length === 0 ? (
        <p className={styles.mutedText}>No other matching dishes found under the current budget.</p>
      ) : (
        <div className={styles.swapList}>
          {options.map((alt) => {
            const deltaText =
              alt.deltaMinor <= 0
                ? `${formatMoney(alt.deltaMinor, plan.input.currency)}`
                : `+${formatMoney(alt.deltaMinor, plan.input.currency)}`;
            return (
              <div key={alt.recipe.id} className={styles.swapCard}>
                <div className={styles.swapInfo}>
                  <strong>{alt.recipe.name}</strong>
                  <span>
                    {alt.recipe.localName} · {alt.recipe.prepMin + alt.recipe.cookMin}m
                  </span>
                  <div className={styles.swapBadges}>
                    <Badge tone={alt.deltaMinor <= 0 ? 'moss' : 'turmeric'}>
                      Plan delta: {deltaText}
                    </Badge>
                    <Badge tone="neutral">
                      New total: {formatMoney(alt.projectedShoppingTotalMinor, plan.input.currency)}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={!alt.fitsBudget}
                  loading={swappingId === alt.recipe.id}
                  onClick={() => void handleChoose(alt.recipe.id)}
                >
                  <Swap size={15} /> {alt.fitsBudget ? 'Use dish' : 'Over budget'}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Dialog>
  );
}

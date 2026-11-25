import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, Swap } from '@phosphor-icons/react';
import { formatMoney, type PlannedMeal } from '@shared/index';
import clsx from 'clsx';
import { BentoTile } from '@/components/bento/BentoTile';
import { DishImage } from '@/components/brand/DishImage';
import { Seo } from '@/components/seo/Seo';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/AuthProvider';
import { apiClient } from '@/lib/apiClient';
import {
  applyRecostedPlan,
  getPlanBundle,
  listPriceOverrides,
  setPriceOverride,
  toggleMealCooked,
} from '@/lib/firestoreRepo';
import { useUiStore } from '@/store/ui';
import { RecipeDrawer } from './RecipeDrawer';
import { SwapMealDialog } from './SwapMealDialog';
import styles from './PlanShared.module.css';

export function PlanDayPage() {
  const { planId = '', dayNum = '1' } = useParams();
  const day = Math.max(1, Number(dayNum) || 1);
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  const [swapTarget, setSwapTarget] = useState<PlannedMeal | null>(null);

  const { data: bundle, isLoading } = useQuery({
    queryKey: ['planBundle', user?.uid, planId],
    queryFn: () => (user && planId ? getPlanBundle(user.uid, planId) : Promise.resolve(null)),
    enabled: Boolean(user && planId),
  });

  const { data: overrides = {} } = useQuery({
    queryKey: ['priceOverrides', user?.uid],
    queryFn: () => (user ? listPriceOverrides(user.uid) : Promise.resolve<Awaited<ReturnType<typeof listPriceOverrides>>>({})),
    enabled: Boolean(user),
  });

  const overrideMap = useMemo(() => {
    const rec: Record<string, number> = {};
    for (const [k, v] of Object.entries(overrides)) {
      rec[k] = v.packPriceMinor;
    }
    return rec;
  }, [overrides]);

  const dayMeals = useMemo(
    () => (bundle?.meals ?? []).filter((m) => m.day === day),
    [bundle, day]
  );

  const activeRecipeParam = searchParams.get('recipe');
  const activeMeal = useMemo(
    () => bundle?.meals.find((m) => m.id === activeRecipeParam) ?? null,
    [bundle, activeRecipeParam]
  );

  async function handleSwapRecipe(newRecipeId: string) {
    if (!user || !bundle || !swapTarget) return;
    const prevRecipeId = swapTarget.recipeId;
    const prevMealId = swapTarget.id;

    const recosted = await apiClient.recostPlan({
      plan: bundle.plan,
      meals: bundle.meals,
      mealId: prevMealId,
      newRecipeId,
      overrides: overrideMap,
    });

    await applyRecostedPlan(
      user.uid,
      recosted.plan,
      recosted.meals,
      recosted.grocery,
      bundle.grocery.map((g) => g.id)
    );
    await queryClient.invalidateQueries({ queryKey: ['planBundle', user.uid, planId] });

    pushToast({
      title: 'Meal swapped',
      description: 'Grocery list and plan budget updated.',
      tone: 'moss',
      durationMs: 30000,
      actionLabel: 'Undo',
      onAction: () => {
        void apiClient
          .recostPlan({
            plan: recosted.plan,
            meals: recosted.meals,
            mealId: prevMealId,
            newRecipeId: prevRecipeId,
            overrides: overrideMap,
          })
          .then((reverted) =>
            applyRecostedPlan(
              user.uid,
              reverted.plan,
              reverted.meals,
              reverted.grocery,
              recosted.grocery.map((g) => g.id)
            )
          )
          .then(() =>
            queryClient.invalidateQueries({ queryKey: ['planBundle', user.uid, planId] })
          );
      },
    });
  }

  async function handleToggleCooked(meal: PlannedMeal) {
    if (!user || !bundle) return;
    await toggleMealCooked(user.uid, bundle.plan.id, meal.id, !meal.cooked);
    await queryClient.invalidateQueries({ queryKey: ['planBundle', user.uid, planId] });
  }

  async function handleUpdatePriceOverride(ingredientId: string, newPackPriceMinor: number) {
    if (!user || !bundle) return;
    await setPriceOverride(user.uid, ingredientId, newPackPriceMinor);
    const nextOverrides = { ...overrideMap, [ingredientId]: newPackPriceMinor };
    const recosted = await apiClient.recostPlan({
      plan: bundle.plan,
      meals: bundle.meals,
      mealId: null,
      newRecipeId: null,
      overrides: nextOverrides,
    });
    await applyRecostedPlan(
      user.uid,
      recosted.plan,
      recosted.meals,
      recosted.grocery,
      bundle.grocery.map((g) => g.id)
    );
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['planBundle', user.uid, planId] }),
      queryClient.invalidateQueries({ queryKey: ['priceOverrides', user.uid] }),
    ]);
    pushToast({ title: 'Price updated & day recosted', tone: 'moss' });
  }

  if (isLoading) return <Skeleton variant="tile" />;
  if (!bundle) {
    return (
      <EmptyState
        title="Plan not found"
        description="Return to your saved plans list."
        action={
          <Link to="/app/plans">
            <Button>Saved plans</Button>
          </Link>
        }
      />
    );
  }

  const { plan } = bundle;
  const dayCostMinor = plan.summary.perDayMinor[day - 1] ?? 0;
  const dailyAllowanceMinor = Math.round(plan.summary.budgetMinor / Math.max(1, plan.input.days));

  return (
    <div className={styles.page}>
      <Seo title={`Day ${day} · ${plan.name}`} noindex />

      <div className={styles.header}>
        <div>
          <Link to={`/app/plans/${plan.id}`} className={styles.sub}>
            <ArrowLeft size={14} /> Back to {plan.name}
          </Link>
          <h1 className={styles.title}>Day {day} Menu</h1>
        </div>
        <div className={styles.actions}>
          <Link to={`/app/plans/${plan.id}/grocery`}>
            <Button variant="outline">Grocery List</Button>
          </Link>
        </div>
      </div>

      {/* Day Pills */}
      <div className={styles.dayNav} aria-label="Jump to day">
        {Array.from({ length: plan.input.days }, (_, i) => i + 1).map((d) => (
          <Link
            key={d}
            to={`/app/plans/${plan.id}/day/${d}`}
            className={clsx(styles.dayPill, d === day && styles.dayPillActive)}
          >
            D{d}
          </Link>
        ))}
      </div>

      <BentoTile colSpan={12} tone="paper2">
        <div className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Day {day} Estimated Plate Cost</span>
            <h2 className={styles.title}>
              {formatMoney(dayCostMinor, plan.input.currency)}
            </h2>
          </div>
          <Badge tone={dayCostMinor <= dailyAllowanceMinor ? 'moss' : 'turmeric'}>
            Daily pace target: {formatMoney(dailyAllowanceMinor, plan.input.currency)}
          </Badge>
        </div>
      </BentoTile>

      <div className={styles.mealCards}>
        {dayMeals.map((m) => (
          <article key={m.id} className={styles.mealCard}>
            <DishImage
              src={m.recipeSnapshot.imageUrl}
              alt={m.recipeSnapshot.name}
              tone={(m.recipeSnapshot.accentTone as 'clay' | 'moss' | 'turmeric' | 'tamarind') ?? 'clay'}
              aspect="4/3"
            />
            <div className={styles.mealCardTop}>
              <Badge tone="neutral">{m.mealType}</Badge>
              <span className={styles.mealCardPrice}>
                {formatMoney(m.costMinor, plan.input.currency)}
              </span>
            </div>
            <div>
              <h3 className={styles.mealCardTitle}>{m.recipeSnapshot.name}</h3>
              <p className={styles.sub}>
                {m.recipeSnapshot.localName} · {m.servings} servings · ~{m.kcalPerPerson} kcal/p
              </p>
            </div>
            <div className={styles.mealCardActions}>
              <Button size="sm" onClick={() => setSearchParams({ recipe: m.id })}>
                View recipe
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSwapTarget(m)}
              >
                <Swap size={15} /> Swap
              </Button>
              <Button
                size="sm"
                variant={m.cooked ? 'secondary' : 'ghost'}
                onClick={() => void handleToggleCooked(m)}
              >
                <CheckCircle size={15} weight={m.cooked ? 'fill' : 'regular'} />
                {m.cooked ? 'Cooked' : 'Mark cooked'}
              </Button>
            </div>
          </article>
        ))}
      </div>

      <RecipeDrawer
        open={Boolean(activeMeal)}
        onOpenChange={(open) => {
          if (!open) setSearchParams({});
        }}
        meal={activeMeal}
        currency={plan.input.currency}
        onUpdatePriceOverride={handleUpdatePriceOverride}
      />

      <SwapMealDialog
        open={Boolean(swapTarget)}
        onOpenChange={(open) => !open && setSwapTarget(null)}
        plan={plan}
        meals={bundle.meals}
        targetMeal={swapTarget}
        overrides={overrideMap}
        onSelectRecipe={handleSwapRecipe}
      />
    </div>
  );
}

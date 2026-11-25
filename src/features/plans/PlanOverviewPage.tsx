import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Copy,
  ListChecks,
  ShareNetwork,
  Wallet,
} from '@phosphor-icons/react';
import { formatMoney, type PlannedMeal } from '@shared/index';
import { BentoGrid } from '@/components/bento/BentoGrid';
import { BentoTile } from '@/components/bento/BentoTile';
import { RingProgress } from '@/components/charts/RingProgress';
import { Seo } from '@/components/seo/Seo';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/AuthProvider';
import { apiClient } from '@/lib/apiClient';
import {
  applyRecostedPlan,
  createOrGetShareSnapshot,
  getPlanBundle,
  listPriceOverrides,
  setPriceOverride,
} from '@/lib/firestoreRepo';
import { useUiStore } from '@/store/ui';
import { RecipeDrawer } from './RecipeDrawer';
import styles from './PlanShared.module.css';

export function PlanOverviewPage() {
  const { planId = '' } = useParams();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [sharing, setSharing] = useState(false);

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

  const activeRecipeParam = searchParams.get('recipe');
  const activeMeal = useMemo(
    () => bundle?.meals.find((m) => m.id === activeRecipeParam) ?? null,
    [bundle, activeRecipeParam]
  );

  const daysList = useMemo(() => {
    if (!bundle) return [];
    const grouped = new Map<number, PlannedMeal[]>();
    for (const m of bundle.meals) {
      const arr = grouped.get(m.day) ?? [];
      arr.push(m);
      grouped.set(m.day, arr);
    }
    return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
  }, [bundle]);

  async function handleShare() {
    if (!user || !bundle) return;
    setSharing(true);
    try {
      const shareId = await createOrGetShareSnapshot(
        user.uid,
        bundle.plan,
        bundle.meals,
        bundle.grocery
      );
      const url = `${window.location.origin}/share/${shareId}`;
      setShareUrl(url);
      setShareOpen(true);
    } catch (err) {
      pushToast({
        title: 'Could not create share link',
        description: err instanceof Error ? err.message : 'Please try again.',
        tone: 'tamarind',
      });
    } finally {
      setSharing(false);
    }
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
    pushToast({ title: 'Price updated & plan recosted', tone: 'moss' });
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="tile" />
        <Skeleton variant="tile" />
      </div>
    );
  }

  if (!bundle) {
    return (
      <EmptyState
        title="Plan not found"
        description="This meal plan may have been deleted."
        action={
          <Link to="/app/plans">
            <Button>Back to saved plans</Button>
          </Link>
        }
      />
    );
  }

  const { plan } = bundle;

  return (
    <div className={styles.page}>
      <Seo title={plan.name} noindex />

      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            {plan.input.days}-Day Menu · {plan.input.people}{' '}
            {plan.input.people === 1 ? 'person' : 'people'} · {plan.input.region}
          </span>
          <h1 className={styles.title}>{plan.name}</h1>
        </div>
        <div className={styles.actions}>
          <Link to={`/app/plans/${plan.id}/grocery`}>
            <Button>
              <ListChecks size={17} /> Grocery List ({bundle.grocery.length})
            </Button>
          </Link>
          <Link to={`/app/plans/${plan.id}/budget`}>
            <Button variant="outline">
              <Wallet size={17} /> Budget Monitor
            </Button>
          </Link>
          <Button variant="outline" loading={sharing} onClick={() => void handleShare()}>
            <ShareNetwork size={17} /> Share
          </Button>
        </div>
      </div>

      {plan.warnings.length > 0 && (
        <div className={styles.warningBox}>
          {plan.warnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      )}

      <BentoGrid columns={12}>
        <BentoTile colSpan={4} tone="paper2">
          <div className={styles.header}>
            <div>
              <span className={styles.eyebrow}>Shopping Checkout</span>
              <h2 className={styles.title}>
                {formatMoney(plan.summary.shoppingTotalMinor, plan.input.currency)}
              </h2>
              <p className={styles.sub}>
                of {formatMoney(plan.summary.budgetMinor, plan.input.currency)} cap
              </p>
            </div>
            <RingProgress value={plan.summary.utilizationPct} tone="moss" size={96} />
          </div>
        </BentoTile>

        <BentoTile colSpan={4} tone="card">
          <span className={styles.eyebrow}>Meals Consumed Value</span>
          <h2 className={styles.title}>
            {formatMoney(plan.summary.consumedMinor, plan.input.currency)}
          </h2>
          <p className={styles.sub}>
            Remaining headroom: {formatMoney(plan.summary.remainingMinor, plan.input.currency)}
          </p>
        </BentoTile>

        <BentoTile colSpan={4} tone="mossWash" leaf>
          <span className={styles.eyebrow}>Nutrition & Trips</span>
          <h2 className={styles.title}>{plan.summary.tripCount} {plan.summary.tripCount === 1 ? 'trip' : 'trips'}</h2>
          <p className={styles.sub}>
            ~{plan.summary.nutritionAvg.kcal} kcal · {plan.summary.nutritionAvg.proteinG}g protein / person / day
          </p>
        </BentoTile>
      </BentoGrid>

      <div className={styles.dayGrid}>
        {daysList.map(([dayNum, dayMeals]) => {
          const dayMinor = plan.summary.perDayMinor[dayNum - 1] ?? 0;
          return (
            <section key={dayNum} className={styles.dayCard}>
              <div className={styles.dayCardHead}>
                <Link to={`/app/plans/${plan.id}/day/${dayNum}`}>Day {dayNum} →</Link>
                <span className={styles.dayCost}>
                  {formatMoney(dayMinor, plan.input.currency)}
                </span>
              </div>
              <div className={styles.slotList}>
                {dayMeals.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={styles.slotBtn}
                    onClick={() => setSearchParams({ recipe: m.id })}
                  >
                    <div>
                      <span className={styles.slotType}>
                        {m.mealType} {m.cooked ? '· Cooked' : ''}
                      </span>
                      <span className={styles.slotName}>{m.recipeSnapshot.name}</span>
                    </div>
                    <span className={styles.slotPrice}>
                      {formatMoney(m.costMinor, plan.input.currency)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
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

      <Dialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        title="Share read-only plan"
        description="Anyone with this link can view your menu and shopping checklist without signing in. Your email and account stay private."
      >
        <div className={styles.actions}>
          <Badge tone="neutral">{shareUrl}</Badge>
          <Button
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(shareUrl);
              pushToast({ title: 'Share link copied', tone: 'moss' });
            }}
          >
            <Copy size={15} /> Copy link
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

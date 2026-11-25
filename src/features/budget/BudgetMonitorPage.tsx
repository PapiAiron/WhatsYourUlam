import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from '@phosphor-icons/react';
import { AISLE_LABELS, formatMoney, type AisleCategory } from '@shared/index';
import { BentoGrid } from '@/components/bento/BentoGrid';
import { BentoTile } from '@/components/bento/BentoTile';
import { Donut, type DonutSlice } from '@/components/charts/Donut';
import { Sparkline } from '@/components/charts/Sparkline';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/AuthProvider';
import { getPlanBundle } from '@/lib/firestoreRepo';
import styles from './BudgetMonitorPage.module.css';

export function BudgetMonitorPage() {
  const { planId = '' } = useParams();
  const { user } = useAuth();

  const { data: bundle, isLoading } = useQuery({
    queryKey: ['planBundle', user?.uid, planId],
    queryFn: () => (user && planId ? getPlanBundle(user.uid, planId) : Promise.resolve(null)),
    enabled: Boolean(user && planId),
  });

  const cumulativeSeries = useMemo(() => {
    if (!bundle) return [];
    let running = 0;
    return bundle.plan.summary.perDayMinor.map((d) => {
      running += d;
      return running;
    });
  }, [bundle]);

  const aisleSlices: DonutSlice[] = useMemo(() => {
    if (!bundle) return [];
    const totals = new Map<AisleCategory, number>();
    for (const g of bundle.grocery) {
      totals.set(g.category, (totals.get(g.category) ?? 0) + g.lineTotalMinor);
    }
    const tones: DonutSlice['tone'][] = ['clay', 'moss', 'turmeric', 'tamarind', 'ink'];
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, value], i) => ({
        label: AISLE_LABELS[cat] ?? cat,
        value,
        tone: tones[i % tones.length],
      }));
  }, [bundle]);

  if (isLoading) return <Skeleton variant="tile" />;
  if (!bundle) {
    return (
      <EmptyState
        title="Plan not found"
        description="Return to saved plans."
        action={
          <Link to="/app/plans">
            <Button>Saved plans</Button>
          </Link>
        }
      />
    );
  }

  const { plan, grocery } = bundle;
  const actualLoggedMinor = grocery.reduce(
    (s, g) => s + (g.purchased ? g.actualPaidMinor ?? g.lineTotalMinor : 0),
    0
  );

  return (
    <div className={styles.page}>
      <Seo title={`Budget Monitor · ${plan.name}`} noindex />

      <div className={styles.header}>
        <div>
          <Link to={`/app/plans/${plan.id}`} className={styles.backLink}>
            <ArrowLeft size={14} /> Back to {plan.name}
          </Link>
          <h1 className={styles.title}>Budget Monitor</h1>
        </div>
        <Link to={`/app/plans/${plan.id}/grocery`}>
          <Button variant="outline">Open grocery checklist</Button>
        </Link>
      </div>

      <BentoGrid columns={12}>
        <BentoTile colSpan={4} tone="card">
          <span className={styles.eyebrow}>Target Cap</span>
          <strong className={styles.big}>
            {formatMoney(plan.summary.budgetMinor, plan.input.currency)}
          </strong>
          <span className={styles.sub}>Remaining headroom: {formatMoney(plan.summary.remainingMinor, plan.input.currency)}</span>
        </BentoTile>
        <BentoTile colSpan={4} tone="mossWash">
          <span className={styles.eyebrow}>Planned Checkout</span>
          <strong className={styles.big}>
            {formatMoney(plan.summary.shoppingTotalMinor, plan.input.currency)}
          </strong>
          <span className={styles.sub}>{plan.summary.utilizationPct}% of budget used</span>
        </BentoTile>
        <BentoTile colSpan={4} tone="paper2">
          <span className={styles.eyebrow}>Actual Logged Paid</span>
          <strong className={styles.big}>
            {formatMoney(actualLoggedMinor, plan.input.currency)}
          </strong>
          <span className={styles.sub}>Recorded from grocery check-offs</span>
        </BentoTile>

        <BentoTile colSpan={7} tone="card">
          <span className={styles.eyebrow}>Cumulative Daily Plate Value vs Budget Cap</span>
          <h2 className={styles.cardTitle}>Day-by-day spending trajectory</h2>
          <Sparkline
            values={cumulativeSeries}
            capLineValue={plan.summary.budgetMinor}
            height={140}
          />
          <p className={styles.sub}>
            Dashed line marks your {formatMoney(plan.summary.budgetMinor, plan.input.currency)} ceiling.
          </p>
        </BentoTile>

        <BentoTile colSpan={5} tone="card">
          <span className={styles.eyebrow}>Grocery Mix</span>
          <h2 className={styles.cardTitle}>Spend by market aisle</h2>
          <Donut
            slices={aisleSlices}
            centerLabel={formatMoney(plan.summary.shoppingTotalMinor, plan.input.currency, 'en-PH', {
              compactDecimals: true,
            })}
            centerSub="total list"
          />
        </BentoTile>
      </BentoGrid>
    </div>
  );
}

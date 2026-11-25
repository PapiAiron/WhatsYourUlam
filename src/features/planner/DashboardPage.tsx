import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarBlank,
  ListChecks,
  PlusCircle,
  Wallet,
} from '@phosphor-icons/react';
import { formatMoney } from '@shared/index';
import { BentoGrid } from '@/components/bento/BentoGrid';
import { BentoTile } from '@/components/bento/BentoTile';
import { RingProgress } from '@/components/charts/RingProgress';
import { Seo } from '@/components/seo/Seo';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/AuthProvider';
import { listPriceOverrides, listUserPlans } from '@/lib/firestoreRepo';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const { user, profile } = useAuth();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans', user?.uid],
    queryFn: () => (user ? listUserPlans(user.uid) : Promise.resolve([])),
    enabled: Boolean(user),
  });

  const { data: overrides = {} } = useQuery({
    queryKey: ['priceOverrides', user?.uid],
    queryFn: () => (user ? listPriceOverrides(user.uid) : Promise.resolve({})),
    enabled: Boolean(user),
  });

  const activePlan = plans[0];
  const overrideCount = Object.keys(overrides).length;

  return (
    <div className={styles.page}>
      <Seo title="Dashboard" noindex />

      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Kitchen Overview</span>
          <h1 className={styles.title}>
            Good day, {profile?.displayName?.split(' ')[0] || 'Cook'}
          </h1>
        </div>
        <Link to="/app/new">
          <Button size="lg">
            <PlusCircle size={18} weight="bold" /> Plan a new budget
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <BentoGrid columns={12}>
          <BentoTile colSpan={8}><Skeleton variant="tile" /></BentoTile>
          <BentoTile colSpan={4}><Skeleton variant="tile" /></BentoTile>
        </BentoGrid>
      ) : !activePlan ? (
        <EmptyState
          icon={<CalendarBlank size={26} />}
          title="No meal plans yet"
          description="Tell us your peso budget and household size, and we will build a pack-costed Filipino home menu in seconds."
          action={
            <Link to="/app/new">
              <Button size="lg">Create your first plan</Button>
            </Link>
          }
        />
      ) : (
        <BentoGrid columns={12}>
          <BentoTile colSpan={8} tone="card" leaf>
            <div className={styles.planTop}>
              <div>
                <Badge tone="moss">Active plan</Badge>
                <h2 className={styles.planTitle}>{activePlan.name}</h2>
                <p className={styles.planSub}>
                  {activePlan.input.days} days · {activePlan.input.people}{' '}
                  {activePlan.input.people === 1 ? 'person' : 'people'} ·{' '}
                  {activePlan.input.region}
                </p>
              </div>
              <RingProgress
                value={activePlan.summary.utilizationPct}
                label={`${activePlan.summary.utilizationPct}%`}
                sublabel="budget used"
                tone="moss"
              />
            </div>

            <div className={styles.metricsRow}>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Target Budget</span>
                <strong className={styles.metricVal}>
                  {formatMoney(activePlan.summary.budgetMinor, activePlan.input.currency)}
                </strong>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Grocery Total</span>
                <strong className={styles.metricVal}>
                  {formatMoney(activePlan.summary.shoppingTotalMinor, activePlan.input.currency)}
                </strong>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Avg per Meal</span>
                <strong className={styles.metricVal}>
                  {formatMoney(activePlan.summary.avgMealMinor, activePlan.input.currency)}
                </strong>
              </div>
            </div>

            <div className={styles.actionsRow}>
              <Link to={`/app/plans/${activePlan.id}`}>
                <Button>
                  Open menu <ArrowRight size={16} weight="bold" />
                </Button>
              </Link>
              <Link to={`/app/plans/${activePlan.id}/grocery`}>
                <Button variant="outline">
                  <ListChecks size={16} /> Grocery checklist
                </Button>
              </Link>
              <Link to={`/app/plans/${activePlan.id}/budget`}>
                <Button variant="ghost">
                  <Wallet size={16} /> Budget monitor
                </Button>
              </Link>
            </div>
          </BentoTile>

          <BentoTile colSpan={4} tone="paper2">
            <span className={styles.eyebrow}>Quick stats</span>
            <h3 className={styles.sideTitle}>Your Kitchen Ledger</h3>
            <div className={styles.ledger}>
              <div className={styles.ledgerRow}>
                <span>Saved plans</span>
                <strong>{plans.length}</strong>
              </div>
              <div className={styles.ledgerRow}>
                <span>Custom local prices</span>
                <strong>{overrideCount}</strong>
              </div>
              <div className={styles.ledgerRow}>
                <span>Shopping trips in plan</span>
                <strong>{activePlan.summary.tripCount}</strong>
              </div>
              <div className={styles.ledgerRow}>
                <span>Leftover pantry value</span>
                <strong>
                  {formatMoney(activePlan.summary.leftoverValueMinor, activePlan.input.currency)}
                </strong>
              </div>
            </div>
            <Link to="/app/prices" className={styles.sideLink}>
              Edit local market prices →
            </Link>
          </BentoTile>

          <BentoTile colSpan={12} tone="card">
            <div className={styles.recentHead}>
              <h3 className={styles.sideTitle}>Recent Meal Plans</h3>
              <Link to="/app/plans" className={styles.sideLink}>
                View all ({plans.length}) →
              </Link>
            </div>
            <div className={styles.planList}>
              {plans.slice(0, 4).map((p) => (
                <Link key={p.id} to={`/app/plans/${p.id}`} className={styles.planRow}>
                  <div>
                    <strong>{p.name}</strong>
                    <span>
                      {p.input.days} days · {p.input.people} people · starts {p.input.startDate}
                    </span>
                  </div>
                  <div className={styles.planRowRight}>
                    <strong>
                      {formatMoney(p.summary.shoppingTotalMinor, p.input.currency)}
                    </strong>
                    <span>of {formatMoney(p.summary.budgetMinor, p.input.currency)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </BentoTile>
        </BentoGrid>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Printer } from '@phosphor-icons/react';
import {
  AISLE_LABELS,
  AISLE_ORDER,
  formatMoney,
  type AisleCategory,
  type GroceryItem,
} from '@shared/index';
import clsx from 'clsx';
import { BentoGrid } from '@/components/bento/BentoGrid';
import { BentoTile } from '@/components/bento/BentoTile';
import { Seo } from '@/components/seo/Seo';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/AuthProvider';
import { getPlanBundle, updateGroceryPurchase } from '@/lib/firestoreRepo';
import { useUiStore } from '@/store/ui';
import styles from './GroceryListPage.module.css';

export function GroceryListPage() {
  const { planId = '' } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  const [selectedTrip, setSelectedTrip] = useState<number | 'all'>('all');
  const [editingPaidId, setEditingPaidId] = useState<string | null>(null);
  const [paidMajor, setPaidMajor] = useState(0);

  const { data: bundle, isLoading } = useQuery({
    queryKey: ['planBundle', user?.uid, planId],
    queryFn: () => (user && planId ? getPlanBundle(user.uid, planId) : Promise.resolve(null)),
    enabled: Boolean(user && planId),
  });

  const trips = useMemo(() => {
    if (!bundle) return [];
    const set = new Set<number>();
    bundle.grocery.forEach((g) => set.add(g.trip));
    return Array.from(set).sort((a, b) => a - b);
  }, [bundle]);

  const filtered = useMemo(() => {
    if (!bundle) return [];
    return selectedTrip === 'all'
      ? bundle.grocery
      : bundle.grocery.filter((g) => g.trip === selectedTrip);
  }, [bundle, selectedTrip]);

  const groupedByTripAndAisle = useMemo(() => {
    const tripMap = new Map<number, Map<AisleCategory, GroceryItem[]>>();
    for (const item of filtered) {
      if (!tripMap.has(item.trip)) tripMap.set(item.trip, new Map());
      const aisleMap = tripMap.get(item.trip)!;
      const arr = aisleMap.get(item.category) ?? [];
      arr.push(item);
      aisleMap.set(item.category, arr);
    }
    return Array.from(tripMap.entries()).sort((a, b) => a[0] - b[0]);
  }, [filtered]);

  async function togglePurchased(item: GroceryItem) {
    if (!user || !bundle) return;
    const next = !item.purchased;
    await updateGroceryPurchase(user.uid, bundle.plan.id, item.id, {
      purchased: next,
      purchasedAt: next ? new Date().toISOString() : null,
      actualPaidMinor: next ? item.actualPaidMinor ?? item.lineTotalMinor : null,
    });
    await queryClient.invalidateQueries({ queryKey: ['planBundle', user.uid, planId] });
  }

  async function saveActualPaid(item: GroceryItem) {
    if (!user || !bundle) return;
    const factor = bundle.plan.input.currency === 'JPY' ? 1 : 100;
    const minor = Math.max(0, Math.round(paidMajor * factor));
    await updateGroceryPurchase(user.uid, bundle.plan.id, item.id, {
      purchased: true,
      purchasedAt: item.purchasedAt ?? new Date().toISOString(),
      actualPaidMinor: minor,
    });
    await queryClient.invalidateQueries({ queryKey: ['planBundle', user.uid, planId] });
    setEditingPaidId(null);
    pushToast({ title: `Saved actual paid for ${item.name}`, tone: 'moss' });
  }

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
  const purchasedCount = grocery.filter((g) => g.purchased).length;
  const actualSpentMinor = grocery.reduce(
    (s, g) => s + (g.purchased ? g.actualPaidMinor ?? g.lineTotalMinor : 0),
    0
  );

  return (
    <div className={styles.page}>
      <Seo title={`Grocery List · ${plan.name}`} noindex />

      <div className={styles.header}>
        <div>
          <Link to={`/app/plans/${plan.id}`} className={clsx(styles.backLink, 'noPrint')}>
            <ArrowLeft size={14} /> Back to {plan.name}
          </Link>
          <h1 className={styles.title}>Grocery Checklist</h1>
          <p className={styles.sub}>
            Pack-accurate quantities grouped by market trip & wet-market section
          </p>
        </div>

        <div className={clsx(styles.actions, 'noPrint')}>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer size={17} /> Print list
          </Button>
        </div>
      </div>

      <BentoGrid columns={12}>
        <BentoTile colSpan={4} tone="paper2">
          <span className={styles.eyebrow}>Checked Off</span>
          <strong className={styles.statBig}>
            {purchasedCount} / {grocery.length}
          </strong>
          <span className={styles.sub}>grocery packs bought</span>
        </BentoTile>
        <BentoTile colSpan={4} tone="card">
          <span className={styles.eyebrow}>Estimated Checkout</span>
          <strong className={styles.statBig}>
            {formatMoney(plan.summary.shoppingTotalMinor, plan.input.currency)}
          </strong>
          <span className={styles.sub}>across {trips.length} market trip(s)</span>
        </BentoTile>
        <BentoTile colSpan={4} tone="mossWash">
          <span className={styles.eyebrow}>Actual Logged Spend</span>
          <strong className={styles.statBig}>
            {formatMoney(actualSpentMinor, plan.input.currency)}
          </strong>
          <span className={styles.sub}>updates as you check off items</span>
        </BentoTile>
      </BentoGrid>

      {trips.length > 1 && (
        <div className={clsx(styles.tripTabs, 'noPrint')}>
          <button
            type="button"
            className={clsx(styles.tripBtn, selectedTrip === 'all' && styles.tripBtnActive)}
            onClick={() => setSelectedTrip('all')}
          >
            All trips ({grocery.length})
          </button>
          {trips.map((t) => (
            <button
              key={t}
              type="button"
              className={clsx(styles.tripBtn, selectedTrip === t && styles.tripBtnActive)}
              onClick={() => setSelectedTrip(t)}
            >
              Trip {t}
            </button>
          ))}
        </div>
      )}

      <div className={styles.tripsStack}>
        {groupedByTripAndAisle.map(([tripNum, aisleMap]) => {
          const tripItems = Array.from(aisleMap.values()).flat();
          const tripTotal = tripItems.reduce((s, g) => s + g.lineTotalMinor, 0);
          const first = tripItems[0];
          return (
            <section key={tripNum} className={styles.tripSection}>
              <div className={styles.tripHeader}>
                <div>
                  <h2 className={styles.tripTitle}>
                    Trip {tripNum} · Days {first?.tripDayStart}–{first?.tripDayEnd}
                  </h2>
                  <p className={styles.sub}>{tripItems.length} items to pick up</p>
                </div>
                <strong className={styles.tripCost}>
                  {formatMoney(tripTotal, plan.input.currency)}
                </strong>
              </div>

              <div className={styles.aisleList}>
                {AISLE_ORDER.map((aisle) => {
                  const items = aisleMap.get(aisle);
                  if (!items || items.length === 0) return null;
                  return (
                    <div key={aisle} className={styles.aisleGroup}>
                      <h3 className={styles.aisleHeading}>{AISLE_LABELS[aisle]}</h3>
                      <div className={styles.items}>
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className={clsx(
                              styles.itemRow,
                              item.purchased && styles.itemPurchased
                            )}
                          >
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={item.purchased}
                              onClick={() => void togglePurchased(item)}
                              className={styles.checkBtn}
                              aria-label={`Mark ${item.name} as purchased`}
                            >
                              {item.purchased && <Check size={16} weight="bold" />}
                            </button>

                            <div className={styles.itemBody}>
                              <div className={styles.itemTop}>
                                <strong className={styles.itemName}>{item.name}</strong>
                                <Badge tone={item.priceSource === 'user' ? 'moss' : 'neutral'}>
                                  {item.priceSource === 'user' ? 'Your price' : 'Estimate'}
                                </Badge>
                              </div>
                              <div className={styles.itemMeta}>
                                <span>
                                  Buy <strong>{item.packsToBuy} × {item.packLabel}</strong> (recipe need:{' '}
                                  {item.neededQty} {item.unit})
                                </span>
                                {item.leftoverQty > 0 && (
                                  <span className={styles.leftoverNote}>
                                    Leftover: {item.leftoverQty} {item.unit}
                                  </span>
                                )}
                              </div>
                              <div className={styles.usedIn}>
                                Used in: {item.usedIn.slice(0, 4).join(', ')}
                                {item.usedIn.length > 4 ? ` +${item.usedIn.length - 4} more` : ''}
                              </div>
                            </div>

                            <div className={styles.itemRight}>
                              <span className={styles.linePrice}>
                                {formatMoney(
                                  item.actualPaidMinor ?? item.lineTotalMinor,
                                  plan.input.currency
                                )}
                              </span>
                              <button
                                type="button"
                                className={clsx(styles.logPaidBtn, 'noPrint')}
                                onClick={() => {
                                  setEditingPaidId(item.id);
                                  setPaidMajor(
                                    Number(
                                      (
                                        (item.actualPaidMinor ?? item.lineTotalMinor) /
                                        (plan.input.currency === 'JPY' ? 1 : 100)
                                      ).toFixed(2)
                                    )
                                  );
                                }}
                              >
                                Log paid
                              </button>
                            </div>

                            {editingPaidId === item.id && (
                              <div className={clsx(styles.paidBox, 'noPrint')}>
                                <CurrencyInput
                                  currency={plan.input.currency}
                                  value={paidMajor}
                                  onChange={setPaidMajor}
                                />
                                <Button size="sm" onClick={() => void saveActualPaid(item)}>
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingPaidId(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

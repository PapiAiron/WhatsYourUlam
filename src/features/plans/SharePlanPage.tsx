import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatMoney } from '@shared/index';
import { BentoGrid } from '@/components/bento/BentoGrid';
import { BentoTile } from '@/components/bento/BentoTile';
import { Wordmark } from '@/components/brand/Wordmark';
import { Seo } from '@/components/seo/Seo';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { getPublicShare } from '@/lib/firestoreRepo';
import styles from './PlanShared.module.css';

export function SharePlanPage() {
  const { shareId = '' } = useParams();

  const { data: share, isLoading } = useQuery({
    queryKey: ['publicShare', shareId],
    queryFn: () => (shareId ? getPublicShare(shareId) : Promise.resolve(null)),
    enabled: Boolean(shareId),
  });

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="tile" />
      </div>
    );
  }

  if (!share) {
    return (
      <div className={styles.page}>
        <Wordmark to="/" />
        <EmptyState
          title="Shared plan not found"
          description="This snapshot may have been removed by its owner."
          action={
            <Link to="/">
              <Button>Go home</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const mealsByDay = new Map<number, typeof share.meals>();
  for (const m of share.meals) {
    const arr = mealsByDay.get(m.day) ?? [];
    arr.push(m);
    mealsByDay.set(m.day, arr);
  }

  return (
    <div className={styles.page}>
      <Seo title={`${share.planName} · Shared Plan`} />
      <div className={styles.header}>
        <div>
          <Wordmark to="/" size="sm" />
          <h1 className={styles.title}>{share.planName}</h1>
          <p className={styles.sub}>Read-only household meal plan snapshot</p>
        </div>
        <Link to="/signup">
          <Button>Plan your own budget</Button>
        </Link>
      </div>

      <BentoGrid columns={12}>
        <BentoTile colSpan={6} tone="mossWash">
          <span className={styles.eyebrow}>Grocery Total</span>
          <h2 className={styles.title}>{formatMoney(share.summary.shoppingTotalMinor, 'PHP')}</h2>
        </BentoTile>
        <BentoTile colSpan={6} tone="paper2">
          <span className={styles.eyebrow}>Budget Cap</span>
          <h2 className={styles.title}>{formatMoney(share.summary.budgetMinor, 'PHP')}</h2>
        </BentoTile>
      </BentoGrid>

      <div className={styles.dayGrid}>
        {Array.from(mealsByDay.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([day, list]) => (
            <section key={day} className={styles.dayCard}>
              <div className={styles.dayCardHead}>
                <strong>Day {day}</strong>
              </div>
              <div className={styles.slotList}>
                {list.map((m) => (
                  <div key={m.id} className={styles.slotBtn}>
                    <div>
                      <span className={styles.slotType}>{m.mealType}</span>
                      <span className={styles.slotName}>{m.recipeSnapshot.name}</span>
                    </div>
                    <Badge tone="neutral">{formatMoney(m.costMinor, 'PHP')}</Badge>
                  </div>
                ))}
              </div>
            </section>
          ))}
      </div>

      <BentoTile colSpan={12} tone="card">
        <h2 className={styles.subHeading}>Shopping Checklist ({share.grocery.length} packs)</h2>
        <div className={styles.ingTable}>
          {share.grocery.map((g) => (
            <div key={g.id} className={styles.ingRow}>
              <div className={styles.ingInfo}>
                <strong>{g.name}</strong>
                <span className={styles.ingQty}>
                  Trip {g.trip} · {g.packsToBuy} × {g.packLabel} (need {g.neededQty} {g.unit})
                </span>
              </div>
              <span className={styles.ingCost}>{formatMoney(g.lineTotalMinor, 'PHP')}</span>
            </div>
          ))}
        </div>
      </BentoTile>
    </div>
  );
}

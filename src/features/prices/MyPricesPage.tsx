import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowCounterClockwise, Check, MagnifyingGlass } from '@phosphor-icons/react';
import {
  AISLE_LABELS,
  formatMoney,
  getSeedPriceBookForRegion,
  SEED_INGREDIENTS,
} from '@shared/index';
import { Seo } from '@/components/seo/Seo';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  deletePriceOverride,
  listPriceOverrides,
  setPriceOverride,
} from '@/lib/firestoreRepo';
import { useUiStore } from '@/store/ui';
import styles from './MyPricesPage.module.css';

export function MyPricesPage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  const region = profile?.region || 'NCR';
  const currency = profile?.currency || 'PHP';

  const [queryText, setQueryText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMajor, setEditMajor] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: overrides = {} } = useQuery({
    queryKey: ['priceOverrides', user?.uid],
    queryFn: () => (user ? listPriceOverrides(user.uid) : Promise.resolve<Awaited<ReturnType<typeof listPriceOverrides>>>({})),
    enabled: Boolean(user),
  });

  const priceBook = useMemo(() => getSeedPriceBookForRegion(region), [region]);

  const rows = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return SEED_INGREDIENTS.filter((ing) => {
      if (!q) return true;
      return (
        ing.names.en.toLowerCase().includes(q) ||
        ing.names.local.toLowerCase().includes(q) ||
        ing.category.includes(q)
      );
    }).map((ing) => {
      const seedEntry = priceBook.get(ing.id);
      const basePack = seedEntry?.packs[0];
      const override = overrides[ing.id];
      return {
        ing,
        basePack,
        override,
        activeMinor: override?.packPriceMinor ?? basePack?.priceMinor ?? 3500,
      };
    });
  }, [queryText, priceBook, overrides]);

  async function handleSave(ingredientId: string) {
    if (!user) return;
    setBusyId(ingredientId);
    try {
      const minor = Math.max(100, Math.round(editMajor * 100));
      await setPriceOverride(user.uid, ingredientId, minor);
      await queryClient.invalidateQueries({ queryKey: ['priceOverrides', user.uid] });
      setEditingId(null);
      pushToast({ title: 'Local price saved', tone: 'moss' });
    } finally {
      setBusyId(null);
    }
  }

  async function handleReset(ingredientId: string) {
    if (!user) return;
    setBusyId(ingredientId);
    try {
      await deletePriceOverride(user.uid, ingredientId);
      await queryClient.invalidateQueries({ queryKey: ['priceOverrides', user.uid] });
      pushToast({ title: 'Reset to regional average', tone: 'default' });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={styles.page}>
      <Seo title="My Local Prices" noindex />

      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Market Ledger · {region}</span>
          <h1 className={styles.title}>My Local Ingredient Prices</h1>
          <p className={styles.sub}>
            Customize any pack price to match your local palengke or grocery stall. Overrides apply automatically to all new plans.
          </p>
        </div>
      </div>

      <div className={styles.searchWrap}>
        <MagnifyingGlass size={18} className={styles.searchIcon} />
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Filter rice, chicken, garlic, pork belly..."
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
        />
      </div>

      <div className={styles.list}>
        {rows.map(({ ing, basePack, override, activeMinor }) => {
          const isEditing = editingId === ing.id;
          return (
            <div key={ing.id} className={styles.row}>
              <div className={styles.info}>
                <div className={styles.nameRow}>
                  <strong>{ing.names.en}</strong>
                  <Badge tone={override ? 'moss' : 'neutral'}>
                    {override ? 'Your price' : 'Market avg'}
                  </Badge>
                </div>
                <span className={styles.meta}>
                  {ing.names.local} · {AISLE_LABELS[ing.category]} · Pack:{' '}
                  {basePack?.label ?? ing.defaultPackLabel}
                </span>
              </div>

              <div className={styles.priceCol}>
                <strong className={styles.price}>
                  {formatMoney(activeMinor, currency)}
                </strong>
                <div className={styles.rowActions}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(ing.id);
                      setEditMajor(Number((activeMinor / 100).toFixed(2)));
                    }}
                  >
                    Edit
                  </Button>
                  {override && (
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={busyId === ing.id}
                      onClick={() => void handleReset(ing.id)}
                      aria-label={`Reset ${ing.names.en}`}
                    >
                      <ArrowCounterClockwise size={15} />
                    </Button>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className={styles.editBox}>
                  <CurrencyInput
                    currency={currency}
                    value={editMajor}
                    onChange={setEditMajor}
                    min={1}
                  />
                  <Button
                    size="sm"
                    loading={busyId === ing.id}
                    onClick={() => void handleSave(ing.id)}
                  >
                    <Check size={15} /> Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

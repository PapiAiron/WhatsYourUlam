import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderSimple, PlusCircle, Trash } from '@phosphor-icons/react';
import { formatMoney, type PlanDocument } from '@shared/index';
import { Seo } from '@/components/seo/Seo';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, fieldStyles } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  deletePlanCascade,
  listUserPlans,
  updatePlanMeta,
} from '@/lib/firestoreRepo';
import { useUiStore } from '@/store/ui';
import styles from './PlanShared.module.css';

export function SavedPlansPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  const [renameTarget, setRenameTarget] = useState<PlanDocument | null>(null);
  const [newName, setNewName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<PlanDocument | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans', user?.uid],
    queryFn: () => (user ? listUserPlans(user.uid) : Promise.resolve([])),
    enabled: Boolean(user),
  });

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !renameTarget || !newName.trim()) return;
    setBusy(true);
    try {
      await updatePlanMeta(user.uid, renameTarget.id, { name: newName.trim() });
      await queryClient.invalidateQueries({ queryKey: ['plans', user.uid] });
      pushToast({ title: 'Plan renamed', tone: 'moss' });
      setRenameTarget(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!user || !deleteTarget) return;
    setBusy(true);
    try {
      await deletePlanCascade(user.uid, deleteTarget.id);
      await queryClient.invalidateQueries({ queryKey: ['plans', user.uid] });
      pushToast({ title: 'Plan deleted', tone: 'default' });
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <Seo title="Saved Plans" noindex />

      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>History</span>
          <h1 className={styles.title}>Saved Meal Plans</h1>
        </div>
        <Link to="/app/new">
          <Button>
            <PlusCircle size={18} /> New plan
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className={styles.plansGrid}>
          <Skeleton variant="tile" />
          <Skeleton variant="tile" />
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={<FolderSimple size={26} />}
          title="No saved plans yet"
          description="Create a meal plan from your peso budget and it will appear here."
          action={
            <Link to="/app/new">
              <Button>Build a meal plan</Button>
            </Link>
          }
        />
      ) : (
        <div className={styles.plansGrid}>
          {plans.map((p) => (
            <article key={p.id} className={styles.savedCard}>
              <div className={styles.savedCardHead}>
                <div>
                  <h2 className={styles.savedCardTitle}>{p.name}</h2>
                  <p className={styles.sub}>
                    {p.input.days} days · {p.input.people}{' '}
                    {p.input.people === 1 ? 'person' : 'people'} · {p.input.region}
                  </p>
                </div>
                <Badge tone="moss">{p.summary.utilizationPct}%</Badge>
              </div>

              <div>
                <strong>{formatMoney(p.summary.shoppingTotalMinor, p.input.currency)}</strong>{' '}
                <span className={styles.sub}>
                  of {formatMoney(p.summary.budgetMinor, p.input.currency)} budget
                </span>
              </div>

              <div className={styles.actions}>
                <Link to={`/app/plans/${p.id}`}>
                  <Button size="sm">Open menu</Button>
                </Link>
                <Link to={`/app/plans/${p.id}/grocery`}>
                  <Button size="sm" variant="outline">
                    Grocery
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setRenameTarget(p);
                    setNewName(p.name);
                  }}
                >
                  Rename
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteTarget(p)}
                  aria-label={`Delete ${p.name}`}
                >
                  <Trash size={16} />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(renameTarget)}
        onOpenChange={(o) => !o && setRenameTarget(null)}
        title="Rename meal plan"
      >
        <form onSubmit={handleRename} className={styles.slotList}>
          <Field label="Plan name" htmlFor="rename-input">
            <input
              id="rename-input"
              required
              maxLength={100}
              className={fieldStyles.input}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </Field>
          <div className={styles.actions}>
            <Button type="submit" loading={busy}>
              Save name
            </Button>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete meal plan?"
        description={`This removes "${deleteTarget?.name}" and its grocery checklist permanently.`}
      >
        <div className={styles.actions}>
          <Button variant="danger" loading={busy} onClick={() => void handleDelete()}>
            Delete permanently
          </Button>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

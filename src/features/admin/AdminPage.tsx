import { useState } from 'react';
import { DownloadSimple } from '@phosphor-icons/react';
import {
  formatMoney,
  SEED_INGREDIENTS,
  SEED_PRICES_PH,
  SEED_RECIPES_PH,
} from '@shared/index';
import { BentoGrid } from '@/components/bento/BentoGrid';
import { BentoTile } from '@/components/bento/BentoTile';
import { Seo } from '@/components/seo/Seo';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { saveAdminRecipe } from '@/lib/firestoreRepo';
import { useUiStore } from '@/store/ui';
import styles from './AdminPage.module.css';

export function AdminPage() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [syncing, setSyncing] = useState(false);

  function handleExportCsv() {
    const header = 'ingredientId,name,packLabel,size,unit,priceMinor\n';
    const lines = SEED_PRICES_PH.map((p) => {
      const ing = SEED_INGREDIENTS.find((i) => i.id === p.ingredientId);
      const pack = p.packs[0];
      return `${p.ingredientId},"${ing?.names.en ?? p.ingredientId}","${pack.label}",${pack.size},${pack.unit},${pack.priceMinor}`;
    }).join('\n');

    const blob = new Blob([header + lines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ph-ncr-pricebook.csv';
    a.click();
    URL.revokeObjectURL(url);
    pushToast({ title: 'Price book CSV exported', tone: 'moss' });
  }

  async function handlePublishSeedsToFirestore() {
    setSyncing(true);
    try {
      for (const r of SEED_RECIPES_PH.slice(0, 10)) {
        await saveAdminRecipe(r);
      }
      pushToast({ title: 'Synced sample recipes to Firestore /recipes', tone: 'moss' });
    } catch (err) {
      pushToast({
        title: 'Firestore sync error',
        description: err instanceof Error ? err.message : 'Check admin rules.',
        tone: 'tamarind',
      });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className={styles.page}>
      <Seo title="Admin Console" noindex />

      <div className={styles.header}>
        <span className={styles.eyebrow}>Operations · Admin Only</span>
        <h1 className={styles.title}>Catalog & Price Console</h1>
      </div>

      <BentoGrid columns={12}>
        <BentoTile colSpan={4} tone="paper2">
          <span className={styles.eyebrow}>Ingredients</span>
          <strong className={styles.stat}>{SEED_INGREDIENTS.length}</strong>
          <span className={styles.sub}>standardized metric items</span>
        </BentoTile>
        <BentoTile colSpan={4} tone="card">
          <span className={styles.eyebrow}>Price Entries (NCR)</span>
          <strong className={styles.stat}>{SEED_PRICES_PH.length}</strong>
          <span className={styles.sub}>multi-pack tiers</span>
        </BentoTile>
        <BentoTile colSpan={4} tone="mossWash">
          <span className={styles.eyebrow}>Verified Dishes</span>
          <strong className={styles.stat}>{SEED_RECIPES_PH.length}</strong>
          <span className={styles.sub}>approved home recipes</span>
        </BentoTile>

        <BentoTile colSpan={12} tone="card">
          <div className={styles.rowBetween}>
            <div>
              <h2 className={styles.cardTitle}>Price Book & Recipe Sync</h2>
              <p className={styles.sub}>
                Export the NCR seed price table or publish seed recipes into the shared Firestore collection.
              </p>
            </div>
            <div className={styles.actions}>
              <Button variant="outline" onClick={handleExportCsv}>
                <DownloadSimple size={17} /> Export CSV
              </Button>
              <Button loading={syncing} onClick={() => void handlePublishSeedsToFirestore()}>
                Sync recipes to Firestore
              </Button>
            </div>
          </div>

          <div className={styles.table}>
            {SEED_PRICES_PH.slice(0, 12).map((entry) => (
              <div key={entry.id} className={styles.tableRow}>
                <span>{entry.ingredientId}</span>
                <span>{entry.packs[0]?.label}</span>
                <Badge tone="neutral">{entry.source}</Badge>
                <strong>{formatMoney(entry.packs[0]?.priceMinor ?? 0, 'PHP')}</strong>
              </div>
            ))}
          </div>
        </BentoTile>
      </BentoGrid>
    </div>
  );
}

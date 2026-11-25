import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ALLERGEN_OPTIONS,
  COUNTRIES,
  EQUIPMENT_OPTIONS,
  PREFERENCE_OPTIONS,
  type AllergenId,
  type CountryCode,
  type EquipmentId,
} from '@shared/index';
import { BentoGrid } from '@/components/bento/BentoGrid';
import { BentoTile } from '@/components/bento/BentoTile';
import { Wordmark } from '@/components/brand/Wordmark';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/Button';
import { ChipSelect } from '@/components/ui/ChipSelect';
import { Field, fieldStyles } from '@/components/ui/Field';
import { Stepper } from '@/components/ui/Stepper';
import { useAuth } from '@/features/auth/AuthProvider';
import { updateUserProfile } from '@/lib/firestoreRepo';
import { useUiStore } from '@/store/ui';
import { useWizardDraft } from '@/store/wizardDraft';
import styles from './OnboardingPage.module.css';

export function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const pushToast = useUiStore((s) => s.pushToast);
  const patchDraft = useWizardDraft((s) => s.patchDraft);

  const [country] = useState<CountryCode>('PH');
  const [region, setRegion] = useState(profile?.region || 'NCR');
  const [people, setPeople] = useState(profile?.defaults.people || 4);
  const [equipment, setEquipment] = useState<EquipmentId[]>(
    profile?.defaults.equipment || ['gas_stove', 'rice_cooker', 'refrigerator']
  );
  const [prefs, setPrefs] = useState<string[]>(
    profile?.defaults.prefs || ['chicken', 'vegetables', 'fish']
  );
  const [allergens, setAllergens] = useState<AllergenId[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile?.onboardingComplete) {
      navigate('/app', { replace: true });
    }
  }, [profile, navigate]);

  async function handleFinish(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const cleanEquip: EquipmentId[] =
        equipment.length > 0 ? equipment : ['gas_stove', 'rice_cooker'];
      await updateUserProfile(user.uid, {
        country,
        region,
        currency: 'PHP',
        onboardingComplete: true,
        defaults: {
          people,
          equipment: cleanEquip,
          prefs,
          pantry: profile?.defaults.pantry || ['salt', 'cooking-oil', 'soy-sauce', 'vinegar'],
          shoppingFrequency: 'weekly',
        },
      });
      patchDraft({
        country,
        region,
        currency: 'PHP',
        people,
        equipment: cleanEquip,
        preferences: prefs,
        allergens,
      });
      await refreshProfile();
      pushToast({ title: 'Kitchen defaults saved', tone: 'moss' });
      navigate('/app/new', { replace: true });
    } catch (err) {
      pushToast({
        title: 'Could not save defaults',
        description: err instanceof Error ? err.message : 'Please try again.',
        tone: 'tamarind',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <Seo title="Set up your kitchen" noindex />
      <div className={styles.container}>
        <header className={styles.header}>
          <Wordmark to="/" />
          <span className={styles.eyebrow}>Step 1 · Quick Kitchen Setup</span>
          <h1 className={styles.title}>Tell us how your kitchen runs.</h1>
          <p className={styles.sub}>
            We use this as your default starting point whenever you plan a budget. You can change it per plan anytime.
          </p>
        </header>

        <form onSubmit={handleFinish}>
          <BentoGrid columns={12}>
            <BentoTile colSpan={6} tone="card">
              <h2 className={styles.cardTitle}>Market & household</h2>
              <div className={styles.stack}>
                <Field label="Region (Philippines · PHP ₱)" htmlFor="onb-region">
                  <select
                    id="onb-region"
                    className={fieldStyles.select}
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                  >
                    {COUNTRIES.PH.regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Default household size">
                  <Stepper
                    value={people}
                    onChange={setPeople}
                    min={1}
                    max={15}
                    unitLabel={people === 1 ? 'person' : 'people'}
                    label="Household size"
                  />
                </Field>
              </div>
            </BentoTile>

            <BentoTile colSpan={6} tone="paper2">
              <h2 className={styles.cardTitle}>Cooking equipment</h2>
              <p className={styles.hint}>
                No refrigerator? We will automatically split grocery trips so fresh meats stay safe.
              </p>
              <ChipSelect
                options={EQUIPMENT_OPTIONS}
                selected={equipment}
                onChange={(next) => setEquipment(next as EquipmentId[])}
                tone="moss"
              />
            </BentoTile>

            <BentoTile colSpan={6} tone="card">
              <h2 className={styles.cardTitle}>Preferred proteins & flavors</h2>
              <ChipSelect
                options={PREFERENCE_OPTIONS}
                selected={prefs}
                onChange={setPrefs}
                tone="clay"
              />
            </BentoTile>

            <BentoTile colSpan={6} tone="tamarindWash">
              <h2 className={styles.cardTitle}>Allergens to strictly exclude</h2>
              <ChipSelect
                options={ALLERGEN_OPTIONS}
                selected={allergens}
                onChange={(next) => setAllergens(next as AllergenId[])}
                tone="tamarind"
              />
            </BentoTile>
          </BentoGrid>

          <div className={styles.footer}>
            <Button type="submit" size="lg" loading={busy}>
              Save and build my first plan
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

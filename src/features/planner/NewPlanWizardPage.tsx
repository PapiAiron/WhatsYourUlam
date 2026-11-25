import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Sparkle, Warning } from '@phosphor-icons/react';
import { nanoid } from 'nanoid';
import {
  ALLERGEN_OPTIONS,
  COUNTRIES,
  DIET_OPTIONS,
  EQUIPMENT_OPTIONS,
  formatMoney,
  PANTRY_STAPLE_OPTIONS,
  PREFERENCE_OPTIONS,
  SHOPPING_FREQUENCY_OPTIONS,
  type AllergenId,
  type DietFlag,
  type EquipmentId,
  type EstimateResult,
  type FeasibilityAdjustment,
  type ShoppingFrequency,
} from '@shared/index';
import clsx from 'clsx';
import { BentoGrid } from '@/components/bento/BentoGrid';
import { BentoTile } from '@/components/bento/BentoTile';
import { Seo } from '@/components/seo/Seo';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChipSelect } from '@/components/ui/ChipSelect';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Field, fieldStyles } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Stepper } from '@/components/ui/Stepper';
import { Switch } from '@/components/ui/Switch';
import { useAuth } from '@/features/auth/AuthProvider';
import { apiClient, ApiError } from '@/lib/apiClient';
import {
  listFirestoreRecipes,
  listPriceOverrides,
  saveGeneratedPlan,
} from '@/lib/firestoreRepo';
import { useUiStore } from '@/store/ui';
import { useWizardDraft } from '@/store/wizardDraft';
import styles from './WizardPage.module.css';

const STEPS = [
  'Budget',
  'Household',
  'Meals',
  'Preferences',
  'Filters',
  'Kitchen',
  'Pantry & Trips',
];

export function NewPlanWizardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  const draft = useWizardDraft();
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genStage, setGenStage] = useState('Checking local market packs...');
  const [genPct, setGenPct] = useState(15);
  const [excludedInput, setExcludedInput] = useState('');
  const [infeasibleError, setInfeasibleError] = useState<EstimateResult | null>(null);

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

  // Apply URL params if coming from landing page hero mini-form
  useEffect(() => {
    const budget = Number(searchParams.get('budget'));
    const people = Number(searchParams.get('people'));
    const days = Number(searchParams.get('days'));
    if (budget > 0 || people > 0 || days > 0) {
      draft.patchDraft({
        ...(budget > 0 ? { budgetMajor: budget } : {}),
        ...(people > 0 ? { people } : {}),
        ...(days > 0 ? { days } : {}),
      });
    } else if (profile?.onboardingComplete && draft.step === 0 && !draft.planName) {
      draft.patchDraft({
        region: profile.region || 'NCR',
        people: profile.defaults.people || 4,
        equipment: profile.defaults.equipment,
        preferences: profile.defaults.prefs,
        pantryItems: profile.defaults.pantry,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const planInput = useMemo(
    () => draft.toPlanInput(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      draft.country,
      draft.region,
      draft.currency,
      draft.budgetMajor,
      draft.people,
      draft.days,
      draft.startDate,
      draft.mealsPerDay,
      draft.includeSnacks,
      draft.preferences,
      draft.allergens,
      draft.excludedIngredients,
      draft.diet,
      draft.equipment,
      draft.pantryItems,
      draft.shoppingFrequency,
    ]
  );

  // Debounced live feasibility estimate
  useEffect(() => {
    let active = true;
    const t = window.setTimeout(() => {
      setEstimating(true);
      void apiClient
        .estimatePlan(planInput, overrideMap)
        .then((res) => {
          if (active) {
            setEstimate(res);
            setInfeasibleError(null);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (active) setEstimating(false);
        });
    }, 280);
    return () => {
      active = false;
      window.clearTimeout(t);
    };
  }, [planInput, overrideMap]);

  function applyAdjustment(adj: FeasibilityAdjustment) {
    const p = adj.patch;
    draft.patchDraft({
      ...(p.days ? { days: p.days } : {}),
      ...(p.mealsPerDay ? { mealsPerDay: p.mealsPerDay, includeSnacks: false } : {}),
      ...(p.budgetMinor ? { budgetMajor: Math.round(p.budgetMinor / 100) } : {}),
      ...(p.diet ? { diet: p.diet } : {}),
    });
  }

  function addExcludedKeyword() {
    const clean = excludedInput.trim().toLowerCase();
    if (!clean) return;
    if (!draft.excludedIngredients.includes(clean)) {
      draft.patchDraft({ excludedIngredients: [...draft.excludedIngredients, clean] });
    }
    setExcludedInput('');
  }

  async function handleGenerate() {
    if (!user) return;
    setGenerating(true);
    setInfeasibleError(null);
    setGenStage('Checking regional pack prices...');
    setGenPct(24);

    const stageTimer1 = window.setTimeout(() => {
      setGenStage('Filtering recipes for your kitchen & allergies...');
      setGenPct(52);
    }, 350);
    const stageTimer2 = window.setTimeout(() => {
      setGenStage('Balancing grocery trips & maximizing variety...');
      setGenPct(82);
    }, 750);

    try {
      const extraRecipes = await listFirestoreRecipes().catch(() => []);
      const defaultName = `${draft.days}-Day ${COUNTRIES[draft.country].regions.find((r) => r.id === draft.region)?.name.split(' ')[0] || 'Home'} Menu`;
      const result = await apiClient.generatePlan({
        input: planInput,
        name: draft.planName.trim() || defaultName,
        overrides: overrideMap,
        extraRecipes: extraRecipes.filter((r) => r.status === 'approved'),
        idempotencyKey: nanoid(12),
      });

      setGenStage('Saving your menu and grocery checklist...');
      setGenPct(96);
      await saveGeneratedPlan(user.uid, result.plan, result.meals, result.grocery);
      await queryClient.invalidateQueries({ queryKey: ['plans', user.uid] });
      draft.resetDraft();
      pushToast({ title: 'Meal plan ready!', tone: 'moss' });
      navigate(`/app/plans/${result.plan.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INFEASIBLE_BUDGET') {
        setInfeasibleError(err.details as EstimateResult);
      } else {
        pushToast({
          title: 'Could not generate plan',
          description: err instanceof Error ? err.message : 'Please try adjusting your settings.',
          tone: 'tamarind',
        });
      }
    } finally {
      window.clearTimeout(stageTimer1);
      window.clearTimeout(stageTimer2);
      setGenerating(false);
    }
  }

  const fitBadge =
    estimate?.fit === 'generous'
      ? { tone: 'moss' as const, label: 'Generous headroom' }
      : estimate?.fit === 'comfortable'
        ? { tone: 'moss' as const, label: 'Comfortable fit' }
        : estimate?.fit === 'tight'
          ? { tone: 'turmeric' as const, label: 'Tight fit' }
          : { tone: 'tamarind' as const, label: 'Needs adjustment' };

  const perDayMinor = Math.round(planInput.budgetMinor / Math.max(1, draft.days));

  return (
    <div className={styles.page}>
      <Seo title="New Meal Plan" noindex />

      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Plan Builder · Step {draft.step + 1} of 7</span>
          <h1 className={styles.title}>Build your budget meal plan</h1>
        </div>
        <div className={styles.stepPills} role="tablist" aria-label="Wizard steps">
          {STEPS.map((label, idx) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={draft.step === idx}
              onClick={() => draft.setStep(idx)}
              className={clsx(
                styles.stepBtn,
                draft.step === idx && styles.stepBtnActive,
                idx < draft.step && styles.stepBtnDone
              )}
            >
              <span>{idx + 1}.</span> {label}
            </button>
          ))}
        </div>
      </div>

      {generating && (
        <BentoTile colSpan={12} tone="clayWash" className={styles.progressTile}>
          <div className={styles.progressInner}>
            <Sparkle size={24} className={styles.iconClay} />
            <div className={styles.progressText}>
              <strong>Simmering your meal plan...</strong>
              <span>{genStage}</span>
            </div>
            <span className={styles.progressPct}>{genPct}%</span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ '--pct': `${genPct}%` } as React.CSSProperties}
            />
          </div>
        </BentoTile>
      )}

      {infeasibleError && (
        <BentoTile colSpan={12} tone="tamarindWash" className={styles.alertTile}>
          <div className={styles.alertHead}>
            <Warning size={22} />
            <strong>Budget too tight for current selections</strong>
          </div>
          <p className={styles.alertSub}>
            Minimum local market cost is{' '}
            <strong>{formatMoney(infeasibleError.minimumBudgetMinor, draft.currency)}</strong>. Pick a one-click fix below:
          </p>
          <div className={styles.adjRow}>
            {infeasibleError.adjustments.map((adj) => (
              <Button
                key={adj.id}
                variant="outline"
                size="sm"
                onClick={() => applyAdjustment(adj)}
              >
                {adj.label}
              </Button>
            ))}
          </div>
        </BentoTile>
      )}

      <BentoGrid columns={12}>
        {/* Left Main Wizard Step */}
        <BentoTile colSpan={8} tone="card" className={styles.stepCard}>
          {draft.step === 0 && (
            <div className={styles.stepBody}>
              <h2 className={styles.stepTitle}>What is your total food budget?</h2>
              <p className={styles.stepDesc}>
                Enter the maximum amount you want to pay at checkout across the whole plan.
              </p>

              <Field label="Total budget (PHP)" htmlFor="wiz-budget">
                <CurrencyInput
                  id="wiz-budget"
                  currency={draft.currency}
                  value={draft.budgetMajor}
                  onChange={(v) => draft.patchDraft({ budgetMajor: v })}
                  min={300}
                  max={100000}
                />
              </Field>

              <div className={styles.presets}>
                {[2500, 3500, 5000, 7500, 10000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => draft.patchDraft({ budgetMajor: amt })}
                    className={clsx(
                      styles.presetBtn,
                      draft.budgetMajor === amt && styles.presetActive
                    )}
                  >
                    ₱{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              <Field label="Philippine Region (affects wet-market price multipliers)" htmlFor="wiz-region">
                <select
                  id="wiz-region"
                  className={fieldStyles.select}
                  value={draft.region}
                  onChange={(e) => draft.patchDraft({ region: e.target.value })}
                >
                  {COUNTRIES.PH.regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {draft.step === 1 && (
            <div className={styles.stepBody}>
              <h2 className={styles.stepTitle}>Who is eating & for how many days?</h2>
              <div className={styles.twoCol}>
                <Field label="Household size">
                  <Stepper
                    value={draft.people}
                    onChange={(v) => draft.patchDraft({ people: v })}
                    min={1}
                    max={15}
                    unitLabel={draft.people === 1 ? 'person' : 'people'}
                    label="People"
                  />
                </Field>
                <Field label="Plan duration">
                  <Stepper
                    value={draft.days}
                    onChange={(v) => draft.patchDraft({ days: v })}
                    min={1}
                    max={31}
                    unitLabel={draft.days === 1 ? 'day' : 'days'}
                    label="Days"
                  />
                </Field>
              </div>

              <div className={styles.presets}>
                {[3, 7, 14, 21, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => draft.patchDraft({ days: d })}
                    className={clsx(
                      styles.presetBtn,
                      draft.days === d && styles.presetActive
                    )}
                  >
                    {d} days
                  </button>
                ))}
              </div>

              <Field label="Start date" htmlFor="wiz-start">
                <input
                  id="wiz-start"
                  type="date"
                  className={fieldStyles.input}
                  value={draft.startDate}
                  onChange={(e) => draft.patchDraft({ startDate: e.target.value })}
                />
              </Field>
            </div>
          )}

          {draft.step === 2 && (
            <div className={styles.stepBody}>
              <h2 className={styles.stepTitle}>How many meals per day?</h2>
              <p className={styles.stepDesc}>
                Picking 2 meals/day focuses your peso budget on hearty lunches and dinners.
              </p>

              <SegmentedControl
                value={String(draft.mealsPerDay)}
                onChange={(v) =>
                  draft.patchDraft({
                    mealsPerDay: v === '2' ? 2 : 3,
                    mealTypes: v === '2' ? ['lunch', 'dinner'] : ['breakfast', 'lunch', 'dinner'],
                  })
                }
                options={[
                  { value: '3', label: '3 meals (Breakfast, Lunch, Dinner)' },
                  { value: '2', label: '2 meals (Lunch & Dinner)' },
                ]}
              />

              <Switch
                id="wiz-snacks"
                checked={draft.includeSnacks}
                onCheckedChange={(checked) => draft.patchDraft({ includeSnacks: checked })}
                label="Include daily merienda / snack"
                description="Adds simple snacks such as pandesal, turon, or boiled saba."
              />
            </div>
          )}

          {draft.step === 3 && (
            <div className={styles.stepBody}>
              <h2 className={styles.stepTitle}>What do you enjoy cooking?</h2>
              <p className={styles.stepDesc}>
                We balance protein variety across the week while favoring your checked favorites.
              </p>
              <ChipSelect
                options={PREFERENCE_OPTIONS}
                selected={draft.preferences}
                onChange={(next) => draft.patchDraft({ preferences: next })}
                tone="clay"
              />
            </div>
          )}

          {draft.step === 4 && (
            <div className={styles.stepBody}>
              <h2 className={styles.stepTitle}>Allergies & diet rules</h2>
              <p className={styles.stepDesc}>
                These are strict exclusions — matching dishes are completely removed before planning.
              </p>

              <Field label="Diet profile">
                <SegmentedControl
                  value={draft.diet}
                  onChange={(v) => draft.patchDraft({ diet: v as DietFlag })}
                  options={DIET_OPTIONS.map((d) => ({ value: d.id, label: d.label }))}
                />
              </Field>

              <Field label="Allergens to strictly avoid">
                <ChipSelect
                  options={ALLERGEN_OPTIONS}
                  selected={draft.allergens}
                  onChange={(next) => draft.patchDraft({ allergens: next as AllergenId[] })}
                  tone="tamarind"
                />
              </Field>

              <Field label="Any other ingredient to exclude (optional)">
                <div className={styles.excludeRow}>
                  <input
                    type="text"
                    className={fieldStyles.input}
                    value={excludedInput}
                    onChange={(e) => setExcludedInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addExcludedKeyword();
                      }
                    }}
                    placeholder="e.g. liver, ampalaya"
                  />
                  <Button variant="outline" onClick={addExcludedKeyword}>
                    Add
                  </Button>
                </div>
                {draft.excludedIngredients.length > 0 && (
                  <div className={styles.tagList}>
                    {draft.excludedIngredients.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={styles.removeTag}
                        onClick={() =>
                          draft.patchDraft({
                            excludedIngredients: draft.excludedIngredients.filter(
                              (x) => x !== item
                            ),
                          })
                        }
                      >
                        {item} ×
                      </button>
                    ))}
                  </div>
                )}
              </Field>
            </div>
          )}

          {draft.step === 5 && (
            <div className={styles.stepBody}>
              <h2 className={styles.stepTitle}>Cooking gear & cold storage</h2>
              <p className={styles.stepDesc}>
                We only pick recipes you can cook with your appliances.
              </p>

              <ChipSelect
                options={EQUIPMENT_OPTIONS}
                selected={draft.equipment}
                onChange={(next) => {
                  const clean = next.length > 0 ? (next as EquipmentId[]) : ['gas_stove' as EquipmentId];
                  draft.patchDraft({ equipment: clean });
                }}
                tone="moss"
              />

              {!draft.equipment.includes('refrigerator') && (
                <div className={styles.noticeBox}>
                  <strong>No refrigerator selected:</strong> We will automatically schedule market trips every 2 days and keep meats/fish on Day 1 of each trip.
                </div>
              )}
            </div>
          )}

          {draft.step === 6 && (
            <div className={styles.stepBody}>
              <h2 className={styles.stepTitle}>Pantry staples & shopping rhythm</h2>
              <p className={styles.stepDesc}>
                Checked items are subtracted from your grocery bill (₱0).
              </p>

              <ChipSelect
                options={PANTRY_STAPLE_OPTIONS}
                selected={draft.pantryItems}
                onChange={(next) => draft.patchDraft({ pantryItems: next })}
                tone="moss"
              />

              <Field label="How often do you want to shop?">
                <SegmentedControl
                  value={draft.shoppingFrequency}
                  onChange={(v) =>
                    draft.patchDraft({ shoppingFrequency: v as ShoppingFrequency })
                  }
                  options={SHOPPING_FREQUENCY_OPTIONS.map((f) => ({
                    value: f.id,
                    label: f.label,
                  }))}
                />
              </Field>

              <Field label="Plan name (optional)" htmlFor="wiz-name">
                <input
                  id="wiz-name"
                  className={fieldStyles.input}
                  value={draft.planName}
                  onChange={(e) => draft.patchDraft({ planName: e.target.value })}
                  placeholder="e.g. Payday 14-Day Family Menu"
                />
              </Field>
            </div>
          )}

          {/* Footer Navigation */}
          <div className={styles.wizardFooter}>
            <Button
              variant="outline"
              disabled={draft.step === 0 || generating}
              onClick={() => draft.setStep(draft.step - 1)}
            >
              <ArrowLeft size={16} /> Back
            </Button>

            {draft.step < STEPS.length - 1 ? (
              <Button onClick={() => draft.setStep(draft.step + 1)}>
                Next step <ArrowRight size={16} />
              </Button>
            ) : (
              <Button
                size="lg"
                loading={generating}
                disabled={estimate?.feasible === false}
                onClick={handleGenerate}
              >
                <Check size={18} weight="bold" /> Generate meal plan
              </Button>
            )}
          </div>
        </BentoTile>

        {/* Right Live Bento Receipt */}
        <BentoTile colSpan={4} tone="paper2" className={styles.receiptTile}>
          <div className={styles.receiptHead}>
            <span className={styles.eyebrow}>Live Bento Receipt</span>
            {estimate && <Badge tone={fitBadge.tone}>{fitBadge.label}</Badge>}
          </div>

          <div className={styles.receiptTotal}>
            <span>Total Budget</span>
            <strong>{formatMoney(planInput.budgetMinor, draft.currency)}</strong>
          </div>

          <div className={styles.receiptRows}>
            <div className={styles.receiptRow}>
              <span>Daily allowance</span>
              <strong>{formatMoney(perDayMinor, draft.currency)} / day</strong>
            </div>
            <div className={styles.receiptRow}>
              <span>Household</span>
              <strong>
                {draft.people} {draft.people === 1 ? 'person' : 'people'} × {draft.days}d
              </strong>
            </div>
            <div className={styles.receiptRow}>
              <span>Meals planned</span>
              <strong>{draft.days * (draft.mealsPerDay + (draft.includeSnacks ? 1 : 0))} meals</strong>
            </div>
            <div className={styles.receiptRow}>
              <span>Pantry items owned</span>
              <strong>{draft.pantryItems.length} subtracted</strong>
            </div>
            <div className={styles.receiptRow}>
              <span>Est. minimum floor</span>
              <strong>
                {estimating
                  ? 'Checking...'
                  : estimate
                    ? formatMoney(estimate.minimumBudgetMinor, draft.currency)
                    : '—'}
              </strong>
            </div>
            <div className={styles.receiptRow}>
              <span>Typical comfortable</span>
              <strong>
                {estimate
                  ? formatMoney(estimate.typicalBudgetMinor, draft.currency)
                  : '—'}
              </strong>
            </div>
          </div>

          {estimate && !estimate.feasible && (
            <div className={styles.noticeBox}>
              <strong>Below market minimum:</strong> Try one of these quick fixes:
              <div className={styles.adjCol}>
                {estimate.adjustments.map((adj) => (
                  <Button
                    key={adj.id}
                    variant="outline"
                    size="sm"
                    onClick={() => applyAdjustment(adj)}
                  >
                    {adj.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {estimate?.warnings && estimate.warnings.length > 0 && (
            <p className={styles.receiptWarn}>{estimate.warnings[0]}</p>
          )}
        </BentoTile>
      </BentoGrid>
    </div>
  );
}

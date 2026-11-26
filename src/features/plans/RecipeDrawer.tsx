import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Clock, PencilSimple, Timer } from '@phosphor-icons/react';
import {
  formatMoney,
  SEED_RECIPES_PH,
  type CurrencyCode,
  type PlannedMeal,
  type Recipe,
} from '@shared/index';
import { StackedBar, type StackedSegment } from '@/components/charts/StackedBar';
import { DishImage } from '@/components/brand/DishImage';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Drawer } from '@/components/ui/Drawer';
import { LEGAL } from '@/constants/legal';
import styles from './PlanShared.module.css';

interface RecipeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: PlannedMeal | null;
  recipeOverride?: Recipe | null;
  currency?: CurrencyCode;
  onUpdatePriceOverride?: (ingredientId: string, newPackPriceMinor: number) => Promise<void>;
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function RecipeDrawer({
  open,
  onOpenChange,
  meal,
  recipeOverride,
  currency = 'PHP',
  onUpdatePriceOverride,
}: RecipeDrawerProps) {
  const [editingIngId, setEditingIngId] = useState<string | null>(null);
  const [editMajor, setEditMajor] = useState<number>(0);
  const [savingPrice, setSavingPrice] = useState(false);

  // Cooking timer state.
  // timerRemainingMs: null = not started, 0 = finished, otherwise time left.
  // The countdown is based on a fixed end timestamp, so it stays accurate even if
  // the browser delays or throttles the interval (for example in a background tab).
  const [timerRemainingMs, setTimerRemainingMs] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerEndAtRef = useRef<number>(0);

  const recipe = useMemo(() => {
    if (recipeOverride) return recipeOverride;
    if (!meal) return null;
    return SEED_RECIPES_PH.find((r) => r.id === meal.recipeId) ?? null;
  }, [meal, recipeOverride]);

  // Same cook time that is shown in the time badge at the top of the drawer.
  const cookMinutes = meal?.recipeSnapshot.cookMin ?? recipe?.cookMin ?? 0;
  const timerMinutes = cookMinutes > 0 ? cookMinutes : 15;
  const timerTotalMs = timerMinutes * 60 * 1000;

  // Tick: recompute the time left from the end timestamp.
  useEffect(() => {
    if (!timerRunning) return;
    const tick = () => {
      const left = timerEndAtRef.current - Date.now();
      if (left <= 0) {
        setTimerRemainingMs(0);
        setTimerRunning(false);
      } else {
        setTimerRemainingMs(left);
      }
    };
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  // The timer never carries over: closing the drawer or opening another recipe resets it.
  const recipeKey = recipe?.id ?? null;
  useEffect(() => {
    setTimerRunning(false);
    setTimerRemainingMs(null);
  }, [recipeKey, open]);

  function startTimer() {
    const ms =
      timerRemainingMs !== null && timerRemainingMs > 0 ? timerRemainingMs : timerTotalMs;
    timerEndAtRef.current = Date.now() + ms;
    setTimerRemainingMs(ms);
    setTimerRunning(true);
  }

  function pauseTimer() {
    setTimerRemainingMs(Math.max(0, timerEndAtRef.current - Date.now()));
    setTimerRunning(false);
  }

  function resetTimer() {
    setTimerRunning(false);
    setTimerRemainingMs(null);
  }

  function handleTimerButton() {
    if (timerRemainingMs === null) {
      startTimer();
    } else if (timerRemainingMs <= 0) {
      resetTimer();
    } else if (timerRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }

  const timerSecondsLeft =
    timerRemainingMs === null ? null : Math.ceil(timerRemainingMs / 1000);

  let timerLabel: string;
  if (timerSecondsLeft === null) {
    timerLabel = `Start ${timerMinutes}m timer`;
  } else if (timerSecondsLeft <= 0) {
    timerLabel = "Time's up! Reset";
  } else if (timerRunning) {
    timerLabel = `${formatClock(timerSecondsLeft)} · Pause`;
  } else {
    timerLabel = `${formatClock(timerSecondsLeft)} · Resume`;
  }

  const segments: StackedSegment[] = useMemo(() => {
    if (!meal) return [];
    const tones: StackedSegment['tone'][] = ['clay', 'moss', 'turmeric', 'tamarind', 'ink'];
    return [...meal.ingredients]
      .filter((i) => i.costMinor > 0)
      .sort((a, b) => b.costMinor - a.costMinor)
      .slice(0, 5)
      .map((ing, idx) => ({
        id: ing.ingredientId,
        label: ing.name,
        value: ing.costMinor,
        tone: tones[idx % tones.length],
      }));
  }, [meal]);

  const title = meal?.recipeSnapshot.name ?? recipe?.name ?? 'Recipe';
  const subtitle = meal?.recipeSnapshot.localName ?? recipe?.localName;

  async function saveInlinePrice(ingredientId: string) {
    if (!onUpdatePriceOverride) return;
    setSavingPrice(true);
    try {
      const factor = currency === 'JPY' ? 1 : 100;
      await onUpdatePriceOverride(ingredientId, Math.max(100, Math.round(editMajor * factor)));
      setEditingIngId(null);
    } finally {
      setSavingPrice(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={title} subtitle={subtitle}>
      {(meal || recipe) && (
        <div className={styles.drawerBody}>
          <DishImage
            src={meal?.recipeSnapshot.imageUrl || recipe?.image.url}
            alt={title}
            tone={(recipe?.accentTone ?? 'clay') as 'clay' | 'moss' | 'turmeric' | 'tamarind'}
            aspect="16/9"
          />

          <div className={styles.drawerMetaRow}>
            <Badge tone="neutral">
              <Clock size={13} /> {(meal?.recipeSnapshot.prepMin ?? recipe?.prepMin ?? 10) + (meal?.recipeSnapshot.cookMin ?? recipe?.cookMin ?? 20)} min
            </Badge>
            {meal && (
              <Badge tone="moss">
                {meal.servings} {meal.servings === 1 ? 'serving' : 'servings'}
              </Badge>
            )}
            {(meal?.kcalPerPerson ?? recipe?.nutritionPerServing.kcal) && (
              <Badge tone="turmeric">
                ~{meal?.kcalPerPerson ?? recipe?.nutritionPerServing.kcal} kcal / serving
              </Badge>
            )}
          </div>

          {meal && (
            <div className={styles.costHero}>
              <div>
                <span className={styles.eyebrow}>Household Meal Cost</span>
                <div className={styles.bigPrice}>{formatMoney(meal.costMinor, currency)}</div>
                <span className={styles.perPerson}>
                  {formatMoney(Math.round(meal.costMinor / Math.max(1, meal.servings)), currency)} per person
                </span>
              </div>
              {segments.length > 0 && <StackedBar segments={segments} />}
            </div>
          )}

          {meal && (
            <section className={styles.sectionBlock}>
              <h3 className={styles.subHeading}>Ingredients & Pack Cost Breakdown</h3>
              <div className={styles.ingTable}>
                {meal.ingredients.map((ing) => (
                  <div key={ing.ingredientId} className={styles.ingRow}>
                    <div className={styles.ingInfo}>
                      <strong>{ing.name}</strong>
                      <span className={styles.ingQty}>
                        {ing.qty} {ing.unit} · {ing.fromPackNote ?? ing.packLabel}
                      </span>
                    </div>

                    <div className={styles.ingPriceCol}>
                      <span className={styles.ingCost}>
                        {ing.isPantry ? '₱0.00' : formatMoney(ing.costMinor, currency)}
                      </span>
                      <div className={styles.ingBadges}>
                        <Badge tone={ing.priceSource === 'user' ? 'moss' : 'neutral'}>
                          {ing.isPantry
                            ? 'Pantry'
                            : ing.priceSource === 'user'
                              ? 'Your price'
                              : 'Estimate'}
                        </Badge>
                        {!ing.isPantry && onUpdatePriceOverride && (
                          <button
                            type="button"
                            className={styles.editPriceBtn}
                            onClick={() => {
                              setEditingIngId(ing.ingredientId);
                              setEditMajor(
                                Number((ing.packPriceMinor / (currency === 'JPY' ? 1 : 100)).toFixed(2))
                              );
                            }}
                            aria-label={`Edit pack price for ${ing.name}`}
                          >
                            <PencilSimple size={13} /> Edit pack
                          </button>
                        )}
                      </div>
                    </div>

                    {editingIngId === ing.ingredientId && (
                      <div className={styles.inlineEdit}>
                        <span className={styles.inlineLabel}>
                          Pack price ({ing.packLabel}):
                        </span>
                        <CurrencyInput
                          currency={currency}
                          value={editMajor}
                          onChange={setEditMajor}
                          min={1}
                        />
                        <div className={styles.inlineActions}>
                          <Button
                            size="sm"
                            loading={savingPrice}
                            onClick={() => void saveInlinePrice(ing.ingredientId)}
                          >
                            <Check size={14} /> Update & recost
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingIngId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {recipe && (
            <section className={styles.sectionBlock}>
              <div className={styles.stepsHead}>
                <h3 className={styles.subHeading}>Cooking Steps</h3>
                <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                  <Button size="sm" variant="outline" onClick={handleTimerButton}>
                    <Timer size={15} /> {timerLabel}
                  </Button>
                  {timerRemainingMs !== null && timerRemainingMs > 0 && (
                    <Button size="sm" variant="ghost" onClick={resetTimer}>
                      Reset
                    </Button>
                  )}
                </span>
              </div>
              <ol className={styles.stepsList}>
                {recipe.steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
              {recipe.tips && (
                <div className={styles.tipBox}>
                  <strong>Kitchen tip:</strong> {recipe.tips}
                </div>
              )}
            </section>
          )}

          <div className={styles.disclaimers}>
            <p>{LEGAL.allergenNotice}</p>
            <p>{LEGAL.nutritionNotice}</p>
          </div>
        </div>
      )}
    </Drawer>
  );
}
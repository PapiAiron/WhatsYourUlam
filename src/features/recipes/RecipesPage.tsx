import { useMemo, useState } from 'react';
import { MagnifyingGlass, Sparkle } from '@phosphor-icons/react';
import {
  DIET_OPTIONS,
  SEED_RECIPES_PH,
  type MealType,
  type Recipe,
} from '@shared/index';
import clsx from 'clsx';
import { DishImage } from '@/components/brand/DishImage';
import { Seo } from '@/components/seo/Seo';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field, fieldStyles } from '@/components/ui/Field';
import { RecipeDrawer } from '@/features/plans/RecipeDrawer';
import { apiClient } from '@/lib/apiClient';
import { useUiStore } from '@/store/ui';
import styles from './RecipesPage.module.css';

export function RecipesPage() {
  const pushToast = useUiStore((s) => s.pushToast);

  const [queryText, setQueryText] = useState('');
  const [mealFilter, setMealFilter] = useState<string>('all');
  const [customRecipes, setCustomRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const [genOpen, setGenOpen] = useState(false);
  const [genMealType, setGenMealType] = useState<MealType>('dinner');
  const [genDiet, setGenDiet] = useState('none');
  const [genAvoid, setGenAvoid] = useState('');
  const [genBusy, setGenBusy] = useState(false);

  const allRecipes = useMemo(
    () => [...customRecipes, ...SEED_RECIPES_PH],
    [customRecipes]
  );

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return allRecipes.filter((r) => {
      if (mealFilter !== 'all' && !r.mealTypes.includes(mealFilter as MealType)) {
        return false;
      }
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.localName.toLowerCase().includes(q) ||
        r.proteinTags.some((p) => p.includes(q))
      );
    });
  }, [allRecipes, queryText, mealFilter]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenBusy(true);
    try {
      const { recipe } = await apiClient.generateAiRecipe({
        country: 'PH',
        mealType: genMealType,
        diet: genDiet,
        excludedText: genAvoid,
        existingNames: allRecipes.map((r) => r.name),
      });
      setCustomRecipes((prev) => [recipe, ...prev]);
      setGenOpen(false);
      setSelectedRecipe(recipe);
      pushToast({ title: `Added "${recipe.name}"`, tone: 'moss' });
    } catch (err) {
      pushToast({
        title: 'AI generation unavailable',
        description: err instanceof Error ? err.message : 'Please try again.',
        tone: 'tamarind',
      });
    } finally {
      setGenBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <Seo title="Recipe Library" noindex />

      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Filipino Home Catalog · {allRecipes.length} Dishes</span>
          <h1 className={styles.title}>Recipe Browser</h1>
        </div>
        <Button onClick={() => setGenOpen(true)}>
          <Sparkle size={17} /> Generate recipe
        </Button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <MagnifyingGlass size={18} className={styles.searchIcon} />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search Adobo, Sinigang, chicken, veggies..."
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
          />
        </div>

        <div className={styles.filters}>
          {['all', 'breakfast', 'lunch', 'dinner', 'snack'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setMealFilter(f)}
              className={clsx(styles.filterBtn, mealFilter === f && styles.filterActive)}
            >
              {f === 'all' ? 'All meals' : f}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.grid}>
        {filtered.map((recipe) => (
          <article key={recipe.id} className={styles.card}>
            <DishImage
              src={recipe.image.url}
              alt={recipe.name}
              tone={recipe.accentTone ?? 'clay'}
              aspect="4/3"
            />
            <div className={styles.cardBody}>
              <div className={styles.cardTop}>
                <strong>{recipe.name}</strong>
                <Badge tone="neutral">{recipe.prepMin + recipe.cookMin}m</Badge>
              </div>
              <span className={styles.localName}>{recipe.localName}</span>
              <p className={styles.desc}>{recipe.description}</p>
              <div className={styles.cardFoot}>
                <Badge tone="moss">{recipe.proteinTags[0] || 'home dish'}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  Open recipe
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <RecipeDrawer
        open={Boolean(selectedRecipe)}
        onOpenChange={(o) => !o && setSelectedRecipe(null)}
        meal={null}
        recipeOverride={selectedRecipe}
      />

      <Dialog
        open={genOpen}
        onOpenChange={setGenOpen}
        title="Generate a new budget recipe"
        description="Creates a validated Filipino recipe using our standardized ingredient pack catalog."
      >
        <form onSubmit={handleGenerate} className={styles.genForm}>
          <Field label="Meal slot" htmlFor="gen-slot">
            <select
              id="gen-slot"
              className={fieldStyles.select}
              value={genMealType}
              onChange={(e) => setGenMealType(e.target.value as MealType)}
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </Field>

          <Field label="Diet rule" htmlFor="gen-diet">
            <select
              id="gen-diet"
              className={fieldStyles.select}
              value={genDiet}
              onChange={(e) => setGenDiet(e.target.value)}
            >
              {DIET_OPTIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Avoid ingredients (optional)" htmlFor="gen-avoid">
            <input
              id="gen-avoid"
              className={fieldStyles.input}
              value={genAvoid}
              onChange={(e) => setGenAvoid(e.target.value)}
              placeholder="e.g. shrimp, eggplant"
            />
          </Field>

          <Button type="submit" loading={genBusy} size="lg">
            Create recipe
          </Button>
        </form>
      </Dialog>
    </div>
  );
}

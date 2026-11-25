import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Basket,
  CheckCircle,
  Moon,
  Printer,
  Scales,
  ShareNetwork,
  Snowflake,
  Sparkle,
  Sun,
  Swap,
} from '@phosphor-icons/react';
import {
  COUNTRIES,
  formatMoney,
  SEED_RECIPES_PH,
  type CountryCode,
} from '@shared/index';
import { BentoGrid } from '@/components/bento/BentoGrid';
import { BentoTile } from '@/components/bento/BentoTile';
import { DishImage } from '@/components/brand/DishImage';
import { Wordmark } from '@/components/brand/Wordmark';
import { JsonLd } from '@/components/seo/JsonLd';
import { Seo } from '@/components/seo/Seo';
import { Accordion, type AccordionItemData } from '@/components/ui/Accordion';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Field, fieldStyles } from '@/components/ui/Field';
import { Slider } from '@/components/ui/Slider';
import { Stepper } from '@/components/ui/Stepper';
import { BRAND } from '@/constants/brand';
import { useAuth } from '@/features/auth/AuthProvider';
import { apiClient } from '@/lib/apiClient';
import {
  listApprovedTestimonials,
  submitWaitlistDoc,
  type TestimonialRecord,
} from '@/lib/firestoreRepo';
import { useUiStore } from '@/store/ui';
import { KitchenDiorama3D } from './KitchenDiorama3D';
import styles from './LandingPage.module.css';

const FAQ_ITEMS: AccordionItemData[] = [
  {
    value: 'pack-cost',
    question: 'Why does my grocery total differ from a single meal cost?',
    answer:
      'Wet markets and supermarkets sell packs — like a 1 kg bag of rice or a 200 ml bottle of soy sauce. Our planner prices your grocery list by real whole packs you actually pay at checkout, then shares leftovers across later meals.',
  },
  {
    value: 'no-fridge',
    question: 'Can I plan meals without a refrigerator or freezer?',
    answer:
      'Yes. Simply leave Refrigerator unchecked in your kitchen gear. The planner automatically splits shopping into 2-day fresh market trips and prioritizes shelf-stable proteins and vegetables later in each trip.',
  },
  {
    value: 'price-edit',
    question: 'What if rice or chicken costs differently at my local palengke?',
    answer:
      'You can tap any ingredient inside a recipe or in My Prices to enter your neighborhood price. Your plan re-costs every affected meal and grocery total in seconds.',
  },
  {
    value: 'allergens',
    question: 'How strictly are allergens and pork restrictions enforced?',
    answer:
      'Allergens and diet rules such as No Pork, Halal-friendly, Pescatarian, and Vegetarian are hard filters applied before any menu is built. Always double-check packaged labels in store.',
  },
  {
    value: 'countries',
    question: 'Which countries and currencies are supported today?',
    answer:
      'Philippines (PHP ₱) with NCR, CALABARZON, Central Luzon, Metro Cebu, and Davao regional prices is live today. Malaysia, Japan, and the United States are next via our market waitlist.',
  },
];

const FEATURED_SLUGS = [
  'chicken-adobo',
  'pork-sinigang',
  'tinolang-manok',
  'ginisang-munggo',
  'tortang-talong',
  'paksiw-na-bangus',
];

export function LandingPage() {
  const { status } = useAuth();
  const { theme, toggleTheme, pushToast } = useUiStore();
  const navigate = useNavigate();

  const [budget, setBudget] = useState(5000);
  const [people, setPeople] = useState(4);
  const [days, setDays] = useState(14);
  const [sliderBudget, setSliderBudget] = useState(5000);

  const [waitlistCountry, setWaitlistCountry] = useState<CountryCode>('MY');
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistBusy, setWaitlistBusy] = useState(false);
  const [testimonials, setTestimonials] = useState<TestimonialRecord[]>([]);

  useEffect(() => {
    void listApprovedTestimonials().then(setTestimonials);
  }, []);

  const featuredRecipes = useMemo(() => {
    const byId = new Map(SEED_RECIPES_PH.map((r) => [r.id, r]));
    const picked = FEATURED_SLUGS.map((id) => byId.get(id)).filter(Boolean);
    return picked.length > 0 ? picked : SEED_RECIPES_PH.slice(0, 6);
  }, []);

  // Client-side static preview estimate for the ₱1,500 – ₱15,000 slider
  const sliderPreview = useMemo(() => {
    const perDayTargetMinor = Math.round((sliderBudget * 100) / 14);
    const tier =
      sliderBudget < 3000
        ? 'Lean veggie & egg rotation (2 meals/day for 2–3 people)'
        : sliderBudget < 6500
          ? 'Balanced Filipino home menu (3 meals/day for 4 people)'
          : 'Generous mixed meats, seafood & snacks (3 meals/day for 4–6 people)';

    const sampleMeals =
      sliderBudget < 3000
        ? ['Tortang Talong', 'Ginisang Munggo', 'Lugaw with Boiled Egg']
        : sliderBudget < 6500
          ? ['Chicken Adobo', 'Tinolang Manok', 'Ginisang Sardinas', 'Pork Sinigang']
          : ['Beef Nilaga', 'Pork Sinigang', 'Chicken Inasal', 'Inihaw na Bangus'];

    return { perDayTargetMinor, tier, sampleMeals };
  }, [sliderBudget]);

  function handleMiniFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qs = new URLSearchParams({
      budget: String(budget),
      people: String(people),
      days: String(days),
    }).toString();

    if (status === 'ready') {
      navigate(`/app/new?${qs}`);
    } else {
      navigate(`/signup?${qs}`);
    }
  }

  async function handleWaitlistSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!waitlistEmail.trim()) return;
    setWaitlistBusy(true);
    try {
      await apiClient.submitWaitlist({
        email: waitlistEmail.trim(),
        country: waitlistCountry,
      });
      await submitWaitlistDoc({
        email: waitlistEmail.trim(),
        country: waitlistCountry,
      });
      pushToast({
        title: `Added to ${COUNTRIES[waitlistCountry].name} waitlist`,
        description: "We'll email you once local pack prices launch.",
        tone: 'moss',
      });
      setWaitlistEmail('');
    } catch (err) {
      pushToast({
        title: 'Could not join waitlist',
        description: err instanceof Error ? err.message : 'Please check your email.',
        tone: 'tamarind',
      });
    } finally {
      setWaitlistBusy(false);
    }
  }

  const faqSchema = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    }),
    []
  );

  return (
    <div className={styles.page}>
      <Seo
        title={BRAND.name}
        description={BRAND.subTagline}
      />
      <JsonLd id="faq-jsonld" data={faqSchema} />

      {/* 1. Sticky 3-Zone Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Wordmark to="/" showBadge />
          <nav className={styles.navLinks} aria-label="Primary sections">
            <a href="#how-it-works">How it works</a>
            <a href="#sample-plans">Budget slider</a>
            <a href="#dishes">Dishes</a>
            <a href="#markets">Markets</a>
            <a href="#faq">FAQ</a>
            <Link to="/about">About us</Link>
          </nav>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.themeBtn}
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            {status === 'ready' ? (
              <Link to="/app">
                <Button size="sm">Open planner</Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className={styles.loginLink}>
                  Log in
                </Link>
                <Link to="/signup">
                  <Button size="sm">Get started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* 2. Hero Bento with Interactive 3D Kitchen Diorama */}
        <section className={styles.section}>
          <div className={styles.container}>
            <BentoGrid columns={12}>
              <BentoTile colSpan={6} tone="card" leaf className={styles.heroCopyTile}>
                <Badge tone="moss">Live in Philippines · PHP ₱</Badge>
                <h1 className={styles.heroTitle}>{BRAND.tagline}</h1>
                <p className={styles.heroSub}>
                  Enter your total food budget and kitchen gear. Get a multi-day Filipino home menu priced by real palengke and supermarket packs — never over budget.
                </p>

                <form onSubmit={handleMiniFormSubmit} className={styles.miniForm}>
                  <div className={styles.miniRow}>
                    <Field label="Total budget (PHP)" htmlFor="hero-budget">
                      <CurrencyInput
                        id="hero-budget"
                        currency="PHP"
                        value={budget}
                        onChange={setBudget}
                        min={500}
                        max={100000}
                      />
                    </Field>
                    <Field label="Days">
                      <Stepper
                        value={days}
                        onChange={setDays}
                        min={3}
                        max={31}
                        unitLabel="days"
                        label="Days"
                      />
                    </Field>
                  </div>

                  <div className={styles.miniBottom}>
                    <Field label="Household size">
                      <Stepper
                        value={people}
                        onChange={setPeople}
                        min={1}
                        max={12}
                        unitLabel={people === 1 ? 'person' : 'people'}
                        label="People"
                      />
                    </Field>
                    <Button type="submit" size="lg" className={styles.heroSubmit}>
                      Plan my meals <ArrowRight size={18} weight="bold" />
                    </Button>
                  </div>
                </form>

                <div className={styles.heroTrust}>
                  <span>
                    <CheckCircle size={16} weight="fill" /> Real NCR & regional pack sizes
                  </span>
                  <span>
                    <CheckCircle size={16} weight="fill" /> Supports no-fridge kitchens
                  </span>
                </div>
              </BentoTile>

              <BentoTile colSpan={6} tone="paper2" compact className={styles.hero3dTile}>
                <KitchenDiorama3D />
              </BentoTile>
            </BentoGrid>
          </div>
        </section>

        {/* 3. Currency & Market Strip */}
        <section className={styles.stripSection}>
          <div className={styles.container}>
            <div className={styles.stripBar}>
              <span className={styles.stripLabel}>Market Coverage</span>
              <div className={styles.stripItems}>
                <Badge tone="moss">Philippines (PHP ₱) · Live</Badge>
                <Badge tone="neutral">Malaysia (MYR) · Next</Badge>
                <Badge tone="neutral">Japan (JPY) · Next</Badge>
                <Badge tone="neutral">United States (USD) · Next</Badge>
              </div>
            </div>
          </div>
        </section>

        {/* 4. How It Works */}
        <section id="how-it-works" className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <span className={styles.eyebrow}>How it works</span>
              <h2 className={styles.sectionTitle}>Three calm steps from peso cap to dinner table.</h2>
            </div>

            <BentoGrid columns={12}>
              <BentoTile colSpan={4} tone="card" interactive>
                <span className={styles.stepNum}>01</span>
                <h3 className={styles.tileTitle}>Set your budget & kitchen</h3>
                <p className={styles.tileCopy}>
                  Pick your total budget, household headcount, stove setup, and check spices you already own so you never buy salt or soy sauce twice.
                </p>
              </BentoTile>
              <BentoTile colSpan={4} tone="clayWash" interactive>
                <span className={styles.stepNum}>02</span>
                <h3 className={styles.tileTitle}>Pack-costed menu in seconds</h3>
                <p className={styles.tileCopy}>
                  Our deterministic engine selects local dishes and rounds every grocery line up to real store pack sizes — guaranteeing zero overspend.
                </p>
              </BentoTile>
              <BentoTile colSpan={4} tone="mossWash" leaf interactive>
                <span className={styles.stepNum}>03</span>
                <h3 className={styles.tileTitle}>Shop by trip & cook step-by-step</h3>
                <p className={styles.tileCopy}>
                  Print or check off your aisle-sorted list at the palengke, swap any dish in one click, and log what you actually paid at checkout.
                </p>
              </BentoTile>
            </BentoGrid>
          </div>
        </section>

        {/* 5. Asymmetric Feature Bento (8 tiles) */}
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <span className={styles.eyebrow}>Built for real grocery math</span>
              <h2 className={styles.sectionTitle}>Every feature solves a real kitchen constraint.</h2>
            </div>

            <BentoGrid columns={12}>
              <BentoTile colSpan={6} tone="ink">
                <Scales size={26} />
                <h3 className={styles.tileTitle}>Hard budget ceiling, never theoretical fractions</h3>
                <p className={styles.tileCopyDark}>
                  If coconut milk comes in a 400 ml can, we budget the full can on your grocery bill and reuse leftover portions in another dish that week.
                </p>
              </BentoTile>
              <BentoTile colSpan={3} tone="card">
                <Snowflake size={24} className={styles.iconClay} />
                <h3 className={styles.tileTitle}>No-fridge trip logic</h3>
                <p className={styles.tileCopy}>
                  Uncheck Refrigerator to auto-split shopping every 2 days with shelf-stable picks.
                </p>
              </BentoTile>
              <BentoTile colSpan={3} tone="turmericWash">
                <Basket size={24} className={styles.iconTurmeric} />
                <h3 className={styles.tileTitle}>Pantry subtraction</h3>
                <p className={styles.tileCopy}>
                  Mark rice, oil, garlic, or vinegar on hand and pay ₱0 for them.
                </p>
              </BentoTile>
              <BentoTile colSpan={3} tone="card">
                <Swap size={24} className={styles.iconMoss} />
                <h3 className={styles.tileTitle}>1-click swaps</h3>
                <p className={styles.tileCopy}>
                  Preview 3 replacements with exact peso deltas before swapping.
                </p>
              </BentoTile>
              <BentoTile colSpan={3} tone="paper2">
                <Sparkle size={24} className={styles.iconClay} />
                <h3 className={styles.tileTitle}>Custom local prices</h3>
                <p className={styles.tileCopy}>
                  Edit any ingredient pack price to match your suki stall and re-cost immediately.
                </p>
              </BentoTile>
              <BentoTile colSpan={3} tone="mossWash">
                <Printer size={24} className={styles.iconMoss} />
                <h3 className={styles.tileTitle}>Print-ready list</h3>
                <p className={styles.tileCopy}>
                  Clean black-on-white shopping printout grouped by market trip & aisle.
                </p>
              </BentoTile>
              <BentoTile colSpan={3} tone="card">
                <ShareNetwork size={24} className={styles.iconClay} />
                <h3 className={styles.tileTitle}>Family share links</h3>
                <p className={styles.tileCopy}>
                  Send a zero-login snapshot to whoever does the market run.
                </p>
              </BentoTile>
            </BentoGrid>
          </div>
        </section>

        {/* 6. Interactive Budget Slider Preview */}
        <section id="sample-plans" className={styles.section}>
          <div className={styles.container}>
            <BentoGrid columns={12}>
              <BentoTile colSpan={7} tone="card">
                <span className={styles.eyebrow}>Live Budget Preview</span>
                <h2 className={styles.sectionTitle}>
                  See what {formatMoney(sliderBudget * 100, 'PHP', 'en-PH', { compactDecimals: true })} buys over 14 days
                </h2>
                <Slider
                  value={sliderBudget}
                  onChange={setSliderBudget}
                  min={1500}
                  max={15000}
                  step={250}
                  ariaLabel="14-day food budget preview in Philippine pesos"
                />
                <div className={styles.sliderBounds}>
                  <span>₱1,500</span>
                  <span>₱5,000 (typical family of 4)</span>
                  <span>₱15,000</span>
                </div>
                <p className={styles.tileCopy}>{sliderPreview.tier}</p>
              </BentoTile>

              <BentoTile colSpan={5} tone="clay" leaf>
                <span className={styles.eyebrowLight}>Estimated Daily Pacing</span>
                <div className={styles.previewBig}>
                  {formatMoney(sliderPreview.perDayTargetMinor, 'PHP', 'en-PH')} / day
                </div>
                <p className={styles.previewSub}>Sample dishes unlocked at this budget:</p>
                <ul className={styles.previewList}>
                  {sliderPreview.sampleMeals.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </BentoTile>
            </BentoGrid>
          </div>
        </section>

        {/* 7. Dish Gallery */}
        <section id="dishes" className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <span className={styles.eyebrow}>Everyday Filipino Kitchen</span>
              <h2 className={styles.sectionTitle}>38 home-cooked recipes built from real market cuts.</h2>
            </div>

            <div className={styles.dishGrid}>
              {featuredRecipes.map((recipe) => (
                <article key={recipe!.id} className={styles.dishCard}>
                  <DishImage
                    src={recipe!.image.url}
                    alt={recipe!.name}
                    tone={recipe!.accentTone ?? 'clay'}
                    aspect="4/3"
                  />
                  <div className={styles.dishMeta}>
                    <div className={styles.dishTop}>
                      <strong>{recipe!.name}</strong>
                      <Badge tone="neutral">{recipe!.prepMin + recipe!.cookMin}m</Badge>
                    </div>
                    <p className={styles.dishLocal}>{recipe!.localName}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 8. Markets & Waitlist */}
        <section id="markets" className={styles.section}>
          <div className={styles.container}>
            <BentoGrid columns={12}>
              <BentoTile colSpan={6} tone="moss" leaf>
                <Badge tone="turmeric">Live Now</Badge>
                <h2 className={styles.tileTitleLarge}>Philippines · PHP (₱)</h2>
                <p className={styles.tileCopyLight}>
                  61 everyday market ingredients with regional adjustment multipliers for Metro Manila (NCR), CALABARZON, Central Luzon, Metro Cebu, and Davao.
                </p>
              </BentoTile>

              <BentoTile colSpan={6} tone="card">
                <span className={styles.eyebrow}>Next Markets</span>
                <h3 className={styles.tileTitle}>Request prices for your country</h3>
                <p className={styles.tileCopy}>
                  Joining from Malaysia, Japan, or the US? Leave your email and we will notify you when local grocery pack catalogs go live.
                </p>
                <form onSubmit={handleWaitlistSubmit} className={styles.waitlistForm}>
                  <select
                    className={fieldStyles.select}
                    aria-label="Select country"
                    value={waitlistCountry}
                    onChange={(e) => setWaitlistCountry(e.target.value as CountryCode)}
                  >
                    <option value="MY">Malaysia (MYR)</option>
                    <option value="JP">Japan (JPY)</option>
                    <option value="US">United States (USD)</option>
                  </select>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    className={fieldStyles.input}
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                  />
                  <Button type="submit" loading={waitlistBusy}>
                    Notify me
                  </Button>
                </form>
              </BentoTile>
            </BentoGrid>
          </div>
        </section>

        {/* 9. Who It's For */}
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <span className={styles.eyebrow}>Made for real kitchens</span>
              <h2 className={styles.sectionTitle}>Who uses What's you ulam</h2>
            </div>
            <BentoGrid columns={12}>
              <BentoTile colSpan={3} tone="card">
                <h3 className={styles.tileTitle}>Families of 4–6</h3>
                <p className={styles.tileCopy}>Keep bi-weekly grocery runs strictly inside payday limits.</p>
              </BentoTile>
              <BentoTile colSpan={3} tone="paper2">
                <h3 className={styles.tileTitle}>Solo renters & students</h3>
                <p className={styles.tileCopy}>Cook on a single rice cooker or induction burner without spoiling food.</p>
              </BentoTile>
              <BentoTile colSpan={3} tone="clayWash">
                <h3 className={styles.tileTitle}>No-fridge households</h3>
                <p className={styles.tileCopy}>Fresh meat on day 1, dried fish, eggs, and beans before the next market run.</p>
              </BentoTile>
              <BentoTile colSpan={3} tone="mossWash">
                <h3 className={styles.tileTitle}>Allergy-aware cooks</h3>
                <p className={styles.tileCopy}>Zero-compromise filters for shrimp, fish, eggs, soy, dairy, peanut, and pork.</p>
              </BentoTile>
            </BentoGrid>
          </div>
        </section>

        {/* 10. Real Firestore Testimonials (hidden if empty) */}
        {testimonials.length > 0 && (
          <section className={styles.section}>
            <div className={styles.container}>
              <div className={styles.sectionHead}>
                <span className={styles.eyebrow}>Community notes</span>
                <h2 className={styles.sectionTitle}>From kitchens across the Philippines</h2>
              </div>
              <BentoGrid columns={12}>
                {testimonials.map((t) => (
                  <BentoTile key={t.id} colSpan={4} tone="card">
                    <p className={styles.quote}>“{t.quote}”</p>
                    <div className={styles.quoteMeta}>
                      <strong>{t.authorName}</strong>
                      <span>
                        {t.city} · {t.householdLabel}
                      </span>
                    </div>
                  </BentoTile>
                ))}
              </BentoGrid>
            </div>
          </section>
        )}

        {/* 11. FAQ */}
        <section id="faq" className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionHead}>
              <span className={styles.eyebrow}>Questions & answers</span>
              <h2 className={styles.sectionTitle}>Everything about pricing, packs & diets</h2>
            </div>
            <Accordion items={FAQ_ITEMS} />
          </div>
        </section>

        {/* 12. Final CTA */}
        <section className={styles.section}>
          <div className={styles.container}>
            <BentoTile colSpan={12} tone="ink" leaf className={styles.finalCta}>
              <div>
                <h2 className={styles.finalTitle}>Ready to plan next week around your budget?</h2>
                <p className={styles.tileCopyDark}>
                  Free account, saved plans, printable palengke checklists, and editable local prices.
                </p>
              </div>
              <Link to={status === 'ready' ? '/app/new' : '/signup'}>
                <Button size="lg">
                  Start planning free <ArrowRight size={18} weight="bold" />
                </Button>
              </Link>
            </BentoTile>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Wordmark to="/" size="sm" />
            <p className={styles.footerNote}>{BRAND.subTagline}</p>
          </div>
          <nav className={styles.footerLinks} aria-label="Footer">
            <Link to="/about">About us</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/cookies">Cookies</Link>
            <Link to="/contact">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

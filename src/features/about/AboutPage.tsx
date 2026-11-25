import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowSquareOut,
  ChatCircleDots,
  DeviceMobile,
  EnvelopeSimple,
  Moon,
  PhoneCall,
  Sun,
} from '@phosphor-icons/react';
import { BentoGrid } from '@/components/bento/BentoGrid';
import { BentoTile } from '@/components/bento/BentoTile';
import { Wordmark } from '@/components/brand/Wordmark';
import { Seo } from '@/components/seo/Seo';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BRAND, DEVELOPER } from '@/constants/brand';
import { useAuth } from '@/features/auth/AuthProvider';
import { useUiStore } from '@/store/ui';
import styles from './AboutPage.module.css';

export function AboutPage() {
  const { status } = useAuth();
  const { theme, toggleTheme } = useUiStore();

  return (
    <div className={styles.page}>
      <Seo
        title="About Us"
        description={`Learn why ${BRAND.name} was built for Filipino households and meet main developer ${DEVELOPER.name}.`}
      />

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Wordmark to="/" showBadge />
          <nav className={styles.navLinks} aria-label="About navigation">
            <Link to="/">Home</Link>
            <Link to="/about">About us</Link>
            <Link to="/contact">Feedback</Link>
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
            <Link to={status === 'ready' ? '/app' : '/signup'}>
              <Button size="sm">{status === 'ready' ? 'Open planner' : 'Get started'}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* Purpose & Filipino Household Problem */}
        <section aria-labelledby="about-purpose-heading">
          <BentoGrid columns={12}>
            <BentoTile colSpan={7} tone="card" leaf className={styles.heroCopy}>
              <Badge tone="moss">About {BRAND.name}</Badge>
              <h1 id="about-purpose-heading" className={styles.heroTitle}>
                Built so Filipino families never overshoot their grocery budget.
              </h1>
              <p className={styles.lead}>
                Every payday, households try to stretch ₱2,500–₱6,000 across two weeks of meals. Most meal planners break because they count theoretical recipe fractions (like ₱5 worth of soy sauce) instead of the whole packs and cuts you actually pay for at the palengke or grocery.
              </p>
              <div className={styles.actions}>
                <Link to={status === 'ready' ? '/app/new' : '/signup'}>
                  <Button size="lg">
                    Plan your menu <ArrowRight size={18} weight="bold" />
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" size="lg">
                    Send feedback
                  </Button>
                </Link>
              </div>
            </BentoTile>

            <BentoTile colSpan={5} tone="paper2">
              <span className={styles.eyebrow}>What problem it solves</span>
              <h2 className={styles.tileTitle}>Real Filipino palengke math</h2>
              <ul className={styles.list}>
                <li>
                  <strong>Zero surprise totals:</strong> Prices every grocery item by real whole store packs and regional Philippine prices (NCR, CALABARZON, Central Luzon, Metro Cebu, Davao).
                </li>
                <li>
                  <strong>Works even without a fridge:</strong> Uncheck Refrigerator and trips automatically split into fresh 2-day palengke runs.
                </li>
                <li>
                  <strong>Counts what you already own:</strong> Subtract pantry staples like rice, cooking oil, garlic, and vinegar before spending a peso.
                </li>
                <li>
                  <strong>Respects household diets:</strong> Strict filters for pork-free / halal-friendly, pescatarian, vegetarian, and common food allergens.
                </li>
              </ul>
            </BentoTile>
          </BentoGrid>
        </section>

        {/* Mobile App Coming Soon */}
        <section aria-labelledby="app-coming-soon-heading">
          <BentoTile colSpan={12} tone="moss" leaf className={styles.appBanner}>
            <div className={styles.appBannerCopy}>
              <span className={styles.eyebrowLight}>
                <DeviceMobile size={15} weight="bold" /> Mobile Release
              </span>
              <h2 id="app-coming-soon-heading" className={styles.sectionTitle}>
                What&apos;s you ulam mobile app is coming soon
              </h2>
              <p className={styles.copyLight}>
                We are preparing a dedicated Android and iOS companion app for offline palengke checklists, quick checkout spend logging, and instant household sharing while you shop. Use the full web planner free right now on phone or desktop.
              </p>
            </div>
            <Link to="/contact">
              <Button variant="outline">Request early mobile access</Button>
            </Link>
          </BentoTile>
        </section>

        {/* Main Developer Profile */}
        <section aria-labelledby="developer-heading">
          <BentoGrid columns={12}>
            <BentoTile colSpan={8} tone="card">
              <span className={styles.eyebrow}>Main Developer</span>
              <div className={styles.devProfileWrap}>
                <div className={styles.avatarSlot}>
                  {DEVELOPER.imageUrl ? (
                    <img
                      src={DEVELOPER.imageUrl}
                      alt={DEVELOPER.name}
                      className={styles.avatarImg}
                    />
                  ) : (
                    <>
                      <span className={styles.avatarMonogram}>{DEVELOPER.initials}</span>
                      <span className={styles.avatarHint}>Developer portrait slot (coming soon)</span>
                    </>
                  )}
                </div>

                <div className={styles.devInfo}>
                  <h2 id="developer-heading" className={styles.devName}>
                    {DEVELOPER.name}
                  </h2>
                  <p className={styles.devRole}>{DEVELOPER.role}</p>
                  <p className={styles.devDegree}>{DEVELOPER.degree}</p>
                  <p className={styles.copy}>{DEVELOPER.bio}</p>

                  <div className={styles.tagRow}>
                    {DEVELOPER.skills.map((skill) => (
                      <Badge key={skill} tone="neutral">
                        {skill}
                      </Badge>
                    ))}
                  </div>

                  <div className={styles.actions}>
                    <a
                      href={DEVELOPER.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button>
                        Visit portfolio <ArrowSquareOut size={17} />
                      </Button>
                    </a>
                    <Link to="/contact">
                      <Button variant="outline">Message developer</Button>
                    </Link>
                  </div>
                </div>
              </div>

              <div className={styles.highlightGrid}>
                {DEVELOPER.highlights.map((item) => (
                  <div key={item.name} className={styles.highlightCard}>
                    <strong>{item.name}</strong>
                    <span>{item.summary}</span>
                  </div>
                ))}
              </div>
            </BentoTile>

            {/* Direct Contact Tile */}
            <BentoTile colSpan={4} tone="turmericWash" leaf>
              <span className={styles.eyebrow}>Direct Contacts</span>
              <h2 className={styles.tileTitle}>Reach out anytime</h2>
              <p className={styles.copy}>
                Questions, local price corrections, or project inquiries? All feedback is sent to{' '}
                <strong>{DEVELOPER.email}</strong> or via WhatsApp &amp; Viber.
              </p>

              <div className={styles.contactList}>
                <a href={`mailto:${DEVELOPER.email}`} className={styles.contactItem}>
                  <span className={styles.contactLabel}>
                    <EnvelopeSimple size={18} /> Email
                  </span>
                  <span className={styles.contactValue}>{DEVELOPER.email}</span>
                </a>

                <a
                  href={DEVELOPER.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.contactItem}
                >
                  <span className={styles.contactLabel}>
                    <ChatCircleDots size={18} /> WhatsApp
                  </span>
                  <span className={styles.contactValue}>{DEVELOPER.phoneLocal}</span>
                </a>

                <a href={DEVELOPER.viberUrl} className={styles.contactItem}>
                  <span className={styles.contactLabel}>
                    <PhoneCall size={18} /> Viber
                  </span>
                  <span className={styles.contactValue}>{DEVELOPER.phoneLocal}</span>
                </a>

                <a
                  href={DEVELOPER.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.contactItem}
                >
                  <span className={styles.contactLabel}>
                    <ArrowSquareOut size={18} /> Portfolio
                  </span>
                  <span className={styles.contactValue}>markaironcantal.site</span>
                </a>
              </div>
            </BentoTile>
          </BentoGrid>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Wordmark to="/" size="sm" />
          <nav className={styles.footerLinks} aria-label="Footer">
            <Link to="/">Home</Link>
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

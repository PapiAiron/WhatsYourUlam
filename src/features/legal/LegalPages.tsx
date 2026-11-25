import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wordmark } from '@/components/brand/Wordmark';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/Button';
import { Field, fieldStyles } from '@/components/ui/Field';
import { BRAND, DEVELOPER } from '@/constants/brand';
import { LEGAL } from '@/constants/legal';
import { apiClient } from '@/lib/apiClient';
import { submitFeedbackDoc } from '@/lib/firestoreRepo';
import { useUiStore } from '@/store/ui';
import styles from './LegalPage.module.css';

export function PrivacyPage() {
  return (
    <div className={styles.page}>
      <Seo title="Privacy Policy" />
      <div className={styles.container}>
        <Wordmark to="/" />
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.meta}>Effective {LEGAL.effectiveDate}</p>
        <div className={styles.card}>
          <h2>1. What we collect</h2>
          <p>
            When you create an account on {BRAND.name}, we store your email address, display name, kitchen equipment defaults, saved meal plans, and custom ingredient price overrides inside your private Firebase Firestore space.
          </p>
          <h2>2. Public share snapshots</h2>
          <p>
            If you choose to share a meal plan link, only the plan title, meals, and grocery summary are copied into a read-only snapshot. Your email, account ID, and custom profile stay private.
          </p>
          <h2>3. Export & deletion</h2>
          <p>
            You can export all of your household data as JSON or permanently delete your account and all saved plans anytime from Settings.
          </p>
        </div>
        <Link to="/" className={styles.backLink}>← Back to home</Link>
      </div>
    </div>
  );
}

export function TermsPage() {
  return (
    <div className={styles.page}>
      <Seo title="Terms of Service" />
      <div className={styles.container}>
        <Wordmark to="/" />
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.meta}>Effective {LEGAL.effectiveDate}</p>
        <div className={styles.card}>
          <h2>1. Estimates & market prices</h2>
          <p>{LEGAL.priceNotice}</p>
          <h2>2. Allergen & nutrition safety</h2>
          <p>{LEGAL.allergenNotice}</p>
          <p>{LEGAL.nutritionNotice}</p>
          <h2>3. Acceptable use</h2>
          <p>
            {BRAND.name} is provided for personal and household meal planning under the laws of {LEGAL.jurisdiction}.
          </p>
        </div>
        <Link to="/" className={styles.backLink}>← Back to home</Link>
      </div>
    </div>
  );
}

export function CookiesPage() {
  const { consent, acceptConsent } = useUiStore();
  return (
    <div className={styles.page}>
      <Seo title="Cookie & Storage Policy" />
      <div className={styles.container}>
        <Wordmark to="/" />
        <h1 className={styles.title}>Cookies & Local Storage</h1>
        <p className={styles.meta}>Current preference: {consent === 'accepted' ? 'All enabled' : 'Essential only'}</p>
        <div className={styles.card}>
          <h2>Essential storage</h2>
          <p>
            Used for Firebase sign-in sessions, your light/dark theme toggle, and keeping your meal wizard draft intact while you browse.
          </p>
          <div className={styles.actions}>
            <Button variant="outline" onClick={() => acceptConsent('essential')}>
              Essential only
            </Button>
            <Button onClick={() => acceptConsent('accepted')}>
              Accept optional analytics
            </Button>
          </div>
        </div>
        <Link to="/" className={styles.backLink}>← Back to home</Link>
      </div>
    </div>
  );
}

export function ContactPage() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState<'pricing' | 'recipe' | 'bug' | 'feature' | 'general'>('pricing');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiClient.submitFeedback({ name, email, topic, message });
      await submitFeedbackDoc({ name, email, topic, message });
      setSent(true);
      pushToast({ title: 'Message sent — thank you!', tone: 'moss' });
    } catch (err) {
      pushToast({
        title: 'Could not send message',
        description: err instanceof Error ? err.message : 'Please check all fields.',
        tone: 'tamarind',
      });
    } finally {
      setBusy(false);
    }
  }

  const mailtoHref = `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(
    `[${BRAND.name}] ${topic.toUpperCase()} feedback from ${name || 'visitor'}`
  )}&body=${encodeURIComponent(
    `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}`
  )}`;

  return (
    <div className={styles.page}>
      <Seo title="Contact & Price Feedback" />
      <div className={styles.container}>
        <Wordmark to="/" />
        <h1 className={styles.title}>Contact & Local Price Feedback</h1>
        <p className={styles.meta}>
          Feedback is sent to {BRAND.supportEmail} · WhatsApp & Viber: {DEVELOPER.phoneLocal}
        </p>

        {sent ? (
          <div className={styles.card}>
            <h2>Message received</h2>
            <p>
              Thank you for helping keep {BRAND.name} accurate for Filipino households. Your feedback has been saved for {BRAND.supportEmail}.
            </p>
            <div className={styles.actions}>
              <a href={mailtoHref}>
                <Button variant="outline">Send copy via email app</Button>
              </a>
              <Link to="/">
                <Button>Return home</Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.card}>
            <Field label="Your name" htmlFor="ct-name">
              <input
                id="ct-name"
                required
                className={fieldStyles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="ct-email">
              <input
                id="ct-email"
                type="email"
                required
                className={fieldStyles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Topic" htmlFor="ct-topic">
              <select
                id="ct-topic"
                className={fieldStyles.select}
                value={topic}
                onChange={(e) => setTopic(e.target.value as typeof topic)}
              >
                <option value="pricing">Report local market price</option>
                <option value="recipe">Suggest a recipe</option>
                <option value="bug">Report an issue</option>
                <option value="feature">Feature request</option>
                <option value="general">General inquiry</option>
              </select>
            </Field>
            <Field label="Message (at least 10 characters)" htmlFor="ct-msg">
              <textarea
                id="ct-msg"
                required
                minLength={10}
                className={fieldStyles.textarea}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </Field>
            <Button type="submit" loading={busy} size="lg">
              Send feedback to {BRAND.supportEmail}
            </Button>
          </form>
        )}

        <div className={styles.card}>
          <h2>Direct Developer Channels</h2>
          <p>
            Need a quick reply from {DEVELOPER.name}? Reach out directly via email, WhatsApp, or Viber:
          </p>
          <div className={styles.directContacts}>
            <a href={`mailto:${DEVELOPER.email}`} className={styles.directLink}>
              Email: {DEVELOPER.email}
            </a>
            <a
              href={DEVELOPER.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.directLink}
            >
              WhatsApp: {DEVELOPER.phoneLocal}
            </a>
            <a href={DEVELOPER.viberUrl} className={styles.directLink}>
              Viber: {DEVELOPER.phoneLocal}
            </a>
            <Link to="/about" className={styles.directLink}>
              About {BRAND.name} &amp; Developer
            </Link>
          </div>
        </div>

        <Link to="/" className={styles.backLink}>← Back to home</Link>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <Seo title="Page not found" noindex />
      <div className={styles.container}>
        <Wordmark to="/" />
        <div className={styles.card}>
          <span className={styles.meta}>404 · Not found</span>
          <h1 className={styles.title}>This page isn't on the menu.</h1>
          <p>Head back to the home page or open your meal planner.</p>
          <div className={styles.actions}>
            <Link to="/"><Button variant="outline">Home</Button></Link>
            <Link to="/app"><Button>Open planner</Button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}

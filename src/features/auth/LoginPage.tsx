import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Wordmark } from '@/components/brand/Wordmark';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/Button';
import { Field, fieldStyles } from '@/components/ui/Field';
import { auth } from '@/lib/firebase';
import { useWizardDraft } from '@/store/wizardDraft';
import { useAuth } from './AuthProvider';
import { mapFirebaseAuthError } from './firebaseErrors';
import { GoogleIcon } from './GoogleIcon';
import styles from './AuthPage.module.css';

export function LoginPage() {
  const { status, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patchDraft = useWizardDraft((s) => s.patchDraft);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const nextUrl = searchParams.get('next') || '/app';

  useEffect(() => {
    const budget = Number(searchParams.get('budget'));
    const people = Number(searchParams.get('people'));
    const days = Number(searchParams.get('days'));
    if (budget > 0 || people > 0 || days > 0) {
      patchDraft({
        ...(budget > 0 ? { budgetMajor: budget } : {}),
        ...(people > 0 ? { people } : {}),
        ...(days > 0 ? { days } : {}),
      });
    }
  }, [searchParams, patchDraft]);

  useEffect(() => {
    if (status === 'ready') {
      navigate(nextUrl, { replace: true });
    } else if (status === 'unverified') {
      navigate('/verify-email', { replace: true });
    }
  }, [status, navigate, nextUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.shell}>
      <Seo title="Log in" noindex />
      <aside className={styles.aside}>
        <Wordmark to="/" />
        <div>
          <h2 className={styles.asideHeadline}>
            Your peso budget, mapped to every pot and palengke trip.
          </h2>
          <p className={styles.asideCopy}>
            Log in to open your saved meal plans, adjust local ingredient prices, and check off your shopping trips.
          </p>
        </div>
        <div className={styles.asideCard}>
          <span className={styles.asideMetric}>₱5,000 → 14 days</span>
          <span>Pack-accurate costing with zero hidden pantry markups.</span>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.header}>
            <Wordmark to="/" size="sm" />
            <h1 className={styles.title}>Welcome back</h1>
            <p className={styles.sub}>Log in to view your meal plans and grocery lists.</p>
          </div>

          {error && (
            <div className={styles.errorBox} role="alert">
              {error}
            </div>
          )}

          <button
            type="button"
            className={styles.googleBtn}
            onClick={handleGoogle}
            disabled={busy}
          >
            <GoogleIcon />
            <span>Continue with Google</span>
          </button>

          <div className={styles.divider}>or use email</div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <Field label="Email address" htmlFor="login-email">
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                className={fieldStyles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>

            <Field label="Password" htmlFor="login-password">
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                className={fieldStyles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
              />
            </Field>

            <div className={styles.rowBetween}>
              <Link to="/forgot-password" className={styles.link}>
                Forgot password?
              </Link>
              <Link to="/signup" className={styles.link}>
                Create account
              </Link>
            </div>

            <Button type="submit" loading={busy} fullWidth size="lg">
              Log in
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}

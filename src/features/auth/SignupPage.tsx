import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth';
import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as zxcvbnCommon from '@zxcvbn-ts/language-common';
import * as zxcvbnEn from '@zxcvbn-ts/language-en';
import clsx from 'clsx';
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

const passwordChecker = new ZxcvbnFactory({
  translations: zxcvbnEn.translations,
  graphs: zxcvbnCommon.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommon.dictionary,
    ...zxcvbnEn.dictionary,
  },
});

const STRENGTH_LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];

export function SignupPage() {
  const { status, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patchDraft = useWizardDraft((s) => s.patchDraft);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
      navigate('/app/new', { replace: true });
    } else if (status === 'unverified') {
      navigate('/verify-email', { replace: true });
    }
  }, [status, navigate]);

  const strength = useMemo(() => {
    if (!password) return { score: 0, label: 'Use at least 10 characters' };
    const res = passwordChecker.check(password);
    return {
      score: res.score,
      label:
        password.length < 10
          ? `Too short (${password.length}/10 characters)`
          : STRENGTH_LABELS[res.score] ?? 'Fair',
    };
  }, [password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 10) {
      setError('Please choose a passphrase of at least 10 characters.');
      return;
    }

    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (displayName.trim()) {
        await updateProfile(cred.user, { displayName: displayName.trim() });
      }
      await sendEmailVerification(cred.user);
      navigate('/verify-email', { replace: true });
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
      <Seo title="Create account" noindex />
      <aside className={styles.aside}>
        <Wordmark to="/" />
        <div>
          <h2 className={styles.asideHeadline}>
            Build a 14-day household menu in under two minutes.
          </h2>
          <p className={styles.asideCopy}>
            Set your total food budget, check what is already in your pantry, and get a shop-ready pack list.
          </p>
        </div>
        <div className={styles.asideCard}>
          <span className={styles.asideMetric}>38 Filipino home dishes</span>
          <span>Adobo, Sinigang, Tinola, Munggo, Tortang Talong, and more ready out of the box.</span>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.header}>
            <Wordmark to="/" size="sm" />
            <h1 className={styles.title}>Create your account</h1>
            <p className={styles.sub}>Save plans, customize local prices, and print grocery trips.</p>
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
            <span>Sign up with Google</span>
          </button>

          <div className={styles.divider}>or create with email</div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <Field label="Your name" htmlFor="signup-name">
              <input
                id="signup-name"
                type="text"
                required
                className={fieldStyles.input}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Marco Santos"
              />
            </Field>

            <Field label="Email address" htmlFor="signup-email">
              <input
                id="signup-email"
                type="email"
                required
                autoComplete="email"
                className={fieldStyles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>

            <Field label="Passphrase (10+ characters)" htmlFor="signup-password">
              <input
                id="signup-password"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
                className={fieldStyles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 10 characters"
              />
              <div className={styles.meter}>
                <div className={styles.meterTrack} aria-hidden="true">
                  {[0, 1, 2, 3].map((idx) => (
                    <span
                      key={idx}
                      className={clsx(
                        styles.meterBar,
                        password.length >= 10 && idx <= strength.score
                          ? strength.score <= 1
                            ? styles.meterWeak
                            : strength.score === 2
                              ? styles.meterFair
                              : styles.meterStrong
                          : null
                      )}
                    />
                  ))}
                </div>
                <span className={styles.meterLabel}>{strength.label}</span>
              </div>
            </Field>

            <Button type="submit" loading={busy} fullWidth size="lg">
              Create account
            </Button>

            <div className={styles.rowBetween}>
              <span>Already have an account?</span>
              <Link to="/login" className={styles.link}>
                Log in
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

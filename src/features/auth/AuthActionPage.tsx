import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { Wordmark } from '@/components/brand/Wordmark';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/Button';
import { Field, fieldStyles } from '@/components/ui/Field';
import { auth } from '@/lib/firebase';
import { useAuth } from './AuthProvider';
import { mapFirebaseAuthError } from './firebaseErrors';
import styles from './AuthPage.module.css';

export function AuthActionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshVerification } = useAuth();

  const mode = searchParams.get('mode') || '';
  const oobCode = searchParams.get('oobCode') || '';

  const [state, setState] = useState<'working' | 'resetForm' | 'done' | 'error'>('working');
  const [error, setError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setState('error');
      setError('Invalid or missing action code.');
      return;
    }

    if (mode === 'verifyEmail') {
      void applyActionCode(auth, oobCode)
        .then(async () => {
          await refreshVerification();
          setState('done');
        })
        .catch((err) => {
          setError(mapFirebaseAuthError(err));
          setState('error');
        });
    } else if (mode === 'resetPassword') {
      void verifyPasswordResetCode(auth, oobCode)
        .then(() => {
          setState('resetForm');
        })
        .catch((err) => {
          setError(mapFirebaseAuthError(err));
          setState('error');
        });
    } else {
      setState('error');
      setError('Unsupported account action.');
    }
  }, [mode, oobCode, refreshVerification]);

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 10) {
      setError('Please choose at least 10 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setState('done');
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.shell}>
      <Seo title="Account action" noindex />
      <aside className={styles.aside}>
        <Wordmark to="/" />
        <div>
          <h2 className={styles.asideHeadline}>Account security check.</h2>
          <p className={styles.asideCopy}>Confirming your request before taking you back to your meal plans.</p>
        </div>
        <div className={styles.asideCard}>
          <span>Encrypted account verification powered by Firebase Auth.</span>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.card}>
          <Wordmark to="/" size="sm" />
          {state === 'working' && (
            <>
              <h1 className={styles.title}>Checking link...</h1>
              <p className={styles.sub}>One moment while we confirm your link.</p>
            </>
          )}

          {state === 'error' && (
            <>
              <h1 className={styles.title}>Link expired or invalid</h1>
              <div className={styles.errorBox} role="alert">
                {error}
              </div>
              <Button onClick={() => navigate('/login')}>Go to log in</Button>
            </>
          )}

          {state === 'resetForm' && (
            <>
              <h1 className={styles.title}>Choose a new password</h1>
              {error && (
                <div className={styles.errorBox} role="alert">
                  {error}
                </div>
              )}
              <form onSubmit={handleResetSubmit} className={styles.form}>
                <Field label="New passphrase (10+ characters)" htmlFor="new-pw">
                  <input
                    id="new-pw"
                    type="password"
                    required
                    minLength={10}
                    className={fieldStyles.input}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </Field>
                <Button type="submit" loading={busy} fullWidth size="lg">
                  Update password
                </Button>
              </form>
            </>
          )}

          {state === 'done' && (
            <>
              <h1 className={styles.title}>
                {mode === 'verifyEmail' ? 'Email verified' : 'Password updated'}
              </h1>
              <div className={styles.successBox}>
                {mode === 'verifyEmail'
                  ? 'Your email is confirmed. You can now plan your meals.'
                  : 'Your password has been updated. You can now log in.'}
              </div>
              <Link to={mode === 'verifyEmail' ? '/onboarding' : '/login'} className={styles.link}>
                <Button fullWidth size="lg">
                  {mode === 'verifyEmail' ? 'Continue setup' : 'Log in now'}
                </Button>
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

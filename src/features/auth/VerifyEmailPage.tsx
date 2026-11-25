import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendEmailVerification } from 'firebase/auth';
import { Wordmark } from '@/components/brand/Wordmark';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/Button';
import { auth } from '@/lib/firebase';
import { useAuth } from './AuthProvider';
import { mapFirebaseAuthError } from './firebaseErrors';
import styles from './AuthPage.module.css';

export function VerifyEmailPage() {
  const { status, user, refreshVerification, signOut } = useAuth();
  const navigate = useNavigate();

  const [cooldown, setCooldown] = useState(0);
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'signedOut') {
      navigate('/login', { replace: true });
    } else if (status === 'ready') {
      navigate('/onboarding', { replace: true });
    }
  }, [status, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    const check = () => {
      void refreshVerification();
    };
    const interval = window.setInterval(check, 5000);
    window.addEventListener('focus', check);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', check);
    };
  }, [refreshVerification]);

  async function handleCheckNow() {
    setChecking(true);
    setError('');
    setNotice('');
    try {
      const ok = await refreshVerification();
      if (!ok) {
        setNotice('Not verified yet. Open the verification email in your inbox, then click again.');
      }
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setChecking(false);
    }
  }

  async function handleResend() {
    if (!auth.currentUser || cooldown > 0) return;
    setError('');
    setNotice('');
    try {
      await sendEmailVerification(auth.currentUser);
      setCooldown(60);
      setNotice('Fresh verification email sent.');
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    }
  }

  return (
    <div className={styles.shell}>
      <Seo title="Verify your email" noindex />
      <aside className={styles.aside}>
        <Wordmark to="/" />
        <div>
          <h2 className={styles.asideHeadline}>One quick check before planning.</h2>
          <p className={styles.asideCopy}>
            Verifying your email keeps your meal plans, custom prices, and household settings protected.
          </p>
        </div>
        <div className={styles.asideCard}>
          <span>This page checks automatically every 5 seconds once you click the link.</span>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.header}>
            <Wordmark to="/" size="sm" />
            <h1 className={styles.title}>Check your inbox</h1>
            <p className={styles.sub}>
              We sent a verification link to <strong>{user?.email}</strong>. Click it, then continue below.
            </p>
          </div>

          {error && (
            <div className={styles.errorBox} role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className={styles.successBox} role="status">
              {notice}
            </div>
          )}

          <div className={styles.form}>
            <Button onClick={handleCheckNow} loading={checking} fullWidth size="lg">
              I've verified my email
            </Button>

            <Button
              variant="outline"
              onClick={handleResend}
              disabled={cooldown > 0}
              fullWidth
            >
              {cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend verification email'}
            </Button>

            <Button variant="ghost" onClick={() => void signOut()} fullWidth>
              Use a different email
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Wordmark } from '@/components/brand/Wordmark';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/Button';
import { Field, fieldStyles } from '@/components/ui/Field';
import { auth } from '@/lib/firebase';
import { mapFirebaseAuthError } from './firebaseErrors';
import styles from './AuthPage.module.css';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.shell}>
      <Seo title="Reset password" noindex />
      <aside className={styles.aside}>
        <Wordmark to="/" />
        <div>
          <h2 className={styles.asideHeadline}>Get back to your kitchen board.</h2>
          <p className={styles.asideCopy}>
            We'll send a secure link to reset your passphrase and restore access to your plans.
          </p>
        </div>
        <div className={styles.asideCard}>
          <span>All saved plans and grocery overrides stay safe in your account.</span>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.header}>
            <Wordmark to="/" size="sm" />
            <h1 className={styles.title}>Reset your password</h1>
            <p className={styles.sub}>Enter your email and we will send a reset link.</p>
          </div>

          {error && (
            <div className={styles.errorBox} role="alert">
              {error}
            </div>
          )}

          {sent ? (
            <div className={styles.successBox} role="status">
              Reset instructions sent to <strong>{email}</strong>. Check your inbox and spam folder.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <Field label="Email address" htmlFor="reset-email">
                <input
                  id="reset-email"
                  type="email"
                  required
                  className={fieldStyles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </Field>
              <Button type="submit" loading={busy} fullWidth size="lg">
                Send reset link
              </Button>
            </form>
          )}

          <div className={styles.rowBetween}>
            <Link to="/login" className={styles.link}>
              Back to log in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

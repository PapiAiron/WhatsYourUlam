import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useUiStore } from '@/store/ui';
import styles from './CookieBanner.module.css';

export function CookieBanner() {
  const { consent, acceptConsent } = useUiStore();

  if (consent !== 'unset') return null;

  return (
    <aside className={styles.banner} aria-label="Cookie preferences">
      <div className={styles.text}>
        <strong>Essential storage & cookies</strong>
        <p>
          We keep your theme, wizard draft, and sign-in session local. Accept optional analytics to help us improve Filipino market pricing.{' '}
          <Link to="/cookies" className={styles.link}>
            Learn more
          </Link>
        </p>
      </div>
      <div className={styles.actions}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => acceptConsent('essential')}
        >
          Essential only
        </Button>
        <Button size="sm" onClick={() => acceptConsent('accepted')}>
          Accept all
        </Button>
      </div>
    </aside>
  );
}
